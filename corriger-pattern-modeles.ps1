# Script pour corriger les patterns des modèles pour accepter les fichiers CSV
Write-Host "Correction des patterns des modeles pour accepter les fichiers CSV..." -ForegroundColor Cyan
Write-Host ""

# Fonction pour corriger un modèle
function Corriger-Pattern-Modele {
    param(
        [string]$NomModele,
        [string]$NouveauPattern
    )
    
    Write-Host "=== Correction du pattern du modele $NomModele ===" -ForegroundColor Yellow
    
    try {
        # 1. Récupérer le modèle existant
        $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
        $modeles = $response.models
        $modele = $modeles | Where-Object { $_.name -eq $NomModele }
        
        if (-not $modele) {
            Write-Host "❌ Modele $NomModele non trouve" -ForegroundColor Red
            return
        }
        
        Write-Host "✅ Modele $NomModele trouve avec ID: $($modele.id)" -ForegroundColor Green
        Write-Host "   - Ancien pattern: $($modele.filePattern)" -ForegroundColor Gray
        Write-Host "   - Nouveau pattern: $NouveauPattern" -ForegroundColor Gray
        
        # 2. Mettre à jour le modèle avec le nouveau pattern
        $modele.filePattern = $NouveauPattern
        
        Write-Host "🔄 Mise a jour du modele..." -ForegroundColor Yellow
        $updateResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$($modele.id)" -Method PUT -Body ($modele | ConvertTo-Json -Depth 10) -ContentType "application/json"
        
        Write-Host "✅ Modele $NomModele mis a jour avec succes!" -ForegroundColor Green
        Write-Host "   - Nouveau pattern: $NouveauPattern" -ForegroundColor Gray
        
    } catch {
        Write-Host "❌ Erreur lors de la correction du modele $NomModele : $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
}

# Corriger le pattern d'Oppart pour accepter CSV et XLS
Corriger-Pattern-Modele -NomModele "Oppart" -NouveauPattern "*OPPART*.(csv|xls|xlsx)"

# Corriger le pattern d'Ussdpart pour accepter CSV et XLS
Corriger-Pattern-Modele -NomModele "Ussdpart" -NouveauPattern "*USSDPART*.(csv|xls|xlsx)"

Write-Host "=== Verification finale ===" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    $modeles = $response.models
    
    Write-Host "✅ $($modeles.Count) modeles trouves" -ForegroundColor Green
    
    # Afficher les modèles partenaires
    $partnerModels = $modeles | Where-Object { $_.fileType -eq "partner" }
    Write-Host "📋 $($partnerModels.Count) modeles partenaires:" -ForegroundColor Yellow
    
    foreach ($model in $partnerModels) {
        Write-Host ""
        Write-Host "=== MODELE: $($model.name) ===" -ForegroundColor Green
        Write-Host "  - Pattern: $($model.filePattern)" -ForegroundColor Gray
        Write-Host "  - Partner Keys: $($model.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Gray
        Write-Host "  - BO Keys: $($model.reconciliationKeys.boKeys -join ', ')" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "❌ Erreur lors de la verification: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 Correction des patterns terminee!" -ForegroundColor Green
Write-Host ""
Write-Host "Les patterns corriges:" -ForegroundColor Yellow
Write-Host "✅ Oppart: *OPPART*.(csv|xls|xlsx) - Accepte CSV, XLS et XLSX" -ForegroundColor Green
Write-Host "✅ Ussdpart: *USSDPART*.(csv|xls|xlsx) - Accepte CSV, XLS et XLSX" -ForegroundColor Green
Write-Host ""
Write-Host "Testez maintenant avec vos fichiers CSV!" -ForegroundColor Green
