# Script de correction spécifique pour USSDPART avec la clé "token"
# Ce script corrige la configuration USSDPART en utilisant la colonne "token" comme clé

Write-Host "🔧 Correction USSDPART - Clé 'token'" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Configuration de l'API
$API_BASE_URL = "http://localhost:8080/api"

# Clé correcte pour USSDPART
$ussdpartKey = "token"

Write-Host "✅ Clé USSDPART identifiée: $ussdpartKey" -ForegroundColor Green

# 1. Modèle TRXBO (Référence BO)
$trxboModel = @{
    name = "Modèle TRXBO - Référence BO"
    filePattern = "*TRXBO*.csv"
    fileType = "bo"
    autoApply = $true
    templateFile = "TRXBO.csv"
    reconciliationKeys = $null  # Pas de clés pour les modèles BO
    columnProcessingRules = @(
        @{
            sourceColumn = "Numéro Trans GU"
            targetColumn = "ID_Normalized"
            trimSpaces = $true
            removeSpecialChars = $true
        },
        @{
            sourceColumn = "montant"
            targetColumn = "Montant_Normalized"
            trimSpaces = $true
            removeSpecialChars = $true
        }
    )
}

# 2. Modèle USSDPART (Partenaire) - avec la clé "token"
$ussdpartModel = @{
    name = "Modèle USSDPART - Partenaire"
    filePattern = "*USSDPART*.csv"
    fileType = "partner"
    autoApply = $true
    templateFile = "USSDPART.csv"
    reconciliationKeys = @{
        partnerKeys = @($ussdpartKey)  # Clé USSDPART: "token"
        boKeys = @("Numéro Trans GU")  # Clé TRXBO: "Numéro Trans GU"
        boModelReferences = @()
    }
    columnProcessingRules = @(
        @{
            sourceColumn = $ussdpartKey
            targetColumn = "Token_Normalized"
            trimSpaces = $true
            removeSpecialChars = $true
        },
        @{
            sourceColumn = "Montant"
            targetColumn = "Montant_Normalized"
            trimSpaces = $true
            removeSpecialChars = $true
        }
    )
}

# 3. Modèle OPPART (Partenaire) - avec la clé "Numéro Trans GU"
$oppartModel = @{
    name = "Modèle OPPART - Partenaire"
    filePattern = "*OPPART*.csv"
    fileType = "partner"
    autoApply = $true
    templateFile = "OPPART.csv"
    reconciliationKeys = @{
        partnerKeys = @("Numéro Trans GU")  # Clé OPPART: "Numéro Trans GU"
        boKeys = @("Numéro Trans GU")       # Clé TRXBO: "Numéro Trans GU"
        boModelReferences = @()
    }
    columnProcessingRules = @(
        @{
            sourceColumn = "Numéro Trans GU"
            targetColumn = "ID_Normalized"
            trimSpaces = $true
            removeSpecialChars = $true
        }
    )
}

# Fonction pour supprimer les modèles existants
function Remove-ExistingModels {
    param($pattern)
    
    Write-Host "🧹 Suppression des modèles existants avec pattern: $pattern" -ForegroundColor Yellow
    
    try {
        $response = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models" -Method GET
        $models = if ($response.success) { $response.models } else { $response }
        
        foreach ($model in $models) {
            if ($model.filePattern -like $pattern) {
                Write-Host "  Suppression du modèle: $($model.name) ($($model.modelId))" -ForegroundColor Gray
                try {
                    Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models/$($model.modelId)" -Method DELETE
                    Write-Host "    ✅ Supprimé" -ForegroundColor Green
                } catch {
                    Write-Host "    ⚠️ Erreur lors de la suppression: $($_.Exception.Message)" -ForegroundColor Yellow
                }
            }
        }
    } catch {
        Write-Host "❌ Erreur lors de la récupération des modèles: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Fonction pour créer un modèle
function Create-Model {
    param($model, $modelName)
    
    Write-Host "📋 Création du modèle: $modelName" -ForegroundColor Yellow
    
    try {
        $body = $model | ConvertTo-Json -Depth 10
        $response = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models" -Method POST -Body $body -ContentType "application/json"
        
        if ($response.success) {
            Write-Host "✅ Modèle créé avec succès: $($response.model.modelId)" -ForegroundColor Green
            Write-Host "   Nom: $($response.model.name)" -ForegroundColor Gray
            Write-Host "   Type: $($response.model.fileType)" -ForegroundColor Gray
            Write-Host "   Pattern: $($response.model.filePattern)" -ForegroundColor Gray
            
            if ($response.model.reconciliationKeys) {
                Write-Host "   Clés Partenaire: $($response.model.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Gray
                Write-Host "   Clés BO: $($response.model.reconciliationKeys.boKeys -join ', ')" -ForegroundColor Gray
            } else {
                Write-Host "   Pas de clés de réconciliation (modèle BO)" -ForegroundColor Gray
            }
            
            return $response.model.modelId
        } else {
            Write-Host "❌ Erreur lors de la création: $($response.message)" -ForegroundColor Red
            return $null
        }
    } catch {
        Write-Host "❌ Erreur HTTP lors de la création: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Fonction pour tester la réconciliation USSDPART
function Test-USSDReconciliation {
    Write-Host "`n🧪 Test de réconciliation USSDPART avec clé 'token'..." -ForegroundColor Yellow
    
    try {
        # Créer des données de test pour USSDPART
        $testRequest = @{
            boFileContent = @(
                @{
                    "Numéro Trans GU" = "TRX001"
                    "montant" = "1000"
                    "Date" = "2024-12-01"
                },
                @{
                    "Numéro Trans GU" = "TRX002"
                    "montant" = "2000"
                    "Date" = "2024-12-01"
                }
            )
            partnerFileContent = @(
                @{
                    "token" = "TRX001"  # Correspondance avec "Numéro Trans GU"
                    "Montant" = "1000"
                    "Date" = "2024-12-01"
                },
                @{
                    "token" = "TRX002"  # Correspondance avec "Numéro Trans GU"
                    "Montant" = "2000"
                    "Date" = "2024-12-01"
                }
            )
            boKeyColumn = "Numéro Trans GU"
            partnerKeyColumn = "token"
            comparisonColumns = @(
                @{
                    boColumn = "Numéro Trans GU"
                    partnerColumn = "token"
                }
            )
            boColumnFilters = @()
        }
        
        $body = $testRequest | ConvertTo-Json -Depth 10
        
        Write-Host "📤 Envoi d'une requête de test USSDPART..." -ForegroundColor Gray
        
        $response = Invoke-RestMethod -Uri "$API_BASE_URL/reconciliation/reconcile" -Method POST -Body $body -ContentType "application/json"
        
        if ($response) {
            Write-Host "✅ Test de réconciliation USSDPART réussi" -ForegroundColor Green
            Write-Host "  Correspondances: $($response.matches.Count)" -ForegroundColor Gray
            Write-Host "  BO uniquement: $($response.boOnly.Count)" -ForegroundColor Gray
            Write-Host "  Partenaire uniquement: $($response.partnerOnly.Count)" -ForegroundColor Gray
            return $true
        } else {
            Write-Host "❌ Réponse vide du test" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Erreur lors du test: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Fonction pour tester la réconciliation OPPART
function Test-OPPARTReconciliation {
    Write-Host "`n🧪 Test de réconciliation OPPART avec clé 'Numéro Trans GU'..." -ForegroundColor Yellow
    
    try {
        # Créer des données de test pour OPPART
        $testRequest = @{
            boFileContent = @(
                @{
                    "Numéro Trans GU" = "TRX001"
                    "montant" = "1000"
                    "Date" = "2024-12-01"
                },
                @{
                    "Numéro Trans GU" = "TRX002"
                    "montant" = "2000"
                    "Date" = "2024-12-01"
                }
            )
            partnerFileContent = @(
                @{
                    "Numéro Trans GU" = "TRX001"  # Même clé que TRXBO
                    "Montant" = "1000"
                    "Date" = "2024-12-01"
                },
                @{
                    "Numéro Trans GU" = "TRX002"  # Même clé que TRXBO
                    "Montant" = "2000"
                    "Date" = "2024-12-01"
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
        
        Write-Host "📤 Envoi d'une requête de test OPPART..." -ForegroundColor Gray
        
        $response = Invoke-RestMethod -Uri "$API_BASE_URL/reconciliation/reconcile" -Method POST -Body $body -ContentType "application/json"
        
        if ($response) {
            Write-Host "✅ Test de réconciliation OPPART réussi" -ForegroundColor Green
            Write-Host "  Correspondances: $($response.matches.Count)" -ForegroundColor Gray
            Write-Host "  BO uniquement: $($response.boOnly.Count)" -ForegroundColor Gray
            Write-Host "  Partenaire uniquement: $($response.partnerOnly.Count)" -ForegroundColor Gray
            return $true
        } else {
            Write-Host "❌ Réponse vide du test" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Erreur lors du test: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Fonction pour lister les modèles
function Show-Models {
    Write-Host "`n📋 Modèles disponibles après correction:" -ForegroundColor Cyan
    
    try {
        $response = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models" -Method GET
        $models = if ($response.success) { $response.models } else { $response }
        
        Write-Host "📊 $($models.Count) modèles trouvés:" -ForegroundColor Green
        
        foreach ($model in $models) {
            Write-Host "  - $($model.name)" -ForegroundColor White
            Write-Host "    ID: $($model.modelId)" -ForegroundColor Gray
            Write-Host "    Type: $($model.fileType)" -ForegroundColor Gray
            Write-Host "    Pattern: $($model.filePattern)" -ForegroundColor Gray
            
            if ($model.reconciliationKeys) {
                Write-Host "    Clés Partenaire: $($model.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor DarkGray
                Write-Host "    Clés BO: $($model.reconciliationKeys.boKeys -join ', ')" -ForegroundColor DarkGray
            } else {
                Write-Host "    Pas de clés (modèle BO)" -ForegroundColor DarkGray
            }
            Write-Host ""
        }
    } catch {
        Write-Host "❌ Erreur lors de la récupération des modèles: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Fonction principale
function Main {
    Write-Host "🚀 Démarrage de la correction USSDPART avec clé 'token'..." -ForegroundColor Green
    
    # 1. Supprimer les modèles existants problématiques
    Write-Host "`n1️⃣ Nettoyage des modèles existants..." -ForegroundColor Yellow
    Remove-ExistingModels "*TRXBO*"
    Remove-ExistingModels "*USSDPART*"
    Remove-ExistingModels "*OPPART*"
    
    # 2. Créer le modèle TRXBO (référence BO)
    Write-Host "`n2️⃣ Création du modèle TRXBO (référence BO)..." -ForegroundColor Yellow
    $trxboId = Create-Model -model $trxboModel -modelName "TRXBO - Référence BO"
    
    # 3. Créer le modèle USSDPART (partenaire) avec clé "token"
    Write-Host "`n3️⃣ Création du modèle USSDPART (partenaire) avec clé '$ussdpartKey'..." -ForegroundColor Yellow
    $ussdpartId = Create-Model -model $ussdpartModel -modelName "USSDPART - Partenaire"
    
    # 4. Créer le modèle OPPART (partenaire) avec clé "Numéro Trans GU"
    Write-Host "`n4️⃣ Création du modèle OPPART (partenaire) avec clé 'Numéro Trans GU'..." -ForegroundColor Yellow
    $oppartId = Create-Model -model $oppartModel -modelName "OPPART - Partenaire"
    
    # 5. Tester la réconciliation USSDPART
    Write-Host "`n5️⃣ Test de réconciliation USSDPART..." -ForegroundColor Yellow
    $ussdTestSuccess = Test-USSDReconciliation
    
    # 6. Tester la réconciliation OPPART
    Write-Host "`n6️⃣ Test de réconciliation OPPART..." -ForegroundColor Yellow
    $oppartTestSuccess = Test-OPPARTReconciliation
    
    # 7. Afficher les modèles créés
    Write-Host "`n7️⃣ Vérification des modèles créés..." -ForegroundColor Yellow
    Show-Models
    
    # 8. Instructions de test
    Write-Host "`n📝 Instructions pour tester la correction:" -ForegroundColor Cyan
    Write-Host "1. Ouvrez l'application de réconciliation" -ForegroundColor White
    Write-Host "2. Allez dans le mode 'Automatique'" -ForegroundColor White
    Write-Host "3. Chargez un fichier TRXBO" -ForegroundColor White
    Write-Host "4. Chargez un fichier USSDPART" -ForegroundColor White
    Write-Host "5. Lancez la réconciliation" -ForegroundColor White
    Write-Host "6. Vérifiez les logs dans la console du navigateur" -ForegroundColor White
    Write-Host "7. Les logs devraient afficher:" -ForegroundColor White
    Write-Host "   - 'Modèle TRXBO - Référence BO' détecté pour le fichier BO" -ForegroundColor Gray
    Write-Host "   - 'Modèle USSDPART - Partenaire' détecté pour le fichier partenaire" -ForegroundColor Gray
    Write-Host "   - Clé BO: 'Numéro Trans GU'" -ForegroundColor Gray
    Write-Host "   - Clé USSDPART: '$ussdpartKey'" -ForegroundColor Gray
    
    if ($ussdTestSuccess -and $oppartTestSuccess) {
        Write-Host "`n🎉 Correction réussie ! Les clés sont maintenant correctement configurées:" -ForegroundColor Green
        Write-Host "   - USSDPART: '$ussdpartKey' ↔ TRXBO: 'Numéro Trans GU'" -ForegroundColor Gray
        Write-Host "   - OPPART: 'Numéro Trans GU' ↔ TRXBO: 'Numéro Trans GU'" -ForegroundColor Gray
    } else {
        Write-Host "`n⚠️ Correction effectuée mais certains tests ont échoué. Vérifiez la configuration." -ForegroundColor Yellow
    }
    
    Write-Host "`n✅ Correction USSDPART avec clé 'token' terminée!" -ForegroundColor Green
}

# Exécuter le script principal
Main
