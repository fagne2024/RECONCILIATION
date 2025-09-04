# Script simple pour corriger la configuration du modèle CIOMCM
Write-Host "Correction automatique de la configuration du modèle CIOMCM..." -ForegroundColor Yellow

try {
    # Récupérer les modèles existants
    $models = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    
    # Trouver le modèle CIOMCM
    $ciomcmModel = $models | Where-Object { $_.name -like "*CIOMCM*" }
    
    if ($ciomcmModel) {
        Write-Host "Modèle CIOMCM trouvé: $($ciomcmModel.name)" -ForegroundColor Green
        Write-Host "Configuration actuelle:" -ForegroundColor Cyan
        Write-Host "   - Partner Keys: $($ciomcmModel.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor White
        Write-Host "   - BO Keys: $($ciomcmModel.reconciliationKeys.boKeys -join ', ')" -ForegroundColor White
        
        # Configuration corrigée
        $correctedModel = @{
            name = $ciomcmModel.name
            filePattern = $ciomcmModel.filePattern
            fileType = $ciomcmModel.fileType
            autoApply = $ciomcmModel.autoApply
            templateFile = $ciomcmModel.templateFile
            reconciliationKeys = @{
                partnerKeys = @("Reference")
                boKeys = @("ID Transaction")
                boModels = $ciomcmModel.reconciliationKeys.boModels
                boModelKeys = $ciomcmModel.reconciliationKeys.boModelKeys
                boTreatments = $ciomcmModel.reconciliationKeys.boTreatments
            }
            columnProcessingRules = $ciomcmModel.columnProcessingRules
            reconciliationLogic = $ciomcmModel.reconciliationLogic
            correspondenceRules = $ciomcmModel.correspondenceRules
            comparisonColumns = $ciomcmModel.comparisonColumns
        }
        
        Write-Host "Configuration corrigée:" -ForegroundColor Yellow
        Write-Host "  - Partner Keys: Reference" -ForegroundColor Green
        Write-Host "  - BO Keys: ID Transaction" -ForegroundColor Green
        
        # Mettre à jour le modèle
        $updateResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$($ciomcmModel.id)" -Method PUT -Body ($correctedModel | ConvertTo-Json -Depth 10) -ContentType "application/json"
        
        Write-Host "Modèle CIOMCM mis à jour avec succès!" -ForegroundColor Green
        Write-Host "Configuration finale:" -ForegroundColor Cyan
        Write-Host "   - Partner Keys: $($updateResponse.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor White
        Write-Host "   - BO Keys: $($updateResponse.reconciliationKeys.boKeys -join ', ')" -ForegroundColor White
        
    } else {
        Write-Host "Modèle CIOMCM non trouvé" -ForegroundColor Red
        Write-Host "Modèles disponibles:" -ForegroundColor Cyan
        $models | ForEach-Object { Write-Host "   - $($_.name)" -ForegroundColor White }
    }
    
} catch {
    Write-Host "Erreur lors de la correction du modèle CIOMCM:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host "Test de la réconciliation automatique..." -ForegroundColor Yellow
Write-Host "Veuillez maintenant tester l'upload des fichiers TRXBO.xls et CIOMCM.xls" -ForegroundColor Cyan
