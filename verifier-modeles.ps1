# Script simple pour verifier l'etat des modeles
Write-Host "Verification de l'etat des modeles..." -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    $models = $response.models
    
    Write-Host "Modeles trouves: $($models.Length)" -ForegroundColor Green
    Write-Host ""
    
    foreach ($model in $models) {
        Write-Host "Modele: $($model.name)" -ForegroundColor Yellow
        Write-Host "  - Type: $($model.fileType)" -ForegroundColor Gray
        Write-Host "  - Pattern: $($model.filePattern)" -ForegroundColor Gray
        
        $rk = $model.reconciliationKeys
        Write-Host "  - Partner Keys: $($rk.partnerKeys -join ', ')" -ForegroundColor Green
        Write-Host "  - BO Keys: $($rk.boKeys -join ', ')" -ForegroundColor Green
        Write-Host ""
    }
    
    # Verifier les correspondances
    Write-Host "Verification des correspondances:" -ForegroundColor Cyan
    
    $trxboModel = $models | Where-Object { $_.name -like "*TRXBO*" -or $_.fileType -eq "bo" }
    $oppartModel = $models | Where-Object { $_.name -like "*OPPART*" }
    $ussdpartModel = $models | Where-Object { $_.name -like "*USSDPART*" }
    
    if ($trxboModel -and $oppartModel) {
        Write-Host "OK - TRXBO ↔ OPPART: $($trxboModel.reconciliationKeys.boKeys[0]) ↔ $($oppartModel.reconciliationKeys.partnerKeys[0])" -ForegroundColor Green
    } else {
        Write-Host "ERREUR - TRXBO ↔ OPPART: Modeles manquants" -ForegroundColor Red
    }
    
    if ($trxboModel -and $ussdpartModel) {
        Write-Host "OK - TRXBO ↔ USSDPART: $($trxboModel.reconciliationKeys.boKeys[0]) ↔ $($ussdpartModel.reconciliationKeys.partnerKeys[0])" -ForegroundColor Green
    } else {
        Write-Host "ERREUR - TRXBO ↔ USSDPART: Modeles manquants" -ForegroundColor Red
    }
    
} catch {
    Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
}
