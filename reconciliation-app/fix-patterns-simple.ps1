# Script simple pour corriger les patterns
Write-Host "Correction des patterns..." -ForegroundColor Green

try {
    # Récupérer les modèles
    $models = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    Write-Host "Modèles trouvés: $($models.models.Count)" -ForegroundColor Yellow
    
    foreach ($model in $models.models) {
        Write-Host "Modèle: $($model.name)" -ForegroundColor White
        
        if ($model.name -like "*CIOMCM*") {
            Write-Host "  Correction CIOMCM..." -ForegroundColor Yellow
            $model.filePattern = "*CIOMCM*.xls"
            Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$($model.id)" -Method PUT -Body ($model | ConvertTo-Json -Depth 10) -ContentType "application/json"
            Write-Host "  ✅ Pattern corrigé: $($model.filePattern)" -ForegroundColor Green
        }
        elseif ($model.name -like "*PMOMCM*") {
            Write-Host "  Correction PMOMCM..." -ForegroundColor Yellow
            $model.filePattern = "*PMOMCM*.xls"
            Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$($model.id)" -Method PUT -Body ($model | ConvertTo-Json -Depth 10) -ContentType "application/json"
            Write-Host "  ✅ Pattern corrigé: $($model.filePattern)" -ForegroundColor Green
        }
    }
    
    Write-Host "Correction terminée!" -ForegroundColor Green
}
catch {
    Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
}
