# Script de diagnostic simple

$API_BASE_URL = "http://localhost:8080/api"

Write-Host "=== DIAGNOSTIC SIMPLE ===" -ForegroundColor Cyan
Write-Host ""

try {
    # Test 1: Verifier que le backend repond
    $response = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models" -Method GET
    Write-Host "✅ Backend demarre - Modeles trouves: $($response.models.Count)" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "=== TEST DE RECONCILIATION MINIMAL ===" -ForegroundColor Yellow
    
    # Donnees minimales avec une seule correspondance
    $boData = @(
        @{
            "Numéro Trans GU" = "TEST001"
            "montant" = "1000"
        }
    )
    
    $partnerData = @(
        @{
            "Numéro Trans GU" = "TEST001"
            "Amount" = "1000"
        }
    )
    
    Write-Host "Donnees minimales:" -ForegroundColor White
    Write-Host "  - BO: $($boData.Count) enregistrement" -ForegroundColor Gray
    Write-Host "  - Partner: $($partnerData.Count) enregistrement" -ForegroundColor Gray
    Write-Host "  - BO Key: $($boData[0].'Numéro Trans GU')" -ForegroundColor Gray
    Write-Host "  - Partner Key: $($partnerData[0].'Numéro Trans GU')" -ForegroundColor Gray
    
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
        Write-Host "✅ SUCCES: Correspondance trouvee!" -ForegroundColor Green
        $match = $reconciliationResponse.matches[0]
        Write-Host "  - Cle: $($match.key)" -ForegroundColor White
        Write-Host "  - BO montant: $($match.boData.montant)" -ForegroundColor Gray
        Write-Host "  - Partner Amount: $($match.partnerData.Amount)" -ForegroundColor Gray
    } else {
        Write-Host ""
        Write-Host "❌ ECHEC: Aucune correspondance trouvee" -ForegroundColor Red
        Write-Host "Le probleme n'est pas dans les donnees de test." -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "  Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Diagnostic termine!" -ForegroundColor Cyan
