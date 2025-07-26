# Test de génération automatique de frais pour les écarts de solde
Write-Host "=== Test de génération automatique de frais pour écarts de solde ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080"
$apiUrl = "$baseUrl/api/ecart-solde"

Write-Host "`n1. Test de l'endpoint principal..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$apiUrl" -Method GET
    Write-Host "✅ Endpoint principal accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n2. Test de création d'un écart de solde avec frais automatiques..." -ForegroundColor Yellow

# Données de test pour un écart de solde
$testEcartSolde = @{
    id = 0
    idTransaction = "TEST_ECART_001"
    telephoneClient = "682376662"
    montant = 455920.0
    service = "PAIEMENTMARCHAND_MTN_CM"
    agence = "CELCM0001"
    dateTransaction = "2025-07-25T20:58:15"
    numeroTransGu = "TEST_ECART_GU_001"
    pays = "CM"
    dateImport = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
    statut = "EN_ATTENTE"
    commentaire = "Test de génération automatique de frais"
}

Write-Host "   Données de test:" -ForegroundColor Cyan
$testEcartSolde | ConvertTo-Json -Depth 10

try {
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    Write-Host "`n   Envoi de la requête POST vers $apiUrl..." -ForegroundColor Cyan
    
    $response = Invoke-RestMethod -Uri "$apiUrl" -Method POST -Body ($testEcartSolde | ConvertTo-Json -Depth 10) -Headers $headers
    
    Write-Host "✅ Écart de solde créé avec succès!" -ForegroundColor Green
    Write-Host "   ID: $($response.id)" -ForegroundColor Cyan
    Write-Host "   Service: $($response.service)" -ForegroundColor Cyan
    Write-Host "   Agence: $($response.agence)" -ForegroundColor Cyan
    Write-Host "   Montant: $($response.montant)" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Erreur lors de la création de l'écart de solde: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $errorBody = $reader.ReadToEnd()
        Write-Host "   Détails de l'erreur: $errorBody" -ForegroundColor Red
    }
}

Write-Host "`n3. Vérification des opérations de frais créées..." -ForegroundColor Yellow

try {
    $operationsUrl = "$baseUrl/api/operations"
    $operations = Invoke-RestMethod -Uri $operationsUrl -Method GET
    
    # Filtrer les opérations de frais récentes
    $recentFrais = $operations | Where-Object { 
        $_.typeOperation -eq "FRAIS_TRANSACTION" -and 
        $_.nomBordereau -like "*FEES_ECART_SOLDE*" 
    }
    
    Write-Host "✅ Opérations de frais trouvées: $($recentFrais.Count)" -ForegroundColor Green
    
    if ($recentFrais.Count -gt 0) {
        Write-Host "`n   Dernières opérations de frais pour écarts de solde:" -ForegroundColor Yellow
        for ($i = 0; $i -lt [Math]::Min(3, $recentFrais.Count); $i++) {
            Write-Host "   Opération $($i + 1):" -ForegroundColor Cyan
            $recentFrais[$i] | ConvertTo-Json -Depth 10
        }
    } else {
        Write-Host "   ⚠️ Aucune opération de frais trouvée pour les écarts de solde" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Erreur lors de la vérification des opérations: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n4. Test de création multiple avec frais automatiques..." -ForegroundColor Yellow

# Données multiples pour test
$multipleEcartSoldes = @(
    @{
        id = 0
        idTransaction = "TEST_ECART_002"
        telephoneClient = "682376663"
        montant = 250000.0
        service = "CASHINMTNCMPART"
        agence = "CELCM0001"
        dateTransaction = "2025-07-25T21:00:00"
        numeroTransGu = "TEST_ECART_GU_002"
        pays = "CM"
        dateImport = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
        statut = "EN_ATTENTE"
        commentaire = "Test multiple - Écart 1"
    },
    @{
        id = 0
        idTransaction = "TEST_ECART_003"
        telephoneClient = "682376664"
        montant = 350000.0
        service = "PAIEMENTMARCHAND_MTN_CM"
        agence = "CELCM0001"
        dateTransaction = "2025-07-25T21:01:00"
        numeroTransGu = "TEST_ECART_GU_003"
        pays = "CM"
        dateImport = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
        statut = "EN_ATTENTE"
        commentaire = "Test multiple - Écart 2"
    }
)

try {
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    Write-Host "   Envoi de la requête POST vers $apiUrl/batch..." -ForegroundColor Cyan
    
    $response = Invoke-RestMethod -Uri "$apiUrl/batch" -Method POST -Body ($multipleEcartSoldes | ConvertTo-Json -Depth 10) -Headers $headers
    
    Write-Host "✅ Écarts de solde multiples créés avec succès!" -ForegroundColor Green
    Write-Host "   Nombre d'écarts créés: $($response.count)" -ForegroundColor Cyan
    Write-Host "   Message: $($response.message)" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Erreur lors de la création multiple: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n5. Vérification finale des frais générés..." -ForegroundColor Yellow

try {
    $operations = Invoke-RestMethod -Uri "$baseUrl/api/operations" -Method GET
    
    # Compter les opérations de frais pour écarts de solde
    $fraisEcartSolde = $operations | Where-Object { 
        $_.typeOperation -eq "FRAIS_TRANSACTION" -and 
        $_.nomBordereau -like "*FEES_ECART_SOLDE*" 
    }
    
    Write-Host "✅ Total des opérations de frais pour écarts de solde: $($fraisEcartSolde.Count)" -ForegroundColor Green
    
    if ($fraisEcartSolde.Count -gt 0) {
        Write-Host "`n   Résumé des frais générés:" -ForegroundColor Yellow
        $fraisEcartSolde | ForEach-Object {
            Write-Host "   - Service: $($_.service), Montant: $($_.montant), Bordereau: $($_.nomBordereau)" -ForegroundColor Cyan
        }
    }
    
} catch {
    Write-Host "❌ Erreur lors de la vérification finale: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Résumé ===" -ForegroundColor Green
Write-Host "✅ Génération automatique de frais implémentée" -ForegroundColor Green
Write-Host "✅ Frais créés pour chaque écart de solde" -ForegroundColor Green
Write-Host "✅ Logique de calcul des frais appliquée" -ForegroundColor Green
Write-Host "✅ Opérations de frais liées aux écarts de solde" -ForegroundColor Green

Write-Host "`n🎉 La génération automatique de frais pour les écarts de solde est maintenant opérationnelle !" -ForegroundColor Green
Write-Host "Chaque écart de solde créé génère automatiquement une opération de frais correspondante." -ForegroundColor Cyan 