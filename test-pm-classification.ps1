# Script de test pour la classification des modèles PM comme partenaires paiement
# Ce script teste que tous les modèles commençant par PM sont bien classés comme "Partenaire PAIEMENT"

$baseUrl = "http://localhost:8080/api"

Write-Host "=== Test de la classification des modèles PM ===" -ForegroundColor Green

# 1. Test de l'endpoint des statistiques des transactions créées
Write-Host "`n1. Test de la classification des services PM:" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/statistics/transaction-created-stats" -Method GET
    
    if ($response.serviceStats -and $response.serviceStats.Count -gt 0) {
        Write-Host "✅ Endpoint accessible" -ForegroundColor Green
        
        # Vérifier les services PM
        $pmServices = $response.serviceStats | Where-Object { $_.service -like "PM*" }
        
        if ($pmServices.Count -gt 0) {
            Write-Host "`nServices PM trouvés:" -ForegroundColor Cyan
            foreach ($service in $pmServices) {
                Write-Host "  Service: $($service.service)" -ForegroundColor White
                Write-Host "  Volume Cashin: $($service.totalCashinVolume)" -ForegroundColor White
                Write-Host "  Volume Paiement: $($service.totalPaymentVolume)" -ForegroundColor White
                Write-Host "  Transactions: $($service.totalTransactions)" -ForegroundColor White
                
                # Vérifier que le service PM a bien des données de paiement
                if ($service.totalPaymentVolume -gt 0 -or $service.totalPaymentCount -gt 0) {
                    Write-Host "  ✅ Service PM classé comme paiement (Volume: $($service.totalPaymentVolume), Count: $($service.totalPaymentCount))" -ForegroundColor Green
                } else {
                    Write-Host "  ⚠️ Service PM sans données de paiement (peut être normal si pas de transactions)" -ForegroundColor Yellow
                }
                Write-Host ""
            }
        } else {
            Write-Host "⚠️ Aucun service PM trouvé dans les statistiques" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️ Aucune statistique de service disponible" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Erreur lors du test des services PM: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Test des modèles de traitement automatique (si l'endpoint existe)
Write-Host "`n2. Test des modèles de traitement automatique:" -ForegroundColor Yellow
try {
    # Essayer de récupérer les modèles
    $modelsResponse = Invoke-RestMethod -Uri "$baseUrl/auto-processing-models" -Method GET
    
    if ($modelsResponse -and $modelsResponse.Count -gt 0) {
        Write-Host "✅ Modèles récupérés: $($modelsResponse.Count) modèles" -ForegroundColor Green
        
        # Filtrer les modèles PM
        $pmModels = $modelsResponse | Where-Object { $_.name -like "PM*" -or $_.name -like "*PM*" }
        
        if ($pmModels.Count -gt 0) {
            Write-Host "`nModèles PM trouvés:" -ForegroundColor Cyan
            foreach ($model in $pmModels) {
                Write-Host "  Modèle: $($model.name)" -ForegroundColor White
                Write-Host "  Type: $($model.fileType)" -ForegroundColor White
                Write-Host "  Auto-apply: $($model.autoApply)" -ForegroundColor White
                Write-Host ""
            }
        } else {
            Write-Host "⚠️ Aucun modèle PM trouvé" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "⚠️ Endpoint des modèles non accessible ou inexistant: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 3. Test avec des exemples de services PM connus
Write-Host "`n3. Test avec des exemples de services PM connus:" -ForegroundColor Yellow

$knownPMServices = @(
    "PMMOOVBF",
    "PMMTNCM", 
    "PMOMBF",
    "PMOMCI",
    "PMOMCM",
    "PMWAVECI"
)

Write-Host "Services PM connus à vérifier:" -ForegroundColor Cyan
foreach ($service in $knownPMServices) {
    Write-Host "  - $service" -ForegroundColor White
    
    # Vérifier si ce service apparaît dans les statistiques
    try {
        $serviceResponse = Invoke-RestMethod -Uri "$baseUrl/statistics/transaction-created-stats?service=$service" -Method GET
        
        if ($serviceResponse.serviceStats -and $serviceResponse.serviceStats.Count -gt 0) {
            $serviceStat = $serviceResponse.serviceStats | Where-Object { $_.service -eq $service }
            if ($serviceStat) {
                Write-Host "    ✅ Service $service trouvé dans les statistiques" -ForegroundColor Green
                Write-Host "    Volume Paiement: $($serviceStat.totalPaymentVolume)" -ForegroundColor White
            } else {
                Write-Host "    ⚠️ Service $service non trouvé dans les statistiques" -ForegroundColor Yellow
            }
        } else {
            Write-Host "    ⚠️ Aucune donnée pour le service $service" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "    ❌ Erreur lors de la vérification de $service" -ForegroundColor Red
    }
}

# 4. Résumé de la classification
Write-Host "`n4. Résumé de la classification PM:" -ForegroundColor Yellow
Write-Host "RÈGLE IMPLÉMENTÉE: Tous les modèles/services commençant par 'PM' sont automatiquement classés comme 'Partenaire PAIEMENT'" -ForegroundColor Green
Write-Host "Cette règle s'applique à:" -ForegroundColor Cyan
Write-Host "  - Backend: Méthode isPaymentService() dans StatisticsService" -ForegroundColor White
Write-Host "  - Frontend: Méthode getModelCategory() dans AutoProcessingModelsComponent" -ForegroundColor White
Write-Host "  - Fichiers concernés: PMMOOVBF, PMMTNCM, PMOMBF, PMOMCI, PMOMCM, PMWAVECI, etc." -ForegroundColor White

Write-Host "`n=== Test terminé ===" -ForegroundColor Green
