# Script de correction de l'avertissement de dépréciation util._extend
# Usage: .\fix-deprecation-warning.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Correction de l'avertissement de dépréciation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier si Docker est en cours d'exécution
Write-Host "[1/5] Vérification de Docker..." -ForegroundColor Yellow
try {
    docker --version | Out-Null
    Write-Host "✓ Docker est installé" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker n'est pas installé ou n'est pas en cours d'exécution" -ForegroundColor Red
    exit 1
}

# Vérifier si nous sommes dans le bon répertoire
Write-Host "[2/5] Vérification du répertoire..." -ForegroundColor Yellow
if (-not (Test-Path "docker-compose.yml")) {
    Write-Host "✗ Ce script doit être exécuté depuis le dossier docker/" -ForegroundColor Red
    Write-Host "  Répertoire actuel: $(Get-Location)" -ForegroundColor Yellow
    exit 1
}
Write-Host "✓ Répertoire correct" -ForegroundColor Green

# Vérifier si les conteneurs sont en cours d'exécution
Write-Host "[3/5] Vérification des conteneurs..." -ForegroundColor Yellow
$containers = docker compose ps --format json | ConvertFrom-Json
if ($containers.Count -gt 0) {
    Write-Host "⚠ Des conteneurs sont en cours d'exécution" -ForegroundColor Yellow
    $response = Read-Host "Voulez-vous les arrêter maintenant? (O/N)"
    if ($response -eq "O" -or $response -eq "o") {
        Write-Host "Arrêt des conteneurs..." -ForegroundColor Yellow
        docker compose down
        Write-Host "✓ Conteneurs arrêtés" -ForegroundColor Green
    } else {
        Write-Host "✗ Veuillez arrêter les conteneurs manuellement avec: docker compose down" -ForegroundColor Red
        exit 1
    }
}

# Vérifier les modifications nécessaires
Write-Host "[4/5] Vérification des fichiers modifiés..." -ForegroundColor Yellow
$dockerfilePath = "..\reconciliation-app\frontend\Dockerfile"
if (Test-Path $dockerfilePath) {
    $dockerfileContent = Get-Content $dockerfilePath -Raw
    if ($dockerfileContent -match "node:18") {
        Write-Host "✓ Dockerfile frontend utilise Node.js 18" -ForegroundColor Green
    } elseif ($dockerfileContent -match "node:16") {
        Write-Host "⚠ Dockerfile utilise encore Node.js 16" -ForegroundColor Yellow
        Write-Host "  Le script va proposer une mise à jour..." -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠ Dockerfile frontend non trouvé: $dockerfilePath" -ForegroundColor Yellow
}

# Options de correction
Write-Host ""
Write-Host "[5/5] Choisissez une option de correction:" -ForegroundColor Yellow
Write-Host "  1. Reconstruire avec les fichiers modifiés (Recommandé)" -ForegroundColor Cyan
Write-Host "  2. Reconstruire et supprimer les warnings (Solution rapide)" -ForegroundColor Cyan
Write-Host "  3. Afficher les logs actuels pour diagnostic" -ForegroundColor Cyan
Write-Host "  4. Annuler" -ForegroundColor Cyan
Write-Host ""

$choice = Read-Host "Votre choix (1-4)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "Reconstruction des images..." -ForegroundColor Yellow
        docker compose build --no-cache
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Build réussi" -ForegroundColor Green
            Write-Host ""
            $start = Read-Host "Voulez-vous démarrer les conteneurs maintenant? (O/N)"
            if ($start -eq "O" -or $start -eq "o") {
                docker compose up -d
                Write-Host "✓ Conteneurs démarrés" -ForegroundColor Green
                Write-Host ""
                Write-Host "Vérification des logs..." -ForegroundColor Yellow
                Start-Sleep -Seconds 3
                docker compose logs --tail=20 frontend | Select-String -Pattern "DeprecationWarning" -Context 2
                if ($LASTEXITCODE -ne 0) {
                    Write-Host "✓ Aucun warning de dépréciation trouvé dans les logs récents" -ForegroundColor Green
                } else {
                    Write-Host "⚠ Des warnings sont encore présents. Consultez le guide CORRECTION_DEPRECATION_WARNING.md" -ForegroundColor Yellow
                }
            }
        } else {
            Write-Host "✗ Erreur lors du build. Consultez les logs ci-dessus." -ForegroundColor Red
        }
    }
    "2" {
        Write-Host ""
        Write-Host "Application de la solution rapide (suppression des warnings)..." -ForegroundColor Yellow
        
        # Vérifier si docker-compose.yml existe
        if (Test-Path "docker-compose.yml") {
            $composeContent = Get-Content "docker-compose.yml" -Raw
            
            # Ajouter NODE_OPTIONS si pas déjà présent
            if ($composeContent -notmatch "NODE_OPTIONS") {
                $composeContent = $composeContent -replace "environment:\s*\n\s*API_BASE_URL:", "environment:`n    NODE_OPTIONS: `"--no-deprecation`"`n    API_BASE_URL:"
                Set-Content -Path "docker-compose.yml" -Value $composeContent
                Write-Host "✓ docker-compose.yml modifié" -ForegroundColor Green
            } else {
                Write-Host "⚠ NODE_OPTIONS déjà présent dans docker-compose.yml" -ForegroundColor Yellow
            }
            
            Write-Host "Reconstruction du frontend..." -ForegroundColor Yellow
            docker compose build --no-cache frontend
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✓ Build réussi" -ForegroundColor Green
                docker compose up -d frontend
                Write-Host "✓ Frontend redémarré" -ForegroundColor Green
            }
        } else {
            Write-Host "✗ docker-compose.yml non trouvé" -ForegroundColor Red
        }
    }
    "3" {
        Write-Host ""
        Write-Host "Logs des conteneurs:" -ForegroundColor Yellow
        Write-Host "===================" -ForegroundColor Yellow
        docker compose logs --tail=50 | Select-String -Pattern "DeprecationWarning|WARN|ERROR" -Context 1
    }
    "4" {
        Write-Host "Opération annulée" -ForegroundColor Yellow
        exit 0
    }
    default {
        Write-Host "✗ Choix invalide" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Opération terminée" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pour plus d'informations, consultez:" -ForegroundColor Yellow
Write-Host "  - deployment/CORRECTION_DEPRECATION_WARNING.md" -ForegroundColor Cyan
Write-Host ""












