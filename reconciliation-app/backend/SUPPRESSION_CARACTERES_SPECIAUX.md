# Suppression de Caractères Spéciaux

## Vue d'ensemble

Cette fonctionnalité permet de supprimer des chaînes de caractères spécifiques des colonnes lors du traitement des données. Elle est particulièrement utile pour nettoyer des identifiants ou des références qui contiennent des suffixes ou préfixes indésirables.

## Fonctionnalités

### 1. Interface de Traitement (Frontend)

#### Option "Supprimer caractères spéciaux"
- **Localisation**: Section "Formatage automatique" du composant traitement
- **Fonctionnalités**:
  - Sélection de colonnes multiples
  - Spécification de la chaîne à supprimer (ex: "_CM")
  - Modes de suppression:
    - **Toutes les occurrences**: Supprime toutes les instances de la chaîne
    - **Au début**: Supprime seulement si la chaîne est au début
    - **À la fin**: Supprime seulement si la chaîne est à la fin

#### Exemples d'utilisation
```
Chaîne à supprimer: "_CM"
Mode: "Toutes les occurrences"

Avant: "ABC_CM_DEF_CM_123"
Après: "ABC_DEF_123"

Mode: "À la fin"

Avant: "IDTransaction_CM"
Après: "IDTransaction"
```

### 2. Règles de Traitement Automatique (Backend)

#### Configuration dans les modèles de traitement
- **Champ**: `stringToRemove`
- **Type**: String
- **Description**: Chaîne de caractères à supprimer des valeurs
- **Intégration**: Fonctionne avec les autres règles de traitement (suppression d'accents, conversion de casse, etc.)

#### Ordre d'application des transformations
1. Type de format
2. Transformations de casse
3. Transformations d'espaces
4. Transformations de caractères spéciaux
5. **Suppression de chaînes spécifiques** ← Nouvelle fonctionnalité
6. Suppression des accents
7. Padding avec zéros
8. Remplacement par regex

## Implémentation Technique

### Backend

#### Entité ColumnProcessingRule
```java
@Column(name = "string_to_remove")
private String stringToRemove;
```

#### Service ColumnProcessingService
```java
private String applyStringRemoval(String value, ColumnProcessingRule rule) {
    String stringToRemove = rule.getStringToRemove();
    if (stringToRemove != null && !stringToRemove.isEmpty()) {
        value = value.replace(stringToRemove, "");
    }
    return value;
}
```

### Frontend

#### Composant Traitement
- **Variables**: `specialStringToRemove`, `specialStringRemovalMode`
- **Méthode**: `applyRemoveSpecialStringsFormatting()`
- **Interface**: Formulaire avec sélection de colonnes et options de suppression

#### Interface des Règles de Traitement
- **Champ**: `stringToRemove` dans le formulaire de configuration
- **Affichage**: Conditionnel selon l'option "Supprimer les caractères spéciaux"

## Migration de Base de Données

### Script SQL
```sql
ALTER TABLE column_processing_rules 
ADD COLUMN string_to_remove VARCHAR(255) NULL 
COMMENT 'Chaîne de caractères spécifique à supprimer des valeurs (ex: _CM)';
```

### Exécution
```powershell
.\execute-string-to-remove-migration.ps1
```

## Cas d'Usage

### 1. Nettoyage d'Identifiants de Transaction
- **Problème**: Les identifiants contiennent des suffixes "_CM"
- **Solution**: Supprimer "_CM" de toutes les occurrences
- **Exemple**: "TXN123_CM" → "TXN123"

### 2. Normalisation de Références
- **Problème**: Les références ont des préfixes variables
- **Solution**: Supprimer les préfixes indésirables
- **Exemple**: "REF_ML_456" → "REF_456"

### 3. Nettoyage de Codes Produit
- **Problème**: Les codes contiennent des suffixes de pays
- **Solution**: Supprimer les suffixes spécifiques
- **Exemple**: "PROD123_BF" → "PROD123"

## Configuration Recommandée

### Pour les Fichiers BO
```json
{
  "sourceColumn": "IDTransaction",
  "targetColumn": "IDTransaction",
  "stringToRemove": "_CM",
  "removeSpecialChars": true,
  "trimSpaces": true
}
```

### Pour les Fichiers Partenaire
```json
{
  "sourceColumn": "Numéro Trans GU",
  "targetColumn": "Numéro Trans GU", 
  "stringToRemove": "_CM",
  "removeSpecialChars": true,
  "trimSpaces": true
}
```

## Tests

### Tests Unitaires
- Vérifier la suppression de chaînes simples
- Tester les modes de suppression (début, fin, toutes)
- Valider l'intégration avec les autres transformations

### Tests d'Intégration
- Tester avec des fichiers CSV réels
- Vérifier la performance sur de gros volumes
- Valider la cohérence des données après traitement

## Notes de Développement

- La suppression est **sensible à la casse**
- Les chaînes vides sont ignorées
- L'ordre d'application respecte la logique métier
- Compatible avec les règles existantes
- Support des caractères Unicode
