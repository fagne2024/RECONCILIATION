# Script pour vérifier et créer la table impact_op

Write-Host "🔍 Vérification de la table impact_op..." -ForegroundColor Green

# Test de connexion à la base de données via l'API
Write-Host "`n📋 Test de connexion à la base de données..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/impact-op/stats" -Method GET
    Write-Host "✅ Connexion à la base de données réussie" -ForegroundColor Green
    Write-Host "   Statistiques: $($response | ConvertTo-Json)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Erreur de connexion: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Cela peut indiquer que la table impact_op n'existe pas" -ForegroundColor Yellow
}

Write-Host "`n📋 Instructions pour créer la table:" -ForegroundColor Cyan
Write-Host "1. Ouvrez votre client MySQL (phpMyAdmin, MySQL Workbench, etc.)" -ForegroundColor White
Write-Host "2. Exécutez le contenu du fichier execute-migration-impact-op.sql" -ForegroundColor White
Write-Host "3. Ou exécutez cette commande SQL:" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "CREATE TABLE IF NOT EXISTS impact_op (" -ForegroundColor Yellow
Write-Host "    id BIGINT PRIMARY KEY AUTO_INCREMENT," -ForegroundColor Yellow
Write-Host "    type_operation VARCHAR(255) NOT NULL," -ForegroundColor Yellow
Write-Host "    montant DECIMAL(15,3) NOT NULL," -ForegroundColor Yellow
Write-Host "    solde_avant DECIMAL(15,3) NOT NULL," -ForegroundColor Yellow
Write-Host "    solde_apres DECIMAL(15,3) NOT NULL," -ForegroundColor Yellow
Write-Host "    code_proprietaire VARCHAR(50) NOT NULL," -ForegroundColor Yellow
Write-Host "    date_operation DATETIME NOT NULL," -ForegroundColor Yellow
Write-Host "    numero_trans_gu VARCHAR(50) NOT NULL," -ForegroundColor Yellow
Write-Host "    groupe_reseau VARCHAR(10) NOT NULL," -ForegroundColor Yellow
Write-Host "    statut ENUM('EN_ATTENTE', 'TRAITE', 'ERREUR') DEFAULT 'EN_ATTENTE'," -ForegroundColor Yellow
Write-Host "    commentaire TEXT," -ForegroundColor Yellow
Write-Host "    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP," -ForegroundColor Yellow
Write-Host "    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP," -ForegroundColor Yellow
Write-Host "    INDEX idx_code_proprietaire (code_proprietaire)," -ForegroundColor Yellow
Write-Host "    INDEX idx_type_operation (type_operation)," -ForegroundColor Yellow
Write-Host "    INDEX idx_groupe_reseau (groupe_reseau)," -ForegroundColor Yellow
Write-Host "    INDEX idx_statut (statut)," -ForegroundColor Yellow
Write-Host "    INDEX idx_date_operation (date_operation)," -ForegroundColor Yellow
Write-Host "    INDEX idx_numero_trans_gu (numero_trans_gu)," -ForegroundColor Yellow
Write-Host "    UNIQUE INDEX idx_unique_impact (code_proprietaire, numero_trans_gu, date_operation)" -ForegroundColor Yellow
Write-Host ");" -ForegroundColor Yellow

Write-Host "`n4. Redémarrez le backend après avoir créé la table" -ForegroundColor White
Write-Host "5. Testez à nouveau l'upload de fichier" -ForegroundColor White

Write-Host "`n🎯 Une fois la table créée, testez avec:" -ForegroundColor Cyan
Write-Host "curl http://localhost:8080/api/impact-op/stats" -ForegroundColor Gray 