# Test de suppression puis création d'un modèle
$modelId = "model_c5551c59-a0bc-4eb0-b610-3412efaea66f"

# Étape 1: Supprimer le modèle existant
Write-Host "Étape 1: Suppression du modèle existant"
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$modelId" -Method DELETE
    Write-Host "✅ Modèle supprimé avec succès"
} catch {
    Write-Host "❌ Erreur lors de la suppression: $($_.Exception.Message)"
}

# Étape 2: Créer un nouveau modèle
Write-Host "`nÉtape 2: Création d'un nouveau modèle"
$newModel = @{
    name = "Modèle OPPART - Nouveau"
    filePattern = "*OPPART*.xls"
    fileType = "partner"
    autoApply = $true
    templateFile = "OPPART.xls"
    reconciliationKeys = @{
        partnerKeys = @("date", "montant", "description")
        boKeys = @("date", "montant")
        boModels = @("model_ca0b2985-e97d-4f53-9079-f49a095b821e")
    }
    columnProcessingRules = @()
}

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method POST -Body ($newModel | ConvertTo-Json -Depth 10) -ContentType "application/json"
    Write-Host "✅ Nouveau modèle créé avec succès"
    Write-Host "ID du nouveau modèle: $($response.model.modelId)"
} catch {
    Write-Host "❌ Erreur lors de la création: $($_.Exception.Message)"
}

# Étape 3: Vérifier la liste des modèles
Write-Host "`nÉtape 3: Liste des modèles actuels"
try {
    $models = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    Write-Host "Nombre de modèles: $($models.models.Count)"
    foreach ($model in $models.models) {
        Write-Host "- $($model.name) (ID: $($model.modelId))"
    }
} catch {
    Write-Host "❌ Erreur lors de la récupération: $($_.Exception.Message)"
}
