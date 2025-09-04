# Script pour corriger le modele PMMTNCM - Ajouter le traitement _CM
$API_BASE_URL = "http://localhost:8080/api"

Write-Host "Correction du modele PMMTNCM - Ajout du traitement _CM" -ForegroundColor Yellow

# Recuperer le modele PMMTNCM
Write-Host "Recuperation du modele PMMTNCM..." -ForegroundColor Cyan
$modelsResponse = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models" -Method GET
$pmmtncmModel = $modelsResponse.models | Where-Object { $_.name -eq "Mod Le Bas Sur Pmmtncm Csv" }

if (-not $pmmtncmModel) {
    Write-Host "Modele PMMTNCM non trouve!" -ForegroundColor Red
    exit 1
}

Write-Host "Modele PMMTNCM trouve (ID: $($pmmtncmModel.id))" -ForegroundColor Green

# Configuration corrigee avec traitement _CM
$correctedModel = @{
    name = $pmmtncmModel.name
    filePattern = $pmmtncmModel.filePattern
    fileType = $pmmtncmModel.fileType
    autoApply = $pmmtncmModel.autoApply
    templateFile = $pmmtncmModel.templateFile
    reconciliationKeys = @{
        boModels = @("transaction_back_office_0587abae")
        partnerKeys = @("Id")
        boModelKeys = @{
            "transaction_back_office_0587abae" = @("ID Transaction")
        }
        boTreatments = @{
            "transaction_back_office_0587abae" = @(
                @{
                    type = "removeSuffix"
                    column = "ID Transaction"
                    suffix = "_CM"
                    description = "Supprimer le suffixe _CM de ID Transaction"
                }
            )
        }
        boKeys = @("ID Transaction")
    }
    columnProcessingRules = $pmmtncmModel.columnProcessingRules
}

Write-Host "Mise a jour du modele avec le traitement _CM..." -ForegroundColor Yellow
Write-Host "  - Partner Keys: Id" -ForegroundColor Green
Write-Host "  - BO Keys: ID Transaction" -ForegroundColor Green
Write-Host "  - Traitement: Supprimer le suffixe _CM de ID Transaction" -ForegroundColor Green

# Mettre a jour le modele
$updateResponse = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models/$($pmmtncmModel.id)" -Method PUT -Body ($correctedModel | ConvertTo-Json -Depth 10) -ContentType "application/json"

if ($updateResponse.success) {
    Write-Host "Modele PMMTNCM mis a jour avec succes!" -ForegroundColor Green
    Write-Host "Le traitement _CM est maintenant configure" -ForegroundColor Green
} else {
    Write-Host "Erreur lors de la mise a jour du modele" -ForegroundColor Red
    Write-Host "Erreur: $($updateResponse.message)" -ForegroundColor Red
}

Write-Host "Testez maintenant la reconciliation TRXBO.xls + PMMTNCM.csv !" -ForegroundColor Yellow
