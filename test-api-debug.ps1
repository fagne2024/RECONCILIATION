# Test API Debug - Diagnostic Erreur 400
# Ce script teste l'API pour identifier la cause de l'erreur 400

Write-Host "🔍 Test API Debug - Diagnostic Erreur 400" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Test 1: Vérifier que l'API est accessible
Write-Host "`n1️⃣ Test de connectivité API..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    Write-Host "✅ API accessible - ${($response | Measure-Object).Count} modèles trouvés" -ForegroundColor Green
} catch {
    Write-Host "❌ API non accessible: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Créer un modèle simple
Write-Host "`n2️⃣ Test création modèle simple..." -ForegroundColor Yellow
$simpleModel = @{
    name = "Test Simple Debug"
    fileType = "partner"
    templateFile = "OPPART.xls"
    filePattern = "*.xls"
    autoApply = $true
    reconciliationKeys = @{
        partnerKeys = @()
        boKeys = @()
        boModels = @()
        boModelKeys = @{}
        boTreatments = @{}
    }
    columnProcessingRules = @()
}

try {
    $jsonData = $simpleModel | ConvertTo-Json -Depth 10
    Write-Host "📤 Données envoyées: $jsonData" -ForegroundColor Gray
    
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method POST -Body $jsonData -ContentType "application/json"
    Write-Host "✅ Modèle simple créé avec succès: $($response.modelId)" -ForegroundColor Green
    
    # Sauvegarder l'ID pour les tests suivants
    $testModelId = $response.modelId
} catch {
    Write-Host "❌ Erreur création modèle simple: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $errorBody = $reader.ReadToEnd()
        Write-Host "📄 Corps de l'erreur: $errorBody" -ForegroundColor Red
    }
}

# Test 3: Mettre à jour le modèle avec des colonnes
Write-Host "`n3️⃣ Test mise à jour avec colonnes..." -ForegroundColor Yellow
if ($testModelId) {
    $updateModel = @{
        name = "Test Simple Debug Updated"
        fileType = "partner"
        templateFile = "OPPART.xls"
        filePattern = "*.xls"
        autoApply = $true
        reconciliationKeys = @{
            partnerKeys = @("ID Opération", "Montant")
            boKeys = @()
            boModels = @()
            boModelKeys = @{}
            boTreatments = @{}
        }
        columnProcessingRules = @()
    }
    
    try {
        $jsonData = $updateModel | ConvertTo-Json -Depth 10
        Write-Host "📤 Données de mise à jour: $jsonData" -ForegroundColor Gray
        
        $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$testModelId" -Method PUT -Body $jsonData -ContentType "application/json"
        Write-Host "✅ Modèle mis à jour avec succès" -ForegroundColor Green
    } catch {
        Write-Host "❌ Erreur mise à jour modèle: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $errorResponse = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorResponse)
            $errorBody = $reader.ReadToEnd()
            Write-Host "📄 Corps de l'erreur: $errorBody" -ForegroundColor Red
        }
    }
}

# Test 4: Tester avec des colonnes problématiques
Write-Host "`n4️⃣ Test avec colonnes problématiques..." -ForegroundColor Yellow
if ($testModelId) {
    $problematicModel = @{
        name = "Test Colonnes Problématiques"
        fileType = "partner"
        templateFile = "OPPART.xls"
        filePattern = "*.xls"
        autoApply = $true
        reconciliationKeys = @{
            partnerKeys = @("ID Opération", "Type Opération", "Montant", "Solde avant", "Solde aprés")
            boKeys = @()
            boModels = @()
            boModelKeys = @{}
            boTreatments = @{}
        }
        columnProcessingRules = @()
    }
    
    try {
        $jsonData = $problematicModel | ConvertTo-Json -Depth 10
        Write-Host "📤 Données avec colonnes problématiques: $jsonData" -ForegroundColor Gray
        
        $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$testModelId" -Method PUT -Body $jsonData -ContentType "application/json"
        Write-Host "✅ Modèle avec colonnes problématiques mis à jour avec succès" -ForegroundColor Green
    } catch {
        Write-Host "❌ Erreur avec colonnes problématiques: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $errorResponse = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorResponse)
            $errorBody = $reader.ReadToEnd()
            Write-Host "📄 Corps de l'erreur: $errorBody" -ForegroundColor Red
        }
    }
}

Write-Host "`n🏁 Tests terminés" -ForegroundColor Cyan
Write-Host "Consultez les resultats ci-dessus pour identifier la cause de l'erreur 400" -ForegroundColor Yellow
