# 🤖 Guide Avancé des Modèles de Traitement Automatique

## 📋 Vue d'ensemble

Le système de **Modèles de Traitement Automatique** a été étendu pour intégrer toutes les fonctionnalités du menu traitement. Vous pouvez maintenant créer des modèles complexes avec des étapes de traitement avancées qui s'appliquent automatiquement lors de l'upload de fichiers.

## 🎯 Nouvelles Fonctionnalités Intégrées

### ✅ **Toutes les Options du Menu Traitement**
- **Sélection des colonnes** : Conserver ou supprimer des colonnes
- **Extraction de données** : Extraire des parties de chaînes
- **Filtrage des lignes** : Filtrer selon différents critères
- **Concaténation** : Combiner plusieurs colonnes
- **Suppression de doublons** : Éliminer les lignes en double
- **Formatage automatique** : Toutes les options de formatage

## 🔧 Types d'Étapes Disponibles

### 1. **Formatage** (16 options)
- **currency** : Format monétaire avec locale et devise
- **date** : Format de date standard
- **number** : Format numérique
- **trimSpaces** : Supprimer espaces en début/fin
- **toLowerCase** : Convertir en minuscules
- **toUpperCase** : Convertir en majuscules
- **normalizeDates** : Normaliser les dates
- **normalizeNumbers** : Normaliser les nombres
- **removeDashesAndCommas** : Supprimer tirets et virgules
- **removeSeparators** : Supprimer séparateurs
- **dotToComma** : Point vers virgule
- **absoluteValue** : Valeur absolue
- **removeCharacters** : Supprimer caractères (début/fin/spécifique)
- **removeSpecificCharacters** : Supprimer caractères spécifiques
- **cleanAmounts** : Nettoyer montants
- **insertCharacters** : Insérer caractères

### 2. **Validation** (3 options)
- **dateFormat** : Validation de date
- **email** : Validation d'email
- **required** : Champ requis

### 3. **Transformation** (6 options)
- **trim** : Supprimer espaces
- **uppercase** : Majuscules
- **lowercase** : Minuscules
- **replace** : Remplacer
- **extract** : Extraire données
- **concat** : Concaténer colonnes

### 4. **Filtrage** (4 options)
- **removeEmpty** : Supprimer lignes vides
- **keepMatching** : Garder lignes correspondantes (regex)
- **filterByValue** : Filtrer par valeur
- **filterByExactValue** : Filtrer par valeur exacte

### 5. **Calcul** (3 options)
- **sum** : Somme de champs
- **average** : Moyenne
- **count** : Comptage

### 6. **Sélection de Colonnes** (2 options)
- **keepColumns** : Conserver colonnes spécifiques
- **removeColumns** : Supprimer colonnes spécifiques

### 7. **Suppression de Doublons** (1 option)
- **removeDuplicates** : Supprimer doublons basés sur des colonnes

## 🚀 Comment Utiliser les Nouvelles Fonctionnalités

### 1. **Créer un Modèle Complexe**

#### Exemple : Modèle BO Complet avec Toutes les Fonctionnalités
```json
{
  "name": "BO Traitement Complet",
  "filePattern": "*bo*.csv",
  "fileType": "bo",
  "autoApply": true,
  "processingSteps": [
    {
      "name": "Sélection des colonnes importantes",
      "type": "select",
      "action": "keepColumns",
      "field": "",
      "params": {
        "columns": ["date", "montant", "description", "compte"]
      }
    },
    {
      "name": "Nettoyage des descriptions",
      "type": "format",
      "action": "trimSpaces",
      "field": "description"
    },
    {
      "name": "Formatage des montants",
      "type": "format",
      "action": "currency",
      "field": "montant",
      "params": {
        "locale": "fr-FR",
        "currency": "EUR"
      }
    },
    {
      "name": "Normalisation des dates",
      "type": "format",
      "action": "normalizeDates",
      "field": "date",
      "params": {
        "format": "yyyy-MM-dd"
      }
    },
    {
      "name": "Suppression des doublons",
      "type": "deduplicate",
      "action": "removeDuplicates",
      "field": "",
      "params": {
        "columns": ["date", "montant", "description"]
      }
    },
    {
      "name": "Filtrage des montants positifs",
      "type": "filter",
      "action": "filterByValue",
      "field": "montant",
      "params": {
        "values": ["positive", ">0"]
      }
    }
  ]
}
```

### 2. **Paramètres Spécifiques par Action**

#### Formatage Monétaire
```json
{
  "action": "currency",
  "params": {
    "locale": "fr-FR",
    "currency": "EUR"
  }
}
```

#### Extraction de Données
```json
{
  "action": "extract",
  "params": {
    "extractType": "between",
    "extractCount": 5,
    "startChar": "[",
    "endChar": "]"
  }
}
```

#### Concaténation de Colonnes
```json
{
  "action": "concat",
  "params": {
    "columns": ["nom", "prenom"],
    "newColumn": "nom_complet",
    "separator": " "
  }
}
```

#### Filtrage par Regex
```json
{
  "action": "keepMatching",
  "params": {
    "pattern": ".*EUR.*"
  }
}
```

## 📊 Exemples d'Utilisation Avancée

### Exemple 1 : Traitement de Fichiers Clients
```json
{
  "name": "Traitement Clients",
  "filePattern": "*clients*.csv",
  "processingSteps": [
    {
      "name": "Nettoyage des noms",
      "type": "format",
      "action": "toUpperCase",
      "field": "nom"
    },
    {
      "name": "Concaténation nom complet",
      "type": "transform",
      "action": "concat",
      "field": "",
      "params": {
        "columns": ["nom", "prenom"],
        "newColumn": "nom_complet",
        "separator": " "
      }
    },
    {
      "name": "Extraction du code postal",
      "type": "transform",
      "action": "extract",
      "field": "adresse",
      "params": {
        "extractType": "between",
        "startChar": "(",
        "endChar": ")"
      }
    }
  ]
}
```

### Exemple 2 : Traitement de Fichiers Financiers
```json
{
  "name": "Traitement Financier",
  "filePattern": "*finance*.csv",
  "processingSteps": [
    {
      "name": "Nettoyage des montants",
      "type": "format",
      "action": "cleanAmounts",
      "field": "montant"
    },
    {
      "name": "Suppression des caractères spéciaux",
      "type": "format",
      "action": "removeSpecificCharacters",
      "field": "description",
      "params": {
        "characters": "!@#$%",
        "caseSensitive": false
      }
    },
    {
      "name": "Filtrage des transactions importantes",
      "type": "filter",
      "action": "filterByExactValue",
      "field": "type",
      "params": {
        "value": "IMPORTANT"
      }
    }
  ]
}
```

## 🛠️ Configuration des Paramètres

### Paramètres de Formatage
- **locale** : Code de langue (ex: "fr-FR")
- **currency** : Code devise (ex: "EUR")
- **format** : Format de date (ex: "yyyy-MM-dd")
- **position** : Position pour suppression/insertion ("start", "end", "specific")
- **count** : Nombre de caractères
- **characters** : Caractères à traiter
- **caseSensitive** : Sensibilité à la casse (booléen)

### Paramètres d'Extraction
- **extractType** : Type d'extraction ("first", "last", "from", "between", "key")
- **extractCount** : Nombre de caractères à extraire
- **extractKey** : Clé pour extraction
- **extractStart** : Position de départ
- **startChar** : Caractère de début
- **endChar** : Caractère de fin

### Paramètres de Concaténation
- **columns** : Liste des colonnes à concaténer
- **newColumn** : Nom de la nouvelle colonne
- **separator** : Séparateur entre les valeurs

### Paramètres de Filtrage
- **pattern** : Pattern regex pour correspondance
- **values** : Liste de valeurs pour filtrage
- **value** : Valeur exacte pour filtrage

### Paramètres de Sélection
- **columns** : Liste des colonnes à conserver/supprimer

## 🔍 Types d'Extraction Disponibles

### 1. **Premiers caractères**
```json
{
  "extractType": "first",
  "extractCount": 3
}
```
Résultat : "ABC" depuis "ABCDEF"

### 2. **Derniers caractères**
```json
{
  "extractType": "last",
  "extractCount": 3
}
```
Résultat : "DEF" depuis "ABCDEF"

### 3. **À partir d'une position**
```json
{
  "extractType": "from",
  "extractStart": 2,
  "extractCount": 3
}
```
Résultat : "BCD" depuis "ABCDEF"

### 4. **Entre deux caractères**
```json
{
  "extractType": "between",
  "startChar": "[",
  "endChar": "]"
}
```
Résultat : "123" depuis "Code[123]Ref"

### 5. **Après une clé**
```json
{
  "extractType": "key",
  "extractKey": "REF:",
  "extractCount": 5
}
```
Résultat : "12345" depuis "REF:12345"

## 📈 Bonnes Pratiques

### 1. **Ordre des Étapes**
1. **Sélection de colonnes** (en premier)
2. **Nettoyage et formatage**
3. **Extraction et transformation**
4. **Filtrage**
5. **Suppression de doublons** (en dernier)

### 2. **Performance**
- Limitez le nombre d'étapes par modèle
- Utilisez des patterns spécifiques
- Évitez les calculs complexes sur de gros fichiers

### 3. **Validation**
- Testez vos modèles avec des fichiers d'exemple
- Vérifiez les résultats après chaque étape
- Utilisez des données de test représentatives

## 🎯 Exemples Complets par Secteur

### Secteur Bancaire
```json
{
  "name": "Traitement Transactions Bancaires",
  "filePattern": "*transactions*.csv",
  "processingSteps": [
    {
      "name": "Nettoyage des montants",
      "type": "format",
      "action": "cleanAmounts",
      "field": "montant"
    },
    {
      "name": "Formatage des dates",
      "type": "format",
      "action": "normalizeDates",
      "field": "date",
      "params": { "format": "dd/MM/yyyy" }
    },
    {
      "name": "Extraction du code banque",
      "type": "transform",
      "action": "extract",
      "field": "iban",
      "params": {
        "extractType": "from",
        "extractStart": 1,
        "extractCount": 4
      }
    },
    {
      "name": "Filtrage des transactions importantes",
      "type": "filter",
      "action": "filterByValue",
      "field": "type",
      "params": {
        "values": ["VIREMENT", "PRELEVEMENT", "CARTE"]
      }
    }
  ]
}
```

### Secteur E-commerce
```json
{
  "name": "Traitement Commandes E-commerce",
  "filePattern": "*commandes*.csv",
  "processingSteps": [
    {
      "name": "Concaténation adresse complète",
      "type": "transform",
      "action": "concat",
      "field": "",
      "params": {
        "columns": ["rue", "ville", "code_postal"],
        "newColumn": "adresse_complete",
        "separator": ", "
      }
    },
    {
      "name": "Normalisation des emails",
      "type": "format",
      "action": "toLowerCase",
      "field": "email"
    },
    {
      "name": "Suppression des commandes annulées",
      "type": "filter",
      "action": "filterByExactValue",
      "field": "statut",
      "params": { "value": "ANNULÉ" }
    },
    {
      "name": "Suppression des doublons",
      "type": "deduplicate",
      "action": "removeDuplicates",
      "field": "",
      "params": {
        "columns": ["email", "date", "montant"]
      }
    }
  ]
}
```

## 📞 Support et Dépannage

### Problèmes Courants

#### Erreurs de Formatage
- Vérifiez les paramètres de locale et devise
- Assurez-vous que les données sont au bon format
- Testez avec des valeurs simples d'abord

#### Erreurs d'Extraction
- Vérifiez que les caractères de début/fin existent
- Assurez-vous que la position de départ est valide
- Testez avec des exemples concrets

#### Erreurs de Filtrage
- Vérifiez la syntaxe des patterns regex
- Assurez-vous que les valeurs de filtrage existent
- Testez les patterns avec des outils en ligne

### Conseils de Débogage
1. **Testez étape par étape** : Créez des modèles simples d'abord
2. **Utilisez des données de test** : Créez des fichiers d'exemple
3. **Vérifiez les logs** : Consultez les messages d'erreur
4. **Validez les paramètres** : Assurez-vous que tous les paramètres sont corrects

---

**🎉 Vous êtes maintenant prêt à utiliser toutes les fonctionnalités avancées du système de traitement automatique !** 