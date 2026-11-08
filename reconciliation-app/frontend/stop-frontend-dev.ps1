#Requires -Version 5.1
<#
.SYNOPSIS
    Arrete uniquement l'instance FRONTEND DE DEV (port 4201).
    La prod (4200) n'est pas touchee.
#>

$ErrorActionPreference = 'Stop'

$frontendDir = $PSScriptRoot
$logsDir     = Join-Path $frontendDir 'logs'
$pidFile     = Join-Path $logsDir 'frontend-dev.pid'
$DevPort     = 4201

$stopped = $false

if (Test-Path -LiteralPath $pidFile) {
    $procId = 0
    [void][int]::TryParse((Get-Content -LiteralPath $pidFile -Raw).Trim(), [ref]$procId)
    if ($procId -gt 0 -and (Get-Process -Id $procId -ErrorAction SilentlyContinue)) {
        & taskkill /PID $procId /T /F | Out-Null
        Write-Host "Frontend DEV arrete (PID $procId)." -ForegroundColor Green
        $stopped = $true
    }
    Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
}

$owner = Get-NetTCPConnection -State Listen -LocalPort $DevPort -ErrorAction SilentlyContinue | Select-Object -First 1
if ($owner) {
    & taskkill /PID $owner.OwningProcess /T /F | Out-Null
    Write-Host "Port $DevPort libere (PID $($owner.OwningProcess))." -ForegroundColor Green
    $stopped = $true
}

if (-not $stopped) { Write-Host 'Aucune instance frontend DEV active.' -ForegroundColor DarkGray }
