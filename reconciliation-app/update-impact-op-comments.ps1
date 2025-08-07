# Script pour mettre a jour les commentaires des impacts OP
# Auteur: Assistant IA
# Date: $(Get-Date -Format "yyyy-MM-dd")

Write-Host "Mise a jour des commentaires des impacts OP..." -ForegroundColor Yellow
Write-Host ""

# URL de l'API backend
$apiUrl = "http://localhost:8080/api/impact-op/update-comments"

try {
    # Appel de l'API pour mettre a jour les commentaires
    Write-Host "Appel de l'API de mise a jour..." -ForegroundColor Cyan
    
    $response = Invoke-RestMethod -Uri $apiUrl -Method POST -ContentType "application/json"
    
    if ($response.success) {
        Write-Host "SUCCES: " $response.message -ForegroundColor Green
        Write-Host ""
        Write-Host "Statistiques de la mise a jour :" -ForegroundColor Cyan
        Write-Host "   - Total d'impacts OP : $($response.totalImpacts)" -ForegroundColor White
        Write-Host "   - Commentaires mis a jour : $($response.updatedCount)" -ForegroundColor White
        Write-Host "   - Impacts TSOP : $($response.tsopCount)" -ForegroundColor White
        Write-Host "   - Impacts J+1 : $($response.impactJ1Count)" -ForegroundColor White
    } else {
        Write-Host "ERREUR lors de la mise a jour : $($response.message)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "ERREUR lors de l'appel de l'API :" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Verifiez que :" -ForegroundColor Yellow
    Write-Host "   - Le backend est demarre sur le port 8080" -ForegroundColor White
    Write-Host "   - L'URL de l'API est correcte" -ForegroundColor White
    Write-Host "   - Vous avez les permissions necessaires" -ForegroundColor White
}

Write-Host ""
Write-Host "Script termine." -ForegroundColor Green 