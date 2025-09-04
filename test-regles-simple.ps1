Write-Host "🔍 TEST SIMPLE - RÈGLES DE TRAITEMENT" -ForegroundColor Cyan

# Test 1: Récupérer tous les modèles
Write-Host "`n📋 1. Récupération des modèles..." -ForegroundColor Yellow
try {
    $models = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    Write-Host "✅ $($models.Count) modèles trouvés" -ForegroundColor Green
    
    # Afficher les modèles partenaires
    $partnerModels = $models | Where-Object { $_.fileType -eq "partner" }
    Write-Host "📊 Modèles partenaires: $($partnerModels.Count)" -ForegroundColor White
    
    foreach ($model in $partnerModels) {
        Write-Host "   - $($model.name) (ID: $($model.modelId))" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Récupérer les règles d'un modèle spécifique
if ($partnerModels.Count -gt 0) {
    $firstModel = $partnerModels[0]
    Write-Host "`n📋 2. Règles du modèle: $($firstModel.name)" -ForegroundColor Yellow
    
    try {
        $rules = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$($firstModel.modelId)/column-rules" -Method GET
        Write-Host "✅ $($rules.Count) règles trouvées" -ForegroundColor Green
        
        foreach ($rule in $rules) {
            Write-Host "   📋 Règle ID: $($rule.id)" -ForegroundColor White
            Write-Host "      Colonne: $($rule.sourceColumn)" -ForegroundColor Gray
            Write-Host "      Actions:" -ForegroundColor Gray
            Write-Host "        - Supprimer caractères spéciaux: $($rule.removeSpecialChars)" -ForegroundColor DarkGray
            Write-Host "        - Nettoyer espaces: $($rule.trimSpaces)" -ForegroundColor DarkGray
            Write-Host "        - Majuscules: $($rule.toUpperCase)" -ForegroundColor DarkGray
            Write-Host "        - Minuscules: $($rule.toLowerCase)" -ForegroundColor DarkGray
            Write-Host "        - Supprimer accents: $($rule.removeAccents)" -ForegroundColor DarkGray
        }
    } catch {
        Write-Host "❌ Erreur lors de la récupération des règles: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n✅ Test terminé!" -ForegroundColor Green
