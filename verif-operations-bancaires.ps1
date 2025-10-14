# Script simplifié de vérification des opérations bancaires

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  VERIFICATION RAPIDE" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Fichiers backend modifiés
Write-Host "1. Fichiers backend..." -ForegroundColor Yellow
$backendFiles = @(
    "reconciliation-app/backend/src/main/java/com/reconciliation/service/OperationService.java",
    "reconciliation-app/backend/src/main/java/com/reconciliation/controller/OperationBancaireController.java",
    "reconciliation-app/backend/src/main/java/com/reconciliation/service/OperationBancaireService.java"
)

foreach ($file in $backendFiles) {
    if (Test-Path $file) {
        Write-Host "   ✅ $(Split-Path $file -Leaf)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $(Split-Path $file -Leaf)" -ForegroundColor Red
    }
}

# Test 2: Fichiers frontend modifiés
Write-Host ""
Write-Host "2. Fichiers frontend..." -ForegroundColor Yellow
$frontendFiles = @(
    "reconciliation-app/frontend/src/app/components/banque/banque.component.ts",
    "reconciliation-app/frontend/src/app/components/banque/banque.component.html",
    "reconciliation-app/frontend/src/app/components/banque/banque.component.scss",
    "reconciliation-app/frontend/src/app/services/operation-bancaire.service.ts",
    "reconciliation-app/frontend/src/app/models/operation-bancaire.model.ts"
)

foreach ($file in $frontendFiles) {
    if (Test-Path $file) {
        Write-Host "   ✅ $(Split-Path $file -Leaf)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $(Split-Path $file -Leaf)" -ForegroundColor Red
    }
}

# Test 3: Vérifier si le backend répond
Write-Host ""
Write-Host "3. Backend API..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/operations-bancaires" -Method GET -TimeoutSec 2 -ErrorAction Stop
    $operations = $response.Content | ConvertFrom-Json
    Write-Host "   ✅ Backend répond" -ForegroundColor Green
    Write-Host "   📊 $($operations.Count) opérations bancaires" -ForegroundColor Cyan
}
catch {
    Write-Host "   ❌ Backend ne répond pas" -ForegroundColor Red
    Write-Host "   💡 Lancez: cd reconciliation-app/backend" -ForegroundColor Yellow
    Write-Host "      Puis: mvn spring-boot:run" -ForegroundColor Yellow
}

# Résumé
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  PROCHAINES ETAPES" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Si backend ne repond pas: le demarrer" -ForegroundColor White
Write-Host "2. Actualiser le frontend (Ctrl+F5)" -ForegroundColor White
Write-Host "3. Creer une operation (Type: Compense/Appro/nivellement)" -ForegroundColor White
Write-Host "4. Aller dans BANQUE > Operations" -ForegroundColor White
Write-Host "5. Tester les boutons d``'actions (Details, Modifier, Supprimer)" -ForegroundColor White
Write-Host ""
Write-Host "Documentation complete: GUIDE_OPERATIONS_BANCAIRES_COMPLETE.md" -ForegroundColor Cyan
Write-Host ""

