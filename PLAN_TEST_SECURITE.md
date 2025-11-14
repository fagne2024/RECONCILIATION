# 🔒 Plan de Test de Sécurité - Application de Réconciliation

## 📋 Vue d'ensemble

Ce document présente un plan complet de tests de sécurité pour l'application de réconciliation financière, couvrant le frontend Angular, le backend Spring Boot, les services Node.js/Express, et la base de données MySQL.

---

## 🎯 Objectifs des Tests de Sécurité

1. **Identifier les vulnérabilités** dans l'application
2. **Valider les contrôles d'accès** et d'authentification
3. **Tester la résistance** aux attaques courantes (OWASP Top 10)
4. **Vérifier la configuration** de sécurité
5. **Assurer la protection** des données sensibles
6. **Évaluer la conformité** aux bonnes pratiques de sécurité

---

## 🔍 1. AUDIT DE SÉCURITÉ INITIAL

### 1.1 Analyse du Code (Code Review)

**Outils recommandés :**
- **SonarQube** - Analyse statique du code (Java, TypeScript)
  - Installation : `docker run -d -p 9000:9000 sonarqube`
  - Configuration : Analyser le code avec SonarQube Scanner
- **Semgrep** - Détection de patterns de sécurité
  - Installation : `pip install semgrep`
  - Usage : `semgrep --config=auto ./reconciliation-app`
- **ESLint Security Plugin** - Pour le code Angular/TypeScript
  - Installation : `npm install --save-dev eslint-plugin-security`
- **SpotBugs** - Analyse statique Java
  - Inclusion dans pom.xml avec plugin Maven

**Points à vérifier :**
- ✅ Stockage des mots de passe (actuellement en clair ❌)
- ✅ Gestion des secrets et credentials
- ✅ Validation des entrées utilisateur
- ✅ Gestion des erreurs (pas d'exposition d'informations)
- ✅ Injection SQL potentielle
- ✅ Logs et journalisation

---

## 🔐 2. TESTS D'AUTHENTIFICATION ET D'AUTORISATION

### 2.1 Tests d'Authentification

**Outils :**
- **Burp Suite Community/Professional** - Proxy et analyse de sécurité
  - Téléchargement : https://portswigger.net/burp
  - Tests manuels des endpoints d'authentification
- **OWASP ZAP (Zed Attack Proxy)** - Scanner de sécurité web gratuit
  - Installation : `docker run -t owasp/zap2docker-stable zap-baseline.py -t http://localhost:8080`
  - Mode automatique et manuel
- **Postman** - Tests API avec scripts de sécurité
  - Collection de tests d'authentification

**Tests à effectuer :**

1. **Force brute sur login**
   ```bash
   # Hydra - Attaque par force brute
   hydra -l admin -P /usr/share/wordlists/rockyou.txt localhost http-post-form "/api/auth/login:username=^USER^&password=^PASS^:error"
   ```

2. **Tests de mots de passe faibles**
   - Vérifier les politiques de mots de passe
   - Tester les mots de passe communs
   - Vérifier la limitation de tentatives

3. **Tests de session**
   - Vérifier l'invalidation de session au logout
   - Tester la fixation de session
   - Vérifier le timeout de session

4. **Bypass d'authentification**
   - Tester les endpoints sans authentification
   - Vérifier les JWT/sessions invalides
   - Tester les tokens expirés

### 2.2 Tests d'Autorisation

**Outils :**
- **Burp Suite** - Tests manuels d'accès
- **Custom scripts Python** - Automatisation des tests

**Tests à effectuer :**

1. **Contournement de contrôle d'accès (IDOR)**
   - Accès direct aux ressources d'autres utilisateurs
   - Modification de paramètres URL (ex: `/api/users/{id}`)
   
2. **Tests de privilèges**
   - Utilisateur standard essayant d'accéder aux fonctions admin
   - Tests horizontaux et verticaux d'autorisation

3. **API sans authentification**
   ```bash
   # Lister toutes les routes et tester l'accès non authentifié
   curl -X GET http://localhost:8080/api/users
   curl -X GET http://localhost:8080/api/operations
   ```

---

## 🛡️ 3. TESTS D'INJECTION

### 3.1 Injection SQL

**Outils :**
- **SQLMap** - Scanner automatisé d'injection SQL
  - Installation : `pip install sqlmap`
  - Usage : `sqlmap -u "http://localhost:8080/api/users?id=1" --batch`
- **NoSQLMap** - Pour les bases NoSQL (si applicable)
- **SQL Injection Scanner (Burp Suite)**

**Tests à effectuer :**
```bash
# Tests SQLMap
sqlmap -u "http://localhost:8080/api/operations?param=1" --dbs
sqlmap -u "http://localhost:8080/api/operations?param=1" --tables
sqlmap -u "http://localhost:8080/api/operations?param=1" --dump

# Tests manuels
curl "http://localhost:8080/api/users?id=1' OR '1'='1"
curl "http://localhost:8080/api/users?id=1 UNION SELECT * FROM users"
```

### 3.2 Injection de Commande (Command Injection)

**Outils :**
- **Burp Suite** - Tests manuels
- **Custom scripts** - Tests automatisés

**Tests à effectuer :**
- Upload de fichiers avec noms suspects
- Paramètres de commande système
- File Watcher Service (check injection dans les noms de fichiers)

### 3.3 Injection NoSQL (Services Node.js)

**Outils :**
- **NoSQLMap**
- Tests manuels avec payloads NoSQL

**Tests à effectuer :**
```javascript
// Exemples de payloads NoSQL
{"username": {"$ne": null}, "password": {"$ne": null}}
{"username": {"$regex": ".*"}, "password": {"$regex": ".*"}}
```

### 3.4 XSS (Cross-Site Scripting)

**Outils :**
- **XSSer** - Scanner automatisé XSS
- **Burp Suite** - Tests manuels
- **OWASP ZAP** - Détection automatique

**Tests à effectuer :**
```html
<!-- Tests XSS Réfléchi -->
<script>alert('XSS')</script>
<img src=x onerror=alert('XSS')>
<svg/onload=alert('XSS')>

<!-- Tests XSS Stocké -->
Injecter dans les champs de formulaire, uploads, etc.
```

---

## 🌐 4. TESTS DE CONFIGURATION

### 4.1 Configuration CORS

**Outils :**
- **Burp Suite**
- **Browser DevTools**
- **curl**

**Tests à effectuer :**
```bash
# Tester les origines non autorisées
curl -H "Origin: https://evil.com" -H "Access-Control-Request-Method: POST" \
  -X OPTIONS http://localhost:8080/api/users

# Tester les méthodes non autorisées
curl -X TRACE http://localhost:8080/api/users
curl -X DELETE http://localhost:8080/api/users/1
```

**Problèmes identifiés :**
- ❌ CORS ouvert (`*`) dans `ReleveBancaireController` et `SqlController`
- ⚠️ CORS limité à `localhost:4200` mais devrait être configuré pour la production

### 4.2 Headers de Sécurité

**Outils :**
- **Security Headers Scanner** - https://securityheaders.com/
- **curl** - Vérification manuelle

**Tests à effectuer :**
```bash
# Vérifier les headers de sécurité
curl -I http://localhost:8080/api/auth/login

# Headers attendus :
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# X-XSS-Protection: 1; mode=block
# Strict-Transport-Security: max-age=31536000
# Content-Security-Policy: default-src 'self'
```

### 4.3 Configuration SSL/TLS

**Outils :**
- **SSL Labs SSL Test** - https://www.ssllabs.com/ssltest/
- **testssl.sh** - Scanner SSL/TLS
  - Installation : `git clone https://github.com/drwetter/testssl.sh.git`
  - Usage : `./testssl.sh https://votre-domaine.com`

**Tests à effectuer :**
- Version TLS (min TLS 1.2 recommandé)
- Certificats valides
- Cipher suites sécurisés
- Forward Secrecy

### 4.4 Exposition d'Informations

**Outils :**
- **Burp Suite**
- **Nikto** - Scanner de vulnérabilités web
  - Installation : `apt-get install nikto` ou `docker run --rm sullo/nikto`
  - Usage : `nikto -h http://localhost:8080`

**Tests à effectuer :**
```bash
# Vérifier l'exposition d'informations
curl http://localhost:8080/actuator  # Spring Boot Actuator
curl http://localhost:8080/swagger-ui.html  # Documentation API
curl http://localhost:8080/h2-console  # Console H2
curl http://localhost:8080/robots.txt
curl http://localhost:8080/.git  # Répertoire Git exposé
```

---

## 📦 5. TESTS DES DÉPENDANCES

### 5.1 Scan des Vulnérabilités des Dépendances

**Outils :**
- **OWASP Dependency-Check** - Scanner de dépendances Java/Node
  - Installation : `docker pull owasp/dependency-check`
  - Usage Java :
    ```bash
    dependency-check.sh --project "Reconciliation App" --scan ./reconciliation-app/backend
    ```
  - Usage Node :
    ```bash
    dependency-check.sh --project "Reconciliation Frontend" --scan ./reconciliation-app/frontend --enableNodeAudit
    ```
- **Snyk** - Scanner de vulnérabilités
  - Installation : `npm install -g snyk`
  - Usage : `snyk test`
- **npm audit** - Pour les dépendances Node.js
  - Usage : `npm audit` dans le répertoire frontend
- **Maven Dependency Plugin + OWASP** - Pour Java
  - Configuration dans pom.xml

**Tests à effectuer :**
```bash
# Backend Java (Maven)
cd reconciliation-app/backend
mvn org.owasp:dependency-check-maven:check

# Frontend Angular (npm)
cd reconciliation-app/frontend
npm audit
npm audit --fix

# Services Node.js
cd reconciliation-app/backend/src
npm audit
```

---

## 🔒 6. TESTS DE CRYPTOGRAPHIE

### 6.1 Hashage des Mots de Passe

**Problème critique identifié :**
- ❌ Mots de passe stockés en clair dans la base de données
- ❌ Comparaison directe des mots de passe (`user.getPassword().equals(password)`)

**Tests à effectuer :**
- Vérifier que les mots de passe sont hashés (BCrypt, Argon2, PBKDF2)
- Vérifier l'utilisation de salts uniques par utilisateur
- Tester la résistance aux attaques par dictionnaire

### 6.2 Gestion des Secrets

**Outils :**
- **git-secrets** - Prévention des secrets dans Git
- **TruffleHog** - Scanner de secrets dans le code
  - Installation : `pip install truffleHog`
  - Usage : `trufflehog --regex --entropy=False ./reconciliation-app`

**Tests à effectuer :**
```bash
# Chercher les secrets dans le code
grep -r "password" reconciliation-app/backend/src/main/resources/
grep -r "secret" reconciliation-app/
grep -r "api_key" reconciliation-app/

# Vérifier application.properties
# ❌ spring.datasource.password= (mot de passe en clair)
```

---

## 🌊 7. TESTS DE DÉNI DE SERVICE (DoS)

### 7.1 Rate Limiting

**Outils :**
- **Apache Bench (ab)** - Tests de charge
  - Usage : `ab -n 10000 -c 100 http://localhost:8080/api/auth/login`
- **wrk** - Tests de performance HTTP
  - Usage : `wrk -t12 -c400 -d30s http://localhost:8080/api/users`
- **JMeter** - Tests de charge complets

**Tests à effectuer :**
```bash
# Test de rate limiting sur login
for i in {1..1000}; do
  curl -X POST http://localhost:8080/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"test"}' &
done
```

**Recommandations :**
- Implémenter Spring Boot Actuator avec rate limiting
- Utiliser Bucket4j ou Resilience4j pour le rate limiting

### 7.2 Upload de Fichiers Volumineux

**Tests à effectuer :**
- Tester l'upload de fichiers très volumineux (>3GB)
- Tester les types de fichiers malicieux
- Vérifier la validation des types MIME

---

## 📝 8. JOURNALISATION ET AUDIT

### 8.1 Tests de Journalisation

**Outils :**
- **Audit des logs** manuels
- **ELK Stack** ou **Loki** pour l'analyse centralisée

**Points à vérifier :**
- ✅ Journalisation des tentatives d'authentification échouées
- ✅ Journalisation des actions sensibles (CRUD utilisateurs, transactions)
- ✅ Pas d'exposition de mots de passe dans les logs
- ⚠️ Logs SQL activés en production (à désactiver ou filtrer)

**Tests à effectuer :**
```bash
# Vérifier les logs après des actions sensibles
tail -f reconciliation-app/backend/backend-log.txt

# Vérifier qu'aucun mot de passe n'est loggé
grep -i "password" reconciliation-app/backend/backend-log.txt
```

---

## 🗄️ 9. TESTS DE BASE DE DONNÉES

### 9.1 Configuration MySQL

**Outils :**
- **MySQL Security Configuration**
- **mysqldump** - Sauvegardes sécurisées

**Tests à effectuer :**
```sql
-- Vérifier les utilisateurs MySQL
SELECT User, Host FROM mysql.user;

-- Vérifier les privilèges
SHOW GRANTS FOR 'root'@'localhost';

-- Vérifier la configuration
SHOW VARIABLES LIKE 'ssl%';
SHOW VARIABLES LIKE 'local_infile';
```

**Points à vérifier :**
- ❌ Mot de passe MySQL vide dans `application.properties`
- Vérifier que l'utilisateur applicatif a des privilèges minimaux
- SSL/TLS activé pour les connexions MySQL
- `local_infile` désactivé si non nécessaire

### 9.2 Sauvegardes et Récupération

**Tests à effectuer :**
- Vérifier la stratégie de sauvegarde
- Tester la restauration depuis les backups
- Vérifier le chiffrement des sauvegardes

---

## 🚀 10. TESTS D'INFRASTRUCTURE

### 10.1 Tests de Conteneurisation (Docker)

**Outils :**
- **Docker Bench Security** - Tests de sécurité Docker
  - Installation : `git clone https://github.com/docker/docker-bench-security.git`
  - Usage : `./docker-bench-security.sh`
- **Clair** / **Trivy** - Scanner de vulnérabilités d'images Docker
  - Trivy : `docker run aquasec/trivy image reconciliation-app:latest`

**Tests à effectuer :**
```bash
# Analyser les images Docker
docker images
trivy image reconciliation-app-backend:latest
trivy image reconciliation-app-frontend:latest

# Vérifier la configuration docker-compose.yml
# - Pas de secrets en clair
# - Volumes correctement montés
# - Ports exposés minimalement
```

### 10.2 Configuration Nginx

**Outils :**
- **nginx -t** - Test de configuration
- **SSL Labs** - Test SSL

**Points à vérifier :**
- Configuration SSL/TLS
- Headers de sécurité
- Rate limiting
- Restrictions d'accès

---

## 📊 11. RÉSUMÉ DES VULNÉRABILITÉS IDENTIFIÉES

### 🔴 Critiques

1. **Mots de passe en clair**
   - Stockage des mots de passe non hashés
   - Comparaison directe des mots de passe
   - **Impact** : Accès complet en cas de compromission de la DB

2. **Secrets en clair dans le code**
   - `application.properties` contient le mot de passe MySQL
   - **Impact** : Exposition des credentials

3. **CORS ouvert (`*`)**
   - `ReleveBancaireController` et `SqlController` autorisent toutes les origines
   - **Impact** : Attaques CSRF possibles

4. **Endpoints non protégés**
   - Plusieurs endpoints API accessibles sans authentification
   - **Impact** : Accès non autorisé aux données

### 🟡 Moyennes

1. **Logs SQL en production**
   - `spring.jpa.show-sql=true` peut exposer des informations
   - **Impact** : Fuite d'informations sur la structure DB

2. **Pas de rate limiting**
   - Pas de protection contre les attaques DoS/force brute
   - **Impact** : Dégradation de service possible

3. **Headers de sécurité manquants**
   - Pas de CSP, X-Frame-Options, etc.
   - **Impact** : Vulnérabilité aux attaques XSS/clickjacking

### 🟢 Faibles

1. **Configuration MySQL**
   - Mot de passe root vide
   - **Impact** : Risque si accessible depuis l'extérieur

---

## 🛠️ 12. OUTILS RECOMMANDÉS - RÉSUMÉ

### Outils Gratuits

| Outil | Type | Usage |
|-------|------|-------|
| **OWASP ZAP** | Scanner web | Tests automatisés de sécurité web |
| **Burp Suite Community** | Proxy/Scanner | Tests manuels et intercepteur |
| **SQLMap** | Injection SQL | Tests d'injection SQL automatisés |
| **Nikto** | Scanner vulnérabilités | Scan général de vulnérabilités |
| **OWASP Dependency-Check** | Dépendances | Scan des vulnérabilités des libs |
| **SonarQube** | Code review | Analyse statique du code |
| **Trivy** | Images Docker | Scan de vulnérabilités Docker |
| **testssl.sh** | SSL/TLS | Tests de configuration SSL |
| **hydra** | Force brute | Tests de force brute |
| **TruffleHog** | Secrets | Détection de secrets dans le code |

### Outils Payants (Alternatives)

| Outil | Type | Alternative Gratuite |
|-------|------|---------------------|
| **Burp Suite Professional** | Proxy/Scanner | Burp Suite Community |
| **Veracode** | Code review | SonarQube |
| **Checkmarx** | Code review | Semgrep |
| **Snyk** | Dépendances | OWASP Dependency-Check |
| **Nessus** | Scanner réseau | OpenVAS |

### Outils en Ligne de Commande (Installation rapide)

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y sqlmap nikto hydra nmap docker.io

# Node.js tools
npm install -g snyk eslint-plugin-security

# Python tools
pip install semgrep truffleHog

# Docker tools
docker pull owasp/zap2docker-stable
docker pull owasp/dependency-check
docker pull aquasec/trivy
```

---

## 📋 13. CHECKLIST DE TEST

### Phase 1 : Préparation
- [ ] Configuration de l'environnement de test
- [ ] Installation des outils
- [ ] Backup de la base de données de production
- [ ] Configuration d'un environnement de test isolé

### Phase 2 : Analyse Statique
- [ ] Scan SonarQube du code
- [ ] Scan des dépendances (OWASP Dependency-Check)
- [ ] Recherche de secrets (TruffleHog)
- [ ] Code review manuel des composants critiques

### Phase 3 : Tests Automatisés
- [ ] Scan OWASP ZAP (automatique)
- [ ] Tests SQLMap
- [ ] Scan des dépendances
- [ ] Tests SSL/TLS

### Phase 4 : Tests Manuels
- [ ] Tests d'authentification avec Burp Suite
- [ ] Tests d'autorisation
- [ ] Tests d'injection (SQL, XSS, NoSQL)
- [ ] Tests de configuration CORS
- [ ] Tests de rate limiting

### Phase 5 : Tests d'Infrastructure
- [ ] Tests Docker (Trivy)
- [ ] Tests de configuration Nginx
- [ ] Tests MySQL
- [ ] Tests de sauvegarde

### Phase 6 : Reporting
- [ ] Documentation des vulnérabilités
- [ ] Classification par criticité
- [ ] Recommandations de correction
- [ ] Plan d'action priorisé

---

## 📝 14. RAPPORT DE TEST

### Structure du Rapport

1. **Résumé Exécutif**
   - Vue d'ensemble des tests effectués
   - Nombre de vulnérabilités trouvées
   - Niveau de risque global

2. **Détails des Vulnérabilités**
   - Description
   - Niveau de criticité (Critique/Moyen/Faible)
   - Impact
   - Preuve de concept
   - Recommandations de correction

3. **Annexes**
   - Logs des outils
   - Screenshots
   - Scripts de test utilisés

---

## 🔧 15. SCRIPT D'AUTOMATISATION

Créer un script bash pour automatiser les tests :

```bash
#!/bin/bash
# security-test-automation.sh

echo "🔒 Démarrage des tests de sécurité..."

# 1. Scan des dépendances
echo "📦 Scan des dépendances..."
cd reconciliation-app/backend && mvn org.owasp:dependency-check-maven:check
cd ../frontend && npm audit

# 2. Recherche de secrets
echo "🔑 Recherche de secrets..."
trufflehog --regex --entropy=False ./reconciliation-app

# 3. Scan OWASP ZAP
echo "🕷️ Scan OWASP ZAP..."
docker run -t owasp/zap2docker-stable zap-baseline.py -t http://localhost:8080

# 4. Test SSL
echo "🔐 Test SSL..."
./testssl.sh https://votre-domaine.com

# 5. Scan Trivy
echo "🐳 Scan Trivy..."
trivy image reconciliation-app-backend:latest
trivy image reconciliation-app-frontend:latest

echo "✅ Tests terminés"
```

---

## 📚 16. RESSOURCES ET RÉFÉRENCES

### Standards et Guides
- **OWASP Top 10** - https://owasp.org/www-project-top-ten/
- **OWASP Testing Guide** - https://owasp.org/www-project-web-security-testing-guide/
- **CWE** - Common Weakness Enumeration - https://cwe.mitre.org/
- **CVE** - Common Vulnerabilities and Exposures - https://cve.mitre.org/

### Documentation Outils
- OWASP ZAP : https://www.zaproxy.org/docs/
- Burp Suite : https://portswigger.net/burp/documentation
- SQLMap : https://sqlmap.org/
- SonarQube : https://docs.sonarqube.org/

---

## ✅ 17. ACTIONS IMMÉDIATES PRIORITAIRES

1. **Hashage des mots de passe** (Critique)
   - Implémenter BCrypt ou Argon2
   - Migrer les mots de passe existants

2. **Sécurisation des secrets** (Critique)
   - Utiliser des variables d'environnement
   - Utiliser HashiCorp Vault ou équivalent

3. **Configuration Spring Security** (Critique)
   - Implémenter l'authentification JWT
   - Protéger tous les endpoints

4. **Configuration CORS stricte** (Moyen)
   - Limiter les origines autorisées
   - Retirer les CORS `*`

5. **Rate Limiting** (Moyen)
   - Implémenter Bucket4j
   - Protéger les endpoints sensibles

---

**Date de création :** 2025-01-XX  
**Dernière mise à jour :** 2025-01-XX  
**Version :** 1.0

