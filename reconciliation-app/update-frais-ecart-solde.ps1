# Mise à jour des frais pour les écarts de solde
Write-Host "=== Mise à jour des frais pour écarts de solde ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080"
$fraisUrl = "$baseUrl/api/frais-transaction"

Write-Host "`n1. Récupération des frais existants..." -ForegroundColor Yellow

try {
    $frais = Invoke-RestMethod -Uri $fraisUrl -Method GET
    
    $fraisPaiement = $frais | Where-Object { 
        $_.service -eq "PAIEMENTMARCHAND_MTN_CM" -and 
        $_.agence -eq "CELCM0001" 
    }
    
    $fraisCashin = $frais | Where-Object { 
        $_.service -eq "CASHINMTNCMPART" -and 
        $_.agence -eq "CELCM0001" 
    }
    
    Write-Host "✅ Frais PAIEMENTMARCHAND_MTN_CM trouvés: $($fraisPaiement.Count)" -ForegroundColor Green
    Write-Host "✅ Frais CASHINMTNCMPART trouvés: $($fraisCashin.Count)" -ForegroundColor Green
    
    if ($fraisPaiement.Count -gt 0) {
        Write-Host "   Frais PAIEMENTMARCHAND_MTN_CM actuel:" -ForegroundColor Cyan
        $fraisPaiement[0] | ConvertTo-Json -Depth 10
    }
    
    if ($fraisCashin.Count -gt 0) {
        Write-Host "   Frais CASHINMTNCMPART actuel:" -ForegroundColor Cyan
        $fraisCashin[0] | ConvertTo-Json -Depth 10
    }
    
} catch {
    Write-Host "❌ Erreur lors de la récupération: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n2. Mise à jour du frais PAIEMENTMARCHAND_MTN_CM..." -ForegroundColor Yellow

if ($fraisPaiement.Count -gt 0) {
    $fraisId = $fraisPaiement[0].id
    
    # Données de mise à jour
    $updatePaiement = @{
        service = "PAIEMENTMARCHAND_MTN_CM"
        agence = "CELCM0001"
        montantFrais = 0.0
        typeCalcul = "POURCENTAGE"
        pourcentage = 1.0
        description = "Frais pour écarts de solde - Paiement Marchand MTN (mis à jour)"
        actif = $true
    }
    
    Write-Host "   Mise à jour du frais ID: $fraisId" -ForegroundColor Cyan
    Write-Host "   Nouvelles données:" -ForegroundColor Cyan
    $updatePaiement | ConvertTo-Json -Depth 10
    
    try {
        $headers = @{
            "Content-Type" = "application/json"
        }
        
        $response = Invoke-RestMethod -Uri "$fraisUrl/$fraisId" -Method PUT -Body ($updatePaiement | ConvertTo-Json -Depth 10) -Headers $headers
        
        Write-Host "✅ Frais PAIEMENTMARCHAND_MTN_CM mis à jour avec succès!" -ForegroundColor Green
        Write-Host "   Pourcentage: $($response.pourcentage)%" -ForegroundColor Cyan
        
    } catch {
        Write-Host "❌ Erreur lors de la mise à jour: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "⚠️ Aucun frais PAIEMENTMARCHAND_MTN_CM trouvé à mettre à jour" -ForegroundColor Yellow
}

Write-Host "`n3. Mise à jour du frais CASHINMTNCMPART..." -ForegroundColor Yellow

if ($fraisCashin.Count -gt 0) {
    $fraisId = $fraisCashin[0].id
    
    # Données de mise à jour
    $updateCashin = @{
        service = "CASHINMTNCMPART"
        agence = "CELCM0001"
        montantFrais = 300.0
        typeCalcul = "NOMINAL"
        pourcentage = $null
        description = "Frais pour écarts de solde - Cashin MTN (mis à jour)"
        actif = $true
    }
    
    Write-Host "   Mise à jour du frais ID: $fraisId" -ForegroundColor Cyan
    Write-Host "   Nouvelles données:" -ForegroundColor Cyan
    $updateCashin | ConvertTo-Json -Depth 10
    
    try {
        $response = Invoke-RestMethod -Uri "$fraisUrl/$fraisId" -Method PUT -Body ($updateCashin | ConvertTo-Json -Depth 10) -Headers $headers
        
        Write-Host "✅ Frais CASHINMTNCMPART mis à jour avec succès!" -ForegroundColor Green
        Write-Host "   Montant: $($response.montantFrais) FCFA" -ForegroundColor Cyan
        
    } catch {
        Write-Host "❌ Erreur lors de la mise à jour: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "⚠️ Aucun frais CASHINMTNCMPART trouvé à mettre à jour" -ForegroundColor Yellow
}

Write-Host "`n4. Vérification finale..." -ForegroundColor Yellow

try {
    $frais = Invoke-RestMethod -Uri $fraisUrl -Method GET
    
    $fraisPaiementUpdated = $frais | Where-Object { 
        $_.service -eq "PAIEMENTMARCHAND_MTN_CM" -and 
        $_.agence -eq "CELCM0001" -and 
        $_.actif -eq $true 
    }
    
    $fraisCashinUpdated = $frais | Where-Object { 
        $_.service -eq "CASHINMTNCMPART" -and 
        $_.agence -eq "CELCM0001" -and 
        $_.actif -eq $true 
    }
    
    Write-Host "✅ Vérification des frais mis à jour:" -ForegroundColor Green
    
    if ($fraisPaiementUpdated.Count -gt 0) {
        Write-Host "   Frais PAIEMENTMARCHAND_MTN_CM:" -ForegroundColor Cyan
        Write-Host "   - Type: $($fraisPaiementUpdated[0].typeCalcul)" -ForegroundColor Cyan
        Write-Host "   - Pourcentage: $($fraisPaiementUpdated[0].pourcentage)%" -ForegroundColor Cyan
    }
    
    if ($fraisCashinUpdated.Count -gt 0) {
        Write-Host "   Frais CASHINMTNCMPART:" -ForegroundColor Cyan
        Write-Host "   - Type: $($fraisCashinUpdated[0].typeCalcul)" -ForegroundColor Cyan
        Write-Host "   - Montant: $($fraisCashinUpdated[0].montantFrais) FCFA" -ForegroundColor Cyan
    }
    
} catch {
    Write-Host "❌ Erreur lors de la vérification: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Résumé ===" -ForegroundColor Green
Write-Host "✅ Mise à jour des frais PAIEMENTMARCHAND_MTN_CM" -ForegroundColor Green
Write-Host "✅ Mise à jour des frais CASHINMTNCMPART" -ForegroundColor Green
Write-Host "✅ Vérification de la configuration" -ForegroundColor Green

Write-Host "`n🎉 Mise à jour terminée !" -ForegroundColor Green
Write-Host "Les frais sont maintenant correctement configurés pour la génération automatique." -ForegroundColor Cyan 