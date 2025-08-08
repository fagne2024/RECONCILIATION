# Ajout des Nouveaux Types d'Opérations - Backend

## Vue d'ensemble

Ce document décrit les modifications apportées au backend pour supporter les nouveaux types d'opérations :
- **Appro_fournisseur** : Crédit fournisseur
- **Compense_fournisseur** : Débit fournisseur  
- **nivellement** : Ajustement de solde (impact variable)
- **régularisation_solde** : Régularisation de solde (impact variable)

## Types d'Opérations Ajoutés

### 1. Appro_fournisseur
- **Impact** : Crédit (augmente le solde)
- **Comportement** : Similaire à `Appro_client` mais pour les fournisseurs
- **Annulation** : Débit (diminue le solde)

### 2. Compense_fournisseur
- **Impact** : Débit (diminue le solde)
- **Comportement** : Similaire à `Compense_client` mais pour les fournisseurs
- **Annulation** : Crédit (augmente le solde)

### 3. nivellement
- **Impact** : Variable (positif ou négatif selon le montant)
- **Comportement** : Ajustement de solde flexible
- **Annulation** : Inverse du montant original

### 4. régularisation_solde
- **Impact** : Variable (positif ou négatif selon le montant)
- **Comportement** : Régularisation de solde flexible
- **Annulation** : Inverse du montant original

## Fichiers Modifiés

### 1. OperationService.java
**Méthodes mises à jour :**
- `isDebitOperation()` : Ajout de `Compense_fournisseur`
- `isCreditOperation()` : Ajout de `Appro_fournisseur`
- `isAjustementOperation()` : Ajout de `nivellement` et `régularisation_solde`
- `calculateImpact()` : Ajout de la logique d'annulation pour les nouveaux types

**Changements :**
```java
// Ajout dans isDebitOperation()
"Compense_fournisseur".equals(typeOperation) ||

// Ajout dans isCreditOperation()
"Appro_fournisseur".equals(typeOperation) ||

// Ajout dans isAjustementOperation()
"nivellement".equals(typeOperation) ||
"régularisation_solde".equals(typeOperation)
```

### 2. OperationBusinessService.java
**Méthodes mises à jour :**
- `isDebitOperation()` : Ajout de `Compense_fournisseur`
- `isCreditOperation()` : Ajout de `Appro_fournisseur`
- `isAjustementOperation()` : Ajout de `nivellement` et `régularisation_solde`

### 3. AgencySummaryController.java
**Liste mise à jour :**
- `excludedStatusTypes` : Ajout des nouveaux types pour l'exclusion des opérations annulées/rejetées

**Ajouts :**
```java
"Compense_fournisseur",
"Appro_fournisseur", 
"nivellement",
"régularisation_solde"
```

### 4. OperationRepository.java
**Requêtes mises à jour :**
- `getOperationTypeStatisticsWithDateRange()` : Ajout des nouveaux types dans les exclusions
- `getOperationFrequencyWithDateRange()` : Ajout des nouveaux types dans les exclusions

**Types d'annulation ajoutés :**
```sql
'annulation_Compense_fournisseur',
'annulation_Appro_fournisseur', 
'annulation_nivellement',
'annulation_régularisation_solde'
```

## Scripts de Base de Données

### 1. update-new-operation-types.sql
Script de vérification des nouveaux types dans la base de données.

**Fonctionnalités :**
- Vérification de l'existence des nouveaux types
- Affichage du statut de chaque type
- Pas de modification des données existantes

### 2. execute-new-operation-types.ps1
Script PowerShell pour exécuter le script SQL.

**Paramètres :**
- `DatabaseName` : Nom de la base de données (défaut: "top20")
- `ServerName` : Serveur MySQL (défaut: "localhost")
- `Username` : Utilisateur MySQL (défaut: "root")
- `Password` : Mot de passe MySQL (optionnel)

## Exécution des Scripts

### Méthode 1 : PowerShell
```powershell
# Avec paramètres par défaut
.\execute-new-operation-types.ps1

# Avec paramètres personnalisés
.\execute-new-operation-types.ps1 -DatabaseName "ma_base" -Username "mon_user" -Password "mon_mot_de_passe"
```

### Méthode 2 : MySQL Direct
```bash
mysql -h localhost -u root -D top20 < update-new-operation-types.sql
```

## Logique Métier

### Calcul d'Impact
Les nouveaux types suivent la logique métier établie :

1. **Types de Crédit** (`Appro_fournisseur`) :
   - Impact positif sur le solde
   - Annulation = impact négatif

2. **Types de Débit** (`Compense_fournisseur`) :
   - Impact négatif sur le solde
   - Annulation = impact positif

3. **Types Variables** (`nivellement`, `régularisation_solde`) :
   - Impact selon le signe du montant
   - Annulation = inverse du montant

### Gestion des Annulations
Les types d'annulation sont automatiquement générés :
- `annulation_Appro_fournisseur`
- `annulation_Compense_fournisseur`
- `annulation_nivellement`
- `annulation_régularisation_solde`

## Tests

Les tests existants dans `OperationServiceTest.java` couvrent déjà les types `Appro_client` et `Compense_client`. Les nouveaux types suivent la même logique et n'ont pas nécessité de tests supplémentaires.

## Validation

Pour valider l'implémentation :

1. **Vérifier les types dans l'interface** :
   - Les nouveaux types doivent apparaître dans les filtres
   - Les calculs de solde doivent être corrects

2. **Tester les opérations** :
   - Créer des opérations avec les nouveaux types
   - Vérifier l'impact sur le solde
   - Tester les annulations

3. **Vérifier les statistiques** :
   - Les nouveaux types doivent apparaître dans les rapports
   - Les exclusions doivent fonctionner correctement

## Notes Importantes

- Les nouveaux types sont **rétrocompatibles** avec l'existant
- Aucune modification de données existantes n'est effectuée
- La logique métier reste cohérente avec les types existants
- Les scripts sont **sûrs** et ne modifient que les nouvelles fonctionnalités

## Prochaines Étapes

1. Exécuter le script PowerShell pour vérifier la base de données
2. Redémarrer le backend pour appliquer les modifications
3. Tester les nouveaux types dans l'interface utilisateur
4. Valider les calculs et les statistiques
