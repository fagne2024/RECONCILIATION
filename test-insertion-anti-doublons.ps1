# Test de la fonctionnalité anti-doublons pour l'insertion de caractères
Write-Host "=== TEST INSERTION ANTI-DOUBLONS ===" -ForegroundColor Cyan

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
Write-Host "`n🔍 Vérification de la logique anti-doublons :" -ForegroundColor Yellow

$tsFile = "reconciliation-app/frontend/src/app/components/traitement/traitement.component.ts"
if (Test-Path $tsFile) {
    $content = Get-Content $tsFile -Raw
    
    # Vérifier la logique anti-doublons au début
    if ($content -match "startsWith\(charsToInsert\)") {
        Write-Host "✅ Vérification anti-doublons au début présente" -ForegroundColor Green
    } else {
        Write-Host "❌ Vérification anti-doublons au début manquante" -ForegroundColor Red
    }
    
    # Vérifier la logique anti-doublons à la fin
    if ($content -match "endsWith\(charsToInsert\)") {
        Write-Host "✅ Vérification anti-doublons à la fin présente" -ForegroundColor Green
    } else {
        Write-Host "❌ Vérification anti-doublons à la fin manquante" -ForegroundColor Red
    }
    
    # Vérifier la logique anti-doublons à position spécifique
    if ($content -match "afterPosition\.startsWith\(charsToInsert\)") {
        Write-Host "✅ Vérification anti-doublons à position spécifique présente" -ForegroundColor Green
    } else {
        Write-Host "❌ Vérification anti-doublons à position spécifique manquante" -ForegroundColor Red
    }
    
    # Vérifier la variable shouldInsert
    if ($content -match "shouldInsert = false") {
        Write-Host "✅ Logique de désactivation d'insertion présente" -ForegroundColor Green
    } else {
        Write-Host "❌ Logique de désactivation d'insertion manquante" -ForegroundColor Red
    }
}

# Vérifier les modifications dans le fichier HTML
Write-Host "`n🔍 Vérification de l'interface utilisateur :" -ForegroundColor Yellow

$htmlFile = "reconciliation-app/frontend/src/app/components/traitement/traitement.component.html"
if (Test-Path $htmlFile) {
    $content = Get-Content $htmlFile -Raw
    
    # Vérifier la mention anti-doublons
    if ($content -match "Protection anti-doublons") {
        Write-Host "✅ Mention anti-doublons présente dans l'interface" -ForegroundColor Green
    } else {
        Write-Host "❌ Mention anti-doublons manquante dans l'interface" -ForegroundColor Red
    }
    
    # Vérifier l'icône de protection
    if ($content -match "🛡️") {
        Write-Host "✅ Icône de protection présente" -ForegroundColor Green
    } else {
        Write-Host "❌ Icône de protection manquante" -ForegroundColor Red
    }
}

Write-Host "`n🎯 RÉSUMÉ DE LA FONCTIONNALITÉ ANTI-DOUBLONS :" -ForegroundColor Cyan
Write-Host "• Protection contre les doublons au début :" -ForegroundColor White
Write-Host "  - Si 'ABC' est déjà au début de 'ABC123', pas d'ajout" -ForegroundColor White
Write-Host "• Protection contre les doublons à la fin :" -ForegroundColor White
Write-Host "  - Si 'XYZ' est déjà à la fin de '123XYZ', pas d'ajout" -ForegroundColor White
Write-Host "• Protection contre les doublons à position spécifique :" -ForegroundColor White
Write-Host "  - Si 'ABC' est déjà à la position 2 de '1ABC23', pas d'ajout" -ForegroundColor White
Write-Host "• Interface utilisateur mise à jour avec mention de protection" -ForegroundColor White

Write-Host "`n✅ Test terminé !" -ForegroundColor Green 