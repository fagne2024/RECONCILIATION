#Requires -Version 5.1
<#
.SYNOPSIS
    Arrete l'environnement DEV isole (backend 8444 + frontend 4201).
    La prod (8443 / 4200) n'est pas touchee.
#>

$ErrorActionPreference = 'Stop'
$appDir = $PSScriptRoot

& (Join-Path $appDir 'frontend\stop-frontend-dev.ps1')
& (Join-Path $appDir 'backend\stop-backend-dev.ps1')

Write-Host 'Environnement DEV arrete.' -ForegroundColor Green
