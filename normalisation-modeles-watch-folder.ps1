# Script pour tester et déployer la normalisation des modèles et le chargement depuis le watch-folder

Write-Host "🚀 Test et déploiement de la normalisation des modèles" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Configuration
$apiUrl = "http://localhost:8080"
$frontendUrl = "http://localhost:4200"
$watchFolderPath = "../watch-folder"
$modelsFolderPath = "../watch-folder/models"

# Fonction pour tester la connectivité
function Test-Connectivity {
    Write-Host "`n🔍 Test de connectivité..." -ForegroundColor Yellow
    
    try {
        $response = Invoke-RestMethod -Uri "$apiUrl/api/health" -Method GET -TimeoutSec 10
        Write-Host "✅ Backend accessible: $apiUrl" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ Backend inaccessible: $apiUrl" -ForegroundColor Red
        Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Fonction pour créer le dossier watch-folder et models
function Create-WatchFolders {
    Write-Host "`n📁 Création des dossiers watch-folder..." -ForegroundColor Yellow
    
    try {
        # Créer le dossier watch-folder
        if (!(Test-Path $watchFolderPath)) {
            New-Item -ItemType Directory -Path $watchFolderPath -Force
            Write-Host "✅ Dossier watch-folder créé: $watchFolderPath" -ForegroundColor Green
        } else {
            Write-Host "✅ Dossier watch-folder existe déjà: $watchFolderPath" -ForegroundColor Green
        }
        
        # Créer le dossier models
        if (!(Test-Path $modelsFolderPath)) {
            New-Item -ItemType Directory -Path $modelsFolderPath -Force
            Write-Host "✅ Dossier models créé: $modelsFolderPath" -ForegroundColor Green
        } else {
            Write-Host "✅ Dossier models existe déjà: $modelsFolderPath" -ForegroundColor Green
        }
        
        return $true
    }
    catch {
        Write-Host "❌ Erreur lors de la création des dossiers: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Fonction pour créer des modèles d'exemple
function Create-ExampleModels {
    Write-Host "`n📄 Création des modèles d'exemple..." -ForegroundColor Yellow
    
    try {
        # Modèle TRXBO Cameroun
        $trxboModel = @{
            name = "TRXBO Cameroun"
            filePattern = ".*TRXBO.*CM.*\.(csv|xlsx?)$"
            fileType = "bo"
            autoApply = $true
            templateFile = ""
            reconciliationKeys = @{
                boKeys = @("IDTransaction", "Numéro Transaction")
                partnerKeys = @("External ID", "Transaction ID")
            }
            columnProcessingRules = @(
                @{
                    sourceColumn = "IDTransaction"
                    targetColumn = "ID Transaction"
                    formatType = "string"
                    trimSpaces = $true
                    ruleOrder = 1
                },
                @{
                    sourceColumn = "Montant"
                    targetColumn = "Montant (XAF)"
                    formatType = "numeric"
                    trimSpaces = $true
                    ruleOrder = 2
                }
            )
        }
        
        $trxboPath = "$modelsFolderPath/TRXBO_CM.json"
        $trxboModel | ConvertTo-Json -Depth 10 | Out-File -FilePath $trxboPath -Encoding UTF8
        Write-Host "✅ Modèle TRXBO Cameroun créé: $trxboPath" -ForegroundColor Green
        
        # Modèle Orange Money Cameroun
        $omModel = @{
            name = "Orange Money Cameroun"
            filePattern = ".*Orange.*Money.*CM.*\.(csv|xlsx?)$"
            fileType = "partner"
            autoApply = $true
            templateFile = ""
            reconciliationKeys = @{
                boKeys = @("IDTransaction", "Numéro Transaction")
                partnerKeys = @("External ID", "Transaction ID")
            }
            columnProcessingRules = @(
                @{
                    sourceColumn = "External ID"
                    targetColumn = "External ID"
                    formatType = "string"
                    trimSpaces = $true
                    ruleOrder = 1
                },
                @{
                    sourceColumn = "Amount"
                    targetColumn = "Montant (XAF)"
                    formatType = "numeric"
                    trimSpaces = $true
                    ruleOrder = 2
                }
            )
        }
        
        $omPath = "$modelsFolderPath/OM_CM.json"
        $omModel | ConvertTo-Json -Depth 10 | Out-File -FilePath $omPath -Encoding UTF8
        Write-Host "✅ Modèle Orange Money Cameroun créé: $omPath" -ForegroundColor Green
        
        # Modèle MTN Mobile Money Cameroun
        $mtnModel = @{
            name = "MTN Mobile Money Cameroun"
            filePattern = ".*MTN.*MOMO.*CM.*\.(csv|xlsx?)$"
            fileType = "partner"
            autoApply = $true
            templateFile = ""
            reconciliationKeys = @{
                boKeys = @("IDTransaction", "Numéro Transaction")
                partnerKeys = @("External ID", "Transaction ID")
            }
            columnProcessingRules = @(
                @{
                    sourceColumn = "External ID"
                    targetColumn = "External ID"
                    formatType = "string"
                    trimSpaces = $true
                    ruleOrder = 1
                },
                @{
                    sourceColumn = "Amount"
                    targetColumn = "Montant (XAF)"
                    formatType = "numeric"
                    trimSpaces = $true
                    ruleOrder = 2
                }
            )
        }
        
        $mtnPath = "$modelsFolderPath/MTN_CM.json"
        $mtnModel | ConvertTo-Json -Depth 10 | Out-File -FilePath $mtnPath -Encoding UTF8
        Write-Host "✅ Modèle MTN Mobile Money Cameroun créé: $mtnPath" -ForegroundColor Green
        
        return $true
    }
    catch {
        Write-Host "❌ Erreur lors de la création des modèles d'exemple: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Fonction pour tester la normalisation des modèles
function Test-ModelNormalization {
    Write-Host "`n🔧 Test de la normalisation des modèles..." -ForegroundColor Yellow
    
    try {
        $response = Invoke-RestMethod -Uri "$apiUrl/api/model-management/normalize-all" -Method POST -TimeoutSec 30
        
        if ($response.success) {
            Write-Host "✅ Normalisation réussie:" -ForegroundColor Green
            Write-Host "   Total modèles: $($response.totalModels)" -ForegroundColor White
            Write-Host "   Modèles normalisés: $($response.normalizedModels)" -ForegroundColor White
            Write-Host "   Erreurs: $($response.errors)" -ForegroundColor White
        } else {
            Write-Host "❌ Erreur lors de la normalisation" -ForegroundColor Red
        }
        
        return $response.success
    }
    catch {
        Write-Host "❌ Erreur lors du test de normalisation: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Fonction pour tester l'import depuis le watch-folder
function Test-WatchFolderImport {
    Write-Host "`n📁 Test de l'import depuis le watch-folder..." -ForegroundColor Yellow
    
    try {
        $response = Invoke-RestMethod -Uri "$apiUrl/api/model-management/import-from-watch-folder" -Method POST -TimeoutSec 30
        
        if ($response.success) {
            Write-Host "✅ Import réussi:" -ForegroundColor Green
            Write-Host "   Total modèles: $($response.totalModels)" -ForegroundColor White
            Write-Host "   Modèles importés: $($response.importedModels.Count)" -ForegroundColor White
            Write-Host "   Erreurs: $($response.errors.Count)" -ForegroundColor White
            
            if ($response.importedModels.Count -gt 0) {
                Write-Host "   Modèles importés:" -ForegroundColor White
                foreach ($model in $response.importedModels) {
                    Write-Host "     - $model" -ForegroundColor Gray
                }
            }
            
            if ($response.errors.Count -gt 0) {
                Write-Host "   Erreurs:" -ForegroundColor Red
                foreach ($error in $response.errors) {
                    Write-Host "     - $error" -ForegroundColor Red
                }
            }
        } else {
            Write-Host "❌ Erreur lors de l'import" -ForegroundColor Red
        }
        
        return $response.success
    }
    catch {
        Write-Host "❌ Erreur lors du test d'import: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Fonction pour tester le chargement depuis le watch-folder
function Test-WatchFolderLoad {
    Write-Host "`n📁 Test du chargement depuis le watch-folder..." -ForegroundColor Yellow
    
    try {
        $response = Invoke-RestMethod -Uri "$apiUrl/api/model-management/load-from-watch-folder" -Method GET -TimeoutSec 30
        
        if ($response.success) {
            Write-Host "✅ Chargement réussi:" -ForegroundColor Green
            Write-Host "   Modèles trouvés: $($response.count)" -ForegroundColor White
            
            if ($response.models.Count -gt 0) {
                Write-Host "   Modèles chargés:" -ForegroundColor White
                foreach ($model in $response.models) {
                    Write-Host "     - $($model.name) ($($model.fileType))" -ForegroundColor Gray
                }
            }
        } else {
            Write-Host "❌ Erreur lors du chargement" -ForegroundColor Red
        }
        
        return $response.success
    }
    catch {
        Write-Host "❌ Erreur lors du test de chargement: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Fonction pour démarrer la surveillance du watch-folder
function Start-WatchFolderMonitoring {
    Write-Host "`n👀 Démarrage de la surveillance du watch-folder..." -ForegroundColor Yellow
    
    try {
        $response = Invoke-RestMethod -Uri "$apiUrl/api/model-management/start-watch-folder-monitoring" -Method POST -TimeoutSec 10
        
        if ($response.success) {
            Write-Host "✅ Surveillance démarrée: $($response.message)" -ForegroundColor Green
        } else {
            Write-Host "❌ Erreur lors du démarrage de la surveillance" -ForegroundColor Red
        }
        
        return $response.success
    }
    catch {
        Write-Host "❌ Erreur lors du démarrage de la surveillance: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Fonction pour créer un modèle d'exemple via l'API
function Create-ExampleModelViaAPI {
    Write-Host "`n📄 Création d'un modèle d'exemple via l'API..." -ForegroundColor Yellow
    
    try {
        $response = Invoke-RestMethod -Uri "$apiUrl/api/model-management/create-example-model" -Method POST -TimeoutSec 10
        
        if ($response.success) {
            Write-Host "✅ Modèle d'exemple créé: $($response.message)" -ForegroundColor Green
        } else {
            Write-Host "❌ Erreur lors de la création du modèle d'exemple" -ForegroundColor Red
        }
        
        return $response.success
    }
    catch {
        Write-Host "❌ Erreur lors de la création du modèle d'exemple: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Fonction pour tester les statistiques des modèles
function Test-ModelStatistics {
    Write-Host "`n📊 Test des statistiques des modèles..." -ForegroundColor Yellow
    
    try {
        $response = Invoke-RestMethod -Uri "$apiUrl/api/model-management/statistics" -Method GET -TimeoutSec 10
        
        if ($response.success) {
            Write-Host "✅ Statistiques récupérées:" -ForegroundColor Green
            Write-Host "   Total modèles: $($response.totalModels)" -ForegroundColor White
            Write-Host "   Modèles BO: $($response.boModels)" -ForegroundColor White
            Write-Host "   Modèles Partenaire: $($response.partnerModels)" -ForegroundColor White
            Write-Host "   Modèles Both: $($response.bothModels)" -ForegroundColor White
            Write-Host "   Modèles Auto-Apply: $($response.autoApplyModels)" -ForegroundColor White
        } else {
            Write-Host "❌ Erreur lors de la récupération des statistiques" -ForegroundColor Red
        }
        
        return $response.success
    }
    catch {
        Write-Host "❌ Erreur lors du test des statistiques: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Fonction pour tester la validation d'un modèle
function Test-ModelValidation {
    Write-Host "`n🔍 Test de la validation d'un modèle..." -ForegroundColor Yellow
    
    try {
        $testModel = @{
            name = "Test Model"
            filePattern = ".*test.*\.(csv|xlsx?)$"
            fileType = "both"
            autoApply = $true
            templateFile = ""
            reconciliationKeys = @{
                boKeys = @("IDTransaction")
                partnerKeys = @("External ID")
            }
        }
        
        $response = Invoke-RestMethod -Uri "$apiUrl/api/model-management/validate" -Method POST -Body ($testModel | ConvertTo-Json -Depth 10) -ContentType "application/json" -TimeoutSec 10
        
        if ($response.success) {
            Write-Host "✅ Validation réussie:" -ForegroundColor Green
            Write-Host "   Modèle valide: $($response.isValid)" -ForegroundColor White
            Write-Host "   Message: $($response.message)" -ForegroundColor White
        } else {
            Write-Host "❌ Erreur lors de la validation" -ForegroundColor Red
        }
        
        return $response.success
    }
    catch {
        Write-Host "❌ Erreur lors du test de validation: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Fonction pour afficher les améliorations
function Show-Improvements {
    Write-Host "`n✨ Nouvelles fonctionnalités ajoutées:" -ForegroundColor Cyan
    Write-Host "=====================================" -ForegroundColor Cyan
    
    Write-Host "1. 🔧 Normalisation automatique des modèles:" -ForegroundColor White
    Write-Host "   - Noms de modèles normalisés" -ForegroundColor Gray
    Write-Host "   - Patterns de fichiers optimisés" -ForegroundColor Gray
    Write-Host "   - Clés de réconciliation standardisées" -ForegroundColor Gray
    Write-Host "   - Règles de traitement des colonnes normalisées" -ForegroundColor Gray
    
    Write-Host "`n2. 📁 Chargement depuis le watch-folder:" -ForegroundColor White
    Write-Host "   - Import automatique de modèles JSON" -ForegroundColor Gray
    Write-Host "   - Surveillance en temps réel" -ForegroundColor Gray
    Write-Host "   - Validation automatique" -ForegroundColor Gray
    Write-Host "   - Mise à jour automatique" -ForegroundColor Gray
    
    Write-Host "`n3. 🎯 Gestion intelligente des modèles:" -ForegroundColor White
    Write-Host "   - Génération automatique d'IDs" -ForegroundColor Gray
    Write-Host "   - Validation des modèles" -ForegroundColor Gray
    Write-Host "   - Statistiques détaillées" -ForegroundColor Gray
    Write-Host "   - Mapping des noms courants" -ForegroundColor Gray
    
    Write-Host "`n4. 🔄 API REST complète:" -ForegroundColor White
    Write-Host "   - Endpoints de normalisation" -ForegroundColor Gray
    Write-Host "   - Endpoints d'import/export" -ForegroundColor Gray
    Write-Host "   - Endpoints de surveillance" -ForegroundColor Gray
    Write-Host "   - Endpoints de validation" -ForegroundColor Gray
}

# Exécution des tests
Write-Host "`n🚀 Démarrage des tests..." -ForegroundColor Green

$backendAccessible = Test-Connectivity

if ($backendAccessible) {
    # Créer les dossiers
    $foldersCreated = Create-WatchFolders
    
    if ($foldersCreated) {
        # Créer les modèles d'exemple
        $modelsCreated = Create-ExampleModels
        
        if ($modelsCreated) {
            # Tester la normalisation
            Test-ModelNormalization
            
            # Tester l'import depuis le watch-folder
            Test-WatchFolderImport
            
            # Tester le chargement depuis le watch-folder
            Test-WatchFolderLoad
            
            # Démarrer la surveillance
            Start-WatchFolderMonitoring
            
            # Créer un modèle d'exemple via l'API
            Create-ExampleModelViaAPI
            
            # Tester les statistiques
            Test-ModelStatistics
            
            # Tester la validation
            Test-ModelValidation
        }
    }
} else {
    Write-Host "`n⚠️ Impossible de tester les fonctionnalités backend" -ForegroundColor Yellow
}

# Afficher les améliorations
Show-Improvements

Write-Host "`n✅ Tests terminés!" -ForegroundColor Green
Write-Host "`n📝 Prochaines étapes:" -ForegroundColor Cyan
Write-Host "1. Vérifier que les modèles sont bien importés" -ForegroundColor White
Write-Host "2. Tester la normalisation avec vos modèles existants" -ForegroundColor White
Write-Host "3. Ajouter de nouveaux modèles dans le dossier watch-folder/models" -ForegroundColor White
Write-Host "4. Vérifier que la surveillance fonctionne correctement" -ForegroundColor White

Write-Host "`n🌐 URLs d'accès:" -ForegroundColor Cyan
Write-Host "   Frontend: $frontendUrl" -ForegroundColor White
Write-Host "   Backend:  $apiUrl" -ForegroundColor White
Write-Host "   Watch-folder: $watchFolderPath" -ForegroundColor White
Write-Host "   Models folder: $modelsFolderPath" -ForegroundColor White
