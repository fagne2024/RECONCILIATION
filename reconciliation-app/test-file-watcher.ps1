# Script de test du système de surveillance de fichiers
Write-Host "🧪 Test du système de surveillance de fichiers..." -ForegroundColor Green

# Vérifier que le dossier de surveillance existe
$watchFolder = "watch-folder"
if (!(Test-Path $watchFolder)) {
    Write-Host "❌ Dossier de surveillance non trouvé: $watchFolder" -ForegroundColor Red
    exit 1
}

# Vérifier que le dossier de sortie existe
$outputFolder = "watch-folder/processed"
if (!(Test-Path $outputFolder)) {
    Write-Host "❌ Dossier de sortie non trouvé: $outputFolder" -ForegroundColor Red
    exit 1
}

# Vérifier qu'il y a des fichiers d'exemple
$exampleFiles = Get-ChildItem -Path $watchFolder -Filter "*.csv"
if ($exampleFiles.Count -eq 0) {
    Write-Host "⚠️ Aucun fichier CSV trouvé dans le dossier de surveillance" -ForegroundColor Yellow
} else {
    Write-Host "✅ Fichiers d'exemple trouvés:" -ForegroundColor Green
    foreach ($file in $exampleFiles) {
        Write-Host "   - $($file.Name)" -ForegroundColor White
    }
}

# Test de l'API (si le serveur est démarré)
Write-Host ""
Write-Host "🌐 Test de l'API..." -ForegroundColor Cyan

try {
    $statusResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/file-watcher/status" -Method GET -TimeoutSec 5
    Write-Host "✅ API accessible" -ForegroundColor Green
    Write-Host "   Statut: $($statusResponse.isProcessing ? 'Actif' : 'Inactif')" -ForegroundColor White
    Write-Host "   Dossier surveillé: $($statusResponse.watchPath)" -ForegroundColor White
    Write-Host "   Fichiers en attente: $($statusResponse.queueLength)" -ForegroundColor White
} catch {
    Write-Host "⚠️ API non accessible (serveur non démarré ou erreur de connexion)" -ForegroundColor Yellow
    Write-Host "   Pour démarrer le serveur: npm run start" -ForegroundColor White
}

# Test de création d'une spécification
Write-Host ""
Write-Host "📝 Test de création de spécification..." -ForegroundColor Cyan

$specification = @{
    name = "Test CSV Clients"
    filePattern = "*.csv"
    processingType = "csv"
    delimiter = ";"
    encoding = "utf8"
    outputFormat = "json"
    autoProcess = $true
    transformations = @(
        @{
            type = "format"
            field = "nom"
            action = "uppercase"
        },
        @{
            type = "validate"
            field = "email"
            action = "isEmail"
        },
        @{
            type = "transform"
            field = "montant"
            action = "replace"
            params = @{
                search = ","
                replace = "."
            }
        }
    )
}

try {
    $createResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/file-watcher/specifications" -Method POST -Body ($specification | ConvertTo-Json -Depth 10) -ContentType "application/json" -TimeoutSec 5
    Write-Host "✅ Spécification créée avec succès" -ForegroundColor Green
    Write-Host "   ID: $($createResponse.specification.id)" -ForegroundColor White
    Write-Host "   Nom: $($createResponse.specification.name)" -ForegroundColor White
} catch {
    Write-Host "⚠️ Impossible de créer la spécification (serveur non démarré)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎯 Instructions pour tester le système:" -ForegroundColor Green
Write-Host "1. Démarrez le backend: npm run start" -ForegroundColor White
Write-Host "2. Démarrez le frontend: cd frontend && npm start" -ForegroundColor White
Write-Host "3. Accédez à l'interface de surveillance" -ForegroundColor White
Write-Host "4. Créez une spécification pour traiter les fichiers CSV" -ForegroundColor White
Write-Host "5. Déposez des fichiers dans le dossier 'watch-folder'" -ForegroundColor White
Write-Host "6. Vérifiez les fichiers traités dans 'watch-folder/processed'" -ForegroundColor White

Write-Host ""
Write-Host "📁 Structure des dossiers:" -ForegroundColor Cyan
Write-Host "watch-folder/" -ForegroundColor White
Write-Host "├── exemple_clients.csv" -ForegroundColor White
Write-Host "└── processed/" -ForegroundColor White
Write-Host "    └── (fichiers traités)" -ForegroundColor White

Write-Host ""
Write-Host "✅ Test terminé!" -ForegroundColor Green 