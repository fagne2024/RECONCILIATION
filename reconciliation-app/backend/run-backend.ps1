#Requires -Version 5.1
<#
.SYNOPSIS
    Démarre le backend Spring Boot avec une heap JVM limitée (3 Go max).
#>
$ErrorActionPreference = 'Stop'

$jvmArgs = '-Xms256m -Xmx3072m -XX:MaxMetaspaceSize=384m -XX:MaxDirectMemorySize=256m -XX:+UseG1GC -XX:+UseStringDeduplication -XX:+ExitOnOutOfMemoryError -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=./logs/heap-dump.hprof'

New-Item -ItemType Directory -Force -Path (Join-Path $PSScriptRoot 'logs') | Out-Null

Write-Host "Backend — heap max 3 Go, logs/heap-dump.hprof en cas d'OOM" -ForegroundColor Cyan
Write-Host "JVM: $jvmArgs" -ForegroundColor DarkGray

Set-Location $PSScriptRoot
mvn spring-boot:run "-Dspring-boot.run.jvmArguments=$jvmArgs"
