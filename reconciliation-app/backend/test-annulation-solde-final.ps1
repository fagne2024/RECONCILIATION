# Test de la correction du solde final lors de l'annulation d'opérations
# Ce script teste que le solde du compte est bien mis à jour avec le solde après de la dernière ligne d'annulation

Write-Host "🧪 Test de la correction du solde final lors de l'annulation d'opérations" -ForegroundColor Cyan

# Configuration
$baseUrl = "http://localhost:8080"
$testCompteId = 1  # Remplacer par un ID de compte existant

Write-Host "📋 Configuration du test:" -ForegroundColor Yellow
Write-Host "  - URL Backend: $baseUrl"
Write-Host "  - Compte de test: $testCompteId"

try {
    # 1. Récupérer le solde actuel du compte
    Write-Host "`n1️⃣ Récupération du solde actuel du compte..." -ForegroundColor Green
    $compteResponse = Invoke-RestMethod -Uri "$baseUrl/api/comptes/$testCompteId" -Method GET
    $soldeInitial = $compteResponse.solde
    Write-Host "   Solde initial du compte: $soldeInitial FCFA" -ForegroundColor White

    # 2. Récupérer les opérations du compte
    Write-Host "`n2️⃣ Récupération des opérations du compte..." -ForegroundColor Green
    $operationsResponse = Invoke-RestMethod -Uri "$baseUrl/api/operations/compte/$testCompteId" -Method GET
    $operations = $operationsResponse.content
    
    # Filtrer les opérations non annulées
    $operationsNonAnnulees = $operations | Where-Object { $_.statut -ne "Annulée" -and $_.typeOperation -notlike "annulation_*" -and $_.typeOperation -notlike "Annulation_*" }
    
    if ($operationsNonAnnulees.Count -eq 0) {
        Write-Host "   ⚠️ Aucune opération non annulée trouvée pour le test" -ForegroundColor Yellow
        exit 0
    }
    
    $operationTest = $operationsNonAnnulees[0]
    Write-Host "   Opération sélectionnée pour le test:" -ForegroundColor White
    Write-Host "     - ID: $($operationTest.id)"
    Write-Host "     - Type: $($operationTest.typeOperation)"
    Write-Host "     - Montant: $($operationTest.montant) FCFA"
    Write-Host "     - Solde avant: $($operationTest.soldeAvant) FCFA"
    Write-Host "     - Solde après: $($operationTest.soldeApres) FCFA"

    # 3. Annuler l'opération
    Write-Host "`n3️⃣ Annulation de l'opération..." -ForegroundColor Green
    $annulationBody = @{
        statut = "Annulée"
    } | ConvertTo-Json -Depth 3
    
    $annulationResponse = Invoke-RestMethod -Uri "$baseUrl/api/operations/$($operationTest.id)/statut" -Method PUT -Body $annulationBody -ContentType "application/json"
    Write-Host "   ✅ Opération annulée avec succès" -ForegroundColor Green

    # 4. Vérifier le solde du compte après annulation
    Write-Host "`n4️⃣ Vérification du solde du compte après annulation..." -ForegroundColor Green
    Start-Sleep -Seconds 2  # Attendre que les calculs se terminent
    
    $compteResponseApres = Invoke-RestMethod -Uri "$baseUrl/api/comptes/$testCompteId" -Method GET
    $soldeApresAnnulation = $compteResponseApres.solde
    Write-Host "   Solde du compte après annulation: $soldeApresAnnulation FCFA" -ForegroundColor White

    # 5. Récupérer les lignes d'annulation créées
    Write-Host "`n5️⃣ Vérification des lignes d'annulation créées..." -ForegroundColor Green
    $operationsApres = Invoke-RestMethod -Uri "$baseUrl/api/operations/compte/$testCompteId" -Method GET
    $lignesAnnulation = $operationsApres.content | Where-Object { $_.typeOperation -like "annulation_*" -or $_.typeOperation -like "Annulation_*" }
    
    Write-Host "   Nombre de lignes d'annulation créées: $($lignesAnnulation.Count)" -ForegroundColor White
    
    foreach ($ligne in $lignesAnnulation) {
        Write-Host "     - Type: $($ligne.typeOperation)" -ForegroundColor White
        Write-Host "       Montant: $($ligne.montant) FCFA" -ForegroundColor White
        Write-Host "       Solde avant: $($ligne.soldeAvant) FCFA" -ForegroundColor White
        Write-Host "       Solde après: $($ligne.soldeApres) FCFA" -ForegroundColor White
    }

    # 6. Vérifier que le solde du compte correspond au solde après de la dernière ligne d'annulation
    Write-Host "`n6️⃣ Vérification de la cohérence du solde..." -ForegroundColor Green
    
    if ($lignesAnnulation.Count -gt 0) {
        # Trier par date pour trouver la dernière ligne d'annulation
        $derniereLigneAnnulation = $lignesAnnulation | Sort-Object dateOperation -Descending | Select-Object -First 1
        $soldeApresDerniereLigne = $derniereLigneAnnulation.soldeApres
        
        Write-Host "   Solde après de la dernière ligne d'annulation: $soldeApresDerniereLigne FCFA" -ForegroundColor White
        Write-Host "   Solde actuel du compte: $soldeApresAnnulation FCFA" -ForegroundColor White
        
        if ([Math]::Abs($soldeApresDerniereLigne - $soldeApresAnnulation) -lt 0.01) {
            Write-Host "   ✅ CORRECTION RÉUSSIE: Le solde du compte correspond au solde après de la dernière ligne d'annulation" -ForegroundColor Green
        } else {
            Write-Host "   ❌ PROBLÈME: Le solde du compte ne correspond pas au solde après de la dernière ligne d'annulation" -ForegroundColor Red
            Write-Host "     Différence: $([Math]::Abs($soldeApresDerniereLigne - $soldeApresAnnulation)) FCFA" -ForegroundColor Red
        }
    } else {
        Write-Host "   ⚠️ Aucune ligne d'annulation trouvée" -ForegroundColor Yellow
    }

    # 7. Résumé du test
    Write-Host "`n📊 Résumé du test:" -ForegroundColor Cyan
    Write-Host "   - Solde initial: $soldeInitial FCFA" -ForegroundColor White
    Write-Host "   - Solde après annulation: $soldeApresAnnulation FCFA" -ForegroundColor White
    Write-Host "   - Lignes d'annulation créées: $($lignesAnnulation.Count)" -ForegroundColor White
    
    if ($lignesAnnulation.Count -gt 0) {
        $derniereLigne = $lignesAnnulation | Sort-Object dateOperation -Descending | Select-Object -First 1
        Write-Host "   - Solde après dernière ligne: $($derniereLigne.soldeApres) FCFA" -ForegroundColor White
    }

} catch {
    Write-Host "❌ Erreur lors du test: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Assurez-vous que le backend est démarré et accessible sur $baseUrl" -ForegroundColor Yellow
}

Write-Host "`n🏁 Test terminé" -ForegroundColor Cyan
