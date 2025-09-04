# Script pour capturer et analyser les vraies valeurs envoyees par le frontend

Write-Host "=== CAPTURE VALEURS FRONTEND ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "🎯 DIAGNOSTIC APPROFONDI:" -ForegroundColor Yellow
Write-Host "  - Les valeurs dans Excel sont identiques" -ForegroundColor Green
Write-Host "  - MAIS 0 correspondance dans la reconciliation" -ForegroundColor Red
Write-Host "  - CAUSE: Les valeurs envoyees par le frontend sont differentes" -ForegroundColor Red
Write-Host ""

Write-Host "=== INSTRUCTIONS DE CAPTURE ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Ouvrez votre navigateur et allez sur http://localhost:4200" -ForegroundColor White
Write-Host ""
Write-Host "2. Ouvrez les outils de developpeur (F12)" -ForegroundColor White
Write-Host ""
Write-Host "3. Allez dans l'onglet 'Console'" -ForegroundColor White
Write-Host ""
Write-Host "4. Uploadez vos fichiers TRXBO et OPPART" -ForegroundColor White
Write-Host ""
Write-Host "5. Avant de lancer la reconciliation, tapez dans la console:" -ForegroundColor White
Write-Host "   console.log('BO Data:', this.boData);" -ForegroundColor Green
Write-Host "   console.log('Partner Data:', this.partnerData);" -ForegroundColor Green
Write-Host ""
Write-Host "6. Notez quelques valeurs de 'Numero Trans GU' dans chaque fichier" -ForegroundColor White
Write-Host ""
Write-Host "7. Comparez ces valeurs avec celles que vous voyez dans Excel" -ForegroundColor White
Write-Host ""

Write-Host "=== ANALYSE DES VALEURS ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "Cherchez ces differences:" -ForegroundColor White
Write-Host ""
Write-Host "1. Espaces invisibles:" -ForegroundColor White
Write-Host "   Excel: '1751409965944'" -ForegroundColor Gray
Write-Host "   Frontend: ' 1751409965944 ' (avec espaces)" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Format different:" -ForegroundColor White
Write-Host "   Excel: '1751409965944'" -ForegroundColor Gray
Write-Host "   Frontend: 1751409965944 (number sans guillemets)" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Caracteres speciaux:" -ForegroundColor White
Write-Host "   Excel: '1751409965944'" -ForegroundColor Gray
Write-Host "   Frontend: '1751409965944\u00A0' (avec espace insécable)" -ForegroundColor Gray
Write-Host ""

Write-Host "=== SOLUTION PROPOSEE ===" -ForegroundColor Green
Write-Host ""
Write-Host "Si vous trouvez des differences:" -ForegroundColor White
Write-Host ""
Write-Host "1. Le probleme est dans le traitement des donnees du frontend" -ForegroundColor White
Write-Host "2. Il faut nettoyer les valeurs avant envoi" -ForegroundColor White
Write-Host "3. Ou modifier la logique de comparaison pour etre plus flexible" -ForegroundColor White
Write-Host ""

Write-Host "=== ALTERNATIVE ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "Si vous ne trouvez pas de differences:" -ForegroundColor White
Write-Host ""
Write-Host "1. Le probleme est dans la logique de reconciliation" -ForegroundColor White
Write-Host "2. Il faut analyser les logs backend plus en detail" -ForegroundColor White
Write-Host "3. Ou tester avec des donnees plus simples" -ForegroundColor White
Write-Host ""

Write-Host "=== INSTRUCTIONS SUPPLEMENTAIRES ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pour une analyse plus precise:" -ForegroundColor White
Write-Host ""
Write-Host "1. Dans la console, tapez aussi:" -ForegroundColor White
Write-Host "   console.log('BO Key Column:', this.selectedBoKeyColumn);" -ForegroundColor Green
Write-Host "   console.log('Partner Key Column:', this.selectedPartnerKeyColumn);" -ForegroundColor Green
Write-Host ""
Write-Host "2. Verifiez que les colonnes selectionnees sont bien 'Numero Trans GU'" -ForegroundColor White
Write-Host ""
Write-Host "3. Si ce n'est pas le cas, le probleme est dans la detection des cles" -ForegroundColor White
Write-Host ""

Write-Host "Test termine!" -ForegroundColor Cyan
