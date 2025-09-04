# Guide de Diagnostic - Problèmes de Récupération des Clés des Modèles

## 🔍 Problèmes Courants et Solutions

### 1. **Modèles non trouvés**

#### Symptômes :
- `❌ Aucun modèle partenaire valide trouvé`
- `📋 0 modèles disponibles`

#### Causes possibles :
- Aucun modèle créé dans la base de données
- Modèles avec `fileType` différent de `'partner'`
- Patterns de fichiers ne correspondent pas

#### Solutions :
```bash
# Vérifier les modèles existants
curl http://localhost:3000/api/auto-processing-models

# Créer un modèle de test
curl -X POST http://localhost:3000/api/auto-processing-models \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Partner Model",
    "fileType": "partner",
    "filePattern": "*partner*",
    "reconciliationKeys": {
      "partnerKeys": ["External ID", "ID"],
      "boKeys": ["Numéro Trans GU", "IDTransaction"]
    }
  }'
```

### 2. **Clés de réconciliation manquantes**

#### Symptômes :
- `⚠️ Modèle sans reconciliationKeys`
- `⚠️ Modèle sans partnerKeys`

#### Causes possibles :
- Modèle créé sans clés de réconciliation
- Structure de données incorrecte
- Problème de sauvegarde

#### Solutions :
```typescript
// Vérifier la structure attendue
const expectedStructure = {
  reconciliationKeys: {
    partnerKeys: ["External ID", "ID"],           // ✅ Requis
    boKeys: ["Numéro Trans GU", "IDTransaction"], // ✅ Requis pour clés génériques
    boModels: ["model1", "model2"],               // ✅ Optionnel
    boModelKeys: {                                // ✅ Optionnel
      "model1": ["Numéro Trans GU"],
      "model2": ["IDTransaction"]
    },
    boTreatments: {                               // ✅ Optionnel
      "model1": ["filter", "transform"],
      "model2": ["aggregate"]
    }
  }
};
```

### 3. **Patterns de fichiers ne correspondent pas**

#### Symptômes :
- `🔍 0 modèles partenaires trouvés pour [filename]`
- Modèles existent mais ne sont pas détectés

#### Causes possibles :
- Pattern trop spécifique
- Nom de fichier ne correspond pas au pattern
- Problème de regex

#### Solutions :
```typescript
// Patterns recommandés
const patterns = {
  "OPPART": "*oppart*",           // ✅ Flexible
  "TRXBO": "*trxbo*",             // ✅ Flexible  
  "USSDPART": "*ussdpart*",       // ✅ Flexible
  "Generic Partner": "*partner*",  // ✅ Flexible
  "Specific": "exact_name.xls"    // ❌ Trop spécifique
};

// Test de correspondance
function testPattern(fileName: string, pattern: string): boolean {
  const regexPattern = pattern
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  const regex = new RegExp(regexPattern, 'i');
  return regex.test(fileName);
}
```

### 4. **Clés non trouvées dans les données**

#### Symptômes :
- `❌ Clés non trouvées pour le modèle BO [id]`
- `❌ Clés génériques non trouvées`
- `❌ Aucune correspondance trouvée`

#### Causes possibles :
- Noms de colonnes différents entre modèle et données
- Problème de normalisation
- Encodage des caractères

#### Solutions :
```typescript
// Vérifier la normalisation
const normalizedColumn = this.normalizeColumnName("Numéro Trans GU");
console.log('Normalisé:', normalizedColumn);

// Vérifier les colonnes disponibles
const availableColumns = Object.keys(data[0]);
console.log('Colonnes disponibles:', availableColumns);

// Test manuel de correspondance
const candidateKeys = ["Numéro Trans GU", "IDTransaction"];
const found = this.findExistingColumn(data, candidateKeys);
console.log('Clé trouvée:', found);
```

### 5. **Problèmes de structure des données**

#### Symptômes :
- `❌ Données manquantes ou vides`
- `❌ Clés candidates manquantes ou vides`

#### Causes possibles :
- Données non chargées
- Structure de données incorrecte
- Problème de parsing

#### Solutions :
```typescript
// Vérifier la structure des données
if (!boData || boData.length === 0) {
  console.error('Données BO manquantes');
  return;
}

if (!partnerData || partnerData.length === 0) {
  console.error('Données Partenaire manquantes');
  return;
}

// Vérifier la première ligne
const firstRow = boData[0];
if (!firstRow || typeof firstRow !== 'object') {
  console.error('Structure de données incorrecte');
  return;
}

console.log('Colonnes disponibles:', Object.keys(firstRow));
```

## 🛠️ Outils de Diagnostic

### 1. **Script de test PowerShell**
```powershell
# Exécuter le script de test
.\test-modeles-cles.ps1
```

### 2. **Logs de debug dans le navigateur**
```javascript
// Ouvrir la console du navigateur et vérifier :
// 1. Les modèles chargés
// 2. Les patterns de correspondance
// 3. Les clés trouvées
// 4. Les erreurs de normalisation
```

### 3. **Test manuel de l'API**
```bash
# Test de récupération des modèles
curl http://localhost:3000/api/auto-processing-models | jq '.[] | {name, fileType, filePattern, reconciliationKeys}'

# Test de création d'un modèle
curl -X POST http://localhost:3000/api/auto-processing-models \
  -H "Content-Type: application/json" \
  -d @model-test.json
```

## 📋 Checklist de Diagnostic

### ✅ Vérifications de base :
- [ ] L'API backend fonctionne (`http://localhost:3000/api/auto-processing-models`)
- [ ] Des modèles existent dans la base de données
- [ ] Au moins un modèle a `fileType: 'partner'`
- [ ] Le modèle a des `reconciliationKeys.partnerKeys`

### ✅ Vérifications des patterns :
- [ ] Le pattern du modèle correspond au nom de fichier
- [ ] Le pattern utilise des wildcards (`*`) pour la flexibilité
- [ ] Le pattern est en minuscules/majuscules appropriées

### ✅ Vérifications des clés :
- [ ] Les `partnerKeys` sont définies dans le modèle
- [ ] Les `boKeys` ou `boModelKeys` sont définies
- [ ] Les noms de clés correspondent aux colonnes des données
- [ ] La normalisation fonctionne correctement

### ✅ Vérifications des données :
- [ ] Les données BO sont chargées (`boData.length > 0`)
- [ ] Les données Partenaire sont chargées (`partnerData.length > 0`)
- [ ] Les colonnes existent dans les données
- [ ] L'encodage des caractères est correct

## 🔧 Corrections Rapides

### 1. **Créer un modèle de test**
```json
{
  "name": "Test OPPART",
  "fileType": "partner",
  "filePattern": "*oppart*",
  "reconciliationKeys": {
    "partnerKeys": ["External ID", "ID"],
    "boKeys": ["Numéro Trans GU", "IDTransaction"]
  }
}
```

### 2. **Vérifier la normalisation**
```typescript
// Test de normalisation
const testColumns = [
  "Numéro Trans GU",
  "NumÃ©ro Trans GU",
  "Numero Trans GU",
  "IDTransaction",
  "ID Transaction"
];

testColumns.forEach(col => {
  const normalized = this.normalizeColumnName(col);
  console.log(`${col} -> ${normalized}`);
});
```

### 3. **Forcer la correspondance**
```typescript
// Dans findExistingColumn, ajouter des logs détaillés
console.log('🔍 Debug complet:');
console.log('  - Données:', data.length, 'lignes');
console.log('  - Colonnes:', Object.keys(data[0]));
console.log('  - Candidates:', candidateKeys);
console.log('  - Normalisées:', normalizedCandidates);
```

## 📞 Support

Si les problèmes persistent après avoir suivi ce guide :

1. **Collecter les logs** : Console du navigateur + logs backend
2. **Exécuter le script de test** : `.\test-modeles-cles.ps1`
3. **Vérifier la base de données** : Structure des modèles
4. **Tester avec des données simples** : Fichiers de test connus
