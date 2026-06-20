#Requires -Version 5.1
<#
.SYNOPSIS
    Démarre le backend Spring Boot avec une heap JVM limitée (3 Go max).
#>
$ErrorActionPreference = 'Stop'

$jvmArgs = '-Xms256m -Xmx3072m -XX:MaxMetaspaceSize=384m -XX:MaxDirectMemorySize=256m -XX:+UseG1GC -XX:+UseStringDeduplication -XX:+ExitOnOutOfMemoryError -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=./logs/heap-dump.hprof'

New-Item -ItemType Directory -Force -Path (Join-Path $PSScriptRoot 'logs') | Out-Null

$on8443 = Get-NetTCPConnection -LocalPort 8443 -State Listen -ErrorAction SilentlyContinue
if ($on8443) {
    $pid8443 = ($on8443 | Select-Object -First 1).OwningProcess
    Write-Host "ERREUR: le port 8443 est deja utilise (PID $pid8443)." -ForegroundColor Red
    Write-Host "Ce port est reserve a ReconciliApp. Pulse Finance doit utiliser 8088/8445." -ForegroundColor Yellow
    Write-Host "Lancez: cd ..\deploy ; .\Start-DevEnv.ps1 -SkipBackend" -ForegroundColor Yellow
    exit 1
}

Write-Host "Backend — heap max 3 Go, logs/heap-dump.hprof en cas d'OOM" -ForegroundColor Cyan
Write-Host "JVM: $jvmArgs" -ForegroundColor DarkGray

Set-Location $PSScriptRoot
mvn spring-boot:run "-Dspring-boot.run.jvmArguments=$jvmArgs"
