---
title: ReconciliApp — Cahier des charges
version: 1
date: 11 juin 2026
statut: Aligné sur l'application en production (état du code)
lang: fr
---

# ReconciliApp — Cahier des charges fonctionnel et technique

**Application de réconciliation transactionnelle et suivi des soldes**  
**Éditeur / commanditaire :** Groupe Intouch  
**Document :** v1 — juin 2026  
**Périmètre :** `reconciliation-app` (frontend Angular + backend Spring Boot)

> Ce document décrit le **comportement réel** de l'application telle qu'implémentée dans le dépôt source. Il sert de référence pour l'exploitation, l'évolution et l'onboarding des équipes.

---

## Table des matières

1. [Contexte et problématique](#1-contexte-et-problématique)
2. [Objectifs](#2-objectifs)
3. [Périmètre et hors périmètre](#3-périmètre-et-hors-périmètre)
4. [Acteurs et rôles](#4-acteurs-et-rôles)
5. [Architecture générale](#5-architecture-générale)
6. [Exigences fonctionnelles par module](#6-exigences-fonctionnelles-par-module)
7. [Workflows métier détaillés](#7-workflows-métier-détaillés)
8. [Interfaces, imports et exports](#8-interfaces-imports-et-exports)
9. [Sécurité et conformité](#9-sécurité-et-conformité)
10. [Exigences techniques et non fonctionnelles](#10-exigences-techniques-et-non-fonctionnelles)
11. [Modèle de données (synthèse)](#11-modèle-de-données-synthèse)
12. [Matrice routes / modules / permissions](#12-matrice-routes--modules--permissions)
13. [Écarts connus et dette technique](#13-écarts-connus-et-dette-technique)
14. [Annexes](#14-annexes)

---

## 1. Contexte et problématique

Intouch exploite des réseaux de distribution de services financiers (mobile money, paiements, cash-in/cash-out) dans plusieurs pays d'Afrique. Chaque jour, des volumes importants de transactions doivent être rapprochés entre :

- le **Back Office (BO)** — systèmes internes Intouch ;
- les **fichiers partenaires** — opérateurs tiers (Orange Money, MTN, etc.).

Parallèlement, les **soldes de comptes** (agences, services, banques) doivent être suivis, comparés aux soldes BO et régularisés lorsque des écarts sont détectés.

**ReconciliApp** (nom d'interface : *Réconciliation*) centralise ce cycle : import, réconciliation, analyse des écarts, suivi des soldes, opérations, pilotage et administration des droits.

---

## 2. Objectifs

| # | Objectif | Indicateur de réalisation |
|---|----------|---------------------------|
| O1 | Réconcilier automatiquement ou manuellement les fichiers BO et Partenaire | Module Réconciliation, 3 modes, API `/api/reconciliation` |
| O2 | Identifier et classer les écarts (BO seul, Partenaire seul) | Écrans Résultats, exports, rapports |
| O3 | Traiter et suivre les écarts jusqu'à régularisation | TSOP, Impact OP, TRX SF, Opérations |
| O4 | Suivre les soldes et les comparer au solde BO | Module Comptes, relevés, import soldes BO |
| O5 | Piloter l'activité multi-pays | Dashboard, Statistiques, Classements |
| O6 | Automatiser le pré-traitement des fichiers | Modèles de traitement, file watcher |
| O7 | Sécuriser l'accès et tracer les actions | JWT, 2FA, profils, journal utilisateur |
| O8 | Documenter les procédures métier | AIDE, SOP, Guide d'utilisation |

---

## 3. Périmètre et hors périmètre

### 3.1 Dans le périmètre (implémenté)

- Authentification (login, 2FA TOTP, mot de passe oublié par email)
- Réconciliation BO ↔ Partenaire (manuel, assisté, magique)
- Résultats, rapports, tableaux de bord réconciliation
- Gestion des comptes et soldes (relevés, soldes BO, soldes critiques, prédictions)
- Opérations compte (CRUD, import, workflow validation)
- Suivi des écarts : TSOP, Impact OP, TRX SF
- Banque (opérations bancaires, relevés, rapprochement)
- Frais transaction, commissions (partiel)
- Traitement de fichiers (fusion, dédoublonnage, formatage)
- Modèles de traitement automatique
- Administration : utilisateurs, profils, modules, permissions, logs, 2FA
- Aide et documentation intégrée (SOP, guides uploadables)

### 3.2 Hors périmètre ou non implémenté

| Élément | État |
|---------|------|
| Module **Comptabilité** (`/comptabilite`) | Page placeholder — « fonctionnalités à venir » |
| Menu **Charge** (sidebar) | Entrée menu sans route Angular déclarée |
| Réconciliation 1-N (types 1-2 à 1-5) | Support backend ; UI force le mode **1-1** |
| BudgetSync | Produit distinct (doc séparé dans `docs/`) |
| Intégration API partenaires temps réel | Non présente — traitement par fichiers |

---

## 4. Acteurs et rôles

### 4.1 Acteurs

| Acteur | Description |
|--------|-------------|
| **Opérateur réconciliation** | Lance les réconciliations, analyse les résultats, transfère les écarts |
| **Gestionnaire de soldes** | Gère les comptes, importe les soldes BO, traite TSOP / Impact OP |
| **Responsable banque** | Opérations bancaires, relevés, rapprochement banque/BO |
| **Contrôleur / FP&A** | Consulte statistiques, classements, rapports |
| **Administrateur système** | Utilisateurs, profils, permissions, 2FA, modèles |
| **Auditeur** | Consulte le journal utilisateur et les rapports |

### 4.2 Modèle RBAC (Role-Based Access Control)

Trois niveaux d'autorisation :

1. **Profil** (`ProfilEntity`) — rôle métier nommé (ex. ADMIN, Default)
2. **Module** (`ModuleEntity`) — périmètre fonctionnel (ex. `Réconciliation`, `Comptes`, `TSOP`)
3. **Permission** (`PermissionEntity`) — action (ex. `consulter`, `filtrer`, `lancer_reconciliation`, `importer_operations`)

Associations :
- `ProfilPermissionEntity` : profil ↔ module ↔ permission
- `ProfilPaysEntity` : restriction géographique par pays (option GNL = tous pays)

**Administrateur** : utilisateur `admin` OU profil `ADMIN` / `ADMINISTRATEUR` → accès total (bypass des guards module).

### 4.3 Guards frontend

| Guard | Règle |
|-------|-------|
| `AuthGuard` | JWT + username + droits en `localStorage` |
| `AdminGuard` | Profil admin ou username `admin` |
| `ModuleAccessGuard` | Module + permissions requises (`route.data`) ; admin bypass |

---

## 5. Architecture générale

```
┌─────────────────────────────────────────────────────────────┐
│  Navigateur (HTTPS)                                         │
│  Angular 14 SPA — port 4200                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │ Sidebar     │  │ Guards       │  │ Services / API HTTP │ │
│  │ (menu RBAC) │  │ Auth/Module  │  │ AuthInterceptor     │ │
│  └─────────────┘  └──────────────┘  └──────────┬──────────┘ │
└────────────────────────────────────────────────┼────────────┘
                                                 │ /api/**
                                                 ▼
┌─────────────────────────────────────────────────────────────┐
│  Spring Boot 3.2 — port 8443 (HTTPS, JKS)                   │
│  Controllers REST │ Services │ JPA │ JWT Filter │ Permissions│
└────────────────────────────────────────────────┼────────────┘
                                                 │
                                                 ▼
                                        MySQL 8 — schéma `top20`
```

| Couche | Technologie |
|--------|-------------|
| Frontend | Angular 14.2, Angular Material 14, Chart.js, PapaParse, ExcelJS, XLSX |
| Backend | Spring Boot 3.2.3, Java 17, Spring Data JPA, Spring Security |
| Base de données | MySQL 8.0.33 |
| Auth | JWT (jjwt 0.12), BCrypt, TOTP (Google Authenticator) |
| Fichiers | Apache POI 5.2, Commons CSV |
| Cache | Caffeine (modèles auto-processing) |

---

## 6. Exigences fonctionnelles par module

### 6.1 Tableau de bord (`Dashboard`)

- **Route :** `/dashboard`
- **Module :** `Dashboard` — permissions `consulter`, `filtrer`
- **Fonctions :**
  - KPI : réconciliations, fichiers traités, activité du jour
  - État des réconciliations par pays / service / environnement (BET, etc.)
  - Métriques rapides, graphiques (Chart.js)
  - Filtres agence, service, pays, période
  - Export XLSX et PDF
  - Liens vers statistiques et référentiel services
- **API :** `/api/statistics/*`, `/api/result8rec/filters`, `/api/service-references/dashboard`

### 6.2 Réconciliation

| Route | Fonction |
|-------|----------|
| `/reconciliation-launcher` | Point d'entrée — upload BO + Partenaire, choix du mode |
| `/column-selection` | Sélection des colonnes clés (manuel / assisté) |
| `/reconciliation` | Exécution et progression |
| `/upload` | Interface d'upload alternative (legacy) |

- **Module :** `Réconciliation` — permission `consulter`
- **Formats acceptés :** CSV, XLS, XLSX
- **Modes :**
  - **Manuel** — sélection colonnes, filtres agences/services/statuts
  - **Assisté** — analyse automatique des clés (`/api/reconciliation/analyze-keys`), validation utilisateur
  - **Magique** — exécution asynchrone (`/api/reconciliation/execute-magic`), suivi par `jobId`
- **API :** `/api/reconciliation` — `reconcile`, `upload`, `execute-magic`, `analyze-keys`, `progress`, `results/*`, `mark-ok`, `status`, `save-summary`
- **Verrouillage :** un seul job magique concurrent (`ReconciliationLockService`, HTTP 429 si occupé)

### 6.3 Résultats et rapports

| Route | Fonction |
|-------|----------|
| `/results` | Synthèse : correspondances, écarts BO, écarts Partenaire |
| `/matches` | Détail des correspondances |
| `/ecart-bo` | Écarts BO — sauvegarde vers TSOP / TRX SF / Impact OP |
| `/ecart-partner` | Écarts Partenaire — Créer OP, Import OP |
| `/reconciliation-report` | Rapport éditable (statut, traitement, GLPI) |
| `/rapport-reconciliation-bo-partenaire` | Rapport comparatif BO/Partenaire |
| `/report-dashboard` | Tableau de bord des rapports |
| `/reconciliation-dashboard` | Dashboard réconciliation |
| `/reconciliation-global-preview` | Aperçu global |
| `/ecart-bo-summary` | Synthèse écarts BO avec liaisons statut |

- **Module :** `Résultats` — permission `consulter`
- **Actions sur écarts :** Sauvegarder dans Ecart Solde, TRX SF, Import OP ; Créer OP ; Exporter Excel
- **Persistance :** `Result8RecEntity`, `AgencySummaryEntity`, `ReconciliationOkEntity`, `ReconciliationStatusEntity`

### 6.4 Statistiques et classements

| Route | Module | Fonction |
|-------|--------|----------|
| `/stats` | Statistiques | Statistiques générales |
| `/stats-report` | Statistiques | Rapport statistiques |
| `/stats-report-graph` | Statistiques | Graphiques |
| `/agency-summary` | Statistiques | Synthèse par agence |
| `/ranking` | Classements | Classements pays / agences / services |

### 6.5 Comptes et soldes

| Route | Fonction |
|-------|----------|
| `/comptes` | Liste comptes, filtres, soldes critiques, import soldes BO |
| `/service-balance` | Fusion de comptes service/agence par pays |
| `/service-references` | Référentiel services (lié Dashboard) |
| `/redevance-loterie` | Calcul redevance loterie |
| `/predictions` | Prédictions d'approvisionnement / compensation |

- **Module :** `Comptes`
- **Fonctions clés :**
  - CRUD comptes (numéro, solde, pays, type TOP20/B2B/G&I, catégorie Client/Service/Banque/Comptable)
  - Relevé de compte (modal) : opérations, écarts solde, impact OP, soldes journaliers
  - Comparaison solde calculé vs **solde BO** (code couleur vert/rouge)
  - Import masse soldes BO : format `Date`, `Numéro de compte`, `Montant`
  - Soldes critiques : ratio solde / volume moyen sur période configurable
  - Export Excel
- **API :** `/api/comptes`, `/api/compte-solde-bo`, `/api/compte-solde-cloture`, `/api/service-balance`, `/api/predictions`, `/api/redevance`

### 6.6 Opérations

- **Route :** `/operations`
- **Module :** `Opérations`
- **Types d'opération :** `total_cashin`, `total_paiement`, `Appro_client`, `Compense_client`, `FRAIS_TRANSACTION`, `transaction_cree`, `annulation_bo`, `tsop`, `ajustement`, etc.
- **Fonctions :** CRUD, filtres avancés, import XLSX (`/upload`), template, validation/rejet/annulation, stats par type, impact solde (`soldeAvant` / `soldeApres`)
- **API :** `/api/operations`

### 6.7 Suivi des écarts

Sous-menu **Suivi des écarts** :

| Route | Libellé UI | Module | Workflow |
|-------|------------|--------|----------|
| `/ecart-solde` | Écart de solde | TSOP | Import → Valider → Uploader ; statuts `EN_ATTENTE` → `TRAITE` / `ERREUR` |
| `/impact-op` | Écart régularisé | Impact OP | Impacts opérationnels ; Créer OP ; types compensation/appro/nivellement |
| `/trx-sf` | TRX SF | TRX SF | Transactions sans frais ; import 8 ou 2 colonnes ; calcul frais |

- **Route complémentaire :** `/suivi-des-ecarts` (vue consolidée, AuthGuard seul)
- **API :** `/api/ecart-solde`, `/api/impact-op`, `/api/trx-sf`, `/api/suivi-ecart`
- **Règle métier :** changement de statut avec **commentaire obligatoire**

### 6.8 Banque

| Route | Fonction |
|-------|----------|
| `/banque` | Opérations bancaires, comptes banque, relevés |
| `/banque-dashboard` | Taux de correspondance Banque vs BO |

- **Module :** `BANQUE`
- **Types :** Compensation Client, Approvisionnement, Nivellement, Virement, etc.
- **Statuts :** Validée, En attente, Rejetée, En cours
- **API :** `/api/operations-bancaires`, `/api/releve-bancaire`

### 6.9 Frais et commissions

| Route | Module guard | État |
|-------|--------------|------|
| `/frais` | `Frais` | Frais transaction — calcul, export, corrections |
| `/commission` | AuthGuard seul | Pas de guard module dédié |
| Menu Charge | `Charge` | **Route non déclarée** dans le routage |

- **API :** `/api/frais-transaction`

### 6.10 Traitement de fichiers

- **Route :** `/traitement`
- **Module :** `Traitement`
- **Fonctions :** import CSV/XLS/XLSX, fusion multi-fichiers, dédoublonnage, formatage colonnes, filtres, concaténation, export CSV/XLS/XLSX (ExcelJS), conversion XLS→XLSX via `/api/conversion/xls-to-xlsx`
- **Limite stockage local :** < 10 000 lignes, < 1 Mo (`localStorage`)

### 6.11 Modèles de traitement automatique

- **Route :** `/auto-processing-models`
- **Module :** `Modèles`
- **Fonctions :** CRUD modèles (pattern fichier, type BO/PARTNER/BOTH, clés réconciliation JSON, règles colonnes), application automatique, file watcher (`../watch-folder`)
- **API :** `/api/auto-processing/models`, `/api/model-management`, `/api/file-watcher`

### 6.12 Comptabilité

- **Route :** `/comptabilite`
- **Module :** `Comptabilité`
- **État :** placeholder — aucune API métier dédiée

### 6.13 Aide et documentation

| Route | Accès | Contenu |
|-------|-------|---------|
| `/aide` | AuthGuard | Hub SOP Opération, SOP Réconciliation TRX, SOP Banque |
| `/guide-utilisation` | AuthGuard | Arborescence guides uploadables |
| `/sop-operation` | AuthGuard | Procédures opérationnelles |
| `/sop-reconciliation-trx` | AuthGuard | Procédures réconciliation |

- **API :** `/api/aide`, `/api/guide-nodes`, `/api/guide-documents`, `/api/sop-nodes`, `/api/sop-documents`

### 6.14 Administration

| Route | Fonction | Guard |
|-------|----------|-------|
| `/users` | CRUD utilisateurs | AdminGuard |
| `/profils` | Profils + droits + pays | AdminGuard |
| `/modules` | Modules applicatifs | AdminGuard |
| `/permissions` | Permissions + génération auto depuis code | AdminGuard |
| `/log-utilisateur` | Journal d'activité | AdminGuard |
| `/two-factor-auth` | Gestion 2FA utilisateurs | AdminGuard |
| `/user-profile` | Profil personnel, mot de passe | AuthGuard |

---

## 7. Workflows métier détaillés

### 7.1 Réconciliation — mode Manuel

```
Upload BO + Partenaire
    → Filtres (agences, services, statuts BO / Partenaire)
    → /column-selection : choix colonnes clés et comparaison
    → POST /api/reconciliation/reconcile
    → /results : KPI + navigation écarts
    → Sauvegarde écarts → TSOP / TRX SF / Impact OP
    → Export Excel / Rapports
```

### 7.2 Réconciliation — mode Assisté

```
Upload fichiers
    → POST /api/reconciliation/analyze-keys (suggestions colonnes)
    → Validation utilisateur
    → POST /api/reconciliation/reconcile
    → /results
```

### 7.3 Réconciliation — mode Magique

```
Upload fichiers
    → POST /api/reconciliation/execute-magic → jobId
    → Polling GET /api/reconciliation/progress?sessionId={jobId}
    → Redirection /results à la fin
    → En cas d'échec : basculer vers Assisté ou Manuel
```

### 7.4 Suivi des soldes — cycle quotidien

```
Import / saisie soldes BO (Comptes)
    → Consultation relevés (opérations, soldes avant/après)
    → Détection écarts (solde calculé ≠ solde BO)
    → Traitement TSOP (écarts de solde)
    → Traitement Impact OP (régularisation partenaire)
    → Vérification opérations générées
    → Dashboard / export reporting
```

### 7.5 Traitement d'un écart TSOP

```
Alimentation : réconciliation (Sauvegarder Ecart Solde) ou import fichier
    → Validation fichier (lignes valides, doublons, erreurs)
    → Upload en base
    → Filtre statut EN_ATTENTE
    → Passage TRAITE ou ERREUR + commentaire obligatoire
    → Export Excel
```

---

## 8. Interfaces, imports et exports

### 8.1 Formats d'import

| Domaine | Formats | Point d'entrée |
|---------|---------|----------------|
| Réconciliation | CSV, XLS, XLSX | Lanceur, `/upload` |
| Soldes BO | CSV, XLS, XLSX (`Date`, `N° compte`, `Montant`) | Comptes |
| Opérations | XLSX (template) | `/api/operations/upload` |
| Opérations bancaires | XLSX | `/api/operations-bancaires/upload` |
| Relevé bancaire | XLSX | `/api/releve-bancaire/upload` |
| TSOP, Impact OP, TRX SF | CSV, XLS, XLSX | Modules respectifs |
| Suivi écarts | Fichier structuré | `/api/suivi-ecart/upload` |
| Traitement | CSV, XLS, XLSX | Frontend uniquement |

### 8.2 Formats d'export

| Domaine | Format | Mécanisme |
|---------|--------|-----------|
| Résultats réconciliation | XLSX multi-feuilles | ExcelJS (frontend) |
| Comptes / relevés | XLSX | ExcelJS |
| Rapports | XLSX, PDF | ExcelJS, jsPDF + html2canvas |
| Impact OP, agency summary, frais | XLSX | API backend (Apache POI) |
| Templates import | XLSX | API backend |

### 8.3 Intégrations externes

| Système | Usage |
|---------|-------|
| SMTP (Office 365) | Mot de passe oublié, notifications |
| Google Authenticator (TOTP) | Authentification 2FA |
| GLPI | Champ `glpiId` dans rapports réconciliation |
| Systèmes partenaires | **Fichiers plats uniquement** (pas d'API temps réel) |

---

## 9. Sécurité et conformité

### 9.1 Authentification

1. `POST /api/auth/login` — username / password (BCrypt)
2. Si 2FA activé : `requires2FA=true` → `POST /api/auth/verify-2fa` (code 6 chiffres)
3. JWT HS256, expiration **24 h** (`jwt.expiration=86400000`)
4. Stockage client : `localStorage` (`auth_token`, `userRights`, `username`)
5. `AuthInterceptor` : header `Authorization: Bearer {token}` sur chaque requête HTTP

### 9.2 Autorisation

- **Frontend :** guards + menu conditionnel `isMenuAllowed(module)`
- **Backend :** `PermissionInterceptor` + `PermissionCheckService` (headers `X-Permission-Module`, `X-Permission-Action`)
- **Admin :** bypass total des contrôles module

### 9.3 Mesures complémentaires

- Rate limiting : 120 req/min, 2000 req/h par utilisateur
- HTTPS obligatoire (backend 8443, frontend 4200)
- En-têtes sécurité : HSTS, CSP, X-Frame-Options DENY
- Journalisation : `UserLoggingInterceptor` → table `user_log`
- Migration automatique mots de passe clair → BCrypt à la connexion

### 9.4 Point d'attention sécurité

> **`SecurityConfig` : tous les endpoints `/api/**` sont en `permitAll()`** (configuration actuelle documentée comme temporaire dev). La protection repose sur `PermissionInterceptor` et le frontend, pas sur le filtre Spring Security en deny-by-default. **À corriger en production.**

---

## 10. Exigences techniques et non fonctionnelles

### 10.1 Volumétrie et performance

| Paramètre | Valeur |
|-----------|--------|
| Taille max fichier upload | 3 Go (`multipart.max-file-size`) |
| Timeout connexion HTTP | 30 min |
| Cible volumétrie réconciliation | ~700 000 lignes |
| Batch Hibernate | 2 000 entités |
| Cache modèles auto | Caffeine, 10 min, max 100 entrées |

### 10.2 Disponibilité et déploiement

- Backend : Spring Boot JAR, port **8443** HTTPS (keystore JKS `C:/Certs/reconciliation/`)
- Frontend : `ng serve` ou build statique, port **4200** HTTPS
- Proxy dev : `/api` → `https://localhost:8443`
- Base MySQL : schéma `top20`, `ddl-auto=update`

### 10.3 Traçabilité

- Logs applicatifs : niveau DEBUG (`com.reconciliation`)
- Journal utilisateur : connexion, déconnexion, navigation, actions API
- Audit réconciliation : `Result8RecAuditEntity`

### 10.4 Jobs asynchrones

| Job | Mécanisme |
|-----|-----------|
| Réconciliation magique | `CompletableFuture` + table `reconciliation_jobs` |
| Progression | Polling frontend + `ReconciliationProgressService` |
| Verrous | `ReconciliationLock` + nettoyage planifié (@Scheduled 5 min) |
| File watcher | Surveillance dossier filesystem |

---

## 11. Modèle de données (synthèse)

### Entités principales

| Domaine | Entités |
|---------|---------|
| Sécurité | `UserEntity`, `ProfilEntity`, `ModuleEntity`, `PermissionEntity`, `ProfilPermissionEntity`, `ProfilPaysEntity` |
| Comptes | `CompteEntity`, `CompteSoldeBoEntity`, `CompteSoldeClotureEntity`, `CompteRegroupementEntity` |
| Opérations | `OperationEntity`, `OperationBancaireEntity` |
| Écarts | `EcartSoldeEntity`, `ImpactOPEntity`, `TrxSfEntity`, `SuiviEcartEntity` |
| Réconciliation | `Result8RecEntity`, `AgencySummaryEntity`, `EcartBoSummaryEntity`, `ReconciliationJob`, `ReconciliationOkEntity`, `ReconciliationStatusEntity` |
| Référentiels | `PaysEntity`, `ServiceReferenceEntity`, `FraisTransactionEntity`, `AutoProcessingModel` |
| Banque | `ReleveBancaireEntity`, `ReleveManualEntity` |
| Documentation | `GuideNodeEntity`, `GuideDocumentEntity`, `SopNodeEntity`, `SopDocumentEntity` |
| Audit | `UserLogEntity`, `Result8RecAuditEntity` |

### Contrôleurs REST (43)

`AuthController`, `ReconciliationController`, `CompteController`, `OperationController`, `EcartSoldeController`, `ImpactOPController`, `TrxSfController`, `StatisticsController`, `RankingController`, `FraisTransactionController`, `OperationBancaireController`, `ReleveBancaireController`, `AutoProcessingController`, `ProfilController`, `UserController`, `TwoFactorAuthController`, `UserLogController`, et autres (voir annexe).

---

## 12. Matrice routes / modules / permissions

| Module | Routes principales | Permission minimale |
|--------|-------------------|---------------------|
| Dashboard | `/dashboard`, `/service-references` | `consulter`, `filtrer` |
| Réconciliation | `/reconciliation-launcher`, `/reconciliation`, `/upload`, `/column-selection` | `consulter` |
| Résultats | `/results`, `/matches`, `/ecart-bo`, `/ecart-partner`, `/reconciliation-report`, `/report-dashboard`, `/ecart-bo-summary`, etc. | `consulter` |
| Statistiques | `/stats`, `/stats-report`, `/stats-report-graph`, `/agency-summary` | `consulter` |
| Classements | `/ranking` | `consulter` |
| Comptes | `/comptes`, `/service-balance`, `/redevance-loterie`, `/predictions` | `consulter` |
| Opérations | `/operations` | `consulter` |
| Frais | `/frais` | `consulter` |
| TSOP | `/ecart-solde` | `consulter` |
| Impact OP | `/impact-op` | `consulter` |
| TRX SF | `/trx-sf` | `consulter` |
| BANQUE | `/banque`, `/banque-dashboard` | `consulter` |
| Comptabilité | `/comptabilite` | `consulter` |
| Modèles | `/auto-processing-models` | `consulter` |
| Traitement | `/traitement` | `consulter` |
| Admin | `/users`, `/profils`, `/modules`, `/permissions`, `/log-utilisateur`, `/two-factor-auth` | AdminGuard |
| Hors module | `/login`, `/aide`, `/user-profile`, `/commission`, SOP, Guide, `/suivi-des-ecarts` | AuthGuard ou public |

---

## 13. Écarts connus et dette technique

| # | Écart | Priorité suggérée |
|---|-------|-------------------|
| E1 | `SecurityConfig` : `permitAll()` sur `/api/**` | **Haute** — production |
| E2 | Module Comptabilité non implémenté | Moyenne |
| E3 | Route `/charge` absente du routage | Moyenne |
| E4 | Réconciliation 1-N désactivée côté UI | Basse |
| E5 | Commission sans `ModuleAccessGuard` | Moyenne |
| E6 | Secrets en clair dans `application.properties` (mail, SSL) | Haute |
| E7 | `ddl-auto=update` sans Flyway/Liquibase formel | Moyenne |
| E8 | Admin par défaut `admin/admin` si BDD vide | Haute — production |
| E9 | Mots de passe migration clair→BCrypt encore possible | Basse |

---

## 14. Annexes

### A. Documents associés (dossier `docs/`)

| Fichier | Description |
|---------|-------------|
| `ReconciliApp-Guide-Utilisation-v1.pdf` | Guide utilisateur avec captures d'écran |
| `ReconciliApp-Guide-Utilisation-v1.md` | Source Markdown du guide |
| `generate-guide-utilisation-pdf.mjs` | Script génération PDF guide |
| `capture-screenshots.mjs` | Script captures Playwright |
| `BudgetSync-Apercu-Pages-UI-v1.md` | **Produit distinct** — ne pas confondre |

### B. Commandes utiles

```bash
# Frontend (HTTPS)
cd frontend && npm run start

# Frontend (HTTP dev)
cd frontend && npm run start-http

# Backend
cd backend && mvn spring-boot:run

# Régénérer guide PDF
cd docs && npm run pdf:guide:full
```

### C. Glossaire

| Terme | Définition |
|-------|------------|
| BO | Back Office — source interne Intouch |
| Partenaire | Fichier opérateur tiers |
| TSOP | Module écarts de solde |
| TRX SF | Transactions sans frais |
| Impact OP | Impacts opérationnels / écarts régularisés |
| CLE | Colonne de réconciliation privilégiée |
| Solde BO | Solde de clôture issu du back office |
| ENV | Environnement de réconciliation (ex. BET) |

---

*Document généré par analyse du code source — ReconciliApp v1.0.0 — Groupe Intouch — juin 2026 — Confidentiel*
