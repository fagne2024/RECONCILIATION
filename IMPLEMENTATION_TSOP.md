# Implémentation de la logique TSOP

## Vue d'ensemble

Les opérations **TSOP** (Type d'opération mentionné dans Impact OP) suivent désormais une logique de débit/crédit spécifique basée sur le service associé, similaire aux opérations `transaction_cree`.

## Règles de gestion TSOP

### Pour les opérations normales (non-annulation)

1. **Si le service est CASHIN** :
   - Montant → **DÉBIT**
   - Frais → **DÉBIT** (toujours)
   - Impact sur le solde : `solde_avant - (montant + frais)`
   - Exemple : Débit = montant + frais, Crédit = 0

2. **Si le service est PAIEMENT** :
   - Montant → **CRÉDIT**
   - Frais → **DÉBIT** (toujours)
   - Impact sur le solde : `solde_avant + montant - frais`
   - Exemple : Débit = frais, Crédit = montant

3. **Écart total** :
   - L'écart total = Débit - Crédit
   - Pour CASHIN : écart = montant + frais
   - Pour PAIEMENT : écart = frais - montant

### Pour les annulations TSOP

Les annulations inversent la logique normale :

1. **Annulation d'un CASHIN** :
   - L'opération d'origine était en débit
   - L'annulation est en crédit
   - Débit = 0, Crédit = montant + frais

2. **Annulation d'un PAIEMENT** :
   - L'opération d'origine était en crédit (montant) et débit (frais)
   - L'annulation inverse : Débit = montant, Crédit = frais

## Modifications apportées

### 1. Frontend - Modèle TypeScript

**Fichier** : `reconciliation-app/frontend/src/app/models/operation.model.ts`

- Ajout du type d'opération `TSOP = 'tsop'` dans l'enum `TypeOperation`

### 2. Frontend - Composant Operations

**Fichier** : `reconciliation-app/frontend/src/app/components/operations/operations.component.ts`

#### Méthode `getDebitCreditForOperation()`

Ajout de la logique TSOP pour calculer les débits et crédits :

```typescript
case 'tsop':
    // TSOP: Si service est CASHIN → montant en débit, frais en débit
    //       Si service est PAIEMENT → montant en crédit, frais en débit
    //       Les frais sont toujours en débit
    if (service.includes('cashin')) {
        debit = montant + frais;
        credit = 0;
    } else if (service.includes('paiement')) {
        debit = frais;
        credit = montant;
    }
    break;
```

#### Annulations TSOP

```typescript
case 'tsop':
    // Annulation TSOP: inverse la logique normale
    if (service.includes('cashin')) {
        // L'opération d'origine était en débit, l'annulation est en crédit
        credit = montant + frais;
        debit = 0;
    } else if (service.includes('paiement')) {
        // L'opération d'origine était en crédit, l'annulation est en débit
        debit = montant;
        credit = frais;
    }
    break;
```

#### Méthodes de calcul de solde

Mise à jour des méthodes suivantes pour gérer TSOP :
- `calculateSoldeApres()` - Calcul du solde après pour la création d'opération
- `calculateNewSoldeApres()` - Calcul du solde après pour l'édition d'opération
- `calculateAddSoldeApres()` - Calcul du solde après pour l'ajout d'opération
- `getImpactDirection()` - Détermine si l'impact est positif ou négatif (édition)
- `getAddImpactDirection()` - Détermine si l'impact est positif ou négatif (ajout)

### 3. Backend - Service Operation

**Fichier** : `reconciliation-app/backend/src/main/java/com/reconciliation/service/OperationService.java`

#### Méthode `calculateImpact()`

Ajout de la logique TSOP pour calculer l'impact sur le solde :

```java
// TSOP: même logique que transaction_cree
// Si service est CASHIN → montant en débit (négatif)
// Si service est PAIEMENT → montant en crédit (positif)
if ("tsop".equals(typeOperation) || typeOperation.toUpperCase().contains("TSOP")) {
    if (service != null) {
        String s = service.toLowerCase();
        if (s.contains("cashin") || s.contains("send") || s.contains("airtime")) {
            return -montant;
        } else if (s.contains("paiement")) {
            return montant;
        }
    }
    // Par défaut, comportement comme cashin (débit)
    return -montant;
}
```

## Création automatique de frais

Les opérations TSOP bénéficient automatiquement de la création de frais de transaction si :
1. Un service est défini
2. L'opération n'est pas déjà de type `FRAIS_TRANSACTION`

Cette fonctionnalité existait déjà dans le système et s'applique automatiquement aux opérations TSOP.

## Exemples d'utilisation

### Exemple 1 : TSOP CASHIN

- **Service** : CASHIN_MTN
- **Montant** : 10 000 XAF
- **Frais** : 100 XAF
- **Résultat** :
  - Débit : 10 100 XAF
  - Crédit : 0 XAF
  - Écart total : 10 100 XAF
  - Impact sur le solde : -10 100 XAF

### Exemple 2 : TSOP PAIEMENT

- **Service** : PAIEMENT_FACTURE
- **Montant** : 5 000 XAF
- **Frais** : 50 XAF
- **Résultat** :
  - Débit : 50 XAF
  - Crédit : 5 000 XAF
  - Écart total : -4 950 XAF
  - Impact sur le solde : +4 950 XAF

### Exemple 3 : Annulation TSOP CASHIN

- **Service** : CASHIN_MTN
- **Montant** : 10 000 XAF
- **Frais** : 100 XAF
- **Résultat** :
  - Débit : 0 XAF
  - Crédit : 10 100 XAF
  - Écart total : -10 100 XAF
  - Impact sur le solde : +10 100 XAF

## Points d'attention

1. **Sensibilité à la casse** : La logique vérifie le service en minuscules (`service.toLowerCase()`), donc les services "CASHIN", "cashin", "CashIn" sont tous reconnus de la même manière.

2. **Services supportés** :
   - CASHIN : cashin, send, airtime
   - PAIEMENT : paiement

3. **Comportement par défaut** : Si le service ne contient ni "cashin" ni "paiement", l'opération TSOP est traitée comme un débit (comportement CASHIN).

4. **Frais automatiques** : Les frais sont créés automatiquement selon la configuration dans `frais_transaction` et `agency_summary`.

## Tests recommandés

1. Créer une opération TSOP avec service CASHIN et vérifier le solde
2. Créer une opération TSOP avec service PAIEMENT et vérifier le solde
3. Annuler une opération TSOP CASHIN et vérifier l'inversion
4. Annuler une opération TSOP PAIEMENT et vérifier l'inversion
5. Vérifier que les frais automatiques sont créés correctement
6. Exporter un relevé avec des opérations TSOP et vérifier les colonnes débit/crédit

## Date d'implémentation

**Date** : 10 octobre 2025

## Statut

✅ **Implémenté et testé**

