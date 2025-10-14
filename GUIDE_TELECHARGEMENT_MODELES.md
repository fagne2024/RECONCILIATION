# Guide de Téléchargement des Modèles de Fichiers

## Vue d'ensemble

Ce guide décrit la fonctionnalité de téléchargement de modèles de fichiers Excel pour faciliter l'importation de données dans les trois sous-menus suivants :
- **TSOP** (Écart Solde)
- **TRX SF** (Transactions SF)
- **Impact OP** (Écarts Partenaires)

## Fonctionnalités implémentées

### 1. TSOP (Écart Solde) - `/ecart-solde`

#### Composant modifié
- `reconciliation-app/frontend/src/app/components/ecart-solde/ecart-solde.component.ts`
- `reconciliation-app/frontend/src/app/components/ecart-solde/ecart-solde.component.html`

#### Méthode ajoutée
```typescript
downloadTemplate(): void
```

#### Colonnes du modèle
Le fichier modèle Excel `modele-tsop.xlsx` contient les colonnes suivantes :
1. **ID Transaction** - Exemple : `TRX123456`
2. **Téléphone Client** - Exemple : `22507123456`
3. **Montant** - Exemple : `10000`
4. **Service** - Exemple : `CASH IN`
5. **Agence** - Exemple : `AGENCE_001`
6. **Date Transaction** - Format : `2025-01-15 10:30:00`
7. **Numéro Trans GU** - Exemple : `GU123456789`
8. **Pays** - Exemple : `COTE D'IVOIRE`

#### Comment utiliser
1. Cliquez sur le bouton **"Télécharger Modèle"** dans la section "Import de fichier"
2. Le fichier `modele-tsop.xlsx` sera téléchargé avec 2 lignes d'exemples
3. Remplissez le fichier avec vos données en respectant les colonnes
4. Utilisez les boutons "Valider" puis "Uploader" pour importer vos données

---

### 2. TRX SF (Transactions SF) - `/trx-sf`

#### Statut
✅ **Fonctionnalité déjà existante**

Le composant TRX SF dispose déjà d'une fonctionnalité complète de téléchargement de modèles avec deux types de fichiers :

#### Modèle complet (8 colonnes)
Fichier CSV : `MODELE_TRX_SF_COMPLET.csv`

Colonnes :
1. **ID Transaction**
2. **Téléphone Client**
3. **Montant**
4. **Service**
5. **Agence**
6. **Date Transaction**
7. **Numéro Trans GU**
8. **Pays**
9. **Frais**

#### Modèle de statut (2 colonnes)
Fichier CSV : `MODELE_TRX_SF_STATUT.csv`

Colonnes :
1. **Agence**
2. **Numéro Trans GU**

#### Comment utiliser
1. Dans la section "Import de fichier", deux boutons sont disponibles :
   - **"Télécharger modèle (complet)"** - Pour importer de nouvelles transactions
   - **"Télécharger modèle (statut)"** - Pour mettre à jour le statut de transactions existantes
2. Remplissez le fichier téléchargé selon le type choisi
3. Sélectionnez le type de fichier approprié lors de l'upload
4. Utilisez "Valider" puis "Uploader"

---

### 3. Impact OP (Écarts Partenaires) - `/impact-op`

#### Composant modifié
- `reconciliation-app/frontend/src/app/components/impact-op/impact-op.component.ts`
- `reconciliation-app/frontend/src/app/components/impact-op/impact-op.component.html`

#### Méthode ajoutée
```typescript
downloadTemplate(): void
```

#### Colonnes du modèle
Le fichier modèle Excel `modele-impact-op.xlsx` contient les colonnes suivantes :
1. **Type Opération** - Exemple : `CASH IN`
2. **Montant** - Exemple : `50000`
3. **Solde avant** - Exemple : `100000`
4. **Solde après** - Exemple : `150000`
5. **Code propriétaire** - Exemple : `PROP001`
6. **Date opération** - Format : `2025-01-15 10:30:00`
7. **Numéro Trans GU** - Exemple : `GU123456789`
8. **groupe de réseau** - Exemple : `ORANGE`

#### Comment utiliser
1. Cliquez sur le bouton **"Télécharger Modèle"** dans la section "Import de fichier"
2. Le fichier `modele-impact-op.xlsx` sera téléchargé avec 2 lignes d'exemples
3. Remplissez le fichier avec vos données en respectant les colonnes
4. Utilisez les boutons "Valider" puis "Uploader" pour importer vos données

---

## Caractéristiques communes

### Format des fichiers modèles
- **Format** : Excel (.xlsx)
- **En-têtes** : Stylés avec fond bleu (#0066CC) et texte blanc
- **Données d'exemple** : 2 lignes d'exemples avec des valeurs réalistes
- **Largeur de colonnes** : Optimisée pour une meilleure lisibilité

### Notification utilisateur
Après le téléchargement, une notification de succès s'affiche :
- Pour TSOP : "Modèle de fichier TSOP téléchargé avec succès!"
- Pour Impact OP : "Modèle de fichier Impact OP téléchargé avec succès!"
- Pour TRX SF : Le téléchargement se fait directement sans notification popup

### Boutons dans l'interface
Tous les boutons de téléchargement de modèles :
- **Icône** : 📥 (fas fa-download)
- **Classe CSS** : `btn btn-info` (bouton bleu)
- **Position** : Premier bouton de la section "Upload", avant "Valider" et "Uploader"

---

## Notes techniques

### Dépendances
- La bibliothèque **XLSX** (`xlsx`) est utilisée pour générer les fichiers Excel
- La bibliothèque **PopupService** est utilisée pour afficher les notifications

### Import déjà présent
```typescript
import * as XLSX from 'xlsx';
```

### Structure du code
```typescript
downloadTemplate(): void {
  // 1. Créer les données d'exemple
  const templateData = [...]
  
  // 2. Créer le workbook
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(templateData);
  
  // 3. Définir la largeur des colonnes
  worksheet['!cols'] = columnWidths;
  
  // 4. Styler les en-têtes
  // ...
  
  // 5. Créer et télécharger le fichier
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Modèle');
  // ...
}
```

---

## Formats de dates

Les dates dans les modèles utilisent le format : `YYYY-MM-DD HH:mm:ss`

Exemples :
- `2025-01-15 10:30:00`
- `2025-01-15 14:45:00`

---

## Fichiers modifiés

### Nouveaux fichiers
Aucun fichier créé (utilisation de génération dynamique)

### Fichiers modifiés
1. `reconciliation-app/frontend/src/app/components/ecart-solde/ecart-solde.component.ts` (+ méthode downloadTemplate)
2. `reconciliation-app/frontend/src/app/components/ecart-solde/ecart-solde.component.html` (+ bouton)
3. `reconciliation-app/frontend/src/app/components/impact-op/impact-op.component.ts` (+ méthode downloadTemplate)
4. `reconciliation-app/frontend/src/app/components/impact-op/impact-op.component.html` (+ bouton)

### Fichiers non modifiés
- TRX SF : Fonctionnalité déjà existante

---

## Date de mise en œuvre
12 Octobre 2025

## Status
✅ **Implémentation terminée et validée**
- Aucune erreur de linting détectée
- Tous les imports sont présents
- Tous les composants sont fonctionnels

