# Redémarrer le frontend Angular
Write-Host "Redémarrage du frontend Angular..." -ForegroundColor Green

# Arrêter les processus existants
Write-Host "1. Arrêt des processus existants..." -ForegroundColor Yellow
try {
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "✅ Processus Node.js arrêtés" -ForegroundColor Green
} catch {
    Write-Host "ℹ️ Aucun processus Node.js en cours" -ForegroundColor Cyan
}

# Attendre un peu
Start-Sleep -Seconds 2

# Redémarrer le frontend
Write-Host "`n2. Redémarrage du frontend..." -ForegroundColor Yellow
try {
    Set-Location "reconciliation-app/frontend"
    Start-Process -FilePath "npm" -ArgumentList "start" -NoNewWindow
    Write-Host "✅ Frontend redémarré avec succès" -ForegroundColor Green
    Write-Host "🌐 L'application sera disponible sur http://localhost:4200" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erreur lors du redémarrage: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 Redémarrage terminé!" -ForegroundColor Green 