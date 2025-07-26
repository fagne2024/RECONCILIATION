# Recherche des IDs des frais existants
Write-Host "=== Recherche des IDs des frais existants ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080"
$fraisUrl = "$baseUrl/api/frais-transaction"

Write-Host "`n1. Récupération de tous les frais..." -ForegroundColor Yellow

try {
    $frais = Invoke-RestMethod -Uri $fraisUrl -Method GET
    
    Write-Host "✅ Total des frais: $($frais.Count)" -ForegroundColor Green
    
    # Filtrer les frais pour CELCM0001
    $fraisCelcm = $frais | Where-Object { $_.agence -eq "CELCM0001" }
    
    Write-Host "✅ Frais pour CELCM0001: $($fraisCelcm.Count)" -ForegroundColor Green
    
    if ($fraisCelcm.Count -gt 0) {
        Write-Host "`n   Liste des frais pour CELCM0001:" -ForegroundColor Yellow
        $fraisCelcm | ForEach-Object {
            Write-Host "   - ID: $($_.id), Service: $($_.service), Type: $($_.typeCalcul), Montant: $($_.montantFrais), Pourcentage: $($_.pourcentage), Actif: $($_.actif)" -ForegroundColor Cyan
        }
    }
    
    # Recherche spécifique
    $fraisPaiement = $frais | Where-Object { 
        $_.service -eq "PAIEMENTMARCHAND_MTN_CM" -and 
        $_.agence -eq "CELCM0001" 
    }
    
    $fraisCashin = $frais | Where-Object { 
        $_.service -eq "CASHINMTNCMPART" -and 
        $_.agence -eq "CELCM0001" 
    }
    
    Write-Host "`n2. Frais spécifiques trouvés:" -ForegroundColor Yellow
    Write-Host "   PAIEMENTMARCHAND_MTN_CM: $($fraisPaiement.Count)" -ForegroundColor Cyan
    Write-Host "   CASHINMTNCMPART: $($fraisCashin.Count)" -ForegroundColor Cyan
    
    if ($fraisPaiement.Count -gt 0) {
        Write-Host "   Détails PAIEMENTMARCHAND_MTN_CM:" -ForegroundColor Cyan
        $fraisPaiement[0] | ConvertTo-Json -Depth 10
    }
    
    if ($fraisCashin.Count -gt 0) {
        Write-Host "   Détails CASHINMTNCMPART:" -ForegroundColor Cyan
        $fraisCashin[0] | ConvertTo-Json -Depth 10
    }
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Résumé ===" -ForegroundColor Green
Write-Host "✅ Recherche des frais terminée" -ForegroundColor Green 