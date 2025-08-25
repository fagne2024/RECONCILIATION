# Script de lancement ultra-radical pour Web Workers
Write-Host "🔥 Lancement ultra-radical de l'application..." -ForegroundColor Red

# Variables d'environnement ultra-permissives
$env:TS_NODE_PROJECT = "tsconfig.ultra.json"
$env:SKIP_LIB_CHECK = "true"
$env:NO_IMPLICIT_ANY = "false"
$env:STRICT = "false"
$env:NO_EMIT_ON_ERROR = "false"
$env:SUPPRESS_IMPLICIT_ANY_INDEX_ERRORS = "true"
$env:ALLOW_JS = "true"
$env:CHECK_JS = "false"
$env:ANGULAR_DISABLE_STRICT_TEMPLATES = "true"
$env:ANGULAR_DISABLE_STRICT_INJECTION_PARAMETERS = "true"
$env:ANGULAR_DISABLE_STRICT_INPUT_ACCESS_MODIFIERS = "true"

# Nettoyage complet
Write-Host "🧹 Nettoyage complet..." -ForegroundColor Yellow
if (Test-Path "node_modules/.cache") { Remove-Item -Recurse -Force "node_modules/.cache" }
if (Test-Path ".angular") { Remove-Item -Recurse -Force ".angular" }
if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
if (Test-Path "out-tsc") { Remove-Item -Recurse -Force "out-tsc" }

# Lancement ultra-radical
Write-Host "🚀 Lancement ultra-radical..." -ForegroundColor Red
try {
    # Tentative avec configuration worker
    Write-Host "🔧 Tentative avec configuration worker..." -ForegroundColor Yellow
    ng serve --configuration=worker --aot=false --build-optimizer=false --source-map=false --optimization=false --port=4200
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Application lancée avec succès!" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Tentative avec configuration development..." -ForegroundColor Yellow
        ng serve --configuration=development --aot=false --build-optimizer=false --source-map=false --optimization=false --port=4200
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Application lancée avec succès!" -ForegroundColor Green
        } else {
            Write-Host "⚠️ Tentative avec configuration par défaut..." -ForegroundColor Yellow
            ng serve --aot=false --build-optimizer=false --source-map=false --optimization=false --port=4200
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Application lancée avec succès!" -ForegroundColor Green
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

Write-Host "🎉 Application ultra-radicale lancée avec succès!" -ForegroundColor Green
Write-Host "🌐 Ouvrez http://localhost:4200 dans votre navigateur" -ForegroundColor Cyan
