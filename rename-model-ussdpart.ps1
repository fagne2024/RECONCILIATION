# Script pour renommer le modèle "Modèle basé sur CIOMCM.xls" en "Modèle USSDPART"

$API_BASE_URL = "http://localhost:8080/api"

Write-Host "🔄 Recherche du modèle à renommer..."

# Récupérer tous les modèles
try {
    $response = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models" -Method GET
    $models = $response.models
    
    # Chercher le modèle "Modèle basé sur CIOMCM.xls"
    $targetModel = $models | Where-Object { $_.name -eq "Modèle basé sur CIOMCM.xls" }
    
    if ($targetModel) {
        Write-Host "✅ Modèle trouvé:"
        Write-Host "  ID: $($targetModel.id)"
        Write-Host "  Nom actuel: $($targetModel.name)"
        Write-Host "  Type: $($targetModel.fileType)"
        Write-Host "  Pattern: $($targetModel.filePattern)"
        
        if ($targetModel.reconciliationKeys) {
            Write-Host "  Clés de réconciliation:"
            Write-Host "    - Partner Keys: $($targetModel.reconciliationKeys.partnerKeys -join ', ')"
            Write-Host "    - BO Keys: $($targetModel.reconciliationKeys.boKeys -join ', ')"
        }
        
        # Préparer la mise à jour
        $updateData = @{
            name = "Modèle USSDPART"
            filePattern = $targetModel.filePattern
            fileType = $targetModel.fileType
            autoApply = $targetModel.autoApply
            templateFile = $targetModel.templateFile
            reconciliationKeys = $targetModel.reconciliationKeys
            columnProcessingRules = $targetModel.columnProcessingRules
        }
        
        Write-Host "`n🔄 Mise à jour du modèle..."
        
        # Mettre à jour le modèle
        $updateResponse = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models/$($targetModel.id)" -Method PUT -Body ($updateData | ConvertTo-Json -Depth 10) -ContentType "application/json"
        
        if ($updateResponse.success) {
            Write-Host "✅ Modèle renommé avec succès!"
            Write-Host "  Nouveau nom: $($updateResponse.model.name)"
            Write-Host "  ID: $($updateResponse.model.id)"
        } else {
            Write-Host "❌ Erreur lors de la mise à jour: $($updateResponse.error)"
        }
        
    } else {
        Write-Host "❌ Modèle 'Modèle basé sur CIOMCM.xls' non trouvé"
        Write-Host "`n📋 Modèles disponibles:"
        foreach ($model in $models) {
            Write-Host "  - $($model.name) (ID: $($model.id), Type: $($model.fileType))"
        }
    }
    
} catch {
    Write-Host "❌ Erreur lors de la communication avec l'API: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        Write-Host "  Status Code: $($_.Exception.Response.StatusCode)"
    }
}

Write-Host "`n✅ Script terminé!"
