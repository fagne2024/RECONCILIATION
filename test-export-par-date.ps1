# Test de l'export par date avec différents formats
Write-Host "🧪 Test de l'export par date - Formats CSV, XLS, XLSX" -ForegroundColor Cyan

# Démarrer le frontend si nécessaire
$frontendProcess = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*ng serve*" }
if (-not $frontendProcess) {
    Write-Host "🚀 Démarrage du frontend..." -ForegroundColor Yellow
    Set-Location "reconciliation-app/frontend"
    Start-Process powershell -ArgumentList "-Command", "npm start" -WindowStyle Minimized
    Start-Sleep -Seconds 10
    Set-Location "../.."
}

Write-Host "✅ Frontend démarré" -ForegroundColor Green

# Instructions pour le test
Write-Host @"
📋 Instructions pour tester l'export par date :

1. Ouvrez votre navigateur sur http://localhost:4200
2. Allez dans l'onglet 'Traitement'
3. Uploadez un fichier CSV, XLS ou XLSX
4. Une fois les données chargées :
   - Sélectionnez une colonne de date dans 'Colonne de date'
   - Choisissez une période (jour/semaine/mois)
   - Testez les 3 formats d'export :
     * CSV
     * XLS  
     * XLSX
5. Cliquez sur 'Exporter par date'

🔍 Vérifications à faire :
- L'export CSV fonctionne avec des fichiers CSV, XLS, XLSX
- L'export XLS fonctionne avec des fichiers CSV, XLS, XLSX  
- L'export XLSX fonctionne avec des fichiers CSV, XLS, XLSX
- Les fichiers générés ont le bon format et contiennent les bonnes données
- Les noms de fichiers sont corrects (préfixe_période_date.extension)

📊 Améliorations apportées :
- Meilleure gestion d'erreur avec messages détaillés
- Validation des données avant export
- Nettoyage et formatage des valeurs
- Logs détaillés dans la console du navigateur
- Gestion des cas où les données sont vides ou mal formatées
"@ -ForegroundColor White

Write-Host "`n🔧 Pour voir les logs détaillés :" -ForegroundColor Yellow
Write-Host "1. Ouvrez les outils de développement (F12)" -ForegroundColor Gray
Write-Host "2. Allez dans l'onglet 'Console'" -ForegroundColor Gray
Write-Host "3. Effectuez l'export et observez les messages de log" -ForegroundColor Gray

Write-Host "`n✅ Test terminé - Vérifiez manuellement dans le navigateur" -ForegroundColor Green