# Script pour corriger le modèle Oppart avec les vraies clés
# Basé sur l'analyse des données réelles

Write-Host "Correction du modèle Oppart avec les vraies clés" -ForegroundColor Cyan
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
    
    # 2. Récupérer le modèle Oppart existant
    Write-Host ""
    Write-Host "Récupération du modèle Oppart..." -ForegroundColor Yellow
    $modelsResponse = Invoke-RestMethod -Uri "$baseUrl/auto-processing-models" -Method GET
    
    $oppartModel = $modelsResponse | Where-Object { $_.name -eq "Oppart" }
    
    if ($oppartModel) {
        Write-Host "Modèle Oppart trouvé avec l'ID: $($oppartModel.id)" -ForegroundColor Green
        
        # 3. Analyser les clés actuelles
        Write-Host ""
        Write-Host "Analyse des clés actuelles:" -ForegroundColor Yellow
        $rk = $oppartModel.reconciliationKeys
        
        Write-Host "  - Partner Keys actuelles: $($rk.partnerKeys -join ', ')" -ForegroundColor Gray
        Write-Host "  - BO Keys actuelles: $($rk.boKeys -join ', ')" -ForegroundColor Gray
        
        if ($rk.boModelKeys) {
            foreach ($boModelId in $rk.boModelKeys.Keys) {
                $keys = $rk.boModelKeys[$boModelId]
                Write-Host "  - BO Model Keys pour $boModelId`: $($keys -join ', ')" -ForegroundColor Gray
            }
        }
        
        # 4. Basé sur les logs, corriger avec les vraies clés
        Write-Host ""
        Write-Host "Correction basée sur les logs:" -ForegroundColor Cyan
        Write-Host "  - BO Key normalisée: 'Numero_Trans_GU'" -ForegroundColor Green
        Write-Host "  - Partner Key réelle: 'CLE'" -ForegroundColor Green
        
        # 5. Préparer les données de mise à jour
        $currentBoModelId = $rk.boModels[0]
        
        $updateData = @{
            name = $oppartModel.name
            filePattern = $oppartModel.filePattern
            fileType = $oppartModel.fileType
            reconciliationKeys = @{
                partnerKeys = @("CLE")  # Clé partenaire réelle
                boModels = $oppartModel.reconciliationKeys.boModels
                boModelKeys = @{
                    "$currentBoModelId" = @("Numero_Trans_GU")  # Clé BO normalisée
                }
                boKeys = @("Numero_Trans_GU")  # Clé BO normalisée
                boTreatments = @{}
            }
        }
        
        Write-Host ""
        Write-Host "Données de mise à jour:" -ForegroundColor Yellow
        Write-Host ($updateData | ConvertTo-Json -Depth 4) -ForegroundColor Gray
        
        # 6. Mettre à jour le modèle
        Write-Host ""
        Write-Host "Mise à jour du modèle..." -ForegroundColor Yellow
        
        $updateResponse = Invoke-RestMethod -Uri "$baseUrl/auto-processing-models/$($oppartModel.id)" -Method PUT -Body ($updateData | ConvertTo-Json -Depth 4) -ContentType "application/json"
        
        Write-Host "Modèle mis à jour avec succès!" -ForegroundColor Green
        
        # 7. Vérification
        Write-Host ""
        Write-Host "Vérification de la correction:" -ForegroundColor Cyan
        $newRk = $updateResponse.reconciliationKeys
        
        Write-Host "  - Partner Keys: $($newRk.partnerKeys -join ', ')" -ForegroundColor Green
        Write-Host "  - BO Keys: $($newRk.boKeys -join ', ')" -ForegroundColor Green
        
        if ($newRk.boModelKeys) {
            foreach ($boModelId in $newRk.boModelKeys.Keys) {
                $keys = $newRk.boModelKeys[$boModelId]
                Write-Host "  - BO Model Keys pour $boModelId`: $($keys -join ', ')" -ForegroundColor Green
            }
        }
        
        Write-Host ""
        Write-Host "Correction terminée!" -ForegroundColor Green
        Write-Host "Le modèle Oppart utilise maintenant:" -ForegroundColor Cyan
        Write-Host "  - Partner Key: 'CLE'" -ForegroundColor White
        Write-Host "  - BO Key: 'Numero_Trans_GU'" -ForegroundColor White
        
    } else {
        Write-Host "Modèle Oppart non trouvé" -ForegroundColor Red
        Write-Host "Modèles disponibles:" -ForegroundColor Yellow
        $modelsResponse | ForEach-Object { Write-Host "  - $($_.name) (ID: $($_.id))" -ForegroundColor Gray }
    }
    
} catch {
    Write-Host "Erreur lors de la correction: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Détails: $($_.Exception)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Correction terminée" -ForegroundColor Green
