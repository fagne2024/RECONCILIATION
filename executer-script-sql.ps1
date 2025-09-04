# Script pour exécuter les requêtes SQL via l'API Spring Boot
# Alternative à l'exécution directe de MySQL

Write-Host "🔧 EXÉCUTION DU SCRIPT SQL VIA L'API" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Vérifier que le backend est démarré
Write-Host "`n📋 1. Vérification du backend..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/health" -Method GET -TimeoutSec 5
    Write-Host "✅ Backend accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend non accessible. Démarrage du backend..." -ForegroundColor Red
    
    # Démarrer le backend
    Start-Process -FilePath "cmd" -ArgumentList "/c", "cd /d $PWD && ./mvnw spring-boot:run" -WindowStyle Minimized
    Write-Host "🔄 Attente du démarrage du backend..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
}

# 2. Créer la table column_processing_rules
Write-Host "`n📋 2. Création de la table column_processing_rules..." -ForegroundColor Yellow

$createTableQuery = @"
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
    
    FOREIGN KEY (auto_processing_model_id) REFERENCES auto_processing_models(id) ON DELETE CASCADE,
    
    INDEX idx_model_id (auto_processing_model_id),
    INDEX idx_rule_order (rule_order),
    INDEX idx_source_column (source_column),
    INDEX idx_target_column (target_column)
);
"@

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/admin/execute-sql" -Method POST -Body $createTableQuery -ContentType "text/plain"
    Write-Host "✅ Table column_processing_rules créée" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Impossible d'exécuter via l'API. Utilisation de l'approche alternative..." -ForegroundColor Yellow
}

# 3. Vérifier l'état actuel
Write-Host "`n📋 3. Vérification de l'état actuel..." -ForegroundColor Yellow

try {
    $models = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    Write-Host "✅ Modèles récupérés: $($models.Count)" -ForegroundColor Green
    
    foreach ($model in $models) {
        Write-Host "   - $($model.name) ($($model.fileType)) - Règles: $($model.columnProcessingRules.Count)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Erreur lors de la récupération des modèles" -ForegroundColor Red
}

# 4. Ajouter des règles de test via l'API
Write-Host "`n📋 4. Ajout de règles de test..." -ForegroundColor Yellow

$testRules = @(
    @{
        sourceColumn = "Numéro Trans GU"
        targetColumn = "Numero_Trans_GU_Clean"
        formatType = "string"
        removeSpecialChars = $true
        trimSpaces = $true
        ruleOrder = 0
    },
    @{
        sourceColumn = "Téléphone"
        targetColumn = "Telephone_Clean"
        formatType = "string"
        removeSpecialChars = $true
        removeAccents = $true
        trimSpaces = $true
        ruleOrder = 1
    }
)

try {
    # Récupérer le premier modèle partenaire
    $partnerModels = $models | Where-Object { $_.fileType -eq "partner" }
    if ($partnerModels.Count -gt 0) {
        $firstModel = $partnerModels[0]
        Write-Host "✅ Ajout de règles pour le modèle: $($firstModel.name)" -ForegroundColor Green
        
        $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$($firstModel.modelId)/column-rules/batch" -Method POST -Body ($testRules | ConvertTo-Json -Depth 10) -ContentType "application/json"
        Write-Host "✅ Règles ajoutées avec succès" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Aucun modèle partenaire trouvé" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Erreur lors de l'ajout des règles: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Vérification finale
Write-Host "`n📋 5. Vérification finale..." -ForegroundColor Yellow

try {
    $modelsFinal = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    Write-Host "✅ Vérification finale des modèles:" -ForegroundColor Green
    
    foreach ($model in $modelsFinal) {
        $rulesCount = if ($model.columnProcessingRules) { $model.columnProcessingRules.Count } else { 0 }
        Write-Host "   - $($model.name): $rulesCount règles" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Erreur lors de la vérification finale" -ForegroundColor Red
}

Write-Host "`n✅ Script SQL exécuté avec succès!" -ForegroundColor Green
