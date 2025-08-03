# Script d'installation du système de surveillance de fichiers
Write-Host "🔧 Installation du système de surveillance de fichiers..." -ForegroundColor Green

# Vérifier si Node.js est installé
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js détecté: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js n'est pas installé. Veuillez l'installer depuis https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Installer les dépendances
Write-Host "📦 Installation des dépendances..." -ForegroundColor Yellow
npm install

# Créer le dossier de surveillance
$watchFolder = "watch-folder"
if (!(Test-Path $watchFolder)) {
    New-Item -ItemType Directory -Path $watchFolder
    Write-Host "✅ Dossier de surveillance créé: $watchFolder" -ForegroundColor Green
} else {
    Write-Host "✅ Dossier de surveillance existe déjà: $watchFolder" -ForegroundColor Green
}

# Créer le dossier de sortie
$outputFolder = "watch-folder/processed"
if (!(Test-Path $outputFolder)) {
    New-Item -ItemType Directory -Path $outputFolder
    Write-Host "✅ Dossier de sortie créé: $outputFolder" -ForegroundColor Green
} else {
    Write-Host "✅ Dossier de sortie existe déjà: $outputFolder" -ForegroundColor Green
}

# Créer un fichier d'exemple
$exampleFile = "watch-folder/exemple_clients.csv"
if (!(Test-Path $exampleFile)) {
    $csvContent = @"
nom;email;telephone;montant
Jean Dupont;jean.dupont@email.com;0123456789;1500.50
Marie Martin;marie.martin@email.com;0987654321;2300.75
Pierre Durand;pierre.durand@email.com;0555666777;890.25
"@
    $csvContent | Out-File -FilePath $exampleFile -Encoding UTF8
    Write-Host "✅ Fichier d'exemple créé: $exampleFile" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎉 Installation terminée avec succès!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Instructions d'utilisation:" -ForegroundColor Cyan
Write-Host "1. Démarrez le backend: npm run start" -ForegroundColor White
Write-Host "2. Démarrez le frontend: cd frontend && npm start" -ForegroundColor White
Write-Host "3. Accédez à l'interface de surveillance dans votre navigateur" -ForegroundColor White
Write-Host "4. Créez une spécification pour traiter vos fichiers" -ForegroundColor White
Write-Host "5. Déposez vos fichiers dans le dossier 'watch-folder'" -ForegroundColor White
Write-Host ""
Write-Host "📁 Dossier de surveillance: $watchFolder" -ForegroundColor Yellow
Write-Host "📁 Dossier de sortie: $outputFolder" -ForegroundColor Yellow
Write-Host "" 