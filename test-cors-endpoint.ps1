# Script PowerShell pour tester l'endpoint de suppression en lot
Write-Host "Test de l'endpoint de suppression en lot..." -ForegroundColor Green

# Test de l'endpoint OPTIONS (preflight)
Write-Host "1. Test de la requête OPTIONS (preflight)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/operations/delete-batch" -Method OPTIONS -Headers @{
        "Origin" = "http://localhost:4200"
        "Access-Control-Request-Method" = "POST"
        "Access-Control-Request-Headers" = "Content-Type"
    }
    Write-Host "✅ OPTIONS request successful: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Headers: $($response.Headers)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ OPTIONS request failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test de l'endpoint POST
Write-Host "`n2. Test de la requête POST..." -ForegroundColor Yellow
$body = @{
    ids = @(1, 2, 3)
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/operations/delete-batch" -Method POST -Body $body -ContentType "application/json" -Headers @{
        "Origin" = "http://localhost:4200"
    }
    Write-Host "✅ POST request successful: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ POST request failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
    }
}

Write-Host "`nTest terminé." -ForegroundColor Green
