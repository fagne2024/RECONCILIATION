# Script de diagnostic pour tous les modèles
# Vérifie l'état des modèles TRXBO, OPPART et USSDPART

Write-Host "Diagnostic de tous les modèles" -ForegroundColor Cyan
Write-Host ""

# URL de base de l'API
$baseUrl = "http://localhost:8080/api"

try {
    # 1. Vérifier si le serveur est accessible
    Write-Host "Vérification de l'accessibilité du serveur..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/auto-processing/models" -Method GET -TimeoutSec 5
        Write-Host "Serveur accessible sur le port 8080" -ForegroundColor Green
    } catch {
        Write-Host "Serveur non accessible sur le port 8080" -ForegroundColor Red
        Write-Host "Tentative sur le port 3000..." -ForegroundColor Yellow
        
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:3000/api/test" -Method GET -TimeoutSec 5
            Write-Host "Serveur accessible sur le port 3000" -ForegroundColor Green
            $baseUrl = "http://localhost:3000/api"
        } catch {
            Write-Host "Aucun serveur accessible" -ForegroundColor Red
            Write-Host "Veuillez démarrer le serveur backend" -ForegroundColor Yellow
            exit 1
        }
    }
    
    # 2. Récupérer tous les modèles
    Write-Host ""
    Write-Host "Récupération des modèles..." -ForegroundColor Yellow
    $modelsResponse = Invoke-RestMethod -Uri "$baseUrl/auto-processing/models" -Method GET
    
    Write-Host "Modèles trouvés: $($modelsResponse.Length)" -ForegroundColor Green
    
    # 3. Configuration attendue
    $expectedConfigs = @{
        "TRXBO" = @{
            keyColumn = "Numéro Trans GU"
            keyType = "BO"
            description = "Modèle BO avec clé Numéro Trans GU"
        }
        "OPPART" = @{
            keyColumn = "Numéro trans GU"
            keyType = "Partner"
            description = "Modèle partenaire avec clé Numéro trans GU"
        }
        "USSDPART" = @{
            keyColumn = "token"
            keyType = "Partner"
            description = "Modèle partenaire avec clé token"
        }
    }
    
    # 4. Analyser chaque modèle
    Write-Host ""
    Write-Host "Analyse des modèles:" -ForegroundColor Cyan
    
    foreach ($modelName in $expectedConfigs.Keys) {
        Write-Host ""
        Write-Host "Modèle: $modelName" -ForegroundColor Yellow
        Write-Host "Configuration attendue: $($expectedConfigs[$modelName].description)" -ForegroundColor Gray
        
        $model = $modelsResponse | Where-Object { $_.name -eq $modelName }
        
        if ($model) {
            Write-Host "✅ Modèle trouvé (ID: $($model.id))" -ForegroundColor Green
            
            $rk = $model.reconciliationKeys
            $expectedKey = $expectedConfigs[$modelName].keyColumn
            $keyType = $expectedConfigs[$modelName].keyType
            
            # Vérifier les clés selon le type
            $keyFound = $false
            $actualKey = ""
            
            if ($keyType -eq "BO") {
                if ($rk.boKeys -and $rk.boKeys.Contains($expectedKey)) {
                    $keyFound = $true
                    $actualKey = $expectedKey
                } elseif ($rk.boKeys) {
                    $actualKey = $rk.boKeys -join ", "
                }
            } else {
                if ($rk.partnerKeys -and $rk.partnerKeys.Contains($expectedKey)) {
                    $keyFound = $true
                    $actualKey = $expectedKey
                } elseif ($rk.partnerKeys) {
                    $actualKey = $rk.partnerKeys -join ", "
                }
            }
            
            if ($keyFound) {
                Write-Host "✅ Clé correcte: $actualKey" -ForegroundColor Green
            } else {
                Write-Host "❌ Clé incorrecte ou manquante" -ForegroundColor Red
                Write-Host "   Attendu: $expectedKey" -ForegroundColor Yellow
                Write-Host "   Actuel: $actualKey" -ForegroundColor Gray
            }
            
            # Afficher la structure complète
            Write-Host "Structure complète:" -ForegroundColor Gray
            Write-Host "   - Partner Keys: $($rk.partnerKeys -join ', ')" -ForegroundColor Gray
            Write-Host "   - BO Keys: $($rk.boKeys -join ', ')" -ForegroundColor Gray
            Write-Host "   - BO Models: $($rk.boModels -join ', ')" -ForegroundColor Gray
            
            if ($rk.boModelKeys) {
                Write-Host "   - BO Model Keys:" -ForegroundColor Gray
                foreach ($boModelId in $rk.boModelKeys.Keys) {
                    $keys = $rk.boModelKeys[$boModelId]
                    Write-Host "     * $boModelId`: $($keys -join ', ')" -ForegroundColor Gray
                }
            }
            
        } else {
            Write-Host "❌ Modèle non trouvé" -ForegroundColor Red
        }
    }
    
    # 5. Résumé des correspondances
    Write-Host ""
    Write-Host "Résumé des correspondances:" -ForegroundColor Cyan
    
    $trxboModel = $modelsResponse | Where-Object { $_.name -eq "TRXBO" }
    $oppartModel = $modelsResponse | Where-Object { $_.name -eq "OPPART" }
    $ussdpartModel = $modelsResponse | Where-Object { $_.name -eq "USSDPART" }
    
    if ($trxboModel -and $oppartModel) {
        $trxboKey = $trxboModel.reconciliationKeys.boKeys[0]
        $oppartKey = $oppartModel.reconciliationKeys.partnerKeys[0]
        Write-Host "✅ TRXBO ↔ OPPART: $trxboKey ↔ $oppartKey" -ForegroundColor Green
    } else {
        Write-Host "❌ TRXBO ↔ OPPART: Modèles manquants" -ForegroundColor Red
    }
    
    if ($trxboModel -and $ussdpartModel) {
        $trxboKey = $trxboModel.reconciliationKeys.boKeys[0]
        $ussdpartKey = $ussdpartModel.reconciliationKeys.partnerKeys[0]
        Write-Host "✅ TRXBO ↔ USSDPART: $trxboKey ↔ $ussdpartKey" -ForegroundColor Green
    } else {
        Write-Host "❌ TRXBO ↔ USSDPART: Modèles manquants" -ForegroundColor Red
    }
    
    # 6. Recommandations
    Write-Host ""
    Write-Host "Recommandations:" -ForegroundColor Cyan
    
    $allModelsFound = $trxboModel -and $oppartModel -and $ussdpartModel
    if ($allModelsFound) {
        Write-Host "✅ Tous les modèles sont présents" -ForegroundColor Green
        Write-Host "✅ Prêt pour les tests de réconciliation" -ForegroundColor Green
        Write-Host ""
        Write-Host "Tests recommandés:" -ForegroundColor Yellow
        Write-Host "1. Upload TRXBO.xls + OPPART.xls" -ForegroundColor White
        Write-Host "2. Upload TRXBO.xls + USSDPART.xls" -ForegroundColor White
        Write-Host "3. Vérifier les correspondances dans les logs" -ForegroundColor White
    } else {
        Write-Host "❌ Certains modèles sont manquants" -ForegroundColor Red
        Write-Host "Exécutez le script de correction: .\corriger-tous-modeles-cles.ps1" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "Erreur lors du diagnostic: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Détails: $($_.Exception)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Diagnostic terminé" -ForegroundColor Green
