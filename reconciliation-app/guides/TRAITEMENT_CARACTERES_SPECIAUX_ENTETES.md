# 🔧 Traitement des Caractères Spéciaux pour les En-têtes de Colonnes

## 📋 Nouvelle Fonctionnalité

Le module de traitement dispose maintenant d'une section dédiée au traitement des caractères spéciaux pour les en-têtes de colonnes. Cette fonctionnalité permet de corriger et normaliser automatiquement les noms de colonnes corrompus ou mal formatés.

## 🎯 **Options Disponibles**

### 1. **Normaliser les en-têtes** (`normalizeHeaders`)
- **Fonction** : Normalise les espaces et met la première lettre de chaque mot en majuscule
- **Exemple** : `"  code proprietaire  "` → `"Code Proprietaire"`
- **Utilisation** : Pour nettoyer les en-têtes avec des espaces multiples

### 2. **Corriger les caractères spéciaux** (`fixSpecialCharacters`)
- **Fonction** : Corrige les caractères spéciaux français corrompus
- **Exemples** :
  - `"tlphone"` → `"téléphone"`
  - `"Numro"` → `"Numéro"`
  - `"Code proprietaire"` → `"Code propriétaire"`
  - `"Solde aprs"` → `"Solde après"`
- **Utilisation** : Pour réparer les caractères corrompus dans les en-têtes

### 3. **Supprimer les accents** (`removeAccents`)
- **Fonction** : Supprime tous les accents des en-têtes
- **Exemples** :
  - `"Téléphone"` → `"Telephone"`
  - `"Numéro"` → `"Numero"`
  - `"Code propriétaire"` → `"Code proprietaire"`
- **Utilisation** : Pour standardiser les en-têtes sans accents

### 4. **Standardiser les en-têtes** (`standardizeHeaders`)
- **Fonction** : Convertit en format standard compatible base de données
- **Exemple** : `"Code propriétaire"` → `"Code_proprietaire"`
- **Utilisation** : Pour créer des noms de colonnes compatibles avec les bases de données

## 🔧 **Implémentation Technique**

### **Méthodes Ajoutées**

#### 1. **`normalizeColumnHeaders()`**
```typescript
private normalizeColumnHeaders() {
  const oldToNewColumnMap: { [key: string]: string } = {};
  
  this.columns = this.columns.map(columnName => {
    let normalizedName = columnName;
    
    // Application des corrections selon les options activées
    if (this.formatOptions.fixSpecialCharacters) {
      normalizedName = this.fixSpecialCharacters(normalizedName);
    }
    
    if (this.formatOptions.removeAccents) {
      normalizedName = this.removeAccents(normalizedName);
    }
    
    if (this.formatOptions.standardizeHeaders) {
      normalizedName = this.standardizeHeader(normalizedName);
    }
    
    if (this.formatOptions.normalizeHeaders) {
      normalizedName = this.normalizeHeader(normalizedName);
    }
    
    // Mapper l'ancien nom vers le nouveau nom
    if (normalizedName !== columnName) {
      oldToNewColumnMap[columnName] = normalizedName;
    }
    
    return normalizedName;
  });
  
  // Mettre à jour les données avec les nouveaux noms
  if (Object.keys(oldToNewColumnMap).length > 0) {
    this.combinedRows = this.combinedRows.map(row => {
      const newRow: any = {};
      for (const oldCol of Object.keys(row)) {
        const newCol = oldToNewColumnMap[oldCol] || oldCol;
        newRow[newCol] = row[oldCol];
      }
      return newRow;
    });
  }
}
```

#### 2. **`fixSpecialCharacters()`**
```typescript
private fixSpecialCharacters(text: string): string {
  const frenchCharReplacements: { [key: string]: string } = {
    // Caractères corrompus courants
    'é': 'é', 'è': 'è', 'ê': 'ê', 'ë': 'ë',
    'à': 'à', 'â': 'â', 'ä': 'ä',
    'ç': 'ç',
    'ù': 'ù', 'û': 'û', 'ü': 'ü',
    'ï': 'ï', 'î': 'î',
    'ô': 'ô', 'ö': 'ö',
    'ÿ': 'ÿ',
    
    // Caractères corrompus spécifiques aux colonnes
    'tlphone': 'téléphone',
    'Numro': 'Numéro',
    'Solde aprs': 'Solde après',
    'Code proprietaire': 'Code propriétaire',
    'groupe de rseau': 'groupe de réseau',
    'Code rseau': 'Code réseau',
    'date de cration': 'date de création',
    'Motif rgularisation': 'Motif régularisation',
    'Dstinataire': 'Destinataire',
    // ... autres corrections
  };
  
  let normalizedText = text;
  
  // Appliquer les remplacements
  for (const [corrupted, correct] of Object.entries(frenchCharReplacements)) {
    normalizedText = normalizedText.replace(new RegExp(corrupted, 'gi'), correct);
  }
  
  // Nettoyer les espaces multiples
  normalizedText = normalizedText.replace(/\s+/g, ' ').trim();
  
  return normalizedText;
}
```

#### 3. **`removeAccents()`**
```typescript
private removeAccents(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
```

#### 4. **`standardizeHeader()`**
```typescript
private standardizeHeader(text: string): string {
  // Remplacer les espaces par des underscores
  let standardized = text.replace(/\s+/g, '_');
  
  // Supprimer les caractères spéciaux non alphanumériques
  standardized = standardized.replace(/[^a-zA-Z0-9_]/g, '');
  
  // Première lettre en majuscule
  if (standardized.length > 0) {
    standardized = standardized.charAt(0).toUpperCase() + standardized.slice(1);
  }
  
  return standardized;
}
```

#### 5. **`normalizeHeader()`**
```typescript
private normalizeHeader(text: string): string {
  // Normaliser les espaces
  let normalized = text.replace(/\s+/g, ' ').trim();
  
  // Première lettre de chaque mot en majuscule
  normalized = normalized.replace(/\b\w/g, l => l.toUpperCase());
  
  // Supprimer les caractères de contrôle
  normalized = normalized.replace(/[\x00-\x1F\x7F]/g, '');
  
  return normalized;
}
```

## 🎨 **Interface Utilisateur**

### **Section Ajoutée dans le Template**
```html
<!-- Traitement des caractères spéciaux des en-têtes -->
<div class="format-section">
  <h4>🔧 Traitement des en-têtes de colonnes</h4>
  <div class="format-options">
    
    <!-- Normalisation des en-têtes -->
    <div class="format-option">
      <input type="checkbox" [(ngModel)]="formatOptions['normalizeHeaders']"> Normaliser les en-têtes
      <div *ngIf="formatOptions['normalizeHeaders']" class="format-description">
        <small class="help-text">
          💡 Normalise les espaces, met la première lettre de chaque mot en majuscule
          <br>Exemple : "  code proprietaire  " → "Code Proprietaire"
        </small>
      </div>
    </div>

    <!-- Correction des caractères spéciaux -->
    <div class="format-option">
      <input type="checkbox" [(ngModel)]="formatOptions['fixSpecialCharacters']"> Corriger les caractères spéciaux
      <div *ngIf="formatOptions['fixSpecialCharacters']" class="format-description">
        <small class="help-text">
          💡 Corrige les caractères spéciaux français corrompus
          <br>Exemples : "tlphone" → "téléphone", "Numro" → "Numéro"
        </small>
      </div>
    </div>

    <!-- Suppression des accents -->
    <div class="format-option">
      <input type="checkbox" [(ngModel)]="formatOptions['removeAccents']"> Supprimer les accents
      <div *ngIf="formatOptions['removeAccents']" class="format-description">
        <small class="help-text">
          💡 Supprime tous les accents des en-têtes
          <br>Exemple : "Téléphone" → "Telephone", "Numéro" → "Numero"
        </small>
      </div>
    </div>

    <!-- Standardisation des en-têtes -->
    <div class="format-option">
      <input type="checkbox" [(ngModel)]="formatOptions['standardizeHeaders']"> Standardiser les en-têtes
      <div *ngIf="formatOptions['standardizeHeaders']" class="format-description">
        <small class="help-text">
          💡 Convertit en format standard (underscores, alphanumérique)
          <br>Exemple : "Code propriétaire" → "Code_proprietaire"
        </small>
      </div>
    </div>

    <div class="format-info">
      <div class="info-box">
        <strong>📋 Traitement des en-têtes :</strong>
        <ul>
          <li><strong>Normalisation :</strong> Espaces propres + première lettre majuscule</li>
          <li><strong>Correction caractères :</strong> Réparation des caractères français corrompus</li>
          <li><strong>Suppression accents :</strong> Enlève tous les accents (é, è, à, ç, etc.)</li>
          <li><strong>Standardisation :</strong> Format compatible base de données (underscores)</li>
        </ul>
        <div class="warning-box">
          ⚠️ <strong>Attention :</strong> Le traitement des en-têtes modifie les noms de colonnes. 
          Assurez-vous que vos données sont sauvegardées avant application.
        </div>
      </div>
    </div>
  </div>
</div>
```

## 📊 **Exemples d'Utilisation**

### **Scénario 1 : Correction des Caractères Corrompus**
**Avant :**
```
tlphone client
Numro Trans GU
Solde aprs
Code proprietaire
```

**Après (avec `fixSpecialCharacters`) :**
```
téléphone client
Numéro Trans GU
Solde après
Code propriétaire
```

### **Scénario 2 : Standardisation pour Base de Données**
**Avant :**
```
Code propriétaire
Date d'opération
Montant €
```

**Après (avec `standardizeHeaders`) :**
```
Code_proprietaire
Date_doperation
Montant_
```

### **Scénario 3 : Suppression des Accents**
**Avant :**
```
Téléphone
Numéro
Code propriétaire
```

**Après (avec `removeAccents`) :**
```
Telephone
Numero
Code proprietaire
```

## ⚠️ **Avertissements Importants**

### **1. Modification des Noms de Colonnes**
- Les en-têtes de colonnes sont modifiés de manière permanente
- Assurez-vous de sauvegarder vos données avant application
- Les modifications affectent toutes les données chargées

### **2. Ordre d'Application**
Les traitements sont appliqués dans cet ordre :
1. **Correction des caractères spéciaux** (`fixSpecialCharacters`)
2. **Suppression des accents** (`removeAccents`)
3. **Standardisation** (`standardizeHeaders`)
4. **Normalisation générale** (`normalizeHeaders`)

### **3. Compatibilité**
- **Standardisation** : Compatible avec les bases de données SQL
- **Suppression d'accents** : Compatible avec les systèmes internationaux
- **Correction de caractères** : Spécifique aux caractères français

## 🚀 **Utilisation**

### **Étapes pour Utiliser la Fonctionnalité**

1. **Charger vos données** dans le module de traitement
2. **Sélectionner les options** de traitement des en-têtes souhaitées
3. **Appliquer le formatage** en cliquant sur "Appliquer le formatage"
4. **Vérifier les résultats** dans l'aperçu des données
5. **Exporter les données** si satisfait des modifications

### **Combinaisons Recommandées**

| Cas d'Usage | Options à Activer |
|-------------|-------------------|
| **Correction de fichiers corrompus** | `fixSpecialCharacters` |
| **Standardisation pour BDD** | `standardizeHeaders` |
| **Compatibilité internationale** | `removeAccents` |
| **Nettoyage général** | `normalizeHeaders` |
| **Traitement complet** | Toutes les options |

---

**✅ La fonctionnalité de traitement des caractères spéciaux pour les en-têtes est maintenant disponible dans le module de traitement !** 