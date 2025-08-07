# Script PowerShell pour tester et mettre à jour le modèle OPPART
Write-Host "🔧 Test et mise à jour du modèle OPPART..." -ForegroundColor Cyan

# Configuration complète du modèle OPPART
$oppartModelUpdate = @{
    name = "Modèle OPPART - Configuration Complète"
    filePattern = "*OPPART*.csv"
    fileType = "partner"
    autoApply = $true
    templateFile = "OPPART.csv"
    processingSteps = @(
        @{
            id = "step_clean_data"
            name = "NETTOYAGE_DONNEES_OPPART"
            type = "format"
            action = "cleanText"
            field = @(
                "ID Opération", "Type Opération", "Montant", "Solde avant", "Solde aprés",
                "Code propriétaire", "Téléphone", "Statut", "ID Transaction", "Num bordereau",
                "Date opération", "Date de versement", "Banque appro", "Login demandeur Appro",
                "Login valideur Appro", "Motif rejet", "Frais connexion", "Numéro Trans GU",
                "Agent", "Motif régularisation", "groupe de réseau"
            )
            params = @{}
            description = "Nettoyage des données OPPART"
        },
        @{
            id = "step_format_amount"
            name = "FORMATAGE_MONTANT_OPPART"
            type = "format"
            action = "formatCurrency"
            field = @("Montant", "Solde avant", "Solde aprés", "Frais connexion")
            params = @{ currency = "XOF"; locale = "fr-FR" }
            description = "Formatage des montants OPPART"
        },
        @{
            id = "step_format_date"
            name = "FORMATAGE_DATE_OPPART"
            type = "format"
            action = "formatDate"
            field = @("Date opération", "Date de versement")
            params = @{ format = "YYYY-MM-DD" }
            description = "Formatage des dates OPPART"
        }
    )
    reconciliationKeys = @{
        partnerKeys = @("Numéro Trans GU")
        boModels = @("9")
        boModelKeys = @{
            "9" = @("Numéro Trans GU")
        }
    }
}

try {
    # Récupérer tous les modèles
    Write-Host "📋 Récupération des modèles existants..." -ForegroundColor Yellow
    $modelsResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method Get
    $models = $modelsResponse
    
    # Chercher le modèle OPPART
    $oppartModel = $models | Where-Object { 
        $_.name -like "*OPPART*" -or $_.filePattern -like "*OPPART*" 
    }
    
    if ($oppartModel) {
        Write-Host "✅ Modèle OPPART trouvé:" -ForegroundColor Green
        Write-Host "   - ID: $($oppartModel.id)" -ForegroundColor Green
        Write-Host "   - Nom: $($oppartModel.name)" -ForegroundColor Green
        Write-Host "   - Étapes: $($oppartModel.processingSteps.Count)" -ForegroundColor Green
        
        # Vérifier les colonnes traitées
        if ($oppartModel.processingSteps.Count -gt 0) {
            $firstStep = $oppartModel.processingSteps[0]
            Write-Host "   - Action: $($firstStep.action)" -ForegroundColor Green
            Write-Host "   - Colonnes: $($firstStep.field.Count)" -ForegroundColor Green
            
            if ($firstStep.field -and $firstStep.field.Count -gt 0) {
                Write-Host "`n📋 Colonnes traitées:" -ForegroundColor Cyan
                for ($i = 0; $i -lt $firstStep.field.Count; $i++) {
                    Write-Host "   $($i + 1). $($firstStep.field[$i])" -ForegroundColor White
                }
            }
        }
        
        # Mettre à jour le modèle
        Write-Host "`n🔄 Mise à jour du modèle..." -ForegroundColor Yellow
        $updateResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$($oppartModel.id)" -Method Put -Body ($oppartModelUpdate | ConvertTo-Json -Depth 10) -ContentType "application/json"
        
        Write-Host "✅ Modèle OPPART mis à jour avec succès!" -ForegroundColor Green
        Write-Host "   - Nouveau nom: $($updateResponse.name)" -ForegroundColor Green
        Write-Host "   - Nouvelles étapes: $($updateResponse.processingSteps.Count)" -ForegroundColor Green
        
        # Afficher les nouvelles colonnes
        if ($updateResponse.processingSteps.Count -gt 0) {
            $newFirstStep = $updateResponse.processingSteps[0]
            Write-Host "   - Colonnes traitées: $($newFirstStep.field.Count)" -ForegroundColor Green
            
            Write-Host "`n📋 Nouvelles colonnes récupérées:" -ForegroundColor Cyan
            for ($i = 0; $i -lt $newFirstStep.field.Count; $i++) {
                Write-Host "   $($i + 1). $($newFirstStep.field[$i])" -ForegroundColor White
            }
        }
        
    } else {
        Write-Host "⚠️ Aucun modèle OPPART trouvé, création d'un nouveau modèle..." -ForegroundColor Yellow
        
        $createResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method Post -Body ($oppartModelUpdate | ConvertTo-Json -Depth 10) -ContentType "application/json"
        
        Write-Host "✅ Nouveau modèle OPPART créé avec succès!" -ForegroundColor Green
        Write-Host "   - ID: $($createResponse.id)" -ForegroundColor Green
        Write-Host "   - Étapes: $($createResponse.processingSteps.Count)" -ForegroundColor Green
    }
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "📋 Détails: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

Write-Host "`n✅ Test terminé!" -ForegroundColor Green 