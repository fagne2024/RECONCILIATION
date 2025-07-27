# Test de l'interface améliorée des profils
Write-Host "🎨 Test de l'interface améliorée des profils..." -ForegroundColor Green

# Test 1: Vérifier l'API des profils
Write-Host "`n1️⃣ Test de l'API des profils..." -ForegroundColor Yellow
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

# Test 2: Vérifier l'API des modules
Write-Host "`n2️⃣ Test de l'API des modules..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/profils/modules" -Method GET
    Write-Host "✅ API modules accessible (Status: $($response.StatusCode))" -ForegroundColor Green
    
    $modules = $response.Content | ConvertFrom-Json
    Write-Host "📊 Nombre de modules trouvés: $($modules.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Erreur de connexion à l'API modules: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Vérifier l'API des permissions
Write-Host "`n3️⃣ Test de l'API des permissions..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/profils/permissions" -Method GET
    Write-Host "✅ API permissions accessible (Status: $($response.StatusCode))" -ForegroundColor Green
    
    $permissions = $response.Content | ConvertFrom-Json
    Write-Host "📊 Nombre de permissions trouvées: $($permissions.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Erreur de connexion à l'API permissions: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎯 Améliorations apportées à l'interface:" -ForegroundColor Green
Write-Host "✅ Header avec gradient et résumé des droits" -ForegroundColor White
Write-Host "✅ Vue d'ensemble des permissions avec compteurs" -ForegroundColor White
Write-Host "✅ Cartes de modules avec permissions organisées" -ForegroundColor White
Write-Host "✅ Checkboxes personnalisées avec animations" -ForegroundColor White
Write-Host "✅ Boutons 'Tout sélectionner/désélectionner'" -ForegroundColor White
Write-Host "✅ Design responsive et moderne" -ForegroundColor White
Write-Host "✅ Messages d'information pour les cas vides" -ForegroundColor White

Write-Host "`n🚀 Instructions pour tester l'interface améliorée:" -ForegroundColor Green
Write-Host "1. Ouvrez http://localhost:4200" -ForegroundColor White
Write-Host "2. Connectez-vous à l'application" -ForegroundColor White
Write-Host "3. Allez dans Parametre -> Profil" -ForegroundColor White
Write-Host "4. Sélectionnez un profil (ex: ADMINISTRATEUR)" -ForegroundColor White
Write-Host "5. Observez la nouvelle interface des droits:" -ForegroundColor White
Write-Host "   - Header avec résumé" -ForegroundColor White
Write-Host "   - Vue d'ensemble des permissions" -ForegroundColor White
Write-Host "   - Cartes de modules avec checkboxes" -ForegroundColor White
Write-Host "   - Boutons d'action par module" -ForegroundColor White

Write-Host "`n🎨 Fonctionnalités à tester:" -ForegroundColor Green
Write-Host "• Cochez/décochez les permissions dans les cartes" -ForegroundColor White
Write-Host "• Utilisez 'Tout sélectionner' sur un module" -ForegroundColor White
Write-Host "• Utilisez 'Tout désélectionner' sur un module" -ForegroundColor White
Write-Host "• Observez les compteurs se mettre à jour" -ForegroundColor White
Write-Host "• Testez la réactivité sur différentes tailles d'écran" -ForegroundColor White 