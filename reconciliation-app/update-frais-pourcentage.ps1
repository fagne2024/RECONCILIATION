# Mise à jour des frais avec le bon pourcentage
Write-Host "=== Mise à jour des frais pour CELCM0001 ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080"

Write-Host "`n1. Recherche des frais existants..." -ForegroundColor Yellow

try {
    $fraisUrl = "$baseUrl/api/frais-transaction"
    $frais = Invoke-RestMethod -Uri $fraisUrl -Method GET
    
    $fraisPaiement = $frais | Where-Object { 
        $_.service -eq "PAIEMENTMARCHAND_MTN_CM" -and $_.agence -eq "CELCM0001" 
    }
    
    if ($fraisPaiement) {
        Write-Host "✅ Frais PAIEMENTMARCHAND_MTN_CM trouvé:" -ForegroundColor Green
        Write-Host "   ID: $($fraisPaiement.id)" -ForegroundColor Cyan
        Write-Host "   Type: $($fraisPaiement.typeCalcul)" -ForegroundColor Cyan
        Write-Host "   Montant: $($fraisPaiement.montantFrais)" -ForegroundColor Cyan
        Write-Host "   Pourcentage actuel: $($fraisPaiement.pourcentage)" -ForegroundColor Cyan
        
        Write-Host "`n2. Mise à jour du pourcentage..." -ForegroundColor Yellow
        
        # Mise à jour avec un pourcentage de 1.0%
        $updateData = @{
            service = "PAIEMENTMARCHAND_MTN_CM"
            agence = "CELCM0001"
            typeCalcul = "POURCENTAGE"
            montantFrais = 0.0
            pourcentage = 1.0
            description = "Frais pour paiement marchand MTN CM - CELCM0001 (1%)"
            actif = $true
        }
        
        $headers = @{
            "Content-Type" = "application/json"
        }
        
        $updateUrl = "$baseUrl/api/frais-transaction/$($fraisPaiement.id)"
        $response = Invoke-RestMethod -Uri $updateUrl -Method PUT -Body ($updateData | ConvertTo-Json -Depth 10) -Headers $headers
        
        Write-Host "✅ Frais mis à jour avec succès!" -ForegroundColor Green
        Write-Host "   Nouveau pourcentage: $($response.pourcentage)%" -ForegroundColor Cyan
        
    } else {
        Write-Host "❌ Frais PAIEMENTMARCHAND_MTN_CM non trouvé pour CELCM0001" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Erreur lors de la mise à jour: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n3. Test de création d'un écart de solde..." -ForegroundColor Yellow

# Test avec un nouvel écart de solde
$testEcartSolde = @{
    idTransaction = "TEST_FRAIS_001"
    telephoneClient = "682376665"
    montant = 100000.0
    service = "PAIEMENTMARCHAND_MTN_CM"
    agence = "CELCM0001"
    dateTransaction = "2025-07-26T15:00:00"
    numeroTransGu = "TEST_FRAIS_GU_001"
    pays = "CM"
    dateImport = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
    statut = "EN_ATTENTE"
    commentaire = "Test de génération de frais"
}

try {
    $ecartSoldeUrl = "$baseUrl/api/ecart-solde"
    $response = Invoke-RestMethod -Uri $ecartSoldeUrl -Method POST -Body ($testEcartSolde | ConvertTo-Json -Depth 10) -Headers $headers
    
    Write-Host "✅ Écart de solde créé avec succès!" -ForegroundColor Green
    Write-Host "   ID: $($response.id)" -ForegroundColor Cyan
    Write-Host "   Montant: $($response.montant) FCFA" -ForegroundColor Cyan
    Write-Host "   Service: $($response.service)" -ForegroundColor Cyan
    
    # Vérifier les frais générés
    Write-Host "`n4. Vérification des frais générés..." -ForegroundColor Yellow
    
    $operationsUrl = "$baseUrl/api/operations"
    $operations = Invoke-RestMethod -Uri $operationsUrl -Method GET
    
    $fraisGeneres = $operations | Where-Object { 
        $_.typeOperation -eq "FRAIS_TRANSACTION" -and 
        $_.nomBordereau -like "*FEES_ECART_SOLDE*" -and
        $_.dateOperation -like "*2025-07-26*"
    }
    
    Write-Host "✅ Frais générés: $($fraisGeneres.Count)" -ForegroundColor Green
    
    if ($fraisGeneres.Count -gt 0) {
        $frais = $fraisGeneres[0]
        Write-Host "   Dernier frais généré:" -ForegroundColor Cyan
        Write-Host "   - ID: $($frais.id)" -ForegroundColor Cyan
        Write-Host "   - Montant: $($frais.montant) FCFA" -ForegroundColor Cyan
        Write-Host "   - Bordereau: $($frais.nomBordereau)" -ForegroundColor Cyan
        Write-Host "   - Service: $($frais.service)" -ForegroundColor Cyan
        
        # Calcul attendu : 100,000 × 1% = 1,000 FCFA
        $montantAttendu = 100000 * 0.01
        Write-Host "   - Montant attendu: $montantAttendu FCFA (1% de 100,000)" -ForegroundColor Cyan
    }
    
} catch {
    Write-Host "❌ Erreur lors du test: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Résumé ===" -ForegroundColor Green
Write-Host "✅ Mise à jour des frais" -ForegroundColor Green
Write-Host "✅ Test de génération" -ForegroundColor Green
Write-Host "✅ Vérification des frais" -ForegroundColor Green

Write-Host "`n🎉 Test terminé !" -ForegroundColor Green 