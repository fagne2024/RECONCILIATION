#Requires -Version 5.1
<#
.SYNOPSIS
    Installe la surveillance automatique du frontend Angular (toutes les 5 min).

.EXAMPLE
    .\install-watchdog-frontend.ps1
    .\install-watchdog-frontend.ps1 -Remove
#>
[CmdletBinding()]
param(
    [switch]$Remove,
    [int]$Port = 4200
)

$ErrorActionPreference = 'Stop'
$frontendDir = $PSScriptRoot
$watchdog = Join-Path $frontendDir 'watchdog-frontend.ps1'
$taskName = 'ReconciliApp-Frontend-Watchdog'

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

if (-not (Test-IsAdmin)) {
    Write-Host 'Executez ce script en PowerShell Administrateur.' -ForegroundColor Red
    exit 1
}

if (-not (Test-Path -LiteralPath $watchdog)) {
    Write-Host "Script introuvable : $watchdog" -ForegroundColor Red
    exit 1
}

$watchdogAction = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$watchdog`" -Quiet -Port $Port"

schtasks /Create /TN $taskName /TR $watchdogAction /SC MINUTE /MO 5 /RU SYSTEM /RL HIGHEST /F | Out-Null
Write-Host "[OK] Tache surveillance frontend :$Port (5 min) : $taskName" -ForegroundColor Green
Write-Host ''
Write-Host 'Logs : frontend\logs\frontend-watchdog.log'
Write-Host "Desinstallation : .\install-watchdog-frontend.ps1 -Remove"
