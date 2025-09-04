-- Script de correction pour les règles de traitement des colonnes
-- Problème : Les règles ne sont pas sauvegardées correctement

-- 1. Créer la table column_processing_rules si elle n'existe pas
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

-- Commentaires sur la table
ALTER TABLE column_processing_rules COMMENT = 'Table pour stocker les règles de traitement des colonnes pour les modèles de traitement automatique';

-- 2. Vérifier l'état actuel des modèles
SELECT 
    'État actuel des modèles' as info,
    COUNT(*) as total_models,
    SUM(CASE WHEN file_type = 'partner' THEN 1 ELSE 0 END) as partner_models,
    SUM(CASE WHEN file_type = 'bo' THEN 1 ELSE 0 END) as bo_models,
    SUM(CASE WHEN file_type = 'both' THEN 1 ELSE 0 END) as both_models
FROM auto_processing_models;

-- 3. Vérifier l'état actuel des règles
SELECT 
    'État actuel des règles' as info,
    COUNT(*) as total_rules,
    COUNT(DISTINCT auto_processing_model_id) as models_with_rules
FROM column_processing_rules;

-- 4. Ajouter des règles de test pour tous les modèles partenaires existants
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

-- 5. Ajouter une deuxième règle de test pour les modèles partenaires
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

-- 6. Ajouter des règles de test pour les modèles BO
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
    'IDTransaction',
    'IDTransaction_Clean',
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
WHERE apm.file_type = 'bo'
AND NOT EXISTS (
    SELECT 1 FROM column_processing_rules cpr 
    WHERE cpr.auto_processing_model_id = apm.id 
    AND cpr.source_column = 'IDTransaction'
);

-- 7. Vérifier les résultats après correction
SELECT 
    'Résultats après correction' as info,
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

-- 8. Nettoyer les règles orphelines (au cas où)
DELETE cpr FROM column_processing_rules cpr
LEFT JOIN auto_processing_models apm ON cpr.auto_processing_model_id = apm.id
WHERE apm.id IS NULL;

-- 9. Statistiques finales
SELECT 
    'Statistiques finales' as info,
    COUNT(*) as total_models,
    SUM(CASE WHEN rules_count > 0 THEN 1 ELSE 0 END) as models_with_rules,
    SUM(rules_count) as total_rules
FROM (
    SELECT 
        apm.id,
        COUNT(cpr.id) as rules_count
    FROM auto_processing_models apm
    LEFT JOIN column_processing_rules cpr ON apm.id = cpr.auto_processing_model_id
    GROUP BY apm.id
) as model_stats;

-- 10. Afficher les détails des règles créées
SELECT 
    'Détails des règles créées' as info,
    cpr.id,
    cpr.auto_processing_model_id,
    cpr.source_column,
    cpr.target_column,
    cpr.format_type,
    cpr.remove_special_chars,
    cpr.remove_accents,
    cpr.trim_spaces,
    cpr.rule_order,
    apm.name as model_name,
    apm.file_type
FROM column_processing_rules cpr
JOIN auto_processing_models apm ON cpr.auto_processing_model_id = apm.id
ORDER BY cpr.created_at DESC;
