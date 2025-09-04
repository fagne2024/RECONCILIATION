Write-Host "🔧 Correction simple des clés de réconciliation"

try {
    $models = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    Write-Host "✅ $($models.models.Count) modèles trouvés"
    
    foreach ($model in $models.models) {
        Write-Host "`n📋 Modèle: $($model.name)"
        
        if ($model.reconciliationKeys) {
            Write-Host "   Clés actuelles:"
            Write-Host "   - Partner: $($model.reconciliationKeys.partnerKeys -join ', ')"
            Write-Host "   - BO: $($model.reconciliationKeys.boKeys -join ', ')"
            
            # Créer un nouveau modèle avec les bonnes clés
            $newModel = @{
                name = $model.name
                filePattern = $model.filePattern
                fileType = $model.fileType
                autoApply = $model.autoApply
                templateFile = $model.templateFile
                reconciliationKeys = @{
                    partnerKeys = @("Numéro Trans GU")
                    boKeys = @("Numéro Trans GU")
                    boModels = @()
                }
                columnProcessingRules = @()
            }
            
            Write-Host "   🔧 Nouvelles clés: Numéro Trans GU"
            
            # Supprimer l'ancien modèle
            try {
                Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$($model.modelId)" -Method DELETE
                Write-Host "   ✅ Ancien modèle supprimé"
            } catch {
                Write-Host "   ⚠️ Erreur suppression: $($_.Exception.Message)"
            }
            
            # Créer le nouveau modèle
            try {
                $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method POST -Body ($newModel | ConvertTo-Json -Depth 10) -ContentType "application/json"
                Write-Host "   ✅ Nouveau modèle créé"
            } catch {
                Write-Host "   ❌ Erreur création: $($_.Exception.Message)"
            }
        }
    }
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)"
}

Write-Host "`n🎉 Correction terminée !"
