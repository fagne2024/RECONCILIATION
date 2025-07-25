# Test simple de suppression
Write-Host "Test simple de suppression..." -ForegroundColor Green

# Créer un profil de test
Write-Host "1. Création d'un profil de test" -ForegroundColor Yellow
try {
    $testProfil = @{
        nom = "Test Delete $(Get-Date -Format 'HH:mm:ss')"
        description = "Test"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/profils" -Method POST -Body $testProfil -ContentType "application/json"
    $testId = $response.id
    Write-Host "✅ Profil créé avec ID: $testId" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur création: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# Tester la suppression
Write-Host "`n2. Test DELETE" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/profils/$testId" -Method DELETE
    Write-Host "✅ Suppression réussie" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur suppression: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}

Write-Host "`n🎉 Test terminé!" -ForegroundColor Green 