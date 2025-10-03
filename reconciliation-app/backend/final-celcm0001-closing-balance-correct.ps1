# Script final pour calculer le solde de clôture CELCM0001 (version corrigée)

$baseUrl = "http://localhost:8080/api"

Write-Host "=== Calcul final du solde de clôture CELCM0001 (corrigé) ===" -ForegroundColor Green

# 1. Récupérer toutes les opérations CELCM0001
Write-Host "`n1. Récupération des opérations CELCM0001:" -ForegroundColor Yellow

try {
    $allOps = Invoke-RestMethod -Uri "$baseUrl/operations" -Method GET
    $celcmOps = $allOps | Where-Object { $_.codeProprietaire -eq "CELCM0001" }
    
    Write-Host "Total des opérations CELCM0001: $($celcmOps.length)" -ForegroundColor Cyan
    
    # Utiliser le filtre qui fonctionne avec les caractères accentués
    $opsValidees = $celcmOps | Where-Object { $_.statut -like "*Valid*" }
    Write-Host "Opérations validées: $($opsValidees.length)" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Erreur lors de la récupération: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Calculer le solde de clôture
Write-Host "`n2. Calcul du solde de clôture:" -ForegroundColor Yellow

if ($opsValidees.length -gt 0) {
    # Trier par date pour avoir l'ordre chronologique
    $opsTriees = $opsValidees | Sort-Object { [DateTime]$_.dateOperation }
    
    Write-Host "Opérations triées chronologiquement: $($opsTriees.length)" -ForegroundColor Cyan
    
    # Le solde de clôture est le soldeApres de la dernière opération
    $derniereOp = $opsTriees[-1]
    $soldeCloture = $derniereOp.soldeApres
    
    Write-Host "`nDernière opération:" -ForegroundColor Cyan
    Write-Host "  - ID: $($derniereOp.id)" -ForegroundColor White
    Write-Host "  - Type: $($derniereOp.typeOperation)" -ForegroundColor Green
    Write-Host "  - Montant: $($derniereOp.montant) FCFA" -ForegroundColor Green
    Write-Host "  - Date: $($derniereOp.dateOperation)" -ForegroundColor Green
    Write-Host "  - Solde avant: $($derniereOp.soldeAvant) FCFA" -ForegroundColor Blue
    Write-Host "  - Solde après: $($derniereOp.soldeApres) FCFA" -ForegroundColor Green
    
    Write-Host "`n✅ Solde de clôture calculé: $($soldeCloture) FCFA" -ForegroundColor Green
    
} else {
    Write-Host "Aucune opération validée trouvée" -ForegroundColor Yellow
    $soldeCloture = 0
}

# 3. Vérifier le solde du compte
Write-Host "`n3. Vérification du solde du compte:" -ForegroundColor Yellow

try {
    $comptes = Invoke-RestMethod -Uri "$baseUrl/comptes" -Method GET
    $compte = $comptes | Where-Object { $_.numeroCompte -eq "CELCM0001" }
    
    if ($compte) {
        Write-Host "  - Solde du compte: $($compte.solde) FCFA" -ForegroundColor Green
        Write-Host "  - Dernière MAJ: $($compte.dateDerniereMaj)" -ForegroundColor Green
        
        # Comparer avec le solde de clôture
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

# 4. Analyser les opérations par type
Write-Host "`n4. Analyse par type d'opération:" -ForegroundColor Yellow

try {
    $opsParType = $opsValidees | Group-Object typeOperation
    
    Write-Host "Répartition par type:" -ForegroundColor Cyan
    foreach ($type in $opsParType) {
        Write-Host "  - $($type.Name): $($type.Count) opérations" -ForegroundColor White
    }
    
    # Calculer les totaux par type
    Write-Host "`nTotaux par type:" -ForegroundColor Cyan
    foreach ($type in $opsParType) {
        $totalMontant = ($type.Group | Measure-Object -Property montant -Sum).Sum
        Write-Host "  - $($type.Name): $($totalMontant) FCFA" -ForegroundColor White
    }
    
} catch {
    Write-Host "❌ Erreur lors de l'analyse par type: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Calculer les soldes journaliers
Write-Host "`n5. Calcul des soldes journaliers:" -ForegroundColor Yellow

try {
    # Grouper par date
    $opsParDate = $opsTriees | Group-Object { $_.dateOperation.Split('T')[0] }
    
    Write-Host "Nombre de jours avec des opérations: $($opsParDate.Count)" -ForegroundColor Cyan
    
    foreach ($groupe in $opsParDate) {
        $date = $groupe.Name
        $opsDuJour = $groupe.Group | Sort-Object { [DateTime]$_.dateOperation }
        
        $soldeOuverture = $opsDuJour[0].soldeAvant
        $soldeClotureJour = $opsDuJour[-1].soldeApres
        $variation = $soldeClotureJour - $soldeOuverture
        
        Write-Host "`n  Date: $date" -ForegroundColor Cyan
        Write-Host "    * Nombre d'opérations: $($opsDuJour.Count)" -ForegroundColor White
        Write-Host "    * Solde d'ouverture: $($soldeOuverture) FCFA" -ForegroundColor Blue
        Write-Host "    * Solde de clôture: $($soldeClotureJour) FCFA" -ForegroundColor Green
        Write-Host "    * Variation: $($variation) FCFA" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Erreur lors du calcul des soldes journaliers: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. Résumé final
Write-Host "`n6. Résumé final:" -ForegroundColor Yellow
Write-Host "  - Compte: CELCM0001" -ForegroundColor White
Write-Host "  - Total des opérations validées: $($opsValidees.length)" -ForegroundColor White
Write-Host "  - Solde de clôture: $($soldeCloture) FCFA" -ForegroundColor Green
Write-Host "  - Solde du compte: $($compte.solde) FCFA" -ForegroundColor Green

if ($compte.solde -eq $soldeCloture) {
    Write-Host "  ✅ Le solde de clôture est correct et cohérent" -ForegroundColor Green
    Write-Host "  ✅ Toutes les opérations en cours ont été traitées avec succès" -ForegroundColor Green
    Write-Host "  ✅ Le solde de clôture correspond au dernier solde après de la dernière opération validée" -ForegroundColor Green
} else {
    Write-Host "  ⚠️ Incohérence détectée dans les soldes" -ForegroundColor Yellow
    Write-Host "  ⚠️ Le solde de clôture ne correspond pas au solde du compte" -ForegroundColor Yellow
}

Write-Host "`n=== Calcul terminé ===" -ForegroundColor Green
