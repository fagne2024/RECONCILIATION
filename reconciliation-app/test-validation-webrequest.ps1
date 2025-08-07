# Test de validation TRX SF avec Invoke-WebRequest
Write-Host "=== Test de validation TRX SF ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080/api/trx-sf"

# 1. Test de connectivité
Write-Host "`n1. Test de connectivité..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $baseUrl -Method GET
    Write-Host "✅ Backend accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend non accessible: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 2. Test de validation CSV
Write-Host "`n2. Test de validation CSV..." -ForegroundColor Yellow
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
        
        $response = Invoke-WebRequest -Uri "$baseUrl/validate" -Method POST -Body $body -Headers $headers
        $result = $response.Content | ConvertFrom-Json
        
        Write-Host "✅ Validation réussie:" -ForegroundColor Green
        Write-Host "   - Lignes valides: $($result.validLines)" -ForegroundColor Cyan
        Write-Host "   - Lignes avec erreurs: $($result.errorLines)" -ForegroundColor Cyan
        Write-Host "   - Doublons: $($result.duplicates)" -ForegroundColor Cyan
        Write-Host "   - Nouveaux enregistrements: $($result.newRecords)" -ForegroundColor Cyan
        
        if ($result.errors) {
            Write-Host "   - Erreurs:" -ForegroundColor Red
            foreach ($error in $result.errors) {
                Write-Host "     * $error" -ForegroundColor Red
            }
        }
    } catch {
        Write-Host "❌ Erreur lors de la validation: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Fichier CSV non trouvé: $csvFile" -ForegroundColor Red
}

Write-Host "`n=== Test terminé ===" -ForegroundColor Green
