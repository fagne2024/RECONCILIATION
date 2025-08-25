# Script PowerShell pour activer les WebSockets dans le frontend
# Décommente les lignes WebSocket dans les fichiers TypeScript

Write-Host "🔧 Activation des WebSockets dans le frontend..." -ForegroundColor Green

# Chemin vers les fichiers à modifier
$serviceFile = "src\app\services\reconciliation.service.ts"
$componentFile = "src\app\components\reconciliation\reconciliation.component.ts"

# Fonction pour décommenter les lignes WebSocket
function Enable-WebSockets {
    param(
        [string]$FilePath,
        [string]$Description
    )
    
    if (Test-Path $FilePath) {
        Write-Host "📝 Activation WebSocket dans $Description..." -ForegroundColor Yellow
        
        # Lire le contenu du fichier
        $content = Get-Content $FilePath -Raw
        
        # Décommenter les lignes WebSocket
        $content = $content -replace '// this\.initializeWebSocket\(\);', 'this.initializeWebSocket();'
        $content = $content -replace '// this\.initializeWebSocketListeners\(\);', 'this.initializeWebSocketListeners();'
        $content = $content -replace '// this\.connectToWebSocket\(\);', 'this.connectToWebSocket();'
        $content = $content -replace 'console\.log\(''⚠️ WebSockets désactivés temporairement - mode API classique''\);', '// console.log(''⚠️ WebSockets désactivés temporairement - mode API classique'');'
        
        # Sauvegarder le fichier
        Set-Content $FilePath $content -Encoding UTF8
        
        Write-Host "✅ WebSockets activés dans $Description" -ForegroundColor Green
    } else {
        Write-Host "❌ Fichier non trouvé: $FilePath" -ForegroundColor Red
    }
}

# Activer les WebSockets dans le service
Enable-WebSockets -FilePath $serviceFile -Description "ReconciliationService"

# Activer les WebSockets dans le composant
Enable-WebSockets -FilePath $componentFile -Description "ReconciliationComponent"

Write-Host ""
Write-Host "🎉 Activation des WebSockets terminée!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Prochaines étapes:" -ForegroundColor Yellow
Write-Host "   1. Vérifier que le backend WebSocket est démarré" -ForegroundColor White
Write-Host "   2. Recompiler le frontend: ng build" -ForegroundColor White
Write-Host "   3. Redémarrer le serveur de développement: ng serve" -ForegroundColor White
Write-Host "   4. Tester la connexion WebSocket" -ForegroundColor White
Write-Host ""
Write-Host "🔗 Endpoints WebSocket:" -ForegroundColor Cyan
Write-Host "   - ws://localhost:8080/ws/reconciliation" -ForegroundColor White
Write-Host "   - POST /api/reconciliation/upload-and-prepare" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Note: Assurez-vous que le backend est configuré et démarré avant de tester!" -ForegroundColor Yellow
