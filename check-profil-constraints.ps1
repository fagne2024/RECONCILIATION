# Vérifier les contraintes sur la table profil
Write-Host "Vérification des contraintes sur la table profil..." -ForegroundColor Green

try {
    # Vérifier les contraintes de clé étrangère
    $query = @"
    SELECT 
        CONSTRAINT_NAME,
        TABLE_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
    FROM information_schema.KEY_COLUMN_USAGE 
    WHERE REFERENCED_TABLE_NAME = 'profil'
"@
    
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/profils/diagnostic" -Method GET
    Write-Host "✅ Diagnostic API accessible" -ForegroundColor Green
    Write-Host "Contenu: $($response | ConvertTo-Json -Depth 3)" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 Vérification terminée!" -ForegroundColor Green 