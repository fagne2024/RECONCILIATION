# Script PowerShell pour configurer la base de données WebSocket
# Exécute le script SQL pour créer la table des jobs de réconciliation

param(
    [string]$DatabaseName = "reconciliation_db",
    [string]$ServerName = "localhost",
    [string]$Username = "root",
    [string]$Password = ""
)

Write-Host "🔧 Configuration de la base de données WebSocket..." -ForegroundColor Green

# Vérifier si MySQL est accessible
try {
    $testConnection = mysql -h $ServerName -u $Username -p$Password -e "SELECT 1;" 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Impossible de se connecter à MySQL. Vérifiez les paramètres de connexion." -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Connexion MySQL réussie" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur de connexion MySQL: $_" -ForegroundColor Red
    exit 1
}

# Créer la base de données si elle n'existe pas
Write-Host "📊 Création de la base de données '$DatabaseName'..." -ForegroundColor Yellow
$createDbQuery = "CREATE DATABASE IF NOT EXISTS $DatabaseName CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -h $ServerName -u $Username -p$Password -e $createDbQuery

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Base de données '$DatabaseName' prête" -ForegroundColor Green
} else {
    Write-Host "❌ Erreur lors de la création de la base de données" -ForegroundColor Red
    exit 1
}

# Exécuter le script SQL pour créer la table
Write-Host "📋 Création de la table reconciliation_jobs..." -ForegroundColor Yellow
$sqlFile = Join-Path $PSScriptRoot "create-reconciliation-jobs-table.sql"

if (Test-Path $sqlFile) {
    mysql -h $ServerName -u $Username -p$Password $DatabaseName < $sqlFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Table reconciliation_jobs créée avec succès" -ForegroundColor Green
    } else {
        Write-Host "❌ Erreur lors de la création de la table" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ Fichier SQL non trouvé: $sqlFile" -ForegroundColor Red
    exit 1
}

# Vérifier que la table a été créée
Write-Host "🔍 Vérification de la table..." -ForegroundColor Yellow
$checkTableQuery = "SHOW TABLES LIKE 'reconciliation_jobs';"
$result = mysql -h $ServerName -u $Username -p$Password $DatabaseName -e $checkTableQuery

if ($result -match "reconciliation_jobs") {
    Write-Host "✅ Table reconciliation_jobs vérifiée" -ForegroundColor Green
} else {
    Write-Host "❌ La table n'a pas été créée correctement" -ForegroundColor Red
    exit 1
}

# Afficher la structure de la table
Write-Host "📋 Structure de la table reconciliation_jobs:" -ForegroundColor Cyan
mysql -h $ServerName -u $Username -p$Password $DatabaseName -e "DESCRIBE reconciliation_jobs;"

Write-Host ""
Write-Host "🎉 Configuration WebSocket terminée avec succès!" -ForegroundColor Green
Write-Host "📝 Prochaines étapes:" -ForegroundColor Yellow
Write-Host "   1. Redémarrer le backend Spring Boot" -ForegroundColor White
Write-Host "   2. Activer les WebSockets dans le frontend" -ForegroundColor White
Write-Host "   3. Tester la connexion WebSocket" -ForegroundColor White
Write-Host ""
Write-Host "🔗 Endpoints WebSocket disponibles:" -ForegroundColor Cyan
Write-Host "   - WebSocket: ws://localhost:8080/ws/reconciliation" -ForegroundColor White
Write-Host "   - Upload: POST /api/reconciliation/upload-and-prepare" -ForegroundColor White
Write-Host "   - Status: GET /api/reconciliation/status/{jobId}" -ForegroundColor White
Write-Host "   - Cancel: POST /api/reconciliation/cancel" -ForegroundColor White
Write-Host "   - Health: GET /api/reconciliation/health" -ForegroundColor White
