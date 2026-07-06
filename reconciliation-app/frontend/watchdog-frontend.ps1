#Requires -Version 5.1
<#
.SYNOPSIS
  Watchdog du frontend Angular (dev server) pour ReconciliApp.

.DESCRIPTION
  - Poll un health-check HTTP leger sur le port du front (par defaut 4200).
  - Si le front ne repond pas (ou que le process disparaît), ecrit un rapport puis redemarre `npm run start`.

.EXAMPLE
  .\watchdog-frontend.ps1
  .\watchdog-frontend.ps1 -Port 4200 -UseHttps:$true
#>

param(
    [int]$Port = 4200,
    [bool]$UseHttps = $true,
    [int]$PollSeconds = 2,
    [int]$ConsecutiveFailThreshold = 6,
    [int]$WaitHealthyTimeoutSeconds = 120,
    [int]$RestartCooldownSeconds = 10,
    [switch]$Quiet
)

$ErrorActionPreference = 'Continue'
$frontendDir = $PSScriptRoot
$logsDir = Join-Path $frontendDir 'logs'
$watchdogLog = Join-Path $logsDir 'frontend-watchdog.log'
$heartbeatPath = Join-Path $logsDir 'frontend-heartbeat.txt'

New-Item -ItemType Directory -Force -Path $logsDir | Out-Null

function Write-Log([string]$Level, [string]$Message) {
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $line = "$ts | $Level | FRONT-WATCHDOG | $Message"
    Add-Content -LiteralPath $watchdogLog -Value $line -Encoding UTF8
    if (-not $Quiet) {
        if ($Level -eq 'ERROR') {
            Write-Host $line -ForegroundColor Red
        } elseif ($Level -eq 'WARN') {
            Write-Host $line -ForegroundColor Yellow
        } else {
            Write-Host $line
        }
    }
}

function Get-FrontPortOwnerPid {
    param([int]$PortToCheck)
    $conn = Get-NetTCPConnection -LocalPort $PortToCheck -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $conn) { return $null }
    $procId = [int]$conn.OwningProcess
    if ($procId -le 0) { return $null }
    return $procId
}

function Get-FrontProcessCommandLine {
    param([int]$Pid)
    try {
        $wmi = Get-CimInstance Win32_Process -Filter "ProcessId=$Pid" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($wmi -and $wmi.CommandLine) { return $wmi.CommandLine }
    } catch { }
    return $null
}

function Test-IsAngularDevServerProcess {
    param([int]$Pid)
    if (-not $Pid) { return $false }
    $cmd = Get-FrontProcessCommandLine -Pid $Pid
    if (-not $cmd) { return $false }

    # Exemples attendus :
    # - ... @angular/cli/bin/ng.js serve
    # - ... ng serve
    return ($cmd -match '@angular\\cli\\bin\\ng\\.|@angular/cli/bin/ng\\.js|ng\\.js serve|ng serve')
}

function Test-FrontHttpHealthy {
    param([int]$PortToCheck, [bool]$Https)

    # Utilise curl avec -I (headers uniquement) => evite de charger le HTML complet.
    $scheme = $(if ($Https) { 'https' } else { 'http' })
    $url = "$scheme://127.0.0.1:$PortToCheck/"

    try {
        if ($Https) {
            $h = & curl.exe -sk -I -m 8 $url 2>$null
        } else {
            $h = & curl.exe -s -I -m 8 $url 2>$null
        }
        $headerText = ($h -join "`n")
        if (-not $headerText) { return $false }

        $okStatus = ($headerText -match 'HTTP/.*\s200\s')
        $hasHtml = ($headerText -match 'Content-Type:\s*text/html')
        return ($okStatus -and $hasHtml)
    } catch {
        return $false
    }
}

function Write-HeartbeatOk {
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Set-Content -LiteralPath $heartbeatPath -Value $ts -NoNewline -Encoding UTF8
}

function Stop-FrontPortOccupant {
    param([int]$PortToStop)

    $procId = Get-FrontPortOwnerPid -PortToCheck $PortToStop
    if (-not $procId) { return $false }

    $cmd = Get-FrontProcessCommandLine -Pid $procId
    if (-not $cmd) { return $false }

    if (-not (Test-IsAngularDevServerProcess -Pid $procId)) {
        Write-Log 'WARN' "Port $PortToStop occupe par un PID $procId mais ce n'est pas un ng serve attendu. Ne stoppe pas."
        return $false
    }

    Write-Log 'WARN' "Arret frontend Angular (PID $procId) sur port $PortToStop..."
    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    return $true
}

function Start-AngularFrontend {
    # Relance le dev server (SSL) via npm.
    # Note : le script start du frontend configure lui-meme les certs + host.
    Write-Log 'INFO' 'Redemarrage frontend : npm run start'

    $psCmd = "Set-Location '$frontendDir'; npm run start"
    Start-Process -FilePath 'powershell.exe' -ArgumentList @(
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-WindowStyle', 'Hidden',
        '-Command', $psCmd
    ) | Out-Null
}

function Get-SystemSnapshot {
    try {
        $os = Get-CimInstance Win32_OperatingSystem
        $freeMb = [math]::Round($os.FreePhysicalMemory / 1024)
        $totalMb = [math]::Round($os.TotalVisibleMemorySize / 1024)
        return @(
            '=== SYSTEME ===',
            ('RAM libre/total : {0} / {1} Mo' -f $freeMb, $totalMb),
            ('Heure locale     : {0}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')),
            ''
        ) -join "`r`n"
    } catch {
        return '=== SYSTEME === (impossible a lire)'
    }
}

function Get-SuspectProcessesSnapshot {
    $patterns = @(
        'taskkill',
        'Stop-Process',
        'npm',
        'node.exe',
        '@angular/cli',
        'ng.js serve',
        'restart',
        'watchdog'
    )

    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add('=== PROCESSUS SUSPECTS ===')

    try {
        $shells = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -match '^(java|node|powershell|pwsh|cmd)\.exe$' }

        foreach ($proc in $shells) {
            $cmd = $proc.CommandLine
            if (-not $cmd) { continue }
            $hit = $false
            foreach ($pat in $patterns) {
                if ($cmd -like "*$pat*") { $hit = $true; break }
            }
            if (-not $hit) { continue }

            $short = if ($cmd.Length -gt 220) { $cmd.Substring(0, 220) + '...' } else { $cmd }
            $lines.Add(('PID {0} | {1} | {2}' -f $proc.ProcessId, $proc.Name, $short))
        }
    } catch {
        $lines.Add('(impossible a lire via WMI)')
    }

    return ($lines -join "`r`n")
}

function Write-KillDiagnosisReport {
    param(
        [datetime]$WatchStarted,
        [string]$Reason
    )

    $now = Get-Date
    $reportName = 'kill-diagnosis-frontend-{0}.txt' -f $now.ToString('yyyyMMdd-HHmmss')
    $reportPath = Join-Path $logsDir $reportName
    $since = $WatchStarted.AddMinutes(-2)

    $portPid = Get-FrontPortOwnerPid -PortToCheck $Port
    $cmdLine = if ($portPid) { Get-FrontProcessCommandLine -Pid $portPid } else { $null }

    $eventsBlock = New-Object System.Collections.Generic.List[string]
    $eventsBlock.Add('=== EVENEMENTS WINDOWS RECENTS (approx) ===')
    try {
        # Limite volontaire pour eviter des rapports enormes.
        $evs = Get-WinEvent -FilterHashtable @{ LogName = 'System'; StartTime = $since } -MaxEvents 25 -ErrorAction Stop
        foreach ($e in $evs) {
            $msg = ($e.Message -replace '\s+', ' ')
            if ($msg -match 'node|ng\.js|ng serve|Angular|IIS|nginx|Apache|crash|killed|terminated|taskkill|Stop-Process') {
                if ($msg.Length -gt 350) { $msg = $msg.Substring(0, 350) + '...' }
                $eventsBlock.Add(('{0} [{1}] {2}' -f $e.TimeCreated.ToString('HH:mm:ss'), $e.Id, $msg))
            }
        }
        if ($eventsBlock.Count -eq 1) {
            $eventsBlock.Add('(aucun evenement pertinent trouve)')
        }
    } catch {
        $eventsBlock.Add('(impossible de lire les evenements : ' + $_.Exception.Message + ')')
    }

    $report = @(
        '============================================',
        '  RAPPORT MORT BRUTALE FRONTEND Angular',
        '============================================',
        ('Genere                  : {0}' -f $now.ToString('yyyy-MM-dd HH:mm:ss')),
        ('Raison                  : {0}' -f $Reason),
        ('Surveillance depuis     : {0}' -f $WatchStarted.ToString('yyyy-MM-dd HH:mm:ss')),
        '',
        ('Port {0} ecoute par PID : {1}' -f $Port, $(if ($portPid) { $portPid } else { 'none' })),
        ('Commande (si dispo)    : {0}' -f $(if ($cmdLine) { $cmdLine } else { '(inconnue)' })),
        '',
        (Get-SystemSnapshot),
        (Get-SuspectProcessesSnapshot),
        ($eventsBlock -join "`r`n")
    ) -join "`r`n"

    Set-Content -LiteralPath $reportPath -Value $report -Encoding UTF8
    Write-Log 'ERROR' "Rapport ecrit : $reportName"
    return $reportPath
}

# -------------------------
# Boucle watchdog
# -------------------------
$watchStarted = Get-Date
$failCount = 0
$reportedThisCycle = $false

if (-not $Quiet) {
    Write-Host '========================================' -ForegroundColor Cyan
    Write-Host "  FRONT-WATCHDOG (Angular) - port $Port" -ForegroundColor Cyan
    Write-Host '  Ctrl+C pour arreter' -ForegroundColor DarkGray
    Write-Host '========================================' -ForegroundColor Cyan
}

Write-Log 'INFO' ("Dmarage watchdog (poll={0}s, threshold={1}, https={2})" -f $PollSeconds, $ConsecutiveFailThreshold, $UseHttps)

while ($true) {
    $portPid = Get-FrontPortOwnerPid -PortToCheck $Port
    $healthy = Test-FrontHttpHealthy -PortToCheck $Port -Https:$UseHttps

    if ($healthy) {
        $failCount = 0
        $reportedThisCycle = $false
        Write-HeartbeatOk
        if (-not $Quiet) {
            Write-Log 'INFO' "Front OK (HTTP headers) - PID $portPid"
        }
        Start-Sleep -Seconds $PollSeconds
        continue
    }

    $failCount++

    $reason = if (-not $portPid) { 'process front disparu (port pas en ecoute)' } else { 'front HTTP non sain (headers)' }
    Write-Log 'WARN' ("Front KO ({0}/{1}) - PID {2}" -f $failCount, $ConsecutiveFailThreshold, $(if ($portPid) { $portPid } else { 'none' }))

    if ($failCount -ge $ConsecutiveFailThreshold) {
        if (-not $reportedThisCycle) {
            $null = Write-KillDiagnosisReport -WatchStarted $watchStarted -Reason $reason
            $reportedThisCycle = $true
        }

        Write-Log 'WARN' ("Cooldown {0}s puis redemarrage..." -f $RestartCooldownSeconds)
        Start-Sleep -Seconds $RestartCooldownSeconds

        # Stop (si possible) puis start.
        Stop-FrontPortOccupant -PortToStop $Port | Out-Null
        Start-AngularFrontend

        # Attente OK.
        $deadline = (Get-Date).AddSeconds($WaitHealthyTimeoutSeconds)
        $restarted = $false
        while ((Get-Date) -lt $deadline) {
            Start-Sleep -Seconds $PollSeconds
            $healthy2 = Test-FrontHttpHealthy -PortToCheck $Port -Https:$UseHttps
            if ($healthy2) {
                $restarted = $true
                break
            }
        }

        if ($restarted) {
            Write-Log 'INFO' 'Front redevenu sain - reprise surveillance.'
            $failCount = 0
            $reportedThisCycle = $false
            Start-Sleep -Seconds $PollSeconds
            continue
        } else {
            Write-Log 'ERROR' "Front toujours KO apres redemarrage (timeout {0}s). Relance watchdog." -f $WaitHealthyTimeoutSeconds
            # On ne sort pas : on repart dans la boucle.
            $failCount = 0
            $reportedThisCycle = $false
        }
    }

    Start-Sleep -Seconds $PollSeconds
}

