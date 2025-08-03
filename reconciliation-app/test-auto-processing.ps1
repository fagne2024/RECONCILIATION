# Script de test du système de traitement automatique
Write-Host "🧪 Test du système de traitement automatique..." -ForegroundColor Green

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

Write-Host ""
Write-Host "🎯 Test du système complet..." -ForegroundColor Cyan

# Démarrer le serveur backend en arrière-plan
Write-Host "🚀 Démarrage du serveur backend..." -ForegroundColor Yellow
Start-Process -FilePath "node" -ArgumentList "simple-server.js" -WindowStyle Hidden

# Attendre que le serveur démarre
Write-Host "⏳ Attente du démarrage du serveur..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Test 1: Vérifier que l'API est accessible
Write-Host "📊 Test 1: Vérification de l'API" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/file-watcher/status" -Method GET -TimeoutSec 10
    Write-Host "✅ API accessible!" -ForegroundColor Green
} catch {
    Write-Host "❌ API non accessible" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Créer des fichiers de test
Write-Host ""
Write-Host "📝 Test 2: Création de fichiers de test" -ForegroundColor Cyan

# Créer un fichier BO de test
$boTestFile = "watch-folder/bo_test_2024.csv"
$boContent = @"
date,montant,description,compte
01/01/2024,1500.50,Facture client A,401000
02/01/2024,2500.75,Facture client B,401000
03/01/2024,1800.25,Facture client C,401000
"@

if (!(Test-Path "watch-folder")) {
    New-Item -ItemType Directory -Path "watch-folder"
}

$boContent | Out-File -FilePath $boTestFile -Encoding UTF8
Write-Host "✅ Fichier BO de test créé: $boTestFile" -ForegroundColor Green

# Créer un fichier Partenaire de test
$partnerTestFile = "watch-folder/partner_test_2024.csv"
$partnerContent = @"
date,montant,reference,type
01/01/2024,1500.50,REF001,vente
02/01/2024,2500.75,REF002,vente
03/01/2024,1800.25,REF003,vente
"@

$partnerContent | Out-File -FilePath $partnerTestFile -Encoding UTF8
Write-Host "✅ Fichier Partenaire de test créé: $partnerTestFile" -ForegroundColor Green

# Test 3: Démarrer la surveillance
Write-Host ""
Write-Host "🚀 Test 3: Démarrage de la surveillance" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/file-watcher/start" -Method POST -TimeoutSec 10
    Write-Host "✅ Surveillance démarrée!" -ForegroundColor Green
    Write-Host "   Message: $($response.message)" -ForegroundColor White
} catch {
    Write-Host "❌ Erreur lors du démarrage" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Créer des spécifications de traitement automatique
Write-Host ""
Write-Host "📋 Test 4: Création de spécifications automatiques" -ForegroundColor Cyan

# Spécification pour BO
$boSpecData = @{
    name = "BO Auto Processing"
    filePattern = "*bo*.csv"
    processingType = "csv"
    delimiter = ";"
    encoding = "utf8"
    outputFormat = "json"
    autoProcess = $true
}

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/file-watcher/specifications" -Method POST -Body ($boSpecData | ConvertTo-Json) -ContentType "application/json" -TimeoutSec 10
    Write-Host "✅ Spécification BO créée!" -ForegroundColor Green
    Write-Host "   ID: $($response.specification.id)" -ForegroundColor White
} catch {
    Write-Host "❌ Erreur lors de la création BO" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# Spécification pour Partenaire
$partnerSpecData = @{
    name = "Partner Auto Processing"
    filePattern = "*partner*.csv"
    processingType = "csv"
    delimiter = ";"
    encoding = "utf8"
    outputFormat = "json"
    autoProcess = $true
}

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/file-watcher/specifications" -Method POST -Body ($partnerSpecData | ConvertTo-Json) -ContentType "application/json" -TimeoutSec 10
    Write-Host "✅ Spécification Partenaire créée!" -ForegroundColor Green
    Write-Host "   ID: $($response.specification.id)" -ForegroundColor White
} catch {
    Write-Host "❌ Erreur lors de la création Partenaire" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Vérifier les spécifications
Write-Host ""
Write-Host "📋 Test 5: Vérification des spécifications" -ForegroundColor Cyan
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

Write-Host ""
Write-Host "🎉 Tests terminés!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Résumé du système:" -ForegroundColor Cyan
Write-Host "✅ Backend: http://localhost:3000" -ForegroundColor White
Write-Host "✅ API: /api/file-watcher/*" -ForegroundColor White
Write-Host "✅ Fichiers de test créés" -ForegroundColor White
Write-Host "✅ Spécifications automatiques configurées" -ForegroundColor White
Write-Host ""
Write-Host "🎯 Prochaines étapes:" -ForegroundColor Yellow
Write-Host "1. Démarrez le frontend: .\start-frontend.ps1" -ForegroundColor White
Write-Host "2. Accédez à http://localhost:4200" -ForegroundColor White
Write-Host "3. Testez l'upload de fichiers avec traitement automatique" -ForegroundColor White
Write-Host "4. Vérifiez les modèles dans 'Modèles de Traitement'" -ForegroundColor White
Write-Host ""
Write-Host "💡 Les fichiers de test sont dans watch-folder/" -ForegroundColor Yellow
Write-Host "   - bo_test_2024.csv" -ForegroundColor White
Write-Host "   - partner_test_2024.csv" -ForegroundColor White 