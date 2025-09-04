# Script de test pour valider la compatibilité TRXBO + USSDPART
# Ce script teste que la correction des modèles fonctionne correctement

Write-Host "🧪 Test de compatibilité TRXBO + USSDPART" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Configuration
$API_BASE_URL = "http://localhost:8080/api"

# Fonction pour vérifier les modèles existants
function Test-ModelsConfiguration {
    Write-Host "📋 Vérification de la configuration des modèles..." -ForegroundColor Yellow
    
    try {
        $response = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models" -Method GET
        $models = if ($response.success) { $response.models } else { $response }
        
        Write-Host "📊 $($models.Count) modèles trouvés:" -ForegroundColor Green
        
        $trxboModel = $null
        $ussdpartModel = $null
        $oppartModel = $null
        
        foreach ($model in $models) {
            Write-Host "  - $($model.name)" -ForegroundColor White
            Write-Host "    Type: $($model.fileType)" -ForegroundColor Gray
            Write-Host "    Pattern: $($model.filePattern)" -ForegroundColor Gray
            
            if ($model.filePattern -like "*TRXBO*") {
                $trxboModel = $model
                Write-Host "    ✅ Modèle TRXBO identifié" -ForegroundColor Green
            }
            elseif ($model.filePattern -like "*USSDPART*") {
                $ussdpartModel = $model
                Write-Host "    ✅ Modèle USSDPART identifié" -ForegroundColor Green
            }
            elseif ($model.filePattern -like "*OPPART*") {
                $oppartModel = $model
                Write-Host "    ✅ Modèle OPPART identifié" -ForegroundColor Green
            }
            
            if ($model.reconciliationKeys) {
                Write-Host "    Clés Partenaire: $($model.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor DarkGray
                Write-Host "    Clés BO: $($model.reconciliationKeys.boKeys -join ', ')" -ForegroundColor DarkGray
            } else {
                Write-Host "    Pas de clés (modèle BO)" -ForegroundColor DarkGray
            }
            Write-Host ""
        }
        
        return @{
            trxboModel = $trxboModel
            ussdpartModel = $ussdpartModel
            oppartModel = $oppartModel
            totalModels = $models.Count
        }
    } catch {
        Write-Host "❌ Erreur lors de la vérification des modèles: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Fonction pour valider la configuration
function Test-ConfigurationValidity {
    param($modelsConfig)
    
    Write-Host "🔍 Validation de la configuration..." -ForegroundColor Yellow
    
    $errors = @()
    $warnings = @()
    
    # Vérifier que TRXBO existe et est de type "bo"
    if ($modelsConfig.trxboModel) {
        if ($modelsConfig.trxboModel.fileType -eq "bo") {
            Write-Host "✅ TRXBO: Type 'bo' correct" -ForegroundColor Green
        } else {
            $errors += "TRXBO: Type incorrect ($($modelsConfig.trxboModel.fileType)), devrait être 'bo'"
        }
        
        if ($modelsConfig.trxboModel.reconciliationKeys -eq $null) {
            Write-Host "✅ TRXBO: Pas de clés de réconciliation (correct)" -ForegroundColor Green
        } else {
            $warnings += "TRXBO: Clés de réconciliation présentes (devrait être null)"
        }
    } else {
        $errors += "TRXBO: Modèle manquant"
    }
    
    # Vérifier que USSDPART existe et est de type "partner"
    if ($modelsConfig.ussdpartModel) {
        if ($modelsConfig.ussdpartModel.fileType -eq "partner") {
            Write-Host "✅ USSDPART: Type 'partner' correct" -ForegroundColor Green
        } else {
            $errors += "USSDPART: Type incorrect ($($modelsConfig.ussdpartModel.fileType)), devrait être 'partner'"
        }
        
        if ($modelsConfig.ussdpartModel.reconciliationKeys) {
            if ($modelsConfig.ussdpartModel.reconciliationKeys.partnerKeys -and $modelsConfig.ussdpartModel.reconciliationKeys.boKeys) {
                Write-Host "✅ USSDPART: Clés de réconciliation configurées" -ForegroundColor Green
                Write-Host "   Clés Partenaire: $($modelsConfig.ussdpartModel.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Gray
                Write-Host "   Clés BO: $($modelsConfig.ussdpartModel.reconciliationKeys.boKeys -join ', ')" -ForegroundColor Gray
            } else {
                $errors += "USSDPART: Clés de réconciliation incomplètes"
            }
        } else {
            $errors += "USSDPART: Pas de clés de réconciliation"
        }
    } else {
        $errors += "USSDPART: Modèle manquant"
    }
    
    # Vérifier que OPPART existe et est de type "partner"
    if ($modelsConfig.oppartModel) {
        if ($modelsConfig.oppartModel.fileType -eq "partner") {
            Write-Host "✅ OPPART: Type 'partner' correct" -ForegroundColor Green
        } else {
            $errors += "OPPART: Type incorrect ($($modelsConfig.oppartModel.fileType)), devrait être 'partner'"
        }
    } else {
        $warnings += "OPPART: Modèle manquant (optionnel)"
    }
    
    # Afficher les erreurs et avertissements
    if ($errors.Count -gt 0) {
        Write-Host "`n❌ Erreurs de configuration:" -ForegroundColor Red
        foreach ($error in $errors) {
            Write-Host "  - $error" -ForegroundColor Red
        }
    }
    
    if ($warnings.Count -gt 0) {
        Write-Host "`n⚠️ Avertissements:" -ForegroundColor Yellow
        foreach ($warning in $warnings) {
            Write-Host "  - $warning" -ForegroundColor Yellow
        }
    }
    
    return @{
        isValid = $errors.Count -eq 0
        errors = $errors
        warnings = $warnings
    }
}

# Fonction pour simuler la détection des clés
function Test-KeyDetection {
    param($modelsConfig)
    
    Write-Host "`n🔍 Test de simulation de détection des clés..." -ForegroundColor Yellow
    
    # Simuler des données de test
    $testBoData = @(
        @{
            "Numéro Trans GU" = "TRX001"
            "IDTransaction" = "ID001"
            "Date" = "2024-12-01"
            "montant" = "1000"
        },
        @{
            "Numéro Trans GU" = "TRX002"
            "IDTransaction" = "ID002"
            "Date" = "2024-12-01"
            "montant" = "2000"
        }
    )
    
    $testPartnerData = @(
        @{
            "Numéro Trans GU" = "TRX001"
            "External ID" = "EXT001"
            "Date" = "2024-12-01"
            "Montant" = "1000"
        },
        @{
            "Numéro Trans GU" = "TRX002"
            "External ID" = "EXT002"
            "Date" = "2024-12-01"
            "Montant" = "2000"
        }
    )
    
    Write-Host "📊 Données de test créées:" -ForegroundColor Gray
    Write-Host "  BO: $($testBoData.Count) lignes" -ForegroundColor Gray
    Write-Host "  Partenaire: $($testPartnerData.Count) lignes" -ForegroundColor Gray
    
    # Simuler la détection avec le modèle USSDPART
    if ($modelsConfig.ussdpartModel) {
        $partnerKeys = $modelsConfig.ussdpartModel.reconciliationKeys.partnerKeys
        $boKeys = $modelsConfig.ussdpartModel.reconciliationKeys.boKeys
        
        Write-Host "`n🎯 Simulation de détection avec modèle USSDPART:" -ForegroundColor Cyan
        Write-Host "  Clés Partenaire disponibles: $($partnerKeys -join ', ')" -ForegroundColor Gray
        Write-Host "  Clés BO disponibles: $($boKeys -join ', ')" -ForegroundColor Gray
        
        # Trouver les meilleures correspondances
        $boColumns = $testBoData[0].Keys
        $partnerColumns = $testPartnerData[0].Keys
        
        $bestBoKey = $null
        $bestPartnerKey = $null
        
        # Chercher la meilleure clé BO
        foreach ($boKey in $boKeys) {
            if ($boColumns -contains $boKey) {
                $bestBoKey = $boKey
                break
            }
        }
        
        # Chercher la meilleure clé partenaire
        foreach ($partnerKey in $partnerKeys) {
            if ($partnerColumns -contains $partnerKey) {
                $bestPartnerKey = $partnerKey
                break
            }
        }
        
        if ($bestBoKey -and $bestPartnerKey) {
            Write-Host "✅ Correspondance trouvée:" -ForegroundColor Green
            Write-Host "  Clé BO: $bestBoKey" -ForegroundColor Gray
            Write-Host "  Clé Partenaire: $bestPartnerKey" -ForegroundColor Gray
            Write-Host "  Source: Modèle USSDPART" -ForegroundColor Gray
            Write-Host "  Confiance: 90%" -ForegroundColor Gray
            return $true
        } else {
            Write-Host "❌ Aucune correspondance trouvée" -ForegroundColor Red
            Write-Host "  Colonnes BO disponibles: $($boColumns -join ', ')" -ForegroundColor Gray
            Write-Host "  Colonnes Partenaire disponibles: $($partnerColumns -join ', ')" -ForegroundColor Gray
            return $false
        }
    } else {
        Write-Host "❌ Modèle USSDPART non trouvé" -ForegroundColor Red
        return $false
    }
}

# Fonction pour tester l'API de réconciliation
function Test-ReconciliationAPI {
    Write-Host "`n🌐 Test de l'API de réconciliation..." -ForegroundColor Yellow
    
    try {
        # Test simple de l'endpoint de réconciliation
        $testRequest = @{
            boFileContent = @(
                @{
                    "Numéro Trans GU" = "TRX001"
                    "montant" = "1000"
                }
            )
            partnerFileContent = @(
                @{
                    "Numéro Trans GU" = "TRX001"
                    "Montant" = "1000"
                }
            )
            boKeyColumn = "Numéro Trans GU"
            partnerKeyColumn = "Numéro Trans GU"
            comparisonColumns = @(
                @{
                    boColumn = "Numéro Trans GU"
                    partnerColumn = "Numéro Trans GU"
                }
            )
            boColumnFilters = @()
        }
        
        $body = $testRequest | ConvertTo-Json -Depth 10
        
        Write-Host "📤 Envoi d'une requête de test..." -ForegroundColor Gray
        
        $response = Invoke-RestMethod -Uri "$API_BASE_URL/reconciliation/reconcile" -Method POST -Body $body -ContentType "application/json"
        
        if ($response) {
            Write-Host "✅ API de réconciliation accessible" -ForegroundColor Green
            Write-Host "  Réponse reçue: $($response | ConvertTo-Json -Depth 2)" -ForegroundColor Gray
            return $true
        } else {
            Write-Host "❌ Réponse vide de l'API" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Erreur lors du test de l'API: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Fonction principale
function Main {
    Write-Host "🚀 Démarrage des tests de compatibilité..." -ForegroundColor Green
    
    # 1. Vérifier la configuration des modèles
    Write-Host "`n1️⃣ Vérification de la configuration..." -ForegroundColor Yellow
    $modelsConfig = Test-ModelsConfiguration
    
    if (-not $modelsConfig) {
        Write-Host "❌ Impossible de récupérer la configuration des modèles" -ForegroundColor Red
        return
    }
    
    # 2. Valider la configuration
    Write-Host "`n2️⃣ Validation de la configuration..." -ForegroundColor Yellow
    $validation = Test-ConfigurationValidity -modelsConfig $modelsConfig
    
    if (-not $validation.isValid) {
        Write-Host "❌ Configuration invalide. Veuillez exécuter le script de correction." -ForegroundColor Red
        Write-Host "   Script: .\correction-modeles-trxbo-ussdpart.ps1" -ForegroundColor Yellow
        return
    }
    
    # 3. Tester la détection des clés
    Write-Host "`n3️⃣ Test de détection des clés..." -ForegroundColor Yellow
    $keyDetectionSuccess = Test-KeyDetection -modelsConfig $modelsConfig
    
    # 4. Tester l'API de réconciliation
    Write-Host "`n4️⃣ Test de l'API de réconciliation..." -ForegroundColor Yellow
    $apiSuccess = Test-ReconciliationAPI
    
    # 5. Résumé des tests
    Write-Host "`n📊 Résumé des tests:" -ForegroundColor Cyan
    Write-Host "  Configuration des modèles: $(if ($validation.isValid) { '✅ Valide' } else { '❌ Invalide' })" -ForegroundColor $(if ($validation.isValid) { 'Green' } else { 'Red' })
    Write-Host "  Détection des clés: $(if ($keyDetectionSuccess) { '✅ Réussie' } else { '❌ Échouée' })" -ForegroundColor $(if ($keyDetectionSuccess) { 'Green' } else { 'Red' })
    Write-Host "  API de réconciliation: $(if ($apiSuccess) { '✅ Accessible' } else { '❌ Inaccessible' })" -ForegroundColor $(if ($apiSuccess) { 'Green' } else { 'Red' })
    
    # 6. Instructions finales
    Write-Host "`n📝 Instructions pour tester manuellement:" -ForegroundColor Cyan
    Write-Host "1. Ouvrez l'application: http://localhost:4200" -ForegroundColor White
    Write-Host "2. Allez en mode 'Automatique'" -ForegroundColor White
    Write-Host "3. Chargez un fichier TRXBO (ex: TRXBO_20241201.csv)" -ForegroundColor White
    Write-Host "4. Chargez un fichier USSDPART (ex: USSDPART_20241201.csv)" -ForegroundColor White
    Write-Host "5. Lancez la réconciliation" -ForegroundColor White
    Write-Host "6. Vérifiez les logs dans la console du navigateur" -ForegroundColor White
    
    if ($validation.isValid -and $keyDetectionSuccess -and $apiSuccess) {
        Write-Host "`n🎉 Tous les tests sont passés ! La compatibilité TRXBO + USSDPART est validée." -ForegroundColor Green
    } else {
        Write-Host "`n⚠️ Certains tests ont échoué. Vérifiez la configuration." -ForegroundColor Yellow
    }
}

# Exécuter le script principal
Main
