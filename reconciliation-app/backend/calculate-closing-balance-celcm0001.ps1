# Script pour calculer le solde de clôture du compte CELCM0001

$baseUrl = "http://localhost:8080/api"

Write-Host "=== Calcul du solde de clôture CELCM0001 ===" -ForegroundColor Green

# 1. Récupérer toutes les opérations validées
Write-Host "`n1. Récupération des opérations validées:" -ForegroundColor Yellow

try {
    $operationsResponse = Invoke-RestMethod -Uri "$baseUrl/operations?codeProprietaire=CELCM0001" -Method GET
    $operationsValidees = $operationsResponse | Where-Object { $_.statut -eq "Validée" }
    
    Write-Host "Total des opérations validées: $($operationsValidees.length)" -ForegroundColor Cyan
    
    # Trier par date pour avoir l'ordre chronologique
    $operationsTriees = $operationsValidees | Sort-Object { [DateTime]$_.dateOperation }
    
    Write-Host "`nDétails des opérations triées chronologiquement:" -ForegroundColor Cyan
    foreach ($op in $operationsTriees) {
        Write-Host "  - ID: $($op.id)" -ForegroundColor White
        Write-Host "    * Type: $($op.typeOperation)" -ForegroundColor Green
        Write-Host "    * Montant: $($op.montant) FCFA" -ForegroundColor Green
        Write-Host "    * Date: $($op.dateOperation)" -ForegroundColor Green
        Write-Host "    * Solde avant: $($op.soldeAvant)" -ForegroundColor Blue
        Write-Host "    * Solde après: $($op.soldeApres)" -ForegroundColor Blue
        Write-Host ""
    }
    
} catch {
    Write-Host "❌ Erreur lors de la récupération des opérations: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Calculer le solde de clôture
Write-Host "`n2. Calcul du solde de clôture:" -ForegroundColor Yellow

if ($operationsTriees.length -gt 0) {
    # Le solde de clôture est le soldeApres de la dernière opération chronologiquement
    $derniereOperation = $operationsTriees[-1]
    $soldeCloture = $derniereOperation.soldeApres
    
    Write-Host "  - Dernière opération: ID $($derniereOperation.id)" -ForegroundColor Cyan
    Write-Host "  - Type: $($derniereOperation.typeOperation)" -ForegroundColor White
    Write-Host "  - Date: $($derniereOperation.dateOperation)" -ForegroundColor White
    Write-Host "  - Solde après: $($derniereOperation.soldeApres) FCFA" -ForegroundColor Green
    Write-Host "  - Solde de clôture: $($soldeCloture) FCFA" -ForegroundColor Green
    
} else {
    Write-Host "  ⚠️ Aucune opération validée trouvée" -ForegroundColor Yellow
    $soldeCloture = 0
}

# 3. Vérifier le solde du compte
Write-Host "`n3. Vérification du solde du compte:" -ForegroundColor Yellow

try {
    $comptesResponse = Invoke-RestMethod -Uri "$baseUrl/comptes" -Method GET
    $compte = $comptesResponse | Where-Object { $_.numeroCompte -eq "CELCM0001" }
    
    if ($compte) {
        Write-Host "  - Solde du compte: $($compte.solde) FCFA" -ForegroundColor Green
        Write-Host "  - Dernière MAJ: $($compte.dateDerniereMaj)" -ForegroundColor Green
        
        # Comparer avec le solde de clôture calculé
        if ($compte.solde -eq $soldeCloture) {
            Write-Host "  ✅ Le solde du compte correspond au solde de clôture" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️ Différence détectée:" -ForegroundColor Yellow
            Write-Host "    * Solde du compte: $($compte.solde) FCFA" -ForegroundColor Yellow
            Write-Host "    * Solde de clôture calculé: $($soldeCloture) FCFA" -ForegroundColor Yellow
            Write-Host "    * Différence: $($compte.solde - $soldeCloture) FCFA" -ForegroundColor Yellow
        }
    }
    
} catch {
    Write-Host "❌ Erreur lors de la vérification du compte: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Calculer les soldes journaliers
Write-Host "`n4. Calcul des soldes journaliers:" -ForegroundColor Yellow

try {
    # Grouper les opérations par date
    $operationsParDate = $operationsTriees | Group-Object { $_.dateOperation.Split('T')[0] }
    
    Write-Host "Nombre de jours avec des opérations: $($operationsParDate.Count)" -ForegroundColor Cyan
    
    foreach ($groupe in $operationsParDate) {
        $date = $groupe.Name
        $opsDuJour = $groupe.Group | Sort-Object { [DateTime]$_.dateOperation }
        
        $soldeOuverture = $opsDuJour[0].soldeAvant
        $soldeClotureJour = $opsDuJour[-1].soldeApres
        
        Write-Host "`n  Date: $date" -ForegroundColor Cyan
        Write-Host "    * Nombre d'opérations: $($opsDuJour.Count)" -ForegroundColor White
        Write-Host "    * Solde d'ouverture: $($soldeOuverture) FCFA" -ForegroundColor Blue
        Write-Host "    * Solde de clôture: $($soldeClotureJour) FCFA" -ForegroundColor Green
        Write-Host "    * Variation: $($soldeClotureJour - $soldeOuverture) FCFA" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Erreur lors du calcul des soldes journaliers: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Résumé final
Write-Host "`n5. Résumé final:" -ForegroundColor Yellow
Write-Host "  - Compte: CELCM0001" -ForegroundColor White
Write-Host "  - Total des opérations validées: $($operationsValidees.length)" -ForegroundColor White
Write-Host "  - Solde de clôture: $($soldeCloture) FCFA" -ForegroundColor Green
Write-Host "  - Solde du compte: $($compte.solde) FCFA" -ForegroundColor Green

if ($compte.solde -eq $soldeCloture) {
    Write-Host "  ✅ Le solde de clôture est correct et cohérent" -ForegroundColor Green
} else {
    Write-Host "  ⚠️ Incohérence détectée dans les soldes" -ForegroundColor Yellow
}

Write-Host "`n=== Calcul terminé ===" -ForegroundColor Green
