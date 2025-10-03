# Script de test pour vérifier la logique d'annulation avec mise à jour du solde

$baseUrl = "http://localhost:8080/api"

Write-Host "=== Test de la logique d'annulation avec solde ===" -ForegroundColor Green

# 1. Créer une opération de test avec frais
Write-Host "`n1. Création d'une opération de test:" -ForegroundColor Yellow

try {
    # Récupérer un compte pour le test
    $comptes = Invoke-RestMethod -Uri "$baseUrl/comptes" -Method GET
    $compteTest = $comptes | Where-Object { $_.numeroCompte -eq "CELCM0001" } | Select-Object -First 1
    
    if ($compteTest) {
        Write-Host "Compte de test: $($compteTest.numeroCompte)" -ForegroundColor Cyan
        Write-Host "Solde initial: $($compteTest.solde) FCFA" -ForegroundColor Green
        
        # Créer une opération de test
        $operationTest = @{
            compteId = $compteTest.id
            typeOperation = "total_cashin"
            montant = 100000
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
        $compteAfterCreate = Invoke-RestMethod -Uri "$baseUrl/comptes" -Method GET | Where-Object { $_.numeroCompte -eq "CELCM0001" }
        Write-Host "Solde après création: $($compteAfterCreate.solde) FCFA" -ForegroundColor Green
        
        # 2. Tester l'annulation
        Write-Host "`n2. Test d'annulation:" -ForegroundColor Yellow
        
        $cancelResponse = Invoke-RestMethod -Uri "$baseUrl/operations/$($createdOp.id)/cancel" -Method PUT
        
        if ($cancelResponse -eq $true) {
            Write-Host "✅ Opération annulée avec succès" -ForegroundColor Green
            
            # Attendre un peu pour que les mises à jour soient propagées
            Start-Sleep -Seconds 2
            
            # Vérifier le solde après annulation
            $compteAfterCancel = Invoke-RestMethod -Uri "$baseUrl/comptes" -Method GET | Where-Object { $_.numeroCompte -eq "CELCM0001" }
            Write-Host "Solde après annulation: $($compteAfterCancel.solde) FCFA" -ForegroundColor Green
            
            # Calculer les différences
            $differenceCreate = $compteAfterCreate.solde - $compteTest.solde
            $differenceCancel = $compteAfterCancel.solde - $compteAfterCreate.solde
            $totalDifference = $compteAfterCancel.solde - $compteTest.solde
            
            Write-Host "`nAnalyse des impacts:" -ForegroundColor Cyan
            Write-Host "  - Impact de création: $($differenceCreate) FCFA" -ForegroundColor White
            Write-Host "  - Impact d'annulation: $($differenceCancel) FCFA" -ForegroundColor White
            Write-Host "  - Impact net: $($totalDifference) FCFA" -ForegroundColor White
            
            if ($totalDifference -eq 0) {
                Write-Host "  ✅ L'annulation a correctement annulé l'impact de l'opération" -ForegroundColor Green
            } else {
                Write-Host "  ⚠️ L'annulation n'a pas complètement annulé l'impact" -ForegroundColor Yellow
            }
            
            # Vérifier les opérations d'annulation créées
            Write-Host "`n3. Vérification des opérations d'annulation:" -ForegroundColor Yellow
            
            $allOps = Invoke-RestMethod -Uri "$baseUrl/operations" -Method GET
            $opsAnnulation = $allOps | Where-Object { 
                $_.typeOperation -like "annulation_*" -and 
                $_.parentOperationId -eq $createdOp.id 
            }
            
            Write-Host "Opérations d'annulation créées: $($opsAnnulation.length)" -ForegroundColor Cyan
            
            foreach ($opAnnul in $opsAnnulation) {
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

Write-Host "`n=== Test terminé ===" -ForegroundColor Green
