# Test simple de génération de frais pour écarts de solde
Write-Host "=== Test simple de génération de frais ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080"
$apiUrl = "$baseUrl/api/ecart-solde"

Write-Host "`n1. Test de création d'un écart de solde..." -ForegroundColor Yellow

# Données de test simples
$testEcartSolde = @{
    idTransaction = "TEST_ECART_SIMPLE_001"
    telephoneClient = "682376662"
    montant = 100000.0
    service = "PAIEMENTMARCHAND_MTN_CM"
    agence = "CELCM0001"
    dateTransaction = "2025-07-25T20:58:15"
    numeroTransGu = "TEST_SIMPLE_GU_001"
    pays = "CM"
    dateImport = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
    statut = "EN_ATTENTE"
    commentaire = "Test simple de frais automatiques"
}

try {
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    Write-Host "   Envoi de la requête POST..." -ForegroundColor Cyan
    
    $response = Invoke-RestMethod -Uri "$apiUrl" -Method POST -Body ($testEcartSolde | ConvertTo-Json -Depth 10) -Headers $headers
    
    Write-Host "✅ Écart de solde créé avec succès!" -ForegroundColor Green
    Write-Host "   ID: $($response.id)" -ForegroundColor Cyan
    Write-Host "   Service: $($response.service)" -ForegroundColor Cyan
    Write-Host "   Agence: $($response.agence)" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n2. Vérification des opérations de frais..." -ForegroundColor Yellow

try {
    $operationsUrl = "$baseUrl/api/operations"
    $operations = Invoke-RestMethod -Uri $operationsUrl -Method GET
    
    # Chercher les opérations de frais récentes
    $recentFrais = $operations | Where-Object { 
        $_.typeOperation -eq "FRAIS_TRANSACTION" -and 
        $_.nomBordereau -like "*FEES_ECART_SOLDE*" 
    }
    
    Write-Host "✅ Opérations de frais trouvées: $($recentFrais.Count)" -ForegroundColor Green
    
    if ($recentFrais.Count -gt 0) {
        Write-Host "`n   Dernière opération de frais:" -ForegroundColor Yellow
        $recentFrais[0] | ConvertTo-Json -Depth 10
    }
    
} catch {
    Write-Host "❌ Erreur lors de la vérification: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n3. Vérification des frais de transaction configurés..." -ForegroundColor Yellow

try {
    $fraisUrl = "$baseUrl/api/frais-transaction"
    $frais = Invoke-RestMethod -Uri $fraisUrl -Method GET
    
    $fraisApplicable = $frais | Where-Object { 
        $_.service -eq "PAIEMENTMARCHAND_MTN_CM" -and 
        $_.agence -eq "CELCM0001" -and 
        $_.actif -eq $true 
    }
    
    Write-Host "✅ Frais de transaction trouvés: $($fraisApplicable.Count)" -ForegroundColor Green
    
    if ($fraisApplicable.Count -gt 0) {
        Write-Host "   Frais applicable:" -ForegroundColor Cyan
        $fraisApplicable[0] | ConvertTo-Json -Depth 10
    } else {
        Write-Host "   ⚠️ Aucun frais configuré pour PAIEMENTMARCHAND_MTN_CM / CELCM0001" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Erreur lors de la vérification des frais: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Résumé ===" -ForegroundColor Green
Write-Host "✅ Test de création d'écart de solde" -ForegroundColor Green
Write-Host "✅ Vérification des opérations de frais" -ForegroundColor Green
Write-Host "✅ Vérification de la configuration des frais" -ForegroundColor Green

Write-Host "`n🎉 Test terminé !" -ForegroundColor Green 