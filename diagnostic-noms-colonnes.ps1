# Script pour diagnostiquer le probleme de noms de colonnes

$API_BASE_URL = "http://localhost:8080/api"

Write-Host "=== DIAGNOSTIC NOMS DE COLONNES ===" -ForegroundColor Cyan
Write-Host ""

try {
    # Test avec des noms de colonnes simples
    $boData = @(
        @{
            "NumeroTransGU" = "1751409965944"
            "montant" = "117220"
        }
    )
    
    $partnerData = @(
        @{
            "NumeroTransGU" = "1751409965944"
            "Montant" = "117220"
        }
    )
    
    Write-Host "Test avec noms simples:" -ForegroundColor White
    Write-Host "  - BO: $($boData.Count) enregistrement" -ForegroundColor Gray
    Write-Host "  - Partner: $($partnerData.Count) enregistrement" -ForegroundColor Gray
    Write-Host "  - Cle utilisee: 'NumeroTransGU'" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Envoi de la demande..." -ForegroundColor Yellow
    
    $request = @{
        boFileContent = $boData
        partnerFileContent = $partnerData
        boKeyColumn = "NumeroTransGU"
        partnerKeyColumn = "NumeroTransGU"
        comparisonColumns = @(
            @{
                boColumn = "montant"
                partnerColumn = "Montant"
            }
        )
    }
    
    $response = Invoke-RestMethod -Uri "$API_BASE_URL/reconciliation/reconcile" -Method POST -Body ($request | ConvertTo-Json -Depth 10) -ContentType "application/json"
    
    Write-Host "Resultat:" -ForegroundColor White
    Write-Host "  - Correspondances: $($response.matches.Count)" -ForegroundColor Gray
    Write-Host "  - BO uniquement: $($response.boOnly.Count)" -ForegroundColor Gray
    Write-Host "  - Partner uniquement: $($response.partnerOnly.Count)" -ForegroundColor Gray
    
    if ($response.matches.Count -gt 0) {
        Write-Host "✅ SUCCES: Correspondances trouvees avec noms simples!" -ForegroundColor Green
        Write-Host "Le probleme est bien dans les noms de colonnes avec accents/espaces" -ForegroundColor Yellow
    } else {
        Write-Host "❌ ECHEC: Aucune correspondance meme avec noms simples" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "=== TEST AVEC NOMS AVEC ACCENTS ===" -ForegroundColor Yellow
    
    # Test avec des noms avec accents
    $boDataAccent = @(
        @{
            "Numéro Trans GU" = "1751409965944"
            "montant" = "117220"
        }
    )
    
    $partnerDataAccent = @(
        @{
            "Numéro Trans GU" = "1751409965944"
            "Montant" = "117220"
        }
    )
    
    Write-Host "Test avec noms avec accents:" -ForegroundColor White
    Write-Host "  - Cle utilisee: 'Numéro Trans GU'" -ForegroundColor Green
    
    $requestAccent = @{
        boFileContent = $boDataAccent
        partnerFileContent = $partnerDataAccent
        boKeyColumn = "Numéro Trans GU"
        partnerKeyColumn = "Numéro Trans GU"
        comparisonColumns = @(
            @{
                boColumn = "montant"
                partnerColumn = "Montant"
            }
        )
    }
    
    $responseAccent = Invoke-RestMethod -Uri "$API_BASE_URL/reconciliation/reconcile" -Method POST -Body ($requestAccent | ConvertTo-Json -Depth 10) -ContentType "application/json"
    
    Write-Host "Resultat avec accents:" -ForegroundColor White
    Write-Host "  - Correspondances: $($responseAccent.matches.Count)" -ForegroundColor Gray
    Write-Host "  - BO uniquement: $($responseAccent.boOnly.Count)" -ForegroundColor Gray
    Write-Host "  - Partner uniquement: $($responseAccent.partnerOnly.Count)" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "=== DIAGNOSTIC ===" -ForegroundColor Red
    
    if ($response.matches.Count -gt 0 -and $responseAccent.matches.Count -eq 0) {
        Write-Host "PROBLEME CONFIRME:" -ForegroundColor Yellow
        Write-Host "  - Les noms simples fonctionnent" -ForegroundColor White
        Write-Host "  - Les noms avec accents ne fonctionnent pas" -ForegroundColor White
        Write-Host "  - CAUSE: Probleme d'encodage des noms de colonnes" -ForegroundColor Red
    } else {
        Write-Host "PROBLEME AUTRE:" -ForegroundColor Yellow
        Write-Host "  - Meme les noms simples ne fonctionnent pas" -ForegroundColor White
        Write-Host "  - CAUSE: Probleme dans la logique de reconciliation" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "  Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Diagnostic termine!" -ForegroundColor Cyan
