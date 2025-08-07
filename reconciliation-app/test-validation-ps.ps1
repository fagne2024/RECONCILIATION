# Test de validation TRX SF avec PowerShell
Write-Host "=== Test de validation TRX SF ===" -ForegroundColor Green

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

# 2. Test de validation CSV
Write-Host "`n2. Test de validation CSV..." -ForegroundColor Yellow
$csvFile = "test-simple.csv"

if (Test-Path $csvFile) {
    try {
        $form = @{
            file = Get-Item $csvFile
        }
        $response = Invoke-RestMethod -Uri "$baseUrl/validate" -Method POST -Form $form
        Write-Host "✅ Validation réussie:" -ForegroundColor Green
        Write-Host "   - Lignes valides: $($response.validLines)" -ForegroundColor Cyan
        Write-Host "   - Lignes avec erreurs: $($response.errorLines)" -ForegroundColor Cyan
        Write-Host "   - Doublons: $($response.duplicates)" -ForegroundColor Cyan
        Write-Host "   - Nouveaux enregistrements: $($response.newRecords)" -ForegroundColor Cyan
        
        if ($response.errors) {
            Write-Host "   - Erreurs:" -ForegroundColor Red
            foreach ($error in $response.errors) {
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
