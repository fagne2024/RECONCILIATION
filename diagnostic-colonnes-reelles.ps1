# Script pour diagnostiquer les vraies colonnes dans les fichiers
# Ce script analyse les colonnes réelles dans les fichiers de données

Write-Host "Diagnostic des colonnes réelles dans les fichiers" -ForegroundColor Cyan
Write-Host ""

# URL de base de l'API
$baseUrl = "http://localhost:8080/api"

try {
    # 1. Vérifier si le serveur est accessible
    Write-Host "Vérification de l'accessibilité du serveur..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET -TimeoutSec 5
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
    
    Write-Host ""
    Write-Host "Analyse des modèles disponibles..." -ForegroundColor Yellow
    
    # 2. Récupérer les modèles
    $modelsResponse = Invoke-RestMethod -Uri "$baseUrl/auto-processing-models" -Method GET
    
    Write-Host "Modèles trouvés: $($modelsResponse.Length)" -ForegroundColor Green
    
    foreach ($model in $modelsResponse) {
        Write-Host ""
        Write-Host "Modèle: $($model.name)" -ForegroundColor Cyan
        Write-Host "  - Pattern: $($model.filePattern)" -ForegroundColor Gray
        Write-Host "  - Type: $($model.fileType)" -ForegroundColor Gray
        
        if ($model.reconciliationKeys) {
            $rk = $model.reconciliationKeys
            Write-Host "  - Clés de réconciliation:" -ForegroundColor Yellow
            
            if ($rk.partnerKeys) {
                Write-Host "    * Partner Keys: $($rk.partnerKeys -join ', ')" -ForegroundColor Green
            }
            
            if ($rk.boKeys) {
                Write-Host "    * BO Keys: $($rk.boKeys -join ', ')" -ForegroundColor Green
            }
            
            if ($rk.boModelKeys) {
                Write-Host "    * BO Model Keys:" -ForegroundColor Green
                foreach ($boModelId in $rk.boModelKeys.Keys) {
                    $keys = $rk.boModelKeys[$boModelId]
                    Write-Host "      - $boModelId`: $($keys -join ', ')" -ForegroundColor Gray
                }
            }
        }
    }
    
    Write-Host ""
    Write-Host "Recommandations:" -ForegroundColor Cyan
    
    # 3. Analyser le modèle Oppart spécifiquement
    $oppartModel = $modelsResponse | Where-Object { $_.name -eq "Oppart" }
    
    if ($oppartModel) {
        Write-Host "Pour le modèle Oppart:" -ForegroundColor Yellow
        
        $rk = $oppartModel.reconciliationKeys
        
        # Vérifier la cohérence des clés
        if ($rk.partnerKeys -and $rk.boModelKeys) {
            foreach ($boModelId in $rk.boModelKeys.Keys) {
                $boKeys = $rk.boModelKeys[$boModelId]
                $partnerKeys = $rk.partnerKeys
                
                Write-Host "  - BO Model: $boModelId" -ForegroundColor White
                Write-Host "    * BO Keys attendues: $($boKeys -join ', ')" -ForegroundColor White
                Write-Host "    * Partner Keys attendues: $($partnerKeys -join ', ')" -ForegroundColor White
                
                # Vérifier si les clés correspondent aux données réelles
                Write-Host "    * Vérification nécessaire:" -ForegroundColor Yellow
                Write-Host "      - Les données BO ont-elles la colonne '$($boKeys -join ', ')' ?" -ForegroundColor Gray
                Write-Host "      - Les données Partner ont-elles la colonne '$($partnerKeys -join ', ')' ?" -ForegroundColor Gray
            }
        }
        
        Write-Host ""
        Write-Host "Actions recommandées:" -ForegroundColor Cyan
        Write-Host "1. Vérifier les colonnes réelles dans TRXBO.xls" -ForegroundColor Yellow
        Write-Host "2. Vérifier les colonnes réelles dans OPPART.xls" -ForegroundColor Yellow
        Write-Host "3. Corriger le modèle si les colonnes ne correspondent pas" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "Erreur lors du diagnostic: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Détails: $($_.Exception)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Diagnostic terminé" -ForegroundColor Green
