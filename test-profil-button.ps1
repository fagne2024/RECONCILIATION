# Test du bouton de création de profil
Write-Host "Test du bouton de création de profil..." -ForegroundColor Green

# Test de l'API pour créer un profil directement
Write-Host "1. Test direct de l'API de création" -ForegroundColor Yellow
try {
    $newProfil = @{
        nom = "Profil Test $(Get-Date -Format 'HH:mm:ss')"
        description = "Profil de test créé via script"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/profils" -Method POST -Body $newProfil -ContentType "application/json"
    Write-Host "✅ Succès: Profil créé avec ID $($response.id)" -ForegroundColor Green
    Write-Host "  Nom: $($response.nom)" -ForegroundColor Cyan
    Write-Host "  Description: $($response.description)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erreur API: $($_.Exception.Message)" -ForegroundColor Red
}

# Vérifier les profils existants
Write-Host "`n2. Liste des profils existants" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/profils" -Method GET
    Write-Host "✅ Profils trouvés: $($response.Count)" -ForegroundColor Green
    $response | ForEach-Object { 
        Write-Host "  - ID: $($_.id), Nom: $($_.nom), Description: $($_.description)" -ForegroundColor Cyan 
    }
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔧 Diagnostic du frontend:" -ForegroundColor Yellow
Write-Host "1. Ouvrir http://localhost:4200" -ForegroundColor Cyan
Write-Host "2. Aller dans Profil" -ForegroundColor Cyan
Write-Host "3. Cliquer sur 'Nouveau Profil'" -ForegroundColor Cyan
Write-Host "4. Vérifier que la modal s'ouvre" -ForegroundColor Cyan
Write-Host "5. Remplir le formulaire" -ForegroundColor Cyan
Write-Host "6. Cliquer sur 'Créer'" -ForegroundColor Cyan
Write-Host "7. Vérifier la console (F12) pour les logs" -ForegroundColor Cyan

Write-Host "`n📋 Logs à vérifier dans la console:" -ForegroundColor Green
Write-Host "- 'ProfilComponent ngOnInit - Formulaire initialisé:'" -ForegroundColor White
Write-Host "- 'createProfil() appelé'" -ForegroundColor White
Write-Host "- 'Form valid: true/false'" -ForegroundColor White
Write-Host "- 'Form values: {...}'" -ForegroundColor White 