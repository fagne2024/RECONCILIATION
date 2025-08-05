# Test simple des partnerOnly
Write-Host "Test d'affichage des partnerOnly" -ForegroundColor Cyan

# Donnees de test avec des partnerOnly
$testData = @{
    boFileContent = @(
        @{
            "IDTransaction" = "TRX001"
            "telephone client" = "123456789"
            "montant" = "1000"
            "Service" = "PAIEMENT"
            "Numero Trans GU" = "GU001"
        },
        @{
            "IDTransaction" = "TRX002"
            "telephone client" = "987654321"
            "montant" = "2000"
            "Service" = "MARCHAND"
            "Numero Trans GU" = "GU002"
        }
    )
    partnerFileContent = @(
        @{
            "Type Operation" = "IMPACT"
            "Montant" = "500"
            "Solde avant" = "1000"
            "Solde apres" = "1500"
            "Numero Trans GU" = "GU001"
        },
        @{
            "Type Operation" = "IMPACT"
            "Montant" = "500"
            "Solde avant" = "1500"
            "Solde apres" = "2000"
            "Numero Trans GU" = "GU001"
        },
        @{
            "Type Operation" = "IMPACT"
            "Montant" = "1000"
            "Solde avant" = "2000"
            "Solde apres" = "3000"
            "Numero Trans GU" = "GU003"
        },
        @{
            "Type Operation" = "IMPACT"
            "Montant" = "500"
            "Solde avant" = "3000"
            "Solde apres" = "3500"
            "Numero Trans GU" = "GU004"
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
    Write-Host "  - GU001: 2 correspondances OPPART pour 1 TRXBO -> Match parfait" -ForegroundColor Green
    Write-Host "  - GU002: 0 correspondance OPPART pour 1 TRXBO -> BO Only" -ForegroundColor Yellow
    Write-Host "  - GU003: 1 correspondance OPPART sans TRXBO -> Partner Only" -ForegroundColor Yellow
    Write-Host "  - GU004: 1 correspondance OPPART sans TRXBO -> Partner Only" -ForegroundColor Yellow
    
} catch {
    Write-Host "Erreur lors de l'appel au backend:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host "Test termine" -ForegroundColor Cyan 