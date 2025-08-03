# Script de démarrage du système de surveillance de fichiers
Write-Host "🚀 Démarrage du système de surveillance de fichiers..." -ForegroundColor Green

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

# Créer un fichier d'exemple s'il n'existe pas
$exampleFile = "watch-folder/exemple_clients.csv"
if (!(Test-Path $exampleFile)) {
    Write-Host "📄 Création du fichier d'exemple..." -ForegroundColor Yellow
    $csvContent = @"
nom;email;telephone;montant
Jean Dupont;jean.dupont@email.com;0123456789;1500,50
Marie Martin;marie.martin@email.com;0987654321;2300,75
Pierre Durand;pierre.durand@email.com;0555666777;890,25
"@
    $csvContent | Out-File -FilePath $exampleFile -Encoding UTF8
}

Write-Host ""
Write-Host "🎯 Démarrage du serveur..." -ForegroundColor Cyan
Write-Host "📁 Dossier surveillé: $watchFolder" -ForegroundColor White
Write-Host "📁 Dossier de sortie: $outputFolder" -ForegroundColor White
Write-Host "🌐 API: http://localhost:3000" -ForegroundColor White
Write-Host ""

# Démarrer le serveur
try {
    node server.js
} catch {
    Write-Host "❌ Erreur lors du démarrage du serveur: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 Solutions possibles:" -ForegroundColor Yellow
    Write-Host "1. Vérifiez que toutes les dépendances sont installées: npm install" -ForegroundColor White
    Write-Host "2. Vérifiez que le port 3000 est disponible" -ForegroundColor White
    Write-Host "3. Vérifiez les logs d'erreur ci-dessus" -ForegroundColor White
} 