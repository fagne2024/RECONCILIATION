# Test de création d'un nouveau modèle
$newModel = @{
    name = "Nouveau Modèle OPPART"
    filePattern = "*OPPART*.xls"
    fileType = "partner"
    autoApply = $true
    templateFile = "OPPART.xls"
    reconciliationKeys = @{
        partnerKeys = @("date", "montant")
        boKeys = @("date", "montant")
        boModels = @("model_ca0b2985-e97d-4f53-9079-f49a095b821e")
    }
    columnProcessingRules = @()
}

Write-Host "Test: Création d'un nouveau modèle"
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method POST -Body ($newModel | ConvertTo-Json -Depth 10) -ContentType "application/json"
    Write-Host "Succès: $($response | ConvertTo-Json -Depth 10)"
} catch {
    Write-Host "Erreur: $($_.Exception.Message)"
    Write-Host "Status: $($_.Exception.Response.StatusCode)"
}
