# Règle de Classification des Modèles PM

## Vue d'ensemble

Une nouvelle règle de classification a été implémentée pour garantir que **tous les modèles commençant par "PM" sont automatiquement classés comme "Partenaire PAIEMENT"**.

## Justification

Cette règle est basée sur la convention de nommage utilisée dans le système où :
- **CI** = Cash In (dépôt d'argent)
- **PM** = Payment (paiement/retrait d'argent)

## Implémentation

### 1. Backend - StatisticsService

**Fichier**: `reconciliation-app/backend/src/main/java/com/reconciliation/service/StatisticsService.java`

**Méthode modifiée**: `isPaymentService(String service)`

```java
/**
 * Détermine si un service est lié aux paiements basé sur son nom
 * RÈGLE SPÉCIALE: Tous les modèles commençant par "PM" sont des partenaires paiement
 */
private boolean isPaymentService(String service) {
    if (service == null) return false;
    String serviceLower = service.toLowerCase();
    
    // RÈGLE SPÉCIALE: Tous les modèles commençant par "PM" sont des partenaires paiement
    if (serviceLower.startsWith("pm")) {
        return true;
    }
    
    return serviceLower.contains("paiement") ||
           serviceLower.contains("payment") ||
           serviceLower.contains("retrait") ||
           serviceLower.contains("transfert") ||
           serviceLower.contains("transfer");
}
```

### 2. Frontend - AutoProcessingModelsComponent

**Fichier**: `reconciliation-app/frontend/src/app/components/auto-processing-models/auto-processing-models.component.ts`

**Méthode modifiée**: `getModelCategory(model: AutoProcessingModel)`

```typescript
/**
 * Détermine la catégorie d'un modèle basée sur son nom
 * RÈGLE SPÉCIALE: Tous les modèles commençant par "PM" sont des partenaires paiement
 */
getModelCategory(model: AutoProcessingModel): string {
  const modelName = model.name.toLowerCase();
  
  // RÈGLE SPÉCIALE: Tous les modèles commençant par "PM" sont des partenaires paiement
  if (modelName.startsWith('pm')) {
    return 'Partenaire PAIEMENT';
  }
  
  // ... reste de la logique existante
}
```

## Modèles concernés

### Fichiers dans watch-folder
- `PMMOOVBF.xlsx`
- `PMMTNCM.csv`
- `PMOMBF.xlsx`
- `PMOMCI.xls`
- `PMOMCM.xls`
- `PMWAVECI.xlsx`

### Services correspondants
- `PMMOOVBF` → Partenaire PAIEMENT
- `PMMTNCM` → Partenaire PAIEMENT
- `PMOMBF` → Partenaire PAIEMENT
- `PMOMCI` → Partenaire PAIEMENT
- `PMOMCM` → Partenaire PAIEMENT
- `PMWAVECI` → Partenaire PAIEMENT

## Impact sur les statistiques

### Dashboard - Transactions créées par service
- Tous les services PM apparaîtront dans la colonne "Volume Paiement"
- Les volumes seront comptabilisés comme paiements et non comme cashin
- La classification sera automatique et cohérente

### Modèles de traitement automatique
- Tous les modèles PM seront affichés dans la catégorie "Partenaire PAIEMENT"
- Le filtrage par groupe fonctionnera correctement
- Les couleurs et styles seront appliqués selon la catégorie paiement

## Tests

### Script de test fourni
- **Fichier**: `test-pm-classification.ps1`
- **Fonctionnalités testées**:
  - Vérification des services PM dans les statistiques
  - Test des modèles de traitement automatique
  - Validation avec des exemples connus
  - Résumé de la classification

### Exécution du test
```powershell
.\test-pm-classification.ps1
```

## Priorité de la règle

Cette règle a une **priorité absolue** :
1. Si un service/modèle commence par "PM" → **Partenaire PAIEMENT**
2. Sinon, appliquer les autres règles de classification

## Cohérence

Cette règle garantit la cohérence entre :
- Le backend (statistiques)
- Le frontend (interface utilisateur)
- Les modèles de traitement automatique
- Les fichiers dans le watch-folder

## Maintenance

### Ajout de nouveaux modèles PM
- Aucune action requise
- La classification sera automatique

### Modification de la règle
- Modifier les deux méthodes (backend + frontend)
- Tester avec le script fourni
- Mettre à jour cette documentation

## Exemples d'utilisation

### Avant (sans la règle)
- `PMOMBF` pourrait être mal classé selon le contenu
- Incohérence possible entre différents composants

### Après (avec la règle)
- `PMOMBF` → **Toujours** "Partenaire PAIEMENT"
- Classification automatique et cohérente
- Pas d'ambiguïté possible
