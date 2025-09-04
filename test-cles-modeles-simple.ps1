# Script simple pour verifier la recuperation des cles des modeles

$API_BASE_URL = "http://localhost:8080/api"

Write-Host "=== VERIFICATION DES CLES DES MODELES ===" -ForegroundColor Cyan
Write-Host ""

# Recuperer les modeles
try {
    $response = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models" -Method GET
    $models = $response.models
    
    Write-Host "Modeles trouves: $($models.Count)" -ForegroundColor Green
    Write-Host ""
    
    foreach ($model in $models) {
        Write-Host "Modele: $($model.name)" -ForegroundColor White
        Write-Host "  Type: $($model.fileType)" -ForegroundColor Gray
        Write-Host "  Pattern: $($model.filePattern)" -ForegroundColor Gray
        
        if ($model.reconciliationKeys) {
            Write-Host "  Cles de reconciliation:" -ForegroundColor Green
            if ($model.reconciliationKeys.partnerKeys) {
                Write-Host "    - Partner Keys: $($model.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Cyan
            }
            if ($model.reconciliationKeys.boKeys) {
                Write-Host "    - BO Keys: $($model.reconciliationKeys.boKeys -join ', ')" -ForegroundColor Cyan
            }
        } else {
            Write-Host "  Pas de cles configurees" -ForegroundColor Yellow
        }
        Write-Host ""
    }
    
    # Test simple de reconciliation avec les cles du modele OPPART
    Write-Host "=== TEST SIMPLE DE RECONCILIATION ===" -ForegroundColor Yellow
    
    $oppartModel = $models | Where-Object { $_.name -like "*OPPART*" }
    
    if ($oppartModel -and $oppartModel.reconciliationKeys) {
        Write-Host "Test avec le modele OPPART:" -ForegroundColor White
        Write-Host "  Partner Keys: $($oppartModel.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Cyan
        Write-Host "  BO Keys: $($oppartModel.reconciliationKeys.boKeys -join ', ')" -ForegroundColor Cyan
        
        # Creer des donnees de test simples
        $boData = @(
            @{
                "Numero Trans GU" = "GU001"
                "montant" = "1000"
                "Date" = "2024-01-15"
            },
            @{
                "Numero Trans GU" = "GU002"
                "montant" = "2500"
                "Date" = "2024-01-16"
            }
        )
        
        $partnerData = @(
            @{
                "Numero Trans GU" = "GU001"
                "Amount" = "1000"
                "Date" = "2024-01-15"
            },
            @{
                "Numero Trans GU" = "GU002"
                "Amount" = "2500"
                "Date" = "2024-01-16"
            },
            @{
                "Numero Trans GU" = "GU003"
                "Amount" = "3000"
                "Date" = "2024-01-17"
            }
        )
        
        # Utiliser les cles du modele
        $boKey = $oppartModel.reconciliationKeys.boKeys[0]
        $partnerKey = $oppartModel.reconciliationKeys.partnerKeys[0]
        
        Write-Host "  Utilisation des cles:" -ForegroundColor White
        Write-Host "    - BO Key: $boKey" -ForegroundColor Cyan
        Write-Host "    - Partner Key: $partnerKey" -ForegroundColor Cyan
        
        $request = @{
            boFileContent = $boData
            partnerFileContent = $partnerData
            boKeyColumn = $boKey
            partnerKeyColumn = $partnerKey
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
        
        Write-Host "  Envoi de la demande de reconciliation..."
        
        try {
            $response = Invoke-RestMethod -Uri "$API_BASE_URL/reconciliation/reconcile" -Method POST -Body ($request | ConvertTo-Json -Depth 10) -ContentType "application/json"
            
            Write-Host "  Reconciliation reussie!" -ForegroundColor Green
            Write-Host "    - Correspondances: $($response.matches.Count)" -ForegroundColor White
            Write-Host "    - BO uniquement: $($response.boOnly.Count)" -ForegroundColor White
            Write-Host "    - Partner uniquement: $($response.partnerOnly.Count)" -ForegroundColor White
            
            if ($response.matches.Count -gt 0) {
                Write-Host "    - Exemple de correspondance:" -ForegroundColor Cyan
                $match = $response.matches[0]
                Write-Host "      Cle: $($match.key)" -ForegroundColor White
                Write-Host "      BO montant: $($match.boData.montant)" -ForegroundColor White
                Write-Host "      Partner Amount: $($match.partnerData.Amount)" -ForegroundColor White
            }
            
        } catch {
            Write-Host "  Erreur reconciliation: $($_.Exception.Message)" -ForegroundColor Red
        }
        
    } else {
        Write-Host "Modele OPPART non trouve ou sans cles configurees" -ForegroundColor Red
    }
    
} catch {
    Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Test termine!" -ForegroundColor Cyan
