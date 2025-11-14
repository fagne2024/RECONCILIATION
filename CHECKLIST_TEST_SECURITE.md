# ✅ Checklist Rapide de Tests de Sécurité

## 🎯 Tests Critiques (À faire en priorité)

### 1. Authentification et Autorisation
- [ ] **Mots de passe hashés** (BCrypt, Argon2, PBKDF2)
  - ❌ Actuellement : mots de passe en clair
  - Action : Implémenter BCrypt dans AuthController
- [ ] **Endpoints protégés**
  - [ ] `/api/users` - Vérifier qu'il nécessite une authentification
  - [ ] `/api/operations` - Vérifier l'autorisation
  - [ ] `/api/accounts` - Vérifier l'autorisation
- [ ] **Rate limiting sur `/api/auth/login`**
  - [ ] Protection contre les attaques par force brute
- [ ] **Invalidation de session au logout**
  - [ ] Vérifier que les tokens sont invalidés

### 2. Sécurité des Données
- [ ] **Secrets dans le code**
  - ❌ Actuellement : `application.properties` contient le mot de passe MySQL
  - Action : Utiliser des variables d'environnement ou Vault
- [ ] **Mots de passe en clair dans la DB**
  - ❌ Actuellement : mots de passe stockés en clair
  - Action : Hashage avant stockage
- [ ] **Chiffrement des données sensibles**
  - [ ] Mots de passe hashés
  - [ ] Données personnelles chiffrées si nécessaire

### 3. Configuration CORS
- [ ] **CORS strictement configuré**
  - ❌ Actuellement : `*` dans ReleveBancaireController et SqlController
  - Action : Limiter aux origines autorisées
- [ ] **CORS avec credentials**
  - [ ] Vérifier `allowCredentials: true` uniquement si nécessaire
- [ ] **Headers CORS corrects**
  - [ ] `Access-Control-Allow-Origin` limité
  - [ ] `Access-Control-Allow-Methods` spécifique

### 4. Injection
- [ ] **Injection SQL**
  - [ ] Tester avec SQLMap sur tous les endpoints avec paramètres
  - [ ] Vérifier que JPA utilise des paramètres liés (bind parameters)
- [ ] **Injection NoSQL** (services Node.js)
  - [ ] Tester les endpoints Express avec payloads NoSQL
- [ ] **XSS (Cross-Site Scripting)**
  - [ ] Tester tous les champs de formulaire
  - [ ] Vester l'affichage des données utilisateur
- [ ] **Command Injection**
  - [ ] Tester File Watcher avec noms de fichiers suspects
  - [ ] Tester l'upload de fichiers

### 5. Headers de Sécurité
- [ ] **X-Content-Type-Options: nosniff**
- [ ] **X-Frame-Options: DENY** (ou SAMEORIGIN si nécessaire)
- [ ] **X-XSS-Protection: 1; mode=block**
- [ ] **Strict-Transport-Security** (si HTTPS)
- [ ] **Content-Security-Policy**
- [ ] **Referrer-Policy**

---

## 🔍 Tests de Configuration

### 6. Base de Données
- [ ] **Utilisateur MySQL avec privilèges minimaux**
  - ❌ Actuellement : utilisation de `root` avec mot de passe vide
  - Action : Créer un utilisateur dédié avec privilèges limités
- [ ] **Connexion SSL/TLS à MySQL**
- [ ] **`local_infile` désactivé**
- [ ] **Sauvegardes chiffrées**

### 7. Application
- [ ] **Logs SQL désactivés en production**
  - ⚠️ Actuellement : `spring.jpa.show-sql=true`
  - Action : Désactiver ou filtrer les logs sensibles
- [ ] **Spring Boot Actuator sécurisé**
  - [ ] Endpoints Actuator protégés
  - [ ] Endpoints sensibles désactivés en production
- [ ] **Gestion des erreurs**
  - [ ] Pas d'exposition de stack traces en production
  - [ ] Messages d'erreur génériques

### 8. SSL/TLS
- [ ] **Certificats valides**
- [ ] **Version TLS minimale : 1.2**
- [ ] **Cipher suites sécurisés**
- [ ] **Forward Secrecy activé**

---

## 📦 Tests des Dépendances

### 9. Scan des Vulnérabilités
- [ ] **Backend Java** - OWASP Dependency-Check
  ```bash
  cd reconciliation-app/backend
  mvn org.owasp:dependency-check-maven:check
  ```
- [ ] **Frontend Angular** - npm audit
  ```bash
  cd reconciliation-app/frontend
  npm audit
  ```
- [ ] **Services Node.js** - npm audit
  ```bash
  cd reconciliation-app/backend/src
  npm audit
  ```
- [ ] **Images Docker** - Trivy
  ```bash
  trivy image reconciliation-app-backend:latest
  trivy image reconciliation-app-frontend:latest
  ```

---

## 🧪 Tests Automatisés

### 10. Tests avec Outils
- [ ] **OWASP ZAP - Scan automatique**
  ```bash
  docker run -t owasp/zap2docker-stable zap-baseline.py -t http://localhost:8080
  ```
- [ ] **Burp Suite - Tests manuels**
  - [ ] Intercepter les requêtes
  - [ ] Tester l'authentification
  - [ ] Tester les autorisations
  - [ ] Scanner passif
- [ ] **SQLMap - Tests d'injection SQL**
  ```bash
  sqlmap -u "http://localhost:8080/api/users?id=1" --batch
  ```
- [ ] **Nikto - Scan général**
  ```bash
  nikto -h http://localhost:8080
  ```
- [ ] **SonarQube - Analyse statique**
  - [ ] Scanner le code backend
  - [ ] Scanner le code frontend
- [ ] **Semgrep - Patterns de sécurité**
  ```bash
  semgrep --config=auto ./reconciliation-app
  ```
- [ ] **TruffleHog - Secrets dans le code**
  ```bash
  truffleHog --regex --entropy=False ./reconciliation-app
  ```

---

## 🛡️ Tests de Déni de Service

### 11. Rate Limiting
- [ ] **Protection sur `/api/auth/login`**
  - Test : 100 requêtes simultanées
- [ ] **Protection sur `/api/operations`**
- [ ] **Protection sur endpoints de création/modification**

### 12. Upload de Fichiers
- [ ] **Taille maximale respectée** (3GB configuré)
- [ ] **Types de fichiers validés**
- [ ] **Validation MIME type**
- [ ] **Test avec fichiers malicieux**

---

## 🌐 Tests d'Infrastructure

### 13. Docker
- [ ] **Scan Trivy des images**
- [ ] **Pas de secrets dans docker-compose.yml**
- [ ] **Volumes correctement montés**
- [ ] **Ports minimalement exposés**

### 14. Nginx
- [ ] **Configuration SSL/TLS**
- [ ] **Headers de sécurité**
- [ ] **Rate limiting configuré**
- [ ] **Restrictions d'accès**

### 15. Réseau
- [ ] **Ports non nécessaires fermés**
- [ ] **Firewall configuré**
- [ ] **Accès SSH sécurisé**

---

## 📝 Journalisation et Audit

### 16. Logs
- [ ] **Journalisation des tentatives de login échouées**
- [ ] **Journalisation des actions sensibles**
- [ ] **Pas de mots de passe dans les logs**
- [ ] **Rotation des logs**
- [ ] **Centralisation des logs** (optionnel)

---

## 🔧 Actions de Correction Prioritaires

### Critique (À corriger immédiatement)
1. ✅ Implémenter le hashage des mots de passe (BCrypt)
2. ✅ Sécuriser les secrets (variables d'environnement)
3. ✅ Protéger tous les endpoints API
4. ✅ Corriger la configuration CORS (`*` → origines spécifiques)

### Moyen (À corriger rapidement)
5. ✅ Implémenter le rate limiting
6. ✅ Ajouter les headers de sécurité
7. ✅ Désactiver les logs SQL en production
8. ✅ Créer un utilisateur MySQL dédié

### Faible (Amélioration continue)
9. ✅ Configuration SSL/TLS complète
10. ✅ Amélioration de la gestion des erreurs
11. ✅ Configuration avancée du firewall

---

## 📊 Reporting

### À documenter
- [ ] Liste complète des vulnérabilités trouvées
- [ ] Niveau de criticité pour chaque vulnérabilité
- [ ] Preuve de concept pour chaque vulnérabilité
- [ ] Impact potentiel
- [ ] Recommandations de correction
- [ ] Plan d'action priorisé

---

## ✅ Validation Finale

- [ ] Toutes les vulnérabilités critiques corrigées
- [ ] Tests de régression effectués
- [ ] Documentation de sécurité mise à jour
- [ ] Formation de l'équipe effectuée
- [ ] Tests de sécurité intégrés au CI/CD

---

**Date de création :** 2025-01-XX  
**Dernière mise à jour :** 2025-01-XX  
**Responsable :** Équipe de sécurité

