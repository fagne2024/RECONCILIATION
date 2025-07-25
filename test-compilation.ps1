# Test de compilation Angular
Write-Host "Test de compilation Angular..." -ForegroundColor Green

# Vérifier les fichiers des nouveaux composants
Write-Host "`n1. Vérification des fichiers des composants..." -ForegroundColor Yellow

$modulesFiles = @(
    "reconciliation-app/frontend/src/app/components/modules/modules.component.ts",
    "reconciliation-app/frontend/src/app/components/modules/modules.component.html",
    "reconciliation-app/frontend/src/app/components/modules/modules.component.scss"
)

$permissionsFiles = @(
    "reconciliation-app/frontend/src/app/components/permissions/permissions.component.ts",
    "reconciliation-app/frontend/src/app/components/permissions/permissions.component.html",
    "reconciliation-app/frontend/src/app/components/permissions/permissions.component.scss"
)

Write-Host "`nFichiers Modules:" -ForegroundColor Cyan
foreach ($file in $modulesFiles) {
    if (Test-Path $file) {
        Write-Host "✅ $file" -ForegroundColor Green
    } else {
        Write-Host "❌ $file" -ForegroundColor Red
    }
}

Write-Host "`nFichiers Permissions:" -ForegroundColor Cyan
foreach ($file in $permissionsFiles) {
    if (Test-Path $file) {
        Write-Host "✅ $file" -ForegroundColor Green
    } else {
        Write-Host "❌ $file" -ForegroundColor Red
    }
}

# Vérifier les services
Write-Host "`n2. Vérification des services..." -ForegroundColor Yellow
$services = @(
    "reconciliation-app/frontend/src/app/services/module.service.ts",
    "reconciliation-app/frontend/src/app/services/permission.service.ts"
)

foreach ($service in $services) {
    if (Test-Path $service) {
        Write-Host "✅ $service" -ForegroundColor Green
    } else {
        Write-Host "❌ $service" -ForegroundColor Red
    }
}

# Vérifier les modèles
Write-Host "`n3. Vérification des modèles..." -ForegroundColor Yellow
$models = @(
    "reconciliation-app/frontend/src/app/models/module.model.ts",
    "reconciliation-app/frontend/src/app/models/permission.model.ts"
)

foreach ($model in $models) {
    if (Test-Path $model) {
        Write-Host "✅ $model" -ForegroundColor Green
    } else {
        Write-Host "❌ $model" -ForegroundColor Red
    }
}

# Vérifier les routes
Write-Host "`n4. Vérification des routes..." -ForegroundColor Yellow
$routingFile = "reconciliation-app/frontend/src/app/app-routing.module.ts"
if (Test-Path $routingFile) {
    $content = Get-Content $routingFile -Raw
    if ($content -match "/modules" -and $content -match "/permissions") {
        Write-Host "✅ Routes /modules et /permissions trouvées" -ForegroundColor Green
    } else {
        Write-Host "❌ Routes manquantes dans $routingFile" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Fichier de routing non trouvé" -ForegroundColor Red
}

Write-Host "`n🎉 Vérification terminée!" -ForegroundColor Green
Write-Host "Si tous les fichiers sont ✅, la compilation devrait fonctionner" -ForegroundColor Yellow 