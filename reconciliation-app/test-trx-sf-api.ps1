# Script de test pour les API TRX SF
Write-Host "=== Test des API TRX SF ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080/api/trx-sf"

# 1. Test de création d'une transaction SF
Write-Host "`n1. Test de création d'une transaction SF..." -ForegroundColor Yellow
$createData = @{
    idTransaction = "TRX_SF_000001"
    telephoneClient = "+22112345678"
    montant = 50000.0
    service = "TRANSFERT"
    agence = "AGENCE_A"
    dateTransaction = "2024-01-15T10:30:00"
    numeroTransGu = "GU_12345678"
    pays = "SENEGAL"
    frais = 500.0
    commentaire = "Transaction test"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $baseUrl -Method POST -Body $createData -ContentType "application/json"
    Write-Host "✅ Transaction créée avec succès" -ForegroundColor Green
    Write-Host "ID: $($response.id)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erreur lors de la création: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Test de récupération de toutes les transactions
Write-Host "`n2. Test de récupération de toutes les transactions..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri $baseUrl -Method GET
    Write-Host "✅ Récupération réussie" -ForegroundColor Green
    Write-Host "Nombre de transactions: $($response.Count)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erreur lors de la récupération: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Test des statistiques
Write-Host "`n3. Test des statistiques..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/statistics" -Method GET
    Write-Host "✅ Statistiques récupérées" -ForegroundColor Green
    Write-Host "Total: $($response.total)" -ForegroundColor Cyan
    Write-Host "En attente: $($response.enAttente)" -ForegroundColor Cyan
    Write-Host "Traité: $($response.traite)" -ForegroundColor Cyan
    Write-Host "Erreur: $($response.erreur)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erreur lors de la récupération des statistiques: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Test des listes distinctes
Write-Host "`n4. Test des listes distinctes..." -ForegroundColor Yellow

# Agences
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agences" -Method GET
    Write-Host "✅ Agences récupérées: $($response.Count) agences" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors de la récupération des agences: $($_.Exception.Message)" -ForegroundColor Red
}

# Services
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/services" -Method GET
    Write-Host "✅ Services récupérés: $($response.Count) services" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors de la récupération des services: $($_.Exception.Message)" -ForegroundColor Red
}

# Pays
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/pays" -Method GET
    Write-Host "✅ Pays récupérés: $($response.Count) pays" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors de la récupération des pays: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Test terminé ===" -ForegroundColor Green
