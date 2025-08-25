-- Script SQL pour créer la table des jobs de réconciliation
-- Exécuter ce script dans votre base de données MySQL

CREATE TABLE IF NOT EXISTS reconciliation_jobs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    job_id VARCHAR(255) NOT NULL UNIQUE,
    status ENUM('PENDING', 'PREPARING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    bo_file_path VARCHAR(500),
    partner_file_path VARCHAR(500),
    config_json TEXT,
    progress_json TEXT,
    result_json TEXT,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    client_id VARCHAR(255),
    
    INDEX idx_job_id (job_id),
    INDEX idx_status (status),
    INDEX idx_client_id (client_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ajouter des commentaires pour documenter la table
ALTER TABLE reconciliation_jobs 
COMMENT = 'Table pour stocker les jobs de réconciliation avec support WebSocket';

-- Créer un index composite pour les requêtes fréquentes
CREATE INDEX idx_status_created_at ON reconciliation_jobs (status, created_at);

-- Créer un index pour les jobs expirés
CREATE INDEX idx_stale_jobs ON reconciliation_jobs (status, created_at) 
WHERE status IN ('PENDING', 'PREPARING', 'PROCESSING');

-- Insérer des données de test (optionnel)
-- INSERT INTO reconciliation_jobs (job_id, status, client_id) 
-- VALUES ('test_job_001', 'PENDING', 'test_client_001');
