# Script de diagnostic pour la validation CSV TRX SF
Write-Host "=== Diagnostic validation CSV TRX SF ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080/api/trx-sf"

# Créer un fichier CSV de test simplifié
$testCsvContent = @"
ID Transaction;Téléphone Client;Montant;Service;Agence;Date Transaction;Numéro Trans GU;Pays;Frais;Commentaire
TRX_SF_TEST_001;+22112345678;50000;TRANSFERT;AGENCE_A;2024-01-15 10:30:00;GU_12345678;SENEGAL;500;Test simple
"@

$testCsvContent | Out-File -FilePath "debug-test.csv" -Encoding UTF8

Write-Host "`n1. Test avec fichier CSV simplifié..." -ForegroundColor Yellow
$csvFile = "debug-test.csv"

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

# Test avec le fichier original
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

# Test de création directe d'une transaction
Write-Host "`n3. Test de création directe d'une transaction..." -ForegroundColor Yellow
$createData = @{
    idTransaction = "TRX_SF_DEBUG_001"
    telephoneClient = "+22112345678"
    montant = 50000.0
    service = "TRANSFERT"
    agence = "AGENCE_A"
    dateTransaction = "2024-01-15T10:30:00"
    numeroTransGu = "GU_12345678"
    pays = "SENEGAL"
    frais = 500.0
    commentaire = "Test debug"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $baseUrl -Method POST -Body $createData -ContentType "application/json"
    Write-Host "✅ Transaction créée avec succès" -ForegroundColor Green
    Write-Host "ID: $($response.id)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erreur lors de la création: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Diagnostic terminé ===" -ForegroundColor Green
