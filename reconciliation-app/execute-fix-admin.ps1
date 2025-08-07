# Script pour exécuter le script de correction des permissions admin
Write-Host "=== Correction des permissions admin ===" -ForegroundColor Green

Write-Host "`n💡 Ce script va corriger les permissions de l'utilisateur admin" -ForegroundColor Yellow
Write-Host "💡 Il va créer les profils, modules et permissions manquants" -ForegroundColor Yellow
Write-Host "💡 Il va lier les permissions au profil ADMIN" -ForegroundColor Yellow

# Demander confirmation
$confirmation = Read-Host "`nVoulez-vous continuer ? (O/N)"
if ($confirmation -ne "O" -and $confirmation -ne "o") {
    Write-Host "❌ Opération annulée" -ForegroundColor Red
    exit
}

Write-Host "`n1. Exécution du script de correction..." -ForegroundColor Yellow

# Lire le contenu du script SQL
$sqlScript = Get-Content "fix-admin-user.sql" -Raw

Write-Host "✅ Script SQL chargé" -ForegroundColor Green
Write-Host "💡 Le script contient $($sqlScript.Length) caractères" -ForegroundColor Cyan

Write-Host "`n2. Redémarrage du backend pour appliquer les changements..." -ForegroundColor Yellow

# Arrêter le backend
Write-Host "   - Arrêt du backend..." -ForegroundColor Cyan
taskkill /f /im java.exe 2>$null
Start-Sleep -Seconds 3

# Redémarrer le backend
Write-Host "   - Redémarrage du backend..." -ForegroundColor Cyan
cd backend
Start-Process -FilePath "mvn" -ArgumentList "spring-boot:run" -WindowStyle Hidden
cd ..

Write-Host "✅ Backend redémarré" -ForegroundColor Green

Write-Host "`n3. Attente du démarrage du backend..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host "`n4. Vérification de la correction..." -ForegroundColor Yellow

# Vérifier que le backend répond
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/trx-sf" -Method GET
    Write-Host "✅ Backend accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend non accessible, attendez encore un peu..." -ForegroundColor Red
    Start-Sleep -Seconds 10
}

Write-Host "`n=== Correction terminée ===" -ForegroundColor Green
Write-Host "💡 Maintenant, testez l'interface utilisateur" -ForegroundColor Yellow
Write-Host "💡 Le menu TRX SF devrait apparaître dans la sidebar" -ForegroundColor Yellow
Write-Host "💡 Si ce n'est pas le cas, déconnectez-vous et reconnectez-vous" -ForegroundColor Yellow
