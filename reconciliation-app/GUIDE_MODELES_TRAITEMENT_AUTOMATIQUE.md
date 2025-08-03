# 🤖 Guide des Modèles de Traitement Automatique

## 📋 Vue d'ensemble

Le système de **Modèles de Traitement Automatique** permet de définir des règles de traitement qui s'appliquent automatiquement lors de l'upload de fichiers dans la réconciliation. Vous pouvez créer des modèles spécifiques pour différents types de fichiers (BO, Partenaire) avec des étapes de traitement personnalisées.

## 🎯 Fonctionnalités principales

### ✅ **Traitement Automatique**
- Application automatique des modèles lors de l'upload
- Formatage des données (montants, dates, etc.)
- Validation des champs
- Transformation des données
- Calculs automatiques

### 📁 **Types de Modèles**
- **BO Standard** : Pour les fichiers Back Office
- **Partenaire Standard** : Pour les fichiers partenaires
- **Modèles personnalisés** : Créés selon vos besoins

### 🔧 **Étapes de Traitement**
- **Formatage** : Format monétaire, dates, nombres
- **Validation** : Validation des dates, emails, champs requis
- **Transformation** : Nettoyage, majuscules/minuscules, remplacement
- **Filtrage** : Suppression de lignes vides, filtres conditionnels
- **Calcul** : Sommes, moyennes, comptages

## 🚀 Comment utiliser

### 1. **Accéder aux Modèles**
1. Ouvrez l'application de réconciliation
2. Cliquez sur **"Modèles de Traitement"** dans le menu
3. Vous verrez la liste des modèles existants

### 2. **Créer un Nouveau Modèle**
1. Cliquez sur **"+ Nouveau Modèle"**
2. Remplissez les informations :
   - **Nom** : Nom descriptif du modèle
   - **Pattern** : Pattern de fichiers (ex: `*bo*.csv`)
   - **Type** : BO, Partenaire ou Les deux
   - **Application automatique** : Cocher pour l'application auto

### 3. **Ajouter des Étapes de Traitement**
Pour chaque étape, définissez :
- **Nom** : Nom de l'étape
- **Type** : Formatage, Validation, Transformation, etc.
- **Champ** : Champ à traiter (ex: `montant`, `date`)
- **Action** : Action spécifique à appliquer
- **Description** : Description de l'étape

### 4. **Exemples d'Étapes**

#### Formatage des Montants
```json
{
  "type": "format",
  "field": "montant",
  "action": "currency",
  "params": {
    "locale": "fr-FR",
    "currency": "EUR"
  }
}
```

#### Validation des Dates
```json
{
  "type": "validate",
  "field": "date",
  "action": "dateFormat",
  "params": {
    "format": "DD/MM/YYYY"
  }
}
```

#### Nettoyage des Chaînes
```json
{
  "type": "transform",
  "field": "description",
  "action": "trim",
  "params": {}
}
```

## 📊 Modèles Prédéfinis

### BO Standard
- **Pattern** : `*bo*.csv`
- **Type** : BO
- **Actions** :
  - Formatage des montants en euros
  - Validation des dates
  - Nettoyage des descriptions

### Partenaire Standard
- **Pattern** : `*partner*.csv`
- **Type** : Partenaire
- **Actions** :
  - Formatage des montants
  - Validation des dates

## 🔄 Utilisation Automatique

### Upload de Fichiers
1. Allez dans **"Upload de Fichiers"**
2. Sélectionnez vos fichiers BO et/ou Partenaire
3. Le système détecte automatiquement les modèles applicables
4. Les traitements s'appliquent automatiquement
5. Une notification confirme le traitement

### Exemple de Notification
```
✅ Traitement automatique appliqué!
📁 Fichier: bo_janvier_2024.csv
🤖 Modèle: bo-standard
⚡ Temps: 150ms
📊 Lignes traitées: 1250
```

## 🛠️ Types d'Actions Disponibles

### Formatage
- **currency** : Format monétaire
- **date** : Format de date
- **number** : Format numérique

### Validation
- **dateFormat** : Validation de date
- **email** : Validation d'email
- **required** : Champ requis

### Transformation
- **trim** : Supprimer espaces
- **uppercase** : Majuscules
- **lowercase** : Minuscules
- **replace** : Remplacer

### Filtrage
- **removeEmpty** : Supprimer lignes vides
- **keepMatching** : Garder lignes correspondantes

### Calcul
- **sum** : Somme de champs
- **average** : Moyenne
- **count** : Comptage

## 📁 Structure des Fichiers

### Fichiers BO
```
date,montant,description,compte
01/01/2024,1500.50,Facture client A,401000
02/01/2024,2500.75,Facture client B,401000
```

### Fichiers Partenaire
```
date,montant,reference,type
01/01/2024,1500.50,REF001,vente
02/01/2024,2500.75,REF002,vente
```

## ⚙️ Configuration Avancée

### Patterns de Fichiers
- `*bo*.csv` : Tous les fichiers contenant "bo"
- `*partner*.csv` : Tous les fichiers contenant "partner"
- `bo_*.csv` : Fichiers commençant par "bo_"
- `*_2024.csv` : Fichiers se terminant par "_2024.csv"

### Paramètres Avancés
```json
{
  "locale": "fr-FR",
  "currency": "EUR",
  "format": "DD/MM/YYYY",
  "fields": ["montant1", "montant2"],
  "condition": "value > 0"
}
```

## 🔍 Dépannage

### Problèmes Courants

#### Aucun Modèle Trouvé
- Vérifiez le pattern du fichier
- Assurez-vous que le modèle est activé
- Vérifiez le type de fichier (BO/Partenaire)

#### Erreurs de Traitement
- Vérifiez les noms des champs
- Assurez-vous que les données sont au bon format
- Consultez les logs pour plus de détails

#### Performance
- Limitez le nombre d'étapes par modèle
- Utilisez des patterns spécifiques
- Évitez les calculs complexes sur de gros fichiers

## 📈 Bonnes Pratiques

### 1. **Nommage**
- Utilisez des noms descriptifs pour les modèles
- Incluez le type de fichier dans le nom
- Ajoutez la date de création si nécessaire

### 2. **Patterns**
- Soyez spécifiques dans les patterns
- Testez vos patterns avec des exemples
- Évitez les patterns trop généraux

### 3. **Étapes**
- Commencez par les validations
- Ajoutez les transformations ensuite
- Terminez par les calculs

### 4. **Performance**
- Limitez le nombre d'étapes
- Utilisez des champs spécifiques
- Évitez les boucles complexes

## 🎯 Exemples Complets

### Modèle BO Complet
```json
{
  "name": "BO Standard - Traitement Complet",
  "filePattern": "*bo*.csv",
  "fileType": "bo",
  "autoApply": true,
  "processingSteps": [
    {
      "name": "Formatage des montants",
      "type": "format",
      "field": "montant",
      "action": "currency",
      "params": {
        "locale": "fr-FR",
        "currency": "EUR"
      }
    },
    {
      "name": "Validation des dates",
      "type": "validate",
      "field": "date",
      "action": "dateFormat",
      "params": {
        "format": "DD/MM/YYYY"
      }
    },
    {
      "name": "Nettoyage des descriptions",
      "type": "transform",
      "field": "description",
      "action": "trim",
      "params": {}
    }
  ]
}
```

## 📞 Support

Pour toute question ou problème :
1. Consultez les logs de l'application
2. Vérifiez la configuration des modèles
3. Testez avec des fichiers d'exemple
4. Contactez l'équipe technique si nécessaire

---

**🎉 Vous êtes maintenant prêt à utiliser les Modèles de Traitement Automatique !** 