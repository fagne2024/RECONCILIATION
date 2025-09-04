# Script pour tester la reconciliation avec des donnees qui correspondent

$API_BASE_URL = "http://localhost:8080/api"

Write-Host "=== TEST RECONCILIATION AVEC DONNEES CORRESPONDANTES ===" -ForegroundColor Cyan
Write-Host ""

try {
    # Verifier que le backend repond
    $response = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models" -Method GET
    Write-Host "✅ Backend demarre - Modeles trouves: $($response.models.Count)" -ForegroundColor Green
    
    # Verifier le modele OPPART
    $oppartModel = $response.models | Where-Object { $_.name -like "*OPPART*" }
    if ($oppartModel) {
        Write-Host "✅ Modele OPPART trouve: $($oppartModel.name)" -ForegroundColor Green
        Write-Host "  Cles configurees: $($oppartModel.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor White
    }
    
    Write-Host ""
    Write-Host "=== TEST DE RECONCILIATION AVEC CORRESPONDANCES ===" -ForegroundColor Yellow
    
    # Donnees de test avec correspondances exactes
    $boData = @(
        @{
            "Numéro Trans GU" = "MP250701.0829.C25981"
            "montant" = "1000"
            "Date" = "2024-01-15"
        },
        @{
            "Numéro Trans GU" = "13099112233_CM"
            "montant" = "2500"
            "Date" = "2024-01-16"
        }
    )
    
    $partnerData = @(
        @{
            "Numéro Trans GU" = "MP250701.0829.C25981"  # Correspondance exacte
            "Amount" = "1000"
            "Date" = "2024-01-15"
        },
        @{
            "Numéro Trans GU" = "13099112233_CM"  # Correspondance exacte
            "Amount" = "2500"
            "Date" = "2024-01-16"
        },
        @{
            "Numéro Trans GU" = "MP250701.0829.C99999"  # Pas de correspondance
            "Amount" = "3000"
            "Date" = "2024-01-17"
        }
    )
    
    Write-Host "Donnees de test avec correspondances:" -ForegroundColor White
    Write-Host "  - BO: $($boData.Count) enregistrements" -ForegroundColor Gray
    Write-Host "  - Partner: $($partnerData.Count) enregistrements" -ForegroundColor Gray
    Write-Host "  - Colonnes BO: $($boData[0].Keys -join ', ')" -ForegroundColor Gray
    Write-Host "  - Colonnes Partner: $($partnerData[0].Keys -join ', ')" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "Valeurs des cles:" -ForegroundColor Cyan
    Write-Host "  BO Keys: $($boData.'Numéro Trans GU' -join ', ')" -ForegroundColor White
    Write-Host "  Partner Keys: $($partnerData.'Numéro Trans GU' -join ', ')" -ForegroundColor White
    
    # Requete de reconciliation
    $request = @{
        boFileContent = $boData
        partnerFileContent = $partnerData
        boKeyColumn = "Numéro Trans GU"
        partnerKeyColumn = "Numéro Trans GU"
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
    
    Write-Host ""
    Write-Host "Envoi de la demande de reconciliation..." -ForegroundColor Yellow
    
    $reconciliationResponse = Invoke-RestMethod -Uri "$API_BASE_URL/reconciliation/reconcile" -Method POST -Body ($request | ConvertTo-Json -Depth 10) -ContentType "application/json"
    
    Write-Host "✅ Reconciliation reussie!" -ForegroundColor Green
    Write-Host "  - Correspondances trouvees: $($reconciliationResponse.matches.Count)" -ForegroundColor White
    Write-Host "  - Donnees BO uniquement: $($reconciliationResponse.boOnly.Count)" -ForegroundColor White
    Write-Host "  - Donnees Partenaire uniquement: $($reconciliationResponse.partnerOnly.Count)" -ForegroundColor White
    
    if ($reconciliationResponse.matches.Count -gt 0) {
        Write-Host ""
        Write-Host "Exemples de correspondances:" -ForegroundColor Cyan
        foreach ($match in $reconciliationResponse.matches) {
            Write-Host "  - Cle: $($match.key)" -ForegroundColor White
            Write-Host "    BO montant: $($match.boData.montant)" -ForegroundColor Gray
            Write-Host "    Partner Amount: $($match.partnerData.Amount)" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Write-Host "=== RESULTAT ===" -ForegroundColor Cyan
    if ($reconciliationResponse.matches.Count -gt 0) {
        Write-Host "✅ SUCCES: La reconciliation fonctionne avec les cles configurees!" -ForegroundColor Green
        Write-Host "Les cles sont correctement recuperees et utilisees." -ForegroundColor White
        Write-Host "Le systeme trouve $($reconciliationResponse.matches.Count) correspondances." -ForegroundColor White
    } else {
        Write-Host "❌ ECHEC: Aucune correspondance trouvee" -ForegroundColor Red
        Write-Host "Il faut verifier la configuration des cles ou les donnees de test." -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "  Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Test termine!" -ForegroundColor Cyan
