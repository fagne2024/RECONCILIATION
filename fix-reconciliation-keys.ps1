# Script pour corriger les clés de réconciliation
Write-Host "🔧 Correction des clés de réconciliation..."
Write-Host "=============================================="

# Récupérer tous les modèles
try {
    $models = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    Write-Host "✅ $($models.models.Count) modèles trouvés"
    
    foreach ($model in $models.models) {
        Write-Host "`n📋 Modèle: $($model.name) (Type: $($model.fileType))"
        
        if ($model.reconciliationKeys) {
            Write-Host "   Clés actuelles:"
            Write-Host "   - Partner Keys: $($model.reconciliationKeys.partnerKeys -join ', ')"
            Write-Host "   - BO Keys: $($model.reconciliationKeys.boKeys -join ', ')"
            
            # Corriger les clés pour utiliser "Numéro Trans GU" des deux côtés
            $updatedModel = $model | ConvertTo-Json -Depth 10 | ConvertFrom-Json
            $updatedModel.reconciliationKeys.partnerKeys = @("Numéro Trans GU")
            $updatedModel.reconciliationKeys.boKeys = @("Numéro Trans GU")
            
            # Supprimer les références complexes
            if ($updatedModel.reconciliationKeys.boModels) {
                $updatedModel.reconciliationKeys.boModels = @()
            }
            if ($updatedModel.reconciliationKeys.boModelKeys) {
                $updatedModel.reconciliationKeys.boModelKeys = @{}
            }
            
            Write-Host "   🔧 Correction appliquée:"
            Write-Host "   - Partner Keys: $($updatedModel.reconciliationKeys.partnerKeys -join ', ')"
            Write-Host "   - BO Keys: $($updatedModel.reconciliationKeys.boKeys -join ', ')"
            
            # Mettre à jour le modèle
            try {
                $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$($model.modelId)" -Method PUT -Body ($updatedModel | ConvertTo-Json -Depth 10) -ContentType "application/json"
                Write-Host "   ✅ Modèle mis à jour avec succès"
            } catch {
                Write-Host "   ❌ Erreur mise à jour: $($_.Exception.Message)"
            }
        } else {
            Write-Host "   ℹ️ Pas de clés de réconciliation configurées"
        }
    }
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)"
}

Write-Host "`n🎉 Correction terminée !"
Write-Host "Testez maintenant la réconciliation avec les nouvelles clés."
