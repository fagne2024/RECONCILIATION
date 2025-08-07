# Script pour corriger les colonnes dans les modèles
Write-Host "Correction des colonnes dans les modeles" -ForegroundColor Cyan

# Verifier que le script Node.js existe
if (Test-Path "fix-model-columns.js") {
    Write-Host "✅ Script Node.js trouve" -ForegroundColor Green
} else {
    Write-Host "❌ Script Node.js non trouve" -ForegroundColor Red
    exit
}

# Verifier que le backend est accessible
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/health" -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Backend accessible" -ForegroundColor Green
        
        # Executer le script de correction
        Write-Host "`n🔧 Correction des colonnes dans les modeles..." -ForegroundColor Yellow
        node fix-model-columns.js
        
    } else {
        Write-Host "❌ Backend non accessible" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Backend non accessible, verifiez qu'il est demarre" -ForegroundColor Red
    Write-Host "💡 Pour demarrer le backend: cd backend && mvn spring-boot:run" -ForegroundColor Yellow
}

Write-Host "`nTest termine!" -ForegroundColor Green 