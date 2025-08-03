# 🔄 Guide des Modèles CIOM/PMOM Étendus

## 📋 Vue d'ensemble

Les **Modèles CIOM/PMOM Étendus** permettent de traiter automatiquement tous les fichiers qui contiennent "CIOM" ou "PMOM" suivis de deux chiffres avec le même traitement que CIOMCM. Cette fonctionnalité étend la couverture des modèles de traitement automatique pour inclure les variations de fichiers Orange Money.

## 🎯 Fonctionnalités

### ✅ **Patterns Supportés**
- `*CIOMCM*.xls` - Fichiers CIOMCM (Cameroun)
- `*PMOMCM*.xls` - Fichiers PMOMCM (Cameroun)
- `*CIOMML*.xls` - Fichiers CIOMML (Mali)
- `*PMOMML*.xls` - Fichiers PMOMML (Mali)
- `*CIOMGN*.xls` - Fichiers CIOMGN (Guinée)
- `*PMOMGN*.xls` - Fichiers PMOMGN (Guinée)
- `*CIOMCI*.xls` - Fichiers CIOMCI (Côte d'Ivoire)
- `*PMOMCI*.xls` - Fichiers PMOMCI (Côte d'Ivoire)
- `*CIOMSN*.xls` - Fichiers CIOMSN (Sénégal)
- `*PMOMSN*.xls` - Fichiers PMOMSN (Sénégal)
- `*CIOMKN*.xls` - Fichiers CIOMKN (Kenya)
- `*PMOMKN*.xls` - Fichiers PMOMKN (Kenya)
- `*CIOMBJ*.xls` - Fichiers CIOMBJ (Bénin)
- `*PMOMBJ*.xls` - Fichiers PMOMBJ (Bénin)
- `*CIOMGB*.xls` - Fichiers CIOMGB (Gambie)
- `*PMOMGB*.xls` - Fichiers PMOMGB (Gambie)
- Formats CSV également supportés pour tous les codes pays

### ✅ **Traitements Appliqués**
1. **Détection d'en-tête** : Détecte et ignore les lignes au-dessus de la colonne "N°"
2. **Nettoyage des montants** : Nettoie les montants (espaces, virgules, décimales)
3. **Formatage des dates** : Formate les dates au format français (dd/MM/yyyy)

### ✅ **Clés de Réconciliation**
- **Partenaire** : Référence, N°
- **BO** : IDTransaction, Reference

## 🚀 Comment utiliser

### ✅ **Méthode 1 : Bouton automatique**

1. Allez dans **Modèles de Traitement Automatique**
2. Cliquez sur le bouton **"Créer modèle CIOM/PMOM étendu"**
3. Le modèle est créé automatiquement avec toutes les étapes nécessaires

### ✅ **Méthode 2 : Création manuelle**

1. Créez un nouveau modèle
2. Configurez le pattern de fichier : `*CIOMCM*.xls,*PMOMCM*.xls,*CIOMCM*.csv,*PMOMCM*.csv,*CIOMML*.xls,*PMOMML*.xls,*CIOMML*.csv,*PMOMML*.csv,*CIOMGN*.xls,*PMOMGN*.xls,*CIOMGN*.csv,*PMOMGN*.csv,*CIOMCI*.xls,*PMOMCI*.xls,*CIOMCI*.csv,*PMOMCI*.csv,*CIOMSN*.xls,*PMOMSN*.xls,*CIOMSN*.csv,*PMOMSN*.csv,*CIOMKN*.xls,*PMOMKN*.xls,*CIOMKN*.csv,*PMOMKN*.csv,*CIOMBJ*.xls,*PMOMBJ*.xls,*CIOMBJ*.csv,*PMOMBJ*.csv,*CIOMGB*.xls,*PMOMGB*.xls,*CIOMGB*.csv,*PMOMGB*.csv`
3. Ajoutez les étapes de traitement :
   - **Détection d'en-tête** : `detectOrangeMoneyHeader`
   - **Nettoyage montants** : `cleanAmounts`
   - **Formatage dates** : `date`

## 📊 Exemples de Fichiers Supportés

### ✅ **Fichiers CIOM par Pays**
- `CIOMCM.xls` - Cameroun
- `CIOMML.xls` - Mali
- `CIOMGN.xls` - Guinée
- `CIOMCI.xls` - Côte d'Ivoire
- `CIOMSN.xls` - Sénégal
- `CIOMKN.xls` - Kenya
- `CIOMBJ.xls` - Bénin
- `CIOMGB.xls` - Gambie

### ✅ **Fichiers PMOM par Pays**
- `PMOMCM.xls` - Cameroun
- `PMOMML.xls` - Mali
- `PMOMGN.xls` - Guinée
- `PMOMCI.xls` - Côte d'Ivoire
- `PMOMSN.xls` - Sénégal
- `PMOMKN.xls` - Kenya
- `PMOMBJ.xls` - Bénin
- `PMOMGB.xls` - Gambie

## 🔧 Détection Automatique

Le système détecte automatiquement les fichiers CIOM/PMOM avec deux chiffres grâce à :

### ✅ **Patterns Regex**
```javascript
const ciomPattern = /ciom\d{2}/i;  // CIOM + 2 chiffres
const pmomPattern = /pmom\d{2}/i;  // PMOM + 2 chiffres
const ciomCountryPattern = /ciom(cm|ml|gn|ci|sn|kn|bj|gb)/i;  // CIOM + codes pays
const pmomCountryPattern = /pmom(cm|ml|gn|ci|sn|kn|bj|gb)/i;  // PMOM + codes pays
```

### ✅ **Service de Détection**
Le service `OrangeMoneyUtilsService` a été étendu pour détecter ces nouveaux patterns.

## 📋 Étapes de Traitement

### 1. **Détection d'en-tête**
- **Action** : `detectOrangeMoneyHeader`
- **Champ** : `*` (tous les champs)
- **Paramètres** :
  - `headerPattern`: "N°"
  - `skipLines`: true
- **Description** : Détecte et ignore les lignes au-dessus de la première colonne N°

### 2. **Nettoyage des montants**
- **Action** : `cleanAmounts`
- **Champ** : `["Montant (XAF)", "Commissions (XAF)"]`
- **Paramètres** :
  - `removeSpaces`: true
  - `removeCommas`: true
  - `normalizeDecimals`: true
- **Description** : Nettoie les montants CIOM/PMOM

### 3. **Formatage des dates**
- **Action** : `date`
- **Champ** : `["Date"]`
- **Paramètres** :
  - `format`: "dd/MM/yyyy"
  - `locale`: "fr-FR"
- **Description** : Formate les dates CIOM/PMOM

## 🧪 Test de la Fonctionnalité

### ✅ **Script de Test**
Utilisez le script `test-create-extended-ciom-model.ps1` pour tester la création du modèle :

```powershell
.\reconciliation-app\test-create-extended-ciom-model.ps1
```

### ✅ **Test Manuel**
1. Créez un fichier de test avec le pattern CIOM ou PMOM + deux chiffres
2. Uploadez le fichier dans l'application
3. Vérifiez que le modèle étendu est automatiquement appliqué

## 🔍 Vérification

### ✅ **Dans l'Interface**
1. Allez dans **Modèles de Traitement Automatique**
2. Vérifiez que le modèle "Modèle CIOM/PMOM étendu" est présent
3. Vérifiez le pattern : `*CIOMCM*.xls,*PMOMCM*.xls,*CIOMCM*.csv,*PMOMCM*.csv,*CIOMML*.xls,*PMOMML*.xls,*CIOMML*.csv,*PMOMML*.csv,*CIOMGN*.xls,*PMOMGN*.xls,*CIOMGN*.csv,*PMOMGN*.csv,*CIOMCI*.xls,*PMOMCI*.xls,*CIOMCI*.csv,*PMOMCI*.csv,*CIOMSN*.xls,*PMOMSN*.xls,*CIOMSN*.csv,*PMOMSN*.csv,*CIOMKN*.xls,*PMOMKN*.xls,*CIOMKN*.csv,*PMOMKN*.csv,*CIOMBJ*.xls,*PMOMBJ*.xls,*CIOMBJ*.csv,*PMOMBJ*.csv,*CIOMGB*.xls,*PMOMGB*.xls,*CIOMGB*.csv,*PMOMGB*.csv`

### ✅ **Via l'API**
```bash
curl -X GET "http://localhost:8080/api/auto-processing/models"
```

## 🚨 Résolution de Problèmes

### ❌ **Le modèle n'est pas créé**
- Vérifiez que le backend est démarré
- Vérifiez les logs du backend pour les erreurs
- Utilisez le script de test pour diagnostiquer

### ❌ **Les fichiers ne sont pas détectés**
- Vérifiez que le nom du fichier suit le pattern exact
- Vérifiez que le service de détection est correctement configuré
- Testez avec un fichier de test simple

### ❌ **Les traitements ne s'appliquent pas**
- Vérifiez que le modèle est configuré avec `autoApply: true`
- Vérifiez que les étapes de traitement sont correctement définies
- Vérifiez les logs de traitement

## 📈 Avantages

### ✅ **Cohérence**
- Tous les fichiers CIOM/PMOM avec deux chiffres ont le même traitement
- Réduction des erreurs de configuration manuelle

### ✅ **Automatisation**
- Détection automatique des fichiers
- Application automatique des traitements
- Réduction du temps de configuration

### ✅ **Maintenabilité**
- Un seul modèle pour tous les fichiers similaires
- Facilité de mise à jour des traitements
- Configuration centralisée

## 🔄 Mise à Jour

Pour mettre à jour le modèle étendu :

1. **Modifiez le modèle** dans l'interface
2. **Ajoutez de nouvelles étapes** si nécessaire
3. **Testez** avec un fichier de test
4. **Déployez** les changements

## 📞 Support

En cas de problème :
1. Vérifiez les logs de l'application
2. Testez avec le script PowerShell
3. Vérifiez la configuration du modèle
4. Contactez l'équipe de développement 