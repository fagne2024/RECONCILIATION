# Test simple de l'API TRX SF
Write-Host "=== Test API TRX SF ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080/api"

# Test 1: Vérifier l'endpoint health
Write-Host "`n1. Test endpoint health:" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET -TimeoutSec 5
    Write-Host "✅ Health endpoint accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ Health endpoint non accessible: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Lister toutes les transactions TRX SF
Write-Host "`n2. Test endpoint trx-sf:" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/trx-sf" -Method GET -TimeoutSec 10
    Write-Host "✅ $($response.Count) transaction(s) TRX SF trouvée(s)" -ForegroundColor Green
    
    if ($response.Count -gt 0) {
        $firstTrx = $response[0]
        Write-Host "Première transaction:" -ForegroundColor Cyan
        Write-Host "  - ID: $($firstTrx.id)" -ForegroundColor Gray
        Write-Host "  - Agence: $($firstTrx.agence)" -ForegroundColor Gray
        Write-Host "  - Date: $($firstTrx.dateTransaction)" -ForegroundColor Gray
        Write-Host "  - Frais: $($firstTrx.frais)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Erreur endpoint trx-sf: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Test spécifique pour CELCM0001
Write-Host "`n3. Test endpoint frais pour CELCM0001:" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/trx-sf/frais/CELCM0001/2025-08-06" -Method GET -TimeoutSec 10
    Write-Host "✅ Frais SF pour CELCM0001 le 2025-08-06:" -ForegroundColor Green
    Write-Host "  - Agence: $($response.agence)" -ForegroundColor Cyan
    Write-Host "  - Date: $($response.date)" -ForegroundColor Cyan
    Write-Host "  - Frais: $($response.frais) FCFA" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erreur endpoint frais: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Fin du test ===" -ForegroundColor Green
