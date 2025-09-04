# Guide d'Utilisation des Modèles de Réconciliation

## 🎯 Objectif

Ce guide explique comment utiliser les modèles de traitement automatique pour la réconciliation des fichiers OPPART, TRXBO et USSDPART.

## 📋 Prérequis

- ✅ Backend Spring Boot démarré (port 8080)
- ✅ Frontend Angular démarré (port 4200)
- ✅ Tables `column_processing_rules` et `processing_steps` créées
- ✅ Fichiers de test disponibles (OPPART.xls, TRXBO.xls, USSDPART.xls)

## 🚀 Étapes d'Utilisation

### 1. **Création des Modèles de Réconciliation**

#### A. Modèle OPPART (Partenaire)
1. **Accéder à l'interface** : `http://localhost:4200`
2. **Créer un nouveau modèle** :
   - **Nom** : "Modèle OPPART - Réconciliation"
   - **Pattern de fichier** : `*OPPART*.xls`
   - **Type de fichier** : `partner`
   - **Application automatique** : ✅ Activé
   - **Fichier modèle** : `OPPART.xls`

3. **Configurer les clés de réconciliation** :
   - **Clés Partenaire** : Sélectionner les colonnes clés (ex: `date`, `montant`, `Numéro Trans GU`)
   - **Modèles BO** : Sélectionner le modèle TRXBO existant
   - **Clés BO** : Sélectionner les colonnes correspondantes

#### B. Modèle TRXBO (BO)
1. **Créer un modèle BO** :
   - **Nom** : "Modèle TRXBO - Base"
   - **Pattern de fichier** : `*TRXBO*.xls`
   - **Type de fichier** : `bo`
   - **Application automatique** : ✅ Activé
   - **Fichier modèle** : `TRXBO.xls`

#### C. Modèle USSDPART (Partenaire)
1. **Créer un modèle USSDPART** :
   - **Nom** : "Modèle USSDPART - Réconciliation"
   - **Pattern de fichier** : `*USSDPART*.xls`
   - **Type de fichier** : `partner`
   - **Application automatique** : ✅ Activé
   - **Fichier modèle** : `USSDPART.xls`

### 2. **Configuration des Règles de Traitement**

#### A. Règles pour OPPART
```typescript
// Exemple de règles de traitement
{
  sourceColumn: "Numéro Trans GU",
  targetColumn: "numero_transaction",
  formatType: "string",
  trimSpaces: true,
  toUpperCase: false
}

{
  sourceColumn: "Montant",
  targetColumn: "montant",
  formatType: "numeric",
  removeSpecialChars: true
}

{
  sourceColumn: "Date",
  targetColumn: "date",
  formatType: "date",
  regexReplace: "\\s+"
}
```

#### B. Règles pour TRXBO
```typescript
// Exemple de règles de traitement
{
  sourceColumn: "TRANSACTION_ID",
  targetColumn: "numero_transaction",
  formatType: "string",
  trimSpaces: true
}

{
  sourceColumn: "AMOUNT",
  targetColumn: "montant",
  formatType: "numeric"
}
```

### 3. **Processus de Réconciliation**

#### A. Déclenchement Automatique
1. **Placer un fichier** dans le dossier surveillé
2. **Le système détecte** automatiquement le type de fichier
3. **Application du modèle** correspondant
4. **Traitement des colonnes** selon les règles configurées
5. **Réconciliation** avec les données BO

#### B. Déclenchement Manuel
1. **Accéder à l'interface de réconciliation**
2. **Sélectionner le fichier** à traiter
3. **Choisir le modèle** approprié
4. **Lancer la réconciliation**

### 4. **Résultats de Réconciliation**

#### A. Fichiers de Sortie
- **Fichier traité** : Données normalisées
- **Rapport de réconciliation** : Correspondances trouvées
- **Fichier d'écarts** : Données non réconciliées

#### B. Métriques
- **Taux de réconciliation** : Pourcentage de correspondances
- **Temps de traitement** : Performance du traitement
- **Erreurs détectées** : Problèmes identifiés

## 🔧 Configuration Avancée

### 1. **Règles de Correspondance**
```typescript
// Configuration des clés de réconciliation
reconciliationKeys: {
  partnerKeys: ["numero_transaction", "montant", "date"],
  boKeys: ["TRANSACTION_ID", "AMOUNT", "TRANSACTION_DATE"],
  boModels: ["model_trxbo_base"]
}
```

### 2. **Filtres de Données**
```typescript
// Filtres pour limiter les données traitées
boColumnFilters: [
  {
    column: "STATUS",
    operator: "equals",
    value: "ACTIVE"
  }
]
```

### 3. **Transformations Personnalisées**
```typescript
// Règles de transformation complexes
columnProcessingRules: [
  {
    sourceColumn: "MONTANT_ORIGINAL",
    targetColumn: "montant_converti",
    formatType: "currency",
    specialCharReplacementMap: {
      ",": ".",
      " ": ""
    }
  }
]
```

## 📊 Monitoring et Debugging

### 1. **Logs de Traitement**
- **Backend** : Logs détaillés dans la console
- **Frontend** : Messages d'état dans l'interface
- **Base de données** : Historique des traitements

### 2. **Indicateurs de Performance**
- **Temps de traitement** par fichier
- **Taux de réussite** des réconciliations
- **Utilisation mémoire** et CPU

### 3. **Gestion des Erreurs**
- **Validation des données** avant traitement
- **Gestion des exceptions** avec rollback
- **Notifications d'erreur** en temps réel

## 🎯 Cas d'Usage Typiques

### 1. **Réconciliation Quotidienne**
1. **Déposer les fichiers** dans le dossier surveillé
2. **Traitement automatique** pendant la nuit
3. **Rapport matinal** des réconciliations

### 2. **Réconciliation en Temps Réel**
1. **Interface web** pour traitement immédiat
2. **Résultats instantanés** avec visualisation
3. **Actions correctives** en cas d'écarts

### 3. **Réconciliation par Lots**
1. **Traitement de plusieurs fichiers** simultanément
2. **Rapport consolidé** des résultats
3. **Optimisation des performances**

## 🔄 Maintenance

### 1. **Mise à Jour des Modèles**
- **Modification des règles** selon les besoins
- **Ajout de nouveaux formats** de fichiers
- **Optimisation des performances**

### 2. **Sauvegarde et Restauration**
- **Export des configurations** de modèles
- **Sauvegarde des données** de réconciliation
- **Procédures de restauration**

### 3. **Évolutions Futures**
- **Nouveaux types de fichiers** à supporter
- **Algoritmes de réconciliation** avancés
- **Intégrations externes** (APIs, etc.)

## ✅ Checklist de Validation

- [ ] Backend démarré et accessible
- [ ] Modèles créés et configurés
- [ ] Règles de traitement définies
- [ ] Fichiers de test disponibles
- [ ] Réconciliation testée avec succès
- [ ] Rapports générés correctement
- [ ] Performance acceptable
- [ ] Gestion d'erreurs fonctionnelle

## 🆘 Support et Dépannage

### Problèmes Courants
1. **Erreur 404** : Vérifier que le backend est démarré
2. **Erreur 400** : Vérifier la structure des données
3. **Tables manquantes** : Redémarrer le backend
4. **Colonnes non détectées** : Vérifier les fichiers de test

### Contacts
- **Développeur** : Assistant IA
- **Documentation** : Ce guide
- **Logs** : Console backend et frontend
