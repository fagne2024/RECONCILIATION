# 🔒 Guide Rapide - Tests de Sécurité

## 📁 Fichiers Créés

Ce package contient tous les documents nécessaires pour effectuer des tests de sécurité complets sur l'application de réconciliation :

1. **`PLAN_TEST_SECURITE.md`** - Plan détaillé des tests de sécurité avec toutes les méthodologies
2. **`CHECKLIST_TEST_SECURITE.md`** - Checklist rapide pour suivre les tests
3. **`INSTALLATION_OUTILS_SECURITE.md`** - Guide d'installation de tous les outils nécessaires
4. **`security-test-automation.sh`** - Script d'automatisation des tests (Linux/macOS/WSL)

---

## 🚀 Démarrage Rapide

### 1. Installer les Outils

Consultez `INSTALLATION_OUTILS_SECURITE.md` pour installer les outils selon votre système d'exploitation.

**Installation rapide (Linux) :**
```bash
sudo apt-get update
sudo apt-get install -y docker.io curl git npm maven python3-pip
sudo pip3 install semgrep truffleHog sqlmap
docker pull owasp/zap2docker-stable
```

### 2. Lancer les Tests Automatisés

**Sur Linux/macOS/WSL :**
```bash
chmod +x security-test-automation.sh
./security-test-automation.sh
```

**Sur Windows (PowerShell) :**
```powershell
# Exécuter via WSL ou utiliser Docker directement
wsl bash security-test-automation.sh
```

**Sur Windows (Docker directement) :**
```powershell
docker run --rm -v ${PWD}:/workspace -w /workspace owasp/zap2docker-stable zap-baseline.py -t http://localhost:8080
```

### 3. Tests Manuels avec Burp Suite

1. Télécharger Burp Suite Community : https://portswigger.net/burp/communitydownload
2. Configurer le proxy dans le navigateur
3. Intercepter les requêtes et tester manuellement
4. Utiliser le scanner passif

### 4. Suivre la Checklist

Utilisez `CHECKLIST_TEST_SECURITE.md` pour suivre méthodiquement tous les tests à effectuer.

---

## 🎯 Tests Critiques Identifiés

L'analyse initiale a révélé plusieurs vulnérabilités critiques :

### 🔴 Critiques (À corriger immédiatement)

1. **Mots de passe en clair**
   - **Fichier** : `AuthController.java` ligne 39
   - **Problème** : `user.getPassword().equals(password)` - comparaison directe
   - **Impact** : Si la base de données est compromise, tous les mots de passe sont exposés
   - **Solution** : Implémenter BCrypt

2. **Secrets en clair dans le code**
   - **Fichier** : `application.properties` ligne 4
   - **Problème** : `spring.datasource.password=` - mot de passe MySQL vide ou en clair
   - **Impact** : Exposition des credentials
   - **Solution** : Utiliser des variables d'environnement ou HashiCorp Vault

3. **CORS ouvert (`*`)**
   - **Fichiers** : 
     - `ReleveBancaireController.java` ligne 18
     - `SqlController.java` ligne 14
   - **Problème** : `@CrossOrigin(origins = "*")` autorise toutes les origines
   - **Impact** : Vulnérable aux attaques CSRF
   - **Solution** : Limiter aux origines autorisées

4. **Endpoints non protégés**
   - Plusieurs endpoints API accessibles sans authentification
   - **Solution** : Implémenter Spring Security avec authentification JWT

### 🟡 Moyennes (À corriger rapidement)

1. **Logs SQL en production** (`spring.jpa.show-sql=true`)
2. **Pas de rate limiting** sur les endpoints sensibles
3. **Headers de sécurité manquants** (CSP, X-Frame-Options, etc.)

### 🟢 Faibles (Amélioration continue)

1. **Configuration MySQL** (mot de passe root vide)
2. **SSL/TLS** à vérifier si en production

---

## 📋 Ordre d'Exécution Recommandé

### Phase 1 : Analyse Initiale (30 min)
1. ✅ Lire `PLAN_TEST_SECURITE.md`
2. ✅ Installer les outils de base
3. ✅ Examiner la configuration actuelle
4. ✅ Identifier les vulnérabilités évidentes

### Phase 2 : Tests Automatisés (1-2h)
1. ✅ Lancer le script d'automatisation
2. ✅ Scan OWASP ZAP
3. ✅ Scan des dépendances
4. ✅ Recherche de secrets

### Phase 3 : Tests Manuels (2-4h)
1. ✅ Tests d'authentification avec Burp Suite
2. ✅ Tests d'autorisation
3. ✅ Tests d'injection (SQL, XSS)
4. ✅ Tests de configuration

### Phase 4 : Correction des Vulnérabilités (selon criticité)
1. ✅ Corriger les vulnérabilités critiques
2. ✅ Réexécuter les tests
3. ✅ Documenter les corrections

---

## 🛠️ Outils Essentiels

### Gratuits (Recommandés)

| Outil | Usage | Installation |
|-------|-------|--------------|
| **OWASP ZAP** | Scanner web automatisé | `docker pull owasp/zap2docker-stable` |
| **Burp Suite Community** | Proxy et tests manuels | Téléchargement depuis le site officiel |
| **SQLMap** | Tests d'injection SQL | `pip install sqlmap` |
| **OWASP Dependency-Check** | Scan des dépendances | `docker pull owasp/dependency-check` |
| **Trivy** | Scan d'images Docker | `docker pull aquasec/trivy` |
| **SonarQube** | Analyse statique du code | `docker pull sonarqube:community` |

### Payants (Optionnels)

- **Burp Suite Professional** - Version avancée de Burp Suite
- **Veracode** - Code review automatique
- **Snyk** - Scan avancé des dépendances

---

## 📊 Exemple de Rapport

Après exécution du script d'automatisation, vous obtiendrez :

```
security-reports/20250113_143000/
├── dependency-check-backend/
│   ├── dependency-check-report.html
│   └── dependency-check-report.json
├── npm-audit.json
├── npm-audit.txt
├── secrets-trufflehog.json
├── secrets-trufflehog.txt
├── endpoints-unprotected.txt
├── cors-config.txt
├── security-headers.txt
├── zap-report.html
├── zap-report.json
└── trivy-*.json
```

---

## 🔧 Correction des Vulnérabilités Critiques

### 1. Hashage des Mots de Passe

**Avant :**
```java
.filter(user -> user.getPassword().equals(password))
```

**Après :**
```java
@Autowired
private PasswordEncoder passwordEncoder;

// Au login
.filter(user -> passwordEncoder.matches(password, user.getPassword()))

// À la création/modification
user.setPassword(passwordEncoder.encode(password));
```

**Configuration Spring Security :**
```java
@Bean
public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
}
```

### 2. Sécurisation des Secrets

**Avant (`application.properties`) :**
```properties
spring.datasource.password=motdepasse
```

**Après (Variables d'environnement) :**
```properties
spring.datasource.password=${DB_PASSWORD}
```

**Ou utiliser un fichier externe :**
```bash
export DB_PASSWORD=votre_mot_de_passe_securise
```

### 3. Configuration CORS Stricte

**Avant :**
```java
@CrossOrigin(origins = "*")
```

**Après :**
```java
@CrossOrigin(origins = {"https://votre-domaine.com", "https://app.votre-domaine.com"})
```

**Ou configuration globale dans `GlobalCorsConfig.java` :**
```java
config.setAllowedOrigins(List.of("https://votre-domaine.com"));
```

### 4. Protection des Endpoints

**Configuration Spring Security :**
```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .anyRequest().authenticated()
            )
            .sessionManagement(session -> 
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .addFilterBefore(jwtAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
```

---

## 📚 Ressources Complémentaires

- **OWASP Top 10** : https://owasp.org/www-project-top-ten/
- **OWASP Testing Guide** : https://owasp.org/www-project-web-security-testing-guide/
- **Spring Security Documentation** : https://spring.io/projects/spring-security
- **OWASP ZAP Documentation** : https://www.zaproxy.org/docs/

---

## ⚠️ Avertissements

1. **Tests en environnement de test uniquement**
   - Ne jamais exécuter des tests agressifs (SQLMap, hydra) sur la production
   - Utiliser un environnement de test isolé

2. **Permissions nécessaires**
   - Certains tests nécessitent l'autorisation explicite du propriétaire de l'application
   - Effectuer les tests avec autorisation écrite

3. **Backup avant tests**
   - Toujours effectuer un backup de la base de données avant les tests
   - Certains tests peuvent générer des données de test

4. **Tests manuels recommandés**
   - Les outils automatiques ne remplacent pas les tests manuels approfondis
   - Combiner tests automatisés et tests manuels

---

## 📞 Support

Pour toute question sur les tests de sécurité :
1. Consulter la documentation dans `PLAN_TEST_SECURITE.md`
2. Vérifier la checklist dans `CHECKLIST_TEST_SECURITE.md`
3. Consulter la documentation des outils (voir ressources)

---

**Date de création :** 2025-01-XX  
**Version :** 1.0  
**Auteur :** Équipe de sécurité

