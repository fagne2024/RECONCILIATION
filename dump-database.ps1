# Script de dump de la base de données MySQL
# Configuration de la base de données
$DB_NAME = "top20"
$DB_USER = "root"
$DB_PASSWORD = ""
$DB_HOST = "localhost"
$DB_PORT = "3306"

# Nom du fichier de dump avec timestamp
$TIMESTAMP = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$DUMP_FILE = "dump_top20_$TIMESTAMP.sql"

Write-Host "=== Dump de la base de données MySQL ===" -ForegroundColor Green
Write-Host "Base de données: $DB_NAME" -ForegroundColor Yellow
Write-Host "Fichier de sortie: $DUMP_FILE" -ForegroundColor Yellow
Write-Host ""

# Vérifier si mysqldump est disponible
try {
    $mysqldumpVersion = mysqldump --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ mysqldump trouvé" -ForegroundColor Green
    } else {
        throw "mysqldump non trouvé"
    }
} catch {
    Write-Host "❌ Erreur: mysqldump n'est pas installé ou n'est pas dans le PATH" -ForegroundColor Red
    Write-Host "Veuillez installer MySQL Client ou ajouter mysqldump au PATH" -ForegroundColor Red
    exit 1
}

# Construire la commande mysqldump
$MYSQLDUMP_CMD = "mysqldump"
$MYSQLDUMP_ARGS = @(
    "--host=$DB_HOST",
    "--port=$DB_PORT",
    "--user=$DB_USER"
)

# Ajouter le mot de passe si défini
if ($DB_PASSWORD) {
    $MYSQLDUMP_ARGS += "--password=$DB_PASSWORD"
} else {
    $MYSQLDUMP_ARGS += "--password"
}

# Options de dump
$MYSQLDUMP_ARGS += @(
    "--single-transaction",
    "--routines",
    "--triggers",
    "--events",
    "--add-drop-database",
    "--add-drop-table",
    "--create-options",
    "--complete-insert",
    "--extended-insert",
    "--set-charset",
    "--default-character-set=utf8mb4",
    "--databases",
    $DB_NAME
)

Write-Host "Exécution du dump..." -ForegroundColor Cyan
Write-Host "Commande: $MYSQLDUMP_CMD $($MYSQLDUMP_ARGS -join ' ')" -ForegroundColor Gray

# Exécuter le dump
try {
    & $MYSQLDUMP_CMD @MYSQLDUMP_ARGS | Out-File -FilePath $DUMP_FILE -Encoding UTF8
    
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
        
        # Vérifier la présence de tables importantes
        $content = Get-Content $DUMP_FILE -Raw
        $tables = @("compte", "operation", "agency_summary", "frais_transaction", "compte_solde_bo")
        Write-Host ""
        Write-Host "Tables trouvées:" -ForegroundColor White
        foreach ($table in $tables) {
            if ($content -match "CREATE TABLE.*`"$table`"") {
                Write-Host "  ✓ $table" -ForegroundColor Green
            } else {
                Write-Host "  ❌ $table" -ForegroundColor Red
            }
        }
        
    } else {
        Write-Host "❌ Erreur lors du dump (code: $LASTEXITCODE)" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "❌ Erreur lors de l'exécution du dump: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Instructions de restauration ===" -ForegroundColor Cyan
Write-Host "Pour restaurer cette base de données:" -ForegroundColor White
Write-Host "mysql -u $DB_USER -p $DB_NAME < $DUMP_FILE" -ForegroundColor Yellow
Write-Host ""
Write-Host "Ou pour créer une nouvelle base:" -ForegroundColor White
Write-Host "mysql -u $DB_USER -p -e 'CREATE DATABASE IF NOT EXISTS $DB_NAME;'" -ForegroundColor Yellow
Write-Host "mysql -u $DB_USER -p $DB_NAME < $DUMP_FILE" -ForegroundColor Yellow 