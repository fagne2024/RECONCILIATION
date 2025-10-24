# 🎯 Guide de Test - Option Nivellement pour Écart Partenaire

## 📋 Vue d'ensemble

Une nouvelle option **"NIVELLEMENT"** a été ajoutée au popup de création d'opération depuis l'écart partenaire. Cette option permet d'utiliser la logique de nivellement existante pour incrémenter automatiquement les références.

## 🔧 Modifications Apportées

### Frontend
- **Fichier modifié** : `reconciliation-results.component.ts`
- **Fichier modifié** : `impact-op.component.ts`
- **Modification** : Ajout de l'option "NIVELLEMENT" dans le popup de sélection du type de référence

### Backend
- **Logique existante** : La logique de nivellement est déjà implémentée dans `OperationService.java`
- **Génération de référence** : Format `NIVELLEMENTHT-DATE_JJMMAA-NV{NUMERO}`

## 🧪 Tests à Effectuer

### 1. Test de l'Option Nivellement dans l'Écart Partenaire

1. **Accéder à la page des résultats de réconciliation** : `http://localhost:4200/results`
2. **Aller à l'onglet "ECART Partenaire"**
3. **Cliquer sur "➕ Créer OP"** pour une ligne d'écart partenaire
4. **Vérifier le popup de sélection du type de référence** :
   - ✅ Options disponibles : STANDARD, CROSS_BORDER, **NIVELLEMENT**
   - ✅ L'option NIVELLEMENT est bien présente
5. **Sélectionner "NIVELLEMENT"**
6. **Compléter les autres champs** (banque, etc.)
7. **Valider la création**

### 2. Vérification de la Logique de Nivellement

1. **Créer une opération avec le type NIVELLEMENT**
2. **Vérifier que** :
   - ✅ Le type d'opération est automatiquement changé vers "nivellement"
   - ✅ La référence générée suit le format `NIVELLEMENTHT-DATE_JJMMAA-NV{NUMERO}`
   - ✅ Le numéro est incrémenté automatiquement pour chaque nouvelle opération de nivellement

### 3. Test de l'Option Nivellement dans Impact OP

1. **Accéder à la page Impact OP** : `http://localhost:4200/impact-op`
2. **Cliquer sur "Créer OP"** pour une ligne d'impact
3. **Vérifier le popup de sélection du type de référence** :
   - ✅ L'option NIVELLEMENT est bien présente
4. **Sélectionner "NIVELLEMENT"** et valider
5. **Vérifier que la logique de nivellement s'applique**

## 📊 Comportement Attendu

### Quand NIVELLEMENT est sélectionné :
1. **Type d'opération** : Automatiquement changé vers "nivellement"
2. **Référence générée** : Format `CODE_PROPRIETAIRE-DATE_JJMMAA-NV{NUMERO}`
3. **Incrémentation** : Le numéro est automatiquement incrémenté pour chaque nouvelle opération de nivellement du jour et du code propriétaire
4. **Logique métier** : Utilise la logique de nivellement existante du backend avec le code propriétaire

### Exemple de référence générée :
- `CELCM0001-131225NV1` (première opération de nivellement du 13/12/25 pour CELCM0001)
- `CELCM0001-131225NV2` (deuxième opération de nivellement du 13/12/25 pour CELCM0001)
- `CIELCM0001-131225NV1` (première opération de nivellement du 13/12/25 pour CIELCM0001)

## 🔍 Points de Vérification

- [ ] L'option NIVELLEMENT apparaît dans le popup de sélection
- [ ] La sélection de NIVELLEMENT change automatiquement le type d'opération
- [ ] La référence générée suit le format correct
- [ ] L'incrémentation fonctionne correctement
- [ ] Aucune erreur de linting
- [ ] La fonctionnalité fonctionne dans les deux composants (reconciliation-results et impact-op)

## 🚀 Avantages

- **Flexibilité** : Possibilité de choisir entre les logiques standard, cross-border et nivellement
- **Automatisation** : Génération automatique des références de nivellement
- **Cohérence** : Utilise la logique métier existante du backend
- **Traçabilité** : Références uniques et séquentielles pour les opérations de nivellement
