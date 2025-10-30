# 📋 CAHIER DES CHARGES - APPLICATION DE RÉCONCILIATION

## 🎯 1. CONTEXTE ET OBJECTIFS

### 1.1 Contexte
Application de réconciliation financière complète développée avec **Angular 14** (frontend) et **Spring Boot** (backend), permettant la collecte, le traitement et la réconciliation automatique des transactions financières entre différents partenaires et le back-office.

### 1.2 Objectifs
- **Automatiser** l'ingestion et la réconciliation des transactions financières
- **Tracer** et **corriger** les écarts (frais, partenaires, montants, statuts)
- **Fournir** des exports performants et paramétrables (CSV avec séparateur point-virgule)
- **Sécuriser** les accès, journaliser et auditer toutes les opérations
- **Industrialiser** le run (sauvegardes, monitoring, CI/CD)

---

## 🏗️ 2. ARCHITECTURE TECHNIQUE

### 2.1 Stack Technologique

#### Backend (Spring Boot)
- **Framework** : Spring Boot 2.7+
- **Langage** : Java 11+
- **Base de données** : MySQL 8.0+
- **ORM** : JPA/Hibernate
- **Build** : Maven 3.6+
- **Sécurité** : Spring Security (authentification basique)

#### Frontend (Angular)
- **Framework** : Angular 14
- **Langage** : TypeScript
- **Styling** : SCSS
- **Charts** : ng2-charts
- **UI Components** : Angular Material
- **Build** : Angular CLI

### 2.2 Structure du Projet
```
PAD/
├── reconciliation-app/
│   ├── backend/                 # Application Spring Boot
│   │   ├── src/main/java/com/reconciliation/
│   │   │   ├── controller/      # Contrôleurs REST (24 contrôleurs)
│   │   │   ├── service/         # Logique métier (31 services)
│   │   │   ├── repository/      # Accès aux données (24 repositories)
│   │   │   ├── entity/          # Entités JPA (20 entités)
│   │   │   ├── dto/             # Objets de transfert (15 DTOs)
│   │   │   └── config/          # Configuration
│   │   └── src/main/resources/
│   │       └── db/migration/    # Scripts de migration
│   └── frontend/                # Application Angular
│       ├── src/app/
│       │   ├── components/      # Composants Angular (25+ composants)
│       │   ├── services/        # Services Angular (30+ services)
│       │   ├── models/          # Modèles TypeScript (15+ modèles)
│       │   └── utils/           # Utilitaires
│       └── src/environments/    # Configuration par environnement
└── watch-folder/                # Dossier de surveillance des fichiers
```

---

## 🔐 3. FONCTIONNALITÉS D'AUTHENTIFICATION ET SÉCURITÉ

### 3.1 Gestion des Utilisateurs
- **Authentification** : Système de login/password basique
- **Utilisateurs par défaut** : 
  - `admin` / `admin` (administrateur)
  - `yamar.ndao` / `yamar` (utilisateur test)
- **Profils utilisateur** : Association avec des profils et permissions
- **Sécurité** : CORS configuré pour `http://localhost:4200`

### 3.2 Système de Permissions
- **Modules** : Gestion des modules applicatifs
- **Permissions** : Permissions granulaires par module
- **Profils** : Association profil-permissions
- **Contrôle d'accès** : Vérification des droits par fonctionnalité

### 3.3 Fonctionnement de l'Authentification
1. **Saisie** : L'utilisateur saisit username/password
2. **Validation** : Vérification des champs obligatoires
3. **Recherche** : Query en base pour trouver l'utilisateur
4. **Vérification** : Comparaison du mot de passe
5. **Réponse** : Retour des informations utilisateur + profil

---

## 📁 4. FONCTIONNALITÉS D'IMPORT ET TRAITEMENT

### 4.1 Import de Fichiers
- **Formats supportés** : Excel (.xls, .xlsx), CSV
- **Dossier de surveillance** : `watch-folder` avec détection automatique
- **Types de fichiers traités** :
  - Fichiers partenaires (CIMOOVCI, CIMTNCI, CIOMCI, etc.)
  - Fichiers BO (TRXBO, USSDBO, USSDPART)
  - Fichiers de réconciliation (OPPART, PMMOOVBF, etc.)

### 4.2 Normalisation des Données
- **Détection automatique** des colonnes et types
- **Mapping intelligent** des colonnes selon les modèles
- **Validation** des données selon les règles métier
- **Gestion des erreurs** avec journalisation détaillée

### 4.3 Traitement par Lots
- **Chunking** : Traitement par lots pour optimiser les performances
- **Parallélisation** : Traitement multi-thread pour les gros volumes
- **Progress tracking** : Suivi en temps réel du traitement
- **Récupération d'erreurs** : Gestion des échecs partiels

### 4.4 Processus d'Import
1. **Upload** : Récupération du fichier via formulaire
2. **Validation** : Vérification du type et de la taille
3. **Parsing** : Lecture selon le format (CSV/Excel)
4. **Normalisation** : Mapping des colonnes selon les modèles
5. **Validation** : Vérification des règles métier
6. **Sauvegarde** : Insertion en base de données

---

## 🔄 5. FONCTIONNALITÉS DE RÉCONCILIATION

### 5.1 Types de Réconciliation
- **Mode 1-1** : 1 transaction BO = 1 transaction Partenaire
- **Mode 1-2** : 1 transaction BO = 2 transactions Partenaire
- **Mode 1-3** : 1 transaction BO = 3 transactions Partenaire
- **Mode 1-4** : 1 transaction BO = 4 transactions Partenaire
- **Mode 1-5** : 1 transaction BO = 5 transactions Partenaire

### 5.2 Algorithmes de Matching
- **Découverte automatique** des clés de réconciliation
- **Matching intelligent** basé sur les références, montants, dates
- **Logique configurable** selon les modèles partenaires
- **Détection des doublons** et gestion des conflits

### 5.3 Réconciliation Magique
- **Découverte automatique** des clés de réconciliation
- **Configuration automatique** des paramètres
- **Exécution optimisée** avec parallélisation
- **Résultats détaillés** avec statistiques

### 5.4 Fonctionnement de la Réconciliation
1. **Sélection du Type** : Choix du mode de réconciliation (1-1, 1-2, etc.)
2. **Upload des Fichiers** : Upload des fichiers BO et Partenaire
3. **Validation** : Vérification des données selon le type sélectionné
4. **Sélection des Colonnes** : Mapping des colonnes de réconciliation
5. **Exécution** : Application de l'algorithme de matching
6. **Résultats** : Affichage des correspondances et écarts

---

## 💰 6. FONCTIONNALITÉS DE GESTION DES OPÉRATIONS

### 6.1 Types d'Opérations
- **Transaction créée** : `transaction_cree`
- **Annulation BO** : `annulation_bo`
- **Compense client** : `compense_client`
- **Appro client** : `appro_client`
- **Nivellement** : `nivellement`
- **TSOP** : Type d'opération spécial
- **Frais transaction** : `FRAIS_TRANSACTION`

### 6.2 Logique Métier des Opérations
- **Débits** : `compense`, `FRAIS_TRANSACTION`, `total_cashin`
- **Crédits** : `approvisionnement`, `total_paiement`
- **Ajustements** : `ajustement` (positif ou négatif)
- **Impact sur soldes** : Calcul automatique des soldes avant/après

### 6.3 Opérations Bancaires Automatiques
- **Création automatique** pour les types : `compense_client`, `appro_client`, `nivellement`
- **Récupération automatique** du numéro de compte
- **Pré-remplissage** des champs métier
- **Gestion des statuts** : En attente, Validée, Rejetée

### 6.4 Logique TSOP Spéciale
- **CASHIN** : Montant + Frais en débit
- **PAIEMENT** : Montant en crédit, Frais en débit
- **Annulations TSOP** : Impact inverse de l'opération d'origine

### 6.5 Fonctionnement des Opérations
1. **Création** : Création manuelle ou automatique d'une opération
2. **Vérification** : Contrôle des préconditions (solde suffisant, etc.)
3. **Traitement** : Calcul de l'impact sur le solde
4. **Sauvegarde** : Mise à jour du compte et de l'opération
5. **Validation** : Statut "Validée" après vérification
6. **Annulation** : Préfixe `annulation_` avec impact inverse

---

## 📊 7. FONCTIONNALITÉS DE GESTION DES ÉCARTS

### 7.1 Types d'Écarts
- **Écarts BO** : Transactions présentes uniquement dans le Back Office
- **Écarts Partenaire** : Transactions présentes uniquement chez le partenaire
- **Incohérences** : Transactions avec des différences
- **Écarts de solde** : Différences de montants

### 7.2 Gestion des Écarts
- **Détection automatique** des écarts lors de la réconciliation
- **Classification** selon les règles métier
- **Résolution** manuelle ou automatique
- **Historisation** des actions de correction

### 7.3 Fonctionnement de la Gestion des Écarts
1. **Détection** : Identification automatique lors de la réconciliation
2. **Classification** : Categorisation selon le type d'écart
3. **Analyse** : Calcul des montants et impacts
4. **Résolution** : Actions correctives (ignorer, créer opération, ajustement)
5. **Validation** : Vérification de la résolution
6. **Historisation** : Traçabilité complète des actions

---

## 📈 8. FONCTIONNALITÉS DE REPORTING ET EXPORT

### 8.1 Exports CSV
- **Séparateur** : Point-virgule (`;`) par défaut
- **Encodage** : UTF-8
- **Formats** : CSV, Excel (.xls, .xlsx)
- **Filtres** : Par période, partenaire, statut, montant
- **Pagination** : Export par lots pour les gros volumes

### 8.2 Tableaux de Bord
- **Dashboard principal** : Vue d'ensemble des métriques
- **Statistiques** : KPIs en temps réel
- **Graphiques** : Visualisation des données avec ng2-charts
- **Filtres dynamiques** : Recherche multi-critères

### 8.3 Rapports Spécialisés
- **Rapport de réconciliation** : Détail par agence, service, date
- **Statistiques de création** : `transaction_created_stats`
- **Classements** : Performance des agences
- **Suivi des écarts** : Évolution des écarts dans le temps

### 8.4 Fonctionnement des Exports
1. **Sélection** : Choix des données à exporter (filtres, sélection)
2. **Préparation** : Formatage des données selon le modèle
3. **Génération** : Création du fichier (CSV/Excel)
4. **Optimisation** : Traitement par chunks pour gros volumes
5. **Téléchargement** : Download du fichier généré

---

## 🎨 9. FONCTIONNALITÉS UI/UX

### 9.1 Interface Utilisateur
- **Design moderne** : Interface Angular Material
- **Responsive** : Adaptation mobile et desktop
- **Thème** : Support clair/sombre
- **Navigation** : Sidebar avec menu contextuel

### 9.2 Composants Spécialisés
- **File Upload** : Upload de fichiers avec validation
- **Column Selection** : Sélection des colonnes de réconciliation
- **Reconciliation Results** : Affichage des résultats
- **Modern Popup** : Popups de confirmation modernes
- **Progress Indicator** : Indicateurs de progression

### 9.3 Conventions UI
- **Icônes** : Suppression en rouge, modification en vert
- **États** : Chargement, erreur, succès, vide
- **Feedback** : Toasts non intrusifs
- **Accessibilité** : Navigation clavier, contrastes

### 9.4 Gestion d'État Global
- **AppStateService** : Service centralisé de gestion d'état
- **localStorage** : Persistance des données utilisateur
- **Observables** : Communication reactive entre composants
- **Synchronisation** : Mise à jour automatique des vues

---

## 🔧 10. FONCTIONNALITÉS TECHNIQUES

### 10.1 Gestion des Données
- **Base de données** : MySQL avec migrations Flyway
- **Entités principales** :
  - `transaction` : Transactions financières
  - `operation` : Opérations sur comptes
  - `operation_bancaire` : Opérations bancaires
  - `ecart_solde` : Écarts de solde
  - `compte` : Comptes financiers
  - `user` : Utilisateurs
  - `profil` : Profils utilisateur

### 10.2 Services Backend
- **ReconciliationService** : Logique de réconciliation
- **OperationService** : Gestion des opérations
- **FileWatcherService** : Surveillance des fichiers
- **ExportService** : Génération d'exports
- **StatisticsService** : Calcul des statistiques

### 10.3 Services Frontend
- **ReconciliationService** : Communication avec l'API
- **DataProcessingService** : Traitement des données
- **ExportService** : Génération d'exports côté client
- **AppStateService** : Gestion de l'état global

---

## 📋 11. RÈGLES MÉTIER PRINCIPALES

### 11.1 Règles de Réconciliation
- **Clé de réconciliation** : Découverte automatique ou configuration manuelle
- **Matching** : Correspondance exacte ou avec tolérance
- **Doublons** : Détection et gestion des doublons
- **Validation** : Vérification des préconditions

### 11.2 Règles d'Opérations
- **Impact sur solde** : Calcul automatique selon le type d'opération
- **Annulations** : Préfixe `annulation_` avec impact inverse
- **Validation** : Vérification des soldes suffisants
- **Historisation** : Traçabilité complète des modifications

### 11.3 Règles d'Export
- **Séparateur** : Point-virgule par défaut
- **Encodage** : UTF-8 obligatoire
- **Performance** : Streaming pour les gros volumes
- **Validation** : Vérification des données avant export

### 11.4 Règles Spéciales
- **Flag impact_applique** : Évite le double impact sur les soldes
- **Opérations automatiques** : Création auto pour compense/appro/nivellement
- **Récupération compte** : Par correspondance exacte puis partielle
- **Commentaires automatiques** : "IMPACT J+1" par défaut pour les écarts

---

## 🚀 12. PERFORMANCES ET OPTIMISATIONS

### 12.1 Performances
- **Import** : 100k lignes en moins de 5 minutes
- **Export** : 1M lignes en streaming
- **API** : Réponses p95 < 500ms
- **Mémoire** : Gestion optimisée des gros volumes

### 12.2 Optimisations
- **Parallélisation** : Traitement multi-thread
- **Chunking** : Traitement par lots
- **Indexation** : Index de base de données optimisés
- **Cache** : Mise en cache des données fréquentes

### 12.3 Techniques d'Optimisation
- **ExecutorService** : Pool de threads réutilisable (daemon threads)
- **Batch processing** : Traitement par batches de 10k lignes
- **Streaming** : Exports avec streaming pour gros volumes
- **Web Workers** : Traitement non bloquant côté frontend

---

## 🔒 13. SÉCURITÉ ET CONFORMITÉ

### 13.1 Authentification
- **Login/Password** : Authentification basique
- **Sessions** : Gestion des sessions utilisateur
- **CORS** : Configuration des origines autorisées
- **Validation** : Vérification des entrées utilisateur

### 13.2 Audit et Traçabilité
- **Logs** : Journalisation complète des actions
- **Audit trail** : Traçabilité des modifications
- **Historisation** : Conservation des états précédents
- **Monitoring** : Surveillance des performances

### 13.3 Mesures de Sécurité
- **Logging structuré** : Messages informatifs avec emojis
- **Validation des entrées** : Contrôle côté backend
- **Transactions atomiques** : Rollback en cas d'erreur
- **Flag impact_applique** : Protection contre double impact

---

## 📦 14. DÉPLOIEMENT ET EXPLOITATION

### 14.1 Environnements
- **Développement** : `http://localhost:4200` (frontend) / `http://localhost:8080` (backend)
- **Test** : Environnement de test dédié
- **Production** : Configuration de production

### 14.2 Sauvegardes
- **Base de données** : Scripts de sauvegarde automatisés
- **Fichiers** : Sauvegarde du dossier `watch-folder`
- **Rétention** : Politique de rétention des données
- **Restauration** : Procédures de restauration

### 14.3 Monitoring
- **Logs** : Centralisation et analyse des logs
- **Métriques** : Surveillance des performances
- **Alertes** : Notifications en cas de problème
- **Health checks** : Vérification de l'état de l'application

---

## 🧪 15. TESTS ET QUALITÉ

### 15.1 Tests Backend
- **Tests unitaires** : Couverture des services
- **Tests d'intégration** : Tests des API
- **Tests de performance** : Tests de charge
- **Tests de régression** : Validation des modifications

### 15.2 Tests Frontend
- **Tests unitaires** : Tests des composants
- **Tests E2E** : Tests d'intégration complets
- **Tests de régression** : Validation des modifications
- **Tests d'accessibilité** : Conformité WCAG

### 15.3 Critères de Qualité
- **Couverture de code** : Minimum 80%
- **Performance** : Respect des métriques définies
- **Sécurité** : Validation des entrées et audit complet
- **Documentation** : Code documenté et guides à jour

---

## 📚 16. DOCUMENTATION ET FORMATION

### 16.1 Documentation Technique
- **API Documentation** : Documentation des endpoints
- **Architecture** : Documentation de l'architecture
- **Déploiement** : Guides de déploiement
- **Maintenance** : Procédures de maintenance

### 16.2 Documentation Utilisateur
- **Guide utilisateur** : Manuel d'utilisation
- **Formation** : Sessions de formation
- **FAQ** : Questions fréquentes
- **Support** : Procédures de support

### 16.3 Guides Spécialisés Disponibles
- `GUIDE_OPERATIONS_BANCAIRES_COMPLETE.md` : Opérations bancaires
- `GUIDE_OPERATIONS_BANCAIRES_AUTOMATIQUES.md` : Création automatique
- `GUIDE_TELECHARGEMENT_MODELES.md` : Import de modèles
- `GUIDE_SUPPRESSION_OPERATIONS.md` : Suppression et annulation
- `GUIDE_RAPPORT_RECONCILIATION.md` : Rapports de réconciliation

---

## 🔄 17. ÉVOLUTIONS ET MAINTENANCE

### 17.1 Évolutions Prévues
- **Phase 2** : Réconciliations cross-devise avancées
- **Phase 3** : ML/IA pour détection d'anomalies
- **Phase 4** : Intégration APIs partenaires
- **Phase 5** : Dashboard temps réel

### 17.2 Maintenance
- **Corrections** : Correction des bugs
- **Améliorations** : Améliorations des performances
- **Sécurité** : Mises à jour de sécurité
- **Évolutions** : Nouvelles fonctionnalités

---

## 📊 18. MÉTRIQUES ET KPIs

### 18.1 Métriques Techniques
- **Temps de traitement** : < 5 min pour 100k lignes
- **Taux de succès** : > 99% des opérations
- **Disponibilité** : > 99.5% (HNO exclus)
- **Performance API** : p95 < 500ms

### 18.2 Métriques Métier
- **Taux de réconciliation** : % de transactions réconciliées
- **Temps de résolution** : Délai de résolution des écarts
- **Volume traité** : Nombre de transactions par jour
- **Qualité des données** : % de données valides

---

## 🎯 19. CRITÈRES D'ACCEPTATION

### 19.1 Fonctionnels
- ✅ Import de fichiers Excel/CSV fonctionnel
- ✅ Réconciliation automatique opérationnelle
- ✅ Gestion des écarts complète
- ✅ Exports CSV avec séparateur point-virgule
- ✅ Interface utilisateur intuitive et moderne

### 19.2 Techniques
- ✅ Performance conforme aux spécifications
- ✅ Sécurité des données assurée
- ✅ Traçabilité complète des opérations
- ✅ Sauvegardes automatisées
- ✅ Monitoring et alertes opérationnels

---

## 📞 20. SUPPORT ET MAINTENANCE

### 20.1 Support Technique
- **Équipe** : Équipe de développement Intouch Group
- **Contact** : yamar-ndao@intouchgroup.com
- **Disponibilité** : 8h-18h (jours ouvrés)
- **Escalade** : Procédures d'escalade définies

### 20.2 Maintenance
- **Préventive** : Maintenance planifiée
- **Corrective** : Correction des incidents
- **Évolutive** : Ajout de nouvelles fonctionnalités
- **Adaptative** : Adaptation aux changements

---

**Version du document** : 2.0  
**Date de création** : Janvier 2025  
**Auteur** : Yamar NDAO - Intouch Group  
**Statut** : Finalisé

---

*Ce cahier des charges constitue la référence complète pour le développement, la maintenance et l'évolution de l'Application de Réconciliation. Il doit être mis à jour régulièrement pour refléter les évolutions du système.*
