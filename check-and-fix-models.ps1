Write-Host "Verification et correction des modeles"

try {
    $models = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    Write-Host "Modeles trouves: $($models.models.Count)"
    
    foreach ($model in $models.models) {
        Write-Host "`nModele: $($model.name)"
        Write-Host "  Type: $($model.fileType)"
        Write-Host "  Pattern: $($model.filePattern)"
        
        if ($model.reconciliationKeys) {
            Write-Host "  Cles actuelles:"
            Write-Host "  - Partner: $($model.reconciliationKeys.partnerKeys -join ', ')"
            Write-Host "  - BO: $($model.reconciliationKeys.boKeys -join ', ')"
            
            # Verifier si les cles sont correctes
            $needsFix = $false
            if ($model.reconciliationKeys.partnerKeys -notcontains "Numero Trans GU") {
                $needsFix = $true
                Write-Host "  ❌ Cles partenaire incorrectes"
            }
            if ($model.reconciliationKeys.boKeys -notcontains "Numero Trans GU") {
                $needsFix = $true
                Write-Host "  ❌ Cles BO incorrectes"
            }
            
            if ($needsFix) {
                Write-Host "  🔧 Correction necessaire..."
                
                # Supprimer l'ancien modele
                try {
                    Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$($model.modelId)" -Method DELETE
                    Write-Host "  ✅ Ancien modele supprime"
                } catch {
                    Write-Host "  ⚠️ Erreur suppression: $($_.Exception.Message)"
                }
                
                # Creer le nouveau modele avec les bonnes cles
                $newModel = @{
                    name = $model.name
                    filePattern = $model.filePattern
                    fileType = $model.fileType
                    autoApply = $model.autoApply
                    templateFile = $model.templateFile
                    reconciliationKeys = @{
                        partnerKeys = @("Numero Trans GU")
                        boKeys = @("Numero Trans GU")
                        boModels = @()
                    }
                    columnProcessingRules = @()
                }
                
                try {
                    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method POST -Body ($newModel | ConvertTo-Json -Depth 10) -ContentType "application/json"
                    Write-Host "  ✅ Nouveau modele cree avec les bonnes cles"
                } catch {
                    Write-Host "  ❌ Erreur creation: $($_.Exception.Message)"
                }
            } else {
                Write-Host "  ✅ Cles correctes"
            }
        } else {
            Write-Host "  ℹ️ Pas de cles de reconciliation"
        }
    }
    
} catch {
    Write-Host "Erreur: $($_.Exception.Message)"
}

Write-Host "`nVerification terminee !"
