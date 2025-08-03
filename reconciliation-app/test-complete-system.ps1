# Script de test complet du système de surveillance
Write-Host "🧪 Test complet du système de surveillance..." -ForegroundColor Green

# Vérifier que Node.js est installé
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js détecté: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js n'est pas installé" -ForegroundColor Red
    exit 1
}

# Vérifier que les dépendances sont installées
if (!(Test-Path "node_modules")) {
    Write-Host "📦 Installation des dépendances..." -ForegroundColor Yellow
    npm install
}

# Vérifier que le dossier de surveillance existe
$watchFolder = "watch-folder"
if (!(Test-Path $watchFolder)) {
    Write-Host "📁 Création du dossier de surveillance..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $watchFolder
}

# Vérifier que le dossier de sortie existe
$outputFolder = "watch-folder/processed"
if (!(Test-Path $outputFolder)) {
    Write-Host "📁 Création du dossier de sortie..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $outputFolder
}

Write-Host ""
Write-Host "🎯 Test du serveur backend..." -ForegroundColor Cyan

# Démarrer le serveur backend en arrière-plan
Write-Host "🚀 Démarrage du serveur backend..." -ForegroundColor Yellow
Start-Process -FilePath "node" -ArgumentList "simple-server.js" -WindowStyle Hidden

# Attendre que le serveur démarre
Write-Host "⏳ Attente du démarrage du serveur..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Test 1: Statut de la surveillance
Write-Host "📊 Test 1: Statut de la surveillance" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/file-watcher/status" -Method GET -TimeoutSec 10
    Write-Host "✅ API accessible!" -ForegroundColor Green
    Write-Host "   Statut: $(if ($response.isProcessing) { 'Actif' } else { 'Inactif' })" -ForegroundColor White
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
        encoding = 'utf8'
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
Write-Host "✅ Backend: http://localhost:3000" -ForegroundColor White
Write-Host "✅ API: /api/file-watcher/*" -ForegroundColor White
Write-Host "✅ Dossier surveillé: $watchFolder" -ForegroundColor White
Write-Host "✅ Dossier de sortie: $outputFolder" -ForegroundColor White
Write-Host ""
Write-Host "🎯 Prochaines étapes:" -ForegroundColor Yellow
Write-Host "1. Démarrez le frontend: .\start-frontend.ps1" -ForegroundColor White
Write-Host "2. Accédez à http://localhost:4200" -ForegroundColor White
Write-Host "3. Cliquez sur 'Surveillance' dans le menu" -ForegroundColor White
Write-Host "4. Testez l'interface utilisateur" -ForegroundColor White 