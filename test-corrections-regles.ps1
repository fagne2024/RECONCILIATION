# Script de test simplifié pour les corrections des règles de traitement
Write-Host "🧪 TEST DES CORRECTIONS - RÈGLES DE TRAITEMENT" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Vérifier que le backend est démarré
Write-Host "`n📋 1. Vérification du backend..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET -TimeoutSec 10
    Write-Host "✅ Backend accessible - $($response.Count) modèles trouvés" -ForegroundColor Green
    
    foreach ($model in $response) {
        $rulesCount = if ($model.columnProcessingRules) { $model.columnProcessingRules.Count } else { 0 }
        Write-Host "   - $($model.name) ($($model.fileType)): $rulesCount règles" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Backend non accessible: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Assurez-vous que le backend est démarré sur le port 8080" -ForegroundColor Yellow
    exit 1
}

# 2. Vérifier que le frontend est démarré
Write-Host "`n📋 2. Vérification du frontend..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "http://localhost:4200" -Method GET -TimeoutSec 10
    Write-Host "✅ Frontend accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend non accessible: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Assurez-vous que le frontend est démarré sur le port 4200" -ForegroundColor Yellow
}

# 3. Test de création de règles via l'API
Write-Host "`n📋 3. Test de création de règles..." -ForegroundColor Yellow

try {
    # Récupérer le premier modèle partenaire
    $models = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    $partnerModels = $models | Where-Object { $_.fileType -eq "partner" }
    
    if ($partnerModels.Count -gt 0) {
        $firstModel = $partnerModels[0]
        Write-Host "✅ Test avec le modèle: $($firstModel.name)" -ForegroundColor Green
        
        # Créer des règles de test
        $testRules = @(
            @{
                sourceColumn = "Numéro Trans GU"
                targetColumn = "Numero_Trans_GU_Clean"
                formatType = "string"
                removeSpecialChars = $true
                trimSpaces = $true
                ruleOrder = 0
            }
        )
        
        $jsonRules = $testRules | ConvertTo-Json -Depth 10
        Write-Host "📤 Envoi des règles: $jsonRules" -ForegroundColor Gray
        
        $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$($firstModel.modelId)/column-rules/batch" -Method POST -Body $jsonRules -ContentType "application/json"
        Write-Host "✅ Règles créées avec succès" -ForegroundColor Green
        
        # Vérifier que les règles ont été ajoutées
        $updatedModel = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$($firstModel.modelId)" -Method GET
        $rulesCount = if ($updatedModel.columnProcessingRules) { $updatedModel.columnProcessingRules.Count } else { 0 }
        Write-Host "✅ Modèle mis à jour: $rulesCount règles" -ForegroundColor Green
        
    } else {
        Write-Host "⚠️ Aucun modèle partenaire trouvé pour le test" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Erreur lors du test de création: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Instructions de test manuel
Write-Host "`n📋 4. Instructions de test manuel..." -ForegroundColor Yellow
Write-Host @"

ÉTAPES DE TEST MANUEL :

1. Ouvrir le navigateur sur http://localhost:4200
2. Aller dans "Modèles de traitement automatique"
3. Cliquer sur "Créer un nouveau modèle"
4. Remplir les informations :
   - Nom: "Test Règles"
   - Type: "partner"
   - Pattern: "*OPPART*.xls"
   - Fichier modèle: "OPPART.xls"
5. Aller dans "Règles de traitement des colonnes"
6. Cliquer sur "Afficher"
7. Ajouter une règle :
   - Colonne: "Numéro Trans GU"
   - Cocher "Supprimer les caractères spéciaux"
   - Cocher "Nettoyer les espaces"
8. Sauvegarder la règle
9. Sauvegarder le modèle
10. Vérifier les logs dans la console (F12)

LOGS À VÉRIFIER :
- "🔍 [DEBUG] Règle à sauvegarder:"
- "✅ [DEBUG] Nouvelle règle ajoutée. Total:"
- "🔍 [DEBUG] Règles avant sauvegarde du modèle:"
- "✅ [DEBUG] Règles sauvegardées avec succès:"

"@ -ForegroundColor White

Write-Host "`n✅ Test des corrections terminé!" -ForegroundColor Green
