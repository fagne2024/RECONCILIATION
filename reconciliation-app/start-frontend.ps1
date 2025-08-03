# Script de démarrage du frontend Angular
Write-Host "🚀 Démarrage du frontend Angular..." -ForegroundColor Green

# Vérifier que Node.js est installé
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js détecté: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js n'est pas installé. Veuillez l'installer depuis https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Aller dans le dossier frontend
$frontendPath = "frontend"
if (!(Test-Path $frontendPath)) {
    Write-Host "❌ Dossier frontend non trouvé" -ForegroundColor Red
    exit 1
}

Write-Host "📁 Accès au dossier frontend..." -ForegroundColor Yellow
Set-Location $frontendPath

# Vérifier que les dépendances sont installées
if (!(Test-Path "node_modules")) {
    Write-Host "📦 Installation des dépendances Angular..." -ForegroundColor Yellow
    npm install
}

Write-Host ""
Write-Host "🎯 Démarrage du serveur de développement Angular..." -ForegroundColor Cyan
Write-Host "📁 Dossier: $frontendPath" -ForegroundColor White
Write-Host "🌐 URL: http://localhost:4200" -ForegroundColor White
Write-Host "🔗 API: http://localhost:3000" -ForegroundColor White
Write-Host ""

# Démarrer le serveur Angular
try {
    ng serve --open
} catch {
    Write-Host "❌ Erreur lors du démarrage d'Angular: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 Solutions possibles:" -ForegroundColor Yellow
    Write-Host "1. Vérifiez que Angular CLI est installé: npm install -g @angular/cli" -ForegroundColor White
    Write-Host "2. Vérifiez que toutes les dépendances sont installées: npm install" -ForegroundColor White
    Write-Host "3. Vérifiez que le port 4200 est disponible" -ForegroundColor White
} 