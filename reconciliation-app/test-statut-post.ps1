# Test de l'endpoint POST pour la mise à jour du statut
Write-Host "=== Test de mise à jour du statut avec POST ===" -ForegroundColor Green

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

# Test 3: Test de mise à jour du statut avec POST
Write-Host "`n2. Test de mise à jour du statut avec POST..." -ForegroundColor Yellow

$testStatut = "TRAITE"
$url = "$baseUrl/api/ecart-solde/$ecartId/statut?statut=$testStatut"

Write-Host "📤 Envoi de la requête POST..." -ForegroundColor Cyan
Write-Host "   URL: $url" -ForegroundColor Cyan

try {
    $result = Invoke-RestMethod -Uri $url -Method POST
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