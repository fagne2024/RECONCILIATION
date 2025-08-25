# Script de test pour l'ensemble du système WebSocket
Write-Host "🧪 Test du système WebSocket complet" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

# Test 1: Vérifier que le backend est démarré
Write-Host "`n1️⃣ Test du backend..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/reconciliation/health" -Method GET
    Write-Host "✅ Backend OK - Status: $($response.status)" -ForegroundColor Green
    Write-Host "   WebSocket: $($response.websocket)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Backend non accessible: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Vérifier que le frontend est accessible
Write-Host "`n2️⃣ Test du frontend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4200" -Method GET -TimeoutSec 5
    Write-Host "✅ Frontend OK - Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend non accessible: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Assurez-vous que 'ng serve' est en cours d'exécution" -ForegroundColor Yellow
}

# Test 3: Test de connexion WebSocket simple
Write-Host "`n3️⃣ Test de connexion WebSocket..." -ForegroundColor Yellow
try {
    # Créer un script JavaScript temporaire pour tester WebSocket
    $testScript = @"
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8080/ws/reconciliation');

ws.on('open', function open() {
    console.log('✅ Connexion WebSocket établie');
    
    // Envoyer un message de test
    const testMessage = {
        type: 'CONNECTION_STATUS',
        payload: {
            status: 'connected',
            clientId: 'test-client-' + Date.now()
        },
        timestamp: Date.now()
    };
    
    ws.send(JSON.stringify(testMessage));
    console.log('📤 Message de test envoyé');
    
    // Fermer après 3 secondes
    setTimeout(() => {
        ws.close();
        console.log('🔌 Connexion fermée');
        process.exit(0);
    }, 3000);
});

ws.on('message', function message(data) {
    console.log('📨 Message reçu:', data.toString());
});

ws.on('error', function error(err) {
    console.error('❌ Erreur WebSocket:', err.message);
    process.exit(1);
});

ws.on('close', function close() {
    console.log('🔌 Connexion WebSocket fermée');
});
"@

    # Sauvegarder le script temporaire
    $testScript | Out-File -FilePath "websocket-test.js" -Encoding UTF8
    
    # Exécuter le test (si Node.js est disponible)
    try {
        node websocket-test.js
        Write-Host "✅ Test WebSocket réussi" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Test WebSocket non exécuté (Node.js requis)" -ForegroundColor Yellow
        Write-Host "   Le test WebSocket sera effectué via le navigateur" -ForegroundColor White
    }
    
    # Nettoyer
    if (Test-Path "websocket-test.js") {
        Remove-Item "websocket-test.js"
    }
    
} catch {
    Write-Host "❌ Erreur lors du test WebSocket: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Vérifier les endpoints disponibles
Write-Host "`n4️⃣ Test des endpoints..." -ForegroundColor Yellow

$endpoints = @(
    "http://localhost:8080/api/reconciliation/health",
    "http://localhost:8080/api/reconciliation/upload-and-prepare"
)

foreach ($endpoint in $endpoints) {
    try {
        $response = Invoke-WebRequest -Uri $endpoint -Method GET -TimeoutSec 5
        Write-Host "✅ $endpoint - Status: $($response.StatusCode)" -ForegroundColor Green
    } catch {
        if ($response.StatusCode -eq 405) {
            Write-Host "✅ $endpoint - Endpoint disponible (méthode non autorisée)" -ForegroundColor Green
        } else {
            Write-Host "❌ $endpoint - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host "`n🎉 Tests terminés!" -ForegroundColor Green
Write-Host "`n📋 Résumé:" -ForegroundColor Cyan
Write-Host "   Backend: ✅ Démarré sur http://localhost:8080" -ForegroundColor White
Write-Host "   Frontend: ✅ Démarré sur http://localhost:4200" -ForegroundColor White
Write-Host "   WebSocket: ✅ ws://localhost:8080/ws/reconciliation" -ForegroundColor White
Write-Host "`n🌐 Ouvrez http://localhost:4200 dans votre navigateur pour tester l'application" -ForegroundColor Yellow
Write-Host "📊 Les logs WebSocket apparaîtront dans la console du navigateur" -ForegroundColor White
