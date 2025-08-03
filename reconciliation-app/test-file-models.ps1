# Test de la fonctionnalité de sélection de fichiers modèles
# Ce script teste l'intégration entre les fichiers watch-folder et les modèles de traitement automatique

Write-Host "🧪 Test de la fonctionnalité de sélection de fichiers modèles" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Vérifier que le serveur backend est démarré
Write-Host "`n1️⃣ Vérification du serveur backend..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/file-watcher/status" -Method GET -TimeoutSec 5
    Write-Host "✅ Serveur backend accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ Serveur backend non accessible. Démarrage..." -ForegroundColor Red
    
    # Démarrer le serveur backend
    Start-Process -FilePath "node" -ArgumentList "simple-server.js" -WindowStyle Hidden
    Start-Sleep -Seconds 3
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3000/api/file-watcher/status" -Method GET -TimeoutSec 5
        Write-Host "✅ Serveur backend démarré avec succès" -ForegroundColor Green
    } catch {
        Write-Host "❌ Impossible de démarrer le serveur backend" -ForegroundColor Red
        exit 1
    }
}

# 2. Créer des fichiers de test dans watch-folder
Write-Host "`n2️⃣ Création de fichiers de test dans watch-folder..." -ForegroundColor Yellow

$watchFolder = "watch-folder"
if (-not (Test-Path $watchFolder)) {
    New-Item -ItemType Directory -Path $watchFolder -Force
    Write-Host "📁 Dossier watch-folder créé" -ForegroundColor Green
}

# Fichier CSV de test avec des colonnes
$csvContent = @"
id,nom,montant,date,description
1,Client A,1500.50,2024-01-15,Paiement facture
2,Client B,2300.75,2024-01-16,Remboursement
3,Client C,890.25,2024-01-17,Commission
"@

$csvContent | Out-File -FilePath "$watchFolder/exemple_clients.csv" -Encoding UTF8
Write-Host "✅ Fichier exemple_clients.csv créé" -ForegroundColor Green

# Fichier JSON de test
$jsonContent = @"
[
  {
    "id": "BO001",
    "reference": "REF-2024-001",
    "montant": 2500.00,
    "date_operation": "2024-01-15",
    "type": "credit",
    "description": "Virement reçu"
  },
  {
    "id": "BO002", 
    "reference": "REF-2024-002",
    "montant": 1800.50,
    "date_operation": "2024-01-16",
    "type": "debit",
    "description": "Paiement fournisseur"
  }
]
"@

$jsonContent | Out-File -FilePath "$watchFolder/exemple_operations.json" -Encoding UTF8
Write-Host "✅ Fichier exemple_operations.json créé" -ForegroundColor Green

# 3. Tester l'API de récupération des fichiers disponibles
Write-Host "`n3️⃣ Test de l'API de récupération des fichiers..." -ForegroundColor Yellow

try {
    $files = Invoke-RestMethod -Uri "http://localhost:3000/api/file-watcher/available-files" -Method GET
    Write-Host "✅ Fichiers disponibles récupérés:" -ForegroundColor Green
    foreach ($file in $files) {
        Write-Host "   📄 $($file.fileName) ($($file.fileType))" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Erreur lors de la récupération des fichiers: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Tester l'analyse d'un fichier spécifique
Write-Host "`n4️⃣ Test de l'analyse d'un fichier..." -ForegroundColor Yellow

try {
    $analysis = Invoke-RestMethod -Uri "http://localhost:3000/api/file-watcher/analyze-file" -Method POST -Body (@{
        filePath = "watch-folder/exemple_clients.csv"
    } | ConvertTo-Json) -ContentType "application/json"
    
    Write-Host "✅ Analyse du fichier exemple_clients.csv:" -ForegroundColor Green
    Write-Host "   📊 Colonnes: $($analysis.columns -join ', ')" -ForegroundColor White
    Write-Host "   📈 Enregistrements: $($analysis.recordCount)" -ForegroundColor White
    Write-Host "   📋 Type: $($analysis.fileType)" -ForegroundColor White
    
    if ($analysis.sampleData.Count -gt 0) {
        Write-Host "   📝 Échantillon de données:" -ForegroundColor White
        $analysis.sampleData | ForEach-Object {
            Write-Host "      $($_.id) - $($_.nom) - $($_.montant)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "❌ Erreur lors de l'analyse du fichier: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Tester l'analyse du fichier JSON
Write-Host "`n5️⃣ Test de l'analyse du fichier JSON..." -ForegroundColor Yellow

try {
    $jsonAnalysis = Invoke-RestMethod -Uri "http://localhost:3000/api/file-watcher/analyze-file" -Method POST -Body (@{
        filePath = "watch-folder/exemple_operations.json"
    } | ConvertTo-Json) -ContentType "application/json"
    
    Write-Host "✅ Analyse du fichier exemple_operations.json:" -ForegroundColor Green
    Write-Host "   📊 Colonnes: $($jsonAnalysis.columns -join ', ')" -ForegroundColor White
    Write-Host "   📈 Enregistrements: $($jsonAnalysis.recordCount)" -ForegroundColor White
    Write-Host "   📋 Type: $($jsonAnalysis.fileType)" -ForegroundColor White
} catch {
    Write-Host "❌ Erreur lors de l'analyse du fichier JSON: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. Instructions pour tester l'interface frontend
Write-Host "`n6️⃣ Instructions pour tester l'interface frontend:" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Cyan

Write-Host "🌐 Pour tester l'interface frontend:" -ForegroundColor White
Write-Host "   1. Démarrez le frontend Angular:" -ForegroundColor Gray
Write-Host "      cd frontend && ng serve" -ForegroundColor Gray
Write-Host "   2. Ouvrez http://localhost:4200" -ForegroundColor Gray
Write-Host "   3. Allez dans 'Modèles de Traitement'" -ForegroundColor Gray
Write-Host "   4. Cliquez sur 'Nouveau modèle'" -ForegroundColor Gray
Write-Host "   5. Cliquez sur 'Choisir' pour sélectionner un fichier modèle" -ForegroundColor Gray
Write-Host "   6. Sélectionnez un fichier dans la liste" -ForegroundColor Gray
Write-Host "   7. Vérifiez que les colonnes sont automatiquement disponibles" -ForegroundColor Gray

Write-Host "`n📋 Fonctionnalités à tester:" -ForegroundColor White
Write-Host "   ✅ Sélection de fichiers modèles depuis watch-folder" -ForegroundColor Green
Write-Host "   ✅ Extraction automatique des colonnes" -ForegroundColor Green
Write-Host "   ✅ Auto-remplissage du pattern de fichier" -ForegroundColor Green
Write-Host "   ✅ Sélection de colonnes dans les étapes de traitement" -ForegroundColor Green
Write-Host "   ✅ Création de modèles basés sur des fichiers existants" -ForegroundColor Green

Write-Host "`n🎯 Résumé des fichiers créés:" -ForegroundColor Cyan
Write-Host "   📄 watch-folder/exemple_clients.csv" -ForegroundColor White
Write-Host "   📄 watch-folder/exemple_operations.json" -ForegroundColor White

Write-Host "`n✅ Test de la fonctionnalité de sélection de fichiers modèles terminé!" -ForegroundColor Green
Write-Host "🚀 Vous pouvez maintenant tester l'interface frontend avec ces fichiers." -ForegroundColor Cyan 