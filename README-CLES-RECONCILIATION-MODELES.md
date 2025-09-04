# Guide des Clés de Réconciliation dans les Modèles

## Vue d'ensemble

Ce document explique comment les clés de réconciliation configurées dans les modèles sont récupérées et utilisées pour la réconciliation automatique.

## Architecture des Clés de Réconciliation

### 🔑 **Structure des Clés**

Les modèles de traitement automatique contiennent une section `reconciliationKeys` avec la structure suivante :

```json
{
  "reconciliationKeys": {
    "partnerKeys": ["External ID", "Transaction ID", "Numéro Trans GU"],
    "boKeys": ["Numéro Trans GU", "IDTransaction", "Transaction ID"]
  }
}
```

### 📋 **Types de Modèles**

#### **1. Modèles BO (Back Office)**
- **Type** : `"fileType": "bo"`
- **Clés de réconciliation** : `null` (pas de clés)
- **Rôle** : Fournir les données de référence pour la réconciliation
- **Exemple** : Modèle TRXBO

```json
{
  "name": "Modèle TRXBO - Référence BO",
  "fileType": "bo",
  "reconciliationKeys": null,
  "columnProcessingRules": [...]
}
```

#### **2. Modèles Partenaires**
- **Type** : `"fileType": "partner"`
- **Clés de réconciliation** : Configurées avec `partnerKeys` et `boKeys`
- **Rôle** : Définir les colonnes à utiliser pour la réconciliation
- **Exemple** : Modèles OPPART, USSDPART

```json
{
  "name": "Modèle OPPART - Partenaire",
  "fileType": "partner",
  "reconciliationKeys": {
    "partnerKeys": ["Numéro Trans GU", "External ID"],
    "boKeys": ["Numéro Trans GU", "IDTransaction"]
  }
}
```

## 🔄 **Processus de Récupération et Utilisation**

### **1. Détection des Modèles**

Dans `file-upload.component.ts`, la méthode `detectReconciliationKeys()` :

```typescript
private async detectReconciliationKeys(
    boData: Record<string, string>[], 
    partnerData: Record<string, string>[],
    boFileName: string,
    partnerFileName: string
): Promise<{
    boKeyColumn: string;
    partnerKeyColumn: string;
    source: 'model' | 'detection' | 'fallback';
    confidence: number;
    modelId?: string;
}> {
    // 1. Récupérer tous les modèles
    const models = await this.autoProcessingService.getAllModels();
    
    // 2. Chercher un modèle correspondant
    const matchingModel = this.findMatchingModelForFiles(models, boFileName, partnerFileName);
    
    // 3. Utiliser les clés du modèle si trouvé
    if (matchingModel && matchingModel.reconciliationKeys) {
        const boKeys = matchingModel.reconciliationKeys.boKeys || [];
        const partnerKeys = matchingModel.reconciliationKeys.partnerKeys || [];
        
        const boKeyColumn = this.findBestMatchingColumn(boData, boKeys);
        const partnerKeyColumn = this.findBestMatchingColumn(partnerData, partnerKeys);
        
        if (boKeyColumn && partnerKeyColumn) {
            return {
                boKeyColumn,
                partnerKeyColumn,
                source: 'model',
                confidence: 0.9,
                modelId: matchingModel.modelId
            };
        }
    }
    
    // 4. Fallback vers la détection intelligente
    // ...
}
```

### **2. Correspondance des Colonnes**

La méthode `findBestMatchingColumn()` trouve la meilleure correspondance :

```typescript
private findBestMatchingColumn(data: Record<string, string>[], candidateKeys: string[]): string | null {
    const availableColumns = Object.keys(data[0]);
    
    // Normaliser les noms de colonnes
    const normalizedColumns = availableColumns.map(col => this.normalizeColumnName(col));
    const normalizedCandidates = candidateKeys.map(key => this.normalizeColumnName(key));
    
    // Chercher des correspondances exactes
    for (let i = 0; i < normalizedCandidates.length; i++) {
        const candidateIndex = normalizedColumns.indexOf(normalizedCandidates[i]);
        if (candidateIndex !== -1) {
            return availableColumns[candidateIndex];
        }
    }
    
    // Chercher des correspondances partielles
    // ...
}
```

### **3. Utilisation dans la Réconciliation**

Les clés détectées sont utilisées pour configurer la réconciliation :

```typescript
async onAutoProceed(): Promise<void> {
    // Détecter les clés
    const keyDetectionResult = await this.detectReconciliationKeys(
        this.autoBoData,
        this.autoPartnerData,
        boFileName,
        partnerFileName
    );
    
    // Configurer la réconciliation
    const reconciliationRequest = {
        boFileContent: this.autoBoData,
        partnerFileContent: this.autoPartnerData,
        boKeyColumn: keyDetectionResult.boKeyColumn,
        partnerKeyColumn: keyDetectionResult.partnerKeyColumn,
        comparisonColumns: [{
            boColumn: keyDetectionResult.boKeyColumn,
            partnerColumn: keyDetectionResult.partnerKeyColumn
        }]
    };
    
    // Lancer la réconciliation
    this.reconciliationService.reconcile(reconciliationRequest).subscribe({
        // ...
    });
}
```

## 🎯 **Exemples Concrets**

### **Exemple 1 : TRXBO ↔ OPPART**

**Modèle TRXBO (BO) :**
```json
{
  "name": "Modèle TRXBO - Référence BO",
  "fileType": "bo",
  "reconciliationKeys": null
}
```

**Modèle OPPART (Partenaire) :**
```json
{
  "name": "Modèle OPPART - Partenaire",
  "fileType": "partner",
  "reconciliationKeys": {
    "partnerKeys": ["Numéro Trans GU"],
    "boKeys": ["Numéro Trans GU"]
  }
}
```

**Résultat :**
- **Clé BO** : `"Numéro Trans GU"` (depuis le modèle OPPART)
- **Clé Partenaire** : `"Numéro Trans GU"` (depuis le modèle OPPART)
- **Correspondance** : Même colonne, correspondance directe

### **Exemple 2 : TRXBO ↔ USSDPART**

**Modèle USSDPART (Partenaire) :**
```json
{
  "name": "Modèle USSDPART - Partenaire",
  "fileType": "partner",
  "reconciliationKeys": {
    "partnerKeys": ["token"],
    "boKeys": ["Numéro Trans GU"]
  }
}
```

**Résultat :**
- **Clé BO** : `"Numéro Trans GU"` (depuis le modèle USSDPART)
- **Clé Partenaire** : `"token"` (depuis le modèle USSDPART)
- **Correspondance** : Les valeurs de "Numéro Trans GU" dans TRXBO correspondent aux valeurs de "token" dans USSDPART

## 🔧 **Scripts de Test et Correction**

### **1. Test des Clés de Réconciliation**

```powershell
.\test-cles-reconciliation-modeles.ps1
```

**Fonctionnalités :**
- Vérifie la connectivité à l'API
- Analyse tous les modèles et leurs clés
- Teste la récupération des clés via l'API
- Simule la détection automatique
- Crée et teste un modèle de test

### **2. Correction et Optimisation**

```powershell
.\correction-cles-reconciliation-modeles.ps1
```

**Fonctionnalités :**
- Analyse et corrige les modèles existants
- Applique les corrections nécessaires
- Crée des modèles optimisés
- Teste la récupération des clés

## 📊 **Validation et Monitoring**

### **Logs de Debug**

Le système génère des logs détaillés pour tracer l'utilisation des clés :

```
🔍 Début de la détection intelligente des clés de réconciliation
📄 Fichiers: { boFileName: "TRXBO.csv", partnerFileName: "OPPART.csv" }
📋 3 modèles disponibles
🔍 Modèle candidat: Modèle OPPART - Partenaire (*OPPART*.csv)
✅ Modèle trouvé: Modèle OPPART - Partenaire
🔑 Clés du modèle: { partnerKeys: ["Numéro Trans GU"], boKeys: ["Numéro Trans GU"] }
✅ Clés trouvées via modèle: { boKeyColumn: "Numéro Trans GU", partnerKeyColumn: "Numéro Trans GU" }
```

### **Métriques de Confiance**

Le système attribue des niveaux de confiance :

- **`source: 'model'`** : Confiance 0.9 (clés trouvées via modèle)
- **`source: 'detection'`** : Confiance 0.5-0.8 (détection intelligente)
- **`source: 'fallback'`** : Confiance 0.3 (fallback simple)

## 🚀 **Bonnes Pratiques**

### **1. Configuration des Modèles**

- **Modèles BO** : Pas de clés de réconciliation
- **Modèles Partenaires** : Toujours configurer `partnerKeys` et `boKeys`
- **Noms de colonnes** : Utiliser des noms normalisés et cohérents

### **2. Gestion des Erreurs**

- Vérifier la présence des colonnes dans les données
- Implémenter des fallbacks robustes
- Logger les erreurs de correspondance

### **3. Performance**

- Mettre en cache les modèles pour éviter les appels API répétés
- Optimiser la recherche de correspondances
- Utiliser des index pour les grandes données

## 🔍 **Dépannage**

### **Problèmes Courants**

1. **Clés non trouvées dans les données**
   - Vérifier les noms de colonnes exacts
   - Normaliser les noms de colonnes
   - Ajouter des correspondances partielles

2. **Modèles non détectés**
   - Vérifier les patterns de fichiers
   - S'assurer que les modèles sont actifs
   - Contrôler la connectivité API

3. **Correspondances incorrectes**
   - Revoir la configuration des clés
   - Tester avec des données d'exemple
   - Vérifier la logique de correspondance

### **Solutions**

- Utiliser les scripts de test pour diagnostiquer
- Vérifier les logs de debug
- Corriger la configuration des modèles
- Tester avec des données connues

## 📋 **Conclusion**

Le système de clés de réconciliation dans les modèles permet une configuration flexible et robuste de la réconciliation automatique. Les clés sont correctement récupérées et utilisées pour assurer une correspondance précise entre les données BO et partenaires.
