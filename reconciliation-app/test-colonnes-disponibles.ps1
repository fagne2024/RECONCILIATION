# Test de récupération des colonnes disponibles
Write-Host "🧪 Test de récupération des colonnes disponibles" -ForegroundColor Green

# Test 1: Récupérer les fichiers disponibles
Write-Host "`n📋 Test 1: Récupération des fichiers disponibles" -ForegroundColor Yellow
try {
    $files = Invoke-RestMethod -Uri "http://localhost:3000/api/file-watcher/available-files" -Method GET
    Write-Host "✅ Fichiers récupérés avec succès" -ForegroundColor Green
    Write-Host "📊 Nombre de fichiers: $($files.Count)" -ForegroundColor Cyan
    
    foreach ($file in $files) {
        Write-Host "   📄 $($file.fileName) - Colonnes: $($file.columns.Count)" -ForegroundColor White
        Write-Host "      Colonnes: $($file.columns -join ', ')" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Erreur lors de la récupération des fichiers: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Analyser un fichier spécifique
Write-Host "`n🔍 Test 2: Analyse d'un fichier spécifique" -ForegroundColor Yellow
try {
    $filePath = "watch-folder\exemple_clients.csv"
    $body = @{filePath = $filePath} | ConvertTo-Json
    $analysis = Invoke-RestMethod -Uri "http://localhost:3000/api/file-watcher/analyze-file" -Method POST -Body $body -ContentType "application/json"
    Write-Host "✅ Analyse du fichier réussie" -ForegroundColor Green
    Write-Host "📄 Fichier: $($analysis.fileName)" -ForegroundColor Cyan
    Write-Host "📊 Colonnes: $($analysis.columns -join ', ')" -ForegroundColor White
} catch {
    Write-Host "❌ Erreur lors de l'analyse du fichier: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Vérifier les modèles existants
Write-Host "`n🏗️ Test 3: Vérification des modèles existants" -ForegroundColor Yellow
try {
    $models = Invoke-RestMethod -Uri "http://localhost:3000/api/auto-processing/models" -Method GET
    Write-Host "✅ Modèles récupérés avec succès" -ForegroundColor Green
    Write-Host "📊 Nombre de modèles: $($models.models.Count)" -ForegroundColor Cyan
    
    foreach ($model in $models.models) {
        Write-Host "   🏷️ $($model.name) - Type: $($model.fileType)" -ForegroundColor White
        if ($model.templateFile) {
            Write-Host "      📄 Fichier modèle: $($model.templateFile)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "❌ Erreur lors de la récupération des modèles: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n✅ Tests terminés" -ForegroundColor Green 