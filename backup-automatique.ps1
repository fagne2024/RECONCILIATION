# Script de sauvegarde automatique de la base de données MySQL
# Configuration
$DB_NAME = "top20"
$DB_USER = "root"
$MYSQLDUMP_PATH = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"
$BACKUP_DIR = ".\backups"
$MAX_BACKUPS = 10  # Nombre maximum de sauvegardes à conserver

# Créer le dossier de sauvegarde s'il n'existe pas
if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null
    Write-Host "📁 Dossier de sauvegarde créé: $BACKUP_DIR" -ForegroundColor Green
}

# Nom du fichier de dump avec timestamp
$TIMESTAMP = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$DUMP_FILE = "$BACKUP_DIR\dump_top20_$TIMESTAMP.sql"

Write-Host "=== Sauvegarde automatique de la base de données MySQL ===" -ForegroundColor Green
Write-Host "Base de données: $DB_NAME" -ForegroundColor Yellow
Write-Host "Fichier de sortie: $DUMP_FILE" -ForegroundColor Yellow
Write-Host "Dossier de sauvegarde: $BACKUP_DIR" -ForegroundColor Yellow
Write-Host ""

# Vérifier si mysqldump existe
if (-not (Test-Path $MYSQLDUMP_PATH)) {
    Write-Host "❌ Erreur: mysqldump non trouvé à $MYSQLDUMP_PATH" -ForegroundColor Red
    Write-Host "Veuillez vérifier l'installation de MySQL" -ForegroundColor Red
    exit 1
}

Write-Host "✓ mysqldump trouvé" -ForegroundColor Green
Write-Host "Exécution de la sauvegarde..." -ForegroundColor Cyan

# Exécuter le dump
try {
    & $MYSQLDUMP_PATH -u $DB_USER -p --single-transaction --routines --triggers --events --add-drop-database --add-drop-table --create-options --complete-insert --extended-insert --set-charset --default-character-set=utf8mb4 --databases $DB_NAME > $DUMP_FILE
    
    if ($LASTEXITCODE -eq 0) {
        $fileSize = (Get-Item $DUMP_FILE).Length
        $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
        
        Write-Host ""
        Write-Host "✅ Sauvegarde terminée avec succès!" -ForegroundColor Green
        Write-Host "📁 Fichier: $DUMP_FILE" -ForegroundColor Yellow
        Write-Host "📊 Taille: $fileSizeMB MB" -ForegroundColor Yellow
        
        # Afficher les informations sur le fichier
        Write-Host ""
        Write-Host "=== Informations sur la sauvegarde ===" -ForegroundColor Cyan
        $lineCount = (Get-Content $DUMP_FILE | Measure-Object -Line).Lines
        Write-Host "Nombre de lignes: $lineCount" -ForegroundColor White
        
        # Nettoyer les anciennes sauvegardes
        Write-Host ""
        Write-Host "=== Nettoyage des anciennes sauvegardes ===" -ForegroundColor Cyan
        $backupFiles = Get-ChildItem -Path $BACKUP_DIR -Filter "dump_top20_*.sql" | Sort-Object LastWriteTime -Descending
        
        if ($backupFiles.Count -gt $MAX_BACKUPS) {
            $filesToDelete = $backupFiles | Select-Object -Skip $MAX_BACKUPS
            foreach ($file in $filesToDelete) {
                Remove-Item $file.FullName -Force
                Write-Host "🗑️ Supprimé: $($file.Name)" -ForegroundColor Red
            }
            Write-Host "✅ Nettoyage terminé. $MAX_BACKUPS sauvegardes conservées." -ForegroundColor Green
        } else {
            Write-Host "ℹ️ Aucun nettoyage nécessaire. $($backupFiles.Count) sauvegardes présentes." -ForegroundColor Blue
        }
        
        # Afficher la liste des sauvegardes
        Write-Host ""
        Write-Host "=== Liste des sauvegardes disponibles ===" -ForegroundColor Cyan
        $currentBackups = Get-ChildItem -Path $BACKUP_DIR -Filter "dump_top20_*.sql" | Sort-Object LastWriteTime -Descending
        foreach ($backup in $currentBackups) {
            $size = [math]::Round($backup.Length / 1MB, 2)
            $date = $backup.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
            Write-Host "📄 $($backup.Name) - $size MB - $date" -ForegroundColor White
        }
        
    } else {
        Write-Host "❌ Erreur lors de la sauvegarde (code: $LASTEXITCODE)" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "❌ Erreur lors de l'exécution de la sauvegarde: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Instructions de restauration ===" -ForegroundColor Cyan
Write-Host "Pour restaurer cette sauvegarde:" -ForegroundColor White
Write-Host "mysql -u $DB_USER -p $DB_NAME < $DUMP_FILE" -ForegroundColor Yellow
Write-Host ""
Write-Host "Ou pour créer une nouvelle base:" -ForegroundColor White
Write-Host "mysql -u $DB_USER -p -e 'CREATE DATABASE IF NOT EXISTS $DB_NAME;'" -ForegroundColor Yellow
Write-Host "mysql -u $DB_USER -p $DB_NAME < $DUMP_FILE" -ForegroundColor Yellow 