# Script de diagnostic pour le modèle Oppart
# Ce script analyse l'état actuel du modèle et identifie les problèmes

Write-Host "Diagnostic du modèle Oppart" -ForegroundColor Cyan
Write-Host ""

# URL de base de l'API
$baseUrl = "http://localhost:3000/api"

try {
    # 1. Récupérer le modèle Oppart
    Write-Host "Récupération du modèle Oppart..." -ForegroundColor Yellow
    $modelsResponse = Invoke-RestMethod -Uri "$baseUrl/auto-processing-models" -Method GET
    
    $oppartModel = $modelsResponse | Where-Object { $_.name -eq "Oppart" }
    
    if ($oppartModel) {
        Write-Host "Modèle Oppart trouvé" -ForegroundColor Green
        Write-Host "   - ID: $($oppartModel.id)" -ForegroundColor Gray
        Write-Host "   - Pattern: $($oppartModel.filePattern)" -ForegroundColor Gray
        Write-Host "   - Type: $($oppartModel.fileType)" -ForegroundColor Gray
        
        Write-Host ""
        Write-Host "Analyse de la structure reconciliationKeys:" -ForegroundColor Yellow
        
        $rk = $oppartModel.reconciliationKeys
        
        # Vérifier partnerKeys
        if ($rk.partnerKeys -and $rk.partnerKeys.Length -gt 0) {
            Write-Host "partnerKeys: $($rk.partnerKeys -join ', ')" -ForegroundColor Green
        } else {
            Write-Host "partnerKeys: manquantes ou vides" -ForegroundColor Red
        }
        
        # Vérifier boModels
        if ($rk.boModels -and $rk.boModels.Length -gt 0) {
            Write-Host "boModels: $($rk.boModels -join ', ')" -ForegroundColor Green
        } else {
            Write-Host "boModels: manquants ou vides" -ForegroundColor Red
        }
        
        # Vérifier boModelKeys
        if ($rk.boModelKeys) {
            Write-Host "boModelKeys: présent" -ForegroundColor Green
            foreach ($boModelId in $rk.boModelKeys.Keys) {
                $keys = $rk.boModelKeys[$boModelId]
                if ($keys -and $keys.Length -gt 0) {
                    Write-Host "   $boModelId`: $($keys -join ', ')" -ForegroundColor Green
                } else {
                    Write-Host "   $boModelId`: tableau vide" -ForegroundColor Red
                }
            }
        } else {
            Write-Host "boModelKeys: manquant" -ForegroundColor Red
        }
        
        # Vérifier boKeys
        if ($rk.boKeys -and $rk.boKeys.Length -gt 0) {
            Write-Host "boKeys: $($rk.boKeys -join ', ')" -ForegroundColor Green
        } else {
            Write-Host "boKeys: manquantes ou vides" -ForegroundColor Red
        }
        
        # Vérifier boTreatments
        if ($rk.boTreatments) {
            Write-Host "boTreatments: présent" -ForegroundColor Green
        } else {
            Write-Host "boTreatments: manquant" -ForegroundColor Red
        }
        
        Write-Host ""
        Write-Host "Analyse des problèmes:" -ForegroundColor Yellow
        
        $problems = @()
        
        # Vérifier si boModelKeys est vide pour les boModels
        if ($rk.boModels -and $rk.boModelKeys) {
            foreach ($boModelId in $rk.boModels) {
                $keys = $rk.boModelKeys[$boModelId]
                if (-not $keys -or $keys.Length -eq 0) {
                    $problems += "boModelKeys vide pour $boModelId"
                }
            }
        }
        
        # Vérifier la cohérence des clés
        if ($rk.boModelKeys) {
            foreach ($boModelId in $rk.boModelKeys.Keys) {
                $keys = $rk.boModelKeys[$boModelId]
                if ($keys -and $keys.Length -gt 0) {
                    # Vérifier si les clés correspondent aux boKeys
                    $matchingKeys = $keys | Where-Object { $rk.boKeys -contains $_ }
                    if ($matchingKeys.Length -eq 0) {
                        $problems += "Clés boModelKeys ($($keys -join ', ')) ne correspondent pas aux boKeys ($($rk.boKeys -join ', '))"
                    }
                }
            }
        }
        
        if ($problems.Length -gt 0) {
            Write-Host "Problèmes détectés:" -ForegroundColor Red
            foreach ($problem in $problems) {
                Write-Host "   - $problem" -ForegroundColor Red
            }
        } else {
            Write-Host "Aucun problème détecté" -ForegroundColor Green
        }
        
        Write-Host ""
        Write-Host "Recommandations:" -ForegroundColor Cyan
        
        if ($rk.boModels -and $rk.boModelKeys) {
            foreach ($boModelId in $rk.boModels) {
                $keys = $rk.boModelKeys[$boModelId]
                if (-not $keys -or $keys.Length -eq 0) {
                    Write-Host "   - Ajouter 'Numéro Trans GU' dans boModelKeys[$boModelId]" -ForegroundColor Yellow
                }
            }
        }
        
        Write-Host ""
        Write-Host "Structure JSON attendue:" -ForegroundColor Cyan
        $expectedStructure = @{
            reconciliationKeys = @{
                partnerKeys = $rk.partnerKeys
                boModels = $rk.boModels
                boModelKeys = @{}
                boKeys = $rk.boKeys
                boTreatments = @{}
            }
        }
        
        # Ajouter les clés pour chaque boModel
        if ($rk.boModels) {
            foreach ($boModelId in $rk.boModels) {
                $expectedStructure.reconciliationKeys.boModelKeys[$boModelId] = @("Numéro Trans GU")
            }
        }
        
        Write-Host ($expectedStructure | ConvertTo-Json -Depth 4) -ForegroundColor Gray
        
    } else {
        Write-Host "Modèle Oppart non trouvé" -ForegroundColor Red
        Write-Host "Modèles disponibles:" -ForegroundColor Yellow
        $modelsResponse | ForEach-Object { Write-Host "   - $($_.name) (ID: $($_.id))" -ForegroundColor Gray }
    }
    
} catch {
    Write-Host "Erreur lors du diagnostic: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Détails: $($_.Exception)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Diagnostic terminé" -ForegroundColor Green
