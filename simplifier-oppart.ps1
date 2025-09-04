# Script pour simplifier la structure du modele OPPART
# Supprimer les boModels complexes et utiliser une structure simple

Write-Host "Simplification de la structure du modele OPPART..." -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    $models = $response.models
    
    # Trouver le modele OPPART
    $oppartModel = $models | Where-Object { $_.name -like "*OPPART*" }
    
    if ($oppartModel) {
        Write-Host "Modele OPPART trouve: $($oppartModel.name)" -ForegroundColor Green
        
        # Analyser la structure actuelle
        $rk = $oppartModel.reconciliationKeys
        Write-Host "Structure actuelle OPPART:" -ForegroundColor Yellow
        Write-Host "  - Partner Keys: $($rk.partnerKeys -join ', ')" -ForegroundColor Gray
        Write-Host "  - BO Models: $($rk.boModels -join ', ')" -ForegroundColor Gray
        Write-Host "  - BO Model Keys: $($rk.boModelKeys | ConvertTo-Json)" -ForegroundColor Gray
        
        # Simplifier la structure en supprimant les boModels complexes
        $updateData = @{
            name = $oppartModel.name
            filePattern = $oppartModel.filePattern
            fileType = $oppartModel.fileType
            reconciliationKeys = @{
                partnerKeys = @("Numero Trans GU")  # Cle partenaire simple
                boModels = @()  # Supprimer les boModels complexes
                boModelKeys = @{}  # Supprimer les boModelKeys
                boKeys = @()  # Pas de cles BO pour un modele partenaire
                boTreatments = @{}
            }
        }
        
        Write-Host "Structure simplifiee:" -ForegroundColor Yellow
        Write-Host "  - Partner Keys: $($updateData.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Green
        Write-Host "  - BO Models: (vide)" -ForegroundColor Green
        Write-Host "  - BO Model Keys: (vide)" -ForegroundColor Green
        
        # Mettre a jour le modele
        try {
            $updateResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$($oppartModel.id)" -Method PUT -Body ($updateData | ConvertTo-Json -Depth 4) -ContentType "application/json"
            Write-Host "OK - Modele OPPART simplifie avec succes" -ForegroundColor Green
        } catch {
            Write-Host "ERREUR - Simplification du modele OPPART: $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "ERREUR - Modele OPPART non trouve" -ForegroundColor Red
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
        Write-Host "  - BO Model Keys: $($finalRk.boModelKeys | ConvertTo-Json)" -ForegroundColor Green
        
        # Resume des correspondances
        Write-Host ""
        Write-Host "Resume des correspondances:" -ForegroundColor Cyan
        
        $trxboKey = $finalTrxboModel.reconciliationKeys.boKeys[0]
        $oppartKey = $finalRk.partnerKeys[0]
        Write-Host "TRXBO ↔ OPPART: $trxboKey ↔ $oppartKey" -ForegroundColor Green
        
        # Verifier si la structure est simplifiee
        if ($finalRk.boModels.Length -eq 0 -and $finalRk.boModelKeys.Keys.Count -eq 0) {
            Write-Host "✅ Structure simplifiee correcte - boModels et boModelKeys vides" -ForegroundColor Green
        } else {
            Write-Host "❌ Structure encore complexe" -ForegroundColor Red
        }
    }
    
} catch {
    Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
}
