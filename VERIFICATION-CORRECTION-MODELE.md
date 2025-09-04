# Guide de Vérification - Correction de Tous les Modèles

## 🎯 Objectif Final

Configurer les trois modèles pour la réconciliation automatique avec les clés spécifiées :

- **TRXBO** : `Numéro Trans GU` (clé BO)
- **OPPART** : `Numéro trans GU` (clé partenaire)
- **USSDPART** : `token` (clé partenaire)

## 🔍 Configuration des Correspondances

### **Correspondances Attendues**
1. **TRXBO ↔ OPPART** : `Numéro Trans GU` ↔ `Numéro trans GU`
2. **TRXBO ↔ USSDPART** : `Numéro Trans GU` ↔ `token`

## 🛠️ Scripts de Correction

### **1. Script de Diagnostic**
```powershell
# Diagnostic de tous les modèles
.\diagnostic-tous-modeles.ps1
```

### **2. Script de Correction**
```powershell
# Correction de tous les modèles avec les clés spécifiées
.\corriger-tous-modeles-cles.ps1
```

### **3. Script de Vérification**
```powershell
# Vérification post-correction
.\diagnostic-tous-modeles.ps1
```

## ✅ Vérification Post-Correction

### **1. Vérifier la Structure des Modèles**

**Résultat attendu du diagnostic :**
```
Modèle: TRXBO
✅ Modèle trouvé (ID: trxbo_xxxxx)
✅ Clé correcte: Numéro Trans GU
Structure complète:
   - Partner Keys: 
   - BO Keys: Numéro Trans GU
   - BO Models: 
   - BO Model Keys: 

Modèle: OPPART
✅ Modèle trouvé (ID: oppart_xxxxx)
✅ Clé correcte: Numéro trans GU
Structure complète:
   - Partner Keys: Numéro trans GU
   - BO Keys: 
   - BO Models: 
   - BO Model Keys: 

Modèle: USSDPART
✅ Modèle trouvé (ID: ussdpart_xxxxx)
✅ Clé correcte: token
Structure complète:
   - Partner Keys: token
   - BO Keys: 
   - BO Models: 
   - BO Model Keys: 
```

### **2. Vérifier les Correspondances**

**Résultat attendu :**
```
Résumé des correspondances:
✅ TRXBO ↔ OPPART: Numéro Trans GU ↔ Numéro trans GU
✅ TRXBO ↔ USSDPART: Numéro Trans GU ↔ token
```

## 🧪 Tests de Réconciliation

### **Test 1 : TRXBO + OPPART**
1. Upload `TRXBO.xls` (fichier BO)
2. Upload `OPPART.xls` (fichier partenaire)
3. Vérifier les logs :
   ```
   🔍 Modèles partenaires trouvés pour OPPART.xls
   ✅ Modèle partenaire sélectionné: OPPART
   🔑 Clés sélectionnées: BO='Numéro Trans GU', Partner='Numéro trans GU'
   🎯 Source: 'model' (au lieu de 'fallback')
   🎯 Confiance: 1.0 (au lieu de 0.3)
   ```

### **Test 2 : TRXBO + USSDPART**
1. Upload `TRXBO.xls` (fichier BO)
2. Upload `USSDPART.xls` (fichier partenaire)
3. Vérifier les logs :
   ```
   🔍 Modèles partenaires trouvés pour USSDPART.xls
   ✅ Modèle partenaire sélectionné: USSDPART
   🔑 Clés sélectionnées: BO='Numéro Trans GU', Partner='token'
   🎯 Source: 'model' (au lieu de 'fallback')
   🎯 Confiance: 1.0 (au lieu de 0.3)
   ```

## 📊 Indicateurs de Succès

### **Logs de Debug Attendus**
1. ✅ Modèles trouvés avec clés correspondantes
2. ✅ Correspondance exacte des clés dans les données
3. ✅ Utilisation du modèle au lieu du fallback
4. ✅ Source de détection = 'model' au lieu de 'fallback'
5. ✅ Confiance = 1.0 au lieu de 0.3
6. ✅ Correspondances trouvées > 0

### **Résultats de Réconciliation Attendus**
- **Avant** : 0 correspondances, fallback utilisé
- **Après** : Correspondances trouvées, modèle utilisé

## 🔧 Commandes de Test

### **Test Manuel de l'API**
```bash
# Vérifier tous les modèles
curl http://localhost:8080/api/auto-processing-models | jq '.[] | {name: .name, partnerKeys: .reconciliationKeys.partnerKeys, boKeys: .reconciliationKeys.boKeys}'

# Résultat attendu :
[
  {
    "name": "TRXBO",
    "partnerKeys": [],
    "boKeys": ["Numéro Trans GU"]
  },
  {
    "name": "OPPART", 
    "partnerKeys": ["Numéro trans GU"],
    "boKeys": []
  },
  {
    "name": "USSDPART",
    "partnerKeys": ["token"],
    "boKeys": []
  }
]
```

## 🚨 En Cas de Problème

### **Si la correction ne fonctionne pas :**

1. **Diagnostic complet** :
   ```powershell
   .\diagnostic-tous-modeles.ps1
   ```

2. **Vérifier l'API** :
   ```bash
   curl http://localhost:8080/api/auto-processing-models
   ```

3. **Recréer les modèles si nécessaire** :
   ```bash
   # Supprimer et recréer
   curl -X DELETE http://localhost:8080/api/auto-processing-models/[ID]
   curl -X POST http://localhost:8080/api/auto-processing-models -H "Content-Type: application/json" -d @modele-config.json
   ```

## 📋 Checklist de Vérification

- [ ] Diagnostic de tous les modèles exécuté
- [ ] Script de correction exécuté avec succès
- [ ] TRXBO utilise la clé 'Numéro Trans GU'
- [ ] OPPART utilise la clé 'Numéro trans GU'
- [ ] USSDPART utilise la clé 'token'
- [ ] Correspondances TRXBO ↔ OPPART vérifiées
- [ ] Correspondances TRXBO ↔ USSDPART vérifiées
- [ ] Test avec TRXBO.xls + OPPART.xls
- [ ] Test avec TRXBO.xls + USSDPART.xls
- [ ] Logs montrent "Modèle partenaire sélectionné"
- [ ] Source de détection = 'model' au lieu de 'fallback'
- [ ] Confiance = 1.0 au lieu de 0.3
- [ ] Correspondances trouvées > 0

## 🎯 Résultat Final Attendu

Après la correction, la réconciliation automatique devrait :
1. **Détecter automatiquement** le bon modèle pour chaque fichier
2. **Utiliser les clés du modèle** au lieu du fallback
3. **Trouver des correspondances** entre les fichiers
4. **Afficher des résultats** avec une confiance élevée

## 🔄 Étapes de Correction

1. **Diagnostic** : `.\diagnostic-tous-modeles.ps1`
2. **Correction** : `.\corriger-tous-modeles-cles.ps1`
3. **Vérification** : `.\diagnostic-tous-modeles.ps1`
4. **Test TRXBO+OPPART** : Upload des fichiers et vérification
5. **Test TRXBO+USSDPART** : Upload des fichiers et vérification

## 📝 Résumé de la Configuration

**Configuration finale :**
- **TRXBO** : Modèle BO avec clé `'Numéro Trans GU'`
- **OPPART** : Modèle partenaire avec clé `'Numéro trans GU'`
- **USSDPART** : Modèle partenaire avec clé `'token'`

**Correspondances :**
- TRXBO ↔ OPPART : `Numéro Trans GU` ↔ `Numéro trans GU`
- TRXBO ↔ USSDPART : `Numéro Trans GU` ↔ `token`

**Résultat** : Réconciliation automatique fonctionnelle avec détection de modèles et correspondances trouvées.
