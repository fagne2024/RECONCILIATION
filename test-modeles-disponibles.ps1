# Script simple pour tester les modeles disponibles

$API_BASE_URL = "http://localhost:8080/api"

Write-Host "=== TEST MODELES DISPONIBLES ===" -ForegroundColor Cyan
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
    Write-Host "=== RESULTAT ===" -ForegroundColor Cyan
    
    $modelsWithKeys = $models | Where-Object { $_.reconciliationKeys -and $_.reconciliationKeys.boKeys -and $_.reconciliationKeys.partnerKeys }
    
    Write-Host "Modeles avec cles de reconciliation: $($modelsWithKeys.Count)" -ForegroundColor White
    
    if ($modelsWithKeys.Count -gt 0) {
        Write-Host "✅ SUCCES: La logique universelle fonctionnera avec $($modelsWithKeys.Count) modeles" -ForegroundColor Green
    } else {
        Write-Host "❌ ECHEC: Aucun modele avec des cles de reconciliation trouve" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Test termine!" -ForegroundColor Cyan
