# Script pour diagnostiquer le vrai probleme : incompatibilite des valeurs

$API_BASE_URL = "http://localhost:8080/api"

Write-Host "=== DIAGNOSTIC DU VRAI PROBLEME ===" -ForegroundColor Cyan
Write-Host ""

try {
    # Recuperer les modeles
    $response = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models" -Method GET
    $models = $response.models
    
    $oppartModel = $models | Where-Object { $_.name -like "*OPPART*" }
    
    Write-Host "Modele OPPART trouve: $($oppartModel.name)" -ForegroundColor Green
    Write-Host "Cles configurees: $($oppartModel.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor White
    
    Write-Host ""
    Write-Host "=== ANALYSE DES VALEURS RELLES ===" -ForegroundColor Yellow
    
    Write-Host "D'apres les logs TRXBO (colonnes 'Numero Trans GU'):" -ForegroundColor White
    $trxboKeys = @(
        "MP250701.0829.C25981",
        "13099112233_CM", 
        "MP250701.0829.C25565",
        "MP250701.0717.C79561",
        "MP250701.0711.A92825",
        "13099049932_CM"
    )
    
    foreach ($key in $trxboKeys) {
        Write-Host "  - $key" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "D'apres l'image OPPART (colonnes 'Numero Trans GU'):" -ForegroundColor White
    $oppartKeys = @(
        "1751409965944",
        "1751409935809", 
        "1751408576263",
        "1751408576264",
        "1751408576265"
    )
    
    foreach ($key in $oppartKeys) {
        Write-Host "  - $key" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "=== ANALYSE DES PATTERNS ===" -ForegroundColor Yellow
    
    Write-Host "Patterns TRXBO:" -ForegroundColor White
    $mpPattern = ($trxboKeys | Where-Object { $_ -like "MP250701*" }).Count
    $cmPattern = ($trxboKeys | Where-Object { $_ -like "*_CM" }).Count
    Write-Host "  - MP250701.XXXX.XXXXXX: $mpPattern cles" -ForegroundColor Gray
    Write-Host "  - XXXXXXXX_CM: $cmPattern cles" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "Patterns OPPART:" -ForegroundColor White
    $numericPattern = ($oppartKeys | Where-Object { $_ -match '^\d+$' }).Count
    Write-Host "  - Numeriques longs (13 chiffres): $numericPattern cles" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "=== DIAGNOSTIC FINAL ===" -ForegroundColor Red
    
    Write-Host "LE VRAI PROBLEME IDENTIFIE:" -ForegroundColor Yellow
    Write-Host "  1. Les deux fichiers ont bien la colonne 'Numero Trans GU'" -ForegroundColor White
    Write-Host "  2. MAIS les valeurs sont completement differentes:" -ForegroundColor White
    Write-Host "     - TRXBO: MP250701.0829.C25981 (format alphanumerique)" -ForegroundColor Gray
    Write-Host "     - OPPART: 1751409965944 (format numerique long)" -ForegroundColor Gray
    Write-Host "  3. AUCUNE correspondance possible car les formats sont incompatibles" -ForegroundColor White
    
    Write-Host ""
    Write-Host "=== HYPOTHESES POUR EXPLIQUER ===" -ForegroundColor Cyan
    
    Write-Host "Hypothese 1: Les fichiers ne representent pas les memes transactions" -ForegroundColor White
    Write-Host "Hypothese 2: Il y a une transformation/conversion manquante entre les formats" -ForegroundColor White
    Write-Host "Hypothese 3: Il faut utiliser une autre colonne pour la reconciliation" -ForegroundColor White
    Write-Host "Hypothese 4: Les donnees sont de periodes differentes" -ForegroundColor White
    
    Write-Host ""
    Write-Host "=== QUESTIONS CRITIQUES ===" -ForegroundColor Yellow
    
    Write-Host "1. Ces deux fichiers representent-ils les MEMES transactions?" -ForegroundColor White
    Write-Host "2. Y a-t-il une relation entre MP250701.0829.C25981 et 1751409965944?" -ForegroundColor White
    Write-Host "3. Existe-t-il une autre colonne qui pourrait servir de cle de reconciliation?" -ForegroundColor White
    Write-Host "4. Les donnees sont-elles de la meme periode temporelle?" -ForegroundColor White
    
    Write-Host ""
    Write-Host "=== RECOMMANDATIONS ===" -ForegroundColor Green
    
    Write-Host "1. Verifier si les fichiers representent les memes transactions" -ForegroundColor White
    Write-Host "2. Chercher une colonne commune avec des valeurs identiques" -ForegroundColor White
    Write-Host "3. Verifier s'il y a une table de correspondance entre les formats" -ForegroundColor White
    Write-Host "4. Analyser les autres colonnes pour trouver une cle alternative" -ForegroundColor White
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Diagnostic termine!" -ForegroundColor Cyan
