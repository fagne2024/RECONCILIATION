# Test de l'endpoint de mise à jour du statut
Write-Host "=== Test de mise à jour du statut ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080"

Write-Host "`n1. Test de connexion au backend..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/ecart-solde" -Method GET
    Write-Host "✅ Backend accessible - Nombre d'écarts de solde: $($response.Count)" -ForegroundColor Green
    
    if ($response.Count -eq 0) {
        Write-Host "⚠️ Aucun écart de solde trouvé pour le test" -ForegroundColor Yellow
        exit
    }
    
    # Prendre le premier écart de solde pour le test
    $firstEcart = $response[0]
    $ecartId = $firstEcart.id
    $currentStatut = $firstEcart.statut
    
    Write-Host "📋 Écart de solde sélectionné pour le test:" -ForegroundColor Cyan
    Write-Host "   - ID: $ecartId" -ForegroundColor Cyan
    Write-Host "   - Statut actuel: $currentStatut" -ForegroundColor Cyan
    Write-Host "   - ID Transaction: $($firstEcart.idTransaction)" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Backend non accessible: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

Write-Host "`n2. Test de l'endpoint de mise à jour du statut..." -ForegroundColor Yellow

try {
    # Préparer les données pour le test
    $testStatut = "TRAITE"
    $requestBody = @{
        statut = $testStatut
    } | ConvertTo-Json
    
    Write-Host "📤 Envoi de la requête PATCH..." -ForegroundColor Cyan
    Write-Host "   - URL: $baseUrl/api/ecart-solde/$ecartId/statut" -ForegroundColor Cyan
    Write-Host "   - Body: $requestBody" -ForegroundColor Cyan
    
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-RestMethod -Uri "$baseUrl/api/ecart-solde/$ecartId/statut" -Method PATCH -Body $requestBody -Headers $headers
    
    Write-Host "✅ Mise à jour réussie!" -ForegroundColor Green
    Write-Host "   - Réponse: $($response | ConvertTo-Json)" -ForegroundColor Cyan
    
    # Vérifier que le statut a bien été mis à jour
    Write-Host "`n3. Vérification de la mise à jour..." -ForegroundColor Yellow
    
    $updatedEcart = Invoke-RestMethod -Uri "$baseUrl/api/ecart-solde/$ecartId" -Method GET
    Write-Host "📋 Statut après mise à jour: $($updatedEcart.statut)" -ForegroundColor Cyan
    
    if ($updatedEcart.statut -eq $testStatut) {
        Write-Host "✅ Statut mis à jour avec succès: $currentStatut → $($updatedEcart.statut)" -ForegroundColor Green
    } else {
        Write-Host "❌ Le statut n'a pas été mis à jour correctement" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Erreur lors de la mise à jour du statut: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Détails de l'erreur: $responseBody" -ForegroundColor Red
    }
}

Write-Host "`n=== Test terminé ===" -ForegroundColor Green 