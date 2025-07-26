# Test de l'affichage des frais dans la table des écarts de solde
Write-Host "=== Test de l'affichage des frais ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080"

Write-Host "`n1. Vérification des écarts de solde avec frais..." -ForegroundColor Yellow

try {
    $ecartSoldes = Invoke-RestMethod -Uri "$baseUrl/api/ecart-solde" -Method GET
    $operations = Invoke-RestMethod -Uri "$baseUrl/api/operations" -Method GET
    
    Write-Host "✅ Écarts de solde trouvés: $($ecartSoldes.Count)" -ForegroundColor Green
    Write-Host "✅ Opérations trouvées: $($operations.Count)" -ForegroundColor Green
    
    # Filtrer les frais pour écarts de solde
    $fraisEcartSolde = $operations | Where-Object { 
        $_.typeOperation -eq "FRAIS_TRANSACTION" -and 
        $_.nomBordereau -like "*FEES_ECART_SOLDE*" 
    }
    
    Write-Host "✅ Frais pour écarts de solde: $($fraisEcartSolde.Count)" -ForegroundColor Green
    
    Write-Host "`n2. Correspondance écarts/frais..." -ForegroundColor Yellow
    
    foreach ($ecart in $ecartSoldes) {
        Write-Host "`nÉcart de solde:" -ForegroundColor Cyan
        Write-Host "  - ID: $($ecart.id)" -ForegroundColor Cyan
        Write-Host "  - Service: $($ecart.service)" -ForegroundColor Cyan
        Write-Host "  - Montant: $($ecart.montant) FCFA" -ForegroundColor Cyan
        Write-Host "  - Agence: $($ecart.agence)" -ForegroundColor Cyan
        Write-Host "  - Date: $($ecart.dateTransaction)" -ForegroundColor Cyan
        
        # Chercher le frais correspondant
        $ecartDate = [DateTime]::Parse($ecart.dateTransaction).ToString("yyyy-MM-dd")
        $fraisCorrespondant = $fraisEcartSolde | Where-Object { 
            $_.service -eq $ecart.service -and 
            $_.codeProprietaire -eq $ecart.agence -and
            $_.nomBordereau -like "*$ecartDate*"
        }
        
        if ($fraisCorrespondant) {
            Write-Host "  ✅ Frais associé trouvé:" -ForegroundColor Green
            Write-Host "    - Montant: $($fraisCorrespondant.montant) FCFA" -ForegroundColor Green
            Write-Host "    - Bordereau: $($fraisCorrespondant.nomBordereau)" -ForegroundColor Green
            Write-Host "    - Type: $($fraisCorrespondant.typeCalcul)" -ForegroundColor Green
            if ($fraisCorrespondant.pourcentage) {
                Write-Host "    - Pourcentage: $($fraisCorrespondant.pourcentage)%" -ForegroundColor Green
            }
        } else {
            Write-Host "  ❌ Aucun frais associé trouvé" -ForegroundColor Red
        }
    }
    
} catch {
    Write-Host "❌ Erreur lors de la vérification: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n3. Instructions pour voir les frais dans l'interface..." -ForegroundColor Yellow

Write-Host "   📋 Pour voir les frais dans l'interface:" -ForegroundColor Cyan
Write-Host "   1. Allez dans 'Écarts de Solde' dans le menu" -ForegroundColor Cyan
Write-Host "   2. Les frais apparaissent maintenant directement dans la colonne 'Frais'" -ForegroundColor Cyan
Write-Host "   3. Chaque écart de solde affiche son frais associé avec le montant et le type" -ForegroundColor Cyan
Write-Host "   4. Les frais sont colorés selon leur type (Pourcentage/Fixe)" -ForegroundColor Cyan

Write-Host "`n=== Résumé ===" -ForegroundColor Green
Write-Host "✅ Vérification des écarts de solde" -ForegroundColor Green
Write-Host "✅ Vérification des frais associés" -ForegroundColor Green
Write-Host "✅ Instructions d'affichage" -ForegroundColor Green

Write-Host "`n🎉 Test terminé !" -ForegroundColor Green 