# Script pour mettre a jour le modele existant avec les vraies valeurs normalisees
Write-Host "Mise a jour du modele existant avec les vraies valeurs normalisees" -ForegroundColor Cyan

$baseUrl = "http://localhost:8080/api"
$modelsEndpoint = "$baseUrl/auto-processing/models"

# ID du modele a mettre a jour (mod_le_bas_sur_trxbo_xls_4edf2523)
$modelId = "mod_le_bas_sur_trxbo_xls_4edf2523"

Write-Host "Modele a mettre a jour: $modelId" -ForegroundColor Yellow
Write-Host "Normalisation: Seulement la clé partenaire 'Reference' -> 'Référence'" -ForegroundColor Green
Write-Host "Clé BO: Garde 'IDTransaction' (pas de normalisation)" -ForegroundColor Blue

try {
    # Recuperer le modele actuel
    Write-Host "`nRecuperation du modele actuel..." -ForegroundColor Blue
    $response = Invoke-RestMethod -Uri $modelsEndpoint -Method GET
    $models = $response.models
    
    $targetModel = $models | Where-Object { $_.modelId -eq $modelId }
    
    if (-not $targetModel) {
        Write-Host "❌ Modele $modelId non trouve" -ForegroundColor Red
        return
    }
    
    Write-Host "✅ Modele trouve: $($targetModel.name) (ID: $($targetModel.id))" -ForegroundColor Green
    
    # Afficher l'etat actuel
    Write-Host "`nEtat actuel:" -ForegroundColor Cyan
    Write-Host "  Cles partenaires: $($targetModel.partnerKeys -join ', ')" -ForegroundColor White
    Write-Host "  Cles BO: $($targetModel.boModelKeys | ConvertTo-Json -Compress)" -ForegroundColor White
    
    # Preparer les mises a jour avec les vraies valeurs normalisees
    Write-Host "`nPreparation des mises a jour..." -ForegroundColor Blue
    
    # Mettre a jour le modele avec les vraies valeurs
    $updatedModel = $targetModel | ConvertTo-Json -Depth 10 | ConvertFrom-Json
    
    # Corriger UNIQUEMENT les cles partenaires avec les vraies valeurs normalisees
    if ($updatedModel.partnerKeys -contains "R f rence") {
        $updatedModel.partnerKeys = $updatedModel.partnerKeys | ForEach-Object {
            if ($_ -eq "R f rence") { "Référence" } else { $_ }
        }
        Write-Host "  ✅ Correction: 'R f rence' -> 'Référence'" -ForegroundColor Green
    }
    
    # Corriger aussi "Reference" vers "Référence" si present
    if ($updatedModel.partnerKeys -contains "Reference") {
        $updatedModel.partnerKeys = $updatedModel.partnerKeys | ForEach-Object {
            if ($_ -eq "Reference") { "Référence" } else { $_ }
        }
        Write-Host "  ✅ Correction: 'Reference' -> 'Référence'" -ForegroundColor Green
    }
    
    # NE PAS normaliser les cles BO - garder "IDTransaction" tel quel
    Write-Host "  ℹ️ Clés BO: Garde 'IDTransaction' (pas de normalisation)" -ForegroundColor Blue
    
    # Mettre a jour les cles de reconciliation si elles existent
    if ($updatedModel.reconciliationKeys) {
        # Ne pas changer la clé BO
        if ($updatedModel.reconciliationKeys.partnerKey -eq "Reference") {
            $updatedModel.reconciliationKeys.partnerKey = "Référence"
            Write-Host "  ✅ Correction reconciliation Partenaire: 'Reference' -> 'Référence'" -ForegroundColor Green
        }
        if ($updatedModel.reconciliationKeys.partnerKey -eq "R f rence") {
            $updatedModel.reconciliationKeys.partnerKey = "Référence"
            Write-Host "  ✅ Correction reconciliation Partenaire: 'R f rence' -> 'Référence'" -ForegroundColor Green
        }
        Write-Host "  ℹ️ Reconciliation BO: Garde '$($updatedModel.reconciliationKeys.boKey)' (pas de normalisation)" -ForegroundColor Blue
    }
    
    # Afficher les nouvelles valeurs
    Write-Host "`nNouvelles valeurs:" -ForegroundColor Cyan
    Write-Host "  Cles partenaires: $($updatedModel.partnerKeys -join ', ')" -ForegroundColor White
    Write-Host "  Cles BO: $($updatedModel.boModelKeys | ConvertTo-Json -Compress)" -ForegroundColor White
    
    # Demander confirmation
    $confirmation = Read-Host "`nVoulez-vous proceder a la mise a jour ? (O/N)"
    if ($confirmation -ne "O" -and $confirmation -ne "o") {
        Write-Host "❌ Mise a jour annulee" -ForegroundColor Red
        return
    }
    
    # Mettre a jour via l'API
    Write-Host "`nMise a jour via l'API..." -ForegroundColor Blue
    $updateUrl = "$modelsEndpoint/$($targetModel.id)"
    $body = $updatedModel | ConvertTo-Json -Depth 10
    
    $updateResponse = Invoke-RestMethod -Uri $updateUrl -Method PUT -Body $body -ContentType "application/json"
    
    Write-Host "`n✅ Modele mis a jour avec succes!" -ForegroundColor Green
    Write-Host "  ID: $($updateResponse.id)" -ForegroundColor White
    Write-Host "  Nom: $($updateResponse.name)" -ForegroundColor White
    
    Write-Host "`nClés finales:" -ForegroundColor Cyan
    Write-Host "  Partenaires: $($updateResponse.partnerKeys -join ', ')" -ForegroundColor Green
    Write-Host "  BO: $($updateResponse.boModelKeys | ConvertTo-Json -Compress)" -ForegroundColor Blue
    
    Write-Host "`n🎉 Le modele utilise maintenant les vraies valeurs normalisees!" -ForegroundColor Green
    Write-Host "💡 La réconciliation devrait maintenant fonctionner correctement." -ForegroundColor Yellow
    Write-Host "📝 Note: Clé BO 'IDTransaction' gardée sans normalisation" -ForegroundColor Blue
    
}
catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $errorBody = $reader.ReadToEnd()
        Write-Host "Details de l'erreur: $errorBody" -ForegroundColor Red
    }
}
