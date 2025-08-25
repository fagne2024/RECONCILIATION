# Script de lancement optimise pour les decorateurs
Write-Host "🚀 Lancement optimise pour les decorateurs..." -ForegroundColor Cyan

# Variables d'environnement pour les decorateurs
$env:TS_NODE_PROJECT = "tsconfig.decorators.json"
$env:SKIP_LIB_CHECK = "true"
$env:NO_IMPLICIT_ANY = "false"
$env:STRICT = "false"
$env:NO_EMIT_ON_ERROR = "false"
$env:ALLOW_JS = "true"
$env:CHECK_JS = "false"
$env:ANGULAR_DISABLE_STRICT_TEMPLATES = "true"
$env:ANGULAR_DISABLE_STRICT_INJECTION_PARAMETERS = "true"
$env:ANGULAR_DISABLE_STRICT_INPUT_ACCESS_MODIFIERS = "true"

# Nettoyage rapide
Write-Host "🧹 Nettoyage rapide..." -ForegroundColor Yellow
if (Test-Path "node_modules/.cache") { Remove-Item -Recurse -Force "node_modules/.cache" }
if (Test-Path ".angular") { Remove-Item -Recurse -Force ".angular" }

# Lancement avec configuration decorateurs
Write-Host "🚀 Lancement avec configuration decorateurs..." -ForegroundColor Yellow
try {
    ng serve --configuration=decorators --aot=false --build-optimizer=false --source-map=false --optimization=false --port=4200
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Application lancee avec succes!" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Tentative avec configuration development..." -ForegroundColor Yellow
        ng serve --configuration=development --aot=false --build-optimizer=false --source-map=false --optimization=false --port=4200
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Application lancee avec succes!" -ForegroundColor Green
        } else {
            Write-Host "⚠️ Tentative avec configuration par defaut..." -ForegroundColor Yellow
            ng serve --aot=false --build-optimizer=false --source-map=false --optimization=false --port=4200
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Application lancee avec succes!" -ForegroundColor Green
            } else {
                Write-Host "❌ Impossible de lancer l'application" -ForegroundColor Red
                exit 1
            }
        }
    }
    
} catch {
    Write-Host "❌ Erreur lors du lancement: $_" -ForegroundColor Red
    exit 1
}

Write-Host "🎉 Application lancee avec succes!" -ForegroundColor Green
Write-Host "🌐 Ouvrez http://localhost:4200 dans votre navigateur" -ForegroundColor Cyan
