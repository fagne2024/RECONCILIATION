# Script de test simple du système de surveillance
Write-Host "🧪 Test simple du système de surveillance..." -ForegroundColor Green

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

# Créer un fichier d'exemple
$exampleFile = "watch-folder/test_clients.csv"
$csvContent = @"
nom;email;telephone;montant
Jean Dupont;jean.dupont@email.com;0123456789;1500,50
Marie Martin;marie.martin@email.com;0987654321;2300,75
Pierre Durand;pierre.durand@email.com;0555666777;890,25
"@
$csvContent | Out-File -FilePath $exampleFile -Encoding UTF8
Write-Host "✅ Fichier de test créé: $exampleFile" -ForegroundColor Green

Write-Host ""
Write-Host "🎯 Test du serveur..." -ForegroundColor Cyan

# Démarrer le serveur en arrière-plan
Write-Host "🚀 Démarrage du serveur..." -ForegroundColor Yellow
Start-Process -FilePath "node" -ArgumentList "simple-server.js" -WindowStyle Hidden

# Attendre que le serveur démarre
Write-Host "⏳ Attente du démarrage du serveur..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Tester l'API
Write-Host "🌐 Test de l'API..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/file-watcher/status" -Method GET -TimeoutSec 5
    Write-Host "✅ API accessible!" -ForegroundColor Green
    Write-Host "   Statut: $($response.isProcessing ? 'Actif' : 'Inactif')" -ForegroundColor White
    Write-Host "   Dossier surveillé: $($response.watchPath)" -ForegroundColor White
    Write-Host "   Fichiers en attente: $($response.queueLength)" -ForegroundColor White
} catch {
    Write-Host "❌ API non accessible" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# Tester la création d'une spécification
Write-Host ""
Write-Host "📝 Test de création de spécification..." -ForegroundColor Cyan
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
    
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/file-watcher/specifications" -Method POST -Body ($specData | ConvertTo-Json) -ContentType "application/json" -TimeoutSec 5
    Write-Host "✅ Spécification créée avec succès!" -ForegroundColor Green
    Write-Host "   ID: $($response.specification.id)" -ForegroundColor White
    Write-Host "   Nom: $($response.specification.name)" -ForegroundColor White
} catch {
    Write-Host "❌ Erreur lors de la création de la spécification" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 Test terminé!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Résumé:" -ForegroundColor Cyan
Write-Host "✅ Dossier de surveillance: $watchFolder" -ForegroundColor White
Write-Host "✅ Dossier de sortie: $outputFolder" -ForegroundColor White
Write-Host "✅ Fichier de test: $exampleFile" -ForegroundColor White
Write-Host "✅ Serveur: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "🎯 Prochaines étapes:" -ForegroundColor Yellow
Write-Host "1. Accédez à http://localhost:3000 pour tester l'API" -ForegroundColor White
Write-Host "2. Déposez des fichiers dans le dossier 'watch-folder'" -ForegroundColor White
Write-Host "3. Créez des spécifications via l'API" -ForegroundColor White 