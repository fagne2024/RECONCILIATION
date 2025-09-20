# Script PowerShell pour exécuter la migration de la colonne string_to_remove
# Date: 2025-01-27
# Description: Ajoute le support pour la suppression de chaînes spécifiques

Write-Host "🔧 Exécution de la migration pour ajouter la colonne string_to_remove..." -ForegroundColor Cyan

# Configuration de la base de données
$DB_HOST = "localhost"
$DB_PORT = "3306"
$DB_NAME = "reconciliation_db"
$DB_USER = "root"
$DB_PASSWORD = ""

# Chemin vers le fichier SQL
$SQL_FILE = "add-string-to-remove-column.sql"

# Vérifier si le fichier SQL existe
if (-not (Test-Path $SQL_FILE)) {
    Write-Host "❌ Erreur: Le fichier $SQL_FILE n'existe pas!" -ForegroundColor Red
    exit 1
}

# Construire la commande MySQL
$MYSQL_CMD = "mysql -h $DB_HOST -P $DB_PORT -u $DB_USER"

if ($DB_PASSWORD) {
    $MYSQL_CMD += " -p$DB_PASSWORD"
}

$MYSQL_CMD += " $DB_NAME < $SQL_FILE"

Write-Host "📋 Commande MySQL: $MYSQL_CMD" -ForegroundColor Yellow

try {
    # Exécuter la migration
    Invoke-Expression $MYSQL_CMD
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migration exécutée avec succès!" -ForegroundColor Green
        Write-Host "📊 La colonne 'string_to_remove' a été ajoutée à la table 'column_processing_rules'" -ForegroundColor Green
    } else {
        Write-Host "❌ Erreur lors de l'exécution de la migration (Code: $LASTEXITCODE)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Erreur lors de l'exécution: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "🎉 Migration terminée avec succès!" -ForegroundColor Green
