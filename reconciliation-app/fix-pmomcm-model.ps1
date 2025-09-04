# Script pour corriger la configuration du modele PMOMCM
# Probleme : Utiliser exactement les memes cles que le modele CIOMCM

$API_BASE_URL = "http://localhost:8080/api"

Write-Host "Correction de la configuration du modele PMOMCM" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# Recuperer tous les modeles
try {
    $response = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models" -Method GET
    $models = $response.models
    
    # Chercher le modele PMOMCM
    $pmomcmModel = $models | Where-Object { $_.name -like "*PMOMCM*" -or $_.name -like "*Pmomcm*" }
    
    if ($pmomcmModel) {
        Write-Host "Modele PMOMCM trouve:" -ForegroundColor Green
        Write-Host "  ID: $($pmomcmModel.id)" -ForegroundColor White
        Write-Host "  Nom: $($pmomcmModel.name)" -ForegroundColor White
        Write-Host "  Type: $($pmomcmModel.fileType)" -ForegroundColor White
        Write-Host "  Pattern: $($pmomcmModel.filePattern)" -ForegroundColor White
        
        if ($pmomcmModel.reconciliationKeys) {
            Write-Host "  Cles actuelles:" -ForegroundColor Yellow
            Write-Host "    - Partner Keys: $($pmomcmModel.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor White
            Write-Host "    - BO Keys: $($pmomcmModel.reconciliationKeys.boKeys -join ', ')" -ForegroundColor White
        }
        
        # Configuration corrigee - utiliser exactement les memes cles que le modele CIOMCM
        $correctedModel = @{
            name = $pmomcmModel.name
            filePattern = $pmomcmModel.filePattern
            fileType = $pmomcmModel.fileType
            autoApply = $pmomcmModel.autoApply
            templateFile = $pmomcmModel.templateFile
            reconciliationKeys = @{
                partnerKeys = @("Référence")  # Meme clé que CIOMCM
                boKeys = @("ID Transaction")  # Meme clé que CIOMCM
                boModels = @()
                boModelKeys = @{}
                boTreatments = @{}
            }
            columnProcessingRules = $pmomcmModel.columnProcessingRules
        }
        
        Write-Host "`nMise a jour du modele avec les cles corrigees..." -ForegroundColor Yellow
        Write-Host "  - Partner Keys: Référence (meme clé que CIOMCM)" -ForegroundColor Green
        Write-Host "  - BO Keys: ID Transaction (meme clé que CIOMCM)" -ForegroundColor Green
        Write-Host "  Note: Utilisation des memes clés que le modele CIOMCM" -ForegroundColor Yellow
        
        # Mettre a jour le modele
        $updateResponse = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models/$($pmomcmModel.id)" -Method PUT -Body ($correctedModel | ConvertTo-Json -Depth 10) -ContentType "application/json"
        
        if ($updateResponse.success) {
            Write-Host "Modele PMOMCM mis a jour avec succes!" -ForegroundColor Green
            Write-Host "  Nouveau nom: $($updateResponse.model.name)" -ForegroundColor White
            
            if ($updateResponse.model.reconciliationKeys) {
                Write-Host "  Nouvelles cles:" -ForegroundColor Green
                Write-Host "    - Partner Keys: $($updateResponse.model.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor White
                Write-Host "    - BO Keys: $($updateResponse.model.reconciliationKeys.boKeys -join ', ')" -ForegroundColor White
            }
        } else {
            Write-Host "Erreur lors de la mise a jour: $($updateResponse.error)" -ForegroundColor Red
        }
        
    } else {
        Write-Host "Modele PMOMCM non trouve" -ForegroundColor Red
        Write-Host "Modeles disponibles:" -ForegroundColor Yellow
        foreach ($model in $models) {
            Write-Host "  - $($model.name) (ID: $($model.id))" -ForegroundColor White
        }
    }
    
} catch {
    Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nCorrection terminee! Maintenant testez la reconciliation automatique avec vos fichiers TRXBO.xls et PMOMCM.xls" -ForegroundColor Green
Write-Host "Note: Utilisation des memes clés que le modele CIOMCM" -ForegroundColor Yellow
