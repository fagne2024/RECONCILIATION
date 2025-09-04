# Implémentation des Règles de Traitement des Colonnes

## Vue d'ensemble

Cette implémentation ajoute la fonctionnalité de règles de traitement des colonnes au système de traitement automatique. Elle permet de définir des transformations à appliquer aux données lors du traitement des fichiers CSV.

## Architecture

### Entités

#### `ColumnProcessingRule`
- **Table**: `column_processing_rules`
- **Relation**: Many-to-One avec `AutoProcessingModel`
- **Champs**:
  - `id`: Identifiant unique
  - `autoProcessingModel`: Référence vers le modèle de traitement
  - `sourceColumn`: Colonne source à traiter
  - `targetColumn`: Colonne cible après traitement
  - `formatType`: Type de format (string, numeric, date, boolean)
  - `toUpperCase`: Convertir en majuscules
  - `toLowerCase`: Convertir en minuscules
  - `trimSpaces`: Supprimer les espaces
  - `removeSpecialChars`: Supprimer les caractères spéciaux
  - `padZeros`: Ajouter des zéros en tête
  - `regexReplace`: Remplacement par regex
  - `specialCharReplacementMap`: Map des remplacements de caractères
  - `ruleOrder`: Ordre d'application des règles

#### `AutoProcessingModel` (Mise à jour)
- **Nouveau champ**: `columnProcessingRules` (List<ColumnProcessingRule>)
- **Relation**: One-to-Many avec `ColumnProcessingRule`

### Services

#### `ColumnProcessingRuleService`
Gère les opérations CRUD pour les règles de traitement des colonnes :
- `getRulesByModelId()`: Récupérer les règles d'un modèle
- `createRule()`: Créer une nouvelle règle
- `updateRule()`: Mettre à jour une règle
- `deleteRule()`: Supprimer une règle
- `saveRulesForModel()`: Sauvegarder toutes les règles d'un modèle

#### `ColumnProcessingService`
Applique les règles de traitement aux données :
- `processDataRow()`: Traiter une ligne de données
- `processDataList()`: Traiter une liste de lignes
- `validateRules()`: Valider les règles d'un modèle
- `getTargetColumns()`: Obtenir les colonnes cibles

#### `AutoProcessingService` (Mise à jour)
- Intégration des règles de traitement dans les opérations CRUD des modèles
- Chargement automatique des règles lors de la récupération des modèles

### Contrôleurs

#### `AutoProcessingController` (Mise à jour)
Nouveaux endpoints pour les règles de traitement :

**Gestion des règles :**
- `GET /api/auto-processing/models/{modelId}/column-rules`: Récupérer les règles d'un modèle
- `POST /api/auto-processing/models/{modelId}/column-rules`: Créer une règle
- `PUT /api/auto-processing/column-rules/{ruleId}`: Mettre à jour une règle
- `DELETE /api/auto-processing/column-rules/{ruleId}`: Supprimer une règle
- `POST /api/auto-processing/models/{modelId}/column-rules/batch`: Sauvegarder toutes les règles

**Traitement des données :**
- `POST /api/auto-processing/process-data/{modelId}`: Traiter une liste de données
- `POST /api/auto-processing/process-single-row/{modelId}`: Traiter une ligne
- `GET /api/auto-processing/models/{modelId}/target-columns`: Obtenir les colonnes cibles
- `GET /api/auto-processing/models/{modelId}/validate-rules`: Valider les règles

## Types de Transformations Supportés

### 1. Format Type
- **string**: Texte brut
- **numeric**: Nombres uniquement
- **date**: Format de date
- **boolean**: Valeurs booléennes

### 2. Transformations de Casse
- **toUpperCase**: Convertir en majuscules
- **toLowerCase**: Convertir en minuscules

### 3. Transformations d'Espaces
- **trimSpaces**: Supprimer les espaces en début et fin

### 4. Transformations de Caractères
- **removeSpecialChars**: Supprimer les caractères spéciaux
- **specialCharReplacementMap**: Map des remplacements personnalisés

### 5. Transformations Numériques
- **padZeros**: Ajouter des zéros en tête pour les nombres

### 6. Transformations Regex
- **regexReplace**: Remplacement par expression régulière (format: "pattern|replacement")

## Exemples d'Utilisation

### Création d'une Règle Simple
```json
{
  "sourceColumn": "nom_client",
  "targetColumn": "nom_normalise",
  "formatType": "string",
  "toUpperCase": true,
  "trimSpaces": true
}
```

### Règle avec Remplacement de Caractères
```json
{
  "sourceColumn": "telephone",
  "targetColumn": "telephone_clean",
  "formatType": "numeric",
  "removeSpecialChars": true,
  "specialCharReplacementMap": {
    " ": "",
    "-": "",
    "(": "",
    ")": ""
  }
}
```

### Règle avec Regex
```json
{
  "sourceColumn": "adresse",
  "targetColumn": "adresse_clean",
  "formatType": "string",
  "trimSpaces": true,
  "regexReplace": "\\s+|-"
}
```

## Installation et Configuration

### 1. Création de la Table
Exécuter le script SQL :
```bash
# Via PowerShell
.\execute-column-processing-rules-table.ps1

# Ou directement avec MySQL
mysql -u root -p reconciliation_db < create-column-processing-rules-table.sql
```

### 2. Redémarrage du Backend
Redémarrer l'application Spring Boot pour charger les nouvelles classes.

### 3. Test des Endpoints
Tester les nouveaux endpoints avec des outils comme Postman ou curl.

## Intégration avec le Frontend

Le frontend Angular devra être mis à jour pour :
1. Afficher les règles de traitement dans l'interface de configuration des modèles
2. Permettre l'ajout/modification/suppression de règles
3. Intégrer les règles dans le processus de sauvegarde des modèles

## Flux de Traitement

1. **Configuration** : L'utilisateur définit les règles de traitement dans l'interface
2. **Sauvegarde** : Les règles sont sauvegardées avec le modèle
3. **Traitement** : Lors du traitement d'un fichier :
   - Le modèle applicable est identifié
   - Les règles sont chargées
   - Chaque ligne est traitée selon les règles
   - Les données transformées sont utilisées pour la réconciliation

## Validation et Sécurité

- Validation des règles avant sauvegarde
- Gestion des erreurs lors du traitement
- Logs détaillés pour le débogage
- Transactions pour garantir la cohérence des données

## Performance

- Index sur les colonnes fréquemment utilisées
- Chargement lazy des règles
- Traitement par batch pour les gros volumes
- Cache des règles pour éviter les requêtes répétées

## Maintenance

- Scripts de migration pour les futures évolutions
- Documentation des changements
- Tests unitaires et d'intégration
- Monitoring des performances
