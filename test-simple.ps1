# Test simple des corrections
Write-Host "Test des corrections - Regles de traitement" -ForegroundColor Cyan

# Test du backend
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET -TimeoutSec 10
    Write-Host "Backend OK - $($response.Count) modeles trouves" -ForegroundColor Green
} catch {
    Write-Host "Backend KO: $($_.Exception.Message)" -ForegroundColor Red
}

# Test du frontend
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4200" -Method GET -TimeoutSec 10
    Write-Host "Frontend OK" -ForegroundColor Green
} catch {
    Write-Host "Frontend KO: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "Test termine!" -ForegroundColor Green
