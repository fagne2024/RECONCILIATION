# Script pour redémarrer le frontend avec les améliorations de réconciliation

Write-Host "🚀 Redémarrage du frontend avec les améliorations" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

# Configuration
$frontendPath = "reconciliation-app/frontend"
$backendPath = "reconciliation-app/backend"

# Fonction pour arrêter les processus existants
function Stop-ExistingProcesses {
    Write-Host "`n🛑 Arrêt des processus existants..." -ForegroundColor Yellow
    
    # Arrêter les processus Angular
    $angularProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -eq "node" }
    if ($angularProcesses) {
        Write-Host "   Arrêt des processus Node.js..." -ForegroundColor White
        $angularProcesses | Stop-Process -Force
        Start-Sleep -Seconds 2
    }
    
    # Arrêter les processus Java (backend)
    $javaProcesses = Get-Process -Name "java" -ErrorAction SilentlyContinue
    if ($javaProcesses) {
        Write-Host "   Arrêt des processus Java..." -ForegroundColor White
        $javaProcesses | Stop-Process -Force
        Start-Sleep -Seconds 3
    }
    
    Write-Host "✅ Processus arrêtés" -ForegroundColor Green
}

# Fonction pour nettoyer le cache
function Clear-Cache {
    Write-Host "`n🧹 Nettoyage du cache..." -ForegroundColor Yellow
    
    # Nettoyer le cache npm
    if (Test-Path "$frontendPath/node_modules/.cache") {
        Remove-Item "$frontendPath/node_modules/.cache" -Recurse -Force
        Write-Host "   Cache npm nettoyé" -ForegroundColor White
    }
    
    # Nettoyer le cache Angular
    if (Test-Path "$frontendPath/.angular") {
        Remove-Item "$frontendPath/.angular" -Recurse -Force
        Write-Host "   Cache Angular nettoyé" -ForegroundColor White
    }
    
    Write-Host "✅ Cache nettoyé" -ForegroundColor Green
}

# Fonction pour installer les dépendances
function Install-Dependencies {
    Write-Host "`n📦 Installation des dépendances..." -ForegroundColor Yellow
    
    # Vérifier si on est dans le bon répertoire
    if (Test-Path "$frontendPath/package.json") {
        Set-Location $frontendPath
        
        Write-Host "   Installation des dépendances frontend..." -ForegroundColor White
        npm install
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Dépendances frontend installées" -ForegroundColor Green
        } else {
            Write-Host "❌ Erreur lors de l'installation des dépendances frontend" -ForegroundColor Red
            return $false
        }
    } else {
        Write-Host "❌ Répertoire frontend non trouvé: $frontendPath" -ForegroundColor Red
        return $false
    }
    
    return $true
}

# Fonction pour démarrer le backend
function Start-Backend {
    Write-Host "`n🔧 Démarrage du backend..." -ForegroundColor Yellow
    
    if (Test-Path "$backendPath/pom.xml") {
        Set-Location $backendPath
        
        Write-Host "   Compilation et démarrage du backend..." -ForegroundColor White
        
        # Démarrer le backend en arrière-plan
        Start-Process -FilePath "mvn" -ArgumentList "spring-boot:run" -WorkingDirectory $backendPath -WindowStyle Hidden
        
        # Attendre que le backend démarre
        Write-Host "   Attente du démarrage du backend..." -ForegroundColor White
        Start-Sleep -Seconds 10
        
        # Vérifier si le backend répond
        $maxAttempts = 30
        $attempt = 0
        
        while ($attempt -lt $maxAttempts) {
            try {
                $response = Invoke-RestMethod -Uri "http://localhost:8080/api/health" -Method GET -TimeoutSec 5
                Write-Host "✅ Backend démarré et accessible" -ForegroundColor Green
                return $true
            }
            catch {
                $attempt++
                Write-Host "   Tentative $attempt/$maxAttempts..." -ForegroundColor Gray
                Start-Sleep -Seconds 2
            }
        }
        
        Write-Host "❌ Backend non accessible après $maxAttempts tentatives" -ForegroundColor Red
        return $false
    } else {
        Write-Host "❌ Répertoire backend non trouvé: $backendPath" -ForegroundColor Red
        return $false
    }
}

# Fonction pour démarrer le frontend
function Start-Frontend {
    Write-Host "`n🌐 Démarrage du frontend..." -ForegroundColor Yellow
    
    if (Test-Path "$frontendPath/package.json") {
        Set-Location $frontendPath
        
        Write-Host "   Compilation et démarrage du frontend..." -ForegroundColor White
        
        # Démarrer le frontend en arrière-plan
        Start-Process -FilePath "npm" -ArgumentList "start" -WorkingDirectory $frontendPath -WindowStyle Hidden
        
        # Attendre que le frontend démarre
        Write-Host "   Attente du démarrage du frontend..." -ForegroundColor White
        Start-Sleep -Seconds 15
        
        # Vérifier si le frontend répond
        $maxAttempts = 20
        $attempt = 0
        
        while ($attempt -lt $maxAttempts) {
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:4200" -Method GET -TimeoutSec 5
                if ($response.StatusCode -eq 200) {
                    Write-Host "✅ Frontend démarré et accessible" -ForegroundColor Green
                    return $true
                }
            }
            catch {
                $attempt++
                Write-Host "   Tentative $attempt/$maxAttempts..." -ForegroundColor Gray
                Start-Sleep -Seconds 2
            }
        }
        
        Write-Host "❌ Frontend non accessible après $maxAttempts tentatives" -ForegroundColor Red
        return $false
    } else {
        Write-Host "❌ Répertoire frontend non trouvé: $frontendPath" -ForegroundColor Red
        return $false
    }
}

# Fonction pour afficher les améliorations
function Show-Improvements {
    Write-Host "`n✨ Améliorations appliquées:" -ForegroundColor Cyan
    Write-Host "=============================" -ForegroundColor Cyan
    
    Write-Host "1. 🔄 Cache des modèles optimisé:" -ForegroundColor White
    Write-Host "   - Cache de 5 minutes" -ForegroundColor Gray
    Write-Host "   - Évite les requêtes multiples" -ForegroundColor Gray
    Write-Host "   - Gestion des erreurs améliorée" -ForegroundColor Gray
    
    Write-Host "`n2. 📊 Lecture des fichiers améliorée:" -ForegroundColor White
    Write-Host "   - Détection automatique d'encodage" -ForegroundColor Gray
    Write-Host "   - Détection automatique des délimiteurs" -ForegroundColor Gray
    Write-Host "   - Support des formats Excel complexes" -ForegroundColor Gray
    Write-Host "   - Détection intelligente des en-têtes" -ForegroundColor Gray
    
    Write-Host "`n3. 🔧 Normalisation des données:" -ForegroundColor White
    Write-Host "   - Correction automatique des caractères spéciaux" -ForegroundColor Gray
    Write-Host "   - Normalisation des noms de colonnes" -ForegroundColor Gray
    Write-Host "   - Suppression des valeurs vides" -ForegroundColor Gray
    Write-Host "   - Optimisation des performances" -ForegroundColor Gray
    
    Write-Host "`n4. 🔑 Détection intelligente des clés:" -ForegroundColor White
    Write-Host "   - Analyse sémantique des colonnes" -ForegroundColor Gray
    Write-Host "   - Support des transformations" -ForegroundColor Gray
    Write-Host "   - Suggestions automatiques" -ForegroundColor Gray
    Write-Host "   - Confiance calculée" -ForegroundColor Gray
}

# Exécution du script
Write-Host "`n🚀 Démarrage du processus de redémarrage..." -ForegroundColor Green

# Arrêter les processus existants
Stop-ExistingProcesses

# Nettoyer le cache
Clear-Cache

# Installer les dépendances
$depsInstalled = Install-Dependencies
if (-not $depsInstalled) {
    Write-Host "`n❌ Impossible de continuer sans les dépendances" -ForegroundColor Red
    exit 1
}

# Démarrer le backend
$backendStarted = Start-Backend
if (-not $backendStarted) {
    Write-Host "`n⚠️ Backend non démarré, continuation avec le frontend uniquement" -ForegroundColor Yellow
}

# Démarrer le frontend
$frontendStarted = Start-Frontend
if (-not $frontendStarted) {
    Write-Host "`n❌ Frontend non démarré" -ForegroundColor Red
    exit 1
}

# Afficher les améliorations
Show-Improvements

Write-Host "`n✅ Redémarrage terminé!" -ForegroundColor Green
Write-Host "`n🌐 URLs d'accès:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:4200" -ForegroundColor White
Write-Host "   Backend:  http://localhost:8080" -ForegroundColor White

Write-Host "`n📝 Prochaines étapes:" -ForegroundColor Cyan
Write-Host "1. Ouvrir http://localhost:4200 dans votre navigateur" -ForegroundColor White
Write-Host "2. Tester avec vos fichiers réels" -ForegroundColor White
Write-Host "3. Vérifier les performances améliorées" -ForegroundColor White
Write-Host "4. Utiliser le script test-ameliorations-reconciliation.ps1 pour valider" -ForegroundColor White
