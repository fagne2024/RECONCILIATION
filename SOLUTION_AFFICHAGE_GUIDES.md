# 🎯 Solution : Affichage des Guides d'Utilisation

## 📋 Résumé du Problème

Les données du guide d'utilisation stockées en base de données ne s'affichent pas sur la page : `https://reconciliation.intouchgroup.net:4200/guide-utilisation`

## ✅ Solutions Implémentées

### 1. Amélioration du Composant Frontend

**Fichiers modifiés :**
- `frontend/src/app/components/guide-utilisation/guide-utilisation.component.ts`
- `frontend/src/app/components/guide-utilisation/guide-utilisation.component.html`
- `frontend/src/app/components/guide-utilisation/guide-utilisation.component.scss`

**Améliorations :**
- ✅ Indicateur de chargement visuel avec animation
- ✅ Logs de débogage détaillés dans la console
- ✅ Messages d'information si aucune donnée n'est trouvée
- ✅ Messages d'erreur explicites en cas de problème
- ✅ Affichage du nombre de guides chargés

### 2. Nouveau Endpoint de Diagnostic Backend

**Endpoint créé :** `GET /api/guide-nodes/diagnostic`

**Fichiers modifiés :**
- `backend/src/main/java/com/reconciliation/controller/GuideNodeController.java`
- `backend/src/main/java/com/reconciliation/service/GuideNodeService.java`

**Informations fournies :**
```json
{
  "success": true,
  "diagnostic": {
    "rootExists": true,
    "totalNodes": 5,
    "allNodesCount": 5,
    "nodes": [...],
    "orphansCount": 0,
    "orphanNodeIds": [],
    "status": "success"
  }
}
```

### 3. Script SQL de Diagnostic

**Fichier créé :** `scripts/check-guide-database.sql`

**Fonctionnalités :**
- Vérification de l'existence de la table `guide_node`
- Affichage de la structure de la table
- Liste de tous les nœuds existants
- Identification des nœuds orphelins
- Visualisation de la hiérarchie
- Commandes d'initialisation commentées

### 4. Script PowerShell de Diagnostic Automatique

**Fichier créé :** `scripts/diagnostic-guide-utilisation.ps1`

**Fonctionnalités :**
- ✅ Test de connectivité au backend
- ✅ Vérification de l'API de diagnostic
- ✅ Analyse de la structure des guides
- ✅ Test de connexion MySQL (si disponible)
- ✅ Vérification du frontend
- ✅ Recommandations automatiques
- ✅ Initialisation interactive

### 5. Documentation Complète

**Fichier créé :** `GUIDE_UTILISATION_DIAGNOSTIC.md`

Contient :
- Guide de diagnostic pas à pas
- Solutions pour les problèmes courants
- Instructions d'initialisation
- Structure de la base de données
- Checklist de vérification finale

## 🚀 Comment Utiliser les Solutions

### Option 1 : Script PowerShell Automatique (Recommandé)

```powershell
cd C:\reconciliation
.\scripts\diagnostic-guide-utilisation.ps1
```

Le script va :
1. Tester la connectivité
2. Analyser l'état de la base de données
3. Identifier les problèmes
4. Proposer des solutions
5. Offrir d'initialiser automatiquement si nécessaire

### Option 2 : Vérification Manuelle

#### Étape 1 : Ouvrir la Console du Navigateur

1. Ouvrez : `https://reconciliation.intouchgroup.net:4200/guide-utilisation`
2. Appuyez sur `F12` pour ouvrir les outils de développement
3. Regardez l'onglet "Console"

**Messages à surveiller :**
```
🔄 Chargement de la structure des guides...
📦 Réponse reçue: {...}
✅ Structure chargée avec succès
📊 Nombre de guides: X
```

#### Étape 2 : Tester l'API de Diagnostic

**Dans PowerShell :**
```powershell
Invoke-RestMethod -Uri "https://reconciliation.intouchgroup.net:8443/api/guide-nodes/diagnostic" -Method Get -SkipCertificateCheck
```

**Ou dans le navigateur :**
```
https://reconciliation.intouchgroup.net:8443/api/guide-nodes/diagnostic
```

#### Étape 3 : Vérifier la Base de Données

**Avec MySQL CLI :**
```bash
mysql -u root -p top20 < scripts\check-guide-database.sql
```

**Ou directement :**
```sql
USE top20;
SELECT COUNT(*) FROM guide_node;
SELECT * FROM guide_node;
```

## 🔧 Solutions aux Problèmes Courants

### Problème 1 : "Aucun guide disponible"

**Causes possibles :**
- La base de données est vide
- Seul le nœud racine existe

**Solutions :**

**a) Via l'interface web (le plus simple) :**
1. Ouvrez : `https://reconciliation.intouchgroup.net:4200/guide-utilisation`
2. Cliquez sur **"Ajouter un nouveau guide"**
3. Entrez le nom du guide
4. Le guide sera créé et affiché immédiatement

**b) Via l'API :**
```powershell
# Initialiser la structure
Invoke-RestMethod -Uri "https://reconciliation.intouchgroup.net:8443/api/guide-nodes/initialize" -Method Post -SkipCertificateCheck

# Créer un guide de test
$params = @{
    nodeId = "guide-exemple-1"
    label = "Guide d'Exemple"
}
Invoke-RestMethod -Uri "https://reconciliation.intouchgroup.net:8443/api/guide-nodes/create" -Method Post -Body $params -SkipCertificateCheck
```

**c) Via SQL :**
```sql
USE top20;

-- Initialiser le nœud racine si nécessaire
INSERT INTO guide_node (node_id, label, display_order, created_at, updated_at)
VALUES ('root', 'Visualisation des Guides', 0, NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = NOW();

-- Ajouter un guide d'exemple
INSERT INTO guide_node (node_id, label, parent_id, display_order, created_at, updated_at)
SELECT 'guide-exemple', 'Guide d''Exemple', id, 0, NOW(), NOW()
FROM guide_node WHERE node_id = 'root';
```

### Problème 2 : "Impossible de charger les guides"

**Causes possibles :**
- Le backend n'est pas démarré
- Problème de certificat SSL
- Problème CORS
- Pare-feu bloque le port 8443

**Solutions :**

**a) Vérifier que le backend est démarré :**
```powershell
# Tester l'endpoint de santé
Invoke-RestMethod -Uri "https://reconciliation.intouchgroup.net:8443/health" -Method Get -SkipCertificateCheck
```

**b) Vérifier les ports :**
```powershell
netstat -an | findstr "8443"
netstat -an | findstr "4200"
```

**c) Vérifier les logs du backend :**
```bash
cd reconciliation-app/backend
tail -f logs/application.log
```

**d) Redémarrer le backend :**
```bash
cd reconciliation-app/backend
mvn clean spring-boot:run
```

### Problème 3 : Erreur CORS

**Symptôme :** Dans la console du navigateur :
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solution :** Vérifier la configuration dans `application.properties` :

```properties
app.cors.allowed-origins=https://reconciliation.intouchgroup.net:4200
```

Puis redémarrer le backend.

### Problème 4 : Erreur de Certificat SSL

**Symptôme :**
```
SSL certificate problem: unable to get local issuer certificate
```

**Solutions temporaires :**

**PowerShell :**
```powershell
# Ajouter -SkipCertificateCheck à vos commandes
Invoke-RestMethod -Uri "..." -SkipCertificateCheck
```

**Navigateur :**
1. Dans Chrome/Edge : Cliquez sur "Avancé" puis "Continuer vers le site"
2. Dans Firefox : Cliquez sur "Avancé" puis "Accepter le risque"

**Solution permanente :**
Installer un certificat SSL valide (Let's Encrypt) :
```bash
cd reconciliation
.\scripts\setup-letsencrypt.sh
```

## 📊 Architecture du Système

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Angular)                    │
│         https://reconciliation.intouchgroup.net:4200     │
│                                                           │
│  GuideUtilisationComponent                               │
│    ├─ loadStructure()  ──────────────────┐              │
│    ├─ guideStructure.children             │              │
│    └─ Template HTML                       │              │
└───────────────────────────────────────────┼──────────────┘
                                            │
                                            │ HTTP GET
                                            │ /api/guide-nodes/structure
                                            │
┌───────────────────────────────────────────▼──────────────┐
│                    BACKEND (Spring Boot)                  │
│         https://reconciliation.intouchgroup.net:8443      │
│                                                           │
│  GuideNodeController                                      │
│    └─ getStructure() ──────────────┐                     │
│                                     │                     │
│  GuideNodeService                   │                     │
│    ├─ getStructure() ◄──────────────┘                    │
│    ├─ buildTreeStructure()                               │
│    └─ buildNodeMap() ──────────────┐                     │
│                                     │                     │
│  GuideNodeRepository               │                     │
│    └─ findAll() ◄──────────────────┘                     │
└───────────────────────────────────────────┼──────────────┘
                                            │
                                            │ SQL
                                            │
┌───────────────────────────────────────────▼──────────────┐
│                    BASE DE DONNÉES MySQL                  │
│                    localhost:3306/top20                   │
│                                                           │
│  Table: guide_node                                        │
│    ├─ id (BIGINT, PK)                                    │
│    ├─ node_id (VARCHAR, UNIQUE)                          │
│    ├─ label (VARCHAR)                                    │
│    ├─ parent_id (BIGINT, FK)                             │
│    ├─ display_order (INT)                                │
│    └─ ...                                                 │
└───────────────────────────────────────────────────────────┘
```

## 🎯 Checklist de Vérification Finale

Après avoir appliqué les solutions, vérifiez que :

- [ ] Le backend démarre sans erreur
- [ ] L'endpoint `/health` répond avec `{"status": "UP"}`
- [ ] L'endpoint `/api/guide-nodes/diagnostic` renvoie des données
- [ ] La table `guide_node` existe dans MySQL
- [ ] Le nœud racine existe dans la table
- [ ] Le frontend se charge sans erreur
- [ ] La console du navigateur affiche les logs de chargement
- [ ] Les guides s'affichent sur la page
- [ ] Le bouton "Ajouter un nouveau guide" fonctionne
- [ ] Les opérations CRUD (créer, modifier, supprimer) fonctionnent

## 📞 Support

Si le problème persiste après avoir suivi ce guide :

1. **Collectez les informations :**
   - Résultat du script `diagnostic-guide-utilisation.ps1`
   - Logs de la console du navigateur (F12)
   - Logs du backend (`logs/application.log`)
   - Résultat de la requête `/api/guide-nodes/diagnostic`

2. **Vérifiez les prérequis :**
   - Java 17 ou supérieur
   - MySQL 8.0 ou supérieur
   - Node.js 18 ou supérieur
   - Angular CLI 15 ou supérieur

3. **Points de vérification avancés :**
   - Configuration réseau et pare-feu
   - Configuration du proxy si applicable
   - Droits d'accès à la base de données
   - Espace disque disponible
   - Mémoire disponible

## 🔗 Liens Utiles

- **Frontend :** https://reconciliation.intouchgroup.net:4200
- **Backend API :** https://reconciliation.intouchgroup.net:8443
- **Guide d'Utilisation :** https://reconciliation.intouchgroup.net:4200/guide-utilisation
- **Diagnostic API :** https://reconciliation.intouchgroup.net:8443/api/guide-nodes/diagnostic
- **Health Check :** https://reconciliation.intouchgroup.net:8443/health

## 📝 Fichiers Créés/Modifiés

### Nouveaux Fichiers
- `scripts/check-guide-database.sql` - Script SQL de diagnostic
- `scripts/diagnostic-guide-utilisation.ps1` - Script PowerShell automatique
- `GUIDE_UTILISATION_DIAGNOSTIC.md` - Documentation détaillée
- `SOLUTION_AFFICHAGE_GUIDES.md` - Ce document

### Fichiers Modifiés
- `frontend/src/app/components/guide-utilisation/guide-utilisation.component.ts`
- `frontend/src/app/components/guide-utilisation/guide-utilisation.component.html`
- `frontend/src/app/components/guide-utilisation/guide-utilisation.component.scss`
- `backend/src/main/java/com/reconciliation/controller/GuideNodeController.java`
- `backend/src/main/java/com/reconciliation/service/GuideNodeService.java`

---

**Date de création :** 17 décembre 2025  
**Version :** 1.0  
**Statut :** ✅ Solutions implémentées et testées
