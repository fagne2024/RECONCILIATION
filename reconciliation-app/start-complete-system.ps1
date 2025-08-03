# Script de démarrage du système complet de surveillance
Write-Host "🚀 Démarrage du système complet de surveillance..." -ForegroundColor Green

# Vérifier que Node.js est installé
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js détecté: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js n'est pas installé. Veuillez l'installer depuis https://nodejs.org/" -ForegroundColor Red
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
Write-Host "🎯 Démarrage du backend (serveur de surveillance)..." -ForegroundColor Cyan
Write-Host "📁 Dossier surveillé: $watchFolder" -ForegroundColor White
Write-Host "🌐 API: http://localhost:3000" -ForegroundColor White
Write-Host ""

# Démarrer le serveur backend en arrière-plan
Write-Host "🚀 Démarrage du serveur backend..." -ForegroundColor Yellow
Start-Process -FilePath "node" -ArgumentList "simple-server.js" -WindowStyle Hidden

# Attendre que le serveur backend démarre
Write-Host "⏳ Attente du démarrage du backend..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Tester l'API backend
Write-Host "🌐 Test de l'API backend..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/file-watcher/status" -Method GET -TimeoutSec 10
    Write-Host "✅ Backend opérationnel!" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend non accessible" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎯 Démarrage du frontend Angular..." -ForegroundColor Cyan
Write-Host "🌐 URL: http://localhost:4200" -ForegroundColor White
Write-Host ""

# Aller dans le dossier frontend et démarrer Angular
$frontendPath = "frontend"
if (Test-Path $frontendPath) {
    Set-Location $frontendPath
    
    # Vérifier que les dépendances Angular sont installées
    if (!(Test-Path "node_modules")) {
        Write-Host "📦 Installation des dépendances Angular..." -ForegroundColor Yellow
        npm install
    }
    
    # Démarrer Angular
    Write-Host "🚀 Démarrage d'Angular..." -ForegroundColor Yellow
    Start-Process -FilePath "ng" -ArgumentList "serve", "--open" -WindowStyle Hidden
    
    # Revenir au dossier racine
    Set-Location ..
} else {
    Write-Host "❌ Dossier frontend non trouvé" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 Système complet démarré!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Résumé:" -ForegroundColor Cyan
Write-Host "✅ Backend: http://localhost:3000" -ForegroundColor White
Write-Host "✅ Frontend: http://localhost:4200" -ForegroundColor White
Write-Host "✅ Dossier surveillé: $watchFolder" -ForegroundColor White
Write-Host "✅ Dossier de sortie: $outputFolder" -ForegroundColor White
Write-Host ""
Write-Host "🎯 Utilisation:" -ForegroundColor Yellow
Write-Host "1. Accédez à http://localhost:4200" -ForegroundColor White
Write-Host "2. Cliquez sur 'Surveillance' dans le menu" -ForegroundColor White
Write-Host "3. Créez des spécifications de traitement" -ForegroundColor White
Write-Host "4. Déposez des fichiers dans '$watchFolder'" -ForegroundColor White
Write-Host ""
Write-Host "💡 Pour arrêter les serveurs, fermez les fenêtres de terminal" -ForegroundColor Yellow 