# Test simple du statut du backend
Write-Host "=== Test du statut du backend ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080"

Write-Host "`n1. Test de connexion..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/ecart-solde" -Method GET
    Write-Host "✅ Backend accessible - Nombre d'écarts de solde: $($response.Count)" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend non accessible: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Vérifiez que le backend est démarré sur le port 8080" -ForegroundColor Cyan
}

Write-Host "`n2. Test de l'endpoint de validation..." -ForegroundColor Yellow

try {
    # Créer un fichier CSV minimal
    $testCsv = "ID;IDTransaction;téléphone client;montant;Service;Agence;Date;Numéro Trans GU;PAYS`n1;TEST123;123456789;1000;TEST;CELCM0001;2025-07-25 20:58:15.0;TEST123;CM"
    $testCsv | Out-File -FilePath "test-minimal.csv" -Encoding UTF8
    
    $form = @{
        file = Get-Item "test-minimal.csv"
    }
    
    $response = Invoke-RestMethod -Uri "$baseUrl/api/ecart-solde/validate" -Method POST -Form $form
    Write-Host "✅ Endpoint de validation fonctionnel" -ForegroundColor Green
    Write-Host "   - Lignes valides: $($response.validLines)" -ForegroundColor Cyan
    Write-Host "   - Lignes avec erreurs: $($response.errorLines)" -ForegroundColor Cyan
    Write-Host "   - Doublons: $($response.duplicates)" -ForegroundColor Cyan
    Write-Host "   - Nouveaux enregistrements: $($response.newRecords)" -ForegroundColor Cyan
    
    # Nettoyer
    Remove-Item "test-minimal.csv" -ErrorAction SilentlyContinue
    
} catch {
    Write-Host "❌ Erreur de validation: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Détails de l'erreur: $responseBody" -ForegroundColor Red
    }
}

Write-Host "`n=== Test terminé ===" -ForegroundColor Green 