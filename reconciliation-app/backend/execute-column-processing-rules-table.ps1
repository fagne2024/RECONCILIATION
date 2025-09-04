# Script PowerShell pour créer la table column_processing_rules
# Ce script exécute le script SQL de création de la table

param(
    [string]$DatabaseName = "reconciliation_db",
    [string]$ServerName = "localhost",
    [string]$Port = "3306",
    [string]$Username = "root",
    [string]$Password = ""
)

Write-Host "🔧 Création de la table column_processing_rules..." -ForegroundColor Cyan

# Vérifier si le script SQL existe
$sqlFile = "create-column-processing-rules-table.sql"
if (-not (Test-Path $sqlFile)) {
    Write-Host "❌ Erreur: Le fichier $sqlFile n'existe pas!" -ForegroundColor Red
    exit 1
}

Write-Host "📄 Fichier SQL trouvé: $sqlFile" -ForegroundColor Green

# Construire la commande MySQL
$mysqlCommand = "mysql"
$mysqlArgs = @(
    "-h", $ServerName,
    "-P", $Port,
    "-u", $Username
)

if ($Password) {
    $mysqlArgs += "-p$Password"
}

$mysqlArgs += $DatabaseName

# Lire le contenu du fichier SQL
$sqlContent = Get-Content $sqlFile -Raw

Write-Host "🚀 Exécution du script SQL..." -ForegroundColor Yellow

try {
    # Exécuter la commande MySQL
    $process = Start-Process -FilePath $mysqlCommand -ArgumentList $mysqlArgs -PassThru -NoNewWindow -Wait -RedirectStandardInput $sqlFile -RedirectStandardOutput "output.log" -RedirectStandardError "error.log"
    
    if ($process.ExitCode -eq 0) {
        Write-Host "✅ Table column_processing_rules créée avec succès!" -ForegroundColor Green
        
        # Afficher les logs si disponibles
        if (Test-Path "output.log") {
            Write-Host "📋 Sortie de la commande:" -ForegroundColor Cyan
            Get-Content "output.log" | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
        }
    } else {
        Write-Host "❌ Erreur lors de la création de la table (Code: $($process.ExitCode))" -ForegroundColor Red
        
        if (Test-Path "error.log") {
            Write-Host "📋 Erreurs:" -ForegroundColor Red
            Get-Content "error.log" | ForEach-Object { Write-Host "   $_" -ForegroundColor Red }
        }
    }
} catch {
    Write-Host "❌ Erreur lors de l'exécution: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    # Nettoyer les fichiers temporaires
    if (Test-Path "output.log") { Remove-Item "output.log" -Force }
    if (Test-Path "error.log") { Remove-Item "error.log" -Force }
}

Write-Host "🏁 Script terminé." -ForegroundColor Cyan
