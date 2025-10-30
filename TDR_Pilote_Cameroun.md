### TDR – Pilote pays pour le déploiement de l’outil

- **Projet**: Pilote national de l’outil
- **Pays cible**: Cameroun
- **Sponsor**: Yamar NDAO
- **Porteur projet / Chef de projet**: Yamar NDAO
- **Période du pilote**: 01 nov – 30 nov
- **Version**: v1.0 – 01/11/2025

### 1) Contexte et justification
- **Problématique actuelle**: Besoin de fiabiliser la réconciliation des transactions, partenaires et banques, réduire les écarts et sécuriser les soldes.
- **Objectifs de transformation**: Efficacité opérationnelle, traçabilité bout-en-bout, qualité de données, conformité.
- **Alignement stratégique**: Renforcer la maîtrise du risque opérationnel et la justesse des soldes.

### 2) Objectifs du pilote
- **Objectif général**: Valider la valeur de l’outil en conditions réelles au Cameroun.
- **Objectifs spécifiques**:
  - Mesurer l’impact sur les processus de réconciliation (TRX/Partenaire, TRX/OP, bancaire).
  - Valider l’intégration avec les sources BO et les flux opérationnels.
  - Évaluer l’adoption des utilisateurs clés (opérations TOP20) et la qualité des données.
  - Documenter les exigences pour passage à l’échelle.

### 3) Périmètre
- **Inclus**:
  - Processus: réconciliation TRX/Partenaire, TRX/OP (vérification des soldes), réconciliation bancaire.
  - Périmètre géographique: Cameroun (sites/régions prioritaires selon TOP20).
  - Utilisateurs: opération TOP20.
  - Données: sources BO (période du pilote: 01–30 nov).
- **Exclus**:
  - Intégrations hors BO non critiques pour le pilote.
  - Automatisations avancées non essentielles au cadrage.

### 4) Livrables attendus
- Cahier d’architecture et d’intégration (AS-IS/TO-BE).
- Environnement opérationnel « dev » prêt à l’emploi pour le pilote.
- Jeu de données initial BO chargé + plan d’actualisation.
- Plan de tests + rapports d’exécution.
- Tableau de bord KPIs du pilote.
- Matériel de formation + guides utilisateurs.
- Rapport de clôture avec recommandations go/no-go.

### 5) Gouvernance et rôles (RACI)
- **Sponsor**: Yamar NDAO — arbitrage, priorisation, go/no-go.
- **Chef de projet**: Yamar NDAO — coordination, planning, risques, reporting.
- **Référent métier**: Opérations TOP20 — exigences, UAT, adoption.
- **Équipe technique**: Intégration sources BO, sécurité, déploiements env. dev.
- **Sécurité/Conformité**: revues et approbations.
- **Support/Formation**: conduite du changement, helpdesk.

### 6) Planification et jalons (novembre)
- S1 (01–07): Cadrage détaillé, accès BO, conformité, design.
- S2 (08–14): Intégration, migration initiale, paramétrage, tests techniques.
- S3 (15–21): Formation, UAT, corrections, préparation go-live.
- S4 (22–30): Go-live pilote + hypercare, mesures et bilan.
- Jalons: M1 Cadrage validé, M2 Intégration OK, M3 UAT OK, M4 Go-live (01 nov), M5 Bilan.

### 7) Méthodologie
- Approche itérative, démos de fin de semaine, backlog priorisé.
- Gestion de configuration et CI/CD (environnement dev).
- Traçabilité exigences → tests → KPIs.

### 8) Critères de succès et KPIs
- **KPI Métier**:
  - Faire la réconciliation TRX/Partenaire de service.
  - Faire la réconciliation TRX/OP pour vérification des soldes.
  - Faire la réconciliation bancaire.
- **Cibles opérationnelles** (à préciser):
  - Taux de rapprochement ≥ [x%], écarts résiduels ≤ [x%/x J].
  - Délai de production des états ≤ [x] h, incidents P1 ≤ [n].

### 9) Exigences techniques
- **Architecture**: env. dev pour le pilote.
- **Intégrations**: BO comme source principale (schémas, formats, fréquence d’update à préciser).
- **Données**: volumétrie attendue sur novembre; historisation minimale pour analyses.
- **Performance**: SLA/SLO de traitement des lots; tests de charge basiques.
- **Observabilité**: logs, métriques, alerting.
- **Sauvegardes et reprise**: RPO/RTO de base adaptés au pilote.

### 10) Données, sécurité et conformité
- Données traitées: données transactions et soldes; sensibilité à qualifier.
- Base légale et conformité: RGPD si applicable; localisation des données à confirmer.
- Mesures: chiffrement en transit, gestion des accès (RBAC), principes de minimisation.

### 11) Support, formation et conduite du changement
- Parcours de formation ciblé pour opérations TOP20.
- Supports: tutoriels courts, guides pas-à-pas, FAQ.
- Support N1/N2: canaux, horaires, SLAs adaptés au pilote.
- Communication: kickoff, points d’avancement hebdo, partage de quick wins.

### 12) Budget et ressources
- Ordre de grandeur (à confirmer): charges internes/externes pour intégration BO, mise en place env. dev, formation et support.
- Rôles clés: sponsor, chef de projet, référent métier, intégration technique, support.

### 13) Risques et mitigations
- Accès/Intégrations BO retardés → sponsors IT, voie rapide d’accès.
- Qualité de données insuffisante → règles de nettoyage + monitoring.
- Adoption faible → formation ciblée, champions TOP20, quick wins.
- Conformité → revues anticipées, checklist obligatoire.

### 14) Plan de déploiement et passage à l’échelle
- Conditions de sortie: KPIs atteints, qualité/stabilité satisfaisantes.
- Stratégie de généralisation: vagues, priorisation par volumétrie/risque, ressources associées.
- Industrialisation: modèles de config, scripts, templates, runbooks.
- Transition support: de projet → opérations.

### 15) Modalités de validation
- Revues: hebdomadaire opérationnelle; comité de pilotage bi-hebdo.
- Documents à valider: cadrage, architecture, plan de tests, go-live, clôture.
- Mécanisme go/no-go basé sur critères de succès et risques résiduels.

### 16) Informations clés
- **Parties prenantes**: Opération TOP20
- **Données source**: BO
- **Environnement**: dev
- **Go live pilote**: 01 nov

---
Document généré pour diffusion projet (pilote Cameroun, novembre).
