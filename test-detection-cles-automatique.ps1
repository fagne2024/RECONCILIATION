# Script de test pour la détection automatique des clés de réconciliation
# Ce script teste la nouvelle fonctionnalité implémentée dans FileUploadComponent

Write-Host "🧪 Test de la détection automatique des clés de réconciliation" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

# Configuration
$API_BASE_URL = "http://localhost:8080/api"
$TEST_MODELS = @(
    @{
        name = "TRXBO Orange Money - Test"
        filePattern = "*trxbo*test*.csv"
        fileType = "bo"
        reconciliationKeys = @{
            boKeys = @("Numéro Trans GU", "IDTransaction", "Transaction ID")
            partnerKeys = @("External ID", "Transaction ID", "Référence")
        }
    },
    @{
        name = "Partner Orange Money - Test"
        filePattern = "*partner*test*.csv"
        fileType = "partner"
        reconciliationKeys = @{
            boKeys = @("Numéro Trans GU", "IDTransaction")
            partnerKeys = @("External ID", "External id", "Transaction ID")
        }
    }
)

# Fonction pour créer un modèle de test
function Create-TestModel {
    param($model)
    
    Write-Host "📋 Création du modèle: $($model.name)" -ForegroundColor Yellow
    
    $body = @{
        name = $model.name
        filePattern = $model.filePattern
        fileType = $model.fileType
        autoApply = $true
        reconciliationKeys = $model.reconciliationKeys
    } | ConvertTo-Json -Depth 3
    
    try {
        $response = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models" -Method POST -Body $body -ContentType "application/json"
        
        if ($response.success) {
            Write-Host "✅ Modèle créé avec succès: $($response.model.modelId)" -ForegroundColor Green
            return $response.model.modelId
        } else {
            Write-Host "❌ Erreur lors de la création du modèle: $($response.message)" -ForegroundColor Red
            return $null
        }
    } catch {
        Write-Host "❌ Erreur HTTP lors de la création du modèle: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Fonction pour lister les modèles existants
function Get-ExistingModels {
    Write-Host "📋 Récupération des modèles existants..." -ForegroundColor Yellow
    
    try {
        $response = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models" -Method GET
        $models = if ($response.success) { $response.models } else { $response }
        
        Write-Host "📊 $($models.Count) modèles trouvés:" -ForegroundColor Green
        foreach ($model in $models) {
            Write-Host "  - $($model.name) ($($model.modelId))" -ForegroundColor Gray
            if ($model.reconciliationKeys) {
                Write-Host "    BO Keys: $($model.reconciliationKeys.boKeys -join ', ')" -ForegroundColor DarkGray
                Write-Host "    Partner Keys: $($model.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor DarkGray
            }
        }
        
        return $models
    } catch {
        Write-Host "❌ Erreur lors de la récupération des modèles: $($_.Exception.Message)" -ForegroundColor Red
        return @()
    }
}

# Fonction pour nettoyer les modèles de test
function Remove-TestModels {
    param($modelIds)
    
    Write-Host "🧹 Nettoyage des modèles de test..." -ForegroundColor Yellow
    
    foreach ($modelId in $modelIds) {
        if ($modelId) {
            try {
                $response = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models/$modelId" -Method DELETE
                if ($response.success) {
                    Write-Host "✅ Modèle supprimé: $modelId" -ForegroundColor Green
                } else {
                    Write-Host "⚠️ Erreur lors de la suppression: $($response.message)" -ForegroundColor Yellow
                }
            } catch {
                Write-Host "⚠️ Erreur HTTP lors de la suppression: $($_.Exception.Message)" -ForegroundColor Yellow
            }
        }
    }
}

# Fonction pour tester la détection des clés
function Test-KeyDetection {
    Write-Host "🔍 Test de la détection des clés..." -ForegroundColor Yellow
    
    # Simuler des données de test
    $testBoData = @(
        @{
            "Numéro Trans GU" = "TRX001"
            "Date" = "2024-12-01"
            "Montant" = "1000"
            "Service" = "Orange Money"
        },
        @{
            "Numéro Trans GU" = "TRX002"
            "Date" = "2024-12-01"
            "Montant" = "2000"
            "Service" = "Orange Money"
        }
    )
    
    $testPartnerData = @(
        @{
            "External ID" = "EXT001"
            "Date" = "2024-12-01"
            "Montant" = "1000"
            "Status" = "Success"
        },
        @{
            "External ID" = "EXT002"
            "Date" = "2024-12-01"
            "Montant" = "2000"
            "Status" = "Success"
        }
    )
    
    Write-Host "📊 Données de test BO: $($testBoData.Count) lignes" -ForegroundColor Gray
    Write-Host "📊 Données de test Partenaire: $($testPartnerData.Count) lignes" -ForegroundColor Gray
    
    # Afficher les colonnes disponibles
    $boColumns = $testBoData[0].Keys
    $partnerColumns = $testPartnerData[0].Keys
    
    Write-Host "📋 Colonnes BO: $($boColumns -join ', ')" -ForegroundColor Gray
    Write-Host "📋 Colonnes Partenaire: $($partnerColumns -join ', ')" -ForegroundColor Gray
    
    # Simuler la détection des clés
    Write-Host "🎯 Simulation de la détection des clés..." -ForegroundColor Cyan
    
    # Test avec modèle
    Write-Host "1️⃣ Test avec modèle correspondant:" -ForegroundColor Yellow
    Write-Host "   Fichiers: trxbo_test_20241201.csv, partner_test_20241201.csv" -ForegroundColor Gray
    Write-Host "   Résultat attendu: Clés trouvées via modèle" -ForegroundColor Gray
    
    # Test sans modèle
    Write-Host "2️⃣ Test sans modèle correspondant:" -ForegroundColor Yellow
    Write-Host "   Fichiers: generic_file.csv, generic_partner.csv" -ForegroundColor Gray
    Write-Host "   Résultat attendu: Clés détectées intelligemment" -ForegroundColor Gray
    
    # Test fallback
    Write-Host "3️⃣ Test fallback:" -ForegroundColor Yellow
    Write-Host "   Fichiers: unknown.csv, unknown_partner.csv" -ForegroundColor Gray
    Write-Host "   Résultat attendu: Utilisation du fallback simple" -ForegroundColor Gray
}

# Fonction principale
function Main {
    Write-Host "🚀 Démarrage des tests..." -ForegroundColor Green
    
    # 1. Lister les modèles existants
    $existingModels = Get-ExistingModels
    
    # 2. Créer les modèles de test
    $createdModelIds = @()
    foreach ($model in $TEST_MODELS) {
        $modelId = Create-TestModel -model $model
        if ($modelId) {
            $createdModelIds += $modelId
        }
    }
    
    # 3. Vérifier que les modèles ont été créés
    Write-Host "`n📋 Vérification des modèles créés..." -ForegroundColor Yellow
    $updatedModels = Get-ExistingModels
    
    # 4. Tester la détection des clés
    Write-Host "`n🧪 Test de la détection des clés..." -ForegroundColor Yellow
    Test-KeyDetection
    
    # 5. Instructions pour tester manuellement
    Write-Host "`n📝 Instructions pour tester manuellement:" -ForegroundColor Cyan
    Write-Host "1. Ouvrez l'application de réconciliation" -ForegroundColor White
    Write-Host "2. Allez dans le mode 'Automatique'" -ForegroundColor White
    Write-Host "3. Chargez des fichiers avec les noms suivants:" -ForegroundColor White
    Write-Host "   - trxbo_test_20241201.csv (pour tester avec modèle)" -ForegroundColor Gray
    Write-Host "   - generic_file.csv (pour tester sans modèle)" -ForegroundColor Gray
    Write-Host "4. Vérifiez les logs dans la console du navigateur" -ForegroundColor White
    Write-Host "5. Les logs devraient afficher la source de détection des clés" -ForegroundColor White
    
    # 6. Nettoyer les modèles de test (optionnel)
    Write-Host "`n🧹 Voulez-vous supprimer les modèles de test? (y/N)" -ForegroundColor Yellow
    $response = Read-Host
    if ($response -eq "y" -or $response -eq "Y") {
        Remove-TestModels -modelIds $createdModelIds
    } else {
        Write-Host "📋 Les modèles de test ont été conservés pour des tests ultérieurs" -ForegroundColor Green
    }
    
    Write-Host "`n✅ Tests terminés!" -ForegroundColor Green
}

# Exécuter le script principal
Main
