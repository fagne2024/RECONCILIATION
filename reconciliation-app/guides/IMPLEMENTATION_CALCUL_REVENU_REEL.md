# Implémentation du Calcul du Revenu Réel

## Vue d'ensemble

Cette implémentation modifie le calcul de la colonne "Revenu Réel" dans l'onglet "Control Revenu" pour utiliser les données réelles des frais TRX SF au lieu d'une simulation aléatoire.

## Formule de Calcul

**Revenu Réel = Revenu Attendu - Total Frais TRX SF (EN_ATTENTE)**

Où :
- **Revenu Attendu** : Calculé selon les frais paramétrés (pourcentage du volume ou montant fixe par transaction)
- **Total Frais TRX SF** : Somme des frais récupérés depuis la table `trx_sf` pour l'agence, la date ET le service correspondants, **uniquement pour les transactions avec statut "EN_ATTENTE"**

## Détection des Anomalies par Service

### Nouveaux Critères de Détection

La détection des anomalies et contrôles critiques est maintenant basée sur le **nombre de lignes avec MàG négatif par service** :

- **Normal** : Moins de 5 lignes avec MàG négatif
- **Anomalie** : Entre 5 et 10 lignes avec MàG négatif
- **Critique** : Plus de 10 lignes avec MàG négatif

### Logique d'Analyse

1. **Groupement par service** : Les données sont groupées par service
2. **Comptage des MàG négatifs** : Pour chaque service, on compte le nombre de lignes où `ecart < 0`
3. **Application du statut** : Le statut déterminé s'applique à **toutes les lignes** du service
4. **Logs de debug** : Affichage du nombre de MàG négatifs et du statut pour chaque service

### Exemple

```
Service CM_PAIEMENTMARCHAND_OM_TP: 7 lignes MàG négatif -> Statut: anomalie
Service CM_CASHIN_OM_TP: 12 lignes MàG négatif -> Statut: critique
Service CM_TRANSFERT_OM_TP: 3 lignes MàG négatif -> Statut: normal
```

## Modifications Apportées

### 1. Frontend - Component Comptes

#### Fichier : `comptes.component.ts`

**Méthode `transformStatisticsToControlRevenu`** :
- Rendu asynchrone pour permettre les appels API
- Ajout de la récupération des frais TRX SF via `trxSfService.getFraisByAgenceAndDateAndServiceEnAttente()`
- Calcul du revenu réel selon la nouvelle formule
- Ajout du champ `totalFraisTrxSf` dans les données retournées
- **Nouveau** : Suppression de la détection d'anomalie individuelle

```typescript
// Récupérer les frais TRX SF pour cette agence, date et service (uniquement EN_ATTENTE)
let totalFraisTrxSf = 0;
try {
    const fraisResponse = await this.trxSfService.getFraisByAgenceAndDateAndServiceEnAttente(stat.agency, stat.date, stat.service).toPromise();
    totalFraisTrxSf = fraisResponse?.frais || 0;
} catch (error) {
    console.warn(`Erreur lors de la récupération des frais TRX SF (EN_ATTENTE) pour ${stat.agency} le ${stat.date} service ${stat.service}:`, error);
    totalFraisTrxSf = 0;
}

// Calculer le revenu réel selon la formule : Revenu attendu - Total frais TRX SF (EN_ATTENTE)
const revenuReel = revenuAttendu - totalFraisTrxSf;
```

**Nouvelle méthode `analyzeAnomaliesByService`** :
- Analyse les anomalies par service selon les nouveaux critères
- Groupe les données par service
- Compte les lignes avec MàG négatif
- Applique le statut approprié à toutes les lignes du service

```typescript
private analyzeAnomaliesByService(data: any[]): void {
    // Grouper les données par service
    const serviceGroups = new Map<string, any[]>();
    
    data.forEach(item => {
        if (!serviceGroups.has(item.service)) {
            serviceGroups.set(item.service, []);
        }
        serviceGroups.get(item.service)!.push(item);
    });

    // Analyser chaque service
    serviceGroups.forEach((serviceData, serviceName) => {
        // Compter les lignes avec MàG négatif
        const negativeMagCount = serviceData.filter(item => item.ecart < 0).length;
        
        // Déterminer le statut selon les critères
        let serviceStatus = 'normal';
        if (negativeMagCount >= 5 && negativeMagCount <= 10) {
            serviceStatus = 'anomalie';
        } else if (negativeMagCount > 10) {
            serviceStatus = 'critique';
        }

        // Appliquer le statut à toutes les lignes du service
        serviceData.forEach(item => {
            item.statut = serviceStatus;
        });
    });
}
```

**Méthode `loadAgencySummaryData`** :
- Mise à jour pour gérer l'aspect asynchrone de `transformStatisticsToControlRevenu`

**Interface TypeScript** :
- Ajout du champ optionnel `totalFraisTrxSf?: number` dans les interfaces de données

#### Fichier : `comptes.component.html`

**Nouvelle colonne dans le tableau** :
- Ajout de la colonne "Frais TRX SF" entre "Revenu Attendu" et "Revenu Réel"
- Affichage des frais TRX SF utilisés dans le calcul

**Nouveau filtre Service** :
- Ajout d'un filtre par service pour analyser un service spécifique
- Options dynamiques basées sur les services disponibles

#### Fichier : `comptes.component.scss`

**Style pour la nouvelle colonne** :
- Couleur rose (`#e91e63`) pour distinguer les frais TRX SF

### 2. Backend - Service TRX SF

#### Fichier : `TrxSfService.java`

**Méthode `getFraisByAgenceAndDateAndServiceEnAttente`** :
- Récupère la somme des frais depuis la table `trx_sf` pour une agence, une date et un service donnés, **uniquement pour les transactions avec statut "EN_ATTENTE"**
- Utilise la requête SQL : `SELECT SUM(frais) FROM trx_sf WHERE agence = :agence AND DATE(date_transaction) = :date AND service = :service AND statut = 'EN_ATTENTE'`

**Méthode `getFraisByAgenceAndDateEnAttente`** :
- Version alternative qui ne considère que les transactions avec statut "EN_ATTENTE"

### 3. Frontend - Service TRX SF

#### Fichier : `trx-sf.service.ts`

**Méthode `getFraisByAgenceAndDateAndServiceEnAttente`** :
- Appel HTTP GET vers `/api/trx-sf/frais-en-attente/{agence}/{date}/{service}`
- Retourne un objet avec la propriété `frais` contenant le total des transactions EN_ATTENTE uniquement

## Flux de Données

1. **Chargement des données** : L'utilisateur accède à l'onglet "Control Revenu"
2. **Récupération des statistiques** : Les données AgencySummary sont chargées
3. **Pour chaque enregistrement** :
   - Calcul du revenu attendu selon les frais paramétrés
   - Appel API pour récupérer les frais TRX SF de l'agence/date/service correspondant (uniquement EN_ATTENTE)
   - Calcul du revenu réel = revenu attendu - frais TRX SF (EN_ATTENTE)
   - Calcul de l'écart (MàG)
4. **Analyse des anomalies par service** :
   - Groupement des données par service
   - Comptage des lignes avec MàG négatif par service
   - Application du statut (normal/anomalie/critique) selon les critères
5. **Affichage** : Les données sont présentées dans le tableau avec la nouvelle colonne

## Gestion des Erreurs

- **Erreur API** : Si la récupération des frais TRX SF échoue, `totalFraisTrxSf` est défini à 0
- **Données manquantes** : Si aucun frais EN_ATTENTE n'est trouvé pour l'agence/date/service, le revenu réel équivaut au revenu attendu
- **Logs de debug** : Les frais récupérés sont affichés dans la console avec l'agence, date et service pour faciliter le débogage

## Avantages de cette Implémentation

1. **Données réelles** : Utilisation des frais TRX SF réels au lieu de simulations
2. **Précision par service** : Filtrage des frais TRX SF par agence, date ET service pour une correspondance exacte
3. **Filtrage par statut** : Seules les transactions TRX SF avec statut "EN_ATTENTE" sont prises en compte
4. **Détection d'anomalies améliorée** : Analyse par service basée sur le nombre de MàG négatifs
5. **Traçabilité** : Affichage des frais TRX SF dans l'interface pour transparence
6. **Robustesse** : Gestion gracieuse des erreurs et données manquantes

## Utilisation

1. Naviguer vers l'onglet "Control Revenu" dans la section Comptes
2. Les données sont automatiquement calculées avec la nouvelle formule
3. La colonne "Frais TRX SF" affiche les frais des transactions EN_ATTENTE utilisés dans le calcul
4. Les statuts (normal/anomalie/critique) sont déterminés par service selon le nombre de MàG négatifs
5. Utiliser le filtre "Service" pour analyser un service spécifique
6. Cliquer sur l'icône "œil" pour voir les détails complets d'un contrôle

## Maintenance

- Vérifier que les données TRX SF sont à jour
- Surveiller les logs pour détecter les erreurs de récupération des frais
- Ajuster les seuils d'anomalie si nécessaire selon les nouveaux critères par service
