# Guide de Configuration SSL/TLS pour l'Application de Réconciliation

Ce guide vous explique comment configurer un certificat SSL/TLS pour sécuriser votre application avec HTTPS.

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Option 1 : Certificat auto-signé (Développement/Test)](#option-1--certificat-auto-signé-développementtest)
3. [Option 2 : Let's Encrypt (Production)](#option-2--lets-encrypt-production)
4. [Configuration du Backend Spring Boot](#configuration-du-backend-spring-boot)
5. [Configuration Nginx](#configuration-nginx)
6. [Configuration Windows](#configuration-windows)
7. [Vérification et Tests](#vérification-et-tests)
8. [Dépannage](#dépannage)

---

## Vue d'ensemble

Votre application utilise :
- **Backend** : Spring Boot sur le port 8080
- **Frontend** : Angular avec Nginx
- **Architecture** : Nginx comme reverse proxy vers le backend

Pour sécuriser l'application, vous avez deux options :
1. **Certificat auto-signé** : Pour le développement et les tests (gratuit, mais affiche un avertissement dans le navigateur)
2. **Let's Encrypt** : Pour la production (gratuit, reconnu par tous les navigateurs)

---

## Option 1 : Certificat auto-signé (Développement/Test)

### Sur Linux/Mac

#### Étape 1 : Créer un répertoire pour les certificats

```bash
sudo mkdir -p /etc/ssl/reconciliation-app
sudo chmod 700 /etc/ssl/reconciliation-app
cd /etc/ssl/reconciliation-app
```

#### Étape 2 : Générer le certificat auto-signé

```bash
# Générer la clé privée
sudo openssl genrsa -out reconciliation-app.key 2048

# Générer le certificat (valide 365 jours)
sudo openssl req -new -x509 -key reconciliation-app.key -out reconciliation-app.crt -days 365 -subj "/C=CI/ST=Abidjan/L=Abidjan/O=Intouchgroup/OU=IT/CN=reconciliation-app.local"

# Créer un fichier de chaîne complète (fullchain)
sudo cp reconciliation-app.crt reconciliation-app.fullchain.pem

# Définir les permissions appropriées
sudo chmod 600 reconciliation-app.key
sudo chmod 644 reconciliation-app.crt reconciliation-app.fullchain.pem
```

**Note** : Remplacez les informations dans `-subj` par vos propres informations :
- `C` : Code pays (CI = Côte d'Ivoire)
- `ST` : État/Région
- `L` : Ville
- `O` : Organisation
- `OU` : Unité organisationnelle
- `CN` : Nom commun (domaine ou IP)

#### Étape 3 : Pour un domaine spécifique

Si vous avez un domaine (ex: `reconciliation.example.com`), utilisez :

```bash
sudo openssl req -new -x509 -key reconciliation-app.key -out reconciliation-app.crt -days 365 \
  -subj "/C=CI/ST=Abidjan/L=Abidjan/O=Intouchgroup/OU=IT/CN=reconciliation.example.com"
```

### Sur Windows

#### Étape 1 : Installer OpenSSL

Si OpenSSL n'est pas installé, téléchargez-le depuis :
- https://slproweb.com/products/Win32OpenSSL.html
- Ou utilisez Git Bash qui inclut OpenSSL

#### Étape 2 : Créer un répertoire pour les certificats

```powershell
New-Item -ItemType Directory -Path "C:\ssl\reconciliation-app" -Force
cd C:\ssl\reconciliation-app
```

#### Étape 3 : Générer le certificat

Dans PowerShell ou Git Bash :

```bash
# Générer la clé privée
openssl genrsa -out reconciliation-app.key 2048

# Générer le certificat
openssl req -new -x509 -key reconciliation-app.key -out reconciliation-app.crt -days 365 \
  -subj "/C=CI/ST=Abidjan/L=Abidjan/O=Intouchgroup/OU=IT/CN=reconciliation-app.local"

# Créer le fullchain
copy reconciliation-app.crt reconciliation-app.fullchain.pem
```

---

## Option 2 : Let's Encrypt (Production)

Let's Encrypt fournit des certificats gratuits reconnus par tous les navigateurs. Ils doivent être renouvelés tous les 90 jours (automatisable).

### Prérequis

- Un domaine pointant vers votre serveur (ex: `reconciliation.example.com`)
- Le port 80 accessible depuis Internet (pour la validation)
- Accès root/sudo au serveur

### Installation sur Linux (Ubuntu/Debian)

#### Étape 1 : Installer Certbot

```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx -y
```

#### Étape 2 : Obtenir le certificat

**Méthode 1 : Avec Nginx (Recommandé)**

```bash
# Certbot configure automatiquement Nginx
sudo certbot --nginx -d reconciliation.example.com -d www.reconciliation.example.com
```

**Méthode 2 : Standalone (si Nginx n'est pas encore configuré)**

```bash
# Arrêter Nginx temporairement
sudo systemctl stop nginx

# Obtenir le certificat
sudo certbot certonly --standalone -d reconciliation.example.com -d www.reconciliation.example.com

# Redémarrer Nginx
sudo systemctl start nginx
```

#### Étape 3 : Configuration automatique du renouvellement

```bash
# Tester le renouvellement
sudo certbot renew --dry-run

# Le renouvellement se fait automatiquement via cron
# Vérifier avec :
sudo systemctl status certbot.timer
```

Les certificats Let's Encrypt sont stockés dans :
- Certificat : `/etc/letsencrypt/live/votre-domaine.com/fullchain.pem`
- Clé privée : `/etc/letsencrypt/live/votre-domaine.com/privkey.pem`

---

## Configuration du Backend Spring Boot

### Option 1 : HTTPS direct dans Spring Boot

#### Étape 1 : Copier les certificats dans le projet

```bash
# Sur Linux
sudo cp /etc/ssl/reconciliation-app/reconciliation-app.crt reconciliation-app/backend/src/main/resources/
sudo cp /etc/ssl/reconciliation-app/reconciliation-app.key reconciliation-app/backend/src/main/resources/
sudo chmod 644 reconciliation-app/backend/src/main/resources/reconciliation-app.*
```

#### Étape 2 : Configurer application.properties

Ajoutez dans `application.properties` :

```properties
# Configuration HTTPS
server.ssl.enabled=true
server.ssl.key-store=classpath:reconciliation-app.p12
server.ssl.key-store-password=changeit
server.ssl.key-store-type=PKCS12
server.ssl.key-alias=reconciliation-app
server.port=8443

# Redirection HTTP vers HTTPS (optionnel)
server.http.port=8080
```

#### Étape 3 : Convertir le certificat en format PKCS12

```bash
# Convertir .crt et .key en .p12
openssl pkcs12 -export \
  -in reconciliation-app.crt \
  -inkey reconciliation-app.key \
  -out reconciliation-app.p12 \
  -name reconciliation-app \
  -password pass:changeit

# Copier dans resources
cp reconciliation-app.p12 reconciliation-app/backend/src/main/resources/
```

**Important** : Changez le mot de passe `changeit` par un mot de passe fort !

### Option 2 : HTTPS via Nginx (Recommandé)

Cette option est recommandée car :
- Nginx gère SSL/TLS (meilleure performance)
- Spring Boot reste en HTTP interne
- Plus facile à maintenir

**Configuration** : Voir section "Configuration Nginx" ci-dessous.

---

## Configuration Nginx

### Configuration complète avec SSL

Mettez à jour `reconciliation-app/nginx.conf` :

```nginx
# Redirection HTTP vers HTTPS
server {
    listen 80;
    server_name reconciliation.example.com www.reconciliation.example.com;
    
    # Pour Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # Redirection vers HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# Configuration HTTPS
server {
    listen 443 ssl http2;
    server_name reconciliation.example.com www.reconciliation.example.com;
    
    # Certificats SSL
    # Pour certificat auto-signé :
    ssl_certificate /etc/ssl/reconciliation-app/reconciliation-app.fullchain.pem;
    ssl_certificate_key /etc/ssl/reconciliation-app/reconciliation-app.key;
    
    # Pour Let's Encrypt (décommentez et utilisez ces lignes) :
    # ssl_certificate /etc/letsencrypt/live/reconciliation.example.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/reconciliation.example.com/privkey.pem;
    
    # Configuration SSL sécurisée
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;
    
    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    # Pour Let's Encrypt uniquement :
    # ssl_trusted_certificate /etc/letsencrypt/live/reconciliation.example.com/chain.pem;
    # resolver 8.8.8.8 8.8.4.4 valid=300s;
    # resolver_timeout 5s;
    
    # Headers de sécurité
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Logs
    access_log /var/log/nginx/reconciliation-app.access.log;
    error_log /var/log/nginx/reconciliation-app.error.log;
    
    # Configuration pour les fichiers statiques Angular
    location / {
        root /var/www/reconciliation-app/frontend/dist/csv-reconciliation;
        try_files $uri $uri/ /index.html;
        
        # Cache pour les assets statiques
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API Backend - Reverse proxy vers Spring Boot
    location /api/ {
        proxy_pass http://localhost:8080/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $server_name;
        
        # Timeouts pour les gros fichiers
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        
        # Buffer pour les gros fichiers
        proxy_request_buffering off;
        proxy_buffering off;
    }
    
    # Upload de fichiers - Pas de limite de taille pour Nginx
    client_max_body_size 500M;
    
    # Health check
    location /health {
        proxy_pass http://localhost:8080/actuator/health;
        proxy_set_header Host $host;
        access_log off;
    }
}
```

### Appliquer la configuration

```bash
# Tester la configuration
sudo nginx -t

# Recharger Nginx
sudo systemctl reload nginx
```

---

## Configuration Windows

### Option 1 : Avec IIS (Internet Information Services)

#### Étape 1 : Créer un certificat auto-signé

```powershell
# Créer un certificat auto-signé
$cert = New-SelfSignedCertificate `
    -DnsName "reconciliation-app.local", "localhost" `
    -CertStoreLocation "cert:\LocalMachine\My" `
    -KeyAlgorithm RSA `
    -KeyLength 2048 `
    -NotAfter (Get-Date).AddYears(1)

# Exporter le certificat
$pwd = ConvertTo-SecureString -String "changeit" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath "C:\ssl\reconciliation-app.pfx" -Password $pwd
```

#### Étape 2 : Importer dans IIS

1. Ouvrez **IIS Manager**
2. Sélectionnez votre serveur → **Server Certificates**
3. **Import** → Sélectionnez le fichier `.pfx` → Entrez le mot de passe
4. Dans votre site → **Bindings** → **Add** → HTTPS → Sélectionnez le certificat

### Option 2 : Avec Nginx sur Windows

Suivez les mêmes étapes que pour Linux, mais adaptez les chemins :

```nginx
ssl_certificate C:/ssl/reconciliation-app/reconciliation-app.fullchain.pem;
ssl_certificate_key C:/ssl/reconciliation-app/reconciliation-app.key;
```

---

## Vérification et Tests

### 1. Vérifier le certificat

```bash
# Vérifier le certificat
openssl x509 -in reconciliation-app.crt -text -noout

# Vérifier la connexion SSL
openssl s_client -connect localhost:443 -servername reconciliation.example.com
```

### 2. Tester avec curl

```bash
# Test HTTPS
curl -k https://localhost/api/health

# Test avec vérification du certificat
curl https://reconciliation.example.com/api/health
```

### 3. Tester dans le navigateur

- Ouvrez `https://votre-domaine.com`
- Vérifiez l'icône de cadenas dans la barre d'adresse
- Pour un certificat auto-signé, vous devrez accepter l'exception de sécurité

### 4. Vérifier la configuration SSL

Utilisez des outils en ligne :
- https://www.ssllabs.com/ssltest/
- https://sslchecker.com/

### 5. Vérifier les headers de sécurité

```bash
curl -I https://reconciliation.example.com
```

---

## Dépannage

### Problème : "SSL certificate problem"

**Solution** : Vérifiez que :
- Le certificat est valide (pas expiré)
- Le nom du domaine correspond au CN du certificat
- Les permissions sur les fichiers sont correctes (600 pour la clé, 644 pour le certificat)

### Problème : Nginx ne démarre pas

```bash
# Vérifier les logs
sudo tail -f /var/log/nginx/error.log

# Vérifier la syntaxe
sudo nginx -t
```

### Problème : Certificat Let's Encrypt expiré

```bash
# Renouveler manuellement
sudo certbot renew

# Vérifier le statut
sudo certbot certificates
```

### Problème : Erreur "Permission denied" sur les certificats

```bash
# Vérifier les permissions
ls -la /etc/ssl/reconciliation-app/

# Corriger si nécessaire
sudo chmod 600 /etc/ssl/reconciliation-app/reconciliation-app.key
sudo chmod 644 /etc/ssl/reconciliation-app/reconciliation-app.crt
```

### Problème : Spring Boot ne démarre pas avec HTTPS

- Vérifiez que le fichier `.p12` existe dans `src/main/resources`
- Vérifiez le mot de passe dans `application.properties`
- Vérifiez les logs Spring Boot pour plus de détails

---

## Bonnes pratiques de sécurité

1. **Renouvellement automatique** : Configurez un cron job pour Let's Encrypt
2. **Permissions strictes** : Les clés privées doivent être en 600
3. **Mots de passe forts** : Utilisez des mots de passe complexes pour les keystores
4. **Mise à jour régulière** : Maintenez Nginx et OpenSSL à jour
5. **Monitoring** : Surveillez l'expiration des certificats
6. **Backup** : Sauvegardez les certificats et clés privées de manière sécurisée

---

## Scripts d'automatisation

Voir les fichiers :
- `scripts/generate-self-signed-cert.sh` (Linux/Mac)
- `scripts/generate-self-signed-cert.ps1` (Windows)
- `scripts/setup-letsencrypt.sh` (Linux)

---

## Support

Pour toute question ou problème, consultez :
- Documentation Nginx : https://nginx.org/en/docs/
- Documentation Let's Encrypt : https://letsencrypt.org/docs/
- Documentation Spring Boot SSL : https://docs.spring.io/spring-boot/docs/current/reference/html/howto.html#howto.webserver.configure-ssl

