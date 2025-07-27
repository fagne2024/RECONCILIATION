# Test de l'API des profils
Write-Host "🧪 Test de l'API des profils..." -ForegroundColor Green

# Test 1: Vérifier les profils
Write-Host "`n1️⃣ Test des profils..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/profils" -Method GET
    Write-Host "✅ API profils accessible (Status: $($response.StatusCode))" -ForegroundColor Green
    
    $profils = $response.Content | ConvertFrom-Json
    Write-Host "📊 Nombre de profils trouvés: $($profils.Count)" -ForegroundColor Cyan
    
    if ($profils.Count -gt 0) {
        Write-Host "`n📋 Liste des profils:" -ForegroundColor Cyan
        foreach ($profil in $profils) {
            Write-Host "  - $($profil.nom) (ID: $($profil.id))" -ForegroundColor White
        }
    }
    
} catch {
    Write-Host "❌ Erreur de connexion à l'API profils: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Vérifier les modules
Write-Host "`n2️⃣ Test des modules..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/profils/modules" -Method GET
    Write-Host "✅ API modules accessible (Status: $($response.StatusCode))" -ForegroundColor Green
    
    $modules = $response.Content | ConvertFrom-Json
    Write-Host "📊 Nombre de modules trouvés: $($modules.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Erreur de connexion à l'API modules: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Vérifier les permissions
Write-Host "`n3️⃣ Test des permissions..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/profils/permissions" -Method GET
    Write-Host "✅ API permissions accessible (Status: $($response.StatusCode))" -ForegroundColor Green
    
    $permissions = $response.Content | ConvertFrom-Json
    Write-Host "📊 Nombre de permissions trouvées: $($permissions.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Erreur de connexion à l'API permissions: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎯 Instructions pour tester l'interface:" -ForegroundColor Green
Write-Host "1. Ouvrez http://localhost:4200" -ForegroundColor White
Write-Host "2. Connectez-vous à l'application" -ForegroundColor White
Write-Host "3. Allez dans Parametre -> Profil" -ForegroundColor White
Write-Host "4. Testez les fonctionnalités:" -ForegroundColor White
Write-Host "   - Créer un nouveau profil" -ForegroundColor White
Write-Host "   - Sélectionner un profil" -ForegroundColor White
Write-Host "   - Ajouter des modules au profil" -ForegroundColor White
Write-Host "   - Ajouter des permissions au profil" -ForegroundColor White 