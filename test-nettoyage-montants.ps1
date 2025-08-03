# Test de la nouvelle fonctionnalité de nettoyage des montants
Write-Host "=== TEST NETTOYAGE MONTANTS ===" -ForegroundColor Cyan

# Vérifier que les fichiers modifiés existent
$filesToCheck = @(
    "reconciliation-app/frontend/src/app/components/traitement/traitement.component.ts",
    "reconciliation-app/frontend/src/app/components/traitement/traitement.component.html"
)

Write-Host "`n📁 Vérification des fichiers modifiés :" -ForegroundColor Yellow
foreach ($file in $filesToCheck) {
    if (Test-Path $file) {
        Write-Host "✅ $file" -ForegroundColor Green
    } else {
        Write-Host "❌ $file" -ForegroundColor Red
    }
}

# Vérifier les modifications dans le fichier TypeScript
Write-Host "`n🔍 Vérification des modifications dans le composant TypeScript :" -ForegroundColor Yellow

$tsFile = "reconciliation-app/frontend/src/app/components/traitement/traitement.component.ts"
if (Test-Path $tsFile) {
    $content = Get-Content $tsFile -Raw
    
    # Vérifier l'ajout de cleanAmounts dans formatOptions
    if ($content -match "cleanAmounts: false") {
        Write-Host "✅ Option cleanAmounts ajoutée dans formatOptions" -ForegroundColor Green
    } else {
        Write-Host "❌ Option cleanAmounts manquante dans formatOptions" -ForegroundColor Red
    }
    
    # Vérifier l'ajout de cleanAmounts dans formatSelections
    if ($content -match "cleanAmounts: \[\]") {
        Write-Host "✅ cleanAmounts ajouté dans formatSelections" -ForegroundColor Green
    } else {
        Write-Host "❌ cleanAmounts manquant dans formatSelections" -ForegroundColor Red
    }
    
    # Vérifier la méthode applyCleanAmountsFormatting
    if ($content -match "applyCleanAmountsFormatting\(\)") {
        Write-Host "✅ Méthode applyCleanAmountsFormatting ajoutée" -ForegroundColor Green
    } else {
        Write-Host "❌ Méthode applyCleanAmountsFormatting manquante" -ForegroundColor Red
    }
    
    # Vérifier la logique de nettoyage
    if ($content -match "Enlever les espaces") {
        Write-Host "✅ Logique de suppression des espaces présente" -ForegroundColor Green
    } else {
        Write-Host "❌ Logique de suppression des espaces manquante" -ForegroundColor Red
    }
    
    if ($content -match ",00\$") {
        Write-Host "✅ Logique de suppression de ,00 présente" -ForegroundColor Green
    } else {
        Write-Host "❌ Logique de suppression de ,00 manquante" -ForegroundColor Red
    }
}

# Vérifier les modifications dans le fichier HTML
Write-Host "`n🔍 Vérification des modifications dans le template HTML :" -ForegroundColor Yellow

$htmlFile = "reconciliation-app/frontend/src/app/components/traitement/traitement.component.html"
if (Test-Path $htmlFile) {
    $content = Get-Content $htmlFile -Raw
    
    # Vérifier l'ajout de l'option dans l'interface
    if ($content -match "Nettoyer les montants") {
        Write-Host "✅ Option 'Nettoyer les montants' ajoutée dans l'interface" -ForegroundColor Green
    } else {
        Write-Host "❌ Option 'Nettoyer les montants' manquante dans l'interface" -ForegroundColor Red
    }
    
    # Vérifier la description des fonctionnalités
    if ($content -match "Enlever tous les espaces") {
        Write-Host "✅ Description des fonctionnalités présente" -ForegroundColor Green
    } else {
        Write-Host "❌ Description des fonctionnalités manquante" -ForegroundColor Red
    }
    
    # Vérifier le bouton d'application
    if ($content -match "applyCleanAmountsFormatting") {
        Write-Host "✅ Bouton d'application configuré" -ForegroundColor Green
    } else {
        Write-Host "❌ Bouton d'application manquant" -ForegroundColor Red
    }
}

Write-Host "`n🎯 RÉSUMÉ DE LA FONCTIONNALITÉ :" -ForegroundColor Cyan
Write-Host "• Nouvelle option 'Nettoyer les montants' dans les traitements" -ForegroundColor White
Write-Host "• Supprime les espaces (ex: '100 000,00' → '100000,00')" -ForegroundColor White
Write-Host "• Supprime ',00' à la fin (ex: '100000,00' → '100000')" -ForegroundColor White
Write-Host "• Supprime ',0' à la fin (ex: '100000,0' → '100000')" -ForegroundColor White
Write-Host "• Convertit les nombres entiers (ex: 100000.0 → 100000)" -ForegroundColor White

Write-Host "`n✅ Test terminé !" -ForegroundColor Green 