# Test simple de l'API du système de surveillance
Write-Host "🧪 Test de l'API du système de surveillance..." -ForegroundColor Green

# Attendre que le serveur soit prêt
Write-Host "⏳ Attente du serveur..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Test 1: Statut de la surveillance
Write-Host "📊 Test 1: Statut de la surveillance" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/file-watcher/status" -Method GET -TimeoutSec 10
    Write-Host "✅ API accessible!" -ForegroundColor Green
    Write-Host "   Statut: $($response.isProcessing ? 'Actif' : 'Inactif')" -ForegroundColor White
    Write-Host "   Dossier surveillé: $($response.watchPath)" -ForegroundColor White
    Write-Host "   Fichiers en attente: $($response.queueLength)" -ForegroundColor White
} catch {
    Write-Host "❌ API non accessible" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Démarrer la surveillance
Write-Host ""
Write-Host "🚀 Test 2: Démarrer la surveillance" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/file-watcher/start" -Method POST -TimeoutSec 10
    Write-Host "✅ Surveillance démarrée!" -ForegroundColor Green
    Write-Host "   Message: $($response.message)" -ForegroundColor White
} catch {
    Write-Host "❌ Erreur lors du démarrage" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Créer une spécification
Write-Host ""
Write-Host "📝 Test 3: Créer une spécification" -ForegroundColor Cyan
try {
    $specData = @{
        name = "Test CSV Clients"
        filePattern = "*.csv"
        processingType = "csv"
        delimiter = ";"
        encoding = "utf8"
        outputFormat = "json"
        autoProcess = $true
    }
    
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/file-watcher/specifications" -Method POST -Body ($specData | ConvertTo-Json) -ContentType "application/json" -TimeoutSec 10
    Write-Host "✅ Spécification créée!" -ForegroundColor Green
    Write-Host "   ID: $($response.specification.id)" -ForegroundColor White
    Write-Host "   Nom: $($response.specification.name)" -ForegroundColor White
} catch {
    Write-Host "❌ Erreur lors de la création" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Lister les spécifications
Write-Host ""
Write-Host "📋 Test 4: Lister les spécifications" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/file-watcher/specifications" -Method GET -TimeoutSec 10
    Write-Host "✅ Spécifications récupérées!" -ForegroundColor Green
    Write-Host "   Nombre: $($response.specifications.Count)" -ForegroundColor White
    foreach ($spec in $response.specifications) {
        Write-Host "   - $($spec.name) ($($spec.filePattern))" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Erreur lors de la récupération" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Obtenir les exemples
Write-Host ""
Write-Host "💡 Test 5: Obtenir les exemples" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/file-watcher/examples" -Method GET -TimeoutSec 10
    Write-Host "✅ Exemples récupérés!" -ForegroundColor Green
    Write-Host "   Nombre: $($response.examples.Count)" -ForegroundColor White
    foreach ($example in $response.examples) {
        Write-Host "   - $($example.name)" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Erreur lors de la récupération" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 Tous les tests sont terminés!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Résumé du système:" -ForegroundColor Cyan
Write-Host "✅ Serveur: http://localhost:3000" -ForegroundColor White
Write-Host "✅ API: /api/file-watcher/*" -ForegroundColor White
Write-Host "✅ Dossier surveillé: watch-folder" -ForegroundColor White
Write-Host ""
Write-Host "🎯 Prochaines étapes:" -ForegroundColor Yellow
Write-Host "1. Déposez des fichiers dans 'watch-folder'" -ForegroundColor White
Write-Host "2. Créez des spécifications via l'API" -ForegroundColor White
Write-Host "3. Surveillez les fichiers traités" -ForegroundColor White 