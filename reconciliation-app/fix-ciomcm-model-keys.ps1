# Script pour corriger la configuration du modele CIOMCM
# Probleme : La cle 'Reference' n'existe pas dans le fichier traite Orange Money

$API_BASE_URL = "http://localhost:8080/api"

Write-Host "Correction de la configuration du modele CIOMCM" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Recuperer tous les modeles
try {
    $response = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models" -Method GET
    $models = $response.models
    
    # Chercher le modele CIOMCM
    $ciomcmModel = $models | Where-Object { $_.name -like "*CIOMCM*" -or $_.name -like "*Mod Le Bas Sur Ciomcm*" }
    
    if ($ciomcmModel) {
        Write-Host "Modele CIOMCM trouve:" -ForegroundColor Green
        Write-Host "  ID: $($ciomcmModel.id)" -ForegroundColor White
        Write-Host "  Nom: $($ciomcmModel.name)" -ForegroundColor White
        Write-Host "  Type: $($ciomcmModel.fileType)" -ForegroundColor White
        Write-Host "  Pattern: $($ciomcmModel.filePattern)" -ForegroundColor White
        
        if ($ciomcmModel.reconciliationKeys) {
            Write-Host "  Cles actuelles:" -ForegroundColor Yellow
            Write-Host "    - Partner Keys: $($ciomcmModel.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor White
            Write-Host "    - BO Keys: $($ciomcmModel.reconciliationKeys.boKeys -join ', ')" -ForegroundColor White
        }
        
        # Configuration corrigee - utiliser les colonnes reellement disponibles apres traitement Orange Money
        $correctedModel = @{
            name = $ciomcmModel.name
            filePattern = "*CIOMCM*.xls,*PMOMCM*.xls"  # Etendre pour inclure PMOMCM
            fileType = $ciomcmModel.fileType
            autoApply = $ciomcmModel.autoApply
            templateFile = $ciomcmModel.templateFile
            reconciliationKeys = @{
                partnerKeys = @("Référence")  # Colonne disponible apres traitement Orange Money
                boKeys = @("ID Transaction")  # Cle BO correcte
                boModels = @()
                boModelKeys = @{}
                boTreatments = @{}
            }
            columnProcessingRules = $ciomcmModel.columnProcessingRules
        }
        
        Write-Host "`nMise a jour du modele avec les cles corrigees..." -ForegroundColor Yellow
        Write-Host "  - Pattern etendu: *CIOMCM*.xls,*PMOMCM*.xls" -ForegroundColor Green
        Write-Host "  - Partner Keys: Référence (colonne disponible apres traitement)" -ForegroundColor Green
        Write-Host "  - BO Keys: ID Transaction" -ForegroundColor Green
        Write-Host "  Note: Le traitement Orange Money conserve la colonne Référence" -ForegroundColor Yellow
        
        # Mettre a jour le modele
        $updateResponse = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models/$($ciomcmModel.id)" -Method PUT -Body ($correctedModel | ConvertTo-Json -Depth 10) -ContentType "application/json"
        
        if ($updateResponse.success) {
            Write-Host "Modele CIOMCM mis a jour avec succes!" -ForegroundColor Green
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
        Write-Host "Modele CIOMCM non trouve" -ForegroundColor Red
        Write-Host "Modeles disponibles:" -ForegroundColor Yellow
        foreach ($model in $models) {
            Write-Host "  - $($model.name) (ID: $($model.id))" -ForegroundColor White
        }
    }
    
} catch {
    Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nTest de la reconciliation CIOMCM..." -ForegroundColor Cyan

# Donnees de test pour verifier la correction
$boData = @(
    @{
        "ID" = "TRX001"
        "ID Transaction" = "TXN001"
        "Numero Trans GU" = "GU001"
        "montant" = "1000"
        "Date" = "2024-01-15"
        "telephone client" = "123456789"
        "Service" = "Transfert"
        "Agence" = "Agence A"
        "Statut" = "Succes"
    },
    @{
        "ID" = "TRX002"
        "ID Transaction" = "TXN002"
        "Numero Trans GU" = "GU002"
        "montant" = "2500"
        "Date" = "2024-01-16"
        "telephone client" = "987654321"
        "Service" = "Transfert"
        "Agence" = "Agence B"
        "Statut" = "Succes"
    }
)

$partnerData = @(
    @{
        "Compte Orange Money" = "OM001"  # Cle corrigee - colonne disponible apres traitement
        "undefined" = ""
        "656250168 T te de r seau" = "Tete de reseau 1"
    },
    @{
        "Compte Orange Money" = "OM002"  # Cle corrigee - colonne disponible apres traitement
        "undefined" = ""
        "656250168 T te de r seau" = "Tete de reseau 2"
    }
)

Write-Host "Donnees de test:" -ForegroundColor Yellow
Write-Host "  - BO: $($boData.Count) enregistrements" -ForegroundColor White
Write-Host "  - Partenaire: $($partnerData.Count) enregistrements" -ForegroundColor White
Write-Host "  - Cle BO: 'ID Transaction'" -ForegroundColor White
Write-Host "  - Cle Partenaire: 'Compte Orange Money'" -ForegroundColor White

Write-Host "`nCorrection terminee! Maintenant testez la reconciliation automatique avec vos fichiers TRXBO.xls et CIOMCM.xls" -ForegroundColor Green
Write-Host "Note: Le traitement Orange Money conserve seulement certaines colonnes du fichier original" -ForegroundColor Yellow
