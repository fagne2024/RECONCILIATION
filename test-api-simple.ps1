# Test simple de l'API
Write-Host "Test de connexion a l'API" -ForegroundColor Cyan

$baseUrl = "http://localhost:8080/api"
$modelsEndpoint = "$baseUrl/auto-processing/models"

Write-Host "URL de l'API: $modelsEndpoint" -ForegroundColor Blue

try {
    Write-Host "Test de connexion..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri $modelsEndpoint -Method GET
    Write-Host "Connexion reussie !" -ForegroundColor Green
    Write-Host "Nombre de modeles: $($response.models.Length)" -ForegroundColor White
    
    if ($response.models.Length -gt 0) {
        Write-Host "Modeles trouves:" -ForegroundColor Cyan
        foreach ($model in $response.models) {
            Write-Host "  - $($model.name) (ID: $($model.id))" -ForegroundColor White
            
            if ($model.partnerKeys) {
                Write-Host "    Cles partenaires: $($model.partnerKeys -join ', ')" -ForegroundColor Blue
                
                if ($model.partnerKeys -contains "R f rence") {
                    Write-Host "    CLE CORROMPUE: 'R f rence'" -ForegroundColor Red
                }
            }
            
            if ($model.boModelKeys) {
                Write-Host "    Cles BO: $($model.boModelKeys | ConvertTo-Json -Compress)" -ForegroundColor Blue
            }
        }
    }
}
catch {
    Write-Host "Erreur de connexion: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Verifiez que le backend est demarre sur le port 8080" -ForegroundColor Yellow
}
