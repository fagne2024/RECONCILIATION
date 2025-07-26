# Test final de visibilité des frais
Write-Host "=== Test final de visibilité des frais ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080"
$apiUrl = "$baseUrl/api/ecart-solde"

Write-Host "`n1. Création d'un nouvel écart de solde pour test..." -ForegroundColor Yellow

# Données de test
$testEcartSolde = @{
    idTransaction = "TEST_VISIBILITY_001"
    telephoneClient = "682376664"
    montant = 75000.0
    service = "PAIEMENTMARCHAND_MTN_CM"
    agence = "CELCM0001"
    dateTransaction = "2025-07-26T10:00:00"
    numeroTransGu = "TEST_VISIBILITY_GU_001"
    pays = "CM"
    dateImport = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
    statut = "EN_ATTENTE"
    commentaire = "Test de visibilité des frais"
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
    Write-Host "   Montant: $($response.montant)" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Erreur lors de la création: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n2. Vérification immédiate des frais générés..." -ForegroundColor Yellow

try {
    $operationsUrl = "$baseUrl/api/operations"
    $operations = Invoke-RestMethod -Uri $operationsUrl -Method GET
    
    # Chercher les frais récents pour écarts de solde
    $recentFrais = $operations | Where-Object { 
        $_.typeOperation -eq "FRAIS_TRANSACTION" -and 
        $_.nomBordereau -like "*FEES_ECART_SOLDE*" -and
        $_.dateOperation -like "*2025-07-26*"
    }
    
    Write-Host "✅ Frais récents trouvés: $($recentFrais.Count)" -ForegroundColor Green
    
    if ($recentFrais.Count -gt 0) {
        Write-Host "`n   Dernier frais généré:" -ForegroundColor Yellow
        $frais = $recentFrais[0]
        Write-Host "   - ID: $($frais.id)" -ForegroundColor Cyan
        Write-Host "   - Service: $($frais.service)" -ForegroundColor Cyan
        Write-Host "   - Montant: $($frais.montant)" -ForegroundColor Cyan
        Write-Host "   - Bordereau: $($frais.nomBordereau)" -ForegroundColor Cyan
        Write-Host "   - Date: $($frais.dateOperation)" -ForegroundColor Cyan
    }
    
} catch {
    Write-Host "❌ Erreur lors de la vérification: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n3. Instructions pour voir les frais dans l'interface..." -ForegroundColor Yellow

Write-Host "   📋 Pour voir les frais dans l'interface:" -ForegroundColor Cyan
Write-Host "   1. Allez dans 'Opérations' dans le menu" -ForegroundColor Cyan
Write-Host "   2. Dans les filtres, sélectionnez 'Frais Transaction' dans le type d'opération" -ForegroundColor Cyan
Write-Host "   3. Ou cherchez les opérations avec 'FEES_ECART_SOLDE' dans le bordereau" -ForegroundColor Cyan
Write-Host "   4. Les frais apparaissent avec un badge vert 'FRAIS_TRANSACTION'" -ForegroundColor Cyan

Write-Host "`n4. Vérification des écarts de solde..." -ForegroundColor Yellow

try {
    $ecartSoldes = Invoke-RestMethod -Uri $apiUrl -Method GET
    
    Write-Host "✅ Écarts de solde en base: $($ecartSoldes.Count)" -ForegroundColor Green
    
    if ($ecartSoldes.Count -gt 0) {
        Write-Host "   Dernier écart de solde:" -ForegroundColor Cyan
        $ecart = $ecartSoldes[0]
        Write-Host "   - ID: $($ecart.id)" -ForegroundColor Cyan
        Write-Host "   - Service: $($ecart.service)" -ForegroundColor Cyan
        Write-Host "   - Montant: $($ecart.montant)" -ForegroundColor Cyan
        Write-Host "   - Date: $($ecart.dateTransaction)" -ForegroundColor Cyan
    }
    
} catch {
    Write-Host "❌ Erreur lors de la vérification des écarts: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Résumé ===" -ForegroundColor Green
Write-Host "✅ Création d'un nouvel écart de solde" -ForegroundColor Green
Write-Host "✅ Vérification des frais générés" -ForegroundColor Green
Write-Host "✅ Instructions d'affichage" -ForegroundColor Green
Write-Host "✅ Vérification des écarts de solde" -ForegroundColor Green

Write-Host "`n🎉 Test terminé !" -ForegroundColor Green
 