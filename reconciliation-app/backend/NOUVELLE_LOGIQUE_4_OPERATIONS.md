# Nouvelle Logique de Génération des Opérations - 4 Lignes

## Contexte

Auparavant, lors de l'enregistrement d'un résumé par agence, le système générait 2 opérations :
1. **Opération nominale** : Compte = Agence, Service = Service
2. **Opération frais** : Compte = Agence, Type = FRAIS_TRANSACTION

## Nouvelle Logique

Maintenant, le système génère **4 opérations** pour chaque résumé d'agence :

### 1. Opération nominale agence (comportement existant)
- **Compte** : Agence (ex: SPTLN2664)
- **Service** : Service (ex: BF_CASHIN_OM_LONAB)
- **Type** : total_cashin ou total_paiement
- **Montant** : Volume total du résumé
- **Bordereau** : AGENCY_SUMMARY_{date}_{agence}

### 2. Opération frais agence (comportement existant)
- **Compte** : Agence (ex: SPTLN2664)
- **Type** : FRAIS_TRANSACTION
- **Montant** : Calculé selon les frais configurés pour service=BF_CASHIN_OM_LONAB, agence=SPTLN2664
- **Service** : Service (ex: BF_CASHIN_OM_LONAB)

### 3. Opération nominale service (nouvelle)
- **Compte** : Service (ex: BF_CASHIN_OM_LONAB)
- **Service** : Agence (ex: SPTLN2664)
- **Type** : total_cashin ou total_paiement
- **Montant** : Volume total du résumé
- **Bordereau** : SERVICE_SUMMARY_{date}_{service}

### 4. Opération frais service (nouvelle)
- **Compte** : Service (ex: BF_CASHIN_OM_LONAB)
- **Type** : FRAIS_TRANSACTION
- **Montant** : Calculé selon les **mêmes frais configurés** que l'opération agence (service=BF_CASHIN_OM_LONAB, agence=SPTLN2664)
- **Service** : Agence (ex: SPTLN2664)

## Exemple Concret

Pour le résumé :
```
SPTLN2664	BF_CASHIN_OM_LONAB	BF	20/09/2025 00:00:00	4,255,312	601
```

Le système génère maintenant 4 opérations :

1. **Opération nominale agence** :
   - Compte: SPTLN2664
   - Service: BF_CASHIN_OM_LONAB
   - Montant: 4,255,312

2. **Opération frais agence** :
   - Compte: SPTLN2664
   - Type: FRAIS_TRANSACTION
   - Service: BF_CASHIN_OM_LONAB
   - Frais: Calculés selon la config service=BF_CASHIN_OM_LONAB, agence=SPTLN2664

3. **Opération nominale service** :
   - Compte: BF_CASHIN_OM_LONAB
   - Service: SPTLN2664
   - Montant: 4,255,312

4. **Opération frais service** :
   - Compte: BF_CASHIN_OM_LONAB
   - Type: FRAIS_TRANSACTION
   - Service: SPTLN2664
   - Frais: **Mêmes frais** que l'opération agence (config service=BF_CASHIN_OM_LONAB, agence=SPTLN2664)

## Création des Comptes

Le système crée automatiquement les comptes s'ils n'existent pas :
- **Compte agence** : Numéro = Agence, Agence = Agence
- **Compte service** : Numéro = Service, Agence = Agence (même agence)

## Fichiers Modifiés

- `ReconciliationController.java` : Méthode `createOperationFromSummary`
- `AgencySummaryController.java` : Méthode `createOperationFromSummary`

## Logique des Frais

### Configuration des Frais
Les frais sont configurés selon la combinaison **service + agence** originale :
- Service : BF_CASHIN_OM_LONAB
- Agence : SPTLN2664

### Application des Frais
1. **Opérations agence** : Utilisent directement la configuration (service=BF_CASHIN_OM_LONAB, agence=SPTLN2664)
2. **Opérations service** : Utilisent la **même configuration** mais avec une logique inversée :
   - L'opération service a : Compte=BF_CASHIN_OM_LONAB, Service=SPTLN2664
   - Pour trouver les frais, le système inverse : service=BF_CASHIN_OM_LONAB, agence=SPTLN2664
   - Résultat : **Mêmes frais** que les opérations agence

### Détection Automatique
Le système détecte automatiquement le type d'opération grâce au nom du bordereau :
- `AGENCY_SUMMARY_*` → Configuration normale
- `SERVICE_SUMMARY_*` → Configuration inversée (même frais)

## Impact

Cette modification permet d'avoir une double comptabilisation :
- Côté agence : pour le suivi des volumes par agence
- Côté service : pour le suivi des volumes par service

Les frais sont calculés et appliqués sur les deux comptes en utilisant la **même configuration de frais**, garantissant la cohérence.
