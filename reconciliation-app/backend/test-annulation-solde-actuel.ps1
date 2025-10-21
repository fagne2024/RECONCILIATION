# Test de l'annulation avec solde actuel
# Ce script teste que l'annulation utilise le solde actuel du compte (0.00) 
# au lieu du solde chronologique

Write-Host "🧪 Test d'annulation avec solde actuel" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Configuration
$baseUrl = "http://localhost:8080"
$compteId = "CELCM0001"

Write-Host "`n📊 État initial du compte $compteId" -ForegroundColor Yellow

# 1. Vérifier l'état initial du compte
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/comptes/$compteId" -Method GET
    Write-Host "   Solde actuel: $($response.solde)" -ForegroundColor Green
    Write-Host "   Date dernière MAJ: $($response.dateDerniereMaj)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Erreur lors de la récupération du compte: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Récupérer les opérations du compte
Write-Host "`n📋 Opérations du compte" -ForegroundColor Yellow
try {
    $operations = Invoke-RestMethod -Uri "$baseUrl/api/operations?compteId=$compteId" -Method GET
    Write-Host "   Nombre d'opérations: $($operations.Count)" -ForegroundColor Green
    
    # Afficher les dernières opérations
    $operations | Sort-Object { [DateTime]$_.dateOperation } | Select-Object -Last 5 | ForEach-Object {
        $date = [DateTime]$_.dateOperation
        Write-Host "   $($date.ToString('dd/MM/yyyy HH:mm')) - $($_.typeOperation) - $($_.montant) - Solde: $($_.soldeAvant) → $($_.soldeApres)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ Erreur lors de la récupération des opérations: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 3. Identifier l'opération à annuler (la première TRANSACTION DÉNOUÉE de 85,000)
$operationAAnnuler = $operations | Where-Object { 
    $_.typeOperation -eq "TRANSACTION DÉNOUÉE" -and 
    $_.montant -eq 85000 -and 
    $_.statut -ne "Annulée" 
} | Select-Object -First 1

if (-not $operationAAnnuler) {
    Write-Host "   ❌ Aucune opération TRANSACTION DÉNOUÉE de 85,000 trouvée" -ForegroundColor Red
    exit 1
}

Write-Host "`n🎯 Opération à annuler trouvée:" -ForegroundColor Yellow
Write-Host "   ID: $($operationAAnnuler.id)" -ForegroundColor Gray
Write-Host "   Type: $($operationAAnnuler.typeOperation)" -ForegroundColor Gray
Write-Host "   Montant: $($operationAAnnuler.montant)" -ForegroundColor Gray
Write-Host "   Solde avant: $($operationAAnnuler.soldeAvant)" -ForegroundColor Gray
Write-Host "   Solde après: $($operationAAnnuler.soldeApres)" -ForegroundColor Gray

# 4. Annuler l'opération
Write-Host "`n🔄 Annulation de l'opération..." -ForegroundColor Yellow
try {
    $annulationBody = @{
        statut = "Annulée"
    } | ConvertTo-Json -Depth 3

    $response = Invoke-RestMethod -Uri "$baseUrl/api/operations/$($operationAAnnuler.id)/statut" -Method PUT -Body $annulationBody -ContentType "application/json"
    Write-Host "   ✅ Opération annulée avec succès" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Erreur lors de l'annulation: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 5. Vérifier le résultat
Write-Host "`n📊 Vérification du résultat" -ForegroundColor Yellow

# Attendre un peu pour que les calculs se terminent
Start-Sleep -Seconds 2

# Récupérer le compte mis à jour
try {
    $compteApres = Invoke-RestMethod -Uri "$baseUrl/api/comptes/$compteId" -Method GET
    Write-Host "   Solde du compte après annulation: $($compteApres.solde)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Erreur lors de la récupération du compte: $($_.Exception.Message)" -ForegroundColor Red
}

# Récupérer les opérations mises à jour
try {
    $operationsApres = Invoke-RestMethod -Uri "$baseUrl/api/operations?compteId=$compteId" -Method GET
    
    # Chercher l'opération d'annulation
    $operationAnnulation = $operationsApres | Where-Object { 
        $_.id -eq $operationAAnnuler.id -and 
        $_.typeOperation -like "Annulation_*" 
    }
    
    if ($operationAnnulation) {
        Write-Host "   ✅ Opération d'annulation trouvée:" -ForegroundColor Green
        Write-Host "      Type: $($operationAnnulation.typeOperation)" -ForegroundColor Gray
        Write-Host "      Solde avant: $($operationAnnulation.soldeAvant)" -ForegroundColor Gray
        Write-Host "      Solde après: $($operationAnnulation.soldeApres)" -ForegroundColor Gray
        
        # Vérifier que le solde avant est bien 0.00 (solde actuel)
        if ($operationAnnulation.soldeAvant -eq 0.00) {
            Write-Host "      ✅ Solde avant correct: 0.00" -ForegroundColor Green
        } else {
            Write-Host "      ❌ Solde avant incorrect: $($operationAnnulation.soldeAvant) (attendu: 0.00)" -ForegroundColor Red
        }
        
        # Vérifier que le solde après est bien 85,000
        if ($operationAnnulation.soldeApres -eq 85000) {
            Write-Host "      ✅ Solde après correct: 85,000" -ForegroundColor Green
        } else {
            Write-Host "      ❌ Solde après incorrect: $($operationAnnulation.soldeApres) (attendu: 85,000)" -ForegroundColor Red
        }
    } else {
        Write-Host "   ❌ Opération d'annulation non trouvée" -ForegroundColor Red
    }
    
    # Chercher les frais annulés
    $fraisAnnules = $operationsApres | Where-Object { 
        $_.typeOperation -like "Annulation_FRAIS_TRANSACTION" -and 
        $_.statut -eq "Annulée" 
    }
    
    if ($fraisAnnules) {
        Write-Host "   ✅ Frais annulés trouvés: $($fraisAnnules.Count)" -ForegroundColor Green
        foreach ($frais in $fraisAnnules) {
            Write-Host "      Frais - Solde avant: $($frais.soldeAvant), Solde après: $($frais.soldeApres)" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ⚠️ Aucun frais annulé trouvé" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "   ❌ Erreur lors de la récupération des opérations: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n✅ Test terminé" -ForegroundColor Cyan
