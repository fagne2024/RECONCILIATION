Write-Host "Test des cles de reconciliation"

$API_BASE_URL = "http://localhost:8080/api"

$response = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models" -Method GET
Write-Host "Modeles trouves: $($response.models.Count)"

foreach ($model in $response.models) {
    Write-Host "Modele: $($model.name)"
    Write-Host "  Type: $($model.fileType)"
    
    if ($model.reconciliationKeys) {
        Write-Host "  Cles configurees:"
        Write-Host "    - Partner: $($model.reconciliationKeys.partnerKeys -join ', ')"
        Write-Host "    - BO: $($model.reconciliationKeys.boKeys -join ', ')"
    } else {
        Write-Host "  Pas de cles"
    }
}

Write-Host "Test termine!"
