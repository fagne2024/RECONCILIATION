# Script pour créer un dump de la base de données SQLite
# Usage: .\create-database-dump.ps1

param(
    [string]$OutputPath = ".\backups\",
    [string]$DatabasePath = ".\reconciliation-app\backend\prisma\dev.db"
)

# Vérifier si le répertoire de sauvegarde existe
if (-not (Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath -Force
    Write-Host "Répertoire de sauvegarde créé: $OutputPath" -ForegroundColor Green
}

# Générer le nom du fichier avec timestamp
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$dumpFileName = "dump_database_$timestamp.sql"
$fullDumpPath = Join-Path $OutputPath $dumpFileName

Write-Host "Création du dump de la base de données..." -ForegroundColor Yellow
Write-Host "Base de données source: $DatabasePath" -ForegroundColor Cyan
Write-Host "Fichier de dump: $fullDumpPath" -ForegroundColor Cyan

# Vérifier si la base de données existe
if (-not (Test-Path $DatabasePath)) {
    Write-Error "La base de données n'existe pas à l'emplacement: $DatabasePath"
    exit 1
}

try {
    # Créer le dump SQLite
    sqlite3 $DatabasePath ".dump" > $fullDumpPath
    
    if ($LASTEXITCODE -eq 0) {
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
        
    } else {
        Write-Error "Erreur lors de la création du dump"
        exit 1
    }
    
} catch {
    Write-Error "Erreur: $($_.Exception.Message)"
    exit 1
}

Write-Host "`nDump termine avec succes!" -ForegroundColor Green
