# Script pour corriger tous les modèles avec les clés spécifiées
# TRXBO: Numéro Trans GU
# OPPART: Numéro trans GU  
# USSDPART: token

Write-Host "Correction de tous les modèles avec les clés spécifiées" -ForegroundColor Cyan
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
    
    # 3. Configuration des clés pour chaque modèle
    $modelConfigs = @{
        "TRXBO" = @{
            keyColumn = "Numéro Trans GU"
            description = "Modèle BO avec clé Numéro Trans GU"
        }
        "OPPART" = @{
            keyColumn = "Numéro trans GU"
            description = "Modèle partenaire avec clé Numéro trans GU"
        }
        "USSDPART" = @{
            keyColumn = "token"
            description = "Modèle partenaire avec clé token"
        }
    }
    
    # 4. Traiter chaque modèle
    foreach ($modelName in $modelConfigs.Keys) {
        Write-Host ""
        Write-Host "Traitement du modèle: $modelName" -ForegroundColor Cyan
        Write-Host "Clé configurée: $($modelConfigs[$modelName].keyColumn)" -ForegroundColor Yellow
        
        $model = $modelsResponse | Where-Object { $_.name -eq $modelName }
        
        if ($model) {
            Write-Host "Modèle trouvé avec l'ID: $($model.id)" -ForegroundColor Green
            
            # Analyser la structure actuelle
            $rk = $model.reconciliationKeys
            Write-Host "Structure actuelle:" -ForegroundColor Gray
            Write-Host "  - Partner Keys: $($rk.partnerKeys -join ', ')" -ForegroundColor Gray
            Write-Host "  - BO Keys: $($rk.boKeys -join ', ')" -ForegroundColor Gray
            
            # Préparer les données de mise à jour selon le type de modèle
            $updateData = @{
                name = $model.name
                filePattern = $model.filePattern
                fileType = $model.fileType
                reconciliationKeys = @{
                    partnerKeys = @()
                    boModels = @()
                    boModelKeys = @{}
                    boKeys = @()
                    boTreatments = @{}
                }
            }
            
            # Configuration spécifique selon le modèle
            switch ($modelName) {
                "TRXBO" {
                    # Modèle BO - utiliser la clé comme boKeys
                    $updateData.reconciliationKeys.boKeys = @($modelConfigs[$modelName].keyColumn)
                    Write-Host "Configuration BO: clé principale = $($modelConfigs[$modelName].keyColumn)" -ForegroundColor Green
                }
                "OPPART" {
                    # Modèle partenaire - utiliser la clé comme partnerKeys
                    $updateData.reconciliationKeys.partnerKeys = @($modelConfigs[$modelName].keyColumn)
                    Write-Host "Configuration Partenaire: clé partenaire = $($modelConfigs[$modelName].keyColumn)" -ForegroundColor Green
                }
                "USSDPART" {
                    # Modèle partenaire - utiliser la clé comme partnerKeys
                    $updateData.reconciliationKeys.partnerKeys = @($modelConfigs[$modelName].keyColumn)
                    Write-Host "Configuration Partenaire: clé partenaire = $($modelConfigs[$modelName].keyColumn)" -ForegroundColor Green
                }
            }
            
            # Mettre à jour le modèle
            Write-Host "Mise à jour du modèle $modelName..." -ForegroundColor Yellow
            
            $updateResponse = Invoke-RestMethod -Uri "$baseUrl/auto-processing/models/$($model.id)" -Method PUT -Body ($updateData | ConvertTo-Json -Depth 4) -ContentType "application/json"
            
            Write-Host "Modèle $modelName mis à jour avec succès!" -ForegroundColor Green
            
            # Vérification
            $newRk = $updateResponse.reconciliationKeys
            Write-Host "Nouvelle structure:" -ForegroundColor Green
            Write-Host "  - Partner Keys: $($newRk.partnerKeys -join ', ')" -ForegroundColor Green
            Write-Host "  - BO Keys: $($newRk.boKeys -join ', ')" -ForegroundColor Green
            
        } else {
            Write-Host "Modèle $modelName non trouvé" -ForegroundColor Red
        }
    }
    
    # 5. Résumé final
    Write-Host ""
    Write-Host "Résumé de la correction:" -ForegroundColor Cyan
    Write-Host "✅ TRXBO: clé 'Numéro Trans GU' configurée" -ForegroundColor Green
    Write-Host "✅ OPPART: clé 'Numéro trans GU' configurée" -ForegroundColor Green
    Write-Host "✅ USSDPART: clé 'token' configurée" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Configuration finale:" -ForegroundColor Yellow
    Write-Host "  - TRXBO (BO) ↔ OPPART (Partner): Numéro Trans GU ↔ Numéro trans GU" -ForegroundColor White
    Write-Host "  - TRXBO (BO) ↔ USSDPART (Partner): Numéro Trans GU ↔ token" -ForegroundColor White
    
} catch {
    Write-Host "Erreur lors de la correction: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Détails: $($_.Exception)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Correction de tous les modèles terminée" -ForegroundColor Green
