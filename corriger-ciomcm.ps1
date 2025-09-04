# Script pour corriger le pattern du modèle Ciomcm
Write-Host "Correction du pattern du modele Ciomcm..." -ForegroundColor Cyan

try {
    # Récupérer les modèles
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    $modeles = $response.models
    
    # Trouver le modèle Ciomcm
    $ciomcm = $modeles | Where-Object { $_.name -eq "Ciomcm" }
    if ($ciomcm) {
        Write-Host "Correction du pattern Ciomcm..." -ForegroundColor Yellow
        Write-Host "   - Ancien pattern: $($ciomcm.filePattern)" -ForegroundColor Gray
        Write-Host "   - Nouveau pattern: *CIOMCM*.(csv|xls|xlsx)" -ForegroundColor Gray
        
        # Mettre à jour le pattern
        $ciomcm.filePattern = "*CIOMCM*.(csv|xls|xlsx)"
        
        $updateResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$($ciomcm.id)" -Method PUT -Body ($ciomcm | ConvertTo-Json -Depth 10) -ContentType "application/json"
        Write-Host "Pattern Ciomcm corrige: $($ciomcm.filePattern)" -ForegroundColor Green
    } else {
        Write-Host "Modele Ciomcm non trouve!" -ForegroundColor Red
    }
    
    Write-Host "Correction terminee!" -ForegroundColor Green
    
} catch {
    Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
}
