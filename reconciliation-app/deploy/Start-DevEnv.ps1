#Requires -Version 5.1
<#
.SYNOPSIS
    Démarre l'environnement ReconciliApp DEV (backend + reverse proxy Node).

.EXAMPLE
    .\Start-DevEnv.ps1
    .\Start-DevEnv.ps1 -Stop
    .\Start-DevEnv.ps1 -Local -HttpPort 8089
#>
param(
    [switch]$Stop,
    [switch]$SkipBackend,
    [switch]$SkipPulse,
    [switch]$Local,
    [int]$HttpPort = 8082
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$ServerRoot = 'C:\reconciliation-app'
$BackendDir = Join-Path $ServerRoot 'backend'
$DeployDir = $PSScriptRoot
$Jar = Join-Path $BackendDir 'target\csv-reconciliation-1.0.0.jar'
if (-not (Test-Path $Jar)) {
    $BackendDir = Join-Path $Root 'backend'
    $Jar = Join-Path $BackendDir 'target\csv-reconciliation-1.0.0.jar'
}
$DistDev = 'C:\reconciliation-app\frontend\dist-dev\csv-reconciliation'
$DistProd = 'C:\reconciliation-app\frontend\dist\csv-reconciliation'
$DevUrl = 'https://dev.reconciliation.intouchgroup.net:8444'
$DevUrlAlt = 'https://reconciliation.intouchgroup.net:8444'
$PnlDeploy = 'C:\pnlapp\deploy'
$PulseHttpPort = 8088
$PulseHttpsPort = 8445
$ReconBackendPort = 8443

function Stop-Port([int]$Port) {
    Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
        ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}

function Wait-BackendReady {
    param([int]$TimeoutSec = 420)
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    Write-Host "Attente backend DEV (jusqu'a $TimeoutSec s)..." -ForegroundColor DarkGray
    while ((Get-Date) -lt $deadline) {
        try {
            $r = Invoke-WebRequest -Uri 'http://127.0.0.1:8081/api/actuator/health' -UseBasicParsing -TimeoutSec 5
            if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) {
                Write-Host 'Backend DEV pret.' -ForegroundColor Green
                return $true
            }
        } catch { }
        Start-Sleep -Seconds 5
    }
    Write-Warning 'Backend DEV non joignable sur 8081 — verifier C:\reconciliation-app\backend\logs\application-dev.log'
    return $false
}

function Move-PulseOffReconPort {
    if ($SkipPulse) { return }
    if (-not (Test-Path $PnlDeploy)) {
        Write-Warning "Pulse Finance introuvable ($PnlDeploy) - liberation manuelle du port $ReconBackendPort requise si occupe."
        Stop-Port $ReconBackendPort
        return
    }
    $on8443 = Get-NetTCPConnection -LocalPort $ReconBackendPort -State Listen -ErrorAction SilentlyContinue
    if (-not $on8443) { return }

    Write-Host "Liberation du port $ReconBackendPort (reserve a ReconciliApp)..." -ForegroundColor Yellow
    Stop-Port $ReconBackendPort
    Start-Sleep -Seconds 1

    $log = Join-Path $PnlDeploy 'logs\proxy-alt.log'
    New-Item -ItemType Directory -Force -Path (Join-Path $PnlDeploy 'logs') | Out-Null
    $cmd = "Set-Location '$PnlDeploy'; `$env:HTTP_PORT='$PulseHttpPort'; `$env:HTTPS_PORT='$PulseHttpsPort'; `$env:FORCE_HTTPS='1'; `$env:SSL_DOMAIN='pulsefinance.intouchgroup.net'; node reverse_proxy.js *>> '$log' 2>&1"
    Start-Process -FilePath powershell.exe -ArgumentList @('-NoProfile', '-WindowStyle', 'Hidden', '-Command', $cmd)
    Start-Sleep -Seconds 3
    Write-Host "Pulse Finance redemarre sur $PulseHttpPort / $PulseHttpsPort (plus sur $ReconBackendPort)." -ForegroundColor DarkGray
}

if ($Stop) {
    Write-Host 'Arret environnement DEV...' -ForegroundColor Yellow
    foreach ($p in @($HttpPort, 8081, 8444)) { Stop-Port $p }
    Write-Host 'Services DEV arretes.' -ForegroundColor Green
    exit 0
}

Write-Host "`n=== ReconciliApp DEV ===" -ForegroundColor Cyan

Move-PulseOffReconPort

# Sync dist-dev vers C:\reconciliation-app
$srcDist = Join-Path $Root 'frontend\dist-dev\csv-reconciliation'
if (-not (Test-Path "$srcDist\index.html")) {
    $prodDist = Join-Path $Root 'frontend\dist\csv-reconciliation'
    if (Test-Path "$prodDist\index.html") {
        Write-Host 'Copie dist -> dist-dev...' -ForegroundColor Yellow
        New-Item -ItemType Directory -Force -Path $srcDist | Out-Null
        robocopy $prodDist $srcDist /MIR /NFL /NDL /NJH /NJS /NC /NS | Out-Null
    }
}
New-Item -ItemType Directory -Force -Path $DistDev | Out-Null
if (Test-Path $srcDist) {
    robocopy $srcDist $DistDev /MIR /NFL /NDL /NJH /NJS /NC /NS | Out-Null
    New-Item -ItemType Directory -Force -Path $DistProd | Out-Null
    robocopy $srcDist $DistProd /MIR /NFL /NDL /NJH /NJS /NC /NS | Out-Null
}

# Backend
if (-not $SkipBackend) {
    if (-not (Test-Path $Jar)) {
        Write-Host 'Build backend...' -ForegroundColor Yellow
        Push-Location (Join-Path $Root 'backend')
        mvn package -DskipTests -q
        Pop-Location
    }

    $on8081 = Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue
    if (-not $on8081) {
        Write-Host 'Demarrage backend DEV (port 8081)...' -ForegroundColor Yellow
        New-Item -ItemType Directory -Force -Path (Join-Path $BackendDir 'logs') | Out-Null
        Start-Process -FilePath java -ArgumentList @(
            '-Xms256m', '-Xmx2048m', '-Dspring.profiles.active=dev',
            '-jar', $Jar
        ) -WorkingDirectory $BackendDir `
            -RedirectStandardOutput (Join-Path $BackendDir 'logs\backend-dev-stdout.log') `
            -RedirectStandardError (Join-Path $BackendDir 'logs\backend-dev-stderr.log') `
            -WindowStyle Hidden
        Wait-BackendReady | Out-Null
    } else {
        Write-Host 'Backend DEV deja actif sur 8081.' -ForegroundColor Green
    }
}

# Reverse proxy Node (HTTP redirect + HTTPS 8444) — pas 8080 (souvent occupe)
Stop-Port $HttpPort
Stop-Port 8444
Start-Sleep -Seconds 1

Write-Host "Demarrage reverse proxy DEV ($HttpPort + 8444)..." -ForegroundColor Yellow
$env:RECON_DEV_HTTP_PORT = "$HttpPort"
if ($Local) { $env:RECON_DEV_FORCE_HTTPS = '0' }
Start-Process -FilePath node -ArgumentList 'reverse_proxy-dev.js' `
    -WorkingDirectory $DeployDir `
    -RedirectStandardOutput (Join-Path $DeployDir 'logs\proxy-dev-stdout.log') `
    -RedirectStandardError (Join-Path $DeployDir 'logs\proxy-dev-stderr.log') `
    -WindowStyle Hidden

Start-Sleep -Seconds 3

$localLine = if ($Local) { "  Lien local     : http://localhost:$HttpPort`n" } else { '' }

Write-Host (@"

========================================
  Environnement DEV pret
========================================
$localLine
  Lien testeurs : {0}
  (apres enregistrement DNS OVH — voir deploy\DNS-DEV-OVH.txt)

  Lien alternatif (disponible maintenant) :
  {1}

  HTTP (redirect): http://dev.reconciliation.intouchgroup.net:$HttpPort
  Backend direct : http://localhost:8081/api
  Base MySQL     : top20_dev
  Compte test    : admin / admin

  Note: le port 8443 est reserve au backend ReconciliApp (HTTPS prod).
        Pulse Finance utilise $PulseHttpPort / $PulseHttpsPort (pas 8443).
        ReconciliApp DEV utilise $HttpPort/8444 (pas 8080).

"@ -f $DevUrl, $DevUrlAlt) -ForegroundColor Green
