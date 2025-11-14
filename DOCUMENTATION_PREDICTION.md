# 📊 Documentation - Système de Prédiction des Opérations Bancaires

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Fonctionnalités](#fonctionnalités)
3. [Architecture Technique](#architecture-technique)
4. [Algorithmes de Prédiction](#algorithmes-de-prédiction)
5. [Guide d'utilisation](#guide-dutilisation)
6. [API Backend](#api-backend)
7. [Interface Utilisateur](#interface-utilisateur)
8. [Exemples d'utilisation](#exemples-dutilisation)
9. [Interprétation des Résultats](#interprétation-des-résultats)
10. [FAQ](#faq)

---

## 🎯 Vue d'ensemble

Le système de prédiction des opérations bancaires permet d'estimer les **approvisionnements**, **compensations** et **niveillements** futurs basés sur l'analyse des données historiques. Cette fonctionnalité aide à :

- **Anticiper les besoins** en liquidités
- **Planifier les opérations** bancaires
- **Optimiser la gestion** des comptes
- **Détecter les tendances** et patterns récurrents

### Types d'opérations prédites

Le système peut prédire les opérations suivantes :

| Type d'Opération | Description |
|-----------------|-------------|
| `Appro_client` | Approvisionnement des comptes clients |
| `Appro_fournisseur` | Approvisionnement des comptes fournisseurs |
| `Compense_client` | Compensation entre comptes clients |
| `Compense_fournisseur` | Compensation entre comptes fournisseurs |
| `nivellement` | Nivellement de solde entre comptes |

---

## ✨ Fonctionnalités

### 1. Prédictions Multiples Méthodes

Le système propose **trois méthodes de prédiction** :

#### 📈 Moyenne Simple
- **Principe** : Calcule la moyenne des montants et fréquences historiques
- **Avantages** : Simple, rapide, stable
- **Utilisation** : Données régulières avec peu de variations
- **Formule** : `Prédiction = Montant Moyen × Fréquence Moyenne`

#### 📊 Tendance Linéaire
- **Principe** : Utilise une régression linéaire pour extrapoler la tendance
- **Avantages** : Prend en compte l'évolution temporelle
- **Utilisation** : Données avec une tendance claire (croissante ou décroissante)
- **Algorithme** : Régression linéaire avec calcul de pente et intercept

#### 🔄 Saisonnier (Jour de la Semaine)
- **Principe** : Analyse les patterns par jour de la semaine
- **Avantages** : Détecte les variations hebdomadaires
- **Utilisation** : Activités avec patterns récurrents (ex: plus d'opérations le lundi)
- **Méthode** : Moyenne par jour de la semaine (LUNDI, MARDI, etc.)

### 2. Analyse Statistique Avancée

Le système calcule automatiquement :

- **Montants** : Total, moyen, minimum, maximum, écart-type
- **Fréquences** : Nombre moyen d'opérations par jour
- **Tendances** : Évolution temporelle (pente de régression)
- **Patterns Saisonniers** : Distribution par jour de la semaine
- **Score de Confiance** : Fiabilité de la prédiction (0-100%)

### 3. Filtres et Personnalisation

- **Filtrage par Agence** : Prédictions spécifiques à une agence
- **Filtrage par Service** : Prédictions par service métier
- **Filtrage par Pays** : Prédictions géographiques
- **Période d'analyse** : Ajustable (7-730 jours)
- **Horizon de prédiction** : Configurable (1-365 jours)

---

## 🏗️ Architecture Technique

### Backend (Java/Spring Boot)

```
┌─────────────────────────────────────────┐
│         PredictionController             │
│  (REST API - /api/predictions)          │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│         PredictionService               │
│  (Logique métier de prédiction)         │
└─────────────────┬───────────────────────┘
                  │
        ┌─────────┴─────────┐
        ▼                    ▼
┌───────────────┐  ┌─────────────────────┐
│ Operation     │  │ Calcul Statistiques │
│ Repository    │  │ & Tendances         │
└───────────────┘  └─────────────────────┘
```

#### Composants Backend

1. **PredictionController** (`/api/predictions`)
   - Endpoint POST : Génération de prédiction
   - Endpoint POST `/batch` : Prédictions multiples
   - Endpoint GET `/types` : Liste des types d'opérations

2. **PredictionService**
   - Récupération des données historiques
   - Calcul des statistiques
   - Génération des prédictions
   - Calcul du score de confiance

3. **DTOs (Data Transfer Objects)**
   - `PredictionRequest` : Paramètres de la requête
   - `PredictionResponse` : Résultats de la prédiction
   - `PredictionJour` : Prédiction par jour

### Frontend (Angular)

```
┌─────────────────────────────────────────┐
│      PredictionsComponent               │
│  (Interface utilisateur)                │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│      PredictionService                  │
│  (Service Angular - appels API)         │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│      Chart.js                           │
│  (Visualisation graphique)              │
└─────────────────────────────────────────┘
```

---

## 🔬 Algorithmes de Prédiction

Le système de prédiction utilise **deux approches principales** selon la disponibilité des données historiques :

1. **Prédiction basée sur les seuils de déclenchement** (prioritaire si disponible)
2. **Prédiction basée sur les méthodes classiques** (moyenne, tendance, saisonnier)

---

### 🎯 Approche 1 : Prédiction Basée sur les Seuils de Déclenchement

Cette approche **analyse l'évolution du solde d'une agence** et prédit les opérations en fonction des seuils historiques observés.

#### Phase 1 : Analyse des Seuils Historiques

Le système analyse toutes les opérations historiques pour identifier les **niveaux de solde qui déclenchent** les opérations :

```
Pour chaque opération historique :
  - Extraire le solde AVANT l'opération (solde_avant)
  - Grouper par type d'opération
  - Calculer les statistiques :
    * Seuil moyen de déclenchement
    * Seuil minimum
    * Seuil maximum
    * Écart-type (mesure de régularité)
```

**Exemple d'analyse** :
- Type d'opération : `Compense_client`
- 50 opérations historiques analysées
- Seuil moyen : 500,000 XOF (solde avant chaque compense)
- Seuil min : 300,000 XOF
- Seuil max : 700,000 XOF
- Écart-type : 50,000 XOF

#### Phase 2 : Analyse de l'Évolution du Solde

Le système calcule l'évolution moyenne du solde entre les opérations :

```
Pour chaque paire d'opérations consécutives :
  - Variation = solde_avant(opération2) - solde_apres(opération1)
  - Durée = nombre de jours entre les deux opérations
  - Variation par jour = Variation / Durée
```

**Exemple** :
- Opération 1 (solde après) : 450,000 XOF
- Opération 2 (solde avant) : 400,000 XOF
- Durée : 5 jours
- Variation : -50,000 XOF
- Variation/jour : -10,000 XOF/jour (le solde diminue de 10,000 XOF par jour)

#### Phase 3 : Simulation Jour après Jour

Le système simule l'évolution du solde jour après jour et déclenche une opération quand le seuil est atteint :

```java
soldeInitial = solde après la dernière opération historique

Pour chaque jour de la période de prédiction :
  1. Solde avant le jour = solde courant
  2. Vérifier si le seuil est atteint :
     
     Pour COMPENSATIONS :
       - Seuil atteint si : solde >= seuil_moyen (solde trop élevé)
       - Action : Prédire une compense (diminue le solde)
     
     Pour APPROVISIONNEMENTS :
       - Seuil atteint si : solde <= seuil_moyen (solde trop bas)
       - Action : Prédire un appro (augmente le solde)
  
  3. Si seuil atteint OU fréquence minimale atteinte :
       - Prédire une opération
       - Montant = montant_moyen × fréquence_moyenne
       - Solde après = solde avant + impact_opération
       - Confiance = 0.7 (élevée car basée sur seuils)
  
  4. Sinon :
       - Pas d'opération ce jour
       - Solde évolue naturellement : solde += variation_par_jour
       - Confiance = 0.3 (basse car pas d'opération)
```

**Exemple concret** :

```
Configuration :
- Type : Compense_client
- Seuil moyen : 500,000 XOF (une compense est effectuée quand le solde dépasse 500,000)
- Solde initial : 520,000 XOF
- Variation/jour : -5,000 XOF (débit quotidien moyen)
- Montant moyen compense : 100,000 XOF

Jour 1 : Solde = 520,000
  - Seuil atteint ? OUI (520,000 >= 500,000)
  - ✅ PRÉDICTION : Compense de 100,000 XOF
  - Solde après = 520,000 - 100,000 = 420,000

Jour 2 : Solde = 420,000
  - Seuil atteint ? NON (420,000 < 500,000)
  - Pas d'opération
  - Solde = 420,000 - 5,000 = 415,000

Jour 3-15 : Solde continue de diminuer progressivement
  - Pas d'opération (solde reste en dessous du seuil)
  - Solde évolue : -5,000 XOF/jour

Jour 16 : Solde = 340,000
  - Seuil atteint ? NON
  - Pas d'opération
  - Solde = 340,000 - 5,000 = 335,000

Jour 17 : Solde = 335,000
  - Seuil atteint ? NON
  - Pas d'opération
  - Solde = 335,000 - 5,000 = 330,000

[... jours suivants sans opération jusqu'à ce que le solde remonte au seuil ...]

Jour 45 : Solde = 505,000 (après des crédits journaliers)
  - Seuil atteint ? OUI (505,000 >= 500,000)
  - ✅ PRÉDICTION : Compense de 100,000 XOF
  - Solde après = 505,000 - 100,000 = 405,000
```

**Exemple pour Approvisionnement** :

```
Configuration :
- Type : Appro_client
- Seuil moyen : 100,000 XOF (un appro est effectué quand le solde tombe en dessous de 100,000)
- Solde initial : 150,000 XOF
- Variation/jour : -8,000 XOF (débit quotidien moyen)
- Montant moyen appro : 200,000 XOF

Jour 1-5 : Solde diminue progressivement
  - Pas d'opération (solde > 100,000)
  - Solde évolue : -8,000 XOF/jour

Jour 6 : Solde = 110,000
  - Seuil atteint ? NON (110,000 > 100,000)
  - Pas d'opération
  - Solde = 110,000 - 8,000 = 102,000

Jour 7 : Solde = 102,000
  - Seuil atteint ? NON
  - Pas d'opération
  - Solde = 102,000 - 8,000 = 94,000

Jour 8 : Solde = 94,000
  - Seuil atteint ? OUI (94,000 <= 100,000)
  - ✅ PRÉDICTION : Appro de 200,000 XOF
  - Solde après = 94,000 + 200,000 = 294,000
```

**Note** : Si une fréquence minimale est définie (ex: 1 opération toutes les 15 jours), le système déclenchera quand même une opération même si le seuil n'est pas atteint, pour maintenir la régularité observée.

#### Calcul de l'Impact sur le Solde

Chaque type d'opération a un impact différent sur le solde :

```java
Pour APPROVISIONNEMENTS (crédit) :
  impact = +montant (augmente le solde)

Pour COMPENSATIONS (débit) :
  impact = -montant (diminue le solde)

Pour NIVELLEMENT :
  impact = montant (peut être positif ou négatif)
```

**Exemple** :
- Solde avant : 490,000 XOF
- Opération : Compense de 100,000 XOF
- Impact : -100,000 XOF
- Solde après : 490,000 - 100,000 = 390,000 XOF

---

### 📊 Approche 2 : Prédiction Basée sur les Méthodes Classiques

Cette approche est utilisée **si les seuils ne sont pas disponibles** (pas de données `solde_avant`/`solde_apres` dans l'historique).

#### 1. Méthode Moyenne Simple

```java
Prédiction(jour) = Montant Moyen Historique × Fréquence Moyenne Historique

Solde avant = solde après jour précédent
Solde après = solde avant + (impact × nombre_operations)
```

**Exemple** :
- Montant moyen : 50,000 XOF
- Fréquence moyenne : 2 opérations/jour
- Prédiction : 50,000 × 2 = 100,000 XOF/jour
- Impact compense : -100,000 XOF
- Solde après = solde avant - 100,000

#### 2. Méthode Tendance Linéaire

#### Calcul de la Régression Linéaire

```
y = ax + b

où:
- y = montant prédit
- x = nombre de jours depuis la dernière opération
- a = pente (tendance)
- b = intercept (valeur de base)
```

**Calcul de la pente** :
```java
pente = (n × Σ(xy) - Σ(x) × Σ(y)) / (n × Σ(x²) - (Σ(x))²)
```

**Exemple** :
- Dernière opération : Il y a 5 jours
- Pente : +2,000 XOF/jour
- Intercept : 30,000 XOF
- Prédiction : 2,000 × 5 + 30,000 = 40,000 XOF
- Solde après = solde avant + impact

#### 3. Méthode Saisonnier

```java
Prédiction(jour) = Montant Moyen du Jour de la Semaine × Fréquence du Jour

Solde après = solde avant + impact
```

**Exemple** :
- Jour : LUNDI
- Montant moyen lundi : 60,000 XOF
- Fréquence lundi : 3 opérations
- Prédiction : 60,000 × 3 = 180,000 XOF
- Solde après = solde avant + impact

---

### 🔄 Décision Automatique de l'Approche

Le système choisit automatiquement l'approche à utiliser :

```java
Si (seuil_declenchement_moyen existe ET variation_solde_par_jour existe) :
    → Utiliser PRÉDICTION BASÉE SUR LES SEUILS
Sinon :
    → Utiliser MÉTHODE CLASSIQUE (selon paramètre utilisateur)
```

**Avantages de l'approche basée sur les seuils** :
- ✅ Plus précise car basée sur les conditions réelles de déclenchement
- ✅ Prend en compte l'évolution du solde d'une agence
- ✅ Simule le comportement réel du système
- ✅ Confiance plus élevée (0.7 vs 0.3-0.5)

---

### 📈 Calcul du Score de Confiance

Le score de confiance varie selon l'approche utilisée :

#### Pour l'Approche Basée sur les Seuils

**Confiance par jour** :
- **Jour avec opération prédite** : 0.7 (70%) - Élevée car basée sur les seuils historiques réels
- **Jour sans opération** : 0.3 (30%) - Basse car pas d'opération prévue

**Confiance globale** : Calculée à partir de 3 facteurs :

1. **Quantité de données** (40% max)
   ```
   Confiance += min(0.4, nombreOpérations / 500 × 0.4)
   ```

2. **Période d'analyse** (30% max)
   ```
   Confiance += min(0.3, nombreJours / 90 × 0.3)
   ```

3. **Régularité des seuils** (30% max)
   ```
   CoefficientVariation = ÉcartTypeSeuil / SeuilMoyen
   Confiance += min(0.3, (1 - CV) × 0.3)
   ```

**Score final** : `min(1.0, somme des 3 facteurs)`

#### Pour l'Approche Classique (Moyenne, Tendance, Saisonnier)

**Confiance par jour** : Variable selon la méthode
- **Moyenne Simple** : 0.5 (50%)
- **Tendance Linéaire** : 0.5 à 0.9 selon la quantité de données
- **Saisonnier** : 0.7 si données spécifiques au jour, sinon 0.5

**Confiance globale** : Calculée à partir de 3 facteurs :

1. **Quantité de données** (40% max)
   ```
   Confiance += min(0.4, nombreOpérations / 500 × 0.4)
   ```

2. **Période d'analyse** (30% max)
   ```
   Confiance += min(0.3, nombreJours / 90 × 0.3)
   ```

3. **Régularité** (30% max)
   ```
   CoefficientVariation = ÉcartType / MontantMoyen
   Confiance += min(0.3, (1 - CV) × 0.3)
   ```

**Score final** : `min(1.0, somme des 3 facteurs)`

#### Comparaison des Approches

| Approche | Confiance Jour avec Opération | Confiance Jour sans Opération | Confiance Globale |
|----------|-------------------------------|-------------------------------|-------------------|
| **Basée sur Seuils** | 70% | 30% | 60-80% (selon données) |
| **Moyenne Simple** | 50% | 50% | 40-60% |
| **Tendance** | 50-90% | 50-90% | 50-70% |
| **Saisonnier** | 70% (si données jour) / 50% (sinon) | 70% / 50% | 55-75% |

---

## 📖 Guide d'utilisation

### Accès à la Fonctionnalité

1. Connectez-vous à l'application
2. Dans le menu latéral, cliquez sur **"Prédictions"** (icône 🔮)
3. Ou accédez directement à : `/predictions`

### Créer une Prédiction

#### Étape 1 : Sélectionner le Type d'Opération

Choisissez parmi :
- Approvisionnement Client
- Approvisionnement Fournisseur
- Compensation Client
- Compensation Fournisseur
- Nivellement

#### Étape 2 : Configurer les Paramètres

**Horizon de Prédiction** (obligatoire)
- **Valeur** : 1 à 365 jours
- **Défaut** : 30 jours
- **Description** : Nombre de jours à prédire dans le futur

**Période d'Analyse** (obligatoire)
- **Valeur** : 7 à 730 jours
- **Défaut** : 90 jours
- **Description** : Nombre de jours d'historique à analyser

**Méthode de Prédiction** (obligatoire)
- **Options** :
  - Moyenne Simple
  - Tendance Linéaire (recommandé)
  - Saisonnier

**Filtres Optionnels**

- **Agence** : Code propriétaire (ex: "AG001")
- **Service** : Nom du service (ex: "CIOMCI")
- **Pays** : Code pays (ex: "CI", "SN", "CM")

#### Étape 3 : Générer la Prédiction

1. Cliquez sur **"🔮 Générer la Prédiction"**
2. Attendez le traitement (quelques secondes)
3. Consultez les résultats

### Interpréter les Résultats

#### Statistiques Globales

- **Montant Total Prédit** : Somme totale sur la période
- **Montant Moyen/Jour** : Moyenne quotidienne
- **Nombre d'Opérations** : Total d'opérations prédites
- **Confiance** : Score de fiabilité (0-100%)
- **Montant Min/Max** : Fourchette des prédictions

#### Graphique Temporel

Le graphique affiche :
- **Ligne bleue** : Montants prédits par jour
- **Ligne rouge** : Score de confiance par jour

#### Tableau Détaillé

Pour chaque jour, vous obtenez :
- **Date**
- **Jour de la semaine**
- **Montant prédit**
- **Nombre d'opérations**
- **Confiance** (avec code couleur)

### Export des Données

Cliquez sur **"📥 Exporter en CSV"** pour télécharger :
- Toutes les prédictions jour par jour
- Format : CSV avec séparateur point-virgule (;)
- Nom de fichier : `predictions_[TYPE]_[DATE].csv`

---

## 🔌 API Backend

### Endpoint Principal

**POST** `/api/predictions`

#### Requête

```json
{
  "typeOperation": "Appro_client",
  "horizonJours": 30,
  "periodeAnalyseJours": 90,
  "methodePrediction": "tendance",
  "codeProprietaire": "AG001",
  "service": "CIOMCI",
  "pays": "CI"
}
```

#### Réponse

```json
{
  "typeOperation": "Appro_client",
  "dateDebutPrediction": "2025-11-05",
  "dateFinPrediction": "2025-12-04",
  "horizonJours": 30,
  "methodePrediction": "tendance",
  "predictionsParJour": [
    {
      "date": "2025-11-05",
      "montantPrediction": 125000.0,
      "nombreOperationsPredites": 2,
      "confiance": 0.75,
      "jourSemaine": "WEDNESDAY"
    }
  ],
  "montantTotalPrediction": 3750000.0,
  "montantMoyenParJour": 125000.0,
  "montantMin": 100000.0,
  "montantMax": 150000.0,
  "nombreOperationsPredites": 60,
  "frequenceMoyenneParJour": 2.0,
  "confiance": 0.72,
  "statistiquesHistoriques": {
    "montantTotal": 11250000.0,
    "montantMoyen": 50000.0,
    "montantMin": 30000.0,
    "montantMax": 80000.0,
    "montantEcartType": 15000.0,
    "nombreOperations": 225,
    "frequenceMoyenne": 2.5,
    "joursAvecOperations": 90,
    "nombreJoursAnalyse": 90
  }
}
```

### Endpoint Types

**GET** `/api/predictions/types`

Retourne la liste des types d'opérations disponibles.

### Endpoint Batch

**POST** `/api/predictions/batch`

Permet de générer plusieurs prédictions en une seule requête.

```json
[
  {
    "typeOperation": "Appro_client",
    "horizonJours": 30,
    "methodePrediction": "tendance"
  },
  {
    "typeOperation": "Compense_client",
    "horizonJours": 30,
    "methodePrediction": "saisonnier"
  }
]
```

---

## 🖥️ Interface Utilisateur

### Composants Angular

#### PredictionsComponent

**Fichiers** :
- `predictions.component.ts` : Logique du composant
- `predictions.component.html` : Template HTML
- `predictions.component.scss` : Styles CSS

**Fonctionnalités** :
- Formulaire de configuration
- Affichage des résultats
- Graphique Chart.js
- Tableau détaillé
- Export CSV

### Service Frontend

**PredictionService** (`prediction.service.ts`)

```typescript
// Générer une prédiction
predict(request: PredictionRequest): Observable<PredictionResponse>

// Générer plusieurs prédictions
predictBatch(requests: PredictionRequest[]): Observable<PredictionResponse[]>

// Récupérer les types disponibles
getAvailableTypes(): Observable<PredictionType[]>
```

---

## 💡 Exemples d'utilisation

### Exemple 1 : Prédiction Approvisionnement Client (30 jours)

**Objectif** : Prévoir les approvisionnements clients pour le mois prochain

**Configuration** :
- Type : `Appro_client`
- Horizon : 30 jours
- Période d'analyse : 90 jours
- Méthode : Tendance linéaire
- Filtre : Pays = "CI"

**Résultat attendu** :
- Montant total prédit : ~3,750,000 XOF
- Moyenne quotidienne : ~125,000 XOF
- Confiance : 72%

### Exemple 2 : Prédiction Compensation (7 jours) avec Pattern Saisonnier

**Objectif** : Prévoir les compensations pour la semaine à venir

**Configuration** :
- Type : `Compense_client`
- Horizon : 7 jours
- Période d'analyse : 60 jours
- Méthode : Saisonnier
- Filtre : Service = "CIOMCI"

**Résultat attendu** :
- Prédictions différenciées par jour de la semaine
- Plus de compensations le lundi et vendredi
- Confiance : 65%

### Exemple 3 : Prédiction Nivellement (90 jours)

**Objectif** : Planification trimestrielle des niveillements

**Configuration** :
- Type : `nivellement`
- Horizon : 90 jours
- Période d'analyse : 180 jours
- Méthode : Moyenne simple
- Sans filtre

**Résultat attendu** :
- Prédictions stables sur la période
- Confiance : 55% (moins de données historiques)

---

## 📊 Interprétation des Résultats

### Score de Confiance

| Score | Interprétation | Recommandation |
|-------|----------------|----------------|
| **80-100%** | Très fiable | Utiliser directement pour la planification |
| **60-79%** | Fiable | Utiliser avec prudence, vérifier les tendances |
| **40-59%** | Moyennement fiable | Prendre en compte mais avec marge d'erreur |
| **0-39%** | Peu fiable | Données insuffisantes, augmenter la période d'analyse |

### Facteurs Affectant la Confiance

1. **Quantité de données** : Plus il y a d'opérations historiques, plus la confiance est élevée
2. **Période d'analyse** : Plus longue = meilleure compréhension des tendances
3. **Régularité** : Moins de variations = plus de confiance

### Conseils d'Interprétation

✅ **À FAIRE** :
- Utiliser les prédictions comme guide, pas comme vérité absolue
- Comparer avec les données historiques réelles
- Ajuster selon les événements exceptionnels (fêtes, promotions)
- Surveiller les tendances sur plusieurs périodes

❌ **À ÉVITER** :
- Prendre les prédictions comme garanties
- Ignorer les variations saisonnières
- Utiliser des périodes d'analyse trop courtes
- Négliger les filtres (agence, service, pays)

---

## ❓ FAQ

### Q1 : Combien de données historiques sont nécessaires ?

**R** : Minimum 30 jours pour avoir une prédiction basique. Pour une bonne précision, 90 jours ou plus sont recommandés.

### Q2 : Quelle méthode choisir ?

**R** :
- **Moyenne Simple** : Données stables, peu de variations
- **Tendance Linéaire** : Données avec évolution claire (recommandé par défaut)
- **Saisonnier** : Patterns récurrents par jour de la semaine

### Q3 : Les prédictions sont-elles exactes ?

**R** : Les prédictions sont des **estimations** basées sur l'historique. Elles peuvent varier selon :
- Événements exceptionnels
- Changements de tendances
- Nouveaux comportements clients

### Q4 : Puis-je prédire plusieurs types d'opérations en même temps ?

**R** : Oui, utilisez l'endpoint `/api/predictions/batch` ou générez plusieurs prédictions séparément.

### Q5 : Comment améliorer la précision ?

**R** :
1. Augmenter la période d'analyse (90+ jours)
2. Utiliser des filtres précis (agence, service, pays)
3. Choisir la méthode adaptée à vos données
4. Vérifier régulièrement les résultats réels vs prédictions

### Q6 : Les prédictions incluent-elles les jours fériés ?

**R** : Les prédictions sont basées sur les données historiques, qui incluent déjà les jours fériés. Cependant, des ajustements manuels peuvent être nécessaires pour les événements exceptionnels.

### Q7 : Puis-je exporter les données ?

**R** : Oui, utilisez le bouton "📥 Exporter en CSV" pour télécharger toutes les prédictions jour par jour.

### Q8 : Quelle est la différence entre les types d'opérations ?

**R** :
- **Appro** : Ajout de fonds (crédit)
- **Compense** : Retrait de fonds (débit)
- **Nivellement** : Ajustement de solde (peut être crédit ou débit)

---

## 🔧 Configuration Technique

### Backend

**Dépendances Maven** :
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
```

**Configuration** :
- Base de données : MySQL
- Port : 8080
- CORS : Activé pour `http://localhost:4200`

### Frontend

**Dépendances npm** :
```json
{
  "chart.js": "^3.9.1",
  "@angular/forms": "14.2.0"
}
```

**Configuration** :
- Port : 4200
- API URL : `http://localhost:8080/api`

---

## 📝 Notes Techniques

### Performance

- **Temps de traitement** : ~1-5 secondes selon la quantité de données
- **Optimisation** : Les requêtes utilisent des index sur `date_operation` et `type_operation`
- **Cache** : Non implémenté actuellement (peut être ajouté si nécessaire)

### Limitations

1. **Données manquantes** : Les opérations avec montant ou date null sont ignorées
2. **Période maximale** : 365 jours pour l'horizon, 730 jours pour l'analyse
3. **Types d'opérations** : Seulement les 5 types définis
4. **Prédictions ponctuelles** : Pas de prédiction d'événements exceptionnels

### Améliorations Futures

- [ ] Prédiction par machine learning (ML)
- [ ] Détection automatique de la meilleure méthode
- [ ] Alertes pour variations importantes
- [ ] Comparaison avec les résultats réels
- [ ] Prédictions multi-agences en parallèle
- [ ] Cache des résultats fréquents
- [ ] Export Excel avec graphiques

---

## 📞 Support

Pour toute question ou problème :
1. Consultez les logs du backend pour les erreurs
2. Vérifiez que les données historiques existent
3. Assurez-vous que les filtres sont corrects
4. Contactez l'équipe technique si nécessaire

---

**Document créé le** : 2025-11-04  
**Dernière mise à jour** : 2025-01-XX  
**Version** : 2.0  
**Auteur** : Équipe de Développement

### 📝 Notes de Version 2.0

- ✨ **Nouvelle fonctionnalité** : Prédiction basée sur les seuils de déclenchement
- 📊 **Amélioration** : Analyse de l'évolution du solde d'une agence
- 🎯 **Précision** : Prédictions plus précises basées sur les conditions réelles de déclenchement
- 🔍 **Analyse** : Identification automatique des seuils de solde qui déclenchent les opérations
- 📈 **Simulation** : Simulation jour après jour de l'évolution du solde

