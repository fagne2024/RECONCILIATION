# Création de données de test avec correspondances parfaites TRXBO/OPPART
Write-Host "🧪 Création de données de test avec correspondances parfaites" -ForegroundColor Yellow
Write-Host "=========================================================" -ForegroundColor Yellow

# Configuration
$testDataDir = "test-data"
$trxboFileName = "TRXBO_TEST.xls"
$oppartFileName = "OPPART_TEST.xls"

# Créer le répertoire de test si nécessaire
if (-not (Test-Path $testDataDir)) {
    New-Item -ItemType Directory -Path $testDataDir -Force
    Write-Host "📁 Répertoire de test créé: $testDataDir" -ForegroundColor Green
}

# Étape 1: Créer les données TRXBO
Write-Host "`n📋 Étape 1: Création des données TRXBO" -ForegroundColor Cyan

$trxboData = @()
$oppartData = @()

# Créer 10 enregistrements TRXBO avec des correspondances parfaites
for ($i = 1; $i -le 10; $i++) {
    $transactionId = "TEST_TRX_$($i.ToString('000'))"
    $numeroTransGU = "GU$($i.ToString('000000'))"
    
    # Enregistrement TRXBO
    $trxboRecord = @{
        "ID" = $i
        "IDTransaction" = $transactionId
        "téléphone client" = "2376$($i.ToString('00000000'))"
        "montant" = (1000 + $i * 100).ToString()
        "Service" = "PAIEMENT"
        "Moyen de Paiement" = "MOBILE MONEY"
        "Agence" = "Agence Test"
        "Agent" = "Agent Test"
        "Type agent" = "AGENT"
        "PIXI" = "PIXI$($i.ToString('000'))"
        "Date" = "2024-01-0$i"
        "Numéro Trans GU" = $numeroTransGU
        "GRX" = "GRX$($i.ToString('000'))"
        "Statut" = "SUCCESS"
        "Latitude" = "3.848$($i.ToString('000'))"
        "Longitude" = "11.502$($i.ToString('000'))"
        "ID Partenaire DIST" = "PART$($i.ToString('000'))"
        "Expéditeur" = "Sender$i"
        "Pays provenance" = "Cameroun"
        "Bénéficiaire" = "Receiver$i"
        "Canal de distribution" = "USSD"
    }
    $trxboData += $trxboRecord
    
    # Créer 2 enregistrements OPPART correspondants pour chaque TRXBO
    for ($j = 1; $j -le 2; $j++) {
        $oppartRecord = @{
            "ID Opération" = ($i * 10 + $j).ToString()
            "Type Opération" = "IMPACT"
            "Montant" = ((500 + $i * 50) + ($j * 25)).ToString()
            "Solde avant" = (10000 + $i * 1000).ToString()
            "Solde aprés" = (10000 + $i * 1000 + (500 + $i * 50) + ($j * 25)).ToString()
            "Code proprietaire" = "PROP$($i.ToString('000'))"
            "Téléphone" = "2376$($i.ToString('00000000'))"
            "Statut" = "SUCCESS"
            "ID Transaction" = $transactionId
            "Num bordereau" = "BORD$($i.ToString('000'))"
            "Date opération" = "2024-01-0$i"
            "Date de versement" = "2024-01-0$i"
            "Banque appro" = "Banque Test"
            "Login demandeur Appro" = "Demandeur$i"
            "Login valideur Appro" = "Valideur$i"
            "Motif rejet" = ""
            "Frais connexion" = "0"
            "Numéro Trans GU" = $numeroTransGU
            "Agent" = "Agent Test"
            "Motif régularisation" = ""
            "groupe de réseau" = "Réseau Test"
        }
        $oppartData += $oppartRecord
    }
}

Write-Host "✅ $($trxboData.Count) enregistrements TRXBO créés" -ForegroundColor Green
Write-Host "✅ $($oppartData.Count) enregistrements OPPART créés" -ForegroundColor Green

# Étape 2: Sauvegarder les données TRXBO
Write-Host "`n📋 Étape 2: Sauvegarde des données TRXBO" -ForegroundColor Cyan

$trxboPath = Join-Path $testDataDir $trxboFileName
$trxboData | Export-Csv -Path $trxboPath -NoTypeInformation -Delimiter "`t" -Encoding UTF8
Write-Host "✅ Fichier TRXBO sauvegardé: $trxboPath" -ForegroundColor Green

# Étape 3: Sauvegarder les données OPPART
Write-Host "`n📋 Étape 3: Sauvegarde des données OPPART" -ForegroundColor Cyan

$oppartPath = Join-Path $testDataDir $oppartFileName
$oppartData | Export-Csv -Path $oppartPath -NoTypeInformation -Delimiter "`t" -Encoding UTF8
Write-Host "✅ Fichier OPPART sauvegardé: $oppartPath" -ForegroundColor Green

# Étape 4: Vérifier les correspondances
Write-Host "`n📋 Étape 4: Vérification des correspondances" -ForegroundColor Cyan

Write-Host "📊 Analyse des correspondances:" -ForegroundColor Yellow
Write-Host "   - TRXBO: $($trxboData.Count) enregistrements" -ForegroundColor Gray
Write-Host "   - OPPART: $($oppartData.Count) enregistrements" -ForegroundColor Gray
Write-Host "   - Ratio attendu: 1:2" -ForegroundColor Gray

# Vérifier que chaque TRXBO a exactement 2 OPPART
$correspondancesParfaites = 0
$correspondancesIncorrectes = 0

foreach ($trxbo in $trxboData) {
    $numeroTransGU = $trxbo."Numéro Trans GU"
    $oppartCorrespondants = $oppartData | Where-Object { $_."Numéro Trans GU" -eq $numeroTransGU }
    
    if ($oppartCorrespondants.Count -eq 2) {
        $correspondancesParfaites++
        Write-Host "   ✅ TRXBO $numeroTransGU: 2 correspondances OPPART" -ForegroundColor Green
    } else {
        $correspondancesIncorrectes++
        Write-Host "   ❌ TRXBO $numeroTransGU: $($oppartCorrespondants.Count) correspondances OPPART" -ForegroundColor Red
    }
}

Write-Host "`n📊 Résumé des correspondances:" -ForegroundColor Yellow
Write-Host "   - Correspondances parfaites: $correspondancesParfaites" -ForegroundColor Green
Write-Host "   - Correspondances incorrectes: $correspondancesIncorrectes" -ForegroundColor Red

# Étape 5: Instructions pour l'utilisation
Write-Host "`n📋 Étape 5: Instructions pour l'utilisation" -ForegroundColor Cyan

Write-Host "🎯 Pour tester les correspondances parfaites:" -ForegroundColor Yellow
Write-Host "   1. Copier les fichiers de test dans le répertoire de surveillance" -ForegroundColor Gray
Write-Host "   2. Lancer une réconciliation TRXBO/OPPART" -ForegroundColor Gray
Write-Host "   3. Vérifier que vous obtenez $correspondancesParfaites correspondances parfaites" -ForegroundColor Gray

Write-Host "`n📁 Fichiers créés:" -ForegroundColor Yellow
Write-Host "   - $trxboPath" -ForegroundColor Gray
Write-Host "   - $oppartPath" -ForegroundColor Gray

Write-Host "`n✅ Création des données de test terminée!" -ForegroundColor Green
