# Script PowerShell pour exécuter la migration de la colonne commentaire
# Ce script ajoute la colonne commentaire à la table releve_bancaire

Write-Host "🔄 Exécution de la migration pour ajouter la colonne commentaire..." -ForegroundColor Yellow

# Chemin vers la base de données SQLite
$dbPath = "prisma/dev.db"

# Vérifier que la base de données existe
if (-not (Test-Path $dbPath)) {
    Write-Host "❌ Base de données non trouvée: $dbPath" -ForegroundColor Red
    exit 1
}

# Commande SQL pour ajouter la colonne
$sqlCommand = @"
ALTER TABLE releve_bancaire ADD COLUMN commentaire VARCHAR(1000);
"@

try {
    # Exécuter la commande SQL
    Write-Host "📝 Ajout de la colonne commentaire à la table releve_bancaire..." -ForegroundColor Cyan
    
    # Utiliser sqlite3 pour exécuter la commande
    $sqlCommand | sqlite3 $dbPath
    
    Write-Host "✅ Colonne commentaire ajoutée avec succès!" -ForegroundColor Green
    
    # Vérifier que la colonne a été ajoutée
    Write-Host "🔍 Vérification de la structure de la table..." -ForegroundColor Cyan
    $checkCommand = "PRAGMA table_info(releve_bancaire);"
    $checkCommand | sqlite3 $dbPath
    
    Write-Host "✅ Migration terminée avec succès!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Erreur lors de l'exécution de la migration: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "🎉 La colonne commentaire est maintenant disponible dans la table releve_bancaire!" -ForegroundColor Green
