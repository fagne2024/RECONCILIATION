## Cahier des charges — Application de Réconciliation (Reconciliation App)

### 1. Contexte et objectifs
- **Contexte**: Application de réconciliation financière avec collecte de fichiers partenaires, intégration opérations bancaires, rapprochement, gestion d'écarts, exports, et reporting. Monorepo avec `reconciliation-app/backend` (Java) et `reconciliation-app/frontend` (Angular).
- **Objectifs**:
  - **Automatiser** l’ingestion et la réconciliation des transactions.
  - **Tracer** et **corriger** les écarts (frais, partenaires, montants, statuts).
  - **Fournir** des exports performants et paramétrables (CSV séparateur point-virgule).
  - **Sécuriser** les accès, journaliser et auditer les opérations.
  - **Industrialiser** le run (sauvegardes, monitoring, CI/CD).

### 2. Périmètre
- **Inclus**:
  - Collecte de fichiers (watch-folder, dépôts manuels, APIs partenaires si disponibles).
  - Ingestion, normalisation, classification PM/banque, stockage SQL.
  - Règles métiers de réconciliation, gestion des écarts et opérations correctives.
  - Interfaces UI pour recherche, filtres, actions en masse, popups de confirmation modernes.
  - Exports CSV (séparateur `;`), génération de rapports, statistiques (transaction_created_stats).
  - Sécurité, rôles, audit trail, chiffrement des secrets.
  - Observabilité (logs, métriques), sauvegardes BDD, restauration.
- **Hors périmètre** (phase 1):
  - Reconciliations cross-devise avancées.
  - ML/IA d’anomalies (placeholder pour phase ultérieure).

### 3. Parties prenantes
- **MOA / Métier**: Finance, Contrôle de gestion, Opérations.
- **MOE**: Équipe backend Java, équipe frontend Angular, DevOps.
- **Sécurité / Conformité**: RSSI/DPO.
- **Utilisateurs**: Opérateurs réconciliation, Superviseurs, Auditeurs.

### 4. Exigences fonctionnelles
4.1. Ingestion et normalisation
- Dépôt des fichiers dans `watch-folder` (xls/xlsx/csv) avec détection auto.
- Normalisation colonnes selon modèles référencés, gestion d’exceptions.
- Traçabilité: source, version du modèle, horodatage, checksum.

4.2. Réconciliation et règles métiers
- Classification PM selon règles du dépôt (`REGLE_CLASSIFICATION_PM.md`).
- Moteur de rapprochement configurable (clé(s) de match: référence, montant, date, partenaire, etc.).
- Gestion des écarts: frais, montants, manquants, doublons, statuts divergents.
- Notion d’“opérations bancaires automatiques” et scripts associés (cf. guides dans le repo).
- Principe d’“opérations inverses”: les opérations d’annulation sont préfixées par `annulation_` et appliquent l’impact inverse de l’opération d’origine.

4.3. Actions, corrections et annulations
- Actions unitaires et en masse sur sélections filtrées.
- Popups de confirmation modernes, claires, non bloquantes.
- Mécanisme d’annulation conforme à la règle ci-dessus (`annulation_...`).
- Historisation de toutes les actions avec identifiant utilisateur et justification.

4.4. Recherche, filtres et vues
- Filtres multi-critères (période, partenaire, statut, écart, montant, référence, etc.).
- Vues sauvegardées + favoris par utilisateur.
- Pagination et virtualisation pour grands volumes (>1M lignes côté export/test).

4.5. Export et reporting
- Export CSV avec séparateur `;` par défaut, encodage UTF-8, possibilité d’entête personnalisée.
- Gabarits d’export paramétrables par rôle/process.
- Rapports d’écarts, KPI journaliers/hebdo/mensuels, stats de créations de transactions.

4.6. UI/UX
- Front Angular moderne, réactif, support thème clair/sombre.
- Icônes: suppression en rouge, modification en vert (convention UI).
- Accessibilité: navigation clavier, contrastes, titres, aria-labels.
- Feedback utilisateur: toasts non intrusifs, loaders, états vides explicites.

### 5. Exigences non fonctionnelles
- **Performance**: import 100k lignes < 5 min; export 1M lignes en streaming; réponses API p95 < 500 ms pour requêtes standard.
- **Disponibilité**: 99.5% (HNO exclus), reprise après incident < 4h.
- **Sécurité**: AuthN/AuthZ par rôles, chiffrement secrets, traçabilité, principe du moindre privilège.
- **Scalabilité**: horizontale sur API et workers; files/queue si besoin.
- **Observabilité**: logs structurés, métriques techniques/métier, corrélation requête.
- **Compatibilité**: navigateurs modernes, fichiers Excel/CSV variés.

### 6. Architecture cible
- **Backend**: Java (Spring Boot), exposition REST, services de réconciliation, jobs planifiés.
- **Frontend**: Angular, services HTTP, composants modulaires, popups modernes.
- **Base de données**: SQL (schémas pour transactions, opérations bancaires, écarts, audit, modèles).
- **Stockage fichiers**: système de fichiers local `watch-folder` (évolution possible vers objet/Cloud). 
- **CI/CD**: build, tests, lint, déploiement; redémarrage auto du backend en dev.

### 7. Modèle de données (extrait)
- `transaction` (id, ref, montant, devise, partenaire, date, statut, source, hashLigne, createdAt, updatedAt)
- `operation_bancaire` (id, type, montant, date, refInterne, refExterne, metadata, createdAt)
- `ecart` (id, type, description, montant, statut, transactionId?, operationId?, createdAt, resolvedAt)
- `action` (id, type, userId, payload, justification, annulationDeActionId?, createdAt)
- `modele_import` (id, nom, version, mappingColonnes, regles, createdAt)
- `audit_log` (id, userId, action, objet, objetId, diff, createdAt)

### 8. Règles métiers clés
- Un écart “frais” est considéré résolu lorsqu’une opération de type correspondant est appliquée et validée.
- Les opérations d’annulation sont préfixées par `annulation_` et exécutent l’impact inverse sur soldes/écarts.
- Les exports par défaut utilisent le séparateur `;`.
- Les opérations en masse doivent valider les préconditions (statut éligible, droit utilisateur, verrouillage concurrentiel).

### 9. Sécurité et conformité
- Gestion des rôles: Opérateur, Superviseur, Auditeur, Admin.
- Journalisation complète des actions sensibles (lecture massive, export, suppression, annulation).
- Politique des mots de passe/SSO (si disponible), MFA (si requis), expiration de session.
- Protection des données personnelles (minimisation, rétention, purge planifiée si applicable).

### 10. Qualité, tests et acceptation
- **Tests unitaires** backend et frontend; **tests d’intégration** pour règles de réconciliation; **tests E2E** critiques.
- Jeux de données de référence et cas d’écarts (frais, doublons, manquants).
- Critères d’acceptation par fonctionnalité (exemples):
  - Ingestion: un fichier conforme est importé, lignes rejetées journalisées, KPIs remontés.
  - Réconciliation: transactions correspondantes matchées selon règles; faux positifs < seuil défini.
  - Écarts: création automatique cohérente; statut et résolution traçables.
  - Annulation: `annulation_xxx` ramène l’état au niveau précédent avec journal complet.
  - Export: fichier CSV `;` généré, encodage UTF-8, performance conforme.
  - UI: popups modernes, icônes couleur (rouge suppression, vert modification), navigation fluide.

### 11. Exploitation, run et observabilité
- **Backups** BDD planifiées (scripts existants), rétention et restauration testée.
- **Logs**: centralisation, niveaux, anonymisation si nécessaire.
- **Métriques**: taux d’écarts, délais résolution, volumes journaliers, latences.
- **Alerte**: seuils d’échec ingestion, pics d’écarts, erreurs critiques.
- **Redémarrage auto** en dev du backend à chaque changement, aligné avec le frontend.

### 12. Déploiement et environnements
- Environnements: Dev, Test/Préprod, Prod.
- CI/CD: build, tests, lint, migration BDD, déploiement. Rollback automatisé.
- Variables d’env: secrets stockés de manière sécurisée (vault, store chiffré).

### 13. UX détaillée (extraits)
- Listes: tri multi-colonnes, colonnes configurables, pagination/virtualisation.
- Popups: claires, responsives; confirmations pour actions destructrices.
- États: vide, chargement, erreur, succès; toasts avec actions rapides d’annulation quand pertinent.
- Icônes: suppression rouge, modification verte, cohérence sur tout `src/app/components`.

### 14. Gouvernance et gestion de versions
- Gestion des changements: PR avec description métier, checklist de tests, changelog.
- Messages de commit en français et significatifs.
- Documentation à jour (guides, modèles d’import/export, suppression/annulation).

### 15. Planning macro (indicatif)
- Semaine 1-2: cadrage détaillé, affinement des règles, préparation jeux de données.
- Semaine 3-6: implémentation ingestion + réconciliation + UI de base.
- Semaine 7-8: écarts, opérations, annulations, exports.
- Semaine 9: observabilité, sécurité, durcissements.
- Semaine 10: tests E2E, perfs, UAT, go/no-go.

### 16. Risques et mitigations
- Qualité des fichiers sources hétérogène → validations et modèles stricts + retours d’erreur.
- Volumétrie croissante → streaming, pagination, index BDD, batchs.
- Complexité des règles → paramétrage, tests de non-régression, journaux d’explication de match.

### 17. Annexes
- Références aux scripts et guides présents dans le repo (`GUIDE_*`, `*.ps1`, `*.md`).
- Modèles d’import (`watch-folder/models/`) et exemples de fichiers.
- Exemples d’exports et contrats d’API si exposés.

---
Ce document sert de base vivante. Les sections peuvent être détaillées davantage lors du cadrage fonctionnel détaillé et des ateliers de recette.


