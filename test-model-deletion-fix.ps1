# Test complet de la correction de la suppression des modèles
Write-Host "🧪 Test complet de la correction de la suppression des modèles" -ForegroundColor Yellow
Write-Host "=========================================================" -ForegroundColor Yellow

$API_BASE_URL = "http://localhost:8080/api/auto-processing"

# Attendre que le backend soit prêt
Write-Host "⏳ Attente du démarrage du backend..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

# Étape 1: Vérifier l'état initial
Write-Host "`n📋 Étape 1: État initial des modèles" -ForegroundColor Cyan

try {
    $modelsResponse = Invoke-RestMethod -Uri "$API_BASE_URL/models" -Method GET
    Write-Host "✅ Modèles trouvés: $($modelsResponse.models.Count)" -ForegroundColor Green
    
    if ($modelsResponse.models.Count -gt 0) {
        foreach ($model in $modelsResponse.models) {
            Write-Host "   - $($model.name) (ID: $($model.modelId))" -ForegroundColor Gray
        }
    } else {
        Write-Host "   Aucun modèle trouvé" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Erreur lors de la récupération des modèles" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Étape 2: Créer un modèle de test
Write-Host "`n📋 Étape 2: Création d'un modèle de test" -ForegroundColor Cyan

$testModel = @{
    name = "Modèle de Test - Suppression"
    filePattern = "*TEST*.xls"
    fileType = "partner"
    autoApply = $true
    templateFile = "TEST.xls"
    reconciliationKeys = @{
        partnerKeys = @("reference", "montant")
        boKeys = @("id", "amount")
        boModels = @()
    }
    columnProcessingRules = @()
}

try {
    $createResponse = Invoke-RestMethod -Uri "$API_BASE_URL/models" -Method POST -Body ($testModel | ConvertTo-Json -Depth 10) -ContentType "application/json"
    Write-Host "✅ Modèle de test créé avec succès" -ForegroundColor Green
    Write-Host "   ID: $($createResponse.model.modelId)" -ForegroundColor Gray
    $testModelId = $createResponse.model.modelId
} catch {
    Write-Host "❌ Erreur lors de la création du modèle de test" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Étape 3: Vérifier que le modèle a été créé
Write-Host "`n📋 Étape 3: Vérification de la création" -ForegroundColor Cyan

try {
    $modelsResponse = Invoke-RestMethod -Uri "$API_BASE_URL/models" -Method GET
    Write-Host "✅ Modèles trouvés après création: $($modelsResponse.models.Count)" -ForegroundColor Green
    
    $createdModel = $modelsResponse.models | Where-Object { $_.modelId -eq $testModelId }
    if ($createdModel) {
        Write-Host "   ✅ Modèle de test trouvé: $($createdModel.name)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Modèle de test non trouvé" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Erreur lors de la vérification" -ForegroundColor Red
    exit 1
}

# Étape 4: Tester la suppression
Write-Host "`n📋 Étape 4: Test de suppression" -ForegroundColor Cyan

try {
    Write-Host "🔄 Tentative de suppression du modèle: $testModelId" -ForegroundColor Yellow
    $deleteResponse = Invoke-RestMethod -Uri "$API_BASE_URL/models/$testModelId" -Method DELETE
    Write-Host "✅ Réponse de suppression: $($deleteResponse | ConvertTo-Json)" -ForegroundColor Green
    
    if ($deleteResponse.success -eq $true) {
        Write-Host "   ✅ Suppression réussie" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Suppression échouée" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Erreur lors de la suppression" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Étape 5: Vérifier que le modèle a été supprimé
Write-Host "`n📋 Étape 5: Vérification de la suppression" -ForegroundColor Cyan

try {
    $modelsResponse = Invoke-RestMethod -Uri "$API_BASE_URL/models" -Method GET
    Write-Host "✅ Modèles trouvés après suppression: $($modelsResponse.models.Count)" -ForegroundColor Green
    
    $deletedModel = $modelsResponse.models | Where-Object { $_.modelId -eq $testModelId }
    if (-not $deletedModel) {
        Write-Host "   ✅ Modèle de test supprimé avec succès" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Modèle de test toujours présent" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Erreur lors de la vérification" -ForegroundColor Red
    exit 1
}

# Étape 6: Test de création après suppression
Write-Host "`n📋 Étape 6: Test de création après suppression" -ForegroundColor Cyan

$newTestModel = @{
    name = "Modèle de Test - Recréation"
    filePattern = "*TEST2*.xls"
    fileType = "partner"
    autoApply = $true
    templateFile = "TEST2.xls"
    reconciliationKeys = @{
        partnerKeys = @("ref", "amount")
        boKeys = @("transaction_id", "value")
        boModels = @()
    }
    columnProcessingRules = @()
}

try {
    $createResponse = Invoke-RestMethod -Uri "$API_BASE_URL/models" -Method POST -Body ($newTestModel | ConvertTo-Json -Depth 10) -ContentType "application/json"
    Write-Host "✅ Nouveau modèle créé avec succès après suppression" -ForegroundColor Green
    Write-Host "   ID: $($createResponse.model.modelId)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Erreur lors de la création après suppression" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n🎉 Test complet réussi!" -ForegroundColor Green
Write-Host "✅ La suppression et création des modèles fonctionne correctement" -ForegroundColor Green
