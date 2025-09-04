Write-Host "Creation du modele OPPART avec les bonnes cles"

$oppartModel = @{
    name = "Modele OPPART - Reconciliation Corrigee"
    filePattern = "*OPPART*.xls"
    fileType = "partner"
    autoApply = $true
    templateFile = "OPPART.xls"
    reconciliationKeys = @{
        partnerKeys = @("Numero Trans GU")
        boKeys = @("Numero Trans GU")
        boModels = @()
    }
    columnProcessingRules = @()
}

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method POST -Body ($oppartModel | ConvertTo-Json -Depth 10) -ContentType "application/json"
    Write-Host "Modele OPPART cree avec succes"
    Write-Host "ID: $($response.model.modelId)"
} catch {
    Write-Host "Erreur creation: $($_.Exception.Message)"
}

Write-Host "Testez maintenant la reconciliation !"
