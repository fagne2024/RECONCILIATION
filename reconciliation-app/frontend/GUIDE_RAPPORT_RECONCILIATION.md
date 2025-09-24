# Guide du Rapport de Réconciliation

## Vue d'ensemble

Le nouveau composant **Rapport de Réconciliation** permet d'afficher un aperçu détaillé des résultats de réconciliation par agence, service et date. Ce rapport fournit des statistiques complètes sur les performances de réconciliation journalières.

## Fonctionnalités

### 📊 Tableau de Bord Principal
- **Vue d'ensemble** : Nombre de dates, agences, services et taux moyen de correspondance
- **Filtres avancés** : Possibilité de filtrer par agence, service ou date
- **Export Excel** : Export des données du rapport au format Excel

### 📈 Métriques Affichées
Pour chaque combinaison agence/service/date :
- **Nombre total de transactions**
- **Volume total** des transactions
- **Correspondances** (transactions réconciliées avec succès)
- **Écarts BO** (transactions présentes uniquement dans le Back Office)
- **Écarts Partenaire** (transactions présentes uniquement chez le partenaire)
- **Incohérences** (transactions avec des différences)
- **Taux de correspondance** (pourcentage de transactions réconciliées)

### 🎨 Interface Utilisateur
- **Page dédiée** avec navigation complète et breadcrumb
- **Design moderne** avec dégradés et animations
- **Codes couleur** pour les différents types de données :
  - 🟢 Vert : Correspondances et taux excellents (≥95%)
  - 🔵 Bleu : Taux bons (80-94%)
  - 🟡 Jaune : Taux moyens (60-79%) et écarts BO
  - 🟠 Orange : Écarts Partenaire
  - 🔴 Rouge : Taux faibles (<60%) et incohérences
- **Responsive design** adapté aux écrans mobiles et desktop
- **Navigation intuitive** avec bouton "Retour aux Résultats"

## Comment Utiliser

### 1. Accès au Rapport
1. Lancez une réconciliation depuis l'interface principale
2. Une fois les résultats affichés, cliquez sur le bouton **"📈 Rapport Réconciliation"**
3. Le rapport s'ouvre dans une **nouvelle page dédiée** avec navigation complète

### 2. Filtrage des Données
- **Par Agence** : Sélectionnez une agence spécifique ou laissez "Toutes les agences"
- **Par Service** : Choisissez un service particulier ou laissez "Tous les services"
- **Par Date** : Filtrez par une date précise ou consultez toutes les dates

### 3. Interprétation des Résultats

#### Taux de Correspondance
- **≥95%** : Excellent - Très peu d'écarts
- **80-94%** : Bon - Quelques écarts mineurs
- **60-79%** : Moyen - Écarts significatifs nécessitant attention
- **<60%** : Faible - Problèmes importants à résoudre

#### Types d'Écarts
- **Écarts BO** : Transactions trouvées uniquement dans le Back Office
- **Écarts Partenaire** : Transactions trouvées uniquement chez le partenaire
- **Incohérences** : Transactions présentes des deux côtés mais avec des différences

### 4. Export des Données
1. Cliquez sur le bouton **"📥 Exporter Excel"**
2. Le fichier Excel contiendra toutes les données visibles (selon les filtres appliqués)
3. Les colonnes incluront toutes les métriques du rapport

## Architecture Technique

### Composants
- **ReconciliationReportComponent** : Composant principal du rapport
- **ReconciliationResultsComponent** : Composant parent qui gère l'ouverture du rapport

### Modèles de Données
```typescript
interface ReconciliationReportData {
    date: string;
    agency: string;
    service: string;
    totalTransactions: number;
    totalVolume: number;
    matches: number;
    boOnly: number;
    partnerOnly: number;
    mismatches: number;
    matchRate: number;
}
```

### Intégration
Le composant s'intègre dans le flux existant :
1. Les données de réconciliation sont récupérées via le service `AppStateService`
2. Le composant génère automatiquement les statistiques
3. L'interface utilisateur affiche les données de manière interactive
4. Navigation via Angular Router vers `/reconciliation-report`

## Avantages

### Pour les Utilisateurs
- **Vue d'ensemble claire** des performances de réconciliation
- **Identification rapide** des problèmes par agence/service
- **Suivi temporel** des performances
- **Export facile** pour analyses externes

### Pour les Gestionnaires
- **Tableau de bord** pour le monitoring quotidien
- **Métriques de performance** par entité
- **Détection proactive** des anomalies
- **Rapports structurés** pour la direction

## Maintenance

### Ajout de Nouvelles Métriques
Pour ajouter de nouvelles métriques au rapport :
1. Modifiez l'interface `ReconciliationReportData`
2. Mettez à jour la méthode `generateReportData()`
3. Ajoutez les colonnes correspondantes dans le template

### Personnalisation de l'Affichage
- **Couleurs** : Modifiez les classes CSS `.rate-*`
- **Filtres** : Ajoutez de nouveaux filtres dans `report-filters`
- **Layout** : Ajustez les styles CSS selon les besoins

## Support

Pour toute question ou problème avec le rapport de réconciliation :
1. Vérifiez que les données de réconciliation sont bien présentes
2. Consultez la console du navigateur pour les erreurs JavaScript
3. Contactez l'équipe de développement pour les problèmes techniques

---

*Dernière mise à jour : Septembre 2025*
