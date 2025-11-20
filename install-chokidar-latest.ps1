# Script PowerShell pour installer la dernière version de chokidar
# Usage: .\install-chokidar-latest.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Installation de la dernière version de chokidar" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier la version actuelle
Write-Host "[1/4] Vérification de la version actuelle..." -ForegroundColor Yellow
$currentVersion = npm list chokidar 2>&1 | Select-String "chokidar@" | Select-Object -First 1
if ($currentVersion) {
    Write-Host "Version actuelle: $currentVersion" -ForegroundColor Yellow
} else {
    Write-Host "chokidar n'est pas installé" -ForegroundColor Yellow
}

# Obtenir la dernière version disponible
Write-Host "[2/4] Recherche de la dernière version..." -ForegroundColor Yellow
$latestVersion = npm view chokidar version
Write-Host "Dernière version disponible: $latestVersion" -ForegroundColor Green

# Installer la dernière version
Write-Host "[3/4] Installation de chokidar@$latestVersion..." -ForegroundColor Yellow
npm install chokidar@latest --save
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Installation réussie" -ForegroundColor Green
} else {
    Write-Host "✗ Erreur lors de l'installation" -ForegroundColor Red
    exit 1
}

# Vérifier l'installation
Write-Host "[4/4] Vérification de l'installation..." -ForegroundColor Yellow
$installedVersion = npm list chokidar 2>&1 | Select-String "chokidar@" | Select-Object -First 1
Write-Host "Version installée: $installedVersion" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Installation terminée avec succès!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pour installer dans le frontend également:" -ForegroundColor Yellow
Write-Host "  cd reconciliation-app\frontend" -ForegroundColor Cyan
Write-Host "  npm install chokidar@latest --save-dev" -ForegroundColor Cyan
Write-Host ""












