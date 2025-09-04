# Test de correction de la récursion infinie
Write-Host "Test de correction de la récursion infinie" -ForegroundColor Cyan

# Étape 1: Vérifier que l'API fonctionne
Write-Host "`nÉtape 1: Vérification de l'API" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    Write-Host "API accessible - Nombre de modèles: $($response.models.Count)" -ForegroundColor Green
    
    foreach ($model in $response.models) {
        Write-Host "  - $($model.name) (ID: $($model.modelId))" -ForegroundColor Gray
    }
} catch {
    Write-Host "Erreur API: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Étape 2: Tester la suppression d'un modèle
Write-Host "`nÉtape 2: Test de suppression" -ForegroundColor Yellow
if ($response.models.Count -gt 0) {
    $modelToDelete = $response.models[0]
    Write-Host "Suppression du modèle: $($modelToDelete.name) ($($modelToDelete.modelId))" -ForegroundColor Gray
    
    try {
        $deleteResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$($modelToDelete.modelId)" -Method DELETE
        if ($deleteResponse.success) {
            Write-Host "Modèle supprimé avec succès" -ForegroundColor Green
        } else {
            Write-Host "Échec de la suppression" -ForegroundColor Red
        }
    } catch {
        Write-Host "Erreur lors de la suppression: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "Aucun modèle à supprimer" -ForegroundColor Yellow
}

# Étape 3: Vérifier que la suppression a bien fonctionné
Write-Host "`nÉtape 3: Vérification post-suppression" -ForegroundColor Yellow
try {
    $responseAfter = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    Write-Host "API toujours accessible - Nombre de modèles après suppression: $($responseAfter.models.Count)" -ForegroundColor Green
    
    if ($response.models.Count -gt 0) {
        $deletedModelId = $response.models[0].modelId
        $modelStillExists = $responseAfter.models | Where-Object { $_.modelId -eq $deletedModelId }
        
        if ($modelStillExists) {
            Write-Host "Le modèle supprimé existe encore" -ForegroundColor Red
        } else {
            Write-Host "Le modèle a bien été supprimé" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "Erreur lors de la vérification: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nTest terminé" -ForegroundColor Cyan
