# Script de restauration de sauvegarde MySQL
# Configuration
$DB_NAME = "top20"
$DB_USER = "root"
$MYSQL_PATH = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$BACKUP_DIR = ".\backups"

Write-Host "=== Restauration de sauvegarde MySQL ===" -ForegroundColor Green
Write-Host "Base de données: $DB_NAME" -ForegroundColor Yellow
Write-Host "Dossier de sauvegardes: $BACKUP_DIR" -ForegroundColor Yellow
Write-Host ""

# Vérifier si mysql existe
if (-not (Test-Path $MYSQL_PATH)) {
    Write-Host "❌ Erreur: mysql non trouvé à $MYSQL_PATH" -ForegroundColor Red
    Write-Host "Veuillez vérifier l'installation de MySQL" -ForegroundColor Red
    exit 1
}

Write-Host "✓ mysql trouvé" -ForegroundColor Green

# Vérifier si le dossier de sauvegarde existe
if (-not (Test-Path $BACKUP_DIR)) {
    Write-Host "❌ Erreur: Dossier de sauvegarde non trouvé: $BACKUP_DIR" -ForegroundColor Red
    exit 1
}

# Lister les sauvegardes disponibles
$backupFiles = Get-ChildItem -Path $BACKUP_DIR -Filter "dump_top20_*.sql" | Sort-Object LastWriteTime -Descending

if ($backupFiles.Count -eq 0) {
    Write-Host "❌ Aucune sauvegarde trouvée dans $BACKUP_DIR" -ForegroundColor Red
    exit 1
}

Write-Host "=== Sauvegardes disponibles ===" -ForegroundColor Cyan
for ($i = 0; $i -lt $backupFiles.Count; $i++) {
    $backup = $backupFiles[$i]
    $size = [math]::Round($backup.Length / 1MB, 2)
    $date = $backup.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
    Write-Host "[$i] 📄 $($backup.Name) - $size MB - $date" -ForegroundColor White
}

Write-Host ""
$selection = Read-Host "Sélectionnez le numéro de la sauvegarde à restaurer (0-$($backupFiles.Count-1))"

# Valider la sélection
if ($selection -match '^\d+$' -and [int]$selection -ge 0 -and [int]$selection -lt $backupFiles.Count) {
    $selectedBackup = $backupFiles[[int]$selection]
    Write-Host ""
    Write-Host "✅ Sauvegarde sélectionnée: $($selectedBackup.Name)" -ForegroundColor Green
    Write-Host "📊 Taille: $([math]::Round($selectedBackup.Length / 1MB, 2)) MB" -ForegroundColor Yellow
    Write-Host "📅 Date: $($selectedBackup.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor Yellow
    
    # Demander confirmation
    Write-Host ""
    $confirmation = Read-Host "⚠️ ATTENTION: Cette opération va remplacer la base de données actuelle. Continuer? (oui/non)"
    
    if ($confirmation -eq "oui" -or $confirmation -eq "o" -or $confirmation -eq "y" -or $confirmation -eq "yes") {
        Write-Host ""
        Write-Host "🔄 Restauration en cours..." -ForegroundColor Cyan
        
        try {
            # Restaurer la sauvegarde
            & $MYSQL_PATH -u $DB_USER -p $DB_NAME < $selectedBackup.FullName
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host ""
                Write-Host "✅ Restauration terminée avec succès!" -ForegroundColor Green
                Write-Host "📁 Base de données: $DB_NAME" -ForegroundColor Yellow
                Write-Host "📄 Sauvegarde restaurée: $($selectedBackup.Name)" -ForegroundColor Yellow
                
                Write-Host ""
                Write-Host "=== Vérification de la restauration ===" -ForegroundColor Cyan
                Write-Host "La base de données a été restaurée avec succès." -ForegroundColor White
                Write-Host "Vous pouvez maintenant redémarrer votre application." -ForegroundColor White
                
            } else {
                Write-Host "❌ Erreur lors de la restauration (code: $LASTEXITCODE)" -ForegroundColor Red
                exit 1
            }
            
        } catch {
            Write-Host "❌ Erreur lors de la restauration: $($_.Exception.Message)" -ForegroundColor Red
            exit 1
        }
        
    } else {
        Write-Host "❌ Restauration annulée par l'utilisateur" -ForegroundColor Red
        exit 1
    }
    
} else {
    Write-Host "❌ Sélection invalide" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Instructions post-restauration ===" -ForegroundColor Cyan
Write-Host "1. Redémarrez votre application backend" -ForegroundColor White
Write-Host "2. Vérifiez que les données sont correctement restaurées" -ForegroundColor White
Write-Host "3. Testez les fonctionnalités principales de l'application" -ForegroundColor White 