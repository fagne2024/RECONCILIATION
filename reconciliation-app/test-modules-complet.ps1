# Test complet de l'API des modules
Write-Host "🧪 Test complet de l'API des modules..." -ForegroundColor Green

# Test 1: Vérifier si le backend répond
Write-Host "`n1️⃣ Test de connexion au backend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/profils/modules" -Method GET
    Write-Host "✅ Backend accessible (Status: $($response.StatusCode))" -ForegroundColor Green
    
    # Afficher les données reçues
    $modules = $response.Content | ConvertFrom-Json
    Write-Host "📊 Nombre de modules trouvés: $($modules.Count)" -ForegroundColor Cyan
    
    if ($modules.Count -eq 0) {
        Write-Host "⚠️ Aucun module trouvé dans la base de données" -ForegroundColor Yellow
    } else {
        Write-Host "`n📋 Liste des modules:" -ForegroundColor Cyan
        for ($i = 0; $i -lt $modules.Count; $i++) {
            $module = $modules[$i]
            $permissionsCount = if ($module.permissions) { $module.permissions.Count } else { 0 }
            Write-Host "  [$($i + 1)] $($module.nom) (ID: $($module.id)) - $permissionsCount permissions" -ForegroundColor White
        }
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
    Write-Host "📊 Associations: $($diagnosticData.modulePermissionAssociations)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erreur diagnostic: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Vérifier la structure des données
Write-Host "`n3️⃣ Analyse de la structure des données..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/profils/modules" -Method GET
    $modules = $response.Content | ConvertFrom-Json
    
    if ($modules.Count -gt 0) {
        $firstModule = $modules[0]
        Write-Host "✅ Premier module analysé:" -ForegroundColor Green
        Write-Host "  - ID: $($firstModule.id)" -ForegroundColor White
        Write-Host "  - Nom: $($firstModule.nom)" -ForegroundColor White
        Write-Host "  - Permissions: $($firstModule.permissions.Count)" -ForegroundColor White
        
        if ($firstModule.permissions.Count -gt 0) {
            Write-Host "  - Détail des permissions:" -ForegroundColor White
            foreach ($perm in $firstModule.permissions) {
                Write-Host "    * $($perm.nom)" -ForegroundColor Gray
            }
        }
    }
} catch {
    Write-Host "❌ Erreur analyse: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎯 Instructions pour tester le frontend:" -ForegroundColor Green
Write-Host "1. Ouvrez http://localhost:4200" -ForegroundColor White
Write-Host "2. Connectez-vous à l'application" -ForegroundColor White
Write-Host "3. Allez dans Paramètre → Module" -ForegroundColor White
Write-Host "4. Ouvrez la console du navigateur (F12)" -ForegroundColor White
Write-Host "5. Vérifiez les logs de debug" -ForegroundColor White
Write-Host "6. Regardez la section 'Debug Info' dans l'interface" -ForegroundColor White 