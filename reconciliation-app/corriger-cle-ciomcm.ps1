# Script pour corriger la clé partenaire du modèle CIOMCM
Write-Host "🔧 Correction de la clé partenaire du modèle CIOMCM..." -ForegroundColor Cyan

$API_BASE_URL = "http://localhost:8080/api"

try {
    # Récupérer le modèle CIOMCM
    $response = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models" -Method GET
    $ciomcmModel = $response.models | Where-Object { $_.name -like "*CIOMCM*" } | Select-Object -First 1
    
    if (-not $ciomcmModel) {
        Write-Host "❌ Modèle CIOMCM non trouvé" -ForegroundColor Red
        exit
    }
    
    Write-Host "📋 Modèle CIOMCM trouvé: $($ciomcmModel.name)" -ForegroundColor Green
    Write-Host "   ID: $($ciomcmModel.id)" -ForegroundColor Gray
    Write-Host "   Pattern: $($ciomcmModel.filePattern)" -ForegroundColor Gray
    Write-Host "   Clés partenaires actuelles: $($ciomcmModel.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Gray
    
    # Mettre à jour la clé partenaire
    # D'après les logs, le fichier traité contient seulement 3 colonnes
    # Nous devons utiliser une colonne qui existe réellement
    $ciomcmModel.reconciliationKeys.partnerKeys = @("Compte Orange Money")
    
    Write-Host "🔄 Mise à jour de la clé partenaire vers: $($ciomcmModel.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Yellow
    
    # Sauvegarder le modèle
    $updateResponse = Invoke-RestMethod -Uri "$API_BASE_URL/auto-processing/models/$($ciomcmModel.id)" -Method PUT -Body ($ciomcmModel | ConvertTo-Json -Depth 10) -ContentType "application/json"
    
    Write-Host "✅ Modèle CIOMCM mis à jour avec succès!" -ForegroundColor Green
    Write-Host "   Nouvelle clé partenaire: $($ciomcmModel.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎯 Correction terminée!" -ForegroundColor Cyan
