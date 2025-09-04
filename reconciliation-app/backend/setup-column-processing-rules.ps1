# Script de démarrage pour les règles de traitement des colonnes
# Ce script automatise l'installation et les tests

param(
    [string]$DatabaseName = "reconciliation_db",
    [string]$ServerName = "localhost",
    [string]$Port = "3306",
    [string]$Username = "root",
    [string]$Password = "",
    [string]$BackendUrl = "http://localhost:8080",
    [switch]$SkipDatabaseSetup,
    [switch]$SkipTests,
    [switch]$SkipBackendRestart
)

Write-Host "🚀 Installation des règles de traitement des colonnes" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Configuration
Write-Host "`n📋 Configuration:" -ForegroundColor Yellow
Write-Host "   Base de données: $DatabaseName" -ForegroundColor Gray
Write-Host "   Serveur: $ServerName:$Port" -ForegroundColor Gray
Write-Host "   Utilisateur: $Username" -ForegroundColor Gray
Write-Host "   Backend URL: $BackendUrl" -ForegroundColor Gray

# Étape 1: Création de la table
if (-not $SkipDatabaseSetup) {
    Write-Host "`n🔧 Étape 1: Création de la table column_processing_rules..." -ForegroundColor Yellow
    
    $scriptPath = "execute-column-processing-rules-table.ps1"
    if (Test-Path $scriptPath) {
        try {
            & $scriptPath -DatabaseName $DatabaseName -ServerName $ServerName -Port $Port -Username $Username -Password $Password
            Write-Host "✅ Table créée avec succès!" -ForegroundColor Green
        } catch {
            Write-Host "❌ Erreur lors de la création de la table: $($_.Exception.Message)" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "❌ Script de création de table non trouvé: $scriptPath" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "`n⏭️ Étape 1: Création de la table ignorée (SkipDatabaseSetup)" -ForegroundColor Yellow
}

# Étape 2: Vérification du backend
Write-Host "`n🔍 Étape 2: Vérification du backend..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$BackendUrl/actuator/health" -Method GET -TimeoutSec 10
    Write-Host "✅ Backend accessible et fonctionnel" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Backend non accessible: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "   Assurez-vous que le backend Spring Boot est démarré sur $BackendUrl" -ForegroundColor Gray
    
    if (-not $SkipBackendRestart) {
        Write-Host "`n🔄 Tentative de redémarrage du backend..." -ForegroundColor Yellow
        
        # Chercher le processus Java du backend
        $javaProcesses = Get-Process -Name "java" -ErrorAction SilentlyContinue
        $backendProcess = $javaProcesses | Where-Object { $_.ProcessName -eq "java" }
        
        if ($backendProcess) {
            Write-Host "   Processus Java trouvé (PID: $($backendProcess.Id))" -ForegroundColor Gray
            Write-Host "   Veuillez redémarrer manuellement le backend Spring Boot" -ForegroundColor Yellow
        } else {
            Write-Host "   Aucun processus Java trouvé" -ForegroundColor Gray
        }
        
        Write-Host "   Attente de 30 secondes pour le redémarrage..." -ForegroundColor Yellow
        Start-Sleep -Seconds 30
        
        # Vérification après redémarrage
        try {
            $response = Invoke-RestMethod -Uri "$BackendUrl/actuator/health" -Method GET -TimeoutSec 10
            Write-Host "✅ Backend accessible après redémarrage" -ForegroundColor Green
        } catch {
            Write-Host "❌ Backend toujours inaccessible après redémarrage" -ForegroundColor Red
            Write-Host "   Veuillez démarrer manuellement le backend et relancer ce script" -ForegroundColor Yellow
            exit 1
        }
    } else {
        Write-Host "⏭️ Vérification du backend ignorée (SkipBackendRestart)" -ForegroundColor Yellow
    }
}

# Étape 3: Tests de l'API
if (-not $SkipTests) {
    Write-Host "`n🧪 Étape 3: Tests de l'API..." -ForegroundColor Yellow
    
    $testScriptPath = "test-column-processing-rules.ps1"
    if (Test-Path $testScriptPath) {
        try {
            & $testScriptPath -BaseUrl $BackendUrl
            Write-Host "✅ Tests terminés avec succès!" -ForegroundColor Green
        } catch {
            Write-Host "❌ Erreur lors des tests: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "   Consultez les logs ci-dessus pour plus de détails" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Script de test non trouvé: $testScriptPath" -ForegroundColor Red
    }
} else {
    Write-Host "`n⏭️ Étape 3: Tests ignorés (SkipTests)" -ForegroundColor Yellow
}

# Étape 4: Vérification finale
Write-Host "`n🔍 Étape 4: Vérification finale..." -ForegroundColor Yellow

# Vérifier que la table existe
try {
    $mysqlCommand = "mysql"
    $mysqlArgs = @(
        "-h", $ServerName,
        "-P", $Port,
        "-u", $Username
    )
    
    if ($Password) {
        $mysqlArgs += "-p$Password"
    }
    
    $mysqlArgs += $DatabaseName, "-e", "SHOW TABLES LIKE 'column_processing_rules';"
    
    $process = Start-Process -FilePath $mysqlCommand -ArgumentList $mysqlArgs -PassThru -NoNewWindow -Wait -RedirectStandardOutput "temp_output.txt" -RedirectStandardError "temp_error.txt"
    
    if ($process.ExitCode -eq 0) {
        $output = Get-Content "temp_output.txt" -ErrorAction SilentlyContinue
        if ($output -and $output.Contains("column_processing_rules")) {
            Write-Host "✅ Table column_processing_rules vérifiée" -ForegroundColor Green
        } else {
            Write-Host "❌ Table column_processing_rules non trouvée" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Erreur lors de la vérification de la table" -ForegroundColor Red
    }
    
    # Nettoyage
    if (Test-Path "temp_output.txt") { Remove-Item "temp_output.txt" -Force }
    if (Test-Path "temp_error.txt") { Remove-Item "temp_error.txt" -Force }
} catch {
    Write-Host "⚠️ Impossible de vérifier la table: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Vérifier les endpoints de l'API
try {
    $endpoints = @(
        "/api/auto-processing/models",
        "/api/auto-processing/models/test/column-rules"
    )
    
    foreach ($endpoint in $endpoints) {
        try {
            $response = Invoke-RestMethod -Uri "$BackendUrl$endpoint" -Method GET -TimeoutSec 5
            Write-Host "✅ Endpoint $endpoint accessible" -ForegroundColor Green
        } catch {
            Write-Host "⚠️ Endpoint $endpoint non accessible: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "⚠️ Impossible de vérifier les endpoints: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Résumé final
Write-Host "`n📊 Résumé de l'installation:" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

if (-not $SkipDatabaseSetup) {
    Write-Host "✅ Table column_processing_rules créée" -ForegroundColor Green
} else {
    Write-Host "⏭️ Table column_processing_rules ignorée" -ForegroundColor Yellow
}

Write-Host "✅ Backend Spring Boot configuré" -ForegroundColor Green

if (-not $SkipTests) {
    Write-Host "✅ Tests de l'API effectués" -ForegroundColor Green
} else {
    Write-Host "⏭️ Tests de l'API ignorés" -ForegroundColor Yellow
}

Write-Host "`n🎉 Installation terminée!" -ForegroundColor Green
Write-Host "`n📝 Prochaines étapes:" -ForegroundColor Yellow
Write-Host "   1. Mettre à jour le frontend Angular pour utiliser les nouvelles fonctionnalités" -ForegroundColor Gray
Write-Host "   2. Tester l'interface utilisateur" -ForegroundColor Gray
Write-Host "   3. Configurer les règles de traitement pour vos modèles existants" -ForegroundColor Gray
Write-Host "   4. Documenter les règles spécifiques à votre métier" -ForegroundColor Gray

Write-Host "`n📚 Documentation disponible:" -ForegroundColor Yellow
Write-Host "   - README-COLUMN-PROCESSING-RULES.md" -ForegroundColor Gray
Write-Host "   - create-column-processing-rules-table.sql" -ForegroundColor Gray
Write-Host "   - test-column-processing-rules.ps1" -ForegroundColor Gray

Write-Host "`n🏁 Script terminé avec succès!" -ForegroundColor Green
