# Script final pour tester la recuperation des cles avec correction d'encodage

$API_BASE_URL = "http://localhost:8080/api"

Write-Host "=== TEST FINAL DE RECUPERATION DES CLES ===" -ForegroundColor Cyan
Write-Host ""

# Attendre que le backend soit demarre
Write-Host "Attente du demarrage du backend..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

try {
    $response = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models" -Method GET
    $models = $response.models
    
    Write-Host "✅ Backend demarre - Modeles trouves: $($models.Count)" -ForegroundColor Green
    Write-Host ""
    
    # Trouver le modele OPPART
    $oppartModel = $models | Where-Object { $_.name -like "*OPPART*" }
    
    if ($oppartModel) {
        Write-Host "Modele OPPART trouve:" -ForegroundColor Green
        Write-Host "  Nom: $($oppartModel.name)" -ForegroundColor White
        Write-Host "  ID: $($oppartModel.id)" -ForegroundColor White
        
        if ($oppartModel.reconciliationKeys) {
            Write-Host ""
            Write-Host "Cles configurees dans le modele:" -ForegroundColor Cyan
            Write-Host "  - Partner Keys: $($oppartModel.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor White
            Write-Host "  - BO Keys: $($oppartModel.reconciliationKeys.boKeys -join ', ')" -ForegroundColor White
            
            Write-Host ""
            Write-Host "=== SIMULATION DE LA DETECTION AVEC CORRECTION ENCODAGE ===" -ForegroundColor Yellow
            
            # Simuler les donnees reelles avec encodage incorrect
            $boData = @(
                @{
                    "NumÃƒÂ©ro Trans GU" = "MP250701.0829.C25981"  # Double encodage
                    "montant" = "1000"
                    "Date" = "2024-01-15"
                }
            )
            
            $partnerData = @(
                @{
                    "NumÃƒÂ©ro Trans GU" = "MP250701.0829.C25981"  # Double encodage
                    "Amount" = "1000"
                    "Date" = "2024-01-15"
                }
            )
            
            Write-Host "Donnees de test avec encodage incorrect:" -ForegroundColor White
            Write-Host "  Colonnes BO: $($boData[0].Keys -join ', ')" -ForegroundColor Gray
            Write-Host "  Colonnes Partner: $($partnerData[0].Keys -join ', ')" -ForegroundColor Gray
            
            Write-Host ""
            Write-Host "Simulation de la correction d'encodage:" -ForegroundColor Yellow
            
            # Simuler la correction d'encodage (comme dans le frontend)
            $correctedBoColumns = @()
            foreach ($col in $boData[0].Keys) {
                $corrected = $col -replace 'ÃƒÂ©', 'é' -replace 'ÃƒÂ¨', 'è' -replace 'ÃƒÂ ', 'à'
                $correctedBoColumns += $corrected
                Write-Host "  '$col' -> '$corrected'" -ForegroundColor Gray
            }
            
            $correctedPartnerColumns = @()
            foreach ($col in $partnerData[0].Keys) {
                $corrected = $col -replace 'ÃƒÂ©', 'é' -replace 'ÃƒÂ¨', 'è' -replace 'ÃƒÂ ', 'à'
                $correctedPartnerColumns += $corrected
                Write-Host "  '$col' -> '$corrected'" -ForegroundColor Gray
            }
            
            Write-Host ""
            Write-Host "Colonnes corrigees:" -ForegroundColor Green
            Write-Host "  BO: $($correctedBoColumns -join ', ')" -ForegroundColor White
            Write-Host "  Partner: $($correctedPartnerColumns -join ', ')" -ForegroundColor White
            
            Write-Host ""
            Write-Host "Test de correspondance avec les cles configurees:" -ForegroundColor Yellow
            
            $partnerKeys = $oppartModel.reconciliationKeys.partnerKeys
            $boKeys = $oppartModel.reconciliationKeys.boKeys
            
            $boKeyFound = $false
            $partnerKeyFound = $false
            
            # Test pour les cles BO
            foreach ($key in $boKeys) {
                if ($correctedBoColumns -contains $key) {
                    Write-Host "  ✅ BO Key trouvee: '$key'" -ForegroundColor Green
                    $boKeyFound = $true
                    break
                }
            }
            
            if (-not $boKeyFound) {
                Write-Host "  ❌ Aucune BO Key trouvee" -ForegroundColor Red
            }
            
            # Test pour les cles Partner
            foreach ($key in $partnerKeys) {
                if ($correctedPartnerColumns -contains $key) {
                    Write-Host "  ✅ Partner Key trouvee: '$key'" -ForegroundColor Green
                    $partnerKeyFound = $true
                    break
                }
            }
            
            if (-not $partnerKeyFound) {
                Write-Host "  ❌ Aucune Partner Key trouvee" -ForegroundColor Red
            }
            
            Write-Host ""
            Write-Host "=== RESULTAT FINAL ===" -ForegroundColor Cyan
            
            if ($boKeyFound -and $partnerKeyFound) {
                Write-Host "✅ SUCCES: Les cles configurees sont maintenant correctement recuperees!" -ForegroundColor Green
                Write-Host "La correction d'encodage fonctionne et permet de retrouver" -ForegroundColor White
                Write-Host "les cles configurees dans les modeles." -ForegroundColor White
            } else {
                Write-Host "❌ ECHEC: Les cles ne sont toujours pas recuperees" -ForegroundColor Red
                Write-Host "Il faut verifier la correction d'encodage dans le frontend." -ForegroundColor Yellow
            }
            
        } else {
            Write-Host "❌ Aucune clé de reconciliation configuree" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Modele OPPART non trouve" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Le backend n'est peut-etre pas encore demarre." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Test termine!" -ForegroundColor Cyan
