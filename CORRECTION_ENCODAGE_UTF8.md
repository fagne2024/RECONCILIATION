# Correction de l'encodage UTF-8 - Résolution du problème des caractères spéciaux (???)

## Problème
Les caractères spéciaux (accents français, etc.) s'affichent comme "???" dans la version en ligne de l'application.

## Solutions appliquées

### 1. Configuration de la base de données MySQL
✅ **URL de connexion MySQL mise à jour** avec les paramètres UTF-8 :
- `useUnicode=true`
- `characterEncoding=UTF-8`

Fichiers modifiés :
- `reconciliation-app/backend/src/main/resources/application.properties`
- `reconciliation-app/backend/src/main/resources/application-prod.properties`
- `reconciliation-app/backend/src/main/resources/application-ssl.properties.example`
- `docker/docker-compose.yml`

### 2. Filtre global pour forcer UTF-8
✅ **Nouveau filtre créé** : `CharacterEncodingFilter.java`
- Force l'encodage UTF-8 sur toutes les requêtes et réponses HTTP
- Ajoute automatiquement le charset dans les headers Content-Type

### 3. Configuration des message converters
✅ **WebConfig.java mis à jour** :
- Configure `StringHttpMessageConverter` avec UTF-8
- Configure `MappingJackson2HttpMessageConverter` avec UTF-8
- Garantit que toutes les réponses JSON utilisent UTF-8

### 4. Configuration Nginx
✅ **nginx.conf mis à jour** :
- Ajout de `charset utf-8;` dans la configuration serveur
- Ajout de `Content-Type: text/html; charset=utf-8` pour les fichiers HTML
- Ajout de `Accept-Charset: UTF-8` dans les headers proxy vers le backend

✅ **frontend/nginx.conf mis à jour** :
- Même configuration pour le conteneur Docker frontend

## Vérification de la base de données MySQL

### Si vous utilisez une base de données existante

1. **Vérifier le charset de la base de données** :
```sql
SHOW CREATE DATABASE top20;
```

2. **Si la base n'utilise pas utf8mb4, la convertir** :
```sql
ALTER DATABASE top20 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

3. **Vérifier le charset des tables** :
```sql
SELECT TABLE_NAME, TABLE_COLLATION 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'top20';
```

4. **Convertir les tables si nécessaire** :
```sql
-- Pour chaque table (remplacez 'nom_table' par le nom réel)
ALTER TABLE nom_table CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Script SQL pour convertir toutes les tables en une fois

```sql
-- Générer les commandes ALTER TABLE pour toutes les tables
SELECT CONCAT('ALTER TABLE `', TABLE_NAME, '` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;') 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'top20' 
AND TABLE_COLLATION != 'utf8mb4_unicode_ci';
```

Copiez et exécutez les commandes générées.

## Redémarrage requis

Après ces modifications, vous devez :

1. **Redémarrer le backend Spring Boot** :
   ```bash
   # Arrêter le backend
   # Puis redémarrer
   cd reconciliation-app/backend
   mvn spring-boot:run
   ```

2. **Redémarrer Nginx** (si utilisé) :
   ```bash
   sudo systemctl restart nginx
   # ou
   sudo service nginx restart
   ```

3. **Si vous utilisez Docker** :
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

## Vérification

1. **Vérifier les headers HTTP** :
   - Ouvrez les outils de développement du navigateur (F12)
   - Allez dans l'onglet "Network"
   - Vérifiez qu'un header `Content-Type` contient `charset=utf-8` ou `charset=UTF-8`

2. **Tester avec des caractères spéciaux** :
   - Créez ou modifiez un enregistrement avec des accents (é, è, à, ç, etc.)
   - Vérifiez que les caractères s'affichent correctement

3. **Vérifier la base de données** :
   ```sql
   -- Tester avec une requête contenant des caractères spéciaux
   SELECT * FROM votre_table WHERE nom LIKE '%é%';
   ```

## Notes importantes

- Les modifications sont rétroactives pour les nouvelles données
- Les données existantes déjà corrompues (stockées avec un mauvais encodage) devront être réimportées
- Si vous avez des données existantes avec des "???", vous devrez peut-être les réimporter depuis la source originale avec le bon encodage

## Support

Si le problème persiste après ces modifications :
1. Vérifiez les logs du backend pour des erreurs d'encodage
2. Vérifiez la configuration MySQL (`my.cnf` ou `my.ini`)
3. Vérifiez que les fichiers source (CSV, Excel) sont bien en UTF-8 lors de l'import

