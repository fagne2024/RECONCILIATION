# Script de test de reconciliation simplifie pour les modeles existants

$API_BASE_URL = "http://localhost:8080/api"

Write-Host "=== TESTS DE RECONCILIATION SIMPLIFIES ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: TRXBO vs OPPART
Write-Host "--- Test 1: TRXBO vs OPPART ---" -ForegroundColor Yellow

$boDataOPPART = @(
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

$partnerDataOPPART = @(
    @{
        "Numero Trans GU" = "GU001"
        "External id" = "EXT001"
        "Transaction ID" = "TXN001"
        "Amount" = "1000"
        "Date" = "2024-01-15"
        "Status" = "Success"
    },
    @{
        "Numero Trans GU" = "GU002"
        "External id" = "EXT002"
        "Transaction ID" = "TXN002"
        "Amount" = "2500"
        "Date" = "2024-01-16"
        "Status" = "Success"
    },
    @{
        "Numero Trans GU" = "GU003"
        "External id" = "EXT003"
        "Transaction ID" = "TXN003"
        "Amount" = "3000"
        "Date" = "2024-01-17"
        "Status" = "Pending"
    }
)

$requestOPPART = @{
    boFileContent = $boDataOPPART
    partnerFileContent = $partnerDataOPPART
    boKeyColumn = "Numero Trans GU"
    partnerKeyColumn = "Numero Trans GU"
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

try {
    Write-Host "Envoi de la demande de reconciliation TRXBO vs OPPART..."
    $responseOPPART = Invoke-RestMethod -Uri "$API_BASE_URL/reconciliation/reconcile" -Method POST -Body ($requestOPPART | ConvertTo-Json -Depth 10) -ContentType "application/json"
    
    Write-Host "✅ Reconciliation TRXBO vs OPPART reussie!" -ForegroundColor Green
    Write-Host "  - Correspondances: $($responseOPPART.matches.Count)"
    Write-Host "  - BO uniquement: $($responseOPPART.boOnly.Count)"
    Write-Host "  - Partenaire uniquement: $($responseOPPART.partnerOnly.Count)"
    
    if ($responseOPPART.matches.Count -gt 0) {
        Write-Host "  - Exemple de correspondance:" -ForegroundColor Cyan
        $match = $responseOPPART.matches[0]
        Write-Host "    Cle: $($match.key)"
        Write-Host "    BO montant: $($match.boData.montant)"
        Write-Host "    Partner Amount: $($match.partnerData.Amount)"
    }
} catch {
    Write-Host "❌ Erreur TRXBO vs OPPART: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: TRXBO vs USSDPART
Write-Host "--- Test 2: TRXBO vs USSDPART ---" -ForegroundColor Yellow

$boDataUSSDPART = @(
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

$partnerDataUSSDPART = @(
    @{
        "Token" = "TOK001"
        "Numero Trans GU" = "GU001"
        "Reference" = "REF001"
        "Amount" = "1000"
        "Date" = "2024-01-15"
        "Status" = "Success"
    },
    @{
        "Token" = "TOK002"
        "Numero Trans GU" = "GU002"
        "Reference" = "REF002"
        "Amount" = "2500"
        "Date" = "2024-01-16"
        "Status" = "Success"
    },
    @{
        "Token" = "TOK003"
        "Numero Trans GU" = "GU003"
        "Reference" = "REF003"
        "Amount" = "1500"
        "Date" = "2024-01-17"
        "Status" = "Processing"
    }
)

$requestUSSDPART = @{
    boFileContent = $boDataUSSDPART
    partnerFileContent = $partnerDataUSSDPART
    boKeyColumn = "Numero Trans GU"
    partnerKeyColumn = "Numero Trans GU"
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

try {
    Write-Host "Envoi de la demande de reconciliation TRXBO vs USSDPART..."
    $responseUSSDPART = Invoke-RestMethod -Uri "$API_BASE_URL/reconciliation/reconcile" -Method POST -Body ($requestUSSDPART | ConvertTo-Json -Depth 10) -ContentType "application/json"
    
    Write-Host "✅ Reconciliation TRXBO vs USSDPART reussie!" -ForegroundColor Green
    Write-Host "  - Correspondances: $($responseUSSDPART.matches.Count)"
    Write-Host "  - BO uniquement: $($responseUSSDPART.boOnly.Count)"
    Write-Host "  - Partenaire uniquement: $($responseUSSDPART.partnerOnly.Count)"
    
    if ($responseUSSDPART.matches.Count -gt 0) {
        Write-Host "  - Exemple de correspondance:" -ForegroundColor Cyan
        $match = $responseUSSDPART.matches[0]
        Write-Host "    Cle: $($match.key)"
        Write-Host "    BO montant: $($match.boData.montant)"
        Write-Host "    Partner Amount: $($match.partnerData.Amount)"
        Write-Host "    Partner Token: $($match.partnerData.Token)"
    }
} catch {
    Write-Host "❌ Erreur TRXBO vs USSDPART: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 3: TRXBO vs CIOMCM (Modèle USSDPART)
Write-Host "--- Test 3: TRXBO vs CIOMCM (Modèle USSDPART) ---" -ForegroundColor Yellow

$boDataCIOMCM = @(
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

$partnerDataCIOMCM = @(
    @{
        "R_f_rence" = "REF001"
        "IDTransaction" = "TXN001"
        "Token" = "TOK001"
        "Amount" = "1000"
        "Date" = "2024-01-15"
        "Status" = "Success"
    },
    @{
        "R_f_rence" = "REF002"
        "IDTransaction" = "TXN002"
        "Token" = "TOK002"
        "Amount" = "2500"
        "Date" = "2024-01-16"
        "Status" = "Success"
    },
    @{
        "R_f_rence" = "REF003"
        "IDTransaction" = "TXN003"
        "Token" = "TOK003"
        "Amount" = "1500"
        "Date" = "2024-01-17"
        "Status" = "Processing"
    }
)

$requestCIOMCM = @{
    boFileContent = $boDataCIOMCM
    partnerFileContent = $partnerDataCIOMCM
    boKeyColumn = "IDTransaction"
    partnerKeyColumn = "IDTransaction"
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

try {
    Write-Host "Envoi de la demande de reconciliation TRXBO vs CIOMCM..."
    $responseCIOMCM = Invoke-RestMethod -Uri "$API_BASE_URL/reconciliation/reconcile" -Method POST -Body ($requestCIOMCM | ConvertTo-Json -Depth 10) -ContentType "application/json"
    
    Write-Host "✅ Reconciliation TRXBO vs CIOMCM reussie!" -ForegroundColor Green
    Write-Host "  - Correspondances: $($responseCIOMCM.matches.Count)"
    Write-Host "  - BO uniquement: $($responseCIOMCM.boOnly.Count)"
    Write-Host "  - Partenaire uniquement: $($responseCIOMCM.partnerOnly.Count)"
    
    if ($responseCIOMCM.matches.Count -gt 0) {
        Write-Host "  - Exemple de correspondance:" -ForegroundColor Cyan
        $match = $responseCIOMCM.matches[0]
        Write-Host "    Cle: $($match.key)"
        Write-Host "    BO montant: $($match.boData.montant)"
        Write-Host "    Partner Amount: $($match.partnerData.Amount)"
        Write-Host "    Partner Reference: $($match.partnerData.R_f_rence)"
    }
} catch {
    Write-Host "❌ Erreur TRXBO vs CIOMCM: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== FIN DES TESTS DE RECONCILIATION ===" -ForegroundColor Green
Write-Host "Tests termines!" -ForegroundColor Cyan
