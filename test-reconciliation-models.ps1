# Script de test de reconciliation pour les modeles existants
# Test des reconciliations entre TRXBO et les autres modeles

$API_BASE_URL = "http://localhost:8080/api"

Write-Host "=== TESTS DE RECONCILIATION DES MODELES ===" -ForegroundColor Cyan
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

# Fonction pour creer des donnees de test
function Create-TestData {
    param(
        [string]$ModelType,
        [string]$ModelName
    )
    
    if ($ModelType -eq "bo") {
        # Donnees BO (TRXBO)
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
            },
            @{
                "ID" = "TRX003"
                "IDTransaction" = "TXN003"
                "Numero Trans GU" = "GU003"
                "montant" = "1500"
                "Date" = "2024-01-17"
                "telephone client" = "555666777"
                "Service" = "Transfert"
                "Agence" = "Agence C"
                "Statut" = "En cours"
            }
        )
    } elseif ($ModelName -like "*OPPART*") {
        # Donnees OPPART
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
                "Numero Trans GU" = "GU004"
                "External id" = "EXT004"
                "Transaction ID" = "TXN004"
                "Amount" = "3000"
                "Date" = "2024-01-18"
                "Status" = "Pending"
            }
        )
    } elseif ($ModelName -like "*USSDPART*") {
        # Donnees USSDPART
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
        # Donnees CIOMCM (Modèle USSDPART)
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
    }
}

# Fonction pour tester une reconciliation
function Test-Reconciliation {
    param(
        [string]$TestName,
        [object]$BoData,
        [object]$PartnerData,
        [string]$BoModelId,
        [string]$PartnerModelId
    )
    
    Write-Host "--- Test: $TestName ---" -ForegroundColor Yellow
    
    try {
        $reconciliationRequest = @{
            boFileContent = $BoData
            partnerFileContent = $PartnerData
            boKeyColumn = "Numero Trans GU"
            partnerKeyColumn = "Numero Trans GU"
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
        
        Write-Host "Envoi de la demande de reconciliation..."
        
        $response = Invoke-RestMethod -Uri "$API_BASE_URL/reconciliation/reconcile" -Method POST -Body ($reconciliationRequest | ConvertTo-Json -Depth 10) -ContentType "application/json"
        
        if ($response.matches -or $response.boOnly -or $response.partnerOnly) {
            Write-Host "✅ Reconciliation reussie!" -ForegroundColor Green
            Write-Host "  - Correspondances trouvees: $($response.matches.Count)"
            Write-Host "  - Donnees BO uniquement: $($response.boOnly.Count)"
            Write-Host "  - Donnees Partenaire uniquement: $($response.partnerOnly.Count)"
            Write-Host "  - Incompatibilites: $($response.mismatches.Count)"
            
            if ($response.matches.Count -gt 0) {
                Write-Host "  - Exemple de correspondance:" -ForegroundColor Cyan
                $firstMatch = $response.matches[0]
                Write-Host "    Cle: $($firstMatch.key)"
                Write-Host "    BO: $($firstMatch.boData | ConvertTo-Json -Compress)"
                Write-Host "    Partner: $($firstMatch.partnerData | ConvertTo-Json -Compress)"
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
Write-Host "  - TRXBO: $($trxboModel.name) (ID: $($trxboModel.modelId))" -ForegroundColor White
Write-Host "  - OPPART: $($oppartModel.name) (ID: $($oppartModel.modelId))" -ForegroundColor White
Write-Host "  - USSDPART: $($ussdpartModel.name) (ID: $($ussdpartModel.modelId))" -ForegroundColor White
Write-Host "  - CIOMCM: $($ciomcmModel.name) (ID: $($ciomcmModel.modelId))" -ForegroundColor White
Write-Host ""

# Creer les donnees de test
$boData = Create-TestData -ModelType "bo" -ModelName "TRXBO"
$oppartData = Create-TestData -ModelType "partner" -ModelName "OPPART"
$ussdpartData = Create-TestData -ModelType "partner" -ModelName "USSDPART"
$ciomcmData = Create-TestData -ModelType "partner" -ModelName "CIOMCM"

Write-Host "Donnees de test creees:" -ForegroundColor Cyan
Write-Host "  - BO: $($boData.Count) enregistrements" -ForegroundColor White
Write-Host "  - OPPART: $($oppartData.Count) enregistrements" -ForegroundColor White
Write-Host "  - USSDPART: $($ussdpartData.Count) enregistrements" -ForegroundColor White
Write-Host "  - CIOMCM: $($ciomcmData.Count) enregistrements" -ForegroundColor White
Write-Host ""

# Tests de reconciliation
Write-Host "=== DEBUT DES TESTS DE RECONCILIATION ===" -ForegroundColor Green
Write-Host ""

# Test 1: TRXBO vs OPPART
if ($trxboModel -and $oppartModel) {
    Test-Reconciliation -TestName "TRXBO vs OPPART" -BoData $boData -PartnerData $oppartData -BoModelId $trxboModel.modelId -PartnerModelId $oppartModel.modelId
} else {
    Write-Host "❌ Impossible de tester TRXBO vs OPPART - modeles manquants" -ForegroundColor Red
}

# Test 2: TRXBO vs USSDPART
if ($trxboModel -and $ussdpartModel) {
    Test-Reconciliation -TestName "TRXBO vs USSDPART" -BoData $boData -PartnerData $ussdpartData -BoModelId $trxboModel.modelId -PartnerModelId $ussdpartModel.modelId
} else {
    Write-Host "❌ Impossible de tester TRXBO vs USSDPART - modeles manquants" -ForegroundColor Red
}

# Test 3: TRXBO vs CIOMCM (Modèle USSDPART)
if ($trxboModel -and $ciomcmModel) {
    Test-Reconciliation -TestName "TRXBO vs CIOMCM (Modèle USSDPART)" -BoData $boData -PartnerData $ciomcmData -BoModelId $trxboModel.modelId -PartnerModelId $ciomcmModel.modelId
} else {
    Write-Host "❌ Impossible de tester TRXBO vs CIOMCM - modeles manquants" -ForegroundColor Red
}

Write-Host "=== FIN DES TESTS DE RECONCILIATION ===" -ForegroundColor Green
Write-Host ""
Write-Host "Tests termines!" -ForegroundColor Cyan
