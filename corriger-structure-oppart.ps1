# Script pour corriger la structure complexe du modele OPPART
# Le probleme: OPPART a des boModels mais les boModelKeys sont vides

Write-Host "Correction de la structure complexe du modele OPPART..." -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    $models = $response.models
    
    # Trouver le modele OPPART
    $oppartModel = $models | Where-Object { $_.name -like "*OPPART*" }
    $trxboModel = $models | Where-Object { $_.name -like "*TRXBO*" -or $_.fileType -eq "bo" }
    
    if ($oppartModel -and $trxboModel) {
        Write-Host "Modele OPPART trouve: $($oppartModel.name)" -ForegroundColor Green
        Write-Host "Modele TRXBO trouve: $($trxboModel.name)" -ForegroundColor Green
        
        # Analyser la structure actuelle
        $rk = $oppartModel.reconciliationKeys
        Write-Host "Structure actuelle OPPART:" -ForegroundColor Yellow
        Write-Host "  - Partner Keys: $($rk.partnerKeys -join ', ')" -ForegroundColor Gray
        Write-Host "  - BO Models: $($rk.boModels -join ', ')" -ForegroundColor Gray
        Write-Host "  - BO Model Keys: $($rk.boModelKeys | ConvertTo-Json)" -ForegroundColor Gray
        
        # Le probleme: boModelKeys est vide pour le modele BO reference
        $boModelId = $rk.boModels[0]
        Write-Host "Modele BO reference: $boModelId" -ForegroundColor Yellow
        
        # Preparer la correction
        $updateData = @{
            name = $oppartModel.name
            filePattern = $oppartModel.filePattern
            fileType = $oppartModel.fileType
            reconciliationKeys = @{
                partnerKeys = @("Numero Trans GU")  # Cle partenaire
                boModels = @($trxboModel.id)  # Reference au modele TRXBO
                boModelKeys = @{
                    $trxboModel.id = @("Numero Trans GU")  # Cle BO pour le modele TRXBO
                }
                boKeys = $rk.boKeys
                boTreatments = $rk.boTreatments
            }
        }
        
        Write-Host "Correction appliquee:" -ForegroundColor Yellow
        Write-Host "  - Partner Keys: $($updateData.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Green
        Write-Host "  - BO Models: $($updateData.reconciliationKeys.boModels -join ', ')" -ForegroundColor Green
        Write-Host "  - BO Model Keys: $($updateData.reconciliationKeys.boModelKeys | ConvertTo-Json)" -ForegroundColor Green
        
        # Mettre a jour le modele
        try {
            $updateResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$($oppartModel.id)" -Method PUT -Body ($updateData | ConvertTo-Json -Depth 4) -ContentType "application/json"
            Write-Host "OK - Modele OPPART corrige avec la structure complexe" -ForegroundColor Green
        } catch {
            Write-Host "ERREUR - Correction du modele OPPART: $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "ERREUR - Modeles OPPART ou TRXBO non trouves" -ForegroundColor Red
    }
    
    # Verification finale
    Write-Host ""
    Write-Host "Verification finale:" -ForegroundColor Cyan
    
    $finalResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    $finalModels = $finalResponse.models
    
    $finalOppartModel = $finalModels | Where-Object { $_.name -like "*OPPART*" }
    $finalTrxboModel = $finalModels | Where-Object { $_.name -like "*TRXBO*" -or $_.fileType -eq "bo" }
    
    if ($finalOppartModel -and $finalTrxboModel) {
        $finalRk = $finalOppartModel.reconciliationKeys
        Write-Host ""
        Write-Host "Configuration finale OPPART:" -ForegroundColor Yellow
        Write-Host "  - Partner Keys: $($finalRk.partnerKeys -join ', ')" -ForegroundColor Green
        Write-Host "  - BO Models: $($finalRk.boModels -join ', ')" -ForegroundColor Green
        
        if ($finalRk.boModelKeys) {
            Write-Host "  - BO Model Keys:" -ForegroundColor Green
            foreach ($boModelId in $finalRk.boModelKeys.Keys) {
                $keys = $finalRk.boModelKeys[$boModelId]
                Write-Host "    * $boModelId`: $($keys -join ', ')" -ForegroundColor Green
            }
        }
        
        # Resume des correspondances
        Write-Host ""
        Write-Host "Resume des correspondances:" -ForegroundColor Cyan
        
        $trxboKey = $finalTrxboModel.reconciliationKeys.boKeys[0]
        $oppartKey = $finalRk.partnerKeys[0]
        Write-Host "TRXBO ↔ OPPART: $trxboKey ↔ $oppartKey" -ForegroundColor Green
        
        # Verifier si la structure est correcte
        $boModelId = $finalRk.boModels[0]
        $boModelKeys = $finalRk.boModelKeys[$boModelId]
        
        if ($boModelKeys -and $boModelKeys.Length -gt 0) {
            Write-Host "✅ Structure complexe correcte - boModelKeys configure" -ForegroundColor Green
        } else {
            Write-Host "❌ Structure complexe incorrecte - boModelKeys vide" -ForegroundColor Red
        }
    }
    
} catch {
    Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
}
