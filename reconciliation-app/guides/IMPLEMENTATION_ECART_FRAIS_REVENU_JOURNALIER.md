# Implémentation de l'écart des frais sur le revenu journalier

## Vue d'ensemble

Cette fonctionnalité permet de calculer l'écart entre les frais attendus (basés sur les opérations du compte) et les frais réels récupérés depuis la table `trx_sf` pour chaque ligne du tableau revenu journalier.

## Fonctionnement

### 1. Calcul des revenus par date

Pour chaque date du revenu journalier, le système :

1. **Calcule les revenus attendus** :
   - Total Cashin (opérations de type `total_cashin`)
   - Total Paiement (opérations de type `total_paiement`)
   - Frais Cashin (opérations de type `FRAIS_TRANSACTION` avec service contenant "CASHIN")
   - Frais Paiement (opérations de type `FRAIS_TRANSACTION` avec service contenant "PAIEMENT")
   - Revenu total = Frais Cashin + Frais Paiement

2. **Récupère les frais SF réels** :
   - Utilise l'agence du compte sélectionné
   - Recherche dans la table `trx_sf` toutes les transactions pour cette agence et cette date
   - Fait la somme du champ `frais` de toutes les transactions trouvées

3. **Calcule l'écart** :
   - Écart frais = Revenu attendu - Frais SF réels

### 2. Correspondance agence/compte

La correspondance se fait via le champ `agence` du compte :
- Le compte a un champ `agence` qui correspond au champ `agence` dans la table `trx_sf`
- Si l'agence n'est pas définie sur le compte, l'écart sera 0

### 3. Gestion des erreurs

- Si aucune agence n'est définie : écart = 0
- Si aucune transaction SF trouvée : écart = revenu total
- En cas d'erreur API : écart = 0

## Modifications apportées

### Frontend (Angular)

#### 1. Composant ComptesComponent

**Fichier** : `reconciliation-app/frontend/src/app/components/comptes/comptes.component.ts`

**Modifications** :
- Correction de l'utilisation du champ `agence` au lieu de `numeroCompte`
- Ajout de logs de débogage
- Amélioration de la gestion des erreurs
- Ajout d'informations de débogage dans l'interface

**Code clé** :
```typescript
// Récupérer les frais SF pour cette agence et cette date
const agence = this.selectedCompte?.agence || '';
console.log(`Recherche des frais SF pour agence: ${agence}, date: ${date}`);

// Vérifier que l'agence est définie
if (!agence) {
    console.warn(`Aucune agence définie pour le compte ${this.selectedCompte?.numeroCompte}, impossible de récupérer les frais SF`);
    // Ajouter une promesse résolue pour maintenir la cohérence
    promises.push(Promise.resolve());
} else {
    const promise = this.trxSfService.getFraisByAgenceAndDate(agence, date).toPromise()
        .then((response: any) => {
            const fraisSf = response?.frais || 0;
            const ecartFrais = revenuTotal - fraisSf;
            
            console.log(`Frais SF trouvés pour ${agence} le ${date}: ${fraisSf}, écart: ${ecartFrais}`);
            
            this.revenuJournalierData.push({
                date,
                totalCashin,
                totalPaiement,
                fraisCashin,
                fraisPaiement,
                revenuTotal,
                ecartFrais
            });
        })
        .catch((error: any) => {
            console.error(`Erreur lors de la récupération des frais SF pour ${agence} le ${date}:`, error);
            this.revenuJournalierData.push({
                date,
                totalCashin,
                totalPaiement,
                fraisCashin,
                fraisPaiement,
                revenuTotal,
                ecartFrais: 0
            });
        });
    
    promises.push(promise);
}
```

#### 2. Template HTML

**Fichier** : `reconciliation-app/frontend/src/app/components/comptes/comptes.component.html`

**Ajout** :
- Section d'informations de débogage pour afficher les détails de l'agence et du compte utilisés

```html
<!-- Informations de débogage -->
<div class="debug-info" *ngIf="revenuJournalierDebugInfo" style="background: #f0f8ff; padding: 10px; margin: 10px 0; border-radius: 5px; font-size: 12px; color: #666;">
    <strong>Informations de débogage :</strong> {{ revenuJournalierDebugInfo }}
</div>
```

### Backend (Java Spring)

#### 1. Repository TrxSfRepository

**Fichier** : `reconciliation-app/backend/src/main/java/com/reconciliation/repository/TrxSfRepository.java`

**Méthode existante** :
```java
@Query("SELECT SUM(t.frais) FROM TrxSfEntity t WHERE t.agence = :agence AND DATE(t.dateTransaction) = :date")
Double sumFraisByAgenceAndDate(@Param("agence") String agence, @Param("date") String date);
```

#### 2. Service TrxSfService

**Fichier** : `reconciliation-app/backend/src/main/java/com/reconciliation/service/TrxSfService.java`

**Méthode existante** :
```java
public Double getFraisByAgenceAndDate(String agence, String date) {
    Double frais = trxSfRepository.sumFraisByAgenceAndDate(agence, date);
    return frais != null ? frais : 0.0;
}
```

#### 3. Controller TrxSfController

**Fichier** : `reconciliation-app/backend/src/main/java/com/reconciliation/controller/TrxSfController.java`

**Endpoint existant** :
```java
@GetMapping("/frais/{agence}/{date}")
public ResponseEntity<Map<String, Object>> getFraisByAgenceAndDate(
        @PathVariable String agence,
        @PathVariable String date) {
    Double frais = trxSfService.getFraisByAgenceAndDate(agence, date);
    Map<String, Object> response = Map.of(
        "agence", agence,
        "date", date,
        "frais", frais
    );
    return ResponseEntity.ok(response);
}
```

## Tests

### Script de test PowerShell

**Fichier** : `reconciliation-app/test-frais-sf.ps1`

Ce script teste l'API de récupération des frais SF avec différents scénarios :
- Récupération normale avec agence et date valides
- Test avec agence inexistante
- Test avec date sans données
- Liste des agences disponibles
- Statistiques générales

## Utilisation

### 1. Prérequis

- Le compte doit avoir un champ `agence` défini
- La table `trx_sf` doit contenir des données avec le champ `agence` correspondant
- Le backend doit être démarré sur le port 8080

### 2. Processus

1. **Sélectionner un compte** dans l'interface
2. **Aller à l'onglet "Revenu Journalier"**
3. **Charger les données** - le système va automatiquement :
   - Calculer les revenus par date
   - Récupérer les frais SF pour chaque date
   - Calculer l'écart
4. **Consulter les résultats** dans le tableau avec la colonne "Ecart frais"

### 3. Interprétation des résultats

- **Écart positif** : Les frais SF réels sont inférieurs aux frais attendus
- **Écart négatif** : Les frais SF réels sont supérieurs aux frais attendus
- **Écart = 0** : Les frais correspondent exactement

## Dépannage

### Problèmes courants

1. **Aucun écart calculé** :
   - Vérifier que le compte a une agence définie
   - Vérifier que des données existent dans `trx_sf` pour cette agence

2. **Erreurs de connexion** :
   - Vérifier que le backend est démarré
   - Vérifier les logs de la console pour les erreurs API

3. **Écarts incohérents** :
   - Vérifier la correspondance des dates (format YYYY-MM-DD)
   - Vérifier que les agences correspondent exactement

### Logs de débogage

Les logs suivants sont affichés dans la console du navigateur :
- `Recherche des frais SF pour agence: X, date: Y`
- `Frais SF trouvés pour X le Y: Z, écart: W`
- `Aucun frais SF trouvé pour X le Y, écart = revenu total`
- `Erreur lors de la récupération des frais SF pour X le Y`

## Améliorations futures

1. **Cache des résultats** pour éviter les appels API répétés
2. **Export des écarts** en CSV/Excel
3. **Graphiques** pour visualiser les écarts dans le temps
4. **Alertes** pour les écarts significatifs
5. **Historique** des calculs d'écart
