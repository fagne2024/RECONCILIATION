# Script de debug pour CELCM0001

$baseUrl = "http://localhost:8080/api"

Write-Host "=== Debug CELCM0001 ===" -ForegroundColor Green

# 1. Récupérer toutes les opérations
Write-Host "`n1. Récupération de toutes les opérations:" -ForegroundColor Yellow

try {
    $allOps = Invoke-RestMethod -Uri "$baseUrl/operations" -Method GET
    $celcmOps = $allOps | Where-Object { $_.codeProprietaire -eq "CELCM0001" }
    
    Write-Host "Total des opérations CELCM0001: $($celcmOps.length)" -ForegroundColor Cyan
    
    # Analyser les statuts
    $statuts = $celcmOps | Group-Object statut
    Write-Host "`nRépartition par statut:" -ForegroundColor Cyan
    foreach ($statut in $statuts) {
        Write-Host "  - '$($statut.Name)': $($statut.Count) opérations" -ForegroundColor White
    }
    
    # Afficher les détails des premières opérations
    Write-Host "`nDétails des premières opérations:" -ForegroundColor Cyan
    foreach ($op in $celcmOps | Select-Object -First 3) {
        Write-Host "  - ID: $($op.id)" -ForegroundColor White
        Write-Host "    * Type: $($op.typeOperation)" -ForegroundColor Green
        Write-Host "    * Statut: '$($op.statut)'" -ForegroundColor Yellow
        Write-Host "    * Montant: $($op.montant)" -ForegroundColor Green
        Write-Host "    * Date: $($op.dateOperation)" -ForegroundColor Green
        Write-Host "    * Solde avant: $($op.soldeAvant)" -ForegroundColor Blue
        Write-Host "    * Solde après: $($op.soldeApres)" -ForegroundColor Blue
        Write-Host ""
    }
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Tester différents filtres
Write-Host "`n2. Test de différents filtres:" -ForegroundColor Yellow

try {
    # Test 1: Filtrer par statut "Validée"
    $opsValidees1 = $celcmOps | Where-Object { $_.statut -eq "Validée" }
    Write-Host "  - Filtre 'Validée': $($opsValidees1.length) opérations" -ForegroundColor White
    
    # Test 2: Filtrer par statut "Validée" (avec trim)
    $opsValidees2 = $celcmOps | Where-Object { $_.statut.Trim() -eq "Validée" }
    Write-Host "  - Filtre 'Validée' (trim): $($opsValidees2.length) opérations" -ForegroundColor White
    
    # Test 3: Filtrer par statut qui contient "Valid"
    $opsValidees3 = $celcmOps | Where-Object { $_.statut -like "*Valid*" }
    Write-Host "  - Filtre '*Valid*': $($opsValidees3.length) opérations" -ForegroundColor White
    
    # Test 4: Afficher tous les statuts uniques
    $statutsUniques = $celcmOps | Select-Object -ExpandProperty statut | Sort-Object | Get-Unique
    Write-Host "  - Statuts uniques: $($statutsUniques -join ', ')" -ForegroundColor White
    
} catch {
    Write-Host "❌ Erreur lors des tests de filtres: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Calculer le solde de clôture avec le bon filtre
Write-Host "`n3. Calcul du solde de clôture:" -ForegroundColor Yellow

try {
    # Utiliser le filtre qui fonctionne
    $opsValidees = $celcmOps | Where-Object { $_.statut -eq "Validée" }
    
    if ($opsValidees.length -gt 0) {
        Write-Host "  - Opérations validées trouvées: $($opsValidees.length)" -ForegroundColor Green
        
        # Trier par date
        $opsTriees = $opsValidees | Sort-Object { [DateTime]$_.dateOperation }
        
        # Dernière opération
        $derniereOp = $opsTriees[-1]
        $soldeCloture = $derniereOp.soldeApres
        
        Write-Host "  - Dernière opération: ID $($derniereOp.id)" -ForegroundColor Cyan
        Write-Host "  - Type: $($derniereOp.typeOperation)" -ForegroundColor White
        Write-Host "  - Date: $($derniereOp.dateOperation)" -ForegroundColor White
        Write-Host "  - Solde après: $($derniereOp.soldeApres) FCFA" -ForegroundColor Green
        Write-Host "  - Solde de clôture: $($soldeCloture) FCFA" -ForegroundColor Green
        
    } else {
        Write-Host "  - Aucune opération validée trouvée" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Erreur lors du calcul: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Debug terminé ===" -ForegroundColor Green
