# Script pour corriger les clés du modèle OPPART - Version finale
Write-Host "Correction finale des clés du modèle OPPART..." -ForegroundColor Cyan
Write-Host ""

try {
    # Récupérer tous les modèles
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    $models = $response.models
    
    # Trouver le modèle OPPART
    $oppartModel = $models | Where-Object { $_.name -like "*OPPART*" }
    if (-not $oppartModel) {
        Write-Host "❌ Modèle OPPART non trouvé" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Modèle OPPART trouvé: $($oppartModel.name) (ID: $($oppartModel.id))" -ForegroundColor Green
    
    # Afficher la configuration actuelle
    Write-Host "Configuration actuelle:" -ForegroundColor Yellow
    Write-Host "  - Partner Keys: $($oppartModel.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Gray
    Write-Host "  - BO Keys: $($oppartModel.reconciliationKeys.boKeys -join ', ')" -ForegroundColor Gray
    Write-Host "  - BO Models: $($oppartModel.reconciliationKeys.boModels -join ', ')" -ForegroundColor Gray
    Write-Host "  - BO Model Keys: $($oppartModel.reconciliationKeys.boModelKeys | ConvertTo-Json)" -ForegroundColor Gray
    
    # Créer la nouvelle configuration avec les clés BO
    $updateData = @{
        name = $oppartModel.name
        filePattern = $oppartModel.filePattern
        fileType = $oppartModel.fileType
        reconciliationKeys = @{
            partnerKeys = @("Numero Trans GU")  # Clé partenaire
            boKeys = @("Numero Trans GU")       # Clé BO (AJOUTÉE)
            boModels = @()                      # Pas de modèles BO spécifiques
            boModelKeys = @{}                   # Pas de clés de modèles BO
            boTreatments = @{}                  # Pas de traitements BO
        }
    }
    
    Write-Host ""
    Write-Host "Nouvelle configuration:" -ForegroundColor Yellow
    Write-Host "  - Partner Keys: $($updateData.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Gray
    Write-Host "  - BO Keys: $($updateData.reconciliationKeys.boKeys -join ', ')" -ForegroundColor Gray
    Write-Host "  - BO Models: $($updateData.reconciliationKeys.boModels -join ', ')" -ForegroundColor Gray
    Write-Host "  - BO Model Keys: $($updateData.reconciliationKeys.boModelKeys | ConvertTo-Json)" -ForegroundColor Gray
    
    # Mettre à jour le modèle
    Write-Host ""
    Write-Host "Mise à jour du modèle..." -ForegroundColor Yellow
    $updateResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$($oppartModel.id)" -Method PUT -Body ($updateData | ConvertTo-Json -Depth 4) -ContentType "application/json"
    
    Write-Host "✅ Modèle OPPART mis à jour avec succès" -ForegroundColor Green
    
    # Vérification finale
    Write-Host ""
    Write-Host "Vérification finale:" -ForegroundColor Yellow
    
    $finalResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    $finalModels = $finalResponse.models
    $finalOppart = $finalModels | Where-Object { $_.name -like "*OPPART*" }
    
    Write-Host "Configuration finale:" -ForegroundColor Green
    Write-Host "  - OPPART Partner Keys: $($finalOppart.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Gray
    Write-Host "  - OPPART BO Keys: $($finalOppart.reconciliationKeys.boKeys -join ', ')" -ForegroundColor Gray
    
    # Vérifier la correspondance avec TRXBO
    $trxboModel = $finalModels | Where-Object { $_.name -like "*TRXBO*" -or $_.name -like "*Transaction*" }
    if ($trxboModel) {
        Write-Host "  - TRXBO BO Keys: $($trxboModel.reconciliationKeys.boKeys -join ', ')" -ForegroundColor Gray
        
        $oppartPartnerKey = $finalOppart.reconciliationKeys.partnerKeys[0]
        $oppartBoKey = $finalOppart.reconciliationKeys.boKeys[0]
        $trxboBoKey = $trxboModel.reconciliationKeys.boKeys[0]
        
        Write-Host ""
        Write-Host "Résumé des correspondances:" -ForegroundColor Yellow
        Write-Host "OPPART Partner ↔ OPPART BO: $oppartPartnerKey ↔ $oppartBoKey" -ForegroundColor Cyan
        Write-Host "OPPART BO ↔ TRXBO BO: $oppartBoKey ↔ $trxboBoKey" -ForegroundColor Cyan
        
        if ($oppartPartnerKey -eq $oppartBoKey -and $oppartBoKey -eq $trxboBoKey) {
            Write-Host "✅ Correspondance parfaite!" -ForegroundColor Green
        } else {
            Write-Host "❌ Correspondance incorrecte" -ForegroundColor Red
        }
    }
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}
