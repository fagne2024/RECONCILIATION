# Test des Règles de Traitement des Colonnes - Frontend

## Vue d'ensemble

Ce document décrit les tests à effectuer pour vérifier que l'interface utilisateur des règles de traitement des colonnes fonctionne correctement.

## Prérequis

1. **Backend Spring Boot** démarré avec les nouvelles fonctionnalités
2. **Frontend Angular** démarré
3. **Base de données** avec la table `column_processing_rules` créée

## Tests à Effectuer

### 1. Test de l'Interface Utilisateur

#### 1.1 Affichage des Colonnes
- [ ] Vérifier que plus de 4 colonnes sont affichées dans les listes déroulantes
- [ ] Vérifier que les colonnes sont normalisées (pas de caractères spéciaux)
- [ ] Vérifier que les colonnes sont triées alphabétiquement

#### 1.2 Section des Règles de Traitement
- [ ] Vérifier que le bouton "Afficher/Masquer" fonctionne
- [ ] Vérifier que la section s'affiche correctement quand on clique sur "Afficher"
- [ ] Vérifier que la section se masque correctement quand on clique sur "Masquer"

#### 1.3 Formulaire d'Ajout de Règle
- [ ] Vérifier que le formulaire s'affiche correctement
- [ ] Vérifier que les champs obligatoires sont marqués avec *
- [ ] Vérifier que la validation fonctionne (champs requis)
- [ ] Vérifier que les listes déroulantes contiennent les bonnes options

#### 1.4 Types de Format
- [ ] Vérifier que les 4 types de format sont disponibles :
  - [ ] Texte
  - [ ] Numérique
  - [ ] Date
  - [ ] Booléen

#### 1.5 Options de Transformation
- [ ] Vérifier que toutes les options sont disponibles :
  - [ ] Convertir en majuscules
  - [ ] Convertir en minuscules
  - [ ] Supprimer les espaces
  - [ ] Supprimer les caractères spéciaux
  - [ ] Ajouter des zéros en tête
  - [ ] Remplacement par regex

### 2. Test des Fonctionnalités CRUD

#### 2.1 Création de Règle
- [ ] Créer une règle simple (source → cible)
- [ ] Créer une règle avec transformations
- [ ] Vérifier que la règle apparaît dans la liste
- [ ] Vérifier que les badges de transformation s'affichent

#### 2.2 Modification de Règle
- [ ] Cliquer sur le bouton "Modifier" d'une règle
- [ ] Vérifier que le formulaire se remplit avec les bonnes valeurs
- [ ] Modifier les paramètres
- [ ] Sauvegarder et vérifier que les changements sont appliqués

#### 2.3 Suppression de Règle
- [ ] Cliquer sur le bouton "Supprimer" d'une règle
- [ ] Vérifier que la confirmation s'affiche
- [ ] Confirmer la suppression
- [ ] Vérifier que la règle disparaît de la liste

#### 2.4 Réorganisation des Règles
- [ ] Créer plusieurs règles
- [ ] Utiliser les boutons "Monter" et "Descendre"
- [ ] Vérifier que l'ordre change correctement
- [ ] Vérifier que les boutons sont désactivés aux extrémités

### 3. Test de Sauvegarde

#### 3.1 Sauvegarde avec Règles
- [ ] Créer un nouveau modèle
- [ ] Ajouter des règles de traitement
- [ ] Sauvegarder le modèle
- [ ] Vérifier que le message de succès mentionne le nombre de règles
- [ ] Recharger la page et vérifier que les règles sont toujours là

#### 3.2 Modification de Modèle avec Règles
- [ ] Modifier un modèle existant
- [ ] Ajouter/modifier/supprimer des règles
- [ ] Sauvegarder le modèle
- [ ] Vérifier que les changements sont persistés

### 4. Test d'Affichage

#### 4.1 Cartes de Modèles
- [ ] Vérifier que les cartes affichent le nombre de règles
- [ ] Vérifier que les 3 premières règles sont affichées
- [ ] Vérifier que le compteur "+X autres" s'affiche si plus de 3 règles

#### 4.2 Responsive Design
- [ ] Tester sur différentes tailles d'écran
- [ ] Vérifier que l'interface reste utilisable sur mobile
- [ ] Vérifier que les boutons et formulaires sont accessibles

### 5. Test d'Intégration

#### 5.1 Communication avec le Backend
- [ ] Vérifier que les appels API fonctionnent
- [ ] Vérifier que les erreurs sont gérées gracieusement
- [ ] Vérifier que les messages d'erreur sont affichés

#### 5.2 Validation
- [ ] Tester avec des données invalides
- [ ] Vérifier que les messages d'erreur sont clairs
- [ ] Vérifier que la validation côté client fonctionne

## Cas de Test Spécifiques

### Test 1: Règle de Normalisation de Nom
```
Source: "nom_client"
Cible: "nom_normalise"
Format: Texte
Options: Majuscules + Trim
```

### Test 2: Règle de Nettoyage de Téléphone
```
Source: "telephone"
Cible: "telephone_clean"
Format: Numérique
Options: Supprimer caractères spéciaux
```

### Test 3: Règle avec Regex
```
Source: "adresse"
Cible: "adresse_clean"
Format: Texte
Regex: "\\s+|-"
```

## Problèmes Courants

### Problème 1: Colonnes non affichées
- **Cause**: Problème dans `getAllAvailableColumns()`
- **Solution**: Vérifier que les fichiers sont chargés correctement

### Problème 2: Règles non sauvegardées
- **Cause**: Problème de communication avec le backend
- **Solution**: Vérifier les logs du navigateur et du backend

### Problème 3: Interface non responsive
- **Cause**: Problème CSS
- **Solution**: Vérifier les styles CSS

## Validation Finale

Après avoir effectué tous les tests :

- [ ] Toutes les fonctionnalités CRUD fonctionnent
- [ ] L'interface est intuitive et responsive
- [ ] Les données sont persistées correctement
- [ ] Les erreurs sont gérées gracieusement
- [ ] Les performances sont acceptables

## Notes

- Les tests doivent être effectués sur différents navigateurs
- Les tests de performance doivent être effectués avec de gros volumes de données
- Les tests d'accessibilité doivent être effectués si nécessaire
