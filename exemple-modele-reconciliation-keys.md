# Exemples de Modèles de Réconciliation avec Clés

## Vue d'ensemble

Cette documentation présente des exemples de modèles de traitement automatique avec des clés de réconciliation configurées pour tester la nouvelle fonctionnalité de détection intelligente des clés.

## Modèle TRXBO - Orange Money

```json
{
  "id": "trxbo-orange-money",
  "name": "TRXBO Orange Money - Traitement automatique",
  "filePattern": "*trxbo*orange*money*.csv",
  "fileType": "bo",
  "autoApply": true,
  "reconciliationKeys": {
    "boKeys": [
      "Numéro Trans GU",
      "IDTransaction", 
      "Transaction ID",
      "N° Opération",
      "Référence"
    ],
    "partnerKeys": [
      "External ID",
      "External id",
      "Transaction ID",
      "Référence",
      "ID"
    ]
  },
  "columnProcessingRules": [
    {
      "sourceColumn": "Numéro Trans GU",
      "targetColumn": "ID_Normalized",
      "trimSpaces": true,
      "removeSpecialChars": true
    }
  ]
}
```

## Modèle Partenaire - Orange Money

```json
{
  "id": "partner-orange-money",
  "name": "Partenaire Orange Money - Traitement automatique", 
  "filePattern": "*partner*orange*money*.csv",
  "fileType": "partner",
  "autoApply": true,
  "reconciliationKeys": {
    "boKeys": [
      "Numéro Trans GU",
      "IDTransaction",
      "Transaction ID"
    ],
    "partnerKeys": [
      "External ID",
      "External id", 
      "Transaction ID",
      "Référence"
    ]
  }
}
```

## Modèle Générique - Transactions

```json
{
  "id": "generic-transactions",
  "name": "Transactions Génériques - Traitement automatique",
  "filePattern": "*transaction*.csv",
  "fileType": "both",
  "autoApply": true,
  "reconciliationKeys": {
    "boKeys": [
      "ID",
      "Reference",
      "Transaction ID",
      "Numéro"
    ],
    "partnerKeys": [
      "ID",
      "Reference", 
      "Transaction ID",
      "External ID"
    ]
  }
}
```

## Modèle USSD Part

```json
{
  "id": "ussd-part",
  "name": "USSD Part - Traitement automatique",
  "filePattern": "*ussd*part*.csv",
  "fileType": "both",
  "autoApply": true,
  "reconciliationKeys": {
    "boKeys": [
      "N° Opération",
      "IDTransaction",
      "Référence"
    ],
    "partnerKeys": [
      "External ID",
      "Transaction ID",
      "Référence"
    ]
  }
}
```

## Comment tester la nouvelle fonctionnalité

### 1. Créer un modèle via l'API

```bash
curl -X POST http://localhost:8080/api/auto-processing/models \
  -H "Content-Type: application/json" \
  -d '{
    "name": "TRXBO Orange Money - Test",
    "filePattern": "*trxbo*test*.csv",
    "fileType": "bo",
    "autoApply": true,
    "reconciliationKeys": {
      "boKeys": ["Numéro Trans GU", "IDTransaction"],
      "partnerKeys": ["External ID", "Transaction ID"]
    }
  }'
```

### 2. Tester avec des fichiers

1. **Avec modèle correspondant** :
   - Nommer vos fichiers : `trxbo_test_20241201.csv` et `partner_test_20241201.csv`
   - Le système devrait détecter le modèle et utiliser les clés configurées
   - Logs attendus : `✅ Clés trouvées via modèle (trxbo-orange-money) - Confiance: 90%`

2. **Sans modèle correspondant** :
   - Utiliser des noms de fichiers génériques
   - Le système devrait utiliser la détection intelligente
   - Logs attendus : `🧠 Clés détectées intelligemment - Confiance: 85%`

3. **Fallback** :
   - Si aucune correspondance n'est trouvée
   - Logs attendus : `🔄 Utilisation du fallback simple - Confiance: 30%`

### 3. Logs de débogage

La nouvelle fonctionnalité affiche des logs détaillés :

```
🔍 Début de la détection intelligente des clés de réconciliation
📄 Fichiers: { boFileName: "trxbo_test.csv", partnerFileName: "partner_test.csv" }
📋 4 modèles disponibles
🔍 Modèle candidat: TRXBO Orange Money - Test (*trxbo*test*.csv)
✅ Modèle trouvé: TRXBO Orange Money - Test
🔑 Clés du modèle: { boKeys: ["Numéro Trans GU", "IDTransaction"], partnerKeys: ["External ID", "Transaction ID"] }
📊 Colonnes disponibles: ["Numéro Trans GU", "Date", "Montant", "Service"]
📊 Colonnes disponibles: ["External ID", "Date", "Montant", "Status"]
✅ Correspondance exacte trouvée: Numéro Trans GU -> Numéro Trans GU
✅ Correspondance exacte trouvée: External ID -> External ID
✅ Clés trouvées via modèle: { boKeyColumn: "Numéro Trans GU", partnerKeyColumn: "External ID" }
🎯 Résultat de la détection des clés: { boKeyColumn: "Numéro Trans GU", partnerKeyColumn: "External ID", source: "model", confidence: 0.9, modelId: "trxbo-orange-money" }
✅ Clés trouvées via modèle (trxbo-orange-money) - Confiance: 90%
```

## Patterns de détection intelligente

La détection intelligente utilise ces patterns (par ordre de priorité) :

### Priorité Haute (Score 80-100)
- `numéro\s*trans\s*gu` → "Numéro Trans GU"
- `external\s*id` → "External ID"  
- `transaction\s*id` → "Transaction ID"
- `id\s*transaction` → "ID Transaction"
- `n°\s*opération` → "N° Opération"

### Priorité Moyenne (Score 50-80)
- `référence` → "Référence"
- `reference` → "Reference"
- `numéro` → "Numéro"
- `id` → "ID"

### Priorité Basse (Score 20-50)
- `code` → "Code"
- `clé` → "Clé"
- `key` → "Key"

## Améliorations futures

1. **Apprentissage automatique** : Analyser les patterns de succès pour améliorer la détection
2. **Validation des clés** : Vérifier l'unicité et la qualité des clés détectées
3. **Interface utilisateur** : Permettre à l'utilisateur de confirmer/modifier les clés détectées
4. **Métriques** : Suivre le taux de succès de la détection automatique
