# Script simple pour corriger les patterns
Write-Host "Correction des patterns..." -ForegroundColor Cyan

try {
    # Récupérer les modèles
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    $modeles = $response.models
    
    # Trouver et corriger Oppart
    $oppart = $modeles | Where-Object { $_.name -eq "Oppart" }
    if ($oppart) {
        Write-Host "Correction du pattern Oppart..." -ForegroundColor Yellow
        $oppart.filePattern = "*OPPART*.(csv|xls|xlsx)"
        $updateResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$($oppart.id)" -Method PUT -Body ($oppart | ConvertTo-Json -Depth 10) -ContentType "application/json"
        Write-Host "Pattern Oppart corrige: $($oppart.filePattern)" -ForegroundColor Green
    }
    
    # Trouver et corriger Ussdpart
    $ussdpart = $modeles | Where-Object { $_.name -eq "Ussdpart" }
    if ($ussdpart) {
        Write-Host "Correction du pattern Ussdpart..." -ForegroundColor Yellow
        $ussdpart.filePattern = "*USSDPART*.(csv|xls|xlsx)"
        $updateResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$($ussdpart.id)" -Method PUT -Body ($ussdpart | ConvertTo-Json -Depth 10) -ContentType "application/json"
        Write-Host "Pattern Ussdpart corrige: $($ussdpart.filePattern)" -ForegroundColor Green
    }
    
    Write-Host "Correction terminee!" -ForegroundColor Green
    
} catch {
    Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
}
