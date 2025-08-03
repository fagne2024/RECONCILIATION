# Script PowerShell pour supprimer les opérations annulées
# Date de création: 2025-07-31
# Description: Exécute le script SQL pour supprimer toutes les opérations dont le statut est "Annulée"

Write-Host "=== SUPPRESSION DES OPÉRATIONS ANNULEES ===" -ForegroundColor Red
Write-Host ""

# Demander confirmation à l'utilisateur
Write-Host "⚠️  ATTENTION: Cette opération va supprimer définitivement toutes les opérations annulées !" -ForegroundColor Yellow
Write-Host "Cette action est irréversible." -ForegroundColor Yellow
Write-Host ""

$confirmation = Read-Host "Êtes-vous sûr de vouloir continuer ? (oui/non)"

if ($confirmation -ne "oui") {
    Write-Host "❌ Opération annulée par l'utilisateur." -ForegroundColor Red
    exit
}

Write-Host "✅ Confirmation reçue. Début de la suppression..." -ForegroundColor Green
Write-Host ""

# Chemin vers le script SQL
$sqlScript = "supprimer-operations-annulees.sql"

# Vérifier que le fichier SQL existe
if (-not (Test-Path $sqlScript)) {
    Write-Host "❌ Erreur: Le fichier $sqlScript n'existe pas." -ForegroundColor Red
    exit 1
}

Write-Host "📋 Exécution du script SQL: $sqlScript" -ForegroundColor Cyan

# Exécuter le script SQL
try {
    # Lire le contenu du script SQL
    $sqlContent = Get-Content $sqlScript -Raw
    
    # Exécuter avec MySQL (ajuster les paramètres selon votre configuration)
    # mysql -u username -p database_name < $sqlScript
    
    # Alternative: utiliser un client MySQL installé
    Write-Host "🔧 Exécution du script SQL..." -ForegroundColor Yellow
    Write-Host "📊 Contenu du script:" -ForegroundColor Cyan
    Write-Host $sqlContent -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "✅ Script SQL prêt à être exécuté." -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Instructions manuelles:" -ForegroundColor Yellow
    Write-Host "1. Ouvrez votre client MySQL (MySQL Workbench, phpMyAdmin, etc.)" -ForegroundColor White
    Write-Host "2. Connectez-vous à votre base de données" -ForegroundColor White
    Write-Host "3. Copiez et exécutez le contenu du fichier: $sqlScript" -ForegroundColor White
    Write-Host "4. Vérifiez les résultats des requêtes SELECT avant et après" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host "❌ Erreur lors de l'exécution: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "=== FIN DU SCRIPT ===" -ForegroundColor Green 