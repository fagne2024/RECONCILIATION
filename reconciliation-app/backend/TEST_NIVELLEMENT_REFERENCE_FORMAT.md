# 🧪 Test du Nouveau Format de Référence Nivellement

## 📋 Vue d'ensemble

Le format de référence pour les opérations de nivellement a été modifié pour utiliser le code propriétaire au lieu de "NIVELLEMENTHT".

## 🔧 Modifications Apportées

### Backend - OperationService.java
- **Méthode modifiée** : `generateNivellementReference()`
- **Nouveau paramètre** : `String codeProprietaire`
- **Nouveau format** : `CODE_PROPRIETAIRE-DATE_JJMMAA-NV{NUMERO}`

### Backend - OperationRepository.java
- **Nouvelles méthodes ajoutées** :
  - `countNivellementOperationsByCodeProprietaireAndDate()`
  - `countNivellementOperationsByCodeProprietaireAndDateExcludingId()`

## 🧪 Tests à Effectuer

### 1. Test de Création d'Opération Nivellement

1. **Créer une opération de tipo "nivellement"**
2. **Vérifier que la référence générée suit le format** : `CODE_PROPRIETAIRE-DATE_JJMMAA-NV{NUMERO}`
3. **Exemple attendu** : `CELCM0001-161025NV1`

### 2. Test d'Incrémentation par Code Propriétaire

1. **Créer plusieurs opérations de nivellement pour le même code propriétaire**
2. **Vérifier que les numéros s'incrémentent correctement** :
   - `CELCM0001-161025NV1`
   - `CELCM0001-161025NV2`
   - `CELCM0001-161025NV3`

### 3. Test d'Isolation par Code Propriétaire

1. **Créer des opérations de nivellement pour différents codes propriétaires**
2. **Vérifier que les numéros sont indépendants** :
   - `CELCM0001-161025NV1`
   - `CIELCM0001-161025NV1`
   - `CELCM0001-161025NV2`

### 4. Test via l'Interface Frontend

1. **Accéder à la page des résultats de réconciliation**
2. **Aller à l'onglet "ECART Partenaire"**
3. **Cliquer sur "➕ Créer OP"**
4. **Sélectionner "NIVELLEMENT" comme type de référence**
5. **Vérifier que la référence générée utilise le code propriétaire**

## 📊 Comportement Attendu

### Format de Référence
- **Ancien format** : `NIVELLEMENTHT-161025-NV1`
- **Nouveau format** : `CELCM0001-161025NV1`

### Incrémentation
- **Par code propriétaire** : Chaque code propriétaire a sa propre séquence
- **Par date** : Chaque jour a sa propre séquence
- **Combinaison** : Code propriétaire + date = séquence unique

### Exemples de Références
```
CELCM0001-161025NV1  (première opération nivellement pour CELCM0001 le 16/10/25)
CELCM0001-161025NV2  (deuxième opération nivellement pour CELCM0001 le 16/10/25)
CIELCM0001-161025NV1 (première opération nivellement pour CIELCM0001 le 16/10/25)
CELCM0001-161126NV1  (première opération nivellement pour CELCM0001 le 16/11/26)
```

## 🔍 Points de Vérification

- [ ] Le nouveau format utilise le code propriétaire
- [ ] L'incrémentation fonctionne par code propriétaire
- [ ] L'incrémentation fonctionne par date
- [ ] Les séquences sont indépendantes entre codes propriétaires
- [ ] Aucune erreur de compilation
- [ ] Les tests passent correctement

## 🚀 Avantages du Nouveau Format

- **Traçabilité** : Identification claire du code propriétaire dans la référence
- **Isolation** : Séquences indépendantes par code propriétaire
- **Cohérence** : Format similaire aux autres types d'opérations
- **Flexibilité** : Possibilité d'avoir des séquences parallèles
