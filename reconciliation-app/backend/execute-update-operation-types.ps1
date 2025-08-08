# Script PowerShell pour mettre à jour les types d'opérations dans la base de données
# Changement de "approvisionnement" vers "Appro_client"
# Changement de "compense" vers "Compense_client"

Write-Host "=== Mise à jour des types d'opérations dans la base de données ===" -ForegroundColor Green

# Configuration de la base de données (à adapter selon votre environnement)
$DB_HOST = "localhost"
$DB_PORT = "5432"
$DB_NAME = "reconciliation_db"
$DB_USER = "postgres"
$DB_PASSWORD = "password"

# Chemin vers le script SQL
$SQL_SCRIPT = "update-operation-types.sql"

Write-Host "Connexion à la base de données..." -ForegroundColor Yellow
Write-Host "Host: $DB_HOST" -ForegroundColor Cyan
Write-Host "Port: $DB_PORT" -ForegroundColor Cyan
Write-Host "Database: $DB_NAME" -ForegroundColor Cyan
Write-Host "User: $DB_USER" -ForegroundColor Cyan

# Vérifier si le fichier SQL existe
if (-not (Test-Path $SQL_SCRIPT)) {
    Write-Host "ERREUR: Le fichier $SQL_SCRIPT n'existe pas!" -ForegroundColor Red
    exit 1
}

Write-Host "Fichier SQL trouvé: $SQL_SCRIPT" -ForegroundColor Green

# Exécuter le script SQL avec psql
try {
    Write-Host "Exécution du script SQL..." -ForegroundColor Yellow
    
    # Commande pour exécuter le script SQL
    $env:PGPASSWORD = $DB_PASSWORD
    $result = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $SQL_SCRIPT 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Script SQL exécuté avec succès!" -ForegroundColor Green
        Write-Host "Résultats:" -ForegroundColor Cyan
        Write-Host $result -ForegroundColor White
    } else {
        Write-Host "ERREUR lors de l'exécution du script SQL:" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "ERREUR: Impossible d'exécuter le script SQL" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
} finally {
    # Nettoyer la variable d'environnement
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host "=== Mise à jour terminée ===" -ForegroundColor Green
Write-Host "Les types d'opérations ont été mis à jour:" -ForegroundColor Cyan
Write-Host "- 'approvisionnement' -> 'Appro_client'" -ForegroundColor White
Write-Host "- 'compense' -> 'Compense_client'" -ForegroundColor White
Write-Host "- 'annulation_approvisionnement' -> 'annulation_Appro_client'" -ForegroundColor White
Write-Host "- 'annulation_compense' -> 'annulation_Compense_client'" -ForegroundColor White
