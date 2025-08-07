# 🎯 Guide Impact OP - Gestion des Écarts Partenaires

## 📋 Vue d'ensemble

Le menu **Impact OP** permet d'enregistrer et gérer les écarts partenaires dans le même format que les écarts BO. Cette fonctionnalité facilite le suivi des impacts financiers sur les comptes partenaires.

## 🎯 Fonctionnalités Principales

### ✅ **Gestion Complète des Impacts OP**
- **Import de fichiers** : CSV, XLS, XLSX
- **Validation automatique** : Vérification des données avant import
- **Filtrage avancé** : Par code propriétaire, type d'opération, groupe réseau, etc.
- **Gestion des statuts** : En attente, Traité, Erreur
- **Export des données** : Format Excel avec couleurs
- **Statistiques en temps réel** : Tableau de bord avec métriques

## 📊 Format des Données

### Colonnes Attendues
Le système attend les colonnes suivantes dans les fichiers d'import :

| Colonne | Type | Description | Exemple |
|---------|------|-------------|---------|
| **Type Opération** | Texte | Type d'opération effectuée | `IMPACT_COMPTIMPACT-COMPTE-GENERAL` |
| **Montant** | Nombre | Montant de l'impact (négatif = débit) | `-9,233` |
| **Solde avant** | Nombre | Solde avant l'opération | `33,080,816.224` |
| **Solde après** | Nombre | Solde après l'opération | `33,071,583.224` |
| **Code propriétaire** | Texte | Code du propriétaire du compte | `CELCM0001` |
| **Date opération** | Date | Date et heure de l'opération | `2025-08-03 06:47:56.0` |
| **Numéro Trans GU** | Texte | Numéro de transaction GU | `1754147433445` |
| **Groupe de réseau** | Texte | Groupe réseau concerné | `CM` |

### Exemple de Données
```csv
Type Opération,Montant,Solde avant,Solde après,Code propriétaire,Date opération,Numéro Trans GU,Groupe de réseau
IMPACT_COMPTIMPACT-COMPTE-GENERAL,-9233,33080816.224,33071583.224,CELCM0001,2025-08-03 06:47:56.0,1754147433445,CM
FRAIS_TRANSACTION,-300,33071583.224,33071283.224,CELCM0001,2025-08-03 06:47:56.0,1754147433445,CM
```

## 🔧 Utilisation

### 1. **Accès au Menu**
- Cliquez sur **"Impact OP"** dans la sidebar
- L'interface s'affiche avec les statistiques et la liste des impacts

### 2. **Import de Fichiers**
1. **Sélectionner un fichier** : Cliquez sur "Choisir un fichier"
2. **Valider** : Cliquez sur "Valider" pour vérifier les données
3. **Uploader** : Cliquez sur "Uploader" pour importer les données

### 3. **Filtrage des Données**
Utilisez les filtres disponibles :
- **Code Propriétaire** : Filtrer par propriétaire
- **Type Opération** : Filtrer par type d'opération
- **Groupe Réseau** : Filtrer par groupe réseau
- **Statut** : En attente, Traité, Erreur
- **Période** : Date début et fin
- **Montant** : Fourchette de montants

### 4. **Gestion des Statuts**
- **En attente** : Impact en cours de traitement
- **Traité** : Impact traité avec succès
- **Erreur** : Impact en erreur

**Note** : Pour passer en statut "Traité" ou "Erreur", un commentaire est obligatoire.

### 5. **Export des Données**
- Cliquez sur **"Exporter"** dans l'en-tête
- Le fichier Excel est téléchargé avec les données filtrées

## 📈 Tableau de Bord

### Statistiques Affichées
- **Total** : Nombre total d'impacts
- **En attente** : Impacts en cours de traitement
- **Traité** : Impacts traités avec succès
- **Erreur** : Impacts en erreur
- **Montant total** : Somme de tous les montants

### Codes Couleurs
- 🟡 **En attente** : Fond jaune clair
- 🟢 **Traité** : Fond vert clair
- 🔴 **Erreur** : Fond rouge clair
- 🔴 **Montants négatifs** : Texte rouge
- 🟢 **Montants positifs** : Texte vert

## 🔍 Fonctionnalités Avancées

### Validation Automatique
Le système valide automatiquement :
- ✅ Format des colonnes
- ✅ Types de données
- ✅ Cohérence des soldes (avant/après)
- ✅ Détection des doublons
- ✅ Validation des dates

### Gestion des Erreurs
- **Messages d'erreur clairs** : Indication précise des problèmes
- **Validation avant import** : Prévention des erreurs
- **Rollback automatique** : En cas d'erreur lors de l'import

### Pagination et Performance
- **Pagination** : 10 impacts par page par défaut
- **Chargement optimisé** : Données chargées à la demande
- **Filtrage côté serveur** : Performance optimale

## 🎨 Interface Utilisateur

### Design Responsive
- **Desktop** : Affichage complet avec toutes les colonnes
- **Tablet** : Adaptation automatique
- **Mobile** : Interface optimisée pour petits écrans

### Accessibilité
- **Navigation clavier** : Toutes les actions accessibles au clavier
- **Contraste élevé** : Lisibilité optimale
- **Messages d'état** : Feedback visuel clair

## 🔧 Configuration Backend

### Endpoints API
```
GET    /api/impact-op              # Liste des impacts
GET    /api/impact-op/{id}         # Détail d'un impact
POST   /api/impact-op              # Créer un impact
PUT    /api/impact-op/{id}         # Modifier un impact
DELETE /api/impact-op/{id}         # Supprimer un impact
POST   /api/impact-op/validate     # Valider un fichier
POST   /api/impact-op/upload       # Uploader un fichier
PATCH  /api/impact-op/{id}/statut  # Modifier le statut
GET    /api/impact-op/filter-options # Options de filtres
GET    /api/impact-op/export       # Exporter les données
GET    /api/impact-op/stats        # Statistiques
```

### Base de Données
Table `impact_op` :
```sql
CREATE TABLE impact_op (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  type_operation VARCHAR(255) NOT NULL,
  montant DECIMAL(15,3) NOT NULL,
  solde_avant DECIMAL(15,3) NOT NULL,
  solde_apres DECIMAL(15,3) NOT NULL,
  code_proprietaire VARCHAR(50) NOT NULL,
  date_operation DATETIME NOT NULL,
  numero_trans_gu VARCHAR(50) NOT NULL,
  groupe_reseau VARCHAR(10) NOT NULL,
  statut ENUM('EN_ATTENTE', 'TRAITE', 'ERREUR') DEFAULT 'EN_ATTENTE',
  commentaire TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## 🚀 Bonnes Pratiques

### Import de Fichiers
1. **Vérifiez le format** : Assurez-vous que les colonnes correspondent
2. **Validez les données** : Utilisez la validation avant l'import
3. **Vérifiez les montants** : Les montants négatifs sont des débits
4. **Cohérence des soldes** : Solde après = Solde avant + Montant

### Gestion des Statuts
1. **Traitez régulièrement** : Passez en "Traité" les impacts validés
2. **Commentez les erreurs** : Ajoutez des commentaires explicatifs
3. **Surveillez les erreurs** : Traitez rapidement les impacts en erreur

### Filtrage et Recherche
1. **Utilisez les filtres** : Pour trouver rapidement les impacts
2. **Exportez régulièrement** : Pour sauvegarder les données
3. **Surveillez les statistiques** : Pour détecter les anomalies

## 🔒 Sécurité

### Permissions
- **Lecture** : Tous les utilisateurs autorisés
- **Écriture** : Utilisateurs avec permission "Impact OP"
- **Suppression** : Administrateurs uniquement

### Validation des Données
- **Sanitisation** : Nettoyage automatique des données
- **Validation côté serveur** : Double validation
- **Logs d'audit** : Traçabilité des modifications

## 📞 Support

### En cas de Problème
1. **Vérifiez le format** : Assurez-vous que le fichier respecte le format attendu
2. **Consultez les logs** : Messages d'erreur détaillés
3. **Contactez l'équipe** : Pour les problèmes techniques

### Améliorations Futures
- **Notifications** : Alertes en temps réel
- **Workflow** : Processus d'approbation
- **Intégration** : Connexion avec d'autres systèmes
- **API avancée** : Endpoints pour intégrations externes

---

**Impact OP** : Gestion professionnelle des écarts partenaires avec interface moderne et fonctionnalités avancées. 