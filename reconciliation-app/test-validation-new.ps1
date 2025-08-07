# Test de validation TRX SF avec nouveau fichier
Write-Host "=== Test de validation TRX SF avec nouveau fichier ===" -ForegroundColor Green

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

# 2. Test de validation CSV avec nouveau fichier
Write-Host "`n2. Test de validation CSV avec nouveau fichier..." -ForegroundColor Yellow
$csvFile = "test-trx-sf-new.csv"

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

# 3. Test d'upload avec nouveau fichier
Write-Host "`n3. Test d'upload avec nouveau fichier..." -ForegroundColor Yellow
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

Write-Host "`n=== Test terminé ===" -ForegroundColor Green
