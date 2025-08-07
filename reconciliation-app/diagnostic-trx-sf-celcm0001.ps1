# Diagnostic spécifique pour CELCM0001 et TRX SF
Write-Host "=== Diagnostic TRX SF pour CELCM0001 ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080/api"

# 1. Vérifier l'application
Write-Host "`n1. Vérification de l'application:" -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET -TimeoutSec 5
    Write-Host "✅ Application en cours d'exécution" -ForegroundColor Green
} catch {
    Write-Host "❌ Application non accessible: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Vérifier le compte CELCM0001
Write-Host "`n2. Vérification du compte CELCM0001:" -ForegroundColor Yellow
try {
    $comptes = Invoke-RestMethod -Uri "$baseUrl/comptes" -Method GET
    $celcmCompte = $comptes | Where-Object { $_.numeroCompte -eq "CELCM0001" }
    
    if ($celcmCompte) {
        Write-Host "✅ Compte CELCM0001 trouvé:" -ForegroundColor Green
        Write-Host "   - Numéro: $($celcmCompte.numeroCompte)" -ForegroundColor Cyan
        Write-Host "   - Agence: $($celcmCompte.agence)" -ForegroundColor Cyan
        Write-Host "   - Pays: $($celcmCompte.pays)" -ForegroundColor Cyan
        Write-Host "   - Solde: $($celcmCompte.solde)" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Compte CELCM0001 non trouvé" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Erreur lors de la récupération des comptes: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Vérifier les transactions TRX SF pour CELCM0001
Write-Host "`n3. Vérification des transactions TRX SF pour CELCM0001:" -ForegroundColor Yellow
try {
    $trxSfList = Invoke-RestMethod -Uri "$baseUrl/trx-sf" -Method GET
    $celcmTrxSf = $trxSfList | Where-Object { $_.agence -eq "CELCM0001" }
    
    if ($celcmTrxSf) {
        Write-Host "✅ $($celcmTrxSf.Count) transaction(s) TRX SF trouvée(s) pour CELCM0001:" -ForegroundColor Green
        
        foreach ($trx in $celcmTrxSf) {
            Write-Host "   - ID: $($trx.id)" -ForegroundColor Cyan
            Write-Host "     Date transaction: $($trx.dateTransaction)" -ForegroundColor Gray
            Write-Host "     Date import: $($trx.dateImport)" -ForegroundColor Gray
            Write-Host "     Frais: $($trx.frais) FCFA" -ForegroundColor Gray
            Write-Host "     Service: $($trx.service)" -ForegroundColor Gray
            Write-Host "     Statut: $($trx.statut)" -ForegroundColor Gray
            Write-Host ""
        }
    } else {
        Write-Host "❌ Aucune transaction TRX SF trouvée pour CELCM0001" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Erreur lors de la récupération des transactions TRX SF: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Test spécifique pour la date 06/08/2025
Write-Host "`n4. Test spécifique pour la date 06/08/2025:" -ForegroundColor Yellow
try {
    $date = "2025-08-06"
    $response = Invoke-RestMethod -Uri "$baseUrl/trx-sf/frais/CELCM0001/$date" -Method GET
    
    Write-Host "✅ Frais SF pour CELCM0001 le $date:" -ForegroundColor Green
    Write-Host "   - Agence: $($response.agence)" -ForegroundColor Cyan
    Write-Host "   - Date: $($response.date)" -ForegroundColor Cyan
    Write-Host "   - Frais: $($response.frais) FCFA" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Erreur lors du test des frais SF: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Vérifier les opérations du compte CELCM0001 pour le 06/08/2025
Write-Host "`n5. Vérification des opérations CELCM0001 pour le 06/08/2025:" -ForegroundColor Yellow
try {
    $operations = Invoke-RestMethod -Uri "$baseUrl/operations" -Method GET
    $celcmOperations = $operations | Where-Object { 
        $_.codeProprietaire -eq "CELCM0001" -and 
        $_.dateOperation -like "*2025-08-06*" 
    }
    
    if ($celcmOperations) {
        Write-Host "✅ $($celcmOperations.Count) opération(s) trouvée(s) pour CELCM0001 le 06/08/2025:" -ForegroundColor Green
        
        foreach ($op in $celcmOperations) {
            Write-Host "   - Type: $($op.typeOperation)" -ForegroundColor Cyan
            Write-Host "     Montant: $($op.montant) FCFA" -ForegroundColor Gray
            Write-Host "     Service: $($op.service)" -ForegroundColor Gray
            Write-Host "     Date: $($op.dateOperation)" -ForegroundColor Gray
            Write-Host ""
        }
    } else {
        Write-Host "❌ Aucune opération trouvée pour CELCM0001 le 06/08/2025" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Erreur lors de la récupération des opérations: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. Test de format de date
Write-Host "`n6. Test des formats de date:" -ForegroundColor Yellow
$dateFormats = @("2025-08-06", "06/08/2025", "2025-08-06T00:00:00", "06-08-2025")

foreach ($dateFormat in $dateFormats) {
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/trx-sf/frais/CELCM0001/$dateFormat" -Method GET
        Write-Host "✅ Format '$dateFormat': $($response.frais) FCFA" -ForegroundColor Green
    } catch {
        Write-Host "❌ Format '$dateFormat': $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 7. Vérifier les agences disponibles dans TRX SF
Write-Host "`n7. Vérification des agences disponibles dans TRX SF:" -ForegroundColor Yellow
try {
    $agences = Invoke-RestMethod -Uri "$baseUrl/trx-sf/agences" -Method GET
    Write-Host "✅ $($agences.Count) agence(s) disponible(s):" -ForegroundColor Green
    
    foreach ($agence in $agences) {
        $color = if ($agence -eq "CELCM0001") { "Green" } else { "Gray" }
        Write-Host "   - $agence" -ForegroundColor $color
    }
} catch {
    Write-Host "❌ Erreur lors de la récupération des agences: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Fin du diagnostic ===" -ForegroundColor Green
