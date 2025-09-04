-- Script pour mettre à jour la règle ID 12 et activer remove_accents
-- Ce script corrige les règles créées avant la correction du backend

-- Mettre à jour la règle ID 12 pour activer remove_accents
UPDATE column_processing_rules 
SET remove_accents = 1 
WHERE id = 12;

-- Vérifier la mise à jour
SELECT 
    id,
    source_column,
    target_column,
    remove_special_chars,
    trim_spaces,
    to_upper_case,
    to_lower_case,
    remove_accents,
    auto_processing_model_id
FROM column_processing_rules 
WHERE id = 12;

-- Afficher toutes les règles pour vérification
SELECT 
    id,
    source_column,
    remove_accents,
    auto_processing_model_id
FROM column_processing_rules 
ORDER BY id;

-- Message de confirmation
SELECT '✅ Règle ID 12 mise à jour avec remove_accents = 1' AS status;
