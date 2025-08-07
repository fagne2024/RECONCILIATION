# 🔧 Guide des Traitements des Modèles Partenaires

## 📋 Vue d'ensemble

Les **modèles partenaires** peuvent maintenant inclure tous les traitements disponibles dans le menu traitement, avec des options de choix sur les colonnes spécifiques. Cette fonctionnalité permet de configurer des traitements automatiques complexes pour les fichiers partenaires.

## 🎯 Nouveaux Types de Traitements Disponibles

### ✅ **1. Extraction de Données**
Permet d'extraire des parties spécifiques de données selon différents critères :

#### **Types d'Extraction**
- **Premiers caractères** : Extraire les N premiers caractères
- **Derniers caractères** : Extraire les N derniers caractères  
- **À partir de** : Extraire à partir d'une position spécifique
- **Entre deux caractères** : Extraire entre deux délimiteurs
- **Après une clé** : Extraire après une chaîne de recherche

#### **Paramètres**
- **Colonne source** : Colonne à partir de laquelle extraire
- **Nouvelle colonne** : Nom de la colonne résultante
- **Nombre de caractères** : Quantité à extraire
- **Position de départ** : Position pour l'extraction "à partir de"
- **Caractères de début/fin** : Délimiteurs pour l'extraction "entre"
- **Clé de recherche** : Chaîne à rechercher

### ✅ **2. Filtrage des Lignes**
Permet de filtrer les lignes selon différents critères :

#### **Types de Filtrage**
- **Filtrer par colonne** : Filtrer selon les valeurs d'une colonne
- **Filtrer par valeurs multiples** : Garder plusieurs valeurs spécifiques
- **Filtrer par valeur exacte** : Correspondance exacte
- **Garder lignes correspondantes** : Pattern regex

#### **Paramètres**
- **Colonne de filtrage** : Colonne sur laquelle appliquer le filtre
- **Valeurs à garder** : Liste de valeurs séparées par des virgules
- **Pattern regex** : Expression régulière pour les filtres avancés

### ✅ **3. Export par Type**
Permet d'exporter des données selon des critères spécifiques :

#### **Types d'Export**
- **Export par type** : Exporter selon le type de données
- **Export par colonne** : Exporter selon les valeurs d'une colonne
- **Export par valeur** : Exporter des valeurs spécifiques

#### **Paramètres**
- **Colonne de tri** : Colonne utilisée pour le tri et l'export
- **Valeurs à exporter** : Liste de valeurs spécifiques
- **Suffixe du fichier** : Suffixe ajouté au nom du fichier
- **Description** : Description de l'export

## 🚀 Comment Configurer les Traitements

### 1. **Accéder à la Configuration**
1. Allez dans "Modèles de Traitement Automatique"
2. Créez ou modifiez un modèle partenaire
3. Dans la section "Étapes de traitement", cliquez sur "Ajouter une étape"

### 2. **Sélectionner le Type de Traitement**
1. Choisissez le type : "Extraction de données", "Filtrage" ou "Export par type"
2. Sélectionnez l'action spécifique dans la liste déroulante
3. Configurez les paramètres selon le type choisi

### 3. **Configurer les Paramètres**

#### **Pour l'Extraction de Données**
```
Type: Extraction de données
Action: Extraire premiers caractères
Colonne source: [Sélectionner la colonne]
Nouvelle colonne: [Nom de la nouvelle colonne]
Nombre de caractères: [Nombre]
```

#### **Pour le Filtrage des Lignes**
```
Type: Filtrage
Action: Filtrer par colonne
Colonne de filtrage: [Sélectionner la colonne]
Valeurs à garder: valeur1,valeur2,valeur3
```

#### **Pour l'Export par Type**
```
Type: Export par type
Action: Export par type
Colonne de tri: [Sélectionner la colonne]
Valeurs à exporter: valeur1,valeur2,valeur3
Suffixe du fichier: _export
Description: Export par type
```

## 📊 Exemples d'Utilisation

### **Exemple 1 : Extraction d'ID Client**
```
Type: Extraction de données
Action: Extraire après une clé
Colonne source: Description
Clé de recherche: "ID:"
Nombre de caractères: 8
Nouvelle colonne: ID_Client
```

### **Exemple 2 : Filtrage par Type de Transaction**
```
Type: Filtrage
Action: Filtrer par colonne
Colonne de filtrage: Type_Transaction
Valeurs à garder: VENTE,ACHAT,REMBOURSEMENT
```

### **Exemple 3 : Export par Agence**
```
Type: Export par type
Action: Export par type
Colonne de tri: Code_Agence
Valeurs à exporter: AG001,AG002,AG003
Suffixe du fichier: _par_agence
Description: Export par agence
```

## 🔧 Fonctionnalités Avancées

### **Combinaison de Traitements**
Vous pouvez combiner plusieurs traitements dans un même modèle :
1. **Extraction** → Extraire les données nécessaires
2. **Filtrage** → Filtrer selon les critères
3. **Formatage** → Formater les données
4. **Export** → Exporter les résultats

### **Traitements Conditionnels**
Les traitements s'appliquent dans l'ordre défini :
- Chaque étape utilise le résultat de l'étape précédente
- Les colonnes créées par extraction sont disponibles pour les étapes suivantes
- Les filtres réduisent le nombre de lignes pour les étapes suivantes

### **Intégration avec la Réconciliation**
Les traitements s'appliquent avant la réconciliation :
- Les données sont traitées selon le modèle
- Les résultats sont utilisés pour la réconciliation avec les modèles BO
- Les exports créent des fichiers séparés pour analyse

## 🎯 Avantages

### **Pour l'Utilisateur**
- ✅ **Traitements automatiques** : Plus besoin de traitement manuel
- ✅ **Flexibilité complète** : Tous les traitements du menu traitement disponibles
- ✅ **Configuration simple** : Interface intuitive pour configurer les traitements
- ✅ **Réutilisabilité** : Modèles réutilisables pour différents fichiers

### **Pour l'Administration**
- ✅ **Standardisation** : Traitements uniformes pour tous les fichiers partenaires
- ✅ **Traçabilité** : Historique des traitements appliqués
- ✅ **Maintenance facilitée** : Modifications centralisées dans les modèles
- ✅ **Performance** : Traitements optimisés et automatisés

## 🔄 Intégration avec le Système

### **Cohérence avec le Menu Traitement**
- Mêmes fonctionnalités que le menu traitement
- Mêmes paramètres et options
- Même logique de traitement
- Même qualité de résultats

### **Compatibilité**
- Fonctionne avec tous les types de fichiers partenaires
- Compatible avec les modèles existants
- Intégration avec le système de réconciliation
- Support des formats CSV et Excel

## 🚨 Dépannage

### **Problème : Extraction ne fonctionne pas**
- Vérifiez que la colonne source existe
- Vérifiez que les paramètres sont corrects
- Testez avec des données d'exemple

### **Problème : Filtrage trop restrictif**
- Vérifiez les valeurs de filtrage
- Utilisez des caractères génériques si nécessaire
- Testez avec un petit échantillon

### **Problème : Export vide**
- Vérifiez que la colonne de tri existe
- Vérifiez que les valeurs d'export correspondent aux données
- Testez avec toutes les valeurs (laissez vide)

## 📈 Évolutions Futures

### **Fonctionnalités Prévues**
- 🔮 Traitements conditionnels (si/alors)
- 🔮 Agrégations avancées (somme, moyenne par groupe)
- 🔮 Validation de données personnalisée
- 🔮 Templates de traitement prédéfinis

### **Améliorations Techniques**
- 🔮 Interface drag & drop pour réorganiser les étapes
- 🔮 Prévisualisation des résultats
- 🔮 Tests unitaires pour les traitements
- 🔮 Versioning des modèles de traitement

---

**Version :** 1.0  
**Date :** Août 2025  
**Auteur :** Équipe de développement  
**Compatibilité :** Angular 15+, Material Design 15+ 