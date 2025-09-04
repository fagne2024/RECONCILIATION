# Script pour renommer le modele en utilisant le format DTO correct

$API_BASE_URL = "http://localhost:8080/api"
$MODEL_ID = "14"

Write-Host "Recuperation du modele ID $MODEL_ID..."

try {
    # Recuperer le modele par ID
    $response = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models" -Method GET
    $models = $response.models
    
    $targetModel = $models | Where-Object { $_.id -eq $MODEL_ID }
    
    if ($targetModel) {
        Write-Host "Modele trouve:"
        Write-Host "  ID: $($targetModel.id)"
        Write-Host "  ModelID: $($targetModel.modelId)"
        Write-Host "  Nom actuel: $($targetModel.name)"
        Write-Host "  Type: $($targetModel.fileType)"
        
        # Preparer les donnees au format DTO
        $updateData = @{
            id = $targetModel.id
            modelId = $targetModel.modelId
            name = "Modèle USSDPART"
            filePattern = $targetModel.filePattern
            fileType = $targetModel.fileType
            autoApply = $targetModel.autoApply
            templateFile = $targetModel.templateFile
            reconciliationKeys = $targetModel.reconciliationKeys
            columnProcessingRules = @()
            createdAt = $targetModel.createdAt
            updatedAt = $targetModel.updatedAt
        }
        
        Write-Host "`nMise a jour du modele..."
        
        $updateResponse = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models/$MODEL_ID" -Method PUT -Body ($updateData | ConvertTo-Json -Depth 10) -ContentType "application/json"
        
        if ($updateResponse.success) {
            Write-Host "Modele renomme avec succes!"
            Write-Host "  Nouveau nom: $($updateResponse.model.name)"
            Write-Host "  ID: $($updateResponse.model.id)"
        } else {
            Write-Host "Erreur lors de la mise a jour: $($updateResponse.error)"
        }
        
    } else {
        Write-Host "Modele ID $MODEL_ID non trouve"
        Write-Host "Modeles disponibles:"
        foreach ($model in $models) {
            Write-Host "  - $($model.name) (ID: $($model.id))"
        }
    }
    
} catch {
    Write-Host "Erreur: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        Write-Host "  Status Code: $($_.Exception.Response.StatusCode)"
        Write-Host "  Response: $($_.Exception.Response.StatusDescription)"
    }
}

Write-Host "Script termine!"
