# Script de test pour vérifier la synchronisation des soldes de clôture
# Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

Write-Host "=== TEST DE SYNCHRONISATION DES SOLDES DE CLÔTURE ===" -ForegroundColor Cyan

# Configuration de la base de données
$dbHost = "localhost"
$dbPort = "3306"
$dbName = "reconciliation_db"
$dbUser = "root"
$dbPassword = "password"

# Nom du script SQL
$sqlScript = "test-synchronisation-soldes-cloture.sql"

try {
    Write-Host "Exécution du script de test de synchronisation..." -ForegroundColor Yellow
    Write-Host "Fichier SQL: $sqlScript" -ForegroundColor Gray
    
    # Exécuter le script SQL
    $result = mysql -h $dbHost -P $dbPort -u $dbUser -p$dbPassword $dbName -e "source $sqlScript" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Script exécuté avec succès!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Résultats de l'analyse:" -ForegroundColor Yellow
        Write-Host $result -ForegroundColor White
        
        # Analyser les résultats pour identifier les problèmes
        if ($result -match "comptes_a_synchroniser.*[1-9]") {
            Write-Host ""
            Write-Host "⚠️ Des comptes nécessitent une synchronisation!" -ForegroundColor Yellow
            Write-Host "Utilisez l'API pour synchroniser: POST /api/operations/synchronize-closing-balances" -ForegroundColor Cyan
        } else {
            Write-Host ""
            Write-Host "✅ Tous les comptes sont synchronisés!" -ForegroundColor Green
        }
        
    } else {
        Write-Host "❌ Erreur lors de l'exécution du script:" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Erreur lors de l'exécution du test:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host ""
Write-Host "=== INSTRUCTIONS POUR LA SYNCHRONISATION ===" -ForegroundColor Green
Write-Host "1. Pour synchroniser tous les comptes:" -ForegroundColor White
Write-Host "   POST http://localhost:8080/api/operations/synchronize-closing-balances" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Pour synchroniser un compte spécifique:" -ForegroundColor White
Write-Host "   POST http://localhost:8080/api/operations/recalculate-closing-balance/{compteId}" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Vérifier les logs de l'application pour voir les détails de la synchronisation" -ForegroundColor White

Write-Host ""
Write-Host "=== FIN DU TEST ===" -ForegroundColor Cyan
