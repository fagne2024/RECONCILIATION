## Déploiement Debian Server 2025 – Application Reconciliation

### 1. Vue d’ensemble
- Architecture : backend Spring Boot (Java 17) + frontend Angular 14.
- Base de données : MySQL 8 (ou MariaDB 10.6+) avec encodage UTF-8.
- Cible : Debian 12 “Bookworm” (ou Debian Server 2025) avec systemd, Nginx comme reverse-proxy.

### 2. Prérequis système
- **Ressources** : 4 vCPU, 16 Go RAM, 100 Go SSD (logs et fichiers importés volumineux).
- **Réseau** : ports 80/443 (web), 8080 (API interne), 3306 (MySQL). Restreindre 8080/3306 depuis l’extérieur.
- **Utilisateurs** : compte root (ou sudo) + utilisateur système `www-data` (utilisé par le service).

### 3. Paquets et outils
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl unzip openjdk-17-jdk maven nginx \
    mysql-server mysql-client build-essential
```
- **Node.js** (LTS 18) via NodeSource :
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt install -y nodejs
  sudo npm install -g @angular/cli@14
  ```
- Vérifier les versions : `java -version`, `mvn -v`, `node -v`, `npm -v`.

### 4. Structure des dossiers
```bash
sudo mkdir -p /opt/reconciliation/{backend,frontend,logs,watch-folder,repo}
sudo chown -R www-data:www-data /opt/reconciliation
sudo chmod -R 775 /opt/reconciliation
```
Le service systemd s’exécutera en `www-data`, d’où l’ownership attribué.

### 5. Base de données MySQL
```sql
CREATE DATABASE reconciliation CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'reco'@'localhost' IDENTIFIED BY 'motdepasse';
GRANT ALL PRIVILEGES ON reconciliation.* TO 'reco'@'localhost';
FLUSH PRIVILEGES;
```
Mettre à jour `/etc/mysql/mysql.conf.d/mysqld.cnf` si besoin (bind-address, innodb_buffer_pool).

### 6. Obtention du code
```bash
sudo -u www-data git clone https://github.com/yamar-ndao/reconciliation.git /opt/reconciliation/repo
```
Mettre en place un SSH deploy key si nécessaire.

### 7. Build du backend
```bash
cd /opt/reconciliation/repo/reconciliation-app/backend
sudo -u www-data mvn clean package -DskipTests
sudo cp target/csv-reconciliation-1.0.0.jar /opt/reconciliation/backend/app.jar
sudo chown www-data:www-data /opt/reconciliation/backend/app.jar
```

### 8. Configuration systemd
1. Copier le service fourni :
   ```bash
   sudo cp /opt/reconciliation/repo/deployment/systemd/reconciliation-backend.service /etc/systemd/system/
   ```
2. Modifier si nécessaire (`sudo nano /etc/systemd/system/reconciliation-backend.service`) :
   - `User`, `WorkingDirectory`, `Environment=SPRING_DATASOURCE_PASSWORD=...`
   - Ajuster `-Xms/-Xmx` selon la RAM.
3. Mise en service :
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable reconciliation-backend
   sudo systemctl start reconciliation-backend
   sudo systemctl status reconciliation-backend
   ```
4. Journaux :
   - `journalctl -u reconciliation-backend -f`
   - Fichiers : `/opt/reconciliation/logs/backend.out.log` & `.err.log`

### 9. Build du frontend
```bash
cd /opt/reconciliation/repo/reconciliation-app/frontend
sudo -u www-data npm install
sudo -u www-data npm run build -- --configuration production
sudo rm -rf /opt/reconciliation/frontend/*
sudo cp -R dist/reconciliation-app/* /opt/reconciliation/frontend/
sudo chown -R www-data:www-data /opt/reconciliation/frontend
```

### 10. Configuration Nginx
1. Copier la configuration type :
   ```bash
   sudo cp /opt/reconciliation/repo/deployment/nginx/reconciliation.conf /etc/nginx/sites-available/reconciliation
   sudo ln -s /etc/nginx/sites-available/reconciliation /etc/nginx/sites-enabled/
   sudo rm /etc/nginx/sites-enabled/default
   ```
2. Vérifier que la conf pointe vers `/opt/reconciliation/frontend` et proxy `/api` vers `http://127.0.0.1:8080`.
3. Ajouter TLS (Let’s Encrypt via `certbot --nginx` si besoin).
4. Tester et recharger :
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

### 11. Sécurité & maintenance
- **Firewall UFW** :
  ```bash
  sudo apt install -y ufw
  sudo ufw allow OpenSSH
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  sudo ufw enable
  ```
- **Limitation MySQL** : restreindre l’accès nicement (`bind-address=127.0.0.1`).
- **Sauvegardes** : script `mysqldump` vers `/opt/reconciliation/backups/`.
- **Rotation logs** : configurer `logrotate` pour `/opt/reconciliation/logs/*.log`.
- **Mises à jour** : `sudo apt update && sudo apt upgrade` (planification mensuelle).

### 12. Tests post-déploiement
1. `curl -f http://127.0.0.1:8080/api/health`.
2. Navigateur sur `https://votre-domaine` → vérifier authentification.
3. Onglet Predictions → vérifier différence solde/seuil et statuts.
4. Déposer un fichier dans `/opt/reconciliation/watch-folder` → confirmer traitement et déplacement vers `processed/`.
5. Restart contrôlé :
   ```bash
   sudo systemctl restart reconciliation-backend
   sudo journalctl -u reconciliation-backend -n 20
   ```

### 13. Automatisation & CI/CD
- Pipeline (GitHub Actions, GitLab CI) :
  - Build Maven + Angular.
  - Déploiement via SSH/rsync sur `/opt/reconciliation`.
  - Redémarrage service systemd.
- Scripts de synchronisation pour watch-folder (SFTP/rsync).

### 14. Dépannage rapide
- **Service en échec** : `journalctl -u reconciliation-backend` puis vérifier `SPRING_DATASOURCE_*`.
- **Erreur MySQL** : test `mysql -u reco -p -h 127.0.0.1 reconciliation`.
- **Frontend 404** : `sudo nginx -t`, vérifier `root` et proxy `/api`.
- **Permissions** : s’assurer que `www-data` possède `watch-folder` et `logs`.

Documentation à adapter selon votre politique d’infrastructure (certificats, monitoring, supervision externe, etc.).

