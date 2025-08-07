# Correction du format de date pour TRX SF
Write-Host "=== Correction du format de date TRX SF ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080/api"

# 1. Vérifier l'application
Write-Host "`n1. Vérification de l'application:" -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET -TimeoutSec 5
    Write-Host "✅ Application en cours d'exécution" -ForegroundColor Green
} catch {
    Write-Host "❌ Application non accessible: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Récupérer toutes les transactions TRX SF
Write-Host "`n2. Récupération des transactions TRX SF:" -ForegroundColor Yellow
try {
    $trxSfList = Invoke-RestMethod -Uri "$baseUrl/trx-sf" -Method GET
    Write-Host "✅ $($trxSfList.Count) transaction(s) TRX SF trouvée(s)" -ForegroundColor Green
    
    # Analyser les formats de date
    $dateFormats = @{}
    foreach ($trx in $trxSfList) {
        $date = $trx.dateTransaction
        if ($dateFormats.ContainsKey($date)) {
            $dateFormats[$date]++
        } else {
            $dateFormats[$date] = 1
        }
    }
    
    Write-Host "`nFormats de date trouvés:" -ForegroundColor Cyan
    foreach ($format in $dateFormats.GetEnumerator() | Sort-Object Value -Descending) {
        Write-Host "   - '$($format.Key)': $($format.Value) occurrence(s)" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "❌ Erreur lors de la récupération des transactions TRX SF: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 3. Identifier les transactions avec format de date problématique
Write-Host "`n3. Identification des transactions problématiques:" -ForegroundColor Yellow
$problematicTransactions = $trxSfList | Where-Object { 
    $_.dateTransaction -like "*/*" -or 
    $_.dateTransaction -like "*2025-08-06*" -or
    $_.dateTransaction -like "*06/08/2025*"
}

if ($problematicTransactions) {
    Write-Host "⚠️ $($problematicTransactions.Count) transaction(s) avec format de date problématique:" -ForegroundColor Yellow
    
    foreach ($trx in $problematicTransactions) {
        Write-Host "   - ID: $($trx.id)" -ForegroundColor Cyan
        Write-Host "     Date actuelle: $($trx.dateTransaction)" -ForegroundColor Gray
        Write-Host "     Agence: $($trx.agence)" -ForegroundColor Gray
        Write-Host "     Frais: $($trx.frais) FCFA" -ForegroundColor Gray
        Write-Host ""
    }
} else {
    Write-Host "✅ Aucune transaction avec format de date problématique trouvée" -ForegroundColor Green
}

# 4. Test de conversion de date
Write-Host "`n4. Test de conversion de date:" -ForegroundColor Yellow
$testDate = "06/08/2025"
Write-Host "Test de conversion: '$testDate'" -ForegroundColor Cyan

try {
    # Convertir le format DD/MM/YYYY en YYYY-MM-DD
    $dateParts = $testDate.Split('/')
    if ($dateParts.Length -eq 3) {
        $day = $dateParts[0]
        $month = $dateParts[1]
        $year = $dateParts[2]
        $convertedDate = "$year-$month-$day"
        
        Write-Host "   Format original: $testDate" -ForegroundColor Gray
        Write-Host "   Format converti: $convertedDate" -ForegroundColor Green
        
        # Tester l'API avec le format converti
        $response = Invoke-RestMethod -Uri "$baseUrl/trx-sf/frais/CELCM0001/$convertedDate" -Method GET
        Write-Host "   ✅ Test API avec format converti: $($response.frais) FCFA" -ForegroundColor Green
        
    } else {
        Write-Host "   ❌ Format de date invalide" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Erreur lors du test de conversion: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Suggestion de correction
Write-Host "`n5. Suggestion de correction:" -ForegroundColor Yellow
Write-Host "Si les dates sont au format DD/MM/YYYY, il faut les convertir en YYYY-MM-DD" -ForegroundColor Cyan
Write-Host "Exemple: '06/08/2025' → '2025-08-06'" -ForegroundColor Cyan

Write-Host "`nPour corriger manuellement dans la base de données:" -ForegroundColor Yellow
Write-Host "UPDATE trx_sf SET date_transaction = '2025-08-06 00:00:00' WHERE date_transaction = '06/08/2025';" -ForegroundColor Gray

# 6. Test avec différents formats
Write-Host "`n6. Test avec différents formats pour CELCM0001:" -ForegroundColor Yellow
$testDates = @(
    "2025-08-06",
    "06/08/2025", 
    "2025-08-06T00:00:00",
    "06-08-2025"
)

foreach ($testDate in $testDates) {
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/trx-sf/frais/CELCM0001/$testDate" -Method GET
        Write-Host "✅ '$testDate': $($response.frais) FCFA" -ForegroundColor Green
    } catch {
        Write-Host "❌ '$testDate': $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n=== Fin de la correction ===" -ForegroundColor Green
