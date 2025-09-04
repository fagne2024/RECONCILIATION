# Script pour afficher les details complets des modeles
Write-Host "Details complets des modeles" -ForegroundColor Cyan

$baseUrl = "http://localhost:8080/api"
$modelsEndpoint = "$baseUrl/auto-processing/models"

try {
    Write-Host "Recuperation des modeles..." -ForegroundColor Blue
    $response = Invoke-RestMethod -Uri $modelsEndpoint -Method GET
    $models = $response.models
    Write-Host "Nombre de modeles: $($models.Length)" -ForegroundColor Green
    
    foreach ($model in $models) {
        Write-Host "`n==========================================" -ForegroundColor DarkGray
        Write-Host "Modele: $($model.name)" -ForegroundColor Yellow
        Write-Host "ID: $($model.id)" -ForegroundColor White
        Write-Host "ModelID: $($model.modelId)" -ForegroundColor White
        
        Write-Host "`nProprietes:" -ForegroundColor Cyan
        $model.PSObject.Properties | ForEach-Object {
            $value = $_.Value
            if ($value -is [array]) {
                $value = $value -join ', '
            } elseif ($value -is [object]) {
                $value = $value | ConvertTo-Json -Compress
            }
            Write-Host "  $($_.Name): $value" -ForegroundColor Gray
        }
        
        Write-Host "`nClés partenaires:" -ForegroundColor Blue
        if ($model.partnerKeys -and $model.partnerKeys.Length -gt 0) {
            foreach ($key in $model.partnerKeys) {
                if ($key -eq "R f rence") {
                    Write-Host "  ❌ '$key' (CORROMPUE)" -ForegroundColor Red
                } else {
                    Write-Host "  ✅ '$key'" -ForegroundColor Green
                }
            }
        } else {
            Write-Host "  ⚠️ Aucune clé partenaire définie" -ForegroundColor Yellow
        }
        
        Write-Host "`nClés BO:" -ForegroundColor Blue
        if ($model.boModelKeys -and $model.boModelKeys.PSObject.Properties.Count -gt 0) {
            foreach ($boModel in $model.boModelKeys.PSObject.Properties) {
                Write-Host "  📄 $($boModel.Name): $($boModel.Value -join ', ')" -ForegroundColor White
            }
        } else {
            Write-Host "  ⚠️ Aucune clé BO définie" -ForegroundColor Yellow
        }
    }
}
catch {
    Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
}
