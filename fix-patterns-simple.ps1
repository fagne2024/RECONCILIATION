Write-Host "🔧 CORRECTION DES PATTERNS" -ForegroundColor Cyan

# Récupérer les modèles
$response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
$models = $response.models

Write-Host "📋 Modèles trouvés: $($models.Count)" -ForegroundColor White

# Afficher les modèles OPPART
$oppartModels = $models | Where-Object { $_.name -like "*OPPART*" }
Write-Host "🔍 Modèles OPPART: $($oppartModels.Count)" -ForegroundColor Yellow

foreach ($model in $oppartModels) {
    Write-Host "  - ID: $($model.id), Pattern: $($model.filePattern)" -ForegroundColor Gray
}

# Corriger le pattern OPPART
if ($oppartModels.Count -gt 0) {
    $oppartModel = $oppartModels[0]
    Write-Host "`n🔧 Correction du modèle OPPART (ID: $($oppartModel.id))" -ForegroundColor Yellow
    
    $updateData = @{
        name = $oppartModel.name
        filePattern = "*OPPART*.csv"
        fileType = $oppartModel.fileType
        autoApply = $oppartModel.autoApply
        templateFile = $oppartModel.templateFile
        reconciliationKeys = $oppartModel.reconciliationKeys
    }
    
    try {
        $updateResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$($oppartModel.id)" -Method PUT -Body ($updateData | ConvertTo-Json -Depth 10) -ContentType "application/json"
        Write-Host "✅ Pattern corrigé: *OPPART*.csv" -ForegroundColor Green
    } catch {
        Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Afficher les modèles TRXBO
$trxboModels = $models | Where-Object { $_.name -like "*TRXBO*" }
Write-Host "`n🔍 Modèles TRXBO: $($trxboModels.Count)" -ForegroundColor Yellow

foreach ($model in $trxboModels) {
    Write-Host "  - ID: $($model.id), Pattern: $($model.filePattern)" -ForegroundColor Gray
}

# Corriger le pattern TRXBO
if ($trxboModels.Count -gt 0) {
    $trxboModel = $trxboModels[0]
    Write-Host "`n🔧 Correction du modèle TRXBO (ID: $($trxboModel.id))" -ForegroundColor Yellow
    
    $updateData = @{
        name = $trxboModel.name
        filePattern = "*TRXBO*.csv"
        fileType = $trxboModel.fileType
        autoApply = $trxboModel.autoApply
        templateFile = $trxboModel.templateFile
        reconciliationKeys = $trxboModel.reconciliationKeys
    }
    
    try {
        $updateResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$($trxboModel.id)" -Method PUT -Body ($updateData | ConvertTo-Json -Depth 10) -ContentType "application/json"
        Write-Host "✅ Pattern corrigé: *TRXBO*.csv" -ForegroundColor Green
    } catch {
        Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n✅ Correction terminée!" -ForegroundColor Green
