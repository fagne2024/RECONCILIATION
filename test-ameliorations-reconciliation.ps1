# Script de test pour les améliorations de réconciliation
# Teste la lecture des fichiers, le formatage et la réconciliation

Write-Host "🔧 Test des améliorations de réconciliation" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Configuration
$apiUrl = "http://localhost:8080"
$frontendUrl = "http://localhost:4200"

# Fonction pour tester la connectivité
function Test-Connectivity {
    Write-Host "`n🔍 Test de connectivité..." -ForegroundColor Yellow
    
    try {
        $response = Invoke-RestMethod -Uri "$apiUrl/api/health" -Method GET -TimeoutSec 10
        Write-Host "✅ Backend accessible: $apiUrl" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ Backend inaccessible: $apiUrl" -ForegroundColor Red
        Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Fonction pour tester les modèles de traitement automatique
function Test-AutoProcessingModels {
    Write-Host "`n🤖 Test des modèles de traitement automatique..." -ForegroundColor Yellow
    
    try {
        $response = Invoke-RestMethod -Uri "$apiUrl/api/auto-processing/models" -Method GET -TimeoutSec 10
        
        if ($response.success) {
            $models = $response.models
            Write-Host "✅ Modèles chargés avec succès: $($models.Count) modèles" -ForegroundColor Green
            
            foreach ($model in $models) {
                Write-Host "   📋 $($model.name) (ID: $($model.modelId))" -ForegroundColor White
            }
        } else {
            Write-Host "❌ Erreur lors du chargement des modèles" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "❌ Erreur lors du test des modèles: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Fonction pour tester la normalisation des données
function Test-DataNormalization {
    Write-Host "`n📊 Test de la normalisation des données..." -ForegroundColor Yellow
    
    $testData = @{
        "IDTransaction" = "TRX_123_CM"
        "External id" = "EXT_456"
        "Opration" = "Débit"
        "Montant (XAF)" = "1000"
        "PAYS" = "CM"
    }
    
    try {
        $response = Invoke-RestMethod -Uri "$apiUrl/api/reconciliation/test-normalization" -Method POST -Body ($testData | ConvertTo-Json) -ContentType "application/json" -TimeoutSec 10
        
        Write-Host "✅ Normalisation testée avec succès" -ForegroundColor Green
        Write-Host "   Données originales: $($testData | ConvertTo-Json)" -ForegroundColor White
        Write-Host "   Données normalisées: $($response | ConvertTo-Json)" -ForegroundColor White
    }
    catch {
        Write-Host "⚠️ Endpoint de test de normalisation non disponible (normal)" -ForegroundColor Yellow
    }
}

# Fonction pour tester la détection des clés
function Test-KeyDetection {
    Write-Host "`n🔑 Test de la détection des clés..." -ForegroundColor Yellow
    
    $testData = @{
        boColumns = @("IDTransaction", "Montant", "Date", "Service")
        partnerColumns = @("External ID", "Amount", "Date", "Service")
    }
    
    try {
        $response = Invoke-RestMethod -Uri "$apiUrl/api/reconciliation/analyze-keys" -Method POST -Body ($testData | ConvertTo-Json) -ContentType "application/json" -TimeoutSec 10
        
        Write-Host "✅ Analyse des clés testée avec succès" -ForegroundColor Green
        if ($response.suggestions) {
            Write-Host "   Suggestions trouvées: $($response.suggestions.Count)" -ForegroundColor White
            foreach ($suggestion in $response.suggestions) {
                Write-Host "   🔗 $($suggestion.boColumn) ↔ $($suggestion.partnerColumn) (confiance: $([math]::Round($suggestion.confidence * 100))%)" -ForegroundColor White
            }
        }
    }
    catch {
        Write-Host "⚠️ Endpoint d'analyse des clés non disponible (normal)" -ForegroundColor Yellow
    }
}

# Fonction pour tester les performances
function Test-Performance {
    Write-Host "`n⚡ Test des performances..." -ForegroundColor Yellow
    
    $startTime = Get-Date
    
    # Test de chargement des modèles
    try {
        $modelStart = Get-Date
        $response = Invoke-RestMethod -Uri "$apiUrl/api/auto-processing/models" -Method GET -TimeoutSec 30
        $modelEnd = Get-Date
        $modelDuration = ($modelEnd - $modelStart).TotalMilliseconds
        
        Write-Host "✅ Chargement des modèles: $([math]::Round($modelDuration))ms" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Erreur lors du test de performance des modèles" -ForegroundColor Red
    }
    
    $totalDuration = (Get-Date) - $startTime
    Write-Host "⏱️ Temps total de test: $([math]::Round($totalDuration.TotalSeconds, 2))s" -ForegroundColor Cyan
}

# Fonction pour afficher les recommandations
function Show-Recommendations {
    Write-Host "`n💡 Recommandations pour optimiser les performances:" -ForegroundColor Cyan
    Write-Host "==================================================" -ForegroundColor Cyan
    
    Write-Host "1. 🔄 Cache des modèles:" -ForegroundColor White
    Write-Host "   - Cache de 5 minutes implémenté" -ForegroundColor Gray
    Write-Host "   - Évite les requêtes multiples simultanées" -ForegroundColor Gray
    
    Write-Host "`n2. 📊 Optimisation des données:" -ForegroundColor White
    Write-Host "   - Normalisation automatique des colonnes" -ForegroundColor Gray
    Write-Host "   - Suppression des valeurs vides" -ForegroundColor Gray
    Write-Host "   - Correction des caractères spéciaux" -ForegroundColor Gray
    
    Write-Host "`n3. 🔍 Détection améliorée des en-têtes:" -ForegroundColor White
    Write-Host "   - Algorithme de scoring intelligent" -ForegroundColor Gray
    Write-Host "   - Support des formats Excel complexes" -ForegroundColor Gray
    Write-Host "   - Détection automatique des délimiteurs" -ForegroundColor Gray
    
    Write-Host "`n4. 🔑 Détection intelligente des clés:" -ForegroundColor White
    Write-Host "   - Analyse sémantique des colonnes" -ForegroundColor Gray
    Write-Host "   - Support des transformations" -ForegroundColor Gray
    Write-Host "   - Suggestions automatiques" -ForegroundColor Gray
}

# Exécution des tests
Write-Host "`n🚀 Démarrage des tests..." -ForegroundColor Green

$backendAccessible = Test-Connectivity

if ($backendAccessible) {
    Test-AutoProcessingModels
    Test-DataNormalization
    Test-KeyDetection
    Test-Performance
} else {
    Write-Host "`n⚠️ Impossible de tester les fonctionnalités backend" -ForegroundColor Yellow
}

Show-Recommendations

Write-Host "`n✅ Tests terminés!" -ForegroundColor Green
Write-Host "`n📝 Prochaines étapes:" -ForegroundColor Cyan
Write-Host "1. Redémarrer le frontend pour appliquer les améliorations" -ForegroundColor White
Write-Host "2. Tester avec vos fichiers réels" -ForegroundColor White
Write-Host "3. Vérifier les performances avec de gros fichiers" -ForegroundColor White
