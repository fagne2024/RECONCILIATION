# Suffixe Personnalisé pour Export par Type

## Vue d'ensemble

Cette fonctionnalité permet aux utilisateurs de spécifier un suffixe personnalisé lors de l'export par type, en plus des options prédéfinies (BO, PART).

## Fonctionnalités

### Options de Suffixe Disponibles

1. **Aucun** - Pas de suffixe ajouté au nom du fichier
2. **BO** - Ajoute "_BO" au nom du fichier
3. **PART** - Ajoute "_PART" au nom du fichier
4. **Personnalisé** - Permet de saisir un suffixe libre

### Interface Utilisateur

#### Sélection du Suffixe
- **Localisation**: Section "Export par type" → "Suffixe du fichier"
- **Composant**: Liste déroulante avec options prédéfinies + option "Personnalisé"

#### Saisie Personnalisée
- **Affichage**: Champ de saisie qui apparaît uniquement quand "Personnalisé" est sélectionné
- **Placeholder**: "Entrez votre suffixe personnalisé"
- **Style**: Bordure verte pour indiquer qu'il s'agit d'une saisie personnalisée
- **Validation**: Caractères spéciaux automatiquement remplacés par des underscores

## Exemples d'Utilisation

### Suffixes Prédéfinis
```
Type: "Transaction"
Suffixe: "BO"
Résultat: "Transaction_BO.xlsx"

Type: "Paiement"
Suffixe: "PART"
Résultat: "Paiement_PART.xlsx"
```

### Suffixe Personnalisé
```
Type: "Transaction"
Suffixe: "Personnalisé" → "Q1_2024"
Résultat: "Transaction_Q1_2024.xlsx"

Type: "Paiement"
Suffixe: "Personnalisé" → "Test_Env"
Résultat: "Paiement_Test_Env.xlsx"
```

### Avec Description
```
Type: "Transaction"
Suffixe: "Personnalisé" → "Prod"
Description: "Export_Complet"
Résultat: "Transaction_Prod_Export_Complet.xlsx"
```

## Implémentation Technique

### Frontend

#### Variables TypeScript
```typescript
exportTypeSuffix: string = '';           // Option sélectionnée
exportTypeCustomSuffix: string = '';     // Texte personnalisé saisi
```

#### Méthode de Gestion
```typescript
onExportTypeSuffixChange() {
  // Réinitialiser le suffixe personnalisé si on change d'option
  if (this.exportTypeSuffix !== 'CUSTOM') {
    this.exportTypeCustomSuffix = '';
  }
}
```

#### Logique d'Export
```typescript
let sufixe = '';
if (this.exportTypeSuffix === 'CUSTOM' && this.exportTypeCustomSuffix) {
  sufixe = this.exportTypeCustomSuffix.replace(/[^a-zA-Z0-9_-]/g, '_');
} else if (this.exportTypeSuffix && this.exportTypeSuffix !== 'CUSTOM') {
  sufixe = this.exportTypeSuffix.replace(/[^a-zA-Z0-9_-]/g, '_');
}
```

### Interface HTML
```html
<select [(ngModel)]="exportTypeSuffix" (change)="onExportTypeSuffixChange()">
  <option value="">(aucun)</option>
  <option value="BO">BO</option>
  <option value="PART">PART</option>
  <option value="CUSTOM">Personnalisé</option>
</select>

<input *ngIf="exportTypeSuffix === 'CUSTOM'" 
       type="text" 
       [(ngModel)]="exportTypeCustomSuffix" 
       placeholder="Entrez votre suffixe personnalisé">
```

### Styles CSS
```scss
.filter-input[placeholder*="suffixe personnalisé"] {
  border-color: #28a745;
  background-color: #f8fff9;
  
  &:focus {
    border-color: #28a745;
    box-shadow: 0 0 0 2px rgba(40, 167, 69, 0.2);
  }
}
```

## Persistance des Données

### Sauvegarde
- Les valeurs `exportTypeSuffix` et `exportTypeCustomSuffix` sont sauvegardées dans le localStorage
- Restauration automatique lors du rechargement de la page

### Réinitialisation
- Les valeurs sont réinitialisées lors d'un "Nouveau traitement"
- Le suffixe personnalisé est vidé automatiquement si on change d'option

## Validation et Sécurité

### Nettoyage des Caractères
- Caractères spéciaux remplacés par des underscores
- Seuls les caractères alphanumériques, underscores et tirets sont conservés
- Protection contre les caractères dangereux pour les noms de fichiers

### Exemples de Nettoyage
```
"Q1/2024" → "Q1_2024"
"Test@Env" → "Test_Env"
"Prod#1" → "Prod_1"
"Dev-Env" → "Dev-Env" (conservé)
```

## Cas d'Usage

### 1. Export par Environnement
- **Suffixe**: "Prod", "Test", "Dev"
- **Usage**: Différencier les exports selon l'environnement

### 2. Export par Période
- **Suffixe**: "Q1_2024", "Jan_2024", "H1_2024"
- **Usage**: Organiser les exports par période

### 3. Export par Version
- **Suffixe**: "V1", "V2", "Beta"
- **Usage**: Gérer les versions d'export

### 4. Export par Équipe
- **Suffixe**: "Team_A", "Finance", "IT"
- **Usage**: Identifier l'équipe responsable

## Avantages

1. **Flexibilité**: Possibilité de créer des suffixes adaptés aux besoins spécifiques
2. **Organisation**: Meilleure organisation des fichiers exportés
3. **Traçabilité**: Identification claire de l'origine ou du contexte de l'export
4. **Compatibilité**: Fonctionne avec tous les formats d'export (CSV, XLS, XLSX)
5. **Persistance**: Les préférences sont sauvegardées entre les sessions

## Notes de Développement

- La fonctionnalité est rétrocompatible avec les suffixes existants
- Aucune modification backend requise
- Interface intuitive avec affichage conditionnel
- Validation automatique des caractères
- Style visuel distinctif pour la saisie personnalisée


