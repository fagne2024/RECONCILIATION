#Requires -Version 5.1
<#
.SYNOPSIS
    Surveille le backend Java et produit un rapport quand il meurt brutalement.

.DESCRIPTION
    Mode 1 (defaut) : attache au backend deja demarre (PID fichier ou port 8443).
    Mode 2 (-StartBackend) : demarre start-backend-jar.ps1 puis surveille.

    A l'arret du JVM, ecrit logs/kill-diagnosis-YYYYMMDD-HHmmss.txt avec :
    - dernier heartbeat, last-shutdown-cause, extraits reconciliapp.log
    - processus suspects (stop-backend, taskkill, maven, powershell)
    - evenements Windows Application/System recents
    - etat RAM et processus Java restants

.EXAMPLE
    .\diagnose-backend-kill.ps1
    .\diagnose-backend-kill.ps1 -StartBackend
#>
param(
    [switch]$StartBackend,
    [int]$PollSeconds = 2,
    [int]$Port = 8443
)

$ErrorActionPreference = 'Continue'
$backendDir = $PSScriptRoot
$logsDir = Join-Path $backendDir 'logs'
$pidFile = Join-Path $logsDir 'backend-java.pid'
$diagLog = Join-Path $logsDir 'kill-diagnosis.log'

. (Join-Path $backendDir 'backend-common.ps1')

New-Item -ItemType Directory -Force -Path $logsDir | Out-Null

function Write-DiagLog {
    param([string]$Message)
    $line = '{0} {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
    Add-Content -LiteralPath $diagLog -Value $line
    Write-Host $Message
}

function Get-MonitoredJavaPid {
    $fromFile = Get-BackendPidFromFile -PidFile $pidFile
    if ($fromFile -and (Get-Process -Id $fromFile -ErrorAction SilentlyContinue)) {
        $p = Get-Process -Id $fromFile
        if ($p.ProcessName -match '^java') { return $fromFile }
    }
    return Get-BackendPortOwnerPid -Port $Port
}

function Get-ProcessSnapshot {
    param([int]$DeadPid)

    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add('=== PROCESSUS SUSPECTS (stop / kill / backend) ===')

    $patterns = @(
        'stop-backend',
        'restart-backend',
        'Stop-Process',
        'taskkill',
        'spring-boot:run',
        'diagnose-backend-kill',
        'csv-reconciliation',
        'CsvReconciliationApplication'
    )

    $shells = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match '^(java|javaw|powershell|pwsh|cmd)\.exe$' }

    foreach ($proc in $shells) {
        $cmd = $proc.CommandLine
        if ([string]::IsNullOrWhiteSpace($cmd)) { continue }
        $hit = $false
        foreach ($pat in $patterns) {
            if ($cmd -like "*$pat*") { $hit = $true; break }
        }
        if (-not $hit) { continue }
        $short = if ($cmd.Length -gt 220) { $cmd.Substring(0, 220) + '...' } else { $cmd }
        $lines.Add(('PID {0} {1} | {2}' -f $proc.ProcessId, $proc.Name, $short))
    }

    $lines.Add('')
    $lines.Add('=== TOUS LES java.exe (WMI) ===')
    Get-CimInstance Win32_Process -Filter "Name='java.exe' OR Name='javaw.exe'" -ErrorAction SilentlyContinue |
        ForEach-Object {
            $c = $_.CommandLine
            if ([string]::IsNullOrWhiteSpace($c)) { $c = '(sans ligne de commande)' }
            elseif ($c.Length -gt 200) { $c = $c.Substring(0, 200) + '...' }
            $lines.Add(('PID {0} | {1}' -f $_.ProcessId, $c))
        }

    if ($DeadPid -gt 0) {
        $lines.Add('')
        $lines.Add("=== CHAINE PARENTS (PID mort $DeadPid - cache WMI) ===")
        # Parent chain may be gone; try CIM anyway
        $cur = Get-CimInstance Win32_Process -Filter "ProcessId=$DeadPid" -ErrorAction SilentlyContinue
        if ($cur) {
            $lines.Add(('PID {0} parent={1} | {2}' -f $cur.ProcessId, $cur.ParentProcessId, $cur.CommandLine))
        } else {
            $lines.Add('Processus deja disparu (normal apres kill brutal).')
        }
    }

    return $lines -join "`r`n"
}

function Get-WindowsEventsSnapshot {
    param([datetime]$Since)

    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add('=== EVENEMENTS WINDOWS (Application) ===')
    try {
        Get-WinEvent -FilterHashtable @{ LogName = 'Application'; StartTime = $Since } -MaxEvents 40 -ErrorAction Stop |
            Where-Object {
                $_.Message -match 'java|javaw|OpenJDK|Adoptium|spring|JVM|Application Error|Windows Error Reporting|\.exe'
            } |
            ForEach-Object {
                $msg = $_.Message -replace '\s+', ' '
                if ($msg.Length -gt 350) { $msg = $msg.Substring(0, 350) + '...' }
                $lines.Add(('{0} [{1}] {2}' -f $_.TimeCreated.ToString('HH:mm:ss'), $_.Id, $msg))
            }
    } catch {
        $lines.Add('(aucun ou lecture impossible: ' + $_.Exception.Message + ')')
    }

    $lines.Add('')
    $lines.Add('=== EVENEMENTS WINDOWS (System) ===')
    try {
        Get-WinEvent -FilterHashtable @{ LogName = 'System'; StartTime = $Since } -MaxEvents 25 -ErrorAction Stop |
            Where-Object {
                $_.Message -match 'java|terminated|stopped|killed|8443|Error'
            } |
            ForEach-Object {
                $msg = $_.Message -replace '\s+', ' '
                if ($msg.Length -gt 350) { $msg = $msg.Substring(0, 350) + '...' }
                $lines.Add(('{0} [{1}] {2}' -f $_.TimeCreated.ToString('HH:mm:ss'), $_.Id, $msg))
            }
    } catch {
        $lines.Add('(aucun ou lecture impossible)')
    }

    return $lines -join "`r`n"
}

function Get-BackendFilesSnapshot {
    $lines = New-Object System.Collections.Generic.List[string]

    $files = @(
        @{ Name = 'backend-heartbeat.txt'; Path = (Join-Path $logsDir 'backend-heartbeat.txt') },
        @{ Name = 'last-shutdown-cause.txt'; Path = (Join-Path $logsDir 'last-shutdown-cause.txt') },
        @{ Name = 'backend-stop.log (tail)'; Path = (Join-Path $logsDir 'backend-stop.log') },
        @{ Name = 'hs_err_jvm.log'; Path = (Join-Path $logsDir 'hs_err_jvm.log') }
    )

    foreach ($f in $files) {
        $lines.Add("=== $($f.Name) ===")
        if (Test-Path -LiteralPath $f.Path) {
            if ($f.Name -match 'backend-stop') {
                $lines.Add((Get-Content -LiteralPath $f.Path -Tail 5 -ErrorAction SilentlyContinue) -join "`r`n")
            } else {
                $lines.Add((Get-Content -LiteralPath $f.Path -Raw -ErrorAction SilentlyContinue))
            }
        } else {
            $lines.Add('(fichier absent)')
        }
        $lines.Add('')
    }

    $appLog = Join-Path $logsDir 'reconciliapp.log'
    $lines.Add('=== reconciliapp.log (15 dernieres lignes) ===')
    if (Test-Path -LiteralPath $appLog) {
        $lines.Add((Get-Content -LiteralPath $appLog -Tail 15 -ErrorAction SilentlyContinue) -join "`r`n")
    } else {
        $lines.Add('(absent)')
    }

    return $lines -join "`r`n"
}

function Get-SystemSnapshot {
    $os = Get-CimInstance Win32_OperatingSystem
    $freeMb = [math]::Round($os.FreePhysicalMemory / 1024)
    $totalMb = [math]::Round($os.TotalVisibleMemorySize / 1024)
    $port = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -First 1

  return @(
        '=== SYSTEME ===',
        ('RAM libre/total : {0} / {1} Mo' -f $freeMb, $totalMb),
        ('Port {0} ecoute : {1}' -f $Port, $(if ($port) { 'oui PID ' + $port.OwningProcess } else { 'non' })),
        ('Heure locale    : {0}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')),
        ''
    ) -join "`r`n"
}

function Write-KillReport {
    param(
        [int]$DeadPid,
        [datetime]$WatchStarted,
        [string]$Reason
    )

    $now = Get-Date
    $reportName = 'kill-diagnosis-{0}.txt' -f $now.ToString('yyyyMMdd-HHmmss')
    $reportPath = Join-Path $logsDir $reportName
    $since = $WatchStarted.AddMinutes(-1)

    $report = @(
        '============================================',
        '  RAPPORT MORT BRUTALE BACKEND ReconciliApp',
        '============================================',
        ('Genere    : {0}' -f $now.ToString('yyyy-MM-dd HH:mm:ss')),
        ('PID mort  : {0}' -f $DeadPid),
        ('Raison    : {0}' -f $Reason),
        ('Surveillance depuis : {0}' -f $WatchStarted.ToString('yyyy-MM-dd HH:mm:ss')),
        '',
        'INTERPRETATION RAPIDE :',
        '- last-shutdown-cause=RUNNING + pas de hs_err => kill externe (TerminateProcess)',
        '- hs_err_jvm.log present => crash JVM natif',
        '- heap-dump.hprof present => OutOfMemoryError heap',
        '- stop-backend.ps1 dans backend-stop.log => arret scripte',
        ('- Mort < 60s apres demarrage sans requetes HTTP => console partagee, double demarrage, ou antivirus'),
        '',
        (Get-SystemSnapshot),
        (Get-BackendFilesSnapshot),
        (Get-ProcessSnapshot -DeadPid $DeadPid),
        (Get-WindowsEventsSnapshot -Since $since),
        '',
        '=== POUR IDENTIFIER LE TUEUR (admin) ===',
        'auditpol /set /subcategory:"Process Termination" /success:enable',
        'Puis consulter Observateur evenements > Securite apres la prochaine mort.',
        'Ou installer Sysinternals Process Monitor (procmon) filtre Process Name java.exe.',
        ''
    ) -join "`r`n"

    Set-Content -LiteralPath $reportPath -Value $report -Encoding UTF8
    Write-DiagLog "RAPPORT ECRIT : logs\$reportName"
    return $reportPath
}

# --- Demarrage optionnel du backend ---
$backendJob = $null
if ($StartBackend) {
    Write-DiagLog 'Demarrage backend via start-backend-jar.ps1...'
    $startScript = Join-Path $backendDir 'start-backend-jar.ps1'
    if (-not (Test-Path -LiteralPath $startScript)) {
        Write-Host 'start-backend-jar.ps1 introuvable.' -ForegroundColor Red
        exit 1
    }
    $backendJob = Start-Job -ScriptBlock {
        param($script)
        Set-Location (Split-Path $script)
        & $script
    } -ArgumentList $startScript

    $deadline = (Get-Date).AddMinutes(3)
    while ((Get-Date) -lt $deadline) {
        if (Get-MonitoredJavaPid) { break }
        Start-Sleep -Seconds 2
    }
}

# --- Attente PID ---
Write-Host ''
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  Diagnostic mort backend ReconciliApp' -ForegroundColor Cyan
Write-Host '  Ctrl+C pour arreter la surveillance' -ForegroundColor DarkGray
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''

$watchStarted = Get-Date
$freezeReported = $false
Write-DiagLog "Surveillance demarree (poll ${PollSeconds}s, port $Port)"

$deadline = (Get-Date).AddMinutes(2)
while (-not (Get-MonitoredJavaPid) -and (Get-Date) -lt $deadline) {
    Write-Host 'En attente du backend (PID fichier ou port 8443)...' -ForegroundColor Yellow
    Start-Sleep -Seconds 2
}

$javaPid = Get-MonitoredJavaPid
if (-not $javaPid) {
    Write-Host 'Backend introuvable. Lancez DEMARRER-BACKEND.bat ou utilisez -StartBackend.' -ForegroundColor Red
    if ($backendJob) { Stop-Job $backendJob -ErrorAction SilentlyContinue; Remove-Job $backendJob -Force -ErrorAction SilentlyContinue }
    exit 1
}

Write-DiagLog "Backend detecte PID $javaPid - surveillance active"
$lastHeartbeatMtime = $null
$heartbeatPath = Join-Path $logsDir 'backend-heartbeat.txt'

function Invoke-JstackSnapshot {
    param([int]$JavaPid)
    $jstack = $null
    if ($env:JAVA_HOME) {
        $candidate = Join-Path $env:JAVA_HOME 'bin\jstack.exe'
        if (Test-Path -LiteralPath $candidate) { $jstack = $candidate }
    }
    if (-not $jstack) {
        $jstack = (Get-Command jstack -ErrorAction SilentlyContinue).Source
    }
    if (-not $jstack) { return $null }

    $out = Join-Path $logsDir ("jstack-{0}-{1}.txt" -f $JavaPid, (Get-Date -Format 'yyyyMMdd-HHmmss'))
    try {
        & $jstack -l $JavaPid 2>&1 | Set-Content -LiteralPath $out -Encoding UTF8
        return $out
    } catch {
        return $null
    }
}

try {
    while ($true) {
        $alive = $null -ne (Get-Process -Id $javaPid -ErrorAction SilentlyContinue)
        $portOwner = Get-BackendPortOwnerPid -Port $Port
        $portAlive = ($portOwner -eq $javaPid)

        if (Test-Path -LiteralPath $heartbeatPath) {
            $hbMtime = (Get-Item -LiteralPath $heartbeatPath).LastWriteTime
            if ($lastHeartbeatMtime -and $hbMtime -eq $lastHeartbeatMtime) {
                $ageSec = ((Get-Date) - $hbMtime).TotalSeconds
                if ($ageSec -gt 90 -and $alive) {
                    Write-DiagLog "ATTENTION: heartbeat fige depuis $([int]$ageSec)s (JVM peut etre bloque)"
                }
            }
            $lastHeartbeatMtime = $hbMtime
        }

        if (-not $alive) {
            Write-Host ''
            Write-Host "!!! JVM PID $javaPid DISPARU !!!" -ForegroundColor Red
            $report = Write-KillReport -DeadPid $javaPid -WatchStarted $watchStarted -Reason 'Processus java disparu (pas de shutdown Spring detecte)'
            Write-Host ''
            Write-Host "Consultez le rapport :" -ForegroundColor Green
            Write-Host "  $report" -ForegroundColor Cyan
            break
        }

        if (-not $portAlive -and $alive) {
            Write-DiagLog "PID $javaPid vivant mais port $Port plus en ecoute - etat anormal"
            if (-not $freezeReported) {
                $freezeReported = $true
                $stackFile = Invoke-JstackSnapshot -JavaPid $javaPid
                if ($stackFile) {
                    Write-DiagLog "Thread dump ecrit: $stackFile"
                }
            }
        }

        Start-Sleep -Seconds $PollSeconds
    }
}
finally {
    if ($backendJob) {
        Stop-Job $backendJob -ErrorAction SilentlyContinue
        Remove-Job $backendJob -Force -ErrorAction SilentlyContinue
    }
}
