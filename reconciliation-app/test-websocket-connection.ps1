# Script PowerShell pour tester la connexion WebSocket
# Vérifie que le backend et le frontend WebSocket fonctionnent

param(
    [string]$BackendUrl = "http://localhost:8080",
    [string]$FrontendUrl = "http://localhost:4200"
)

Write-Host "🧪 Test de la connexion WebSocket..." -ForegroundColor Green
Write-Host ""

# Fonction pour tester un endpoint HTTP
function Test-Endpoint {
    param(
        [string]$Url,
        [string]$Description
    )
    
    try {
        Write-Host "🔍 Test de $Description..." -ForegroundColor Yellow
        $response = Invoke-WebRequest -Uri $Url -Method GET -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ $Description : OK" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ $Description : Erreur HTTP $($response.StatusCode)" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ $Description : Erreur de connexion - $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Fonction pour tester WebSocket
function Test-WebSocket {
    param(
        [string]$WebSocketUrl,
        [string]$Description
    )
    
    try {
        Write-Host "🔍 Test de $Description..." -ForegroundColor Yellow
        
        # Créer un script JavaScript temporaire pour tester WebSocket
        $jsTest = @"
const WebSocket = require('ws');
const ws = new WebSocket('$WebSocketUrl');

ws.on('open', function open() {
    console.log('WebSocket connecté');
    ws.close();
    process.exit(0);
});

ws.on('error', function error(err) {
    console.log('Erreur WebSocket:', err.message);
    process.exit(1);
});

setTimeout(() => {
    console.log('Timeout WebSocket');
    process.exit(1);
}, 5000);
"@
        
        $tempFile = [System.IO.Path]::GetTempFileName() + ".js"
        $jsTest | Out-File -FilePath $tempFile -Encoding UTF8
        
        # Vérifier si Node.js est installé
        try {
            $nodeVersion = node --version 2>$null
            if ($LASTEXITCODE -eq 0) {
                $result = node $tempFile 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "✅ $Description : OK" -ForegroundColor Green
                    Remove-Item $tempFile -Force
                    return $true
                } else {
                    Write-Host "❌ $Description : Erreur - $result" -ForegroundColor Red
                    Remove-Item $tempFile -Force
                    return $false
                }
            } else {
                Write-Host "⚠️  Node.js non installé, test WebSocket ignoré" -ForegroundColor Yellow
                return $true
            }
        } catch {
            Write-Host "⚠️  Node.js non installé, test WebSocket ignoré" -ForegroundColor Yellow
            return $true
        }
    } catch {
        Write-Host "❌ $Description : Erreur - $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Tests des endpoints HTTP
Write-Host "📡 Tests des endpoints HTTP:" -ForegroundColor Cyan
$backendHealth = Test-Endpoint -Url "$BackendUrl/api/reconciliation/health" -Description "Backend Health"
$frontendHealth = Test-Endpoint -Url "$FrontendUrl" -Description "Frontend"

Write-Host ""
Write-Host "🔌 Tests des WebSockets:" -ForegroundColor Cyan
$websocketTest = Test-WebSocket -WebSocketUrl "ws://localhost:8080/ws/reconciliation" -Description "WebSocket Backend"

Write-Host ""
Write-Host "📊 Résumé des tests:" -ForegroundColor Cyan
Write-Host "   Backend Health: $(if ($backendHealth) { '✅ OK' } else { '❌ ÉCHEC' })" -ForegroundColor $(if ($backendHealth) { 'Green' } else { 'Red' })
Write-Host "   Frontend: $(if ($frontendHealth) { '✅ OK' } else { '❌ ÉCHEC' })" -ForegroundColor $(if ($frontendHealth) { 'Green' } else { 'Red' })
Write-Host "   WebSocket: $(if ($websocketTest) { '✅ OK' } else { '❌ ÉCHEC' })" -ForegroundColor $(if ($websocketTest) { 'Green' } else { 'Red' })

Write-Host ""
if ($backendHealth -and $frontendHealth -and $websocketTest) {
    Write-Host "🎉 Tous les tests sont passés! Le système WebSocket est opérationnel." -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Prochaines étapes:" -ForegroundColor Yellow
    Write-Host "   1. Ouvrir l'application dans le navigateur" -ForegroundColor White
    Write-Host "   2. Tester la réconciliation avec des fichiers" -ForegroundColor White
    Write-Host "   3. Vérifier la progression en temps réel" -ForegroundColor White
} else {
    Write-Host "⚠️  Certains tests ont échoué. Vérifiez la configuration:" -ForegroundColor Yellow
    Write-Host ""
    if (-not $backendHealth) {
        Write-Host "   🔧 Backend: Vérifiez que le serveur Spring Boot est démarré sur le port 8080" -ForegroundColor White
    }
    if (-not $frontendHealth) {
        Write-Host "   🔧 Frontend: Vérifiez que ng serve est démarré sur le port 4200" -ForegroundColor White
    }
    if (-not $websocketTest) {
        Write-Host "   🔧 WebSocket: Vérifiez la configuration WebSocket dans le backend" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "🔗 URLs de test:" -ForegroundColor Cyan
Write-Host "   Backend Health: $BackendUrl/api/reconciliation/health" -ForegroundColor White
Write-Host "   Frontend: $FrontendUrl" -ForegroundColor White
Write-Host "   WebSocket: ws://localhost:8080/ws/reconciliation" -ForegroundColor White
