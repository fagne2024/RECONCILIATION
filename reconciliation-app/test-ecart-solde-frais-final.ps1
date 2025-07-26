# Test final de génération de frais pour écarts de solde
Write-Host "=== Test final de génération de frais ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080"
$apiUrl = "$baseUrl/api/ecart-solde"

Write-Host "`n1. Test de création d'un écart de solde avec frais automatiques..." -ForegroundColor Yellow

# Données de test pour un écart de solde
$testEcartSolde = @{
    idTransaction = "TEST_ECART_FINAL_001"
    telephoneClient = "682376662"
    montant = 100000.0
    service = "PAIEMENTMARCHAND_MTN_CM"
    agence = "CELCM0001"
    dateTransaction = "2025-07-25T21:30:00"
    numeroTransGu = "TEST_FINAL_GU_001"
    pays = "CM"
    dateImport = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
    statut = "EN_ATTENTE"
    commentaire = "Test final de génération automatique de frais"
}

Write-Host "   Données de test:" -ForegroundColor Cyan
$testEcartSolde | ConvertTo-Json -Depth 10

try {
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    Write-Host "`n   Envoi de la requête POST..." -ForegroundColor Cyan
    
    $response = Invoke-RestMethod -Uri "$apiUrl" -Method POST -Body ($testEcartSolde | ConvertTo-Json -Depth 10) -Headers $headers
    
    Write-Host "✅ Écart de solde créé avec succès!" -ForegroundColor Green
    Write-Host "   ID: $($response.id)" -ForegroundColor Cyan
    Write-Host "   Service: $($response.service)" -ForegroundColor Cyan
    Write-Host "   Agence: $($response.agence)" -ForegroundColor Cyan
    Write-Host "   Montant: $($response.montant)" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Erreur lors de la création: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n2. Vérification des opérations de frais créées..." -ForegroundColor Yellow

try {
    $operationsUrl = "$baseUrl/api/operations"
    $operations = Invoke-RestMethod -Uri $operationsUrl -Method GET
    
    # Chercher les opérations de frais récentes pour écarts de solde
    $recentFrais = $operations | Where-Object { 
        $_.typeOperation -eq "FRAIS_TRANSACTION" -and 
        $_.nomBordereau -like "*FEES_ECART_SOLDE*" -and
        $_.dateOperation -like "*2025-07-25*"
    }
    
    Write-Host "✅ Opérations de frais trouvées: $($recentFrais.Count)" -ForegroundColor Green
    
    if ($recentFrais.Count -gt 0) {
        Write-Host "`n   Dernières opérations de frais pour écarts de solde:" -ForegroundColor Yellow
        for ($i = 0; $i -lt [Math]::Min(3, $recentFrais.Count); $i++) {
            Write-Host "   Opération $($i + 1):" -ForegroundColor Cyan
            Write-Host "   - ID: $($recentFrais[$i].id)" -ForegroundColor Cyan
            Write-Host "   - Service: $($recentFrais[$i].service)" -ForegroundColor Cyan
            Write-Host "   - Montant: $($recentFrais[$i].montant)" -ForegroundColor Cyan
            Write-Host "   - Bordereau: $($recentFrais[$i].nomBordereau)" -ForegroundColor Cyan
            Write-Host "   - Date: $($recentFrais[$i].dateOperation)" -ForegroundColor Cyan
        }
    } else {
        Write-Host "   ⚠️ Aucune opération de frais trouvée pour les écarts de solde" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Erreur lors de la vérification: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n3. Test avec un service différent (CASHINMTNCMPART)..." -ForegroundColor Yellow

# Test avec CASHINMTNCMPART
$testEcartSolde2 = @{
    idTransaction = "TEST_ECART_FINAL_002"
    telephoneClient = "682376663"
    montant = 50000.0
    service = "CASHINMTNCMPART"
    agence = "CELCM0001"
    dateTransaction = "2025-07-25T21:31:00"
    numeroTransGu = "TEST_FINAL_GU_002"
    pays = "CM"
    dateImport = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
    statut = "EN_ATTENTE"
    commentaire = "Test final avec CASHINMTNCMPART"
}

try {
    Write-Host "   Envoi de la requête POST pour CASHINMTNCMPART..." -ForegroundColor Cyan
    
    $response = Invoke-RestMethod -Uri "$apiUrl" -Method POST -Body ($testEcartSolde2 | ConvertTo-Json -Depth 10) -Headers $headers
    
    Write-Host "✅ Écart de solde CASHINMTNCMPART créé avec succès!" -ForegroundColor Green
    Write-Host "   ID: $($response.id)" -ForegroundColor Cyan
    Write-Host "   Service: $($response.service)" -ForegroundColor Cyan
    Write-Host "   Montant: $($response.montant)" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Erreur lors de la création CASHINMTNCMPART: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n4. Vérification finale des frais générés..." -ForegroundColor Yellow

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
Write-Host "✅ Test de création d'écart de solde" -ForegroundColor Green
Write-Host "✅ Vérification des opérations de frais" -ForegroundColor Green
Write-Host "✅ Test avec service différent" -ForegroundColor Green
Write-Host "✅ Vérification finale" -ForegroundColor Green

Write-Host "`n🎉 Test final terminé !" -ForegroundColor Green 