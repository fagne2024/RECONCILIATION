# Test de connectivité API
Write-Host "Test de connectivité API..." -ForegroundColor Green

# Test GET
Write-Host "1. Test GET /api/profils" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/profils" -Method GET
    Write-Host "✅ GET réussi: $($response.Count) profils" -ForegroundColor Green
} catch {
    Write-Host "❌ GET échoué: $($_.Exception.Message)" -ForegroundColor Red
}

# Test POST
Write-Host "`n2. Test POST /api/profils" -ForegroundColor Yellow
try {
    $newProfil = @{
        nom = "Test $(Get-Date -Format 'HH:mm:ss')"
        description = "Test de connectivité"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/profils" -Method POST -Body $newProfil -ContentType "application/json"
    Write-Host "✅ POST réussi: ID $($response.id)" -ForegroundColor Green
    Write-Host "  Nom: $($response.nom)" -ForegroundColor Cyan
    Write-Host "  Description: $($response.description)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ POST échoué: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎯 Si les tests échouent, vérifiez:" -ForegroundColor Yellow
Write-Host "- Backend démarré sur port 8080" -ForegroundColor White
Write-Host "- Pas de firewall bloquant" -ForegroundColor White
Write-Host "- CORS configuré correctement" -ForegroundColor White 