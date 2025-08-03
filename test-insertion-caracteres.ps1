# Test de la nouvelle fonctionnalité d'insertion de caractères
Write-Host "=== TEST INSERTION CARACTÈRES ===" -ForegroundColor Cyan

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
    
    # Vérifier l'ajout de insertCharacters dans formatOptions
    if ($content -match "insertCharacters: false") {
        Write-Host "✅ Option insertCharacters ajoutée dans formatOptions" -ForegroundColor Green
    } else {
        Write-Host "❌ Option insertCharacters manquante dans formatOptions" -ForegroundColor Red
    }
    
    # Vérifier l'ajout de insertCharacters dans formatSelections
    if ($content -match "insertCharacters: \[\]") {
        Write-Host "✅ insertCharacters ajouté dans formatSelections" -ForegroundColor Green
    } else {
        Write-Host "❌ insertCharacters manquant dans formatSelections" -ForegroundColor Red
    }
    
    # Vérifier les propriétés d'insertion
    if ($content -match "charactersToInsert: string") {
        Write-Host "✅ Propriété charactersToInsert ajoutée" -ForegroundColor Green
    } else {
        Write-Host "❌ Propriété charactersToInsert manquante" -ForegroundColor Red
    }
    
    if ($content -match "insertPosition: 'start' \| 'end' \| 'specific'") {
        Write-Host "✅ Propriété insertPosition ajoutée" -ForegroundColor Green
    } else {
        Write-Host "❌ Propriété insertPosition manquante" -ForegroundColor Red
    }
    
    if ($content -match "insertSpecificPosition: number") {
        Write-Host "✅ Propriété insertSpecificPosition ajoutée" -ForegroundColor Green
    } else {
        Write-Host "❌ Propriété insertSpecificPosition manquante" -ForegroundColor Red
    }
    
    # Vérifier la méthode applyInsertCharactersFormatting
    if ($content -match "applyInsertCharactersFormatting\(\)") {
        Write-Host "✅ Méthode applyInsertCharactersFormatting ajoutée" -ForegroundColor Green
    } else {
        Write-Host "❌ Méthode applyInsertCharactersFormatting manquante" -ForegroundColor Red
    }
    
    # Vérifier la logique d'insertion
    if ($content -match "case 'start':") {
        Write-Host "✅ Logique d'insertion au début présente" -ForegroundColor Green
    } else {
        Write-Host "❌ Logique d'insertion au début manquante" -ForegroundColor Red
    }
    
    if ($content -match "case 'end':") {
        Write-Host "✅ Logique d'insertion à la fin présente" -ForegroundColor Green
    } else {
        Write-Host "❌ Logique d'insertion à la fin manquante" -ForegroundColor Red
    }
    
    if ($content -match "case 'specific':") {
        Write-Host "✅ Logique d'insertion à position spécifique présente" -ForegroundColor Green
    } else {
        Write-Host "❌ Logique d'insertion à position spécifique manquante" -ForegroundColor Red
    }
}

# Vérifier les modifications dans le fichier HTML
Write-Host "`n🔍 Vérification des modifications dans le template HTML :" -ForegroundColor Yellow

$htmlFile = "reconciliation-app/frontend/src/app/components/traitement/traitement.component.html"
if (Test-Path $htmlFile) {
    $content = Get-Content $htmlFile -Raw
    
    # Vérifier l'ajout de l'option dans l'interface
    if ($content -match "Insérer des caractères") {
        Write-Host "✅ Option 'Insérer des caractères' ajoutée dans l'interface" -ForegroundColor Green
    } else {
        Write-Host "❌ Option 'Insérer des caractères' manquante dans l'interface" -ForegroundColor Red
    }
    
    # Vérifier les champs de saisie
    if ($content -match "Caractères à insérer") {
        Write-Host "✅ Champ 'Caractères à insérer' présent" -ForegroundColor Green
    } else {
        Write-Host "❌ Champ 'Caractères à insérer' manquant" -ForegroundColor Red
    }
    
    if ($content -match "Position :") {
        Write-Host "✅ Sélecteur de position présent" -ForegroundColor Green
    } else {
        Write-Host "❌ Sélecteur de position manquant" -ForegroundColor Red
    }
    
    if ($content -match "Position spécifique") {
        Write-Host "✅ Option 'Position spécifique' présente" -ForegroundColor Green
    } else {
        Write-Host "❌ Option 'Position spécifique' manquante" -ForegroundColor Red
    }
    
    # Vérifier le bouton d'application
    if ($content -match "applyInsertCharactersFormatting") {
        Write-Host "✅ Bouton d'application configuré" -ForegroundColor Green
    } else {
        Write-Host "❌ Bouton d'application manquant" -ForegroundColor Red
    }
    
    # Vérifier les exemples d'aide
    if ($content -match "Exemples d'insertion") {
        Write-Host "✅ Exemples d'aide présents" -ForegroundColor Green
    } else {
        Write-Host "❌ Exemples d'aide manquants" -ForegroundColor Red
    }
}

Write-Host "`n🎯 RÉSUMÉ DE LA FONCTIONNALITÉ :" -ForegroundColor Cyan
Write-Host "• Nouvelle option 'Insérer des caractères' dans les traitements" -ForegroundColor White
Write-Host "• Permet d'insérer des caractères au début, à la fin ou à une position spécifique" -ForegroundColor White
Write-Host "• Exemples :" -ForegroundColor White
Write-Host "  - Au début : 'ABC' + '123' = 'ABC123'" -ForegroundColor White
Write-Host "  - À la fin : '123' + 'XYZ' = '123XYZ'" -ForegroundColor White
Write-Host "  - Position 2 : '123' → '1ABC23'" -ForegroundColor White
Write-Host "  - Position 1 : '123' → 'ABC123'" -ForegroundColor White

Write-Host "`n✅ Test terminé !" -ForegroundColor Green 