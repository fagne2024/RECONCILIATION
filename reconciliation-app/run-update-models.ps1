# Script pour mettre à jour les modèles existants
Write-Host "Mise a jour des modeles existants" -ForegroundColor Cyan

# Verifier que le script Node.js existe
if (Test-Path "update-existing-models.js") {
    Write-Host "✅ Script Node.js trouve" -ForegroundColor Green
    
    # Verifier que le backend est accessible
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080/api/health" -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Backend accessible" -ForegroundColor Green
            
            # Executer le script Node.js
            Write-Host "Execution du script de mise a jour..." -ForegroundColor Yellow
            node update-existing-models.js
            
        } else {
            Write-Host "❌ Backend non accessible" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Backend non accessible, verifiez qu'il est demarre" -ForegroundColor Red
        Write-Host "💡 Pour demarrer le backend: cd backend && mvn spring-boot:run" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Script Node.js non trouve" -ForegroundColor Red
}

Write-Host "`nTest termine!" -ForegroundColor Green 