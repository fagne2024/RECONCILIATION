Write-Host "Correction du modele TRXBO"

# Nouveau modele TRXBO avec les bonnes cles
$trxboModel = @{
    name = "Modele TRXBO - Reconciliation Corrigee"
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
    # Supprimer l'ancien modele TRXBO
    $models = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    foreach ($model in $models.models) {
        if ($model.fileType -eq "bo" -and $model.filePattern -like "*TRXBO*") {
            Write-Host "Suppression de l'ancien modele TRXBO: $($model.name)"
            Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$($model.modelId)" -Method DELETE
        }
    }
    
    # Creer le nouveau modele TRXBO
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method POST -Body ($trxboModel | ConvertTo-Json -Depth 10) -ContentType "application/json"
    Write-Host "Nouveau modele TRXBO cree avec succes"
    Write-Host "ID: $($response.model.modelId)"
    
} catch {
    Write-Host "Erreur: $($_.Exception.Message)"
}

Write-Host "Correction terminee !"
