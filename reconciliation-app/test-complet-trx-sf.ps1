# Script de test complet pour TRX SF
Write-Host "=== Test complet TRX SF ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080/api/trx-sf"

# Fonction pour tester une API
function Test-Api {
    param(
        [string]$Method,
        [string]$Url,
        [string]$Description,
        [object]$Body = $null
    )
    
    Write-Host "`n$Description..." -ForegroundColor Yellow
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
        }
        
        if ($Body) {
            $params.Body = $Body | ConvertTo-Json
            $params.ContentType = "application/json"
        }
        
        $response = Invoke-RestMethod @params
        Write-Host "✅ Succès" -ForegroundColor Green
        return $response
    } catch {
        Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# 1. Test de création d'une transaction
Write-Host "`n1. Test de création d'une transaction SF..." -ForegroundColor Cyan
$createData = @{
    idTransaction = "TRX_SF_TEST_001"
    telephoneClient = "+22112345678"
    montant = 50000.0
    service = "TRANSFERT"
    agence = "AGENCE_TEST"
    dateTransaction = "2024-01-15T10:30:00"
    numeroTransGu = "GU_TEST_001"
    pays = "SENEGAL"
    frais = 500.0
    commentaire = "Transaction de test"
}

$createdTrx = Test-Api -Method "POST" -Url $baseUrl -Description "Création d'une transaction" -Body $createData

# 2. Test de récupération de toutes les transactions
$allTrx = Test-Api -Method "GET" -Url $baseUrl -Description "Récupération de toutes les transactions"

# 3. Test des statistiques
$stats = Test-Api -Method "GET" -Url "$baseUrl/statistics" -Description "Récupération des statistiques"

# 4. Test des listes distinctes
$agences = Test-Api -Method "GET" -Url "$baseUrl/agences" -Description "Récupération des agences"
$services = Test-Api -Method "GET" -Url "$baseUrl/services" -Description "Récupération des services"
$pays = Test-Api -Method "GET" -Url "$baseUrl/pays" -Description "Récupération des pays"

# 5. Test de mise à jour du statut (si une transaction a été créée)
if ($createdTrx -and $createdTrx.id) {
    $updateData = @{
        statut = "TRAITE"
    }
    Test-Api -Method "POST" -Url "$baseUrl/$($createdTrx.id)/statut" -Description "Mise à jour du statut" -Body $updateData
}

# 6. Test de suppression (si une transaction a été créée)
if ($createdTrx -and $createdTrx.id) {
    Test-Api -Method "DELETE" -Url "$baseUrl/$($createdTrx.id)" -Description "Suppression de la transaction"
}

# 7. Test d'upload de fichier CSV
Write-Host "`n7. Test d'upload de fichier CSV..." -ForegroundColor Cyan
$csvFile = "test-trx-sf-data.csv"
if (Test-Path $csvFile) {
    try {
        $form = @{
            file = Get-Item $csvFile
        }
        $response = Invoke-RestMethod -Uri "$baseUrl/upload" -Method POST -Form $form
        Write-Host "✅ Upload réussi: $($response.count) transactions importées" -ForegroundColor Green
    } catch {
        Write-Host "❌ Erreur lors de l'upload: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "⚠️ Fichier CSV non trouvé: $csvFile" -ForegroundColor Yellow
}

# 8. Test de validation de fichier
Write-Host "`n8. Test de validation de fichier..." -ForegroundColor Cyan
if (Test-Path $csvFile) {
    try {
        $form = @{
            file = Get-Item $csvFile
        }
        $response = Invoke-RestMethod -Uri "$baseUrl/validate" -Method POST -Form $form
        Write-Host "✅ Validation réussie:" -ForegroundColor Green
        Write-Host "   - Lignes valides: $($response.validLines)" -ForegroundColor Cyan
        Write-Host "   - Lignes avec erreurs: $($response.errorLines)" -ForegroundColor Cyan
        Write-Host "   - Doublons: $($response.duplicates)" -ForegroundColor Cyan
        Write-Host "   - Nouveaux enregistrements: $($response.newRecords)" -ForegroundColor Cyan
    } catch {
        Write-Host "❌ Erreur lors de la validation: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Résumé des tests
Write-Host "`n=== Résumé des tests ===" -ForegroundColor Green
Write-Host "✅ Tests API TRX SF terminés" -ForegroundColor Green
Write-Host "📊 Statistiques disponibles: $($stats -ne $null)" -ForegroundColor Cyan
Write-Host "📁 Upload de fichiers: $($csvFile -and (Test-Path $csvFile))" -ForegroundColor Cyan
Write-Host "🔐 Permissions: Ajoutées en base de données" -ForegroundColor Cyan
