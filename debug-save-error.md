# Débogage Erreur 400 - Sauvegarde Modèle

## 🚨 Problème Identifié
Erreur 400 (Bad Request) lors de la sauvegarde d'un modèle :
```
PUT http://localhost:8080/api/auto-processing/models/model_c5551c59-a0bc-4eb0-b610-3412efaea66f 400 (Bad Request)
```

## 🔍 Diagnostic

### 1. **Vérification des Logs Console**
Les détections spécifiques fonctionnent parfaitement :
```
🔍 Détection spécifique OPPART dans getAllAvailableColumns
🔍 Détection spécifique TRXBO dans getAllAvailableColumns  
🔍 Détection spécifique USSDPART dans getAllAvailableColumns
```

### 2. **Causes Possibles de l'Erreur 400**

#### **A. Problème de Format des Données**
- Les colonnes avec accents et espaces peuvent causer des problèmes
- Format JSON incorrect
- Champs manquants ou invalides

#### **B. Problème de Validation Backend**
- Validation des colonnes de réconciliation
- Format des `reconciliationKeys`
- Structure des `columnProcessingRules`

#### **C. Problème de Conversion DTO**
- Erreur dans `convertDTOToEntity`
- Problème avec les enums `FileType`
- Conversion des `ColumnProcessingRule`

## 🛠️ Solutions à Tester

### **Solution 1 : Vérifier les Données Envoyées**
1. Ouvrir les outils de développement (F12)
2. Aller dans l'onglet "Network"
3. Tenter de sauvegarder un modèle
4. Examiner la requête PUT qui échoue
5. Vérifier le payload JSON envoyé

### **Solution 2 : Tester avec un Modèle Simple**
1. Créer un modèle sans colonnes de réconciliation
2. Tester la sauvegarde
3. Ajouter progressivement les colonnes

### **Solution 3 : Vérifier les Logs Backend**
1. Redémarrer le backend avec plus de logs
2. Tenter la sauvegarde
3. Examiner les logs d'erreur

### **Solution 4 : Test API Direct**
```bash
# Tester l'API directement
curl -X PUT http://localhost:8080/api/auto-processing/models/model_id \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","fileType":"partner","templateFile":"OPPART.xls"}'
```

## 📋 Étapes de Débogage

### **Étape 1 : Capturer les Données**
```javascript
// Dans la console du navigateur
console.log('Données à sauvegarder:', formValue);
```

### **Étape 2 : Vérifier la Structure**
```javascript
// Vérifier la structure des reconciliationKeys
console.log('reconciliationKeys:', formValue.reconciliationKeys);
```

### **Étape 3 : Tester avec Données Minimales**
```javascript
// Créer un modèle minimal
const minimalModel = {
  name: "Test Simple",
  fileType: "partner",
  templateFile: "OPPART.xls",
  reconciliationKeys: {
    partnerKeys: [],
    boKeys: []
  }
};
```

## 🎯 Résultat Attendu

Après le débogage :
- ✅ Identification de la cause exacte de l'erreur 400
- ✅ Correction du format des données
- ✅ Sauvegarde réussie des modèles
- ✅ Toutes les colonnes (OPPART, TRXBO, USSDPART) fonctionnent

## 📊 Statut Actuel

- ✅ **Frontend** : Détection des colonnes fonctionne
- ✅ **Backend** : API accessible
- ❌ **Sauvegarde** : Erreur 400 à résoudre
- ✅ **Colonnes** : OPPART (21), TRXBO (21), USSDPART (29) détectées
