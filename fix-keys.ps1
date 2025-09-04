Write-Host "Correction des cles de reconciliation"

try {
    $models = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    Write-Host "Modeles trouves: $($models.models.Count)"
    
    foreach ($model in $models.models) {
        Write-Host "Modele: $($model.name)"
        
        if ($model.reconciliationKeys) {
            Write-Host "  Cles actuelles:"
            Write-Host "  - Partner: $($model.reconciliationKeys.partnerKeys -join ', ')"
            Write-Host "  - BO: $($model.reconciliationKeys.boKeys -join ', ')"
            
            $newModel = @{
                name = $model.name
                filePattern = $model.filePattern
                fileType = $model.fileType
                autoApply = $model.autoApply
                templateFile = $model.templateFile
                reconciliationKeys = @{
                    partnerKeys = @("Numero Trans GU")
                    boKeys = @("Numero Trans GU")
                    boModels = @()
                }
                columnProcessingRules = @()
            }
            
            Write-Host "  Nouvelles cles: Numero Trans GU"
            
            try {
                Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$($model.modelId)" -Method DELETE
                Write-Host "  Ancien modele supprime"
            } catch {
                Write-Host "  Erreur suppression: $($_.Exception.Message)"
            }
            
            try {
                $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method POST -Body ($newModel | ConvertTo-Json -Depth 10) -ContentType "application/json"
                Write-Host "  Nouveau modele cree"
            } catch {
                Write-Host "  Erreur creation: $($_.Exception.Message)"
            }
        }
    }
    
} catch {
    Write-Host "Erreur: $($_.Exception.Message)"
}

Write-Host "Correction terminee !"
