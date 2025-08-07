# Script de test pour la validation TRX SF
Write-Host "=== Test de validation TRX SF ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080/api/trx-sf"

# 1. Test avec fichier CSV simple
Write-Host "`n1. Test avec fichier CSV simple..." -ForegroundColor Yellow
$csvFile = "test-trx-sf-simple.csv"

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

# 2. Test avec fichier CSV original
Write-Host "`n2. Test avec fichier CSV original..." -ForegroundColor Yellow
$originalCsvFile = "test-trx-sf-data.csv"

if (Test-Path $originalCsvFile) {
    try {
        $form = @{
            file = Get-Item $originalCsvFile
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
    Write-Host "❌ Fichier CSV original non trouvé: $originalCsvFile" -ForegroundColor Red
}

# 3. Test d'upload du fichier simple
Write-Host "`n3. Test d'upload du fichier simple..." -ForegroundColor Yellow
if (Test-Path $csvFile) {
    try {
        $form = @{
            file = Get-Item $csvFile
        }
        $response = Invoke-RestMethod -Uri "$baseUrl/upload" -Method POST -Form $form
        Write-Host "✅ Upload réussi: $($response.count) transactions importées" -ForegroundColor Green
    } catch {
        Write-Host "❌ Erreur lors de l'upload: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Fichier CSV non trouvé: $csvFile" -ForegroundColor Red
}

# 4. Vérifier les données importées
Write-Host "`n4. Vérification des données importées..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri $baseUrl -Method GET
    Write-Host "✅ Récupération réussie: $($response.Count) transactions" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors de la récupération: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Test de validation terminé ===" -ForegroundColor Green
