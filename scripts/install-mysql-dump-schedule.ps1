#Requires -Version 5.1
<#
.SYNOPSIS
    Planifie un dump MySQL automatique le 1er de chaque mois a 02:00.

.EXAMPLE
    .\install-mysql-dump-schedule.ps1
    .\install-mysql-dump-schedule.ps1 -Remove
    .\install-mysql-dump-schedule.ps1 -RunNow
#>
[CmdletBinding()]
param(
    [switch]$Remove,
    [switch]$RunNow,
    [string]$StartTime = '02:00'
)

$ErrorActionPreference = 'Stop'
$scriptDir = $PSScriptRoot
$dumpScript = Join-Path $scriptDir 'dump-mysql.ps1'
$taskName = 'ReconciliApp-MySQL-Monthly-Dump'

function Test-IsAdmin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]$id
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if ($Remove) {
    schtasks /Delete /TN $taskName /F 2>$null | Out-Null
    Write-Host "Tache supprimee : $taskName" -ForegroundColor Yellow
    exit 0
}

if (-not (Test-Path -LiteralPath $dumpScript)) {
    Write-Host "Script introuvable : $dumpScript" -ForegroundColor Red
    exit 1
}

if ($RunNow) {
    Write-Host 'Lancement du dump immediat...' -ForegroundColor Cyan
    & $dumpScript
    exit $LASTEXITCODE
}

if (-not (Test-IsAdmin)) {
    Write-Host 'Executez ce script en PowerShell Administrateur pour planifier la tache.' -ForegroundColor Red
    exit 1
}

$dumpAction = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$dumpScript`""

schtasks /Create /TN $taskName /TR $dumpAction /SC MONTHLY /D 1 /ST $StartTime /RU SYSTEM /RL HIGHEST /F | Out-Null
Write-Host "[OK] Dump MySQL planifie le 1er de chaque mois a $StartTime : $taskName" -ForegroundColor Green
Write-Host ''
Write-Host 'Dossier dumps : C:\reconciliation\backups\mysql'
Write-Host 'Dump immediat   : .\install-mysql-dump-schedule.ps1 -RunNow'
Write-Host "Desinstallation : .\install-mysql-dump-schedule.ps1 -Remove"
