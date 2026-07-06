#Requires -Version 5.1
<#
.SYNOPSIS
    Redemarre le backend via mvn spring-boot:run.
#>
$ErrorActionPreference = 'Continue'
$backendDir = $PSScriptRoot

Write-Host 'Arret du backend...' -ForegroundColor Cyan
& (Join-Path $backendDir 'stop-backend.ps1')
Start-Sleep -Seconds 3

Write-Host 'Demarrage backend (java -jar)...' -ForegroundColor Cyan
Set-Location $backendDir
& (Join-Path $backendDir 'start-backend-jar.ps1')
exit $LASTEXITCODE
