# Script de test pour diagnostiquer le problème de validation ECART BO
Write-Host "🔍 Diagnostic du problème de validation ECART BO" -ForegroundColor Cyan

Write-Host "`n📋 Instructions de test:" -ForegroundColor Yellow
Write-Host "1. Ouvrez la console du navigateur (F12)" -ForegroundColor White
Write-Host "2. Allez dans l'onglet 'Console'" -ForegroundColor White
Write-Host "3. Effectuez une réconciliation pour obtenir des données ECART BO" -ForegroundColor White
Write-Host "4. Cliquez sur le bouton 'Save ECART BO'" -ForegroundColor White
Write-Host "5. Copiez et partagez les logs suivants:" -ForegroundColor White

Write-Host "`n🔍 Logs à copier:" -ForegroundColor Green
Write-Host "=== LOGS À COPIER ===" -ForegroundColor Red
Write-Host "1. 'DEBUG: Colonnes disponibles dans ECART BO:'" -ForegroundColor White
Write-Host "2. 'DEBUG: Premier enregistrement ECART BO:'" -ForegroundColor White
Write-Host "3. 'DEBUG: Enregistrement X - Colonnes disponibles:'" -ForegroundColor White
Write-Host "4. 'DEBUG: Enregistrement X - Données brutes:'" -ForegroundColor White
Write-Host "5. 'DEBUG: getBoOnlyAgencyAndService - Valeurs extraites:'" -ForegroundColor White
Write-Host "6. 'DEBUG: Enregistrement X - Validation:'" -ForegroundColor White
Write-Host "7. 'DEBUG: Nombre d\'enregistrements valides après filtrage:'" -ForegroundColor White
Write-Host "=== FIN DES LOGS ===" -ForegroundColor Red

Write-Host "`n❓ Questions de diagnostic:" -ForegroundColor Yellow
Write-Host "1. Les colonnes 'Agence' et 'id_transaction' existent-elles dans les données ?" -ForegroundColor White
Write-Host "2. Ces colonnes ont-elles des valeurs non vides ?" -ForegroundColor White
Write-Host "3. Les noms de colonnes correspondent-ils aux variations attendues ?" -ForegroundColor White

Write-Host "`n🔧 Solutions possibles:" -ForegroundColor Green
Write-Host "1. Si les colonnes n'existent pas: Ajouter les noms de colonnes manquants" -ForegroundColor White
Write-Host "2. Si les valeurs sont vides: Vérifier la source des données" -ForegroundColor White
Write-Host "3. Si les noms sont différents: Ajuster les variations de noms" -ForegroundColor White

Write-Host "`n🚀 Prêt pour le diagnostic!" -ForegroundColor Cyan 