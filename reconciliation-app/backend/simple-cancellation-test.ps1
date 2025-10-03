# Script simple pour tester la logique d'annulation

$baseUrl = "http://localhost:8080/api"

Write-Host "=== Test simple d'annulation ===" -ForegroundColor Green

# 1. Récupérer le solde initial
Write-Host "`n1. Solde initial:" -ForegroundColor Yellow

try {
    $comptes = Invoke-RestMethod -Uri "$baseUrl/comptes" -Method GET
    $compte = $comptes | Where-Object { $_.numeroCompte -eq "CELCM0001" }
    
    if ($compte) {
        Write-Host "Solde initial: $($compte.solde) FCFA" -ForegroundColor Green
        $soldeInitial = $compte.solde
    } else {
        Write-Host "❌ Compte CELCM0001 non trouvé" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Créer une opération de test
Write-Host "`n2. Création d'une opération de test:" -ForegroundColor Yellow

try {
    $operationTest = @{
        compteId = $compte.id
        typeOperation = "total_cashin"
        montant = 50000
        banque = "TEST_BANK"
        nomBordereau = "TEST_OPERATION_$(Get-Date -Format 'yyyyMMddHHmmss')"
        service = "TEST_SERVICE"
        dateOperation = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
    }
    
    $createdOp = Invoke-RestMethod -Uri "$baseUrl/operations" -Method POST -Body ($operationTest | ConvertTo-Json) -ContentType "application/json"
    
    Write-Host "Opération créée: ID $($createdOp.id)" -ForegroundColor Green
    Write-Host "  - Type: $($createdOp.typeOperation)" -ForegroundColor White
    Write-Host "  - Montant: $($createdOp.montant) FCFA" -ForegroundColor White
    Write-Host "  - Statut: $($createdOp.statut)" -ForegroundColor Yellow
    
    # Vérifier le solde après création
    Start-Sleep -Seconds 1
    $compteAfterCreate = Invoke-RestMethod -Uri "$baseUrl/comptes" -Method GET | Where-Object { $_.numeroCompte -eq "CELCM0001" }
    Write-Host "Solde après création: $($compteAfterCreate.solde) FCFA" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Erreur lors de la création: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 3. Annuler l'opération
Write-Host "`n3. Annulation de l'opération:" -ForegroundColor Yellow

try {
    $cancelResponse = Invoke-RestMethod -Uri "$baseUrl/operations/$($createdOp.id)/cancel" -Method PUT
    
    if ($cancelResponse -eq $true) {
        Write-Host "✅ Opération annulée avec succès" -ForegroundColor Green
        
        # Attendre un peu pour que les mises à jour soient propagées
        Start-Sleep -Seconds 2
        
        # Vérifier le solde après annulation
        $compteAfterCancel = Invoke-RestMethod -Uri "$baseUrl/comptes" -Method GET | Where-Object { $_.numeroCompte -eq "CELCM0001" }
        Write-Host "Solde après annulation: $($compteAfterCancel.solde) FCFA" -ForegroundColor Green
        
        # Vérifier que l'annulation a bien annulé l'impact
        if ($compteAfterCancel.solde -eq $soldeInitial) {
            Write-Host "✅ L'annulation a correctement annulé l'impact de l'opération" -ForegroundColor Green
        } else {
            Write-Host "⚠️ L'annulation n'a pas complètement annulé l'impact" -ForegroundColor Yellow
            Write-Host "  - Solde initial: $($soldeInitial) FCFA" -ForegroundColor White
            Write-Host "  - Solde après annulation: $($compteAfterCancel.solde) FCFA" -ForegroundColor White
            Write-Host "  - Différence: $($compteAfterCancel.solde - $soldeInitial) FCFA" -ForegroundColor White
        }
        
    } else {
        Write-Host "❌ Échec de l'annulation" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Erreur lors de l'annulation: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Test terminé ===" -ForegroundColor Green
