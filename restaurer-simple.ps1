# Script simple de restauration de sauvegarde MySQL
Write-Host "=== Restauration de sauvegarde MySQL ===" -ForegroundColor Green

# Configuration
$MYSQL_PATH = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$BACKUP_FILE = ".\backups\dump_top20_2025-08-01_01-14-26.sql"

Write-Host "Vérification de MySQL..." -ForegroundColor Yellow

if (Test-Path $MYSQL_PATH) {
    Write-Host "MySQL trouvé à: $MYSQL_PATH" -ForegroundColor Green
} else {
    Write-Host "MySQL non trouvé à: $MYSQL_PATH" -ForegroundColor Red
    Write-Host "Veuillez vérifier l'installation de MySQL" -ForegroundColor Red
    exit 1
}

Write-Host "Vérification du fichier de sauvegarde..." -ForegroundColor Yellow

if (Test-Path $BACKUP_FILE) {
    Write-Host "Fichier de sauvegarde trouvé: $BACKUP_FILE" -ForegroundColor Green
} else {
    Write-Host "Fichier de sauvegarde non trouvé: $BACKUP_FILE" -ForegroundColor Red
    exit 1
}

Write-Host "Début de la restauration..." -ForegroundColor Cyan

# Restaurer la base de données en utilisant Get-Content et pipe
Get-Content $BACKUP_FILE | & $MYSQL_PATH -u root -p top20

if ($LASTEXITCODE -eq 0) {
    Write-Host "Restauration terminée avec succès!" -ForegroundColor Green
} else {
    Write-Host "Erreur lors de la restauration (code: $LASTEXITCODE)" -ForegroundColor Red
}

Write-Host "Vous pouvez maintenant redémarrer votre application." -ForegroundColor Yellow
