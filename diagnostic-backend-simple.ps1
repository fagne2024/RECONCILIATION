# Script de diagnostic simple pour isoler le probleme dans le backend

$API_BASE_URL = "http://localhost:8080/api"

Write-Host "=== DIAGNOSTIC BACKEND SIMPLE ===" -ForegroundColor Cyan
Write-Host ""

try {
    # Test minimal avec une seule correspondance
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
    
    Write-Host "Test minimal:" -ForegroundColor White
    Write-Host "  - BO: $($boData.Count) enregistrement" -ForegroundColor Gray
    Write-Host "  - Partner: $($partnerData.Count) enregistrement" -ForegroundColor Gray
    Write-Host "  - BO Key: $($boData[0].'Numéro Trans GU')" -ForegroundColor Gray
    Write-Host "  - Partner Key: $($partnerData[0].'Numéro Trans GU')" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "Envoi de la demande..." -ForegroundColor Yellow
    
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
    
    $response = Invoke-RestMethod -Uri "$API_BASE_URL/reconciliation/reconcile" -Method POST -Body ($request | ConvertTo-Json -Depth 10) -ContentType "application/json"
    
    Write-Host "Resultat:" -ForegroundColor White
    Write-Host "  - Correspondances: $($response.matches.Count)" -ForegroundColor Gray
    Write-Host "  - BO uniquement: $($response.boOnly.Count)" -ForegroundColor Gray
    Write-Host "  - Partner uniquement: $($response.partnerOnly.Count)" -ForegroundColor Gray
    
    if ($response.matches.Count -gt 0) {
        Write-Host "✅ SUCCES: Correspondance trouvee!" -ForegroundColor Green
    } else {
        Write-Host "❌ ECHEC: Aucune correspondance" -ForegroundColor Red
        
        # Analyser les donnees retournees
        Write-Host ""
        Write-Host "Analyse des donnees retournees:" -ForegroundColor Yellow
        Write-Host "  - BO uniquement contient: $($response.boOnly.Count) enregistrements" -ForegroundColor Gray
        Write-Host "  - Partner uniquement contient: $($response.partnerOnly.Count) enregistrements" -ForegroundColor Gray
        
        if ($response.boOnly.Count -gt 0) {
            Write-Host "  - Premier BO uniquement: $($response.boOnly[0] | ConvertTo-Json)" -ForegroundColor Gray
        }
        if ($response.partnerOnly.Count -gt 0) {
            Write-Host "  - Premier Partner uniquement: $($response.partnerOnly[0] | ConvertTo-Json)" -ForegroundColor Gray
        }
    }
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "  Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Diagnostic termine!" -ForegroundColor Cyan
