# Script pour tester le forçage de l'utilisation des clés des modèles

$API_BASE_URL = "http://localhost:8080/api"

Write-Host "=== TEST FORCAGE CLES MODELES ===" -ForegroundColor Cyan
Write-Host ""

try {
    # Recuperer les modeles
    $response = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models" -Method GET
    $models = $response.models
    
    $oppartModel = $models | Where-Object { $_.name -like "*OPPART*" }
    
    Write-Host "Modele OPPART trouve: $($oppartModel.name)" -ForegroundColor Green
    Write-Host "Cles configurees dans le modele:" -ForegroundColor White
    Write-Host "  - Partner Keys: $($oppartModel.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Gray
    Write-Host "  - BO Keys: $($oppartModel.reconciliationKeys.boKeys -join ', ')" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "=== TEST AVEC DONNEES RELLES ===" -ForegroundColor Yellow
    
    # Donnees TRXBO avec les vraies colonnes
    $boData = @(
        @{
            "ID" = "141249705"
            "IDTransaction" = "MP250701.2346.C44553"
            "Numéro Trans GU" = "1751409965944"
            "montant" = "117220"
            "Date" = "2025-07-01 22:46:20.0"
        },
        @{
            "ID" = "141249610"
            "IDTransaction" = "MP250701.2345.B55158"
            "Numéro Trans GU" = "1751409935809"
            "montant" = "500000"
            "Date" = "2025-07-01 22:45:51.0"
        }
    )
    
    # Donnees OPPART avec les vraies colonnes
    $partnerData = @(
        @{
            "ID Opération" = "2389002526"
            "ID Transaction" = "MP250701.2346.C44553"
            "Numéro Trans GU" = "1751409965944"
            "Montant" = "117220"
            "Date opération" = "2025-07-01 22:46:20.0"
        },
        @{
            "ID Opération" = "2389002524"
            "ID Transaction" = "MP250701.2345.B55158"
            "Numéro Trans GU" = "1751409935809"
            "Montant" = "500000"
            "Date opération" = "2025-07-01 22:45:51.0"
        },
        @{
            "ID Opération" = "2389002522"
            "ID Transaction" = "MP250701.2344.A12345"
            "Numéro Trans GU" = "1751408576264"
            "Montant" = "300000"
            "Date opération" = "2025-07-01 22:44:30.0"
        }
    )
    
    Write-Host "Donnees de test:" -ForegroundColor White
    Write-Host "  - TRXBO: $($boData.Count) enregistrements" -ForegroundColor Gray
    Write-Host "  - OPPART: $($partnerData.Count) enregistrements" -ForegroundColor Gray
    Write-Host "  - Colonnes TRXBO: $($boData[0].Keys -join ', ')" -ForegroundColor Gray
    Write-Host "  - Colonnes OPPART: $($partnerData[0].Keys -join ', ')" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "=== TEST RECONCILIATION AVEC FORCAGE ===" -ForegroundColor Yellow
    
    # Test avec les cles du modele (forcees)
    $request = @{
        boFileContent = $boData
        partnerFileContent = $partnerData
        boKeyColumn = "Numéro Trans GU"  # Force par le modele
        partnerKeyColumn = "Numéro Trans GU"  # Force par le modele
        comparisonColumns = @(
            @{
                boColumn = "montant"
                partnerColumn = "Montant"
            },
            @{
                boColumn = "Date"
                partnerColumn = "Date opération"
            }
        )
    }
    
    Write-Host "Envoi de la demande de reconciliation avec cles forcees..." -ForegroundColor Yellow
    $reconciliationResponse = Invoke-RestMethod -Uri "$API_BASE_URL/reconciliation/reconcile" -Method POST -Body ($request | ConvertTo-Json -Depth 10) -ContentType "application/json"
    
    Write-Host "Resultat du test:" -ForegroundColor White
    Write-Host "  - Correspondances trouvees: $($reconciliationResponse.matches.Count)" -ForegroundColor Gray
    Write-Host "  - BO uniquement: $($reconciliationResponse.boOnly.Count)" -ForegroundColor Gray
    Write-Host "  - Partner uniquement: $($reconciliationResponse.partnerOnly.Count)" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "=== ANALYSE DES VALEURS ===" -ForegroundColor Cyan
    
    Write-Host "Valeurs TRXBO (Numero Trans GU):" -ForegroundColor White
    foreach ($row in $boData) {
        Write-Host "  - $($row.'Numéro Trans GU')" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "Valeurs OPPART (Numero Trans GU):" -ForegroundColor White
    foreach ($row in $partnerData) {
        Write-Host "  - $($row.'Numéro Trans GU')" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "=== RESULTAT ===" -ForegroundColor Cyan
    
    if ($reconciliationResponse.matches.Count -gt 0) {
        Write-Host "✅ SUCCES: Reconciliation reussie avec les cles forcees!" -ForegroundColor Green
        Write-Host "Le forçage des clés du modèle fonctionne correctement." -ForegroundColor White
        
        Write-Host ""
        Write-Host "Exemples de correspondances:" -ForegroundColor Yellow
        foreach ($match in $reconciliationResponse.matches) {
            Write-Host "  - Cle: $($match.key)" -ForegroundColor White
            Write-Host "    BO montant: $($match.boData.montant)" -ForegroundColor Gray
            Write-Host "    Partner Montant: $($match.partnerData.Montant)" -ForegroundColor Gray
        }
    } else {
        Write-Host "❌ ECHEC: Aucune correspondance trouvee" -ForegroundColor Red
        Write-Host "Il faut verifier les valeurs dans les colonnes 'Numero Trans GU'" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "  Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Test termine!" -ForegroundColor Cyan
