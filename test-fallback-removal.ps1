# Script de test pour verifier la suppression du fallback
Write-Host "Test de suppression du fallback..." -ForegroundColor Cyan
Write-Host ""

# Verifier que les modeles sont bien configures
Write-Host "Verification des modeles configures..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    $models = $response.models
    
    Write-Host "✅ $($models.Count) modeles trouves" -ForegroundColor Green
    
    # Afficher les modeles pertinents
    $oppartModel = $models | Where-Object { $_.name -like "*OPPART*" }
    $trxboModel = $models | Where-Object { $_.name -like "*TRXBO*" -or $_.name -like "*Transaction*" }
    
    if ($oppartModel) {
        Write-Host "✅ Modele OPPART trouve: $($oppartModel.name)" -ForegroundColor Green
        Write-Host "   - Pattern: $($oppartModel.filePattern)" -ForegroundColor Gray
        Write-Host "   - Type: $($oppartModel.fileType)" -ForegroundColor Gray
        Write-Host "   - Partner Keys: $($oppartModel.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Gray
    } else {
        Write-Host "❌ Modele OPPART non trouve" -ForegroundColor Red
    }
    
    if ($trxboModel) {
        Write-Host "✅ Modele TRXBO trouve: $($trxboModel.name)" -ForegroundColor Green
        Write-Host "   - Pattern: $($trxboModel.filePattern)" -ForegroundColor Gray
        Write-Host "   - Type: $($trxboModel.fileType)" -ForegroundColor Gray
        Write-Host "   - BO Keys: $($trxboModel.reconciliationKeys.boKeys -join ', ')" -ForegroundColor Gray
    } else {
        Write-Host "❌ Modele TRXBO non trouve" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Erreur lors de la verification des modeles: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Instructions de test:" -ForegroundColor Yellow
Write-Host "1. Allez sur http://localhost:4200/upload" -ForegroundColor White
Write-Host "2. Selectionnez le mode Automatique" -ForegroundColor White
Write-Host "3. Uploadez vos fichiers TRXBO.xls et OPPART.xls" -ForegroundColor White
Write-Host "4. Cliquez sur Lancer la Reconciliation Automatique" -ForegroundColor White
Write-Host ""
Write-Host "Resultats attendus:" -ForegroundColor Yellow
Write-Host "✅ Si les modeles sont configures: source: model, confidence: 1.0" -ForegroundColor Green
Write-Host "❌ Si aucun modele: Message d'erreur avec boutons d'aide" -ForegroundColor Red
Write-Host ""
Write-Host "Si erreur, utilisez les boutons Configurer les Modeles ou Aide" -ForegroundColor Cyan
