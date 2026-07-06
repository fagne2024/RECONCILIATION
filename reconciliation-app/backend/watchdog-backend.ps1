#Requires -Version 5.1
<#
.SYNOPSIS
    Surveille le backend ReconciliApp (HTTPS :8443) et le redemarre si necessaire.

.DESCRIPTION
    Verifie https://127.0.0.1:8443/health (Spring Actuator).
    En cas d'echec, arrete puis relance start-backend-jar.ps1 -Detached.

.EXAMPLE
    .\watchdog-backend.ps1
    .\watchdog-backend.ps1 -Quiet
#>
[CmdletBinding()]
param(
    [switch]$Quiet,
    [int]$Port = 8443,
    [int]$HealthTimeoutSec = 8,
    [int]$WaitHealthySeconds = 120
)

$ErrorActionPreference = 'Continue'
$backendDir = $PSScriptRoot
$repoRoot = Split-Path -Parent $backendDir
$logsDir = Join-Path $repoRoot 'deploy\logs'
$watchdogLog = Join-Path $logsDir 'backend-watchdog.log'
$stdoutLog = Join-Path $logsDir 'backend-watchdog-run-stdout.log'
$stderrLog = Join-Path $logsDir 'backend-watchdog-run-stderr.log'

. (Join-Path $backendDir 'backend-common.ps1')

New-Item -ItemType Directory -Force -Path $logsDir | Out-Null

function Write-WatchdogLog {
    param([string]$Message)
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $line = "$ts $Message"
    Add-Content -LiteralPath $watchdogLog -Value $line -Encoding UTF8
    if (-not $Quiet) {
        if ($Message -match '^KO:') {
            Write-Host $line -ForegroundColor Yellow
        } elseif ($Message -match '^OK:') {
            Write-Host $line -ForegroundColor Green
        } else {
            Write-Host $line
        }
    }
}

function Test-BackendHealthy {
    return Test-BackendHttpHealthy -Port $Port -TimeoutSec $HealthTimeoutSec
}

function Get-BackendListenPid {
    return Get-BackendPortOwnerPid -Port $Port
}

if (Test-BackendHealthy) {
    $ownerPid = Get-BackendListenPid
    if (-not $Quiet) {
        $pidText = if ($ownerPid) { " PID=$ownerPid" } else { '' }
        Write-Host "[OK] ReconciliApp backend :$Port$pidText" -ForegroundColor Green
    }
    exit 0
}

Write-WatchdogLog "KO: backend OFFLINE (port $Port). Tentative de relance..."

$stopScript = Join-Path $backendDir 'stop-backend.ps1'
$startScript = Join-Path $backendDir 'start-backend-jar.ps1'

if (Test-Path -LiteralPath $stopScript) {
    & $stopScript *> $null
    Start-Sleep -Seconds 3
}

if (-not (Test-Path -LiteralPath $startScript)) {
    Write-WatchdogLog "KO: start-backend-jar.ps1 introuvable."
    exit 1
}

$startProc = Start-Process -FilePath 'powershell.exe' -ArgumentList @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-WindowStyle', 'Hidden',
    '-File', $startScript,
    '-Detached'
) -WorkingDirectory $backendDir -PassThru -Wait -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog

if ($startProc.ExitCode -ne 0) {
    Write-WatchdogLog "KO: echec lancement start-backend-jar.ps1 (code $($startProc.ExitCode)). Voir deploy\logs\backend-watchdog-run-*.log"
    exit $startProc.ExitCode
}

$deadline = (Get-Date).AddSeconds($WaitHealthySeconds)
while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 3
    if (Test-BackendHealthy) {
        $ownerPid = Get-BackendListenPid
        $pidText = if ($ownerPid) { " PID=$ownerPid" } else { '' }
        Write-WatchdogLog "OK: backend relance (port $Port en ecoute).$pidText"
        exit 0
    }
}

Write-WatchdogLog "KO: relance tentee mais port $Port toujours offline. Voir deploy\logs\backend-watchdog-run-*.log et backend\logs\hs_err_jvm.log."
exit 1
