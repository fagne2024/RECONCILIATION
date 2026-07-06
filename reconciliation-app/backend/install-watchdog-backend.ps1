#Requires -Version 5.1
<#
.SYNOPSIS
    Installe la surveillance automatique du backend ReconciliApp (toutes les 5 min).

.EXAMPLE
    .\install-watchdog-backend.ps1
    .\install-watchdog-backend.ps1 -Remove
#>
[CmdletBinding()]
param(
    [switch]$Remove
)

$ErrorActionPreference = 'Stop'
$backendDir = $PSScriptRoot
$watchdog = Join-Path $backendDir 'watchdog-backend.ps1'
$taskName = 'ReconciliApp-Backend-Watchdog'

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

$watchdogAction = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$watchdog`" -Quiet"

schtasks /Create /TN $taskName /TR $watchdogAction /SC MINUTE /MO 5 /RU SYSTEM /RL HIGHEST /F | Out-Null
Write-Host "[OK] Tache surveillance backend :8443 (5 min) : $taskName" -ForegroundColor Green
Write-Host ''
Write-Host 'Logs : deploy\logs\backend-watchdog.log'
Write-Host "Desinstallation : .\install-watchdog-backend.ps1 -Remove"
