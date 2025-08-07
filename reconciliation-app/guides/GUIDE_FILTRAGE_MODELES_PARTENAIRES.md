# 🔍 Guide de Filtrage des Modèles

## 📋 Vue d'ensemble

La fonctionnalité de **filtrage des modèles** permet de filtrer et rechercher facilement parmi tous les modèles de traitement automatique. Cette fonctionnalité offre deux niveaux de filtrage :

1. **Filtrage général** : Pour tous les modèles (BO, partenaires, both)
2. **Filtrage partenaires** : Spécifiquement pour les modèles partenaires

Cette fonctionnalité offre toutes les options de filtrage disponibles dans le menu traitement, adaptées aux modèles de traitement automatique.

## 🎯 Fonctionnalités Disponibles

### ✅ **Filtrage Général (Tous les Modèles)**
- **Nom du modèle** : Filtrer par le nom du modèle
- **Pattern de fichier** : Filtrer par le pattern de fichier (ex: *.csv)
- **Type de fichier** : Filtrer par type (bo, partner, both)
- **Auto-appliqué** : Filtrer par statut d'auto-application (Oui/Non)
- **Fichier modèle** : Filtrer par fichier modèle associé
- **Nombre d'étapes** : Filtrer par nombre d'étapes de traitement

### ✅ **Filtrage Partenaires (Modèles Partenaires Uniquement)**
- Mêmes colonnes que le filtrage général
- Appliqué uniquement aux modèles de type "partner" ou "both"
- Interface distincte avec couleur différente

### ✅ **Options de Filtrage**
- **Recherche dans les valeurs** : Recherche en temps réel
- **Sélection multiple** : Choisir plusieurs valeurs simultanément
- **Sélection "Tous"** : Sélectionner toutes les valeurs d'un coup
- **Indicateur de filtre** : Affichage du nombre de modèles filtrés
- **Réinitialisation** : Remettre à zéro tous les filtres

## 🚀 Comment Utiliser

### 1. **Accéder à la Section**
1. Allez dans "Modèles de Traitement Automatique"
2. Cliquez sur le bouton "Afficher filtres modèles" (tous les modèles)
3. Ou cliquez sur "Afficher filtres partenaires" (modèles partenaires uniquement)

### 2. **Sélectionner une Colonne**
1. Dans le menu déroulant "Colonne", choisissez le critère de filtrage
2. Les valeurs disponibles s'affichent automatiquement
3. Utilisez la recherche pour trouver rapidement une valeur

### 3. **Choisir les Valeurs**
1. Sélectionnez une ou plusieurs valeurs dans la liste
2. Utilisez "📋 Tous" pour tout sélectionner
3. Utilisez la recherche pour filtrer les valeurs affichées

### 4. **Appliquer le Filtre**
1. Cliquez sur "Appliquer le filtre"
2. Seuls les modèles correspondants s'affichent
3. Un indicateur montre le nombre de modèles filtrés

### 5. **Réinitialiser**
1. Cliquez sur "Réinitialiser" pour supprimer tous les filtres
2. Tous les modèles s'affichent à nouveau

## 🎨 Interface Utilisateur

### **Boutons de Contrôle**
```
🔍 Afficher/Masquer filtres modèles (vert - tous les modèles)
🔍 Afficher/Masquer filtres partenaires (orange - partenaires uniquement)
```

### **Section de Filtrage Général**
```
🔍 Filtrer tous les modèles (fond vert)
├── Colonne: [Menu déroulant]
├── Valeur à garder: [Sélection multiple avec recherche]
└── Actions: [Appliquer] [Réinitialiser]
```

### **Section de Filtrage Partenaires**
```
🔍 Filtrer les modèles partenaires (fond gris)
├── Colonne: [Menu déroulant]
├── Valeur à garder: [Sélection multiple avec recherche]
└── Actions: [Appliquer] [Réinitialiser]
```

### **Indicateurs de Filtre**
```
📊 Filtre appliqué: 5 modèle(s) sur 12 (général)
📊 Filtre appliqué: 3 modèle(s) sur 8 (partenaires)
```

## 🔧 Fonctionnalités Techniques

### **Recherche Intelligente**
- Recherche en temps réel dans les valeurs
- Sensible à la casse
- Support des caractères spéciaux

### **Sélection Multiple**
- Ctrl+clic pour sélection multiple
- Shift+clic pour sélection de plage
- Bouton "Tous" pour sélection complète

### **Performance**
- Filtrage côté client pour rapidité
- Mise à jour en temps réel
- Interface responsive

## 📊 Exemples d'Utilisation

### **Exemple 1 : Filtrer par Type (Général)**
1. Colonne : "Type de fichier"
2. Valeurs : ["bo", "partner"]
3. Résultat : Tous les modèles BO et partenaires

### **Exemple 2 : Filtrer par Nom (Partenaires)**
1. Colonne : "Nom du modèle"
2. Valeurs : ["Traitement CIMTNCM", "Traitement PMMTNCM"]
3. Résultat : Seuls les modèles partenaires avec ces noms

### **Exemple 3 : Filtrer par Auto-application (Général)**
1. Colonne : "Auto-appliqué"
2. Valeurs : ["Oui"]
3. Résultat : Tous les modèles auto-appliqués

### **Exemple 4 : Filtrer par Étapes (Partenaires)**
1. Colonne : "Nombre d'étapes"
2. Valeurs : ["3", "4", "5"]
3. Résultat : Modèles partenaires avec 3, 4 ou 5 étapes

## 🎯 Avantages

### **Pour l'Utilisateur**
- ✅ Navigation rapide parmi tous les modèles
- ✅ Filtrage spécifique des modèles partenaires
- ✅ Recherche intuitive et efficace
- ✅ Interface familière (même que le menu traitement)
- ✅ Feedback visuel immédiat

### **Pour l'Administration**
- ✅ Gestion simplifiée de tous les modèles
- ✅ Identification rapide des modèles similaires
- ✅ Maintenance facilitée
- ✅ Vue d'ensemble claire
- ✅ Distinction visuelle entre filtres généraux et partenaires

## 🔄 Intégration avec le Système

### **Cohérence avec le Menu Traitement**
- Même interface de filtrage
- Mêmes composants Material Design
- Même logique de sélection multiple
- Même système de recherche

### **Compatibilité**
- Fonctionne avec tous les types de modèles
- Compatible avec les modèles existants
- Pas d'impact sur les autres fonctionnalités
- Rétrocompatible

## 🚨 Dépannage

### **Problème : Aucun modèle ne s'affiche**
- Vérifiez qu'il existe des modèles dans la base de données
- Réinitialisez le filtre
- Vérifiez la connexion au backend

### **Problème : Filtre ne fonctionne pas**
- Vérifiez que la colonne est bien sélectionnée
- Vérifiez qu'au moins une valeur est sélectionnée
- Rechargez la page si nécessaire

### **Problème : Interface lente**
- Vérifiez la performance du navigateur
- Fermez les onglets inutiles
- Vérifiez la connexion réseau

## 📈 Évolutions Futures

### **Fonctionnalités Prévues**
- 🔮 Filtrage par date de création
- 🔮 Filtrage par utilisateur créateur
- 🔮 Sauvegarde des filtres préférés
- 🔮 Export des modèles filtrés
- 🔮 Filtres combinés (ET/OU)

### **Améliorations Techniques**
- 🔮 Cache des valeurs de filtre
- 🔮 Filtrage côté serveur pour gros volumes
- 🔮 Interface drag & drop pour les filtres
- 🔮 Filtres personnalisés

---

**Version :** 2.0  
**Date :** Août 2025  
**Auteur :** Équipe de développement  
**Compatibilité :** Angular 15+, Material Design 15+ 