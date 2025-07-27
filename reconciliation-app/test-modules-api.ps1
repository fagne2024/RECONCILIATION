# Test de l'API des modules
Write-Host "🧪 Test de l'API des modules..." -ForegroundColor Green

# Test 1: Vérifier si le backend répond
Write-Host "`n1️⃣ Test de connexion au backend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/profils/modules" -Method GET
    Write-Host "✅ Backend accessible (Status: $($response.StatusCode))" -ForegroundColor Green
    
    # Afficher les données reçues
    $modules = $response.Content | ConvertFrom-Json
    Write-Host "📊 Nombre de modules trouvés: $($modules.Count)" -ForegroundColor Cyan
    
    foreach ($module in $modules) {
        Write-Host "   - $($module.nom) (ID: $($module.id))" -ForegroundColor White
    }
    
} catch {
    Write-Host "❌ Erreur de connexion au backend: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Assurez-vous que le backend est démarré sur le port 8080" -ForegroundColor Yellow
}

# Test 2: Vérifier le diagnostic
Write-Host "`n2️⃣ Test du diagnostic..." -ForegroundColor Yellow
try {
    $diagnostic = Invoke-WebRequest -Uri "http://localhost:8080/api/profils/diagnostic" -Method GET
    $diagnosticData = $diagnostic.Content | ConvertFrom-Json
    Write-Host "✅ Diagnostic accessible" -ForegroundColor Green
    Write-Host "📊 Modules: $($diagnosticData.modulesCount)" -ForegroundColor Cyan
    Write-Host "📊 Permissions: $($diagnosticData.permissionsCount)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erreur diagnostic: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎯 Instructions pour tester le frontend:" -ForegroundColor Green
Write-Host "1. Ouvrez http://localhost:4200" -ForegroundColor White
Write-Host "2. Connectez-vous à l'application" -ForegroundColor White
Write-Host "3. Allez dans Paramètre → Module" -ForegroundColor White
Write-Host "4. Ouvrez la console du navigateur (F12)" -ForegroundColor White
Write-Host "5. Vérifiez les logs de debug" -ForegroundColor White 