# Vérification de la configuration des frais de transaction
Write-Host "=== Vérification de la configuration des frais ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080"
$fraisUrl = "$baseUrl/api/frais-transaction"

Write-Host "`n1. Récupération de tous les frais configurés..." -ForegroundColor Yellow

try {
    $frais = Invoke-RestMethod -Uri $fraisUrl -Method GET
    
    Write-Host "✅ Total des frais configurés: $($frais.Count)" -ForegroundColor Green
    
    if ($frais.Count -gt 0) {
        Write-Host "`n   Liste des frais configurés:" -ForegroundColor Yellow
        $frais | ForEach-Object {
            Write-Host "   - Service: $($_.service), Agence: $($_.agence), Type: $($_.typeCalcul), Montant: $($_.montantFrais), Actif: $($_.actif)" -ForegroundColor Cyan
        }
    } else {
        Write-Host "   ⚠️ Aucun frais configuré dans le système" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Erreur lors de la récupération des frais: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n2. Recherche spécifique pour PAIEMENTMARCHAND_MTN_CM..." -ForegroundColor Yellow

try {
    $fraisApplicable = $frais | Where-Object { 
        $_.service -eq "PAIEMENTMARCHAND_MTN_CM" -and 
        $_.agence -eq "CELCM0001" 
    }
    
    Write-Host "✅ Frais trouvés pour PAIEMENTMARCHAND_MTN_CM / CELCM0001: $($fraisApplicable.Count)" -ForegroundColor Green
    
    if ($fraisApplicable.Count -gt 0) {
        Write-Host "   Frais applicable:" -ForegroundColor Cyan
        $fraisApplicable[0] | ConvertTo-Json -Depth 10
    } else {
        Write-Host "   ⚠️ Aucun frais configuré pour PAIEMENTMARCHAND_MTN_CM / CELCM0001" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Erreur lors de la recherche: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n3. Recherche pour CASHINMTNCMPART..." -ForegroundColor Yellow

try {
    $fraisCashin = $frais | Where-Object { 
        $_.service -eq "CASHINMTNCMPART" -and 
        $_.agence -eq "CELCM0001" 
    }
    
    Write-Host "✅ Frais trouvés pour CASHINMTNCMPART / CELCM0001: $($fraisCashin.Count)" -ForegroundColor Green
    
    if ($fraisCashin.Count -gt 0) {
        Write-Host "   Frais applicable:" -ForegroundColor Cyan
        $fraisCashin[0] | ConvertTo-Json -Depth 10
    } else {
        Write-Host "   ⚠️ Aucun frais configuré pour CASHINMTNCMPART / CELCM0001" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Erreur lors de la recherche: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n4. Recherche de tous les frais pour CELCM0001..." -ForegroundColor Yellow

try {
    $fraisCelcm = $frais | Where-Object { 
        $_.agence -eq "CELCM0001" -and 
        $_.actif -eq $true 
    }
    
    Write-Host "✅ Frais actifs trouvés pour CELCM0001: $($fraisCelcm.Count)" -ForegroundColor Green
    
    if ($fraisCelcm.Count -gt 0) {
        Write-Host "   Frais pour CELCM0001:" -ForegroundColor Cyan
        $fraisCelcm | ForEach-Object {
            Write-Host "   - Service: $($_.service), Type: $($_.typeCalcul), Montant: $($_.montantFrais)" -ForegroundColor Cyan
        }
    } else {
        Write-Host "   ⚠️ Aucun frais actif configuré pour CELCM0001" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Erreur lors de la recherche: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Résumé ===" -ForegroundColor Green
Write-Host "✅ Vérification de la configuration des frais" -ForegroundColor Green
Write-Host "✅ Recherche spécifique par service" -ForegroundColor Green
Write-Host "✅ Recherche par agence" -ForegroundColor Green

Write-Host "`n🎉 Vérification terminée !" -ForegroundColor Green 