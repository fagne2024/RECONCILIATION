# Test de suppression de profil
Write-Host "Test de suppression de profil..." -ForegroundColor Green

# D'abord, lister les profils existants
Write-Host "1. Liste des profils existants" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/profils" -Method GET
    Write-Host "✅ Profils trouvés: $($response.Count)" -ForegroundColor Green
    $response | ForEach-Object { 
        Write-Host "  - ID: $($_.id), Nom: $($_.nom)" -ForegroundColor Cyan 
    }
} catch {
    Write-Host "❌ Erreur lors de la récupération des profils: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# Créer un profil de test pour la suppression
Write-Host "`n2. Création d'un profil de test" -ForegroundColor Yellow
try {
    $testProfil = @{
        nom = "Profil Test Suppression $(Get-Date -Format 'HH:mm:ss')"
        description = "Profil de test pour la suppression"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/profils" -Method POST -Body $testProfil -ContentType "application/json"
    $testProfilId = $response.id
    Write-Host "✅ Profil de test créé avec ID: $testProfilId" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors de la création du profil de test: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# Tester la suppression
Write-Host "`n3. Test de suppression du profil ID: $testProfilId" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/profils/$testProfilId" -Method DELETE
    Write-Host "✅ Profil supprimé avec succès" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors de la suppression: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}

# Vérifier que le profil a bien été supprimé
Write-Host "`n4. Vérification de la suppression" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/profils" -Method GET
    $profilSupprime = $response | Where-Object { $_.id -eq $testProfilId }
    if ($profilSupprime) {
        Write-Host "❌ Le profil existe encore!" -ForegroundColor Red
    } else {
        Write-Host "✅ Le profil a bien été supprimé" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Erreur lors de la vérification: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 Test terminé!" -ForegroundColor Green 