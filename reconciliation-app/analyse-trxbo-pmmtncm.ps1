# Script d'analyse TRXBO/PMMTNCM
Write-Host "🔍 Analyse des correspondances TRXBO/PMMTNCM..." -ForegroundColor Yellow

try {
    # Récupérer les modèles
    $models = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    $trxboModel = $models.models | Where-Object { $_.filePattern -like "*TRXBO*" }
    $pmmtncmModel = $models.models | Where-Object { $_.filePattern -like "*PMMTNCM*" }
    
    Write-Host "=== CONFIGURATION ACTUELLE ===" -ForegroundColor Green
    Write-Host "📋 TRXBO: $($trxboModel.name)" -ForegroundColor White
    Write-Host "   🔑 Clé BO: $($trxboModel.reconciliationKeys.boKeys -join ', ')" -ForegroundColor White
    Write-Host ""
    Write-Host "📋 PMMTNCM: $($pmmtncmModel.name)" -ForegroundColor White
    Write-Host "   🔑 Clé Partenaire: $($pmmtncmModel.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor White
    Write-Host "   🔑 Clé BO spécifique: $($pmmtncmModel.reconciliationKeys.boModelKeys.'transaction_back_office_0587abae' -join ', ')" -ForegroundColor White
    Write-Host ""
    
    Write-Host "=== DIAGNOSTIC DU PROBLÈME ===" -ForegroundColor Green
    Write-Host "❌ Résultat: 0 matches, 62 mismatches, 437 partner only" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔍 Causes possibles:" -ForegroundColor Yellow
    Write-Host "1. Les clés correspondent mais les colonnes de comparaison ne sont pas configurées" -ForegroundColor White
    Write-Host "2. Les valeurs dans les colonnes de comparaison diffèrent" -ForegroundColor White
    Write-Host "3. Problème de normalisation des noms de colonnes" -ForegroundColor White
    Write-Host "4. Différences de formatage (espaces, casse, etc.)" -ForegroundColor White
    Write-Host ""
    
    Write-Host "=== LOGIQUE DE RÉCONCILIATION ===" -ForegroundColor Green
    Write-Host "🎯 TRXBO/PMMTNCM utilise la logique NORMALE 1:1 (pas la logique spéciale TRXBO/OPPART)" -ForegroundColor White
    Write-Host "✅ Les clés correspondent: Numero Trans GU ↔ External ID" -ForegroundColor Green
    Write-Host "❌ Pour avoir des matches, les colonnes de comparaison doivent être identiques" -ForegroundColor Red
    Write-Host ""
    
    Write-Host "=== SOLUTIONS RECOMMANDÉES ===" -ForegroundColor Green
    Write-Host "1. Configurer les colonnes de comparaison dans le modèle PMMTNCM" -ForegroundColor White
    Write-Host "2. Vérifier que les colonnes de comparaison ont les mêmes valeurs" -ForegroundColor White
    Write-Host "3. Analyser les mismatches pour voir les différences" -ForegroundColor White
    Write-Host "4. Configurer des règles de traitement si nécessaire" -ForegroundColor White
    Write-Host ""
    
    Write-Host "=== COLONNES DE COMPARAISON SUGGÉRÉES ===" -ForegroundColor Green
    Write-Host "🔍 Colonnes communes à comparer:" -ForegroundColor White
    Write-Host "   - Montant" -ForegroundColor Gray
    Write-Host "   - Date" -ForegroundColor Gray
    Write-Host "   - Service" -ForegroundColor Gray
    Write-Host "   - Statut" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "=== COMMANDES DE DEBUG ===" -ForegroundColor Green
    Write-Host "Pour analyser les mismatches:" -ForegroundColor White
    Write-Host "1. Aller dans l'interface de réconciliation" -ForegroundColor Gray
    Write-Host "2. Cliquer sur 'Mismatches' pour voir les différences" -ForegroundColor Gray
    Write-Host "3. Vérifier les valeurs dans les colonnes de comparaison" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "Pour configurer les colonnes de comparaison:" -ForegroundColor White
    Write-Host "1. Aller dans 'Modèles de Traitement'" -ForegroundColor Gray
    Write-Host "2. Modifier le modèle PMMTNCM" -ForegroundColor Gray
    Write-Host "3. Ajouter les colonnes de comparaison" -ForegroundColor Gray
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}
