# Script de diagnostic pour la logique d'annulation

$baseUrl = "http://localhost:8080/api"

Write-Host "=== Diagnostic de la logique d'annulation ===" -ForegroundColor Green

# 1. Vérifier l'état actuel des opérations
Write-Host "`n1. État actuel des opérations:" -ForegroundColor Yellow

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
    
    # Chercher les opérations d'annulation récentes
    $opsAnnulation = $celcmOps | Where-Object { $_.typeOperation -like "annulation_*" } | Sort-Object { [DateTime]$_.dateOperation } | Select-Object -Last 5
    
    Write-Host "`nDernières opérations d'annulation:" -ForegroundColor Cyan
    foreach ($op in $opsAnnulation) {
        Write-Host "  - ID: $($op.id)" -ForegroundColor White
        Write-Host "    * Type: $($op.typeOperation)" -ForegroundColor Green
        Write-Host "    * Montant: $($op.montant) FCFA" -ForegroundColor Green
        Write-Host "    * Statut: $($op.statut)" -ForegroundColor Yellow
        Write-Host "    * Date: $($op.dateOperation)" -ForegroundColor Green
        Write-Host "    * Parent ID: $($op.parentOperationId)" -ForegroundColor White
        Write-Host ""
    }
    
} catch {
    Write-Host "❌ Erreur lors de la récupération des opérations: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Vérifier le solde du compte
Write-Host "`n2. État du compte:" -ForegroundColor Yellow

try {
    $comptes = Invoke-RestMethod -Uri "$baseUrl/comptes" -Method GET
    $compte = $comptes | Where-Object { $_.numeroCompte -eq "CELCM0001" }
    
    if ($compte) {
        Write-Host "  - Solde actuel: $($compte.solde) FCFA" -ForegroundColor Green
        Write-Host "  - Dernière MAJ: $($compte.dateDerniereMaj)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Compte CELCM0001 non trouvé" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Erreur lors de la vérification du compte: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Tester la création d'une opération simple
Write-Host "`n3. Test de création d'une opération simple:" -ForegroundColor Yellow

try {
    $compte = $comptes | Where-Object { $_.numeroCompte -eq "CELCM0001" }
    
    if ($compte) {
        $operationTest = @{
            compteId = $compte.id
            typeOperation = "ajustement"
            montant = 1000
            banque = "TEST_BANK"
            nomBordereau = "TEST_SIMPLE_$(Get-Date -Format 'yyyyMMddHHmmss')"
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
        
        # Tester l'annulation
        Write-Host "`n4. Test d'annulation:" -ForegroundColor Yellow
        
        $cancelResponse = Invoke-RestMethod -Uri "$baseUrl/operations/$($createdOp.id)/cancel" -Method PUT
        
        if ($cancelResponse -eq $true) {
            Write-Host "✅ Opération annulée avec succès" -ForegroundColor Green
            
            # Attendre un peu pour que les mises à jour soient propagées
            Start-Sleep -Seconds 2
            
            # Vérifier le solde après annulation
            $compteAfterCancel = Invoke-RestMethod -Uri "$baseUrl/comptes" -Method GET | Where-Object { $_.numeroCompte -eq "CELCM0001" }
            Write-Host "Solde après annulation: $($compteAfterCancel.solde) FCFA" -ForegroundColor Green
            
            # Vérifier les opérations d'annulation créées
            $allOpsAfter = Invoke-RestMethod -Uri "$baseUrl/operations" -Method GET
            $opsAnnulationTest = $allOpsAfter | Where-Object { 
                $_.typeOperation -like "annulation_*" -and 
                $_.parentOperationId -eq $createdOp.id 
            }
            
            Write-Host "`nOpérations d'annulation créées: $($opsAnnulationTest.length)" -ForegroundColor Cyan
            
            foreach ($opAnnul in $opsAnnulationTest) {
                Write-Host "  - Type: $($opAnnul.typeOperation)" -ForegroundColor White
                Write-Host "    * Montant: $($opAnnul.montant) FCFA" -ForegroundColor Green
                Write-Host "    * Statut: $($opAnnul.statut)" -ForegroundColor Yellow
                Write-Host "    * Solde avant: $($opAnnul.soldeAvant) FCFA" -ForegroundColor Blue
                Write-Host "    * Solde après: $($opAnnul.soldeApres) FCFA" -ForegroundColor Green
            }
            
        } else {
            Write-Host "❌ Échec de l'annulation" -ForegroundColor Red
        }
        
    } else {
        Write-Host "❌ Compte de test non trouvé" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Erreur lors du test: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Diagnostic terminé ===" -ForegroundColor Green
