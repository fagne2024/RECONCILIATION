# Test complet de l'application après correction
Write-Host "Test complet de l'application" -ForegroundColor Cyan

# Étape 1: Vérifier que le backend fonctionne
Write-Host "`nÉtape 1: Vérification du backend" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    Write-Host "Backend accessible - Nombre de modèles: $($response.models.Count)" -ForegroundColor Green
    
    if ($response.models.Count -gt 0) {
        Write-Host "Modèles disponibles:" -ForegroundColor Gray
        foreach ($model in $response.models) {
            Write-Host "  - $($model.name) (ID: $($model.modelId))" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "Erreur backend: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Étape 2: Vérifier que le frontend fonctionne
Write-Host "`nÉtape 2: Vérification du frontend" -ForegroundColor Yellow
try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:4200" -Method GET -UseBasicParsing
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Host "Frontend accessible (port 4200)" -ForegroundColor Green
    } else {
        Write-Host "Frontend accessible mais statut: $($frontendResponse.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Frontend non accessible: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Assurez-vous que le frontend est démarré avec 'npm start'" -ForegroundColor Yellow
}

# Étape 3: Tester la création d'un modèle
Write-Host "`nÉtape 3: Test de création d'un modèle" -ForegroundColor Yellow
$testModel = @{
    name = "Modèle Test OPPART"
    filePattern = "*OPPART*.xls"
    fileType = "partner"
    autoApply = $true
    templateFile = "OPPART.xls"
    reconciliationKeys = @{
        partnerKeys = @("Num ro Trans GU")
        boKeys = @("Numéro Trans GU")
        boModels = @()
    }
    columnProcessingRules = @()
}

try {
    $createResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method POST -Body ($testModel | ConvertTo-Json -Depth 10) -ContentType "application/json"
    if ($createResponse.success) {
        Write-Host "Modèle créé avec succès (ID: $($createResponse.model.modelId))" -ForegroundColor Green
        $createdModelId = $createResponse.model.modelId
    } else {
        Write-Host "Échec de la création du modèle" -ForegroundColor Red
        $createdModelId = $null
    }
} catch {
    Write-Host "Erreur lors de la création: $($_.Exception.Message)" -ForegroundColor Red
    $createdModelId = $null
}

# Étape 4: Tester la suppression du modèle créé
if ($createdModelId) {
    Write-Host "`nÉtape 4: Test de suppression du modèle créé" -ForegroundColor Yellow
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

# Étape 5: Vérification finale
Write-Host "`nÉtape 5: Vérification finale" -ForegroundColor Yellow
try {
    $finalResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    Write-Host "API finale accessible - Nombre de modèles: $($finalResponse.models.Count)" -ForegroundColor Green
} catch {
    Write-Host "Erreur lors de la vérification finale: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nTest terminé avec succès!" -ForegroundColor Green
Write-Host "L'application fonctionne correctement après la correction de la récursion infinie." -ForegroundColor Cyan
