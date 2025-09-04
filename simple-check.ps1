Write-Host "Verification des modeles"

try {
    $models = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    Write-Host "Modeles trouves: $($models.models.Count)"
    
    foreach ($model in $models.models) {
        Write-Host "`nModele: $($model.name)"
        Write-Host "  Type: $($model.fileType)"
        
        if ($model.reconciliationKeys) {
            Write-Host "  Cles:"
            Write-Host "  - Partner: $($model.reconciliationKeys.partnerKeys -join ', ')"
            Write-Host "  - BO: $($model.reconciliationKeys.boKeys -join ', ')"
        }
    }
    
} catch {
    Write-Host "Erreur: $($_.Exception.Message)"
}

Write-Host "`nVerification terminee"
