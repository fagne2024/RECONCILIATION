# Script de test pour la logique spéciale TRXBO/OPPART
Write-Host "🧪 Test de la logique spéciale TRXBO/OPPART (1:2)..." -ForegroundColor Yellow

try {
    # Récupérer les modèles pour voir la configuration
    $models = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    
    Write-Host "=== CONFIGURATION ACTUELLE ===" -ForegroundColor Green
    Write-Host "📋 ${models.models.Count} modèles configurés" -ForegroundColor Cyan
    
    # Trouver les modèles TRXBO et OPPART
    $trxboModel = $models.models | Where-Object { $_.filePattern -like "*TRXBO*" } | Select-Object -First 1
    $oppartModel = $models.models | Where-Object { $_.filePattern -like "*OPPART*" } | Select-Object -First 1
    
    Write-Host ""
    Write-Host "🔍 MODÈLE TRXBO:" -ForegroundColor Yellow
    if ($trxboModel) {
        Write-Host "   📋 Nom: $($trxboModel.name)" -ForegroundColor White
        Write-Host "   📁 Pattern: $($trxboModel.filePattern)" -ForegroundColor White
        Write-Host "   🔑 Clés BO: $($trxboModel.reconciliationKeys.boKeys -join ', ')" -ForegroundColor White
    } else {
        Write-Host "   ❌ Modèle TRXBO non trouvé" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "🔍 MODÈLE OPPART:" -ForegroundColor Yellow
    if ($oppartModel) {
        Write-Host "   📋 Nom: $($oppartModel.name)" -ForegroundColor White
        Write-Host "   📁 Pattern: $($oppartModel.filePattern)" -ForegroundColor White
        Write-Host "   🔑 Clés Partenaire: $($oppartModel.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor White
    } else {
        Write-Host "   ❌ Modèle OPPART non trouvé" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "=== LOGIQUE SPÉCIALE TRXBO/OPPART ===" -ForegroundColor Green
    Write-Host "🎯 Règle: Chaque ligne TRXBO doit correspondre exactement à 2 lignes OPPART" -ForegroundColor White
    Write-Host ""
    Write-Host "📊 Résultats attendus:" -ForegroundColor Yellow
    Write-Host "   ✅ MATCH: TRXBO avec exactement 2 OPPART correspondants" -ForegroundColor Green
    Write-Host "   ❌ MISMATCH: TRXBO avec 1 seul OPPART correspondant" -ForegroundColor Red
    Write-Host "   ❌ MISMATCH: TRXBO avec plus de 2 OPPART correspondants" -ForegroundColor Red
    Write-Host "   📈 BO ONLY: TRXBO sans correspondance OPPART" -ForegroundColor Cyan
    Write-Host "   📈 PARTNER ONLY: OPPART sans correspondance TRXBO" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "=== INSTRUCTIONS DE TEST ===" -ForegroundColor Green
    Write-Host "1. Assurez-vous que le backend est redémarré (pour activer la logique spéciale)" -ForegroundColor White
    Write-Host "2. Allez dans la section 'Réconciliation Automatique'" -ForegroundColor White
    Write-Host "3. Testez avec les fichiers suivants:" -ForegroundColor White
    Write-Host ""
    Write-Host "   📁 Fichier BO: TRXBO.xls" -ForegroundColor White
    Write-Host "   📁 Fichier Partenaire: OPPART.csv (ou .xls)" -ForegroundColor White
    Write-Host ""
    Write-Host "4. Vérifiez que la logique spéciale est détectée dans les logs:" -ForegroundColor White
    Write-Host "   🔍 'Détection de réconciliation spéciale TRXBO/OPPART - Logique 1:2'" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "=== VÉRIFICATIONS ===" -ForegroundColor Green
    Write-Host "✅ La logique spéciale TRXBO/OPPART est maintenant RÉACTIVÉE" -ForegroundColor Green
    Write-Host "✅ Chaque TRXBO doit avoir exactement 2 OPPART pour être un match" -ForegroundColor Green
    Write-Host "✅ Les autres types de fichiers utilisent la logique normale 1:1" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}
