# Création des frais manquants pour CELCM0001
Write-Host "=== Création des frais manquants pour CELCM0001 ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080"
$apiUrl = "$baseUrl/api/frais-transaction"

Write-Host "`n1. Création du frais pour PAIEMENTMARCHAND_MTN_CM..." -ForegroundColor Yellow

# Frais pour PAIEMENTMARCHAND_MTN_CM
$fraisPaiement = @{
    service = "PAIEMENTMARCHAND_MTN_CM"
    agence = "CELCM0001"
    typeCalcul = "POURCENTAGE"
    montantFrais = 0.0
    pourcentage = 1.0
    description = "Frais pour paiement marchand MTN CM - CELCM0001"
    actif = $true
}

try {
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    Write-Host "   Envoi de la requête POST pour PAIEMENTMARCHAND_MTN_CM..." -ForegroundColor Cyan
    
    $response = Invoke-RestMethod -Uri $apiUrl -Method POST -Body ($fraisPaiement | ConvertTo-Json -Depth 10) -Headers $headers
    
    Write-Host "✅ Frais PAIEMENTMARCHAND_MTN_CM créé avec succès!" -ForegroundColor Green
    Write-Host "   ID: $($response.id)" -ForegroundColor Cyan
    Write-Host "   Service: $($response.service)" -ForegroundColor Cyan
    Write-Host "   Pourcentage: $($response.pourcentage)%" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Erreur lors de la création du frais PAIEMENTMARCHAND_MTN_CM: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n2. Création du frais pour CASHINMTNCMPART..." -ForegroundColor Yellow

# Frais pour CASHINMTNCMPART
$fraisCashin = @{
    service = "CASHINMTNCMPART"
    agence = "CELCM0001"
    typeCalcul = "NOMINAL"
    montantFrais = 300.0
    pourcentage = $null
    description = "Frais pour cashin MTN CM - CELCM0001"
    actif = $true
}

try {
    Write-Host "   Envoi de la requête POST pour CASHINMTNCMPART..." -ForegroundColor Cyan
    
    $response = Invoke-RestMethod -Uri $apiUrl -Method POST -Body ($fraisCashin | ConvertTo-Json -Depth 10) -Headers $headers
    
    Write-Host "✅ Frais CASHINMTNCMPART créé avec succès!" -ForegroundColor Green
    Write-Host "   ID: $($response.id)" -ForegroundColor Cyan
    Write-Host "   Service: $($response.service)" -ForegroundColor Cyan
    Write-Host "   Montant: $($response.montantFrais) FCFA" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Erreur lors de la création du frais CASHINMTNCMPART: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n3. Vérification des frais créés..." -ForegroundColor Yellow

try {
    $fraisUrl = "$baseUrl/api/frais-transaction"
    $frais = Invoke-RestMethod -Uri $fraisUrl -Method GET
    
    $fraisCelcm = $frais | Where-Object { $_.agence -eq "CELCM0001" }
    
    Write-Host "✅ Frais pour CELCM0001: $($fraisCelcm.Count)" -ForegroundColor Green
    
    foreach ($f in $fraisCelcm) {
        Write-Host "   - Service: $($f.service), Type: $($f.typeCalcul), Montant: $($f.montantFrais), Pourcentage: $($f.pourcentage)" -ForegroundColor Cyan
    }
    
} catch {
    Write-Host "❌ Erreur lors de la vérification: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Résumé ===" -ForegroundColor Green
Write-Host "✅ Création des frais manquants" -ForegroundColor Green
Write-Host "✅ Vérification des configurations" -ForegroundColor Green

Write-Host "`n🎉 Configuration terminée !" -ForegroundColor Green 