## Déploiement Windows Server 2016 – Application Reconciliation

### 1. Objectif et périmètre
- Déployer l’application Reconciliation (backend Spring Boot + frontend Angular) sur un serveur Windows Server 2016.
- Garantir un service Windows pour le backend, un hébergement IIS ou Nginx pour le frontend, et une base MySQL locale ou distante.
- Cette procédure couvre l’installation initiale, la configuration, les tests et l’exploitation.

### 2. Préparation du serveur
1. **Mettre le système à jour**
   - Ouvrir `sconfig` → option **6** pour appliquer les mises à jour Windows.
   - Redémarrer le serveur si demandé.
2. **Configurer l’adressage réseau**
   - Fixer une IP statique (`ncpa.cpl` → clic droit sur l’interface → Propriétés).
   - Définir DNS et éventuel suffixe de domaine.
3. **Créer les comptes nécessaires**
   - Créer un compte de service `svc-reco` (PowerShell) :
     ```powershell
     New-LocalUser -Name "svc-reco" -Password (Read-Host -AsSecureString "Mot de passe") -FullName "Service Reconciliation"
     Add-LocalGroupMember -Group "Administrators" -Member "svc-reco"
     ```
   - Attribuer le droit « Log on as a service » via `secpol.msc` → Local Policies → User Rights Assignment.

### 3. Installation des rôles Windows
1. **Gestionnaire de serveur**
   - `Add Roles and Features`.
   - Rôle **Web Server (IIS)** si vous servez le frontend avec IIS. Inclure :
     - Web Server → Common HTTP Features (Static Content, Default Document).
     - Web Server → Application Development → CGI (pour URL Rewrite).
     - Management Tools → IIS Management Console.
   - Installer si nécessaire le rôle **.NET Framework 4.6 Features** (dépendances).
2. **Installer Web Deploy / URL Rewrite / ARR**
   - Télécharger le **Web Platform Installer** (https://www.microsoft.com/web/downloads/platform.aspx).
   - Dans WPI, installer **URL Rewrite 2.1** et **Application Request Routing 3.0**.

### 4. Logiciels requis
| Composant | Version | Source | Commandes |
|-----------|---------|--------|-----------|
| JDK | 17 (Temurin) | https://adoptium.net | Installer MSI, vérifier `JAVA_HOME` |
| Maven | ≥ 3.9 | https://maven.apache.org/download.cgi | Extraire vers `C:\Tools\maven` |
| Node.js | 18 LTS | https://nodejs.org | Inclut npm |
| Angular CLI | 14 | `npm install -g @angular/cli@14` | |
| MySQL Server | 8.0.x | https://dev.mysql.com/downloads/installer | Base locale ou distante |
| Git | 2.x | https://git-scm.com/download/win | |
| NSSM | ≥ 2.24 | `choco install nssm -y` (via Chocolatey) ou https://nssm.cc/download | |
| 7-Zip | 19+ | https://www.7-zip.org | Optionnel |
| PowerShell 7 | 7.x | `winget install Microsoft.PowerShell` | Optionnel |

**Variables d’environnement**
```powershell
[Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Eclipse Foundation\jdk-17", "Machine")
[Environment]::SetEnvironmentVariable("MAVEN_HOME", "C:\Tools\maven", "Machine")
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Tools\maven\bin", "Machine")
```
Fermer/reouvrir les sessions pour prise en compte.

### 5. Préparation des répertoires
```powershell
New-Item -ItemType Directory -Force -Path C:\reconciliation, `
                                             C:\reconciliation\backend, `
                                             C:\reconciliation\frontend, `
                                             C:\reconciliation\logs, `
                                             C:\reconciliation\watch-folder, `
                                             C:\reconciliation\repo | Out-Null
```
Définir les permissions NTFS pour `svc-reco` (lecture/écriture sur `C:\reconciliation`).

### 6. Clonage du dépôt
```powershell
git clone https://github.com/yamar-ndao/reconciliation.git "C:\reconciliation\repo"
```
Si Git n’est pas autorisé, télécharger l’archive ZIP du dépôt et extraire dans `C:\reconciliation\repo`.

### 7. Configuration MySQL
1. **Installation**
   - Via MySQL Installer → choisir Server + Workbench.
   - Pendant l’installation, activer le service Windows, configurer mot de passe root.
2. **Création de la base et de l’utilisateur**
   ```sql
   CREATE DATABASE reconciliation CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'reco'@'localhost' IDENTIFIED BY 'motdepasse';
   GRANT ALL PRIVILEGES ON reconciliation.* TO 'reco'@'localhost';
   FLUSH PRIVILEGES;
   ```
3. **Configuration réseau**
   - Modifier `C:\ProgramData\MySQL\MySQL Server 8.0\my.ini` si vous devez accepter des connexions distantes (`bind-address = 0.0.0.0`).
   - Ouvrir le port 3306 dans le pare-feu :
     ```powershell
     New-NetFirewallRule -DisplayName "MySQL 3306" -Direction Inbound -Protocol TCP -LocalPort 3306 -Action Allow
     ```

### 8. Build du backend
```powershell
cd C:\reconciliation\repo\reconciliation-app\backend
mvn --version            # vérification
mvn clean package -DskipTests
Copy-Item target\csv-reconciliation-1.0.0.jar C:\reconciliation\backend\app.jar -Force
```
Après le build, vérifier que `app.jar` est présent et que les logs de compilation ne contiennent pas d’erreurs critiques.

### 9. Configuration du service backend
1. **Créer les fichiers de configuration**
   - Copier `C:\reconciliation\repo\reconciliation-app\backend\src\main\resources\application-prod.yml` vers `C:\reconciliation\backend\config\application-prod.yml` si vous devez surcharger des valeurs.
2. **Installer le service avec NSSM**
   ```powershell
   cd C:\reconciliation\repo\deployment\windows
   .\install-backend-service.ps1 `
     -ServiceName "ReconciliationBackend" `
     -JavaExe "C:\Program Files\Eclipse Foundation\jdk-17\bin\java.exe" `
     -JarPath "C:\reconciliation\backend\app.jar" `
     -AppDir "C:\reconciliation\backend" `
     -WatchFolder "C:\reconciliation\watch-folder" `
     -DbUrl "jdbc:mysql://127.0.0.1:3306/reconciliation?useSSL=false&serverTimezone=UTC" `
     -DbUser "reco" `
     -DbPassword "motdepasse" `
     -RunAsUser ".\svc-reco"
   ```
   - Le script configure :
     - Start mode = Automatic.
     - Variables d’environnement (`SPRING_PROFILES_ACTIVE=prod`, etc.).
     - Redirection stdout/stderr vers `C:\reconciliation\logs`.
3. **Ajuster le compte de service**
   - Dans `services.msc`, ouvrir les propriétés → onglet **Log On** → sélectionner `svc-reco`.
   - Saisir le mot de passe et confirmer.
4. **Vérification**
   ```powershell
   Get-Service ReconciliationBackend
   Start-Service ReconciliationBackend
   Get-Content C:\reconciliation\logs\backend.out.log -Tail 50
   Invoke-WebRequest http://localhost:8080/api/health
   ```

### 10. Build du frontend
```powershell
cd C:\reconciliation\repo\reconciliation-app\frontend
npm --version            # vérification
npm install
npm run build -- --configuration production
Copy-Item dist\reconciliation-app\* C:\reconciliation\frontend\ -Recurse -Force
```
Contrôler la présence du fichier `index.html` dans `C:\reconciliation\frontend`.

### 11. Hébergement du frontend
#### Option A : IIS
1. **Créer le site**
   - Ouvrir `inetmgr`.
   - Clic droit sur `Sites` → `Add Website`.
   - Site name : `ReconciliationUI`, Physical path : `C:\reconciliation\frontend`, Binding HTTP port 80.
2. **Configurer le pool**
   - Pool d’applications → `ReconciliationUI` → .NET CLR Version = `No Managed Code`, mode pipeline intégré.
   - Identité du pool : `svc-reco` (si vous souhaitez utiliser le même compte).
3. **Configurer le reverse proxy**
   - Dans le site → `URL Rewrite` → `Add Rule(s)` → `Reverse Proxy`.
   - Entrer `localhost:8080` pour `/api` (cocher la réécriture des en-têtes host).
4. **HTTPS**
   - `Bindings...` → ajouter HTTPS → choisir certificat (auto-signé via `New-SelfSignedCertificate` si besoin).
5. **Pare-feu**
   ```powershell
   New-NetFirewallRule -DisplayName "Reconciliation Frontend 80" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
   New-NetFirewallRule -DisplayName "Reconciliation Frontend 443" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
   ```

#### Option B : Nginx
1. **Installation**
   - Extraire Nginx vers `C:\nginx`.
2. **Configuration**
   - Copier `deployment\nginx\nginx.conf` vers `C:\nginx\conf\nginx.conf` et adapter :
     ```nginx
     server {
         listen       80;
         server_name  localhost;

         root   C:/reconciliation/frontend;
         index  index.html;

         location /api/ {
             proxy_pass         http://127.0.0.1:8080/api/;
             proxy_set_header   Host $host;
             proxy_set_header   X-Real-IP $remote_addr;
         }
     }
     ```
3. **Service Windows**
   ```powershell
   nssm install Nginx "C:\nginx\nginx.exe"
   nssm set Nginx AppDirectory "C:\nginx"
   nssm set Nginx Start SERVICE_AUTO_START
   ```
4. **Démarrer et tester**
   ```powershell
   nssm start Nginx
   Invoke-WebRequest http://localhost/
   ```

### 12. Tests fonctionnels
1. **Backend**
   ```powershell
   Invoke-WebRequest http://localhost:8080/api/health
   ```
   Vérifier le code HTTP 200 et la réponse JSON.
2. **Frontend**
   - Ouvrir un navigateur sur `http://<nom_du_serveur>` (ou HTTPS).
   - Ouvrir `F12 → Network`, rafraîchir, confirmer que les appels `/api` retournent 200.
3. **Watch folder**
   - Déposer un CSV dans `C:\reconciliation\watch-folder`.
   - Contrôler la création des sous-dossiers `processed` et `errors`.
   - Vérifier les logs correspondants.
4. **Résilience**
   ```powershell
   Restart-Service ReconciliationBackend
   ```
   Confirmé via `Get-Service`.

### 13. Maintenance et exploitation
- **Sauvegardes** :
  - Planifier un `mysqldump` quotidien vers `C:\reconciliation\backups`.
  - Sauvegarder `C:\reconciliation\logs` et `watch-folder\processed`.
- **Mises à jour** :
  - Windows Update mensuel.
  - JDK/Node/Angular CLI/Nginx : planifier une fenêtre → arrêter le service → mettre à jour → redémarrer.
- **Surveillance** :
  - Journaux IIS (`%SystemDrive%\inetpub\logs\LogFiles`) ou Nginx.
  - Logs backend (`C:\reconciliation\logs\backend.out.log`, `backend.err.log`).
  - Event Viewer (`Applications and Services Logs` → `NSSM`).

### 14. Dépannage
- **Le service backend ne démarre pas**
  - `nssm edit ReconciliationBackend` → vérifier l’onglet Application.
  - Consulter `backend.err.log` pour stacktrace.
- **Erreur MySQL (Access denied)**
  - Tester `mysql -u reco -p` depuis le serveur.
  - Vérifier firewall et `my.ini`.
- **Frontend 404**
  - IIS : vérifier les `Bindings`, `Default Document`, règle URL Rewrite.
  - Nginx : `nginx -t` pour valider la conf, vérifier le root.
- **Ports occupés**
  ```powershell
  netstat -ano | findstr :8080
  Stop-Process -Id <PID> -Force
  ```
- **Permissions watch-folder**
  - S’assurer que `svc-reco` a `Modify` sur `C:\reconciliation\watch-folder`.

### 15. Procédure de mise à jour applicative
1. `Stop-Service ReconciliationBackend`.
2. `git pull` dans `C:\reconciliation\repo`.
3. Rebuild backend (`mvn clean package -DskipTests` → recopier le JAR).
4. Rebuild frontend (`npm run build -- --configuration production` → recopier dist).
5. `Start-Service ReconciliationBackend`.
6. Vider le cache navigateur / redémarrer IIS ou Nginx si nécessaire.

### 16. Checklist finale
- [ ] Ports 80/443/8080/3306 ouverts.
- [ ] Service `ReconciliationBackend` en état `Running`.
- [ ] Site IIS ou service Nginx actif.
- [ ] Tests `health` et dépôt CSV validés.
- [ ] Sauvegardes planifiées.
- [ ] Documentation des mots de passe et certificats stockée en lieu sûr.

