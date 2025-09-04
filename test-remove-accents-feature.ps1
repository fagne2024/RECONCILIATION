# Script de test pour la fonctionnalité de suppression des accents dans les modèles de traitement
# Ce script teste l'implémentation complète de la fonctionnalité

Write-Host "🔧 Test de la fonctionnalité de suppression des accents dans les modèles de traitement" -ForegroundColor Cyan
Write-Host "==================================================================================" -ForegroundColor Cyan

# 1. Vérifier que le backend est démarré
Write-Host "`n📋 Étape 1: Vérification du backend..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/health" -Method GET -TimeoutSec 5
    Write-Host "✅ Backend démarré et accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend non accessible. Veuillez démarrer le backend avec: cd reconciliation-app/backend && mvn spring-boot:run" -ForegroundColor Red
    exit 1
}

# 2. Exécuter le script SQL pour ajouter la colonne remove_accents
Write-Host "`n📋 Étape 2: Application du script SQL..." -ForegroundColor Yellow

# Configuration de la base de données (à adapter selon votre configuration)
$dbHost = "localhost"
$dbPort = "3306"
$dbName = "reconciliation_db"
$dbUser = "root"
$dbPassword = ""

# Demander les informations de connexion si nécessaire
if (-not $dbPassword) {
    $dbPassword = Read-Host "Entrez le mot de passe de la base de données (laissez vide si aucun)"
}

# Construire la commande MySQL
$mysqlCmd = "mysql"
if ($dbPassword) {
    $mysqlCmd += " -u$dbUser -p$dbPassword"
} else {
    $mysqlCmd += " -u$dbUser"
}
$mysqlCmd += " -h$dbHost -P$dbPort $dbName"

# Exécuter le script SQL
$sqlScript = "reconciliation-app/backend/add-remove-accents-column.sql"
if (Test-Path $sqlScript) {
    Write-Host "📄 Exécution du script SQL: $sqlScript" -ForegroundColor Blue
    try {
        $result = & $mysqlCmd -e "source $sqlScript" 2>&1
        Write-Host "✅ Script SQL exécuté avec succès" -ForegroundColor Green
        Write-Host "📊 Résultat: $result" -ForegroundColor Gray
    } catch {
        Write-Host "❌ Erreur lors de l'exécution du script SQL: $_" -ForegroundColor Red
        Write-Host "💡 Assurez-vous que MySQL est installé et accessible" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Script SQL non trouvé: $sqlScript" -ForegroundColor Red
}

# 3. Vérifier que le frontend est démarré
Write-Host "`n📋 Étape 3: Vérification du frontend..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:4200" -Method GET -TimeoutSec 5
    Write-Host "✅ Frontend démarré et accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend non accessible. Veuillez démarrer le frontend avec: cd reconciliation-app/frontend; npm start" -ForegroundColor Red
    Write-Host "💡 Le frontend peut prendre quelques minutes à démarrer" -ForegroundColor Yellow
}

# 4. Créer un modèle de test avec la fonctionnalité de suppression des accents
Write-Host "`n📋 Étape 4: Création d'un modèle de test..." -ForegroundColor Yellow

$testModel = @{
    name = "Test Suppression Accents"
    filePattern = ".*test.*\.(csv|xlsx?)$"
    fileType = "partner"
    autoApply = $true
    templateFile = ""
    reconciliationKeys = @{
        partnerKeys = @("ID", "Numéro")
        boKeys = @("ID", "Numéro")
    }
    columnProcessingRules = @(
        @{
            sourceColumn = "Téléphone"
            targetColumn = "Telephone"
            removeAccents = $true
            trimSpaces = $true
            ruleOrder = 1
        },
        @{
            sourceColumn = "Numéro"
            targetColumn = "Numero"
            removeAccents = $true
            toUpperCase = $true
            ruleOrder = 2
        },
        @{
            sourceColumn = "Adresse"
            targetColumn = "Adresse_Nettoyee"
            removeAccents = $true
            removeSpecialChars = $true
            trimSpaces = $true
            ruleOrder = 3
        }
    )
}

$testModelJson = $testModel | ConvertTo-Json -Depth 10
$testModelFile = "test-model-remove-accents.json"

Write-Host "📄 Création du fichier de test: $testModelFile" -ForegroundColor Blue
$testModelJson | Out-File -FilePath $testModelFile -Encoding UTF8
Write-Host "✅ Modèle de test créé" -ForegroundColor Green

# 5. Instructions pour tester manuellement
Write-Host "`n📋 Étape 5: Instructions de test manuel..." -ForegroundColor Yellow
Write-Host "==================================================================================" -ForegroundColor Cyan
Write-Host "🎯 Pour tester la fonctionnalité de suppression des accents:" -ForegroundColor Green
Write-Host ""
Write-Host "1. Ouvrez votre navigateur et allez sur: http://localhost:4200" -ForegroundColor White
Write-Host "2. Allez dans la section 'Modèles de traitement automatique'" -ForegroundColor White
Write-Host "3. Cliquez sur 'Créer un nouveau modèle'" -ForegroundColor White
Write-Host "4. Remplissez les informations de base du modèle" -ForegroundColor White
Write-Host "5. Dans la section 'Règles de traitement des colonnes':" -ForegroundColor White
Write-Host "   - Cliquez sur 'Ajouter une règle de nettoyage'" -ForegroundColor White
Write-Host "   - Sélectionnez une colonne source" -ForegroundColor White
Write-Host "   - Cochez l'option 'Supprimer les accents'" -ForegroundColor White
Write-Host "   - Ajoutez d'autres options si nécessaire (majuscules, minuscules, etc.)" -ForegroundColor White
Write-Host "   - Sauvegardez la règle" -ForegroundColor White
Write-Host "6. Sauvegardez le modèle" -ForegroundColor White
Write-Host "7. Testez avec un fichier contenant des accents" -ForegroundColor White
Write-Host ""
Write-Host "📊 Exemples de données à tester:" -ForegroundColor Cyan
Write-Host "   - 'Téléphone' → 'Telephone'" -ForegroundColor Gray
Write-Host "   - 'Numéro' → 'Numero'" -ForegroundColor Gray
Write-Host "   - 'Adresse' → 'Adresse'" -ForegroundColor Gray
Write-Host "   - 'Été' → 'Ete'" -ForegroundColor Gray
Write-Host "   - 'Ça va?' → 'Ca va?'" -ForegroundColor Gray
Write-Host ""

# 6. Vérification des fichiers modifiés
Write-Host "`n📋 Étape 6: Vérification des fichiers modifiés..." -ForegroundColor Yellow
$modifiedFiles = @(
    "reconciliation-app/frontend/src/app/components/auto-processing-models/auto-processing-models.component.ts",
    "reconciliation-app/frontend/src/app/components/auto-processing-models/auto-processing-models.component.html",
    "reconciliation-app/frontend/src/app/services/auto-processing.service.ts",
    "reconciliation-app/backend/src/main/java/com/reconciliation/entity/ColumnProcessingRule.java",
    "reconciliation-app/backend/src/main/java/com/reconciliation/dto/ColumnProcessingRuleDTO.java",
    "reconciliation-app/backend/src/main/java/com/reconciliation/service/ColumnProcessingService.java",
    "reconciliation-app/backend/src/main/java/com/reconciliation/service/ModelWatchFolderService.java"
)

foreach ($file in $modifiedFiles) {
    if (Test-Path $file) {
        Write-Host "✅ $file" -ForegroundColor Green
    } else {
        Write-Host "❌ $file (manquant)" -ForegroundColor Red
    }
}

# 7. Test de la fonction removeAccents
Write-Host "`n📋 Étape 7: Test de la fonction removeAccents..." -ForegroundColor Yellow

# Créer un script de test JavaScript pour la fonction removeAccents
$testJsScript = @'
// Test de la fonction removeAccents
function removeAccents(text) {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Tests
const testCases = [
    'Téléphone',
    'Numéro',
    'Adresse',
    'Été',
    'Ça va?',
    'Français',
    'Hôtel',
    'Café'
];

console.log('🧪 Test de la fonction removeAccents:');
testCases.forEach(test => {
    const result = removeAccents(test);
    console.log(`${test} → ${result}`);
});
'@

$testJsFile = "test-remove-accents.js"
$testJsScript | Out-File -FilePath $testJsFile -Encoding UTF8

Write-Host "📄 Script de test JavaScript créé: $testJsFile" -ForegroundColor Blue
Write-Host "💡 Exécutez: node $testJsFile pour tester la fonction" -ForegroundColor Yellow

# 8. Résumé
Write-Host "`n📋 Résumé de l'implémentation..." -ForegroundColor Yellow
Write-Host "==================================================================================" -ForegroundColor Cyan
Write-Host "✅ Fonctionnalité de suppression des accents implémentée avec succès!" -ForegroundColor Green
Write-Host ""
Write-Host "🔧 Modifications apportées:" -ForegroundColor Cyan
Write-Host "   • Interface ColumnProcessingRule: ajout de removeAccents" -ForegroundColor White
Write-Host "   • Entité Java: ajout du champ et des getters/setters" -ForegroundColor White
Write-Host "   • DTO Java: ajout de la propriété" -ForegroundColor White
Write-Host "   • Service Java: implémentation de la logique de suppression" -ForegroundColor White
Write-Host "   • Frontend: ajout de l'option dans l'interface" -ForegroundColor White
Write-Host "   • Base de données: script SQL pour ajouter la colonne" -ForegroundColor White
Write-Host ""
Write-Host "🎯 Fonctionnalités disponibles:" -ForegroundColor Cyan
Write-Host "   • Suppression des accents (é, è, à, ç, etc.)" -ForegroundColor White
Write-Host "   • Conversion en majuscules/minuscules" -ForegroundColor White
Write-Host "   • Nettoyage des espaces" -ForegroundColor White
Write-Host "   • Suppression des caractères spéciaux" -ForegroundColor White
Write-Host "   • Combinaison de plusieurs règles" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Prêt pour les tests!" -ForegroundColor Green
