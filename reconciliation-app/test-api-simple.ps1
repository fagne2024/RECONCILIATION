# Test simple de l'API TRX SF
Write-Host "=== Test simple de l'API TRX SF ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080/api"

# Test 1: Vérifier si l'application répond
Write-Host "`n1. Test de l'application:" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET -TimeoutSec 10
    Write-Host "✅ Application accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ Application non accessible: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Lister toutes les transactions TRX SF
Write-Host "`n2. Test de récupération des transactions TRX SF:" -ForegroundColor Yellow
try {
    $trxSfList = Invoke-RestMethod -Uri "$baseUrl/trx-sf" -Method GET -TimeoutSec 10
    Write-Host "✅ $($trxSfList.Count) transaction(s) TRX SF trouvée(s)" -ForegroundColor Green
    
    if ($trxSfList.Count -gt 0) {
        Write-Host "Première transaction:" -ForegroundColor Cyan
        $firstTrx = $trxSfList[0]
        Write-Host "  - ID: $($firstTrx.id)" -ForegroundColor Gray
        Write-Host "  - Agence: $($firstTrx.agence)" -ForegroundColor Gray
        Write-Host "  - Date: $($firstTrx.dateTransaction)" -ForegroundColor Gray
        Write-Host "  - Frais: $($firstTrx.frais)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Erreur lors de la récupération des transactions: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Chercher les transactions pour CELCM0001
Write-Host "`n3. Test des transactions CELCM0001:" -ForegroundColor Yellow
try {
    $celcmTrxSf = $trxSfList | Where-Object { $_.agence -eq "CELCM0001" }
    
    if ($celcmTrxSf) {
        Write-Host "✅ $($celcmTrxSf.Count) transaction(s) trouvée(s) pour CELCM0001:" -ForegroundColor Green
        
        foreach ($trx in $celcmTrxSf) {
            Write-Host "  - ID: $($trx.id)" -ForegroundColor Cyan
            Write-Host "    Date: $($trx.dateTransaction)" -ForegroundColor Gray
            Write-Host "    Frais: $($trx.frais) FCFA" -ForegroundColor Gray
            Write-Host "    Service: $($trx.service)" -ForegroundColor Gray
            Write-Host ""
        }
    } else {
        Write-Host "❌ Aucune transaction trouvée pour CELCM0001" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Erreur lors de la recherche CELCM0001: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Test de l'endpoint frais
Write-Host "`n4. Test de l'endpoint frais:" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/trx-sf/frais/CELCM0001/2025-08-06" -Method GET -TimeoutSec 10
    Write-Host "✅ Frais SF pour CELCM0001 le 2025-08-06:" -ForegroundColor Green
    Write-Host "  - Agence: $($response.agence)" -ForegroundColor Cyan
    Write-Host "  - Date: $($response.date)" -ForegroundColor Cyan
    Write-Host "  - Frais: $($response.frais) FCFA" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erreur lors du test des frais: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Fin du test ===" -ForegroundColor Green
