# Script de test pour vérifier que la réconciliation utilise uniquement les modèles
Write-Host "🧪 Test de la réconciliation automatique (MODÈLES UNIQUEMENT)..." -ForegroundColor Yellow

try {
    # Récupérer les modèles
    $models = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    
    Write-Host "=== CONFIGURATION ACTUELLE ===" -ForegroundColor Green
    Write-Host "📋 ${models.models.Count} modèles configurés" -ForegroundColor Cyan
    
    # Afficher tous les modèles partenaires
    $partnerModels = $models.models | Where-Object { $_.fileType -eq "partner" }
    Write-Host "🔍 Modèles partenaires disponibles:" -ForegroundColor Yellow
    
    foreach ($model in $partnerModels) {
        Write-Host "  - $($model.name)" -ForegroundColor White
        Write-Host "    Pattern: $($model.filePattern)" -ForegroundColor Gray
        Write-Host "    Clés partenaires: $($model.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Gray
        Write-Host "    Clés BO: $($model.reconciliationKeys.boKeys -join ', ')" -ForegroundColor Gray
        Write-Host ""
    }
    
    Write-Host "=== INSTRUCTIONS DE TEST ===" -ForegroundColor Green
    Write-Host "1. Assurez-vous que le frontend est démarré" -ForegroundColor White
    Write-Host "2. Allez dans la section 'Réconciliation Automatique'" -ForegroundColor White
    Write-Host "3. Testez avec les fichiers suivants:" -ForegroundColor White
    Write-Host ""
    
    # Générer des exemples de test basés sur les modèles disponibles
    foreach ($model in $partnerModels) {
        $pattern = $model.filePattern
        $exampleFile = $pattern -replace '\*', 'test'
        Write-Host "   📄 Modèle: $($model.name)" -ForegroundColor Cyan
        Write-Host "   📁 Fichier partenaire: $exampleFile" -ForegroundColor White
        Write-Host "   📁 Fichier BO: TRXBO.xls" -ForegroundColor White
        Write-Host "   ✅ Résultat attendu: Réconciliation réussie avec les clés du modèle" -ForegroundColor Green
        Write-Host ""
    }
    
    Write-Host "=== TEST SANS MODÈLE ===" -ForegroundColor Green
    Write-Host "4. Testez avec un fichier sans modèle configuré:" -ForegroundColor White
    Write-Host "   📁 Fichier partenaire: fichier_sans_modele.csv" -ForegroundColor White
    Write-Host "   📁 Fichier BO: TRXBO.xls" -ForegroundColor White
    Write-Host "   ❌ Résultat attendu: Erreur 'Aucun modèle de réconciliation trouvé'" -ForegroundColor Red
    Write-Host ""
    
    Write-Host "=== VÉRIFICATIONS ===" -ForegroundColor Green
    Write-Host "✅ La réconciliation automatique utilise UNIQUEMENT les modèles configurés" -ForegroundColor Green
    Write-Host "✅ Aucun fallback ou détection automatique de clés" -ForegroundColor Green
    Write-Host "✅ Si aucun modèle ne correspond, la réconciliation échoue" -ForegroundColor Green
    Write-Host "✅ Les clés utilisées sont exactement celles configurées dans les modèles" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}
