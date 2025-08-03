CREATE TABLE processing_steps (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    step_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    field VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    params TEXT,
    description TEXT,
    model_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (model_id) REFERENCES auto_processing_models(id) ON DELETE CASCADE
);

CREATE INDEX idx_processing_steps_step_id ON processing_steps(step_id);
CREATE INDEX idx_processing_steps_model_id ON processing_steps(model_id); 