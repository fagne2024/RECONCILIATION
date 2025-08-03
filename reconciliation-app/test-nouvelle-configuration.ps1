# Test de la nouvelle configuration des modèles avec sélection de modèles BO

Write-Host "Test de la nouvelle configuration des modèles..." -ForegroundColor Cyan

# Test 1: Créer un modèle BO
Write-Host "`nTest 1: Creation d'un modele BO" -ForegroundColor Yellow
try {
    $boModelData = @{
        name = "Modele BO Test"
        filePattern = "*BO*.csv"
        fileType = "bo"
        processingSteps = @()
        autoApply = $true
        templateFile = "TRXBO.csv"
        reconciliationKeys = @{
            boKeys = @("IDTransaction", "Montant")
        }
    }
    
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/auto-processing/models" -Method POST -Body ($boModelData | ConvertTo-Json -Depth 3) -ContentType "application/json"
    Write-Host "Succes: Modele BO cree avec l'ID $($response.model.id)" -ForegroundColor Green
    $boModelId = $response.model.id
} catch {
    Write-Host "Erreur lors de la creation du modele BO: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Créer un modèle partenaire avec référence au modèle BO
Write-Host "`nTest 2: Creation d'un modele partenaire avec reference au modele BO" -ForegroundColor Yellow
try {
    $partnerModelData = @{
        name = "Modele Partenaire Test"
        filePattern = "*PARTNER*.csv"
        fileType = "partner"
        processingSteps = @()
        autoApply = $true
        templateFile = "TRXPARTNER.csv"
        reconciliationKeys = @{
            partnerKeys = @("IDTransaction", "Reference")
            boModels = @($boModelId)
            boModelKeys = @{
                $boModelId = @("IDTransaction", "Montant")
            }
        }
    }
    
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/auto-processing/models" -Method POST -Body ($partnerModelData | ConvertTo-Json -Depth 3) -ContentType "application/json"
    Write-Host "Succes: Modele partenaire cree avec l'ID $($response.model.id)" -ForegroundColor Green
    Write-Host "Configuration: $($response.model.reconciliationKeys | ConvertTo-Json -Depth 3)" -ForegroundColor Gray
} catch {
    Write-Host "Erreur lors de la creation du modele partenaire: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Récupérer tous les modèles pour vérifier
Write-Host "`nTest 3: Recuperation de tous les modeles" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/auto-processing/models" -Method GET
    Write-Host "Succes: $($response.models.Count) modeles trouves" -ForegroundColor Green
    
    foreach ($model in $response.models) {
        Write-Host "Modele: $($model.name) (Type: $($model.fileType))" -ForegroundColor Green
        if ($model.reconciliationKeys) {
            Write-Host "  - Cles partenaire: $($model.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Gray
            Write-Host "  - Cles BO: $($model.reconciliationKeys.boKeys -join ', ')" -ForegroundColor Gray
            if ($model.reconciliationKeys.boModels) {
                Write-Host "  - Modeles BO references: $($model.reconciliationKeys.boModels -join ', ')" -ForegroundColor Gray
            }
        }
    }
} catch {
    Write-Host "Erreur lors de la recuperation des modeles: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nTest de la nouvelle configuration termine!" -ForegroundColor Cyan 