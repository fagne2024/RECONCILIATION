# Script pour corriger les modèles
Write-Host "Correction des modeles avec les noms de colonnes corrects" -ForegroundColor Cyan

# Verifier que le script Node.js existe
if (Test-Path "fix-models-simple.js") {
    Write-Host "✅ Script Node.js trouve" -ForegroundColor Green
    
    # Verifier que le backend est accessible
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080/api/health" -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Backend accessible" -ForegroundColor Green
            
            # Executer le script Node.js
            Write-Host "Execution du script de correction..." -ForegroundColor Yellow
            node fix-models-simple.js
            
        } else {
            Write-Host "❌ Backend non accessible" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Backend non accessible, verifiez qu'il est demarre" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Script Node.js non trouve" -ForegroundColor Red
}

Write-Host "`nTest termine!" -ForegroundColor Green 