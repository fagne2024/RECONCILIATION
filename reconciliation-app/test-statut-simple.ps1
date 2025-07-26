# Test simple de l'endpoint de mise à jour du statut
Write-Host "=== Test simple de mise à jour du statut ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080"

# Test 1: Vérifier si le backend répond
Write-Host "`n1. Test de connexion..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/ecart-solde" -Method GET
    Write-Host "✅ Backend accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend non accessible: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# Test 2: Vérifier s'il y a des écarts de solde
if ($response.Count -eq 0) {
    Write-Host "⚠️ Aucun écart de solde trouvé" -ForegroundColor Yellow
    exit
}

$firstEcart = $response[0]
$ecartId = $firstEcart.id

Write-Host "📋 Écart de solde trouvé - ID: $ecartId" -ForegroundColor Cyan

# Test 3: Test de mise à jour du statut
Write-Host "`n2. Test de mise à jour du statut..." -ForegroundColor Yellow

$requestBody = @{
    statut = "TRAITE"
} | ConvertTo-Json -Depth 1

Write-Host "📤 Envoi de la requête..." -ForegroundColor Cyan
Write-Host "   URL: $baseUrl/api/ecart-solde/$ecartId/statut" -ForegroundColor Cyan
Write-Host "   Body: $requestBody" -ForegroundColor Cyan

try {
    $headers = @{
        "Content-Type" = "application/json"
        "Accept" = "application/json"
    }
    
    $result = Invoke-RestMethod -Uri "$baseUrl/api/ecart-solde/$ecartId/statut" -Method PATCH -Body $requestBody -Headers $headers
    Write-Host "✅ Succès!" -ForegroundColor Green
    Write-Host "   Réponse: $($result | ConvertTo-Json)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Détails: $responseBody" -ForegroundColor Red
    }
}

Write-Host "`n=== Test terminé ===" -ForegroundColor Green 