# Test rapide des clés de réconciliation
Write-Host "🧪 Test rapide des clés de réconciliation" -ForegroundColor Cyan

$API_BASE_URL = "http://localhost:8080/api"

try {
    # Récupérer les modèles
    $response = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models" -Method GET
    Write-Host "✅ $($response.models.Count) modèles trouvés" -ForegroundColor Green
    
    foreach ($model in $response.models) {
        Write-Host "`n📋 Modèle: $($model.name)" -ForegroundColor White
        Write-Host "   Type: $($model.fileType)" -ForegroundColor Gray
        
        if ($model.reconciliationKeys) {
            Write-Host "   ✅ Clés configurées:" -ForegroundColor Green
            Write-Host "      - Partner: $($model.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Cyan
            Write-Host "      - BO: $($model.reconciliationKeys.boKeys -join ', ')" -ForegroundColor Cyan
        } else {
            Write-Host "   ℹ️ Pas de clés" -ForegroundColor Gray
        }
    }
    
    Write-Host "`n🎯 Test terminé avec succès!" -ForegroundColor Green
}
catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}
