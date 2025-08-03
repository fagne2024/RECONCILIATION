# Test de la réconciliation automatique
Write-Host "🧪 Test de la réconciliation automatique" -ForegroundColor Green

# Test 1: Vérifier que le serveur fonctionne
Write-Host "`n📋 Test 1: Vérification du serveur" -ForegroundColor Yellow
try {
    $status = Invoke-RestMethod -Uri "http://localhost:3000/api/file-watcher/status" -Method GET
    Write-Host "✅ Serveur opérationnel" -ForegroundColor Green
    Write-Host "   📁 Dossier de surveillance: $($status.watchPath)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erreur de connexion au serveur: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Vérifier les modèles disponibles
Write-Host "`n🏗️ Test 2: Vérification des modèles de traitement automatique" -ForegroundColor Yellow
try {
    $models = Invoke-RestMethod -Uri "http://localhost:3000/api/auto-processing/models" -Method GET
    Write-Host "✅ Modèles récupérés avec succès" -ForegroundColor Green
    Write-Host "📊 Nombre de modèles: $($models.models.Count)" -ForegroundColor Cyan
    
    if ($models.models.Count -eq 0) {
        Write-Host "⚠️ Aucun modèle de traitement automatique trouvé" -ForegroundColor Yellow
        Write-Host "   💡 Créez d'abord des modèles dans l'interface de gestion des modèles" -ForegroundColor Gray
    } else {
        foreach ($model in $models.models) {
            Write-Host "   🏷️ $($model.name) - Type: $($model.fileType) - Pattern: $($model.filePattern)" -ForegroundColor White
        }
    }
} catch {
    Write-Host "❌ Erreur lors de la récupération des modèles: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Vérifier les fichiers disponibles
Write-Host "`n📄 Test 3: Vérification des fichiers disponibles" -ForegroundColor Yellow
try {
    $files = Invoke-RestMethod -Uri "http://localhost:3000/api/file-watcher/available-files" -Method GET
    Write-Host "✅ Fichiers récupérés avec succès" -ForegroundColor Green
    Write-Host "📊 Nombre de fichiers: $($files.Count)" -ForegroundColor Cyan
    
    foreach ($file in $files) {
        Write-Host "   📄 $($file.fileName) - Colonnes: $($file.columns.Count)" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Erreur lors de la récupération des fichiers: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Instructions pour tester la réconciliation automatique
Write-Host "`n🚀 Test 4: Instructions pour tester la réconciliation automatique" -ForegroundColor Yellow
Write-Host "Pour tester la réconciliation automatique:" -ForegroundColor White
Write-Host "1. Ouvrez l'application Angular dans votre navigateur" -ForegroundColor Gray
Write-Host "2. Allez dans la section 'Réconciliation Automatique'" -ForegroundColor Gray
Write-Host "3. Uploadez un fichier CSV depuis le dossier watch-folder" -ForegroundColor Gray
Write-Host "4. Le système devrait:" -ForegroundColor Gray
Write-Host "   - Détecter automatiquement le type de fichier (BO/Partenaire)" -ForegroundColor Gray
Write-Host "   - Trouver un modèle de traitement correspondant" -ForegroundColor Gray
Write-Host "   - Appliquer les étapes de traitement automatiquement" -ForegroundColor Gray
Write-Host "   - Lancer la réconciliation directement" -ForegroundColor Gray
Write-Host "   - Afficher les résultats finaux" -ForegroundColor Gray

Write-Host "`n📝 Fichiers de test disponibles:" -ForegroundColor Cyan
Write-Host "   - exemple_clients.csv (pour tester les modèles partenaire)" -ForegroundColor Gray
Write-Host "   - TRXBO.csv (pour tester les modèles BO)" -ForegroundColor Gray
Write-Host "   - PMMTNCM.csv (pour tester les modèles partenaire)" -ForegroundColor Gray

Write-Host "`n✅ Tests terminés" -ForegroundColor Green
Write-Host "💡 La réconciliation automatique est maintenant prête à être testée !" -ForegroundColor Cyan 