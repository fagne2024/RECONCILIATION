# Test des permissions TRX SF via l'API
Write-Host "=== Test des permissions TRX SF via l'API ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080/api"

# 1. Test de connectivité backend
Write-Host "`n1. Test de connectivité backend..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/trx-sf" -Method GET
    Write-Host "✅ Backend accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend non accessible: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 2. Test d'accès à TRX SF
Write-Host "`n2. Test d'accès à TRX SF..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/trx-sf" -Method GET
    Write-Host "✅ API TRX SF accessible" -ForegroundColor Green
    Write-Host "   - Nombre de transactions: $($response.Count)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ API TRX SF non accessible: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Test des statistiques TRX SF
Write-Host "`n3. Test des statistiques TRX SF..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/trx-sf/statistics" -Method GET
    Write-Host "✅ Statistiques TRX SF accessibles" -ForegroundColor Green
    Write-Host "   - Total: $($response.total)" -ForegroundColor Cyan
    Write-Host "   - En attente: $($response.enAttente)" -ForegroundColor Cyan
    Write-Host "   - Traitées: $($response.traite)" -ForegroundColor Cyan
    Write-Host "   - Erreurs: $($response.erreur)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Statistiques TRX SF non accessibles: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Test des agences distinctes
Write-Host "`n4. Test des agences distinctes..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/trx-sf/agences" -Method GET
    Write-Host "✅ Agences distinctes accessibles" -ForegroundColor Green
    Write-Host "   - Nombre d'agences: $($response.Count)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Agences distinctes non accessibles: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Test des services distincts
Write-Host "`n5. Test des services distincts..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/trx-sf/services" -Method GET
    Write-Host "✅ Services distincts accessibles" -ForegroundColor Green
    Write-Host "   - Nombre de services: $($response.Count)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Services distincts non accessibles: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. Test des pays distincts
Write-Host "`n6. Test des pays distincts..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/trx-sf/pays" -Method GET
    Write-Host "✅ Pays distincts accessibles" -ForegroundColor Green
    Write-Host "   - Nombre de pays: $($response.Count)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Pays distincts non accessibles: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Test des permissions terminé ===" -ForegroundColor Green
Write-Host "💡 Si tous les tests sont verts, les permissions sont correctes" -ForegroundColor Yellow
Write-Host "💡 Si certains tests sont rouges, vérifiez les permissions en base de données" -ForegroundColor Yellow
