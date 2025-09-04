# Script BugBot pour corriger les modèles de réconciliation automatique
# Utilise BugBot pour diagnostiquer et résoudre les problèmes

Write-Host "BugBot - Correction des modèles de réconciliation automatique" -ForegroundColor Cyan
Write-Host ""

# URL de base de l'API
$baseUrl = "http://localhost:8080/api"

try {
    # 1. Vérifier si le serveur est accessible
    Write-Host "BugBot - Vérification de l'accessibilité du serveur..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/auto-processing/models" -Method GET -TimeoutSec 5
        Write-Host "✅ Serveur accessible sur le port 8080" -ForegroundColor Green
    } catch {
        Write-Host "❌ Serveur non accessible" -ForegroundColor Red
        Write-Host "BugBot recommande de démarrer le serveur backend" -ForegroundColor Yellow
        exit 1
    }
    
    # 2. BugBot - Diagnostic initial
    Write-Host ""
    Write-Host "BugBot - Diagnostic initial..." -ForegroundColor Cyan
    
    $modelsResponse = Invoke-RestMethod -Uri "$baseUrl/auto-processing/models" -Method GET
    $models = $modelsResponse.models
    
    Write-Host "📊 Modèles trouvés: $($models.Length)" -ForegroundColor Green
    
    # 3. BugBot - Analyse des problèmes
    Write-Host ""
    Write-Host "BugBot - Analyse des problèmes..." -ForegroundColor Cyan
    
    $problems = @()
    $solutions = @()
    
    # Vérifier si les modèles requis existent
    $requiredModels = @("TRXBO", "OPPART", "USSDPART")
    $missingModels = @()
    
    foreach ($requiredModel in $requiredModels) {
        $found = $models | Where-Object { $_.name -eq $requiredModel }
        if (-not $found) {
            $missingModels += $requiredModel
            $problems += "❌ Modèle '$requiredModel' manquant"
            $solutions += "Créer le modèle '$requiredModel' avec les clés appropriées"
        }
    }
    
    # Vérifier la configuration des clés pour les modèles existants
    foreach ($model in $models) {
        $rk = $model.reconciliationKeys
        
        # Vérifier les clés selon le type de modèle
        if ($model.fileType -eq "bo") {
            if (-not $rk.boKeys -or $rk.boKeys.Length -eq 0) {
                $problems += "❌ Modèle BO '$($model.name)' sans clés BO"
                $solutions += "Ajouter les clés BO au modèle '$($model.name)'"
            }
        } elseif ($model.fileType -eq "partner") {
            if (-not $rk.partnerKeys -or $rk.partnerKeys.Length -eq 0) {
                $problems += "❌ Modèle Partner '$($model.name)' sans clés Partner"
                $solutions += "Ajouter les clés Partner au modèle '$($model.name)'"
            }
        }
    }
    
    # 4. BugBot - Affichage du diagnostic
    Write-Host ""
    Write-Host "BugBot - Diagnostic complet:" -ForegroundColor Yellow
    
    if ($problems.Length -eq 0) {
        Write-Host "✅ Aucun problème détecté" -ForegroundColor Green
        Write-Host "✅ Tous les modèles sont correctement configurés" -ForegroundColor Green
    } else {
        Write-Host "🚨 Problèmes détectés:" -ForegroundColor Red
        foreach ($problem in $problems) {
            Write-Host "  $problem" -ForegroundColor Red
        }
        
        Write-Host ""
        Write-Host "Solutions proposées:" -ForegroundColor Yellow
        foreach ($solution in $solutions) {
            Write-Host "  $solution" -ForegroundColor Yellow
        }
    }
    
    # 5. BugBot - Application des corrections
    if ($problems.Length -gt 0) {
        Write-Host ""
        Write-Host "BugBot - Application des corrections..." -ForegroundColor Cyan
        
        # Créer les modèles manquants
        if ($missingModels.Length -gt 0) {
            Write-Host "Création des modèles manquants..." -ForegroundColor Yellow
            
            $modelConfigs = @{
                "TRXBO" = @{
                    filePattern = "*TRXBO*.xls"
                    fileType = "bo"
                    boKeys = @("Numéro Trans GU")
                    partnerKeys = @()
                }
                "OPPART" = @{
                    filePattern = "*OPPART*.xls"
                    fileType = "partner"
                    boKeys = @()
                    partnerKeys = @("Numéro trans GU")
                }
                "USSDPART" = @{
                    filePattern = "*USSDPART*.xls"
                    fileType = "partner"
                    boKeys = @()
                    partnerKeys = @("token")
                }
            }
            
            foreach ($modelName in $missingModels) {
                if ($modelConfigs.ContainsKey($modelName)) {
                    $config = $modelConfigs[$modelName]
                    
                    Write-Host "  Création du modèle: $modelName" -ForegroundColor Gray
                    
                    $createData = @{
                        name = $modelName
                        filePattern = $config.filePattern
                        fileType = $config.fileType
                        reconciliationKeys = @{
                            partnerKeys = $config.partnerKeys
                            boModels = @()
                            boModelKeys = @{}
                            boKeys = $config.boKeys
                            boTreatments = @{}
                        }
                        autoApply = $true
                    }
                    
                    try {
                        $createResponse = Invoke-RestMethod -Uri "$baseUrl/auto-processing/models" -Method POST -Body ($createData | ConvertTo-Json -Depth 4) -ContentType "application/json"
                        Write-Host "  ✅ Modèle '$modelName' créé avec succès" -ForegroundColor Green
                    } catch {
                        Write-Host "  ❌ Erreur lors de la création du modèle '$modelName': $($_.Exception.Message)" -ForegroundColor Red
                    }
                }
            }
        }
        
        # Corriger les modèles existants
        foreach ($model in $models) {
            $rk = $model.reconciliationKeys
            $needsUpdate = $false
            $updateData = @{
                name = $model.name
                filePattern = $model.filePattern
                fileType = $model.fileType
                reconciliationKeys = @{
                    partnerKeys = $rk.partnerKeys
                    boModels = $rk.boModels
                    boModelKeys = $rk.boModelKeys
                    boKeys = $rk.boKeys
                    boTreatments = $rk.boTreatments
                }
            }
            
            # Corriger selon le type de modèle
            if ($model.fileType -eq "bo" -and (-not $rk.boKeys -or $rk.boKeys.Length -eq 0)) {
                Write-Host "  Correction du modèle BO: $($model.name)" -ForegroundColor Gray
                $updateData.reconciliationKeys.boKeys = @("Numéro Trans GU")
                $needsUpdate = $true
            } elseif ($model.fileType -eq "partner" -and (-not $rk.partnerKeys -or $rk.partnerKeys.Length -eq 0)) {
                Write-Host "  Correction du modèle Partner: $($model.name)" -ForegroundColor Gray
                
                # Déterminer la clé selon le nom du modèle
                if ($model.name -like "*OPPART*") {
                    $updateData.reconciliationKeys.partnerKeys = @("Numéro trans GU")
                } elseif ($model.name -like "*USSDPART*") {
                    $updateData.reconciliationKeys.partnerKeys = @("token")
                } else {
                    $updateData.reconciliationKeys.partnerKeys = @("CLE")  # Clé par défaut
                }
                $needsUpdate = $true
            }
            
            if ($needsUpdate) {
                try {
                    $updateResponse = Invoke-RestMethod -Uri "$baseUrl/auto-processing/models/$($model.id)" -Method PUT -Body ($updateData | ConvertTo-Json -Depth 4) -ContentType "application/json"
                    Write-Host "  ✅ Modèle '$($model.name)' corrigé avec succès" -ForegroundColor Green
                } catch {
                    Write-Host "  ❌ Erreur lors de la correction du modèle '$($model.name)': $($_.Exception.Message)" -ForegroundColor Red
                }
            }
        }
    }
    
    # 6. BugBot - Vérification finale
    Write-Host ""
    Write-Host "BugBot - Vérification finale..." -ForegroundColor Cyan
    
    $finalResponse = Invoke-RestMethod -Uri "$baseUrl/auto-processing/models" -Method GET
    $finalModels = $finalResponse.models
    
    Write-Host "📊 Modèles après correction: $($finalModels.Length)" -ForegroundColor Green
    
    foreach ($model in $finalModels) {
        Write-Host ""
        Write-Host "Modèle: $($model.name)" -ForegroundColor Yellow
        Write-Host "  - Type: $($model.fileType)" -ForegroundColor Gray
        Write-Host "  - Pattern: $($model.filePattern)" -ForegroundColor Gray
        
        $rk = $model.reconciliationKeys
        Write-Host "  - Partner Keys: $($rk.partnerKeys -join ', ')" -ForegroundColor Green
        Write-Host "  - BO Keys: $($rk.boKeys -join ', ')" -ForegroundColor Green
    }
    
    # 7. BugBot - Résumé et recommandations
    Write-Host ""
    Write-Host "BugBot - Résumé et recommandations:" -ForegroundColor Cyan
    
    $allModelsPresent = $true
    foreach ($requiredModel in $requiredModels) {
        $found = $finalModels | Where-Object { $_.name -eq $requiredModel }
        if ($found) {
            Write-Host "✅ Modèle '$requiredModel' présent et configuré" -ForegroundColor Green
        } else {
            Write-Host "❌ Modèle '$requiredModel' toujours manquant" -ForegroundColor Red
            $allModelsPresent = $false
        }
    }
    
    if ($allModelsPresent) {
        Write-Host ""
        Write-Host "🎉 BugBot - Correction terminée avec succès!" -ForegroundColor Green
        Write-Host "✅ Tous les modèles sont maintenant configurés" -ForegroundColor Green
        Write-Host ""
        Write-Host "Tests recommandés:" -ForegroundColor Yellow
        Write-Host "1. Upload TRXBO.xls + OPPART.xls" -ForegroundColor White
        Write-Host "2. Upload TRXBO.xls + USSDPART.xls" -ForegroundColor White
        Write-Host "3. Vérifier les correspondances dans les logs" -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "BugBot - Certains problèmes persistent" -ForegroundColor Yellow
        Write-Host "Vérifiez les logs d'erreur ci-dessus" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ BugBot - Erreur lors de l'exécution: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Détails: $($_.Exception)" -ForegroundColor Red
}

Write-Host ""
Write-Host "BugBot - Session terminée" -ForegroundColor Green
