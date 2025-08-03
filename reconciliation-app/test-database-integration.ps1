# Test de l'integration de la base de donnees pour les modeles de traitement automatique

Write-Host "Test de l'integration de la base de donnees..." -ForegroundColor Cyan

# Test 1: Recuperer tous les modeles (devrait etre vide au debut)
Write-Host "`nTest 1: Recuperation de tous les modeles" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/auto-processing/models" -Method GET
    Write-Host "Succes: $($response.models.Count) modeles trouves" -ForegroundColor Green
    Write-Host "Reponse: $($response | ConvertTo-Json -Depth 3)" -ForegroundColor Gray
} catch {
    Write-Host "Erreur lors de la recuperation des modeles: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Creer un nouveau modele
Write-Host "`nTest 2: Creation d'un nouveau modele" -ForegroundColor Yellow
try {
    $modelData = @{
        name = "Modele de test"
        filePattern = "*.csv"
        fileType = "bo"
        processingSteps = @()
        autoApply = $true
        templateFile = ""
        reconciliationKeys = @{
            partnerKeys = @("ID", "Transaction")
            boKeys = @("ID", "Transaction")
        }
    }
    
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/auto-processing/models" -Method POST -Body ($modelData | ConvertTo-Json -Depth 3) -ContentType "application/json"
    Write-Host "Succes: Modele cree avec l'ID $($response.model.id)" -ForegroundColor Green
    Write-Host "Nom du modele: $($response.model.name)" -ForegroundColor Green
} catch {
    Write-Host "Erreur lors de la creation du modele: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Recuperer tous les modeles (devrait maintenant contenir 1 modele)
Write-Host "`nTest 3: Recuperation de tous les modeles (apres creation)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/auto-processing/models" -Method GET
    Write-Host "Succes: $($response.models.Count) modeles trouves" -ForegroundColor Green
    if ($response.models.Count -gt 0) {
        Write-Host "Premier modele: $($response.models[0].name)" -ForegroundColor Green
    }
} catch {
    Write-Host "Erreur lors de la recuperation des modeles: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nTest de l'integration de la base de donnees termine!" -ForegroundColor Cyan 