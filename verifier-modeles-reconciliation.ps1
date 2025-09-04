# Script pour vérifier l'état des modèles de réconciliation
Write-Host "🔍 Vérification de l'état des modèles de réconciliation" -ForegroundColor Cyan

# Configuration de l'API
$baseUrl = "http://localhost:8080/api"
$modelsEndpoint = "$baseUrl/auto-processing/models"

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

# Fonction pour analyser un modèle
function Analyze-Model {
    param(
        [object]$model
    )
    
    Write-Host "`n📋 Modèle: $($model.name)" -ForegroundColor Yellow
    Write-Host "   🆔 ID: $($model.id)" -ForegroundColor White
    
    # Analyser les clés partenaires
    if ($model.partnerKeys) {
        Write-Host "   🔑 Clés partenaires:" -ForegroundColor Blue
        foreach ($key in $model.partnerKeys) {
            if ($key -eq "R f rence") {
                Write-Host "      ❌ '$key' (CORROMPUE)" -ForegroundColor Red
            } else {
                Write-Host "      ✅ '$key'" -ForegroundColor Green
            }
        }
    } else {
        Write-Host "   ⚠️ Aucune clé partenaire définie" -ForegroundColor Yellow
    }
    
    # Analyser les clés BO
    if ($model.boModelKeys) {
        Write-Host "   🔑 Clés BO:" -ForegroundColor Blue
        foreach ($boModel in $model.boModelKeys.Keys) {
            $keys = $model.boModelKeys[$boModel]
            Write-Host "      📄 $boModel:" -ForegroundColor White
            foreach ($key in $keys) {
                Write-Host "         ✅ '$key'" -ForegroundColor Green
            }
        }
    } else {
        Write-Host "   ⚠️ Aucune clé BO définie" -ForegroundColor Yellow
    }
    
    # Vérifier les traitements
    if ($model.boTreatments) {
        $totalTreatments = 0
        foreach ($boModel in $model.boTreatments.Keys) {
            $totalTreatments += $model.boTreatments[$boModel].Length
        }
        Write-Host "   🔧 Traitements BO: $totalTreatments" -ForegroundColor Blue
    }
}

# Fonction principale
function Start-Analysis {
    Write-Host "`n🚀 Début de l'analyse des modèles..." -ForegroundColor Green
    
    # Récupérer tous les modèles
    $models = Get-AllModels
    
    if ($models.Length -eq 0) {
        Write-Host "❌ Aucun modèle trouvé ou erreur de connexion" -ForegroundColor Red
        return
    }
    
    Write-Host "`n📊 Analyse détaillée des modèles:" -ForegroundColor Cyan
    
    $modelsWithCorruptedKeys = @()
    
    # Analyser chaque modèle
    foreach ($model in $models) {
        Analyze-Model -model $model
        
        # Vérifier s'il y a des clés corrompues
        if ($model.partnerKeys -and $model.partnerKeys -contains "R f rence") {
            $modelsWithCorruptedKeys += $model
        }
    }
    
    # Résumé final
    Write-Host "`n📊 Résumé de l'analyse:" -ForegroundColor Cyan
    Write-Host "   📋 Total modèles: $($models.Length)" -ForegroundColor White
    Write-Host "   ❌ Modèles avec clés corrompues: $($modelsWithCorruptedKeys.Length)" -ForegroundColor Red
    Write-Host "   ✅ Modèles corrects: $($models.Length - $modelsWithCorruptedKeys.Length)" -ForegroundColor Green
    
    if ($modelsWithCorruptedKeys.Length -gt 0) {
        Write-Host "`n⚠️ Modèles nécessitant une correction:" -ForegroundColor Yellow
        foreach ($model in $modelsWithCorruptedKeys) {
            Write-Host "   • $($model.name) (ID: $($model.id))" -ForegroundColor Red
        }
        
        Write-Host "`n💡 Pour corriger ces modèles, exécutez: .\corriger-cles-reconciliation-modeles.ps1" -ForegroundColor Yellow
    } else {
        Write-Host "`n✅ Tous les modèles sont corrects !" -ForegroundColor Green
    }
}

# Exécuter l'analyse
Start-Analysis
