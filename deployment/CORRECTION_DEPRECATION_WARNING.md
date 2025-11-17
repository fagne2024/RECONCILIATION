# Correction de l'avertissement de dépréciation `util._extend`

## Problème
L'avertissement suivant apparaît lors du build ou de l'exécution :
```
(node:xxxxx) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. 
Please use Object.assign() instead.
```

## Cause
Cet avertissement provient de dépendances obsolètes (notamment `chokidar` version 3.x) utilisées par Angular CLI et d'autres outils de build.

## Solutions

### Solution 1 : Reconstruire l'image Docker (Recommandé)

Cette solution corrige définitivement le problème en utilisant des versions mises à jour.

#### Étapes :

1. **Sur votre machine de développement** (où vous avez fait les modifications) :
   ```powershell
   cd C:\Users\YamarNDAO\OneDrive - Intouchgroup\Bureau\PAD\docker
   ```

2. **Vérifier les modifications** :
   - Le `Dockerfile` frontend utilise maintenant `node:18-alpine`
   - Le `package.json` racine a `chokidar: ^4.0.0`

3. **Commit et push des modifications** :
   ```powershell
   git add .
   git commit -m "Fix: Mise à jour chokidar et Node.js pour corriger les warnings de dépréciation"
   git push origin main
   ```

4. **Sur le serveur de production** :

   a. **Se connecter au serveur** (SSH ou RDP)

   b. **Arrêter les conteneurs actuels** :
   ```powershell
   cd C:\reconciliation\repo\docker
   docker compose down
   ```

   c. **Récupérer les dernières modifications** :
   ```powershell
   git pull origin main
   # OU si vous n'utilisez pas git, copiez les fichiers modifiés :
   # - reconciliation-app/frontend/Dockerfile
   # - package.json
   ```

   d. **Reconstruire et redémarrer** :
   ```powershell
   docker compose up -d --build
   ```

   e. **Vérifier les logs** :
   ```powershell
   docker compose logs frontend
   docker compose logs backend
   ```

### Solution 2 : Supprimer temporairement les warnings (Solution de contournement)

Si vous ne pouvez pas reconstruire immédiatement, vous pouvez supprimer les warnings en production.

#### Option A : Variable d'environnement Node.js

Modifiez le `docker-compose.yml` pour ajouter `NODE_OPTIONS` :

```yaml
frontend:
  build:
    context: ..
    dockerfile: reconciliation-app/frontend/Dockerfile
  environment:
    API_BASE_URL: http://backend:8080
    NODE_OPTIONS: "--no-deprecation"  # Ajoutez cette ligne
  depends_on:
    - backend
  ports:
    - "80:80"
```

Puis reconstruisez uniquement le frontend :
```powershell
docker compose up -d --build frontend
```

#### Option B : Modifier le Dockerfile pour supprimer les warnings

Ajoutez dans le `Dockerfile` frontend, avant la commande `npm run build` :

```dockerfile
# ====== BUILD STAGE ======
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Supprimer les warnings de dépréciation pendant le build
ENV NODE_OPTIONS="--no-deprecation"
RUN npm run build -- --configuration production
```

### Solution 3 : Mise à jour complète des dépendances (Long terme)

Pour une solution durable, mettez à jour toutes les dépendances :

1. **Mettre à jour Angular CLI et dépendances** :
   ```powershell
   cd reconciliation-app/frontend
   npm update @angular/cli @angular/core
   npm update
   ```

2. **Vérifier les breaking changes** et adapter le code si nécessaire

3. **Tester localement** avant de déployer

## Vérification

Après avoir appliqué une solution, vérifiez que les warnings ont disparu :

```powershell
# Voir les logs en temps réel
docker compose logs -f frontend

# Chercher les warnings
docker compose logs frontend | Select-String "DeprecationWarning"
```

Si aucun résultat n'apparaît, le problème est résolu.

## Notes importantes

- ⚠️ **Solution 2** masque seulement les warnings, elle ne corrige pas le problème sous-jacent
- ✅ **Solution 1** est la meilleure approche car elle corrige la cause racine
- 🔄 Les warnings n'affectent pas le fonctionnement de l'application, mais ils polluent les logs
- 📦 La mise à jour de Node.js 16 → 18 peut nécessiter des ajustements si vous utilisez des fonctionnalités spécifiques

## Dépannage

### Si le build échoue après la mise à jour :

1. **Vérifier la compatibilité Angular 14 avec Node 18** :
   - Angular 14 supporte Node 14-18
   - Si problème, utilisez `node:16-alpine` au lieu de `node:18-alpine`

2. **Nettoyer le cache npm** :
   ```dockerfile
   RUN npm ci --prefer-offline --no-audit
   ```

3. **Vérifier les logs détaillés** :
   ```powershell
   docker compose build --no-cache frontend
   docker compose logs frontend
   ```

### Si les warnings persistent :

1. Vérifier que toutes les dépendances sont à jour :
   ```powershell
   npm outdated
   ```

2. Forcer la mise à jour de chokidar dans le frontend :
   ```powershell
   cd reconciliation-app/frontend
   npm install chokidar@^4.0.0 --save-dev
   ```

## Contact

Si le problème persiste après avoir suivi ce guide, vérifiez :
- La version de Node.js dans le conteneur : `docker compose exec frontend node --version`
- Les logs complets : `docker compose logs --tail=100 frontend`

