#Requires -Version 5.1
<#
.SYNOPSIS
    Demarre l'environnement DEV isole :
      - backend  : https://localhost:8444  -> base top20_dev
      - frontend : https://localhost:4201  -> proxy /api vers 8444
    La prod (backend 8443 / frontend 4200 / base top20) n'est pas modifiee.
#>

$ErrorActionPreference = 'Stop'
$appDir = $PSScriptRoot

& (Join-Path $appDir 'backend\start-backend-dev.ps1') -Detached
Start-Sleep -Seconds 2
& (Join-Path $appDir 'frontend\start-frontend-dev.ps1') -Detached

Write-Host ''
Write-Host 'Environnement DEV lance :' -ForegroundColor Cyan
Write-Host '  Backend  : https://localhost:8444' -ForegroundColor Green
Write-Host '  Frontend : https://localhost:4201' -ForegroundColor Green
Write-Host '  Base     : top20_dev' -ForegroundColor Green
Write-Host ''
Write-Host 'Le backend met ~30-60 s a demarrer, le frontend ~1-3 min (1er build).' -ForegroundColor DarkGray
Write-Host 'Pour tout arreter : .\stop-dev.ps1' -ForegroundColor DarkGray
