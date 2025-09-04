# Test de réconciliation direct pour debug
Write-Host "🔍 Test de réconciliation direct pour USSDPART" -ForegroundColor Yellow

# Récupérer les modèles
Write-Host "📋 Récupération des modèles..." -ForegroundColor Cyan
$models = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET

# Trouver le modèle USSDPART
$ussdpartModel = $models | Where-Object { $_.name -eq "Ussdpart" }
Write-Host "🔍 Modèle USSDPART trouvé: $($ussdpartModel.name)" -ForegroundColor Green

# Afficher les clés configurées
Write-Host "🔑 Clés configurées:" -ForegroundColor Cyan
Write-Host "  BO Keys: $($ussdpartModel.reconciliationKeys.boKeys -join ', ')" -ForegroundColor White
Write-Host "  Partner Keys: $($ussdpartModel.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor White

# Créer un test de réconciliation simple
$testRequest = @{
    boKeyColumn = "Numero Trans GU"
    partnerKeyColumn = "Token"
    boFileContent = @(
        @{
            "Numero Trans GU" = "1751485986212"
            "montant" = "1000"
            "Service" = "TEST"
        },
        @{
            "Numero Trans GU" = "1751485981705"
            "montant" = "2000"
            "Service" = "TEST"
        }
    )
    partnerFileContent = @(
        @{
            "Token" = "1751485986212"
            "Montant" = "1000"
            "Type" = "TEST"
        },
        @{
            "Token" = "1751485981705"
            "Montant" = "2000"
            "Type" = "TEST"
        }
    )
    comparisonColumns = @(
        @{
            boColumn = "montant"
            partnerColumn = "Montant"
        }
    )
}

Write-Host "🧪 Test de réconciliation avec données simples..." -ForegroundColor Cyan
Write-Host "  BO Keys: $($testRequest.boFileContent[0].'Numero Trans GU'), $($testRequest.boFileContent[1].'Numero Trans GU')" -ForegroundColor White
Write-Host "  Partner Keys: $($testRequest.partnerFileContent[0].Token), $($testRequest.partnerFileContent[1].Token)" -ForegroundColor White

# Convertir en JSON
$jsonRequest = $testRequest | ConvertTo-Json -Depth 10

# Appeler l'API de réconciliation
Write-Host "🔄 Appel de l'API de réconciliation..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/reconciliation/reconcile" -Method POST -Body $jsonRequest -ContentType "application/json"
    
    Write-Host "✅ Réponse reçue:" -ForegroundColor Green
    Write-Host "  Matches: $($response.matches.Count)" -ForegroundColor White
    Write-Host "  BoOnly: $($response.boOnly.Count)" -ForegroundColor White
    Write-Host "  PartnerOnly: $($response.partnerOnly.Count)" -ForegroundColor White
    Write-Host "  Mismatches: $($response.mismatches.Count)" -ForegroundColor White
    
    if ($response.matches.Count -gt 0) {
        Write-Host "🎉 MATCHES TROUVÉS!" -ForegroundColor Green
        foreach ($match in $response.matches) {
            Write-Host "  Match: $($match.key)" -ForegroundColor Green
        }
    } else {
        Write-Host "❌ AUCUN MATCH TROUVÉ" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Erreur lors de l'appel API: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Détails: $($_.Exception.Response)" -ForegroundColor Red
}
