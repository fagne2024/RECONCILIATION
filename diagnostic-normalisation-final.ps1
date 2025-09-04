# Script pour diagnostiquer le probleme de normalisation finale

$API_BASE_URL = "http://localhost:8080/api"

Write-Host "=== DIAGNOSTIC NORMALISATION FINALE ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "🎯 PROBLEME IDENTIFIE:" -ForegroundColor Yellow
Write-Host "  - Frontend envoie 2 formats differents pour la meme colonne" -ForegroundColor Red
Write-Host "  - BO: 'Num ro Trans GU' (avec espaces)" -ForegroundColor Gray
Write-Host "  - Partner: 'Num_ro_Trans_GU' (avec underscores)" -ForegroundColor Gray
Write-Host "  - Normalisation: Les deux deviennent 'Num_ro_Trans_GU'" -ForegroundColor Green
Write-Host "  - MAIS: Les valeurs ne correspondent pas apres normalisation" -ForegroundColor Red
Write-Host ""

Write-Host "=== TEST DE NORMALISATION ===" -ForegroundColor Yellow
Write-Host ""

try {
    # Test avec les vrais formats envoyes par le frontend
    $boData = @(
        @{
            "Num ro Trans GU" = "1751409965944"
            "montant" = "117220"
        }
    )
    
    $partnerData = @(
        @{
            "Num_ro_Trans_GU" = "1751409965944"
            "Montant" = "117220"
        }
    )
    
    Write-Host "Test avec formats reels:" -ForegroundColor White
    Write-Host "  - BO: 'Num ro Trans GU' (avec espaces)" -ForegroundColor Gray
    Write-Host "  - Partner: 'Num_ro_Trans_GU' (avec underscores)" -ForegroundColor Gray
    Write-Host "  - Valeur: '1751409965944'" -ForegroundColor Green
    
    $request = @{
        boFileContent = $boData
        partnerFileContent = $partnerData
        boKeyColumn = "Num ro Trans GU"
        partnerKeyColumn = "Num_ro_Trans_GU"
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
        Write-Host "✅ SUCCES: La normalisation fonctionne avec les formats reels!" -ForegroundColor Green
    } else {
        Write-Host "❌ ECHEC: Probleme dans la normalisation ou la comparaison" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "=== DIAGNOSTIC APPROFONDI ===" -ForegroundColor Yellow
    
    # Test avec le meme format pour les deux
    $boDataSame = @(
        @{
            "Num_ro_Trans_GU" = "1751409965944"
            "montant" = "117220"
        }
    )
    
    $partnerDataSame = @(
        @{
            "Num_ro_Trans_GU" = "1751409965944"
            "Montant" = "117220"
        }
    )
    
    Write-Host "Test avec format identique:" -ForegroundColor White
    Write-Host "  - BO et Partner: 'Num_ro_Trans_GU'" -ForegroundColor Gray
    
    $requestSame = @{
        boFileContent = $boDataSame
        partnerFileContent = $partnerDataSame
        boKeyColumn = "Num_ro_Trans_GU"
        partnerKeyColumn = "Num_ro_Trans_GU"
        comparisonColumns = @(
            @{
                boColumn = "montant"
                partnerColumn = "Montant"
            }
        )
    }
    
    $responseSame = Invoke-RestMethod -Uri "$API_BASE_URL/reconciliation/reconcile" -Method POST -Body ($requestSame | ConvertTo-Json -Depth 10) -ContentType "application/json"
    
    Write-Host "Resultat avec format identique:" -ForegroundColor White
    Write-Host "  - Correspondances: $($responseSame.matches.Count)" -ForegroundColor Gray
    Write-Host "  - BO uniquement: $($responseSame.boOnly.Count)" -ForegroundColor Gray
    Write-Host "  - Partner uniquement: $($responseSame.partnerOnly.Count)" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "=== CONCLUSION ===" -ForegroundColor Cyan
    
    if ($response.matches.Count -gt 0 -and $responseSame.matches.Count -gt 0) {
        Write-Host "✅ SUCCES: La normalisation fonctionne parfaitement!" -ForegroundColor Green
        Write-Host "Le probleme n'est pas dans la normalisation" -ForegroundColor White
    } elseif ($response.matches.Count -eq 0 -and $responseSame.matches.Count -gt 0) {
        Write-Host "⚠️ PROBLEME: La normalisation ne fonctionne pas correctement" -ForegroundColor Yellow
        Write-Host "Les formats differents ne sont pas bien normalises" -ForegroundColor White
    } else {
        Write-Host "❌ PROBLEME: La comparaison des valeurs ne fonctionne pas" -ForegroundColor Red
        Write-Host "Meme avec le meme format, pas de correspondance" -ForegroundColor White
    }
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Test termine!" -ForegroundColor Cyan
