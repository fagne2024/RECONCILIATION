# Logique de Réconciliation Spéciale TRXBO/OPPART

## Vue d'ensemble

La réconciliation entre les fichiers TRXBO et OPPART suit une logique spéciale où **chaque ligne TRXBO doit correspondre exactement à 2 lignes OPPART**.

## Règles de Correspondance

### ✅ **Correspondance Parfaite (Match)**
- **Condition** : Une ligne TRXBO correspond exactement à **2 lignes OPPART**
- **Résultat** : Enregistrement marqué comme "Match" (correspondance parfaite)
- **Statut** : ✅ Réconciliation réussie

### ❌ **Écarts (Mismatches)**
- **Condition** : Une ligne TRXBO correspond à **1 seule ligne OPPART**
- **Résultat** : Enregistrement marqué comme "Mismatch" (écart)
- **Statut** : ❌ Écart détecté - correspondance insuffisante

### ❌ **Écarts (Mismatches)**
- **Condition** : Une ligne TRXBO correspond à **plus de 2 lignes OPPART**
- **Résultat** : Enregistrement marqué comme "Mismatch" (écart)
- **Statut** : ❌ Écart détecté - correspondance excessive

### 📈 **Uniquement TRXBO (BoOnly)**
- **Condition** : Une ligne TRXBO n'a **aucune correspondance** dans OPPART
- **Résultat** : Enregistrement marqué comme "BoOnly"
- **Statut** : 📈 Enregistrement TRXBO sans correspondance

### 📈 **Uniquement OPPART (PartnerOnly)**
- **Condition** : Une ligne OPPART n'a **aucune correspondance** dans TRXBO
- **Résultat** : Enregistrement marqué comme "PartnerOnly"
- **Statut** : 📈 Enregistrement OPPART sans correspondance

## Détection Automatique

Le système détecte automatiquement les réconciliations TRXBO/OPPART en analysant :

1. **Contenu des données** : Recherche de "TRXBO" et "OPPART" dans les valeurs
2. **Noms des colonnes** : Recherche de "TRXBO" et "OPPART" dans les en-têtes
3. **Configuration des modèles** : Vérification des modèles de traitement automatique

## Implémentation Technique

### Méthode de Détection
```java
private boolean detectTRXBOOPPARTReconciliation(ReconciliationRequest request)
```

### Méthode de Réconciliation Spéciale
```java
private ReconciliationResponse reconcileTRXBOOPPART(ReconciliationRequest request, long startTime)
```

### Logique de Traitement

1. **Indexation OPPART** : Création d'un index groupé par clé de réconciliation
2. **Traitement TRXBO** : Pour chaque ligne TRXBO :
   - Recherche des correspondances OPPART
   - Vérification du nombre exact de correspondances
   - Classification selon les règles définies
3. **Identification des OPPART non utilisés** : Marquage des lignes OPPART sans correspondance

## Exemples de Scénarios

### Scénario 1 : Correspondance Parfaite
```
TRXBO: [ID: 12345, Montant: 1000]
OPPART: [ID: 12345, Montant: 500]  ← Ligne 1
OPPART: [ID: 12345, Montant: 500]  ← Ligne 2
Résultat: ✅ MATCH (1:2)
```

### Scénario 2 : Écart - Correspondance Insuffisante
```
TRXBO: [ID: 12346, Montant: 1000]
OPPART: [ID: 12346, Montant: 1000]  ← Seule ligne trouvée
Résultat: ❌ MISMATCH (1:1 au lieu de 1:2)
```

### Scénario 3 : Écart - Correspondance Excessive
```
TRXBO: [ID: 12347, Montant: 1000]
OPPART: [ID: 12347, Montant: 400]  ← Ligne 1
OPPART: [ID: 12347, Montant: 300]  ← Ligne 2
OPPART: [ID: 12347, Montant: 300]  ← Ligne 3 (trop de correspondances)
Résultat: ❌ MISMATCH (1:3 au lieu de 1:2)
```

### Scénario 4 : Aucune Correspondance
```
TRXBO: [ID: 12348, Montant: 1000]
OPPART: [Aucune ligne avec ID: 12348]
Résultat: 📈 BO_ONLY
```

## Logs et Monitoring

### Logs de Détection
```
🔍 Détection TRXBO/OPPART - TRXBO: true, OPPART: true
🔍 Détection de réconciliation spéciale TRXBO/OPPART - Logique 1:2
```

### Logs de Traitement
```
🔄 Début de la réconciliation spéciale TRXBO/OPPART - Logique 1:2
✅ Index OPPART créé avec 1500 clés uniques
📊 Progression TRXBO/OPPART: 25.00% (250/1000 enregistrements)
```

### Logs de Résultats
```
🎯 RÉSULTATS FINAUX TRXBO/OPPART:
📊 Total TRXBO: 1000
📊 Total OPPART: 2000
✅ Correspondances parfaites (1:2): 800
❌ Écarts (0, 1, ou >2 correspondances): 150
📈 Uniquement TRXBO: 50
📈 Uniquement OPPART: 200
```

## Performance

- **Optimisation** : Indexation des données OPPART pour recherche O(1)
- **Traitement parallèle** : Utilisation des threads CPU disponibles
- **Monitoring** : Logs de progression toutes les 1000 lignes
- **Mémoire** : Gestion optimisée pour les gros volumes de données

## Configuration

Cette logique spéciale est automatiquement activée lorsque :
1. Les fichiers contiennent des indicateurs "TRXBO" et "OPPART"
2. Les modèles de traitement automatique sont configurés pour ces types de fichiers
3. La détection automatique identifie le pattern TRXBO/OPPART

## Avantages

1. **Précision** : Logique métier spécifique respectée
2. **Performance** : Traitement optimisé pour les gros volumes
3. **Transparence** : Logs détaillés pour le suivi
4. **Flexibilité** : Détection automatique sans configuration manuelle
5. **Maintenabilité** : Code séparé et documenté 