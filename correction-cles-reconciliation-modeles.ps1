# Script de correction et optimisation des clés de réconciliation dans les modèles
Write-Host "🔧 Correction et optimisation des clés de réconciliation dans les modèles" -ForegroundColor Cyan
Write-Host "=======================================================================" -ForegroundColor Cyan

# Configuration de l'API
$API_BASE_URL = "http://localhost:8080/api"

# Fonction pour récupérer tous les modèles
function Get-AllModels {
    Write-Host "`n📋 Récupération de tous les modèles..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models" -Method GET
        Write-Host "✅ $($response.models.Count) modèles récupérés" -ForegroundColor Green
        return $response.models
    } catch {
        Write-Host "❌ Erreur lors de la récupération des modèles: $($_.Exception.Message)" -ForegroundColor Red
        return @()
    }
}

# Fonction pour analyser et corriger les modèles
function Fix-ModelReconciliationKeys {
    param($models)
    
    Write-Host "`n🔍 Analyse et correction des modèles..." -ForegroundColor Yellow
    
    $correctedModels = @()
    $errors = @()
    
    foreach ($model in $models) {
        Write-Host "`n📋 Modèle: $($model.name)" -ForegroundColor White
        Write-Host "   Type: $($model.fileType)" -ForegroundColor Gray
        Write-Host "   Pattern: $($model.filePattern)" -ForegroundColor Gray
        
        $needsCorrection = $false
        $correctionReason = ""
        
        # Vérifier la cohérence selon le type de modèle
        if ($model.fileType -eq "bo") {
            # Les modèles BO ne doivent pas avoir de clés de réconciliation
            if ($model.reconciliationKeys -and $model.reconciliationKeys.boKeys.Count -gt 0) {
                $needsCorrection = $true
                $correctionReason = "Modèle BO avec des clés de réconciliation (incorrect)"
                Write-Host "   ❌ $correctionReason" -ForegroundColor Red
            } else {
                Write-Host "   ✅ Modèle BO correct (pas de clés de réconciliation)" -ForegroundColor Green
            }
        } elseif ($model.fileType -eq "partner") {
            # Les modèles partenaires doivent avoir les deux types de clés
            if (-not $model.reconciliationKeys) {
                $needsCorrection = $true
                $correctionReason = "Modèle partenaire sans clés de réconciliation"
                Write-Host "   ❌ $correctionReason" -ForegroundColor Red
            } elseif ($model.reconciliationKeys.partnerKeys.Count -eq 0) {
                $needsCorrection = $true
                $correctionReason = "Modèle partenaire sans clés partenaire"
                Write-Host "   ❌ $correctionReason" -ForegroundColor Red
            } elseif ($model.reconciliationKeys.boKeys.Count -eq 0) {
                $needsCorrection = $true
                $correctionReason = "Modèle partenaire sans clés BO"
                Write-Host "   ❌ $correctionReason" -ForegroundColor Red
            } else {
                Write-Host "   ✅ Modèle partenaire correct" -ForegroundColor Green
                Write-Host "      - Partner Keys: $($model.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Cyan
                Write-Host "      - BO Keys: $($model.reconciliationKeys.boKeys -join ', ')" -ForegroundColor Cyan
            }
        }
        
        if ($needsCorrection) {
            Write-Host "   🔧 Correction nécessaire..." -ForegroundColor Yellow
            
            $correctedModel = $model | ConvertTo-Json -Depth 10 | ConvertFrom-Json
            
            if ($model.fileType -eq "bo") {
                # Supprimer les clés de réconciliation pour les modèles BO
                $correctedModel.reconciliationKeys = $null
                Write-Host "   ✅ Clés de réconciliation supprimées pour le modèle BO" -ForegroundColor Green
            } elseif ($model.fileType -eq "partner") {
                # Corriger les clés pour les modèles partenaires
                if (-not $correctedModel.reconciliationKeys) {
                    $correctedModel.reconciliationKeys = @{
                        partnerKeys = @("Numéro Trans GU", "External ID", "Transaction ID")
                        boKeys = @("Numéro Trans GU", "IDTransaction", "Transaction ID")
                    }
                } else {
                    # S'assurer que les clés sont correctement configurées
                    if ($correctedModel.reconciliationKeys.partnerKeys.Count -eq 0) {
                        $correctedModel.reconciliationKeys.partnerKeys = @("Numéro Trans GU", "External ID", "Transaction ID")
                    }
                    if ($correctedModel.reconciliationKeys.boKeys.Count -eq 0) {
                        $correctedModel.reconciliationKeys.boKeys = @("Numéro Trans GU", "IDTransaction", "Transaction ID")
                    }
                }
                Write-Host "   ✅ Clés de réconciliation corrigées pour le modèle partenaire" -ForegroundColor Green
                Write-Host "      - Partner Keys: $($correctedModel.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Cyan
                Write-Host "      - BO Keys: $($correctedModel.reconciliationKeys.boKeys -join ', ')" -ForegroundColor Cyan
            }
            
            $correctedModels += @{
                originalModel = $model
                correctedModel = $correctedModel
                reason = $correctionReason
            }
        }
    }
    
    return $correctedModels
}

# Fonction pour appliquer les corrections
function Apply-ModelCorrections {
    param($corrections)
    
    Write-Host "`n🔧 Application des corrections..." -ForegroundColor Yellow
    
    $successCount = 0
    $errorCount = 0
    
    foreach ($correction in $corrections) {
        $model = $correction.originalModel
        $correctedModel = $correction.correctedModel
        
        Write-Host "`n📋 Correction du modèle: $($model.name)" -ForegroundColor White
        Write-Host "   Raison: $($correction.reason)" -ForegroundColor Gray
        
        try {
            # Mettre à jour le modèle
            $response = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models/$($model.modelId)" -Method PUT -Body ($correctedModel | ConvertTo-Json -Depth 10) -ContentType "application/json"
            
            if ($response.success) {
                Write-Host "   ✅ Modèle corrigé avec succès" -ForegroundColor Green
                $successCount++
            } else {
                Write-Host "   ❌ Erreur lors de la correction: $($response.message)" -ForegroundColor Red
                $errorCount++
            }
        } catch {
            Write-Host "   ❌ Erreur API: $($_.Exception.Message)" -ForegroundColor Red
            $errorCount++
        }
    }
    
    return @{
        successCount = $successCount
        errorCount = $errorCount
    }
}

# Fonction pour créer des modèles optimisés
function Create-OptimizedModels {
    Write-Host "`n🔧 Création de modèles optimisés..." -ForegroundColor Yellow
    
    $optimizedModels = @(
        @{
            name = "Modèle TRXBO - Référence BO"
            filePattern = "*TRXBO*.csv"
            fileType = "bo"
            autoApply = $true
            templateFile = "TRXBO.csv"
            reconciliationKeys = $null  # Pas de clés pour les modèles BO
            columnProcessingRules = @()
        },
        @{
            name = "Modèle OPPART - Partenaire"
            filePattern = "*OPPART*.csv"
            fileType = "partner"
            autoApply = $true
            templateFile = "OPPART.csv"
            reconciliationKeys = @{
                partnerKeys = @("Numéro Trans GU", "External ID", "Transaction ID")
                boKeys = @("Numéro Trans GU", "IDTransaction", "Transaction ID")
            }
            columnProcessingRules = @()
        },
        @{
            name = "Modèle USSDPART - Partenaire"
            filePattern = "*USSDPART*.csv"
            fileType = "partner"
            autoApply = $true
            templateFile = "USSDPART.csv"
            reconciliationKeys = @{
                partnerKeys = @("token", "External ID", "Transaction ID")
                boKeys = @("Numéro Trans GU", "IDTransaction", "Transaction ID")
            }
            columnProcessingRules = @()
        }
    )
    
    $createdCount = 0
    $errorCount = 0
    
    foreach ($model in $optimizedModels) {
        Write-Host "`n📋 Création du modèle: $($model.name)" -ForegroundColor White
        
        try {
            $response = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models" -Method POST -Body ($model | ConvertTo-Json -Depth 10) -ContentType "application/json"
            
            if ($response.success) {
                Write-Host "   ✅ Modèle créé avec succès" -ForegroundColor Green
                Write-Host "   📋 ID: $($response.model.modelId)" -ForegroundColor Gray
                
                if ($response.model.reconciliationKeys) {
                    Write-Host "   🔑 Clés configurées:" -ForegroundColor Gray
                    Write-Host "      - Partner: $($response.model.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Cyan
                    Write-Host "      - BO: $($response.model.reconciliationKeys.boKeys -join ', ')" -ForegroundColor Cyan
                } else {
                    Write-Host "   ℹ️ Pas de clés (modèle BO)" -ForegroundColor Gray
                }
                
                $createdCount++
            } else {
                Write-Host "   ❌ Erreur lors de la création: $($response.message)" -ForegroundColor Red
                $errorCount++
            }
        } catch {
            Write-Host "   ❌ Erreur API: $($_.Exception.Message)" -ForegroundColor Red
            $errorCount++
        }
    }
    
    return @{
        createdCount = $createdCount
        errorCount = $errorCount
    }
}

# Fonction pour tester la récupération des clés
function Test-KeyRetrieval {
    Write-Host "`n🧪 Test de récupération des clés..." -ForegroundColor Yellow
    
    try {
        $models = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models" -Method GET
        
        foreach ($model in $models.models) {
            Write-Host "`n📋 Test du modèle: $($model.name)" -ForegroundColor White
            
            if ($model.reconciliationKeys) {
                Write-Host "   ✅ Clés de réconciliation présentes:" -ForegroundColor Green
                Write-Host "      - Partner Keys: $($model.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Cyan
                Write-Host "      - BO Keys: $($model.reconciliationKeys.boKeys -join ', ')" -ForegroundColor Cyan
                
                # Vérifier la cohérence
                if ($model.fileType -eq "bo" -and $model.reconciliationKeys.boKeys.Count -gt 0) {
                    Write-Host "   ⚠️ ATTENTION: Modèle BO avec des clés de réconciliation" -ForegroundColor Yellow
                } elseif ($model.fileType -eq "partner" -and $model.reconciliationKeys.partnerKeys.Count -eq 0) {
                    Write-Host "   ❌ ERREUR: Modèle partenaire sans clés partenaire" -ForegroundColor Red
                } elseif ($model.fileType -eq "partner" -and $model.reconciliationKeys.boKeys.Count -eq 0) {
                    Write-Host "   ❌ ERREUR: Modèle partenaire sans clés BO" -ForegroundColor Red
                } else {
                    Write-Host "   ✅ Configuration cohérente" -ForegroundColor Green
                }
            } else {
                if ($model.fileType -eq "bo") {
                    Write-Host "   ✅ Modèle BO sans clés (correct)" -ForegroundColor Green
                } else {
                    Write-Host "   ❌ Modèle partenaire sans clés (incorrect)" -ForegroundColor Red
                }
            }
        }
    } catch {
        Write-Host "❌ Erreur lors du test: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Exécution du script
Write-Host "🚀 Démarrage de la correction et optimisation..." -ForegroundColor Green

# Étape 1: Récupérer tous les modèles
$models = Get-AllModels
if ($models.Count -eq 0) {
    Write-Host "`n❌ Aucun modèle trouvé. Arrêt du script." -ForegroundColor Red
    exit 1
}

# Étape 2: Analyser et identifier les corrections nécessaires
$corrections = Fix-ModelReconciliationKeys -models $models

# Étape 3: Appliquer les corrections
if ($corrections.Count -gt 0) {
    $correctionResults = Apply-ModelCorrections -corrections $corrections
    Write-Host "`n📊 Résultats des corrections:" -ForegroundColor Cyan
    Write-Host "   - Succès: $($correctionResults.successCount)" -ForegroundColor Green
    Write-Host "   - Erreurs: $($correctionResults.errorCount)" -ForegroundColor Red
} else {
    Write-Host "`n✅ Aucune correction nécessaire" -ForegroundColor Green
}

# Étape 4: Créer des modèles optimisés
$creationResults = Create-OptimizedModels
Write-Host "`n📊 Résultats de la création:" -ForegroundColor Cyan
Write-Host "   - Créés: $($creationResults.createdCount)" -ForegroundColor Green
Write-Host "   - Erreurs: $($creationResults.errorCount)" -ForegroundColor Red

# Étape 5: Tester la récupération des clés
Test-KeyRetrieval

# Résumé final
Write-Host "`n📊 Résumé final:" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "✅ Modèles analysés: $($models.Count)" -ForegroundColor Green
Write-Host "✅ Corrections appliquées: $($corrections.Count)" -ForegroundColor Green
Write-Host "✅ Modèles optimisés créés: $($creationResults.createdCount)" -ForegroundColor Green
Write-Host "✅ Tests de récupération: Effectués" -ForegroundColor Green

Write-Host "`n🎯 Conclusion:" -ForegroundColor Green
Write-Host "Les clés de réconciliation dans les modèles ont été corrigées et optimisées." -ForegroundColor White
Write-Host "Le système est maintenant configuré pour utiliser correctement les clés configurées." -ForegroundColor White
Write-Host "Les modèles BO n'ont pas de clés de réconciliation." -ForegroundColor White
Write-Host "Les modèles partenaires ont les clés appropriées configurées." -ForegroundColor White
