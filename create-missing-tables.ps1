# Script pour créer les tables manquantes
Write-Host "🔧 Création des tables manquantes..."

# Essayer d'utiliser mysql directement
$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"

if (Test-Path $mysqlPath) {
    Write-Host "✅ MySQL trouvé, création des tables..."
    try {
        & $mysqlPath -u root -e "USE top20; CREATE TABLE IF NOT EXISTS column_processing_rules (id BIGINT AUTO_INCREMENT PRIMARY KEY, model_id VARCHAR(255) NOT NULL, source_column VARCHAR(255) NOT NULL, target_column VARCHAR(255) NOT NULL, format_type VARCHAR(100), to_upper_case BOOLEAN DEFAULT FALSE, to_lower_case BOOLEAN DEFAULT FALSE, trim_spaces BOOLEAN DEFAULT FALSE, remove_special_chars BOOLEAN DEFAULT FALSE, pad_zeros BOOLEAN DEFAULT FALSE, regex_replace TEXT, special_char_replacement_map JSON, rule_order INT DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, INDEX idx_model_id (model_id), INDEX idx_rule_order (rule_order));"
        
        & $mysqlPath -u root -e "USE top20; CREATE TABLE IF NOT EXISTS processing_steps (id BIGINT AUTO_INCREMENT PRIMARY KEY, model_id VARCHAR(255) NOT NULL, step_name VARCHAR(255) NOT NULL, step_order INT NOT NULL, step_type VARCHAR(100) NOT NULL, step_config JSON, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, INDEX idx_model_id (model_id), INDEX idx_step_order (step_order));"
        
        Write-Host "✅ Tables créées avec succès!"
    } catch {
        Write-Host "❌ Erreur: $($_.Exception.Message)"
    }
} else {
    Write-Host "❌ MySQL non trouvé à: $mysqlPath"
    Write-Host "📝 Veuillez exécuter manuellement le fichier create-missing-tables.sql dans votre client MySQL"
}
