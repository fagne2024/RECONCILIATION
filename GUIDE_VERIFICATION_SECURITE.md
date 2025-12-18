# Guide de Vérification de la Sécurité HTTP

## 🚀 Démarrage Rapide

### Vérification Automatique

Deux scripts sont disponibles pour vérifier automatiquement vos en-têtes de sécurité :

#### Windows (PowerShell)
```powershell
# Vérifier localhost
.\scripts\test-security-headers.ps1

# Vérifier un serveur distant
.\scripts\test-security-headers.ps1 -Url "https://reconciliation.intouchgroup.net"

# Mode verbose (afficher tous les en-têtes)
.\scripts\test-security-headers.ps1 -Url "https://reconciliation.intouchgroup.net" -Verbose
```

#### Linux / macOS (Bash)
```bash
# Rendre le script exécutable (première fois seulement)
chmod +x scripts/test-security-headers.sh

# Vérifier localhost
./scripts/test-security-headers.sh

# Vérifier un serveur distant
./scripts/test-security-headers.sh https://reconciliation.intouchgroup.net

# Mode verbose
./scripts/test-security-headers.sh https://reconciliation.intouchgroup.net verbose
```

## 📊 Interprétation des Résultats

### Scores
- **🏆 A+ (90-100%)** : Excellente sécurité
- **✅ A (80-89%)** : Très bonne sécurité
- **⚠️ B (70-79%)** : Bonne sécurité, améliorations recommandées
- **⚠️ C (60-69%)** : Sécurité acceptable, améliorations nécessaires
- **❌ D (< 60%)** : Sécurité insuffisante, action requise

### Symboles
- **✅ OK** : En-tête présent et correct
- **⚠️ PRÉSENT (valeur incorrecte)** : En-tête présent mais valeur à améliorer
- **❌ ABSENT** : En-tête manquant (critique)
- **⚠️ ABSENT (recommandé)** : En-tête manquant (non critique)

## 🔧 Vérification Manuelle

### Méthode 1 : curl (Ligne de commande)
```bash
# Afficher tous les en-têtes
curl -I https://reconciliation.intouchgroup.net

# Vérifier un en-tête spécifique
curl -I https://reconciliation.intouchgroup.net | grep -i "X-Frame-Options"

# Vérifier plusieurs en-têtes
curl -I https://reconciliation.intouchgroup.net | grep -iE "X-Frame-Options|Content-Security-Policy|Strict-Transport-Security"
```

### Méthode 2 : PowerShell (Windows)
```powershell
# Afficher tous les en-têtes
(Invoke-WebRequest -Uri "https://reconciliation.intouchgroup.net" -Method HEAD).Headers

# Vérifier un en-tête spécifique
(Invoke-WebRequest -Uri "https://reconciliation.intouchgroup.net" -Method HEAD).Headers["X-Frame-Options"]
```

### Méthode 3 : Navigateur Web
1. Ouvrir **DevTools** (F12)
2. Aller dans l'onglet **Network** (Réseau)
3. Recharger la page (F5)
4. Cliquer sur la première requête (généralement le document HTML)
5. Regarder les **Response Headers** (En-têtes de réponse)

### Méthode 4 : Outils en Ligne

#### Security Headers
1. Aller sur https://securityheaders.com/
2. Entrer l'URL : `https://reconciliation.intouchgroup.net`
3. Cliquer sur "Scan"
4. Obtenir un score de A+ à F avec détails

#### Mozilla Observatory
1. Aller sur https://observatory.mozilla.org/
2. Entrer l'URL
3. Cliquer sur "Scan Me"
4. Obtenir une analyse complète de sécurité

#### SSL Labs
1. Aller sur https://www.ssllabs.com/ssltest/
2. Entrer l'URL
3. Obtenir une analyse SSL/TLS complète

## 🎯 En-têtes à Vérifier

### Critiques (Doivent être présents)
- ✅ **X-Frame-Options**: DENY ou SAMEORIGIN
- ✅ **X-Content-Type-Options**: nosniff
- ✅ **X-XSS-Protection**: 1; mode=block
- ✅ **Referrer-Policy**: strict-origin-when-cross-origin
- ✅ **Permissions-Policy**: geolocation=(), microphone=(), etc.
- ✅ **Content-Security-Policy**: default-src 'self'; ...

### Recommandés
- ⚠️ **Strict-Transport-Security**: max-age=31536000; includeSubDomains (HTTPS uniquement)

### À Masquer
- ❌ **X-Powered-By**: Ne doit PAS être présent
- ⚠️ **Server**: Doit être minimal ou masqué

## 🛠️ Corriger les Problèmes

### En-tête manquant sur Nginx
Ajouter dans le bloc `server {}` :
```nginx
add_header X-Frame-Options "DENY" always;
```

### En-tête manquant sur Apache
Ajouter dans le VirtualHost :
```apache
Header always set X-Frame-Options "DENY"
```

### En-tête manquant sur Spring Boot
Modifier `SecurityConfig.java` :
```java
http.headers(headers -> headers
    .frameOptions(frameOptions -> frameOptions.deny())
);
```

### Masquer X-Powered-By

#### Nginx
```nginx
proxy_hide_header X-Powered-By;
```

#### Apache
```apache
Header always unset X-Powered-By
```

#### Spring Boot
Ajouter dans `application.properties` :
```properties
server.server-header=
```

## 📋 Checklist de Déploiement

Avant de déployer en production :

- [ ] Tous les en-têtes de sécurité critiques sont configurés
- [ ] Score de sécurité >= 80% (A)
- [ ] X-Powered-By est masqué
- [ ] HSTS est activé (si HTTPS)
- [ ] Tests effectués avec les scripts fournis
- [ ] Tests effectués avec SecurityHeaders.com
- [ ] Tests effectués avec Mozilla Observatory
- [ ] Tests SSL/TLS avec SSL Labs (si HTTPS)
- [ ] Vérification manuelle dans le navigateur

## 🔄 Maintenance Continue

### Vérifications Régulières
- **Hebdomadaire** : Vérifier les en-têtes après chaque déploiement
- **Mensuel** : Scanner avec SecurityHeaders.com et Mozilla Observatory
- **Trimestriel** : Réviser et mettre à jour la politique CSP

### Surveillance
```bash
# Script de surveillance automatique (Linux/Mac)
# À ajouter dans cron pour exécution quotidienne
0 6 * * * /path/to/scripts/test-security-headers.sh https://reconciliation.intouchgroup.net >> /var/log/security-headers.log 2>&1
```

```powershell
# Script de surveillance automatique (Windows)
# À ajouter dans le Planificateur de tâches
.\scripts\test-security-headers.ps1 -Url "https://reconciliation.intouchgroup.net" | Out-File -Append C:\logs\security-headers.log
```

## 📞 Ressources et Aide

### Documentation
- **SECURITE_HTTP_HEADERS.md** : Documentation complète des en-têtes
- **Scripts de test** : `scripts/test-security-headers.*`

### Liens Utiles
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [Content Security Policy Reference](https://content-security-policy.com/)
- [Can I Use](https://caniuse.com/) : Compatibilité navigateur

### Support
En cas de problème :
1. Consulter les logs du serveur web (Nginx/Apache)
2. Vérifier la configuration avec `nginx -t` ou `apachectl configtest`
3. Tester localement avant de déployer en production
4. Consulter la documentation complète dans SECURITE_HTTP_HEADERS.md

## 🎓 Exemples de Configurations Complètes

### Configuration Nginx Complète
```nginx
server {
    listen 443 ssl http2;
    server_name example.com;
    
    # SSL
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    
    # En-têtes de sécurité
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'" always;
    
    server_tokens off;
    proxy_hide_header X-Powered-By;
    
    # ... reste de la configuration
}
```

### Configuration Apache Complète
```apache
<VirtualHost *:443>
    ServerName example.com
    
    SSLEngine on
    SSLCertificateFile /path/to/cert.pem
    SSLCertificateKeyFile /path/to/key.pem
    SSLProtocol TLSv1.2 TLSv1.3
    
    # En-têtes de sécurité
    Header always set X-Frame-Options "DENY"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Permissions-Policy "geolocation=(), microphone=(), camera=()"
    Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'"
    
    Header always unset X-Powered-By
    ServerTokens Prod
    
    # ... reste de la configuration
</VirtualHost>
```

---

**Dernière mise à jour :** 18 décembre 2025



