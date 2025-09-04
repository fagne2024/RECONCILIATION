# Script pour corriger les clés des modèles CIOMCM et PMOMCM
# Utilise "Référence" comme clé partenaire

Write-Host "🔧 Correction des clés des modèles CIOMCM et PMOMCM..." -ForegroundColor Yellow

try {
    # Récupérer tous les modèles
    $models = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    
    Write-Host "📋 $($models.models.Count) modèles trouvés" -ForegroundColor Cyan
    
    # Chercher les modèles CIOMCM et PMOMCM
    $ciomcmModel = $models.models | Where-Object { $_.name -like "*CIOMCM*" -or $_.name -like "*Ciomcm*" }
    $pmomcmModel = $models.models | Where-Object { $_.name -like "*PMOMCM*" -or $_.name -like "*Pmomcm*" }
    
    if ($ciomcmModel) {
        Write-Host "🔍 Modèle CIOMCM trouvé: $($ciomcmModel.name)" -ForegroundColor Green
        Write-Host "   Clés partenaires actuelles: $($ciomcmModel.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Yellow
        
        # Mettre à jour les clés partenaires
        $ciomcmModel.reconciliationKeys.partnerKeys = @("Référence")
        
        # Mettre à jour le modèle
        $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$($ciomcmModel.id)" -Method PUT -Body ($ciomcmModel | ConvertTo-Json -Depth 10) -ContentType "application/json"
        
        Write-Host "✅ CIOMCM: clé partenaire corrigée vers 'Référence'" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Aucun modèle CIOMCM trouvé" -ForegroundColor Yellow
    }
    
    if ($pmomcmModel) {
        Write-Host "🔍 Modèle PMOMCM trouvé: $($pmomcmModel.name)" -ForegroundColor Green
        Write-Host "   Clés partenaires actuelles: $($pmomcmModel.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Yellow
        
        # Mettre à jour les clés partenaires
        $pmomcmModel.reconciliationKeys.partnerKeys = @("Référence")
        
        # Mettre à jour le modèle
        $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$($pmomcmModel.id)" -Method PUT -Body ($pmomcmModel | ConvertTo-Json -Depth 10) -ContentType "application/json"
        
        Write-Host "✅ PMOMCM: clé partenaire corrigée vers 'Référence'" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Aucun modèle PMOMCM trouvé" -ForegroundColor Yellow
    }
    
    Write-Host "🎉 Correction terminée avec succès!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Erreur lors de la correction: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "Détails: $($_.Exception.Response)" -ForegroundColor Red
    }
}
