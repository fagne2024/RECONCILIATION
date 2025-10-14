# Script PowerShell pour créer la table operation_bancaire
# Utilisation: .\create-operation-bancaire-table.ps1

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Création de la table operation_bancaire  " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Paramètres de connexion MySQL
$mysqlHost = "localhost"
$mysqlUser = Read-Host "Nom d'utilisateur MySQL (par défaut: root)"
if ([string]::IsNullOrWhiteSpace($mysqlUser)) {
    $mysqlUser = "root"
}

$mysqlPassword = Read-Host "Mot de passe MySQL" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($mysqlPassword)
$mysqlPasswordPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$mysqlDatabase = Read-Host "Nom de la base de données (par défaut: reconciliation_db)"
if ([string]::IsNullOrWhiteSpace($mysqlDatabase)) {
    $mysqlDatabase = "reconciliation_db"
}

Write-Host ""
Write-Host "Connexion à MySQL..." -ForegroundColor Yellow

# Créer le script SQL temporaire
$sqlScript = @"
-- Script de création de la table operation_bancaire

USE $mysqlDatabase;

-- Vérifier si la table existe déjà
DROP TABLE IF EXISTS operation_bancaire;

-- Créer la table
CREATE TABLE operation_bancaire (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    pays VARCHAR(100) NOT NULL,
    code_pays VARCHAR(10),
    mois VARCHAR(50),
    date_operation DATETIME NOT NULL,
    agence VARCHAR(100) NOT NULL,
    type_operation VARCHAR(100) NOT NULL,
    nom_beneficiaire VARCHAR(255),
    compte_a_debiter VARCHAR(100),
    montant DOUBLE NOT NULL,
    mode_paiement VARCHAR(100),
    reference VARCHAR(100),
    id_glpi VARCHAR(100),
    bo VARCHAR(100),
    statut VARCHAR(50) NOT NULL DEFAULT 'En attente',
    operation_id BIGINT,
    
    -- Index pour améliorer les performances
    INDEX idx_pays (pays),
    INDEX idx_agence (agence),
    INDEX idx_type_operation (type_operation),
    INDEX idx_statut (statut),
    INDEX idx_date_operation (date_operation),
    INDEX idx_reference (reference),
    INDEX idx_operation_id (operation_id),
    
    -- Contrainte de clé étrangère (optionnelle si la table operation existe)
    FOREIGN KEY (operation_id) REFERENCES operation(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Afficher la structure de la table créée
DESCRIBE operation_bancaire;

SELECT 'Table operation_bancaire créée avec succès!' as Message;
"@

# Sauvegarder le script dans un fichier temporaire
$tempSqlFile = "$env:TEMP\create_operation_bancaire.sql"
$sqlScript | Out-File -FilePath $tempSqlFile -Encoding UTF8

try {
    # Exécuter le script SQL
    $mysqlPath = "mysql"
    
    # Vérifier si mysql est disponible
    $mysqlExists = Get-Command $mysqlPath -ErrorAction SilentlyContinue
    if (-not $mysqlExists) {
        Write-Host "ERREUR: MySQL n'est pas trouvé dans le PATH" -ForegroundColor Red
        Write-Host "Veuillez ajouter MySQL au PATH ou spécifier le chemin complet" -ForegroundColor Red
        exit 1
    }
    
    # Exécuter le script
    $arguments = @(
        "-h", $mysqlHost,
        "-u", $mysqlUser,
        "-p$mysqlPasswordPlain",
        "-e", "source $tempSqlFile"
    )
    
    & $mysqlPath $arguments 2>&1 | ForEach-Object {
        if ($_ -match "ERROR") {
            Write-Host $_ -ForegroundColor Red
        } else {
            Write-Host $_ -ForegroundColor Green
        }
    }
    
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "  Table créée avec succès!                 " -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Vous pouvez maintenant:" -ForegroundColor Yellow
    Write-Host "1. Redémarrer le backend Spring Boot" -ForegroundColor White
    Write-Host "2. Créer une opération Compense_client, Appro_client ou nivellement" -ForegroundColor White
    Write-Host "3. Vérifier dans le module BANQUE que l'opération bancaire est créée" -ForegroundColor White
    
} catch {
    Write-Host ""
    Write-Host "ERREUR lors de la création de la table:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
} finally {
    # Nettoyer le fichier temporaire
    if (Test-Path $tempSqlFile) {
        Remove-Item $tempSqlFile -Force
    }
}

Write-Host ""
Write-Host "Appuyez sur une touche pour continuer..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
"@
