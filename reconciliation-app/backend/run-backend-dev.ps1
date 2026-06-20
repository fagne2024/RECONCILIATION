#Requires -Version 5.1
<#
.SYNOPSIS
    Démarre le backend Spring Boot en profil DEV (port 8081, base top20_dev).
#>
$ErrorActionPreference = 'Stop'

$backendDir = $PSScriptRoot
$jar = Join-Path $backendDir 'target\csv-reconciliation-1.0.0.jar'
$logsDir = Join-Path $backendDir 'logs'
New-Item -ItemType Directory -Force -Path $logsDir | Out-Null

$jvmArgs = '-Xms256m -Xmx2048m -XX:MaxMetaspaceSize=384m -XX:+UseG1GC -XX:+UseStringDeduplication'

if (-not (Test-Path $jar)) {
    Write-Host 'JAR introuvable — build Maven...' -ForegroundColor Yellow
    Set-Location $backendDir
    mvn package -DskipTests -q
    if ($LASTEXITCODE -ne 0) { throw 'Echec du build Maven.' }
}

Write-Host 'Backend DEV — profil dev, port 8081, base top20_dev' -ForegroundColor Cyan
Set-Location $backendDir
& java $jvmArgs.Split(' ') '-Dspring.profiles.active=dev' '-jar' $jar
