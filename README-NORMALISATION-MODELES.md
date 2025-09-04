# 🔧 Normalisation des Modèles et Chargement depuis Watch-Folder

## 📋 Vue d'ensemble

Ce document décrit les nouvelles fonctionnalités ajoutées pour normaliser les modèles de traitement automatique et permettre leur chargement depuis le watch-folder.

## 🎯 Fonctionnalités ajoutées

### 1. 🔧 Normalisation automatique des modèles

#### Service de normalisation (`ModelNormalizationService`)
- **Normalisation des noms de modèles** : Correction automatique des caractères spéciaux, capitalisation, mapping des noms courants
- **Normalisation des patterns de fichiers** : Optimisation des expressions régulières, mapping des patterns courants
- **Normalisation des clés de réconciliation** : Standardisation des noms de colonnes
- **Normalisation des règles de traitement** : Correction des noms de colonnes et des types de format
- **Validation des modèles** : Vérification de la cohérence et de la validité
- **Génération d'IDs** : Création automatique d'identifiants uniques

#### Mapping des noms courants
```java
// Noms de modèles
"TRXBO" → "Transaction Back Office"
"TRXBO_CM" → "Transaction Back Office Cameroun"
"OM_CM" → "Orange Money Cameroun"
"MTN_CM" → "MTN Mobile Money Cameroun"

// Patterns de fichiers
"TRXBO" → ".*TRXBO.*\\.(csv|xlsx?)$"
"OM" → ".*Orange.*Money.*\\.(csv|xlsx?)$"
"MTN" → ".*MTN.*\\.(csv|xlsx?)$"
```

### 2. 📁 Chargement depuis le watch-folder

#### Service de surveillance (`ModelWatchFolderService`)
- **Scan automatique** : Détection des fichiers JSON dans le dossier `watch-folder/models`
- **Import automatique** : Chargement et validation des modèles
- **Surveillance en temps réel** : Détection des nouveaux fichiers et modifications
- **Mise à jour automatique** : Synchronisation avec la base de données
- **Gestion d'erreurs** : Validation et reporting des erreurs

#### Structure du watch-folder
```
watch-folder/
├── models/                    # Dossier des modèles JSON
│   ├── TRXBO_CM.json         # Modèle TRXBO Cameroun
│   ├── OM_CM.json            # Modèle Orange Money Cameroun
│   └── MTN_CM.json           # Modèle MTN Mobile Money Cameroun
└── processed/                 # Fichiers traités
```

### 3. 🎯 Gestion intelligente des modèles

#### Contrôleur de gestion (`ModelManagementController`)
- **Normalisation en masse** : Normalisation de tous les modèles existants
- **Normalisation individuelle** : Normalisation d'un modèle spécifique
- **Import depuis watch-folder** : Import automatique des modèles JSON
- **Validation des modèles** : Vérification de la validité avant import
- **Statistiques** : Métriques détaillées sur les modèles
- **Surveillance** : Démarrage/arrêt de la surveillance du watch-folder

#### API Endpoints
```
POST /api/model-management/normalize-all          # Normaliser tous les modèles
POST /api/model-management/normalize/{modelId}    # Normaliser un modèle
POST /api/model-management/import-from-watch-folder # Importer depuis watch-folder
GET  /api/model-management/load-from-watch-folder  # Charger depuis watch-folder
POST /api/model-management/start-watch-folder-monitoring # Démarrer surveillance
POST /api/model-management/create-example-model   # Créer modèle d'exemple
POST /api/model-management/validate               # Valider un modèle
POST /api/model-management/generate-model-id      # Générer un ID
GET  /api/model-management/statistics             # Statistiques des modèles
```

### 4. 🔄 Service frontend

#### Service de gestion (`ModelManagementService`)
- **Normalisation côté client** : Normalisation en temps réel dans l'interface
- **Validation en temps réel** : Vérification avant sauvegarde
- **Génération d'IDs** : Création automatique d'identifiants
- **Import/Export** : Gestion des modèles depuis le watch-folder
- **Statistiques** : Affichage des métriques

## 📊 Format des modèles JSON

### Structure d'un modèle
```json
{
  "name": "TRXBO Cameroun",
  "filePattern": ".*TRXBO.*CM.*\\.(csv|xlsx?)$",
  "fileType": "bo",
  "autoApply": true,
  "templateFile": "",
  "reconciliationKeys": {
    "boKeys": ["IDTransaction", "Numéro Transaction"],
    "partnerKeys": ["External ID", "Transaction ID"]
  },
  "columnProcessingRules": [
    {
      "sourceColumn": "IDTransaction",
      "targetColumn": "ID Transaction",
      "formatType": "string",
      "trimSpaces": true,
      "ruleOrder": 1
    },
    {
      "sourceColumn": "Montant",
      "targetColumn": "Montant (XAF)",
      "formatType": "numeric",
      "trimSpaces": true,
      "ruleOrder": 2
    }
  ]
}
```

### Types de fichiers supportés
- **BO** : Fichiers Back Office
- **Partner** : Fichiers Partenaires
- **Both** : Fichiers mixtes

### Types de format
- **string** : Texte
- **numeric** : Numérique
- **date** : Date
- **boolean** : Booléen

## 🚀 Utilisation

### 1. Démarrage rapide

```powershell
# Exécuter le script de test et déploiement
.\normalisation-modeles-watch-folder.ps1
```

### 2. Création manuelle de modèles

1. **Créer le dossier watch-folder** :
   ```bash
   mkdir -p watch-folder/models
   ```

2. **Ajouter un modèle JSON** :
   ```bash
   # Créer un fichier TRXBO_CM.json dans watch-folder/models/
   # Le modèle sera automatiquement importé
   ```

3. **Vérifier l'import** :
   ```bash
   # Consulter les logs du backend
   # Ou utiliser l'API GET /api/model-management/statistics
   ```

### 3. Normalisation des modèles existants

```bash
# Normaliser tous les modèles
curl -X POST http://localhost:8080/api/model-management/normalize-all

# Normaliser un modèle spécifique
curl -X POST http://localhost:8080/api/model-management/normalize/{modelId}
```

### 4. Surveillance en temps réel

```bash
# Démarrer la surveillance
curl -X POST http://localhost:8080/api/model-management/start-watch-folder-monitoring

# La surveillance détecte automatiquement les nouveaux fichiers
# et les importe dans la base de données
```

## 🔧 Configuration

### Propriétés de configuration
```properties
# Chemin du watch-folder
app.watch-folder.path=../watch-folder

# Chemin du dossier models
app.watch-folder.models-path=../watch-folder/models
```

### Variables d'environnement
```bash
# Définir les chemins personnalisés
export APP_WATCH_FOLDER_PATH=/custom/path/to/watch-folder
export APP_WATCH_FOLDER_MODELS_PATH=/custom/path/to/models
```

## 📈 Avantages

### 1. **Normalisation automatique**
- ✅ Noms de modèles cohérents
- ✅ Patterns de fichiers optimisés
- ✅ Clés de réconciliation standardisées
- ✅ Règles de traitement normalisées

### 2. **Import automatique**
- ✅ Chargement depuis fichiers JSON
- ✅ Surveillance en temps réel
- ✅ Validation automatique
- ✅ Mise à jour automatique

### 3. **Gestion intelligente**
- ✅ Génération automatique d'IDs
- ✅ Validation des modèles
- ✅ Statistiques détaillées
- ✅ Mapping des noms courants

### 4. **API REST complète**
- ✅ Endpoints de normalisation
- ✅ Endpoints d'import/export
- ✅ Endpoints de surveillance
- ✅ Endpoints de validation

## 🧪 Tests

### Script de test automatique
Le script `normalisation-modeles-watch-folder.ps1` teste automatiquement :

1. **Connectivité** : Vérification de l'accessibilité du backend
2. **Création des dossiers** : Création du watch-folder et du dossier models
3. **Création de modèles d'exemple** : Génération de modèles de test
4. **Normalisation** : Test de la normalisation des modèles
5. **Import** : Test de l'import depuis le watch-folder
6. **Surveillance** : Test de la surveillance en temps réel
7. **Validation** : Test de la validation des modèles
8. **Statistiques** : Test des statistiques des modèles

### Tests manuels
```bash
# Tester la normalisation
curl -X POST http://localhost:8080/api/model-management/normalize-all

# Tester l'import
curl -X POST http://localhost:8080/api/model-management/import-from-watch-folder

# Tester les statistiques
curl -X GET http://localhost:8080/api/model-management/statistics
```

## 🔍 Dépannage

### Problèmes courants

1. **Modèles non importés** :
   - Vérifier que les fichiers JSON sont valides
   - Vérifier que le dossier `watch-folder/models` existe
   - Consulter les logs du backend

2. **Surveillance non active** :
   - Redémarrer la surveillance via l'API
   - Vérifier les permissions sur le dossier watch-folder

3. **Erreurs de normalisation** :
   - Vérifier la structure des modèles JSON
   - Consulter les logs de validation

### Logs utiles
```bash
# Logs de normalisation
🔧 Normalisation du modèle: {modelId}
✅ Modèle normalisé: {name}

# Logs d'import
📁 Import des modèles depuis le watch-folder
✅ Modèle importé: {name}

# Logs de surveillance
👀 Surveillance du dossier models démarrée
📄 Nouveau fichier modèle détecté: {filename}
```

## 📞 Support

Pour toute question ou problème :

1. **Vérifier les logs** : Consulter les logs du backend
2. **Exécuter les tests** : Utiliser le script de test automatique
3. **Vérifier la configuration** : Contrôler les chemins et permissions
4. **Consulter la documentation** : Référence API et exemples

---

**Date de mise à jour :** $(Get-Date -Format "dd/MM/yyyy HH:mm")
**Version :** 1.0.0
**Statut :** ✅ Prêt pour production
