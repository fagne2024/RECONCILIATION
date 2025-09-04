# Script de test corrige pour le modele CIOMCM avec les bonnes cles

$API_BASE_URL = "http://localhost:8080/api"

Write-Host "=== TEST MODELE CIOMCM AVEC BONNES CLES ===" -ForegroundColor Cyan
Write-Host ""

# Recuperer les modeles pour verifier la configuration
try {
    $response = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models" -Method GET
    $models = $response.models
    
    $ciomcmModel = $models | Where-Object { $_.name -like "*CIOMCM*" -or $_.name -eq "Modèle USSDPART" }
    
    if ($ciomcmModel) {
        Write-Host "Modele CIOMCM trouve:" -ForegroundColor Green
        Write-Host "  Nom: $($ciomcmModel.name)" -ForegroundColor White
        Write-Host "  Type: $($ciomcmModel.fileType)" -ForegroundColor White
        
        if ($ciomcmModel.reconciliationKeys) {
            Write-Host "  Cles configurees:" -ForegroundColor Cyan
            Write-Host "    - Partner Keys: $($ciomcmModel.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor White
            Write-Host "    - BO Keys: $($ciomcmModel.reconciliationKeys.boKeys -join ', ')" -ForegroundColor White
        }
        Write-Host ""
    }
} catch {
    Write-Host "Erreur lors de la recuperation des modeles: $($_.Exception.Message)" -ForegroundColor Red
}

# Donnees de test avec les bonnes cles qui correspondent
# Option 1: Utiliser IDTransaction des deux cotes
# Option 2: Utiliser R_f_rence des deux cotes

Write-Host "Test avec IDTransaction comme clé commune:" -ForegroundColor Yellow

$boData = @(
    @{
        "ID" = "TRX001"
        "IDTransaction" = "TXN001"
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
        "IDTransaction" = "TXN002"
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
        "R_f_rence" = "REF001"
        "IDTransaction" = "TXN001"  # Meme valeur que BO
        "Token" = "TOK001"
        "Amount" = "1000"
        "Date" = "2024-01-15"
        "Status" = "Success"
    },
    @{
        "R_f_rence" = "REF002"
        "IDTransaction" = "TXN002"  # Meme valeur que BO
        "Token" = "TOK002"
        "Amount" = "2500"
        "Date" = "2024-01-16"
        "Status" = "Success"
    },
    @{
        "R_f_rence" = "REF003"
        "IDTransaction" = "TXN003"  # Nouvelle valeur
        "Token" = "TOK003"
        "Amount" = "1500"
        "Date" = "2024-01-17"
        "Status" = "Processing"
    }
)

# Requete avec IDTransaction comme clé commune
$request = @{
    boFileContent = $boData
    partnerFileContent = $partnerData
    boKeyColumn = "IDTransaction"        # BO Keys: IDTransaction
    partnerKeyColumn = "IDTransaction"   # Partner Keys: IDTransaction (meme colonne)
    comparisonColumns = @(
        @{
            boColumn = "montant"
            partnerColumn = "Amount"
        },
        @{
            boColumn = "Date"
            partnerColumn = "Date"
        }
    )
}

Write-Host "Configuration de test CIOMCM (IDTransaction):" -ForegroundColor Yellow
Write-Host "  - BO Key: $($request.boKeyColumn)" -ForegroundColor White
Write-Host "  - Partner Key: $($request.partnerKeyColumn)" -ForegroundColor White
Write-Host "  - BO: $($boData.Count) enregistrements" -ForegroundColor Gray
Write-Host "  - Partner: $($partnerData.Count) enregistrements" -ForegroundColor Gray
Write-Host ""

Write-Host "Donnees de test:" -ForegroundColor Cyan
Write-Host "  BO (IDTransaction): $($boData[0].IDTransaction), $($boData[1].IDTransaction)" -ForegroundColor White
Write-Host "  Partner (IDTransaction): $($partnerData[0].IDTransaction), $($partnerData[1].IDTransaction), $($partnerData[2].IDTransaction)" -ForegroundColor White
Write-Host ""

Write-Host "Envoi de la demande de reconciliation..."

try {
    $jsonRequest = $request | ConvertTo-Json -Depth 10
    Write-Host "JSON de la requete:" -ForegroundColor Yellow
    Write-Host $jsonRequest -ForegroundColor Gray
    Write-Host ""
    
    $response = Invoke-RestMethod -Uri "$API_BASE_URL/reconciliation/reconcile" -Method POST -Body $jsonRequest -ContentType "application/json"
    
    Write-Host "Reconciliation CIOMCM reussie!" -ForegroundColor Green
    Write-Host "  - Correspondances: $($response.matches.Count)" -ForegroundColor White
    Write-Host "  - BO uniquement: $($response.boOnly.Count)" -ForegroundColor White
    Write-Host "  - Partner uniquement: $($response.partnerOnly.Count)" -ForegroundColor White
    
    if ($response.matches.Count -gt 0) {
        Write-Host "  - Exemples de correspondances:" -ForegroundColor Cyan
        foreach ($match in $response.matches) {
            Write-Host "    Cle: $($match.key)" -ForegroundColor White
            Write-Host "      BO IDTransaction: $($match.boData.IDTransaction)" -ForegroundColor Gray
            Write-Host "      Partner IDTransaction: $($match.partnerData.IDTransaction)" -ForegroundColor Gray
            Write-Host "      BO montant: $($match.boData.montant)" -ForegroundColor Gray
            Write-Host "      Partner Amount: $($match.partnerData.Amount)" -ForegroundColor Gray
            Write-Host "      Partner R_f_rence: $($match.partnerData.R_f_rence)" -ForegroundColor Gray
        }
    }
    
    if ($response.boOnly.Count -gt 0) {
        Write-Host "  - BO uniquement:" -ForegroundColor Yellow
        foreach ($bo in $response.boOnly) {
            Write-Host "    IDTransaction: $($bo.IDTransaction)" -ForegroundColor Gray
        }
    }
    
    if ($response.partnerOnly.Count -gt 0) {
        Write-Host "  - Partner uniquement:" -ForegroundColor Yellow
        foreach ($partner in $response.partnerOnly) {
            Write-Host "    IDTransaction: $($partner.IDTransaction)" -ForegroundColor Gray
            Write-Host "    R_f_rence: $($partner.R_f_rence)" -ForegroundColor Gray
        }
    }
    
} catch {
    Write-Host "Erreur reconciliation CIOMCM: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "  Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        Write-Host "  Response: $($_.Exception.Response.StatusDescription)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Test CIOMCM termine!" -ForegroundColor Cyan
