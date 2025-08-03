# Test de connexion frontend-backend pour la fonctionnalité de sélection de fichiers modèles

Write-Host "🧪 Test de connexion frontend-backend" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# 1. Vérifier que le serveur backend est démarré
Write-Host "`n1️⃣ Vérification du serveur backend..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/file-watcher/status" -Method GET -TimeoutSec 5
    Write-Host "✅ Serveur backend accessible" -ForegroundColor Green
    Write-Host "   📁 Dossier de surveillance: $($response.watchPath)" -ForegroundColor White
    Write-Host "   🔄 Surveillance active: $($response.isProcessing)" -ForegroundColor White
} catch {
    Write-Host "❌ Serveur backend non accessible: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   💡 Démarrez le serveur avec: node simple-server.js" -ForegroundColor Gray
    exit 1
}

# 2. Tester l'endpoint de récupération des fichiers
Write-Host "`n2️⃣ Test de l'endpoint available-files..." -ForegroundColor Yellow

try {
    $files = Invoke-RestMethod -Uri "http://localhost:3000/api/file-watcher/available-files" -Method GET -TimeoutSec 10
    Write-Host "✅ Endpoint available-files fonctionnel" -ForegroundColor Green
    Write-Host "   📄 Fichiers trouvés: $($files.Count)" -ForegroundColor White
    
    if ($files.Count -gt 0) {
        foreach ($file in $files) {
            Write-Host "      - $($file.fileName) ($($file.fileType))" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ⚠️ Aucun fichier trouvé dans watch-folder" -ForegroundColor Yellow
        Write-Host "   💡 Placez des fichiers CSV, JSON ou Excel dans le dossier watch-folder" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Erreur endpoint available-files: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 3. Tester l'endpoint d'analyse de fichier
Write-Host "`n3️⃣ Test de l'endpoint analyze-file..." -ForegroundColor Yellow

if ($files.Count -gt 0) {
    $testFile = $files[0]
    try {
        $analysis = Invoke-RestMethod -Uri "http://localhost:3000/api/file-watcher/analyze-file" -Method POST -Body (@{
            filePath = $testFile.filePath
        } | ConvertTo-Json) -ContentType "application/json" -TimeoutSec 10
        
        Write-Host "✅ Endpoint analyze-file fonctionnel" -ForegroundColor Green
        Write-Host "   📊 Fichier analysé: $($analysis.fileName)" -ForegroundColor White
        Write-Host "   📋 Colonnes: $($analysis.columns -join ', ')" -ForegroundColor White
        Write-Host "   📈 Enregistrements: $($analysis.recordCount)" -ForegroundColor White
    } catch {
        Write-Host "❌ Erreur endpoint analyze-file: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "⚠️ Impossible de tester analyze-file (aucun fichier disponible)" -ForegroundColor Yellow
}

# 4. Instructions pour tester le frontend
Write-Host "`n4️⃣ Instructions pour tester le frontend:" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan

Write-Host "🌐 Pour tester l'interface frontend:" -ForegroundColor White
Write-Host "   1. Démarrez le frontend Angular:" -ForegroundColor Gray
Write-Host "      cd frontend" -ForegroundColor Gray
Write-Host "      ng serve" -ForegroundColor Gray
Write-Host "   2. Ouvrez http://localhost:4200" -ForegroundColor Gray
Write-Host "   3. Allez dans 'Modèles de Traitement'" -ForegroundColor Gray
Write-Host "   4. Cliquez sur 'Nouveau modèle'" -ForegroundColor Gray
Write-Host "   5. Cliquez sur 'Choisir' pour sélectionner un fichier modèle" -ForegroundColor Gray

Write-Host "`n🔧 Dépannage:" -ForegroundColor White
Write-Host "   - Si l'erreur persiste, vérifiez la console du navigateur (F12)" -ForegroundColor Gray
Write-Host "   - Vérifiez que le serveur backend est bien sur le port 3000" -ForegroundColor Gray
Write-Host "   - Vérifiez que CORS est activé sur le serveur" -ForegroundColor Gray

Write-Host "`n✅ Test de connexion terminé!" -ForegroundColor Green
Write-Host "🚀 Le backend est prêt pour la fonctionnalité de sélection de fichiers modèles." -ForegroundColor Cyan 