#Requires -Version 5.1
<#
.SYNOPSIS
    Compile un JAR BACKEND DE DEV dans target-dev\csv-reconciliation-dev.jar.
    Le build se fait dans une copie isolee (dossier TEMP) car le JAR prod
    (target\csv-reconciliation-1.0.0.jar) est verrouille par le processus prod.
    Le JAR et le processus de prod ne sont pas touches.
#>

$ErrorActionPreference = 'Stop'

$backendDir = $PSScriptRoot
$devOutDir  = Join-Path $backendDir 'target-dev'
$buildDir   = Join-Path $env:TEMP 'reco-dev-build'
$devJar     = Join-Path $devOutDir 'csv-reconciliation-dev.jar'

Write-Host 'Build du backend DEV (copie isolee)...' -ForegroundColor Cyan

if (Test-Path -LiteralPath $buildDir) { Remove-Item -LiteralPath $buildDir -Recurse -Force }
New-Item -ItemType Directory -Force -Path $buildDir | Out-Null

Copy-Item (Join-Path $backendDir 'pom.xml') $buildDir
Copy-Item (Join-Path $backendDir 'src') $buildDir -Recurse

Push-Location $buildDir
try {
    & mvn package -DskipTests -q
    if ($LASTEXITCODE -ne 0) { throw "mvn package a echoue (code $LASTEXITCODE)" }
}
finally {
    Pop-Location
}

New-Item -ItemType Directory -Force -Path $devOutDir | Out-Null
Copy-Item (Join-Path $buildDir 'target\csv-reconciliation-1.0.0.jar') $devJar -Force

Write-Host "JAR dev pret : $devJar" -ForegroundColor Green
