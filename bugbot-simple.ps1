# BugBot Simple - Correction des modeles de reconciliation automatique
# Version simplifiee sans caracteres speciaux

Write-Host "BugBot Simple - Correction des modeles de reconciliation automatique" -ForegroundColor Cyan
Write-Host ""

# URL de base de l'API
$baseUrl = "http://localhost:8080/api"

try {
    # 1. Verifier si le serveur est accessible
    Write-Host "BugBot - Verification de l'accessibilite du serveur..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/auto-processing/models" -Method GET -TimeoutSec 5
        Write-Host "OK - Serveur accessible sur le port 8080" -ForegroundColor Green
    } catch {
        Write-Host "ERREUR - Serveur non accessible" -ForegroundColor Red
        Write-Host "BugBot recommande de demarrer le serveur backend" -ForegroundColor Yellow
        exit 1
    }
    
    # 2. Diagnostic initial
    Write-Host ""
    Write-Host "BugBot - Diagnostic initial..." -ForegroundColor Cyan
    
    $modelsResponse = Invoke-RestMethod -Uri "$baseUrl/auto-processing/models" -Method GET
    $models = $modelsResponse.models
    
    Write-Host "Modeles trouves: $($models.Length)" -ForegroundColor Green
    
    # 3. Analyser les problemes
    Write-Host ""
    Write-Host "BugBot - Analyse des problemes..." -ForegroundColor Cyan
    
    $problems = @()
    $solutions = @()
    
    # Verifier si les modeles requis existent
    $requiredModels = @("TRXBO", "OPPART", "USSDPART")
    $missingModels = @()
    
    foreach ($requiredModel in $requiredModels) {
        $found = $models | Where-Object { $_.name -eq $requiredModel }
        if (-not $found) {
            $missingModels += $requiredModel
            $problems += "Modele '$requiredModel' manquant"
            $solutions += "Creer le modele '$requiredModel' avec les cles appropriees"
        }
    }
    
    # Verifier la configuration des cles pour les modeles existants
    foreach ($model in $models) {
        $rk = $model.reconciliationKeys
        
        # Verifier les cles selon le type de modele
        if ($model.fileType -eq "bo") {
            if (-not $rk.boKeys -or $rk.boKeys.Length -eq 0) {
                $problems += "Modele BO '$($model.name)' sans cles BO"
                $solutions += "Ajouter les cles BO au modele '$($model.name)'"
            }
        } elseif ($model.fileType -eq "partner") {
            if (-not $rk.partnerKeys -or $rk.partnerKeys.Length -eq 0) {
                $problems += "Modele Partner '$($model.name)' sans cles Partner"
                $solutions += "Ajouter les cles Partner au modele '$($model.name)'"
            }
        }
    }
    
    # 4. Affichage du diagnostic
    Write-Host ""
    Write-Host "BugBot - Diagnostic complet:" -ForegroundColor Yellow
    
    if ($problems.Length -eq 0) {
        Write-Host "OK - Aucun probleme detecte" -ForegroundColor Green
        Write-Host "OK - Tous les modeles sont correctement configures" -ForegroundColor Green
    } else {
        Write-Host "PROBLEMES DETECTES:" -ForegroundColor Red
        foreach ($problem in $problems) {
            Write-Host "  $problem" -ForegroundColor Red
        }
        
        Write-Host ""
        Write-Host "Solutions proposees:" -ForegroundColor Yellow
        foreach ($solution in $solutions) {
            Write-Host "  $solution" -ForegroundColor Yellow
        }
    }
    
    # 5. Application des corrections
    if ($problems.Length -gt 0) {
        Write-Host ""
        Write-Host "BugBot - Application des corrections..." -ForegroundColor Cyan
        
        # Creer les modeles manquants
        if ($missingModels.Length -gt 0) {
            Write-Host "Creation des modeles manquants..." -ForegroundColor Yellow
            
            $modelConfigs = @{
                "TRXBO" = @{
                    filePattern = "*TRXBO*.xls"
                    fileType = "bo"
                    boKeys = @("Numero Trans GU")
                    partnerKeys = @()
                }
                "OPPART" = @{
                    filePattern = "*OPPART*.xls"
                    fileType = "partner"
                    boKeys = @()
                    partnerKeys = @("Numero trans GU")
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
                    
                    Write-Host "  Creation du modele: $modelName" -ForegroundColor Gray
                    
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
                        Write-Host "  OK - Modele '$modelName' cree avec succes" -ForegroundColor Green
                    } catch {
                        Write-Host "  ERREUR - Creation du modele '$modelName': $($_.Exception.Message)" -ForegroundColor Red
                    }
                }
            }
        }
        
        # Corriger les modeles existants
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
            
            # Corriger selon le type de modele
            if ($model.fileType -eq "bo" -and (-not $rk.boKeys -or $rk.boKeys.Length -eq 0)) {
                Write-Host "  Correction du modele BO: $($model.name)" -ForegroundColor Gray
                $updateData.reconciliationKeys.boKeys = @("Numero Trans GU")
                $needsUpdate = $true
            } elseif ($model.fileType -eq "partner" -and (-not $rk.partnerKeys -or $rk.partnerKeys.Length -eq 0)) {
                Write-Host "  Correction du modele Partner: $($model.name)" -ForegroundColor Gray
                
                # Determiner la cle selon le nom du modele
                if ($model.name -like "*OPPART*") {
                    $updateData.reconciliationKeys.partnerKeys = @("Numero trans GU")
                } elseif ($model.name -like "*USSDPART*") {
                    $updateData.reconciliationKeys.partnerKeys = @("token")
                } else {
                    $updateData.reconciliationKeys.partnerKeys = @("CLE")  # Cle par defaut
                }
                $needsUpdate = $true
            }
            
            if ($needsUpdate) {
                try {
                    $updateResponse = Invoke-RestMethod -Uri "$baseUrl/auto-processing/models/$($model.id)" -Method PUT -Body ($updateData | ConvertTo-Json -Depth 4) -ContentType "application/json"
                    Write-Host "  OK - Modele '$($model.name)' corrige avec succes" -ForegroundColor Green
                } catch {
                    Write-Host "  ERREUR - Correction du modele '$($model.name)': $($_.Exception.Message)" -ForegroundColor Red
                }
            }
        }
    }
    
    # 6. Verification finale
    Write-Host ""
    Write-Host "BugBot - Verification finale..." -ForegroundColor Cyan
    
    $finalResponse = Invoke-RestMethod -Uri "$baseUrl/auto-processing/models" -Method GET
    $finalModels = $finalResponse.models
    
    Write-Host "Modeles apres correction: $($finalModels.Length)" -ForegroundColor Green
    
    foreach ($model in $finalModels) {
        Write-Host ""
        Write-Host "Modele: $($model.name)" -ForegroundColor Yellow
        Write-Host "  - Type: $($model.fileType)" -ForegroundColor Gray
        Write-Host "  - Pattern: $($model.filePattern)" -ForegroundColor Gray
        
        $rk = $model.reconciliationKeys
        Write-Host "  - Partner Keys: $($rk.partnerKeys -join ', ')" -ForegroundColor Green
        Write-Host "  - BO Keys: $($rk.boKeys -join ', ')" -ForegroundColor Green
    }
    
    # 7. Resume et recommandations
    Write-Host ""
    Write-Host "BugBot - Resume et recommandations:" -ForegroundColor Cyan
    
    $allModelsPresent = $true
    foreach ($requiredModel in $requiredModels) {
        $found = $finalModels | Where-Object { $_.name -eq $requiredModel }
        if ($found) {
            Write-Host "OK - Modele '$requiredModel' present et configure" -ForegroundColor Green
        } else {
            Write-Host "ERREUR - Modele '$requiredModel' toujours manquant" -ForegroundColor Red
            $allModelsPresent = $false
        }
    }
    
    if ($allModelsPresent) {
        Write-Host ""
        Write-Host "SUCCES - BugBot - Correction terminee avec succes!" -ForegroundColor Green
        Write-Host "OK - Tous les modeles sont maintenant configures" -ForegroundColor Green
        Write-Host ""
        Write-Host "Tests recommandes:" -ForegroundColor Yellow
        Write-Host "1. Upload TRXBO.xls + OPPART.xls" -ForegroundColor White
        Write-Host "2. Upload TRXBO.xls + USSDPART.xls" -ForegroundColor White
        Write-Host "3. Verifier les correspondances dans les logs" -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "ATTENTION - BugBot - Certains problemes persistent" -ForegroundColor Yellow
        Write-Host "Verifiez les logs d'erreur ci-dessus" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "ERREUR - BugBot - Erreur lors de l'execution: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Details: $($_.Exception)" -ForegroundColor Red
}

Write-Host ""
Write-Host "BugBot - Session terminee" -ForegroundColor Green
