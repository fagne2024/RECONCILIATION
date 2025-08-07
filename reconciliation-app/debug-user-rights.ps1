# Script pour déboguer les droits de l'utilisateur connecté
Write-Host "=== Débogage des droits utilisateur ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080/api"

# 1. Test de connectivité
Write-Host "`n1. Test de connectivité..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/trx-sf" -Method GET
    Write-Host "✅ Backend accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend non accessible: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 2. Test d'accès aux permissions utilisateur (si disponible)
Write-Host "`n2. Test d'accès aux permissions..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/users/permissions" -Method GET
    Write-Host "✅ Permissions utilisateur accessibles" -ForegroundColor Green
    Write-Host "   - Modules: $($response.modules -join ', ')" -ForegroundColor Cyan
    Write-Host "   - Profil: $($response.profil)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ API permissions non disponible: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Test d'accès aux utilisateurs
Write-Host "`n3. Test d'accès aux utilisateurs..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/users" -Method GET
    Write-Host "✅ Liste des utilisateurs accessible" -ForegroundColor Green
    Write-Host "   - Nombre d'utilisateurs: $($response.Count)" -ForegroundColor Cyan
    
    if ($response.Count -gt 0) {
        Write-Host "   - Utilisateurs:" -ForegroundColor Cyan
        foreach ($user in $response) {
            Write-Host "     * $($user.username) - $($user.profil)" -ForegroundColor White
        }
    }
} catch {
    Write-Host "❌ API utilisateurs non accessible: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Test d'accès aux profils
Write-Host "`n4. Test d'accès aux profils..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/profils" -Method GET
    Write-Host "✅ Liste des profils accessible" -ForegroundColor Green
    Write-Host "   - Nombre de profils: $($response.Count)" -ForegroundColor Cyan
    
    if ($response.Count -gt 0) {
        Write-Host "   - Profils:" -ForegroundColor Cyan
        foreach ($profil in $response) {
            Write-Host "     * $($profil.nom)" -ForegroundColor White
        }
    }
} catch {
    Write-Host "❌ API profils non accessible: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Test d'accès aux modules
Write-Host "`n5. Test d'accès aux modules..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/modules" -Method GET
    Write-Host "✅ Liste des modules accessible" -ForegroundColor Green
    Write-Host "   - Nombre de modules: $($response.Count)" -ForegroundColor Cyan
    
    if ($response.Count -gt 0) {
        Write-Host "   - Modules:" -ForegroundColor Cyan
        foreach ($module in $response) {
            Write-Host "     * $($module.nom)" -ForegroundColor White
        }
    }
} catch {
    Write-Host "❌ API modules non accessible: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Débogage terminé ===" -ForegroundColor Green
Write-Host "💡 Vérifiez que l'utilisateur connecté a le profil ADMIN" -ForegroundColor Yellow
Write-Host "💡 Vérifiez que le module 'Suivi des écarts' existe" -ForegroundColor Yellow
Write-Host "💡 Vérifiez que la permission 'TRX SF' est liée au module" -ForegroundColor Yellow
