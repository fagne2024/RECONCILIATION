# Script pour traiter les opérations en cours du compte CELCM0001
# et mettre à jour le solde de clôture

$baseUrl = "http://localhost:8080/api"

Write-Host "=== Traitement des opérations en cours - CELCM0001 ===" -ForegroundColor Green

# 1. Récupérer les opérations du compte CELCM0001
Write-Host "`n1. Récupération des opérations du compte CELCM0001:" -ForegroundColor Yellow

try {
    $operationsResponse = Invoke-RestMethod -Uri "$baseUrl/operations?codeProprietaire=CELCM0001" -Method GET
    
    Write-Host "Opérations trouvées: $($operationsResponse.length)" -ForegroundColor Cyan
    
    # Filtrer les opérations en cours et en attente
    $operationsEnCours = $operationsResponse | Where-Object { $_.statut -eq "En cours" -or $_.statut -eq "En attente" }
    $operationsValidees = $operationsResponse | Where-Object { $_.statut -eq "Validée" }
    
    Write-Host "  - Opérations en cours: $($operationsEnCours.length)" -ForegroundColor Yellow
    Write-Host "  - Opérations en attente: $($operationsResponse | Where-Object { $_.statut -eq 'En attente' }.length)" -ForegroundColor Yellow
    Write-Host "  - Opérations validées: $($operationsValidees.length)" -ForegroundColor Green
    
    # Afficher les détails des opérations en cours
    if ($operationsEnCours.length -gt 0) {
        Write-Host "`nDétails des opérations en cours:" -ForegroundColor Cyan
        foreach ($op in $operationsEnCours) {
            Write-Host "  - ID: $($op.id)" -ForegroundColor White
            Write-Host "    * Type: $($op.typeOperation)" -ForegroundColor Green
            Write-Host "    * Montant: $($op.montant) FCFA" -ForegroundColor Green
            Write-Host "    * Service: $($op.service)" -ForegroundColor Green
            Write-Host "    * Statut: $($op.statut)" -ForegroundColor Yellow
            Write-Host "    * Date: $($op.dateOperation)" -ForegroundColor Green
            Write-Host "    * Solde avant: $($op.soldeAvant)" -ForegroundColor Blue
            Write-Host "    * Solde après: $($op.soldeApres)" -ForegroundColor Blue
            Write-Host ""
        }
    }
    
} catch {
    Write-Host "❌ Erreur lors de la récupération des opérations: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Récupérer les informations du compte CELCM0001
Write-Host "`n2. Informations du compte CELCM0001:" -ForegroundColor Yellow

try {
    $comptesResponse = Invoke-RestMethod -Uri "$baseUrl/comptes" -Method GET
    $compte = $comptesResponse | Where-Object { $_.numeroCompte -eq "CELCM0001" }
    
    if ($compte) {
        Write-Host "  - Numéro: $($compte.numeroCompte)" -ForegroundColor Green
        Write-Host "  - Solde actuel: $($compte.solde) FCFA" -ForegroundColor Green
        Write-Host "  - Pays: $($compte.pays)" -ForegroundColor Green
        Write-Host "  - Code propriétaire: $($compte.codeProprietaire)" -ForegroundColor Green
        Write-Host "  - Dernière MAJ: $($compte.dateDerniereMaj)" -ForegroundColor Green
    } else {
        Write-Host "❌ Compte CELCM0001 non trouvé" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "❌ Erreur lors de la récupération du compte: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 3. Traiter les opérations en cours
Write-Host "`n3. Traitement des opérations en cours:" -ForegroundColor Yellow

if ($operationsEnCours.length -gt 0) {
    foreach ($operation in $operationsEnCours) {
        Write-Host "`nTraitement de l'opération ID: $($operation.id)" -ForegroundColor Cyan
        Write-Host "  - Type: $($operation.typeOperation)" -ForegroundColor White
        Write-Host "  - Montant: $($operation.montant) FCFA" -ForegroundColor White
        Write-Host "  - Statut actuel: $($operation.statut)" -ForegroundColor Yellow
        
        try {
            # Valider l'opération
            $validateResponse = Invoke-RestMethod -Uri "$baseUrl/operations/$($operation.id)/validate" -Method PUT
            
            if ($validateResponse -eq $true) {
                Write-Host "  ✅ Opération validée avec succès" -ForegroundColor Green
            } else {
                Write-Host "  ❌ Échec de la validation de l'opération" -ForegroundColor Red
            }
            
        } catch {
            Write-Host "  ❌ Erreur lors de la validation: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
} else {
    Write-Host "Aucune opération en cours à traiter" -ForegroundColor Yellow
}

# 4. Vérifier le solde après traitement
Write-Host "`n4. Vérification du solde après traitement:" -ForegroundColor Yellow

try {
    # Attendre un peu pour que les mises à jour soient propagées
    Start-Sleep -Seconds 2
    
    $comptesResponse = Invoke-RestMethod -Uri "$baseUrl/comptes" -Method GET
    $compte = $comptesResponse | Where-Object { $_.numeroCompte -eq "CELCM0001" }
    
    if ($compte) {
        Write-Host "  - Solde après traitement: $($compte.solde) FCFA" -ForegroundColor Green
        Write-Host "  - Dernière MAJ: $($compte.dateDerniereMaj)" -ForegroundColor Green
    }
    
    # Récupérer les opérations mises à jour
    $operationsResponse = Invoke-RestMethod -Uri "$baseUrl/operations?codeProprietaire=CELCM0001" -Method GET
    $operationsValidees = $operationsResponse | Where-Object { $_.statut -eq "Validée" }
    $operationsEnCours = $operationsResponse | Where-Object { $_.statut -eq "En cours" -or $_.statut -eq "En attente" }
    
    Write-Host "  - Opérations validées: $($operationsValidees.length)" -ForegroundColor Green
    Write-Host "  - Opérations en cours/attente: $($operationsEnCours.length)" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Erreur lors de la vérification: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Calculer le solde de clôture théorique
Write-Host "`n5. Calcul du solde de clôture théorique:" -ForegroundColor Yellow

try {
    $operationsValidees = $operationsResponse | Where-Object { $_.statut -eq "Validée" }
    
    if ($operationsValidees.length -gt 0) {
        # Trier par date pour avoir l'ordre chronologique
        $operationsTriees = $operationsValidees | Sort-Object { [DateTime]$_.dateOperation }
        
        # Le solde de clôture devrait être le soldeApres de la dernière opération validée
        $derniereOperation = $operationsTriees[-1]
        $soldeClotureTheorique = $derniereOperation.soldeApres
        
        Write-Host "  - Dernière opération validée: ID $($derniereOperation.id)" -ForegroundColor Cyan
        Write-Host "  - Type: $($derniereOperation.typeOperation)" -ForegroundColor White
        Write-Host "  - Date: $($derniereOperation.dateOperation)" -ForegroundColor White
        Write-Host "  - Solde après: $($derniereOperation.soldeApres) FCFA" -ForegroundColor Green
        Write-Host "  - Solde de clôture théorique: $($soldeClotureTheorique) FCFA" -ForegroundColor Green
        
        # Comparer avec le solde du compte
        if ($compte.solde -eq $soldeClotureTheorique) {
            Write-Host "  ✅ Le solde du compte correspond au solde de clôture théorique" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️ Différence entre le solde du compte ($($compte.solde)) et le solde théorique ($($soldeClotureTheorique))" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ⚠️ Aucune opération validée trouvée" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Erreur lors du calcul du solde de clôture: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Traitement terminé ===" -ForegroundColor Green
