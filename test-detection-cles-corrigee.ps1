# Script simple pour tester la detection des cles avec correction d'encodage

$API_BASE_URL = "http://localhost:8080/api"

Write-Host "=== TEST DETECTION CLES AVEC CORRECTION ENCODAGE ===" -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models" -Method GET
    $models = $response.models
    
    $oppartModel = $models | Where-Object { $_.name -like "*OPPART*" }
    
    if ($oppartModel) {
        Write-Host "Modele OPPART trouve:" -ForegroundColor Green
        Write-Host "  Nom: $($oppartModel.name)" -ForegroundColor White
        
        if ($oppartModel.reconciliationKeys) {
            $partnerKeys = $oppartModel.reconciliationKeys.partnerKeys
            $boKeys = $oppartModel.reconciliationKeys.boKeys
            
            Write-Host "  Cles configurees:" -ForegroundColor Cyan
            Write-Host "    - Partner Keys: $($partnerKeys -join ', ')" -ForegroundColor White
            Write-Host "    - BO Keys: $($boKeys -join ', ')" -ForegroundColor White
            
            Write-Host ""
            Write-Host "Test de correspondance avec donnees reelles:" -ForegroundColor Yellow
            
            # Simuler les colonnes reelles avec encodage incorrect
            $realColumns = @("NumÃ©ro Trans GU")
            
            Write-Host "  Colonnes reelles: $($realColumns -join ', ')" -ForegroundColor White
            
            # Test de correspondance exacte
            foreach ($key in $partnerKeys) {
                foreach ($col in $realColumns) {
                    $exactMatch = $key -eq $col
                    Write-Host "  Correspondance exacte: '$key' == '$col' = $exactMatch" -ForegroundColor $(if ($exactMatch) { "Green" } else { "Red" })
                    
                    # Test avec correction d'encodage
                    $correctedCol = $col -replace 'Ã©', 'é'
                    $correctedMatch = $key -eq $correctedCol
                    Write-Host "  Avec correction: '$key' == '$correctedCol' = $correctedMatch" -ForegroundColor $(if ($correctedMatch) { "Green" } else { "Red" })
                }
            }
            
            Write-Host ""
            Write-Host "=== CONCLUSION ===" -ForegroundColor Cyan
            Write-Host "La correction d'encodage dans le frontend devrait permettre" -ForegroundColor White
            Write-Host "de retrouver les cles configurees dans les modeles." -ForegroundColor White
            
        } else {
            Write-Host "❌ Aucune clé de reconciliation configuree" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Modele OPPART non trouve" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Test termine!" -ForegroundColor Cyan
