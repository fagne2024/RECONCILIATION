# Script de correction du modèle CIOMCM
# Corrige les clés de réconciliation pour utiliser les colonnes réellement disponibles

$API_BASE_URL = "http://localhost:8080/api"

Write-Host "🔧 Correction du modèle CIOMCM..." -ForegroundColor Yellow

# Récupérer tous les modèles
try {
    $models = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models" -Method GET
    Write-Host "✅ Modèles récupérés: $($models.Count) modèles trouvés" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors de la récupération des modèles: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Trouver le modèle CIOMCM
$ciomcmModel = $models | Where-Object { $_.name -like "*CIOMCM*" -or $_.filePattern -like "*CIOMCM*" }

if (-not $ciomcmModel) {
    Write-Host "❌ Aucun modèle CIOMCM trouvé" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Modèle CIOMCM trouvé: $($ciomcmModel.name)" -ForegroundColor Green
Write-Host "🔍 Configuration actuelle:" -ForegroundColor Yellow
Write-Host "  - Pattern: $($ciomcmModel.filePattern)" -ForegroundColor Gray
Write-Host "  - Partner Keys: $($ciomcmModel.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Gray
Write-Host "  - BO Keys: $($ciomcmModel.reconciliationKeys.boKeys -join ', ')" -ForegroundColor Gray

# Configuration corrigée - utiliser les colonnes réellement disponibles après traitement Orange Money
$correctedModel = @{
    name = $ciomcmModel.name
    filePattern = $ciomcmModel.filePattern
    fileType = $ciomcmModel.fileType
    autoApply = $ciomcmModel.autoApply
    templateFile = $ciomcmModel.templateFile
    reconciliationKeys = @{
        partnerKeys = @("Référence")  # Colonne disponible après traitement Orange Money
        boKeys = @("ID Transaction")  # Clé BO correcte
        boModels = $ciomcmModel.reconciliationKeys.boModels
        boModelKeys = $ciomcmModel.reconciliationKeys.boModelKeys
        boTreatments = $ciomcmModel.reconciliationKeys.boTreatments
    }
    columnProcessingRules = $ciomcmModel.columnProcessingRules
    reconciliationLogic = $ciomcmModel.reconciliationLogic
    correspondenceRules = $ciomcmModel.correspondenceRules
    comparisonColumns = $ciomcmModel.comparisonColumns
}

Write-Host "`n🔧 Configuration corrigée:" -ForegroundColor Yellow
        Write-Host "  - Partner Keys: Référence (colonne disponible après traitement)" -ForegroundColor Green
Write-Host "  - BO Keys: ID Transaction" -ForegroundColor Green
        Write-Host "  Note: Le traitement Orange Money conserve la colonne 'Référence'" -ForegroundColor Yellow

# Mettre à jour le modèle
try {
    Write-Host "`n🔄 Mise à jour du modèle..." -ForegroundColor Yellow
    $updateResponse = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models/$($ciomcmModel.id)" -Method PUT -Body ($correctedModel | ConvertTo-Json -Depth 10) -ContentType "application/json"
    
    if ($updateResponse.success -or $updateResponse.id) {
        Write-Host "✅ Modèle CIOMCM corrigé avec succès!" -ForegroundColor Green
        Write-Host "📋 Nouvelles clés de réconciliation:" -ForegroundColor Green
        Write-Host "  - Partenaire: Référence" -ForegroundColor Gray
        Write-Host "  - BO: ID Transaction" -ForegroundColor Gray
    } else {
        Write-Host "❌ Erreur lors de la mise à jour du modèle" -ForegroundColor Red
        Write-Host "Réponse: $($updateResponse | ConvertTo-Json)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Erreur lors de la mise à jour: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n🎉 Correction terminée! Le modèle CIOMCM utilise maintenant les colonnes réellement disponibles." -ForegroundColor Green
