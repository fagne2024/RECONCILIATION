# Fonctionnalité de Sauvegarde ECART BO vers Ecart Solde

## Vue d'ensemble

Cette fonctionnalité permet de sauvegarder automatiquement les données des écarts BO (Back Office) directement dans la table "Ecart Solde" via un bouton "Save" intégré dans l'interface utilisateur.

## Fonctionnalités implémentées

### 1. Bouton "Save" dans la section ECART BO
- **Localisation** : Section "⚠️ ECART BO" dans les résultats de réconciliation
- **Fonction** : Convertit et sauvegarde toutes les données ECART BO dans la table Ecart Solde
- **Interface** : Bouton avec état de chargement et feedback utilisateur

### 2. Backend - Nouvel endpoint batch
- **Endpoint** : `POST /api/ecart-solde/batch`
- **Fonction** : Création en lot de plusieurs enregistrements EcartSolde
- **Service** : `EcartSoldeService.createMultipleEcartSoldes()`
- **Transaction** : Gestion des transactions pour garantir l'intégrité des données

### 3. Frontend - Service et logique de conversion
- **Service** : `EcartSoldeService.createMultipleEcartSoldes()`
- **Conversion** : Mapping intelligent des données ECART BO vers le format EcartSolde
- **Gestion d'erreurs** : Feedback utilisateur en cas de succès ou d'échec

## Mapping des données

Le système effectue un mapping intelligent des colonnes ECART BO vers EcartSolde :

| Source ECART BO | Cible EcartSolde | Logique de fallback |
|-----------------|------------------|-------------------|
| `id_transaction` | `idTransaction` | `idTransaction`, `ID_TRANSACTION`, `transaction_id`, `TransactionId` |
| `telephone_client` | `telephoneClient` | `telephoneClient`, `TELEPHONE_CLIENT`, `phone`, `Phone` |
| `montant` | `montant` | `Montant`, `MONTANT`, `amount`, `Amount`, `volume`, `Volume` |
| `service` | `service` | Extrait de `getBoOnlyAgencyAndService()` |
| `agence` | `agence` | Extrait de `getBoOnlyAgencyAndService()` |
| `date_transaction` | `dateTransaction` | Extrait de `getBoOnlyAgencyAndService()` |
| `numero_trans_gu` | `numeroTransGu` | `numeroTransGu`, `NUMERO_TRANS_GU`, `numero`, `Numero` |
| `pays` | `pays` | Extrait de `getBoOnlyAgencyAndService()` |

## Utilisation

1. **Accéder aux résultats de réconciliation**
2. **Onglet "⚠️ ECART BO"** : Cliquer sur l'onglet ECART BO
3. **Bouton "Save"** : Cliquer sur "💾 Sauvegarder dans Ecart Solde"
4. **Feedback** : Message de confirmation avec le nombre d'enregistrements sauvegardés

## États du bouton

- **Normal** : "💾 Sauvegarder dans Ecart Solde"
- **Chargement** : "💾 Sauvegarde..." (bouton désactivé)
- **Succès** : Message de confirmation
- **Erreur** : Message d'erreur avec possibilité de réessayer

## Gestion des erreurs

- **Validation** : Vérification de la présence de données ECART BO
- **Conversion** : Gestion des erreurs de parsing des données
- **Sauvegarde** : Gestion des erreurs de base de données
- **Feedback** : Messages d'erreur explicites pour l'utilisateur

## Fichiers modifiés

### Backend
- `EcartSoldeController.java` : Ajout de l'endpoint `/batch`
- `EcartSoldeService.java` : Ajout de `createMultipleEcartSoldes()`

### Frontend
- `reconciliation-results.component.ts` : Ajout du bouton et de la logique de sauvegarde
- `ecart-solde.service.ts` : Ajout de `createMultipleEcartSoldes()`
- `reconciliation-results.component.scss` : Styles pour le bouton Save

## Tests recommandés

1. **Test avec données ECART BO** : Vérifier la sauvegarde réussie
2. **Test sans données** : Vérifier le message d'erreur approprié
3. **Test de conversion** : Vérifier le mapping correct des colonnes
4. **Test de performance** : Vérifier la sauvegarde de gros volumes de données
5. **Test d'erreur réseau** : Vérifier la gestion des erreurs de connexion

## Avantages

- **Automatisation** : Évite la saisie manuelle des données
- **Intégrité** : Maintient la cohérence des données entre les tables
- **Traçabilité** : Ajoute un commentaire "Importé depuis ECART BO"
- **Performance** : Sauvegarde en lot pour de meilleures performances
- **UX** : Interface intuitive avec feedback utilisateur 