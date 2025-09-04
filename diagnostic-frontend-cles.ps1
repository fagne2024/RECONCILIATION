# Script pour diagnostiquer pourquoi le frontend ne detecte pas les bonnes colonnes

$API_BASE_URL = "http://localhost:8080/api"

Write-Host "=== DIAGNOSTIC DETECTION FRONTEND ===" -ForegroundColor Cyan
Write-Host ""

try {
    # Recuperer les modeles
    $response = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models" -Method GET
    $models = $response.models
    
    $oppartModel = $models | Where-Object { $_.name -like "*OPPART*" }
    
    Write-Host "Modele OPPART trouve: $($oppartModel.name)" -ForegroundColor Green
    Write-Host "Cles configurees dans le modele:" -ForegroundColor White
    Write-Host "  - Partner Keys: $($oppartModel.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Gray
    Write-Host "  - BO Keys: $($oppartModel.reconciliationKeys.boKeys -join ', ')" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "=== ANALYSE DES LOGS REELS ===" -ForegroundColor Yellow
    
    Write-Host "D'apres les logs, TRXBO utilise ces cles (INCORRECTES):" -ForegroundColor Red
    $incorrectKeys = @(
        "MP250701.0829.C25981",
        "13099112233_CM",
        "MP250701.0829.C25565",
        "MP250701.0717.C79561"
    )
    
    foreach ($key in $incorrectKeys) {
        Write-Host "  - $key" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "Ces cles proviennent de la colonne 'IDTransaction', pas 'Numero Trans GU'!" -ForegroundColor Red
    
    Write-Host ""
    Write-Host "=== PROBLEME IDENTIFIE ===" -ForegroundColor Red
    
    Write-Host "LE VRAI PROBLEME:" -ForegroundColor Yellow
    Write-Host "  1. Le modele OPPART est configure pour 'Numero Trans GU'" -ForegroundColor White
    Write-Host "  2. MAIS le frontend detecte et utilise 'IDTransaction'" -ForegroundColor White
    Write-Host "  3. Les cles configurees ne sont PAS recuperees correctement" -ForegroundColor White
    
    Write-Host ""
    Write-Host "=== HYPOTHESES ===" -ForegroundColor Cyan
    
    Write-Host "Hypothese 1: Le frontend ne lit pas les cles du modele" -ForegroundColor White
    Write-Host "Hypothese 2: La detection automatique des colonnes ecrase les cles du modele" -ForegroundColor White
    Write-Host "Hypothese 3: Il y a un bug dans la logique de detection des cles" -ForegroundColor White
    Write-Host "Hypothese 4: Le modele n'est pas correctement charge" -ForegroundColor White
    
    Write-Host ""
    Write-Host "=== VERIFICATION DU MODELE ===" -ForegroundColor Yellow
    
    # Verifier si le modele est correctement configure
    if ($oppartModel.reconciliationKeys.partnerKeys -contains "Numero Trans GU") {
        Write-Host "✅ Le modele est correctement configure pour 'Numero Trans GU'" -ForegroundColor Green
    } else {
        Write-Host "❌ Le modele n'est PAS configure pour 'Numero Trans GU'" -ForegroundColor Red
        Write-Host "  Cles actuelles: $($oppartModel.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "=== DIAGNOSTIC FRONTEND ===" -ForegroundColor Yellow
    
    Write-Host "Le probleme est dans le frontend:" -ForegroundColor Red
    Write-Host "  1. Le frontend doit lire les cles du modele OPPART" -ForegroundColor White
    Write-Host "  2. Le frontend doit utiliser 'Numero Trans GU' pour TRXBO et OPPART" -ForegroundColor White
    Write-Host "  3. Le frontend utilise actuellement 'IDTransaction' (incorrect)" -ForegroundColor White
    
    Write-Host ""
    Write-Host "=== SOLUTION PROPOSEE ===" -ForegroundColor Green
    
    Write-Host "1. Verifier la logique de detection des cles dans le frontend" -ForegroundColor White
    Write-Host "2. S'assurer que les cles du modele sont prioritaires" -ForegroundColor White
    Write-Host "3. Corriger la logique findMatchingModelForFiles" -ForegroundColor White
    Write-Host "4. Tester avec les vraies colonnes 'Numero Trans GU'" -ForegroundColor White
    
    Write-Host ""
    Write-Host "=== TEST AVEC BONNES COLONNES ===" -ForegroundColor Yellow
    
    # Simuler ce que devrait faire le frontend
    Write-Host "Le frontend devrait utiliser:" -ForegroundColor White
    Write-Host "  - TRXBO Key Column: Numero Trans GU" -ForegroundColor Green
    Write-Host "  - OPPART Key Column: Numero Trans GU" -ForegroundColor Green
    Write-Host "  - Valeurs attendues: 1751409965944, 1751409935809, etc." -ForegroundColor Green
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Diagnostic termine!" -ForegroundColor Cyan
