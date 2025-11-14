## Déploiement Windows 10 – Application Reconciliation

### 1. Contexte
- Poste ou serveur Windows 10 Pro/Enterprise servant de socle unique : backend Spring Boot, frontend Angular, base MySQL locale.
- Usage pour environnement pilote, POC ou petite production.
- Lancement du backend via NSSM (service Windows) ou tâche planifiée (selon édition).

### 2. Prérequis système
- Windows 10 Pro/Enterprise 22H2 à jour, accès administrateur.
- Ports ouverts : 8080 (API backend), 80/443 (frontend via IIS/Nginx), 3306 (MySQL), 4200 (dev).
- Matériel minimal : 4 cœurs, 16 Go RAM, 100 Go stockage (SSD conseillé).
- Compte dédié conseillé (`svc-reco`) avec privilèges « Se connecter en tant que service ».

### 3. Logiciels à installer
1. **Java & build**
   - JDK 17 : https://adoptium.net (Temurin). Installer dans `C:\Program Files\Eclipse Foundation\jdk-17`.
   - Maven 3.9+ : https://maven.apache.org. Décompresser dans `C:\Tools\maven`.
   - Mettre `JAVA_HOME` et `MAVEN_HOME` dans les variables système + `%PATH%`.
2. **Base de données**
   - MySQL 8.0 Community (https://dev.mysql.com/downloads/installer).
   - Créer utilisateur `reco` avec les droits sur la base `reconciliation`.
3. **Node & Angular**
   - Node.js LTS 18 (https://nodejs.org).
   - `npm install -g @angular/cli@14`.
4. **Outils complémentaires**
   - Git for Windows (ou téléchargement ZIP du dépôt).
   - NSSM 2.24+ : `choco install nssm -y` (ou https://nssm.cc/download).
   - 7-Zip / PowerShell 7 (optionnel pour scripts).
   - Serveur web pour le frontend : IIS (rôle optionnel Windows) ou Nginx for Windows.

### 4. Arborescence recommandée
```
C:\reconciliation\
  backend\
  frontend\
  logs\
  watch-folder\
  repo\ (dépôt git)
```

### 5. Clonage du projet
```powershell
git clone https://github.com/yamar-ndao/reconciliation.git "C:\reconciliation\repo"
```
Configurer un SSH deploy key si nécessaire.

### 6. Configuration MySQL
1. Lancer MySQL Workbench ou `mysql.exe`.
2. Création de la base :
   ```sql
   CREATE DATABASE reconciliation CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'reco'@'localhost' IDENTIFIED BY 'motdepasse';
   GRANT ALL PRIVILEGES ON reconciliation.* TO 'reco'@'localhost';
   FLUSH PRIVILEGES;
   ```
3. Modifier `C:\ProgramData\MySQL\MySQL Server 8.0\my.ini` si besoin (buffer pool, max connections).

### 7. Build du backend
```powershell
cd C:\reconciliation\repo\reconciliation-app\backend
mvn clean package -DskipTests
Copy-Item target\csv-reconciliation-1.0.0.jar C:\reconciliation\backend\app.jar -Force
```

### 8. Installation du service backend (NSSM)
1. Préparer les dossiers :
   ```powershell
   New-Item -ItemType Directory -Force -Path C:\reconciliation\logs | Out-Null
   New-Item -ItemType Directory -Force -Path C:\reconciliation\watch-folder | Out-Null
   ```
2. Exécuter le script fourni :
   ```powershell
   cd C:\reconciliation\repo\deployment\windows
   .\install-backend-service.ps1 `
     -JavaExe "C:\Program Files\Eclipse Foundation\jdk-17\bin\java.exe" `
     -JarPath "C:\reconciliation\backend\app.jar" `
     -AppDir "C:\reconciliation\backend" `
     -WatchFolder "C:\reconciliation\watch-folder" `
     -ServiceName "ReconciliationBackend" `
     -DbUrl "jdbc:mysql://127.0.0.1:3306/reconciliation?useSSL=false&serverTimezone=UTC" `
     -DbUser "reco" `
     -DbPassword "motdepasse"
   ```
- Le service démarre automatiquement (mode `auto start`). Vérifier via `services.msc`.
- Logs backend : `C:\reconciliation\logs`.

### 9. Build du frontend
```powershell
cd C:\reconciliation\repo\reconciliation-app\frontend
npm install
npm run build -- --configuration production
Copy-Item dist\reconciliation-app\* C:\reconciliation\frontend\ -Recurse -Force
```

### 10. Hébergement du frontend
#### Option IIS
1. Activer le rôle via « Activer ou désactiver des fonctionnalités Windows » (Serveur Web IIS, Réécriture d’URL si disponible).
2. Créer un site `ReconciliationUI` pointant vers `C:\reconciliation\frontend`.
3. Ajouter une règle reverse-proxy `/api` → `http://localhost:8080/api` (module « URL Rewrite » + extension ARR).
4. Configurer HTTPS avec un certificat local (Certificates MMC → Bindings).

#### Option Nginx
1. Installer Nginx for Windows (https://nginx.org).
2. Copier `deployment\nginx\reconciliation.conf` vers `C:\nginx\conf\sites-enabled\`.
3. Adapter :
   - `root C:/reconciliation/frontend;`
   - `proxy_pass http://127.0.0.1:8080;`
4. Démarrer via `start nginx` (création d’un service possible avec NSSM).

### 11. Tests fonctionnels
1. Backend :
   ```powershell
   Invoke-WebRequest http://localhost:8080/api/health
   ```
2. Frontend : ouvrir `http://localhost` ou `https://localhost`.
3. Vérifier l’onglet `Predictions` → les montants de compensation reflètent `(solde actuel - seuil max)` et les statuts urgent/normal/bas.
4. Déposer un fichier CSV/Excel dans `C:\reconciliation\watch-folder` → confirmer traitement (dossier `processed`).

### 12. Automatisation & mises à jour
- Mettre à jour régulièrement :
  - Windows Update, JDK, Node, npm, Angular CLI.
  - MySQL (utiliser MySQL Installer).
- Sauvegarde :
  - Script `mysqldump` planifié (Tâche planifiée) vers `C:\reconciliation\backups`.
  - Exporter `C:\reconciliation\logs` et `watch-folder\processed`.
- Tâche planifiée pour purger les logs et synchroniser `watch-folder`.
- Git : pull régulier puis rebuild (arrêt du service, `mvn package`, `npm run build`, redémarrage).

### 13. Dépannage
- **Service arrêté** : consulter `Event Viewer` (Applications), `C:\reconciliation\logs\backend.err.log`.
- **Erreur MySQL** : tester la connexion `mysql -u reco -p`.
- **Frontend inaccessible** : vérifier IIS/Nginx (binding, pare-feu, logs).
- **Port occupé** : `netstat -ano | findstr :8080`.

### 14. Sécurité
- Activer Windows Defender/antivirus, exclure `watch-folder` si nécessaire.
- Utiliser pare-feu Windows (entrées spécifiques).
- Stocker les mots de passe dans le Windows Credential Manager ou un coffre-fort.
- Restreindre l’accès RDP (VPN, bastion).

Ce guide couvre l’installation complète du backend/ frontend sur Windows 10. Adapter les identifiants, chemins et certificats selon vos standards internes.***

