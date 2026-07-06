#Requires -Version 5.1
<#
.SYNOPSIS
    Cherche dans le journal Securite Windows qui a tue le backend Java.
.DESCRIPTION
    Necessite que l'audit ait ete active AVANT le crash (via ACTIVER-AUDIT-KILL.bat).
    Lit le dernier rapport logs\kill-diagnosis-*.txt pour recuperer le PID mort
    et l'heure du crash, puis cherche :
      - Evenement 4689 (terminaison) autour de cette heure
      - Evenements 4688 (creation de process) dans les secondes precedant la mort,
        pour reperer un taskkill.exe, un powershell Stop-Process, un process
        antivirus (MsMpEng, MpCmdRun) ou tout autre process inattendu.
    C'est la correlation 4688/4689 qui identifie le coupable, pas 4689 seul.
.EXAMPLE
    .\find-killer.ps1
    .\find-killer.ps1 -DeadPid 14164 -DeathTime "2026-07-06 12:07:26"
#>
param(
    [int]$DeadPid,
    [datetime]$DeathTime,
    [int]$WindowSeconds = 15
)

$ErrorActionPreference = 'Continue'
$backendDir = $PSScriptRoot
$logsDir = Join-Path $backendDir 'logs'

function Test-IsAdmin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $p = New-Object Security.Principal.WindowsPrincipal($id)
    return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-IsAdmin)) {
    Write-Host 'Lecture du journal Securite necessite les droits admin.' -ForegroundColor Red
    Write-Host 'Relancez via TROUVER-TUEUR.bat (elevation automatique).' -ForegroundColor Yellow
    Read-Host 'Appuyez sur Entree pour fermer'
    exit 1
}

if (-not $DeathTime) {
    Write-Host 'Recherche du dernier rapport kill-diagnosis...' -ForegroundColor Cyan
    $lastReport = Get-ChildItem -Path $logsDir -Filter 'kill-diagnosis-*.txt' -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($lastReport) {
        $content = Get-Content -LiteralPath $lastReport.FullName -Raw
        if ($content -match 'PID mort\s*:\s*(\d+)') { $DeadPid = [int]$Matches[1] }
        if ($content -match 'Genere\s*:\s*([\d\-]+\s[\d:]+)') { $DeathTime = [datetime]$Matches[1] }
        Write-Host "Rapport trouve : $($lastReport.Name) (PID $DeadPid, mort a $DeathTime)" -ForegroundColor Green
    } else {
        Write-Host 'Aucun rapport kill-diagnosis trouve dans logs\.' -ForegroundColor Red
        Write-Host 'Precisez manuellement : .\find-killer.ps1 -DeadPid <pid> -DeathTime "yyyy-MM-dd HH:mm:ss"' -ForegroundColor Yellow
        Read-Host 'Appuyez sur Entree pour fermer'
        exit 1
    }
}

if (-not $DeathTime -or -not $DeadPid) {
    Write-Host 'Impossible de determiner le PID ou l heure du crash.' -ForegroundColor Red
    Read-Host 'Appuyez sur Entree pour fermer'
    exit 1
}

$since = $DeathTime.AddSeconds(-$WindowSeconds)
$until = $DeathTime.AddSeconds(5)

Write-Host ''
Write-Host "Fenetre analysee : $since -> $until" -ForegroundColor DarkGray
Write-Host ''
Write-Host "=== Evenement 4689 (terminaison) pour PID $DeadPid ===" -ForegroundColor Cyan
$pidHex = '0x{0:x}' -f $DeadPid
$term = Get-WinEvent -FilterHashtable @{ LogName = 'Security'; Id = 4689; StartTime = $since; EndTime = $until } -ErrorAction SilentlyContinue |
    Where-Object { $_.Message -match [regex]::Escape($pidHex) }
if ($term) {
    $term | ForEach-Object {
        $msg = $_.Message
        $account = if ($msg -match 'Account Name:\s*(\S+)') { $Matches[1] } else { '?' }
        $procName = if ($msg -match 'Process Name:\s*(.+?)(\r?\n|$)') { $Matches[1].Trim() } else { '?' }
        $status = if ($msg -match 'Exit Status:\s*(\S+)') { $Matches[1] } else { '?' }
        Write-Host "$($_.TimeCreated.ToString('HH:mm:ss.fff'))  compte: $account  process: $procName  exit status: $status" -ForegroundColor Green
    }
} else {
    Write-Host '(aucun 4689 trouve pour ce PID - l audit etait peut-etre active APRES ce crash)' -ForegroundColor Yellow
    Write-Host 'Si c est le cas, relancez ACTIVER-AUDIT-KILL.bat puis attendez un NOUVEAU crash.' -ForegroundColor Yellow
}

Write-Host ''
Write-Host "=== Evenements 4688 (creation de process) dans les $WindowSeconds s avant la mort ===" -ForegroundColor Cyan
Write-Host '(reperez taskkill, powershell Stop-Process, MsMpEng, MpCmdRun, ou tout process inattendu)' -ForegroundColor DarkGray
$creates = Get-WinEvent -FilterHashtable @{ LogName = 'Security'; Id = 4688; StartTime = $since; EndTime = $until } -ErrorAction SilentlyContinue
if ($creates) {
    $creates | Sort-Object TimeCreated | ForEach-Object {
        $msg = $_.Message

        $newPid = if ($msg -match 'New Process ID:\s*(0x[0-9a-fA-F]+)') { $Matches[1] } else { '?' }
        $newName = if ($msg -match 'New Process Name:\s*(\S+)') { $Matches[1] } else { '?' }
        $parentPid = if ($msg -match 'Process ID:\s*(0x[0-9a-fA-F]+)\s*\r?\n\s*Process Name:') { $Matches[1] } else { '?' }
        $parentName = if ($msg -match 'Process Name:\s*(\S+)\s*\r?\n\s*New Process ID') { $Matches[1] } else { '?' }
        $cmdLine = if ($msg -match 'Process Command Line:\s*(.*?)(\r?\n|$)') { $Matches[1].Trim() } else { '' }
        $account = if ($msg -match 'Account Name:\s*(\S+)') { $Matches[1] } else { '?' }

        $suspicious = $newName -match 'taskkill|MsMpEng|MpCmdRun|NisSrv|MpDefenderCoreService|wmic|Stop-Process'
        $color = if ($suspicious) { 'Red' } else { 'Gray' }

        Write-Host "$($_.TimeCreated.ToString('HH:mm:ss.fff'))  PID $newPid  $newName  (parent: $parentName / $parentPid, compte: $account)" -ForegroundColor $color
        if ($cmdLine) { Write-Host "    cmdline: $cmdLine" -ForegroundColor $color }
    }
} else {
    Write-Host '(aucun 4688 trouve dans cette fenetre - audit peut-etre active trop tard, ou fenetre trop courte)' -ForegroundColor Yellow
}

Write-Host ''
Read-Host 'Appuyez sur Entree pour fermer'
