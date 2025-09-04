# Script pour corriger le modèle USSDPART
Write-Host "Correction du modèle USSDPART..." -ForegroundColor Cyan
Write-Host ""

try {
    # Récupérer tous les modèles
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    $models = $response.models
    
    # Trouver le modèle USSDPART
    $ussdpartModel = $models | Where-Object { $_.name -like "*USSDPART*" }
    if (-not $ussdpartModel) {
        Write-Host "❌ Modèle USSDPART non trouvé" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Modèle USSDPART trouvé: $($ussdpartModel.name) (ID: $($ussdpartModel.id))" -ForegroundColor Green
    
    # Afficher la configuration actuelle
    Write-Host "Configuration actuelle (PROBLÉMATIQUE):" -ForegroundColor Yellow
    Write-Host "  - Partner Keys: $($ussdpartModel.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Gray
    Write-Host "  - BO Keys: $($ussdpartModel.reconciliationKeys.boKeys -join ', ')" -ForegroundColor Gray
    Write-Host "  - BO Models: $($ussdpartModel.reconciliationKeys.boModels -join ', ')" -ForegroundColor Gray
    Write-Host "  - BO Model Keys: $($ussdpartModel.reconciliationKeys.boModelKeys | ConvertTo-Json)" -ForegroundColor Gray
    
    # Créer une configuration SIMPLE et CORRECTE
    $updateData = @{
        name = "Ussdpart"
        filePattern = "USSDPART.xls"
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
    $deleteResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$($ussdpartModel.id)" -Method DELETE
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
    $finalUssdpart = $finalModels | Where-Object { $_.name -like "*USSDPART*" }
    
    if ($finalUssdpart) {
        Write-Host "Configuration finale:" -ForegroundColor Green
        Write-Host "  - USSDPART Partner Keys: $($finalUssdpart.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Gray
        Write-Host "  - USSDPART BO Keys: $($finalUssdpart.reconciliationKeys.boKeys -join ', ')" -ForegroundColor Gray
        Write-Host "  - USSDPART BO Models: $($finalUssdpart.reconciliationKeys.boModels -join ', ')" -ForegroundColor Gray
        Write-Host "  - USSDPART BO Model Keys: $($finalUssdpart.reconciliationKeys.boModelKeys | ConvertTo-Json)" -ForegroundColor Gray
        
        # Vérifier la correspondance avec TRXBO
        $trxboModel = $finalModels | Where-Object { $_.name -like "*TRXBO*" -or $_.name -like "*Transaction*" }
        if ($trxboModel) {
            Write-Host "  - TRXBO BO Keys: $($trxboModel.reconciliationKeys.boKeys -join ', ')" -ForegroundColor Gray
            
            $ussdpartPartnerKey = $finalUssdpart.reconciliationKeys.partnerKeys[0]
            $ussdpartBoKey = $finalUssdpart.reconciliationKeys.boKeys[0]
            $trxboBoKey = $trxboModel.reconciliationKeys.boKeys[0]
            
            Write-Host ""
            Write-Host "Résumé des correspondances:" -ForegroundColor Yellow
            Write-Host "USSDPART Partner ↔ USSDPART BO: $ussdpartPartnerKey ↔ $ussdpartBoKey" -ForegroundColor Cyan
            Write-Host "USSDPART BO ↔ TRXBO BO: $ussdpartBoKey ↔ $trxboBoKey" -ForegroundColor Cyan
            
            if ($ussdpartPartnerKey -eq $ussdpartBoKey -and $ussdpartBoKey -eq $trxboBoKey) {
                Write-Host "✅ Correspondance parfaite!" -ForegroundColor Green
                Write-Host "🎉 Le modèle USSDPART est maintenant prêt pour la réconciliation automatique!" -ForegroundColor Green
            } else {
                Write-Host "❌ Correspondance incorrecte" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "❌ Le modèle USSDPART n'a pas été trouvé après création" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}
