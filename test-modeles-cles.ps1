# Script de test pour vérifier la récupération des clés des modèles
# Ce script teste l'API pour récupérer les modèles et vérifier leurs clés de réconciliation

Write-Host "🔍 Test de récupération des modèles et leurs clés de réconciliation" -ForegroundColor Cyan
Write-Host ""

# URL de base de l'API
$baseUrl = "http://localhost:3000/api"

try {
    # 1. Récupérer tous les modèles
    Write-Host "📋 Récupération de tous les modèles..." -ForegroundColor Yellow
    $modelsResponse = Invoke-RestMethod -Uri "$baseUrl/auto-processing-models" -Method GET
    Write-Host "✅ ${modelsResponse.length} modèles récupérés" -ForegroundColor Green
    
    # 2. Analyser chaque modèle
    foreach ($model in $modelsResponse) {
        Write-Host ""
        Write-Host "🔍 Modèle: $($model.name)" -ForegroundColor Magenta
        Write-Host "   - ID: $($model.id)"
        Write-Host "   - Type: $($model.fileType)"
        Write-Host "   - Pattern: $($model.filePattern)"
        
        # Vérifier les clés de réconciliation
        if ($model.reconciliationKeys) {
            Write-Host "   ✅ reconciliationKeys présentes" -ForegroundColor Green
            
            $rk = $model.reconciliationKeys
            
            # Clés partenaires
            if ($rk.partnerKeys) {
                Write-Host "   - partnerKeys: $($rk.partnerKeys -join ', ')" -ForegroundColor Green
            } else {
                Write-Host "   ❌ partnerKeys manquantes" -ForegroundColor Red
            }
            
            # Clés BO
            if ($rk.boKeys) {
                Write-Host "   - boKeys: $($rk.boKeys -join ', ')" -ForegroundColor Green
            } else {
                Write-Host "   ⚠️ boKeys manquantes" -ForegroundColor Yellow
            }
            
            # Modèles BO
            if ($rk.boModels) {
                Write-Host "   - boModels: $($rk.boModels -join ', ')" -ForegroundColor Green
            } else {
                Write-Host "   ⚠️ boModels manquants" -ForegroundColor Yellow
            }
            
            # Clés spécifiques par modèle BO
            if ($rk.boModelKeys) {
                Write-Host "   - boModelKeys:" -ForegroundColor Green
                foreach ($boModelId in $rk.boModelKeys.Keys) {
                    $keys = $rk.boModelKeys[$boModelId]
                    Write-Host "     * $boModelId`: $($keys -join ', ')"
                }
            } else {
                Write-Host "   ⚠️ boModelKeys manquants" -ForegroundColor Yellow
            }
            
            # Traitements BO
            if ($rk.boTreatments) {
                Write-Host "   - boTreatments:" -ForegroundColor Green
                foreach ($boModelId in $rk.boTreatments.Keys) {
                    $treatments = $rk.boTreatments[$boModelId]
                    Write-Host "     * $boModelId`: $($treatments -join ', ')"
                }
            } else {
                Write-Host "   ⚠️ boTreatments manquants" -ForegroundColor Yellow
            }
            
        } else {
            Write-Host "   ❌ reconciliationKeys manquantes" -ForegroundColor Red
        }
        
        # Vérifier les règles de traitement des colonnes
        if ($model.columnProcessingRules) {
            Write-Host "   - columnProcessingRules: $($model.columnProcessingRules.length) règles" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️ columnProcessingRules manquantes" -ForegroundColor Yellow
        }
    }
    
    # 3. Test spécifique pour les modèles partenaires
    Write-Host ""
    Write-Host "🔍 Test spécifique des modèles partenaires..." -ForegroundColor Cyan
    
    $partnerModels = $modelsResponse | Where-Object { $_.fileType -eq "partner" }
    Write-Host "📋 ${partnerModels.length} modèles partenaires trouvés" -ForegroundColor Green
    
    foreach ($model in $partnerModels) {
        Write-Host ""
        Write-Host "🔍 Modèle partenaire: $($model.name)" -ForegroundColor Magenta
        
        if ($model.reconciliationKeys -and $model.reconciliationKeys.partnerKeys) {
            Write-Host "   ✅ Clés partenaires: $($model.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Green
            
            # Vérifier si le modèle a des boModels spécifiques
            if ($model.reconciliationKeys.boModels -and $model.reconciliationKeys.boModels.length -gt 0) {
                Write-Host "   🔍 Modèle avec boModels spécifiques:" -ForegroundColor Yellow
                foreach ($boModelId in $model.reconciliationKeys.boModels) {
                    $boModelKeys = $model.reconciliationKeys.boModelKeys[$boModelId]
                    if ($boModelKeys) {
                        Write-Host "     * $boModelId`: $($boModelKeys -join ', ')" -ForegroundColor Green
                    } else {
                        Write-Host "     * $boModelId`: ❌ clés manquantes" -ForegroundColor Red
                    }
                }
            } else {
                Write-Host "   🔍 Modèle avec clés génériques:" -ForegroundColor Yellow
                if ($model.reconciliationKeys.boKeys) {
                    Write-Host "     * boKeys: $($model.reconciliationKeys.boKeys -join ', ')" -ForegroundColor Green
                } else {
                    Write-Host "     * boKeys: ❌ manquantes" -ForegroundColor Red
                }
            }
        } else {
            Write-Host "   ❌ Pas de clés partenaires" -ForegroundColor Red
        }
    }
    
    # 4. Test de correspondance de patterns
    Write-Host ""
    Write-Host "🔍 Test de correspondance de patterns..." -ForegroundColor Cyan
    
    $testFiles = @(
        "OPPART.xls",
        "TRXBO.xls", 
        "USSDPART.xls",
        "partner_file.csv",
        "bo_file.xlsx"
    )
    
    foreach ($testFile in $testFiles) {
        Write-Host ""
        Write-Host "📄 Test du fichier: $testFile" -ForegroundColor Yellow
        
        $matchingModels = $modelsResponse | Where-Object {
            if ($_.filePattern) {
                $pattern = $_.filePattern -replace '\*', '.*' -replace '\?', '.'
                try {
                    $testFile -match $pattern
                } catch {
                    $false
                }
            } else {
                $false
            }
        }
        
        if ($matchingModels) {
            Write-Host "   ✅ Modèles correspondants:" -ForegroundColor Green
            foreach ($model in $matchingModels) {
                Write-Host "     * $($model.name) (pattern: $($model.filePattern))" -ForegroundColor Green
            }
        } else {
            Write-Host "   ❌ Aucun modèle correspondant" -ForegroundColor Red
        }
    }
    
} catch {
    Write-Host "❌ Erreur lors du test: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Détails: $($_.Exception)" -ForegroundColor Red
}

Write-Host ""
Write-Host "✅ Test terminé" -ForegroundColor Green
