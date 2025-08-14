# Script de génération d'opérations à partir des données Agency Summary
Write-Host "=== Génération d'opérations à partir d'Agency Summary ===" -ForegroundColor Green

# Configuration
$MYSQL_PATH = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$DB_NAME = "top20"
$DB_USER = "root"

Write-Host "Vérification de MySQL..." -ForegroundColor Yellow

if (Test-Path $MYSQL_PATH) {
    Write-Host "MySQL trouvé à: $MYSQL_PATH" -ForegroundColor Green
} else {
    Write-Host "MySQL non trouvé à: $MYSQL_PATH" -ForegroundColor Red
    Write-Host "Veuillez vérifier l'installation de MySQL" -ForegroundColor Red
    exit 1
}

Write-Host "Début de la génération des opérations..." -ForegroundColor Cyan

# 1. Nettoyer les opérations existantes (sauf celles de type SYSTEM)
Write-Host "1. Nettoyage des opérations existantes..." -ForegroundColor Yellow

$cleanQuery = @"
DELETE FROM operation 
WHERE banque != 'SYSTEM' 
AND type_operation NOT IN ('total_cashin', 'total_paiement', 'FRAIS_TRANSACTION', 'transaction_cree', 'compense', 'approvisionnement', 'annulation_bo');
"@

try {
    Get-Content $cleanQuery | & $MYSQL_PATH -u $DB_USER -p $DB_NAME
    Write-Host "✅ Opérations existantes nettoyées" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors du nettoyage: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Récupérer les données agency_summary groupées par date
Write-Host "2. Récupération des données agency_summary..." -ForegroundColor Yellow

$selectQuery = @"
SELECT 
    date,
    agency,
    country,
    SUM(CASE WHEN service LIKE '%CASHIN%' THEN total_volume ELSE 0 END) as total_cashin,
    SUM(CASE WHEN service LIKE '%PAIEMENT%' THEN total_volume ELSE 0 END) as total_paiement,
    COUNT(CASE WHEN service LIKE '%CASHIN%' THEN 1 END) as cashin_count,
    COUNT(CASE WHEN service LIKE '%PAIEMENT%' THEN 1 END) as paiement_count
FROM agency_summary_entity 
WHERE agency = 'CELCM0001'
GROUP BY date, agency, country
ORDER BY date;
"@

try {
    $results = & $MYSQL_PATH -u $DB_USER -p $DB_NAME -e "$selectQuery" --batch --raw
    Write-Host "✅ Données agency_summary récupérées" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors de la récupération: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 3. Générer les opérations pour chaque date
Write-Host "3. Génération des opérations..." -ForegroundColor Yellow

$currentSolde = 0.0
$operationId = 250  # Commencer après les opérations existantes

foreach ($line in $results) {
    if ($line -match '^\d{4}-\d{2}-\d{2}') {
        $fields = $line -split '\t'
        $date = $fields[0]
        $agency = $fields[1]
        $country = $fields[2]
        $totalCashin = [double]$fields[3]
        $totalPaiement = [double]$fields[4]
        $cashinCount = [int]$fields[5]
        $paiementCount = [int]$fields[6]
        
        Write-Host "Traitement de la date: $date" -ForegroundColor Cyan
        
        # Opération CASHIN
        if ($totalCashin -gt 0) {
            $operationId++
            $soldeAvant = $currentSolde
            $currentSolde += $totalCashin
            $soldeApres = $currentSolde
            
            $insertCashinQuery = @"
INSERT INTO operation (id, banque, code_proprietaire, date_operation, montant, nom_bordereau, parent_operation_id, pays, record_count, reference, service, solde_apres, solde_avant, statut, type_operation, compte_id) 
VALUES ($operationId, 'AGENCY_SUMMARY', '$agency', '$date 17:00:00.000000', $totalCashin, 'AGENCY_SUMMARY_${date}_${agency}', NULL, '$country', $cashinCount, NULL, 'CASHIN_SERVICES', $soldeApres, $soldeAvant, 'Validée', 'total_cashin', 1);
"@
            
            try {
                & $MYSQL_PATH -u $DB_USER -p $DB_NAME -e "$insertCashinQuery"
                Write-Host "  ✅ CASHIN: $totalCashin" -ForegroundColor Green
            } catch {
                Write-Host "  ❌ Erreur CASHIN: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
        
        # Opération PAIEMENT
        if ($totalPaiement -gt 0) {
            $operationId++
            $soldeAvant = $currentSolde
            $currentSolde += $totalPaiement
            $soldeApres = $currentSolde
            
            $insertPaiementQuery = @"
INSERT INTO operation (id, banque, code_proprietaire, date_operation, montant, nom_bordereau, parent_operation_id, pays, record_count, reference, service, solde_apres, solde_avant, statut, type_operation, compte_id) 
VALUES ($operationId, 'AGENCY_SUMMARY', '$agency', '$date 17:00:00.000000', $totalPaiement, 'AGENCY_SUMMARY_${date}_${agency}', NULL, '$country', $paiementCount, NULL, 'PAIEMENT_SERVICES', $soldeApres, $soldeAvant, 'Validée', 'total_paiement', 1);
"@
            
            try {
                & $MYSQL_PATH -u $DB_USER -p $DB_NAME -e "$insertPaiementQuery"
                Write-Host "  ✅ PAIEMENT: $totalPaiement" -ForegroundColor Green
            } catch {
                Write-Host "  ❌ Erreur PAIEMENT: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    }
}

# 4. Mettre à jour le solde du compte
Write-Host "4. Mise à jour du solde du compte..." -ForegroundColor Yellow

$updateCompteQuery = @"
UPDATE compte 
SET solde = $currentSolde, 
    date_derniere_maj = NOW() 
WHERE numero_compte = 'CELCM0001';
"@

try {
    & $MYSQL_PATH -u $DB_USER -p $DB_NAME -e "$updateCompteQuery"
    Write-Host "✅ Solde du compte mis à jour: $currentSolde" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur mise à jour compte: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Vérification finale
Write-Host "5. Vérification finale..." -ForegroundColor Yellow

$verifyQuery = @"
SELECT 
    COUNT(*) as total_operations,
    SUM(CASE WHEN type_operation = 'total_cashin' THEN montant ELSE 0 END) as total_cashin,
    SUM(CASE WHEN type_operation = 'total_paiement' THEN montant ELSE 0 END) as total_paiement
FROM operation 
WHERE banque = 'AGENCY_SUMMARY';
"@

try {
    $verifyResults = & $MYSQL_PATH -u $DB_USER -p $DB_NAME -e "$verifyQuery" --batch --raw
    Write-Host "✅ Vérification terminée" -ForegroundColor Green
    Write-Host "Résultats: $verifyResults" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erreur vérification: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Génération terminée ===" -ForegroundColor Green
Write-Host "Solde final: $currentSolde" -ForegroundColor Yellow
Write-Host "Vous pouvez maintenant redémarrer votre application." -ForegroundColor White
