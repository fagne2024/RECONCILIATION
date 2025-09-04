# Script pour renommer le modele "Modèle basé sur CIOMCM.xls" en "Modèle USSDPART"

$API_BASE_URL = "http://localhost:8080/api"
$MODEL_ID = "model_3259ff17-8331-4f9c-b1ec-425d83203f17"

Write-Host "Recuperation du modele ModelID $MODEL_ID..."

try {
    # Recuperer le modele par ModelID
    $response = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models/$MODEL_ID" -Method GET
    
    if ($response.success) {
        $targetModel = $response.model
        Write-Host "Modele trouve:"
        Write-Host "  ID: $($targetModel.id)"
        Write-Host "  ModelID: $($targetModel.modelId)"
        Write-Host "  Nom actuel: $($targetModel.name)"
        Write-Host "  Type: $($targetModel.fileType)"
        Write-Host "  Pattern: $($targetModel.filePattern)"
        
        $updateData = @{
            name = "Modèle USSDPART"
            filePattern = $targetModel.filePattern
            fileType = $targetModel.fileType
            autoApply = $targetModel.autoApply
            templateFile = $targetModel.templateFile
            reconciliationKeys = $targetModel.reconciliationKeys
            columnProcessingRules = $targetModel.columnProcessingRules
        }
        
        Write-Host "`nMise a jour du modele..."
        
        $updateResponse = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models/$MODEL_ID" -Method PUT -Body ($updateData | ConvertTo-Json -Depth 10) -ContentType "application/json"
        
        if ($updateResponse.success) {
            Write-Host "Modele renomme avec succes!"
            Write-Host "  Nouveau nom: $($updateResponse.model.name)"
            Write-Host "  ModelID: $($updateResponse.model.modelId)"
        } else {
            Write-Host "Erreur lors de la mise a jour: $($updateResponse.error)"
        }
        
    } else {
        Write-Host "Modele ModelID $MODEL_ID non trouve"
    }
    
} catch {
    Write-Host "Erreur: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        Write-Host "  Status Code: $($_.Exception.Response.StatusCode)"
    }
}

Write-Host "Script termine!"
