# 📋 Guide d'Utilisation - Interface de Surveillance de Fichiers

## 🎯 Vue d'ensemble

L'interface de surveillance de fichiers vous permet de gérer automatiquement le traitement des fichiers déposés dans un dossier surveillé. Vous pouvez créer des spécifications de traitement et surveiller l'état du système en temps réel.

## 🚀 Démarrage du système

### Option 1 : Démarrage complet (recommandé)
```powershell
.\start-complete-system.ps1
```

### Option 2 : Démarrage séparé
```powershell
# Backend uniquement
.\start-file-watcher.ps1

# Frontend uniquement
.\start-frontend.ps1
```

## 🌐 Accès à l'interface

1. **Ouvrez votre navigateur**
2. **Accédez à** : `http://localhost:4200`
3. **Cliquez sur "Surveillance"** dans le menu de navigation

## 📊 Interface principale

### 1. **Statut de la Surveillance**
- **Indicateur visuel** : 🟢 Actif / 🔴 Inactif
- **Dossier surveillé** : Chemin du dossier surveillé
- **Fichiers en attente** : Nombre de fichiers en cours de traitement
- **Boutons d'action** :
  - "Démarrer la surveillance" : Active la surveillance
  - "Arrêter la surveillance" : Désactive la surveillance

### 2. **Spécifications de Traitement**
- **Liste des spécifications** : Affiche toutes vos configurations
- **Bouton "+ Nouvelle Spécification"** : Crée une nouvelle configuration
- **Actions par spécification** :
  - ✏️ **Modifier** : Édite la spécification
  - 🗑️ **Supprimer** : Supprime la spécification

### 3. **Exemples de Spécifications**
- **Templates prêts à l'emploi** pour différents types de fichiers
- **Bouton "Utiliser cet exemple"** : Charge un exemple dans le formulaire

## 📝 Création d'une Spécification

### Étape 1 : Ouvrir le formulaire
- Cliquez sur **"+ Nouvelle Spécification"**
- Ou cliquez sur **"Utiliser cet exemple"** pour un template

### Étape 2 : Remplir les informations

#### **Informations de base**
- **Nom de la spécification** * : Nom descriptif (ex: "Fichiers CSV clients")
- **Pattern de fichiers** * : Motif pour identifier les fichiers (ex: `*.csv`, `clients_*.csv`)

#### **Configuration du traitement**
- **Type de traitement** * : 
  - `CSV` : Fichiers CSV
  - `JSON` : Fichiers JSON
  - `XML` : Fichiers XML
  - `Excel` : Fichiers Excel

- **Format de sortie** :
  - `JSON` : Sortie en format JSON
  - `CSV` : Sortie en format CSV
  - `Base de données` : Insertion en base de données

#### **Options avancées (CSV uniquement)**
- **Délimiteur** : Caractère de séparation (ex: `;`, `,`)
- **Encodage** : Encodage du fichier (ex: `utf8`)

#### **Comportement**
- **Traitement automatique** : Active le traitement automatique des fichiers

### Étape 3 : Sauvegarder
- Cliquez sur **"Créer"** ou **"Modifier"**
- La spécification apparaît dans la liste

## 🔄 Utilisation du système

### 1. **Démarrer la surveillance**
- Cliquez sur **"Démarrer la surveillance"**
- L'indicateur passe au vert 🟢
- Le système surveille maintenant le dossier

### 2. **Déposer des fichiers**
- Placez vos fichiers dans le dossier `watch-folder`
- Le système détecte automatiquement les nouveaux fichiers
- Les fichiers sont traités selon les spécifications correspondantes

### 3. **Surveiller les résultats**
- Les fichiers traités apparaissent dans `watch-folder/processed`
- Le statut affiche le nombre de fichiers en attente
- Les erreurs sont affichées dans l'interface

## 📁 Structure des dossiers

```
reconciliation-app/
├── watch-folder/           # 📁 Dossier surveillé
│   ├── exemple_clients.csv # 📄 Fichier d'exemple
│   └── processed/          # 📁 Fichiers traités
│       ├── output1.json    # 📄 Résultats du traitement
│       └── output2.csv     # 📄 Autres résultats
```

## 🎯 Exemples d'utilisation

### Exemple 1 : Traitement de fichiers CSV clients
1. **Créez une spécification** :
   - Nom : "Fichiers CSV clients"
   - Pattern : `*.csv`
   - Type : CSV
   - Délimiteur : `;`
   - Format de sortie : JSON

2. **Déposez un fichier** `clients.csv` dans `watch-folder`
3. **Le système génère** `clients_processed.json` dans `processed/`

### Exemple 2 : Traitement de transactions JSON
1. **Créez une spécification** :
   - Nom : "Transactions JSON"
   - Pattern : `transactions_*.json`
   - Type : JSON
   - Format de sortie : CSV

2. **Déposez un fichier** `transactions_2024.json`
3. **Le système génère** `transactions_2024_processed.csv`

## ⚠️ Dépannage

### Problème : Interface non accessible
- **Vérifiez** que le frontend est démarré sur `http://localhost:4200`
- **Vérifiez** que le backend est démarré sur `http://localhost:3000`

### Problème : API non accessible
- **Vérifiez** que le serveur Node.js est démarré
- **Vérifiez** que le port 3000 est disponible
- **Relancez** le script `start-file-watcher.ps1`

### Problème : Fichiers non traités
- **Vérifiez** que la surveillance est active (🟢)
- **Vérifiez** que les spécifications correspondent aux fichiers
- **Vérifiez** les logs dans la console du serveur

### Problème : Erreurs de traitement
- **Vérifiez** le format des fichiers
- **Vérifiez** la configuration des spécifications
- **Vérifiez** les permissions sur les dossiers

## 🔧 Fonctionnalités avancées

### Gestion des erreurs
- **Messages d'erreur** affichés dans l'interface
- **Bouton de fermeture** pour masquer les erreurs
- **Logs détaillés** dans la console du serveur

### Indicateurs de chargement
- **Spinner** pendant les opérations
- **Boutons désactivés** pendant le traitement
- **Feedback visuel** pour toutes les actions

### Interface responsive
- **Adaptation mobile** : Interface optimisée pour les petits écrans
- **Grille flexible** : Disposition adaptative des éléments
- **Navigation intuitive** : Menu et boutons accessibles

## 📞 Support

Pour toute question ou problème :
1. **Consultez** ce guide
2. **Vérifiez** les logs du serveur
3. **Testez** avec les fichiers d'exemple
4. **Redémarrez** le système si nécessaire

---

**🎉 Votre système de surveillance de fichiers est maintenant opérationnel !** 