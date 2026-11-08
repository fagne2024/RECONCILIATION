#Requires -Version 5.1
<#
.SYNOPSIS
    Instance FRONTEND DE DEV isolee.
    - Port : 4201                         (la prod reste sur 4200)
    - API  : https://localhost:8444       (backend dev -> base top20_dev)
    - Aucun fichier de configuration de la prod n'est modifie.

.PARAMETER Detached
    Lance le serveur Angular dans un processus separe.
#>
param(
    [switch]$Detached
)

$ErrorActionPreference = 'Stop'

$frontendDir = $PSScriptRoot
$logsDir     = Join-Path $frontendDir 'logs'
$pidFile     = Join-Path $logsDir 'frontend-dev.pid'
$outLog      = Join-Path $logsDir 'frontend-dev-stdout.log'
$errLog      = Join-Path $logsDir 'frontend-dev-stderr.log'

$DevPort    = 4201
$DevBackend = 'https://localhost:8444'

$sslKey  = 'C:\Certs\reconciliation\reconciliation.intouchgroup.net-key.pem'
$sslCert = 'C:\Certs\reconciliation\reconciliation.intouchgroup.net-crt.pem'

Set-Location $frontendDir
New-Item -ItemType Directory -Force -Path $logsDir | Out-Null

if (-not (Test-Path -LiteralPath $sslKey) -or -not (Test-Path -LiteralPath $sslCert)) {
    Write-Host "Certificat SSL introuvable : $sslKey / $sslCert" -ForegroundColor Red
    exit 1
}

$owner = Get-NetTCPConnection -State Listen -LocalPort $DevPort -ErrorAction SilentlyContinue | Select-Object -First 1
if ($owner) {
    Write-Host "Port $DevPort deja occupe par PID $($owner.OwningProcess)." -ForegroundColor Red
    Write-Host 'Arretez l instance dev (stop-frontend-dev.ps1) avant de relancer.' -ForegroundColor Yellow
    exit 1
}

# Isolation : proxy Angular (proxy.conf.js) lit BACKEND_URL
$env:BACKEND_URL   = $DevBackend
$env:NODE_OPTIONS  = '--no-deprecation'

$ngArgs = @(
    '.\node_modules\@angular\cli\bin\ng', 'serve',
    '--ssl',
    '--ssl-key',  $sslKey,
    '--ssl-cert', $sslCert,
    '--host', '0.0.0.0',
    '--port', "$DevPort"
)

Write-Host ''
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  ReconciliApp DEV - frontend isole'      -ForegroundColor Cyan
Write-Host "  Port : $DevPort    API -> $DevBackend"  -ForegroundColor Cyan
Write-Host '  Prod (4200 / 8443) NON modifiee'       -ForegroundColor Green
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''

if ($Detached) {
    $argLine = $ngArgs -join ' '
    $proc = Start-Process -FilePath 'node' -ArgumentList $argLine `
        -WorkingDirectory $frontendDir -PassThru -WindowStyle Hidden `
        -RedirectStandardOutput $outLog -RedirectStandardError $errLog
    Set-Content -LiteralPath $pidFile -Value $proc.Id -NoNewline
    Write-Host "Frontend DEV detache PID $($proc.Id)" -ForegroundColor Green
    Write-Host "URL  : https://localhost:$DevPort" -ForegroundColor Green
    Write-Host 'Logs : logs\frontend-dev-stdout.log' -ForegroundColor DarkGray
    exit 0
}

Write-Host 'NE FERMEZ PAS cette fenetre - Ctrl+C = arret propre' -ForegroundColor Yellow
& node @ngArgs
exit $LASTEXITCODE
