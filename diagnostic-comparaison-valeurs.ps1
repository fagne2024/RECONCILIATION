# Script pour diagnostiquer le probleme de comparaison des valeurs

$API_BASE_URL = "http://localhost:8080/api"

Write-Host "=== DIAGNOSTIC COMPARAISON DES VALEURS ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "🎯 PROBLEME IDENTIFIE:" -ForegroundColor Yellow
Write-Host "  - Les valeurs sont identiques dans les fichiers" -ForegroundColor Red
Write-Host "  - MAIS 0 correspondance trouvee" -ForegroundColor Red
Write-Host "  - CAUSE: Probleme dans la logique de comparaison apres normalisation" -ForegroundColor Red
Write-Host ""

Write-Host "=== TEST AVEC VALEURS IDENTIQUES ===" -ForegroundColor Yellow
Write-Host ""

try {
    # Test avec des valeurs identiques mais formats differents
    $boData = @(
        @{
            "Num ro Trans GU" = "1751409965944"
            "montant" = "117220"
        },
        @{
            "Num ro Trans GU" = "1751408576264"
            "montant" = "50000"
        }
    )
    
    $partnerData = @(
        @{
            "Num_ro_Trans_GU" = "1751409965944"
            "Montant" = "117220"
        },
        @{
            "Num_ro_Trans_GU" = "1751408576264"
            "Montant" = "50000"
        }
    )
    
    Write-Host "Test avec valeurs identiques:" -ForegroundColor White
    Write-Host "  - BO: 'Num ro Trans GU' (avec espaces)" -ForegroundColor Gray
    Write-Host "  - Partner: 'Num_ro_Trans_GU' (avec underscores)" -ForegroundColor Gray
    Write-Host "  - Valeurs: '1751409965944', '1751408576264'" -ForegroundColor Green
    
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
        Write-Host "✅ SUCCES: La comparaison fonctionne avec valeurs identiques!" -ForegroundColor Green
    } else {
        Write-Host "❌ ECHEC: Probleme dans la logique de comparaison!" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "=== TEST AVEC FORMAT IDENTIQUE ===" -ForegroundColor Yellow
    
    # Test avec le meme format pour les deux
    $boDataSame = @(
        @{
            "Num_ro_Trans_GU" = "1751409965944"
            "montant" = "117220"
        },
        @{
            "Num_ro_Trans_GU" = "1751408576264"
            "montant" = "50000"
        }
    )
    
    $partnerDataSame = @(
        @{
            "Num_ro_Trans_GU" = "1751409965944"
            "Montant" = "117220"
        },
        @{
            "Num_ro_Trans_GU" = "1751408576264"
            "Montant" = "50000"
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
    Write-Host "=== DIAGNOSTIC ===" -ForegroundColor Cyan
    
    if ($response.matches.Count -eq 0 -and $responseSame.matches.Count -gt 0) {
        Write-Host "⚠️ PROBLEME: La normalisation ne fonctionne pas correctement" -ForegroundColor Yellow
        Write-Host "Les formats differents ne sont pas bien normalises" -ForegroundColor White
        Write-Host "CAUSE: Methode findKeyWithNormalization ne trouve pas les valeurs" -ForegroundColor Red
    } elseif ($response.matches.Count -eq 0 -and $responseSame.matches.Count -eq 0) {
        Write-Host "❌ PROBLEME: La comparaison des valeurs ne fonctionne pas du tout" -ForegroundColor Red
        Write-Host "Meme avec le meme format, pas de correspondance" -ForegroundColor White
    } else {
        Write-Host "✅ SUCCES: La comparaison fonctionne correctement!" -ForegroundColor Green
        Write-Host "Le probleme est ailleurs" -ForegroundColor White
    }
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Test termine!" -ForegroundColor Cyan
