# Script de test pour vérifier l'exclusion des opérations d'annulation dans les relevés de compte
# Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

Write-Host "=== TEST D'EXCLUSION DES OPÉRATIONS D'ANNULATION ===" -ForegroundColor Cyan

# Configuration de la base de données
$dbHost = "localhost"
$dbPort = "3306"
$dbName = "reconciliation_db"
$dbUser = "root"
$dbPassword = "password"

# Nom du script SQL
$sqlScript = "test-exclusion-operations-annulees.sql"

try {
    Write-Host "Exécution du script de test..." -ForegroundColor Yellow
    Write-Host "Fichier SQL: $sqlScript" -ForegroundColor Gray
    
    # Exécuter le script SQL
    $result = mysql -h $dbHost -P $dbPort -u $dbUser -p$dbPassword $dbName -e "source $sqlScript" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Script exécuté avec succès!" -ForegroundColor Green
        Write-Host "Résultats:" -ForegroundColor Yellow
        Write-Host $result -ForegroundColor White
        
        # Analyser les résultats
        if ($result -match "nombre_operations.*0") {
            Write-Host "✅ Aucune opération d'annulation trouvée dans les relevés - Test réussi!" -ForegroundColor Green
        } else {
            Write-Host "⚠️ Des opérations d'annulation sont encore présentes - Vérification nécessaire" -ForegroundColor Yellow
        }
        
    } else {
        Write-Host "❌ Erreur lors de l'exécution du script:" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Erreur lors de l'exécution du test:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host "`n=== FIN DU TEST ===" -ForegroundColor Cyan
