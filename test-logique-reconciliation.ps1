# Test de la logique de réconciliation
Write-Host "Test de la logique de réconciliation" -ForegroundColor Cyan

# Étape 1: Vérifier que le backend fonctionne
Write-Host "`nÉtape 1: Vérification du backend" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    Write-Host "Backend accessible - Nombre de modèles: $($response.models.Count)" -ForegroundColor Green
} catch {
    Write-Host "Erreur backend: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Étape 2: Créer un modèle avec logique de réconciliation
Write-Host "`nÉtape 2: Création d'un modèle avec logique de réconciliation" -ForegroundColor Yellow
$testModel = @{
    name = "Modèle Test Logique Réconciliation"
    filePattern = "*OPPART*.xls"
    fileType = "partner"
    autoApply = $true
    templateFile = "OPPART.xls"
    reconciliationKeys = @{
        partnerKeys = @("Num ro Trans GU")
        boKeys = @("Numéro Trans GU")
        boModels = @()
    }
    reconciliationLogic = @{
        type = "SPECIAL_RATIO"
        parameters = @{
            expectedRatio = "1:2"
            description = "Test de logique de réconciliation"
            tolerance = 0.1
        }
    }
    columnProcessingRules = @()
}

try {
    $createResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method POST -Body ($testModel | ConvertTo-Json -Depth 10) -ContentType "application/json"
    if ($createResponse.success) {
        Write-Host "Modèle créé avec succès (ID: $($createResponse.model.modelId))" -ForegroundColor Green
        Write-Host "Logique de réconciliation: $($createResponse.model.reconciliationLogic.type)" -ForegroundColor Green
        $createdModelId = $createResponse.model.modelId
    } else {
        Write-Host "Échec de la création du modèle" -ForegroundColor Red
        $createdModelId = $null
    }
} catch {
    Write-Host "Erreur lors de la création: $($_.Exception.Message)" -ForegroundColor Red
    $createdModelId = $null
}

# Étape 3: Vérifier que la logique de réconciliation a été sauvegardée
if ($createdModelId) {
    Write-Host "`nÉtape 3: Vérification de la logique de réconciliation" -ForegroundColor Yellow
    try {
        $getResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$createdModelId" -Method GET
        if ($getResponse.success) {
            $model = $getResponse.model
            Write-Host "Modèle récupéré avec succès" -ForegroundColor Green
            Write-Host "Logique de réconciliation:" -ForegroundColor Gray
            Write-Host "  - Type: $($model.reconciliationLogic.type)" -ForegroundColor Gray
            Write-Host "  - Ratio attendu: $($model.reconciliationLogic.parameters.expectedRatio)" -ForegroundColor Gray
            Write-Host "  - Description: $($model.reconciliationLogic.parameters.description)" -ForegroundColor Gray
            Write-Host "  - Tolérance: $($model.reconciliationLogic.parameters.tolerance)" -ForegroundColor Gray
        } else {
            Write-Host "Échec de la récupération du modèle" -ForegroundColor Red
        }
    } catch {
        Write-Host "Erreur lors de la récupération: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Étape 4: Supprimer le modèle de test
if ($createdModelId) {
    Write-Host "`nÉtape 4: Suppression du modèle de test" -ForegroundColor Yellow
    try {
        $deleteResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$createdModelId" -Method DELETE
        if ($deleteResponse.success) {
            Write-Host "Modèle supprimé avec succès" -ForegroundColor Green
        } else {
            Write-Host "Échec de la suppression" -ForegroundColor Red
        }
    } catch {
        Write-Host "Erreur lors de la suppression: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nTest de la logique de réconciliation terminé!" -ForegroundColor Green
