# Système de Filtrage des Modèles de Traitement

## Vue d'ensemble

Le système de filtrage permet de filtrer les modèles de traitement automatique selon trois critères principaux :

1. **Filtre par Groupe** : Filtre selon la catégorie du modèle (Partenaire CASHIN, Partenaire PAIEMENT, Back Office)
2. **Filtre par Pays** : Filtre selon le code pays extrait du nom du modèle
3. **Filtre par Nom** : Recherche textuelle dans le nom du modèle

## Fonctionnalités

### Filtre par Groupe
- **Partenaire CASHIN** : Modèles pour les opérations de cash-in (dépôt d'argent)
- **Partenaire PAIEMENT** : Modèles pour les opérations de paiement et transfert
- **Back Office** : Modèles pour les opérations internes et de gestion

### Filtre par Pays
Le système extrait automatiquement le code pays du nom du modèle selon la règle suivante :
- Pour un modèle nommé "Modèle basé sur CIMTNCM", le pays sera "CM" (deux dernières lettres)
- Exemples :
  - "Modèle basé sur CIMTNCM" → Pays : "CM"
  - "Modèle basé sur PMOMGN" → Pays : "GN"
  - "Modèle basé sur CIOMCI" → Pays : "CI"

### Filtre par Nom
- Recherche dans la partie du nom qui suit "Modèle basé sur"
- Recherche insensible à la casse
- Recherche partielle (contient)

## Interface Utilisateur

### Section de Filtrage
La section de filtrage apparaît au-dessus de la liste des modèles et contient :

1. **Liste déroulante Groupe** : Sélection du groupe de modèles
2. **Liste déroulante Pays** : Sélection du pays
3. **Champ de texte Nom** : Saisie du nom à rechercher
4. **Bouton Réinitialiser** : Efface tous les filtres actifs

### Indicateurs Visuels
- **Badges de filtres actifs** : Affichent les filtres en cours
- **Compteur de résultats** : "X modèle(s) trouvé(s) sur Y"
- **Message "Aucun résultat"** : Quand aucun modèle ne correspond aux critères

## Utilisation

### Filtrage Simple
1. Sélectionner un groupe dans la liste déroulante
2. Les modèles sont automatiquement filtrés
3. Le compteur se met à jour

### Filtrage Multiple
1. Appliquer un premier filtre (ex: Groupe = "Partenaire CASHIN")
2. Ajouter un second filtre (ex: Pays = "CM")
3. Les résultats sont automatiquement mis à jour

### Réinitialisation
- Cliquer sur "Réinitialiser" pour effacer tous les filtres
- Ou sélectionner "Tous les groupes" / "Tous les pays" dans les listes déroulantes

## Comportement Technique

### Extraction du Pays
```typescript
// Exemple d'extraction
"Modèle basé sur CIMTNCM" → "CM"
"Modèle basé sur PMOMGN" → "GN"
"Modèle basé sur CIOMCI" → "CI"
```

### Recherche de Nom
```typescript
// Exemple de recherche
"Modèle basé sur CIMTNCM" → recherche dans "CIMTNCM"
"Modèle basé sur PMOMGN" → recherche dans "PMOMGN"
```

### Performance
- Filtrage en temps réel
- Pas de délai de frappe pour la recherche textuelle
- Mise à jour instantanée des résultats

## Responsive Design

Le système de filtrage s'adapte aux différentes tailles d'écran :

- **Desktop** : Filtres alignés horizontalement
- **Tablet** : Filtres en colonnes
- **Mobile** : Filtres empilés verticalement

## Accessibilité

- Labels appropriés pour tous les champs
- Navigation au clavier supportée
- Messages d'état clairs
- Contraste suffisant pour la lisibilité
