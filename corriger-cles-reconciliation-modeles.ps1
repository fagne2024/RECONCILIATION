# Script pour corriger les clés de réconciliation corrompues dans les modèles
Write-Host "🔧 Correction des clés de réconciliation corrompues" -ForegroundColor Cyan

# Configuration de l'API
$baseUrl = "http://localhost:8080/api"
$modelsEndpoint = "$baseUrl/auto-processing/models"

Write-Host "`n📋 Problème identifié :" -ForegroundColor Yellow
Write-Host "   ❌ Clé partenaire corrompue: 'R f rence'" -ForegroundColor Red
Write-Host "   ✅ Clé partenaire correcte: 'Référence'" -ForegroundColor Green
Write-Host "   ✅ Clé BO correcte: 'IDTransaction'" -ForegroundColor Green

# Fonction pour récupérer tous les modèles
function Get-AllModels {
    try {
        Write-Host "`n🔄 Récupération des modèles depuis l'API..." -ForegroundColor Blue
        $response = Invoke-RestMethod -Uri $modelsEndpoint -Method GET
        Write-Host "✅ $($response.length) modèles récupérés" -ForegroundColor Green
        return $response
    }
    catch {
        Write-Host "❌ Erreur lors de la récupération des modèles: $($_.Exception.Message)" -ForegroundColor Red
        return @()
    }
}

# Fonction pour corriger un modèle
function Update-Model {
    param(
        [string]$modelId,
        [object]$modelData
    )
    
    try {
        Write-Host "🔄 Mise à jour du modèle $modelId..." -ForegroundColor Blue
        
        # Corriger les clés partenaires corrompues
        if ($modelData.partnerKeys -and $modelData.partnerKeys -contains "R f rence") {
            Write-Host "   🔧 Correction de 'R f rence' -> 'Référence'" -ForegroundColor Yellow
            $modelData.partnerKeys = $modelData.partnerKeys | ForEach-Object {
                if ($_ -eq "R f rence") { "Référence" } else { $_ }
            }
        }
        
        # Mettre à jour le modèle via l'API
        $updateUrl = "$modelsEndpoint/$modelId"
        $body = $modelData | ConvertTo-Json -Depth 10
        
        $response = Invoke-RestMethod -Uri $updateUrl -Method PUT -Body $body -ContentType "application/json"
        
        Write-Host "   ✅ Modèle $modelId mis à jour avec succès" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "   ❌ Erreur lors de la mise à jour du modèle $modelId : $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Fonction principale
function Start-Correction {
    Write-Host "`n🚀 Début de la correction des modèles..." -ForegroundColor Green
    
    # Récupérer tous les modèles
    $models = Get-AllModels
    
    if ($models.Length -eq 0) {
        Write-Host "❌ Aucun modèle trouvé ou erreur de connexion" -ForegroundColor Red
        return
    }
    
    $modelsToUpdate = @()
    
    # Identifier les modèles à corriger
    foreach ($model in $models) {
        if ($model.partnerKeys -and $model.partnerKeys -contains "R f rence") {
            $modelsToUpdate += $model
            Write-Host "🔍 Modèle à corriger trouvé: $($model.name) (ID: $($model.id))" -ForegroundColor Yellow
        }
    }
    
    if ($modelsToUpdate.Length -eq 0) {
        Write-Host "✅ Aucun modèle nécessitant une correction trouvé" -ForegroundColor Green
        return
    }
    
    Write-Host "`n📊 Résumé des corrections à effectuer :" -ForegroundColor Cyan
    Write-Host "   📋 Nombre de modèles à corriger: $($modelsToUpdate.Length)" -ForegroundColor White
    
    # Demander confirmation
    $confirmation = Read-Host "`n❓ Voulez-vous procéder à la correction ? (O/N)"
    if ($confirmation -ne "O" -and $confirmation -ne "o") {
        Write-Host "❌ Correction annulée" -ForegroundColor Red
        return
    }
    
    # Effectuer les corrections
    $successCount = 0
    foreach ($model in $modelsToUpdate) {
        if (Update-Model -modelId $model.id -modelData $model) {
            $successCount++
        }
    }
    
    # Résumé final
    Write-Host "`n📊 Résumé de la correction :" -ForegroundColor Cyan
    Write-Host "   ✅ Modèles corrigés avec succès: $successCount" -ForegroundColor Green
    Write-Host "   ❌ Modèles en erreur: $($modelsToUpdate.Length - $successCount)" -ForegroundColor Red
    
    if ($successCount -gt 0) {
        Write-Host "`n🎉 Correction terminée ! Les modèles ont été mis à jour." -ForegroundColor Green
        Write-Host "💡 Redémarrez l'application pour voir les changements." -ForegroundColor Yellow
    }
}

# Exécuter la correction
Start-Correction
