# Script d'analyse des correspondances pour PMMTNCM
Write-Host "🔍 Analyse des correspondances PMMTNCM..." -ForegroundColor Yellow

try {
    # Récupérer les modèles pour voir la configuration
    $models = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    
    # Trouver le modèle PMMTNCM
    $pmmtncmModel = $models.models | Where-Object { $_.filePattern -like "*PMMTNCM*" } | Select-Object -First 1
    
    if ($pmmtncmModel) {
        Write-Host "=== CONFIGURATION DU MODÈLE PMMTNCM ===" -ForegroundColor Green
        Write-Host "📋 Nom: $($pmmtncmModel.name)" -ForegroundColor White
        Write-Host "🔑 Clés BO: $($pmmtncmModel.reconciliationKeys.boKeys -join ', ')" -ForegroundColor White
        Write-Host "🔑 Clés Partenaire: $($pmmtncmModel.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor White
        Write-Host ""
        
        # Analyser les colonnes de comparaison
        Write-Host "=== COLONNES DE COMPARAISON ===" -ForegroundColor Green
        if ($pmmtncmModel.reconciliationKeys.boModelKeys) {
            foreach ($boModelId in $pmmtncmModel.reconciliationKeys.boModels) {
                $boKeys = $pmmtncmModel.reconciliationKeys.boModelKeys.$boModelId
                $partnerKeys = $pmmtncmModel.reconciliationKeys.partnerKeys
                
                Write-Host "🔍 Modèle BO: $boModelId" -ForegroundColor Cyan
                Write-Host "   Clés BO: $($boKeys -join ', ')" -ForegroundColor White
                Write-Host "   Clés Partenaire: $($partnerKeys -join ', ')" -ForegroundColor White
                Write-Host ""
            }
        }
    }
    
    Write-Host "=== DIAGNOSTIC DU PROBLÈME ===" -ForegroundColor Green
    Write-Host "❌ Résultat: 0 matches, 62 mismatches, 437 partner only" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔍 Causes possibles:" -ForegroundColor Yellow
    Write-Host "1. Les clés correspondent mais les valeurs dans les colonnes de comparaison diffèrent" -ForegroundColor White
    Write-Host "2. Problème de normalisation des noms de colonnes" -ForegroundColor White
    Write-Host "3. Différences de formatage (espaces, casse, etc.)" -ForegroundColor White
    Write-Host "4. Les colonnes de comparaison ne sont pas configurées correctement" -ForegroundColor White
    Write-Host ""
    
    Write-Host "=== SOLUTIONS RECOMMANDÉES ===" -ForegroundColor Green
    Write-Host "1. Vérifier les colonnes de comparaison dans le modèle" -ForegroundColor White
    Write-Host "2. Analyser les différences dans les mismatches" -ForegroundColor White
    Write-Host "3. Vérifier la normalisation des noms de colonnes" -ForegroundColor White
    Write-Host "4. Configurer des règles de traitement si nécessaire" -ForegroundColor White
    Write-Host ""
    
    Write-Host "=== COMMANDES DE DEBUG ===" -ForegroundColor Green
    Write-Host "Pour analyser les mismatches:" -ForegroundColor White
    Write-Host "1. Aller dans l'interface de réconciliation" -ForegroundColor Gray
    Write-Host "2. Cliquer sur 'Mismatches' pour voir les différences" -ForegroundColor Gray
    Write-Host "3. Vérifier les valeurs dans les colonnes de comparaison" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "Pour vérifier la configuration du modèle:" -ForegroundColor White
    Write-Host "1. Aller dans 'Modèles de Traitement'" -ForegroundColor Gray
    Write-Host "2. Modifier le modèle PMMTNCM" -ForegroundColor Gray
    Write-Host "3. Vérifier les colonnes de comparaison configurées" -ForegroundColor Gray
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}
