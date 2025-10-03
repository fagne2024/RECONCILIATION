# Script de vérification détaillée du statut des opérations CELCM0001

$baseUrl = "http://localhost:8080/api"

Write-Host "=== Vérification détaillée CELCM0001 ===" -ForegroundColor Green

# 1. Récupérer toutes les opérations avec détails
Write-Host "`n1. Récupération des opérations avec détails:" -ForegroundColor Yellow

try {
    $operationsResponse = Invoke-RestMethod -Uri "$baseUrl/operations?codeProprietaire=CELCM0001" -Method GET
    
    Write-Host "Total des opérations: $($operationsResponse.length)" -ForegroundColor Cyan
    
    # Grouper par statut
    $groupedByStatus = $operationsResponse | Group-Object statut
    
    Write-Host "`nRépartition par statut:" -ForegroundColor Cyan
    foreach ($group in $groupedByStatus) {
        Write-Host "  - $($group.Name): $($group.Count) opérations" -ForegroundColor White
    }
    
    # Afficher les détails des opérations récentes
    Write-Host "`nDétails des 10 dernières opérations:" -ForegroundColor Cyan
    $recentOps = $operationsResponse | Sort-Object { [DateTime]$_.dateOperation } | Select-Object -Last 10
    
    foreach ($op in $recentOps) {
        Write-Host "  - ID: $($op.id)" -ForegroundColor White
        Write-Host "    * Type: $($op.typeOperation)" -ForegroundColor Green
        Write-Host "    * Montant: $($op.montant) FCFA" -ForegroundColor Green
        Write-Host "    * Statut: $($op.statut)" -ForegroundColor Yellow
        Write-Host "    * Date: $($op.dateOperation)" -ForegroundColor Green
        Write-Host "    * Solde avant: $($op.soldeAvant)" -ForegroundColor Blue
        Write-Host "    * Solde après: $($op.soldeApres)" -ForegroundColor Blue
        Write-Host ""
    }
    
} catch {
    Write-Host "❌ Erreur lors de la récupération: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Vérifier le compte
Write-Host "`n2. État du compte CELCM0001:" -ForegroundColor Yellow

try {
    $comptesResponse = Invoke-RestMethod -Uri "$baseUrl/comptes" -Method GET
    $compte = $comptesResponse | Where-Object { $_.numeroCompte -eq "CELCM0001" }
    
    if ($compte) {
        Write-Host "  - Solde actuel: $($compte.solde) FCFA" -ForegroundColor Green
        Write-Host "  - Dernière MAJ: $($compte.dateDerniereMaj)" -ForegroundColor Green
    }
    
} catch {
    Write-Host "❌ Erreur lors de la vérification du compte: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Tester la validation d'une opération spécifique
Write-Host "`n3. Test de validation d'une opération spécifique:" -ForegroundColor Yellow

try {
    # Récupérer une opération en attente
    $opEnAttente = $operationsResponse | Where-Object { $_.statut -eq "En attente" } | Select-Object -First 1
    
    if ($opEnAttente) {
        Write-Host "  - Opération trouvée: ID $($opEnAttente.id)" -ForegroundColor Cyan
        Write-Host "  - Type: $($opEnAttente.typeOperation)" -ForegroundColor White
        Write-Host "  - Montant: $($opEnAttente.montant) FCFA" -ForegroundColor White
        Write-Host "  - Statut actuel: $($opEnAttente.statut)" -ForegroundColor Yellow
        
        # Tenter la validation
        Write-Host "  - Tentative de validation..." -ForegroundColor Yellow
        
        try {
            $validateResponse = Invoke-RestMethod -Uri "$baseUrl/operations/$($opEnAttente.id)/validate" -Method PUT
            Write-Host "  - Réponse de validation: $validateResponse" -ForegroundColor Green
        } catch {
            Write-Host "  - Erreur de validation: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        # Vérifier le statut après validation
        Start-Sleep -Seconds 1
        $opAfterValidation = Invoke-RestMethod -Uri "$baseUrl/operations/$($opEnAttente.id)" -Method GET
        Write-Host "  - Statut après validation: $($opAfterValidation.statut)" -ForegroundColor Green
        
    } else {
        Write-Host "  - Aucune opération en attente trouvée" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Erreur lors du test de validation: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Vérification terminée ===" -ForegroundColor Green
