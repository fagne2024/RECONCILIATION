# Test du frontend Angular
Write-Host "Test du frontend Angular..." -ForegroundColor Green

# Vérifier si le serveur Angular est démarré
Write-Host "1. Vérification du serveur Angular sur le port 4200" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4200" -Method GET -TimeoutSec 5
    Write-Host "✅ Succès: Frontend Angular accessible" -ForegroundColor Green
    Write-Host "  Status: $($response.StatusCode)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erreur: Frontend non accessible sur http://localhost:4200" -ForegroundColor Red
    Write-Host "  Démarrer avec: cd reconciliation-app/frontend && npm start" -ForegroundColor Yellow
}

# Vérifier si le backend est toujours accessible
Write-Host "`n2. Vérification du backend Spring Boot" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/profils" -Method GET
    Write-Host "✅ Succès: Backend accessible" -ForegroundColor Green
    Write-Host "  Profils trouvés: $($response.Count)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erreur: Backend non accessible" -ForegroundColor Red
}

Write-Host "`n🎯 Instructions pour tester l'interface:" -ForegroundColor Green
Write-Host "1. Ouvrir http://localhost:4200 dans le navigateur" -ForegroundColor Cyan
Write-Host "2. Se connecter avec les identifiants" -ForegroundColor Cyan
Write-Host "3. Aller dans le menu 'Profil'" -ForegroundColor Cyan
Write-Host "4. Cliquer sur 'Nouveau Profil'" -ForegroundColor Cyan
Write-Host "5. Remplir le formulaire et cliquer sur 'Créer'" -ForegroundColor Cyan
Write-Host "6. Vérifier la console du navigateur (F12) pour les logs" -ForegroundColor Cyan

Write-Host "`n🔧 En cas de problème:" -ForegroundColor Yellow
Write-Host "- Vérifier que les deux serveurs sont démarrés" -ForegroundColor White
Write-Host "- Vérifier la console du navigateur pour les erreurs" -ForegroundColor White
Write-Host "- Redémarrer les serveurs si nécessaire" -ForegroundColor White 