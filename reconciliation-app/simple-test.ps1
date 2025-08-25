Write-Host "🧪 Test simple du système WebSocket" -ForegroundColor Green

# Test du backend
Write-Host "`n1️⃣ Test du backend..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/reconciliation/health" -Method GET
    Write-Host "✅ Backend OK - Status: $($response.status)" -ForegroundColor Green
    Write-Host "   WebSocket: $($response.websocket)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Backend non accessible: $($_.Exception.Message)" -ForegroundColor Red
}

# Test du frontend
Write-Host "`n2️⃣ Test du frontend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4200" -Method GET -TimeoutSec 5
    Write-Host "✅ Frontend OK - Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend non accessible: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 Tests terminés!" -ForegroundColor Green
Write-Host "`n📋 Résumé:" -ForegroundColor Cyan
Write-Host "   Backend: http://localhost:8080" -ForegroundColor White
Write-Host "   Frontend: http://localhost:4200" -ForegroundColor White
Write-Host "   WebSocket: ws://localhost:8080/ws/reconciliation" -ForegroundColor White
Write-Host "`n🌐 Ouvrez http://localhost:4200 dans votre navigateur" -ForegroundColor Yellow
