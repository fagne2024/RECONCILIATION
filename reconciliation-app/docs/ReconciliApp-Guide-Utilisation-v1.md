---
title: ReconciliApp — Guide d'utilisation
subtitle: Réconciliation des transactions & Suivi des soldes
version: 1
date: 11 juin 2026
lang: fr
---

# ReconciliApp — Guide d'utilisation

**Réconciliation des transactions & Suivi des soldes**  
Plateforme métier Intouch — Angular 14 + Spring Boot

Ce document couvre :
1. Le guide complet de réconciliation et de suivi des soldes
2. Les parcours déclinés par rôle (opérateur, gestionnaire de soldes, administrateur)
3. Les aperçus visuels des écrans principaux

---

## Vue d'ensemble

ReconciliApp permet de :

1. **Réconcilier** les transactions entre le **Back Office (BO)** et les **fichiers partenaires**.
2. **Suivre les soldes** des comptes, les comparer au **solde BO**, et **traiter les écarts** jusqu'à régularisation.

```
Connexion → Réconciliation (BO ↔ Partenaire) → Résultats & écarts
         → Sauvegarde des écarts → Modules de traitement
         → Comptes / Relevés → Comparaison solde calculé vs solde BO
         → Pilotage (Dashboard, Statistiques)
```

---

## Partie 1 — Réconciliation

### 1.1 Lanceur de réconciliation

**Menu :** Réconciliation → `/reconciliation-launcher`

1. Déposer le **Fichier BO** et le **Fichier Partenaire** (CSV, XLS, XLSX).
2. Choisir un mode :
   - **Manuel** — sélection des colonnes clés par l'utilisateur
   - **Assisté** — suggestions automatiques avec validation
   - **Magique** — détection automatique et lancement immédiat
3. Lancer la réconciliation et suivre la progression.

### 1.2 Résultats

**Menu :** Résultats → `/results`

| Indicateur | Signification |
|------------|---------------|
| Transactions | Volume total traité |
| Correspondances | Présentes des deux côtés |
| Écarts BO | Uniquement côté BO |
| Écarts Partenaire | Uniquement côté partenaire |

### 1.3 Traitement des écarts

| Action | Destination |
|--------|-------------|
| Sauvegarder dans Ecart Solde | TSOP |
| Sauvegarder dans TRX SF | TRX SF |
| Sauvegarder dans Import OP | Impact OP |
| Créer OP | Opérations |

---

## Partie 2 — Suivi des soldes

### 2.1 Comptes

**Menu :** Comptes → `/comptes`

- Filtres : pays, code propriétaire, catégorie, type, dates
- **Soldes critiques** : ratio solde / volume moyen
- **Importer soldes BO** : format Date, Numéro de compte, Montant
- **Voir le relevé** : opérations, écarts, soldes journaliers

### 2.2 Modules de traitement

| Module | Route | Rôle |
|--------|-------|------|
| Écart de solde (TSOP) | `/ecart-solde` | Écarts impactant les soldes |
| Ecart régularisé (Impact OP) | `/impact-op` | Régularisation opérationnelle |
| TRX SF | `/trx-sf` | Transactions sans frais |

### 2.3 Opérations

Journal des mouvements avec solde avant / après : cashin, paiement, approvisionnement, compensation, frais, etc.

---

## Partie 3 — Par rôle

### Opérateur réconciliation

Modules : Réconciliation, Résultats, Statistiques, AIDE  
Parcours : Lanceur → Mode → Résultats → Export / sauvegarde écarts

### Gestionnaire de soldes

Modules : Comptes, Opérations, Suivi des écarts, Banque, Prédictions  
Parcours : Comptes → Relevé → Comparaison solde BO → Traitement TSOP / Impact OP

### Administrateur

Modules : Paramètre (utilisateurs, profils, modules, permissions, logs, 2FA), Modèles de Traitement  
Parcours : Configuration des droits, modèles auto-processing, sécurité

---

## Glossaire

| Terme | Définition |
|-------|------------|
| BO | Back Office — source interne |
| Partenaire | Fichier opérateur tiers |
| Écart BO | Transaction uniquement côté BO |
| Écart Partenaire | Transaction uniquement côté partenaire |
| Solde BO | Solde de clôture issu du back office |
| TSOP | Suivi des écarts de solde |
| TRX SF | Transactions sans frais |
| Impact OP | Impacts opérationnels / écarts régularisés |

---

*Document généré pour ReconciliApp — Groupe Intouch — v1 — juin 2026*
