# Script minimal pour tester la reconciliation

$API_BASE_URL = "http://localhost:8080/api"

Write-Host "=== TEST MINIMAL DE RECONCILIATION ===" -ForegroundColor Cyan
Write-Host ""

# Donnees de test minimales
$boData = @(
    @{
        "Numero Trans GU" = "GU001"
        "montant" = "1000"
        "Date" = "2024-01-15"
    }
)

$partnerData = @(
    @{
        "Numero Trans GU" = "GU001"
        "Amount" = "1000"
        "Date" = "2024-01-15"
    }
)

# Requete minimale
$request = @{
    boFileContent = $boData
    partnerFileContent = $partnerData
    boKeyColumn = "Numero Trans GU"
    partnerKeyColumn = "Numero Trans GU"
    comparisonColumns = @(
        @{
            boColumn = "montant"
            partnerColumn = "Amount"
        }
    )
}

Write-Host "Donnees de test:" -ForegroundColor White
Write-Host "  - BO: $($boData.Count) enregistrement" -ForegroundColor Gray
Write-Host "  - Partner: $($partnerData.Count) enregistrement" -ForegroundColor Gray
Write-Host "  - BO Key: $($request.boKeyColumn)" -ForegroundColor Gray
Write-Host "  - Partner Key: $($request.partnerKeyColumn)" -ForegroundColor Gray
Write-Host ""

Write-Host "Envoi de la demande de reconciliation..."

try {
    $jsonRequest = $request | ConvertTo-Json -Depth 10
    Write-Host "JSON de la requete:" -ForegroundColor Yellow
    Write-Host $jsonRequest -ForegroundColor Gray
    Write-Host ""
    
    $response = Invoke-RestMethod -Uri "$API_BASE_URL/reconciliation/reconcile" -Method POST -Body $jsonRequest -ContentType "application/json"
    
    Write-Host "Reconciliation reussie!" -ForegroundColor Green
    Write-Host "  - Correspondances: $($response.matches.Count)" -ForegroundColor White
    Write-Host "  - BO uniquement: $($response.boOnly.Count)" -ForegroundColor White
    Write-Host "  - Partner uniquement: $($response.partnerOnly.Count)" -ForegroundColor White
    
} catch {
    Write-Host "Erreur reconciliation: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "  Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        Write-Host "  Response: $($_.Exception.Response.StatusDescription)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Test termine!" -ForegroundColor Cyan
