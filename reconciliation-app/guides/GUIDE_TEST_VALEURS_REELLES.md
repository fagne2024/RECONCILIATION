# 🔍 Guide de Test - Récupération des Vraies Valeurs

## 📋 Objectif

Ce guide explique comment tester la fonctionnalité de récupération des vraies valeurs des champs dans les modèles de traitement, au lieu des valeurs mockées.

## 🎯 Étapes de Test

### ✅ **Étape 1 : Préparer un fichier de test**
1. Assurez-vous d'avoir un fichier CSV ou Excel avec des données réelles
2. Placez le fichier dans le dossier `watch-folder`
3. Notez le nom du fichier (ex: `CIOMCM.xls`)

### ✅ **Étape 2 : Créer un nouveau modèle**
1. Allez dans **"Modèles de traitement automatique"**
2. Cliquez sur **"Créer un nouveau modèle"**
3. Cliquez sur **"Sélectionner un fichier modèle"**
4. Sélectionnez votre fichier de test
5. Cliquez sur **"Confirmer l'import"**

### ✅ **Étape 3 : Ajouter une étape de filtrage**
1. Dans la section **"Étapes de traitement"**, cliquez sur **"Ajouter une étape"**
2. Configurez l'étape :
   - **Nom de l'étape** : "Test filtrage par valeur"
   - **Type d'étape** : Sélectionnez **"Filtrage"**
   - **Action** : Sélectionnez **"Filtrer par valeur"**

### ✅ **Étape 4 : Tester la récupération des valeurs**
1. **Sélectionnez un champ** dans la liste déroulante "Champ à filtrer"
2. **Ouvrez la console du navigateur** (F12)
3. **Vérifiez les logs** pour voir le processus de récupération des valeurs

## 🔍 Logs à surveiller

### **Logs de diagnostic :**
```
🔍 getAvailableValuesForField appelée avec fieldName: [nom_du_champ]
🔍 selectedFileModel: [objet_ou_null]
🔍 editingModel: [objet_ou_null]
```

### **Logs de succès :**
```
✅ Utilisation des données du fichier sélectionné
📊 sampleData length: [nombre]
📋 Ligne 0, [champ]: [valeur]
✅ Valeurs uniques trouvées: [liste_des_valeurs]
```

### **Logs de fallback :**
```
🔄 Utilisation des données mockées pour: [champ]
✅ Valeurs mockées: [liste_des_valeurs]
```

## 🎯 Cas de test spécifiques

### **Test 1 : Nouveau modèle avec fichier sélectionné**
1. Créez un nouveau modèle
2. Sélectionnez un fichier avec des données réelles
3. Ajoutez une étape de filtrage
4. Sélectionnez un champ
5. **Résultat attendu** : Les vraies valeurs du fichier s'affichent

### **Test 2 : Modèle existant avec fichier modèle**
1. Éditez un modèle existant qui a un `templateFile` défini
2. Ajoutez une étape de filtrage
3. Sélectionnez un champ
4. **Résultat attendu** : Les vraies valeurs du fichier modèle s'affichent

### **Test 3 : Modèle sans fichier**
1. Créez un modèle sans sélectionner de fichier
2. Ajoutez une étape de filtrage
3. Sélectionnez un champ
4. **Résultat attendu** : Les valeurs mockées s'affichent

## 🔧 Dépannage

### **Problème : Aucune valeur ne s'affiche**
**Solutions :**
1. Vérifiez que le fichier est bien dans `watch-folder`
2. Vérifiez les logs de la console pour les erreurs
3. Assurez-vous que le fichier a des données dans la colonne sélectionnée

### **Problème : Valeurs mockées au lieu des vraies valeurs**
**Solutions :**
1. Vérifiez que `selectedFileModel` est défini dans les logs
2. Vérifiez que `sampleData` contient des données
3. Vérifiez que le nom du champ correspond exactement à une colonne du fichier

### **Problème : Erreur lors du chargement**
**Solutions :**
1. Vérifiez que le service backend fonctionne
2. Vérifiez que le fichier est accessible
3. Vérifiez les logs d'erreur dans la console

## 📊 Exemples de logs attendus

### **Succès avec vraies valeurs :**
```
🔍 getAvailableValuesForField appelée avec fieldName: Type_Transaction
🔍 selectedFileModel: {fileName: "CIOMCM.xls", sampleData: Array(100), ...}
✅ Utilisation des données du fichier sélectionné
📊 sampleData length: 100
📋 Ligne 0, Type_Transaction: VENTE
📋 Ligne 1, Type_Transaction: ACHAT
📋 Ligne 2, Type_Transaction: VENTE
✅ Valeurs uniques trouvées: ["ACHAT", "VENTE"]
```

### **Fallback vers valeurs mockées :**
```
🔍 getAvailableValuesForField appelée avec fieldName: Type_Transaction
🔍 selectedFileModel: null
🔄 Utilisation des données mockées pour: Type_Transaction
✅ Valeurs mockées: ["VENTE", "ACHAT", "REMBOURSEMENT", "VIREMENT", "PAIEMENT"]
```

## 🎉 Validation du succès

La fonctionnalité fonctionne correctement si :
- ✅ Les vraies valeurs du fichier s'affichent dans la liste
- ✅ Les valeurs sont uniques et triées
- ✅ Vous pouvez sélectionner/désélectionner les valeurs
- ✅ Les valeurs sélectionnées apparaissent en badges
- ✅ Les logs montrent "Utilisation des données du fichier sélectionné"

---

**🎯 Objectif atteint : Récupération des vraies valeurs des champs au lieu des valeurs mockées !** 