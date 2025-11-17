# Scripts d'automatisation pour les certificats SSL

Ce répertoire contient des scripts pour faciliter la configuration des certificats SSL/TLS.

## Scripts disponibles

### 1. `generate-self-signed-cert.sh` (Linux/Mac)

Génère un certificat SSL auto-signé pour le développement et les tests.

**Usage:**
```bash
sudo ./scripts/generate-self-signed-cert.sh [domaine]
```

**Exemple:**
```bash
sudo ./scripts/generate-self-signed-cert.sh reconciliation-app.local
```

**Ce que fait le script:**
- Crée le répertoire `/etc/ssl/reconciliation-app`
- Génère une clé privée RSA 2048 bits
- Génère un certificat auto-signé valide 365 jours
- Crée un fichier fullchain.pem
- Affiche les instructions pour configurer Nginx et Spring Boot

### 2. `generate-self-signed-cert.ps1` (Windows)

Version PowerShell du script de génération de certificat.

**Usage:**
```powershell
.\scripts\generate-self-signed-cert.ps1 [domaine]
```

**Exemple:**
```powershell
.\scripts\generate-self-signed-cert.ps1 reconciliation-app.local
```

**Ce que fait le script:**
- Crée le répertoire `C:\ssl\reconciliation-app`
- Génère un certificat avec OpenSSL (si disponible)
- Ou utilise `New-SelfSignedCertificate` (méthode Windows native)
- Exporte en format PFX pour IIS ou conversion

### 3. `setup-letsencrypt.sh` (Linux)

Configure Let's Encrypt avec Certbot pour la production.

**Usage:**
```bash
sudo ./scripts/setup-letsencrypt.sh domaine.com [email]
```

**Exemple:**
```bash
sudo ./scripts/setup-letsencrypt.sh reconciliation.example.com admin@example.com
```

**Prérequis:**
- Un domaine pointant vers le serveur
- Le port 80 accessible depuis Internet
- Accès root/sudo

**Ce que fait le script:**
- Installe Certbot et les dépendances
- Vérifie que le domaine pointe vers le serveur
- Obtient le certificat Let's Encrypt
- Configure le renouvellement automatique
- Affiche les instructions pour Nginx

### 4. `convert-cert-to-p12.sh` (Linux/Mac)

Convertit un certificat (.crt + .key) en format PKCS12 (.p12) pour Spring Boot.

**Usage:**
```bash
./scripts/convert-cert-to-p12.sh [chemin-cert]
```

**Exemple:**
```bash
./scripts/convert-cert-to-p12.sh /etc/ssl/reconciliation-app
```

**Ce que fait le script:**
- Convertit le certificat et la clé en format PKCS12
- Demande un mot de passe pour le keystore
- Crée le fichier `reconciliation-app.p12`
- Affiche les instructions pour Spring Boot

## Rendre les scripts exécutables (Linux/Mac)

```bash
chmod +x scripts/*.sh
```

## Exemples d'utilisation complète

### Scénario 1: Développement local avec certificat auto-signé

```bash
# 1. Générer le certificat
sudo ./scripts/generate-self-signed-cert.sh localhost

# 2. Convertir pour Spring Boot (optionnel)
./scripts/convert-cert-to-p12.sh

# 3. Configurer Nginx avec les chemins du certificat
# Éditez reconciliation-app/nginx.conf

# 4. Tester
curl -k https://localhost
```

### Scénario 2: Production avec Let's Encrypt

```bash
# 1. Configurer Let's Encrypt
sudo ./scripts/setup-letsencrypt.sh reconciliation.example.com admin@example.com

# 2. Mettre à jour Nginx
# Éditez reconciliation-app/nginx.conf avec les chemins Let's Encrypt

# 3. Recharger Nginx
sudo nginx -t
sudo systemctl reload nginx

# 4. Vérifier
curl https://reconciliation.example.com
```

### Scénario 3: Windows avec certificat auto-signé

```powershell
# 1. Générer le certificat
.\scripts\generate-self-signed-cert.ps1 localhost

# 2. Pour IIS: Le certificat est déjà dans le magasin Windows
# Pour Nginx: Utilisez les fichiers .key et .crt générés

# 3. Configurer Nginx avec les chemins Windows
# Éditez reconciliation-app/nginx.conf
```

## Dépannage

### Erreur: "Permission denied"

Sur Linux/Mac, utilisez `sudo` pour les scripts qui modifient `/etc/ssl/`.

### Erreur: "OpenSSL not found" (Windows)

Installez OpenSSL ou utilisez Git Bash qui l'inclut. Le script peut aussi utiliser `New-SelfSignedCertificate` (méthode Windows).

### Erreur: "Domain doesn't point to this server" (Let's Encrypt)

Vérifiez que votre domaine pointe bien vers l'IP de votre serveur avec:
```bash
dig votre-domaine.com
```

## Support

Consultez `GUIDE_CERTIFICAT_SSL.md` pour plus de détails et de documentation.

