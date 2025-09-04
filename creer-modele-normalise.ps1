# Script pour creer un modele normalise avec les vraies valeurs
Write-Host "Creation d'un modele normalise avec les vraies valeurs" -ForegroundColor Cyan

$baseUrl = "http://localhost:8080/api"
$modelsEndpoint = "$baseUrl/auto-processing/models"

# Modele TRXBO avec les vraies valeurs normalisees
$modeleTRXBO = @{
    name = "Modèle TRXBO Normalisé"
    modelId = "modele_trxbo_normalise_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    filePattern = "*TRXBO*.xls"
    fileType = "bo"
    autoApply = $true
    templateFile = "TRXBO.xls"
    
    # Clés de réconciliation normalisées
    reconciliationKeys = @{
        boKey = "IDTransaction"  # GARDÉ sans normalisation
        partnerKey = "Référence"  # Normalisé depuis "Reference"
    }
    
    # Clés partenaires normalisées
    partnerKeys = @("Référence")  # Utilise la vraie valeur normalisée
    
    # Clés BO - GARDÉES sans normalisation
    boModelKeys = @{
        "modele_trxbo_normalise" = @("IDTransaction")  # GARDÉ sans normalisation
    }
    
    # Traitements BO
    boTreatments = @{
        "modele_trxbo_normalise" = @()
    }
    
    # Règles de correspondance
    correspondenceRules = @{
        rules = @(
            @{
                name = "Correspondance Exacte"
                condition = "boKey == partnerKey"
                action = "MATCH"
                description = "Correspondance exacte entre IDTransaction et Référence"
            }
        )
    }
    
    # Colonnes de comparaison
    comparisonColumns = @{
        columns = @(
            @{
                name = "IDTransaction"
                type = "string"
                description = "Identifiant unique de la transaction BO"
            },
            @{
                name = "Référence"
                type = "string"
                description = "Référence de la transaction partenaire"
            },
            @{
                name = "Montant"
                type = "numeric"
                description = "Montant de la transaction"
            },
            @{
                name = "Date Transaction"
                type = "date"
                description = "Date de la transaction"
            }
        )
    }
    
    # Règles de traitement des colonnes
    columnProcessingRules = @(
        @{
            sourceColumn = "Date"
            targetColumn = "Date Transaction"
            operation = "COPY"
            parameters = @{
                description = "Copie de la colonne Date vers Date Transaction"
            }
        },
        @{
            sourceColumn = "Heure"
            targetColumn = "Heure Transaction"
            operation = "COPY"
            parameters = @{
                description = "Copie de la colonne Heure vers Heure Transaction"
            }
        }
    )
    
    # Logique de réconciliation
    reconciliationLogic = @{
        type = "STANDARD"
        parameters = @{
            description = "Réconciliation standard TRXBO/Partenaire"
            expectedRatio = "1:1"
            tolerance = 0
        }
    }
    
    # Métadonnées
    metadata = @{
        version = "1.0"
        createdBy = "System"
        description = "Modèle TRXBO avec clés partiellement normalisées"
        tags = @("TRXBO", "normalisé", "réconciliation")
    }
}

Write-Host "`nModele a creer:" -ForegroundColor Yellow
Write-Host "  Nom: $($modeleTRXBO.name)" -ForegroundColor White
Write-Host "  ModelID: $($modeleTRXBO.modelId)" -ForegroundColor White
Write-Host "  Clé BO: $($modeleTRXBO.reconciliationKeys.boKey) (GARDÉE sans normalisation)" -ForegroundColor Blue
Write-Host "  Clé Partenaire: $($modeleTRXBO.reconciliationKeys.partnerKey) (normalisée)" -ForegroundColor Green

try {
    Write-Host "`nCreation du modele via l'API..." -ForegroundColor Blue
    
    $body = $modeleTRXBO | ConvertTo-Json -Depth 10
    
    Write-Host "Donnees JSON:" -ForegroundColor Cyan
    Write-Host $body -ForegroundColor Gray
    
    $response = Invoke-RestMethod -Uri $modelsEndpoint -Method POST -Body $body -ContentType "application/json"
    
    Write-Host "`n✅ Modele cree avec succes!" -ForegroundColor Green
    Write-Host "  ID: $($response.id)" -ForegroundColor White
    Write-Host "  Nom: $($response.name)" -ForegroundColor White
    Write-Host "  ModelID: $($response.modelId)" -ForegroundColor White
    
    Write-Host "`nClés de réconciliation:" -ForegroundColor Cyan
    Write-Host "  BO: $($response.reconciliationKeys.boKey) (GARDÉE)" -ForegroundColor Blue
    Write-Host "  Partenaire: $($response.reconciliationKeys.partnerKey) (normalisée)" -ForegroundColor Green
    
    Write-Host "`n🎉 Le modele utilise maintenant les vraies valeurs normalisees!" -ForegroundColor Green
    Write-Host "💡 La réconciliation devrait maintenant fonctionner correctement." -ForegroundColor Yellow
    Write-Host "📝 Note: Clé BO 'IDTransaction' gardée sans normalisation" -ForegroundColor Blue
    
}
catch {
    Write-Host "❌ Erreur lors de la creation: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $errorBody = $reader.ReadToEnd()
        Write-Host "Details de l'erreur: $errorBody" -ForegroundColor Red
    }
}
