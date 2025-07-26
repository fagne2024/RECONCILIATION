# Suppression des opérations de frais automatiques créées pour les écarts de solde
# Ces opérations ont le format de bordereau: FEES_ECART_SOLDE_[DATE]_[AGENCE]

Write-Host "=== SUPPRESSION DES FRAIS AUTOMATIQUES ÉCARTS DE SOLDE ===" -ForegroundColor Green
Write-Host "Format des opérations à supprimer: FEES_ECART_SOLDE_[DATE]_[AGENCE]" -ForegroundColor Yellow
Write-Host ""

# Configuration de la base de données
$dbHost = "localhost"
$dbPort = "3306"
$dbName = "top20"
$dbUser = "root"
$dbPassword = ""

# Chemin vers le script SQL
$sqlFile = "supprimer-frais-ecart-solde.sql"

Write-Host "⚠️  ATTENTION: Cette opération va supprimer définitivement les opérations de frais automatiques" -ForegroundColor Red
Write-Host "Voulez-vous continuer? (O/N)" -ForegroundColor Yellow
$confirmation = Read-Host

if ($confirmation -ne "O" -and $confirmation -ne "o") {
    Write-Host "❌ Opération annulée" -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "Exécution de la suppression..." -ForegroundColor Cyan

# Exécuter le script SQL
try {
    $result = mysql -h $dbHost -P $dbPort -u $dbUser -p$dbPassword $dbName -e "source $sqlFile" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Suppression terminée avec succès" -ForegroundColor Green
        Write-Host ""
        Write-Host "Résultats de la suppression:" -ForegroundColor Cyan
        Write-Host $result
    } else {
        Write-Host "❌ Erreur lors de l'exécution de la suppression" -ForegroundColor Red
        Write-Host $result
    }
} catch {
    Write-Host "❌ Erreur: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== RÉSUMÉ DES MODIFICATIONS ===" -ForegroundColor Green

Write-Host "1. ✅ Suppression de la logique automatique dans EcartSoldeService.java" -ForegroundColor Green
Write-Host "2. ✅ Suppression des appels à createFraisTransactionForEcartSolde" -ForegroundColor Green
Write-Host "3. ✅ Suppression de la méthode createFraisTransactionForEcartSolde" -ForegroundColor Green
Write-Host "4. ✅ Suppression des opérations de frais existantes en base" -ForegroundColor Green

Write-Host ""
Write-Host "=== VÉRIFICATION ===" -ForegroundColor Green

Write-Host "# Vérifier qu'il n'y a plus d'opérations FEES_ECART_SOLDE" -ForegroundColor Cyan
Write-Host "mysql -h $dbHost -P $dbPort -u $dbUser -p$dbPassword $dbName -e \"SELECT COUNT(*) as nombre_restant FROM operation WHERE nom_bordereau LIKE 'FEES_ECART_SOLDE_%';\"" -ForegroundColor Gray

Write-Host ""
Write-Host "# Vérifier les opérations de frais restantes" -ForegroundColor Cyan
Write-Host "mysql -h $dbHost -P $dbPort -u $dbUser -p$dbPassword $dbName -e \"SELECT type_operation, COUNT(*) as nombre, SUM(montant) as total FROM operation WHERE type_operation = 'FRAIS_TRANSACTION' GROUP BY type_operation;\"" -ForegroundColor Gray

Write-Host ""
Write-Host "✅ Les frais automatiques pour les écarts de solde ont été supprimés." -ForegroundColor Green
Write-Host "Maintenant, quand vous uploadez un fichier sur 'Écarts de Solde', aucune opération de frais ne sera créée automatiquement." -ForegroundColor Cyan 