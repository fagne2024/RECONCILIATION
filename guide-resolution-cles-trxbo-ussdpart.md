# Guide de Résolution - Clés TRXBO et USSDPART

## 🎯 Problème Identifié

La clé utilisée pour la réconciliation entre TRXBO et USSDPART n'est pas la bonne, ce qui explique pourquoi :
- **0 correspondances parfaites** sont trouvées
- **300 TRXBO uniquement** (aucune correspondance)
- **338 USSDPART uniquement** (aucune correspondance)

## 🔍 Analyse du Problème

### **Cause Racine**
La configuration actuelle utilise **"Numéro Trans GU"** comme clé de réconciliation, mais cette colonne :
1. **N'existe peut-être pas** dans les deux fichiers
2. **A des valeurs différentes** entre TRXBO et USSDPART
3. **N'est pas la bonne clé** pour cette réconciliation

### **Logs d'Erreur**
```
RÉSULTATS FINAUX TRXBO/OPPART:
Total TRXBO: 300
Total OPPART: 338
Correspondances parfaites (1:2): 0
Écarts (0, 1, ou >2 correspondances): 0
Uniquement TRXBO: 300
Uniquement OPPART: 338
```

## 🛠️ Solution en 3 Étapes

### **Étape 1 : Analyser les Vraies Colonnes**

Exécutez le script d'analyse pour identifier les vraies colonnes disponibles :

```powershell
.\analyse-cles-trxbo-ussdpart.ps1
```

**Ce script va :**
- Analyser les en-têtes des fichiers TRXBO et USSDPART
- Identifier les colonnes communes
- Chercher des colonnes avec des noms similaires
- Tester différentes clés potentielles
- Recommander la meilleure clé

**Résultat attendu :**
```
🔍 Analyse des clés TRXBO et USSDPART
=====================================

📄 Analyse du fichier: TRXBO
📋 Colonnes trouvées (15):
  0: ID
  1: IDTransaction
  2: Date
  3: Montant
  4: Numéro Trans GU
  ...

📄 Analyse du fichier: USSDPART
📋 Colonnes trouvées (12):
  0: ID
  1: Transaction ID
  2: Date
  3: Montant
  4: External ID
  ...

🔑 Identification des clés potentielles...
✅ Colonnes communes trouvées:
  - ID
  - Date
  - Montant

🎯 Recherche de colonnes avec patterns de clés...
  Pattern 'id':
    TRXBO: ID, IDTransaction
    USSDPART: ID, Transaction ID

🏆 Recommandation de la meilleure clé...
✅ Meilleure clé recommandée: ID
   Score: 100%
   Correspondances: 3
```

### **Étape 2 : Corriger la Configuration**

Une fois la bonne clé identifiée, exécutez le script de correction :

```powershell
.\correction-cles-automatique.ps1
```

**Ce script va :**
- Demander la clé correcte identifiée
- Supprimer les modèles existants problématiques
- Créer de nouveaux modèles avec la bonne clé
- Tester la réconciliation
- Valider la configuration

**Exemple d'utilisation :**
```
🔧 Correction automatique des clés TRXBO et USSDPART
==================================================

🔑 Veuillez fournir la clé correcte identifiée:
Clé de réconciliation (ex: ID, Transaction ID, etc.): ID
✅ Clé sélectionnée: ID

1️⃣ Nettoyage des modèles existants...
2️⃣ Création du modèle TRXBO (référence BO)...
3️⃣ Création du modèle USSDPART (partenaire)...
4️⃣ Création du modèle OPPART (partenaire)...
5️⃣ Test de réconciliation...
6️⃣ Vérification des modèles créés...

🎉 Correction réussie ! La clé 'ID' devrait maintenant fonctionner.
```

### **Étape 3 : Tester la Réconciliation**

Testez la réconciliation avec les nouveaux modèles :

1. **Ouvrir l'application** : `http://localhost:4200`
2. **Aller en mode "Automatique"**
3. **Charger un fichier TRXBO**
4. **Charger un fichier USSDPART**
5. **Lancer la réconciliation**
6. **Vérifier les logs** dans la console du navigateur

**Logs attendus après correction :**
```
🔍 Début de la détection intelligente des clés de réconciliation
📄 Fichiers: { boFileName: "TRXBO_20241201.csv", partnerFileName: "USSDPART_20241201.csv" }
📋 3 modèles disponibles
🔍 Modèle candidat: Modèle TRXBO - Référence BO (*TRXBO*.csv)
🔍 Modèle candidat: Modèle USSDPART - Partenaire (*USSDPART*.csv)
✅ Modèle trouvé: Modèle USSDPART - Partenaire
🔑 Clés du modèle: { partnerKeys: ["ID"], boKeys: ["ID"] }
✅ Clés trouvées via modèle: { boKeyColumn: "ID", partnerKeyColumn: "ID" }
🎯 Résultat de la détection des clés: { source: "model", confidence: 0.9, modelId: "ussdpart-partner" }
✅ Clés trouvées via modèle (ussdpart-partner) - Confiance: 90%
```

## 📊 Résultats Attendus

### **Avant Correction**
- **Correspondances** : 0
- **TRXBO uniquement** : 300
- **USSDPART uniquement** : 338
- **Temps** : ~100ms

### **Après Correction**
- **Correspondances** : >0 (selon les données réelles)
- **TRXBO uniquement** : <300
- **USSDPART uniquement** : <338
- **Temps** : ~100ms

## 🔧 Scripts Disponibles

### **1. Script d'Analyse**
- **Fichier** : `analyse-cles-trxbo-ussdpart.ps1`
- **Fonction** : Analyser les colonnes et identifier la bonne clé
- **Utilisation** : Fournir les chemins des fichiers TRXBO et USSDPART

### **2. Script de Correction**
- **Fichier** : `correction-cles-automatique.ps1`
- **Fonction** : Corriger la configuration avec la bonne clé
- **Utilisation** : Fournir la clé correcte identifiée

### **3. Script de Test**
- **Fichier** : `test-trxbo-ussdpart-compatibility.ps1`
- **Fonction** : Valider que la correction fonctionne
- **Utilisation** : Exécuter après la correction

## 🚨 Dépannage

### **Problème : Aucune colonne commune trouvée**
**Solution :**
1. Vérifier que les fichiers sont bien au format CSV
2. Vérifier l'encodage des fichiers (UTF-8 recommandé)
3. Vérifier que les en-têtes sont sur la première ligne
4. Utiliser une clé composite (combinaison de plusieurs colonnes)

### **Problème : Colonnes communes mais pas de correspondances**
**Solution :**
1. Vérifier le format des valeurs (espaces, caractères spéciaux)
2. Nettoyer les données avant la réconciliation
3. Utiliser des règles de normalisation dans les modèles

### **Problème : Erreur lors de la création des modèles**
**Solution :**
1. Vérifier que le backend est démarré (port 8080)
2. Vérifier les permissions d'accès à l'API
3. Vérifier le format JSON des modèles

## 📝 Notes Importantes

### **Clés Communes Typiques**
- **ID** : Identifiant unique
- **Transaction ID** : Identifiant de transaction
- **Reference** : Référence de transaction
- **External ID** : Identifiant externe
- **Code** : Code de transaction

### **Architecture Corrigée**
```json
// Modèle TRXBO (Référence BO)
{
  "name": "Modèle TRXBO - Référence BO",
  "fileType": "bo",
  "reconciliationKeys": null
}

// Modèle USSDPART (Partenaire)
{
  "name": "Modèle USSDPART - Partenaire",
  "fileType": "partner",
  "reconciliationKeys": {
    "partnerKeys": ["ID"],
    "boKeys": ["ID"]
  }
}
```

### **Validation de la Correction**
1. **Vérifier les modèles** : Les modèles doivent avoir les bons types
2. **Tester la réconciliation** : Au moins quelques correspondances doivent être trouvées
3. **Vérifier les logs** : Les logs doivent indiquer la bonne clé utilisée

## 🎯 Résultat Final

Après avoir suivi ce guide :
- ✅ **TRXBO** fonctionne correctement avec **USSDPART**
- ✅ **Clé de réconciliation** correctement configurée
- ✅ **Architecture cohérente** entre les modèles
- ✅ **Logs clairs** pour le débogage

Le problème de compatibilité entre TRXBO et USSDPART est résolu ! 🎉
