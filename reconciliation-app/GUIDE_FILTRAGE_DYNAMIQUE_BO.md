# 🔍 Guide du Filtrage Dynamique des Colonnes BO

## 📋 Vue d'ensemble

Le **filtrage dynamique des colonnes BO** permet de sélectionner un modèle BO et une colonne spécifique pour afficher et filtrer les valeurs disponibles. Cette fonctionnalité facilite la configuration des traitements en permettant de choisir précisément les valeurs à traiter.

## 🎯 Fonctionnalités Principales

### ✅ **Sélection de Modèle BO**
- Choisir parmi tous les modèles BO disponibles
- Affichage du nom et du pattern de fichier du modèle
- Réinitialisation automatique des sélections suivantes

### ✅ **Sélection de Colonne**
- Liste dynamique des colonnes du modèle BO sélectionné
- Affichage de toutes les colonnes disponibles
- Mise à jour automatique des valeurs disponibles

### ✅ **Filtrage des Valeurs**
- Affichage de toutes les valeurs uniques de la colonne
- Recherche en temps réel dans les valeurs
- Sélection multiple des valeurs à filtrer
- Compteur de sélection en temps réel

### ✅ **Actions de Filtrage**
- **Tout sélectionner** : Sélectionne toutes les valeurs disponibles
- **Appliquer le filtre** : Active le filtre avec les valeurs sélectionnées
- **Réinitialiser** : Efface toutes les sélections et recommence

## 🚀 Comment Utiliser le Filtrage Dynamique

### 1. **Accéder à la Fonctionnalité**
1. Allez dans "Modèles de Traitement Automatique"
2. Créez ou modifiez un modèle partenaire
3. Dans la section "Configuration des clés de réconciliation"
4. Trouvez la section "🔍 Filtrage dynamique des colonnes BO"

### 2. **Sélectionner un Modèle BO**
```
1. Cliquez sur "Modèle BO"
2. Choisissez un modèle dans la liste déroulante
3. Le modèle sélectionné apparaît avec son pattern de fichier
```

### 3. **Sélectionner une Colonne**
```
1. Cliquez sur "Colonne BO"
2. Choisissez une colonne dans la liste déroulante
3. Les valeurs disponibles s'affichent automatiquement
```

### 4. **Filtrer les Valeurs**
```
1. Utilisez la barre de recherche pour filtrer les valeurs
2. Sélectionnez une ou plusieurs valeurs dans la liste
3. Le compteur affiche le nombre de valeurs sélectionnées
```

### 5. **Appliquer le Filtre**
```
1. Cliquez sur "Tout sélectionner" pour sélectionner toutes les valeurs
2. Ou sélectionnez manuellement les valeurs souhaitées
3. Cliquez sur "Appliquer le filtre" pour activer le filtre
4. Le statut du filtre s'affiche avec les détails
```

## 📊 Exemples d'Utilisation

### **Exemple 1 : Filtrage par Type de Transaction**
```
Modèle BO: TRXBO.csv
Colonne: Type_Transaction
Valeurs sélectionnées: VENTE, ACHAT, REMBOURSEMENT
Résultat: Filtre appliqué sur les transactions de vente, achat et remboursement
```

### **Exemple 2 : Filtrage par Code d'Agence**
```
Modèle BO: AGENCIES.csv
Colonne: Code_Agence
Valeurs sélectionnées: AG001, AG002, AG003
Résultat: Filtre appliqué sur les agences spécifiques
```

### **Exemple 3 : Filtrage par Statut**
```
Modèle BO: STATUS.csv
Colonne: Statut
Valeurs sélectionnées: ACTIF, EN_ATTENTE
Résultat: Filtre appliqué sur les statuts actifs et en attente
```

## 🔧 Fonctionnalités Avancées

### **Recherche Intelligente**
- Recherche en temps réel dans les valeurs
- Filtrage automatique selon le texte saisi
- Mise à jour instantanée de la liste

### **Sélection Multiple**
- Sélection de plusieurs valeurs simultanément
- Indication visuelle des valeurs sélectionnées
- Compteur en temps réel des sélections

### **Gestion des États**
- Sauvegarde automatique des sélections
- Réinitialisation complète possible
- Statut visuel du filtre appliqué

### **Intégration avec les Traitements**
- Les valeurs filtrées peuvent être utilisées dans les traitements
- Configuration automatique des paramètres de traitement
- Cohérence avec les autres fonctionnalités

## 🎨 Interface Utilisateur

### **Section de Filtrage**
```
🔍 Filtrage dynamique des colonnes BO
Sélectionnez un modèle BO et une colonne pour filtrer les valeurs disponibles
```

### **Contrôles Disponibles**
- **Menu déroulant Modèle BO** : Sélection du modèle
- **Menu déroulant Colonne BO** : Sélection de la colonne
- **Barre de recherche** : Filtrage des valeurs
- **Liste multiple** : Sélection des valeurs
- **Boutons d'action** : Tout sélectionner, Appliquer, Réinitialiser

### **Indicateurs Visuels**
- Compteur de sélection : "X valeur(s) sélectionnée(s) sur Y disponible(s)"
- Statut du filtre : Message de confirmation avec détails
- Boutons désactivés : Quand aucune valeur n'est sélectionnée

## 📈 Valeurs Simulées Disponibles

### **Colonnes et Valeurs Prédéfinies**
```
Code_Agence: AG001, AG002, AG003, AG004, AG005
Type_Transaction: VENTE, ACHAT, REMBOURSEMENT, VIREMENT, PAIEMENT
Statut: ACTIF, INACTIF, EN_ATTENTE, BLOQUE
Devise: EUR, USD, GBP, JPY, CHF
Categorie: ALIMENTATION, TRANSPORT, LOISIRS, SANTE, EDUCATION
Region: NORD, SUD, EST, OUEST, CENTRE
Departement: FINANCE, RH, IT, MARKETING, VENTES
Niveau: DEBUTANT, INTERMEDIAIRE, AVANCE, EXPERT
Priorite: BASSE, MOYENNE, HAUTE, URGENTE
Statut_Paiement: EN_ATTENTE, PAYE, REFUSE, ANNULE
```

## 🎯 Avantages

### **Pour l'Utilisateur**
- ✅ **Interface intuitive** : Sélection simple et claire
- ✅ **Recherche rapide** : Trouver facilement les valeurs
- ✅ **Flexibilité** : Sélection multiple ou individuelle
- ✅ **Feedback visuel** : Confirmation des actions

### **Pour l'Administration**
- ✅ **Configuration précise** : Filtrage exact des données
- ✅ **Réutilisabilité** : Configurations sauvegardées
- ✅ **Traçabilité** : Historique des filtres appliqués
- ✅ **Performance** : Traitement optimisé des données filtrées

## 🔄 Intégration avec le Système

### **Cohérence avec les Modèles BO**
- Utilise les mêmes modèles BO que la réconciliation
- Accès aux mêmes colonnes et valeurs
- Intégration avec les traitements automatiques

### **Compatibilité**
- Fonctionne avec tous les types de modèles BO
- Compatible avec les configurations existantes
- Intégration avec le système de réconciliation

## 🚨 Dépannage

### **Problème : Aucune valeur ne s'affiche**
- Vérifiez que le modèle BO est bien sélectionné
- Vérifiez que la colonne est bien sélectionnée
- Rechargez la page si nécessaire

### **Problème : Recherche ne fonctionne pas**
- Vérifiez que vous tapez dans le bon champ
- Essayez de vider le champ de recherche
- Vérifiez que la colonne contient des données

### **Problème : Filtre ne s'applique pas**
- Vérifiez qu'au moins une valeur est sélectionnée
- Cliquez sur "Appliquer le filtre"
- Vérifiez le statut du filtre dans l'interface

## 📈 Évolutions Futures

### **Fonctionnalités Prévues**
- 🔮 Connexion à la base de données pour les vraies valeurs
- 🔮 Sauvegarde des filtres personnalisés
- 🔮 Export des configurations de filtrage
- 🔮 Filtres conditionnels complexes

### **Améliorations Techniques**
- 🔮 Cache des valeurs pour améliorer les performances
- 🔮 Synchronisation en temps réel avec les données
- 🔮 API pour récupérer les valeurs dynamiquement
- 🔮 Validation des valeurs selon le contexte

---

**Version :** 1.0  
**Date :** Août 2025  
**Auteur :** Équipe de développement  
**Compatibilité :** Angular 15+, Material Design 15+ 