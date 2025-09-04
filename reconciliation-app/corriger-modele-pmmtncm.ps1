# Script pour corriger la configuration du modèle PMMTNCM
Write-Host "🔧 Correction de la configuration du modèle PMMTNCM..." -ForegroundColor Yellow

try {
    # Récupérer le modèle PMMTNCM
    $models = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    $pmmtncmModel = $models.models | Where-Object { $_.modelId -eq "mod_le_bas_sur_pmmtncm_csv_68aa33b4" } | Select-Object -First 1
    
    if ($pmmtncmModel) {
        Write-Host "=== CONFIGURATION ACTUELLE ===" -ForegroundColor Green
        Write-Host "📋 Nom: $($pmmtncmModel.name)" -ForegroundColor White
        Write-Host "🔑 Clés BO: $($pmmtncmModel.reconciliationKeys.boKeys -join ', ')" -ForegroundColor White
        Write-Host "🔑 Clés Partenaire: $($pmmtncmModel.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor White
        Write-Host "❌ boModelKeys: VIDE" -ForegroundColor Red
        Write-Host ""
        
        # Préparer la correction
        $correctedModel = $pmmtncmModel | ConvertTo-Json -Depth 10 | ConvertFrom-Json
        
        # Corriger les boModelKeys
        $correctedModel.reconciliationKeys.boModelKeys."transaction_back_office_0587abae" = @("Numero Trans GU")
        
        Write-Host "=== CONFIGURATION CORRIGÉE ===" -ForegroundColor Green
        Write-Host "🔑 Clés BO spécifiques: $($correctedModel.reconciliationKeys.boModelKeys.'transaction_back_office_0587abae' -join ', ')" -ForegroundColor White
        Write-Host ""
        
        # Mettre à jour le modèle
        $updateBody = $correctedModel | ConvertTo-Json -Depth 10
        Write-Host "🔄 Mise à jour du modèle..." -ForegroundColor Yellow
        
        $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$($pmmtncmModel.id)" -Method PUT -Body $updateBody -ContentType "application/json"
        
        if ($response.success) {
            Write-Host "✅ Modèle PMMTNCM mis à jour avec succès!" -ForegroundColor Green
            Write-Host ""
            Write-Host "=== NOUVELLE CONFIGURATION ===" -ForegroundColor Green
            Write-Host "🔑 Clés BO: Numero Trans GU" -ForegroundColor White
            Write-Host "🔑 Clés Partenaire: External ID" -ForegroundColor White
            Write-Host "🔍 Colonnes de comparaison: Montant, Date, Service" -ForegroundColor White
            Write-Host ""
            Write-Host "🎯 Maintenant, testez à nouveau la réconciliation automatique!" -ForegroundColor Green
        } else {
            Write-Host "❌ Erreur lors de la mise à jour: $($response.message)" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Modèle PMMTNCM non trouvé" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}
