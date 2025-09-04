# Script pour corriger le modèle Oppart
# Ce script met à jour le modèle Oppart pour ajouter les boModelKeys manquantes

Write-Host "🔧 Correction du modèle Oppart" -ForegroundColor Cyan
Write-Host ""

# URL de base de l'API
$baseUrl = "http://localhost:3000/api"

try {
    # 1. Récupérer le modèle Oppart existant
    Write-Host "📋 Récupération du modèle Oppart..." -ForegroundColor Yellow
    $modelsResponse = Invoke-RestMethod -Uri "$baseUrl/auto-processing-models" -Method GET
    
    $oppartModel = $modelsResponse | Where-Object { $_.name -eq "Oppart" }
    
    if ($oppartModel) {
        Write-Host "✅ Modèle Oppart trouvé avec l'ID: $($oppartModel.id)" -ForegroundColor Green
        Write-Host "🔍 Structure actuelle:" -ForegroundColor Yellow
        Write-Host "   - reconciliationKeys: $($oppartModel.reconciliationKeys | ConvertTo-Json -Depth 3)" -ForegroundColor Gray
        
        # 2. Préparer les données de mise à jour
        $updateData = @{
            name = $oppartModel.name
            filePattern = $oppartModel.filePattern
            fileType = $oppartModel.fileType
            reconciliationKeys = @{
                partnerKeys = $oppartModel.reconciliationKeys.partnerKeys
                boModels = $oppartModel.reconciliationKeys.boModels
                boModelKeys = @{
                    "transaction_back_office_50b21405" = @("Numéro Trans GU")
                }
                boKeys = @("Numéro Trans GU")
                boTreatments = @{}
            }
        }
        
        Write-Host ""
        Write-Host "🔧 Données de mise à jour:" -ForegroundColor Yellow
        Write-Host ($updateData | ConvertTo-Json -Depth 4) -ForegroundColor Gray
        
        # 3. Mettre à jour le modèle
        Write-Host ""
        Write-Host "🔄 Mise à jour du modèle..." -ForegroundColor Yellow
        
        $updateResponse = Invoke-RestMethod -Uri "$baseUrl/auto-processing-models/$($oppartModel.id)" -Method PUT -Body ($updateData | ConvertTo-Json -Depth 4) -ContentType "application/json"
        
        Write-Host "✅ Modèle mis à jour avec succès!" -ForegroundColor Green
        Write-Host "🔍 Nouvelle structure:" -ForegroundColor Yellow
        Write-Host "   - reconciliationKeys: $($updateResponse.reconciliationKeys | ConvertTo-Json -Depth 3)" -ForegroundColor Gray
        
    } else {
        Write-Host "❌ Modèle Oppart non trouvé" -ForegroundColor Red
        Write-Host "📋 Modèles disponibles:" -ForegroundColor Yellow
        $modelsResponse | ForEach-Object { Write-Host "   - $($_.name) (ID: $($_.id))" -ForegroundColor Gray }
    }
    
} catch {
    Write-Host "❌ Erreur lors de la correction: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Détails: $($_.Exception)" -ForegroundColor Red
}

Write-Host ""
Write-Host "✅ Correction terminée" -ForegroundColor Green
