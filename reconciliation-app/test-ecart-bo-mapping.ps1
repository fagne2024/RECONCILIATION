# Test de mapping avec les données exactes fournies
Write-Host "=== Test de mapping avec données exactes ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080"
$apiUrl = "$baseUrl/api/ecart-solde"

# Données exactes fournies par l'utilisateur
$testData = @(
    @{
        "ID" = "105620146"
        "IDTransaction" = "13378604378"
        "téléphone client" = "682376662"
        "montant" = "455920"
        "Service" = "PAIEMENTMARCHAND_MTN_CM"
        "Agence" = "CELCM0001"
        "Date" = "2025-07-25 20:58:15.0"
        "Numéro Trans GU" = "1753477095191"
        "PAYS" = "CM"
    }
)

Write-Host "`nDonnées source:" -ForegroundColor Yellow
$testData | ConvertTo-Json -Depth 10

Write-Host "`n1. Test de mapping côté frontend..." -ForegroundColor Yellow

# Simulation du mapping côté frontend
$mappedData = @()
foreach ($record in $testData) {
    # Fonction helper pour obtenir la valeur avec fallback
    function Get-ValueWithFallback($record, $keys) {
        foreach ($key in $keys) {
            if ($record.ContainsKey($key) -and $record[$key] -ne $null) {
                return $record[$key]
            }
        }
        return $null
    }
    
    $idTransaction = Get-ValueWithFallback $record @("IDTransaction", "id_transaction", "idTransaction", "ID_TRANSACTION", "transaction_id", "TransactionId")
    $telephoneClient = Get-ValueWithFallback $record @("téléphone client", "telephone_client", "telephoneClient", "TELEPHONE_CLIENT", "phone", "Phone")
    $montant = Get-ValueWithFallback $record @("montant", "Montant", "MONTANT", "amount", "Amount", "volume", "Volume")
    $service = Get-ValueWithFallback $record @("Service", "service", "SERVICE")
    $agence = Get-ValueWithFallback $record @("Agence", "agence", "AGENCE", "agency", "Agency")
    $dateTransaction = Get-ValueWithFallback $record @("Date", "date_transaction", "dateTransaction", "DATE_TRANSACTION", "date")
    $numeroTransGu = Get-ValueWithFallback $record @("Numéro Trans GU", "numero_trans_gu", "numeroTransGu", "NUMERO_TRANS_GU", "numero", "Numero")
    $pays = Get-ValueWithFallback $record @("PAYS", "pays", "Pays", "country", "Country")
    
    $mappedRecord = @{
        id = 0
        idTransaction = if ($idTransaction) { $idTransaction } else { "N/A" }
        telephoneClient = if ($telephoneClient) { $telephoneClient } else { "" }
        montant = if ($montant) { [double]$montant } else { 0 }
        service = if ($service) { $service } else { "N/A" }
        agence = if ($agence) { $agence } else { "N/A" }
        dateTransaction = if ($dateTransaction) { 
            # Convertir le format de date "2025-07-25 20:58:15.0" en format ISO
            $dateStr = $dateTransaction -replace "\.0$", ""  # Enlever le .0 à la fin
            $dateStr = $dateStr -replace " ", "T"  # Remplacer l'espace par T
            $dateStr
        } else { 
            (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss") 
        }
        numeroTransGu = if ($numeroTransGu) { $numeroTransGu } else { "" }
        pays = if ($pays) { $pays } else { "" }
        dateImport = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
        statut = "EN_ATTENTE"
        commentaire = "Importé depuis ECART BO"
    }
    $mappedData += $mappedRecord
}

Write-Host "`nDonnées mappées:" -ForegroundColor Yellow
$mappedData | ConvertTo-Json -Depth 10

Write-Host "`n2. Test de l'endpoint batch avec données mappées..." -ForegroundColor Yellow

try {
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    # Convertir en JSON en s'assurant que c'est un tableau
    $jsonData = "[$($mappedData | ConvertTo-Json -Depth 10)]"
    
    Write-Host "Envoi de la requête POST vers $apiUrl/batch..." -ForegroundColor Cyan
    
    $response = Invoke-RestMethod -Uri "$apiUrl/batch" -Method POST -Body $jsonData -Headers $headers
    
    Write-Host "✅ Endpoint batch fonctionnel avec données mappées!" -ForegroundColor Green
    Write-Host "   Message: $($response.message)" -ForegroundColor Cyan
    Write-Host "   Nombre d'enregistrements créés: $($response.count)" -ForegroundColor Cyan
    
    # Afficher les données créées
    if ($response.data) {
        Write-Host "`nDonnées créées en base:" -ForegroundColor Yellow
        $response.data | ConvertTo-Json -Depth 10
    }
    
} catch {
    Write-Host "❌ Erreur lors du test de l'endpoint batch: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $errorBody = $reader.ReadToEnd()
        Write-Host "   Détails de l'erreur: $errorBody" -ForegroundColor Red
    }
}

Write-Host "`n=== Test terminé ===" -ForegroundColor Green 