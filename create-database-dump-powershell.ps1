# Script pour créer un dump de la base de données SQLite avec PowerShell
# Usage: .\create-database-dump-powershell.ps1

param(
    [string]$OutputPath = ".\backups\",
    [string]$DatabasePath = ".\reconciliation-app\backend\prisma\dev.db"
)

# Vérifier si le répertoire de sauvegarde existe
if (-not (Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath -Force
    Write-Host "Repertoire de sauvegarde cree: $OutputPath" -ForegroundColor Green
}

# Générer le nom du fichier avec timestamp
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$dumpFileName = "dump_database_$timestamp.sql"
$fullDumpPath = Join-Path $OutputPath $dumpFileName

Write-Host "Creation du dump de la base de donnees..." -ForegroundColor Yellow
Write-Host "Base de donnees source: $DatabasePath" -ForegroundColor Cyan
Write-Host "Fichier de dump: $fullDumpPath" -ForegroundColor Cyan

# Vérifier si la base de données existe
if (-not (Test-Path $DatabasePath)) {
    Write-Error "La base de donnees n'existe pas a l'emplacement: $DatabasePath"
    exit 1
}

try {
    # Créer le contenu du dump
    $dumpContent = @()
    $dumpContent += "-- Dump de la base de donnees SQLite"
    $dumpContent += "-- Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    $dumpContent += "-- Base de donnees: $DatabasePath"
    $dumpContent += ""
    
    # Ajouter les informations sur les tables
    $dumpContent += "-- Structure des tables"
    $dumpContent += ""
    
    # Lire les informations de la base de données
    $dbInfo = Get-Item $DatabasePath
    $dumpContent += "-- Taille de la base: $([math]::Round($dbInfo.Length / 1KB, 2)) KB"
    $dumpContent += "-- Date de modification: $($dbInfo.LastWriteTime)"
    $dumpContent += ""
    
    # Ajouter les tables connues du schema Prisma
    $dumpContent += "-- Tables identifiees dans le schema Prisma:"
    $dumpContent += "-- - AgencySummary"
    $dumpContent += "-- - AutoProcessingModel"
    $dumpContent += "-- - _prisma_migrations"
    $dumpContent += ""
    
    # Ajouter des instructions de restauration
    $dumpContent += "-- Pour restaurer cette base de donnees:"
    $dumpContent += "-- 1. Copier le fichier dev.db dans le repertoire prisma/"
    $dumpContent += "-- 2. Executer: npx prisma db push"
    $dumpContent += "-- 3. Ou utiliser: npx prisma migrate deploy"
    $dumpContent += ""
    
    # Ajouter des informations sur le contenu
    $dumpContent += "-- Contenu de la base de donnees:"
    $dumpContent += "-- Ce fichier contient les metadonnees de la base de donnees."
    $dumpContent += "-- Pour un dump complet avec les donnees, installez sqlite3:"
    $dumpContent += "-- - Windows: choco install sqlite"
    $dumpContent += "-- - Ou telechargez depuis: https://www.sqlite.org/download.html"
    $dumpContent += ""
    
    # Écrire le dump
    $dumpContent | Out-File -FilePath $fullDumpPath -Encoding UTF8
    
    Write-Host "Dump cree avec succes!" -ForegroundColor Green
    Write-Host "Fichier: $fullDumpPath" -ForegroundColor Green
    
    # Afficher la taille du fichier
    $fileSize = (Get-Item $fullDumpPath).Length
    $fileSizeKB = [math]::Round($fileSize / 1KB, 2)
    Write-Host "Taille: $fileSizeKB KB" -ForegroundColor Green
    
    # Afficher les premières lignes du dump
    Write-Host "`nApercu du dump:" -ForegroundColor Yellow
    Get-Content $fullDumpPath -Head 10 | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
    
    if ((Get-Content $fullDumpPath).Count -gt 10) {
        Write-Host "   ..." -ForegroundColor Gray
    }
    
} catch {
    Write-Error "Erreur: $($_.Exception.Message)"
    exit 1
}

Write-Host "`nDump termine avec succes!" -ForegroundColor Green
Write-Host "`nNote: Ce dump contient les metadonnees de la base." -ForegroundColor Yellow
Write-Host "Pour un dump complet avec les donnees, installez sqlite3." -ForegroundColor Yellow
