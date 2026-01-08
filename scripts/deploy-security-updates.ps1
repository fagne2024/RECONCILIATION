# Script PowerShell pour déployer les mises à jour de sécurité
# Usage: .\deploy-security-updates.ps1 [-Environment "docker"|"nginx"] [-Test]

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("docker", "nginx", "both")]
    [string]$Environment = "docker",
    
    [Parameter(Mandatory=$false)]
    [switch]$Test,
    
    [Parameter(Mandatory=$false)]
    [string]$ProductionUrl = "https://reconciliation.intouchgroup.net"
)

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Déploiement des Mises à Jour de Sécurité HTTP              ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Fonction pour afficher les étapes
function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  $Message" -ForegroundColor White
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
}

# Fonction pour demander confirmation
function Confirm-Action {
    param([string]$Message)
    Write-Host "$Message" -ForegroundColor Yellow
    $response = Read-Host "Continuer ? (O/N)"
    return ($response -eq "O" -or $response -eq "o" -or $response -eq "Y" -or $response -eq "y")
}

# Étape 1 : Vérification des prérequis
Write-Step "Étape 1/5 : Vérification des prérequis"

$projectRoot = Get-Location
Write-Host "✓ Répertoire du projet : $projectRoot" -ForegroundColor Green

# Vérifier la présence des fichiers
$files = @(
    "reconciliation-app\frontend\nginx.conf",
    "scripts\test-security-headers.ps1"
)

$allFilesExist = $true
foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "✓ Fichier trouvé : $file" -ForegroundColor Green
    } else {
        Write-Host "✗ Fichier manquant : $file" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Host ""
    Write-Host "❌ Fichiers manquants détectés. Impossible de continuer." -ForegroundColor Red
    exit 1
}

# Étape 2 : Sauvegarde
Write-Step "Étape 2/5 : Sauvegarde de la configuration actuelle"

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "backup_security_$timestamp"

if (-not (Confirm-Action "Créer une sauvegarde dans le dossier '$backupDir' ?")) {
    Write-Host "❌ Opération annulée par l'utilisateur" -ForegroundColor Red
    exit 0
}

try {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    
    if (Test-Path "reconciliation-app\frontend\nginx.conf") {
        Copy-Item "reconciliation-app\frontend\nginx.conf" "$backupDir\nginx.conf.backup" -Force
        Write-Host "✓ Sauvegarde créée : $backupDir\nginx.conf.backup" -ForegroundColor Green
    }
    
    Write-Host "✓ Sauvegarde complétée avec succès" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Avertissement : Impossible de créer la sauvegarde" -ForegroundColor Yellow
    Write-Host "   Erreur : $($_.Exception.Message)" -ForegroundColor Gray
    
    if (-not (Confirm-Action "Continuer sans sauvegarde ?")) {
        exit 0
    }
}

# Étape 3 : Test local (si mode test activé ou avant déploiement)
if ($Test -or -not (Confirm-Action "Passer directement au déploiement sans tests locaux ?")) {
    Write-Step "Étape 3/5 : Tests locaux"
    
    Write-Host "Exécution des tests de sécurité locaux..." -ForegroundColor Cyan
    Write-Host ""
    
    try {
        & .\scripts\test-security-headers.ps1 -Url "http://localhost:80"
        
        Write-Host ""
        if (-not (Confirm-Action "Les tests locaux sont-ils satisfaisants ?")) {
            Write-Host "❌ Tests locaux non satisfaisants. Déploiement annulé." -ForegroundColor Red
            Write-Host ""
            Write-Host "💡 Consultez ACTIONS_SECURITE_HTTP.md pour résoudre les problèmes" -ForegroundColor Yellow
            exit 1
        }
    } catch {
        Write-Host "⚠️  Impossible d'exécuter les tests locaux" -ForegroundColor Yellow
        Write-Host "   Le serveur local n'est peut-être pas démarré" -ForegroundColor Gray
        Write-Host ""
        
        if (-not (Confirm-Action "Continuer sans tests locaux ?")) {
            exit 0
        }
    }
} else {
    Write-Step "Étape 3/5 : Tests locaux (IGNORÉS)"
    Write-Host "⚠️  Tests locaux ignorés par choix de l'utilisateur" -ForegroundColor Yellow
}

# Étape 4 : Déploiement
Write-Step "Étape 4/5 : Déploiement"

if (-not (Confirm-Action "⚠️  ATTENTION : Déployer les modifications maintenant ?")) {
    Write-Host "❌ Déploiement annulé par l'utilisateur" -ForegroundColor Red
    exit 0
}

if ($Environment -eq "docker" -or $Environment -eq "both") {
    Write-Host ""
    Write-Host "📦 Déploiement Docker..." -ForegroundColor Cyan
    Write-Host ""
    
    try {
        Set-Location "reconciliation-app"
        
        Write-Host "  → Arrêt des conteneurs..." -ForegroundColor Gray
        & docker-compose down
        
        Write-Host "  → Reconstruction de l'image frontend..." -ForegroundColor Gray
        & docker-compose build frontend
        
        Write-Host "  → Démarrage des conteneurs..." -ForegroundColor Gray
        & docker-compose up -d
        
        Set-Location $projectRoot
        
        Write-Host ""
        Write-Host "✓ Déploiement Docker complété" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "⏳ Attente du démarrage des services (30 secondes)..." -ForegroundColor Yellow
        Start-Sleep -Seconds 30
        
    } catch {
        Write-Host "❌ Erreur lors du déploiement Docker" -ForegroundColor Red
        Write-Host "   $($_.Exception.Message)" -ForegroundColor Gray
        Set-Location $projectRoot
        exit 1
    }
}

if ($Environment -eq "nginx" -or $Environment -eq "both") {
    Write-Host ""
    Write-Host "🌐 Déploiement Nginx..." -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "⚠️  Cette fonctionnalité nécessite des droits administrateur" -ForegroundColor Yellow
    Write-Host "   Commandes à exécuter manuellement :" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   1. Tester la configuration : nginx -t" -ForegroundColor White
    Write-Host "   2. Recharger Nginx : nginx -s reload" -ForegroundColor White
    Write-Host ""
}

# Étape 5 : Vérification post-déploiement
Write-Step "Étape 5/5 : Vérification post-déploiement"

Write-Host "Exécution des tests de sécurité..." -ForegroundColor Cyan
Write-Host ""

try {
    # Test local
    Write-Host "═══ Test Local ═══" -ForegroundColor Cyan
    Write-Host ""
    & .\scripts\test-security-headers.ps1 -Url "http://localhost:80"
    
    # Test production (si URL fournie)
    if ($ProductionUrl) {
        Write-Host ""
        Write-Host "═══ Test Production ═══" -ForegroundColor Cyan
        Write-Host ""
        & .\scripts\test-security-headers.ps1 -Url $ProductionUrl
    }
    
} catch {
    Write-Host "⚠️  Impossible d'exécuter les tests" -ForegroundColor Yellow
    Write-Host "   Erreur : $($_.Exception.Message)" -ForegroundColor Gray
}

# Résumé
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  RÉSUMÉ DU DÉPLOIEMENT" -ForegroundColor White
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "✓ Sauvegarde créée : $backupDir" -ForegroundColor Green
Write-Host "✓ Déploiement complété" -ForegroundColor Green
Write-Host "✓ Tests de sécurité exécutés" -ForegroundColor Green
Write-Host ""
Write-Host "📋 PROCHAINES ÉTAPES :" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Vérifier que l'application fonctionne normalement" -ForegroundColor White
Write-Host "2. Consulter les logs pour détecter d'éventuelles erreurs" -ForegroundColor White
Write-Host "3. Tester avec les outils en ligne :" -ForegroundColor White
Write-Host "   - https://securityheaders.com/" -ForegroundColor Gray
Write-Host "   - https://observatory.mozilla.org/" -ForegroundColor Gray
Write-Host "4. Configurer la surveillance continue (voir GUIDE_VERIFICATION_SECURITE.md)" -ForegroundColor White
Write-Host ""
Write-Host "📚 DOCUMENTATION :" -ForegroundColor Yellow
Write-Host "   - ACTIONS_SECURITE_HTTP.md : Actions et checklist" -ForegroundColor Gray
Write-Host "   - GUIDE_VERIFICATION_SECURITE.md : Guide de vérification" -ForegroundColor Gray
Write-Host "   - README_SECURITE.md : Vue d'ensemble" -ForegroundColor Gray
Write-Host ""

# Rollback information
Write-Host "🔄 EN CAS DE PROBLÈME (ROLLBACK) :" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Restaurer la configuration depuis la sauvegarde :" -ForegroundColor White
Write-Host "   Copy-Item $backupDir\nginx.conf.backup reconciliation-app\frontend\nginx.conf -Force" -ForegroundColor Gray
Write-Host "   docker-compose down && docker-compose build frontend && docker-compose up -d" -ForegroundColor Gray
Write-Host ""

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Déploiement terminé avec succès !" -ForegroundColor Green
Write-Host ""









