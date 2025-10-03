# Script de test pour vérifier les logiques d'annulation et de suppression
# Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

Write-Host "=== TEST DES LOGIQUES D'ANNULATION ET DE SUPPRESSION ===" -ForegroundColor Cyan

# Configuration de la base de données
$dbHost = "localhost"
$dbPort = "3306"
$dbName = "reconciliation_db"
$dbUser = "root"
$dbPassword = "password"

# Nom du script SQL
$sqlScript = "test-logique-annulation-suppression.sql"

try {
    Write-Host "Exécution du script de test des logiques..." -ForegroundColor Yellow
    Write-Host "Fichier SQL: $sqlScript" -ForegroundColor Gray
    
    # Exécuter le script SQL
    $result = mysql -h $dbHost -P $dbPort -u $dbUser -p$dbPassword $dbName -e "source $sqlScript" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Script exécuté avec succès!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Résultats de l'analyse:" -ForegroundColor Yellow
        Write-Host $result -ForegroundColor White
        
        # Analyser les résultats
        if ($result -match "✅ CORRECT") {
            Write-Host ""
            Write-Host "✅ Les logiques d'annulation sont correctes!" -ForegroundColor Green
        } else {
            Write-Host ""
            Write-Host "⚠️ Des problèmes détectés dans les logiques d'annulation" -ForegroundColor Yellow
        }
        
        if ($result -match "❌ INCORRECT") {
            Write-Host ""
            Write-Host "❌ Des incohérences détectées!" -ForegroundColor Red
            Write-Host "Vérifiez les détails dans les résultats ci-dessus" -ForegroundColor Yellow
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
Write-Host "=== INSTRUCTIONS POUR TESTER LES LOGIQUES ===" -ForegroundColor Green
Write-Host ""
Write-Host "1. TEST D'ANNULATION D'OPÉRATION:" -ForegroundColor White
Write-Host "   - Annulez une opération via l'interface" -ForegroundColor Gray
Write-Host "   - Vérifiez qu'une opération 'annulation_xxx' est créée" -ForegroundColor Gray
Write-Host "   - Vérifiez que l'impact est inverse (annule l'effet original)" -ForegroundColor Gray
Write-Host ""
Write-Host "2. TEST DE SUPPRESSION D'OPÉRATION:" -ForegroundColor White
Write-Host "   - Supprimez une opération via l'interface" -ForegroundColor Gray
Write-Host "   - Vérifiez que le solde du compte ne change PAS" -ForegroundColor Gray
Write-Host "   - Vérifiez les logs: 'AUCUN IMPACT sur le solde'" -ForegroundColor Gray
Write-Host ""
Write-Host "3. VÉRIFICATION DES FRUIS:" -ForegroundColor White
Write-Host "   - Annulez une opération avec des frais" -ForegroundColor Gray
Write-Host "   - Vérifiez que les frais sont également annulés" -ForegroundColor Gray
Write-Host "   - Vérifiez que les annulations de frais ont un impact inverse" -ForegroundColor Gray

Write-Host ""
Write-Host "=== LOGIQUES ATTENDUES ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ ANNULATION:" -ForegroundColor Green
Write-Host "   - Crée une opération 'annulation_xxx'" -ForegroundColor White
Write-Host "   - Impact INVERSE sur le solde (annule l'effet original)" -ForegroundColor White
Write-Host "   - Annule automatiquement les frais associés" -ForegroundColor White
Write-Host ""
Write-Host "✅ SUPPRESSION:" -ForegroundColor Green
Write-Host "   - Supprime l'opération de la base de données" -ForegroundColor White
Write-Host "   - AUCUN impact sur le solde du compte" -ForegroundColor White
Write-Host "   - Le solde reste inchangé" -ForegroundColor White

Write-Host ""
Write-Host "=== FIN DU TEST ===" -ForegroundColor Cyan
