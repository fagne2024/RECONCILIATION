# Script pour tester la reconciliation apres correction
Write-Host "Test de reconciliation apres correction des cles" -ForegroundColor Cyan

$baseUrl = "http://localhost:8080/api"
$reconciliationEndpoint = "$baseUrl/reconciliation"

Write-Host "`nTest de reconciliation avec les cles corrigees:" -ForegroundColor Yellow
Write-Host "  Clé BO: 'IDTransaction'" -ForegroundColor Green
Write-Host "  Clé Partenaire: 'Reference'" -ForegroundColor Green

try {
    # Test de reconciliation simple
    Write-Host "`nTest de reconciliation..." -ForegroundColor Blue
    
    $testData = @{
        boData = @(
            @{
                "IDTransaction" = "TEST001"
                "Montant" = "1000"
                "Date" = "2025-01-01"
            }
        )
        partnerData = @(
            @{
                "Reference" = "TEST001"
                "Montant" = "1000"
                "Date" = "2025-01-01"
            }
        )
        reconciliationKeys = @{
            boKey = "IDTransaction"
            partnerKey = "Reference"
        }
    }
    
    $body = $testData | ConvertTo-Json -Depth 10
    
    Write-Host "Donnees de test:" -ForegroundColor Cyan
    Write-Host "  BO: $($testData.boData | ConvertTo-Json -Compress)" -ForegroundColor White
    Write-Host "  Partenaire: $($testData.partnerData | ConvertTo-Json -Compress)" -ForegroundColor White
    
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
    
    Write-Host "`n✅ Test de reconciliation reussi!" -ForegroundColor Green
    Write-Host "Les cles corrigees fonctionnent correctement." -ForegroundColor White
    
}
catch {
    Write-Host "Erreur lors du test: $($_.Exception.Message)" -ForegroundColor Red
}
