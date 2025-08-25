# Script PowerShell pour tester les optimisations 2M lignes
# Auteur: Assistant IA
# Date: $(Get-Date -Format "yyyy-MM-dd")

Write-Host "🚀 TEST DES OPTIMISATIONS 2M LIGNES - MENU TRAITEMENT" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan

# Vérifier que Node.js est installé
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js détecté: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js n'est pas installé. Veuillez l'installer depuis https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Vérifier que le script de test existe
$testScriptPath = "./test-performance-2m.js"
if (-not (Test-Path $testScriptPath)) {
    Write-Host "❌ Script de test non trouvé: $testScriptPath" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Configuration du test:" -ForegroundColor Yellow
Write-Host "   - Script de test: $testScriptPath" -ForegroundColor White
Write-Host "   - Répertoire de sortie: ./test-files" -ForegroundColor White
Write-Host "   - Taille maximale: 2,000,000 lignes" -ForegroundColor White
Write-Host ""

# Demander confirmation
$confirmation = Read-Host "Voulez-vous générer les fichiers de test? (O/N)"
if ($confirmation -ne "O" -and $confirmation -ne "o") {
    Write-Host "❌ Test annulé par l'utilisateur" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "🔄 Génération des fichiers de test en cours..." -ForegroundColor Yellow

# Exécuter le script de test
try {
    $startTime = Get-Date
    node $testScriptPath
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds
    
    Write-Host ""
    Write-Host "✅ Génération terminée en $([math]::Round($duration, 2)) secondes" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Erreur lors de l'exécution du script: $_" -ForegroundColor Red
    exit 1
}

# Vérifier les fichiers générés
$testFilesDir = "./test-files"
if (Test-Path $testFilesDir) {
    $files = Get-ChildItem $testFilesDir -Filter "*.csv"
    Write-Host ""
    Write-Host "📊 Fichiers générés:" -ForegroundColor Yellow
    Write-Host "-" * 50 -ForegroundColor Gray
    
    $totalSize = 0
    foreach ($file in $files) {
        $sizeMB = [math]::Round($file.Length / 1MB, 2)
        $totalSize += $sizeMB
        Write-Host "   $($file.Name) - $sizeMB MB" -ForegroundColor White
    }
    
    Write-Host "-" * 50 -ForegroundColor Gray
    Write-Host "   Total: $($files.Count) fichiers, $([math]::Round($totalSize, 2)) MB" -ForegroundColor White
}

# Instructions pour le test
Write-Host ""
Write-Host "📝 INSTRUCTIONS POUR TESTER LES OPTIMISATIONS:" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan

Write-Host ""
Write-Host "1. 🚀 DÉMARRER L'APPLICATION:" -ForegroundColor Yellow
Write-Host "   - Lancer l'application de réconciliation" -ForegroundColor White
Write-Host "   - Aller dans le menu 'Traitement'" -ForegroundColor White

Write-Host ""
Write-Host "2. 📁 CHARGER LES FICHIERS:" -ForegroundColor Yellow
Write-Host "   - Commencer par les petits fichiers (10k, 50k lignes)" -ForegroundColor White
Write-Host "   - Puis tester les gros fichiers (500k, 1M, 2M lignes)" -ForegroundColor White
Write-Host "   - Observer les messages d'optimisation" -ForegroundColor White

Write-Host ""
Write-Host "3. 🔧 VÉRIFIER LES OPTIMISATIONS:" -ForegroundColor Yellow
Write-Host "   - Messages '🚀 Optimisations ultra-rapides activées'" -ForegroundColor White
Write-Host "   - Barre de progression en temps réel" -ForegroundColor White
Write-Host "   - Interface réactive pendant le traitement" -ForegroundColor White
Write-Host "   - Pagination automatique (100 lignes/page pour 2M+)" -ForegroundColor White

Write-Host ""
Write-Host "4. ⚡ TESTER LES FONCTIONNALITÉS:" -ForegroundColor Yellow
Write-Host "   - Formatage des données (avec gros fichiers)" -ForegroundColor White
Write-Host "   - Export CSV (vérifier l'export ultra-rapide)" -ForegroundColor White
Write-Host "   - Filtres et sélection de colonnes" -ForegroundColor White
Write-Host "   - Navigation dans les données" -ForegroundColor White

Write-Host ""
Write-Host "5. 📊 PERFORMANCES À VÉRIFIER:" -ForegroundColor Yellow
Write-Host "   - Temps de chargement < 60s pour 2M lignes" -ForegroundColor White
Write-Host "   - Formatage < 30s pour 2M lignes" -ForegroundColor White
Write-Host "   - Export < 20s pour 2M lignes" -ForegroundColor White
Write-Host "   - Interface non bloquée pendant le traitement" -ForegroundColor White

Write-Host ""
Write-Host "6. 🐛 SIGNAUX D'ALERTE:" -ForegroundColor Yellow
Write-Host "   - Messages d'erreur de mémoire" -ForegroundColor Red
Write-Host "   - Interface qui se bloque" -ForegroundColor Red
Write-Host "   - Temps de traitement excessifs" -ForegroundColor Red
Write-Host "   - Plantage du navigateur" -ForegroundColor Red

Write-Host ""
Write-Host "🎯 CRITÈRES DE SUCCÈS:" -ForegroundColor Green
Write-Host "   ✅ Chargement de 2M lignes en < 60s" -ForegroundColor Green
Write-Host "   ✅ Interface réactive pendant le traitement" -ForegroundColor Green
Write-Host "   ✅ Export CSV fonctionnel pour 2M lignes" -ForegroundColor Green
Write-Host "   ✅ Formatage des données sans erreur" -ForegroundColor Green
Write-Host "   ✅ Messages d'optimisation affichés" -ForegroundColor Green

Write-Host ""
Write-Host "📞 SUPPORT:" -ForegroundColor Cyan
Write-Host "   En cas de problème, vérifier:" -ForegroundColor White
Write-Host "   - La mémoire disponible du navigateur" -ForegroundColor White
Write-Host "   - Les logs de la console (F12)" -ForegroundColor White
Write-Host "   - La taille des fichiers de test" -ForegroundColor White

Write-Host ""
Write-Host "🎉 Test prêt! Bonne chance avec les optimisations 2M lignes!" -ForegroundColor Green
