# Script simple pour remplacer les alert() restants
$filePath = "src/app/components/reconciliation-results/reconciliation-results.component.ts"
$content = Get-Content $filePath -Raw

Write-Host "Remplacement des alert() restants..." -ForegroundColor Green

# Remplacer les alert() par des appels au service
$content = $content -replace "alert\('❌ Aucun enregistrement valide trouvé pour la sauvegarde dans TRX SF\.'\);", "this.popupService.showWarning('❌ Aucun enregistrement valide trouvé pour la sauvegarde dans TRX SF.');"

$content = $content -replace "alert\(\`❌ \$\{errorMessage\}\`\);", "this.popupService.showError(\`❌ \$\{errorMessage\}\`);"

$content = $content -replace "alert\('❌ Aucune donnée ECART Partenaire à sauvegarder\.'\);", "this.popupService.showWarning('❌ Aucune donnée ECART Partenaire à sauvegarder.');"

$content = $content -replace "alert\('❌ Aucune donnée valide trouvée pour la sauvegarde\.'\);", "this.popupService.showWarning('❌ Aucune donnée valide trouvée pour la sauvegarde.');"

$content = $content -replace "alert\(successMessage\);", "this.popupService.showSuccess(successMessage);"

$content = $content -replace "alert\(errorMessage\);", "this.popupService.showError(errorMessage);"

$content = $content -replace "alert\('❌ Aucune donnée ECART Partenaire à sauvegarder dans Import OP\.'\);", "this.popupService.showWarning('❌ Aucune donnée ECART Partenaire à sauvegarder dans Import OP.');"

$content = $content -replace "alert\('Veuillez sélectionner au moins une ligne à sauvegarder\.'\);", "this.popupService.showWarning('Veuillez sélectionner au moins une ligne à sauvegarder.');"

$content = $content -replace "alert\(message\);", "this.popupService.showInfo(message);"

$content = $content -replace "alert\(msg\);", "this.popupService.showInfo(msg);"

# Sauvegarder le fichier modifié
$content | Set-Content $filePath

Write-Host "Remplacement termine !" -ForegroundColor Green
