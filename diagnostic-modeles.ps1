# Script de diagnostic pour analyser l'état des modèles

Write-Host "Diagnostic des modèles..." -ForegroundColor Cyan
Write-Host ""

try {
    # Récupérer tous les modèles
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    $models = $response.models
    
    Write-Host "Nombre total de modèles: $($models.Count)" -ForegroundColor Yellow
    Write-Host ""
    
    # Analyser chaque modèle en détail
    foreach ($model in $models) {
        Write-Host "=== MODÈLE: $($model.name) ===" -ForegroundColor Green
        Write-Host "  - ID: $($model.id)" -ForegroundColor Gray
        Write-Host "  - Type: $($model.fileType)" -ForegroundColor Gray
        Write-Host "  - Pattern: $($model.filePattern)" -ForegroundColor Gray
        
        $rk = $model.reconciliationKeys
        Write-Host "  - Partner Keys: $($rk.partnerKeys -join ', ')" -ForegroundColor Gray
        Write-Host "  - BO Keys: $($rk.boKeys -join ', ')" -ForegroundColor Gray
        Write-Host "  - BO Models: $($rk.boModels -join ', ')" -ForegroundColor Gray
        Write-Host "  - BO Model Keys: $($rk.boModelKeys | ConvertTo-Json)" -ForegroundColor Gray
        Write-Host ""
    }
    
    # Rechercher spécifiquement OPPART
    Write-Host "=== RECHERCHE SPÉCIFIQUE OPPART ===" -ForegroundColor Yellow
    
    $oppartModels = $models | Where-Object { 
        $_.name -like "*OPPART*" -or 
        $_.name -like "*Oppart*" -or 
        $_.filePattern -like "*OPPART*" 
    }
    
    if ($oppartModels) {
        Write-Host "✅ Modèles OPPART trouvés: $($oppartModels.Count)" -ForegroundColor Green
        foreach ($oppart in $oppartModels) {
            Write-Host "  - $($oppart.name) (ID: $($oppart.id))" -ForegroundColor Green
        }
    } else {
        Write-Host "❌ Aucun modèle OPPART trouvé" -ForegroundColor Red
    }
    
    # Rechercher TRXBO
    Write-Host ""
    Write-Host "=== RECHERCHE SPÉCIFIQUE TRXBO ===" -ForegroundColor Yellow
    
    $trxboModels = $models | Where-Object { 
        $_.name -like "*TRXBO*" -or 
        $_.name -like "*Transaction*" -or 
        $_.fileType -eq "bo" 
    }
    
    if ($trxboModels) {
        Write-Host "✅ Modèles TRXBO/BO trouvés: $($trxboModels.Count)" -ForegroundColor Green
        foreach ($trxbo in $trxboModels) {
            Write-Host "  - $($trxbo.name) (ID: $($trxbo.id))" -ForegroundColor Green
        }
    } else {
        Write-Host "❌ Aucun modèle TRXBO/BO trouvé" -ForegroundColor Red
    }
    
    # Vérifier les correspondances
    Write-Host ""
    Write-Host "=== VÉRIFICATION DES CORRESPONDANCES ===" -ForegroundColor Yellow
    
    if ($oppartModels -and $trxboModels) {
        $oppart = $oppartModels[0]
        $trxbo = $trxboModels[0]
        
        $oppartKey = $oppart.reconciliationKeys.partnerKeys[0]
        $trxboKey = $trxbo.reconciliationKeys.boKeys[0]
        
        Write-Host "🔗 Correspondance: $($trxbo.name) ↔ $($oppart.name)" -ForegroundColor Cyan
        Write-Host "  - Clé BO: $trxboKey" -ForegroundColor Gray
        Write-Host "  - Clé Partenaire: $oppartKey" -ForegroundColor Gray
        
        if ($oppartKey -eq $trxboKey) {
            Write-Host "✅ Correspondance parfaite!" -ForegroundColor Green
        } else {
            Write-Host "❌ Correspondance incorrecte" -ForegroundColor Red
        }
    }
    
} catch {
    Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
}
