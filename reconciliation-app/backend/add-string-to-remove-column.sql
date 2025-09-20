-- Script pour ajouter la colonne string_to_remove à la table column_processing_rules
-- Date: 2025-01-27
-- Description: Ajoute le support pour la suppression de chaînes spécifiques dans les règles de traitement des colonnes

-- Ajouter la colonne string_to_remove
ALTER TABLE column_processing_rules 
ADD COLUMN string_to_remove VARCHAR(255) NULL 
COMMENT 'Chaîne de caractères spécifique à supprimer des valeurs (ex: _CM)';

-- Mettre à jour les règles existantes si nécessaire
-- Exemple: Mettre à jour les règles qui suppriment _CM
-- UPDATE column_processing_rules 
-- SET string_to_remove = '_CM' 
-- WHERE source_column IN ('IDTransaction', 'Numéro Trans GU') 
-- AND remove_special_chars = 1;

-- Vérifier la structure de la table
DESCRIBE column_processing_rules;
