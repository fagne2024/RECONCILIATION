# Script pour forcer la mise à jour du cache des modèles
# Supprimer et recréer le modèle OPPART pour éviter les problèmes de cache

Write-Host "Forçage de la mise à jour du cache des modèles..." -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    $models = $response.models
    
    # Trouver le modele OPPART
    $oppartModel = $models | Where-Object { $_.name -like "*OPPART*" }
    
    if ($oppartModel) {
        Write-Host "Modele OPPART trouve: $($oppartModel.name) (ID: $($oppartModel.id))" -ForegroundColor Green
        
        # Sauvegarder les données du modèle
        $modelData = @{
            name = $oppartModel.name
            filePattern = $oppartModel.filePattern
            fileType = $oppartModel.fileType
            reconciliationKeys = @{
                partnerKeys = @("Numero Trans GU")
                boModels = @()
                boModelKeys = @{}
                boKeys = @()
                boTreatments = @{}
            }
        }
        
        Write-Host "Donnees du modele sauvegardees" -ForegroundColor Yellow
        
        # Supprimer le modèle existant
        try {
            $deleteResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$($oppartModel.id)" -Method DELETE
            Write-Host "OK - Modele OPPART supprime" -ForegroundColor Green
        } catch {
            Write-Host "ERREUR - Suppression du modele OPPART: $($_.Exception.Message)" -ForegroundColor Red
            return
        }
        
        # Attendre un peu pour que la suppression soit effective
        Start-Sleep -Seconds 2
        
        # Recréer le modèle avec la structure simplifiée
        try {
            $createResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method POST -Body ($modelData | ConvertTo-Json -Depth 4) -ContentType "application/json"
            Write-Host "OK - Modele OPPART recree avec la structure simplifiee" -ForegroundColor Green
            Write-Host "Nouvel ID: $($createResponse.id)" -ForegroundColor Green
        } catch {
            Write-Host "ERREUR - Recreation du modele OPPART: $($_.Exception.Message)" -ForegroundColor Red
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
        Write-Host "  - ID: $($finalOppartModel.id)" -ForegroundColor Green
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
            Write-Host "✅ Cache force a jour - Nouveau modele cree" -ForegroundColor Green
        } else {
            Write-Host "❌ Structure encore complexe" -ForegroundColor Red
        }
    }
    
} catch {
    Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
}
