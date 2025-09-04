-- Script de création de la table column_processing_rules
-- Ce script doit être exécuté pour créer la table nécessaire aux règles de traitement des colonnes

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

-- Commentaires sur les colonnes
ALTER TABLE column_processing_rules 
    MODIFY COLUMN id BIGINT AUTO_INCREMENT COMMENT 'Identifiant unique de la règle',
    MODIFY COLUMN auto_processing_model_id BIGINT NOT NULL COMMENT 'Référence vers le modèle de traitement automatique',
    MODIFY COLUMN source_column VARCHAR(255) NOT NULL COMMENT 'Nom de la colonne source à traiter',
    MODIFY COLUMN target_column VARCHAR(255) NOT NULL COMMENT 'Nom de la colonne cible après traitement',
    MODIFY COLUMN format_type VARCHAR(50) COMMENT 'Type de format à appliquer (string, numeric, date, boolean)',
    MODIFY COLUMN to_upper_case BOOLEAN DEFAULT FALSE COMMENT 'Convertir en majuscules',
    MODIFY COLUMN to_lower_case BOOLEAN DEFAULT FALSE COMMENT 'Convertir en minuscules',
    MODIFY COLUMN trim_spaces BOOLEAN DEFAULT FALSE COMMENT 'Supprimer les espaces en début et fin',
    MODIFY COLUMN remove_special_chars BOOLEAN DEFAULT FALSE COMMENT 'Supprimer les caractères spéciaux',
    MODIFY COLUMN pad_zeros BOOLEAN DEFAULT FALSE COMMENT 'Ajouter des zéros en tête pour les nombres',
    MODIFY COLUMN regex_replace TEXT COMMENT 'Expression régulière pour remplacer du texte (format: pattern|replacement)',
    MODIFY COLUMN special_char_replacement_map TEXT COMMENT 'Map JSON des remplacements de caractères spéciaux',
    MODIFY COLUMN rule_order INT DEFAULT 0 COMMENT 'Ordre d''application des règles',
    MODIFY COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Date de création',
    MODIFY COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Date de dernière modification';

-- Vérification de la création
SELECT 
    TABLE_NAME,
    TABLE_COMMENT,
    TABLE_ROWS,
    CREATE_TIME
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'column_processing_rules';

-- Affichage de la structure de la table
DESCRIBE column_processing_rules;
