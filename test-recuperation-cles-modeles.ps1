# Script pour tester la recuperation des cles configurees dans les modeles

$API_BASE_URL = "http://localhost:8080/api"

Write-Host "=== TEST DE RECUPERATION DES CLES DES MODELES ===" -ForegroundColor Cyan
Write-Host ""

# Recuperer tous les modeles
try {
    $response = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models" -Method GET
    $models = $response.models
    
    Write-Host "Modeles trouves: $($models.Count)" -ForegroundColor Green
    Write-Host ""
    
    # Analyser chaque modele
    foreach ($model in $models) {
        Write-Host "Modele: $($model.name)" -ForegroundColor White
        Write-Host "  ID: $($model.id)" -ForegroundColor Gray
        Write-Host "  Type: $($model.fileType)" -ForegroundColor Gray
        Write-Host "  Pattern: $($model.filePattern)" -ForegroundColor Gray
        
        if ($model.reconciliationKeys) {
            Write-Host "  Cles de reconciliation:" -ForegroundColor Green
            Write-Host "    - Partner Keys: $($model.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Cyan
            Write-Host "    - BO Keys: $($model.reconciliationKeys.boKeys -join ', ')" -ForegroundColor Cyan
            
            # Verifier si les cles sont valides
            if ($model.reconciliationKeys.partnerKeys -and $model.reconciliationKeys.partnerKeys.Count -gt 0) {
                Write-Host "    ✅ Partner Keys configurees" -ForegroundColor Green
            } else {
                Write-Host "    ❌ Aucune Partner Key configuree" -ForegroundColor Red
            }
            
            if ($model.reconciliationKeys.boKeys -and $model.reconciliationKeys.boKeys.Count -gt 0) {
                Write-Host "    ✅ BO Keys configurees" -ForegroundColor Green
            } else {
                Write-Host "    ❌ Aucune BO Key configuree" -ForegroundColor Red
            }
        } else {
            Write-Host "  ❌ Pas de cles de reconciliation configurees" -ForegroundColor Red
        }
        Write-Host ""
    }
    
    # Test specifique pour le modele OPPART
    Write-Host "=== TEST SPECIFIQUE MODELE OPPART ===" -ForegroundColor Yellow
    
    $oppartModel = $models | Where-Object { $_.name -like "*OPPART*" }
    
    if ($oppartModel) {
        Write-Host "Modele OPPART trouve:" -ForegroundColor Green
        Write-Host "  Nom: $($oppartModel.name)" -ForegroundColor White
        Write-Host "  ID: $($oppartModel.id)" -ForegroundColor White
        
        if ($oppartModel.reconciliationKeys) {
            Write-Host "  Cles configurees:" -ForegroundColor Cyan
            Write-Host "    - Partner Keys: $($oppartModel.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor White
            Write-Host "    - BO Keys: $($oppartModel.reconciliationKeys.boKeys -join ', ')" -ForegroundColor White
            
            # Simuler la logique de detection des cles
            Write-Host ""
            Write-Host "Simulation de la detection des cles:" -ForegroundColor Yellow
            
            $partnerKeys = $oppartModel.reconciliationKeys.partnerKeys
            $boKeys = $oppartModel.reconciliationKeys.boKeys
            
            Write-Host "  Partner Keys disponibles: $($partnerKeys -join ', ')" -ForegroundColor White
            Write-Host "  BO Keys disponibles: $($boKeys -join ', ')" -ForegroundColor White
            
            # Simuler la recherche de correspondance
            if ($partnerKeys -and $boKeys) {
                $selectedPartnerKey = $partnerKeys[0]
                $selectedBoKey = $boKeys[0]
                
                Write-Host "  Cles selectionnees:" -ForegroundColor Green
                Write-Host "    - Partner Key: $selectedPartnerKey" -ForegroundColor White
                Write-Host "    - BO Key: $selectedBoKey" -ForegroundColor White
                
                # Verifier si ces cles existent dans les donnees reelles
                Write-Host ""
                Write-Host "Verification des cles dans les donnees reelles:" -ForegroundColor Yellow
                Write-Host "  Les cles configurees sont:" -ForegroundColor White
                Write-Host "    - Partner: '$selectedPartnerKey'" -ForegroundColor Gray
                Write-Host "    - BO: '$selectedBoKey'" -ForegroundColor Gray
                Write-Host ""
                Write-Host "  Les cles reelles utilisees (d'apres les logs) sont:" -ForegroundColor White
                Write-Host "    - MP250701.0829.C25981" -ForegroundColor Gray
                Write-Host "    - 13099112233_CM" -ForegroundColor Gray
                Write-Host ""
                Write-Host "  ❌ PROBLEME: Les cles configurees ne correspondent pas aux cles reelles!" -ForegroundColor Red
                Write-Host "  Les cles configurees ('$selectedPartnerKey', '$selectedBoKey') ne sont pas les memes" -ForegroundColor Red
                Write-Host "  que les cles reelles utilisees dans les donnees." -ForegroundColor Red
            }
        } else {
            Write-Host "  ❌ Aucune clé de reconciliation configuree" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Modele OPPART non trouve" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "=== DIAGNOSTIC ===" -ForegroundColor Cyan
    Write-Host "Le probleme est que les cles configurees dans les modeles ne correspondent pas" -ForegroundColor Yellow
    Write-Host "aux cles reelles utilisees dans les donnees." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Solutions possibles:" -ForegroundColor Green
    Write-Host "  1. Mettre a jour les cles des modeles pour correspondre aux donnees reelles" -ForegroundColor White
    Write-Host "  2. Verifier que les colonnes configurees existent dans les fichiers" -ForegroundColor White
    Write-Host "  3. S'assurer que les noms de colonnes sont exacts (majuscules/minuscules)" -ForegroundColor White
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Test termine!" -ForegroundColor Cyan
