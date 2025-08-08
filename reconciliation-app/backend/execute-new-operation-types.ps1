# Script PowerShell pour exécuter le script SQL d'ajout des nouveaux types d'opérations
# Appro_fournisseur, Compense_fournisseur, nivellement, régularisation_solde

param(
    [string]$DatabaseName = "top20",
    [string]$ServerName = "localhost",
    [string]$Username = "root",
    [string]$Password = ""
)

Write-Host "=== Script d'ajout des nouveaux types d'opérations ===" -ForegroundColor Green
Write-Host "Base de données: $DatabaseName" -ForegroundColor Yellow
Write-Host "Serveur: $ServerName" -ForegroundColor Yellow
Write-Host "Utilisateur: $Username" -ForegroundColor Yellow

# Chemin vers le script SQL
$sqlScriptPath = Join-Path $PSScriptRoot "update-new-operation-types.sql"

# Vérifier que le fichier SQL existe
if (-not (Test-Path $sqlScriptPath)) {
    Write-Host "❌ Erreur: Le fichier SQL n'existe pas: $sqlScriptPath" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Fichier SQL trouvé: $sqlScriptPath" -ForegroundColor Green

# Construire la commande MySQL
$mysqlCommand = "mysql"
$mysqlArgs = @(
    "-h", $ServerName,
    "-u", $Username,
    "-D", $DatabaseName
)

# Ajouter le mot de passe si fourni
if ($Password) {
    $mysqlArgs += @("-p$Password")
}

# Ajouter le fichier SQL
$mysqlArgs += @("<", $sqlScriptPath)

Write-Host "`n🔍 Vérification des types d'opérations existants..." -ForegroundColor Cyan

# Exécuter la commande MySQL
try {
    $process = Start-Process -FilePath $mysqlCommand -ArgumentList $mysqlArgs -Wait -PassThru -NoNewWindow
    
    if ($process.ExitCode -eq 0) {
        Write-Host "✅ Script exécuté avec succès!" -ForegroundColor Green
        Write-Host "`n📋 Résumé:" -ForegroundColor Cyan
        Write-Host "- Appro_fournisseur: Ajouté au backend" -ForegroundColor White
        Write-Host "- Compense_fournisseur: Ajouté au backend" -ForegroundColor White
        Write-Host "- nivellement: Ajouté au backend" -ForegroundColor White
        Write-Host "- régularisation_solde: Ajouté au backend" -ForegroundColor White
        Write-Host "`n✅ Les nouveaux types d'opérations sont maintenant disponibles dans l'application!" -ForegroundColor Green
    } else {
        Write-Host "❌ Erreur lors de l'exécution du script SQL (Code: $($process.ExitCode))" -ForegroundColor Red
        Write-Host "Vérifiez les paramètres de connexion à la base de données." -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Erreur lors de l'exécution: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Vérifiez que MySQL est installé et accessible." -ForegroundColor Yellow
}

Write-Host "`n=== Fin du script ===" -ForegroundColor Green
