# Script de test et correction pour les règles de traitement des colonnes
# Problème : Les règles de traitement ne sont pas sauvegardées correctement

Write-Host "🔍 DIAGNOSTIC DES RÈGLES DE TRAITEMENT DES COLONNES" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Vérifier la table column_processing_rules
Write-Host "`n📋 1. Vérification de la table column_processing_rules..." -ForegroundColor Yellow

$checkTableQuery = @"
SELECT 
    TABLE_NAME,
    TABLE_ROWS,
    CREATE_TIME
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'column_processing_rules';
"@

Write-Host "Exécution de la requête de vérification de table..." -ForegroundColor Gray
# Note: Cette requête sera exécutée dans le backend

# 2. Vérifier les modèles existants
Write-Host "`n📋 2. Vérification des modèles existants..." -ForegroundColor Yellow

$checkModelsQuery = @"
SELECT 
    id,
    model_id,
    name,
    file_type,
    template_file,
    created_at,
    updated_at
FROM auto_processing_models 
ORDER BY created_at DESC;
"@

Write-Host "Exécution de la requête de vérification des modèles..." -ForegroundColor Gray

# 3. Vérifier les règles existantes
Write-Host "`n📋 3. Vérification des règles de traitement existantes..." -ForegroundColor Yellow

$checkRulesQuery = @"
SELECT 
    cpr.id,
    cpr.auto_processing_model_id,
    cpr.source_column,
    cpr.target_column,
    cpr.format_type,
    cpr.to_upper_case,
    cpr.to_lower_case,
    cpr.trim_spaces,
    cpr.remove_special_chars,
    cpr.remove_accents,
    cpr.pad_zeros,
    cpr.regex_replace,
    cpr.rule_order,
    cpr.created_at,
    cpr.updated_at,
    apm.name as model_name,
    apm.model_id as model_model_id
FROM column_processing_rules cpr
LEFT JOIN auto_processing_models apm ON cpr.auto_processing_model_id = apm.id
ORDER BY cpr.created_at DESC;
"@

Write-Host "Exécution de la requête de vérification des règles..." -ForegroundColor Gray

# 4. Script de correction pour ajouter une règle de test
Write-Host "`n🔧 4. Script de correction - Ajout d'une règle de test..." -ForegroundColor Yellow

$addTestRuleQuery = @"
-- Trouver le premier modèle partenaire
SET @model_id = (SELECT id FROM auto_processing_models WHERE file_type = 'partner' LIMIT 1);

-- Ajouter une règle de test si un modèle existe
INSERT INTO column_processing_rules (
    auto_processing_model_id,
    source_column,
    target_column,
    format_type,
    to_upper_case,
    to_lower_case,
    trim_spaces,
    remove_special_chars,
    remove_accents,
    pad_zeros,
    regex_replace,
    rule_order,
    created_at,
    updated_at
) 
SELECT 
    @model_id,
    'Numéro Trans GU',
    'Numero_Trans_GU_Clean',
    'string',
    FALSE,
    FALSE,
    TRUE,
    TRUE,
    FALSE,
    FALSE,
    NULL,
    0,
    NOW(),
    NOW()
WHERE @model_id IS NOT NULL;
"@

Write-Host "Script de correction généré..." -ForegroundColor Gray

# 5. Vérification de la structure de la table
Write-Host "`n📋 5. Vérification de la structure de la table..." -ForegroundColor Yellow

$checkStructureQuery = @"
DESCRIBE column_processing_rules;
"@

Write-Host "Exécution de la requête de vérification de structure..." -ForegroundColor Gray

# 6. Script de nettoyage des règles orphelines
Write-Host "`n🧹 6. Script de nettoyage des règles orphelines..." -ForegroundColor Yellow

$cleanupQuery = @"
-- Supprimer les règles qui n'ont pas de modèle associé
DELETE cpr FROM column_processing_rules cpr
LEFT JOIN auto_processing_models apm ON cpr.auto_processing_model_id = apm.id
WHERE apm.id IS NULL;
"@

Write-Host "Script de nettoyage généré..." -ForegroundColor Gray

# 7. Instructions pour le débogage frontend
Write-Host "`n🔍 7. Instructions pour le débogage frontend..." -ForegroundColor Yellow

Write-Host @"

PROBLÈME IDENTIFIÉ :
Les règles de traitement des colonnes ne sont pas sauvegardées correctement.

CAUSES POSSIBLES :
1. Les règles sont ajoutées localement mais pas persistées
2. Problème de synchronisation entre le frontend et le backend
3. Erreur dans la méthode saveColumnProcessingRulesBatch

SOLUTIONS À IMPLÉMENTER :

1. Vérifier la méthode saveModel() dans le composant :
   - S'assurer que this.columnProcessingRules est bien rempli
   - Vérifier que la sauvegarde des règles est appelée après la création du modèle

2. Ajouter des logs de débogage :
   - Dans saveColumnProcessingRule() : console.log('Règle ajoutée:', ruleData)
   - Dans saveModel() : console.log('Règles avant sauvegarde:', this.columnProcessingRules)

3. Vérifier l'API backend :
   - Endpoint /auto-processing/models/{modelId}/column-rules/batch
   - Méthode saveRulesForModel dans ColumnProcessingRuleService

4. Corriger le problème de timing :
   - Attendre que le modèle soit créé avant de sauvegarder les règles
   - Utiliser async/await pour la synchronisation

"@ -ForegroundColor White

# 8. Script de test API
Write-Host "`n🧪 8. Script de test API..." -ForegroundColor Yellow

$testApiScript = @"
# Test de l'API pour les règles de traitement
curl -X GET "http://localhost:8080/api/auto-processing/models" | jq '.[] | {id: .modelId, name: .name, rules: .columnProcessingRules}'

# Test de création d'une règle
curl -X POST "http://localhost:8080/api/auto-processing/models/{MODEL_ID}/column-rules/batch" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "sourceColumn": "Numéro Trans GU",
      "targetColumn": "Numero_Trans_GU_Clean",
      "formatType": "string",
      "removeSpecialChars": true,
      "trimSpaces": true,
      "ruleOrder": 0
    }
  ]'
"@

Write-Host $testApiScript -ForegroundColor Gray

Write-Host "`n✅ Diagnostic terminé. Vérifiez les résultats ci-dessus." -ForegroundColor Green
Write-Host "📝 Actions recommandées :" -ForegroundColor Yellow
Write-Host "   1. Exécuter les requêtes SQL pour vérifier l'état de la base de données" -ForegroundColor White
Write-Host "   2. Ajouter les logs de débogage dans le frontend" -ForegroundColor White
Write-Host "   3. Tester l'API avec les scripts fournis" -ForegroundColor White
Write-Host "   4. Corriger le problème de synchronisation dans saveModel()" -ForegroundColor White
