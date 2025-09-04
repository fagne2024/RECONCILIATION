# Script pour créer les modèles avec les clés spécifiées
# TRXBO: Numéro Trans GU
# OPPART: Numéro trans GU  
# USSDPART: token

Write-Host "Création des modèles avec les clés spécifiées" -ForegroundColor Cyan
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
        Write-Host "Serveur non accessible" -ForegroundColor Red
        Write-Host "Veuillez démarrer le serveur backend" -ForegroundColor Yellow
        exit 1
    }
    
    # 2. Configuration des modèles à créer
    $modelsToCreate = @(
        @{
            name = "TRXBO"
            filePattern = "*TRXBO*.xls"
            fileType = "bo"
            reconciliationKeys = @{
                partnerKeys = @()
                boModels = @()
                boModelKeys = @{}
                boKeys = @("Numéro Trans GU")
                boTreatments = @{}
            }
            description = "Modèle BO avec clé Numéro Trans GU"
        },
        @{
            name = "OPPART"
            filePattern = "*OPPART*.xls"
            fileType = "partner"
            reconciliationKeys = @{
                partnerKeys = @("Numéro trans GU")
                boModels = @()
                boModelKeys = @{}
                boKeys = @()
                boTreatments = @{}
            }
            description = "Modèle partenaire avec clé Numéro trans GU"
        },
        @{
            name = "USSDPART"
            filePattern = "*USSDPART*.xls"
            fileType = "partner"
            reconciliationKeys = @{
                partnerKeys = @("token")
                boModels = @()
                boModelKeys = @{}
                boKeys = @()
                boTreatments = @{}
            }
            description = "Modèle partenaire avec clé token"
        }
    )
    
    # 3. Créer chaque modèle
    foreach ($modelConfig in $modelsToCreate) {
        Write-Host ""
        Write-Host "Création du modèle: $($modelConfig.name)" -ForegroundColor Cyan
        Write-Host "Description: $($modelConfig.description)" -ForegroundColor Gray
        
        # Préparer les données de création
        $createData = @{
            name = $modelConfig.name
            filePattern = $modelConfig.filePattern
            fileType = $modelConfig.fileType
            reconciliationKeys = $modelConfig.reconciliationKeys
            autoApply = $true
        }
        
        Write-Host "Données de création:" -ForegroundColor Yellow
        Write-Host ($createData | ConvertTo-Json -Depth 4) -ForegroundColor Gray
        
        # Créer le modèle
        Write-Host "Création du modèle $($modelConfig.name)..." -ForegroundColor Yellow
        
        $createResponse = Invoke-RestMethod -Uri "$baseUrl/auto-processing/models" -Method POST -Body ($createData | ConvertTo-Json -Depth 4) -ContentType "application/json"
        
        Write-Host "Modèle $($modelConfig.name) créé avec succès!" -ForegroundColor Green
        Write-Host "ID: $($createResponse.id)" -ForegroundColor Gray
        
        # Vérification
        $newRk = $createResponse.reconciliationKeys
        Write-Host "Structure créée:" -ForegroundColor Green
        Write-Host "  - Partner Keys: $($newRk.partnerKeys -join ', ')" -ForegroundColor Green
        Write-Host "  - BO Keys: $($newRk.boKeys -join ', ')" -ForegroundColor Green
    }
    
    # 4. Vérification finale
    Write-Host ""
    Write-Host "Vérification finale des modèles créés..." -ForegroundColor Cyan
    
    $finalResponse = Invoke-RestMethod -Uri "$baseUrl/auto-processing/models" -Method GET
    $models = $finalResponse.models
    
    Write-Host "Modèles trouvés: $($models.Length)" -ForegroundColor Green
    
    foreach ($model in $models) {
        Write-Host ""
        Write-Host "Modèle: $($model.name)" -ForegroundColor Yellow
        Write-Host "  - Pattern: $($model.filePattern)" -ForegroundColor Gray
        Write-Host "  - Type: $($model.fileType)" -ForegroundColor Gray
        
        $rk = $model.reconciliationKeys
        Write-Host "  - Partner Keys: $($rk.partnerKeys -join ', ')" -ForegroundColor Green
        Write-Host "  - BO Keys: $($rk.boKeys -join ', ')" -ForegroundColor Green
    }
    
    # 5. Résumé final
    Write-Host ""
    Write-Host "Résumé de la création:" -ForegroundColor Cyan
    Write-Host "✅ TRXBO: clé 'Numéro Trans GU' configurée" -ForegroundColor Green
    Write-Host "✅ OPPART: clé 'Numéro trans GU' configurée" -ForegroundColor Green
    Write-Host "✅ USSDPART: clé 'token' configurée" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Configuration finale:" -ForegroundColor Yellow
    Write-Host "  - TRXBO (BO) ↔ OPPART (Partner): Numéro Trans GU ↔ Numéro trans GU" -ForegroundColor White
    Write-Host "  - TRXBO (BO) ↔ USSDPART (Partner): Numéro Trans GU ↔ token" -ForegroundColor White
    
    Write-Host ""
    Write-Host "Prochaines étapes:" -ForegroundColor Cyan
    Write-Host "1. Testez avec TRXBO.xls + OPPART.xls" -ForegroundColor White
    Write-Host "2. Testez avec TRXBO.xls + USSDPART.xls" -ForegroundColor White
    Write-Host "3. Vérifiez les correspondances dans les logs" -ForegroundColor White
    
} catch {
    Write-Host "Erreur lors de la création: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Détails: $($_.Exception)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Création des modèles terminée" -ForegroundColor Green
