# Script pour corriger l'association des profils aux utilisateurs
Write-Host "🔧 Correction de l'association des profils aux utilisateurs..." -ForegroundColor Green

# Test 1: Vérifier l'état actuel
Write-Host "`n1️⃣ Vérification de l'état actuel..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/user-profil/check" -Method GET
    $result = $response.Content | ConvertFrom-Json
    
    if ($result.success) {
        if ($result.allUsersHaveProfil) {
            Write-Host "✅ Tous les utilisateurs ont un profil associé" -ForegroundColor Green
        } else {
            Write-Host "⚠️ Certains utilisateurs n'ont pas de profil associé" -ForegroundColor Yellow
        }
        Write-Host "📝 Message: $($result.message)" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Erreur lors de la vérification" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Erreur de connexion au backend: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Afficher le statut détaillé
Write-Host "`n2️⃣ Affichage du statut détaillé..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/user-profil/status" -Method GET
    $result = $response.Content | ConvertFrom-Json
    
    if ($result.success) {
        Write-Host "✅ Statut affiché dans les logs du serveur" -ForegroundColor Green
        Write-Host "📝 Message: $($result.message)" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Erreur lors de l'affichage du statut" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Erreur de connexion au backend: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Associer automatiquement les profils par défaut
Write-Host "`n3️⃣ Association automatique des profils par défaut..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/user-profil/associate-default" -Method POST
    $result = $response.Content | ConvertFrom-Json
    
    if ($result.success) {
        Write-Host "✅ Profils associés avec succès" -ForegroundColor Green
        Write-Host "📝 Message: $($result.message)" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Erreur lors de l'association" -ForegroundColor Red
        Write-Host "📝 Erreur: $($result.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Erreur de connexion au backend: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Vérification finale
Write-Host "`n4️⃣ Vérification finale..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/user-profil/check" -Method GET
    $result = $response.Content | ConvertFrom-Json
    
    if ($result.success) {
        if ($result.allUsersHaveProfil) {
            Write-Host "✅ SUCCÈS: Tous les utilisateurs ont maintenant un profil associé" -ForegroundColor Green
        } else {
            Write-Host "⚠️ ATTENTION: Certains utilisateurs n'ont toujours pas de profil associé" -ForegroundColor Yellow
        }
        Write-Host "📝 Message: $($result.message)" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Erreur lors de la vérification finale" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Erreur de connexion au backend: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎯 Script terminé !" -ForegroundColor Green
Write-Host "📋 Instructions:" -ForegroundColor Cyan
Write-Host "1. Vérifiez les logs du serveur pour voir les détails" -ForegroundColor White
Write-Host "2. Si des utilisateurs n'ont toujours pas de profil, utilisez l'API manuellement" -ForegroundColor White
Write-Host "3. Testez la connexion avec différents utilisateurs" -ForegroundColor White 