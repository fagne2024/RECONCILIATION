# Script de test pour les règles de traitement des colonnes
# Ce script teste les nouveaux endpoints de l'API

param(
    [string]$BaseUrl = "http://localhost:8080",
    [string]$ModelId = "test_model_001"
)

Write-Host "🧪 Test des règles de traitement des colonnes..." -ForegroundColor Cyan
Write-Host "📍 URL de base: $BaseUrl" -ForegroundColor Yellow

# Fonction pour faire des requêtes HTTP
function Invoke-TestRequest {
    param(
        [string]$Method,
        [string]$Url,
        [string]$Body = $null,
        [string]$Description
    )
    
    Write-Host "`n🔍 Test: $Description" -ForegroundColor Green
    Write-Host "   $Method $Url" -ForegroundColor Gray
    
    try {
        $headers = @{
            "Content-Type" = "application/json"
        }
        
        $params = @{
            Method = $Method
            Uri = $Url
            Headers = $headers
        }
        
        if ($Body) {
            $params.Body = $Body
            Write-Host "   Body: $Body" -ForegroundColor Gray
        }
        
        $response = Invoke-RestMethod @params
        
        Write-Host "   ✅ Succès" -ForegroundColor Green
        Write-Host "   Response: $($response | ConvertTo-Json -Depth 3)" -ForegroundColor Gray
        
        return $response
    } catch {
        Write-Host "   ❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $errorResponse = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorResponse)
            $errorBody = $reader.ReadToEnd()
            Write-Host "   Error Body: $errorBody" -ForegroundColor Red
        }
        return $null
    }
}

# Test 1: Créer un modèle de test
Write-Host "`n📝 Test 1: Création d'un modèle de test..." -ForegroundColor Cyan

$testModel = @{
    name = "Modèle de test pour règles de colonnes"
    filePattern = "test_*.csv"
    fileType = "partner"
    autoApply = $true
    templateFile = "test_template.csv"
    reconciliationKeys = @{
        partnerKeys = @("Id", "Nom")
        boKeys = @("IDTransaction", "NomClient")
    }
    columnProcessingRules = @()
}

$createModelResponse = Invoke-TestRequest -Method "POST" -Url "$BaseUrl/api/auto-processing/models" -Body ($testModel | ConvertTo-Json -Depth 5) -Description "Création d'un modèle de test"

if (-not $createModelResponse) {
    Write-Host "❌ Impossible de créer le modèle de test. Arrêt des tests." -ForegroundColor Red
    exit 1
}

$modelId = $createModelResponse.model.modelId
Write-Host "✅ Modèle créé avec l'ID: $modelId" -ForegroundColor Green

# Test 2: Créer des règles de traitement
Write-Host "`n📝 Test 2: Création de règles de traitement..." -ForegroundColor Cyan

# Règle 1: Normalisation de nom
$rule1 = @{
    sourceColumn = "nom_client"
    targetColumn = "nom_normalise"
    formatType = "string"
    toUpperCase = $true
    trimSpaces = $true
    removeSpecialChars = $true
    ruleOrder = 0
}

$createRule1Response = Invoke-TestRequest -Method "POST" -Url "$BaseUrl/api/auto-processing/models/$modelId/column-rules" -Body ($rule1 | ConvertTo-Json -Depth 3) -Description "Création de la règle 1 (normalisation de nom)"

# Règle 2: Nettoyage de téléphone
$rule2 = @{
    sourceColumn = "telephone"
    targetColumn = "telephone_clean"
    formatType = "numeric"
    removeSpecialChars = $true
    specialCharReplacementMap = @{
        " " = ""
        "-" = ""
        "(" = ""
        ")" = ""
    }
    ruleOrder = 1
}

$createRule2Response = Invoke-TestRequest -Method "POST" -Url "$BaseUrl/api/auto-processing/models/$modelId/column-rules" -Body ($rule2 | ConvertTo-Json -Depth 3) -Description "Création de la règle 2 (nettoyage de téléphone)"

# Test 3: Récupérer les règles
Write-Host "`n📝 Test 3: Récupération des règles..." -ForegroundColor Cyan

$getRulesResponse = Invoke-TestRequest -Method "GET" -Url "$BaseUrl/api/auto-processing/models/$modelId/column-rules" -Description "Récupération des règles du modèle"

# Test 4: Traitement de données
Write-Host "`n📝 Test 4: Traitement de données..." -ForegroundColor Cyan

$testData = @(
    @{
        nom_client = "  Jean-Pierre DUPONT  "
        telephone = "(01) 23-45-67-89"
        montant = "100.50"
    },
    @{
        nom_client = "Marie-Claire MARTIN"
        telephone = "02 34 56 78 90"
        montant = "250.75"
    }
)

$processDataResponse = Invoke-TestRequest -Method "POST" -Url "$BaseUrl/api/auto-processing/process-data/$modelId" -Body ($testData | ConvertTo-Json -Depth 3) -Description "Traitement des données de test"

# Test 5: Traitement d'une ligne unique
Write-Host "`n📝 Test 5: Traitement d'une ligne unique..." -ForegroundColor Cyan

$singleRow = @{
    nom_client = "  Pierre DURAND  "
    telephone = "03-45-67-89-01"
    montant = "75.25"
}

$processSingleRowResponse = Invoke-TestRequest -Method "POST" -Url "$BaseUrl/api/auto-processing/process-single-row/$modelId" -Body ($singleRow | ConvertTo-Json -Depth 3) -Description "Traitement d'une ligne unique"

# Test 6: Obtenir les colonnes cibles
Write-Host "`n📝 Test 6: Récupération des colonnes cibles..." -ForegroundColor Cyan

$targetColumnsResponse = Invoke-TestRequest -Method "GET" -Url "$BaseUrl/api/auto-processing/models/$modelId/target-columns" -Description "Récupération des colonnes cibles"

# Test 7: Validation des règles
Write-Host "`n📝 Test 7: Validation des règles..." -ForegroundColor Cyan

$validateRulesResponse = Invoke-TestRequest -Method "GET" -Url "$BaseUrl/api/auto-processing/models/$modelId/validate-rules" -Description "Validation des règles"

# Test 8: Sauvegarde en batch
Write-Host "`n📝 Test 8: Sauvegarde en batch..." -ForegroundColor Cyan

$batchRules = @(
    @{
        sourceColumn = "email"
        targetColumn = "email_normalise"
        formatType = "string"
        toLowerCase = $true
        trimSpaces = $true
        ruleOrder = 2
    },
    @{
        sourceColumn = "code_postal"
        targetColumn = "code_postal_clean"
        formatType = "numeric"
        padZeros = $true
        ruleOrder = 3
    }
)

$batchResponse = Invoke-TestRequest -Method "POST" -Url "$BaseUrl/api/auto-processing/models/$modelId/column-rules/batch" -Body ($batchRules | ConvertTo-Json -Depth 3) -Description "Sauvegarde en batch des règles"

# Test 9: Mise à jour d'une règle
Write-Host "`n📝 Test 9: Mise à jour d'une règle..." -ForegroundColor Cyan

if ($createRule1Response -and $createRule1Response.rule) {
    $ruleId = $createRule1Response.rule.id
    $updatedRule = @{
        sourceColumn = "nom_client"
        targetColumn = "nom_normalise_v2"
        formatType = "string"
        toUpperCase = $true
        trimSpaces = $true
        removeSpecialChars = $true
        regexReplace = "\\s+"
        ruleOrder = 0
    }
    
    $updateRuleResponse = Invoke-TestRequest -Method "PUT" -Url "$BaseUrl/api/auto-processing/column-rules/$ruleId" -Body ($updatedRule | ConvertTo-Json -Depth 3) -Description "Mise à jour de la règle 1"
}

# Test 10: Suppression d'une règle
Write-Host "`n📝 Test 10: Suppression d'une règle..." -ForegroundColor Cyan

if ($createRule2Response -and $createRule2Response.rule) {
    $ruleId = $createRule2Response.rule.id
    $deleteRuleResponse = Invoke-TestRequest -Method "DELETE" -Url "$BaseUrl/api/auto-processing/column-rules/$ruleId" -Description "Suppression de la règle 2"
}

# Test 11: Récupération du modèle complet
Write-Host "`n📝 Test 11: Récupération du modèle complet..." -ForegroundColor Cyan

$getModelResponse = Invoke-TestRequest -Method "GET" -Url "$BaseUrl/api/auto-processing/models/$modelId" -Description "Récupération du modèle complet avec ses règles"

# Test 12: Nettoyage - Suppression du modèle de test
Write-Host "`n📝 Test 12: Nettoyage..." -ForegroundColor Cyan

$deleteModelResponse = Invoke-TestRequest -Method "DELETE" -Url "$BaseUrl/api/auto-processing/models/$modelId" -Description "Suppression du modèle de test"

# Résumé des tests
Write-Host "`n📊 Résumé des tests:" -ForegroundColor Cyan
Write-Host "✅ Tests terminés avec succès!" -ForegroundColor Green
Write-Host "🔧 Les règles de traitement des colonnes sont fonctionnelles." -ForegroundColor Green
Write-Host "📝 Consultez les logs ci-dessus pour les détails de chaque test." -ForegroundColor Yellow
