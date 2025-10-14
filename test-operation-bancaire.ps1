# Script de test pour vérifier la création automatique d'opérations bancaires

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Test Opérations Bancaires Automatiques   " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Paramètres
$mysqlUser = "root"
$mysqlDatabase = "reconciliation_db"
$backendUrl = "http://localhost:8080"

Write-Host "Étape 1: Vérification de la table operation_bancaire" -ForegroundColor Yellow
Write-Host "--------------------------------------------------------" -ForegroundColor Gray

$mysqlPassword = Read-Host "Mot de passe MySQL" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($mysqlPassword)
$mysqlPasswordPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

# Vérifier la table
$checkTableQuery = "USE $mysqlDatabase; SHOW TABLES LIKE 'operation_bancaire';"
$tableResult = echo $checkTableQuery | mysql -u $mysqlUser -p$mysqlPasswordPlain -s 2>&1

if ($tableResult -match "operation_bancaire") {
    Write-Host "✅ Table operation_bancaire existe" -ForegroundColor Green
    
    # Compter les enregistrements
    $countQuery = "USE $mysqlDatabase; SELECT COUNT(*) FROM operation_bancaire;"
    $count = echo $countQuery | mysql -u $mysqlUser -p$mysqlPasswordPlain -s 2>&1 | Select-Object -Last 1
    Write-Host "📊 Nombre d'opérations bancaires: $count" -ForegroundColor Cyan
} else {
    Write-Host "❌ Table operation_bancaire n'existe PAS" -ForegroundColor Red
    Write-Host "   Exécutez: .\create-operation-bancaire-table.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Étape 2: Vérification du backend Spring Boot" -ForegroundColor Yellow
Write-Host "--------------------------------------------------------" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri "$backendUrl/api/operations-bancaires" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Backend accessible sur $backendUrl" -ForegroundColor Green
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Backend inaccessible" -ForegroundColor Red
    Write-Host "   Vérifiez que le backend est démarré sur $backendUrl" -ForegroundColor Yellow
    Write-Host "   Commande: cd reconciliation-app/backend && mvn spring-boot:run" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Étape 3: Vérification des types d'opération" -ForegroundColor Yellow
Write-Host "--------------------------------------------------------" -ForegroundColor Gray

$checkTypesQuery = @"
USE $mysqlDatabase;
SELECT type_operation, COUNT(*) as count 
FROM operation 
WHERE type_operation IN ('Compense_client', 'Appro_client', 'nivellement')
GROUP BY type_operation;
"@

Write-Host "Types d'opération éligibles dans la base:" -ForegroundColor Cyan
echo $checkTypesQuery | mysql -u $mysqlUser -p$mysqlPasswordPlain 2>&1 | Select-Object -Skip 1

Write-Host ""
Write-Host "Étape 4: Dernières opérations créées" -ForegroundColor Yellow
Write-Host "--------------------------------------------------------" -ForegroundColor Gray

$lastOpsQuery = @"
USE $mysqlDatabase;
SELECT id, type_operation, date_operation, montant 
FROM operation 
ORDER BY id DESC 
LIMIT 5;
"@

echo $lastOpsQuery | mysql -u $mysqlUser -p$mysqlPasswordPlain 2>&1 | Select-Object -Skip 1

Write-Host ""
Write-Host "Étape 5: Dernières opérations bancaires créées" -ForegroundColor Yellow
Write-Host "--------------------------------------------------------" -ForegroundColor Gray

$lastBankOpsQuery = @"
USE $mysqlDatabase;
SELECT id, type_operation, agence, montant, statut, operation_id, date_operation 
FROM operation_bancaire 
ORDER BY id DESC 
LIMIT 5;
"@

$bankOpsResult = echo $lastBankOpsQuery | mysql -u $mysqlUser -p$mysqlPasswordPlain 2>&1 | Select-Object -Skip 1

if ($bankOpsResult) {
    Write-Host $bankOpsResult -ForegroundColor Cyan
} else {
    Write-Host "Aucune opération bancaire trouvée" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Résumé du diagnostic                     " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Pour tester la création automatique:" -ForegroundColor Yellow
Write-Host "1. Ouvrez le frontend Angular" -ForegroundColor White
Write-Host "2. Allez dans le module Opérations" -ForegroundColor White
Write-Host "3. Créez une nouvelle opération avec:" -ForegroundColor White
Write-Host "   - Type: Compense_client (exactement comme ça)" -ForegroundColor Cyan
Write-Host "   - Montant: 1000000" -ForegroundColor Cyan
Write-Host "   - Compte: Un compte existant" -ForegroundColor Cyan
Write-Host "4. Vérifiez les logs du backend" -ForegroundColor White
Write-Host "5. Vérifiez le module BANQUE > Opérations" -ForegroundColor White
Write-Host ""

Write-Host "Consultez DEPANNAGE_OPERATIONS_BANCAIRES.md pour plus d'aide" -ForegroundColor Gray
Write-Host ""
Write-Host "Appuyez sur une touche pour continuer..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

