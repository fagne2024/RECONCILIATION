# Script pour creer un modele PMOMCM
# Probleme : Pas de modele pour les fichiers PMOMCM

$API_BASE_URL = "http://localhost:8080/api"

Write-Host "Creation du modele PMOMCM" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan

# Configuration du nouveau modele PMOMCM
$pmomcmModel = @{
    name = "Modele PMOMCM Cameroun"
    filePattern = "*PMOMCM*.xls"
    fileType = "partner"
    autoApply = $true
    templateFile = ""
    reconciliationKeys = @{
        partnerKeys = @("Référence")  # Colonne disponible apres traitement Orange Money
        boKeys = @("ID Transaction")  # Cle BO correcte
        boModels = @()
        boModelKeys = @{}
        boTreatments = @{}
    }
    columnProcessingRules = @()
}

Write-Host "Configuration du modele PMOMCM:" -ForegroundColor Yellow
Write-Host "  - Nom: $($pmomcmModel.name)" -ForegroundColor White
Write-Host "  - Pattern: $($pmomcmModel.filePattern)" -ForegroundColor White
Write-Host "  - Type: $($pmomcmModel.fileType)" -ForegroundColor White
Write-Host "  - Partner Keys: $($pmomcmModel.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor White
Write-Host "  - BO Keys: $($pmomcmModel.reconciliationKeys.boKeys -join ', ')" -ForegroundColor White

try {
    # Creer le nouveau modele
    $createResponse = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models" -Method POST -Body ($pmomcmModel | ConvertTo-Json -Depth 10) -ContentType "application/json"
    
    if ($createResponse.success) {
        Write-Host "Modele PMOMCM cree avec succes!" -ForegroundColor Green
        Write-Host "  ID: $($createResponse.model.id)" -ForegroundColor White
        Write-Host "  Nom: $($createResponse.model.name)" -ForegroundColor White
        Write-Host "  Pattern: $($createResponse.model.filePattern)" -ForegroundColor White
        
        if ($createResponse.model.reconciliationKeys) {
            Write-Host "  Cles configurees:" -ForegroundColor Green
            Write-Host "    - Partner Keys: $($createResponse.model.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor White
            Write-Host "    - BO Keys: $($createResponse.model.reconciliationKeys.boKeys -join ', ')" -ForegroundColor White
        }
    } else {
        Write-Host "Erreur lors de la creation: $($createResponse.error)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nModele PMOMCM cree! Maintenant testez la reconciliation automatique avec vos fichiers TRXBO.xls et PMOMCM.xls" -ForegroundColor Green
Write-Host "Note: Le traitement Orange Money conserve la colonne Référence" -ForegroundColor Yellow
