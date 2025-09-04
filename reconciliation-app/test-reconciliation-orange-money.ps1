# Script de test pour la réconciliation automatique Orange Money
Write-Host "🧪 Test de la réconciliation automatique Orange Money..." -ForegroundColor Yellow

try {
    # Récupérer les modèles
    $models = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    
    # Afficher les configurations des modèles Orange Money
    Write-Host "=== CONFIGURATIONS DES MODÈLES ORANGE MONEY ===" -ForegroundColor Green
    
    $ciomcm = $models.models | Where-Object { $_.name -like "*CIOMCM*" }
    $pmomcm = $models.models | Where-Object { $_.name -like "*PMOMCM*" }
    
    if ($ciomcm) {
        Write-Host "🔍 Modèle CIOMCM:" -ForegroundColor Cyan
        Write-Host "   Nom: $($ciomcm.name)" -ForegroundColor White
        Write-Host "   Pattern: $($ciomcm.filePattern)" -ForegroundColor White
        Write-Host "   Type: $($ciomcm.fileType)" -ForegroundColor White
        Write-Host "   Clés partenaires: $($ciomcm.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor White
        Write-Host "   Clés BO: $($ciomcm.reconciliationKeys.boKeys -join ', ')" -ForegroundColor White
        Write-Host "   Auto-apply: $($ciomcm.autoApply)" -ForegroundColor White
        
        # Afficher les colonnes de traitement si disponibles
        if ($ciomcm.columnProcessingRules -and $ciomcm.columnProcessingRules.Count -gt 0) {
            Write-Host "   Règles de traitement des colonnes:" -ForegroundColor Yellow
            foreach ($rule in $ciomcm.columnProcessingRules) {
                Write-Host "     - $($rule.name): $($rule.action) sur $($rule.field -join ', ')" -ForegroundColor Gray
            }
        } else {
            Write-Host "   Aucune règle de traitement des colonnes configurée" -ForegroundColor Gray
        }
        
        # Afficher les modèles BO associés
        if ($ciomcm.reconciliationKeys.boModels -and $ciomcm.reconciliationKeys.boModels.Count -gt 0) {
            Write-Host "   Modèles BO associés: $($ciomcm.reconciliationKeys.boModels -join ', ')" -ForegroundColor White
        }
        
        Write-Host ""
    }
    
    if ($pmomcm) {
        Write-Host "🔍 Modèle PMOMCM:" -ForegroundColor Cyan
        Write-Host "   Nom: $($pmomcm.name)" -ForegroundColor White
        Write-Host "   Pattern: $($pmomcm.filePattern)" -ForegroundColor White
        Write-Host "   Type: $($pmomcm.fileType)" -ForegroundColor White
        Write-Host "   Clés partenaires: $($pmomcm.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor White
        Write-Host "   Clés BO: $($pmomcm.reconciliationKeys.boKeys -join ', ')" -ForegroundColor White
        Write-Host "   Auto-apply: $($pmomcm.autoApply)" -ForegroundColor White
        
        # Afficher les colonnes de traitement si disponibles
        if ($pmomcm.columnProcessingRules -and $pmomcm.columnProcessingRules.Count -gt 0) {
            Write-Host "   Règles de traitement des colonnes:" -ForegroundColor Yellow
            foreach ($rule in $pmomcm.columnProcessingRules) {
                Write-Host "     - $($rule.name): $($rule.action) sur $($rule.field -join ', ')" -ForegroundColor Gray
            }
        } else {
            Write-Host "   Aucune règle de traitement des colonnes configurée" -ForegroundColor Gray
        }
        
        # Afficher les modèles BO associés
        if ($pmomcm.reconciliationKeys.boModels -and $pmomcm.reconciliationKeys.boModels.Count -gt 0) {
            Write-Host "   Modèles BO associés: $($pmomcm.reconciliationKeys.boModels -join ', ')" -ForegroundColor White
        }
        
        Write-Host ""
    }
    
    Write-Host "=== ANALYSE DES COLONNES CONFIGURÉES ===" -ForegroundColor Green
    
    # Analyser les colonnes utilisées dans les modèles
    $allColumns = @()
    
    if ($ciomcm) {
        Write-Host "📊 Colonnes du modèle CIOMCM:" -ForegroundColor Cyan
        
        # Colonnes des clés partenaires
        if ($ciomcm.reconciliationKeys.partnerKeys) {
            Write-Host "   🔑 Clés partenaires: $($ciomcm.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Yellow
            $allColumns += $ciomcm.reconciliationKeys.partnerKeys
        }
        
        # Colonnes des clés BO
        if ($ciomcm.reconciliationKeys.boKeys) {
            Write-Host "   🔑 Clés BO: $($ciomcm.reconciliationKeys.boKeys -join ', ')" -ForegroundColor Yellow
            $allColumns += $ciomcm.reconciliationKeys.boKeys
        }
        
        # Colonnes des règles de traitement
        if ($ciomcm.columnProcessingRules) {
            foreach ($rule in $ciomcm.columnProcessingRules) {
                if ($rule.field) {
                    Write-Host "   ⚙️  Règle '$($rule.name)': $($rule.field -join ', ')" -ForegroundColor Gray
                    $allColumns += $rule.field
                }
            }
        }
        
        Write-Host ""
    }
    
    if ($pmomcm) {
        Write-Host "📊 Colonnes du modèle PMOMCM:" -ForegroundColor Cyan
        
        # Colonnes des clés partenaires
        if ($pmomcm.reconciliationKeys.partnerKeys) {
            Write-Host "   🔑 Clés partenaires: $($pmomcm.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Yellow
            $allColumns += $pmomcm.reconciliationKeys.partnerKeys
        }
        
        # Colonnes des clés BO
        if ($pmomcm.reconciliationKeys.boKeys) {
            Write-Host "   🔑 Clés BO: $($pmomcm.reconciliationKeys.boKeys -join ', ')" -ForegroundColor Yellow
            $allColumns += $pmomcm.reconciliationKeys.boKeys
        }
        
        # Colonnes des règles de traitement
        if ($pmomcm.columnProcessingRules) {
            foreach ($rule in $pmomcm.columnProcessingRules) {
                if ($rule.field) {
                    Write-Host "   ⚙️  Règle '$($rule.name)': $($rule.field -join ', ')" -ForegroundColor Gray
                    $allColumns += $rule.field
                }
            }
        }
        
        Write-Host ""
    }
    
    # Afficher toutes les colonnes uniques
    $uniqueColumns = $allColumns | Sort-Object | Get-Unique
    Write-Host "📋 Toutes les colonnes configurées (uniques):" -ForegroundColor Green
    foreach ($col in $uniqueColumns) {
        Write-Host "   - $col" -ForegroundColor White
    }
    
    Write-Host ""
    Write-Host "=== INSTRUCTIONS POUR LE TEST ===" -ForegroundColor Green
    Write-Host "1. Assurez-vous que le frontend est démarré" -ForegroundColor White
    Write-Host "2. Allez dans la section 'Réconciliation Automatique'" -ForegroundColor White
    Write-Host "3. Uploadez un fichier TRXBO.xls (Back Office)" -ForegroundColor White
    Write-Host "4. Uploadez un fichier CIOMCM.xls ou PMOMCM.xls (Partenaire)" -ForegroundColor White
    Write-Host "5. Le système devrait automatiquement:" -ForegroundColor White
    Write-Host "   - Détecter les modèles Orange Money" -ForegroundColor White
    Write-Host "   - Appliquer le traitement Orange Money" -ForegroundColor White
    Write-Host "   - Utiliser les colonnes configurées ci-dessus" -ForegroundColor White
    Write-Host "   - Effectuer la réconciliation" -ForegroundColor White
    Write-Host ""
    Write-Host "✅ Les modèles sont correctement configurés pour la réconciliation automatique!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Erreur lors du test: $($_.Exception.Message)" -ForegroundColor Red
}
