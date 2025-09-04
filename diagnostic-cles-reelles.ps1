# Script pour diagnostiquer le probleme avec les cles reelles

$API_BASE_URL = "http://localhost:8080/api"

Write-Host "=== DIAGNOSTIC DES CLES RELLES ===" -ForegroundColor Cyan
Write-Host ""

try {
    # Recuperer les modeles
    $response = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models" -Method GET
    $models = $response.models
    
    Write-Host "Modeles trouves: $($models.Count)" -ForegroundColor Green
    
    # Trouver le modele OPPART
    $oppartModel = $models | Where-Object { $_.name -like "*OPPART*" }
    
    if ($oppartModel) {
        Write-Host ""
        Write-Host "Modele OPPART trouve:" -ForegroundColor Green
        Write-Host "  Nom: $($oppartModel.name)" -ForegroundColor White
        Write-Host "  ID: $($oppartModel.id)" -ForegroundColor White
        
        if ($oppartModel.reconciliationKeys) {
            Write-Host ""
            Write-Host "Cles configurees dans le modele OPPART:" -ForegroundColor Cyan
            Write-Host "  - Partner Keys: $($oppartModel.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor White
            Write-Host "  - BO Keys: $($oppartModel.reconciliationKeys.boKeys -join ', ')" -ForegroundColor White
        }
    }
    
    Write-Host ""
    Write-Host "=== ANALYSE DES CLES TRXBO (d'apres les logs) ===" -ForegroundColor Yellow
    
    # Cles TRXBO extraites des logs
    $trxboKeys = @(
        "MP250701.0829.C25981",
        "13099112233_CM", 
        "MP250701.0829.C25565",
        "MP250701.0717.C79561",
        "MP250701.0711.A92825",
        "13099049932_CM",
        "MP250701.0610.C51396",
        "MP250701.0605.C50031"
    )
    
    Write-Host "Exemples de cles TRXBO utilisees:" -ForegroundColor White
    foreach ($key in $trxboKeys) {
        Write-Host "  - $key" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "=== ANALYSE DES PATTERNS ===" -ForegroundColor Yellow
    
    # Analyser les patterns des cles TRXBO
    $mpPattern = ($trxboKeys | Where-Object { $_ -like "MP250701*" }).Count
    $cmPattern = ($trxboKeys | Where-Object { $_ -like "*_CM" }).Count
    
    Write-Host "Patterns identifies:" -ForegroundColor White
    Write-Host "  - MP250701.XXXX.XXXXXX: $mpPattern cles" -ForegroundColor Gray
    Write-Host "  - XXXXXXXX_CM: $cmPattern cles" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "=== DIAGNOSTIC DU PROBLEME ===" -ForegroundColor Red
    
    Write-Host "Le probleme identifie:" -ForegroundColor Yellow
    Write-Host "  1. Les cles TRXBO ont des formats specifiques (MP250701.XXXX.XXXXXX, XXXXXXXX_CM)" -ForegroundColor White
    Write-Host "  2. Le modele OPPART est configure pour utiliser 'Numero Trans GU'" -ForegroundColor White
    Write-Host "  3. Mais les donnees OPPART n'ont probablement pas les memes valeurs dans cette colonne" -ForegroundColor White
    
    Write-Host ""
    Write-Host "=== HYPOTHESES ===" -ForegroundColor Cyan
    
    Write-Host "Hypothese 1: Les donnees OPPART n'ont pas la colonne 'Numero Trans GU'" -ForegroundColor White
    Write-Host "Hypothese 2: Les donnees OPPART ont la colonne mais avec des valeurs differentes" -ForegroundColor White
    Write-Host "Hypothese 3: Les donnees OPPART ont la colonne mais avec un nom different" -ForegroundColor White
    
    Write-Host ""
    Write-Host "=== SOLUTIONS PROPOSEES ===" -ForegroundColor Green
    
    Write-Host "Solution 1: Verifier les colonnes reelles dans les fichiers OPPART" -ForegroundColor White
    Write-Host "Solution 2: Identifier la vraie colonne qui contient les cles de reconciliation" -ForegroundColor White
    Write-Host "Solution 3: Mettre a jour le modele OPPART avec la bonne colonne" -ForegroundColor White
    
    Write-Host ""
    Write-Host "=== QUESTIONS POUR DIAGNOSTIC ===" -ForegroundColor Yellow
    
    Write-Host "1. Quelle est la colonne exacte dans vos fichiers OPPART qui contient les cles?" -ForegroundColor White
    Write-Host "2. Cette colonne contient-elle les memes valeurs que TRXBO?" -ForegroundColor White
    Write-Host "3. Le nom de la colonne est-il exactement 'Numero Trans GU'?" -ForegroundColor White
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Diagnostic termine!" -ForegroundColor Cyan
