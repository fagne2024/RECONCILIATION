# Script de test pour la réconciliation
Write-Host "🧪 Test de Réconciliation - Modèles de Traitement"
Write-Host "=================================================="

# Test 1: Vérifier que l'API fonctionne
Write-Host "`n📋 Test 1: Vérification de l'API"
try {
    $models = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    Write-Host "✅ API accessible - $($models.models.Count) modèles trouvés"
    
    foreach ($model in $models.models) {
        Write-Host "  - $($model.name) (Type: $($model.fileType))"
    }
} catch {
    Write-Host "Erreur API: $($_.Exception.Message)"
    exit 1
}

# Test 2: Créer un modèle de réconciliation OPPART
Write-Host "`n📋 Test 2: Création d'un modèle OPPART"
$oppartModel = @{
    name = "Modèle OPPART - Réconciliation Test"
    filePattern = "*OPPART*.xls"
    fileType = "partner"
    autoApply = $true
    templateFile = "OPPART.xls"
    reconciliationKeys = @{
        partnerKeys = @("Numéro Trans GU", "Montant", "Date")
        boKeys = @("TRANSACTION_ID", "AMOUNT", "TRANSACTION_DATE")
        boModels = @()
    }
    columnProcessingRules = @(
        @{
            sourceColumn = "Numéro Trans GU"
            targetColumn = "numero_transaction"
            formatType = "string"
            trimSpaces = $true
            toUpperCase = $false
        },
        @{
            sourceColumn = "Montant"
            targetColumn = "montant"
            formatType = "numeric"
            removeSpecialChars = $true
        }
    )
}

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method POST -Body ($oppartModel | ConvertTo-Json -Depth 10) -ContentType "application/json"
    Write-Host "✅ Modèle OPPART créé avec succès"
    Write-Host "   ID: $($response.model.modelId)"
} catch {
    Write-Host "❌ Erreur création modèle: $($_.Exception.Message)"
}

# Test 3: Créer un modèle TRXBO
Write-Host "`n📋 Test 3: Création d'un modèle TRXBO"
$trxboModel = @{
    name = "Modèle TRXBO - Base Test"
    filePattern = "*TRXBO*.xls"
    fileType = "bo"
    autoApply = $true
    templateFile = "TRXBO.xls"
    reconciliationKeys = @{
        partnerKeys = @()
        boKeys = @()
        boModels = @()
    }
    columnProcessingRules = @(
        @{
            sourceColumn = "TRANSACTION_ID"
            targetColumn = "numero_transaction"
            formatType = "string"
            trimSpaces = $true
        },
        @{
            sourceColumn = "AMOUNT"
            targetColumn = "montant"
            formatType = "numeric"
        }
    )
}

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method POST -Body ($trxboModel | ConvertTo-Json -Depth 10) -ContentType "application/json"
    Write-Host "✅ Modèle TRXBO créé avec succès"
    Write-Host "   ID: $($response.model.modelId)"
} catch {
    Write-Host "❌ Erreur création modèle: $($_.Exception.Message)"
}

# Test 4: Vérifier les fichiers disponibles
Write-Host "`n📋 Test 4: Vérification des fichiers disponibles"
try {
    $files = Invoke-RestMethod -Uri "http://localhost:8080/api/file-watcher/available-files" -Method GET
    Write-Host "✅ Fichiers disponibles:"
    
    foreach ($file in $files) {
        Write-Host "  - $($file.name) ($($file.columns.Count) colonnes)"
    }
} catch {
    Write-Host "Erreur recuperation fichiers: $($_.Exception.Message)"
}

# Test 5: Résumé final
Write-Host "`n📋 Test 5: Résumé"
try {
    $finalModels = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    Write-Host "✅ Configuration finale:"
    Write-Host "   - $($finalModels.models.Count) modèles configurés"
    
    $partnerModels = $finalModels.models | Where-Object { $_.fileType -eq "partner" }
    $boModels = $finalModels.models | Where-Object { $_.fileType -eq "bo" }
    
    Write-Host "   - $($partnerModels.Count) modèles partenaire"
    Write-Host "   - $($boModels.Count) modèles BO"
    
} catch {
    Write-Host "❌ Erreur résumé: $($_.Exception.Message)"
}

Write-Host "`n🎉 Tests terminés !"
Write-Host "Consultez le guide: guide-utilisation-modeles-reconciliation.md"
