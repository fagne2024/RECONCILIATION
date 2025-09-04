# Fonctionnalité de Suppression des Accents dans les Modèles de Traitement

## 📋 Vue d'ensemble

Cette fonctionnalité permet de supprimer automatiquement les accents des valeurs de données lors du traitement des fichiers CSV/Excel dans les modèles de traitement automatique.

## 🎯 Objectif

Normaliser les données en supprimant les caractères accentués pour améliorer la réconciliation et éviter les problèmes de correspondance dus aux différences d'encodage ou de saisie.

## 🔧 Implémentation

### Backend (Java)

#### 1. Entité `ColumnProcessingRule`
```java
@Column(name = "remove_accents")
private boolean removeAccents = false;

public boolean isRemoveAccents() {
    return removeAccents;
}

public void setRemoveAccents(boolean removeAccents) {
    this.removeAccents = removeAccents;
}
```

#### 2. DTO `ColumnProcessingRuleDTO`
```java
@JsonProperty("removeAccents")
private boolean removeAccents = false;
```

#### 3. Service `ColumnProcessingService`
```java
private String applyAccentRemoval(String value, ColumnProcessingRule rule) {
    if (rule.isRemoveAccents()) {
        return java.text.Normalizer.normalize(value, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
    }
    return value;
}
```

### Frontend (Angular)

#### 1. Interface TypeScript
```typescript
interface ColumnProcessingRule {
  removeAccents?: boolean;
  // ... autres propriétés
}
```

#### 2. Formulaire
```typescript
this.columnProcessingRuleForm = this.fb.group({
  removeAccents: [false],
  // ... autres champs
});
```

#### 3. Template HTML
```html
<div class="form-row">
  <div class="form-group">
    <label>
      <input type="checkbox" formControlName="removeAccents">
      Supprimer les accents
    </label>
    <small class="form-text text-muted">
      Cette option supprime automatiquement tous les accents des valeurs (é, è, à, ç, etc.)
      <br>Exemple : "Téléphone" → "Telephone", "Numéro" → "Numero"
    </small>
  </div>
</div>
```

### Base de données

#### Script SQL
```sql
ALTER TABLE column_processing_rules 
ADD COLUMN remove_accents BOOLEAN DEFAULT FALSE 
COMMENT 'Supprimer les accents des valeurs';
```

## 🚀 Utilisation

### 1. Création d'un modèle avec suppression d'accents

1. Allez dans **Modèles de traitement automatique**
2. Cliquez sur **Créer un nouveau modèle**
3. Remplissez les informations de base
4. Dans **Règles de traitement des colonnes** :
   - Cliquez sur **Ajouter une règle de nettoyage**
   - Sélectionnez la colonne source
   - Cochez **Supprimer les accents**
   - Ajoutez d'autres options si nécessaire
   - Sauvegardez la règle

### 2. Exemples de règles

#### Règle simple : Suppression d'accents uniquement
```json
{
  "sourceColumn": "Téléphone",
  "targetColumn": "Telephone",
  "removeAccents": true,
  "ruleOrder": 1
}
```

#### Règle combinée : Suppression d'accents + autres transformations
```json
{
  "sourceColumn": "Numéro",
  "targetColumn": "Numero",
  "removeAccents": true,
  "toUpperCase": true,
  "trimSpaces": true,
  "ruleOrder": 2
}
```

### 3. Exemples de transformations

| Avant | Après | Règle appliquée |
|-------|-------|-----------------|
| `Téléphone` | `Telephone` | `removeAccents: true` |
| `Numéro` | `Numero` | `removeAccents: true` |
| `Adresse` | `Adresse` | `removeAccents: true` |
| `Été` | `Ete` | `removeAccents: true` |
| `Ça va?` | `Ca va?` | `removeAccents: true` |
| `Français` | `Francais` | `removeAccents: true` |
| `Hôtel` | `Hotel` | `removeAccents: true` |
| `Café` | `Cafe` | `removeAccents: true` |

## 🔄 Ordre d'application des règles

Les transformations sont appliquées dans l'ordre suivant :

1. **Type de format** (`formatType`)
2. **Transformations de casse** (`toUpperCase`, `toLowerCase`)
3. **Transformations d'espaces** (`trimSpaces`)
4. **Transformations de caractères spéciaux** (`removeSpecialChars`)
5. **Suppression des accents** (`removeAccents`) ⭐ **NOUVEAU**
6. **Padding** (`padZeros`)
7. **Remplacement par regex** (`regexReplace`)

## 🧪 Tests

### Test JavaScript de la fonction
```javascript
function removeAccents(text) {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Tests
const testCases = ['Téléphone', 'Numéro', 'Été', 'Ça va?'];
testCases.forEach(test => {
    console.log(`${test} → ${removeAccents(test)}`);
});
```

### Test avec un modèle
1. Créez un modèle avec la règle de suppression d'accents
2. Uploadez un fichier CSV contenant des accents
3. Vérifiez que les accents sont supprimés dans les données traitées

## 📊 Avantages

- **Normalisation des données** : Élimine les variations dues aux accents
- **Amélioration de la réconciliation** : Facilite la correspondance des données
- **Flexibilité** : Peut être combinée avec d'autres transformations
- **Performance** : Traitement rapide et efficace
- **Compatibilité** : Fonctionne avec tous les types de fichiers supportés

## ⚠️ Points d'attention

1. **Perte d'information** : La suppression d'accents peut modifier le sens de certains mots
2. **Ordre des règles** : Assurez-vous que l'ordre d'application est approprié
3. **Test** : Testez toujours avec vos données réelles avant la mise en production
4. **Sauvegarde** : Gardez une copie des données originales

## 🔧 Maintenance

### Ajout de la colonne en base
```bash
# Exécuter le script SQL
mysql -u root -p reconciliation_db < reconciliation-app/backend/add-remove-accents-column.sql
```

### Vérification de l'installation
```bash
# Vérifier que la colonne existe
DESCRIBE column_processing_rules;
```

## 📝 Historique des modifications

- **v1.0** : Implémentation initiale de la fonctionnalité
  - Ajout de l'option `removeAccents` dans l'interface
  - Implémentation de la logique de suppression côté backend
  - Ajout de l'option dans l'interface utilisateur
  - Script SQL pour la mise à jour de la base de données

## 🎯 Prochaines améliorations possibles

- [ ] Support des caractères spéciaux spécifiques par langue
- [ ] Option de remplacement personnalisé (é → e, è → e, etc.)
- [ ] Prévisualisation des transformations avant application
- [ ] Statistiques sur les transformations appliquées
- [ ] Support de la normalisation Unicode avancée

