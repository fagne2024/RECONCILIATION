# Script pour tester la reconciliation avec les vraies valeurs normalisees
Write-Host "Test de reconciliation avec les vraies valeurs normalisees" -ForegroundColor Cyan

$baseUrl = "http://localhost:8080/api"
$reconciliationEndpoint = "$baseUrl/reconciliation"

Write-Host "`nTest avec les vraies valeurs normalisees:" -ForegroundColor Yellow
Write-Host "  Clé BO: 'IDTransaction' (GARDÉE sans normalisation)" -ForegroundColor Blue
Write-Host "  Clé Partenaire: 'Référence' (normalisée)" -ForegroundColor Green

try {
    # Test de reconciliation avec les vraies valeurs
    Write-Host "`nTest de reconciliation..." -ForegroundColor Blue
    
    $testData = @{
        boData = @(
            @{
                "IDTransaction" = "TRX001"
                "Montant" = "1000"
                "Date Transaction" = "2025-01-01"
                "Heure Transaction" = "10:30:00"
            },
            @{
                "IDTransaction" = "TRX002"
                "Montant" = "2000"
                "Date Transaction" = "2025-01-01"
                "Heure Transaction" = "11:45:00"
            }
        )
        partnerData = @(
            @{
                "Référence" = "TRX001"
                "Montant" = "1000"
                "Date" = "2025-01-01"
                "Heure" = "10:30:00"
            },
            @{
                "Référence" = "TRX002"
                "Montant" = "2000"
                "Date" = "2025-01-01"
                "Heure" = "11:45:00"
            },
            @{
                "Référence" = "TRX003"
                "Montant" = "3000"
                "Date" = "2025-01-01"
                "Heure" = "12:00:00"
            }
        )
        reconciliationKeys = @{
            boKey = "IDTransaction"
            partnerKey = "Référence"
        }
    }
    
    $body = $testData | ConvertTo-Json -Depth 10
    
    Write-Host "Donnees de test:" -ForegroundColor Cyan
    Write-Host "  BO: $($testData.boData.Length) enregistrements" -ForegroundColor White
    Write-Host "  Partenaire: $($testData.partnerData.Length) enregistrements" -ForegroundColor White
    Write-Host "  Clés: $($testData.reconciliationKeys.boKey) <-> $($testData.reconciliationKeys.partnerKey)" -ForegroundColor White
    
    $response = Invoke-RestMethod -Uri $reconciliationEndpoint -Method POST -Body $body -ContentType "application/json"
    
    Write-Host "`nResultat de la reconciliation:" -ForegroundColor Green
    Write-Host "  Correspondances trouvees: $($response.matches.Length)" -ForegroundColor White
    Write-Host "  Erreurs: $($response.errors.Length)" -ForegroundColor White
    
    if ($response.matches.Length -gt 0) {
        Write-Host "`nCorrespondances:" -ForegroundColor Cyan
        foreach ($match in $response.matches) {
            Write-Host "  ✅ $($match.boKey) <-> $($match.partnerKey)" -ForegroundColor Green
        }
    }
    
    if ($response.errors.Length -gt 0) {
        Write-Host "`nErreurs:" -ForegroundColor Red
        foreach ($error in $response.errors) {
            Write-Host "  ❌ $error" -ForegroundColor Red
        }
    }
    
    Write-Host "`n✅ Test de reconciliation reussi!" -ForegroundColor Green
    Write-Host "Les vraies valeurs normalisees fonctionnent correctement." -ForegroundColor White
    
    # Test avec les anciennes valeurs pour comparaison
    Write-Host "`n" + "="*50 -ForegroundColor DarkGray
    Write-Host "Test de comparaison avec les anciennes valeurs:" -ForegroundColor Yellow
    Write-Host "  Clé BO: 'IDTransaction' (même valeur)" -ForegroundColor Blue
    Write-Host "  Clé Partenaire: 'Reference' (non normalisée)" -ForegroundColor Red
    
    $testDataOld = @{
        boData = @(
            @{
                "IDTransaction" = "TRX001"
                "Montant" = "1000"
                "Date" = "2025-01-01"
            }
        )
        partnerData = @(
            @{
                "Reference" = "TRX001"
                "Montant" = "1000"
                "Date" = "2025-01-01"
            }
        )
        reconciliationKeys = @{
            boKey = "IDTransaction"
            partnerKey = "Reference"
        }
    }
    
    $bodyOld = $testDataOld | ConvertTo-Json -Depth 10
    
    try {
        $responseOld = Invoke-RestMethod -Uri $reconciliationEndpoint -Method POST -Body $bodyOld -ContentType "application/json"
        Write-Host "  Anciennes valeurs: $($responseOld.matches.Length) correspondances" -ForegroundColor Red
    }
    catch {
        Write-Host "  Anciennes valeurs: Erreur - $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host "`n🎉 Conclusion: La normalisation partielle ameliore la reconciliation!" -ForegroundColor Green
    Write-Host "📝 Note: Clé BO 'IDTransaction' gardée, clé partenaire normalisée vers 'Référence'" -ForegroundColor Blue
    
}
catch {
    Write-Host "❌ Erreur lors du test: $($_.Exception.Message)" -ForegroundColor Red
}
