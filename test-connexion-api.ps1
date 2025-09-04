# Script simple pour tester la connexion à l'API
Write-Host "🔍 Test de connexion à l'API" -ForegroundColor Cyan

# Configuration de l'API
$baseUrl = "http://localhost:3000/api"
$modelsEndpoint = "$baseUrl/models"

Write-Host "`n🌐 URL de l'API: $modelsEndpoint" -ForegroundColor Blue

try {
    Write-Host "`n🔄 Test de connexion..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri $modelsEndpoint -Method GET
    Write-Host "✅ Connexion réussie !" -ForegroundColor Green
    Write-Host "📊 Nombre de modèles: $($response.Length)" -ForegroundColor White
    
    if ($response.Length -gt 0) {
        Write-Host "`n📋 Modèles trouvés:" -ForegroundColor Cyan
        foreach ($model in $response) {
            Write-Host "   • $($model.name) (ID: $($model.id))" -ForegroundColor White
            
            # Vérifier les clés partenaires
            if ($model.partnerKeys) {
                Write-Host "     🔑 Clés partenaires: $($model.partnerKeys -join ', ')" -ForegroundColor Blue
                
                # Vérifier s'il y a des clés corrompues
                if ($model.partnerKeys -contains "R f rence") {
                    Write-Host "     ❌ CLÉ CORROMPUE DÉTECTÉE: 'R f rence'" -ForegroundColor Red
                }
            }
            
            # Vérifier les clés BO
            if ($model.boModelKeys) {
                Write-Host "     🔑 Clés BO: $($model.boModelKeys | ConvertTo-Json -Compress)" -ForegroundColor Blue
            }
        }
    }
}
catch {
    Write-Host "❌ Erreur de connexion: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Vérifiez que le backend est démarré sur le port 3000" -ForegroundColor Yellow
}
