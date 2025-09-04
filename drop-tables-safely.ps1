# Script PowerShell pour supprimer les tables en respectant les contraintes de clés étrangères

Write-Host "🗑️ Suppression des tables auto_processing_models et processing_steps..." -ForegroundColor Yellow

# Commandes SQL à exécuter
$sqlCommands = @"
USE top20;

-- Désactiver la vérification des clés étrangères temporairement
SET FOREIGN_KEY_CHECKS = 0;

-- Supprimer les données des tables dans l'ordre correct
DELETE FROM processing_steps;
DELETE FROM auto_processing_models;

-- Supprimer les tables
DROP TABLE IF EXISTS processing_steps;
DROP TABLE IF EXISTS auto_processing_models;

-- Réactiver la vérification des clés étrangères
SET FOREIGN_KEY_CHECKS = 1;

-- Vérifier que les tables ont été supprimées
SHOW TABLES LIKE '%auto_processing%';
SHOW TABLES LIKE '%processing_steps%';
"@

# Exécuter les commandes SQL
try {
    $sqlCommands | mysql -u root -p top20
    Write-Host "✅ Tables supprimées avec succès !" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors de la suppression des tables: $($_.Exception.Message)" -ForegroundColor Red
}
