# Test avec les vraies donnees TRXBO et OPPART
Write-Host "Test avec les vraies donnees TRXBO et OPPART" -ForegroundColor Cyan

# Donnees de test basees sur les logs de l'utilisateur
$testData = @{
    boFileContent = @(
        @{
            "IDTransaction" = "MP250710.2233.D30407"
            "telephone client" = "656317956"
            "montant" = "429520"
            "Service" = "CM_PAIEMENTMARCHAND_OM_TP"
            "Numero Trans GU" = "1752183177658"
        },
        @{
            "IDTransaction" = "MP250710.2234.D30408"
            "telephone client" = "656317957"
            "montant" = "500000"
            "Service" = "PAIEMENTMARCHAND_MTN_CM"
            "Numero Trans GU" = "1752183177659"
        }
    )
    partnerFileContent = @(
        @{
            "Type Operation" = "IMPACT_COMPTIMPACT-COMPTE-GENERAL"
            "Montant" = "429.52"
            "Solde avant" = "68,723,429.294"
            "Solde apres" = "69,152,949.294"
            "Numero Trans GU" = "1752183177658"
        },
        @{
            "Type Operation" = "IMPACT_COMPTIMPACT-COMPTE-GENERAL"
            "Montant" = "429.52"
            "Solde avant" = "69,152,949.294"
            "Solde apres" = "69,582,469.294"
            "Numero Trans GU" = "1752183177658"
        },
        @{
            "Type Operation" = "IMPACT_COMPTIMPACT-COMPTE-GENERAL"
            "Montant" = "500.00"
            "Solde avant" = "69,582,469.294"
            "Solde apres" = "70,082,969.294"
            "Numero Trans GU" = "1752183177659"
        }
    )
    boKeyColumn = "Numero Trans GU"
    partnerKeyColumn = "Numero Trans GU"
    comparisonColumns = @(
        @{
            boColumn = "montant"
            partnerColumn = "Montant"
        }
    )
}

# Convertir en JSON
$jsonData = $testData | ConvertTo-Json -Depth 10

Write-Host "Envoi de la requete de reconciliation..." -ForegroundColor Yellow
Write-Host "Donnees BO: $($testData.boFileContent.Count) lignes" -ForegroundColor Green
Write-Host "Donnees Partenaire: $($testData.partnerFileContent.Count) lignes" -ForegroundColor Green

try {
    # Appel au backend
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/reconciliation/reconcile" -Method POST -Body $jsonData -ContentType "application/json"
    
    Write-Host "Reponse recue du backend:" -ForegroundColor Green
    Write-Host "Matches: $($response.matches.Count)" -ForegroundColor Green
    Write-Host "BO Only: $($response.boOnly.Count)" -ForegroundColor Green
    Write-Host "Partner Only: $($response.partnerOnly.Count)" -ForegroundColor Green
    Write-Host "Mismatches: $($response.mismatches.Count)" -ForegroundColor Green
    
    # Afficher les details des partnerOnly
    if ($response.partnerOnly.Count -gt 0) {
        Write-Host "Details des Partner Only:" -ForegroundColor Cyan
        foreach ($record in $response.partnerOnly) {
            Write-Host "  - Numero Trans GU: $($record.'Numero Trans GU')" -ForegroundColor Yellow
        }
    } else {
        Write-Host "Aucun Partner Only trouve" -ForegroundColor Red
    }
    
    # Verifier la logique TRXBO/OPPART
    Write-Host "Analyse de la logique TRXBO/OPPART:" -ForegroundColor Cyan
    Write-Host "  - 1752183177658: 2 correspondances OPPART pour 1 TRXBO -> Match parfait" -ForegroundColor Green
    Write-Host "  - 1752183177659: 1 correspondance OPPART pour 1 TRXBO -> Mismatch (ecart BO)" -ForegroundColor Yellow
    
} catch {
    Write-Host "Erreur lors de l'appel au backend:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host "Test termine" -ForegroundColor Cyan 