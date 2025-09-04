# Script pour diagnostiquer le probleme backend avec les bonnes cles

$API_BASE_URL = "http://localhost:8080/api"

Write-Host "=== DIAGNOSTIC BACKEND AVEC BONNES CLES ===" -ForegroundColor Cyan
Write-Host ""

try {
    # Test avec les vraies donnees et les bonnes cles
    $boData = @(
        @{
            "Numéro Trans GU" = "1751409965944"
            "montant" = "117220"
            "Date" = "2025-07-01 22:46:20.0"
        },
        @{
            "Numéro Trans GU" = "1751409935809"
            "montant" = "500000"
            "Date" = "2025-07-01 22:45:51.0"
        }
    )
    
    $partnerData = @(
        @{
            "Numéro Trans GU" = "1751409965944"
            "Montant" = "117220"
            "Date opération" = "2025-07-01 22:46:20.0"
        },
        @{
            "Numéro Trans GU" = "1751409935809"
            "Montant" = "500000"
            "Date opération" = "2025-07-01 22:45:51.0"
        },
        @{
            "Numéro Trans GU" = "1751408576264"
            "Montant" = "300000"
            "Date opération" = "2025-07-01 22:44:30.0"
        }
    )
    
    Write-Host "Test avec les bonnes cles:" -ForegroundColor White
    Write-Host "  - BO: $($boData.Count) enregistrements" -ForegroundColor Gray
    Write-Host "  - Partner: $($partnerData.Count) enregistrements" -ForegroundColor Gray
    Write-Host "  - Cle utilisee: 'Numero Trans GU'" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Valeurs des cles:" -ForegroundColor Yellow
    Write-Host "  BO: $($boData[0].'Numéro Trans GU'), $($boData[1].'Numéro Trans GU')" -ForegroundColor Gray
    Write-Host "  Partner: $($partnerData[0].'Numéro Trans GU'), $($partnerData[1].'Numéro Trans GU'), $($partnerData[2].'Numéro Trans GU')" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "Envoi de la demande..." -ForegroundColor Yellow
    
    $request = @{
        boFileContent = $boData
        partnerFileContent = $partnerData
        boKeyColumn = "Numéro Trans GU"
        partnerKeyColumn = "Numéro Trans GU"
        comparisonColumns = @(
            @{
                boColumn = "montant"
                partnerColumn = "Montant"
            }
        )
    }
    
    $response = Invoke-RestMethod -Uri "$API_BASE_URL/reconciliation/reconcile" -Method POST -Body ($request | ConvertTo-Json -Depth 10) -ContentType "application/json"
    
    Write-Host "Resultat:" -ForegroundColor White
    Write-Host "  - Correspondances: $($response.matches.Count)" -ForegroundColor Gray
    Write-Host "  - BO uniquement: $($response.boOnly.Count)" -ForegroundColor Gray
    Write-Host "  - Partner uniquement: $($response.partnerOnly.Count)" -ForegroundColor Gray
    
    if ($response.matches.Count -gt 0) {
        Write-Host "✅ SUCCES: Correspondances trouvees!" -ForegroundColor Green
    } else {
        Write-Host "❌ ECHEC: Aucune correspondance" -ForegroundColor Red
        
        Write-Host ""
        Write-Host "=== ANALYSE DETAILLEE ===" -ForegroundColor Yellow
        
        Write-Host "BO uniquement ($($response.boOnly.Count) enregistrements):" -ForegroundColor White
        if ($response.boOnly.Count -gt 0) {
            foreach ($bo in $response.boOnly) {
                Write-Host "  - Cle: $($bo.'Numéro Trans GU')" -ForegroundColor Gray
            }
        }
        
        Write-Host ""
        Write-Host "Partner uniquement ($($response.partnerOnly.Count) enregistrements):" -ForegroundColor White
        if ($response.partnerOnly.Count -gt 0) {
            foreach ($partner in $response.partnerOnly) {
                Write-Host "  - Cle: $($partner.'Numéro Trans GU')" -ForegroundColor Gray
            }
        }
        
        Write-Host ""
        Write-Host "=== DIAGNOSTIC ===" -ForegroundColor Red
        
        Write-Host "PROBLEME IDENTIFIE:" -ForegroundColor Yellow
        Write-Host "  - Les cles sont correctes (Numero Trans GU)" -ForegroundColor White
        Write-Host "  - Les valeurs sont identiques (1751409965944, 1751409935809)" -ForegroundColor White
        Write-Host "  - MAIS le backend ne trouve pas de correspondances" -ForegroundColor White
        Write-Host ""
        Write-Host "  CAUSE PROBABLE:" -ForegroundColor Red
        Write-Host "  - Probleme dans la logique de reconciliation du backend" -ForegroundColor White
        Write-Host "  - Les donnees BO sont perdues ou mal traitees" -ForegroundColor White
        Write-Host "  - Probleme de format ou de type de donnees" -ForegroundColor White
    }
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "  Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Diagnostic termine!" -ForegroundColor Cyan
