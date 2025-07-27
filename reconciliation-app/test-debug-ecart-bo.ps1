# Script de test pour déboguer les données ECART BO
Write-Host "🔍 Test de débogage des données ECART BO" -ForegroundColor Cyan

# Instructions pour l'utilisateur
Write-Host "`n📋 Instructions:" -ForegroundColor Yellow
Write-Host "1. Ouvrez la console du navigateur (F12)" -ForegroundColor White
Write-Host "2. Allez dans l'onglet 'Console'" -ForegroundColor White
Write-Host "3. Effectuez une réconciliation pour obtenir des données ECART BO" -ForegroundColor White
Write-Host "4. Cliquez sur le bouton 'Save ECART BO'" -ForegroundColor White
Write-Host "5. Observez les logs de débogage dans la console" -ForegroundColor White

Write-Host "`n🔍 Logs à rechercher:" -ForegroundColor Green
Write-Host "- 'DEBUG: Colonnes disponibles dans ECART BO:'" -ForegroundColor White
Write-Host "- 'DEBUG: Premier enregistrement ECART BO:'" -ForegroundColor White
Write-Host "- 'DEBUG: getBoOnlyAgencyAndService - Valeurs extraites:'" -ForegroundColor White
Write-Host "- 'DEBUG: Enregistrement X préparé:'" -ForegroundColor White

Write-Host "`n❓ Problèmes possibles:" -ForegroundColor Red
Write-Host "1. Colonnes manquantes (agence, service, idTransaction)" -ForegroundColor White
Write-Host "2. Valeurs vides dans les colonnes requises" -ForegroundColor White
Write-Host "3. Noms de colonnes différents de ceux attendus" -ForegroundColor White

Write-Host "`n✅ Solutions appliquées:" -ForegroundColor Green
Write-Host "1. Ajout de logs détaillés pour identifier les colonnes disponibles" -ForegroundColor White
Write-Host "2. Amélioration de getBoOnlyAgencyAndService avec recherche de colonnes multiples" -ForegroundColor White
Write-Host "3. Validation plus robuste des données avant sauvegarde" -ForegroundColor White

Write-Host "`n🚀 Prêt pour le test!" -ForegroundColor Cyan 