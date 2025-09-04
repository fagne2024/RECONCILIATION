# Script pour corriger les clés partenaires vers "Référence"
Write-Host "Correction des clés partenaires vers 'Référence'..." -ForegroundColor Green

try {
    # Récupérer les modèles
    $models = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    Write-Host "Modèles trouvés: $($models.models.Count)" -ForegroundColor Yellow
    
    foreach ($model in $models.models) {
        if ($model.name -like "*CIOMCM*") {
            Write-Host "Correction CIOMCM..." -ForegroundColor Yellow
            Write-Host "  Ancienne clé: $($model.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Gray
            $model.reconciliationKeys.partnerKeys = @("Référence")
            Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$($model.id)" -Method PUT -Body ($model | ConvertTo-Json -Depth 10) -ContentType "application/json"
            Write-Host "  ✅ CIOMCM: clé partenaire = Référence" -ForegroundColor Green
        }
        elseif ($model.name -like "*PMOMCM*") {
            Write-Host "Correction PMOMCM..." -ForegroundColor Yellow
            Write-Host "  Ancienne clé: $($model.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Gray
            $model.reconciliationKeys.partnerKeys = @("Référence")
            Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$($model.id)" -Method PUT -Body ($model | ConvertTo-Json -Depth 10) -ContentType "application/json"
            Write-Host "  ✅ PMOMCM: clé partenaire = Référence" -ForegroundColor Green
        }
    }
    
    Write-Host "Correction terminée!" -ForegroundColor Green
}
catch {
    Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
}
