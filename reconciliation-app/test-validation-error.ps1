# Test de diagnostic pour l'erreur de validation
Write-Host "=== Diagnostic de l'erreur de validation ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080"

Write-Host "`n1. Test de connexion au backend..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/ecart-solde" -Method GET
    Write-Host "✅ Backend accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend non accessible: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

Write-Host "`n2. Test de l'endpoint de validation..." -ForegroundColor Yellow

# Créer un fichier CSV de test
$testCsv = @"
ID;IDTransaction;téléphone client;montant;Service;Agence;Date;Numéro Trans GU;PAYS
1;13378604378;682376662;455920;PAIEMENTMARCHAND_MTN_CM;CELCM0001;2025-07-25 20:58:15.0;1753477095191;CM
"@

$testCsv | Out-File -FilePath "test-validation.csv" -Encoding UTF8

try {
    $form = @{
        file = Get-Item "test-validation.csv"
    }
    
    $response = Invoke-RestMethod -Uri "$baseUrl/api/ecart-solde/validate" -Method POST -Form $form
    Write-Host "✅ Validation réussie" -ForegroundColor Green
    Write-Host "   - Lignes valides: $($response.validLines)" -ForegroundColor Cyan
    Write-Host "   - Lignes avec erreurs: $($response.errorLines)" -ForegroundColor Cyan
    Write-Host "   - Doublons: $($response.duplicates)" -ForegroundColor Cyan
    Write-Host "   - Nouveaux enregistrements: $($response.newRecords)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erreur de validation: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Détails: $responseBody" -ForegroundColor Red
    }
}

Write-Host "`n3. Vérification des logs du backend..." -ForegroundColor Yellow

Write-Host "   📋 Vérifiez les logs du backend pour plus de détails" -ForegroundColor Cyan
Write-Host "   📋 Assurez-vous que le backend est démarré" -ForegroundColor Cyan
Write-Host "   📋 Vérifiez que les dépendances Apache POI sont installées" -ForegroundColor Cyan

# Nettoyer le fichier de test
if (Test-Path "test-validation.csv") {
    Remove-Item "test-validation.csv"
}

Write-Host "`n=== Diagnostic terminé ===" -ForegroundColor Green 