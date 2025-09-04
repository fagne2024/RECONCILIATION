# Script pour renommer le modele ID 14 en "Modele USSDPART"

$API_BASE_URL = "http://localhost:8080/api"
$MODEL_ID = "14"

Write-Host "Recuperation du modele ID $MODEL_ID..."

try {
    # Recuperer le modele par ID
    $response = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models/$MODEL_ID" -Method GET
    
    if ($response.success) {
        $targetModel = $response.model
        Write-Host "Modele trouve:"
        Write-Host "  ID: $($targetModel.id)"
        Write-Host "  Nom actuel: $($targetModel.name)"
        Write-Host "  Type: $($targetModel.fileType)"
        Write-Host "  Pattern: $($targetModel.filePattern)"
        
        if ($targetModel.reconciliationKeys) {
            Write-Host "  Cles de reconciliation:"
            Write-Host "    - Partner Keys: $($targetModel.reconciliationKeys.partnerKeys -join ', ')"
            Write-Host "    - BO Keys: $($targetModel.reconciliationKeys.boKeys -join ', ')"
        }
        
        $updateData = @{
            name = "Modele USSDPART"
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
            Write-Host "  ID: $($updateResponse.model.id)"
        } else {
            Write-Host "Erreur lors de la mise a jour: $($updateResponse.error)"
        }
        
    } else {
        Write-Host "Modele ID $MODEL_ID non trouve"
    }
    
} catch {
    Write-Host "Erreur: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        Write-Host "  Status Code: $($_.Exception.Response.StatusCode)"
    }
}

Write-Host "Script termine!"
