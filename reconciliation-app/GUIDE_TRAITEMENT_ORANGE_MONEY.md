# 🟠 Guide de Traitement des Fichiers Orange Money

## 📋 Vue d'ensemble

Le système de traitement automatique a été étendu pour détecter et traiter automatiquement les fichiers Orange Money. Ces fichiers ont une structure particulière avec des lignes d'en-tête et d'informations au-dessus de la première colonne commençant par "N°".

## 🔍 Détection Automatique

### ✅ **Comment ça fonctionne**

1. **Détection automatique** : Le système analyse le contenu du fichier pour trouver la première colonne commençant par "N°"
2. **Ignorer les lignes supérieures** : Toutes les lignes au-dessus de cette colonne d'en-tête sont automatiquement ignorées
3. **Traitement des données** : Seules les lignes de données à partir de la ligne d'en-tête sont traitées

### ✅ **Indicateur visuel**

Quand un fichier Orange Money est détecté, un indicateur orange apparaît avec :
- 🟠 Icône Orange Money
- Message "Fichier Orange Money détecté"
- Explication "Les lignes au-dessus de la première colonne 'N°' seront ignorées"

## 🎯 Fonctionnalités Disponibles

### ✅ **Menu Traitement**

Dans le menu **Traitement**, les fichiers Orange Money sont automatiquement détectés et traités :

1. **Upload de fichier** : Glissez-déposez ou sélectionnez votre fichier Orange Money
2. **Détection automatique** : Le système détecte automatiquement la structure Orange Money
3. **Prévisualisation** : Affiche les données après suppression des lignes d'en-tête
4. **Traitement complet** : Applique tous les traitements disponibles

### ✅ **Modèles de Traitement Automatique**

Un modèle Orange Money par défaut est disponible avec :

1. **Détection d'en-tête** : Détecte automatiquement la ligne avec "N°"
2. **Nettoyage des montants** : Nettoie les colonnes de montants (XAF)
3. **Formatage des dates** : Formate les dates au format français
4. **Clés de réconciliation** : Configure les clés pour la réconciliation

## 🔧 Création du Modèle Orange Money

### ✅ **Méthode 1 : Bouton automatique**

1. Allez dans **Modèles de Traitement Automatique**
2. Cliquez sur le bouton **"Créer modèle Orange Money"**
3. Le modèle est créé automatiquement avec toutes les étapes nécessaires

### ✅ **Méthode 2 : Création manuelle**

1. Créez un nouveau modèle
2. Configurez le pattern de fichier : `*orange*money*.csv`
3. Ajoutez les étapes de traitement :
   - **Détection d'en-tête** : `detectOrangeMoneyHeader`
   - **Nettoyage montants** : `cleanAmounts`
   - **Formatage dates** : `date`

## 📊 Structure des Fichiers Orange Money

### ✅ **Format attendu**

```
[Lignes d'informations ignorées]
[Lignes d'en-tête ignorées]
N°, Date, Heure, Référence, Opération, Agent, Correspondant, Montant (XAF), Commissions (XAF)
1, 01/08/2025, 06:12:33, CI250801.0612.881347, Cash in, 693511313, Normal, 34300,00, 0,00
2, 01/08/2025, 10:27:41, CI250801.1027.A10048, Cash in, 693511313, Normal, 50995,00, 0,00
...
```

### ✅ **Colonnes typiques**

- **N°** : Numéro de transaction
- **Date** : Date de la transaction
- **Heure** : Heure de la transaction
- **Référence** : Référence unique
- **Opération** : Type d'opération (Cash in, Cash Out, etc.)
- **Agent** : Numéro de compte agent
- **Correspondant** : Type de correspondant
- **Montant (XAF)** : Montant en francs CFA
- **Commissions (XAF)** : Commissions en francs CFA

## 🚀 Utilisation

### ✅ **Étapes de traitement**

1. **Upload** : Sélectionnez votre fichier Orange Money
2. **Détection** : Le système détecte automatiquement la structure
3. **Prévisualisation** : Vérifiez les données traitées
4. **Traitement** : Appliquez les traitements souhaités
5. **Export** : Exportez les données traitées

### ✅ **Traitements disponibles**

- **Sélection de colonnes** : Garder seulement les colonnes essentielles
- **Nettoyage des montants** : Supprimer espaces et virgules
- **Formatage des dates** : Standardiser le format des dates
- **Filtrage** : Filtrer selon différents critères
- **Export par type** : Exporter selon le type d'opération

## 🔧 Configuration Avancée

### ✅ **Modèle personnalisé**

Vous pouvez créer un modèle personnalisé avec :

```typescript
{
  name: 'Mon Modèle Orange Money',
  filePattern: '*orange*money*.csv',
  processingSteps: [
    {
      name: 'DÉTECTION_EN_TÊTE',
      type: 'transform',
      action: 'detectOrangeMoneyHeader',
      field: ['*'],
      params: { headerPattern: 'N°', skipLines: true }
    },
    {
      name: 'NETTOYAGE_MONTANTS',
      type: 'format',
      action: 'cleanAmounts',
      field: ['Montant (XAF)', 'Commissions (XAF)']
    }
  ]
}
```

## 📝 Notes Importantes

### ✅ **Points clés**

1. **Détection automatique** : Fonctionne avec tous les fichiers Orange Money
2. **Préservation des données** : Aucune donnée n'est perdue
3. **Traitement flexible** : Compatible avec tous les traitements existants
4. **Performance optimisée** : Traitement rapide même pour les gros fichiers

### ✅ **Limitations**

- Fonctionne uniquement avec les fichiers CSV
- Nécessite une colonne commençant par "N°"
- Les fichiers Excel doivent être convertis en CSV

## 🆘 Dépannage

### ✅ **Problèmes courants**

1. **Fichier non détecté** : Vérifiez que la première colonne commence par "N°"
2. **Données manquantes** : Vérifiez le séparateur (virgule ou point-virgule)
3. **Erreur de parsing** : Vérifiez l'encodage du fichier (UTF-8 recommandé)

### ✅ **Support**

Pour toute question ou problème :
1. Vérifiez les logs dans la console du navigateur
2. Contactez l'équipe technique
3. Consultez les guides de dépannage existants 