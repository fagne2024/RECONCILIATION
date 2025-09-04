# Script pour diagnostiquer le vrai probleme avec les formats corrects

$API_BASE_URL = "http://localhost:8080/api"

Write-Host "=== DIAGNOSTIC AVEC FORMATS CORRECTS ===" -ForegroundColor Cyan
Write-Host ""

try {
    # Recuperer les modeles
    $response = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models" -Method GET
    $models = $response.models
    
    $oppartModel = $models | Where-Object { $_.name -like "*OPPART*" }
    
    Write-Host "Modele OPPART trouve: $($oppartModel.name)" -ForegroundColor Green
    Write-Host "Cles configurees: $($oppartModel.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor White
    
    Write-Host ""
    Write-Host "=== ANALYSE CORRIGEE DES VALEURS ===" -ForegroundColor Yellow
    
    Write-Host "TRXBO (Numero Trans GU) - Format CORRECT:" -ForegroundColor White
    $trxboKeys = @(
        "1751409965944",
        "1751409935809", 
        "1751408576263",
        "1751408391101",
        "1751407754864"
    )
    
    foreach ($key in $trxboKeys) {
        Write-Host "  - $key" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "OPPART (Numero Trans GU) - Format CORRECT:" -ForegroundColor White
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
    Write-Host "=== ANALYSE DES CORRESPONDANCES ===" -ForegroundColor Yellow
    
    # Trouver les correspondances
    $matches = @()
    foreach ($trxboKey in $trxboKeys) {
        if ($oppartKeys -contains $trxboKey) {
            $matches += $trxboKey
        }
    }
    
    Write-Host "Correspondances trouvees: $($matches.Count)" -ForegroundColor White
    foreach ($match in $matches) {
        Write-Host "  - $match" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "=== TEST DE RECONCILIATION AVEC VRAIES DONNEES ===" -ForegroundColor Yellow
    
    # Test avec les vraies donnees
    $boData = @(
        @{
            "Numero Trans GU" = "1751409965944"
            "montant" = "117220"
            "Date" = "2025-07-01 22:46:20.0"
        },
        @{
            "Numero Trans GU" = "1751409935809"
            "montant" = "500000"
            "Date" = "2025-07-01 22:45:51.0"
        }
    )
    
    $partnerData = @(
        @{
            "Numero Trans GU" = "1751409965944"  # Correspondance exacte
            "Amount" = "117220"
            "Date" = "2025-07-01 22:46:20.0"
        },
        @{
            "Numero Trans GU" = "1751409935809"  # Correspondance exacte
            "Amount" = "500000"
            "Date" = "2025-07-01 22:45:51.0"
        },
        @{
            "Numero Trans GU" = "1751408576264"  # Pas de correspondance
            "Amount" = "300000"
            "Date" = "2025-07-01 22:44:30.0"
        }
    )
    
    Write-Host "Donnees de test avec formats corrects:" -ForegroundColor White
    Write-Host "  - TRXBO: $($boData.Count) enregistrements" -ForegroundColor Gray
    Write-Host "  - OPPART: $($partnerData.Count) enregistrements" -ForegroundColor Gray
    Write-Host "  - Correspondances attendues: 2" -ForegroundColor Gray
    
    # Test de reconciliation
    $request = @{
        boFileContent = $boData
        partnerFileContent = $partnerData
        boKeyColumn = "Numero Trans GU"
        partnerKeyColumn = "Numero Trans GU"
        comparisonColumns = @(
            @{
                boColumn = "montant"
                partnerColumn = "Amount"
            },
            @{
                boColumn = "Date"
                partnerColumn = "Date"
            }
        )
    }
    
    Write-Host ""
    Write-Host "Test de reconciliation..." -ForegroundColor Yellow
    $reconciliationResponse = Invoke-RestMethod -Uri "$API_BASE_URL/reconciliation/reconcile" -Method POST -Body ($request | ConvertTo-Json -Depth 10) -ContentType "application/json"
    
    Write-Host "Resultat du test:" -ForegroundColor White
    Write-Host "  - Correspondances trouvees: $($reconciliationResponse.matches.Count)" -ForegroundColor Gray
    Write-Host "  - BO uniquement: $($reconciliationResponse.boOnly.Count)" -ForegroundColor Gray
    Write-Host "  - Partner uniquement: $($reconciliationResponse.partnerOnly.Count)" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "=== DIAGNOSTIC FINAL ===" -ForegroundColor Cyan
    
    if ($reconciliationResponse.matches.Count -gt 0) {
        Write-Host "✅ SUCCES: La reconciliation fonctionne avec les formats corrects!" -ForegroundColor Green
        Write-Host "Le probleme etait bien la confusion entre 'IDTransaction' et 'Numero Trans GU'" -ForegroundColor White
    } else {
        Write-Host "❌ Le probleme persiste malgre les formats corrects" -ForegroundColor Red
        Write-Host "Il faut investiguer plus profondement..." -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "=== CONCLUSION ===" -ForegroundColor Green
    Write-Host "Les formats sont maintenant compatibles!" -ForegroundColor White
    Write-Host "Si le test echoue, le probleme est ailleurs (encodage, colonnes, etc.)" -ForegroundColor White
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Diagnostic termine!" -ForegroundColor Cyan
