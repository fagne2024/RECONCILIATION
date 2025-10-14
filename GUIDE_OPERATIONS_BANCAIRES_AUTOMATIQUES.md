# Guide des Opérations Bancaires Automatiques

## Vue d'ensemble

Ce guide explique le fonctionnement de la création automatique d'opérations bancaires lorsqu'une opération de type **Compense_client**, **Appro_client** ou **nivellement** est créée dans le système.

## Fonctionnalité

### Déclenchement automatique

Lorsqu'une opération de l'un des types suivants est créée :
- **Compense_client** (Compensation Client)
- **Appro_client** (Approvisionnement)
- **nivellement** (Nivellement)

Le système crée automatiquement une ligne correspondante dans le module **BANQUE** sous la section "Opérations Bancaires".

### Informations automatiquement remplies

L'opération bancaire créée automatiquement contient les informations suivantes :

| Champ | Source | Description |
|-------|--------|-------------|
| **Pays** | Opération d'origine | Pays de l'opération |
| **Code Pays** | Calculé depuis le pays | CI, ML, BF, SN, TG, CM, etc. |
| **Mois** | Date de l'opération | Format: "Janvier 2024" |
| **Date Opération** | Opération d'origine | Date et heure de l'opération |
| **Agence** | Code propriétaire | Code de l'agence/compte |
| **Type Opération** | Type de l'opération | "Compensation Client", "Approvisionnement", "Nivellement" |
| **Montant** | Opération d'origine | Montant de l'opération |
| **Référence** | Opération d'origine | Référence auto-générée de l'opération |
| **BO** | Banque de l'opération | Informations bancaires si disponibles |
| **Statut** | Par défaut | "En attente" (à compléter manuellement) |
| **Operation ID** | ID de l'opération | Lien vers l'opération d'origine |

### Informations à compléter manuellement

Les champs suivants sont laissés vides et doivent être complétés manuellement par l'utilisateur :

- **Nom Bénéficiaire** : Nom de la personne ou entité bénéficiaire
- **Compte à Débiter** : Numéro du compte bancaire à débiter
- **Mode de Paiement** : Virement, Chèque, Espèces, etc.
- **ID GLPI** : Identifiant du ticket GLPI (voir section suivante pour l'intégration GLPI)

## Intégration GLPI

### Fonctionnalité de la colonne ID GLPI

La colonne **ID GLPI** dispose d'une intégration intelligente avec la plateforme GLPI d'Intouchgroup :

#### État initial (sans ID GLPI)
- **Affichage** : Bouton orange "🆕 Créer"
- **Action** : Cliquer sur le bouton ouvre [GLPI](https://glpi.intouchgroup.net/glpi/front/ticket.form.php) dans un nouvel onglet pour créer un nouveau ticket
- **Objectif** : Faciliter la création de tickets GLPI directement depuis le module Banque

#### État avec ID GLPI
- **Affichage** : Lien bleu cliquable affichant l'ID du ticket (ex: "🎫 12345")
- **Action** : Cliquer sur le lien ouvre directement le ticket GLPI correspondant dans un nouvel onglet
- **URL** : `https://glpi.intouchgroup.net/glpi/front/ticket.form.php?id={ID_GLPI}`

### Comment utiliser l'intégration GLPI

1. **Création d'un ticket** :
   - Cliquer sur le bouton "Créer" dans la colonne ID GLPI
   - Vous êtes redirigé vers GLPI pour créer un nouveau ticket
   - Après création du ticket dans GLPI, noter l'ID du ticket
   - Revenir dans le module Banque et modifier l'opération bancaire
   - Saisir l'ID GLPI récupéré

2. **Consultation d'un ticket existant** :
   - Si l'opération bancaire a déjà un ID GLPI
   - Cliquer sur le lien de l'ID pour ouvrir directement le ticket dans GLPI
   - Consulter ou modifier le ticket selon vos besoins

### Authentification GLPI

Pour vous connecter à GLPI, utilisez vos identifiants **sans** le domaine `@intouchgroup.net` :
- ✅ Correct : `samba.ba`
- ❌ Incorrect : `samba.ba@intouchgroup.net`

En cas de problème de connexion, contactez l'équipe IT : **infra@intouchgroup.net**

## Utilisation

### Création d'une opération

1. **Créer une opération** dans le module Opérations
   - Type : Compense_client, Appro_client ou nivellement
   - Remplir tous les champs requis
   - Valider la création

2. **Consulter l'opération bancaire**
   - Aller dans le module **BANQUE**
   - Cliquer sur "Opérations" pour afficher le tableau
   - L'opération bancaire apparaît avec le statut "En attente"

3. **Compléter les informations**
   - Cliquer sur "Modifier" pour l'opération bancaire
   - Remplir les champs manquants :
     - Nom Bénéficiaire
     - Compte à Débiter
     - Mode de Paiement
     - ID GLPI (si applicable)
   - Changer le statut selon l'avancement (Validée, En cours, Rejetée)

### Consultation des opérations bancaires

Dans le module **BANQUE**, vous pouvez :

1. **Filtrer les opérations** par :
   - Pays
   - Type d'opération
   - Statut
   - Plage de dates

2. **Voir les détails** d'une opération bancaire

3. **Modifier** une opération bancaire pour compléter les informations

4. **Supprimer** une opération bancaire si nécessaire

## Architecture technique

### Backend

#### Entité
- **OperationBancaireEntity** : Entité JPA représentant une opération bancaire
- Table : `operation_bancaire`

#### Repository
- **OperationBancaireRepository** : Repository Spring Data JPA
- Méthodes de recherche et filtrage

#### Service
- **OperationBancaireService** : Logique métier pour les opérations bancaires
- **OperationService.createOperationBancaireAutomatique()** : Création automatique

#### Controller
- **OperationBancaireController** : API REST pour les opérations bancaires
- Endpoint : `/api/operations-bancaires`

### Frontend

#### Modèle
- **OperationBancaire** : Interface TypeScript
- **OperationBancaireCreateRequest** : DTO pour la création
- **OperationBancaireUpdateRequest** : DTO pour la mise à jour

#### Service
- **OperationBancaireService** : Service Angular pour les appels API

#### Composant
- **BanqueComponent** : Composant Angular pour l'interface utilisateur
- Affichage, filtrage et gestion des opérations bancaires

## Base de données

### Table operation_bancaire

```sql
CREATE TABLE operation_bancaire (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    pays VARCHAR(100) NOT NULL,
    code_pays VARCHAR(10),
    mois VARCHAR(50),
    date_operation DATETIME NOT NULL,
    agence VARCHAR(100) NOT NULL,
    type_operation VARCHAR(100) NOT NULL,
    nom_beneficiaire VARCHAR(255),
    compte_a_debiter VARCHAR(100),
    montant DOUBLE NOT NULL,
    mode_paiement VARCHAR(100),
    reference VARCHAR(100),
    id_glpi VARCHAR(100),
    bo VARCHAR(100),
    statut VARCHAR(50) NOT NULL DEFAULT 'En attente',
    operation_id BIGINT,
    FOREIGN KEY (operation_id) REFERENCES operation(id) ON DELETE SET NULL
);
```

### Exécution du script

Pour créer la table dans la base de données :

```bash
# Se connecter à MySQL
mysql -u [username] -p [database_name]

# Exécuter le script
source reconciliation-app/backend/src/main/resources/sql/create_operation_bancaire_table.sql
```

## Flux de données

```
[Création Opération]
       ↓
[Compense_client / Appro_client / nivellement]
       ↓
[OperationService.createSingleOperation()]
       ↓
[Vérification du type d'opération]
       ↓
[createOperationBancaireAutomatique()]
       ↓
[OperationBancaireService.createOperationBancaire()]
       ↓
[Sauvegarde dans la base de données]
       ↓
[Opération bancaire créée avec statut "En attente"]
```

## Points importants

1. **Création automatique** : Aucune action manuelle requise côté utilisateur lors de la création de l'opération
2. **Statut initial** : Toutes les opérations bancaires créées automatiquement ont le statut "En attente"
3. **Liaison** : Chaque opération bancaire est liée à son opération d'origine via `operation_id`
4. **Gestion d'erreurs** : Si la création de l'opération bancaire échoue, l'opération d'origine est quand même créée (pas de blocage)
5. **Complétude** : Les informations bancaires complémentaires doivent être ajoutées manuellement

## Exemples

### Exemple 1 : Compensation Client

**Opération créée :**
- Type : Compense_client
- Montant : 1 000 000 FCFA
- Pays : Côte d'Ivoire
- Agence : CELCM0001
- Référence : CELCM0001-151024-CP1

**Opération bancaire automatique :**
- Type : "Compensation Client"
- Montant : 1 000 000 FCFA
- Pays : Côte d'Ivoire
- Code Pays : CI
- Agence : CELCM0001
- Référence : CELCM0001-151024-CP1
- Statut : En attente
- **À compléter** : Nom bénéficiaire, Compte à débiter, Mode de paiement

### Exemple 2 : Approvisionnement

**Opération créée :**
- Type : Appro_client
- Montant : 5 000 000 FCFA
- Pays : Mali
- Agence : ORCML0002
- Référence : ORCML0002-151024-AP1

**Opération bancaire automatique :**
- Type : "Approvisionnement"
- Montant : 5 000 000 FCFA
- Pays : Mali
- Code Pays : ML
- Agence : ORCML0002
- Référence : ORCML0002-151024-AP1
- Statut : En attente
- **À compléter** : Nom bénéficiaire, Compte à débiter, Mode de paiement

## Support et maintenance

Pour toute question ou problème concernant cette fonctionnalité :

1. Vérifier les logs du backend pour les messages d'erreur
2. Vérifier que la table `operation_bancaire` existe dans la base de données
3. Vérifier que les services sont correctement injectés (OperationBancaireService)
4. Consulter la console du navigateur pour les erreurs frontend

## Interface utilisateur

### Colonne ID GLPI - Comportement visuel

**Sans ID GLPI** :
```
┌─────────────────────┐
│  🆕 Créer           │  ← Bouton orange avec gradient
└─────────────────────┘
```
- Couleur : Gradient orange (#ff6b35 → #f7931e)
- Effet hover : Légère élévation et ombre accentuée
- Icône : Plus dans un cercle

**Avec ID GLPI** :
```
┌─────────────────────┐
│  🎫 12345           │  ← Lien bleu sur fond clair
└─────────────────────┘
```
- Couleur : Bleu (#1976d2) sur fond bleu clair (#e3f2fd)
- Effet hover : Déplacement vers la droite
- Icône : Ticket

## Évolutions futures possibles

- ✅ **Implémenté** : Intégration GLPI avec bouton de création et liens directs vers les tickets
- Formulaire de modification d'opération bancaire dans une popup
- Validation automatique des opérations bancaires sous certaines conditions
- Export des opérations bancaires au format Excel/PDF
- Notifications par email lors de la création d'une nouvelle opération bancaire
- Historique des modifications d'une opération bancaire
- Synchronisation automatique des IDs GLPI via API GLPI

