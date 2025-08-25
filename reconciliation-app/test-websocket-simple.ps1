# Test simple de connexion WebSocket
Write-Host "Test de connexion WebSocket..." -ForegroundColor Yellow

try {
    # Test de l'endpoint de sante
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:8080/api/reconciliation/health" -Method GET
    Write-Host "Endpoint de sante: $($healthResponse.StatusCode)" -ForegroundColor Green
    Write-Host "Reponse: $($healthResponse.Content)" -ForegroundColor Cyan
    
    # Test de l'endpoint WebSocket (verification que l'endpoint existe)
    $wsResponse = Invoke-WebRequest -Uri "http://localhost:8080/ws/reconciliation" -Method GET -ErrorAction SilentlyContinue
    if ($wsResponse) {
        Write-Host "Endpoint WebSocket accessible: $($wsResponse.StatusCode)" -ForegroundColor Green
    } else {
        Write-Host "Endpoint WebSocket non accessible via HTTP GET (normal pour WebSocket)" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "Erreur lors du test: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "Test termine" -ForegroundColor Green
