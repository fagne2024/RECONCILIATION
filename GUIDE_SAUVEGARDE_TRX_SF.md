# Guide de Sauvegarde TRX-SF

## 📋 Vue d'ensemble

Le module TRX-SF (Transactions SF) permet de gérer et sauvegarder les transactions financières avec plusieurs fonctionnalités de sauvegarde et d'export.

## 🔧 Fonctionnalités de Sauvegarde

### 1. Bouton "Exporter" (Sauvegarde Excel)

**Localisation :** Header de la page TRX-SF
**Icône :** 📊 (fas fa-file-excel)

#### Fonctionnement :
- **Déclenchement :** Clic sur le bouton "Exporter" vert
- **Condition :** Nécessite des données filtrées (`filteredTrxSfData.length > 0`)
- **Format :** Fichier Excel (.xlsx)

#### Colonnes exportées (12 colonnes) :

| Colonne | Description | Format | Largeur |
|---------|-------------|--------|---------|
| ID Transaction | Identifiant unique de la transaction | Texte | 20 |
| Téléphone Client | Numéro de téléphone du client | Texte | 15 |
| Montant | Montant de la transaction | Numérique (2 décimales) | 15 |
| Service | Service utilisé (ex: MTN, Orange, etc.) | Texte | 20 |
| Agence | Code de l'agence | Texte | 15 |
| Date Transaction | Date de la transaction | Date formatée | 20 |
| Numéro Trans GU | Numéro de transaction GU | Texte | 20 |
| Pays | Pays de la transaction | Texte | 10 |
| Statut | Statut (EN_ATTENTE, TRAITE, ERREUR) | Texte avec couleurs | 15 |
| Frais | Frais associés | Numérique (2 décimales) | 15 |
| Commentaire | Commentaires sur la transaction | Texte | 30 |
| Date Import | Date d'import dans le système | Date formatée | 20 |

#### Styles appliqués :
- **En-tête :** Fond bleu (#1976D2), texte blanc, gras, centré
- **Statuts colorés :**
  - 🟡 EN_ATTENTE : Fond jaune, texte noir
  - 🟢 TRAITE : Fond vert, texte blanc
  - 🔴 ERREUR : Fond rouge, texte blanc
- **Montants et Frais :** Format numérique avec séparateurs de milliers

#### Résumé inclus :
- Total Montant
- Total Frais
- Nombre par statut (En Attente, Traité, Erreur)
- Total des transactions

### 2. Mise à jour des Statuts (Sauvegarde en Base)

#### Fonctionnement individuel :
- **Déclenchement :** Changement de statut via le dropdown dans le tableau
- **Action :** Appel API `updateStatut(id, newStatut)`
- **Feedback :** Message temporaire de confirmation/erreur

#### Fonctionnement en lot :
- **Activation :** Bouton "Sélection Multiple"
- **Sélection :** Cases à cocher pour chaque ligne
- **Mise à jour :** Bouton "Mettre à jour" avec statut choisi
- **Action :** Mise à jour en lot via API

### 3. Import de Fichiers (Sauvegarde via Upload)

#### Fichier Complet (9 colonnes) :
**Processus :** Valider → Uploader → Sauvegarde en base

**Colonnes requises :**
1. ID Transaction
2. Téléphone Client  
3. Montant
4. Service
5. Agence
6. Date Transaction
7. Numéro Trans GU
8. Pays
9. Frais (optionnel)

#### Fichier de Statut (2 colonnes) :
**Processus :** Change Statut → Mise à jour en base

**Colonnes requises :**
1. Agence
2. Numéro Trans GU

## 📊 Structure des Données TrxSfData

```typescript
interface TrxSfData {
  id?: number;                    // ID unique (auto-généré)
  idTransaction: string;          // Identifiant transaction
  telephoneClient: string;        // Téléphone client
  montant: number;                // Montant transaction
  service: string;                // Service (MTN, Orange, etc.)
  agence: string;                 // Code agence
  dateTransaction: string;        // Date transaction (ISO)
  numeroTransGu: string;          // Numéro transaction GU
  pays: string;                   // Pays
  statut: 'EN_ATTENTE' | 'TRAITE' | 'ERREUR';  // Statut
  frais: number;                  // Frais associés
  commentaire: string;            // Commentaires
  dateImport: string;             // Date d'import (ISO)
}
```

## 🔄 Processus de Sauvegarde

### 1. Sauvegarde Excel (Export)
```
Clic "Exporter" 
→ Vérification données 
→ Prompt nom fichier 
→ Génération Excel avec styles 
→ Téléchargement automatique
```

### 2. Sauvegarde Statut
```
Changement statut 
→ Mise à jour interface (optimistic) 
→ Appel API 
→ Confirmation ou restauration si erreur
```

### 3. Sauvegarde Import
```
Sélection fichier 
→ Détection type (9 ou 2 colonnes) 
→ Validation 
→ Upload 
→ Sauvegarde en base 
→ Affichage résultats
```

## 🛠️ API Endpoints Utilisés

- `GET /api/trx-sf` - Récupération des données
- `POST /api/trx-sf/upload` - Upload fichier complet
- `POST /api/trx-sf/validate` - Validation fichier
- `POST /api/trx-sf/{id}/statut` - Mise à jour statut
- `POST /api/trx-sf/change-statut` - Mise à jour statut via fichier
- `DELETE /api/trx-sf/{id}` - Suppression transaction

## 📁 Formats de Fichiers Supportés

### Import :
- **CSV** (.csv) - Fichiers texte avec séparateurs
- **Excel** (.xls, .xlsx) - Fichiers Excel

### Export :
- **Excel** (.xlsx) - Format XLSX avec styles et couleurs

## 🎯 Cas d'Usage

### 1. Export pour Reporting
- Utiliser le bouton "Exporter"
- Données filtrées selon critères
- Fichier Excel avec résumé

### 2. Mise à jour Statuts
- Individuelle : Dropdown dans tableau
- En lot : Sélection multiple + bouton "Mettre à jour"

### 3. Import Nouvelles Transactions
- Fichier complet (9 colonnes) : "Valider" puis "Uploader"
- Mise à jour statuts : Fichier statut (2 colonnes) : "Change Statut"

### 4. Sauvegarde pour Archivage
- Export Excel régulier
- Filtrage par période/agence/service
- Conservation des données historiques

## ⚠️ Points d'Attention

1. **Validation** : Toujours valider avant upload
2. **Doublons** : Vérification automatique des doublons
3. **Permissions** : Utilisateurs non-admin voient uniquement leur agence
4. **Performance** : Pagination pour grandes quantités de données
5. **Backup** : Exports réguliers recommandés pour sauvegarde

## 🔧 Configuration Technique

### Dépendances :
- `exceljs` : Génération fichiers Excel
- `file-saver` : Téléchargement fichiers
- `rxjs` : Gestion observables

### Variables d'environnement :
- `API_URL` : URL backend (défaut: http://localhost:8080)

## 📈 Statistiques et Monitoring

Le module inclut des statistiques en temps réel :
- Total transactions
- Répartition par statut
- Total montants et frais
- Graphiques de performance

Ces données sont également exportables via le bouton "Exporter".
