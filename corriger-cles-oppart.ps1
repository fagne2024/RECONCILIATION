# Script pour corriger les clés du modèle OPPART et supprimer la structure complexe

Write-Host "Correction des clés du modèle OPPART..." -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    $models = $response.models
    
    # Trouver le modele OPPART
    $oppartModel = $models | Where-Object { $_.name -like "*OPPART*" }
    $trxboModel = $models | Where-Object { $_.name -like "*TRXBO*" -or $_.fileType -eq "bo" }
    
    if ($oppartModel -and $trxboModel) {
        Write-Host "Modele OPPART trouve: $($oppartModel.name) (ID: $($oppartModel.id))" -ForegroundColor Green
        Write-Host "Modele TRXBO trouve: $($trxboModel.name) (ID: $($trxboModel.id))" -ForegroundColor Green
        
        # Analyser les clés actuelles
        $oppartRk = $oppartModel.reconciliationKeys
        $trxboRk = $trxboModel.reconciliationKeys
        
        Write-Host "Clés actuelles:" -ForegroundColor Yellow
        Write-Host "  - OPPART Partner Keys: $($oppartRk.partnerKeys -join ', ')" -ForegroundColor Gray
        Write-Host "  - OPPART BO Keys: $($oppartRk.boKeys -join ', ')" -ForegroundColor Gray
        Write-Host "  - TRXBO BO Keys: $($trxboRk.boKeys -join ', ')" -ForegroundColor Gray
        
        # Le problème: OPPART a "Num ro Trans GU" mais TRXBO a "Numero Trans GU"
        # Corriger pour que les deux utilisent "Numero Trans GU"
        
        $updateData = @{
            name = $oppartModel.name
            filePattern = $oppartModel.filePattern
            fileType = $oppartModel.fileType
            reconciliationKeys = @{
                partnerKeys = @("Numero Trans GU")  # Corriger: sans espaces
                boModels = @()  # Supprimer la structure complexe
                boModelKeys = @{}  # Supprimer la structure complexe
                boKeys = @()  # Pas de clés BO pour un modèle partenaire
                boTreatments = @{}
            }
        }
        
        Write-Host "Correction appliquée:" -ForegroundColor Yellow
        Write-Host "  - Partner Keys: $($updateData.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Green
        Write-Host "  - BO Models: (vide)" -ForegroundColor Green
        Write-Host "  - BO Model Keys: (vide)" -ForegroundColor Green
        
        # Mettre à jour le modèle
        try {
            $updateResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$($oppartModel.id)" -Method PUT -Body ($updateData | ConvertTo-Json -Depth 4) -ContentType "application/json"
            Write-Host "✅ Modele OPPART corrige avec succes" -ForegroundColor Green
        } catch {
            Write-Host "❌ ERREUR - Correction du modele OPPART: $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ ERREUR - Modeles OPPART ou TRXBO non trouves" -ForegroundColor Red
    }
    
    # Verification finale
    Write-Host ""
    Write-Host "Verification finale:" -ForegroundColor Cyan
    
    $finalResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    $finalModels = $finalResponse.models
    
    $finalOppartModel = $finalModels | Where-Object { $_.name -like "*OPPART*" }
    $finalTrxboModel = $finalModels | Where-Object { $_.name -like "*TRXBO*" -or $_.fileType -eq "bo" }
    
    if ($finalOppartModel -and $finalTrxboModel) {
        $finalOppartRk = $finalOppartModel.reconciliationKeys
        $finalTrxboRk = $finalTrxboModel.reconciliationKeys
        
        Write-Host ""
        Write-Host "Configuration finale:" -ForegroundColor Yellow
        Write-Host "  - OPPART Partner Keys: $($finalOppartRk.partnerKeys -join ', ')" -ForegroundColor Green
        Write-Host "  - TRXBO BO Keys: $($finalTrxboRk.boKeys -join ', ')" -ForegroundColor Green
        Write-Host "  - OPPART BO Models: $($finalOppartRk.boModels -join ', ')" -ForegroundColor Green
        Write-Host "  - OPPART BO Model Keys: $($finalOppartRk.boModelKeys | ConvertTo-Json)" -ForegroundColor Green
        
        # Resume des correspondances
        Write-Host ""
        Write-Host "Resume des correspondances:" -ForegroundColor Cyan
        
        $trxboKey = $finalTrxboRk.boKeys[0]
        $oppartKey = $finalOppartRk.partnerKeys[0]
        Write-Host "TRXBO ↔ OPPART: $trxboKey ↔ $oppartKey" -ForegroundColor Green
        
        # Verifier si la correspondance est correcte
        if ($oppartKey -eq $trxboKey) {
            Write-Host "✅ Correspondance parfaite!" -ForegroundColor Green
        } else {
            Write-Host "❌ Correspondance incorrecte" -ForegroundColor Red
        }
        
        # Verifier si la structure est simplifiee
        if ($finalOppartRk.boModels.Length -eq 0 -and $finalOppartRk.boModelKeys.Keys.Count -eq 0) {
            Write-Host "✅ Structure simplifiee correcte - boModels et boModelKeys vides" -ForegroundColor Green
        } else {
            Write-Host "❌ Structure encore complexe" -ForegroundColor Red
        }
    }
    
} catch {
    Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
}
