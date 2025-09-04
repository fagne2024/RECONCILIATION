# Script pour simuler le vrai probleme et proposer une solution

$API_BASE_URL = "http://localhost:8080/api"

Write-Host "=== SIMULATION DU PROBLEME REEL ===" -ForegroundColor Cyan
Write-Host ""

try {
    # Recuperer les modeles
    $response = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models" -Method GET
    $models = $response.models
    
    $oppartModel = $models | Where-Object { $_.name -like "*OPPART*" }
    
    Write-Host "Modele OPPART trouve: $($oppartModel.name)" -ForegroundColor Green
    Write-Host "Cles configurees: $($oppartModel.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor White
    
    Write-Host ""
    Write-Host "=== SIMULATION AVEC DONNEES RELLES ===" -ForegroundColor Yellow
    
    # Simuler les donnees TRXBO (comme dans les logs)
    $boData = @(
        @{
            "Numéro Trans GU" = "MP250701.0829.C25981"
            "montant" = "1000"
            "Date" = "2024-01-15"
        },
        @{
            "Numéro Trans GU" = "13099112233_CM"
            "montant" = "2500"
            "Date" = "2024-01-16"
        }
    )
    
    # Simuler les donnees OPPART avec DIFFERENTES colonnes (probleme reel)
    $partnerData = @(
        @{
            "ID Transaction" = "MP250701.0829.C25981"  # Colonne differente!
            "Amount" = "1000"
            "Date" = "2024-01-15"
        },
        @{
            "ID Transaction" = "13099112233_CM"  # Colonne differente!
            "Amount" = "2500"
            "Date" = "2024-01-16"
        },
        @{
            "ID Transaction" = "MP250701.0829.C99999"
            "Amount" = "3000"
            "Date" = "2024-01-17"
        }
    )
    
    Write-Host "Donnees simulees:" -ForegroundColor White
    Write-Host "  - TRXBO colonnes: $($boData[0].Keys -join ', ')" -ForegroundColor Gray
    Write-Host "  - OPPART colonnes: $($partnerData[0].Keys -join ', ')" -ForegroundColor Gray
    Write-Host "  - TRXBO cles: $($boData.'Numéro Trans GU' -join ', ')" -ForegroundColor Gray
    Write-Host "  - OPPART cles: $($partnerData.'ID Transaction' -join ', ')" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "=== TEST 1: RECONCILIATION AVEC COLONNES CONFIGUREES ===" -ForegroundColor Yellow
    
    # Test avec les colonnes configurees (qui ne correspondent pas)
    $request1 = @{
        boFileContent = $boData
        partnerFileContent = $partnerData
        boKeyColumn = "Numéro Trans GU"
        partnerKeyColumn = "Numéro Trans GU"  # Cette colonne n'existe pas dans OPPART!
        comparisonColumns = @(
            @{
                boColumn = "montant"
                partnerColumn = "Amount"
            }
        )
    }
    
    Write-Host "Test avec colonnes configurees..." -ForegroundColor Yellow
    $response1 = Invoke-RestMethod -Uri "$API_BASE_URL/reconciliation/reconcile" -Method POST -Body ($request1 | ConvertTo-Json -Depth 10) -ContentType "application/json"
    
    Write-Host "Resultat Test 1:" -ForegroundColor White
    Write-Host "  - Correspondances: $($response1.matches.Count)" -ForegroundColor Gray
    Write-Host "  - BO uniquement: $($response1.boOnly.Count)" -ForegroundColor Gray
    Write-Host "  - Partner uniquement: $($response1.partnerOnly.Count)" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "=== TEST 2: RECONCILIATION AVEC BONNES COLONNES ===" -ForegroundColor Yellow
    
    # Test avec les bonnes colonnes
    $request2 = @{
        boFileContent = $boData
        partnerFileContent = $partnerData
        boKeyColumn = "Numéro Trans GU"
        partnerKeyColumn = "ID Transaction"  # La vraie colonne OPPART
        comparisonColumns = @(
            @{
                boColumn = "montant"
                partnerColumn = "Amount"
            }
        )
    }
    
    Write-Host "Test avec bonnes colonnes..." -ForegroundColor Yellow
    $response2 = Invoke-RestMethod -Uri "$API_BASE_URL/reconciliation/reconcile" -Method POST -Body ($request2 | ConvertTo-Json -Depth 10) -ContentType "application/json"
    
    Write-Host "Resultat Test 2:" -ForegroundColor White
    Write-Host "  - Correspondances: $($response2.matches.Count)" -ForegroundColor Gray
    Write-Host "  - BO uniquement: $($response2.boOnly.Count)" -ForegroundColor Gray
    Write-Host "  - Partner uniquement: $($response2.partnerOnly.Count)" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "=== DIAGNOSTIC FINAL ===" -ForegroundColor Cyan
    
    if ($response1.matches.Count -eq 0 -and $response2.matches.Count -gt 0) {
        Write-Host "✅ PROBLEME CONFIRME ET SOLUTION TROUVEE!" -ForegroundColor Green
        Write-Host "Le probleme est que les colonnes configurees ne correspondent pas aux vraies colonnes." -ForegroundColor White
        Write-Host "Solution: Mettre a jour le modele OPPART pour utiliser 'ID Transaction' au lieu de 'Numero Trans GU'" -ForegroundColor White
    } else {
        Write-Host "❌ Le probleme est plus complexe" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "=== RECOMMANDATION ===" -ForegroundColor Green
    Write-Host "Mettre a jour le modele OPPART avec les vraies colonnes:" -ForegroundColor White
    Write-Host "  - Partner Keys: ID Transaction" -ForegroundColor Cyan
    Write-Host "  - BO Keys: Numero Trans GU" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Simulation terminee!" -ForegroundColor Cyan
