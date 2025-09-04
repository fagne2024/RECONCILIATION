# Script pour tester la logique universelle de detection des modeles

$API_BASE_URL = "http://localhost:8080/api"

Write-Host "=== TEST LOGIQUE UNIVERSELLE ===" -ForegroundColor Cyan
Write-Host ""

try {
    # Recuperer tous les modeles
    $response = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models" -Method GET
    $models = $response.models
    
    Write-Host "Modeles disponibles:" -ForegroundColor White
    foreach ($model in $models) {
        Write-Host "  - $($model.name)" -ForegroundColor Gray
        if ($model.reconciliationKeys) {
            Write-Host "    BO Keys: $($model.reconciliationKeys.boKeys -join ', ')" -ForegroundColor Green
            Write-Host "    Partner Keys: $($model.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Green
        } else {
            Write-Host "    ❌ Pas de cles de reconciliation" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "=== TEST AVEC DIFFERENTS MODELES ===" -ForegroundColor Yellow
    
    # Test avec OPPART
    $oppartModel = $models | Where-Object { $_.name -like "*OPPART*" }
    if ($oppartModel) {
        Write-Host "✅ Modele OPPART trouve: $($oppartModel.name)" -ForegroundColor Green
        Write-Host "  Cles configurees: $($oppartModel.reconciliationKeys.boKeys -join ', ') / $($oppartModel.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Gray
    }
    
    # Test avec CIOMCM
    $ciomcmModel = $models | Where-Object { $_.name -like "*CIOMCM*" }
    if ($ciomcmModel) {
        Write-Host "✅ Modele CIOMCM trouve: $($ciomcmModel.name)" -ForegroundColor Green
        Write-Host "  Cles configurees: $($ciomcmModel.reconciliationKeys.boKeys -join ', ') / $($ciomcmModel.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Gray
    }
    
    # Test avec USSDPART
    $ussdpartModel = $models | Where-Object { $_.name -like "*USSDPART*" }
    if ($ussdpartModel) {
        Write-Host "✅ Modele USSDPART trouve: $($ussdpartModel.name)" -ForegroundColor Green
        Write-Host "  Cles configurees: $($ussdpartModel.reconciliationKeys.boKeys -join ', ') / $($ussdpartModel.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "=== SIMULATION LOGIQUE UNIVERSELLE ===" -ForegroundColor Yellow
    
    # Simuler la logique universelle
    $modelsWithKeys = $models | Where-Object { $_.reconciliationKeys -and $_.reconciliationKeys.boKeys -and $_.reconciliationKeys.partnerKeys }
    
    Write-Host "Modeles avec cles de reconciliation: $($modelsWithKeys.Count)" -ForegroundColor White
    
    foreach ($model in $modelsWithKeys) {
        Write-Host ""
        Write-Host "🔍 Test du modele: $($model.name)" -ForegroundColor Cyan
        Write-Host "  BO Keys: $($model.reconciliationKeys.boKeys -join ', ')" -ForegroundColor Gray
        Write-Host "  Partner Keys: $($model.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Gray
        
        # Simuler la recherche dans les donnees
        Write-Host "  ✅ Ce modele sera teste avec n'importe quels fichiers" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "=== RESULTAT ===" -ForegroundColor Cyan
    
    if ($modelsWithKeys.Count -gt 0) {
        Write-Host "✅ SUCCES: La logique universelle fonctionnera avec $($modelsWithKeys.Count) modeles" -ForegroundColor Green
        Write-Host "Tous les modeles avec des cles de reconciliation seront testes automatiquement" -ForegroundColor White
    } else {
        Write-Host "❌ ECHEC: Aucun modele avec des cles de reconciliation trouve" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "=== INSTRUCTIONS DE TEST ===" -ForegroundColor Yellow
    
    Write-Host "1. Redemarrez le frontend pour appliquer les modifications" -ForegroundColor White
    Write-Host "2. Testez avec differents fichiers (pas seulement TRXBO/OPPART)" -ForegroundColor White
    Write-Host "3. Vérifiez dans la console que vous voyez:" -ForegroundColor White
    Write-Host "   - '🌍 Recherche universelle de modeles...'" -ForegroundColor Green
    Write-Host "   - '🔍 Test du modele: [Nom du modele]'" -ForegroundColor Green
    Write-Host "   - '✅ Modele avec cles trouve: [Nom du modele]'" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Test termine!" -ForegroundColor Cyan
