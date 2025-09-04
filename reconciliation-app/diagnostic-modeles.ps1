# Script de diagnostic et correction des modèles
Write-Host "🔍 Diagnostic des modèles de traitement automatique..." -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$API_BASE_URL = "http://localhost:8080/api"

try {
    # 1. Récupérer tous les modèles
    Write-Host "📋 Récupération de tous les modèles..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models" -Method GET
    $models = $response.models
    
    Write-Host "✅ $($models.Count) modèles trouvés" -ForegroundColor Green
    Write-Host ""
    
    # 2. Afficher le détail de chaque modèle
    foreach ($model in $models) {
        Write-Host "📋 Modèle: $($model.name)" -ForegroundColor White
        Write-Host "   ID: $($model.id)" -ForegroundColor Gray
        Write-Host "   Type: $($model.fileType)" -ForegroundColor Gray
        Write-Host "   Pattern: '$($model.filePattern)'" -ForegroundColor Gray
        Write-Host "   Auto-apply: $($model.autoApply)" -ForegroundColor Gray
        Write-Host "   Template: $($model.templateFile)" -ForegroundColor Gray
        
        # Vérifier les clés de réconciliation
        if ($model.reconciliationKeys) {
            Write-Host "   Clés partenaires: $($model.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Gray
            Write-Host "   Clés BO: $($model.reconciliationKeys.boKeys -join ', ')" -ForegroundColor Gray
        }
        Write-Host ""
    }
    
    # 3. Identifier les modèles avec des patterns manquants
    Write-Host "🔍 Recherche des modèles avec patterns manquants..." -ForegroundColor Yellow
    $modelsWithoutPattern = $models | Where-Object { -not $_.filePattern -or $_.filePattern -eq "" }
    
    if ($modelsWithoutPattern.Count -gt 0) {
        Write-Host "⚠️ $($modelsWithoutPattern.Count) modèle(s) sans pattern:" -ForegroundColor Red
        foreach ($model in $modelsWithoutPattern) {
            Write-Host "   - $($model.name) (ID: $($model.id))" -ForegroundColor Red
        }
        Write-Host ""
        
        # 4. Proposer des corrections
        Write-Host "🔧 Correction automatique des patterns..." -ForegroundColor Yellow
        foreach ($model in $modelsWithoutPattern) {
            $newPattern = ""
            
            if ($model.name -like "*CIOMCM*" -or $model.name -like "*Ciomcm*") {
                $newPattern = "*CIOMCM*.xls"
            }
            elseif ($model.name -like "*PMOMCM*" -or $model.name -like "*Pmomcm*") {
                $newPattern = "*PMOMCM*.xls"
            }
            elseif ($model.name -like "*TRXBO*" -or $model.name -like "*Transaction Back Office*") {
                $newPattern = "*TRXBO*.xls"
            }
            elseif ($model.name -like "*OPPART*" -or $model.name -like "*Oppart*") {
                $newPattern = "*OPPART*.(csv|xls|xlsx)"
            }
            elseif ($model.name -like "*USSDPART*" -or $model.name -like "*Ussdpart*") {
                $newPattern = "*USSDPART*.csv"
            }
            
            if ($newPattern) {
                Write-Host "🔄 Correction du modèle $($model.name) avec pattern: $newPattern" -ForegroundColor Yellow
                
                # Mettre à jour le modèle
                $model.filePattern = $newPattern
                
                try {
                    $updateResponse = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models/$($model.id)" -Method PUT -Body ($model | ConvertTo-Json -Depth 10) -ContentType "application/json"
                    Write-Host "✅ Modèle $($model.name) corrigé avec succès!" -ForegroundColor Green
                }
                catch {
                    Write-Host "❌ Erreur lors de la correction du modèle $($model.name): $($_.Exception.Message)" -ForegroundColor Red
                }
            }
            else {
                Write-Host "⚠️ Impossible de déterminer le pattern pour le modèle $($model.name)" -ForegroundColor Yellow
            }
        }
    }
    else {
        Write-Host "✅ Tous les modèles ont un pattern défini" -ForegroundColor Green
    }
    
    # 5. Vérification finale
    Write-Host ""
    Write-Host "🔍 Vérification finale..." -ForegroundColor Yellow
    $finalResponse = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models" -Method GET
    $finalModels = $finalResponse.models
    
    Write-Host "📋 État final des patterns:" -ForegroundColor White
    foreach ($model in $finalModels) {
        $status = if ($model.filePattern) { "✅" } else { "❌" }
        Write-Host "   $status $($model.name): '$($model.filePattern)'" -ForegroundColor $(if ($model.filePattern) { "Green" } else { "Red" })
    }
    
}
catch {
    Write-Host "❌ Erreur lors du diagnostic: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎯 Diagnostic terminé!" -ForegroundColor Cyan
