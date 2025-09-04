# Script de test de reconciliation utilisant les cles configurees dans les modeles

$API_BASE_URL = "http://localhost:8080/api"

Write-Host "=== TESTS DE RECONCILIATION AVEC CLES DES MODELES ===" -ForegroundColor Cyan
Write-Host ""

# Fonction pour recuperer les modeles
function Get-Models {
    try {
        $response = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models" -Method GET
        return $response.models
    } catch {
        Write-Host "Erreur lors de la recuperation des modeles: $($_.Exception.Message)" -ForegroundColor Red
        return @()
    }
}

# Fonction pour trouver les cles de reconciliation dans un modele
function Get-ModelReconciliationKeys {
    param($model)
    
    if (-not $model.reconciliationKeys) {
        Write-Host "   ⚠️ Aucune clé de reconciliation configuree dans le modele" -ForegroundColor Yellow
        return $null
    }
    
    $keys = @{
        partnerKeys = $model.reconciliationKeys.partnerKeys
        boKeys = $model.reconciliationKeys.boKeys
    }
    
    Write-Host "   ✅ Cles trouvees dans le modele:" -ForegroundColor Green
    Write-Host "      - Partner Keys: $($keys.partnerKeys -join ', ')" -ForegroundColor Cyan
    Write-Host "      - BO Keys: $($keys.boKeys -join ', ')" -ForegroundColor Cyan
    
    return $keys
}

# Fonction pour creer des donnees de test adaptees aux cles du modele
function Create-TestDataForModel {
    param(
        [string]$ModelType,
        [object]$ModelKeys
    )
    
    if ($ModelType -eq "bo") {
        # Donnees BO (TRXBO) - utiliser les cles BO du modele partenaire
        $boKeys = $ModelKeys.boKeys
        $primaryKey = if ($boKeys -and $boKeys.Count -gt 0) { $boKeys[0] } else { "Numero Trans GU" }
        
        return @(
            @{
                "ID" = "TRX001"
                "IDTransaction" = "TXN001"
                "Numero Trans GU" = "GU001"
                "montant" = "1000"
                "Date" = "2024-01-15"
                "telephone client" = "123456789"
                "Service" = "Transfert"
                "Agence" = "Agence A"
                "Statut" = "Succes"
            },
            @{
                "ID" = "TRX002"
                "IDTransaction" = "TXN002"
                "Numero Trans GU" = "GU002"
                "montant" = "2500"
                "Date" = "2024-01-16"
                "telephone client" = "987654321"
                "Service" = "Transfert"
                "Agence" = "Agence B"
                "Statut" = "Succes"
            }
        )
    } else {
        # Donnees Partenaire - utiliser les cles partenaire du modele
        $partnerKeys = $ModelKeys.partnerKeys
        $primaryKey = if ($partnerKeys -and $partnerKeys.Count -gt 0) { $partnerKeys[0] } else { "Numero Trans GU" }
        
        # Adapter les donnees selon le type de modele
        if ($ModelKeys.boKeys -contains "IDTransaction") {
            # Modele CIOMCM (utilise IDTransaction)
            return @(
                @{
                    "R_f_rence" = "REF001"
                    "IDTransaction" = "TXN001"
                    "Token" = "TOK001"
                    "Amount" = "1000"
                    "Date" = "2024-01-15"
                    "Status" = "Success"
                },
                @{
                    "R_f_rence" = "REF002"
                    "IDTransaction" = "TXN002"
                    "Token" = "TOK002"
                    "Amount" = "2500"
                    "Date" = "2024-01-16"
                    "Status" = "Success"
                },
                @{
                    "R_f_rence" = "REF003"
                    "IDTransaction" = "TXN003"
                    "Token" = "TOK003"
                    "Amount" = "1500"
                    "Date" = "2024-01-17"
                    "Status" = "Processing"
                }
            )
        } elseif ($ModelKeys.partnerKeys -contains "Token") {
            # Modele USSDPART (utilise Token)
            return @(
                @{
                    "Token" = "TOK001"
                    "Numero Trans GU" = "GU001"
                    "Reference" = "REF001"
                    "Amount" = "1000"
                    "Date" = "2024-01-15"
                    "Status" = "Success"
                },
                @{
                    "Token" = "TOK002"
                    "Numero Trans GU" = "GU002"
                    "Reference" = "REF002"
                    "Amount" = "2500"
                    "Date" = "2024-01-16"
                    "Status" = "Success"
                },
                @{
                    "Token" = "TOK003"
                    "Numero Trans GU" = "GU003"
                    "Reference" = "REF003"
                    "Amount" = "1500"
                    "Date" = "2024-01-17"
                    "Status" = "Processing"
                }
            )
        } else {
            # Modele OPPART (utilise Numero Trans GU)
            return @(
                @{
                    "Numero Trans GU" = "GU001"
                    "External id" = "EXT001"
                    "Transaction ID" = "TXN001"
                    "Amount" = "1000"
                    "Date" = "2024-01-15"
                    "Status" = "Success"
                },
                @{
                    "Numero Trans GU" = "GU002"
                    "External id" = "EXT002"
                    "Transaction ID" = "TXN002"
                    "Amount" = "2500"
                    "Date" = "2024-01-16"
                    "Status" = "Success"
                },
                @{
                    "Numero Trans GU" = "GU003"
                    "External id" = "EXT003"
                    "Transaction ID" = "TXN003"
                    "Amount" = "3000"
                    "Date" = "2024-01-17"
                    "Status" = "Pending"
                }
            )
        }
    }
}

# Fonction pour determiner les cles de reconciliation a utiliser
function Determine-ReconciliationKeys {
    param(
        [object]$BoModel,
        [object]$PartnerModel
    )
    
    Write-Host "Determination des cles de reconciliation..." -ForegroundColor Yellow
    
    # Recuperer les cles du modele partenaire
    $partnerKeys = Get-ModelReconciliationKeys -model $PartnerModel
    
    if (-not $partnerKeys) {
        Write-Host "❌ Impossible de determiner les cles - modele partenaire sans configuration" -ForegroundColor Red
        return $null
    }
    
    # Determiner la clé BO a utiliser
    $boKeyColumn = if ($partnerKeys.boKeys -and $partnerKeys.boKeys.Count -gt 0) { 
        $partnerKeys.boKeys[0] 
    } else { 
        "Numero Trans GU" 
    }
    
    # Determiner la clé partenaire a utiliser
    $partnerKeyColumn = if ($partnerKeys.partnerKeys -and $partnerKeys.partnerKeys.Count -gt 0) { 
        $partnerKeys.partnerKeys[0] 
    } else { 
        "Numero Trans GU" 
    }
    
    Write-Host "✅ Cles determinees:" -ForegroundColor Green
    Write-Host "   - BO Key: $boKeyColumn" -ForegroundColor Cyan
    Write-Host "   - Partner Key: $partnerKeyColumn" -ForegroundColor Cyan
    
    return @{
        boKeyColumn = $boKeyColumn
        partnerKeyColumn = $partnerKeyColumn
        partnerKeys = $partnerKeys
    }
}

# Fonction pour tester une reconciliation avec les cles des modeles
function Test-ReconciliationWithModelKeys {
    param(
        [string]$TestName,
        [object]$BoModel,
        [object]$PartnerModel
    )
    
    Write-Host "--- Test: $TestName ---" -ForegroundColor Yellow
    Write-Host "   BO Model: $($BoModel.name)" -ForegroundColor Gray
    Write-Host "   Partner Model: $($PartnerModel.name)" -ForegroundColor Gray
    
    # Determiner les cles de reconciliation
    $reconciliationKeys = Determine-ReconciliationKeys -BoModel $BoModel -PartnerModel $PartnerModel
    
    if (-not $reconciliationKeys) {
        Write-Host "❌ Impossible de determiner les cles de reconciliation" -ForegroundColor Red
        return
    }
    
    # Creer les donnees de test adaptees aux cles
    $boData = Create-TestDataForModel -ModelType "bo" -ModelKeys $reconciliationKeys.partnerKeys
    $partnerData = Create-TestDataForModel -ModelType "partner" -ModelKeys $reconciliationKeys.partnerKeys
    
    Write-Host "Donnees de test creees:" -ForegroundColor Cyan
    Write-Host "   - BO: $($boData.Count) enregistrements" -ForegroundColor White
    Write-Host "   - Partner: $($partnerData.Count) enregistrements" -ForegroundColor White
    
    # Preparer la requete de reconciliation
    $reconciliationRequest = @{
        boFileContent = $boData
        partnerFileContent = $partnerData
        boKeyColumn = $reconciliationKeys.boKeyColumn
        partnerKeyColumn = $reconciliationKeys.partnerKeyColumn
        comparisonColumns = @(
            @{
                boColumn = "montant"
                partnerColumn = "Amount"
            },
            @{
                boColumn = "Date"
                partnerColumn = "Date"
            }
        )
    }
    
    Write-Host "Configuration de reconciliation:" -ForegroundColor Cyan
    Write-Host "   - BO Key: $($reconciliationKeys.boKeyColumn)" -ForegroundColor White
    Write-Host "   - Partner Key: $($reconciliationKeys.partnerKeyColumn)" -ForegroundColor White
    
    try {
        Write-Host "Envoi de la demande de reconciliation..."
        
        $response = Invoke-RestMethod -Uri "$API_BASE_URL/reconciliation/reconcile" -Method POST -Body ($reconciliationRequest | ConvertTo-Json -Depth 10) -ContentType "application/json"
        
        if ($response.matches -or $response.boOnly -or $response.partnerOnly) {
            Write-Host "✅ Reconciliation reussie!" -ForegroundColor Green
            Write-Host "  - Correspondances trouvees: $($response.matches.Count)" -ForegroundColor White
            Write-Host "  - Donnees BO uniquement: $($response.boOnly.Count)" -ForegroundColor White
            Write-Host "  - Donnees Partenaire uniquement: $($response.partnerOnly.Count)" -ForegroundColor White
            
            if ($response.matches.Count -gt 0) {
                Write-Host "  - Exemple de correspondance:" -ForegroundColor Cyan
                $match = $response.matches[0]
                Write-Host "    Cle: $($match.key)" -ForegroundColor White
                Write-Host "    BO montant: $($match.boData.montant)" -ForegroundColor White
                Write-Host "    Partner Amount: $($match.partnerData.Amount)" -ForegroundColor White
            }
        } else {
            Write-Host "❌ Erreur lors de la reconciliation: Aucun resultat retourne" -ForegroundColor Red
        }
        
    } catch {
        Write-Host "❌ Erreur lors du test: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            Write-Host "  Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        }
    }
    
    Write-Host ""
}

# Recuperer les modeles
Write-Host "Recuperation des modeles..." -ForegroundColor Cyan
$models = Get-Models

if ($models.Count -eq 0) {
    Write-Host "❌ Aucun modele trouve. Impossible de continuer les tests." -ForegroundColor Red
    exit 1
}

# Identifier les modeles
$trxboModel = $models | Where-Object { $_.name -like "*TRXBO*" }
$oppartModel = $models | Where-Object { $_.name -like "*OPPART*" }
$ussdpartModel = $models | Where-Object { $_.name -like "*USSDPART*" -and $_.name -notlike "*CIOMCM*" }
$ciomcmModel = $models | Where-Object { $_.name -like "*CIOMCM*" -or $_.name -eq "Modèle USSDPART" }

Write-Host "Modeles identifies:" -ForegroundColor Cyan
Write-Host "  - TRXBO: $($trxboModel.name) (Type: $($trxboModel.fileType))" -ForegroundColor White
Write-Host "  - OPPART: $($oppartModel.name) (Type: $($oppartModel.fileType))" -ForegroundColor White
Write-Host "  - USSDPART: $($ussdpartModel.name) (Type: $($ussdpartModel.fileType))" -ForegroundColor White
Write-Host "  - CIOMCM: $($ciomcmModel.name) (Type: $($ciomcmModel.fileType))" -ForegroundColor White
Write-Host ""

# Tests de reconciliation avec les cles des modeles
Write-Host "=== DEBUT DES TESTS DE RECONCILIATION AVEC CLES DES MODELES ===" -ForegroundColor Green
Write-Host ""

# Test 1: TRXBO vs OPPART
if ($trxboModel -and $oppartModel) {
    Test-ReconciliationWithModelKeys -TestName "TRXBO vs OPPART" -BoModel $trxboModel -PartnerModel $oppartModel
} else {
    Write-Host "❌ Impossible de tester TRXBO vs OPPART - modeles manquants" -ForegroundColor Red
}

# Test 2: TRXBO vs USSDPART
if ($trxboModel -and $ussdpartModel) {
    Test-ReconciliationWithModelKeys -TestName "TRXBO vs USSDPART" -BoModel $trxboModel -PartnerModel $ussdpartModel
} else {
    Write-Host "❌ Impossible de tester TRXBO vs USSDPART - modeles manquants" -ForegroundColor Red
}

# Test 3: TRXBO vs CIOMCM (Modèle USSDPART)
if ($trxboModel -and $ciomcmModel) {
    Test-ReconciliationWithModelKeys -TestName "TRXBO vs CIOMCM (Modèle USSDPART)" -BoModel $trxboModel -PartnerModel $ciomcmModel
} else {
    Write-Host "❌ Impossible de tester TRXBO vs CIOMCM - modeles manquants" -ForegroundColor Red
}

Write-Host "=== FIN DES TESTS DE RECONCILIATION AVEC CLES DES MODELES ===" -ForegroundColor Green
Write-Host ""
Write-Host "Tests termines!" -ForegroundColor Cyan
