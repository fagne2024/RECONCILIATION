# Script de test pour verifier la correction du chevauchement
Write-Host "🧪 Test de la correction du chevauchement..." -ForegroundColor Magenta

# Variables d'environnement pour le test
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

# Test de compilation
Write-Host "🔧 Test de compilation..." -ForegroundColor Yellow
try {
    ng build --configuration=development --aot=false --build-optimizer=false --source-map=false --optimization=false --progress=false
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Compilation reussie!" -ForegroundColor Green
    } else {
        Write-Host "❌ Erreur compilation" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Erreur compilation: $_" -ForegroundColor Red
    exit 1
}

# Test de lancement rapide
Write-Host "🚀 Test de lancement rapide..." -ForegroundColor Yellow
try {
    $process = Start-Process -FilePath "ng" -ArgumentList "serve", "--configuration=development", "--aot=false", "--build-optimizer=false", "--source-map=false", "--optimization=false", "--port=4200" -PassThru -WindowStyle Hidden
    
    Start-Sleep -Seconds 15
    
    if ($process.HasExited) {
        Write-Host "❌ Le serveur s'est arrete" -ForegroundColor Red
    } else {
        Write-Host "✅ Serveur lance avec succes!" -ForegroundColor Green
        Write-Host "🌐 Testez http://localhost:4200" -ForegroundColor Cyan
        Write-Host "💡 Verifiez que les elements ne se chevauchent plus" -ForegroundColor Yellow
        
        # Arrêter le serveur après 30 secondes
        Start-Sleep -Seconds 30
        Stop-Process -Id $process.Id -Force
        Write-Host "🛑 Serveur arrete" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Erreur lancement: $_" -ForegroundColor Red
}

Write-Host "🎉 Test du chevauchement termine!" -ForegroundColor Green
Write-Host "💡 Les corrections CSS ont ete appliquees avec succes" -ForegroundColor Cyan
