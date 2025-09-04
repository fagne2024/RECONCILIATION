# Script de correction automatique des clés TRXBO et USSDPART
# Ce script corrige la configuration avec la bonne clé identifiée

Write-Host "🔧 Correction automatique des clés TRXBO et USSDPART" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Configuration de l'API
$API_BASE_URL = "http://localhost:8080/api"

# Demander la clé correcte
Write-Host "`n🔑 Veuillez fournir la clé correcte identifiée:" -ForegroundColor Yellow
$correctKey = Read-Host "Clé de réconciliation (ex: ID, Transaction ID, etc.)"

if (-not $correctKey) {
    Write-Host "❌ Aucune clé fournie. Arrêt du script." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Clé sélectionnée: $correctKey" -ForegroundColor Green

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
            sourceColumn = $correctKey
            targetColumn = "ID_Normalized"
            trimSpaces = $true
            removeSpecialChars = $true
        }
    )
}

# 2. Modèle USSDPART (Partenaire)
$ussdpartModel = @{
    name = "Modèle USSDPART - Partenaire"
    filePattern = "*USSDPART*.csv"
    fileType = "partner"
    autoApply = $true
    templateFile = "USSDPART.csv"
    reconciliationKeys = @{
        partnerKeys = @($correctKey)
        boKeys = @($correctKey)
        boModelReferences = @()
    }
    columnProcessingRules = @(
        @{
            sourceColumn = $correctKey
            targetColumn = "ID_Normalized"
            trimSpaces = $true
            removeSpecialChars = $true
        }
    )
}

# 3. Modèle OPPART (Partenaire) - avec la même clé
$oppartModel = @{
    name = "Modèle OPPART - Partenaire"
    filePattern = "*OPPART*.csv"
    fileType = "partner"
    autoApply = $true
    templateFile = "OPPART.csv"
    reconciliationKeys = @{
        partnerKeys = @($correctKey)
        boKeys = @($correctKey)
        boModelReferences = @()
    }
    columnProcessingRules = @(
        @{
            sourceColumn = $correctKey
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

# Fonction pour tester la réconciliation
function Test-Reconciliation {
    param($testKey)
    
    Write-Host "`n🧪 Test de réconciliation avec la clé: $testKey" -ForegroundColor Yellow
    
    try {
        # Créer des données de test
        $testRequest = @{
            boFileContent = @(
                @{
                    $testKey = "TEST001"
                    "Date" = "2024-12-01"
                    "Montant" = "1000"
                },
                @{
                    $testKey = "TEST002"
                    "Date" = "2024-12-01"
                    "Montant" = "2000"
                }
            )
            partnerFileContent = @(
                @{
                    $testKey = "TEST001"
                    "Date" = "2024-12-01"
                    "Montant" = "1000"
                },
                @{
                    $testKey = "TEST002"
                    "Date" = "2024-12-01"
                    "Montant" = "2000"
                }
            )
            boKeyColumn = $testKey
            partnerKeyColumn = $testKey
            comparisonColumns = @(
                @{
                    boColumn = $testKey
                    partnerColumn = $testKey
                }
            )
            boColumnFilters = @()
        }
        
        $body = $testRequest | ConvertTo-Json -Depth 10
        
        Write-Host "📤 Envoi d'une requête de test..." -ForegroundColor Gray
        
        $response = Invoke-RestMethod -Uri "$API_BASE_URL/reconciliation/reconcile" -Method POST -Body $body -ContentType "application/json"
        
        if ($response) {
            Write-Host "✅ Test de réconciliation réussi" -ForegroundColor Green
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
    Write-Host "🚀 Démarrage de la correction automatique..." -ForegroundColor Green
    
    # 1. Supprimer les modèles existants problématiques
    Write-Host "`n1️⃣ Nettoyage des modèles existants..." -ForegroundColor Yellow
    Remove-ExistingModels "*TRXBO*"
    Remove-ExistingModels "*USSDPART*"
    Remove-ExistingModels "*OPPART*"
    
    # 2. Créer le modèle TRXBO (référence BO)
    Write-Host "`n2️⃣ Création du modèle TRXBO (référence BO)..." -ForegroundColor Yellow
    $trxboId = Create-Model -model $trxboModel -modelName "TRXBO - Référence BO"
    
    # 3. Créer le modèle USSDPART (partenaire)
    Write-Host "`n3️⃣ Création du modèle USSDPART (partenaire)..." -ForegroundColor Yellow
    $ussdpartId = Create-Model -model $ussdpartModel -modelName "USSDPART - Partenaire"
    
    # 4. Créer le modèle OPPART (partenaire)
    Write-Host "`n4️⃣ Création du modèle OPPART (partenaire)..." -ForegroundColor Yellow
    $oppartId = Create-Model -model $oppartModel -modelName "OPPART - Partenaire"
    
    # 5. Tester la réconciliation
    Write-Host "`n5️⃣ Test de réconciliation..." -ForegroundColor Yellow
    $testSuccess = Test-Reconciliation -testKey $correctKey
    
    # 6. Afficher les modèles créés
    Write-Host "`n6️⃣ Vérification des modèles créés..." -ForegroundColor Yellow
    Show-Models
    
    # 7. Instructions de test
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
    Write-Host "   - Clé de réconciliation: $correctKey" -ForegroundColor Gray
    
    if ($testSuccess) {
        Write-Host "`n🎉 Correction réussie ! La clé '$correctKey' devrait maintenant fonctionner." -ForegroundColor Green
    } else {
        Write-Host "`n⚠️ Correction effectuée mais le test a échoué. Vérifiez la configuration." -ForegroundColor Yellow
    }
    
    Write-Host "`n✅ Correction automatique terminée!" -ForegroundColor Green
}

# Exécuter le script principal
Main
