# Script simple pour corriger les cles de reconciliation corrompues
Write-Host "Correction des cles de reconciliation corrompues" -ForegroundColor Cyan

$baseUrl = "http://localhost:8080/api"
$modelsEndpoint = "$baseUrl/auto-processing/models"

Write-Host "Probleme identifie:" -ForegroundColor Yellow
Write-Host "  Clé partenaire corrompue: 'R f rence'" -ForegroundColor Red
Write-Host "  Clé partenaire correcte: 'Reference'" -ForegroundColor Green

try {
    Write-Host "`nRecuperation des modeles..." -ForegroundColor Blue
    $response = Invoke-RestMethod -Uri $modelsEndpoint -Method GET
    $models = $response.models
    Write-Host "Nombre de modeles: $($models.Length)" -ForegroundColor Green
    
    $modelsToUpdate = @()
    
    foreach ($model in $models) {
        if ($model.partnerKeys -and $model.partnerKeys -contains "R f rence") {
            $modelsToUpdate += $model
            Write-Host "Modele a corriger trouve: $($model.name) (ID: $($model.id))" -ForegroundColor Yellow
        }
    }
    
    if ($modelsToUpdate.Length -eq 0) {
        Write-Host "Aucun modele necessitant une correction trouve" -ForegroundColor Green
        return
    }
    
    Write-Host "`nNombre de modeles a corriger: $($modelsToUpdate.Length)" -ForegroundColor Cyan
    
    $confirmation = Read-Host "Voulez-vous proceder a la correction ? (O/N)"
    if ($confirmation -ne "O" -and $confirmation -ne "o") {
        Write-Host "Correction annulee" -ForegroundColor Red
        return
    }
    
    $successCount = 0
    
    foreach ($model in $modelsToUpdate) {
        try {
            Write-Host "Mise a jour du modele $($model.id)..." -ForegroundColor Blue
            
            # Corriger les cles partenaires corrompues
            if ($model.partnerKeys -contains "R f rence") {
                $model.partnerKeys = $model.partnerKeys | ForEach-Object {
                    if ($_ -eq "R f rence") { "Reference" } else { $_ }
                }
                Write-Host "  Correction de 'R f rence' -> 'Reference'" -ForegroundColor Yellow
            }
            
            # Mettre a jour le modele via l'API
            $updateUrl = "$modelsEndpoint/$($model.id)"
            $body = $model | ConvertTo-Json -Depth 10
            
            $updateResponse = Invoke-RestMethod -Uri $updateUrl -Method PUT -Body $body -ContentType "application/json"
            
            Write-Host "  Modele $($model.id) mis a jour avec succes" -ForegroundColor Green
            $successCount++
        }
        catch {
            Write-Host "  Erreur lors de la mise a jour du modele $($model.id): $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    Write-Host "`nResume de la correction:" -ForegroundColor Cyan
    Write-Host "  Modeles corriges avec succes: $successCount" -ForegroundColor Green
    Write-Host "  Modeles en erreur: $($modelsToUpdate.Length - $successCount)" -ForegroundColor Red
    
    if ($successCount -gt 0) {
        Write-Host "`nCorrection terminee ! Les modeles ont ete mis a jour." -ForegroundColor Green
        Write-Host "Redemarrez l'application pour voir les changements." -ForegroundColor Yellow
    }
}
catch {
    Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
}
