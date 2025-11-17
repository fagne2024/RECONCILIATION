# Script PowerShell pour générer un certificat SSL auto-signé pour l'application de réconciliation
# Usage: .\generate-self-signed-cert.ps1 [domaine]

param(
    [string]$Domain = "reconciliation-app.local",
    [int]$Days = 365,
    [int]$KeySize = 2048
)

$ErrorActionPreference = "Stop"

Write-Host "=== Génération de certificat SSL auto-signé ===" -ForegroundColor Green
Write-Host "Domaine: $Domain"
Write-Host "Durée de validité: $Days jours"
Write-Host ""

# Configuration
$CertDir = "C:\ssl\reconciliation-app"
$KeyFile = "$CertDir\reconciliation-app.key"
$CertFile = "$CertDir\reconciliation-app.crt"
$FullchainFile = "$CertDir\reconciliation-app.fullchain.pem"

# Créer le répertoire si nécessaire
if (-not (Test-Path $CertDir)) {
    Write-Host "Création du répertoire $CertDir..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $CertDir -Force | Out-Null
}

# Vérifier si OpenSSL est disponible
$opensslPath = $null
if (Get-Command openssl -ErrorAction SilentlyContinue) {
    $opensslPath = "openssl"
} elseif (Test-Path "C:\Program Files\Git\usr\bin\openssl.exe") {
    $opensslPath = "C:\Program Files\Git\usr\bin\openssl.exe"
} elseif (Test-Path "C:\OpenSSL-Win64\bin\openssl.exe") {
    $opensslPath = "C:\OpenSSL-Win64\bin\openssl.exe"
} else {
    Write-Host "Erreur: OpenSSL n'est pas trouvé." -ForegroundColor Red
    Write-Host "Options:" -ForegroundColor Yellow
    Write-Host "1. Installer Git Bash (inclut OpenSSL)"
    Write-Host "2. Installer OpenSSL depuis: https://slproweb.com/products/Win32OpenSSL.html"
    Write-Host "3. Utiliser la méthode avec New-SelfSignedCertificate (voir ci-dessous)"
    Write-Host ""
    
    $useWindowsCert = Read-Host "Utiliser New-SelfSignedCertificate (Windows) à la place? (O/N)"
    if ($useWindowsCert -eq "O" -or $useWindowsCert -eq "o") {
        Generate-WindowsCertificate -Domain $Domain -Days $Days
        exit 0
    } else {
        exit 1
    }
}

# Demander les informations pour le certificat
Write-Host "Informations pour le certificat:" -ForegroundColor Yellow
$Country = Read-Host "Pays (code à 2 lettres, ex: CI)"
if ([string]::IsNullOrWhiteSpace($Country)) { $Country = "CI" }

$State = Read-Host "État/Région (ex: Abidjan)"
if ([string]::IsNullOrWhiteSpace($State)) { $State = "Abidjan" }

$City = Read-Host "Ville (ex: Abidjan)"
if ([string]::IsNullOrWhiteSpace($City)) { $City = "Abidjan" }

$Org = Read-Host "Organisation (ex: Intouchgroup)"
if ([string]::IsNullOrWhiteSpace($Org)) { $Org = "Intouchgroup" }

$OU = Read-Host "Unité organisationnelle (ex: IT)"
if ([string]::IsNullOrWhiteSpace($OU)) { $OU = "IT" }

# Changer vers le répertoire des certificats
Push-Location $CertDir

try {
    # Générer la clé privée
    Write-Host ""
    Write-Host "Génération de la clé privée..." -ForegroundColor Green
    & $opensslPath genrsa -out reconciliation-app.key $KeySize
    
    # Générer le certificat
    Write-Host "Génération du certificat..." -ForegroundColor Green
    $subject = "/C=$Country/ST=$State/L=$City/O=$Org/OU=$OU/CN=$Domain"
    & $opensslPath req -new -x509 `
        -key reconciliation-app.key `
        -out reconciliation-app.crt `
        -days $Days `
        -subj $subject
    
    # Créer le fullchain
    Write-Host "Création du fichier fullchain..." -ForegroundColor Green
    Copy-Item reconciliation-app.crt reconciliation-app.fullchain.pem
    
    # Afficher les informations du certificat
    Write-Host ""
    Write-Host "=== Certificat généré avec succès ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "Fichiers créés:"
    Write-Host "  - Clé privée: $KeyFile"
    Write-Host "  - Certificat: $CertFile"
    Write-Host "  - Fullchain: $FullchainFile"
    Write-Host ""
    
    # Afficher les détails du certificat
    Write-Host "Détails du certificat:" -ForegroundColor Green
    & $opensslPath x509 -in reconciliation-app.crt -text -noout | Select-String -Pattern "Subject:"
    
    # Instructions pour Nginx
    Write-Host ""
    Write-Host "=== Configuration Nginx ===" -ForegroundColor Yellow
    Write-Host "Ajoutez ces lignes dans votre configuration Nginx:"
    Write-Host ""
    Write-Host "ssl_certificate $($FullchainFile.Replace('\', '/'));"
    Write-Host "ssl_certificate_key $($KeyFile.Replace('\', '/'));"
    Write-Host ""
    
} finally {
    Pop-Location
}

Write-Host "Terminé!" -ForegroundColor Green

# Fonction pour générer un certificat Windows avec New-SelfSignedCertificate
function Generate-WindowsCertificate {
    param(
        [string]$Domain,
        [int]$Days
    )
    
    Write-Host ""
    Write-Host "=== Génération avec New-SelfSignedCertificate ===" -ForegroundColor Green
    
    $CertDir = "C:\ssl\reconciliation-app"
    if (-not (Test-Path $CertDir)) {
        New-Item -ItemType Directory -Path $CertDir -Force | Out-Null
    }
    
    # Créer le certificat
    Write-Host "Création du certificat..." -ForegroundColor Green
    $cert = New-SelfSignedCertificate `
        -DnsName $Domain, "localhost" `
        -CertStoreLocation "cert:\LocalMachine\My" `
        -KeyAlgorithm RSA `
        -KeyLength 2048 `
        -NotAfter (Get-Date).AddDays($Days) `
        -FriendlyName "Reconciliation App SSL Certificate"
    
    $thumbprint = $cert.Thumbprint
    
    # Exporter en PFX
    $pfxPath = "$CertDir\reconciliation-app.pfx"
    $pwd = Read-Host "Entrez un mot de passe pour le fichier PFX" -AsSecureString
    Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $pwd | Out-Null
    
    # Exporter en CER (certificat public)
    $cerPath = "$CertDir\reconciliation-app.cer"
    Export-Certificate -Cert $cert -FilePath $cerPath | Out-Null
    
    Write-Host ""
    Write-Host "=== Certificat généré avec succès ===" -ForegroundColor Green
    Write-Host "Fichiers créés:"
    Write-Host "  - PFX: $pfxPath"
    Write-Host "  - CER: $cerPath"
    Write-Host "  - Thumbprint: $thumbprint"
    Write-Host ""
    Write-Host "Le certificat a été installé dans le magasin LocalMachine\My"
    Write-Host "Vous pouvez l'utiliser dans IIS ou le convertir pour Nginx"
    Write-Host ""
}

