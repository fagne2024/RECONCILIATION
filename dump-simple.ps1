# Script simple de dump de la base de données MySQL
$DB_NAME = "top20"
$DB_USER = "root"
$MYSQLDUMP_PATH = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"
$TIMESTAMP = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$DUMP_FILE = "dump_top20_$TIMESTAMP.sql"

Write-Host "=== Dump de la base de données MySQL ===" -ForegroundColor Green
Write-Host "Base de données: $DB_NAME" -ForegroundColor Yellow
Write-Host "Fichier de sortie: $DUMP_FILE" -ForegroundColor Yellow
Write-Host ""

# Vérifier si mysqldump existe
if (-not (Test-Path $MYSQLDUMP_PATH)) {
    Write-Host "❌ Erreur: mysqldump non trouvé" -ForegroundColor Red
    exit 1
}

Write-Host "✓ mysqldump trouvé" -ForegroundColor Green
Write-Host "Exécution du dump..." -ForegroundColor Cyan

# Exécuter le dump
& $MYSQLDUMP_PATH -u $DB_USER -p --single-transaction --routines --triggers --events --add-drop-database --add-drop-table --create-options --complete-insert --extended-insert --set-charset --default-character-set=utf8mb4 --databases $DB_NAME > $DUMP_FILE

if ($LASTEXITCODE -eq 0) {
    $fileSize = (Get-Item $DUMP_FILE).Length
    $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
    
    Write-Host ""
    Write-Host "✅ Dump terminé avec succès!" -ForegroundColor Green
    Write-Host "📁 Fichier: $DUMP_FILE" -ForegroundColor Yellow
    Write-Host "📊 Taille: $fileSizeMB MB" -ForegroundColor Yellow
    Write-Host "📍 Chemin complet: $(Get-Location)\$DUMP_FILE" -ForegroundColor Yellow
    
    # Afficher les informations sur le fichier
    Write-Host ""
    Write-Host "=== Informations sur le dump ===" -ForegroundColor Cyan
    $lineCount = (Get-Content $DUMP_FILE | Measure-Object -Line).Lines
    Write-Host "Nombre de lignes: $lineCount" -ForegroundColor White
    
} else {
    Write-Host "❌ Erreur lors du dump (code: $LASTEXITCODE)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Instructions de restauration ===" -ForegroundColor Cyan
Write-Host "Pour restaurer cette base de données:" -ForegroundColor White
Write-Host "mysql -u $DB_USER -p $DB_NAME < $DUMP_FILE" -ForegroundColor Yellow 