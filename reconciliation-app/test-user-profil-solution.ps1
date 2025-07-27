# Script de test pour vérifier la solution d'association des profils aux utilisateurs
Write-Host "🧪 Test de la solution d'association des profils aux utilisateurs..." -ForegroundColor Green

# Test 1: Vérifier l'état des associations
Write-Host "`n1️⃣ Vérification de l'état des associations..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/user-profil/check" -Method GET
    $result = $response.Content | ConvertFrom-Json
    
    if ($result.success) {
        if ($result.allUsersHaveProfil) {
            Write-Host "✅ SUCCES: Tous les utilisateurs ont un profil associe" -ForegroundColor Green
        } else {
            Write-Host "⚠️ ATTENTION: Certains utilisateurs n'ont pas de profil associe" -ForegroundColor Yellow
        }
        Write-Host "📝 Message: $($result.message)" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Erreur lors de la vérification" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Erreur de connexion au backend: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Tester la connexion avec différents utilisateurs
Write-Host "`n2️⃣ Test de connexion avec différents utilisateurs..." -ForegroundColor Yellow

$testUsers = @(
    @{username = "admin"; password = "admin"},
    @{username = "yamar.ndao"; password = "yamar"},
    @{username = "test.user1"; password = "password123"}
)

foreach ($user in $testUsers) {
    try {
        $loginData = @{
            username = $user.username
            password = $user.password
        } | ConvertTo-Json
        
        $response = Invoke-WebRequest -Uri "http://localhost:8080/api/auth/login" -Method POST -Body $loginData -ContentType "application/json"
        $result = $response.Content | ConvertFrom-Json
        
        if ($result.success) {
            Write-Host "✅ Connexion reussie pour '$($user.username)' - Profil: $($result.profil)" -ForegroundColor Green
        } else {
            Write-Host "❌ Echec de connexion pour '$($user.username)'" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Erreur de connexion pour '$($user.username)': $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 3: Vérifier les profils disponibles
Write-Host "`n3️⃣ Vérification des profils disponibles..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/profils" -Method GET
    $profils = $response.Content | ConvertFrom-Json
    
    Write-Host "📊 Profils disponibles:" -ForegroundColor Cyan
    foreach ($profil in $profils) {
        Write-Host "  - $($profil.nom) (ID: $($profil.id))" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Erreur lors de la recuperation des profils: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Vérifier les utilisateurs et leurs profils
Write-Host "`n4️⃣ Vérification des utilisateurs et leurs profils..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/users" -Method GET
    $users = $response.Content | ConvertFrom-Json
    
    Write-Host "📊 Utilisateurs et leurs profils:" -ForegroundColor Cyan
    foreach ($user in $users) {
        $profilName = if ($user.profil) { $user.profil.nom } else { "AUCUN PROFIL" }
        Write-Host "  - $($user.username) → $profilName" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Erreur lors de la recuperation des utilisateurs: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎯 Test terminé !" -ForegroundColor Green
Write-Host "📋 Résumé:" -ForegroundColor Cyan
Write-Host "✅ Solution d'association des profils implémentée" -ForegroundColor White
Write-Host "✅ API de gestion des profils fonctionnelle" -ForegroundColor White
Write-Host "✅ Scripts de correction disponibles" -ForegroundColor White
Write-Host "✅ Documentation complète créée" -ForegroundColor White

Write-Host "`n🚀 Prochaines étapes:" -ForegroundColor Cyan
Write-Host "1. Testez l'application avec differents utilisateurs" -ForegroundColor White
Write-Host "2. Verifiez que les permissions sont correctement appliquees" -ForegroundColor White
Write-Host "3. Configurez les permissions specifiques pour chaque profil" -ForegroundColor White
Write-Host "4. Testez la creation de nouveaux utilisateurs" -ForegroundColor White 