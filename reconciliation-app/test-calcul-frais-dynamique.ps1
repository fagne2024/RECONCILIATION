# Test du calcul dynamique des frais
Write-Host "=== Test du calcul dynamique des frais ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080"

Write-Host "`n1. Vérification des configurations de frais..." -ForegroundColor Yellow

try {
    $fraisTransactions = Invoke-RestMethod -Uri "$baseUrl/api/frais-transaction" -Method GET
    
    Write-Host "✅ Configurations de frais trouvées: $($fraisTransactions.Count)" -ForegroundColor Green
    
    # Filtrer les frais pour CELCM0001
    $fraisCelcm = $fraisTransactions | Where-Object { $_.agence -eq "CELCM0001" }
    
    Write-Host "✅ Frais pour CELCM0001: $($fraisCelcm.Count)" -ForegroundColor Green
    
    foreach ($frais in $fraisCelcm) {
        Write-Host "  - Service: $($frais.service), Type: $($frais.typeCalcul), Montant: $($frais.montantFrais), Pourcentage: $($frais.pourcentage)" -ForegroundColor Cyan
    }
    
} catch {
    Write-Host "❌ Erreur lors de la vérification des frais: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n2. Vérification des écarts de solde..." -ForegroundColor Yellow

try {
    $ecartSoldes = Invoke-RestMethod -Uri "$baseUrl/api/ecart-solde" -Method GET
    
    Write-Host "✅ Écarts de solde trouvés: $($ecartSoldes.Count)" -ForegroundColor Green
    
    foreach ($ecart in $ecartSoldes) {
        Write-Host "`nÉcart de solde:" -ForegroundColor Cyan
        Write-Host "  - ID: $($ecart.id)" -ForegroundColor Cyan
        Write-Host "  - Service: $($ecart.service)" -ForegroundColor Cyan
        Write-Host "  - Montant: $($ecart.montant) FCFA" -ForegroundColor Cyan
        Write-Host "  - Agence: $($ecart.agence)" -ForegroundColor Cyan
        
        # Chercher la configuration de frais correspondante
        $fraisConfig = $fraisCelcm | Where-Object { $_.service -eq $ecart.service }
        
        if ($fraisConfig) {
            Write-Host "  ✅ Configuration de frais trouvée:" -ForegroundColor Green
            Write-Host "    - Type: $($fraisConfig.typeCalcul)" -ForegroundColor Green
            Write-Host "    - Montant fixe: $($fraisConfig.montantFrais) FCFA" -ForegroundColor Green
            Write-Host "    - Pourcentage: $($fraisConfig.pourcentage)%" -ForegroundColor Green
            
            # Calculer le frais selon le type
            if ($fraisConfig.typeCalcul -eq "POURCENTAGE" -and $fraisConfig.pourcentage) {
                $montantCalcule = $ecart.montant * ($fraisConfig.pourcentage / 100.0)
                Write-Host "    - Frais calculé (pourcentage): $montantCalcule FCFA ($($fraisConfig.pourcentage)% de $($ecart.montant))" -ForegroundColor Green
            } else {
                $montantCalcule = $fraisConfig.montantFrais
                Write-Host "    - Frais calculé (fixe): $montantCalcule FCFA" -ForegroundColor Green
            }
        } else {
            Write-Host "  ❌ Aucune configuration de frais trouvée pour ce service" -ForegroundColor Red
        }
    }
    
} catch {
    Write-Host "❌ Erreur lors de la vérification des écarts: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n3. Test de calcul manuel..." -ForegroundColor Yellow

# Test avec des valeurs spécifiques
$testMontant = 100000
$testService = "PAIEMENTMARCHAND_MTN_CM"
$testAgence = "CELCM0001"

Write-Host "   Test avec montant: $testMontant FCFA, service: $testService, agence: $testAgence" -ForegroundColor Cyan

$fraisConfigTest = $fraisCelcm | Where-Object { $_.service -eq $testService }

if ($fraisConfigTest) {
    if ($fraisConfigTest.typeCalcul -eq "POURCENTAGE" -and $fraisConfigTest.pourcentage) {
        $fraisCalcule = $testMontant * ($fraisConfigTest.pourcentage / 100.0)
        Write-Host "   ✅ Frais calculé: $fraisCalcule FCFA ($($fraisConfigTest.pourcentage)% de $testMontant)" -ForegroundColor Green
    } else {
        $fraisCalcule = $fraisConfigTest.montantFrais
        Write-Host "   ✅ Frais calculé: $fraisCalcule FCFA (montant fixe)" -ForegroundColor Green
    }
} else {
    Write-Host "   ❌ Aucune configuration trouvée pour ce service" -ForegroundColor Red
}

Write-Host "`n4. Instructions pour voir les frais calculés dans l'interface..." -ForegroundColor Yellow

Write-Host "   📋 Les frais sont maintenant calculés dynamiquement:" -ForegroundColor Cyan
Write-Host "   1. Allez dans 'Écarts de Solde' dans le menu" -ForegroundColor Cyan
Write-Host "   2. Les frais sont calculés en temps réel selon les paramètres de frais_transaction" -ForegroundColor Cyan
Write-Host "   3. Le calcul se fait selon le type (Pourcentage ou Fixe)" -ForegroundColor Cyan
Write-Host "   4. Les frais s'adaptent automatiquement aux changements de configuration" -ForegroundColor Cyan

Write-Host "`n=== Résumé ===" -ForegroundColor Green
Write-Host "✅ Vérification des configurations de frais" -ForegroundColor Green
Write-Host "✅ Vérification des écarts de solde" -ForegroundColor Green
Write-Host "✅ Test de calcul dynamique" -ForegroundColor Green
Write-Host "✅ Instructions d'affichage" -ForegroundColor Green

Write-Host "`nTest termine !" -ForegroundColor Green 