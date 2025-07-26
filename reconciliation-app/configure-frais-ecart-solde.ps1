# Configuration des frais pour les écarts de solde
Write-Host "=== Configuration des frais pour écarts de solde ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080"
$fraisUrl = "$baseUrl/api/frais-transaction"

Write-Host "`n1. Configuration du frais pour PAIEMENTMARCHAND_MTN_CM..." -ForegroundColor Yellow

# Données pour configurer le frais
$fraisPaiement = @{
    service = "PAIEMENTMARCHAND_MTN_CM"
    agence = "CELCM0001"
    montantFrais = 0.0
    typeCalcul = "POURCENTAGE"
    pourcentage = 1.0
    description = "Frais pour écarts de solde - Paiement Marchand MTN"
    actif = $true
}

Write-Host "   Données de configuration:" -ForegroundColor Cyan
$fraisPaiement | ConvertTo-Json -Depth 10

try {
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    Write-Host "`n   Envoi de la requête POST..." -ForegroundColor Cyan
    
    $response = Invoke-RestMethod -Uri $fraisUrl -Method POST -Body ($fraisPaiement | ConvertTo-Json -Depth 10) -Headers $headers
    
    Write-Host "✅ Frais configuré avec succès!" -ForegroundColor Green
    Write-Host "   ID: $($response.id)" -ForegroundColor Cyan
    Write-Host "   Service: $($response.service)" -ForegroundColor Cyan
    Write-Host "   Agence: $($response.agence)" -ForegroundColor Cyan
    Write-Host "   Type: $($response.typeCalcul)" -ForegroundColor Cyan
    Write-Host "   Pourcentage: $($response.pourcentage)%" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Erreur lors de la configuration: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $errorBody = $reader.ReadToEnd()
        Write-Host "   Détails de l'erreur: $errorBody" -ForegroundColor Red
    }
}

Write-Host "`n2. Configuration du frais pour CASHINMTNCMPART..." -ForegroundColor Yellow

# Données pour configurer le frais cashin
$fraisCashin = @{
    service = "CASHINMTNCMPART"
    agence = "CELCM0001"
    montantFrais = 300.0
    typeCalcul = "NOMINAL"
    pourcentage = $null
    description = "Frais pour écarts de solde - Cashin MTN"
    actif = $true
}

Write-Host "   Données de configuration:" -ForegroundColor Cyan
$fraisCashin | ConvertTo-Json -Depth 10

try {
    Write-Host "`n   Envoi de la requête POST..." -ForegroundColor Cyan
    
    $response = Invoke-RestMethod -Uri $fraisUrl -Method POST -Body ($fraisCashin | ConvertTo-Json -Depth 10) -Headers $headers
    
    Write-Host "✅ Frais configuré avec succès!" -ForegroundColor Green
    Write-Host "   ID: $($response.id)" -ForegroundColor Cyan
    Write-Host "   Service: $($response.service)" -ForegroundColor Cyan
    Write-Host "   Agence: $($response.agence)" -ForegroundColor Cyan
    Write-Host "   Type: $($response.typeCalcul)" -ForegroundColor Cyan
    Write-Host "   Montant: $($response.montantFrais) FCFA" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Erreur lors de la configuration: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n3. Vérification de la configuration..." -ForegroundColor Yellow

try {
    $frais = Invoke-RestMethod -Uri $fraisUrl -Method GET
    
    $fraisPaiementConfig = $frais | Where-Object { 
        $_.service -eq "PAIEMENTMARCHAND_MTN_CM" -and 
        $_.agence -eq "CELCM0001" -and 
        $_.actif -eq $true 
    }
    
    $fraisCashinConfig = $frais | Where-Object { 
        $_.service -eq "CASHINMTNCMPART" -and 
        $_.agence -eq "CELCM0001" -and 
        $_.actif -eq $true 
    }
    
    Write-Host "✅ Frais PAIEMENTMARCHAND_MTN_CM configurés: $($fraisPaiementConfig.Count)" -ForegroundColor Green
    Write-Host "✅ Frais CASHINMTNCMPART configurés: $($fraisCashinConfig.Count)" -ForegroundColor Green
    
    if ($fraisPaiementConfig.Count -gt 0) {
        Write-Host "   Frais PAIEMENTMARCHAND_MTN_CM:" -ForegroundColor Cyan
        $fraisPaiementConfig[0] | ConvertTo-Json -Depth 10
    }
    
    if ($fraisCashinConfig.Count -gt 0) {
        Write-Host "   Frais CASHINMTNCMPART:" -ForegroundColor Cyan
        $fraisCashinConfig[0] | ConvertTo-Json -Depth 10
    }
    
} catch {
    Write-Host "❌ Erreur lors de la vérification: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Résumé ===" -ForegroundColor Green
Write-Host "✅ Configuration des frais PAIEMENTMARCHAND_MTN_CM" -ForegroundColor Green
Write-Host "✅ Configuration des frais CASHINMTNCMPART" -ForegroundColor Green
Write-Host "✅ Vérification de la configuration" -ForegroundColor Green

Write-Host "`n🎉 Configuration terminée !" -ForegroundColor Green
Write-Host "Les frais sont maintenant configurés pour la génération automatique." -ForegroundColor Cyan 