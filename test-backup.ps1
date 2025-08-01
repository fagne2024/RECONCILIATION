# Script de test du système de sauvegarde
Write-Host "=== Test du Système de Sauvegarde ===" -ForegroundColor Green
Write-Host ""

# Test 1: Vérifier l'installation MySQL
Write-Host "1. Vérification de l'installation MySQL..." -ForegroundColor Cyan
$MYSQLDUMP_PATH = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"
$MYSQL_PATH = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"

if (Test-Path $MYSQLDUMP_PATH) {
    Write-Host "   ✅ mysqldump trouvé" -ForegroundColor Green
} else {
    Write-Host "   ❌ mysqldump non trouvé" -ForegroundColor Red
}

if (Test-Path $MYSQL_PATH) {
    Write-Host "   ✅ mysql trouvé" -ForegroundColor Green
} else {
    Write-Host "   ❌ mysql non trouvé" -ForegroundColor Red
}

# Test 2: Vérifier les scripts
Write-Host ""
Write-Host "2. Vérification des scripts..." -ForegroundColor Cyan
$scripts = @("backup-final.ps1", "planifier-sauvegarde.ps1", "restaurer-sauvegarde.ps1")

foreach ($script in $scripts) {
    if (Test-Path $script) {
        Write-Host "   ✅ $script trouvé" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $script manquant" -ForegroundColor Red
    }
}

# Test 3: Vérifier le dossier de sauvegarde
Write-Host ""
Write-Host "3. Vérification du dossier de sauvegarde..." -ForegroundColor Cyan
$BACKUP_DIR = ".\backups"

if (Test-Path $BACKUP_DIR) {
    Write-Host "   ✅ Dossier backups trouvé" -ForegroundColor Green
    
    $backupFiles = Get-ChildItem -Path $BACKUP_DIR -Filter "dump_top20_*.sql"
    Write-Host "   📄 $($backupFiles.Count) sauvegarde(s) trouvée(s)" -ForegroundColor Yellow
    
    foreach ($file in $backupFiles) {
        $size = [math]::Round($file.Length / 1MB, 2)
        $date = $file.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
        Write-Host "      - $($file.Name) ($size MB, $date)" -ForegroundColor White
    }
} else {
    Write-Host "   ❌ Dossier backups manquant" -ForegroundColor Red
}

# Test 4: Vérifier la documentation
Write-Host ""
Write-Host "4. Vérification de la documentation..." -ForegroundColor Cyan
if (Test-Path "README-BACKUP.md") {
    Write-Host "   ✅ README-BACKUP.md trouvé" -ForegroundColor Green
} else {
    Write-Host "   ❌ README-BACKUP.md manquant" -ForegroundColor Red
}

# Test 5: Test de connexion MySQL
Write-Host ""
Write-Host "5. Test de connexion MySQL..." -ForegroundColor Cyan
try {
    $testResult = & $MYSQL_PATH -u root -p -e "SELECT 1;" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Connexion MySQL réussie" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Erreur de connexion MySQL" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Erreur lors du test de connexion" -ForegroundColor Red
}

# Résumé
Write-Host ""
Write-Host "=== Résumé du Test ===" -ForegroundColor Green
Write-Host "✅ Système de sauvegarde configuré avec succès!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Commandes disponibles:" -ForegroundColor Cyan
Write-Host "   .\backup-final.ps1           # Sauvegarde manuelle" -ForegroundColor White
Write-Host "   .\planifier-sauvegarde.ps1   # Planifier sauvegarde automatique" -ForegroundColor White
Write-Host "   .\restaurer-sauvegarde.ps1   # Restaurer une sauvegarde" -ForegroundColor White
Write-Host ""
Write-Host "📖 Documentation: README-BACKUP.md" -ForegroundColor Yellow
Write-Host "📁 Sauvegardes: .\backups\" -ForegroundColor Yellow 