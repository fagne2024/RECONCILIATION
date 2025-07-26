# Vérification de la visibilité des frais dans l'interface
Write-Host "=== Vérification de la visibilité des frais ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080"

Write-Host "`n1. Vérification des opérations de frais récentes..." -ForegroundColor Yellow

try {
    $operationsUrl = "$baseUrl/api/operations"
    $operations = Invoke-RestMethod -Uri $operationsUrl -Method GET
    
    # Chercher les opérations de frais récentes pour écarts de solde
    $fraisEcartSolde = $operations | Where-Object { 
        $_.typeOperation -eq "FRAIS_TRANSACTION" -and 
        $_.nomBordereau -like "*FEES_ECART_SOLDE*" 
    }
    
    Write-Host "✅ Opérations de frais pour écarts de solde trouvées: $($fraisEcartSolde.Count)" -ForegroundColor Green
    
    if ($fraisEcartSolde.Count -gt 0) {
        Write-Host "`n   Dernières opérations de frais:" -ForegroundColor Yellow
        for ($i = 0; $i -lt [Math]::Min(3, $fraisEcartSolde.Count); $i++) {
            $frais = $fraisEcartSolde[$i]
            Write-Host "   Frais $($i + 1):" -ForegroundColor Cyan
            Write-Host "   - ID: $($frais.id)" -ForegroundColor Cyan
            Write-Host "   - Service: $($frais.service)" -ForegroundColor Cyan
            Write-Host "   - Montant: $($frais.montant)" -ForegroundColor Cyan
            Write-Host "   - Bordereau: $($frais.nomBordereau)" -ForegroundColor Cyan
            Write-Host "   - Date: $($frais.dateOperation)" -ForegroundColor Cyan
            Write-Host "   - ParentOperationId: $($frais.parentOperationId)" -ForegroundColor Cyan
        }
    } else {
        Write-Host "   ⚠️ Aucune opération de frais trouvée pour les écarts de solde" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Erreur lors de la vérification: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n2. Vérification des écarts de solde récents..." -ForegroundColor Yellow

try {
    $ecartSoldeUrl = "$baseUrl/api/ecart-solde"
    $ecartSoldes = Invoke-RestMethod -Uri $ecartSoldeUrl -Method GET
    
    Write-Host "✅ Écarts de solde trouvés: $($ecartSoldes.Count)" -ForegroundColor Green
    
    if ($ecartSoldes.Count -gt 0) {
        Write-Host "`n   Derniers écarts de solde:" -ForegroundColor Yellow
        for ($i = 0; $i -lt [Math]::Min(3, $ecartSoldes.Count); $i++) {
            $ecart = $ecartSoldes[$i]
            Write-Host "   Écart $($i + 1):" -ForegroundColor Cyan
            Write-Host "   - ID: $($ecart.id)" -ForegroundColor Cyan
            Write-Host "   - Service: $($ecart.service)" -ForegroundColor Cyan
            Write-Host "   - Montant: $($ecart.montant)" -ForegroundColor Cyan
            Write-Host "   - Agence: $($ecart.agence)" -ForegroundColor Cyan
            Write-Host "   - Date: $($ecart.dateTransaction)" -ForegroundColor Cyan
        }
    }
    
} catch {
    Write-Host "❌ Erreur lors de la vérification des écarts: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n3. Vérification de la correspondance..." -ForegroundColor Yellow

try {
    # Vérifier si les frais correspondent aux écarts de solde
    $ecartSoldes = Invoke-RestMethod -Uri $ecartSoldeUrl -Method GET
    $operations = Invoke-RestMethod -Uri $operationsUrl -Method GET
    
    $fraisEcartSolde = $operations | Where-Object { 
        $_.typeOperation -eq "FRAIS_TRANSACTION" -and 
        $_.nomBordereau -like "*FEES_ECART_SOLDE*" 
    }
    
    Write-Host "   Correspondance:" -ForegroundColor Cyan
    Write-Host "   - Écarts de solde: $($ecartSoldes.Count)" -ForegroundColor Cyan
    Write-Host "   - Frais générés: $($fraisEcartSolde.Count)" -ForegroundColor Cyan
    
    if ($ecartSoldes.Count -gt 0 -and $fraisEcartSolde.Count -gt 0) {
        $ratio = [math]::Round(($fraisEcartSolde.Count / $ecartSoldes.Count), 2)
        Write-Host "   - Ratio frais/écarts: $ratio" -ForegroundColor Cyan
        
        if ($ratio -ge 0.8) {
            Write-Host "   ✅ La génération de frais fonctionne correctement" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️ Certains écarts de solde n'ont pas généré de frais" -ForegroundColor Yellow
        }
    }
    
} catch {
    Write-Host "❌ Erreur lors de la vérification de correspondance: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n4. Instructions pour voir les frais dans l'interface..." -ForegroundColor Yellow

Write-Host "   Pour voir les frais dans l'interface:" -ForegroundColor Cyan
Write-Host "   1. Allez dans 'Opérations' dans le menu" -ForegroundColor Cyan
Write-Host "   2. Dans les filtres, sélectionnez 'Frais Transaction' dans le type d'opération" -ForegroundColor Cyan
Write-Host "   3. Ou cherchez les opérations avec 'FEES_ECART_SOLDE' dans le bordereau" -ForegroundColor Cyan
Write-Host "   4. Les frais apparaissent avec un badge vert 'FRAIS_TRANSACTION'" -ForegroundColor Cyan

Write-Host "`n=== Résumé ===" -ForegroundColor Green
Write-Host "✅ Vérification des frais générés" -ForegroundColor Green
Write-Host "✅ Vérification des écarts de solde" -ForegroundColor Green
Write-Host "✅ Vérification de la correspondance" -ForegroundColor Green
Write-Host "✅ Instructions d'affichage" -ForegroundColor Green

Write-Host "`n🎉 Vérification terminée !" -ForegroundColor Green 