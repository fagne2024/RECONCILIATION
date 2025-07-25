# Test de l'API des profils
Write-Host "Test de l'API des profils..." -ForegroundColor Green

# Test GET /api/profils
Write-Host "1. Test GET /api/profils" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/profils" -Method GET
    Write-Host "✅ Succès: $($response.Count) profils trouvés" -ForegroundColor Green
    $response | ForEach-Object { Write-Host "  - $($_.nom)" -ForegroundColor Cyan }
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# Test POST /api/profils (créer un nouveau profil)
Write-Host "`n2. Test POST /api/profils" -ForegroundColor Yellow
try {
    $newProfil = @{
        nom = "Test Profil"
        description = "Profil de test créé automatiquement"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/profils" -Method POST -Body $newProfil -ContentType "application/json"
    Write-Host "✅ Succès: Profil créé avec ID $($response.id)" -ForegroundColor Green
    Write-Host "  Nom: $($response.nom)" -ForegroundColor Cyan
    Write-Host "  Description: $($response.description)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# Test GET /api/profils/modules
Write-Host "`n3. Test GET /api/profils/modules" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/profils/modules" -Method GET
    Write-Host "✅ Succès: $($response.Count) modules trouvés" -ForegroundColor Green
    $response | ForEach-Object { Write-Host "  - $($_.nom)" -ForegroundColor Cyan }
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# Test GET /api/profils/permissions
Write-Host "`n4. Test GET /api/profils/permissions" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/profils/permissions" -Method GET
    Write-Host "✅ Succès: $($response.Count) permissions trouvées" -ForegroundColor Green
    $response | ForEach-Object { Write-Host "  - $($_.nom)" -ForegroundColor Cyan }
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 Tests terminés!" -ForegroundColor Green 