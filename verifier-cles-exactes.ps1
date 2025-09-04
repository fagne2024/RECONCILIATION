# Script pour verifier les cles exactes configurees dans le modele OPPART

$API_BASE_URL = "http://localhost:8080/api"

Write-Host "=== VERIFICATION DES CLES EXACTES ===" -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models" -Method GET
    $models = $response.models
    
    $oppartModel = $models | Where-Object { $_.name -like "*OPPART*" }
    
    if ($oppartModel) {
        Write-Host "Modele OPPART trouve:" -ForegroundColor Green
        Write-Host "  Nom: $($oppartModel.name)" -ForegroundColor White
        Write-Host "  ID: $($oppartModel.id)" -ForegroundColor White
        
        if ($oppartModel.reconciliationKeys) {
            Write-Host ""
            Write-Host "Cles configurees (exactement):" -ForegroundColor Yellow
            
            $partnerKeys = $oppartModel.reconciliationKeys.partnerKeys
            $boKeys = $oppartModel.reconciliationKeys.boKeys
            
            Write-Host "  Partner Keys:" -ForegroundColor Cyan
            foreach ($key in $partnerKeys) {
                Write-Host "    - '$key' (longueur: $($key.Length))" -ForegroundColor White
                # Afficher les codes ASCII pour debug
                $asciiCodes = @()
                for ($i = 0; $i -lt $key.Length; $i++) {
                    $asciiCodes += [int][char]$key[$i]
                }
                Write-Host "      Codes ASCII: $($asciiCodes -join ', ')" -ForegroundColor Gray
            }
            
            Write-Host "  BO Keys:" -ForegroundColor Cyan
            foreach ($key in $boKeys) {
                Write-Host "    - '$key' (longueur: $($key.Length))" -ForegroundColor White
                # Afficher les codes ASCII pour debug
                $asciiCodes = @()
                for ($i = 0; $i -lt $key.Length; $i++) {
                    $asciiCodes += [int][char]$key[$i]
                }
                Write-Host "      Codes ASCII: $($asciiCodes -join ', ')" -ForegroundColor Gray
            }
            
            Write-Host ""
            Write-Host "Test de correspondance avec les donnees reelles:" -ForegroundColor Yellow
            
            # Simuler les colonnes reelles avec encodage incorrect
            $realColumns = @("NumÃ©ro Trans GU")
            
            Write-Host "  Colonnes reelles:" -ForegroundColor White
            foreach ($col in $realColumns) {
                Write-Host "    - '$col' (longueur: $($col.Length))" -ForegroundColor White
                $asciiCodes = @()
                for ($i = 0; $i -lt $col.Length; $i++) {
                    $asciiCodes += [int][char]$col[$i]
                }
                Write-Host "      Codes ASCII: $($asciiCodes -join ', ')" -ForegroundColor Gray
            }
            
            Write-Host ""
            Write-Host "Test de correspondance exacte:" -ForegroundColor Yellow
            foreach ($key in $partnerKeys) {
                foreach ($col in $realColumns) {
                    $match = $key -eq $col
                    Write-Host "  '$key' == '$col' = $match" -ForegroundColor $(if ($match) { "Green" } else { "Red" })
                }
            }
            
            Write-Host ""
            Write-Host "Test de correspondance apres correction d'encodage:" -ForegroundColor Yellow
            foreach ($key in $partnerKeys) {
                foreach ($col in $realColumns) {
                    $correctedCol = $col -replace 'Ã©', 'é'
                    $match = $key -eq $correctedCol
                    Write-Host "  '$key' == '$correctedCol' (corrige) = $match" -ForegroundColor $(if ($match) { "Green" } else { "Red" })
                }
            }
            
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
Write-Host "Verification terminee!" -ForegroundColor Cyan
