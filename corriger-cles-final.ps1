# Script pour corriger définitivement les clés des modèles
Write-Host "Correction definitive des cles des modeles..." -ForegroundColor Cyan
Write-Host ""

# Fonction pour corriger un modèle
function Corriger-Modele {
    param(
        [string]$NomModele,
        [string]$Pattern,
        [string]$PartnerKey,
        [string]$BoKey
    )
    
    Write-Host "=== Correction du modele $NomModele ===" -ForegroundColor Yellow
    
    # 1. Récupérer le modèle existant
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
        $modeles = $response.models
        $modele = $modeles | Where-Object { $_.name -eq $NomModele }
        
        if (-not $modele) {
            Write-Host "❌ Modele $NomModele non trouve" -ForegroundColor Red
            return
        }
        
        Write-Host "✅ Modele $NomModele trouve avec ID: $($modele.id)" -ForegroundColor Green
        
        # 2. Supprimer le modèle existant
        Write-Host "🗑️ Suppression du modele existant..." -ForegroundColor Yellow
        $deleteResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$($modele.id)" -Method DELETE
        Write-Host "✅ Modele supprime" -ForegroundColor Green
        
        # 3. Créer le nouveau modèle avec la structure simplifiée
        Write-Host "🔄 Creation du nouveau modele..." -ForegroundColor Yellow
        
        $nouveauModele = @{
            name = $NomModele
            filePattern = $Pattern
            fileType = "partner"
            autoApply = $true
            templateFile = "$NomModele.xls"
            reconciliationKeys = @{
                partnerKeys = @($PartnerKey)
                boKeys = @($BoKey)
                boModels = @()
                boModelKeys = @{}
                boTreatments = @{}
            }
        }
        
        $createResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method POST -Body ($nouveauModele | ConvertTo-Json -Depth 10) -ContentType "application/json"
        
        Write-Host "✅ Nouveau modele $NomModele cree avec succes!" -ForegroundColor Green
        Write-Host "   - Partner Keys: $PartnerKey" -ForegroundColor Gray
        Write-Host "   - BO Keys: $BoKey" -ForegroundColor Gray
        Write-Host "   - boModels: vide" -ForegroundColor Gray
        Write-Host "   - boModelKeys: vide" -ForegroundColor Gray
        
    } catch {
        Write-Host "❌ Erreur lors de la correction du modele $NomModele : $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
}

# Corriger Oppart
Corriger-Modele -NomModele "Oppart" -Pattern "*OPPART*.xls" -PartnerKey "Numero Trans GU" -BoKey "Numero Trans GU"

# Corriger Ussdpart
Corriger-Modele -NomModele "Ussdpart" -Pattern "USSDPART.xls" -PartnerKey "Token" -BoKey "Numero Trans GU"

Write-Host "=== Verification finale ===" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    $modeles = $response.models
    
    Write-Host "✅ $($modeles.Count) modeles trouves" -ForegroundColor Green
    
    foreach ($modele in $modeles) {
        Write-Host ""
        Write-Host "=== MODELE: $($modele.name) ===" -ForegroundColor Green
        Write-Host "  - Type: $($modele.fileType)" -ForegroundColor Gray
        Write-Host "  - Pattern: $($modele.filePattern)" -ForegroundColor Gray
        
        if ($modele.reconciliationKeys) {
            Write-Host "  - Partner Keys: $($modele.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Gray
            Write-Host "  - BO Keys: $($modele.reconciliationKeys.boKeys -join ', ')" -ForegroundColor Gray
            Write-Host "  - BO Models: $($modele.reconciliationKeys.boModels -join ', ')" -ForegroundColor Gray
            Write-Host "  - boModelKeys vide: $($modele.reconciliationKeys.boModelKeys.Keys.Count -eq 0)" -ForegroundColor Gray
        }
    }
    
} catch {
    Write-Host "❌ Erreur lors de la verification: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 Correction terminee! Testez maintenant la reconciliation automatique." -ForegroundColor Green
