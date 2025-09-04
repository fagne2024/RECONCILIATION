# Script pour recréer le modèle OPPART avec la bonne configuration

Write-Host "Recréation du modèle OPPART..." -ForegroundColor Cyan
Write-Host ""

try {
    # Vérifier l'état actuel des modèles
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    $models = $response.models
    
    Write-Host "Modeles actuels:" -ForegroundColor Yellow
    foreach ($model in $models) {
        Write-Host "  - $($model.name) (ID: $($model.id), Type: $($model.fileType))" -ForegroundColor Gray
    }
    
    # Vérifier si OPPART existe déjà
    $existingOppart = $models | Where-Object { $_.name -like "*OPPART*" }
    
    if ($existingOppart) {
        Write-Host "Modele OPPART existe deja: $($existingOppart.name) (ID: $($existingOppart.id))" -ForegroundColor Yellow
        $rk = $existingOppart.reconciliationKeys
        Write-Host "  - Partner Keys: $($rk.partnerKeys -join ', ')" -ForegroundColor Gray
        Write-Host "  - BO Models: $($rk.boModels -join ', ')" -ForegroundColor Gray
    } else {
        Write-Host "Modele OPPART non trouve, creation..." -ForegroundColor Yellow
        
        # Créer le modèle OPPART avec la structure simple
        $modelData = @{
            name = "Oppart"
            filePattern = "*OPPART*.xls"
            fileType = "partner"
            reconciliationKeys = @{
                partnerKeys = @("Numero Trans GU")
                boModels = @()
                boModelKeys = @{}
                boKeys = @()
                boTreatments = @{}
            }
        }
        
        try {
            $createResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method POST -Body ($modelData | ConvertTo-Json -Depth 4) -ContentType "application/json"
            Write-Host "✅ Modele OPPART cree avec succes (ID: $($createResponse.id))" -ForegroundColor Green
        } catch {
            Write-Host "❌ ERREUR - Creation du modele OPPART: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    # Vérification finale
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
        Write-Host "  - ID: $($finalOppartModel.id)" -ForegroundColor Green
        Write-Host "  - Partner Keys: $($finalRk.partnerKeys -join ', ')" -ForegroundColor Green
        Write-Host "  - BO Models: $($finalRk.boModels -join ', ')" -ForegroundColor Green
        Write-Host "  - BO Model Keys: $($finalRk.boModelKeys | ConvertTo-Json)" -ForegroundColor Green
        
        # Résumé des correspondances
        Write-Host ""
        Write-Host "Résumé des correspondances:" -ForegroundColor Cyan
        
        $trxboKey = $finalTrxboModel.reconciliationKeys.boKeys[0]
        $oppartKey = $finalRk.partnerKeys[0]
        Write-Host "TRXBO ↔ OPPART: $trxboKey ↔ $oppartKey" -ForegroundColor Green
        
        # Vérifier si la structure est simplifiée
        if ($finalRk.boModels.Length -eq 0 -and $finalRk.boModelKeys.Keys.Count -eq 0) {
            Write-Host "✅ Structure simplifiée correcte - boModels et boModelKeys vides" -ForegroundColor Green
        } else {
            Write-Host "❌ Structure encore complexe" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ ERREUR - Modeles OPPART ou TRXBO non trouves" -ForegroundColor Red
    }
    
} catch {
    Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
}
