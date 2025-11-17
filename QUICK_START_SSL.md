# Démarrage rapide - Configuration SSL

Guide rapide pour configurer SSL/TLS en 5 minutes.

## Option 1 : Certificat auto-signé (Développement)

### Sur Linux/Mac

```bash
# 1. Générer le certificat
sudo ./scripts/generate-self-signed-cert.sh localhost

# 2. Mettre à jour nginx.conf
# Éditez reconciliation-app/nginx.conf et décommentez les lignes certificat auto-signé

# 3. Recharger Nginx
sudo nginx -t
sudo systemctl reload nginx

# 4. Tester (l'avertissement est normal avec un certificat auto-signé)
curl -k https://localhost
```

### Sur Windows

```powershell
# 1. Générer le certificat
.\scripts\generate-self-signed-cert.ps1 localhost

# 2. Mettre à jour nginx.conf avec les chemins Windows
# Éditez reconciliation-app/nginx.conf
# Utilisez: C:/ssl/reconciliation-app/reconciliation-app.fullchain.pem

# 3. Redémarrer Nginx
```

## Option 2 : Let's Encrypt (Production)

```bash
# 1. Configurer Let's Encrypt
sudo ./scripts/setup-letsencrypt.sh votre-domaine.com votre-email@example.com

# 2. Mettre à jour nginx.conf
# Les chemins Let's Encrypt sont déjà configurés par défaut

# 3. Recharger Nginx
sudo nginx -t
sudo systemctl reload nginx

# 4. Tester
curl https://votre-domaine.com
```

## Configuration Nginx

Éditez `reconciliation-app/nginx.conf` :

1. **Pour certificat auto-signé** : Décommentez les lignes 16-17, commentez les lignes 21-22
2. **Pour Let's Encrypt** : Laissez les lignes 21-22 actives (par défaut)

## Configuration Spring Boot (Optionnel)

Si vous voulez HTTPS directement dans Spring Boot :

```bash
# 1. Convertir le certificat en PKCS12
./scripts/convert-cert-to-p12.sh

# 2. Copier le fichier .p12 dans le projet
cp reconciliation-app.p12 reconciliation-app/backend/src/main/resources/

# 3. Configurer application.properties
# Copiez application-ssl.properties.example vers application-ssl.properties
# Modifiez le mot de passe et les chemins

# 4. Démarrer avec le profil SSL
cd reconciliation-app/backend
mvn spring-boot:run -Dspring-boot.run.profiles=ssl
```

## Vérification

```bash
# Vérifier le certificat
openssl s_client -connect localhost:443 -servername localhost

# Tester avec curl
curl -I https://localhost

# Tester dans le navigateur
# Ouvrez https://localhost (acceptez l'avertissement pour certificat auto-signé)
```

## Documentation complète

Pour plus de détails, consultez :
- `GUIDE_CERTIFICAT_SSL.md` - Guide complet
- `scripts/README_SCRIPTS.md` - Documentation des scripts

## Besoin d'aide ?

- Vérifiez les logs Nginx : `sudo tail -f /var/log/nginx/error.log`
- Testez la configuration : `sudo nginx -t`
- Consultez la section Dépannage dans `GUIDE_CERTIFICAT_SSL.md`

