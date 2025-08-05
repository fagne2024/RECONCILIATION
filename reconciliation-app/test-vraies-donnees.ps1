# Test avec les vraies données TRXBO/OPPART

$API_BASE_URL = "http://localhost:8080/api"

Write-Host "Test avec les vraies donnees TRXBO/OPPART" -ForegroundColor Cyan

# Données TRXBO basées sur les logs réels
$trxboData = @(
    @{
        "IDTransaction" = "MP250710.2233.D30407"
        "téléphone client" = "656317956"
        "montant" = "429520"
        "Service" = "CM_PAIEMENTMARCHAND_OM_TP"
        "Numéro Trans GU" = "1752183177658"
        "Date" = "2024-01-01"
        "Agence" = "AG001"
        "PAYS" = "CM"
        "Statut" = "SUCCESS"
        "Expéditeur" = "CLIENT1"
        "Pays provenance" = "CM"
        "Bénéficiaire" = "MARCHAND1"
    },
    @{
        "IDTransaction" = "MP250710.2234.D30408"
        "téléphone client" = "656317957"
        "montant" = "500000"
        "Service" = "PAIEMENTMARCHAND_MTN_CM"
        "Numéro Trans GU" = "1752183177659"
        "Date" = "2024-01-02"
        "Agence" = "AG002"
        "PAYS" = "CM"
        "Statut" = "SUCCESS"
        "Expéditeur" = "CLIENT2"
        "Pays provenance" = "CM"
        "Bénéficiaire" = "MARCHAND2"
    }
)

# Données OPPART basées sur les logs réels
$oppartData = @(
    @{
        "ID Opération" = "2401307429"
        "Type Opération" = "IMPACT_COMPTIMPACT-COMPTE-GENERAL"
        "Montant" = "429,52"
        "Solde avant" = "68,723,429.294"
        "Solde aprés" = "69,152,949.294"
        "Numéro Trans GU" = "1752183177658"
        "Date opération" = "2024-01-01"
        "Code propriétaire" = "CP001"
        "groupe de réseau" = "GR001"
    },
    @{
        "ID Opération" = "2401307430"
        "Type Opération" = "IMPACT_COMPTIMPACT-COMPTE-GENERAL"
        "Montant" = "429,52"
        "Solde avant" = "69,152,949.294"
        "Solde aprés" = "69,152,949.294"
        "Numéro Trans GU" = "1752183177658"
        "Date opération" = "2024-01-01"
        "Code propriétaire" = "CP002"
        "groupe de réseau" = "GR001"
    },
    @{
        "ID Opération" = "2401307431"
        "Type Opération" = "IMPACT_COMPTIMPACT-COMPTE-GENERAL"
        "Montant" = "500,00"
        "Solde avant" = "69,152,949.294"
        "Solde aprés" = "69,653,949.294"
        "Numéro Trans GU" = "1752183177659"
        "Date opération" = "2024-01-02"
        "Code propriétaire" = "CP003"
        "groupe de réseau" = "GR002"
    }
)

# Préparer la requête de réconciliation
$reconciliationRequest = @{
    boFileContent = $trxboData
    partnerFileContent = $oppartData
    boKeyColumn = "Numéro Trans GU"
    partnerKeyColumn = "Numéro Trans GU"
    comparisonColumns = @(
        @{
            boColumn = "montant"
            partnerColumn = "Montant"
        },
        @{
            boColumn = "Date"
            partnerColumn = "Date opération"
        }
    )
}

Write-Host "Donnees de test preparees:" -ForegroundColor Green
Write-Host "  - TRXBO: $($trxboData.Count) enregistrements" -ForegroundColor Yellow
Write-Host "  - OPPART: $($oppartData.Count) enregistrements" -ForegroundColor Yellow
Write-Host ""

Write-Host "Scenarios de test attendus:" -ForegroundColor Cyan
Write-Host "  ✅ GU001 (1752183177658): Correspondance parfaite (1:2)" -ForegroundColor Green
Write-Host "  ❌ GU002 (1752183177659): Ecart - correspondance insuffisante (1:1)" -ForegroundColor Red
Write-Host ""

try {
    Write-Host "Envoi de la requete de reconciliation..." -ForegroundColor Blue
    
    $response = Invoke-RestMethod -Uri "$API_BASE_URL/reconciliation/reconcile" `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body ($reconciliationRequest | ConvertTo-Json -Depth 10)
    
    Write-Host "Reconciliation terminee avec succes!" -ForegroundColor Green
    Write-Host ""
    
    # Afficher les résultats
    Write-Host "RESULTATS DE LA RECONCILIATION:" -ForegroundColor Cyan
    Write-Host "Total TRXBO: $($response.totalBoRecords)" -ForegroundColor Yellow
    Write-Host "Total OPPART: $($response.totalPartnerRecords)" -ForegroundColor Yellow
    Write-Host "Correspondances parfaites: $($response.totalMatches)" -ForegroundColor Green
    Write-Host "Ecarts: $($response.totalMismatches)" -ForegroundColor Red
    Write-Host "Uniquement TRXBO: $($response.totalBoOnly)" -ForegroundColor Yellow
    Write-Host "Uniquement OPPART: $($response.totalPartnerOnly)" -ForegroundColor Yellow
    Write-Host "Temps d'execution: $($response.executionTimeMs) ms" -ForegroundColor Blue
    
    # Vérifier les résultats attendus
    Write-Host ""
    Write-Host "VERIFICATION DES RESULTATS:" -ForegroundColor Cyan
    
    $expectedMatches = 1  # GU001 avec 2 lignes OPPART
    $expectedMismatches = 1  # GU002 avec 1 ligne OPPART
    
    $matchesCorrect = $response.totalMatches -eq $expectedMatches
    $mismatchesCorrect = $response.totalMismatches -eq $expectedMismatches
    
    Write-Host "Correspondances parfaites: $($response.totalMatches)/$expectedMatches - $(if($matchesCorrect) {'CORRECT'} else {'INCORRECT'})" -ForegroundColor $(if($matchesCorrect) {'Green'} else {'Red'})
    Write-Host "Ecarts: $($response.totalMismatches)/$expectedMismatches - $(if($mismatchesCorrect) {'CORRECT'} else {'INCORRECT'})" -ForegroundColor $(if($mismatchesCorrect) {'Green'} else {'Red'})
    
    $allCorrect = $matchesCorrect -and $mismatchesCorrect
    
    Write-Host ""
    if ($allCorrect) {
        Write-Host "TOUS LES TESTS SONT PASSES AVEC SUCCES!" -ForegroundColor Green
        Write-Host "La logique de reconciliation TRXBO/OPPART fonctionne correctement" -ForegroundColor Green
    } else {
        Write-Host "CERTAINS TESTS ONT ECHOUE" -ForegroundColor Red
        Write-Host "Verifiez la logique de reconciliation" -ForegroundColor Yellow
    }
    
    # Afficher les détails des correspondances
    if ($response.matches.Count -gt 0) {
        Write-Host ""
        Write-Host "DETAILS DES CORRESPONDANCES PARFAITES:" -ForegroundColor Cyan
        foreach ($match in $response.matches) {
            Write-Host "  ✅ Cle: $($match.key)" -ForegroundColor Green
        }
    }
    
    # Afficher les détails des écarts
    if ($response.mismatches.Count -gt 0) {
        Write-Host ""
        Write-Host "DETAILS DES ECARTS:" -ForegroundColor Cyan
        foreach ($mismatch in $response.mismatches) {
            $key = $mismatch."Numéro Trans GU"
            Write-Host "  ❌ Cle: $key" -ForegroundColor Red
        }
    }
    
} catch {
    Write-Host "Erreur lors de la reconciliation:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Reponse du serveur: $responseBody" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Test termine" -ForegroundColor Cyan 