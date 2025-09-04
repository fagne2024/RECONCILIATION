# Script pour corriger tous les modeles et ajouter les patterns manquants
# Probleme : Les modeles CIOMCM et PMOMCM n'ont pas de pattern defini

$API_BASE_URL = "http://localhost:8080/api"

Write-Host "Correction des patterns de tous les modeles" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Recuperer tous les modeles
try {
    $response = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models" -Method GET
    $models = $response.models
    
    Write-Host "Modeles trouves: $($models.Count)" -ForegroundColor Yellow
    
    foreach ($model in $models) {
        Write-Host "`nModele: $($model.name)" -ForegroundColor Green
        Write-Host "  ID: $($model.id)" -ForegroundColor White
        Write-Host "  Type: $($model.fileType)" -ForegroundColor White
        Write-Host "  Pattern actuel: $($model.filePattern)" -ForegroundColor White
        
        # Definir le pattern selon le nom du modele
        $newPattern = ""
        $needsUpdate = $false
        
        if ($model.name -like "*CIOMCM*" -or $model.name -like "*Ciomcm*") {
            $newPattern = "*CIOMCM*.xls"
            $needsUpdate = $true
            Write-Host "  Nouveau pattern: $newPattern (CIOMCM)" -ForegroundColor Green
        }
        elseif ($model.name -like "*PMOMCM*" -or $model.name -like "*Pmomcm*") {
            $newPattern = "*PMOMCM*.xls"
            $needsUpdate = $true
            Write-Host "  Nouveau pattern: $newPattern (PMOMCM)" -ForegroundColor Green
        }
        elseif ($model.name -like "*TRXBO*" -or $model.name -like "*Transaction Back Office*") {
            $newPattern = "*TRXBO*.xls"
            $needsUpdate = $true
            Write-Host "  Nouveau pattern: $newPattern (TRXBO)" -ForegroundColor Green
        }
        elseif (-not $model.filePattern -or $model.filePattern -eq "") {
            Write-Host "  ⚠️ Pattern manquant!" -ForegroundColor Red
            $needsUpdate = $true
        }
        
        if ($needsUpdate) {
            Write-Host "  Mise a jour du pattern..." -ForegroundColor Yellow
            
            # Preparer la mise a jour
            $updateModel = @{
                name = $model.name
                filePattern = $newPattern
                fileType = $model.fileType
                autoApply = $model.autoApply
                templateFile = $model.templateFile
                reconciliationKeys = $model.reconciliationKeys
                columnProcessingRules = $model.columnProcessingRules
            }
            
            try {
                $updateResponse = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models/$($model.id)" -Method PUT -Body ($updateModel | ConvertTo-Json -Depth 10) -ContentType "application/json"
                
                if ($updateResponse.success) {
                    Write-Host "  ✅ Pattern mis a jour avec succes!" -ForegroundColor Green
                    Write-Host "  Nouveau pattern: $($updateResponse.model.filePattern)" -ForegroundColor White
                } else {
                    Write-Host "  ❌ Erreur lors de la mise a jour: $($updateResponse.error)" -ForegroundColor Red
                }
            } catch {
                Write-Host "  ❌ Erreur API: $($_.Exception.Message)" -ForegroundColor Red
            }
        } else {
            Write-Host "  ✅ Pattern deja correct" -ForegroundColor Green
        }
    }
    
} catch {
    Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nCorrection des patterns terminee!" -ForegroundColor Green
Write-Host "Maintenant testez la reconciliation automatique avec vos fichiers" -ForegroundColor Yellow
