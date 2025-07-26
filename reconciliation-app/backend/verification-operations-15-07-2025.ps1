# Vérification des opérations du 15/07/2025
# Solde calculé: 102,402,800.59
# Solde attendu: 43,274,664.59
# Différence: 59,128,136.00

Write-Host "=== VÉRIFICATION DES OPÉRATIONS DU 15/07/2025 ===" -ForegroundColor Green
Write-Host "Solde calculé: 102,402,800.59" -ForegroundColor Yellow
Write-Host "Solde attendu: 43,274,664.59" -ForegroundColor Yellow
Write-Host "Différence: 59,128,136.00" -ForegroundColor Red
Write-Host ""

# Configuration de la base de données
$dbHost = "localhost"
$dbPort = "3306"
$dbName = "top20"
$dbUser = "root"
$dbPassword = ""

# Chemin vers le script SQL
$sqlFile = "verification-operations-15-07-2025.sql"

Write-Host "Exécution de la vérification..." -ForegroundColor Cyan

# Exécuter le script SQL
try {
    $result = mysql -h $dbHost -P $dbPort -u $dbUser -p$dbPassword $dbName -e "source $sqlFile" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Vérification terminée avec succès" -ForegroundColor Green
        Write-Host ""
        Write-Host "Résultats de la vérification:" -ForegroundColor Cyan
        Write-Host $result
    } else {
        Write-Host "❌ Erreur lors de l'exécution de la vérification" -ForegroundColor Red
        Write-Host $result
    }
} catch {
    Write-Host "❌ Erreur: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== ANALYSE DES CAUSES POSSIBLES ===" -ForegroundColor Green

Write-Host "1. Vérifier les opérations avec des montants très élevés (> 1M)" -ForegroundColor Yellow
Write-Host "2. Vérifier les opérations de frais incorrectes" -ForegroundColor Yellow
Write-Host "3. Vérifier les opérations d'annulation en double" -ForegroundColor Yellow
Write-Host "4. Vérifier les opérations transaction_cree incorrectes" -ForegroundColor Yellow
Write-Host "5. Vérifier la cohérence des soldes avant/après" -ForegroundColor Yellow

Write-Host ""
Write-Host "=== COMMANDES DE VÉRIFICATION SPÉCIFIQUE ===" -ForegroundColor Green

Write-Host "# Vérifier les opérations avec montants > 10M" -ForegroundColor Cyan
Write-Host "mysql -h $dbHost -P $dbPort -u $dbUser -p$dbPassword $dbName -e \"SELECT id, type_operation, montant, service, code_proprietaire FROM operation WHERE DATE(date_operation) = '2025-07-15' AND montant > 10000000 ORDER BY montant DESC;\"" -ForegroundColor Gray

Write-Host ""
Write-Host "# Vérifier les opérations de frais du 15/07/2025" -ForegroundColor Cyan
Write-Host "mysql -h $dbHost -P $dbPort -u $dbUser -p$dbPassword $dbName -e \"SELECT id, type_operation, montant, service, code_proprietaire, nom_bordereau FROM operation WHERE DATE(date_operation) = '2025-07-15' AND type_operation = 'FRAIS_TRANSACTION' ORDER BY montant DESC;\"" -ForegroundColor Gray

Write-Host ""
Write-Host "# Vérifier les opérations d'annulation du 15/07/2025" -ForegroundColor Cyan
Write-Host "mysql -h $dbHost -P $dbPort -u $dbUser -p$dbPassword $dbName -e \"SELECT id, type_operation, montant, service, code_proprietaire, nom_bordereau FROM operation WHERE DATE(date_operation) = '2025-07-15' AND type_operation IN ('annulation_bo', 'annulation_partenaire') ORDER BY montant DESC;\"" -ForegroundColor Gray

Write-Host ""
Write-Host "# Vérifier les opérations transaction_cree du 15/07/2025" -ForegroundColor Cyan
Write-Host "mysql -h $dbHost -P $dbPort -u $dbUser -p$dbPassword $dbName -e \"SELECT id, type_operation, montant, service, code_proprietaire, nom_bordereau FROM operation WHERE DATE(date_operation) = '2025-07-15' AND type_operation = 'transaction_cree' ORDER BY montant DESC;\"" -ForegroundColor Gray

Write-Host ""
Write-Host "=== CORRECTIONS POSSIBLES ===" -ForegroundColor Green

Write-Host "Si des opérations incorrectes sont trouvées:" -ForegroundColor Yellow
Write-Host "1. Supprimer les opérations en double" -ForegroundColor White
Write-Host "2. Corriger les montants des frais" -ForegroundColor White
Write-Host "3. Corriger les montants des annulations" -ForegroundColor White
Write-Host "4. Recalculer les soldes" -ForegroundColor White

Write-Host ""
Write-Host "Exécutez les commandes ci-dessus pour identifier les problèmes spécifiques." -ForegroundColor Cyan 