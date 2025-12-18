# Diagnostic et Résolution - Affichage des Guides d'Utilisation

## 🔍 Problème

Les données stockées en base de données ne s'affichent pas sur la page Guide d'Utilisation (`https://reconciliation.intouchgroup.net:4200/guide-utilisation`).

## ✅ Solutions Implémentées

### 1. Ajout d'un Indicateur de Chargement

Le composant frontend a été amélioré avec :
- Un indicateur de chargement visuel pendant le chargement des données
- Des logs de débogage détaillés dans la console du navigateur
- Des messages d'information si aucune donnée n'est trouvée
- Des messages d'erreur en cas de problème de connexion

### 2. Endpoint de Diagnostic Backend

Un nouvel endpoint a été créé : `GET /api/guide-nodes/diagnostic`

Cet endpoint fournit :
- Vérification de l'existence du nœud racine
- Nombre total de nœuds dans la base
- Liste détaillée de tous les nœuds
- Identification des nœuds orphelins

### 3. Script SQL de Vérification

Un script SQL (`scripts/check-guide-database.sql`) a été créé pour :
- Vérifier l'existence de la table `guide_node`
- Afficher la structure et les données existantes
- Identifier les problèmes potentiels
- Fournir des commandes d'initialisation

## 🔧 Étapes de Diagnostic

### Étape 1 : Vérifier la Console du Navigateur

1. Ouvrez la page : https://reconciliation.intouchgroup.net:4200/guide-utilisation
2. Ouvrez les outils de développement (F12)
3. Regardez la console pour les messages suivants :

```
🔄 Chargement de la structure des guides...
📦 Réponse reçue: {...}
✅ Structure chargée avec succès: {...}
📊 Nombre de guides: X
```

**Si vous voyez :**
- `❌ Erreur lors du chargement` → Problème de connexion au backend
- `⚠️ Aucun guide trouvé` → La base de données est vide
- Aucun message → Le backend ne répond pas

### Étape 2 : Tester l'Endpoint de Diagnostic

Ouvrez un navigateur ou utilisez curl pour tester :

```bash
curl https://reconciliation.intouchgroup.net:8443/api/guide-nodes/diagnostic
```

Ou dans PowerShell :

```powershell
Invoke-RestMethod -Uri "https://reconciliation.intouchgroup.net:8443/api/guide-nodes/diagnostic" -Method Get
```

**Réponse attendue :**
```json
{
  "success": true,
  "diagnostic": {
    "rootExists": true,
    "totalNodes": X,
    "allNodesCount": X,
    "nodes": [...],
    "orphansCount": 0,
    "status": "success"
  }
}
```

### Étape 3 : Vérifier la Base de Données

Connectez-vous à MySQL et exécutez le script de diagnostic :

```bash
mysql -u root -p top20 < scripts/check-guide-database.sql
```

Ou dans un client MySQL :

```sql
USE top20;
SELECT COUNT(*) FROM guide_node;
SELECT * FROM guide_node WHERE node_id = 'root';
```

### Étape 4 : Vérifier les Logs du Backend

Consultez les logs de l'application Spring Boot :

```bash
# Dans le répertoire du backend
tail -f logs/application.log
```

Recherchez les messages :
- `✅` : Opérations réussies
- `❌` : Erreurs
- `⚠️` : Avertissements

## 🚀 Initialisation de la Structure

### Option 1 : Initialisation Automatique

Le backend initialise automatiquement le nœud racine au démarrage. Redémarrez simplement l'application :

```bash
# Arrêter l'application
# Ctrl+C

# Redémarrer
mvn spring-boot:run
```

### Option 2 : Initialisation Manuelle via API

```bash
curl -X POST https://reconciliation.intouchgroup.net:8443/api/guide-nodes/initialize
```

Ou dans PowerShell :

```powershell
Invoke-RestMethod -Uri "https://reconciliation.intouchgroup.net:8443/api/guide-nodes/initialize" -Method Post
```

### Option 3 : Initialisation Manuelle via SQL

Si la table est vide, exécutez :

```sql
USE top20;

-- Créer le nœud racine
INSERT INTO guide_node (node_id, label, display_order, created_at, updated_at)
VALUES ('root', 'Visualisation des Guides', 0, NOW(), NOW());

-- Ajouter un guide de test
INSERT INTO guide_node (node_id, label, parent_id, display_order, created_at, updated_at)
SELECT 'guide-exemple', 'Guide d''Exemple', id, 0, NOW(), NOW()
FROM guide_node WHERE node_id = 'root';
```

## 📝 Création de Guides via l'Interface

Une fois que le nœud racine est initialisé :

1. Actualisez la page : https://reconciliation.intouchgroup.net:4200/guide-utilisation
2. Cliquez sur le bouton **"Ajouter un nouveau guide"**
3. Entrez le libellé du guide
4. Le guide sera créé et affiché immédiatement

## 🔍 Problèmes Courants

### Problème 1 : "Aucun guide disponible pour le moment"

**Cause :** La base de données ne contient aucun guide.

**Solution :**
1. Cliquez sur "Ajouter un nouveau guide"
2. Ou initialisez via l'API ou SQL (voir ci-dessus)

### Problème 2 : "Impossible de charger les guides depuis le serveur"

**Cause :** Le backend n'est pas accessible.

**Solutions :**
1. Vérifiez que le backend est démarré : `netstat -an | findstr 8443`
2. Vérifiez les logs du backend
3. Vérifiez la configuration CORS dans `application.properties`
4. Vérifiez le certificat SSL

### Problème 3 : Erreur CORS

**Cause :** L'origine n'est pas autorisée.

**Solution :** Vérifiez `application.properties` :

```properties
app.cors.allowed-origins=https://reconciliation.intouchgroup.net:4200
```

### Problème 4 : Table guide_node n'existe pas

**Cause :** La base de données n'a pas été créée par Hibernate.

**Solutions :**
1. Vérifiez `application.properties` :
   ```properties
   spring.jpa.hibernate.ddl-auto=update
   ```
2. Redémarrez l'application backend
3. Vérifiez les logs pour les erreurs de création de table

## 📊 Structure de la Table guide_node

```sql
CREATE TABLE guide_node (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    node_id VARCHAR(255) NOT NULL UNIQUE,
    label VARCHAR(500) NOT NULL,
    route VARCHAR(500),
    description TEXT,
    parent_id BIGINT,
    display_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (parent_id) REFERENCES guide_node(id) ON DELETE CASCADE
);
```

## 🎯 Vérification Finale

Après avoir résolu le problème :

1. ✅ La page charge sans erreur
2. ✅ Les guides s'affichent correctement
3. ✅ Vous pouvez ajouter de nouveaux guides
4. ✅ Vous pouvez modifier/supprimer des guides existants
5. ✅ Les sous-guides s'affichent correctement

## 📞 Support

Si le problème persiste après avoir suivi ces étapes :

1. Collectez les logs :
   - Logs backend (application.log)
   - Console navigateur (F12)
   - Résultat du diagnostic SQL

2. Vérifiez :
   - Version de Java (minimum Java 17)
   - Version de MySQL (minimum 8.0)
   - Configuration réseau et pare-feu

3. Contactez l'équipe de développement avec les informations collectées.


