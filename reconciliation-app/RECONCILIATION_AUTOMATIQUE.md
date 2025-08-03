# 🔄 Réconciliation Automatique

## Vue d'ensemble

La **Réconciliation Automatique** est une fonctionnalité avancée qui permet de traiter et réconcilier automatiquement les fichiers uploadés sans intervention manuelle. Le système détecte automatiquement le type de fichier, applique les étapes de traitement configurées et lance directement la réconciliation pour obtenir le résultat final.

## 🚀 Fonctionnement

### 1. Détection Automatique
- **Type de fichier** : Le système détermine automatiquement si le fichier est de type BO ou Partenaire basé sur le nom du fichier
- **Modèle correspondant** : Recherche automatique d'un modèle de traitement qui correspond au pattern du fichier
- **Clés de réconciliation** : Utilisation des clés configurées dans le modèle pour la réconciliation

### 2. Traitement Automatique
- **Application des étapes** : Toutes les étapes de traitement configurées dans le modèle sont appliquées automatiquement
- **Formatage des données** : Nettoyage, transformation et validation selon les règles définies
- **Préparation pour réconciliation** : Les données traitées sont préparées pour la réconciliation

### 3. Réconciliation Directe
- **Lancement automatique** : La réconciliation est lancée directement après le traitement
- **Résultats immédiats** : Affichage des résultats finaux sans étapes intermédiaires
- **Métriques complètes** : Temps de traitement, temps de réconciliation, étapes appliquées

## 📋 Prérequis

### Modèles de Traitement Automatique
Avant d'utiliser la réconciliation automatique, vous devez créer des modèles de traitement :

1. **Accédez à la gestion des modèles** dans l'interface
2. **Créez un nouveau modèle** avec :
   - Nom et pattern de fichier
   - Type de fichier (BO/Partenaire/Both)
   - Étapes de traitement (formatage, validation, etc.)
   - Clés de réconciliation
   - Auto-application activée

### Fichiers de Test
Le dossier `watch-folder` contient des fichiers de test :
- `exemple_clients.csv` : Pour tester les modèles partenaire
- `TRXBO.csv` : Pour tester les modèles BO
- `PMMTNCM.csv` : Pour tester les modèles partenaire

## 🎯 Utilisation

### Interface de Réconciliation Automatique

1. **Accédez à la section "Réconciliation Automatique"**
2. **Uploadez un fichier** :
   - Glissez-déposez le fichier dans la zone
   - Ou cliquez sur "Sélectionner un fichier"
3. **Le système traite automatiquement** :
   - Détection du type de fichier
   - Recherche du modèle correspondant
   - Application des étapes de traitement
   - Lancement de la réconciliation
4. **Affichage des résultats** :
   - Informations sur le traitement
   - Étapes appliquées
   - Résultats de la réconciliation
   - Données traitées

### Résultats Affichés

- **📄 Fichier traité** : Nom du fichier uploadé
- **🏷️ Modèle utilisé** : ID du modèle appliqué
- **⏱️ Temps de traitement** : Durée du traitement automatique
- **🔄 Temps de réconciliation** : Durée de la réconciliation
- **📋 Étapes appliquées** : Nombre et détails des étapes
- **📊 Données traitées** : Aperçu des données après traitement
- **📈 Résultats de réconciliation** : Résultats finaux

## 🔧 Configuration Avancée

### Types de Modèles

#### Modèles BO
- **Pattern** : `*bo*.csv`, `*TRXBO*.csv`
- **Type** : `bo`
- **Clés** : Configuration des clés côté BO
- **Utilisation** : Pour les fichiers de back-office

#### Modèles Partenaire
- **Pattern** : `*partner*.csv`, `*PMMTNCM*.csv`
- **Type** : `partner`
- **Clés** : Configuration des clés côté partenaire + références aux modèles BO
- **Utilisation** : Pour les fichiers de partenaires

#### Modèles "Both"
- **Pattern** : `*both*.csv`
- **Type** : `both`
- **Clés** : Configuration des clés côté partenaire et BO
- **Utilisation** : Pour les fichiers génériques

### Étapes de Traitement Disponibles

- **Formatage** : Formatage des montants, dates, nombres
- **Validation** : Validation des données, emails, champs requis
- **Transformation** : Conversion, extraction, concaténation
- **Filtrage** : Suppression de lignes vides, filtrage par valeur
- **Calcul** : Somme, moyenne, comptage
- **Sélection** : Conservation/suppression de colonnes
- **Déduplication** : Suppression de doublons

## 🚨 Gestion des Erreurs

### Erreurs Courantes

1. **Aucun modèle trouvé**
   - Vérifiez que des modèles existent
   - Vérifiez que le pattern correspond au nom du fichier

2. **Erreur de traitement**
   - Vérifiez les étapes de traitement dans le modèle
   - Vérifiez le format des données

3. **Erreur de réconciliation**
   - Vérifiez les clés de réconciliation
   - Vérifiez que les données sont compatibles

### Logs et Debugging

- **Console du navigateur** : Logs détaillés du processus
- **Logs du serveur** : Informations sur le traitement côté serveur
- **Résultats affichés** : Détails des erreurs dans l'interface

## 📊 Métriques et Performance

### Temps de Traitement
- **Traitement des données** : Temps d'application des étapes
- **Réconciliation** : Temps de la réconciliation automatique
- **Total** : Temps total du processus

### Optimisations
- **Cache des modèles** : Modèles chargés en mémoire
- **Traitement par lots** : Traitement optimisé des données
- **Réconciliation asynchrone** : Réconciliation non-bloquante

## 🔮 Évolutions Futures

### Fonctionnalités Prévues
- **Traitement en arrière-plan** : Traitement asynchrone pour les gros fichiers
- **Notifications** : Notifications en temps réel du statut
- **Historique** : Sauvegarde des résultats de réconciliation
- **API REST** : Endpoints pour l'intégration externe

### Améliorations Techniques
- **Parallélisation** : Traitement parallèle des étapes
- **Compression** : Compression des données pour les gros fichiers
- **Cache intelligent** : Cache des résultats de réconciliation

## 📝 Exemples d'Utilisation

### Exemple 1 : Fichier Partenaire
```
Fichier: PMMTNCM.csv
Type détecté: partner
Modèle appliqué: Modèle PMMTNCM
Étapes: Formatage montants, Validation dates, Suppression doublons
Résultat: Réconciliation avec données BO correspondantes
```

### Exemple 2 : Fichier BO
```
Fichier: TRXBO.csv
Type détecté: bo
Modèle appliqué: Modèle TRXBO
Étapes: Nettoyage données, Formatage colonnes
Résultat: Réconciliation avec données partenaire correspondantes
```

## 🎉 Conclusion

La Réconciliation Automatique simplifie considérablement le processus de traitement et de réconciliation des fichiers. En quelques clics, vous obtenez des résultats finaux sans intervention manuelle, tout en conservant la flexibilité de configuration des modèles de traitement.

Pour commencer, créez vos modèles de traitement automatique et testez avec les fichiers disponibles dans le dossier `watch-folder` ! 