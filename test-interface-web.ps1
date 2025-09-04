# Script pour tester l'interface web avec les modifications

Write-Host "=== TEST INTERFACE WEB ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Instructions pour tester l'interface web:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Ouvrez votre navigateur et allez sur: http://localhost:4200" -ForegroundColor White
Write-Host ""
Write-Host "2. Uploadez vos fichiers TRXBO et OPPART" -ForegroundColor White
Write-Host ""
Write-Host "3. Vérifiez dans la console du navigateur (F12) que vous voyez:" -ForegroundColor White
Write-Host "   - '✅ Modèle trouvé: Modele OPPART - Reconciliation Corrigee'" -ForegroundColor Green
Write-Host "   - '🔑 Clés du modèle: {boKeys: ['Numéro Trans GU'], partnerKeys: ['Numéro Trans GU']}'" -ForegroundColor Green
Write-Host "   - '✅ Clés trouvées via modèle: {boKeyColumn: 'Numéro Trans GU', partnerKeyColumn: 'Numéro Trans GU'}'" -ForegroundColor Green
Write-Host "   - '🚫 Détection intelligente désactivée pour éviter le scoring'" -ForegroundColor Green
Write-Host ""
Write-Host "4. Si vous voyez ces messages, les clés du modèle sont correctement utilisées" -ForegroundColor White
Write-Host ""
Write-Host "5. Si vous voyez des messages de 'détection intelligente', il y a encore un problème" -ForegroundColor Red
Write-Host ""
Write-Host "6. Vérifiez que les colonnes sélectionnées sont 'Numéro Trans GU' pour les deux fichiers" -ForegroundColor White
Write-Host ""
Write-Host "7. Lancez la réconciliation et vérifiez les résultats" -ForegroundColor White
Write-Host ""
Write-Host "=== RÉSULTATS ATTENDUS ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ SUCCÈS si:" -ForegroundColor Green
Write-Host "  - Les clés du modèle sont détectées et utilisées" -ForegroundColor White
Write-Host "  - Les colonnes 'Numéro Trans GU' sont sélectionnées" -ForegroundColor White
Write-Host "  - La réconciliation trouve des correspondances" -ForegroundColor White
Write-Host ""
Write-Host "❌ ÉCHEC si:" -ForegroundColor Red
Write-Host "  - Les clés 'IDTransaction' sont encore utilisées" -ForegroundColor White
Write-Host "  - La détection intelligente est encore active" -ForegroundColor White
Write-Host "  - Aucune correspondance n'est trouvée" -ForegroundColor White
Write-Host ""
Write-Host "=== EN CAS D'ÉCHEC ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "Si le problème persiste:" -ForegroundColor White
Write-Host "1. Vérifiez que le backend est redémarré" -ForegroundColor White
Write-Host "2. Vérifiez que le frontend est redémarré" -ForegroundColor White
Write-Host "3. Videz le cache du navigateur (Ctrl+F5)" -ForegroundColor White
Write-Host "4. Vérifiez les logs dans la console du navigateur" -ForegroundColor White
Write-Host ""
Write-Host "Test termine!" -ForegroundColor Cyan
