# Script simple pour corriger les patterns des modèles CIOMCM et PMOMCM
Write-Host "🔧 Correction directe des patterns CIOMCM et PMOMCM..." -ForegroundColor Cyan

$API_BASE_URL = "http://localhost:8080/api"

try {
    # Récupérer tous les modèles
    $response = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models" -Method GET
    $models = $response.models
    
    Write-Host "📋 $($models.Count) modèles trouvés" -ForegroundColor Green
    
    # Chercher les modèles CIOMCM et PMOMCM
    $ciomcmModel = $models | Where-Object { $_.name -like "*CIOMCM*" -or $_.name -like "*Ciomcm*" } | Select-Object -First 1
    $pmomcmModel = $models | Where-Object { $_.name -like "*PMOMCM*" -or $_.name -like "*Pmomcm*" } | Select-Object -First 1
    
    # Corriger le modèle CIOMCM
    if ($ciomcmModel) {
        Write-Host "🔄 Correction du modèle CIOMCM: $($ciomcmModel.name)" -ForegroundColor Yellow
        Write-Host "   ID: $($ciomcmModel.id)" -ForegroundColor Gray
        Write-Host "   Pattern actuel: '$($ciomcmModel.filePattern)'" -ForegroundColor Gray
        
        $ciomcmModel.filePattern = "*CIOMCM*.xls"
        
        $updateResponse = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models/$($ciomcmModel.id)" -Method PUT -Body ($ciomcmModel | ConvertTo-Json -Depth 10) -ContentType "application/json"
        Write-Host "✅ Modèle CIOMCM corrigé avec pattern: *CIOMCM*.xls" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Modèle CIOMCM non trouvé" -ForegroundColor Yellow
    }
    
    # Corriger le modèle PMOMCM
    if ($pmomcmModel) {
        Write-Host "🔄 Correction du modèle PMOMCM: $($pmomcmModel.name)" -ForegroundColor Yellow
        Write-Host "   ID: $($pmomcmModel.id)" -ForegroundColor Gray
        Write-Host "   Pattern actuel: '$($pmomcmModel.filePattern)'" -ForegroundColor Gray
        
        $pmomcmModel.filePattern = "*PMOMCM*.xls"
        
        $updateResponse = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models/$($pmomcmModel.id)" -Method PUT -Body ($pmomcmModel | ConvertTo-Json -Depth 10) -ContentType "application/json"
        Write-Host "✅ Modèle PMOMCM corrigé avec pattern: *PMOMCM*.xls" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Modèle PMOMCM non trouvé" -ForegroundColor Yellow
    }
    
    # Vérification finale
    Write-Host ""
    Write-Host "🔍 Vérification finale..." -ForegroundColor Yellow
    $finalResponse = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models" -Method GET
    $finalModels = $finalResponse.models
    
    foreach ($model in $finalModels) {
        if ($model.name -like "*CIOMCM*" -or $model.name -like "*PMOMCM*") {
            Write-Host "📋 $($model.name): '$($model.filePattern)'" -ForegroundColor $(if ($model.filePattern) { "Green" } else { "Red" })
        }
    }
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎯 Correction terminée!" -ForegroundColor Cyan
