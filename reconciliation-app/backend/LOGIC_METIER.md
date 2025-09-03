# Logique Métier - Gestion des Opérations et Comptes

## Types d'Opérations

### Débits (diminuent le solde du compte)
- **compense** : Compensation de dette
- **FRAIS_TRANSACTION** : Frais de transaction
- **total_cashin** : Total des entrées d'argent (services)

### Crédits (augmentent le solde du compte)
- **approvisionnement** : Approvisionnement de compte
- **total_paiement** : Total des paiements (services)

### Ajustements (peuvent être positifs ou négatifs)
- **ajustement** : Ajustement manuel du solde

## Règles Métier

### 1. Gestion des Soldes
- Chaque opération met à jour automatiquement le solde du compte associé
- Les soldes avant et après sont calculés automatiquement
- La date de dernière mise à jour est mise à jour automatiquement

### 2. Validation des Opérations
- Les débits ne peuvent être effectués que si le solde est suffisant
- Les crédits et ajustements sont toujours autorisés
- Les opérations en attente peuvent être validées ou rejetées

### 3. Suppression d'Opérations
- Lors de la suppression d'une opération, aucune modification n'est apportée aux autres opérations du compte
- Le solde du compte et les soldes des autres opérations restent inchangés
- Seule la date de dernière mise à jour du compte est mise à jour

### 4. Contrôles de Sécurité
- Vérification du solde suffisant avant débit
- Transactions atomiques pour éviter les incohérences
- Gestion des erreurs avec rollback automatique

## API Endpoints

### Opérations
- `POST /api/operations` : Créer une opération
- `PUT /api/operations/{id}` : Modifier une opération
- `PUT /api/operations/{id}/validate` : Valider une opération
- `PUT /api/operations/{id}/reject` : Rejeter une opération
- `DELETE /api/operations/{id}` : Supprimer une opération
- `GET /api/operations/{id}/can-process` : Vérifier si une opération peut être traitée
- `GET /api/operations/{id}/solde-impact` : Calculer l'impact sur le solde

### Comptes
- `POST /api/comptes` : Créer un compte
- `PUT /api/comptes/{id}` : Modifier un compte
- `PUT /api/comptes/{id}/solde` : Mettre à jour le solde
- `DELETE /api/comptes/{id}` : Supprimer un compte

## Exemples d'Utilisation

### Créer une opération de débit
```json
{
  "typeOperation": "compense",
  "codeProprietaire": "PROP001",
  "montant": 100.00,
  "statut": "En attente",
  "pays": "France",
  "compteId": 1
}
```

### Créer une opération de crédit
```json
{
  "typeOperation": "approvisionnement",
  "codeProprietaire": "PROP002",
  "montant": 500.00,
  "statut": "En attente",
  "pays": "France",
  "compteId": 1
}
```

### Valider une opération
```
PUT /api/operations/1/validate
```

## Gestion des Erreurs

### Solde Insuffisant
- Erreur 400 Bad Request si le solde est insuffisant pour un débit
- Message d'erreur explicite dans la réponse

### Opération Introuvable
- Erreur 404 Not Found si l'opération n'existe pas
- Erreur 404 Not Found si le compte n'existe pas

### Erreurs de Validation
- Erreur 400 Bad Request pour les données invalides
- Validation des types d'opération autorisés

## Sécurité et Performance

### Transactions
- Toutes les opérations critiques sont dans des transactions
- Rollback automatique en cas d'erreur
- Cohérence des données garantie

### Performance
- Requêtes optimisées avec JPA
- Index sur les colonnes fréquemment utilisées
- Pagination pour les grandes listes

## Monitoring et Logs

### Logs d'Opérations
- Toutes les opérations sont loggées
- Traçabilité complète des modifications
- Audit trail pour la conformité

### Métriques
- Nombre d'opérations par type
- Solde moyen des comptes
- Taux de validation/rejet des opérations

## Calcul des Frais de Transaction

### Types de Frais

L'application supporte deux types de calcul pour les frais de transaction :

#### 1. Frais Fixe (NOMINAL)
- **Formule** : `Montant paramétré × Nombre de transactions`
- **Source du nombre de transactions** : AgencySummary (table `agency_summary`)
- **Logique** : Le nombre de transactions est récupéré depuis le résumé d'agence pour la date, l'agence et le service correspondants

#### 2. Frais en Pourcentage (POURCENTAGE)
- **Formule** : `Volume total de l'opération × Pourcentage`
- **Source du volume** : Montant de l'opération principale
- **Logique** : Le pourcentage est appliqué directement sur le volume de l'opération

### Déclenchement Automatique

Les frais de transaction sont automatiquement créés lors de la création d'opérations de type :
- `total_cashin`
- `total_paiement`

### Processus de Calcul

1. **Recherche du frais applicable** : Le système cherche un frais actif pour le service et l'agence de l'opération
2. **Détermination du type de calcul** : Selon le champ `typeCalcul` du frais
3. **Calcul du montant** :
   - Pour les frais fixes : Récupération du nombre de transactions depuis AgencySummary
   - Pour les frais en pourcentage : Application du pourcentage sur le volume
4. **Création de l'opération de frais** : Nouvelle opération de type `FRAIS_TRANSACTION`

### Exemples

#### Frais Fixe
- Montant paramétré : 100 FCFA
- Nombre de transactions (AgencySummary) : 50
- Frais calculé : 100 × 50 = 5 000 FCFA

#### Frais en Pourcentage
- Volume de l'opération : 10 000 FCFA
- Pourcentage : 2.5%
- Frais calculé : 10 000 × 2.5% = 250 FCFA

### Gestion des Erreurs

- Si aucun AgencySummary n'est trouvé pour les frais fixes, le nombre de transactions par défaut est 1
- Si aucun frais applicable n'est trouvé, aucune opération de frais n'est créée
- Les logs détaillés sont générés pour le debugging

### Endpoint de Test

Un endpoint de test est disponible pour valider les calculs :
```
GET /api/frais-transaction/test-calculation
```

Paramètres :
- `service` : Service concerné
- `agence` : Agence concernée
- `typeCalcul` : NOMINAL ou POURCENTAGE
- `montantFrais` : Montant du frais (pour NOMINAL)
- `pourcentage` : Pourcentage (pour POURCENTAGE)
- `volumeOperation` : Volume de l'opération
- `nombreTransactions` : Nombre de transactions (pour NOMINAL) 