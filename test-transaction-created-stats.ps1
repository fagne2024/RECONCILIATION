# Script de test pour les statistiques des transactions créées par service
# Ce script teste le nouvel endpoint /api/statistics/transaction-created-stats

$baseUrl = "http://localhost:8080/api"

Write-Host "=== Test des statistiques des transactions créées par service ===" -ForegroundColor Green

# 1. Test de l'endpoint sans filtres
Write-Host "`n1. Test de l'endpoint sans filtres:" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/statistics/transaction-created-stats" -Method GET
    Write-Host "✅ Endpoint accessible" -ForegroundColor Green
    Write-Host "Nombre de services: $($response.totalServices)" -ForegroundColor Cyan
    Write-Host "Volume total cashin: $($response.totalCashinVolume)" -ForegroundColor Cyan
    Write-Host "Volume total paiement: $($response.totalPaymentVolume)" -ForegroundColor Cyan
    Write-Host "Nombre total de transactions: $($response.totalTransactionCount)" -ForegroundColor Cyan
    
    if ($response.serviceStats -and $response.serviceStats.Count -gt 0) {
        Write-Host "`nPremier service trouvé:" -ForegroundColor Cyan
        $firstService = $response.serviceStats[0]
        Write-Host "  Service: $($firstService.service)" -ForegroundColor White
        Write-Host "  Volume Cashin: $($firstService.totalCashinVolume)" -ForegroundColor White
        Write-Host "  Volume Paiement: $($firstService.totalPaymentVolume)" -ForegroundColor White
        Write-Host "  Transactions: $($firstService.totalTransactions)" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Erreur lors du test sans filtres: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Test avec filtre de temps
Write-Host "`n2. Test avec filtre de temps (Ce mois):" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/statistics/transaction-created-stats?timeFilter=Ce%20mois" -Method GET
    Write-Host "✅ Test avec filtre de temps réussi" -ForegroundColor Green
    Write-Host "Services trouvés ce mois: $($response.totalServices)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erreur lors du test avec filtre de temps: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Test avec filtres multiples
Write-Host "`n3. Test avec filtres multiples:" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/statistics/transaction-created-stats?timeFilter=Ce%20mois&agency=CELCM0001" -Method GET
    Write-Host "✅ Test avec filtres multiples réussi" -ForegroundColor Green
    Write-Host "Services pour CELCM0001 ce mois: $($response.totalServices)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erreur lors du test avec filtres multiples: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Vérification de la structure de réponse
Write-Host "`n4. Vérification de la structure de réponse:" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/statistics/transaction-created-stats" -Method GET
    
    $requiredFields = @('serviceStats', 'totalServices', 'totalCashinVolume', 'totalPaymentVolume', 'totalTransactionCount')
    $missingFields = @()
    
    foreach ($field in $requiredFields) {
        if (-not $response.PSObject.Properties.Name -contains $field) {
            $missingFields += $field
        }
    }
    
    if ($missingFields.Count -eq 0) {
        Write-Host "✅ Tous les champs requis sont présents dans la réponse" -ForegroundColor Green
    } else {
        Write-Host "❌ Champs manquants: $($missingFields -join ', ')" -ForegroundColor Red
    }
    
    # Vérifier la structure des statistiques de service
    if ($response.serviceStats -and $response.serviceStats.Count -gt 0) {
        $serviceStatFields = @('service', 'totalCashinVolume', 'totalPaymentVolume', 'totalCashinCount', 'totalPaymentCount', 'totalTransactions')
        $firstService = $response.serviceStats[0]
        $missingServiceFields = @()
        
        foreach ($field in $serviceStatFields) {
            if (-not $firstService.PSObject.Properties.Name -contains $field) {
                $missingServiceFields += $field
            }
        }
        
        if ($missingServiceFields.Count -eq 0) {
            Write-Host "✅ Structure des statistiques de service correcte" -ForegroundColor Green
        } else {
            Write-Host "❌ Champs manquants dans les statistiques de service: $($missingServiceFields -join ', ')" -ForegroundColor Red
        }
    }
    
} catch {
    Write-Host "❌ Erreur lors de la vérification de structure: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Test terminé ===" -ForegroundColor Green
