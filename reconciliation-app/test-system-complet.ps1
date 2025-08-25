# Test complet du système WebSocket
Write-Host "=== Test Complet du System WebSocket ===" -ForegroundColor Cyan

# Test 1: Backend Health
Write-Host "`n1. Test du Backend..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:8080/api/reconciliation/health" -Method GET -TimeoutSec 5
    Write-Host "   ✅ Backend: $($healthResponse.StatusCode) - $($healthResponse.Content)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Backend: Erreur - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Frontend
Write-Host "`n2. Test du Frontend..." -ForegroundColor Yellow
try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:4200" -Method GET -TimeoutSec 5
    Write-Host "   ✅ Frontend: $($frontendResponse.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Frontend: Erreur - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: WebSocket Endpoint
Write-Host "`n3. Test de l'endpoint WebSocket..." -ForegroundColor Yellow
try {
    $wsResponse = Invoke-WebRequest -Uri "http://localhost:8080/ws/reconciliation" -Method GET -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($wsResponse) {
        Write-Host "   ✅ WebSocket endpoint accessible: $($wsResponse.StatusCode)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️ WebSocket endpoint non accessible via HTTP GET (normal)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️ WebSocket endpoint: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Test 4: Page de test WebSocket
Write-Host "`n4. Test de la page WebSocket..." -ForegroundColor Yellow
try {
    $testPageResponse = Invoke-WebRequest -Uri "http://localhost:4200/assets/test-websocket-browser.html" -Method GET -TimeoutSec 5
    Write-Host "   ✅ Page de test WebSocket accessible" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Page de test WebSocket: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Résumé ===" -ForegroundColor Cyan
Write-Host "🎯 Pour tester la connexion WebSocket:" -ForegroundColor White
Write-Host "   1. Ouvrez: http://localhost:4200/assets/test-websocket-browser.html" -ForegroundColor White
Write-Host "   2. Vérifiez que la connexion s'établit automatiquement" -ForegroundColor White
Write-Host "   3. Testez l'envoi de messages" -ForegroundColor White

Write-Host "`n🎯 Pour tester l'application complète:" -ForegroundColor White
Write-Host "   1. Ouvrez: http://localhost:4200" -ForegroundColor White
Write-Host "   2. Vérifiez les logs de la console pour les WebSockets" -ForegroundColor White
Write-Host "   3. Testez une réconciliation" -ForegroundColor White

Write-Host "`n✅ Test terminé!" -ForegroundColor Green
