# 🔄 Guide d'Utilisation du Système de Surveillance de Fichiers

## 📋 Vue d'ensemble

Le système de surveillance de fichiers permet de traiter automatiquement les fichiers déposés dans un dossier spécifique selon des règles de traitement personnalisées.

## 🚀 Installation et Configuration

### 1. Installation des dépendances

```powershell
# Exécuter le script d'installation
.\install-file-watcher.ps1
```

### 2. Démarrage du système

```bash
# Backend
npm run start

# Frontend (dans un autre terminal)
cd frontend
npm start
```

## 📁 Structure des dossiers

```
reconciliation-app/
├── watch-folder/           # Dossier surveillé
│   ├── exemple_clients.csv # Fichier d'exemple
│   └── processed/          # Dossier de sortie
└── ...
```

## 🎯 Fonctionnalités principales

### 1. Surveillance automatique
- Détection automatique des nouveaux fichiers
- Traitement selon les spécifications configurées
- Queue de traitement pour éviter les conflits

### 2. Types de fichiers supportés
- **CSV** : Fichiers délimités (point-virgule, virgule, etc.)
- **JSON** : Fichiers de données structurées
- **XML** : Fichiers de données XML
- **Excel** : Fichiers Excel (.xlsx, .xls)

### 3. Transformations disponibles
- **Formatage** : uppercase, lowercase, trim
- **Validation** : notEmpty, isNumber, isEmail
- **Transformation** : replace, extract

### 4. Formats de sortie
- **JSON** : Données structurées
- **CSV** : Fichiers délimités
- **Base de données** : Insertion directe

## 📝 Création de spécifications

### Interface utilisateur
1. Accédez à l'interface de surveillance
2. Cliquez sur "+ Nouvelle Spécification"
3. Remplissez les champs requis :
   - **Nom** : Nom descriptif de la spécification
   - **Pattern** : Pattern de fichiers (ex: `*.csv`, `clients_*.csv`)
   - **Type** : Type de fichier à traiter
   - **Délimiteur** : Pour les fichiers CSV (ex: `;`, `,`)
   - **Format de sortie** : Format des fichiers traités
   - **Traitement automatique** : Activer/désactiver le traitement automatique

### Exemples de patterns
```
*.csv              # Tous les fichiers CSV
clients_*.csv      # Fichiers CSV commençant par "clients_"
*_2024.csv         # Fichiers CSV se terminant par "_2024.csv"
/data/*.json       # Fichiers JSON dans le dossier data
```

## 🔧 Configuration avancée

### Transformations personnalisées

#### Formatage
```json
{
  "type": "format",
  "field": "nom",
  "action": "uppercase"
}
```

#### Validation
```json
{
  "type": "validate",
  "field": "email",
  "action": "isEmail"
}
```

#### Transformation
```json
{
  "type": "transform",
  "field": "montant",
  "action": "replace",
  "params": {
    "search": ",",
    "replace": "."
  }
}
```

### Mapping des colonnes
```json
{
  "mapping": {
    "nom_client": "nom",
    "email_client": "email",
    "tel_client": "telephone"
  }
}
```

## 📊 API Endpoints

### Surveillance
- `POST /api/file-watcher/start` - Démarrer la surveillance
- `POST /api/file-watcher/stop` - Arrêter la surveillance
- `GET /api/file-watcher/status` - Statut de la surveillance

### Spécifications
- `POST /api/file-watcher/specifications` - Créer une spécification
- `GET /api/file-watcher/specifications` - Lister les spécifications
- `GET /api/file-watcher/specifications/:id` - Obtenir une spécification
- `PUT /api/file-watcher/specifications/:id` - Modifier une spécification
- `DELETE /api/file-watcher/specifications/:id` - Supprimer une spécification

### Traitement manuel
- `POST /api/file-watcher/process-file` - Traiter un fichier manuellement

### Exemples
- `GET /api/file-watcher/examples` - Obtenir des exemples de spécifications

## 💡 Exemples d'utilisation

### Exemple 1 : Traitement de fichiers CSV clients

**Spécification :**
```json
{
  "name": "Fichiers CSV clients",
  "filePattern": "clients_*.csv",
  "processingType": "csv",
  "delimiter": ";",
  "encoding": "utf8",
  "outputFormat": "json",
  "autoProcess": true,
  "transformations": [
    {
      "type": "format",
      "field": "nom",
      "action": "uppercase"
    },
    {
      "type": "validate",
      "field": "email",
      "action": "isEmail"
    },
    {
      "type": "transform",
      "field": "montant",
      "action": "replace",
      "params": {
        "search": ",",
        "replace": "."
      }
    }
  ]
}
```

**Fichier d'entrée :** `clients_janvier.csv`
```csv
nom;email;telephone;montant
Jean Dupont;jean.dupont@email.com;0123456789;1500,50
Marie Martin;marie.martin@email.com;0987654321;2300,75
```

**Fichier de sortie :** `clients_janvier_processed_2024-01-15T10-30-45.json`
```json
[
  {
    "nom": "JEAN DUPONT",
    "email": "jean.dupont@email.com",
    "telephone": "0123456789",
    "montant": "1500.50"
  },
  {
    "nom": "MARIE MARTIN",
    "email": "marie.martin@email.com",
    "telephone": "0987654321",
    "montant": "2300.75"
  }
]
```

### Exemple 2 : Traitement de fichiers JSON de transactions

**Spécification :**
```json
{
  "name": "Transactions JSON",
  "filePattern": "transactions_*.json",
  "processingType": "json",
  "outputFormat": "csv",
  "autoProcess": true,
  "transformations": [
    {
      "type": "validate",
      "field": "montant",
      "action": "isNumber"
    }
  ]
}
```

## 🔍 Surveillance et logs

### Logs de traitement
Les logs de traitement sont affichés dans la console du backend :
```
Nouveau fichier détecté: watch-folder/clients_janvier.csv
Traitement de: clients_janvier.csv avec la spécification: Fichiers CSV clients
Traitement réussi: clients_janvier.csv -> watch-folder/processed/clients_janvier_processed_2024-01-15T10-30-45.json
```

### Statut en temps réel
L'interface affiche :
- Statut de la surveillance (actif/inactif)
- Nombre de fichiers en attente
- Dossier surveillé

## ⚠️ Dépannage

### Problèmes courants

1. **Fichier non traité**
   - Vérifiez que le pattern correspond au nom du fichier
   - Vérifiez que la spécification est active (autoProcess: true)
   - Consultez les logs pour les erreurs

2. **Erreur de format**
   - Vérifiez le délimiteur pour les fichiers CSV
   - Vérifiez l'encodage du fichier
   - Testez avec un fichier d'exemple

3. **Surveillance ne démarre pas**
   - Vérifiez que le dossier watch-folder existe
   - Vérifiez les permissions du dossier
   - Redémarrez le backend

### Commandes de diagnostic

```bash
# Vérifier le statut de la surveillance
curl http://localhost:3000/api/file-watcher/status

# Lister les spécifications
curl http://localhost:3000/api/file-watcher/specifications

# Tester le traitement manuel
curl -X POST http://localhost:3000/api/file-watcher/process-file \
  -H "Content-Type: application/json" \
  -d '{"fileName": "test.csv", "specificationId": "spec-id"}'
```

## 🔄 Redémarrage automatique

Le système redémarre automatiquement lors des modifications de code grâce à nodemon (si configuré).

## 📞 Support

Pour toute question ou problème :
1. Consultez les logs du backend
2. Vérifiez la configuration des spécifications
3. Testez avec des fichiers d'exemple
4. Consultez la documentation de l'API

---

**🎉 Votre système de surveillance de fichiers est maintenant opérationnel !** 