Write-Host "Creation d'un nouveau modele TRXBO"

$trxboModel = @{
    name = "Modele TRXBO - Reconciliation"
    filePattern = "*TRXBO*.xls"
    fileType = "bo"
    autoApply = $true
    templateFile = "TRXBO.xls"
    reconciliationKeys = @{
        partnerKeys = @("Numero Trans GU")
        boKeys = @("Numero Trans GU")
        boModels = @()
    }
    columnProcessingRules = @()
}

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method POST -Body ($trxboModel | ConvertTo-Json -Depth 10) -ContentType "application/json"
    Write-Host "Modele TRXBO cree avec succes"
    Write-Host "ID: $($response.model.modelId)"
} catch {
    Write-Host "Erreur: $($_.Exception.Message)"
}

Write-Host "Testez maintenant la reconciliation !"
