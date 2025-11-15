## Déploiement Docker – Application Reconciliation

### 1. Objectif
- Conteneuriser l’application Reconciliation (backend Spring Boot, frontend Angular, base MySQL) et la lancer via Docker Compose.
- Simplifier l’installation sur Windows Server 2016/2019/2022 ou toute machine disposant de Docker.
- Centraliser les commandes clefs, la structure des volumes et les bonnes pratiques d’exploitation.

### 2. Prérequis
1. **Système** : Windows Server 2016 (ou supérieur) / Linux / macOS avec droits administrateur.
2. **Logiciels** :
   - Docker Desktop 4.x (ou Docker Engine 20+ & docker compose v2).
   - Git (ou archive du dépôt).
   - Éditeur de texte pour personnaliser `.env`.
3. **Ports ouverts** :
   - 80 (frontend Angular via Nginx).
   - 8080 (API backend, utilisé seulement en interne au serveur).
   - 3306 (MySQL, uniquement si exposé).
4. **Ressources recommandées** :
   - 4 vCPU, 8 Go RAM, 20 Go de stockage libre (volumes Docker inclus).

### 3. Préparation du serveur
1. **Installer Docker Desktop** (Windows) :
   - Télécharger : https://www.docker.com/products/docker-desktop
   - Activer Hyper-V et Containers (Server Manager → Add Roles and Features).
   - Redémarrer la machine.
2. **Configurer Docker Desktop** :
   - Settings → General → cocher « Use the WSL 2 based engine » si disponible.
   - Settings → Resources → File Sharing → autoriser le lecteur `C:` (nécessaire pour bind-mounts).
3. **Installer Git** (si nécessaire) :
   - https://git-scm.com/download/win
   - Ajouter Git au PATH pendant l’installation.

### 4. Clonage du dépôt
```powershell
cd C:\
git clone https://github.com/yamar-ndao/reconciliation.git C:\reconciliation\repo
cd C:\reconciliation\repo\docker
```
> Alternative : télécharger l’archive ZIP de GitHub, extraire dans `C:\reconciliation\repo`, puis se placer dans `docker\`.

### 5. Structure des fichiers Docker
```
reconciliation\
  docker\
    docker-compose.yml
    README.md (éventuel)
    nginx\
  reconciliation-app\
    backend\
      Dockerfile
    frontend\
      Dockerfile
      nginx.conf
```
- `docker-compose.yml` : orchestre les services `db`, `backend`, `frontend`.
- Dockerfiles backend/frontend : build multi-stage pour Java et Angular.
- `nginx.conf` : sert le frontend et proxy `/api` vers le backend.

### 6. Création du fichier `.env`
Le `docker-compose.yml` attend deux variables sensibles. Créez `.env` dans le dossier `docker/` :
```powershell
Set-Content -Path .\.env -Value @"
MYSQL_PASSWORD=motdepasseApplication
MYSQL_ROOT_PASSWORD=motdepasseRoot
"@
```
Adaptez les mots de passe. Ils seront injectés comme secrets dans MySQL et le backend.

### 7. (Optionnel) Utiliser un dossier watch-folder partagé
Par défaut, le volume `watch_data` est un volume Docker interne. Pour interagir depuis Windows (déposer des fichiers CSV à traiter) :
1. Créer `C:\reconciliation\watch-folder`.
2. Dans `docker-compose.yml`, remplacer :
   ```yaml
         volumes:
           - watch_data:/data/watch-folder
   ```
   par
   ```yaml
         volumes:
           - C:/reconciliation/watch-folder:/data/watch-folder
   ```
3. Vérifier que Docker Desktop autorise le partage du lecteur `C:`.

### 8. Lancer le déploiement
Depuis `C:\reconciliation\repo\docker` :
```powershell
docker compose up -d --build
```
- `--build` force la reconstruction des images backend/frontend en se basant sur le code local.
- Les services démarrent dans l’ordre : MySQL → backend → frontend.

### 9. Vérifications
1. **Statut des conteneurs** :
   ```powershell
   docker compose ps
   ```
2. **Logs** :
   ```powershell
   docker compose logs -f db
   docker compose logs -f backend
   docker compose logs -f frontend
   ```
3. **Tests fonctionnels** :
   - Backend : `Invoke-WebRequest http://localhost:8080/api/health` (HTTP 200 attendu).
   - Frontend : navigateur → `http://localhost` (ou `http://<IP_serveur>`).

### 10. Commandes utiles
- **Arrêt / suppression** :
  ```powershell
  docker compose down          # stop + supprime les conteneurs
  docker compose down -v       # idem + supprime les volumes (perte données MySQL)
  ```
- **Rebuild après mise à jour du code** :
  ```powershell
  docker compose down
  git pull                      # ou copier le nouveau code
  docker compose up -d --build
  ```
- **Accès shell dans un conteneur** :
  ```powershell
  docker compose exec backend sh
  docker compose exec db bash
  ```
- **Sauvegarde MySQL** :
  ```powershell
  docker compose exec db sh -c "mysqldump -u root -p$MYSQL_ROOT_PASSWORD reconciliation" > backup.sql
  ```

### 11. Configuration MySQL initiale
Le script d’initialisation dans l’image MySQL crée automatiquement la base et l’utilisateur grâce aux variables d’environnement (voir `docker-compose.yml`). Pour exécuter des scripts SQL additionnels :
```powershell
docker compose exec db mysql -uroot -p$MYSQL_ROOT_PASSWORD reconciliation < script.sql
```

### 12. Surveillance et maintenance
- **Volumes persistants** :
  - `db_data` : données MySQL.
  - `watch_data` ou bind-mount : fichiers déposés par l’utilisateur.
- **Nettoyage des images inutilisées** :
  ```powershell
  docker image prune -f
  docker volume prune -f
  ```
- **Ajuster les ressources** (Docker Desktop → Settings → Resources) si le serveur possède plus de RAM/CPU.
- **Sécurité** :
  - Modifier les mots de passe par défaut.
  - Limiter les ports exposés (pare-feu Windows : `New-NetFirewallRule ...`).
  - Considérer un reverse proxy HTTPS externe (Traefik, Caddy, Nginx host) si vous exposez l’application publiquement.

### 13. Dépannage
- **Backend ne démarre pas** :
  - `docker compose logs backend` → vérifier la connexion MySQL.
  - S’assurer que le conteneur `db` est `healthy` (`docker compose ps`).
- **Erreur MySQL access denied** :
  - Vérifier les variables `MYSQL_PASSWORD` / `MYSQL_ROOT_PASSWORD`.
  - Recréer les conteneurs avec `docker compose down -v` (attention, supprime les données).
- **Frontend 502/504** :
  - Contrôler `docker compose logs frontend` pour voir si Nginx perd la connexion.
  - S’assurer que `backend` écoute bien sur `8080`.
- **Port 80 déjà occupé** :
  - Modifier le mapping dans `docker-compose.yml` :
    ```yaml
        ports:
          - "8081:80"
    ```
  - Adapter le firewall et utiliser `http://localhost:8081`.

### 14. Procédure de mise à jour applicative
1. `docker compose down`.
2. `git pull` (ou copier le nouveau code dans `reconciliation-app`).
3. `docker compose up -d --build`.
4. Contrôler les logs et relancer les tests `/api/health` + UI.

### 15. Checklist finale
- [ ] Docker Desktop (ou Engine) installé et en cours d’exécution.
- [ ] Fichier `.env` renseigné avec des mots de passe robustes.
- [ ] `docker compose up -d --build` exécuté avec succès.
- [ ] `http://localhost` livre l’UI et `/api/health` renvoie 200.
- [ ] Sauvegarde et surveillance (logs, volumes) planifiées.
- [ ] Ports réseau et certificats HTTPS traités selon vos exigences.

