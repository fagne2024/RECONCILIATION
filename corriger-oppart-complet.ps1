# Script pour corriger complètement le modèle OPPART
Write-Host "Correction complète du modèle OPPART..." -ForegroundColor Cyan
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
    Write-Host "Configuration actuelle (PROBLÉMATIQUE):" -ForegroundColor Yellow
    Write-Host "  - Partner Keys: $($oppartModel.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Gray
    Write-Host "  - BO Keys: $($oppartModel.reconciliationKeys.boKeys -join ', ')" -ForegroundColor Gray
    Write-Host "  - BO Models: $($oppartModel.reconciliationKeys.boModels -join ', ')" -ForegroundColor Gray
    Write-Host "  - BO Model Keys: $($oppartModel.reconciliationKeys.boModelKeys | ConvertTo-Json)" -ForegroundColor Gray
    
    # Créer une configuration SIMPLE et CORRECTE
    $updateData = @{
        name = "Oppart"
        filePattern = "*OPPART*.xls"
        fileType = "partner"
        reconciliationKeys = @{
            partnerKeys = @("Numero Trans GU")  # Clé partenaire CORRECTE
            boKeys = @("Numero Trans GU")       # Clé BO CORRECTE
            boModels = @()                      # AUCUN modèle BO spécifique
            boModelKeys = @{}                   # AUCUNE clé de modèle BO
            boTreatments = @{}                  # AUCUN traitement BO
        }
    }
    
    Write-Host ""
    Write-Host "Nouvelle configuration (CORRIGÉE):" -ForegroundColor Green
    Write-Host "  - Partner Keys: $($updateData.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Gray
    Write-Host "  - BO Keys: $($updateData.reconciliationKeys.boKeys -join ', ')" -ForegroundColor Gray
    Write-Host "  - BO Models: $($updateData.reconciliationKeys.boModels -join ', ')" -ForegroundColor Gray
    Write-Host "  - BO Model Keys: $($updateData.reconciliationKeys.boModelKeys | ConvertTo-Json)" -ForegroundColor Gray
    
    # Supprimer l'ancien modèle pour éviter les conflits
    Write-Host ""
    Write-Host "Suppression de l'ancien modèle..." -ForegroundColor Yellow
    $deleteResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$($oppartModel.id)" -Method DELETE
    Write-Host "✅ Ancien modèle supprimé" -ForegroundColor Green
    
    # Attendre un peu pour la synchronisation
    Start-Sleep -Seconds 2
    
    # Créer le nouveau modèle
    Write-Host ""
    Write-Host "Création du nouveau modèle..." -ForegroundColor Yellow
    $createResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method POST -Body ($updateData | ConvertTo-Json -Depth 4) -ContentType "application/json"
    Write-Host "✅ Nouveau modèle créé avec succès" -ForegroundColor Green
    
    # Vérification finale
    Write-Host ""
    Write-Host "Vérification finale:" -ForegroundColor Yellow
    
    $finalResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    $finalModels = $finalResponse.models
    $finalOppart = $finalModels | Where-Object { $_.name -like "*OPPART*" }
    
    if ($finalOppart) {
        Write-Host "Configuration finale:" -ForegroundColor Green
        Write-Host "  - OPPART Partner Keys: $($finalOppart.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Gray
        Write-Host "  - OPPART BO Keys: $($finalOppart.reconciliationKeys.boKeys -join ', ')" -ForegroundColor Gray
        Write-Host "  - OPPART BO Models: $($finalOppart.reconciliationKeys.boModels -join ', ')" -ForegroundColor Gray
        Write-Host "  - OPPART BO Model Keys: $($finalOppart.reconciliationKeys.boModelKeys | ConvertTo-Json)" -ForegroundColor Gray
        
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
                Write-Host "🎉 Le modèle OPPART est maintenant prêt pour la réconciliation automatique!" -ForegroundColor Green
            } else {
                Write-Host "❌ Correspondance incorrecte" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "❌ Le modèle OPPART n'a pas été trouvé après création" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}
