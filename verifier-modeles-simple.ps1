# Script simple pour verifier les modeles de reconciliation
Write-Host "Verification des modeles de reconciliation" -ForegroundColor Cyan

$baseUrl = "http://localhost:8080/api"
$modelsEndpoint = "$baseUrl/auto-processing/models"

try {
    Write-Host "Recuperation des modeles..." -ForegroundColor Blue
    $response = Invoke-RestMethod -Uri $modelsEndpoint -Method GET
    $models = $response.models
    Write-Host "Nombre de modeles: $($models.Length)" -ForegroundColor Green
    
    $modelsWithCorruptedKeys = @()
    
    foreach ($model in $models) {
        Write-Host "`nModele: $($model.name)" -ForegroundColor Yellow
        Write-Host "  ID: $($model.id)" -ForegroundColor White
        
        if ($model.partnerKeys) {
            Write-Host "  Cles partenaires: $($model.partnerKeys -join ', ')" -ForegroundColor Blue
            
            if ($model.partnerKeys -contains "R f rence") {
                Write-Host "  CLE CORROMPUE DETECTEE: 'R f rence'" -ForegroundColor Red
                $modelsWithCorruptedKeys += $model
            }
        }
        
        if ($model.boModelKeys) {
            Write-Host "  Cles BO: $($model.boModelKeys | ConvertTo-Json -Compress)" -ForegroundColor Blue
        }
    }
    
    Write-Host "`nResume de l'analyse:" -ForegroundColor Cyan
    Write-Host "  Total modeles: $($models.Length)" -ForegroundColor White
    Write-Host "  Modeles avec cles corrompues: $($modelsWithCorruptedKeys.Length)" -ForegroundColor Red
    Write-Host "  Modeles corrects: $($models.Length - $modelsWithCorruptedKeys.Length)" -ForegroundColor Green
    
    if ($modelsWithCorruptedKeys.Length -gt 0) {
        Write-Host "`nModeles necessitant une correction:" -ForegroundColor Yellow
        foreach ($model in $modelsWithCorruptedKeys) {
            Write-Host "  - $($model.name) (ID: $($model.id))" -ForegroundColor Red
        }
        
        Write-Host "`nPour corriger ces modeles, executez: .\corriger-cles-simple.ps1" -ForegroundColor Yellow
    } else {
        Write-Host "`nTous les modeles sont corrects !" -ForegroundColor Green
    }
}
catch {
    Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
}
