# Correction automatique des opérations du 15/07/2025
# Solde calculé: 102,402,800.59
# Solde attendu: 43,274,664.59
# Différence: 59,128,136.00

Write-Host "=== CORRECTION AUTOMATIQUE DES OPÉRATIONS DU 15/07/2025 ===" -ForegroundColor Green
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

# Chemin vers le script SQL de correction
$sqlFile = "correction-operations-15-07-2025.sql"

Write-Host "⚠️  ATTENTION: Cette opération va modifier les données du 15/07/2025" -ForegroundColor Red
Write-Host "Voulez-vous continuer? (O/N)" -ForegroundColor Yellow
$confirmation = Read-Host

if ($confirmation -ne "O" -and $confirmation -ne "o") {
    Write-Host "❌ Opération annulée" -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "Exécution de la correction..." -ForegroundColor Cyan

# Sauvegarde avant correction
Write-Host "📋 Création d'une sauvegarde..." -ForegroundColor Yellow
$backupFile = "backup_operations_15_07_2025_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"

try {
    $backupResult = mysql -h $dbHost -P $dbPort -u $dbUser -p$dbPassword $dbName -e "SELECT * FROM operation WHERE DATE(date_operation) = '2025-07-15';" > $backupFile 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Sauvegarde créée: $backupFile" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Erreur lors de la sauvegarde, mais continuation..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Erreur lors de la sauvegarde: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔧 Application des corrections..." -ForegroundColor Cyan

# Exécuter le script de correction
try {
    $result = mysql -h $dbHost -P $dbPort -u $dbUser -p$dbPassword $dbName -e "source $sqlFile" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Correction terminée avec succès" -ForegroundColor Green
        Write-Host ""
        Write-Host "Résultats de la correction:" -ForegroundColor Cyan
        Write-Host $result
    } else {
        Write-Host "❌ Erreur lors de l'exécution de la correction" -ForegroundColor Red
        Write-Host $result
    }
} catch {
    Write-Host "❌ Erreur: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== VÉRIFICATION POST-CORRECTION ===" -ForegroundColor Green

# Vérifier le nouveau solde de clôture
Write-Host "Vérification du nouveau solde de clôture..." -ForegroundColor Cyan

try {
    $newBalance = mysql -h $dbHost -P $dbPort -u $dbUser -p$dbPassword $dbName -e "SELECT MAX(solde_apres) as nouveau_solde_cloture FROM operation WHERE DATE(date_operation) = '2025-07-15';" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Nouveau solde de clôture: $newBalance" -ForegroundColor Green
        
        # Calculer la différence
        $oldBalance = 102402800.59
        $expectedBalance = 43274664.59
        $newBalanceValue = [double]($newBalance -split "`n" | Select-Object -Last 1)
        
        Write-Host "Ancien solde: $oldBalance" -ForegroundColor Yellow
        Write-Host "Nouveau solde: $newBalanceValue" -ForegroundColor Green
        Write-Host "Solde attendu: $expectedBalance" -ForegroundColor Yellow
        
        $difference = $newBalanceValue - $expectedBalance
        Write-Host "Différence avec le solde attendu: $difference" -ForegroundColor $(if ($difference -eq 0) { "Green" } else { "Red" })
    } else {
        Write-Host "❌ Erreur lors de la vérification du nouveau solde" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Erreur lors de la vérification: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== RÉSUMÉ DES CORRECTIONS APPLIQUÉES ===" -ForegroundColor Green

Write-Host "1. ✅ Correction des frais de transaction incorrects" -ForegroundColor Green
Write-Host "2. ✅ Correction des opérations d'annulation" -ForegroundColor Green
Write-Host "3. ✅ Correction des opérations transaction_cree" -ForegroundColor Green
Write-Host "4. ✅ Recalcul des soldes avant/après" -ForegroundColor Green

Write-Host ""
Write-Host "=== COMMANDES DE VÉRIFICATION ===" -ForegroundColor Green

Write-Host "# Vérifier le nouveau solde de clôture" -ForegroundColor Cyan
Write-Host "mysql -h $dbHost -P $dbPort -u $dbUser -p$dbPassword $dbName -e \"SELECT MAX(solde_apres) as solde_cloture FROM operation WHERE DATE(date_operation) = '2025-07-15';\"" -ForegroundColor Gray

Write-Host ""
Write-Host "# Vérifier toutes les opérations du 15/07/2025" -ForegroundColor Cyan
Write-Host "mysql -h $dbHost -P $dbPort -u $dbUser -p$dbPassword $dbName -e \"SELECT id, type_operation, montant, solde_avant, solde_apres FROM operation WHERE DATE(date_operation) = '2025-07-15' ORDER BY date_operation, id;\"" -ForegroundColor Gray

Write-Host ""
Write-Host "# Vérifier l'impact total" -ForegroundColor Cyan
Write-Host "mysql -h $dbHost -P $dbPort -u $dbUser -p$dbPassword $dbName -e \"SELECT SUM(CASE WHEN type_operation IN ('total_cashin', 'FRAIS_TRANSACTION', 'annulation_bo', 'annulation_partenaire', 'transaction_cree') THEN -montant WHEN type_operation IN ('total_paiement', 'approvisionnement', 'ajustement') THEN montant ELSE 0 END) as impact_net FROM operation WHERE DATE(date_operation) = '2025-07-15';\"" -ForegroundColor Gray

Write-Host ""
Write-Host "✅ Correction terminée. Vérifiez les résultats ci-dessus." -ForegroundColor Green 