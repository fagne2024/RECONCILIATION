# Script PowerShell pour mettre à jour les modèles avec les nouvelles options de formatage
# Auteur: Système de traitement de données
# Date: 2025-01-08

Write-Host "🚀 Script de mise à jour des modèles avec nouvelles options de formatage" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Cyan

# Vérifier si Node.js est installé
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js détecté: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js n'est pas installé ou n'est pas dans le PATH" -ForegroundColor Red
    Write-Host "Veuillez installer Node.js depuis https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Vérifier si le fichier de script existe
$scriptPath = "update-models-with-new-formatting.js"
if (-not (Test-Path $scriptPath)) {
    Write-Host "❌ Le fichier $scriptPath n'existe pas" -ForegroundColor Red
    Write-Host "Assurez-vous d'être dans le bon répertoire" -ForegroundColor Yellow
    exit 1
}

# Vérifier si le backend est en cours d'exécution
Write-Host "🔍 Vérification de la connectivité du backend..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET -TimeoutSec 5
    Write-Host "✅ Backend accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ Impossible de se connecter au backend sur http://localhost:8080" -ForegroundColor Red
    Write-Host "Veuillez démarrer le backend avant d'exécuter ce script" -ForegroundColor Yellow
    exit 1
}

# Installer les dépendances si nécessaire
Write-Host "📦 Vérification des dépendances..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installation des dépendances..." -ForegroundColor Yellow
    npm install axios
} else {
    Write-Host "✅ Dépendances déjà installées" -ForegroundColor Green
}

# Exécuter le script de mise à jour
Write-Host "🔄 Exécution du script de mise à jour..." -ForegroundColor Yellow
try {
    node $scriptPath
    Write-Host "✅ Script exécuté avec succès" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors de l'exécution du script: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "✅ Mise à jour terminée" -ForegroundColor Green

# Afficher les informations sur les nouvelles fonctionnalités
Write-Host "`n📋 Nouvelles fonctionnalités ajoutées:" -ForegroundColor Cyan
Write-Host "• 🔧 Normalisation des en-têtes de colonnes" -ForegroundColor White
Write-Host "• 🔧 Correction des caractères spéciaux corrompus" -ForegroundColor White
Write-Host "• 🔢 Formatage automatique en nombre" -ForegroundColor White

Write-Host "`n📖 Documentation disponible:" -ForegroundColor Cyan
Write-Host "• guides/FORMATAGE_NOMBRE.md" -ForegroundColor White
Write-Host "• guides/TRAITEMENT_CARACTERES_SPECIAUX_ENTETES.md" -ForegroundColor White

Write-Host "`n🎯 Les modèles OPPART et USSDPART ont été mis à jour avec ces nouvelles options" -ForegroundColor Green 