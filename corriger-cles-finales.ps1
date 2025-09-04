# Script pour corriger les cles finales selon les specifications exactes
# TRXBO: Numero Trans GU
# OPPART: Numero trans GU  
# USSDPART: token

Write-Host "Correction des cles finales selon les specifications..." -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    $models = $response.models
    
    # Configuration des cles exactes
    $exactKeys = @{
        "Transaction Back Office" = @{
            boKeys = @("Numero Trans GU")
            partnerKeys = @()
        }
        "Oppart" = @{
            boKeys = @()
            partnerKeys = @("Numero trans GU")
        }
        "Ussdpart" = @{
            boKeys = @()
            partnerKeys = @("token")
        }
    }
    
    foreach ($model in $models) {
        if ($exactKeys.ContainsKey($model.name)) {
            $config = $exactKeys[$model.name]
            $currentRk = $model.reconciliationKeys
            
            # Verifier si les cles sont differentes
            $needsUpdate = $false
            
            if ($config.boKeys -and ($currentRk.boKeys -join ',') -ne ($config.boKeys -join ',')) {
                Write-Host "Correction BO Keys pour '$($model.name)': $($currentRk.boKeys -join ', ') -> $($config.boKeys -join ', ')" -ForegroundColor Yellow
                $needsUpdate = $true
            }
            
            if ($config.partnerKeys -and ($currentRk.partnerKeys -join ',') -ne ($config.partnerKeys -join ',')) {
                Write-Host "Correction Partner Keys pour '$($model.name)': $($currentRk.partnerKeys -join ', ') -> $($config.partnerKeys -join ', ')" -ForegroundColor Yellow
                $needsUpdate = $true
            }
            
            if ($needsUpdate) {
                $updateData = @{
                    name = $model.name
                    filePattern = $model.filePattern
                    fileType = $model.fileType
                    reconciliationKeys = @{
                        partnerKeys = $config.partnerKeys
                        boModels = $currentRk.boModels
                        boModelKeys = $currentRk.boModelKeys
                        boKeys = $config.boKeys
                        boTreatments = $currentRk.boTreatments
                    }
                }
                
                try {
                    $updateResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$($model.id)" -Method PUT -Body ($updateData | ConvertTo-Json -Depth 4) -ContentType "application/json"
                    Write-Host "OK - Modele '$($model.name)' corrige avec les cles exactes" -ForegroundColor Green
                } catch {
                    Write-Host "ERREUR - Correction du modele '$($model.name)': $($_.Exception.Message)" -ForegroundColor Red
                }
            } else {
                Write-Host "OK - Modele '$($model.name)' deja correct" -ForegroundColor Green
            }
        }
    }
    
    # Verification finale
    Write-Host ""
    Write-Host "Verification finale des cles exactes:" -ForegroundColor Cyan
    
    $finalResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    $finalModels = $finalResponse.models
    
    foreach ($model in $finalModels) {
        if ($exactKeys.ContainsKey($model.name)) {
            $config = $exactKeys[$model.name]
            $rk = $model.reconciliationKeys
            
            Write-Host ""
            Write-Host "Modele: $($model.name)" -ForegroundColor Yellow
            Write-Host "  - Partner Keys: $($rk.partnerKeys -join ', ')" -ForegroundColor Green
            Write-Host "  - BO Keys: $($rk.boKeys -join ', ')" -ForegroundColor Green
            
            # Verifier si les cles correspondent exactement
            $boKeysMatch = ($rk.boKeys -join ',') -eq ($config.boKeys -join ',')
            $partnerKeysMatch = ($rk.partnerKeys -join ',') -eq ($config.partnerKeys -join ',')
            
            if ($boKeysMatch -and $partnerKeysMatch) {
                Write-Host "  - Status: OK - Cles exactes" -ForegroundColor Green
            } else {
                Write-Host "  - Status: ERREUR - Cles incorrectes" -ForegroundColor Red
            }
        }
    }
    
    # Resume des correspondances
    Write-Host ""
    Write-Host "Resume des correspondances finales:" -ForegroundColor Cyan
    
    $trxboModel = $finalModels | Where-Object { $_.name -eq "Transaction Back Office" }
    $oppartModel = $finalModels | Where-Object { $_.name -eq "Oppart" }
    $ussdpartModel = $finalModels | Where-Object { $_.name -eq "Ussdpart" }
    
    if ($trxboModel -and $oppartModel) {
        Write-Host "OK - TRXBO ↔ OPPART: $($trxboModel.reconciliationKeys.boKeys[0]) ↔ $($oppartModel.reconciliationKeys.partnerKeys[0])" -ForegroundColor Green
    }
    
    if ($trxboModel -and $ussdpartModel) {
        Write-Host "OK - TRXBO ↔ USSDPART: $($trxboModel.reconciliationKeys.boKeys[0]) ↔ $($ussdpartModel.reconciliationKeys.partnerKeys[0])" -ForegroundColor Green
    }
    
} catch {
    Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
}
