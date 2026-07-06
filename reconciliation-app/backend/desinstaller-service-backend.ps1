#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Desinstalle le service Windows ReconciliAppBackend et nettoie backend\tools.

.DESCRIPTION
    Arrete le service WinSW, le desinstalle, supprime ReconciliAppBackend.exe
    et les fichiers associes (nssm, xml). N'affecte pas mvn spring-boot:run.

.EXAMPLE
    .\desinstaller-service-backend.ps1
#>
$ErrorActionPreference = 'Stop'

$backendDir = $PSScriptRoot
$toolsDir = Join-Path $backendDir 'tools'
$serviceId = 'ReconciliAppBackend'
$winswExe = Join-Path $toolsDir 'ReconciliAppBackend.exe'
$stopScript = Join-Path $backendDir 'stop-backend.ps1'

Write-Host ''
Write-Host '=== Desinstallation service ReconciliAppBackend ===' -ForegroundColor Cyan
Write-Host ''

if (Test-Path -LiteralPath $stopScript) {
    Write-Host 'Arret des processus backend (stop-backend.ps1)...' -ForegroundColor Yellow
    & $stopScript
    Start-Sleep -Seconds 2
}

$service = Get-Service -Name $serviceId -ErrorAction SilentlyContinue
if ($service) {
    if ($service.Status -eq 'Running') {
        Write-Host "Arret du service $serviceId..." -ForegroundColor Yellow
        if (Test-Path -LiteralPath $winswExe) {
            & $winswExe stop 2>&1 | Out-Null
            Start-Sleep -Seconds 3
        }
        Stop-Service -Name $serviceId -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }

    $uninstalled = $false
    if (Test-Path -LiteralPath $winswExe) {
        Write-Host 'Desinstallation via WinSW...' -ForegroundColor Yellow
        & $winswExe uninstall 2>&1 | ForEach-Object { Write-Host $_ }
        Start-Sleep -Seconds 2
        $stillThere = Get-Service -Name $serviceId -ErrorAction SilentlyContinue
        if (-not $stillThere) { $uninstalled = $true }
    }

    if (-not $uninstalled -and (Get-Service -Name $serviceId -ErrorAction SilentlyContinue)) {
        Write-Host 'Fallback: sc.exe delete...' -ForegroundColor Yellow
        sc.exe stop $serviceId 2>&1 | Out-Null
        Start-Sleep -Seconds 2
        sc.exe delete $serviceId 2>&1 | ForEach-Object { Write-Host $_ }
    }
}
else {
    Write-Host "Service $serviceId deja absent." -ForegroundColor DarkGray
}

$remaining = Get-Service -Name $serviceId -ErrorAction SilentlyContinue
if ($remaining) {
    Write-Host "ERREUR: le service $serviceId est encore present." -ForegroundColor Red
    exit 1
}

Write-Host "Service $serviceId desinstalle." -ForegroundColor Green

$patterns = @(
    'ReconciliAppBackend.exe',
    'ReconciliAppBackend.xml',
    'ReconciliAppBackend.exe.config'
)

foreach ($name in $patterns) {
    $path = Join-Path $toolsDir $name
    if (Test-Path -LiteralPath $path) {
        Remove-Item -LiteralPath $path -Force
        Write-Host "Supprime : tools\$name" -ForegroundColor Green
    }
}

$nssmDir = Join-Path $toolsDir 'nssm'
if (Test-Path -LiteralPath $nssmDir) {
    Remove-Item -LiteralPath $nssmDir -Recurse -Force
    Write-Host 'Supprime : tools\nssm\' -ForegroundColor Green
}

if (Test-Path -LiteralPath $toolsDir) {
    $left = Get-ChildItem -LiteralPath $toolsDir -Force -ErrorAction SilentlyContinue
    if (-not $left) {
        Remove-Item -LiteralPath $toolsDir -Force
        Write-Host 'Supprime : tools\ (dossier vide)' -ForegroundColor Green
    } else {
        Write-Host 'Contenu restant dans tools\ :' -ForegroundColor Yellow
        $left | ForEach-Object { Write-Host "  $($_.Name)" -ForegroundColor DarkGray }
    }
}

Write-Host ''
Write-Host 'Termine. Demarrez le backend avec :' -ForegroundColor Green
Write-Host '  mvn spring-boot:run' -ForegroundColor Cyan
Write-Host '  ou DEMARRER-BACKEND.bat' -ForegroundColor Cyan
Write-Host ''
