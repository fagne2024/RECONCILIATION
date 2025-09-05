# Test de la fonctionnalité de formatage "Garder N derniers digits"
Write-Host "🧪 Test de la fonctionnalité de formatage des digits" -ForegroundColor Cyan

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
📋 Instructions pour tester le formatage des digits :

1. Ouvrez votre navigateur sur http://localhost:4200
2. Allez dans l'onglet 'Traitement'
3. Uploadez un fichier contenant des numéros de téléphone ou des identifiants numériques
4. Une fois les données chargées :
   - Allez dans la section 'Formatage des données'
   - Cochez 'Garder N derniers digits'
   - Sélectionnez la colonne contenant les numéros
   - Définissez le nombre de digits à garder (ex: 3)
   - Cliquez sur 'Appliquer'

🔍 Exemples de test :
- Numéro: "774478320" avec 3 digits → "320"
- Numéro: "1234567890" avec 4 digits → "7890"
- Numéro: "ABC123DEF456" avec 3 digits → "456"
- Numéro: "123" avec 5 digits → "123" (garde tous les digits disponibles)

📊 Fonctionnalités à vérifier :
✅ Extraction correcte des digits (ignore les lettres et caractères spéciaux)
✅ Conservation des N derniers digits
✅ Gestion des cas où il y a moins de digits que demandé
✅ Messages de succès/erreur appropriés
✅ Logs détaillés dans la console du navigateur
✅ Interface utilisateur intuitive avec exemples

🎯 Cas d'usage typiques :
- Numéros de téléphone : garder les 3 derniers chiffres
- Identifiants clients : garder les 4 derniers chiffres
- Codes de transaction : garder les 2 derniers chiffres
- Nettoyage de données : extraire seulement les digits d'un champ mixte

🔧 Pour voir les logs détaillés :
1. Ouvrez les outils de développement (F12)
2. Allez dans l'onglet 'Console'
3. Effectuez le formatage et observez les messages de log
4. Vérifiez les transformations : "valeur_originale" -> "nouvelle_valeur"
"@ -ForegroundColor White

Write-Host "`n🔧 Pour voir les logs détaillés :" -ForegroundColor Yellow
Write-Host "1. Ouvrez les outils de développement (F12)" -ForegroundColor Gray
Write-Host "2. Allez dans l'onglet 'Console'" -ForegroundColor Gray
Write-Host "3. Effectuez le formatage et observez les messages de log" -ForegroundColor Gray

Write-Host "`n✅ Test terminé - Vérifiez manuellement dans le navigateur" -ForegroundColor Green
