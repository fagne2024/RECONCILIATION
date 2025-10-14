# Guide des Popups d'Opérations

## Description

Ce guide décrit les nouvelles fonctionnalités ajoutées à la page des opérations (`http://localhost:4200/operations`).

## Fonctionnalités Ajoutées

### Boutons d'Accès Rapide

Quatre nouveaux boutons ont été ajoutés dans la section en-tête de la page des opérations :

1. **Appro Client** 💵
2. **Compense Client** 🔄
3. **Nivellement** ⚖️
4. **Régularisation Solde** 🧮

### Fonctionnalités des Popups

Chaque popup offre les fonctionnalités suivantes :

#### Filtres Disponibles
- **Pays** : Sélection du pays via un menu déroulant
- **Code Propriétaire** : Sélection du code propriétaire via un menu déroulant
- **Service** : Recherche par service (saisie libre)
- **Date Début** : Date de début de la période
- **Date Fin** : Date de fin de la période

#### Affichage des Données
- **Résumé en en-tête** :
  - Nombre d'opérations trouvées
  - Montant total (en vert, mis en évidence)
- **Liste des opérations** filtrées dans un tableau avec les colonnes :
  - Date
  - Code Propriétaire
  - Service
  - Montant
  - Pays
  - Statut
- **Ligne de total** en bas du tableau (fond dégradé violet/bleu) :
  - Affichage du total des montants en or (#ffd700)

#### Export
- Bouton **Exporter** : Génère un fichier Excel (`.xlsx`) contenant toutes les opérations filtrées
- Le fichier exporté inclut toutes les colonnes disponibles :
  - ID
  - Type d'opération
  - Date
  - Code Propriétaire
  - Service
  - Montant
  - Solde Avant
  - Solde Après
  - Banque
  - Bordereau
  - Statut
  - Pays
  - Référence

## Comment Utiliser

### Accéder à un Popup

1. Naviguez vers la page des opérations (`http://localhost:4200/operations`)
2. Cliquez sur l'un des 4 boutons en haut de la page :
   - **Appro Client**
   - **Compense Client**
   - **Nivellement**
   - **Régularisation Solde**

### Filtrer les Données

1. Dans le popup ouvert, utilisez les champs de filtres :
   - Sélectionnez un **Pays** (optionnel)
   - Sélectionnez un **Code Propriétaire** (optionnel)
   - Saisissez un **Service** (optionnel)
   - Définissez une plage de dates (optionnel)
2. Les filtres s'appliquent automatiquement dès la modification
3. Le résumé s'affiche au-dessus du tableau avec :
   - Le nombre d'opérations trouvées
   - Le montant total des opérations filtrées

### Exporter les Données

1. Après avoir appliqué les filtres souhaités
2. Cliquez sur le bouton **Exporter** (icône Excel vert)
3. Un fichier Excel sera téléchargé automatiquement avec le format :
   - `Appro_Client_YYYY-MM-DD.xlsx`
   - `Compense_Client_YYYY-MM-DD.xlsx`
   - `Nivellement_YYYY-MM-DD.xlsx`
   - `Regularisation_Solde_YYYY-MM-DD.xlsx`

### Fermer un Popup

Pour fermer un popup, vous avez 3 options :
1. Cliquer sur le bouton **X** en haut à droite
2. Cliquer en dehors du popup (sur l'overlay sombre)
3. Appuyer sur la touche **Échap**

## Style et Design

Les popups ont été conçus avec :
- Un design moderne avec des dégradés de couleur (violet/bleu)
- Des animations fluides à l'ouverture/fermeture
- Une interface responsive adaptée aux mobiles et tablettes
- Des filtres intuitifs et faciles à utiliser
- Un tableau de données clair et lisible
- **Résumé visuel** avec fond dégradé bleu/rose
- **Ligne de total** en bas du tableau avec fond violet et montant en or
- Effets hover pour une meilleure expérience utilisateur

## Responsive Design

Les popups sont entièrement responsives :
- **Desktop** (> 1024px) : 3 colonnes de filtres
- **Tablette** (768px - 1024px) : 2 colonnes de filtres
- **Mobile** (< 768px) : 1 colonne de filtres

## Tests

### Tests Recommandés

1. **Test des Boutons**
   - ✓ Vérifier que les 4 boutons sont visibles dans l'en-tête
   - ✓ Vérifier que chaque bouton ouvre le popup correspondant

2. **Test des Filtres**
   - ✓ Vérifier que les filtres s'appliquent correctement
   - ✓ Vérifier que les combinaisons de filtres fonctionnent
   - ✓ Vérifier que le compteur d'opérations est correct

3. **Test de l'Export**
   - ✓ Vérifier que l'export génère un fichier Excel valide
   - ✓ Vérifier que les données exportées correspondent aux filtres appliqués
   - ✓ Vérifier que toutes les colonnes sont présentes dans l'export

4. **Test des Totaux**
   - ✓ Vérifier que le total du résumé correspond à la somme des montants affichés
   - ✓ Vérifier que la ligne de total en bas du tableau affiche le même montant
   - ✓ Vérifier que les totaux se mettent à jour lors de l'application des filtres

5. **Test de l'Interface**
   - ✓ Vérifier que le popup se ferme correctement
   - ✓ Vérifier que les animations sont fluides
   - ✓ Vérifier le responsive design sur différentes tailles d'écran

6. **Test des Données**
   - ✓ Vérifier que seules les opérations du type correct sont affichées
   - ✓ Vérifier que les filtres ne causent pas d'erreurs avec des données vides

## Maintenance

### Fichiers Modifiés

1. **operations.component.ts** : Logique TypeScript
   - Ajout des propriétés pour les popups
   - Méthodes de chargement et filtrage des données
   - Méthodes d'export Excel
   - Méthodes de calcul des totaux (getTotalApproClient, getTotalCompenseClient, etc.)

2. **operations.component.html** : Structure HTML
   - Ajout des 4 boutons dans `header-actions`
   - Ajout des 4 sections de popups à la fin du fichier

3. **operations.component.scss** : Styles CSS
   - Styles pour les boutons `btn-operation-type`
   - Styles pour les popups personnalisés avec animations
   - Styles pour le résumé avec dégradé bleu/rose
   - Styles pour la ligne de total avec dégradé violet et montant en or
   - Responsive design complet (desktop, tablette, mobile)

## Support

Pour toute question ou problème, veuillez consulter :
- Les fichiers sources dans `reconciliation-app/frontend/src/app/components/operations/`
- Les logs du navigateur (F12 > Console)
- Le service PopupService pour les messages d'erreur

## Fonctionnalités Complètes

✅ **4 boutons d'accès rapide** avec icônes et dégradés
✅ **Filtres dynamiques** (Pays, Code Propriétaire, Service, Dates)
✅ **Résumé visuel** avec nombre d'opérations et montant total
✅ **Tableau de données** responsive avec statuts colorés
✅ **Ligne de total** élégante en bas du tableau
✅ **Export Excel** complet avec toutes les colonnes
✅ **Animations fluides** à l'ouverture/fermeture
✅ **Design responsive** pour tous les écrans
✅ **Calculs automatiques** des totaux en temps réel

## Version

- **Date de création** : 10/10/2025
- **Dernière mise à jour** : 10/10/2025 - Ajout des totaux
- **Version** : 1.1.0
- **Auteur** : Assistant IA

