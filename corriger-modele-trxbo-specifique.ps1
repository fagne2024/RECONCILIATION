# Script pour corriger le modele TRXBO specifique
Write-Host "Correction du modele TRXBO specifique" -ForegroundColor Cyan

$baseUrl = "http://localhost:8080/api"
$modelsEndpoint = "$baseUrl/auto-processing/models"

# Donnees du modele a corriger
$modelId = "mod_le_bas_sur_trxbo_xls_4edf2523"
$correctedModel = @{
    boModels = @("mod_le_bas_sur_trxbo_xls_4edf2523")
    partnerKeys = @("Reference")  # Corrige de "R f rence" a "Reference"
    boModelKeys = @{
        "mod_le_bas_sur_trxbo_xls_4edf2523" = @("IDTransaction")
    }
    boTreatments = @{
        "mod_le_bas_sur_trxbo_xls_4edf2523" = @()
    }
    boKeys = @()
}

Write-Host "Modele a corriger: $modelId" -ForegroundColor Yellow
Write-Host "Correction: 'R f rence' -> 'Reference'" -ForegroundColor Green

try {
    # Recuperer le modele actuel
    Write-Host "`nRecuperation du modele actuel..." -ForegroundColor Blue
    $response = Invoke-RestMethod -Uri $modelsEndpoint -Method GET
    $models = $response.models
    
    $targetModel = $models | Where-Object { $_.modelId -eq $modelId }
    
    if (-not $targetModel) {
        Write-Host "Modele $modelId non trouve" -ForegroundColor Red
        return
    }
    
    Write-Host "Modele trouve: $($targetModel.name) (ID: $($targetModel.id))" -ForegroundColor Green
    
    # Afficher l'etat actuel
    Write-Host "`nEtat actuel:" -ForegroundColor Cyan
    Write-Host "  Cles partenaires: $($targetModel.partnerKeys -join ', ')" -ForegroundColor White
    Write-Host "  Cles BO: $($targetModel.boModelKeys | ConvertTo-Json -Compress)" -ForegroundColor White
    
    # Mettre a jour le modele
    Write-Host "`nMise a jour du modele..." -ForegroundColor Blue
    
    # Fusionner les donnees existantes avec les corrections
    $updatedModel = $targetModel | ConvertTo-Json -Depth 10 | ConvertFrom-Json
    
    # Corriger les cles partenaires
    if ($updatedModel.partnerKeys -contains "R f rence") {
        $updatedModel.partnerKeys = $updatedModel.partnerKeys | ForEach-Object {
            if ($_ -eq "R f rence") { "Reference" } else { $_ }
        }
        Write-Host "  Correction des cles partenaires effectuee" -ForegroundColor Green
    }
    
    # Mettre a jour via l'API
    $updateUrl = "$modelsEndpoint/$($targetModel.id)"
    $body = $updatedModel | ConvertTo-Json -Depth 10
    
    $updateResponse = Invoke-RestMethod -Uri $updateUrl -Method PUT -Body $body -ContentType "application/json"
    
    Write-Host "`nModele mis a jour avec succes!" -ForegroundColor Green
    Write-Host "Nouvelles cles partenaires: $($updatedModel.partnerKeys -join ', ')" -ForegroundColor White
    
}
catch {
    Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
}
