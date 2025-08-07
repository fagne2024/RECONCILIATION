# Test d'upload TRX SF avec PowerShell
Write-Host "=== Test d'upload TRX SF ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080/api/trx-sf"

# 1. Test de connectivité
Write-Host "`n1. Test de connectivité..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri $baseUrl -Method GET
    Write-Host "✅ Backend accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend non accessible: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 2. Test d'upload CSV
Write-Host "`n2. Test d'upload CSV..." -ForegroundColor Yellow
$csvFile = "test-simple.csv"

if (Test-Path $csvFile) {
    try {
        $boundary = [System.Guid]::NewGuid().ToString()
        $LF = "`r`n"
        
        $bodyLines = @(
            "--$boundary",
            "Content-Disposition: form-data; name=`"file`"; filename=`"$csvFile`"",
            "Content-Type: text/csv",
            "",
            [System.IO.File]::ReadAllText($csvFile),
            "--$boundary--"
        )
        
        $body = $bodyLines -join $LF
        
        $headers = @{
            "Content-Type" = "multipart/form-data; boundary=$boundary"
        }
        
        $response = Invoke-WebRequest -Uri "$baseUrl/upload" -Method POST -Body $body -Headers $headers
        $result = $response.Content | ConvertFrom-Json
        
        Write-Host "✅ Upload réussi:" -ForegroundColor Green
        Write-Host "   - Transactions importées: $($result.Count)" -ForegroundColor Cyan
        
        if ($result.Count -gt 0) {
            Write-Host "   - Première transaction:" -ForegroundColor Cyan
            Write-Host "     ID: $($result[0].id)" -ForegroundColor White
            Write-Host "     ID Transaction: $($result[0].idTransaction)" -ForegroundColor White
            Write-Host "     Montant: $($result[0].montant)" -ForegroundColor White
        }
    } catch {
        Write-Host "❌ Erreur lors de l'upload: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Fichier CSV non trouvé: $csvFile" -ForegroundColor Red
}

# 3. Vérifier les données importées
Write-Host "`n3. Vérification des données importées..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri $baseUrl -Method GET
    Write-Host "✅ Récupération réussie: $($response.Count) transactions" -ForegroundColor Green
    
    if ($response.Count -gt 0) {
        Write-Host "   - Dernières transactions:" -ForegroundColor Cyan
        for ($i = 0; $i -lt [Math]::Min(3, $response.Count); $i++) {
            Write-Host "     $($i+1). $($response[$i].idTransaction) - $($response[$i].montant)" -ForegroundColor White
        }
    }
} catch {
    Write-Host "❌ Erreur lors de la récupération: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Test terminé ===" -ForegroundColor Green
