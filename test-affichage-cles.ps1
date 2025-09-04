# Script de test pour vérifier l'affichage correct des clés
Write-Host "Test de l'affichage correct des clés..." -ForegroundColor Cyan
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
        Write-Host "  - Template File: $($model.templateFile)" -ForegroundColor Gray
        
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
Write-Host "2. Cliquez sur 'Modifier' pour le modèle Oppart" -ForegroundColor White
Write-Host "3. Vérifiez que la clé 'Numero Trans GU' est visible et sélectionnée" -ForegroundColor White
Write-Host "4. Cliquez sur 'Modifier' pour le modèle Ussdpart" -ForegroundColor White
Write-Host "5. Vérifiez que la clé 'Token' est visible et sélectionnée" -ForegroundColor White
Write-Host ""
Write-Host "Corrections apportées:" -ForegroundColor Yellow
Write-Host "✅ Ajout automatique des clés manquantes dans les listes" -ForegroundColor Green
Write-Host "✅ Correction de la logique de chargement des colonnes BO" -ForegroundColor Green
Write-Host "✅ Amélioration de la détection des changements" -ForegroundColor Green
Write-Host "✅ Gestion spécifique pour OPPART et USSDPART" -ForegroundColor Green
Write-Host ""
Write-Host "Résultats attendus:" -ForegroundColor Yellow
Write-Host "✅ Les clés sélectionnées doivent être visibles dans les listes" -ForegroundColor Green
Write-Host "✅ Les clés doivent être mises en évidence avec des bordures colorées" -ForegroundColor Green
Write-Host "✅ Les badges 'Clés configurées' doivent s'afficher" -ForegroundColor Green
Write-Host "✅ Les informations ne doivent plus s'afficher à moitié" -ForegroundColor Green
