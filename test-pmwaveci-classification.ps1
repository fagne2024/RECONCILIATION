# Script de test spécifique pour vérifier la classification de PMWAVECI

Write-Host "=== Test de classification PMWAVECI ===" -ForegroundColor Green

# Simuler la logique de classification comme dans le frontend
function Test-ModelClassification {
    param([string]$modelName)
    
    $modelNameLower = $modelName.ToLower()
    
    Write-Host "`nTest du modèle: '$modelName'" -ForegroundColor Cyan
    Write-Host "Version lowercase: '$modelNameLower'" -ForegroundColor Gray
    
    # RÈGLE SPÉCIALE: Tous les modèles commençant par "PM" sont des partenaires paiement
    if ($modelNameLower.StartsWith('pm') -or 
        $modelNameLower.Contains('pmwaveci') -or 
        $modelNameLower.Contains('pmom') -or
        $modelNameLower.Contains('pmmoovbf') -or
        $modelNameLower.Contains('pmmtncm') -or
        ($modelNameLower -match 'pm[a-z0-9]{4,}')) {
        Write-Host "✅ Classification: Partenaire PAIEMENT" -ForegroundColor Green
        return "Partenaire PAIEMENT"
    }
    
    # Patterns pour Partenaire CASHIN
    $cashinPatterns = @('ciom', 'cashin', 'cash', 'ci_', '_ci', 'ciomcm', 'ciomml', 'ciomgn', 'ciomci', 'ciomsn', 'ciomkn', 'ciombj', 'ciomgb')
    
    foreach ($pattern in $cashinPatterns) {
        if ($modelNameLower.Contains($pattern)) {
            Write-Host "✅ Classification: Partenaire CASHIN (pattern: $pattern)" -ForegroundColor Yellow
            return "Partenaire CASHIN"
        }
    }
    
    Write-Host "✅ Classification: Back Office (par défaut)" -ForegroundColor Blue
    return "Back Office"
}

# Tests avec différents formats de noms
$testModels = @(
    "PMWAVECI",
    "pmwaveci", 
    "Modèle basé sur PMWAVECI.xls",
    "Modèle basé sur pmwaveci.xlsx",
    "PMOMCI",
    "PMMTNCM",
    "PMMOOVBF",
    "CIOMCI",
    "CIWAVECI",
    "Autre modèle"
)

Write-Host "`n=== Tests de classification ===" -ForegroundColor Yellow

foreach ($model in $testModels) {
    Test-ModelClassification -modelName $model
}

Write-Host "`n=== Résumé ===" -ForegroundColor Green
Write-Host "Tous les modèles contenant 'PMWAVECI', 'PMOM', 'PMMOOVBF', 'PMMTNCM' ou commençant par 'PM' doivent être classés comme 'Partenaire PAIEMENT'" -ForegroundColor White
Write-Host "Si PMWAVECI apparaît encore en CASHIN, il faut:" -ForegroundColor Yellow
Write-Host "1. Vider le cache du navigateur (Ctrl+F5)" -ForegroundColor White
Write-Host "2. Redémarrer l'application frontend" -ForegroundColor White
Write-Host "3. Vérifier que le build a bien été fait" -ForegroundColor White

Write-Host "`n=== Test terminé ===" -ForegroundColor Green
