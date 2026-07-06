#Requires -Version 5.1
<#
.SYNOPSIS
    Demarre le backend via java -jar (processus unique, sans fork Maven).
.PARAMETER Detached
    Lance Java dans un processus separe (survit a la fermeture du terminal).
    Sans ce flag, Java tourne au premier plan dans cette fenetre (Ctrl+C = arret propre).
#>
param(
    [switch]$Detached
)

$ErrorActionPreference = 'Stop'
$backendDir = $PSScriptRoot
$jar = Join-Path $backendDir 'target\csv-reconciliation-1.0.0.jar'
$logsDir = Join-Path $backendDir 'logs'
$pidFile = Join-Path $logsDir 'backend-java.pid'
$stdoutLog = Join-Path $logsDir 'backend-stdout.log'

. (Join-Path $backendDir 'backend-common.ps1')

Set-Location $backendDir
New-Item -ItemType Directory -Force -Path $logsDir | Out-Null

if (-not (Test-Path -LiteralPath $jar)) {
    Write-Host 'JAR absent — compilation (mvn package -DskipTests)...' -ForegroundColor Yellow
    & mvn package -DskipTests -q
    if ($LASTEXITCODE -ne 0) {
        Write-Host 'Echec compilation.' -ForegroundColor Red
        exit 1
    }
}

$existingPid = Get-BackendPortOwnerPid -Port 8443
if ($existingPid) {
    $owner = Get-Process -Id $existingPid -ErrorAction SilentlyContinue
    $ownerName = if ($owner) { $owner.ProcessName } else { 'inconnu' }
    Write-Host "Port 8443 deja occupe par PID $existingPid ($ownerName)." -ForegroundColor Red
    Write-Host 'Arretez le backend existant (stop-backend.ps1) avant de relancer.' -ForegroundColor Yellow
    exit 1
}

$javaExe = $null
if ($env:JAVA_HOME) {
    $candidate = Join-Path $env:JAVA_HOME 'bin\java.exe'
    if (Test-Path -LiteralPath $candidate) { $javaExe = $candidate }
}
if (-not $javaExe) {
    $javaExe = (Get-Command java -ErrorAction SilentlyContinue).Source
}
if (-not $javaExe) {
    Write-Host 'java.exe introuvable (JAVA_HOME ou PATH).' -ForegroundColor Red
    exit 1
}

$jvmArgs = @(
    '-Xms512m', '-Xmx4096m', '-Xss512k',
    '-XX:MaxMetaspaceSize=512m', '-XX:MaxDirectMemorySize=512m',
    '-XX:+UseG1GC', '-XX:+UseStringDeduplication',
    '-XX:+HeapDumpOnOutOfMemoryError',
    '-XX:HeapDumpPath=./logs/heap-dump.hprof',
    '-XX:ErrorFile=./logs/hs_err_jvm.log',
    '-Djava.awt.headless=true'
)

Write-Host ''
Write-Host '========================================' -ForegroundColor Cyan
if ($Detached) {
    Write-Host '  ReconciliApp — java -jar (detache)' -ForegroundColor Cyan
} else {
    Write-Host '  ReconciliApp — java -jar (premier plan)' -ForegroundColor Cyan
    Write-Host '  NE FERMEZ PAS cette fenetre' -ForegroundColor Yellow
    Write-Host '  Ctrl+C = arret propre' -ForegroundColor DarkGray
}
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''

if ($Detached) {
    $argLine = ($jvmArgs + @('-jar', $jar)) -join ' '
    $proc = Start-Process -FilePath $javaExe -ArgumentList $argLine `
        -WorkingDirectory $backendDir -PassThru -WindowStyle Hidden `
        -RedirectStandardOutput $stdoutLog -RedirectStandardError $stdoutLog

    Set-Content -LiteralPath $pidFile -Value $proc.Id -NoNewline
    Write-Host "Backend detache PID $($proc.Id)" -ForegroundColor Green
    Write-Host "Logs console : logs\backend-stdout.log" -ForegroundColor DarkGray
    Write-Host 'Cette fenetre peut etre fermee — le backend continue.' -ForegroundColor Green
    exit 0
}

# Premier plan : executer java dans ce shell (evite Start-Process -NoNewWindow + signaux console partages)
try {
    & $javaExe @jvmArgs -jar $jar
    exit $LASTEXITCODE
} finally {
    if (Test-Path -LiteralPath $pidFile) {
        Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
    }
}
