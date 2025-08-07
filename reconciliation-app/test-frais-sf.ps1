# Script de test pour vérifier la récupération des frais SF
# Test de l'API getFraisByAgenceAndDate

$baseUrl = "http://localhost:8080/api/trx-sf"

Write-Host "=== Test de récupération des frais SF ===" -ForegroundColor Green

# Test 1: Récupérer les frais pour une agence et une date spécifique
$agence = "AGENCE_A"
$date = "2024-01-15"

Write-Host "Test 1: Récupération des frais pour agence '$agence' et date '$date'" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/frais/$agence/$date" -Method GET
    Write-Host "✅ Succès: Frais trouvés = $($response.frais)" -ForegroundColor Green
    Write-Host "   Agence: $($response.agence)" -ForegroundColor Gray
    Write-Host "   Date: $($response.date)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Récupérer les frais pour une agence inexistante
$agenceInexistante = "AGENCE_INEXISTANTE"
$date = "2024-01-15"

Write-Host "`nTest 2: Récupération des frais pour agence inexistante '$agenceInexistante' et date '$date'" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/frais/$agenceInexistante/$date" -Method GET
    Write-Host "✅ Succès: Frais trouvés = $($response.frais)" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Récupérer les frais pour une date sans données
$agence = "AGENCE_A"
$dateSansDonnees = "2020-01-01"

Write-Host "`nTest 3: Récupération des frais pour agence '$agence' et date sans données '$dateSansDonnees'" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/frais/$agence/$dateSansDonnees" -Method GET
    Write-Host "✅ Succès: Frais trouvés = $($response.frais)" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Lister toutes les agences disponibles
Write-Host "`nTest 4: Liste des agences disponibles" -ForegroundColor Yellow

try {
    $agences = Invoke-RestMethod -Uri "$baseUrl/agences" -Method GET
    Write-Host "✅ Succès: $($agences.Count) agences trouvées" -ForegroundColor Green
    foreach ($ag in $agences) {
        Write-Host "   - $ag" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Récupérer les statistiques générales
Write-Host "`nTest 5: Statistiques générales TRX SF" -ForegroundColor Yellow

try {
    $stats = Invoke-RestMethod -Uri "$baseUrl/statistics" -Method GET
    Write-Host "✅ Succès: Statistiques récupérées" -ForegroundColor Green
    Write-Host "   Total: $($stats.total)" -ForegroundColor Gray
    Write-Host "   En attente: $($stats.enAttente)" -ForegroundColor Gray
    Write-Host "   Traité: $($stats.traite)" -ForegroundColor Gray
    Write-Host "   Erreur: $($stats.erreur)" -ForegroundColor Gray
    Write-Host "   Total montant: $($stats.totalMontant)" -ForegroundColor Gray
    Write-Host "   Total frais: $($stats.totalFrais)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Fin des tests ===" -ForegroundColor Green
