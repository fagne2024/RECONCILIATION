#Requires -Version 5.1
<#
.SYNOPSIS
    Dump MySQL de la base ReconciliApp (mysqldump + compression ZIP).

.PARAMETER Database
    Nom de la base (defaut : $env:DB_NAME ou top20).

.PARAMETER Host
    Hote MySQL (defaut : localhost).

.PARAMETER Port
    Port MySQL (defaut : 3306).

.PARAMETER Username
    Utilisateur MySQL (defaut : $env:DB_USERNAME ou root).

.PARAMETER Password
    Mot de passe MySQL (defaut : $env:DB_PASSWORD ou root).

.PARAMETER OutputDir
    Dossier de sortie (defaut : C:\reconciliation\backups\mysql).

.PARAMETER RetentionDays
    Supprime les dumps plus anciens que N jours (defaut : 365).

.EXAMPLE
    .\dump-mysql.ps1
    .\dump-mysql.ps1 -Database reconciliation -Username reco
#>
[CmdletBinding()]
param(
    [string]$Database = $(if ($env:DB_NAME) { $env:DB_NAME } else { 'top20' }),
    [string]$DbHost = 'localhost',
    [int]$Port = 3306,
    [string]$Username = $(if ($env:DB_USERNAME) { $env:DB_USERNAME } else { 'root' }),
    [string]$Password = $(if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { 'root' }),
    [string]$OutputDir = 'C:\reconciliation\backups\mysql',
    [int]$RetentionDays = 365,
    [string]$MysqldumpPath,
    [switch]$SkipCompression
)

$ErrorActionPreference = 'Stop'
$scriptDir = $PSScriptRoot
$configFile = Join-Path $scriptDir 'dump-mysql.config.ps1'
if (Test-Path -LiteralPath $configFile) {
    . $configFile
}

function Find-Mysqldump {
    if ($MysqldumpPath -and (Test-Path -LiteralPath $MysqldumpPath)) {
        return $MysqldumpPath
    }
    $cmd = Get-Command mysqldump -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }

    $candidates = @(
        'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqldump.exe',
        'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe',
        'C:\Program Files\MySQL\MySQL Server 5.7\bin\mysqldump.exe',
        'C:\xampp\mysql\bin\mysqldump.exe'
    )
    foreach ($path in $candidates) {
        if (Test-Path -LiteralPath $path) { return $path }
    }
    throw 'mysqldump introuvable. Installez MySQL ou passez -MysqldumpPath.'
}

function Write-DumpLog {
    param([string]$Message)
    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
    Add-Content -LiteralPath $logFile -Value $line -Encoding UTF8
    Write-Host $Message
}

$mysqldump = Find-Mysqldump
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$timestamp = Get-Date -Format 'yyyy-MM-dd_HHmmss'
$baseName = "${Database}_${timestamp}"
$sqlFile = Join-Path $OutputDir "$baseName.sql"
$zipFile = Join-Path $OutputDir "$baseName.zip"
$logFile = Join-Path $OutputDir 'dump.log'

Write-DumpLog "Debut dump : $Database @ ${DbHost}:${Port} (user=$Username)"

$dumpArgs = @(
    "--host=$DbHost",
    "--port=$Port",
    "--user=$Username",
    "--password=$Password",
    '--single-transaction',
    '--routines',
    '--triggers',
    '--events',
    '--set-gtid-purged=OFF',
    '--default-character-set=utf8mb4',
    "--result-file=$sqlFile",
    $Database
)

& $mysqldump @dumpArgs
if ($LASTEXITCODE -ne 0) {
    if (Test-Path -LiteralPath $sqlFile) { Remove-Item -LiteralPath $sqlFile -Force }
    Write-DumpLog "ERREUR mysqldump (code $LASTEXITCODE)"
    exit $LASTEXITCODE
}

$sqlSize = (Get-Item -LiteralPath $sqlFile).Length
Write-DumpLog "Dump SQL cree : $sqlFile ($([math]::Round($sqlSize / 1MB, 2)) Mo)"

if (-not $SkipCompression) {
    Compress-Archive -LiteralPath $sqlFile -DestinationPath $zipFile -Force
    Remove-Item -LiteralPath $sqlFile -Force
    $zipSize = (Get-Item -LiteralPath $zipFile).Length
    Write-DumpLog "Archive ZIP : $zipFile ($([math]::Round($zipSize / 1MB, 2)) Mo)"
    $finalFile = $zipFile
} else {
    $finalFile = $sqlFile
}

$cutoff = (Get-Date).AddDays(-$RetentionDays)
$removed = 0
Get-ChildItem -LiteralPath $OutputDir -File |
    Where-Object {
        $_.Extension -in '.sql', '.zip' -and
        $_.LastWriteTime -lt $cutoff
    } |
    ForEach-Object {
        Remove-Item -LiteralPath $_.FullName -Force
        $removed++
    }

if ($removed -gt 0) {
    Write-DumpLog "Rotation : $removed ancien(s) dump(s) supprime(s) (> $RetentionDays jours)"
}

Write-DumpLog "Dump termine : $finalFile"
Write-Output $finalFile
