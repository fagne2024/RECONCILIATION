# Script de sauvegarde automatique MySQL
$DB_NAME = "top20"
$DB_USER = "root"
$MYSQLDUMP_PATH = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"
$BACKUP_DIR = ".\backups"
$MAX_BACKUPS = 10

# Créer le dossier de sauvegarde
if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null
    Write-Host "Dossier de sauvegarde cree: $BACKUP_DIR" -ForegroundColor Green
}

# Nom du fichier de dump
$TIMESTAMP = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$DUMP_FILE = "$BACKUP_DIR\dump_top20_$TIMESTAMP.sql"

Write-Host "=== Sauvegarde automatique MySQL ===" -ForegroundColor Green
Write-Host "Base de donnees: $DB_NAME" -ForegroundColor Yellow
Write-Host "Fichier: $DUMP_FILE" -ForegroundColor Yellow
Write-Host ""

# Vérifier mysqldump
if (-not (Test-Path $MYSQLDUMP_PATH)) {
    Write-Host "Erreur: mysqldump non trouve" -ForegroundColor Red
    exit 1
}

Write-Host "mysqldump trouve" -ForegroundColor Green
Write-Host "Execution de la sauvegarde..." -ForegroundColor Cyan

# Exécuter le dump
& $MYSQLDUMP_PATH -u $DB_USER -p --single-transaction --routines --triggers --events --add-drop-database --add-drop-table --create-options --complete-insert --extended-insert --set-charset --default-character-set=utf8mb4 --databases $DB_NAME > $DUMP_FILE

if ($LASTEXITCODE -eq 0) {
    $fileSize = (Get-Item $DUMP_FILE).Length
    $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
    
    Write-Host ""
    Write-Host "Sauvegarde terminee avec succes!" -ForegroundColor Green
    Write-Host "Fichier: $DUMP_FILE" -ForegroundColor Yellow
    Write-Host "Taille: $fileSizeMB MB" -ForegroundColor Yellow
    
    # Nettoyer les anciennes sauvegardes
    Write-Host ""
    Write-Host "=== Nettoyage des anciennes sauvegardes ===" -ForegroundColor Cyan
    $backupFiles = Get-ChildItem -Path $BACKUP_DIR -Filter "dump_top20_*.sql" | Sort-Object LastWriteTime -Descending
    
    if ($backupFiles.Count -gt $MAX_BACKUPS) {
        $filesToDelete = $backupFiles | Select-Object -Skip $MAX_BACKUPS
        foreach ($file in $filesToDelete) {
            Remove-Item $file.FullName -Force
            Write-Host "Supprime: $($file.Name)" -ForegroundColor Red
        }
        Write-Host "Nettoyage termine. $MAX_BACKUPS sauvegardes conservees." -ForegroundColor Green
    } else {
        Write-Host "Aucun nettoyage necessaire. $($backupFiles.Count) sauvegardes presentes." -ForegroundColor Blue
    }
    
    # Afficher la liste des sauvegardes
    Write-Host ""
    Write-Host "=== Liste des sauvegardes ===" -ForegroundColor Cyan
    $currentBackups = Get-ChildItem -Path $BACKUP_DIR -Filter "dump_top20_*.sql" | Sort-Object LastWriteTime -Descending
    foreach ($backup in $currentBackups) {
        $size = [math]::Round($backup.Length / 1MB, 2)
        $date = $backup.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
        Write-Host "$($backup.Name) - $size MB - $date" -ForegroundColor White
    }
    
} else {
    Write-Host "Erreur lors de la sauvegarde (code: $LASTEXITCODE)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Instructions de restauration ===" -ForegroundColor Cyan
Write-Host "Pour restaurer: mysql -u $DB_USER -p $DB_NAME < $DUMP_FILE" -ForegroundColor Yellow 