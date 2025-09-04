# Test de mise à jour simple pour identifier le problème 400
$modelId = "model_c5551c59-a0bc-4eb0-b610-3412efaea66f"

# Test 1: Mise à jour avec données minimales
$simpleUpdate = @{
    name = "Modèle basé sur OPPART.xls"
    filePattern = "*OPPART*.xls"
    fileType = "partner"
    autoApply = $true
    templateFile = "OPPART.xls"
    reconciliationKeys = @{
        partnerKeys = @("date")
        boKeys = @("date")
        boModels = @("model_ca0b2985-e97d-4f53-9079-f49a095b821e")
    }
    columnProcessingRules = @()
}

Write-Host "Test 1: Mise à jour simple"
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$modelId" -Method PUT -Body ($simpleUpdate | ConvertTo-Json -Depth 10) -ContentType "application/json"
    Write-Host "Succès: $($response | ConvertTo-Json)"
} catch {
    Write-Host "Erreur: $($_.Exception.Message)"
    Write-Host "Status: $($_.Exception.Response.StatusCode)"
}

# Test 2: Mise à jour avec seulement le nom
$nameOnlyUpdate = @{
    name = "Modèle basé sur OPPART.xls - MODIFIÉ"
}

Write-Host "`nTest 2: Mise à jour nom seulement"
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$modelId" -Method PUT -Body ($nameOnlyUpdate | ConvertTo-Json -Depth 10) -ContentType "application/json"
    Write-Host "Succès: $($response | ConvertTo-Json)"
} catch {
    Write-Host "Erreur: $($_.Exception.Message)"
    Write-Host "Status: $($_.Exception.Response.StatusCode)"
}

# Test 3: Récupération du modèle actuel
Write-Host "`nTest 3: Récupération du modèle actuel"
try {
    $currentModel = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$modelId" -Method GET
    Write-Host "Modèle actuel: $($currentModel | ConvertTo-Json -Depth 10)"
} catch {
    Write-Host "Erreur: $($_.Exception.Message)"
}
