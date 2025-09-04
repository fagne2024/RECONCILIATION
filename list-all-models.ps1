# Script pour lister tous les modeles avec details

$API_BASE_URL = "http://localhost:8080/api"

Write-Host "Recuperation de tous les modeles..."

try {
    $response = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models" -Method GET
    $models = $response.models
    
    Write-Host "Nombre de modeles trouves: $($models.Count)"
    Write-Host ""
    
    foreach ($model in $models) {
        Write-Host "Modele: $($model.name)"
        Write-Host "  ID: $($model.id)"
        Write-Host "  ModelID: $($model.modelId)"
        Write-Host "  Type: $($model.fileType)"
        Write-Host "  Pattern: $($model.filePattern)"
        Write-Host "  AutoApply: $($model.autoApply)"
        
        if ($model.reconciliationKeys) {
            Write-Host "  Cles de reconciliation:"
            if ($model.reconciliationKeys.partnerKeys) {
                Write-Host "    - Partner Keys: $($model.reconciliationKeys.partnerKeys -join ', ')"
            }
            if ($model.reconciliationKeys.boKeys) {
                Write-Host "    - BO Keys: $($model.reconciliationKeys.boKeys -join ', ')"
            }
        }
        Write-Host ""
    }
    
} catch {
    Write-Host "Erreur: $($_.Exception.Message)"
}

Write-Host "Script termine!"
