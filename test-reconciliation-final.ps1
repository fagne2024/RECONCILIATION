# Script de test pour vérifier la réconciliation automatique
Write-Host "Test de la reconciliation automatique..." -ForegroundColor Cyan
Write-Host ""

# Vérifier l'état des modèles
Write-Host "=== Verification des modeles ===" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    $modeles = $response.models
    
    Write-Host "✅ $($modeles.Count) modeles trouves" -ForegroundColor Green
    
    # Afficher les modèles partenaires
    $partnerModels = $modeles | Where-Object { $_.fileType -eq "partner" }
    Write-Host "📋 $($partnerModels.Count) modeles partenaires:" -ForegroundColor Yellow
    
    foreach ($model in $partnerModels) {
        Write-Host ""
        Write-Host "=== MODELE: $($model.name) ===" -ForegroundColor Green
        Write-Host "  - Pattern: $($model.filePattern)" -ForegroundColor Gray
        Write-Host "  - Partner Keys: $($model.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Gray
        Write-Host "  - BO Keys: $($model.reconciliationKeys.boKeys -join ', ')" -ForegroundColor Gray
        Write-Host "  - boModels vide: $($model.reconciliationKeys.boModels.Count -eq 0)" -ForegroundColor Gray
        Write-Host "  - boModelKeys vide: $($model.reconciliationKeys.boModelKeys.Keys.Count -eq 0)" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "❌ Erreur lors de la verification des modeles: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Instructions de test ===" -ForegroundColor Yellow
Write-Host "1. Allez sur http://localhost:4200/upload" -ForegroundColor White
Write-Host "2. Uploadez TRXBO.xls et OPPART.xls" -ForegroundColor White
Write-Host "3. Cliquez sur 'Reconciliation Automatique'" -ForegroundColor White
Write-Host "4. Vérifiez que la réconciliation fonctionne" -ForegroundColor White
Write-Host ""
Write-Host "5. Testez aussi avec USSDPART.xls" -ForegroundColor White
Write-Host "6. Vérifiez que les clés sont correctement détectées" -ForegroundColor White
Write-Host ""
Write-Host "=== Résultats attendus ===" -ForegroundColor Yellow
Write-Host "✅ Source: 'model'" -ForegroundColor Green
Write-Host "✅ Confidence: 1.0" -ForegroundColor Green
Write-Host "✅ Clés détectées correctement" -ForegroundColor Green
Write-Host "✅ Pas d'erreur 'Aucun modèle trouvé'" -ForegroundColor Green
Write-Host ""
Write-Host "=== Corrections appliquées ===" -ForegroundColor Yellow
Write-Host "✅ Priorité aux clés génériques (boKeys/partnerKeys)" -ForegroundColor Green
Write-Host "✅ Normalisation des noms de colonnes" -ForegroundColor Green
Write-Host "✅ Gestion des espaces dans les noms" -ForegroundColor Green
Write-Host "✅ Structure simplifiée des modèles" -ForegroundColor Green
Write-Host ""
Write-Host "🎉 Testez maintenant la réconciliation automatique!" -ForegroundColor Green
