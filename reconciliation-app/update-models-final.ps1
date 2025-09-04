# Script pour mettre à jour les modèles CIOMCM et PMOMCM
Write-Host "🔧 Mise à jour des modèles CIOMCM et PMOMCM..." -ForegroundColor Yellow

try {
    # Récupérer tous les modèles
    $models = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    
    # Chercher les modèles CIOMCM et PMOMCM
    $ciomcm = $models.models | Where-Object { $_.name -like "*CIOMCM*" -or $_.name -like "*Ciomcm*" }
    $pmomcm = $models.models | Where-Object { $_.name -like "*PMOMCM*" -or $_.name -like "*Pmomcm*" }
    
    if ($ciomcm) {
        Write-Host "🔍 Mise à jour du modèle CIOMCM: $($ciomcm.name)" -ForegroundColor Green
        Write-Host "   ID: $($ciomcm.id)" -ForegroundColor Cyan
        Write-Host "   Clés partenaires avant: $($ciomcm.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Yellow
        
        # Mettre à jour les clés partenaires
        $ciomcm.reconciliationKeys.partnerKeys = @("Référence")
        
        # Créer l'objet de mise à jour
        $updateData = @{
            name = $ciomcm.name
            filePattern = $ciomcm.filePattern
            fileType = $ciomcm.fileType
            autoApply = $ciomcm.autoApply
            templateFile = $ciomcm.templateFile
            reconciliationKeys = $ciomcm.reconciliationKeys
            columnProcessingRules = $ciomcm.columnProcessingRules
        }
        
        # Mettre à jour via l'API
        $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$($ciomcm.id)" -Method PUT -Body ($updateData | ConvertTo-Json -Depth 10) -ContentType "application/json"
        
        Write-Host "✅ CIOMCM: clé partenaire mise à jour vers 'Référence'" -ForegroundColor Green
    }
    
    if ($pmomcm) {
        Write-Host "🔍 Mise à jour du modèle PMOMCM: $($pmomcm.name)" -ForegroundColor Green
        Write-Host "   ID: $($pmomcm.id)" -ForegroundColor Cyan
        Write-Host "   Clés partenaires avant: $($pmomcm.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Yellow
        
        # Mettre à jour les clés partenaires
        $pmomcm.reconciliationKeys.partnerKeys = @("Référence")
        
        # Créer l'objet de mise à jour
        $updateData = @{
            name = $pmomcm.name
            filePattern = $pmomcm.filePattern
            fileType = $pmomcm.fileType
            autoApply = $pmomcm.autoApply
            templateFile = $pmomcm.templateFile
            reconciliationKeys = $pmomcm.reconciliationKeys
            columnProcessingRules = $pmomcm.columnProcessingRules
        }
        
        # Mettre à jour via l'API
        $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$($pmomcm.id)" -Method PUT -Body ($updateData | ConvertTo-Json -Depth 10) -ContentType "application/json"
        
        Write-Host "✅ PMOMCM: clé partenaire mise à jour vers 'Référence'" -ForegroundColor Green
    }
    
    Write-Host "🎉 Mise à jour terminée avec succès!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Erreur lors de la mise à jour: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "Détails: $($_.Exception.Response)" -ForegroundColor Red
    }
}
