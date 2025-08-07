# 🔍 Guide du Filtrage par Valeur dans les Modèles de Traitement

## 📋 Vue d'ensemble

La fonctionnalité **"Filtrer par valeur"** permet de filtrer les données selon des valeurs spécifiques d'un champ choisi. Cette fonctionnalité est particulièrement utile pour isoler des données spécifiques dans vos fichiers de traitement.

## 🎯 Comment utiliser le filtrage par valeur

### ✅ **Étape 1 : Créer ou modifier un modèle**
1. Allez dans la section **"Modèles de traitement automatique"**
2. Cliquez sur **"Créer un nouveau modèle"** ou modifiez un modèle existant
3. Sélectionnez un fichier modèle pour avoir accès aux colonnes disponibles

### ✅ **Étape 2 : Ajouter une étape de filtrage**
1. Dans la section **"Étapes de traitement"**, cliquez sur **"Ajouter une étape"**
2. Configurez l'étape :
   - **Nom de l'étape** : Ex: "Filtrer par type de transaction"
   - **Type d'étape** : Sélectionnez **"Filtrage"**
   - **Action** : Sélectionnez **"Filtrer par valeur"**

### ✅ **Étape 3 : Configurer le filtrage**
1. **Champ à filtrer** : Sélectionnez la colonne sur laquelle appliquer le filtre
2. **Valeurs disponibles** : Une liste des valeurs uniques de ce champ s'affiche automatiquement
3. **Sélection des valeurs** : Cliquez sur les valeurs que vous voulez conserver
4. **Valeurs sélectionnées** : Les valeurs choisies apparaissent en badges avec possibilité de les supprimer

## 🔧 Fonctionnalités disponibles

### **Interface intuitive**
- ✅ **Liste des valeurs disponibles** : Affichage automatique de toutes les valeurs uniques du champ
- ✅ **Sélection multiple** : Cliquez pour sélectionner/désélectionner plusieurs valeurs
- ✅ **Indicateur visuel** : Les valeurs sélectionnées sont mises en surbrillance
- ✅ **Gestion des valeurs** : Suppression facile des valeurs sélectionnées

### **Comportement du filtre**
- ✅ **Filtrage inclusif** : Garde uniquement les lignes où le champ correspond aux valeurs sélectionnées
- ✅ **Données préservées** : Les autres colonnes restent inchangées
- ✅ **Performance optimisée** : Traitement rapide même sur de gros fichiers

## 📊 Exemples d'utilisation

### **Exemple 1 : Filtrer par type de transaction**
```
Champ : "Type_Transaction"
Valeurs sélectionnées : ["VENTE", "ACHAT"]
Résultat : Garde seulement les lignes avec VENTE ou ACHAT
```

### **Exemple 2 : Filtrer par agence**
```
Champ : "Code_Agence"
Valeurs sélectionnées : ["AG001", "AG002"]
Résultat : Garde seulement les transactions des agences AG001 et AG002
```

### **Exemple 3 : Filtrer par statut**
```
Champ : "Statut"
Valeurs sélectionnées : ["ACTIF", "EN_ATTENTE"]
Résultat : Garde seulement les comptes actifs ou en attente
```

## 🎨 Interface utilisateur

### **Section des valeurs disponibles**
- 📋 **Liste claire** : Toutes les valeurs uniques du champ sélectionné
- 🎯 **Sélection interactive** : Cliquez pour sélectionner/désélectionner
- 🎨 **Indicateurs visuels** : Couleurs différentes pour les valeurs sélectionnées

### **Section des valeurs sélectionnées**
- 🏷️ **Badges colorés** : Chaque valeur sélectionnée apparaît dans un badge
- ❌ **Suppression facile** : Bouton "×" pour retirer une valeur
- 📝 **Vue d'ensemble** : Visualisation claire des filtres actifs

## ⚙️ Configuration technique

### **Paramètres sauvegardés**
```json
{
  "name": "Filtrer par type de transaction",
  "type": "filter",
  "action": "filterByValue",
  "field": ["Type_Transaction"],
  "params": {
    "values": ["VENTE", "ACHAT"]
  }
}
```

### **Intégration avec le traitement**
- 🔄 **Ordre des étapes** : Le filtrage peut être appliqué à n'importe quelle étape
- 🔗 **Chaînage** : Peut être combiné avec d'autres étapes de traitement
- 📈 **Performance** : Optimisé pour les gros volumes de données

## 🚀 Avantages

### **Simplicité d'utilisation**
- ✅ **Interface intuitive** : Pas besoin de connaître les valeurs à l'avance
- ✅ **Sélection visuelle** : Voir directement les valeurs disponibles
- ✅ **Gestion flexible** : Ajout/suppression facile des valeurs

### **Précision du filtrage**
- ✅ **Filtrage exact** : Correspondance exacte des valeurs
- ✅ **Multiples valeurs** : Sélection de plusieurs valeurs simultanément
- ✅ **Préservation des données** : Les autres colonnes restent intactes

### **Intégration complète**
- ✅ **Modèles de traitement** : Intégré dans le système de modèles
- ✅ **Traitement automatique** : Application automatique lors de l'upload
- ✅ **Réutilisabilité** : Modèles sauvegardés et réutilisables

## 🔍 Cas d'usage courants

### **Traitement bancaire**
- Filtrer par type de transaction (débit/crédit)
- Isoler les transactions d'agences spécifiques
- Filtrer par statut de compte

### **Traitement commercial**
- Filtrer par catégorie de produit
- Isoler les ventes par région
- Filtrer par statut de commande

### **Traitement administratif**
- Filtrer par département
- Isoler les documents par priorité
- Filtrer par statut de validation

## 💡 Conseils d'utilisation

### **Optimisation des performances**
- 🎯 **Sélection ciblée** : Choisissez seulement les valeurs nécessaires
- 📊 **Analyse préalable** : Vérifiez les valeurs disponibles avant filtrage
- 🔄 **Ordre des étapes** : Appliquez le filtrage tôt dans le processus

### **Maintenance des modèles**
- 📝 **Noms descriptifs** : Donnez des noms clairs aux étapes de filtrage
- 🔄 **Mise à jour régulière** : Vérifiez les valeurs disponibles périodiquement
- 📋 **Documentation** : Documentez les critères de filtrage utilisés

---

**🎉 La fonctionnalité de filtrage par valeur est maintenant disponible dans tous vos modèles de traitement !** 