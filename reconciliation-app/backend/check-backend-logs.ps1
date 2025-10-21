# Script pour vérifier les logs du backend
Write-Host "📋 Vérification des logs du backend" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

# Chercher les fichiers de logs
$logFiles = @(
    "logs/application.log",
    "target/logs/application.log",
    "application.log"
)

Write-Host "`n🔍 Recherche des fichiers de logs..." -ForegroundColor Yellow

foreach ($logFile in $logFiles) {
    if (Test-Path $logFile) {
        Write-Host "   ✅ Fichier trouvé: $logFile" -ForegroundColor Green
        
        # Afficher les dernières lignes avec "ERROR" ou "Exception"
        Write-Host "`n📄 Dernières erreurs dans $logFile:" -ForegroundColor Yellow
        Get-Content $logFile | Select-String -Pattern "(ERROR|Exception|❌)" | Select-Object -Last 10 | ForEach-Object {
            Write-Host "   $_" -ForegroundColor Red
        }
        
        # Afficher les dernières lignes avec "annulation"
        Write-Host "`n📄 Dernières lignes d'annulation dans $logFile:" -ForegroundColor Yellow
        Get-Content $logFile | Select-String -Pattern "annulation" | Select-Object -Last 5 | ForEach-Object {
            Write-Host "   $_" -ForegroundColor Gray
        }
        
        break
    }
}

# Si aucun fichier de log trouvé, chercher dans les logs système
if (-not (Test-Path "logs/application.log") -and -not (Test-Path "target/logs/application.log") -and -not (Test-Path "application.log")) {
    Write-Host "   ⚠️ Aucun fichier de log trouvé dans les emplacements standards" -ForegroundColor Yellow
    Write-Host "   Vérifiez les logs du backend dans votre IDE ou terminal" -ForegroundColor Gray
}

Write-Host "`n✅ Vérification terminée" -ForegroundColor Cyan
