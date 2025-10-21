# Script de diagnostic pour l'annulation d'opérations
# Ce script va analyser les opérations avant et après annulation

Write-Host "🔍 Diagnostic d'annulation d'opérations" -ForegroundColor Cyan
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

# 2. Récupérer toutes les opérations du compte AVANT annulation
Write-Host "`n📋 Opérations AVANT annulation" -ForegroundColor Yellow
try {
    $operationsAvant = Invoke-RestMethod -Uri "$baseUrl/api/operations?compteId=$compteId" -Method GET
    Write-Host "   Nombre d'opérations: $($operationsAvant.Count)" -ForegroundColor Green
    
    # Afficher toutes les opérations avec détails
    $operationsAvant | Sort-Object { [DateTime]$_.dateOperation } | ForEach-Object {
        $date = [DateTime]$_.dateOperation
        $statut = if ($_.statut) { $_.statut } else { "Non défini" }
        $couleur = if ($_.typeOperation -like "Annulation_*") { "Red" } else { "Gray" }
        Write-Host "   ID: $($_.id) | $($date.ToString('dd/MM/yyyy HH:mm')) | $($_.typeOperation) | $($_.montant) | Solde: $($_.soldeAvant) → $($_.soldeApres) | Statut: $statut" -ForegroundColor $couleur
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
    }
    
} catch {
    Write-Host "   ❌ Erreur lors de la récupération des opérations: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 3. Demander à l'utilisateur de confirmer l'annulation
Write-Host "`n⚠️ ATTENTION: Ce script va annuler l'opération de 85,000" -ForegroundColor Red
$confirmation = Read-Host "Voulez-vous continuer? (oui/non)"
if ($confirmation -ne "oui") {
    Write-Host "Annulation du script" -ForegroundColor Yellow
    exit 0
}

# 4. Annuler l'opération de 85,000
if ($operation85000) {
    Write-Host "`n🔄 Annulation de l'opération ID: $($operation85000.id)..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/operations/$($operation85000.id)/cancel" -Method PUT -ContentType "application/json"
        Write-Host "   ✅ Annulation effectuée" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Erreur lors de l'annulation: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "`n❌ Impossible d'annuler: opération de 85,000 non trouvée" -ForegroundColor Red
    exit 1
}

# 5. Attendre un peu pour que les calculs se terminent
Write-Host "`n⏳ Attente de 3 secondes pour la finalisation des calculs..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# 6. Récupérer les opérations APRÈS annulation
Write-Host "`n📋 Opérations APRÈS annulation" -ForegroundColor Yellow
try {
    $operationsApres = Invoke-RestMethod -Uri "$baseUrl/api/operations?compteId=$compteId" -Method GET
    Write-Host "   Nombre d'opérations: $($operationsApres.Count)" -ForegroundColor Green
    
    # Afficher toutes les opérations avec détails
    $operationsApres | Sort-Object { [DateTime]$_.dateOperation } | ForEach-Object {
        $date = [DateTime]$_.dateOperation
        $statut = if ($_.statut) { $_.statut } else { "Non défini" }
        $couleur = if ($_.typeOperation -like "Annulation_*") { "Red" } else { "Gray" }
        Write-Host "   ID: $($_.id) | $($date.ToString('dd/MM/yyyy HH:mm')) | $($_.typeOperation) | $($_.montant) | Solde: $($_.soldeAvant) → $($_.soldeApres) | Statut: $statut" -ForegroundColor $couleur
    }
    
    # Chercher l'opération d'annulation
    $operationAnnulation = $operationsApres | Where-Object { 
        $_.id -eq $operation85000.id -and 
        $_.typeOperation -like "Annulation_*" 
    }
    
    if ($operationAnnulation) {
        Write-Host "`n✅ Opération d'annulation trouvée:" -ForegroundColor Green
        Write-Host "   ID: $($operationAnnulation.id)" -ForegroundColor Gray
        Write-Host "   Type: $($operationAnnulation.typeOperation)" -ForegroundColor Gray
        Write-Host "   Montant: $($operationAnnulation.montant)" -ForegroundColor Gray
        Write-Host "   Solde avant: $($operationAnnulation.soldeAvant)" -ForegroundColor Gray
        Write-Host "   Solde après: $($operationAnnulation.soldeApres)" -ForegroundColor Gray
        Write-Host "   Statut: $($operationAnnulation.statut)" -ForegroundColor Gray
        
        # Vérifier les soldes
        if ($operationAnnulation.soldeAvant -eq 0.00) {
            Write-Host "   ✅ Solde avant correct: 0.00" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Solde avant incorrect: $($operationAnnulation.soldeAvant) (attendu: 0.00)" -ForegroundColor Red
        }
        
        if ($operationAnnulation.soldeApres -eq 85000) {
            Write-Host "   ✅ Solde après correct: 85,000" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Solde après incorrect: $($operationAnnulation.soldeApres) (attendu: 85,000)" -ForegroundColor Red
        }
    } else {
        Write-Host "`n❌ Opération d'annulation non trouvée" -ForegroundColor Red
    }
    
    # Chercher les frais annulés
    $fraisAnnules = $operationsApres | Where-Object { 
        $_.typeOperation -like "Annulation_FRAIS_TRANSACTION" -and 
        $_.statut -eq "Annulée" 
    }
    
    if ($fraisAnnules) {
        Write-Host "`n💰 Frais annulés trouvés: $($fraisAnnules.Count)" -ForegroundColor Green
        foreach ($frais in $fraisAnnules) {
            Write-Host "   ID: $($frais.id) | Type: $($frais.typeOperation) | Montant: $($frais.montant) | Solde: $($frais.soldeAvant) → $($frais.soldeApres)" -ForegroundColor Gray
        }
    } else {
        Write-Host "`n⚠️ Aucun frais annulé trouvé" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "   ❌ Erreur lors de la récupération des opérations: $($_.Exception.Message)" -ForegroundColor Red
}

# 7. Vérifier le solde final du compte
Write-Host "`n📊 Solde final du compte" -ForegroundColor Yellow
try {
    $compteFinal = Invoke-RestMethod -Uri "$baseUrl/api/comptes/$compteId" -Method GET
    Write-Host "   Solde final: $($compteFinal.solde)" -ForegroundColor Green
    Write-Host "   Date dernière MAJ: $($compteFinal.dateDerniereMaj)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Erreur lors de la récupération du compte: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n✅ Diagnostic terminé" -ForegroundColor Cyan
