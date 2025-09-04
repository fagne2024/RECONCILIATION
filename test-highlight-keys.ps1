# Script de test pour vérifier la mise en évidence des clés
Write-Host "Test de mise en évidence des clés..." -ForegroundColor Cyan
Write-Host ""

# Vérifier l'état des modèles
Write-Host "Vérification des modèles configurés..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    $models = $response.models
    
    Write-Host "✅ $($models.Count) modèles trouvés" -ForegroundColor Green
    
    # Afficher les modèles avec leurs clés
    foreach ($model in $models) {
        Write-Host ""
        Write-Host "=== MODÈLE: $($model.name) ===" -ForegroundColor Green
        Write-Host "  - Type: $($model.fileType)" -ForegroundColor Gray
        Write-Host "  - Pattern: $($model.filePattern)" -ForegroundColor Gray
        
        if ($model.reconciliationKeys) {
            Write-Host "  - Partner Keys: $($model.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Gray
            Write-Host "  - BO Keys: $($model.reconciliationKeys.boKeys -join ', ')" -ForegroundColor Gray
            Write-Host "  - BO Models: $($model.reconciliationKeys.boModels -join ', ')" -ForegroundColor Gray
            
            # Vérifier si les clés sont configurées
            $hasPartnerKeys = $model.reconciliationKeys.partnerKeys -and $model.reconciliationKeys.partnerKeys.Length -gt 0
            $hasBoKeys = $model.reconciliationKeys.boKeys -and $model.reconciliationKeys.boKeys.Length -gt 0
            $hasBoModels = $model.reconciliationKeys.boModels -and $model.reconciliationKeys.boModels.Length -gt 0
            
            if ($hasPartnerKeys) {
                Write-Host "  ✅ Partner Keys configurées" -ForegroundColor Green
            } else {
                Write-Host "  ❌ Partner Keys non configurées" -ForegroundColor Red
            }
            
            if ($hasBoKeys) {
                Write-Host "  ✅ BO Keys configurées" -ForegroundColor Green
            } else {
                Write-Host "  ❌ BO Keys non configurées" -ForegroundColor Red
            }
            
            if ($hasBoModels) {
                Write-Host "  ✅ BO Models configurés" -ForegroundColor Green
            } else {
                Write-Host "  ❌ BO Models non configurés" -ForegroundColor Red
            }
        } else {
            Write-Host "  ❌ Aucune clé de réconciliation configurée" -ForegroundColor Red
        }
    }
    
} catch {
    Write-Host "❌ Erreur lors de la vérification des modèles: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Instructions de test:" -ForegroundColor Yellow
Write-Host "1. Allez sur http://localhost:4200/auto-processing-models" -ForegroundColor White
Write-Host "2. Cliquez sur 'Modifier' pour un modèle partenaire (Oppart ou Ussdpart)" -ForegroundColor White
Write-Host "3. Vérifiez que les clés configurées sont mises en évidence:" -ForegroundColor White
Write-Host "   - Bordure colorée autour des sélecteurs" -ForegroundColor White
Write-Host "   - Badge '🔑 Clés configurées' en haut à droite" -ForegroundColor White
Write-Host "   - Options sélectionnées en bleu dans les listes" -ForegroundColor White
Write-Host ""
Write-Host "Résultats attendus:" -ForegroundColor Yellow
Write-Host "✅ Les clés partenaires doivent avoir une bordure verte" -ForegroundColor Green
Write-Host "✅ Les clés BO doivent avoir une bordure bleue" -ForegroundColor Green
Write-Host "✅ Les modèles BO doivent avoir une bordure jaune" -ForegroundColor Green
Write-Host "✅ Les options selectionnees doivent etre en bleu" -ForegroundColor Green
