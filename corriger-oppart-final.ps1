# Script pour corriger la cle du modele OPPART
# OPPART doit avoir la cle "Numero Trans GU" (pas "Num bordereau")

Write-Host "Correction de la cle du modele OPPART..." -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    $models = $response.models
    
    # Trouver le modele OPPART
    $oppartModel = $models | Where-Object { $_.name -like "*OPPART*" }
    
    if ($oppartModel) {
        Write-Host "Modele OPPART trouve: $($oppartModel.name)" -ForegroundColor Green
        Write-Host "Cle actuelle: $($oppartModel.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Yellow
        
        # Verifier si la cle est differente
        $currentKey = $oppartModel.reconciliationKeys.partnerKeys[0]
        $expectedKey = "Numero Trans GU"
        
        if ($currentKey -ne $expectedKey) {
            Write-Host "Correction necessaire: $currentKey -> $expectedKey" -ForegroundColor Yellow
            
            # Preparer les donnees de mise a jour
            $updateData = @{
                name = $oppartModel.name
                filePattern = $oppartModel.filePattern
                fileType = $oppartModel.fileType
                reconciliationKeys = @{
                    partnerKeys = @($expectedKey)
                    boModels = $oppartModel.reconciliationKeys.boModels
                    boModelKeys = $oppartModel.reconciliationKeys.boModelKeys
                    boKeys = $oppartModel.reconciliationKeys.boKeys
                    boTreatments = $oppartModel.reconciliationKeys.boTreatments
                }
            }
            
            # Mettre a jour le modele
            try {
                $updateResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$($oppartModel.id)" -Method PUT -Body ($updateData | ConvertTo-Json -Depth 4) -ContentType "application/json"
                Write-Host "OK - Modele OPPART corrige avec la cle '$expectedKey'" -ForegroundColor Green
            } catch {
                Write-Host "ERREUR - Correction du modele OPPART: $($_.Exception.Message)" -ForegroundColor Red
            }
        } else {
            Write-Host "OK - Modele OPPART deja correct avec la cle '$expectedKey'" -ForegroundColor Green
        }
    } else {
        Write-Host "ERREUR - Modele OPPART non trouve" -ForegroundColor Red
    }
    
    # Verification finale
    Write-Host ""
    Write-Host "Verification finale:" -ForegroundColor Cyan
    
    $finalResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    $finalModels = $finalResponse.models
    
    $trxboModel = $finalModels | Where-Object { $_.name -like "*TRXBO*" -or $_.fileType -eq "bo" }
    $oppartModel = $finalModels | Where-Object { $_.name -like "*OPPART*" }
    $ussdpartModel = $finalModels | Where-Object { $_.name -like "*USSDPART*" }
    
    Write-Host ""
    Write-Host "Configuration finale des cles:" -ForegroundColor Yellow
    
    if ($trxboModel) {
        Write-Host "TRXBO: $($trxboModel.reconciliationKeys.boKeys -join ', ')" -ForegroundColor Green
    }
    
    if ($oppartModel) {
        Write-Host "OPPART: $($oppartModel.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Green
    }
    
    if ($ussdpartModel) {
        Write-Host "USSDPART: $($ussdpartModel.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Green
    }
    
    # Resume des correspondances
    Write-Host ""
    Write-Host "Resume des correspondances:" -ForegroundColor Cyan
    
    if ($trxboModel -and $oppartModel) {
        $trxboKey = $trxboModel.reconciliationKeys.boKeys[0]
        $oppartKey = $oppartModel.reconciliationKeys.partnerKeys[0]
        Write-Host "TRXBO ↔ OPPART: $trxboKey ↔ $oppartKey" -ForegroundColor Green
    }
    
    if ($trxboModel -and $ussdpartModel) {
        $trxboKey = $trxboModel.reconciliationKeys.boKeys[0]
        $ussdpartKey = $ussdpartModel.reconciliationKeys.partnerKeys[0]
        Write-Host "TRXBO ↔ USSDPART: $trxboKey ↔ $ussdpartKey" -ForegroundColor Green
    }
    
} catch {
    Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
}
