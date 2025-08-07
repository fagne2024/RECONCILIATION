# Script de diagnostic détaillé pour TRX SF
Write-Host "=== Diagnostic détaillé TRX SF ===" -ForegroundColor Green

$baseUrl = "http://localhost:8080/api/trx-sf"

# 1. Vérifier si le backend répond
Write-Host "`n1. Vérification de la connectivité backend..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri $baseUrl -Method GET
    Write-Host "✅ Backend accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend non accessible: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Redémarrez le backend avec: cd reconciliation-app/backend && ./mvnw spring-boot:run" -ForegroundColor Yellow
    exit
}

# 2. Créer un fichier CSV très simple pour test
Write-Host "`n2. Création d'un fichier CSV très simple..." -ForegroundColor Yellow
$simpleCsvContent = @"
ID Transaction;Téléphone Client;Montant;Service;Agence;Date Transaction;Numéro Trans GU;Pays;Frais;Commentaire
TRX_SF_MINIMAL;+22112345678;1000;TRANSFERT;AGENCE_A;2024-01-15 10:30:00;GU_12345678;SENEGAL;100;Test minimal
"@

$simpleCsvContent | Out-File -FilePath "test-minimal.csv" -Encoding UTF8
Write-Host "✅ Fichier test-minimal.csv créé" -ForegroundColor Green

# 3. Test de validation avec fichier minimal
Write-Host "`n3. Test de validation avec fichier minimal..." -ForegroundColor Yellow
$csvFile = "test-minimal.csv"

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
        
        if ($response.errors) {
            Write-Host "   - Erreurs:" -ForegroundColor Red
            foreach ($error in $response.errors) {
                Write-Host "     * $error" -ForegroundColor Red
            }
        }
    } catch {
        Write-Host "❌ Erreur lors de la validation: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Fichier CSV non trouvé: $csvFile" -ForegroundColor Red
}

# 4. Test de création directe d'une transaction
Write-Host "`n4. Test de création directe d'une transaction..." -ForegroundColor Yellow
$createData = @{
    idTransaction = "TRX_SF_DIRECT_001"
    telephoneClient = "+22112345678"
    montant = 1000.0
    service = "TRANSFERT"
    agence = "AGENCE_A"
    dateTransaction = "2024-01-15T10:30:00"
    numeroTransGu = "GU_12345678"
    pays = "SENEGAL"
    frais = 100.0
    commentaire = "Test direct"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $baseUrl -Method POST -Body $createData -ContentType "application/json"
    Write-Host "✅ Transaction créée avec succès" -ForegroundColor Green
    Write-Host "ID: $($response.id)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erreur lors de la création: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Vérifier le contenu du fichier CSV
Write-Host "`n5. Vérification du contenu du fichier CSV..." -ForegroundColor Yellow
if (Test-Path $csvFile) {
    $content = Get-Content $csvFile -Raw
    Write-Host "Contenu du fichier CSV:" -ForegroundColor Cyan
    Write-Host $content -ForegroundColor White
    
    # Analyser les colonnes
    $lines = Get-Content $csvFile
    if ($lines.Count -gt 0) {
        $headers = $lines[0].Split(';')
        Write-Host "`nNombre de colonnes dans l'en-tête: $($headers.Count)" -ForegroundColor Cyan
        Write-Host "Colonnes: $($headers -join ', ')" -ForegroundColor Cyan
    }
    
    if ($lines.Count -gt 1) {
        $dataLine = $lines[1].Split(';')
        Write-Host "Nombre de colonnes dans les données: $($dataLine.Count)" -ForegroundColor Cyan
        Write-Host "Données: $($dataLine -join ', ')" -ForegroundColor Cyan
    }
}

# 6. Test avec différents formats de nombres
Write-Host "`n6. Test avec différents formats de nombres..." -ForegroundColor Yellow
$testFormats = @(
    @{
        name = "Nombres entiers"
        content = @"
ID Transaction;Téléphone Client;Montant;Service;Agence;Date Transaction;Numéro Trans GU;Pays;Frais;Commentaire
TRX_SF_INT;+22112345678;1000;TRANSFERT;AGENCE_A;2024-01-15 10:30:00;GU_12345678;SENEGAL;100;Test entier
"@
    },
    @{
        name = "Nombres décimaux avec points"
        content = @"
ID Transaction;Téléphone Client;Montant;Service;Agence;Date Transaction;Numéro Trans GU;Pays;Frais;Commentaire
TRX_SF_DEC;+22112345678;1000.50;TRANSFERT;AGENCE_A;2024-01-15 10:30:00;GU_12345678;SENEGAL;100.25;Test décimal
"@
    },
    @{
        name = "Nombres décimaux avec virgules"
        content = @"
ID Transaction;Téléphone Client;Montant;Service;Agence;Date Transaction;Numéro Trans GU;Pays;Frais;Commentaire
TRX_SF_VIRG;+22112345678;1000,50;TRANSFERT;AGENCE_A;2024-01-15 10:30:00;GU_12345678;SENEGAL;100,25;Test virgule
"@
    }
)

foreach ($format in $testFormats) {
    Write-Host "`nTest: $($format.name)" -ForegroundColor Yellow
    $format.content | Out-File -FilePath "test-$($format.name.ToLower().Replace(' ', '-')).csv" -Encoding UTF8
    
    try {
        $form = @{
            file = Get-Item "test-$($format.name.ToLower().Replace(' ', '-')).csv"
        }
        $response = Invoke-RestMethod -Uri "$baseUrl/validate" -Method POST -Form $form
        Write-Host "   - Lignes valides: $($response.validLines)" -ForegroundColor Cyan
        Write-Host "   - Lignes avec erreurs: $($response.errorLines)" -ForegroundColor Cyan
        
        if ($response.errors) {
            Write-Host "   - Erreurs:" -ForegroundColor Red
            foreach ($error in $response.errors) {
                Write-Host "     * $error" -ForegroundColor Red
            }
        }
    } catch {
        Write-Host "   ❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n=== Diagnostic détaillé terminé ===" -ForegroundColor Green
Write-Host "📋 Vérifiez les logs du backend pour plus de détails" -ForegroundColor Yellow
