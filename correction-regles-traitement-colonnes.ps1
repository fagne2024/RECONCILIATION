# Script de correction pour les règles de traitement des colonnes
# Problème : Les règles ne sont pas sauvegardées correctement

Write-Host "🔧 CORRECTION DES RÈGLES DE TRAITEMENT DES COLONNES" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Vérifier et créer la table si elle n'existe pas
Write-Host "`n📋 1. Vérification et création de la table column_processing_rules..." -ForegroundColor Yellow

$createTableQuery = @"
-- Créer la table column_processing_rules si elle n'existe pas
CREATE TABLE IF NOT EXISTS column_processing_rules (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    auto_processing_model_id BIGINT NOT NULL,
    source_column VARCHAR(255) NOT NULL,
    target_column VARCHAR(255) NOT NULL,
    format_type VARCHAR(50),
    to_upper_case BOOLEAN DEFAULT FALSE,
    to_lower_case BOOLEAN DEFAULT FALSE,
    trim_spaces BOOLEAN DEFAULT FALSE,
    remove_special_chars BOOLEAN DEFAULT FALSE,
    remove_accents BOOLEAN DEFAULT FALSE,
    pad_zeros BOOLEAN DEFAULT FALSE,
    regex_replace TEXT,
    special_char_replacement_map TEXT,
    rule_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Contraintes
    FOREIGN KEY (auto_processing_model_id) REFERENCES auto_processing_models(id) ON DELETE CASCADE,
    
    -- Index pour améliorer les performances
    INDEX idx_model_id (auto_processing_model_id),
    INDEX idx_rule_order (rule_order),
    INDEX idx_source_column (source_column),
    INDEX idx_target_column (target_column)
);
"@

Write-Host "Script de création de table généré..." -ForegroundColor Gray

# 2. Ajouter des règles de test pour les modèles existants
Write-Host "`n🔧 2. Ajout de règles de test pour les modèles existants..." -ForegroundColor Yellow

$addTestRulesQuery = @"
-- Ajouter des règles de test pour tous les modèles partenaires existants
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
    apm.id,
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
FROM auto_processing_models apm
WHERE apm.file_type = 'partner'
AND NOT EXISTS (
    SELECT 1 FROM column_processing_rules cpr 
    WHERE cpr.auto_processing_model_id = apm.id 
    AND cpr.source_column = 'Numéro Trans GU'
);

-- Ajouter une deuxième règle de test
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
    apm.id,
    'Téléphone',
    'Telephone_Clean',
    'string',
    FALSE,
    FALSE,
    TRUE,
    TRUE,
    TRUE,
    FALSE,
    NULL,
    1,
    NOW(),
    NOW()
FROM auto_processing_models apm
WHERE apm.file_type = 'partner'
AND NOT EXISTS (
    SELECT 1 FROM column_processing_rules cpr 
    WHERE cpr.auto_processing_model_id = apm.id 
    AND cpr.source_column = 'Téléphone'
);
"@

Write-Host "Script d'ajout de règles de test généré..." -ForegroundColor Gray

# 3. Vérifier les résultats
Write-Host "`n📊 3. Vérification des résultats..." -ForegroundColor Yellow

$verifyResultsQuery = @"
-- Vérifier les modèles avec leurs règles
SELECT 
    apm.id,
    apm.model_id,
    apm.name,
    apm.file_type,
    COUNT(cpr.id) as rules_count,
    GROUP_CONCAT(cpr.source_column SEPARATOR ', ') as source_columns
FROM auto_processing_models apm
LEFT JOIN column_processing_rules cpr ON apm.id = cpr.auto_processing_model_id
GROUP BY apm.id, apm.model_id, apm.name, apm.file_type
ORDER BY apm.created_at DESC;
"@

Write-Host "Script de vérification généré..." -ForegroundColor Gray

# 4. Script de correction du frontend
Write-Host "`n🔧 4. Correction du frontend - Ajout de logs de débogage..." -ForegroundColor Yellow

$frontendCorrection = @"
// CORRECTION À APPORTER DANS LE FRONTEND
// Fichier: reconciliation-app/frontend/src/app/components/auto-processing-models/auto-processing-models.component.ts

// 1. Dans la méthode saveColumnProcessingRule(), ajouter des logs :
saveColumnProcessingRule(): void {
  if (this.columnProcessingRuleForm.valid) {
    const ruleData = this.columnProcessingRuleForm.value;
    
    console.log('🔍 [DEBUG] Règle à sauvegarder:', ruleData);
    console.log('🔍 [DEBUG] Règles existantes avant ajout:', this.columnProcessingRules.length);
    
    // ... code existant ...
    
    if (this.editingColumnProcessingRule === -1) {
      this.columnProcessingRules.push({
        ...ruleData,
        sourceColumn: finalSourceColumn
      });
      console.log('✅ [DEBUG] Nouvelle règle ajoutée. Total:', this.columnProcessingRules.length);
    } else {
      this.columnProcessingRules[this.editingColumnProcessingRule] = {
        ...ruleData,
        sourceColumn: finalSourceColumn
      };
      console.log('✅ [DEBUG] Règle modifiée. Total:', this.columnProcessingRules.length);
    }
    
    console.log('🔍 [DEBUG] Règles après modification:', this.columnProcessingRules);
  }
}

// 2. Dans la méthode saveModel(), améliorer la sauvegarde des règles :
saveModel(): void {
  // ... code existant ...
  
  console.log('🔍 [DEBUG] Règles avant sauvegarde du modèle:', this.columnProcessingRules);
  console.log('🔍 [DEBUG] Nombre de règles:', this.columnProcessingRules.length);
  
  savePromise.then(savedModel => {
    console.log('✅ [DEBUG] Modèle sauvegardé:', savedModel);
    
    // Sauvegarder les règles de traitement des colonnes si elles existent
    if (this.columnProcessingRules.length > 0 && savedModel.modelId) {
      console.log('🔄 [DEBUG] Sauvegarde des règles pour le modèle:', savedModel.modelId);
      
      this.autoProcessingService.saveColumnProcessingRulesBatch(savedModel.modelId, this.columnProcessingRules)
        .then((savedRules) => {
          console.log('✅ [DEBUG] Règles sauvegardées avec succès:', savedRules);
          this.successMessage = `Modèle ${this.editingModel ? 'modifié' : 'créé'} avec ${this.columnProcessingRules.length} règle(s) de traitement`;
        })
        .catch(error => {
          console.error('❌ [DEBUG] Erreur lors de la sauvegarde des règles:', error);
          this.successMessage = `Modèle ${this.editingModel ? 'modifié' : 'créé'} mais erreur lors de la sauvegarde des règles`;
        });
    } else {
      console.log('ℹ️ [DEBUG] Aucune règle à sauvegarder');
      this.successMessage = `Modèle ${this.editingModel ? 'modifié' : 'créé'} avec succès`;
    }
    
    // ... reste du code ...
  });
}

// 3. Dans la méthode loadColumnProcessingRules(), ajouter des logs :
loadColumnProcessingRules(modelId: string): void {
  console.log('🔄 [DEBUG] Chargement des règles pour le modèle:', modelId);
  
  this.autoProcessingService.getColumnProcessingRules(modelId)
    .then(rules => {
      console.log('✅ [DEBUG] Règles chargées:', rules);
      this.columnProcessingRules = rules;
    })
    .catch(error => {
      console.error('❌ [DEBUG] Erreur lors du chargement des règles:', error);
      this.columnProcessingRules = [];
    });
}
"@

Write-Host "Corrections frontend générées..." -ForegroundColor Gray

# 5. Script de test de l'API
Write-Host "`n🧪 5. Script de test de l'API..." -ForegroundColor Yellow

$testApiScript = @"
# Test de l'API pour vérifier les règles de traitement

# 1. Récupérer tous les modèles avec leurs règles
curl -X GET "http://localhost:8080/api/auto-processing/models" \
  -H "Content-Type: application/json" | jq '.[] | {id: .modelId, name: .name, rulesCount: (.columnProcessingRules | length), rules: .columnProcessingRules}'

# 2. Récupérer les règles d'un modèle spécifique (remplacer {MODEL_ID})
curl -X GET "http://localhost:8080/api/auto-processing/models/{MODEL_ID}/column-rules" \
  -H "Content-Type: application/json"

# 3. Créer une règle de test
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

Write-Host "Script de test API généré..." -ForegroundColor Gray

# 6. Instructions de déploiement
Write-Host "`n📋 6. Instructions de déploiement..." -ForegroundColor Yellow

Write-Host @"

ÉTAPES DE CORRECTION :

1. EXÉCUTER LES SCRIPTS SQL :
   - Créer la table column_processing_rules si elle n'existe pas
   - Ajouter des règles de test pour les modèles existants
   - Vérifier les résultats

2. APPLIQUER LES CORRECTIONS FRONTEND :
   - Ajouter les logs de débogage dans saveColumnProcessingRule()
   - Améliorer la sauvegarde des règles dans saveModel()
   - Ajouter des logs dans loadColumnProcessingRules()

3. TESTER L'API :
   - Vérifier que les endpoints fonctionnent
   - Tester la création de règles
   - Vérifier la récupération des règles

4. REDÉMARRER LES SERVICES :
   - Redémarrer le backend pour appliquer les changements
   - Redémarrer le frontend pour appliquer les corrections

5. TESTER L'INTERFACE :
   - Créer un nouveau modèle avec des règles de traitement
   - Vérifier que les règles sont sauvegardées
   - Vérifier que les règles sont chargées lors de l'édition

"@ -ForegroundColor White

# 7. Script de redémarrage
Write-Host "`n🔄 7. Script de redémarrage des services..." -ForegroundColor Yellow

$restartScript = @"
# Redémarrer le backend
cd reconciliation-app/backend
./mvnw spring-boot:run

# Dans un autre terminal, redémarrer le frontend
cd reconciliation-app/frontend
npm start
"@

Write-Host $restartScript -ForegroundColor Gray

Write-Host "`n✅ Script de correction terminé." -ForegroundColor Green
Write-Host "📝 Prochaines étapes :" -ForegroundColor Yellow
Write-Host "   1. Exécuter les scripts SQL pour créer la table et ajouter des règles de test" -ForegroundColor White
Write-Host "   2. Appliquer les corrections frontend avec les logs de débogage" -ForegroundColor White
Write-Host "   3. Tester l'API avec les scripts fournis" -ForegroundColor White
Write-Host "   4. Redémarrer les services" -ForegroundColor White
Write-Host "   5. Tester l'interface utilisateur" -ForegroundColor White
