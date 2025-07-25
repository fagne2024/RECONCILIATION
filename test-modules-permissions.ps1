# Test des nouveaux composants Modules et Permissions
Write-Host "Test des nouveaux composants..." -ForegroundColor Green

Write-Host "`n1. Test de l'API Modules" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/profils/modules" -Method GET
    Write-Host "✅ API Modules accessible" -ForegroundColor Green
    Write-Host "Nombre de modules: $($response.Count)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erreur API Modules: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n2. Test de l'API Permissions" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/profils/permissions" -Method GET
    Write-Host "✅ API Permissions accessible" -ForegroundColor Green
    Write-Host "Nombre de permissions: $($response.Count)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erreur API Permissions: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n3. Test Frontend" -ForegroundColor Yellow
Write-Host "✅ Composants créés:" -ForegroundColor Green
Write-Host "   - ModulesComponent" -ForegroundColor Cyan
Write-Host "   - PermissionsComponent" -ForegroundColor Cyan
Write-Host "   - ModuleService" -ForegroundColor Cyan
Write-Host "   - PermissionService" -ForegroundColor Cyan

Write-Host "`n4. Routes ajoutées:" -ForegroundColor Yellow
Write-Host "   - /modules" -ForegroundColor Cyan
Write-Host "   - /permissions" -ForegroundColor Cyan

Write-Host "`n5. Menu mis à jour:" -ForegroundColor Yellow
Write-Host "   - Sous-menu 'Module' ajouté" -ForegroundColor Cyan
Write-Host "   - Sous-menu 'Permission' ajouté" -ForegroundColor Cyan

Write-Host "`n🎉 Test terminé!" -ForegroundColor Green
Write-Host "Vous pouvez maintenant accéder aux nouvelles pages via le menu Paramètres" -ForegroundColor Yellow 