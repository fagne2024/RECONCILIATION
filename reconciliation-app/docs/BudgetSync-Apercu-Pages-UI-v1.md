---
title: BudgetSync — Aperçu des pages UI
subtitle: Plateforme de Suivi Budgétaire — Filiales Intouch — Spécification technique v2.0 (réf.)
version: 1
date: 28 avril 2026
lang: fr
---

# BudgetSync — Aperçu des pages et du design

**Plateforme de Suivi Budgétaire — Filiales Intouch**  
**Architecture ERP modulaire** — Stack cible : Spring Boot 3.x · Angular 17+ · PrimeNG · Keycloak  

Ce document présente un **aperçu des écrans** et de la **charte visuelle** avant développement, aligné sur le cahier des charges v2 (juin 2026) et les maquettes Groupe Intouch.

---

## 1. Principe de navigation

Deux grandes zones :

| Zone | Rôle |
|------|------|
| **Hors connexion / SSO** | Point d’entrée OAuth2 / OpenID Connect (redirect Keycloak). |
| **Application authentifiée** | Shell unique : **sidebar** (navy), **bandeau haut**, **fil d’Ariane**, **zone de contenu** (fond gris clair `#F8F9FA`). |

Les libellés exacts des entrées de menu (ex. « Frais » vs « Charges », « Signalement » vs « Reporting ») sont à figer une fois pour les fichiers de traductions (FR / EN).

---

## 2. Inventaire des pages

### A. Entrée et authentification

| ID (spec) | Page | Rôle utilisateur |
|-----------|------|------------------|
| **E01** | Connexion / redirect SSO | Tous |
| *(optionnel)* | Mot de passe oublié | Si processus hors Keycloak uniquement |

**Contenu UI type (maquettes)** : panneau gauche marque (Touch Point / Groupe Intouch), texte marketing (serif), pagination type carousel ; panneau droit formulaire email / mot de passe, « Se souvenir de moi », lien MDP oublié (accent bordeaux), bouton primaire navy, séparateur « ou », bouton **Connexion via SSO Intouch (Keycloak)** avec bordure.

---

### B. Tableau de bord

| ID | Page | Contenu principal |
|----|------|-------------------|
| **E02** | Tableau de bord FP&A (ou RAF / Pays selon rôle) | Cartes KPI (budget groupe, complétion, écart CEO/pays, budget validé), graphique à barres par pays, liste statut par filiale, carte progression des modules (Revenus, Salaires, Charges, CoS) |

**Bandeau** : titre, badge exercice (ex. 2026), sélecteur pays / périmètre, icône notifications.

---

### C. Modules budgétaires

| ID | Page | Notes design |
|----|------|--------------|
| **E03** | Gestion des revenus (liste + édition) | Quatre cartes KPI (N-1, PDG, Pays, Final), bannière d’alerte si écart > seuil, filtres (pays, BU, services, modes), tableau avec colonnes métier, pagination serveur |
| **E04** | Mensualisation revenus | 12 champs coefficients, graphique synchronisé, validation somme = 100 % |
| **E05** | Variables métier (Mode 1) | Formulaire à quatre variables + prévisualisation de la formule |
| **E06** | Marché adressable (Mode 2) | TAM, pénétration, date, profil de montée en charge |
| **E07** | Salaires (collaborateurs) | CRUD + import Excel, indicateur de progression batch |
| **E08** | Autres charges | Par catégorie, ventilation mensuelle (accordéon / aperçu) |
| **E09** | Cost of Sales | Tableau calculé vs ajusté, info-bulles sur les taux, recalcul global (selon rôle) |

**Éléments communs** : sidebar avec bloc **PHASE ACTIVE** (ex. P2 — Budget pays), menu groupé PRINCIPAL / ANALYSE / ADMIN, profil utilisateur en pied de sidebar.

---

### D. Analyse et exports

| ID | Page | Contenu |
|----|--------|---------|
| **E14** | Reporting / consolidation | Graphiques multi-pays, exports selon droits |
| **E13** | Import / export | Téléchargement de modèles, upload, suivi de traitement (SSE) |

---

### E. Administration

| ID | Page | Rôle |
|----|------|------|
| **E10** | Phases (workflow) | Étapes, complétudes, transitions avec confirmation |
| **E11** | Utilisateurs | CRUD via Keycloak (API proxifiée), rôles, pays, BU |
| **E12** | Paramétrage | Taux charges, taux CoS, référentiels pays / BU / produits |
| **E15** | Journal d’audit | Tableau filtrable, export CSV |

---

## 3. Arborescence logique des écrans

```
Public
└── Connexion / SSO Keycloak

Application (AppShell commun)
├── Tableau de bord
├── Revenus
│   ├── Liste / grille principale
│   ├── Mensualisation
│   ├── Variables métier (Mode 1)
│   └── Marché adressable (Mode 2)
├── Salaires
├── Charges (autres charges)
├── Cost of Sales
├── Reporting — Consolidation
├── Import — Export
└── Administration
    ├── Phases
    ├── Utilisateurs
    ├── Paramétrage
    └── Audit log
```

Les sous-pages **Revenus** peuvent être des **routes enfants** du module `revenus` pour une navigation cohérente.

---

## 4. Design system — synthèse

| Élément | Recommandation |
|---------|----------------|
| Couleurs | Navy **≈ `#1E3A5F`** ou **`#1a2233`** (sidebar, boutons primaires) ; accent **bordeaux ≈ `#C41E3A`** ; succès **`#28A745`** ; alertes **≈ `#DC3545`** ; fond **`#F8F9FA`**. |
| Typographie | Titres : serif (ex. Playfair Display, Merriweather). Corps et UI : sans serif (Inter, Roboto, Open Sans). |
| Composants UI | PrimeNG : layout + `Card`, `Table`, `Chart`, `ProgressBar`, `Badge`, `Toast`, `Dialog`, `FileUpload`. |
| Icônes | PrimeIcons (aligné stack Angular / PrimeNG). |

Référence charte spec §5.3 ; affinage possible avec logo Touch Point (cercles bleu marine / bordeaux).

---

## 5. Synthèse

- **Environ 12 à 18 écrans routables** selon le découpage des sous-routes.
- **Un layout unique** réutilisable (sidebar + header + breadcrumbs).
- **Une page login** dédiée (split screen).
- **Patterns récurrents** : rangée KPI → filtres → tableau ; formulaires métier avec validation synchrone Angular + Bean Validation côté API.

---

*Document préparatoire au développement — BudgetSync · Groupe Intouch · Confidentiel*
