# Test de l'annulation avec création de nouvelle ligne
# Ce script teste que l'annulation crée une nouvelle ligne au lieu de modifier l'existante

Write-Host "🧪 Test d'annulation avec nouvelle ligne" -ForegroundColor Cyan
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

# 2. Récupérer les opérations du compte AVANT annulation
Write-Host "`n📋 Opérations AVANT annulation" -ForegroundColor Yellow
try {
    $operationsAvant = Invoke-RestMethod -Uri "$baseUrl/api/operations?compteId=$compteId" -Method GET
    Write-Host "   Nombre d'opérations: $($operationsAvant.Count)" -ForegroundColor Green
    
    # Compter les opérations par type
    $operationsParType = $operationsAvant | Group-Object typeOperation | Sort-Object Count -Descending
    Write-Host "`n   Répartition par type:" -ForegroundColor Gray
    foreach ($groupe in $operationsParType) {
        Write-Host "     $($groupe.Name): $($groupe.Count)" -ForegroundColor Gray
    }
    
    # Afficher les dernières opérations
    Write-Host "`n   Dernières opérations:" -ForegroundColor Gray
    $operationsAvant | Sort-Object { [DateTime]$_.dateOperation } | Select-Object -Last 5 | ForEach-Object {
        $date = [DateTime]$_.dateOperation
        $couleur = if ($_.typeOperation -like "annulation_*") { "Red" } else { "Gray" }
        Write-Host "     $($date.ToString('dd/MM/yyyy HH:mm')) | $($_.typeOperation) | $($_.montant) | Solde: $($_.soldeAvant) → $($_.soldeApres)" -ForegroundColor $couleur
    }
    
    # Identifier l'opération de 85,000
    $operation85000 = $operationsAvant | Where-Object { 
        $_.montant -eq 85000 -and 
        $_.typeOperation -eq "TRANSACTION DÉNOUÉE" -and 
        $_.statut -ne "Annulée" 
    } | Select-Object -First 1
    
    if ($operation85000) {
        Write-Host "`n🎯 Opération de 85,000 trouvée:" -ForegroundColor Yellow
        Write-Host "   ID: $($operation85000.id)" -ForegroundColor Gray
        Write-Host "   Type: $($operation85000.typeOperation)" -ForegroundColor Gray
        Write-Host "   Montant: $($operation85000.montant)" -ForegroundColor Gray
        Write-Host "   Solde avant: $($operation85000.soldeAvant)" -ForegroundColor Gray
        Write-Host "   Solde après: $($operation85000.soldeApres)" -ForegroundColor Gray
        Write-Host "   Statut: $($operation85000.statut)" -ForegroundColor Gray
    } else {
        Write-Host "`n❌ Aucune opération de 85,000 trouvée" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "   ❌ Erreur lors de la récupération des opérations: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 3. Annuler l'opération de 85,000
Write-Host "`n🔄 Annulation de l'opération ID: $($operation85000.id)..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/operations/$($operation85000.id)/cancel" -Method PUT -ContentType "application/json"
    Write-Host "   ✅ Annulation effectuée" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Erreur lors de l'annulation: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 4. Attendre un peu pour que les calculs se terminent
Write-Host "`n⏳ Attente de 3 secondes pour la finalisation des calculs..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# 5. Récupérer les opérations APRÈS annulation
Write-Host "`n📋 Opérations APRÈS annulation" -ForegroundColor Yellow
try {
    $operationsApres = Invoke-RestMethod -Uri "$baseUrl/api/operations?compteId=$compteId" -Method GET
    Write-Host "   Nombre d'opérations: $($operationsApres.Count)" -ForegroundColor Green
    
    # Compter les opérations par type
    $operationsParTypeApres = $operationsApres | Group-Object typeOperation | Sort-Object Count -Descending
    Write-Host "`n   Répartition par type:" -ForegroundColor Gray
    foreach ($groupe in $operationsParTypeApres) {
        $couleur = if ($groupe.Name -like "annulation_*") { "Red" } else { "Gray" }
        Write-Host "     $($groupe.Name): $($groupe.Count)" -ForegroundColor $couleur
    }
    
    # Afficher les dernières opérations
    Write-Host "`n   Dernières opérations:" -ForegroundColor Gray
    $operationsApres | Sort-Object { [DateTime]$_.dateOperation } | Select-Object -Last 7 | ForEach-Object {
        $date = [DateTime]$_.dateOperation
        $couleur = if ($_.typeOperation -like "annulation_*") { "Red" } else { "Gray" }
        Write-Host "     $($date.ToString('dd/MM/yyyy HH:mm')) | $($_.typeOperation) | $($_.montant) | Solde: $($_.soldeAvant) → $($_.soldeApres)" -ForegroundColor $couleur
    }
    
    # Chercher la nouvelle ligne d'annulation
    $ligneAnnulation = $operationsApres | Where-Object { 
        $_.typeOperation -eq "annulation_TRANSACTION DÉNOUÉE" -and 
        $_.statut -eq "Annulée" 
    } | Select-Object -First 1
    
    if ($ligneAnnulation) {
        Write-Host "`n✅ Nouvelle ligne d'annulation trouvée:" -ForegroundColor Green
        Write-Host "   ID: $($ligneAnnulation.id)" -ForegroundColor Gray
        Write-Host "   Type: $($ligneAnnulation.typeOperation)" -ForegroundColor Gray
        Write-Host "   Montant: $($ligneAnnulation.montant)" -ForegroundColor Gray
        Write-Host "   Solde avant: $($ligneAnnulation.soldeAvant)" -ForegroundColor Gray
        Write-Host "   Solde après: $($ligneAnnulation.soldeApres)" -ForegroundColor Gray
        Write-Host "   Statut: $($ligneAnnulation.statut)" -ForegroundColor Gray
        
        # Vérifier que le solde avant est bien 0.00 (solde actuel)
        if ($ligneAnnulation.soldeAvant -eq 0.00) {
            Write-Host "   ✅ Solde avant correct: 0.00" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Solde avant incorrect: $($ligneAnnulation.soldeAvant) (attendu: 0.00)" -ForegroundColor Red
        }
        
        # Vérifier que le solde après est bien 85,000
        if ($ligneAnnulation.soldeApres -eq 85000) {
            Write-Host "   ✅ Solde après correct: 85,000" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Solde après incorrect: $($ligneAnnulation.soldeApres) (attendu: 85,000)" -ForegroundColor Red
        }
    } else {
        Write-Host "`n❌ Nouvelle ligne d'annulation non trouvée" -ForegroundColor Red
    }
    
    # Vérifier que l'opération originale n'a pas été modifiée
    $operationOriginale = $operationsApres | Where-Object { $_.id -eq $operation85000.id }
    if ($operationOriginale) {
        Write-Host "`n🔍 Vérification de l'opération originale:" -ForegroundColor Yellow
        Write-Host "   ID: $($operationOriginale.id)" -ForegroundColor Gray
        Write-Host "   Type: $($operationOriginale.typeOperation)" -ForegroundColor Gray
        Write-Host "   Statut: $($operationOriginale.statut)" -ForegroundColor Gray
        
        if ($operationOriginale.typeOperation -eq "TRANSACTION DÉNOUÉE" -and $operationOriginale.statut -ne "Annulée") {
            Write-Host "   ✅ Opération originale non modifiée" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Opération originale modifiée (ne devrait pas l'être)" -ForegroundColor Red
        }
    }
    
    # Chercher les frais d'annulation
    $fraisAnnulation = $operationsApres | Where-Object { 
        $_.typeOperation -eq "annulation_FRAIS_TRANSACTION" -and 
        $_.statut -eq "Annulée" 
    }
    
    if ($fraisAnnulation) {
        Write-Host "`n💰 Frais d'annulation trouvés: $($fraisAnnulation.Count)" -ForegroundColor Green
        foreach ($frais in $fraisAnnulation) {
            Write-Host "   ID: $($frais.id) | Type: $($frais.typeOperation) | Montant: $($frais.montant) | Solde: $($frais.soldeAvant) → $($frais.soldeApres)" -ForegroundColor Gray
        }
    } else {
        Write-Host "`n⚠️ Aucun frais d'annulation trouvé" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "   ❌ Erreur lors de la récupération des opérations: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. Vérifier le solde final du compte
Write-Host "`n📊 Solde final du compte" -ForegroundColor Yellow
try {
    $compteFinal = Invoke-RestMethod -Uri "$baseUrl/api/comptes/$compteId" -Method GET
    Write-Host "   Solde final: $($compteFinal.solde)" -ForegroundColor Green
    Write-Host "   Date dernière MAJ: $($compteFinal.dateDerniereMaj)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Erreur lors de la récupération du compte: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n✅ Test terminé" -ForegroundColor Cyan
