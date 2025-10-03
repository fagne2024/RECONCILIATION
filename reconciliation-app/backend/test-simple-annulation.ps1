# Script de test simple pour vérifier la logique d'annulation

$baseUrl = "http://localhost:8080/api"

Write-Host "=== Test simple d'annulation ===" -ForegroundColor Green

# 1. Créer une opération de test
Write-Host "`n1. Création d'une opération de test:" -ForegroundColor Yellow

try {
    $comptes = Invoke-RestMethod -Uri "$baseUrl/comptes" -Method GET
    $compte = $comptes | Where-Object { $_.numeroCompte -eq "CELCM0001" }
    
    if ($compte) {
        Write-Host "Compte de test: $($compte.numeroCompte)" -ForegroundColor Cyan
        Write-Host "Solde initial: $($compte.solde) FCFA" -ForegroundColor Green
        
        # Créer une opération de test
        $operationTest = @{
            compteId = $compte.id
            typeOperation = "ajustement"
            montant = 5000
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
        Write-Host "  - Solde avant: $($createdOp.soldeAvant) FCFA" -ForegroundColor Blue
        Write-Host "  - Solde après: $($createdOp.soldeApres) FCFA" -ForegroundColor Green
        
        # Vérifier le solde après création
        Start-Sleep -Seconds 1
        $compteAfterCreate = Invoke-RestMethod -Uri "$baseUrl/comptes" -Method GET | Where-Object { $_.numeroCompte -eq "CELCM0001" }
        Write-Host "Solde du compte après création: $($compteAfterCreate.solde) FCFA" -ForegroundColor Green
        
        # 2. Annuler l'opération
        Write-Host "`n2. Annulation de l'opération:" -ForegroundColor Yellow
        
        $cancelResponse = Invoke-RestMethod -Uri "$baseUrl/operations/$($createdOp.id)/cancel" -Method PUT
        
        if ($cancelResponse -eq $true) {
            Write-Host "✅ Opération annulée avec succès" -ForegroundColor Green
            
            # Attendre un peu pour que les mises à jour soient propagées
            Start-Sleep -Seconds 2
            
            # Vérifier l'opération annulée
            Write-Host "`n3. Vérification de l'opération annulée:" -ForegroundColor Yellow
            
            $opAnnulee = Invoke-RestMethod -Uri "$baseUrl/operations/$($createdOp.id)" -Method GET
            
            Write-Host "Opération annulée:" -ForegroundColor Cyan
            Write-Host "  - ID: $($opAnnulee.id)" -ForegroundColor White
            Write-Host "  - Type: $($opAnnulee.typeOperation)" -ForegroundColor White
            Write-Host "  - Statut: $($opAnnulee.statut)" -ForegroundColor Yellow
            Write-Host "  - Montant: $($opAnnulee.montant) FCFA" -ForegroundColor White
            Write-Host "  - Solde avant: $($opAnnulee.soldeAvant) FCFA" -ForegroundColor Blue
            Write-Host "  - Solde après: $($opAnnulee.soldeApres) FCFA" -ForegroundColor Green
            
            # Vérifier que le soldeApres est correctement calculé
            $impactReel = $opAnnulee.soldeApres - $opAnnulee.soldeAvant
            $impactAttendu = $opAnnulee.montant  # Pour ajustement, l'impact est +montant
            
            Write-Host "`nVérification du soldeApres:" -ForegroundColor Cyan
            Write-Host "  - Impact calculé: $($impactReel) FCFA" -ForegroundColor White
            Write-Host "  - Impact attendu: $($impactAttendu) FCFA" -ForegroundColor White
            
            if ($impactReel -eq $impactAttendu) {
                Write-Host "  ✅ Le soldeApres est correctement calculé" -ForegroundColor Green
            } else {
                Write-Host "  ❌ Le soldeApres n'est pas correctement calculé" -ForegroundColor Red
                Write-Host "  - Différence: $($impactReel - $impactAttendu) FCFA" -ForegroundColor Red
            }
            
            # Vérifier le solde du compte après annulation
            Write-Host "`n4. Vérification du solde du compte:" -ForegroundColor Yellow
            
            $compteAfterCancel = Invoke-RestMethod -Uri "$baseUrl/comptes" -Method GET | Where-Object { $_.numeroCompte -eq "CELCM0001" }
            Write-Host "Solde du compte après annulation: $($compteAfterCancel.solde) FCFA" -ForegroundColor Green
            
            # Vérifier les opérations d'annulation créées
            Write-Host "`n5. Vérification des opérations d'annulation:" -ForegroundColor Yellow
            
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
