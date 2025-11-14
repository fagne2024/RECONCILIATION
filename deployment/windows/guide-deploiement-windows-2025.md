## Déploiement Windows Server 2025 – Application Reconciliation

### 1. Vue d’ensemble
- Application composée d’un backend Spring Boot (Java 17 + Maven) et d’un frontend Angular 14.
- Base de données : MySQL 8+ (schéma `reconciliation` ou `top20` selon configuration).
- Déploiement cible : Windows Server 2025 (GUI), avec exécution du backend comme service Windows (NSSM) et hébergement du frontend via IIS ou Nginx.

### 2. Prérequis système
- **Edition** : Windows Server 2025 Standard ou Datacenter.
- **Réseau** : ports 80/443 (frontend), 8080 (API backend), 4200 (développement), 3306 (MySQL). Prévoir DNS ou entrée host.
- **Matériel recommandé** : 4 vCPU, 16 Go RAM, 100 Go SSD.
- **Comptes** : utilisateur administrateur + compte de service dédié (ex. `svc-reco`).

### 3. Logiciels nécessaires
1. **Commun**
   - Git 2.44+ (ou ZIP du dépôt).
   - PowerShell 7 (optionnel), 7zip.
   - NSSM ≥ 2.24 (`choco install nssm -y`).
2. **Backend**
   - JDK 17 (Temurin ou Oracle) installé sous `C:\Program Files\Java\jdk-17\`.
   - Maven 3.9+ ajouté au `PATH`.
   - MySQL 8.0+ (service Windows ou distant) avec jeu de caractères UTF-8.
3. **Frontend**
   - Node.js 16 ou 18 LTS + npm.
   - Angular CLI 14 : `npm install -g @angular/cli@14`.
   - Serveur web : IIS 10 (rôle Web Server) ou Nginx pour Windows.

### 4. Préparation de l’environnement
1. Créer l’arborescence :
   ```
   C:\reconciliation\
     backend\
     frontend\
     logs\
     watch-folder\
   ```
2. Cloner le dépôt :
   ```powershell
   git clone https://github.com/yamar-ndao/reconciliation.git C:\reconciliation\repo
   ```
3. Configurer MySQL :
   ```sql
   CREATE DATABASE reconciliation CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'reco'@'%' IDENTIFIED BY 'motdepasse';
   GRANT ALL PRIVILEGES ON reconciliation.* TO 'reco'@'%';
   FLUSH PRIVILEGES;
   ```

### 5. Build et installation du backend
1. Compiler :
   ```powershell
   cd C:\reconciliation\repo\reconciliation-app\backend
   mvn clean package -DskipTests
   Copy-Item target\csv-reconciliation-1.0.0.jar C:\reconciliation\backend\app.jar -Force
   ```
2. Configurer les variables pour le service :
   - `SPRING_PROFILES_ACTIVE=prod`
   - `SPRING_DATASOURCE_URL=jdbc:mysql://127.0.0.1:3306/reconciliation?useSSL=false&serverTimezone=UTC`
   - `SPRING_DATASOURCE_USERNAME=reco`
   - `SPRING_DATASOURCE_PASSWORD=motdepasse`
   - `APP_WATCH_FOLDER=C:\reconciliation\watch-folder`
3. Installer le service Windows via NSSM :
   ```powershell
   cd C:\reconciliation\repo\deployment\windows
   .\install-backend-service.ps1 `
     -JavaExe "C:\Program Files\Java\jdk-17\bin\java.exe" `
     -JarPath "C:\reconciliation\backend\app.jar" `
     -AppDir "C:\reconciliation\backend" `
     -WatchFolder "C:\reconciliation\watch-folder" `
     -DbUrl "jdbc:mysql://127.0.0.1:3306/reconciliation?useSSL=false&serverTimezone=UTC" `
     -DbUser "reco" `
     -DbPassword "motdepasse"
   ```
4. Vérifications :
   - `Get-Service ReconciliationBackend`
   - `Invoke-WebRequest http://localhost:8080/api/health`

### 6. Build et déploiement du frontend
1. Build Angular :
   ```powershell
   cd C:\reconciliation\repo\reconciliation-app\frontend
   npm install
   npm run build -- --configuration production
   ```
   Le build se trouve dans `dist/reconciliation-app/`.
2. Option IIS :
   - Installer le rôle Web Server + URL Rewrite.
   - Créer un site `ReconciliationUI` pointant vers `C:\inetpub\reconciliation-ui`.
   - Copier le contenu du dossier `dist`.
   - Configurer un reverse proxy `/api` vers `http://localhost:8080/api`.
   - Ajouter un binding HTTPS et importer le certificat si nécessaire.
3. Option Nginx :
   - Installer Nginx for Windows.
   - Adapter `deployment/nginx/nginx.conf` (root = `C:\reconciliation\frontend\dist\reconciliation-app`).
   - Proxy `/api` vers `http://127.0.0.1:8080`.
   - Exécuter `nginx -s reload`.

### 7. Automatisation et surveillance
- Configurer le service NSSM en `SERVICE_AUTO_START` (déjà géré par le script).
- Activer la récupération automatique (Recovery) : redémarrer après 1 min.
- Superviser les logs : `C:\reconciliation\logs`.
- Mettre en place une tâche planifiée pour purger les logs et transférer les fichiers traités depuis `watch-folder\processed`.
- Prévoir des sauvegardes MySQL (mysqldump) et un export du dossier `backups\`.

### 8. Tests et validation
1. Ouvrir le navigateur sur `http://localhost` (ou le domaine configuré).
2. Vérifier la connexion API (`F12 → Network → /api`).
3. Tester l’onglet `Predictions` : le calendrier des compensations doit refléter la logique de seuil.
4. Ajouter un fichier dans `C:\reconciliation\watch-folder` et confirmer son traitement.
5. Redémarrer le service pour valider : `Restart-Service ReconciliationBackend`.

### 9. Sécurité et maintenance
- Appliquer les mises à jour Windows et Java régulièrement.
- Restreindre l’accès RDP, utiliser un pare-feu strict (ports nécessaires uniquement).
- Sauvegarder quotidiennement la base et les fichiers critiques.
- Documenter les identifiants et les certificats utilisés.

### 10. Résolution de problèmes courants
- **Service ne démarre pas** : vérifier `nssm get ReconciliationBackend AppStdout` et `AppStderr`, puis consulter les logs Spring dans `C:\reconciliation\logs`.
- **Erreurs MySQL** : s’assurer que le pare-feu autorise 3306 et que l’utilisateur possède les droits.
- **Frontend 404** : contrôler les règles URL Rewrite ou la configuration Nginx.
- **Synchronisation watch-folder** : vérifier la variable `APP_WATCH_FOLDER` et les permissions NTFS.

Ce guide couvre l’installation et la mise en production complète sur Windows Server 2025. Ajuster les chemins et identifiants selon les contraintes de l’environnement cible.

