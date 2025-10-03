# Script simple pour vérifier CELCM0001

$baseUrl = "http://localhost:8080/api"

Write-Host "=== Vérification simple CELCM0001 ===" -ForegroundColor Green

# 1. Récupérer toutes les opérations
Write-Host "`n1. Récupération de toutes les opérations:" -ForegroundColor Yellow

try {
    $allOps = Invoke-RestMethod -Uri "$baseUrl/operations" -Method GET
    Write-Host "Total des opérations: $($allOps.length)" -ForegroundColor Cyan
    
    # Filtrer CELCM0001
    $celcmOps = $allOps | Where-Object { $_.codeProprietaire -eq "CELCM0001" }
    Write-Host "Opérations CELCM0001: $($celcmOps.length)" -ForegroundColor Cyan
    
    # Afficher les premières opérations
    Write-Host "`nPremières 5 opérations CELCM0001:" -ForegroundColor Cyan
    foreach ($op in $celcmOps | Select-Object -First 5) {
        Write-Host "  - ID: $($op.id)" -ForegroundColor White
        Write-Host "    * Type: $($op.typeOperation)" -ForegroundColor Green
        Write-Host "    * Statut: $($op.statut)" -ForegroundColor Yellow
        Write-Host "    * Montant: $($op.montant)" -ForegroundColor Green
        Write-Host "    * Date: $($op.dateOperation)" -ForegroundColor Green
        Write-Host ""
    }
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Vérifier le compte
Write-Host "`n2. Vérification du compte:" -ForegroundColor Yellow

try {
    $comptes = Invoke-RestMethod -Uri "$baseUrl/comptes" -Method GET
    $compte = $comptes | Where-Object { $_.numeroCompte -eq "CELCM0001" }
    
    if ($compte) {
        Write-Host "  - Solde: $($compte.solde) FCFA" -ForegroundColor Green
        Write-Host "  - Dernière MAJ: $($compte.dateDerniereMaj)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Compte non trouvé" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Vérification terminée ===" -ForegroundColor Green
