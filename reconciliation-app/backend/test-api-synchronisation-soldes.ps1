# Script de test pour vérifier la synchronisation des soldes via l'API
# Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

Write-Host "=== TEST DE SYNCHRONISATION DES SOLDES VIA API ===" -ForegroundColor Cyan

# Configuration de l'API
$apiBaseUrl = "http://localhost:8080/api"
$synchronizeUrl = "$apiBaseUrl/operations/synchronize-closing-balances"

try {
    Write-Host "Test de synchronisation des soldes de clôture..." -ForegroundColor Yellow
    Write-Host "URL: $synchronizeUrl" -ForegroundColor Gray
    
    # Appel de l'API pour synchroniser tous les soldes
    $response = Invoke-RestMethod -Uri $synchronizeUrl -Method POST -ContentType "application/json"
    
    if ($response.success) {
        Write-Host "✅ Synchronisation réussie!" -ForegroundColor Green
        Write-Host "Message: $($response.message)" -ForegroundColor White
        Write-Host "Timestamp: $($response.timestamp)" -ForegroundColor Gray
    } else {
        Write-Host "❌ Échec de la synchronisation" -ForegroundColor Red
        Write-Host "Message: $($response.message)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Erreur lors de l'appel API:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    # Vérifier si l'application est démarrée
    if ($_.Exception.Message -match "Unable to connect") {
        Write-Host ""
        Write-Host "💡 Assurez-vous que l'application Spring Boot est démarrée:" -ForegroundColor Yellow
        Write-Host "   - Port 8080 accessible" -ForegroundColor Gray
        Write-Host "   - Base de données connectée" -ForegroundColor Gray
        Write-Host "   - API endpoints disponibles" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "=== TEST D'UN COMPTE SPÉCIFIQUE ===" -ForegroundColor Cyan

# Tester la synchronisation d'un compte spécifique
$compteId = 1  # ID du premier compte pour le test
$recalculateUrl = "$apiBaseUrl/operations/recalculate-closing-balance/$compteId"

try {
    Write-Host "Test de recalcul pour le compte ID: $compteId" -ForegroundColor Yellow
    Write-Host "URL: $recalculateUrl" -ForegroundColor Gray
    
    $response = Invoke-RestMethod -Uri $recalculateUrl -Method POST -ContentType "application/json"
    
    if ($response.success) {
        Write-Host "✅ Recalcul réussi pour le compte $($response.compteId)!" -ForegroundColor Green
        Write-Host "Message: $($response.message)" -ForegroundColor White
        Write-Host "Timestamp: $($response.timestamp)" -ForegroundColor Gray
    } else {
        Write-Host "❌ Échec du recalcul" -ForegroundColor Red
        Write-Host "Message: $($response.message)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Erreur lors du recalcul du compte spécifique:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host ""
Write-Host "=== VÉRIFICATION POST-SYNCHRONISATION ===" -ForegroundColor Green
Write-Host "Exécutez le script SQL pour vérifier les résultats:" -ForegroundColor White
Write-Host ".\test-synchronisation-soldes-cloture.ps1" -ForegroundColor Gray

Write-Host ""
Write-Host "=== FIN DU TEST API ===" -ForegroundColor Cyan
