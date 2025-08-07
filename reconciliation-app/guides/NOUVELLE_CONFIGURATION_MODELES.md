# Nouvelle Configuration des Modèles de Traitement Automatique

## Vue d'ensemble

La configuration des modèles de traitement automatique a été améliorée pour permettre une configuration plus flexible et spécifique selon le type de modèle (partenaire vs BO).

## Fonctionnalités Nouvelles

### 1. Configuration Spécifique par Type de Modèle

#### **Modèles Partenaire** (`fileType: 'partner'`)
- **Clés côté partenaire** : Vous choisissez les colonnes qui serviront de clés de réconciliation côté partenaire
- **Modèles BO à utiliser** : Vous sélectionnez parmi la liste des modèles BO existants
- **Configuration des clés pour chaque modèle BO** : Pour chaque modèle BO sélectionné, vous définissez les clés spécifiques à utiliser

#### **Modèles BO** (`fileType: 'bo'`)
- **Clés côté BO** : Vous choisissez les colonnes qui serviront de clés de réconciliation côté BO

#### **Modèles Génériques** (`fileType: 'both'`)
- **Clés côté partenaire** : Configuration classique
- **Clés côté BO** : Configuration classique

### 2. Interface Utilisateur Améliorée

L'interface s'adapte automatiquement selon le type de modèle sélectionné :

#### Pour les Modèles Partenaire
```
┌─────────────────────────────────────────────────────────────┐
│ Configuration des clés de réconciliation                    │
├─────────────────────────────────────────────────────────────┤
│ Clés côté partenaire *                                     │
│ [IDTransaction] [Reference] [Montant]                      │
│                                                             │
│ Modèles BO à utiliser *                                    │
│ [✓] Modèle BO Test (*BO*.csv)                             │
│ [ ] Autre Modèle BO (*TRX*.csv)                           │
│                                                             │
│ Configuration des clés pour chaque modèle BO               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Modèle BO Test (*BO*.csv)                             │ │
│ │ Clés pour Modèle BO Test                               │ │
│ │ [IDTransaction] [Montant] [Date]                      │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### Pour les Modèles BO
```
┌─────────────────────────────────────────────────────────────┐
│ Configuration des clés de réconciliation                    │
├─────────────────────────────────────────────────────────────┤
│ Clés côté BO *                                             │
│ [IDTransaction] [Montant] [Date]                          │
└─────────────────────────────────────────────────────────────┘
```

## Structure des Données

### Modèle Partenaire
```json
{
  "id": "uuid",
  "name": "Modèle Partenaire Test",
  "filePattern": "*PARTNER*.csv",
  "fileType": "partner",
  "reconciliationKeys": {
    "partnerKeys": ["IDTransaction", "Reference"],
    "boModels": ["bo-model-id-1", "bo-model-id-2"],
    "boModelKeys": {
      "bo-model-id-1": ["IDTransaction", "Montant"],
      "bo-model-id-2": ["IDTransaction", "Date"]
    }
  }
}
```

### Modèle BO
```json
{
  "id": "uuid",
  "name": "Modèle BO Test",
  "filePattern": "*BO*.csv",
  "fileType": "bo",
  "reconciliationKeys": {
    "boKeys": ["IDTransaction", "Montant"]
  }
}
```

## Avantages de la Nouvelle Configuration

### 1. Flexibilité Accrue
- **Modèles partenaire** peuvent référencer plusieurs modèles BO
- **Clés spécifiques** pour chaque modèle BO référencé
- **Configuration dynamique** selon le type de modèle

### 2. Réutilisabilité
- Les modèles BO peuvent être réutilisés par plusieurs modèles partenaire
- Configuration centralisée des clés de réconciliation

### 3. Interface Intuitive
- **Adaptation automatique** de l'interface selon le type
- **Validation contextuelle** des champs requis
- **Feedback visuel** pour les sélections

## Utilisation

### 1. Créer un Modèle BO
1. Sélectionner le type "BO"
2. Définir les clés de réconciliation côté BO
3. Configurer les étapes de traitement

### 2. Créer un Modèle Partenaire
1. Sélectionner le type "Partenaire"
2. Définir les clés de réconciliation côté partenaire
3. Sélectionner les modèles BO à utiliser
4. Pour chaque modèle BO sélectionné, définir les clés spécifiques

### 3. Configuration Automatique
- L'interface se met à jour automatiquement lors du changement de type
- Les validations s'adaptent au contexte
- Les champs non pertinents sont masqués

## Migration des Données Existantes

Les modèles existants continuent de fonctionner avec la configuration classique :
- `partnerKeys` et `boKeys` pour les modèles existants
- Support rétrocompatible maintenu

## Tests

Un script de test est disponible : `test-nouvelle-configuration.ps1`

```powershell
.\test-nouvelle-configuration.ps1
```

Ce script teste :
1. Création d'un modèle BO
2. Création d'un modèle partenaire avec référence au modèle BO
3. Vérification de la configuration

## Conclusion

Cette nouvelle configuration offre une **flexibilité maximale** pour la gestion des clés de réconciliation tout en conservant une **interface intuitive** et **évolutive**. 