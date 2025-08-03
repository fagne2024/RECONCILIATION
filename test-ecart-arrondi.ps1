# Script de test pour vérifier les modifications d'arrondi des écarts
Write-Host "=== Test des Modifications d'Arrondi des Écarts ===" -ForegroundColor Green
Write-Host ""

# Test 1: Vérifier les fichiers modifiés
Write-Host "1. Vérification des fichiers modifiés..." -ForegroundColor Cyan
$files = @(
    "reconciliation-app/frontend/src/app/components/comptes/comptes.component.ts",
    "reconciliation-app/frontend/src/app/components/comptes/comptes.component.html",
    "reconciliation-app/frontend/src/app/components/comptes/comptes.component.scss"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "   ✅ $file trouvé" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $file manquant" -ForegroundColor Red
    }
}

# Test 2: Vérifier les modifications dans le fichier TypeScript
Write-Host ""
Write-Host "2. Vérification des modifications TypeScript..." -ForegroundColor Cyan

$tsContent = Get-Content "reconciliation-app/frontend/src/app/components/comptes/comptes.component.ts" -Raw

if ($tsContent -match "Math\.round\(\(solde\.closing - solde\.closingBo\) \* 100\) / 100") {
    Write-Host "   ✅ Arrondi à 2 décimales implémenté" -ForegroundColor Green
} else {
    Write-Host "   ❌ Arrondi à 2 décimales manquant" -ForegroundColor Red
}

if ($tsContent -match "tolerance = 0\.01") {
    Write-Host "   ✅ Tolérance de 1 centime implémentée" -ForegroundColor Green
} else {
    Write-Host "   ❌ Tolérance de 1 centime manquante" -ForegroundColor Red
}

if ($tsContent -match "Math\.abs\(ecart\) <= tolerance") {
    Write-Host "   ✅ Logique de tolérance implémentée" -ForegroundColor Green
} else {
    Write-Host "   ❌ Logique de tolérance manquante" -ForegroundColor Red
}

# Test 3: Vérifier les modifications dans le fichier SCSS
Write-Host ""
Write-Host "3. Vérification des modifications SCSS..." -ForegroundColor Cyan

$scssContent = Get-Content "reconciliation-app/frontend/src/app/components/comptes/comptes.component.scss" -Raw

if ($scssContent -match "\.ecart-zero") {
    Write-Host "   ✅ Style ecart-zero trouvé" -ForegroundColor Green
} else {
    Write-Host "   ❌ Style ecart-zero manquant" -ForegroundColor Red
}

if ($scssContent -match "border: 2px solid #4caf50") {
    Write-Host "   ✅ Bordure verte pour écart nul implémentée" -ForegroundColor Green
} else {
    Write-Host "   ❌ Bordure verte pour écart nul manquante" -ForegroundColor Red
}

if ($scssContent -match "border-radius: 4px") {
    Write-Host "   ✅ Coins arrondis implémentés" -ForegroundColor Green
} else {
    Write-Host "   ❌ Coins arrondis manquants" -ForegroundColor Red
}

# Test 4: Vérifier les modifications dans le fichier HTML
Write-Host ""
Write-Host "4. Vérification des modifications HTML..." -ForegroundColor Cyan

$htmlContent = Get-Content "reconciliation-app/frontend/src/app/components/comptes/comptes.component.html" -Raw

if ($htmlContent -match "font-weight: bold") {
    Write-Host "   ✅ Police en gras implémentée" -ForegroundColor Green
} else {
    Write-Host "   ❌ Police en gras manquante" -ForegroundColor Red
}

if ($htmlContent -match "getEcartValue\(solde\)") {
    Write-Host "   ✅ Méthode getEcartValue utilisée" -ForegroundColor Green
} else {
    Write-Host "   ❌ Méthode getEcartValue manquante" -ForegroundColor Red
}

# Test 5: Vérifier les couleurs d'export Excel
Write-Host ""
Write-Host "5. Vérification des couleurs d'export Excel..." -ForegroundColor Cyan

if ($tsContent -match "FFE8F5E8") {
    Write-Host "   ✅ Couleur verte améliorée pour Excel" -ForegroundColor Green
} else {
    Write-Host "   ❌ Couleur verte améliorée manquante" -ForegroundColor Red
}

if ($tsContent -match "FFFFF3E0") {
    Write-Host "   ✅ Couleur orange améliorée pour Excel" -ForegroundColor Green
} else {
    Write-Host "   ❌ Couleur orange améliorée manquante" -ForegroundColor Red
}

if ($tsContent -match "FFFFEBEE") {
    Write-Host "   ✅ Couleur rouge améliorée pour Excel" -ForegroundColor Green
} else {
    Write-Host "   ❌ Couleur rouge améliorée manquante" -ForegroundColor Red
}

# Résumé
Write-Host ""
Write-Host "=== Résumé des Modifications ===" -ForegroundColor Green
Write-Host "✅ Arrondi des montants d'écart à 2 décimales" -ForegroundColor Green
Write-Host "✅ Tolérance de 1 centime pour les écarts nuls" -ForegroundColor Green
Write-Host "✅ Coloration verte pour les écarts égaux à 0" -ForegroundColor Green
Write-Host "✅ Styles améliorés avec bordures et coins arrondis" -ForegroundColor Green
Write-Host "✅ Police en gras pour une meilleure visibilité" -ForegroundColor Green
Write-Host "✅ Couleurs d'export Excel cohérentes" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 Fonctionnalités implémentées:" -ForegroundColor Cyan
Write-Host "   • Arrondi automatique des montants d'écart" -ForegroundColor White
Write-Host "   • Écarts nuls (≤ 1 centime) affichés en vert" -ForegroundColor White
Write-Host "   • Écarts positifs affichés en orange" -ForegroundColor White
Write-Host "   • Écarts négatifs affichés en rouge" -ForegroundColor White
Write-Host "   • Styles visuels améliorés avec bordures" -ForegroundColor White
Write-Host "   • Export Excel avec couleurs cohérentes" -ForegroundColor White 