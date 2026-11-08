#Requires -Version 5.1
<#
.SYNOPSIS
    Instance BACKEND DE DEV isolee.
    - Port : 8444        (la prod reste sur 8443)
    - Base : top20_dev   (la prod reste sur top20)
    - Aucun fichier de configuration de la prod n'est modifie.

.PARAMETER Detached
    Lance Java dans un processus separe (survit a la fermeture du terminal).
#>
param(
    [switch]$Detached
)

$ErrorActionPreference = 'Stop'

$backendDir = $PSScriptRoot
$jar        = Join-Path $backendDir 'target-dev\csv-reconciliation-dev.jar'
$logsDir    = Join-Path $backendDir 'logs'
$pidFile    = Join-Path $logsDir 'backend-dev-java.pid'
$outLog     = Join-Path $logsDir 'backend-dev-stdout.log'
$errLog     = Join-Path $logsDir 'backend-dev-stderr.log'

$DevPort = 8444
$DevDb   = 'top20_dev'

Set-Location $backendDir
New-Item -ItemType Directory -Force -Path $logsDir | Out-Null

if (-not (Test-Path -LiteralPath $jar)) {
    Write-Host 'JAR dev absent - build dans une copie isolee...' -ForegroundColor Yellow
    & (Join-Path $backendDir 'build-backend-dev.ps1')
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $jar)) {
        Write-Host 'Echec du build dev.' -ForegroundColor Red
        exit 1
    }
}

$owner = Get-NetTCPConnection -State Listen -LocalPort $DevPort -ErrorAction SilentlyContinue | Select-Object -First 1
if ($owner) {
    Write-Host "Port $DevPort deja occupe par PID $($owner.OwningProcess)." -ForegroundColor Red
    Write-Host 'Arretez l instance dev (stop-backend-dev.ps1) avant de relancer.' -ForegroundColor Yellow
    exit 1
}

$javaExe = $null
if ($env:JAVA_HOME) {
    $candidate = Join-Path $env:JAVA_HOME 'bin\java.exe'
    if (Test-Path -LiteralPath $candidate) { $javaExe = $candidate }
}
if (-not $javaExe) { $javaExe = (Get-Command java -ErrorAction SilentlyContinue).Source }
if (-not $javaExe) { Write-Host 'java.exe introuvable (JAVA_HOME ou PATH).' -ForegroundColor Red; exit 1 }

# --- Isolation : variables valables uniquement pour ce processus ---
$env:SPRING_DATASOURCE_URL = "jdbc:mysql://localhost:3306/$DevDb" +
    "?createDatabaseIfNotExist=true&allowPublicKeyRetrieval=true&useSSL=false" +
    "&serverTimezone=UTC&allowMultiQueries=true&useUnicode=true&characterEncoding=UTF-8"
if (-not $env:DB_USERNAME) { $env:DB_USERNAME = 'root' }
if (-not $env:DB_PASSWORD) { $env:DB_PASSWORD = 'root' }

# Lien de connexion dans les emails (creation de compte) : frontend TEST 4201
$env:APP_URL = 'https://reconciliation.intouchgroup.net:4201'

# --- CORS : autoriser les origines du frontend DEV (port 4201) ---
# Sans cela, le navigateur envoie "Origin: https://localhost:4201" sur le POST
# /api/auth/login ; le proxy Angular la transmet au backend qui repond
# 403 "Invalid CORS request" -> message generique "identifiants incorrects".
# On conserve les origines par defaut (4200/3000) pour ne rien casser.
$env:APP_ALLOWED_ORIGINS = @(
    'http://localhost:4200', 'https://localhost:4200',
    'http://localhost:3000', 'https://localhost:3000',
    'http://172.214.108.8:4200', 'https://172.214.108.8:4200',
    'http://reconciliation.intouchgroup.net:4200', 'https://reconciliation.intouchgroup.net:4200',
    'https://reconciliation.intouchgroup.net',
    # --- DEV 4201 ---
    'http://localhost:4201', 'https://localhost:4201',
    'http://127.0.0.1:4201', 'https://127.0.0.1:4201',
    'http://10.0.0.4:4201', 'https://10.0.0.4:4201',
    'http://SRVBurpSuite:4201', 'https://SRVBurpSuite:4201',
    'http://reconciliation.intouchgroup.net:4201', 'https://reconciliation.intouchgroup.net:4201'
) -join ','

$jvmArgs = @(
    '-Xms256m', '-Xmx2048m', '-Xss512k',
    '-XX:MaxMetaspaceSize=512m',
    '-XX:+UseG1GC',
    '-XX:+HeapDumpOnOutOfMemoryError',
    '-XX:HeapDumpPath=./logs/heap-dump-dev.hprof',
    '-Djava.awt.headless=true'
)
$appArgs = @(
    '-jar', $jar,
    "--server.port=$DevPort",
    '--spring.profiles.active=dev',
    '--app.url=https://reconciliation.intouchgroup.net:4201'
)

Write-Host ''
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  ReconciliApp DEV - backend isole'      -ForegroundColor Cyan
Write-Host "  Port : $DevPort    Base : $DevDb"     -ForegroundColor Cyan
Write-Host '  Prod (8443 / top20) NON modifiee'     -ForegroundColor Green
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''

if ($Detached) {
    $argLine = ($jvmArgs + $appArgs) -join ' '
    $proc = Start-Process -FilePath $javaExe -ArgumentList $argLine `
        -WorkingDirectory $backendDir -PassThru -WindowStyle Hidden `
        -RedirectStandardOutput $outLog -RedirectStandardError $errLog
    Set-Content -LiteralPath $pidFile -Value $proc.Id -NoNewline
    Write-Host "Backend DEV detache PID $($proc.Id)" -ForegroundColor Green
    Write-Host "URL  : https://localhost:$DevPort" -ForegroundColor Green
    Write-Host 'Logs : logs\backend-dev-stdout.log' -ForegroundColor DarkGray
    exit 0
}

Write-Host 'NE FERMEZ PAS cette fenetre - Ctrl+C = arret propre' -ForegroundColor Yellow
try {
    & $javaExe @jvmArgs @appArgs
    exit $LASTEXITCODE
}
finally {
    if (Test-Path -LiteralPath $pidFile) {
        Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
    }
}
