# Vérification des frais récents
Write-Host "=== Derniers frais générés ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080"

try {
    $operations = Invoke-RestMethod -Uri "$baseUrl/api/operations" -Method GET
    
    $fraisRecents = $operations | Where-Object { 
        $_.typeOperation -eq "FRAIS_TRANSACTION" -and 
        $_.nomBordereau -like "*FEES_ECART_SOLDE*" 
    } | Sort-Object dateOperation -Descending | Select-Object -First 5
    
    Write-Host "✅ Frais récents trouvés: $($fraisRecents.Count)" -ForegroundColor Green
    
    foreach ($f in $fraisRecents) {
        Write-Host "`nFrais:" -ForegroundColor Cyan
        Write-Host "  - ID: $($f.id)" -ForegroundColor Cyan
        Write-Host "  - Service: $($f.service)" -ForegroundColor Cyan
        Write-Host "  - Montant: $($f.montant) FCFA" -ForegroundColor Cyan
        Write-Host "  - Bordereau: $($f.nomBordereau)" -ForegroundColor Cyan
        Write-Host "  - Date: $($f.dateOperation)" -ForegroundColor Cyan
    }
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 Vérification terminée !" -ForegroundColor Green 