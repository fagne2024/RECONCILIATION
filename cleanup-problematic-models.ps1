# Nettoyage des modèles problématiques
Write-Host "🧹 Nettoyage des modèles problématiques" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Yellow

$API_BASE_URL = "http://localhost:8080/api/auto-processing"

# Liste des modèles problématiques connus
$problematicModels = @(
    "model_7b1f2704-09ac-4834-b490-79a3032f646a",
    "model_cb355911-d069-467a-93e3-53e5141a7de8"
)

Write-Host "📋 Modèles problématiques identifiés:" -ForegroundColor Cyan
foreach ($modelId in $problematicModels) {
    Write-Host "   - $modelId" -ForegroundColor Gray
}

# Étape 1: Vérifier l'état actuel
Write-Host "`n📋 Étape 1: État actuel des modèles" -ForegroundColor Cyan

try {
    $modelsResponse = Invoke-RestMethod -Uri "$API_BASE_URL/models" -Method GET
    Write-Host "✅ Modèles trouvés: $($modelsResponse.models.Count)" -ForegroundColor Green
    
    $existingProblematicModels = @()
    foreach ($model in $modelsResponse.models) {
        if ($problematicModels -contains $model.modelId) {
            $existingProblematicModels += $model
            Write-Host "   ⚠️ Modèle problématique trouvé: $($model.name) (ID: $($model.modelId))" -ForegroundColor Yellow
        } else {
            Write-Host "   ✅ Modèle normal: $($model.name) (ID: $($model.modelId))" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "❌ Erreur lors de la récupération des modèles" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Étape 2: Nettoyer les modèles problématiques
Write-Host "`n📋 Étape 2: Nettoyage des modèles problématiques" -ForegroundColor Cyan

foreach ($model in $existingProblematicModels) {
    Write-Host "🧹 Tentative de suppression du modèle problématique: $($model.name)" -ForegroundColor Yellow
    
    try {
        # Essayer de supprimer les règles d'abord
        try {
            $rulesResponse = Invoke-RestMethod -Uri "$API_BASE_URL/models/$($model.modelId)/column-rules" -Method GET
            if ($rulesResponse.success && $rulesResponse.rules.Count -gt 0) {
                Write-Host "   🗑️ Suppression de $($rulesResponse.rules.Count) règles..." -ForegroundColor Gray
                foreach ($rule in $rulesResponse.rules) {
                    try {
                        Invoke-RestMethod -Uri "$API_BASE_URL/column-rules/$($rule.id)" -Method DELETE
                        Write-Host "     ✅ Règle $($rule.id) supprimée" -ForegroundColor Green
                    } catch {
                        Write-Host "     ⚠️ Erreur suppression règle $($rule.id): $($_.Exception.Message)" -ForegroundColor Yellow
                    }
                }
            }
        } catch {
            Write-Host "   ⚠️ Impossible de récupérer les règles: $($_.Exception.Message)" -ForegroundColor Yellow
        }
        
        # Supprimer le modèle
        $deleteResponse = Invoke-RestMethod -Uri "$API_BASE_URL/models/$($model.modelId)" -Method DELETE
        if ($deleteResponse.success) {
            Write-Host "   ✅ Modèle supprimé avec succès!" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Échec de la suppression du modèle" -ForegroundColor Red
        }
    } catch {
        Write-Host "   ❌ Erreur lors de la suppression: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "   Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        
        # Afficher plus de détails sur l'erreur
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "   Détails: $responseBody" -ForegroundColor Red
        }
    }
}

# Étape 3: Vérification finale
Write-Host "`n📋 Étape 3: Vérification finale" -ForegroundColor Cyan

try {
    $finalCheck = Invoke-RestMethod -Uri "$API_BASE_URL/models" -Method GET
    Write-Host "✅ Modèles restants: $($finalCheck.models.Count)" -ForegroundColor Green
    
    $remainingProblematicModels = @()
    foreach ($model in $finalCheck.models) {
        if ($problematicModels -contains $model.modelId) {
            $remainingProblematicModels += $model
            Write-Host "   ⚠️ Modèle problématique toujours présent: $($model.name) (ID: $($model.modelId))" -ForegroundColor Yellow
        } else {
            Write-Host "   ✅ Modèle normal: $($model.name) (ID: $($model.modelId))" -ForegroundColor Gray
        }
    }
    
    if ($remainingProblematicModels.Count -eq 0) {
        Write-Host "🎉 Tous les modèles problématiques ont été supprimés!" -ForegroundColor Green
    } else {
        Write-Host "⚠️ $($remainingProblematicModels.Count) modèle(s) problématique(s) restent" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Erreur lors de la vérification finale" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n✅ Nettoyage terminé!" -ForegroundColor Green
