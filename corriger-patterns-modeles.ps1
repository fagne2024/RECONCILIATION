# Script pour corriger les patterns des modèles et activer removeAccents
Write-Host "🔧 CORRECTION DES PATTERNS ET RÈGLES" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

try {
    # Récupérer tous les modèles
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    $models = $response.models
    
    Write-Host "📋 Modèles trouvés: $($models.Count)" -ForegroundColor White
    
    foreach ($model in $models) {
        Write-Host "`n🔍 Modèle: $($model.name) (ID: $($model.id))" -ForegroundColor Yellow
        Write-Host "  - Pattern actuel: $($model.filePattern)" -ForegroundColor Gray
        Write-Host "  - Type: $($model.fileType)" -ForegroundColor Gray
        
        # Corriger le pattern selon le type
        $newPattern = ""
        if ($model.fileType -eq "partner" -and $model.name -like "*OPPART*") {
            $newPattern = "*OPPART*.csv"
        } elseif ($model.fileType -eq "bo" -and $model.name -like "*TRXBO*") {
            $newPattern = "*TRXBO*.csv"
        } else {
            Write-Host "  ⚠️ Pattern non modifié (type non reconnu)" -ForegroundColor Yellow
            continue
        }
        
        if ($newPattern -ne "") {
            Write-Host "  ✅ Nouveau pattern: $newPattern" -ForegroundColor Green
            
            # Mettre à jour le modèle
            $updateData = @{
                name = $model.name
                filePattern = $newPattern
                fileType = $model.fileType
                autoApply = $model.autoApply
                templateFile = $model.templateFile
                reconciliationKeys = $model.reconciliationKeys
            }
            
            try {
                $updateResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$($model.id)" -Method PUT -Body ($updateData | ConvertTo-Json -Depth 10) -ContentType "application/json"
                Write-Host "  ✅ Modèle mis à jour avec succès" -ForegroundColor Green
            } catch {
                Write-Host "  ❌ Erreur lors de la mise à jour: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    }
    
    # Maintenant corriger les règles pour activer removeAccents
    Write-Host "`n🔧 CORRECTION DES RÈGLES - ACTIVATION removeAccents" -ForegroundColor Cyan
    
    foreach ($model in $models) {
        if ($model.columnProcessingRules.Count -gt 0) {
            Write-Host "`n📋 Modèle: $($model.name) - $($model.columnProcessingRules.Count) règles" -ForegroundColor Yellow
            
            foreach ($rule in $model.columnProcessingRules) {
                Write-Host "  🔍 Règle ID $($rule.id): $($rule.sourceColumn)" -ForegroundColor Gray
                Write-Host "    - removeAccents actuel: $($rule.removeAccents)" -ForegroundColor Gray
                
                # Activer removeAccents pour les colonnes importantes
                if ($rule.sourceColumn -eq "Numéro Trans GU" -or $rule.sourceColumn -eq "IDTransaction") {
                    $rule.removeAccents = $true
                    Write-Host "    ✅ removeAccents activé" -ForegroundColor Green
                }
            }
            
            # Sauvegarder les règles mises à jour
            try {
                $rulesResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$($model.modelId)/column-rules/batch" -Method POST -Body ($model.columnProcessingRules | ConvertTo-Json -Depth 10) -ContentType "application/json"
                Write-Host "  ✅ Règles mises à jour avec succès" -ForegroundColor Green
            } catch {
                Write-Host "  ❌ Erreur lors de la mise à jour des règles: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    }
    
    Write-Host "`n✅ Correction terminée!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}
