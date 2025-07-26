# Test simple de l'endpoint batch ECART SOLDE
Write-Host "=== Test simple de l'endpoint batch ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080"
$apiUrl = "$baseUrl/api/ecart-solde"

# Test 1: Vérifier que l'endpoint principal fonctionne
Write-Host "`n1. Test de l'endpoint principal..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$apiUrl" -Method GET
    Write-Host "✅ Endpoint principal accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Tester l'endpoint batch avec des données simples
Write-Host "`n2. Test de l'endpoint batch..." -ForegroundColor Yellow

$testData = @(
    @{
        idTransaction = "TEST001"
        telephoneClient = "123456789"
        montant = 1000.50
        service = "Service Test"
        agence = "Agence Test"
        dateTransaction = "2025-01-15T10:30:00"
        numeroTransGu = "GU001"
        pays = "SN"
        dateImport = "2025-01-15T10:30:00"
        statut = "EN_ATTENTE"
        commentaire = "Test depuis ECART BO"
    }
)

try {
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    # Convertir en JSON en s'assurant que c'est un tableau
    $jsonData = "[$($testData | ConvertTo-Json -Depth 10)]"
    
    Write-Host "Envoi de la requête POST vers $apiUrl/batch..." -ForegroundColor Cyan
    
    $response = Invoke-RestMethod -Uri "$apiUrl/batch" -Method POST -Body $jsonData -Headers $headers
    
    Write-Host "✅ Endpoint batch fonctionnel!" -ForegroundColor Green
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

Write-Host "`n=== Test terminé ===" -ForegroundColor Green 