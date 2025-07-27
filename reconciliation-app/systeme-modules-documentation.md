# 📋 Système de Modules - Documentation Complète

## 🎯 Vue d'ensemble

Le système de modules permet de gérer les menus et les permissions de l'application. Chaque module représente un menu principal de l'application (Dashboard, Traitement, Réconciliation, etc.).

## 🏗️ Architecture

### Frontend
- **Composant** : `ModulesComponent` (`/modules`)
- **Service** : `ModuleService`
- **Modèle** : `Module` interface

### Backend
- **Contrôleur** : `ProfilController` (endpoints `/api/profils/modules`)
- **Service** : `ProfilService`
- **Entité** : `ModuleEntity`
- **Repository** : `ModuleRepository`

## 📊 Structure de la Base de Données

### Table `module`
```sql
CREATE TABLE module (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    nom VARCHAR(255) NOT NULL UNIQUE
);
```

### Tables Associées
- `permission` : Actions disponibles (Consulter, Créer, Modifier, etc.)
- `profil_permission` : Association profil-module-permission
- `module_permission` : Permissions disponibles par module

## 🔧 Fonctionnalités Disponibles

### ✅ Opérations CRUD Complètes

#### 1. **Lister les Modules**
- **Frontend** : `ModuleService.getAllModules()`
- **Backend** : `GET /api/profils/modules`
- **Affichage** : Tableau avec nom et actions

#### 2. **Créer un Module**
- **Frontend** : Modal d'ajout avec formulaire
- **Backend** : `POST /api/profils/modules`
- **Validation** : Nom requis, minimum 2 caractères

#### 3. **Modifier un Module**
- **Frontend** : Modal d'édition avec formulaire
- **Backend** : `PUT /api/profils/modules/{id}`
- **Validation** : Nom requis, minimum 2 caractères

#### 4. **Supprimer un Module**
- **Frontend** : Confirmation avant suppression
- **Backend** : `DELETE /api/profils/modules/{id}`
- **Sécurité** : Suppression en cascade des permissions associées

## 🎨 Interface Utilisateur

### Page Modules (`/modules`)
```
┌─────────────────────────────────────┐
│ Gestion des Modules        [+ Nouveau] │
├─────────────────────────────────────┤
│ Nom                    │ Actions     │
├─────────────────────────────────────┤
│ Dashboard              │ [✏️] [🗑️]   │
│ Traitement             │ [✏️] [🗑️]   │
│ Réconciliation         │ [✏️] [🗑️]   │
│ Résultats              │ [✏️] [🗑️]   │
│ Statistiques           │ [✏️] [🗑️]   │
│ Classements            │ [✏️] [🗑️]   │
│ Comptes                │ [✏️] [🗑️]   │
│ Opérations             │ [✏️] [🗑️]   │
│ Frais                  │ [✏️] [🗑️]   │
│ Utilisateur            │ [✏️] [🗑️]   │
│ Profil                 │ [✏️] [🗑️]   │
│ Log utilisateur        │ [✏️] [🗑️]   │
└─────────────────────────────────────┘
```

### Modal d'Ajout/Édition
```
┌─────────────────────────────────────┐
│ Nouveau Module              [✕]    │
├─────────────────────────────────────┤
│ Nom du module *                    │
│ [________________________]         │
│                                    │
│ [Annuler]        [Créer]          │
└─────────────────────────────────────┘
```

## 🔐 Intégration avec les Permissions

### Association Module-Permission
Chaque module peut avoir des permissions spécifiques :
- **Dashboard** : Consulter
- **Comptes** : Créer, Modifier, Supprimer, Consulter
- **Opérations** : Créer, Valider, Annuler, Consulter
- **Frais** : Consulter, Exporter

### Gestion des Droits
- Les modules sont associés aux profils via les permissions
- Un utilisateur ne voit que les modules auxquels il a accès
- Le système vérifie les droits avant d'afficher les menus

## 📋 Modules Par Défaut

### Modules Initialisés (V8__insert_modules_and_permissions.sql)
```sql
INSERT INTO module (nom) VALUES
  ('Dashboard'),
  ('Traitement'),
  ('Réconciliation'),
  ('Résultats'),
  ('Statistiques'),
  ('Classements'),
  ('Comptes'),
  ('Opérations'),
  ('Frais'),
  ('Utilisateur'),
  ('Profil'),
  ('Log utilisateur');
```

## 🚀 Utilisation

### Accès au Sous-menu
1. Cliquer sur "Paramètre" dans la sidebar
2. Sélectionner "Module" dans le sous-menu
3. La page affiche tous les modules disponibles

### Ajouter un Module
1. Cliquer sur "Nouveau Module"
2. Remplir le formulaire avec le nom du module
3. Cliquer sur "Créer"

### Modifier un Module
1. Cliquer sur l'icône ✏️ à côté du module
2. Modifier le nom dans le formulaire
3. Cliquer sur "Mettre à jour"

### Supprimer un Module
1. Cliquer sur l'icône 🗑️ à côté du module
2. Confirmer la suppression
3. Le module et ses permissions associées sont supprimés

## 🔧 Configuration Technique

### Endpoints API
```
GET    /api/profils/modules          # Lister tous les modules
POST   /api/profils/modules          # Créer un module
PUT    /api/profils/modules/{id}     # Modifier un module
DELETE /api/profils/modules/{id}     # Supprimer un module
```

### Modèle de Données
```typescript
interface Module {
  id?: number;
  nom: string;
}
```

### Validation
- **Nom** : Requis, minimum 2 caractères
- **Unicité** : Le nom doit être unique en base
- **Cascade** : Suppression des permissions associées

## 🛡️ Sécurité

### Gestion des Erreurs
- **Validation frontend** : Formulaire avec validation en temps réel
- **Validation backend** : Vérification de l'existence et unicité
- **Gestion des exceptions** : Messages d'erreur explicites

### Suppression Sécurisée
- Vérification de l'existence du module avant suppression
- Suppression en cascade des permissions associées
- Logs détaillés pour le debugging

## 📈 Évolutions Possibles

### Fonctionnalités Futures
- **Catégorisation** : Grouper les modules par catégorie
- **Ordre d'affichage** : Permettre de réorganiser l'ordre des menus
- **Icônes** : Ajouter des icônes personnalisées par module
- **Permissions granulaires** : Permissions plus détaillées par module

### Améliorations Techniques
- **Cache** : Mise en cache des modules pour améliorer les performances
- **Audit** : Logs d'audit pour les modifications de modules
- **Import/Export** : Fonctionnalités d'import/export de configuration

## 🧪 Tests

### Tests Fonctionnels
- ✅ Création d'un nouveau module
- ✅ Modification d'un module existant
- ✅ Suppression d'un module avec permissions
- ✅ Validation des formulaires
- ✅ Gestion des erreurs

### Tests d'Intégration
- ✅ Communication frontend-backend
- ✅ Persistance en base de données
- ✅ Cascade des suppressions
- ✅ Validation des contraintes

## 📝 Notes de Développement

### Points d'Attention
- Les modules sont liés aux permissions utilisateur
- La suppression d'un module impacte les profils qui l'utilisent
- Les noms de modules doivent correspondre aux menus de l'application

### Bonnes Pratiques
- Toujours vérifier l'existence avant modification/suppression
- Utiliser des transactions pour les opérations critiques
- Logger les opérations importantes pour le debugging
- Valider les données côté frontend et backend 