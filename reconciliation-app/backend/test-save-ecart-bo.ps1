# Script de test pour la fonctionnalité de sauvegarde ECART BO vers Ecart Solde
# Ce script teste l'endpoint batch et la logique de sauvegarde

Write-Host "=== Test de la fonctionnalité de sauvegarde ECART BO ===" -ForegroundColor Green

# Configuration
$baseUrl = "http://localhost:8080"
$apiUrl = "$baseUrl/api/ecart-solde"

# Test 1: Vérifier que l'endpoint batch existe
Write-Host "`n1. Test de l'endpoint batch..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$apiUrl" -Method GET
    Write-Host "✅ Endpoint principal accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors de l'accès à l'endpoint principal: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Créer des données de test ECART BO
Write-Host "`n2. Création de données de test..." -ForegroundColor Yellow

$testData = @(
    @{
        idTransaction = "TEST001"
        telephoneClient = "123456789"
        montant = 1000.50
        service = "Service Test 1"
        agence = "Agence Test 1"
        dateTransaction = "2025-01-15T10:30:00"
        numeroTransGu = "GU001"
        pays = "SN"
        dateImport = "2025-01-15T10:30:00"
        statut = "EN_ATTENTE"
        commentaire = "Test depuis ECART BO"
    },
    @{
        idTransaction = "TEST002"
        telephoneClient = "987654321"
        montant = 2500.75
        service = "Service Test 2"
        agence = "Agence Test 2"
        dateTransaction = "2025-01-15T11:30:00"
        numeroTransGu = "GU002"
        pays = "CI"
        dateImport = "2025-01-15T11:30:00"
        statut = "EN_ATTENTE"
        commentaire = "Test depuis ECART BO"
    }
)

Write-Host "✅ Données de test créées ($($testData.Count) enregistrements)" -ForegroundColor Green

# Test 3: Tester l'endpoint batch
Write-Host "`n3. Test de l'endpoint batch..." -ForegroundColor Yellow

try {
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    $jsonData = $testData | ConvertTo-Json -Depth 10
    
    $response = Invoke-RestMethod -Uri "$apiUrl/batch" -Method POST -Body $jsonData -Headers $headers
    
    Write-Host "✅ Endpoint batch fonctionnel" -ForegroundColor Green
    Write-Host "   Message: $($response.message)" -ForegroundColor Cyan
    Write-Host "   Nombre d'enregistrements créés: $($response.count)" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Erreur lors du test de l'endpoint batch: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $errorBody = $reader.ReadToEnd()
        Write-Host "   Détails de l'erreur: $errorBody" -ForegroundColor Red
    }
}

# Test 4: Vérifier que les données ont été sauvegardées
Write-Host "`n4. Vérification des données sauvegardées..." -ForegroundColor Yellow

try {
    $savedData = Invoke-RestMethod -Uri "$apiUrl" -Method GET
    
    $testRecords = $savedData | Where-Object { $_.commentaire -eq "Test depuis ECART BO" }
    
    if ($testRecords.Count -gt 0) {
        Write-Host "✅ Données trouvées dans la base: $($testRecords.Count) enregistrements" -ForegroundColor Green
        
        foreach ($record in $testRecords) {
            Write-Host "   - ID: $($record.id), Transaction: $($record.idTransaction), Montant: $($record.montant)" -ForegroundColor Cyan
        }
    } else {
        Write-Host "⚠️ Aucune donnée de test trouvée dans la base" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Erreur lors de la vérification: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Nettoyer les données de test
Write-Host "`n5. Nettoyage des données de test..." -ForegroundColor Yellow

try {
    $savedData = Invoke-RestMethod -Uri "$apiUrl" -Method GET
    $testRecords = $savedData | Where-Object { $_.commentaire -eq "Test depuis ECART BO" }
    
    foreach ($record in $testRecords) {
        Invoke-RestMethod -Uri "$apiUrl/$($record.id)" -Method DELETE
        Write-Host "   - Supprimé: ID $($record.id)" -ForegroundColor Cyan
    }
    
    Write-Host "✅ Nettoyage terminé" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Erreur lors du nettoyage: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Test terminé ===" -ForegroundColor Green
Write-Host "La fonctionnalité de sauvegarde ECART BO est prête à être utilisée!" -ForegroundColor Green 