# Script de diagnostic détaillé pour CELCM0001

$baseUrl = "http://localhost:8080/api"

Write-Host "=== Diagnostic détaillé CELCM0001 ===" -ForegroundColor Green

# 1. Récupérer toutes les opérations sans filtre
Write-Host "`n1. Récupération de toutes les opérations:" -ForegroundColor Yellow

try {
    $allOperationsResponse = Invoke-RestMethod -Uri "$baseUrl/operations" -Method GET
    $celcmOperations = $allOperationsResponse | Where-Object { $_.codeProprietaire -eq "CELCM0001" }
    
    Write-Host "Total des opérations CELCM0001: $($celcmOperations.length)" -ForegroundColor Cyan
    
    # Analyser les statuts
    $statuts = $celcmOperations | Group-Object statut
    Write-Host "`nRépartition par statut:" -ForegroundColor Cyan
    foreach ($statut in $statuts) {
        Write-Host "  - $($statut.Name): $($statut.Count) opérations" -ForegroundColor White
    }
    
} catch {
    Write-Host "❌ Erreur lors de la récupération: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Récupérer avec le filtre codeProprietaire
Write-Host "`n2. Récupération avec filtre codeProprietaire:" -ForegroundColor Yellow

try {
    $filteredOperationsResponse = Invoke-RestMethod -Uri "$baseUrl/operations?codeProprietaire=CELCM0001" -Method GET
    
    Write-Host "Opérations avec filtre: $($filteredOperationsResponse.length)" -ForegroundColor Cyan
    
    # Analyser les statuts
    $statutsFiltered = $filteredOperationsResponse | Group-Object statut
    Write-Host "`nRépartition par statut (filtré):" -ForegroundColor Cyan
    foreach ($statut in $statutsFiltered) {
        Write-Host "  - $($statut.Name): $($statut.Count) opérations" -ForegroundColor White
    }
    
} catch {
    Write-Host "❌ Erreur lors de la récupération filtrée: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Vérifier les opérations validées spécifiquement
Write-Host "`n3. Vérification des opérations validées:" -ForegroundColor Yellow

try {
    $operationsValidees = $filteredOperationsResponse | Where-Object { $_.statut -eq "Validée" }
    Write-Host "Opérations validées trouvées: $($operationsValidees.length)" -ForegroundColor Cyan
    
    if ($operationsValidees.length -gt 0) {
        Write-Host "`nDétails des opérations validées:" -ForegroundColor Cyan
        foreach ($op in $operationsValidees | Select-Object -First 5) {
            Write-Host "  - ID: $($op.id)" -ForegroundColor White
            Write-Host "    * Type: $($op.typeOperation)" -ForegroundColor Green
            Write-Host "    * Montant: $($op.montant) FCFA" -ForegroundColor Green
            Write-Host "    * Statut: $($op.statut)" -ForegroundColor Green
            Write-Host "    * Date: $($op.dateOperation)" -ForegroundColor Green
            Write-Host "    * Solde avant: $($op.soldeAvant)" -ForegroundColor Blue
            Write-Host "    * Solde après: $($op.soldeApres)" -ForegroundColor Blue
            Write-Host ""
        }
        
        # Calculer le solde de clôture
        $operationsTriees = $operationsValidees | Sort-Object { [DateTime]$_.dateOperation }
        $derniereOperation = $operationsTriees[-1]
        $soldeCloture = $derniereOperation.soldeApres
        
        Write-Host "  - Dernière opération: ID $($derniereOperation.id)" -ForegroundColor Cyan
        Write-Host "  - Solde de clôture: $($soldeCloture) FCFA" -ForegroundColor Green
        
    } else {
        Write-Host "Aucune opération validée trouvée" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Erreur lors de la vérification: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Vérifier le compte
Write-Host "`n4. Vérification du compte:" -ForegroundColor Yellow

try {
    $comptesResponse = Invoke-RestMethod -Uri "$baseUrl/comptes" -Method GET
    $compte = $comptesResponse | Where-Object { $_.numeroCompte -eq "CELCM0001" }
    
    if ($compte) {
        Write-Host "  - Solde du compte: $($compte.solde) FCFA" -ForegroundColor Green
        Write-Host "  - Dernière MAJ: $($compte.dateDerniereMaj)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Compte CELCM0001 non trouvé" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Erreur lors de la vérification du compte: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Test de l'API de validation
Write-Host "`n5. Test de l'API de validation:" -ForegroundColor Yellow

try {
    # Récupérer une opération en attente pour tester
    $opEnAttente = $filteredOperationsResponse | Where-Object { $_.statut -eq "En attente" } | Select-Object -First 1
    
    if ($opEnAttente) {
        Write-Host "  - Opération en attente trouvée: ID $($opEnAttente.id)" -ForegroundColor Cyan
        Write-Host "  - Tentative de validation..." -ForegroundColor Yellow
        
        try {
            $validateResponse = Invoke-RestMethod -Uri "$baseUrl/operations/$($opEnAttente.id)/validate" -Method PUT
            Write-Host "  - Réponse: $validateResponse" -ForegroundColor Green
        } catch {
            Write-Host "  - Erreur de validation: $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "  - Aucune opération en attente trouvée" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Erreur lors du test de validation: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Diagnostic terminé ===" -ForegroundColor Green
