# Script de test complet pour les règles de traitement des colonnes
# Vérification que les corrections ont résolu le problème

Write-Host "🧪 TEST COMPLET - RÈGLES DE TRAITEMENT DES COLONNES" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# 1. Vérifier l'état de la base de données
Write-Host "`n📋 1. Vérification de l'état de la base de données..." -ForegroundColor Yellow

$checkDatabaseQuery = @"
-- Vérifier que la table existe
SELECT 
    TABLE_NAME,
    TABLE_ROWS,
    CREATE_TIME
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'column_processing_rules';

-- Vérifier les modèles existants
SELECT 
    COUNT(*) as total_models,
    SUM(CASE WHEN file_type = 'partner' THEN 1 ELSE 0 END) as partner_models,
    SUM(CASE WHEN file_type = 'bo' THEN 1 ELSE 0 END) as bo_models
FROM auto_processing_models;

-- Vérifier les règles existantes
SELECT 
    COUNT(*) as total_rules,
    COUNT(DISTINCT auto_processing_model_id) as models_with_rules
FROM column_processing_rules;
"@

Write-Host "Requêtes de vérification de base de données générées..." -ForegroundColor Gray

# 2. Test de l'API backend
Write-Host "`n🧪 2. Test de l'API backend..." -ForegroundColor Yellow

$testBackendApi = @"
# Test 1: Récupérer tous les modèles
curl -X GET "http://localhost:8080/api/auto-processing/models" \
  -H "Content-Type: application/json" | jq '.[] | {id: .modelId, name: .name, rulesCount: (.columnProcessingRules | length)}'

# Test 2: Récupérer un modèle spécifique avec ses règles
curl -X GET "http://localhost:8080/api/auto-processing/models/{MODEL_ID}" \
  -H "Content-Type: application/json" | jq '{id: .modelId, name: .name, rules: .columnProcessingRules}'

# Test 3: Récupérer les règles d'un modèle
curl -X GET "http://localhost:8080/api/auto-processing/models/{MODEL_ID}/column-rules" \
  -H "Content-Type: application/json"

# Test 4: Créer des règles de test
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
    },
    {
      "sourceColumn": "Téléphone",
      "targetColumn": "Telephone_Clean",
      "formatType": "string",
      "removeSpecialChars": true,
      "removeAccents": true,
      "trimSpaces": true,
      "ruleOrder": 1
    }
  ]'
"@

Write-Host "Scripts de test API générés..." -ForegroundColor Gray

# 3. Test de l'interface frontend
Write-Host "`n🧪 3. Test de l'interface frontend..." -ForegroundColor Yellow

$testFrontendInterface = @"
ÉTAPES DE TEST FRONTEND :

1. OUVERTURE DE L'INTERFACE :
   - Aller sur http://localhost:4200
   - Naviguer vers "Modèles de traitement automatique"
   - Vérifier que la page se charge correctement

2. CRÉATION D'UN NOUVEAU MODÈLE :
   - Cliquer sur "Créer un nouveau modèle"
   - Remplir les informations de base :
     * Nom: "Test Règles Traitement"
     * Type de fichier: "partner"
     * Pattern: "*OPPART*.xls"
     * Fichier modèle: "OPPART.xls"
   - Vérifier que les colonnes se chargent

3. AJOUT DE RÈGLES DE TRAITEMENT :
   - Aller dans la section "Règles de traitement des colonnes"
   - Cliquer sur "Afficher"
   - Cliquer sur "Ajouter une règle de nettoyage"
   - Remplir la règle :
     * Colonne à nettoyer: "Numéro Trans GU"
     * Cocher "Supprimer les caractères spéciaux"
     * Cocher "Nettoyer les espaces"
   - Cliquer sur "Sauvegarder"
   - Vérifier que la règle apparaît dans la liste

4. AJOUT D'UNE DEUXIÈME RÈGLE :
   - Cliquer sur "Ajouter une règle de nettoyage"
   - Remplir la règle :
     * Colonne à nettoyer: "Téléphone"
     * Cocher "Supprimer les caractères spéciaux"
     * Cocher "Supprimer les accents"
     * Cocher "Nettoyer les espaces"
   - Cliquer sur "Sauvegarder"
   - Vérifier que les deux règles apparaissent

5. SAUVEGARDE DU MODÈLE :
   - Cliquer sur "Sauvegarder le modèle"
   - Vérifier le message de succès
   - Vérifier que le modèle apparaît dans la liste

6. ÉDITION DU MODÈLE :
   - Cliquer sur "Modifier" pour le modèle créé
   - Vérifier que les règles sont chargées
   - Vérifier que les colonnes sont sélectionnées
   - Modifier une règle existante
   - Sauvegarder les modifications

7. VÉRIFICATION DES LOGS :
   - Ouvrir les outils de développement (F12)
   - Aller dans l'onglet Console
   - Vérifier les messages [DEBUG] :
     * "Règle à sauvegarder:"
     * "Règles existantes avant ajout:"
     * "Nouvelle règle ajoutée. Total:"
     * "Règles avant sauvegarde du modèle:"
     * "Sauvegarde des règles pour le modèle:"
     * "Règles sauvegardées avec succès:"
"@

Write-Host "Instructions de test frontend générées..." -ForegroundColor Gray

# 4. Vérification des logs
Write-Host "`n🔍 4. Vérification des logs..." -ForegroundColor Yellow

$logVerification = @"
LOGS À VÉRIFIER DANS LA CONSOLE DU NAVIGATEUR :

✅ LOGS DE CRÉATION DE RÈGLE :
   - "🔍 [DEBUG] Règle à sauvegarder: {sourceColumn: 'Numéro Trans GU', ...}"
   - "🔍 [DEBUG] Règles existantes avant ajout: 0"
   - "✅ [DEBUG] Nouvelle règle ajoutée. Total: 1"
   - "🔍 [DEBUG] Règles après modification: [...]"

✅ LOGS DE SAUVEGARDE DU MODÈLE :
   - "🔍 [DEBUG] Règles avant sauvegarde du modèle: [...]"
   - "🔍 [DEBUG] Nombre de règles: 2"
   - "✅ [DEBUG] Modèle sauvegardé: {modelId: '...', ...}"
   - "🔄 [DEBUG] Sauvegarde des règles pour le modèle: ..."
   - "🔍 [DEBUG] Règles à sauvegarder: [...]"
   - "✅ [DEBUG] Règles sauvegardées avec succès: [...]"

✅ LOGS DE CHARGEMENT :
   - "🔄 [DEBUG] Chargement des règles pour le modèle: ..."
   - "✅ [DEBUG] Règles chargées: [...]"

❌ LOGS D'ERREUR À SURVEILLER :
   - "❌ [DEBUG] Erreur lors de la sauvegarde des règles:"
   - "❌ [DEBUG] Erreur lors du chargement des règles:"
"@

Write-Host "Instructions de vérification des logs générées..." -ForegroundColor Gray

# 5. Test de validation des données
Write-Host "`n🧪 5. Test de validation des données..." -ForegroundColor Yellow

$dataValidationTest = @"
TEST DE VALIDATION DES DONNÉES :

1. VÉRIFIER LA BASE DE DONNÉES :
   - Exécuter le script SQL de vérification
   - Confirmer que les règles sont bien enregistrées
   - Vérifier les relations entre modèles et règles

2. VÉRIFIER L'API :
   - Tester les endpoints avec curl
   - Confirmer que les règles sont retournées
   - Vérifier la structure des données JSON

3. VÉRIFIER L'INTERFACE :
   - Confirmer que les règles s'affichent
   - Vérifier que les modifications sont persistées
   - Tester la suppression de règles

4. VÉRIFIER LA PERSISTANCE :
   - Redémarrer l'application
   - Vérifier que les règles sont toujours présentes
   - Tester l'édition d'un modèle existant
"@

Write-Host "Instructions de validation des données générées..." -ForegroundColor Gray

# 6. Script de vérification finale
Write-Host "`n📊 6. Script de vérification finale..." -ForegroundColor Yellow

$finalVerificationQuery = @"
-- Vérification finale complète
SELECT 
    'VÉRIFICATION FINALE' as info,
    NOW() as verification_time;

-- 1. État des modèles
SELECT 
    'ÉTAT DES MODÈLES' as section,
    COUNT(*) as total_models,
    SUM(CASE WHEN file_type = 'partner' THEN 1 ELSE 0 END) as partner_models,
    SUM(CASE WHEN file_type = 'bo' THEN 1 ELSE 0 END) as bo_models,
    SUM(CASE WHEN file_type = 'both' THEN 1 ELSE 0 END) as both_models
FROM auto_processing_models;

-- 2. État des règles
SELECT 
    'ÉTAT DES RÈGLES' as section,
    COUNT(*) as total_rules,
    COUNT(DISTINCT auto_processing_model_id) as models_with_rules,
    AVG(rules_per_model) as avg_rules_per_model
FROM (
    SELECT 
        auto_processing_model_id,
        COUNT(*) as rules_per_model
    FROM column_processing_rules
    GROUP BY auto_processing_model_id
) as model_rules;

-- 3. Détail des modèles avec leurs règles
SELECT 
    'DÉTAIL DES MODÈLES' as section,
    apm.id,
    apm.model_id,
    apm.name,
    apm.file_type,
    COUNT(cpr.id) as rules_count,
    GROUP_CONCAT(cpr.source_column SEPARATOR ', ') as source_columns,
    GROUP_CONCAT(cpr.target_column SEPARATOR ', ') as target_columns
FROM auto_processing_models apm
LEFT JOIN column_processing_rules cpr ON apm.id = cpr.auto_processing_model_id
GROUP BY apm.id, apm.model_id, apm.name, apm.file_type
ORDER BY apm.created_at DESC;

-- 4. Types de règles utilisées
SELECT 
    'TYPES DE RÈGLES' as section,
    source_column,
    COUNT(*) as usage_count,
    SUM(CASE WHEN remove_special_chars THEN 1 ELSE 0 END) as with_special_chars_removal,
    SUM(CASE WHEN remove_accents THEN 1 ELSE 0 END) as with_accents_removal,
    SUM(CASE WHEN trim_spaces THEN 1 ELSE 0 END) as with_trim_spaces
FROM column_processing_rules
GROUP BY source_column
ORDER BY usage_count DESC;
"@

Write-Host "Script de vérification finale généré..." -ForegroundColor Gray

# 7. Instructions de résolution de problèmes
Write-Host "`n🔧 7. Instructions de résolution de problèmes..." -ForegroundColor Yellow

$troubleshooting = @"
RÉSOLUTION DE PROBLÈMES :

❌ PROBLÈME: Les règles ne s'affichent pas
   SOLUTION:
   - Vérifier que la table column_processing_rules existe
   - Exécuter le script SQL de correction
   - Redémarrer le backend
   - Vérifier les logs du backend

❌ PROBLÈME: Les règles ne se sauvegardent pas
   SOLUTION:
   - Vérifier les logs frontend [DEBUG]
   - Vérifier que l'API backend répond
   - Tester l'endpoint /column-rules/batch
   - Vérifier les permissions de base de données

❌ PROBLÈME: Erreur 400 lors de la sauvegarde
   SOLUTION:
   - Vérifier la structure des données envoyées
   - Vérifier les contraintes de base de données
   - Vérifier les logs du backend
   - Tester avec des données simplifiées

❌ PROBLÈME: Les règles ne se chargent pas à l'édition
   SOLUTION:
   - Vérifier la méthode loadColumnProcessingRules()
   - Vérifier que le modelId est correct
   - Vérifier les logs de chargement
   - Tester l'endpoint GET /column-rules

❌ PROBLÈME: Interface ne répond pas
   SOLUTION:
   - Redémarrer le frontend
   - Vérifier les erreurs JavaScript
   - Vérifier la console du navigateur
   - Vérifier les erreurs réseau
"@

Write-Host "Instructions de résolution de problèmes générées..." -ForegroundColor Gray

# 8. Résumé des tests
Write-Host "`n📋 8. Résumé des tests à effectuer..." -ForegroundColor Yellow

Write-Host @"

✅ TESTS À EFFECTUER DANS L'ORDRE :

1. TEST DE BASE DE DONNÉES :
   - Exécuter le script SQL de vérification
   - Confirmer que la table column_processing_rules existe
   - Vérifier qu'il y a des modèles dans la base

2. TEST DE L'API BACKEND :
   - Vérifier que le backend fonctionne (port 8080)
   - Tester l'endpoint GET /api/auto-processing/models
   - Vérifier que les modèles sont retournés

3. TEST DE L'INTERFACE FRONTEND :
   - Vérifier que le frontend fonctionne (port 4200)
   - Créer un nouveau modèle avec des règles
   - Vérifier les logs de débogage
   - Sauvegarder et vérifier la persistance

4. TEST DE PERSISTANCE :
   - Redémarrer l'application
   - Éditer un modèle existant
   - Vérifier que les règles sont chargées
   - Modifier et sauvegarder les règles

5. TEST DE VALIDATION :
   - Vérifier la base de données finale
   - Confirmer que les règles sont bien enregistrées
   - Tester la suppression de règles

"@ -ForegroundColor White

Write-Host "`n✅ Script de test complet terminé!" -ForegroundColor Green
Write-Host "📝 Prochaines étapes:" -ForegroundColor Yellow
Write-Host "   1. Exécuter les tests dans l'ordre indiqué" -ForegroundColor White
Write-Host "   2. Vérifier les logs à chaque étape" -ForegroundColor White
Write-Host "   3. Confirmer que les règles sont sauvegardées" -ForegroundColor White
Write-Host "   4. Tester la persistance après redémarrage" -ForegroundColor White
Write-Host "   5. Valider le fonctionnement complet" -ForegroundColor White
