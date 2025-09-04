# Script de vérification des règles de traitement dans la base de données
Write-Host "🔍 VÉRIFICATION DES RÈGLES DE TRAITEMENT - BASE DE DONNÉES" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan

# 1. Vérifier que le backend est démarré
Write-Host "`n📋 1. Vérification du backend..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET -TimeoutSec 10
    Write-Host "✅ Backend accessible - $($response.Count) modèles trouvés" -ForegroundColor Green
    
    # Afficher les modèles avec leurs règles
    foreach ($model in $response) {
        $rulesCount = if ($model.columnProcessingRules) { $model.columnProcessingRules.Count } else { 0 }
        Write-Host "`n📊 Modèle: $($model.name) (ID: $($model.modelId))" -ForegroundColor White
        Write-Host "   - Type: $($model.fileType)" -ForegroundColor Gray
        Write-Host "   - Règles de traitement: $rulesCount" -ForegroundColor Gray
        
        if ($rulesCount -gt 0) {
            Write-Host "   📋 Détail des règles:" -ForegroundColor Yellow
            foreach ($rule in $model.columnProcessingRules) {
                Write-Host "     * ID: $($rule.id)" -ForegroundColor DarkGray
                Write-Host "       Colonne: $($rule.sourceColumn)" -ForegroundColor DarkGray
                Write-Host "       Actions:" -ForegroundColor DarkGray
                Write-Host "         - Supprimer caractères spéciaux: $($rule.removeSpecialChars)" -ForegroundColor DarkGray
                Write-Host "         - Nettoyer espaces: $($rule.trimSpaces)" -ForegroundColor DarkGray
                Write-Host "         - Majuscules: $($rule.toUpperCase)" -ForegroundColor DarkGray
                Write-Host "         - Minuscules: $($rule.toLowerCase)" -ForegroundColor DarkGray
                Write-Host "         - Supprimer accents: $($rule.removeAccents)" -ForegroundColor DarkGray
            }
        } else {
            Write-Host "   ⚠️ Aucune règle de traitement configurée" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "❌ Backend non accessible: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Test de récupération des règles pour un modèle spécifique
Write-Host "`n📋 2. Test de récupération des règles par modèle..." -ForegroundColor Yellow

try {
    # Récupérer le premier modèle partenaire
    $models = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    $partnerModels = $models | Where-Object { $_.fileType -eq "partner" }
    
    if ($partnerModels.Count -gt 0) {
        $firstModel = $partnerModels[0]
        Write-Host "✅ Test avec le modèle: $($firstModel.name) (ID: $($firstModel.modelId))" -ForegroundColor Green
        
        # Récupérer les règles de traitement des colonnes
        try {
            $rules = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$($firstModel.modelId)/column-rules" -Method GET
            Write-Host "✅ Règles récupérées via API: $($rules.Count) règles" -ForegroundColor Green
            
            if ($rules.Count -gt 0) {
                Write-Host "📋 Détail des règles via API:" -ForegroundColor Yellow
                foreach ($rule in $rules) {
                    Write-Host "   * ID: $($rule.id)" -ForegroundColor DarkGray
                    Write-Host "     Colonne: $($rule.sourceColumn)" -ForegroundColor DarkGray
                    Write-Host "     Actions: $($rule.removeSpecialChars ? 'Supprimer caractères spéciaux' : '') $($rule.trimSpaces ? 'Nettoyer espaces' : '') $($rule.toUpperCase ? 'Majuscules' : '')" -ForegroundColor DarkGray
                }
            }
        } catch {
            Write-Host "⚠️ Erreur lors de la récupération des règles via API: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️ Aucun modèle partenaire trouvé" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Erreur lors de la récupération des modèles: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Test de création d'une règle de test
Write-Host "`n📋 3. Test de création d'une règle de test..." -ForegroundColor Yellow

try {
    if ($partnerModels.Count -gt 0) {
        $testModel = $partnerModels[0]
        Write-Host "✅ Test avec le modèle: $($testModel.name)" -ForegroundColor Green
        
        # Créer une règle de test
        $testRule = @{
            sourceColumn = "Numéro Trans GU"
            targetColumn = "Numero_Trans_GU_Clean"
            formatType = "string"
            removeSpecialChars = $true
            trimSpaces = $true
            toUpperCase = $false
            toLowerCase = $false
            removeAccents = $false
            ruleOrder = 0
        }
        
        $jsonRule = $testRule | ConvertTo-Json -Depth 10
        Write-Host "📤 Envoi de la règle de test: $jsonRule" -ForegroundColor Gray
        
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$($testModel.modelId)/column-rules/batch" -Method POST -Body $jsonRule -ContentType "application/json"
            Write-Host "✅ Règle de test créée avec succès" -ForegroundColor Green
            
            # Vérifier que la règle a été ajoutée
            $updatedRules = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$($testModel.modelId)/column-rules" -Method GET
            Write-Host "✅ Règles après création: $($updatedRules.Count) règles" -ForegroundColor Green
            
        } catch {
            Write-Host "❌ Erreur lors de la création de la règle de test: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "❌ Erreur lors du test de création: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Instructions de vérification manuelle
Write-Host "`n📋 4. Instructions de vérification manuelle..." -ForegroundColor Yellow
Write-Host @"

VÉRIFICATION MANUELLE :

1. Dans l'interface web :
   - Aller dans "Modèles de traitement automatique"
   - Éditer un modèle existant
   - Aller dans "Règles de traitement des colonnes"
   - Vérifier que les règles s'affichent

2. Dans la base de données :
   - Vérifier la table 'column_processing_rules'
   - Confirmer que les nouvelles règles sont présentes
   - Vérifier les valeurs des champs (remove_special_chars, trim_spaces, etc.)

3. Via l'API :
   - GET /api/auto-processing/models/{modelId}/column-rules
   - Vérifier que les règles sont retournées

"@ -ForegroundColor White

Write-Host "`n✅ Vérification terminée!" -ForegroundColor Green
