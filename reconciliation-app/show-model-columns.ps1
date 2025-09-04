# Script pour afficher les colonnes des modèles Orange Money
Write-Host "📊 Affichage des colonnes des modèles Orange Money..." -ForegroundColor Yellow

try {
    # Récupérer les modèles
    $models = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    
    $ciomcm = $models.models | Where-Object { $_.name -like "*CIOMCM*" }
    $pmomcm = $models.models | Where-Object { $_.name -like "*PMOMCM*" }
    
    Write-Host "=== MODÈLE CIOMCM ===" -ForegroundColor Green
    if ($ciomcm) {
        Write-Host "Nom: $($ciomcm.name)" -ForegroundColor White
        Write-Host "Pattern: $($ciomcm.filePattern)" -ForegroundColor White
        Write-Host "Type: $($ciomcm.fileType)" -ForegroundColor White
        Write-Host "Auto-apply: $($ciomcm.autoApply)" -ForegroundColor White
        Write-Host ""
        
        Write-Host "🔑 Clés de réconciliation:" -ForegroundColor Yellow
        Write-Host "  - Clés partenaires: $($ciomcm.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor White
        Write-Host "  - Clés BO: $($ciomcm.reconciliationKeys.boKeys -join ', ')" -ForegroundColor White
        
        if ($ciomcm.reconciliationKeys.boModels) {
            Write-Host "  - Modèles BO associés: $($ciomcm.reconciliationKeys.boModels -join ', ')" -ForegroundColor White
        }
        
        Write-Host ""
        Write-Host "⚙️ Règles de traitement des colonnes:" -ForegroundColor Yellow
        if ($ciomcm.columnProcessingRules -and $ciomcm.columnProcessingRules.Count -gt 0) {
            foreach ($rule in $ciomcm.columnProcessingRules) {
                Write-Host "  - $($rule.name): $($rule.action) sur $($rule.field -join ', ')" -ForegroundColor White
            }
        } else {
            Write-Host "  Aucune règle configurée" -ForegroundColor Gray
        }
    } else {
        Write-Host "Aucun modèle CIOMCM trouvé" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "=== MODÈLE PMOMCM ===" -ForegroundColor Green
    if ($pmomcm) {
        Write-Host "Nom: $($pmomcm.name)" -ForegroundColor White
        Write-Host "Pattern: $($pmomcm.filePattern)" -ForegroundColor White
        Write-Host "Type: $($pmomcm.fileType)" -ForegroundColor White
        Write-Host "Auto-apply: $($pmomcm.autoApply)" -ForegroundColor White
        Write-Host ""
        
        Write-Host "🔑 Clés de réconciliation:" -ForegroundColor Yellow
        Write-Host "  - Clés partenaires: $($pmomcm.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor White
        Write-Host "  - Clés BO: $($pmomcm.reconciliationKeys.boKeys -join ', ')" -ForegroundColor White
        
        if ($pmomcm.reconciliationKeys.boModels) {
            Write-Host "  - Modèles BO associés: $($pmomcm.reconciliationKeys.boModels -join ', ')" -ForegroundColor White
        }
        
        Write-Host ""
        Write-Host "⚙️ Règles de traitement des colonnes:" -ForegroundColor Yellow
        if ($pmomcm.columnProcessingRules -and $pmomcm.columnProcessingRules.Count -gt 0) {
            foreach ($rule in $pmomcm.columnProcessingRules) {
                Write-Host "  - $($rule.name): $($rule.action) sur $($rule.field -join ', ')" -ForegroundColor White
            }
        } else {
            Write-Host "  Aucune règle configurée" -ForegroundColor Gray
        }
    } else {
        Write-Host "Aucun modèle PMOMCM trouvé" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "=== RÉSUMÉ DES COLONNES UTILISÉES ===" -ForegroundColor Green
    
    $allColumns = @()
    
    if ($ciomcm) {
        $allColumns += $ciomcm.reconciliationKeys.partnerKeys
        $allColumns += $ciomcm.reconciliationKeys.boKeys
        if ($ciomcm.columnProcessingRules) {
            foreach ($rule in $ciomcm.columnProcessingRules) {
                if ($rule.field) {
                    $allColumns += $rule.field
                }
            }
        }
    }
    
    if ($pmomcm) {
        $allColumns += $pmomcm.reconciliationKeys.partnerKeys
        $allColumns += $pmomcm.reconciliationKeys.boKeys
        if ($pmomcm.columnProcessingRules) {
            foreach ($rule in $pmomcm.columnProcessingRules) {
                if ($rule.field) {
                    $allColumns += $rule.field
                }
            }
        }
    }
    
    $uniqueColumns = $allColumns | Sort-Object | Get-Unique
    Write-Host "📋 Colonnes uniques configurées:" -ForegroundColor Yellow
    foreach ($col in $uniqueColumns) {
        Write-Host "  - $col" -ForegroundColor White
    }
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}
