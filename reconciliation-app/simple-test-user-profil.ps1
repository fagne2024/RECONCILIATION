# Script simple pour tester la solution d'association des profils
Write-Host "Test de la solution d'association des profils aux utilisateurs..." -ForegroundColor Green

# Test 1: Verifier l'etat des associations
Write-Host "`n1. Verification de l'etat des associations..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/user-profil/check" -Method GET
    $result = $response.Content | ConvertFrom-Json
    
    if ($result.success) {
        if ($result.allUsersHaveProfil) {
            Write-Host "SUCCES: Tous les utilisateurs ont un profil associe" -ForegroundColor Green
        } else {
            Write-Host "ATTENTION: Certains utilisateurs n'ont pas de profil associe" -ForegroundColor Yellow
        }
        Write-Host "Message: $($result.message)" -ForegroundColor Cyan
    } else {
        Write-Host "Erreur lors de la verification" -ForegroundColor Red
    }
} catch {
    Write-Host "Erreur de connexion au backend: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Tester la connexion avec admin
Write-Host "`n2. Test de connexion avec admin..." -ForegroundColor Yellow
try {
    $loginData = @{
        username = "admin"
        password = "admin"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    $result = $response.Content | ConvertFrom-Json
    
    if ($result.success) {
        Write-Host "Connexion reussie pour admin - Profil: $($result.profil)" -ForegroundColor Green
    } else {
        Write-Host "Echec de connexion pour admin" -ForegroundColor Red
    }
} catch {
    Write-Host "Erreur de connexion pour admin: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Verifier les profils disponibles
Write-Host "`n3. Verification des profils disponibles..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/profils" -Method GET
    $profils = $response.Content | ConvertFrom-Json
    
    Write-Host "Profils disponibles:" -ForegroundColor Cyan
    foreach ($profil in $profils) {
        Write-Host "  - $($profil.nom) (ID: $($profil.id))" -ForegroundColor White
    }
} catch {
    Write-Host "Erreur lors de la recuperation des profils: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nTest termine !" -ForegroundColor Green 