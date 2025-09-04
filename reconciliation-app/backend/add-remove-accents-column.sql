-- Script pour ajouter la colonne remove_accents à la table column_processing_rules
-- Ce script doit être exécuté pour ajouter la nouvelle fonctionnalité de suppression des accents

-- Vérifier si la colonne existe déjà
SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'column_processing_rules' 
    AND COLUMN_NAME = 'remove_accents'
);

-- Ajouter la colonne si elle n'existe pas
SET @sql = IF(@column_exists = 0,
    'ALTER TABLE column_processing_rules ADD COLUMN remove_accents BOOLEAN DEFAULT FALSE COMMENT ''Supprimer les accents des valeurs''',
    'SELECT ''Colonne remove_accents existe déjà'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Vérifier que la colonne a été ajoutée
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'column_processing_rules' 
AND COLUMN_NAME = 'remove_accents';

-- Afficher la structure mise à jour de la table
DESCRIBE column_processing_rules;

-- Message de confirmation
SELECT '✅ Colonne remove_accents ajoutée avec succès à la table column_processing_rules' AS status;
