# Script pour tester le chargement des colonnes depuis les fichiers Excel du watch-folder
$API_BASE_URL = "http://localhost:8080/api"

Write-Host "🧪 Test du chargement des colonnes depuis les fichiers Excel du watch-folder" -ForegroundColor Yellow

# 1. Vérifier que le dossier watch-folder existe
Write-Host "`n📁 Vérification du dossier watch-folder..." -ForegroundColor Cyan
$watchFolder = "watch-folder"

if (Test-Path $watchFolder) {
    Write-Host "✅ Dossier watch-folder trouvé: $watchFolder" -ForegroundColor Green
    
    # Lister les fichiers Excel dans le dossier
    $excelFiles = Get-ChildItem -Path $watchFolder -Filter "*.xls*" | Where-Object { !$_.PSIsContainer }
    Write-Host "📊 Fichiers Excel trouvés: $($excelFiles.Count)" -ForegroundColor Green
    
    foreach ($file in $excelFiles) {
        Write-Host "📄 Fichier Excel: $($file.Name)" -ForegroundColor Cyan
    }
} else {
    Write-Host "❌ Dossier watch-folder manquant: $watchFolder" -ForegroundColor Red
}

# 2. Tester l'endpoint de récupération des fichiers disponibles
Write-Host "`n🔍 Test de l'endpoint /file-watcher/available-files..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$API_BASE_URL/file-watcher/available-files" -Method GET
    Write-Host "✅ Réponse reçue:" -ForegroundColor Green
    Write-Host "📊 Nombre de fichiers: $($response.Count)" -ForegroundColor Green
    
    foreach ($file in $response) {
        Write-Host "📄 Fichier: $($file.fileName)" -ForegroundColor Cyan
        Write-Host "   Type: $($file.fileType)" -ForegroundColor Gray
        Write-Host "   Colonnes: $($file.columns.Count)" -ForegroundColor Gray
        Write-Host "   Colonnes: $($file.columns -join ', ')" -ForegroundColor Gray
        Write-Host "   Enregistrements: $($file.recordCount)" -ForegroundColor Gray
        Write-Host ""
    }
} catch {
    Write-Host "❌ Erreur lors de la récupération des fichiers: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Tester l'analyse d'un fichier spécifique
Write-Host "`n🔍 Test de l'analyse d'un fichier..." -ForegroundColor Cyan
try {
    # Prendre le premier fichier Excel trouvé
    $firstExcelFile = $response | Where-Object { $_.fileType -eq "excel" } | Select-Object -First 1
    
    if ($firstExcelFile) {
        Write-Host "📄 Analyse du fichier: $($firstExcelFile.fileName)" -ForegroundColor Cyan
        
        $analyzeResponse = Invoke-RestMethod -Uri "$API_BASE_URL/file-watcher/analyze-file" -Method POST -Body (@{
            filePath = $firstExcelFile.filePath
        } | ConvertTo-Json) -ContentType "application/json"
        
        Write-Host "✅ Analyse terminée:" -ForegroundColor Green
        Write-Host "📊 Colonnes: $($analyzeResponse.columns.Count)" -ForegroundColor Green
        Write-Host "📊 Données d'exemple: $($analyzeResponse.sampleData.Count) lignes" -ForegroundColor Green
        Write-Host "📊 Enregistrements totaux: $($analyzeResponse.recordCount)" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Aucun fichier Excel trouvé pour l'analyse" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Erreur lors de l'analyse: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Tester l'endpoint des modèles pour vérifier les colonnes chargées
Write-Host "`n📋 Test de l'endpoint des modèles..." -ForegroundColor Cyan
try {
    $modelsResponse = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models" -Method GET
    Write-Host "✅ Modèles récupérés: $($modelsResponse.models.Count)" -ForegroundColor Green
    
    foreach ($model in $modelsResponse.models) {
        Write-Host "📄 Modèle: $($model.name)" -ForegroundColor Cyan
        Write-Host "   ID: $($model.modelId)" -ForegroundColor Gray
        Write-Host "   Type: $($model.fileType)" -ForegroundColor Gray
        Write-Host "   Pattern: $($model.filePattern)" -ForegroundColor Gray
        
        if ($model.reconciliationKeys) {
            if ($model.reconciliationKeys.boKeys) {
                Write-Host "   Clés BO: $($model.reconciliationKeys.boKeys -join ', ')" -ForegroundColor Gray
            }
            if ($model.reconciliationKeys.partnerKeys) {
                Write-Host "   Clés Partner: $($model.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Gray
            }
        }
        
        if ($model.columnProcessingRules) {
            Write-Host "   Règles de traitement: $($model.columnProcessingRules.Count)" -ForegroundColor Gray
        }
        Write-Host ""
    }
} catch {
    Write-Host "❌ Erreur lors de la récupération des modèles: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n✅ Test terminé!" -ForegroundColor Green
