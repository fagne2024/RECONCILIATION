# Guide de Configuration des Clés Correctes

## 🎯 Configuration Finale

Maintenant que nous savons que **USSDPART utilise la colonne "token"** comme clé, voici la configuration correcte :

### **Architecture des Clés**

```json
// Modèle TRXBO (Référence BO)
{
  "name": "Modèle TRXBO - Référence BO",
  "fileType": "bo",
  "reconciliationKeys": null  // Pas de clés pour les modèles BO
}

// Modèle USSDPART (Partenaire)
{
  "name": "Modèle USSDPART - Partenaire",
  "fileType": "partner",
  "reconciliationKeys": {
    "partnerKeys": ["token"],           // Clé USSDPART
    "boKeys": ["Numéro Trans GU"]       // Clé TRXBO correspondante
  }
}

// Modèle OPPART (Partenaire)
{
  "name": "Modèle OPPART - Partenaire",
  "fileType": "partner",
  "reconciliationKeys": {
    "partnerKeys": ["Numéro Trans GU"], // Clé OPPART
    "boKeys": ["Numéro Trans GU"]       // Clé TRXBO correspondante
  }
}
```

## 🔑 Mapping des Clés

### **TRXBO ↔ USSDPART**
- **TRXBO** : `"Numéro Trans GU"`
- **USSDPART** : `"token"`
- **Correspondance** : Les valeurs de "Numéro Trans GU" dans TRXBO correspondent aux valeurs de "token" dans USSDPART

### **TRXBO ↔ OPPART**
- **TRXBO** : `"Numéro Trans GU"`
- **OPPART** : `"Numéro Trans GU"`
- **Correspondance** : Même colonne, correspondance directe

## 🛠️ Application de la Correction

### **Étape 1 : Exécuter le Script de Correction**

```powershell
.\correction-cles-ussdpart-token.ps1
```

**Ce script va :**
1. Supprimer les modèles existants problématiques
2. Créer le modèle TRXBO (référence BO)
3. Créer le modèle USSDPART avec la clé "token"
4. Créer le modèle OPPART avec la clé "Numéro Trans GU"
5. Tester les deux réconciliations
6. Valider la configuration

### **Étape 2 : Vérifier la Configuration**

Le script affichera :
```
📋 Modèles disponibles après correction:
📊 3 modèles trouvés:
  - Modèle TRXBO - Référence BO
    ID: trxbo-reference
    Type: bo
    Pattern: *TRXBO*.csv
    Pas de clés (modèle BO)

  - Modèle USSDPART - Partenaire
    ID: ussdpart-partner
    Type: partner
    Pattern: *USSDPART*.csv
    Clés Partenaire: token
    Clés BO: Numéro Trans GU

  - Modèle OPPART - Partenaire
    ID: oppart-partner
    Type: partner
    Pattern: *OPPART*.csv
    Clés Partenaire: Numéro Trans GU
    Clés BO: Numéro Trans GU
```

## 🧪 Tests de Validation

### **Test USSDPART**
```json
// Données de test
TRXBO:
  - "Numéro Trans GU": "TRX001"
  - "Numéro Trans GU": "TRX002"

USSDPART:
  - "token": "TRX001"  // Correspondance
  - "token": "TRX002"  // Correspondance

// Résultat attendu
✅ 2 correspondances trouvées
```

### **Test OPPART**
```json
// Données de test
TRXBO:
  - "Numéro Trans GU": "TRX001"
  - "Numéro Trans GU": "TRX002"

OPPART:
  - "Numéro Trans GU": "TRX001"  // Correspondance
  - "Numéro Trans GU": "TRX002"  // Correspondance

// Résultat attendu
✅ 2 correspondances trouvées
```

## 📊 Résultats Attendus

### **Avant Correction**
- **TRXBO + USSDPART** : 0 correspondances (clé incorrecte)
- **TRXBO + OPPART** : 0 correspondances (clé incorrecte)

### **Après Correction**
- **TRXBO + USSDPART** : >0 correspondances (clé "token" correcte)
- **TRXBO + OPPART** : >0 correspondances (clé "Numéro Trans GU" correcte)

## 🔍 Logs de Débogage

### **Logs USSDPART Attendus**
```
🔍 Début de la détection intelligente des clés de réconciliation
📄 Fichiers: { boFileName: "TRXBO_20241201.csv", partnerFileName: "USSDPART_20241201.csv" }
📋 3 modèles disponibles
🔍 Modèle candidat: Modèle TRXBO - Référence BO (*TRXBO*.csv)
🔍 Modèle candidat: Modèle USSDPART - Partenaire (*USSDPART*.csv)
✅ Modèle trouvé: Modèle USSDPART - Partenaire
🔑 Clés du modèle: { partnerKeys: ["token"], boKeys: ["Numéro Trans GU"] }
✅ Clés trouvées via modèle: { boKeyColumn: "Numéro Trans GU", partnerKeyColumn: "token" }
🎯 Résultat de la détection des clés: { source: "model", confidence: 0.9, modelId: "ussdpart-partner" }
✅ Clés trouvées via modèle (ussdpart-partner) - Confiance: 90%
```

### **Logs OPPART Attendus**
```
🔍 Début de la détection intelligente des clés de réconciliation
📄 Fichiers: { boFileName: "TRXBO_20241201.csv", partnerFileName: "OPPART_20241201.csv" }
📋 3 modèles disponibles
🔍 Modèle candidat: Modèle TRXBO - Référence BO (*TRXBO*.csv)
🔍 Modèle candidat: Modèle OPPART - Partenaire (*OPPART*.csv)
✅ Modèle trouvé: Modèle OPPART - Partenaire
🔑 Clés du modèle: { partnerKeys: ["Numéro Trans GU"], boKeys: ["Numéro Trans GU"] }
✅ Clés trouvées via modèle: { boKeyColumn: "Numéro Trans GU", partnerKeyColumn: "Numéro Trans GU" }
🎯 Résultat de la détection des clés: { source: "model", confidence: 0.9, modelId: "oppart-partner" }
✅ Clés trouvées via modèle (oppart-partner) - Confiance: 90%
```

## 🚨 Dépannage

### **Problème : USSDPART ne trouve toujours pas de correspondances**
**Solutions :**
1. **Vérifier que la colonne "token" existe** dans le fichier USSDPART
2. **Vérifier que les valeurs correspondent** entre "Numéro Trans GU" (TRXBO) et "token" (USSDPART)
3. **Nettoyer les données** (espaces, caractères spéciaux)
4. **Vérifier l'encodage** des fichiers

### **Problème : OPPART ne trouve toujours pas de correspondances**
**Solutions :**
1. **Vérifier que la colonne "Numéro Trans GU" existe** dans les deux fichiers
2. **Vérifier que les valeurs correspondent** exactement
3. **Nettoyer les données** (espaces, caractères spéciaux)
4. **Vérifier l'encodage** des fichiers

### **Problème : Erreur lors de la création des modèles**
**Solutions :**
1. **Vérifier que le backend est démarré** (port 8080)
2. **Vérifier les permissions** d'accès à l'API
3. **Vérifier le format JSON** des modèles

## 📝 Notes Importantes

### **Différence Clé entre USSDPART et OPPART**
- **USSDPART** : Utilise `"token"` comme clé (différente de TRXBO)
- **OPPART** : Utilise `"Numéro Trans GU"` comme clé (même que TRXBO)

### **Architecture Cohérente**
- **TRXBO** : Modèle BO unique (référence)
- **USSDPART** : Modèle partenaire avec clé spécifique
- **OPPART** : Modèle partenaire avec clé commune

### **Validation de la Correction**
1. **Vérifier les modèles** : Types et clés corrects
2. **Tester les réconciliations** : Au moins quelques correspondances
3. **Vérifier les logs** : Clés correctes utilisées

## 🎯 Résultat Final

Après avoir appliqué cette correction :
- ✅ **TRXBO + USSDPART** : Fonctionne avec la clé "token"
- ✅ **TRXBO + OPPART** : Fonctionne avec la clé "Numéro Trans GU"
- ✅ **Architecture cohérente** : Modèles correctement configurés
- ✅ **Logs clairs** : Débogage facilité

Le problème de compatibilité entre TRXBO et USSDPART est maintenant résolu ! 🎉
