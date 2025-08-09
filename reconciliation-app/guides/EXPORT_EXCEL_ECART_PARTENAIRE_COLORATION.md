# 🎨 Export Excel Écart Partenaire avec Coloration

## 📋 Vue d'ensemble

Cette documentation explique la logique de coloration et de commentaires pour l'export Excel des écarts partenaires dans le système de réconciliation.

## 🎯 Logique de Coloration

### 🔍 Détection des Types d'Écart

L'export Excel analyse les données partenaires et applique une coloration basée sur les types d'opération détectés :

#### 1. **🟥 Rouge - TSOP Complet**
```typescript
// Cas : IMPACT_COMPTIMPACT-COMPTE-GENERAL + FRAIS_TRANSACTION
tsopType: 'COMPLETE'
```
**Condition :** 
- Au moins 2 enregistrements avec la même clé de réconciliation
- Présence de `IMPACT_COMPTIMPACT-COMPTE-GENERAL` ET `FRAIS_TRANSACTION`

**Commentaire :** `TSOP`
**Style :** Fond rouge avec texte blanc

#### 2. **🟡 Jaune - SANS FRAIS**
```typescript
// Cas : IMPACT_COMPTIMPACT-COMPTE-GENERAL seul
tsopType: 'SANS_FRAIS'
```
**Condition :**
- 1 seul enregistrement avec la clé de réconciliation
- Type d'opération `IMPACT_COMPTIMPACT-COMPTE-GENERAL`
- Pas de `FRAIS_TRANSACTION` associé

**Commentaire :** `SANS FRAIS`
**Style :** Fond jaune avec texte noir

#### 3. **🟠 Orange - Régularisation FRAIS** ✨ *NOUVEAU*
```typescript
// Cas : FRAIS_TRANSACTION seul
tsopType: 'REGULARISATION_FRAIS'
```
**Condition :**
- 1 seul enregistrement avec la clé de réconciliation
- Type d'opération `FRAIS_TRANSACTION`
- Pas de `IMPACT_COMPTIMPACT-COMPTE-GENERAL` associé

**Commentaire :** `Régularisation FRAIS`
**Style :** Fond orange avec texte blanc

#### 4. **⬜ Blanc - Standard**
**Condition :**
- Enregistrements ne correspondant à aucun des cas ci-dessus

**Commentaire :** *(vide)*
**Style :** Bordures seulement

## 🔧 Implémentation Technique

### Fichier Modifié
```
reconciliation-app/frontend/src/app/components/reconciliation-results/reconciliation-results.component.ts
```

### Méthodes Principales

#### 1. `detectTSOPDuplicates()`
```typescript
// Nouvelle détection ajoutée :
else if (records.length === 1 && hasFraisTransaction && !hasImpactCompte) {
    // Cas 3: FRAIS_TRANSACTION seul (Régularisation FRAIS)
    duplicatesMap.set(key, records.map(r => ({ ...r, tsopType: 'REGULARISATION_FRAIS' })));
    console.log(`🟠 FRAIS_TRANSACTION seul détecté pour clé ${key}:`, types);
}
```

#### 2. `getTSOPComment()`
```typescript
// Nouveau commentaire ajouté :
} else if (tsopType === 'REGULARISATION_FRAIS') {
    return 'Régularisation FRAIS';
```

#### 3. Style Orange
```typescript
const regularisationFraisStyle = {
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFFA500' } }, // Orange
    font: { color: { argb: 'FFFFFFFF' }, bold: true },
    border: { /* bordures */ }
};
```

## 🎨 Palette de Couleurs

| Type | Couleur | Code ARGB | Texte | Utilisation |
|------|---------|-----------|--------|-------------|
| **TSOP Complet** | 🟥 Rouge | `FFFF0000` | Blanc | Doublon complet |
| **SANS FRAIS** | 🟡 Jaune | `FFFFFF00` | Noir | Impact sans frais |
| **Régularisation FRAIS** | 🟠 Orange | `FFFFA500` | Blanc | Frais seuls |
| **Standard** | ⬜ Blanc | `FFFFFFFF` | Noir | Autres cas |

## 📊 Format de l'Export

### Structure du Fichier Excel
```
📋 Feuille : "Partenaire Uniquement"
📋 Colonnes : Toutes les colonnes du fichier source + "Commentaire TSOP"
📋 Formatage : Bordures sur toutes les cellules
📋 En-tête : Fond bleu avec texte blanc
```

### Exemple de Résultat
```
| Type Opération | Montant | Clé | Commentaire TSOP | Style |
|----------------|---------|-----|------------------|--------|
| FRAIS_TRANSACTION | -300 | ABC123 | Régularisation FRAIS | 🟠 Orange |
| IMPACT_COMPTIMPACT-COMPTE-GENERAL | -1000 | XYZ789 | SANS FRAIS | 🟡 Jaune |
```

## 🔍 Logs de Débogage

### Messages Console
```
🟠 FRAIS_TRANSACTION seul détecté pour clé ABC123: ["FRAIS_TRANSACTION"]
🟠 Ligne 3 colorée en orange (Régularisation FRAIS)
```

### Vérification
Pour vérifier le bon fonctionnement :
1. Ouvrir la console du navigateur (F12)
2. Aller dans l'onglet "Partenaire Uniquement" des résultats de réconciliation
3. Cliquer sur "Export Excel"
4. Vérifier les logs de débogage et le fichier Excel généré

## 🎯 Cas d'Usage

### Scenario 1: Écart de Frais Seul
**Données :**
- 1 ligne avec `FRAIS_TRANSACTION`
- Pas de ligne `IMPACT_COMPTIMPACT-COMPTE-GENERAL` correspondante

**Résultat :**
- Coloration : 🟠 Orange
- Commentaire : "Régularisation FRAIS"

### Scenario 2: Impact sans Frais
**Données :**
- 1 ligne avec `IMPACT_COMPTIMPACT-COMPTE-GENERAL`
- Pas de ligne `FRAIS_TRANSACTION` correspondante

**Résultat :**
- Coloration : 🟡 Jaune
- Commentaire : "SANS FRAIS"

### Scenario 3: Doublon Complet
**Données :**
- 1 ligne avec `IMPACT_COMPTIMPACT-COMPTE-GENERAL`
- 1 ligne avec `FRAIS_TRANSACTION`
- Même clé de réconciliation

**Résultat :**
- Coloration : 🟥 Rouge (les deux lignes)
- Commentaire : "TSOP"

## 📈 Avantages

- ✅ **Identification visuelle** claire des différents types d'écarts
- ✅ **Traçabilité** avec logs de débogage détaillés
- ✅ **Commentaires explicites** pour faciliter l'analyse
- ✅ **Cohérence** avec le système existant
- ✅ **Extension facile** pour de nouveaux types d'écarts
