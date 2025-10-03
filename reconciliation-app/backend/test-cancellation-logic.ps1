# Script de test pour vérifier la logique d'annulation des opérations

$baseUrl = "http://localhost:8080/api"

Write-Host "=== Test de la logique d'annulation des opérations ===" -ForegroundColor Green

# 1. Récupérer une opération avec des frais associés
Write-Host "`n1. Recherche d'une opération avec frais associés:" -ForegroundColor Yellow

try {
    $allOps = Invoke-RestMethod -Uri "$baseUrl/operations" -Method GET
    
    # Chercher une opération qui a des frais associés
    $opWithFrais = $allOps | Where-Object { 
        $_.typeOperation -eq "total_cashin" -or $_.typeOperation -eq "total_paiement" 
    } | Select-Object -First 1
    
    if ($opWithFrais) {
        Write-Host "Opération trouvée: ID $($opWithFrais.id)" -ForegroundColor Cyan
        Write-Host "  - Type: $($opWithFrais.typeOperation)" -ForegroundColor Green
        Write-Host "  - Montant: $($opWithFrais.montant) FCFA" -ForegroundColor Green
        Write-Host "  - Statut: $($opWithFrais.statut)" -ForegroundColor Yellow
        Write-Host "  - Bordereau: $($opWithFrais.nomBordereau)" -ForegroundColor White
        
        # Chercher les frais associés
        $fraisAssocies = $allOps | Where-Object { 
            $_.typeOperation -eq "FRAIS_TRANSACTION" -and 
            ($_.parentOperationId -eq $opWithFrais.id -or $_.nomBordereau -like "*$($opWithFrais.nomBordereau)*")
        }
        
        Write-Host "  - Frais associés trouvés: $($fraisAssocies.length)" -ForegroundColor Cyan
        
        foreach ($frais in $fraisAssocies) {
            Write-Host "    * Frais ID: $($frais.id)" -ForegroundColor White
            Write-Host "      - Montant: $($frais.montant) FCFA" -ForegroundColor Green
            Write-Host "      - Statut: $($frais.statut)" -ForegroundColor Yellow
            Write-Host "      - Parent ID: $($frais.parentOperationId)" -ForegroundColor White
        }
        
    } else {
        Write-Host "Aucune opération avec frais trouvée" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Erreur lors de la recherche: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Vérifier le solde avant annulation
Write-Host "`n2. Vérification du solde avant annulation:" -ForegroundColor Yellow

try {
    if ($opWithFrais) {
        $comptes = Invoke-RestMethod -Uri "$baseUrl/comptes" -Method GET
        $compte = $comptes | Where-Object { $_.numeroCompte -eq $opWithFrais.codeProprietaire }
        
        if ($compte) {
            Write-Host "  - Solde avant annulation: $($compte.solde) FCFA" -ForegroundColor Green
            Write-Host "  - Dernière MAJ: $($compte.dateDerniereMaj)" -ForegroundColor Green
        }
    }
    
} catch {
    Write-Host "❌ Erreur lors de la vérification du solde: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Tester l'annulation (si une opération est trouvée)
Write-Host "`n3. Test d'annulation:" -ForegroundColor Yellow

if ($opWithFrais -and $opWithFrais.statut -ne "Annulée") {
    Write-Host "  - Tentative d'annulation de l'opération ID: $($opWithFrais.id)" -ForegroundColor Cyan
    
    try {
        $cancelResponse = Invoke-RestMethod -Uri "$baseUrl/operations/$($opWithFrais.id)/cancel" -Method PUT
        
        if ($cancelResponse -eq $true) {
            Write-Host "  ✅ Opération annulée avec succès" -ForegroundColor Green
            
            # Attendre un peu pour que les mises à jour soient propagées
            Start-Sleep -Seconds 2
            
            # Vérifier le solde après annulation
            Write-Host "`n4. Vérification du solde après annulation:" -ForegroundColor Yellow
            
            $comptesAfter = Invoke-RestMethod -Uri "$baseUrl/comptes" -Method GET
            $compteAfter = $comptesAfter | Where-Object { $_.numeroCompte -eq $opWithFrais.codeProprietaire }
            
            if ($compteAfter) {
                Write-Host "  - Solde après annulation: $($compteAfter.solde) FCFA" -ForegroundColor Green
                Write-Host "  - Dernière MAJ: $($compteAfter.dateDerniereMaj)" -ForegroundColor Green
                
                # Calculer la différence
                $difference = $compteAfter.solde - $compte.solde
                Write-Host "  - Différence: $($difference) FCFA" -ForegroundColor Yellow
            }
            
            # Vérifier les opérations d'annulation créées
            Write-Host "`n5. Vérification des opérations d'annulation créées:" -ForegroundColor Yellow
            
            $opsAfterCancel = Invoke-RestMethod -Uri "$baseUrl/operations" -Method GET
            $opsAnnulation = $opsAfterCancel | Where-Object { 
                $_.typeOperation -like "annulation_*" -and 
                $_.parentOperationId -eq $opWithFrais.id 
            }
            
            Write-Host "  - Opérations d'annulation créées: $($opsAnnulation.length)" -ForegroundColor Cyan
            
            foreach ($opAnnul in $opsAnnulation) {
                Write-Host "    * Type: $($opAnnul.typeOperation)" -ForegroundColor White
                Write-Host "      - Montant: $($opAnnul.montant) FCFA" -ForegroundColor Green
                Write-Host "      - Statut: $($opAnnul.statut)" -ForegroundColor Yellow
                Write-Host "      - Solde avant: $($opAnnul.soldeAvant) FCFA" -ForegroundColor Blue
                Write-Host "      - Solde après: $($opAnnul.soldeApres) FCFA" -ForegroundColor Green
            }
            
        } else {
            Write-Host "  ❌ Échec de l'annulation" -ForegroundColor Red
        }
        
    } catch {
        Write-Host "  ❌ Erreur lors de l'annulation: $($_.Exception.Message)" -ForegroundColor Red
    }
    
} else {
    Write-Host "  - Aucune opération à annuler trouvée" -ForegroundColor Yellow
}

Write-Host "`n=== Test terminé ===" -ForegroundColor Green
