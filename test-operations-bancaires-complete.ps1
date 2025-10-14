# Script de diagnostic complet pour les opérations bancaires
# Vérifie la base de données, le backend et les fichiers modifiés

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DIAGNOSTIC OPERATIONS BANCAIRES" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$dbName = "reconciliation_db"
$dbUser = "root"
$dbPassword = "Passw0rd!"

# Test 1: Vérifier que la table existe
Write-Host "1️⃣  Vérification de la table operation_bancaire..." -ForegroundColor Yellow
$checkTableQuery = "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema='$dbName' AND table_name='operation_bancaire';"
try {
    $result = & $mysqlPath -u $dbUser -p$dbPassword -e $checkTableQuery 2>&1 | Select-String "count"
    if ($result -match "1") {
        Write-Host "   ✅ Table operation_bancaire existe" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Table operation_bancaire n'existe pas" -ForegroundColor Red
        Write-Host "   💡 Exécutez create-operation-bancaire-table.ps1" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ Erreur de connexion à la base de données" -ForegroundColor Red
}

# Test 2: Vérifier les données dans la table
Write-Host ""
Write-Host "2️⃣  Vérification des données..." -ForegroundColor Yellow
$countQuery = "SELECT COUNT(*) as total FROM $dbName.operation_bancaire;"
try {
    $countResult = & $mysqlPath -u $dbUser -p$dbPassword -e $countQuery 2>&1 | Select-String "total"
    if ($countResult) {
        Write-Host "   ✅ Table accessible" -ForegroundColor Green
        Write-Host "   $countResult" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ⚠️ Impossible de compter les enregistrements" -ForegroundColor Yellow
}

# Test 3: Afficher les 3 dernières opérations bancaires
Write-Host ""
Write-Host "3️⃣  Dernières opérations bancaires..." -ForegroundColor Yellow
$lastOpsQuery = "SELECT id, pays, type_operation, montant, statut, DATE_FORMAT(date_operation, '%d/%m/%Y') as date_op FROM $dbName.operation_bancaire ORDER BY date_operation DESC LIMIT 3;"
try {
    $lastOps = & $mysqlPath -u $dbUser -p$dbPassword -e $lastOpsQuery 2>&1
    Write-Host $lastOps -ForegroundColor Gray
} catch {
    Write-Host "   ⚠️ Aucune opération bancaire trouvée" -ForegroundColor Yellow
}

# Test 4: Vérifier les comptes disponibles avec leur code propriétaire
Write-Host ""
Write-Host "4️⃣  Comptes disponibles (pour test)..." -ForegroundColor Yellow
$comptesQuery = "SELECT numero_compte, code_proprietaire, categorie FROM $dbName.compte WHERE categorie='Banque' AND code_proprietaire IS NOT NULL LIMIT 5;"
try {
    $comptes = & $mysqlPath -u $dbUser -p$dbPassword -e $comptesQuery 2>&1
    Write-Host $comptes -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   💡 Utilisez un de ces codes propriétaires pour tester" -ForegroundColor Yellow
    Write-Host "      dans le champ BANQUE lors de la création d'opération" -ForegroundColor Gray
} catch {
    Write-Host "   ⚠️ Impossible de récupérer les comptes" -ForegroundColor Yellow
}

# Test 5: Vérifier les fichiers modifiés
Write-Host ""
Write-Host "5️⃣  Vérification des fichiers modifiés..." -ForegroundColor Yellow

$filesToCheck = @(
    "reconciliation-app/backend/src/main/java/com/reconciliation/service/OperationService.java",
    "reconciliation-app/backend/src/main/java/com/reconciliation/controller/OperationBancaireController.java",
    "reconciliation-app/frontend/src/app/components/banque/banque.component.ts",
    "reconciliation-app/frontend/src/app/components/banque/banque.component.html",
    "reconciliation-app/frontend/src/app/components/banque/banque.component.scss"
)

foreach ($file in $filesToCheck) {
    if (Test-Path $file) {
        $lastWrite = (Get-Item $file).LastWriteTime
        Write-Host "   ✅ $file" -ForegroundColor Green
        Write-Host "      Modifié: $lastWrite" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ $file (manquant)" -ForegroundColor Red
    }
}

# Test 6: Vérifier si le backend est lancé
Write-Host ""
Write-Host "6️⃣  Vérification du backend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/operations-bancaires" -Method GET -TimeoutSec 3 -ErrorAction Stop
    Write-Host "   ✅ Backend répond sur le port 8080" -ForegroundColor Green
    $operations = $response.Content | ConvertFrom-Json
    Write-Host "   📊 Nombre d'opérations bancaires: $($operations.Count)" -ForegroundColor Cyan
} catch {
    Write-Host "   ❌ Backend ne répond pas" -ForegroundColor Red
    Write-Host "   💡 Lancez le backend: cd reconciliation-app/backend puis mvn spring-boot:run" -ForegroundColor Yellow
}

# Résumé et recommandations
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RÉSUMÉ - PROCHAINES ÉTAPES" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 POUR TESTER LA FONCTIONNALITÉ:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Assurez-vous que le backend est démarré" -ForegroundColor White
Write-Host "   cd reconciliation-app/backend" -ForegroundColor Gray
Write-Host "   mvn spring-boot:run" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Actualisez le frontend (Ctrl+F5)" -ForegroundColor White
Write-Host ""
Write-Host "3. Créez une opération avec:" -ForegroundColor White
Write-Host "   - Type: Compense_client / Appro_client / nivellement" -ForegroundColor Gray
Write-Host "   - BANQUE: Un code propriétaire de la liste ci-dessus" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Allez dans BANQUE > Opérations" -ForegroundColor White
Write-Host "   - Vérifiez que la ligne est créée" -ForegroundColor Gray
Write-Host "   - Le champ Compte doit être rempli automatiquement" -ForegroundColor Gray
Write-Host "   - Testez les boutons: 👁️ Détails, ✏️ Modifier, 🗑️ Supprimer" -ForegroundColor Gray
Write-Host ""
Write-Host "✨ Tout est prêt pour les tests !" -ForegroundColor Green
Write-Host ""

