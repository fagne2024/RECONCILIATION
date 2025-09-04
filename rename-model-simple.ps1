# Script pour renommer le modele "Modele base sur CIOMCM.xls" en "Modele USSDPART"

$API_BASE_URL = "http://localhost:8080/api"

Write-Host "Recherche du modele a renommer..."

try {
    $response = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models" -Method GET
    $models = $response.models
    
    $targetModel = $models | Where-Object { $_.name -eq "Modèle basé sur CIOMCM.xls" }
    
    if ($targetModel) {
        Write-Host "Modele trouve:"
        Write-Host "  ID: $($targetModel.id)"
        Write-Host "  Nom actuel: $($targetModel.name)"
        Write-Host "  Type: $($targetModel.fileType)"
        
        $updateData = @{
            name = "Modèle USSDPART"
            filePattern = $targetModel.filePattern
            fileType = $targetModel.fileType
            autoApply = $targetModel.autoApply
            templateFile = $targetModel.templateFile
            reconciliationKeys = $targetModel.reconciliationKeys
            columnProcessingRules = $targetModel.columnProcessingRules
        }
        
        Write-Host "Mise a jour du modele..."
        
        $updateResponse = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models/$($targetModel.id)" -Method PUT -Body ($updateData | ConvertTo-Json -Depth 10) -ContentType "application/json"
        
        if ($updateResponse.success) {
            Write-Host "Modele renomme avec succes!"
            Write-Host "  Nouveau nom: $($updateResponse.model.name)"
        } else {
            Write-Host "Erreur lors de la mise a jour: $($updateResponse.error)"
        }
        
    } else {
        Write-Host "Modele 'Modèle basé sur CIOMCM.xls' non trouve"
        Write-Host "Modeles disponibles:"
        foreach ($model in $models) {
            Write-Host "  - $($model.name) (ID: $($model.id))"
        }
    }
    
} catch {
    Write-Host "Erreur: $($_.Exception.Message)"
}

Write-Host "Script termine!"
