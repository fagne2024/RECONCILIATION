# 📋 Guide d'Utilisation - Gestion des Profils

## 🎯 Objectif

L'interface de gestion des profils permet d'ajouter des modules et des permissions à un profil utilisateur.

## 🚀 Accès à l'Interface

1. **Ouvrir l'application** : `http://localhost:4200`
2. **Se connecter** avec vos identifiants
3. **Naviguer** : Paramètre → Profil
4. **URL directe** : `http://localhost:4200/profils`

## 📊 Interface Disponible

### ✅ Fonctionnalités Existantes

L'interface profil est **déjà complète** et inclut :

#### 🔧 Gestion des Profils
- **Créer un profil** : Bouton "Nouveau Profil"
- **Modifier un profil** : Icône ✏️ (vert)
- **Supprimer un profil** : Icône 🗑️ (rouge)
- **Voir les droits** : Icône 👁️ (bleu)

#### 📋 Gestion des Modules
- **Liste des modules** : Affichage de tous les modules disponibles
- **Ajouter un module** : Sélection depuis une liste prédéfinie
- **Supprimer un module** : Bouton de suppression

#### 🔐 Gestion des Permissions
- **Liste des permissions** : Affichage de toutes les permissions
- **Ajouter une permission** : Création ou sélection existante
- **Attribuer à un module** : Association module-permission

## 🎮 Comment Utiliser

### 1. Créer un Nouveau Profil

```
1. Cliquer sur "Nouveau Profil"
2. Remplir le formulaire :
   - Nom du profil (obligatoire)
   - Description (optionnel)
3. Cliquer sur "Créer"
```

### 2. Sélectionner un Profil

```
1. Cliquer sur le nom d'un profil dans le tableau
2. Le profil devient sélectionné (surbrillance)
3. Les droits du profil s'affichent en bas
```

### 3. Ajouter des Modules au Profil

```
1. Sélectionner un profil
2. Dans "Gestion des menus (modules)" :
   - Choisir un menu dans la liste déroulante
   - Cliquer sur "Ajouter le menu"
```

### 4. Ajouter des Permissions au Profil

```
1. Sélectionner un profil
2. Choisir un module dans "Choisir un menu"
3. Dans "Ajouter une action" :
   - Sélectionner une permission existante OU
   - Créer une nouvelle permission
4. Cliquer sur "Ajouter l'action"
```

### 5. Gérer les Droits par Module

```
1. Sélectionner un profil
2. Dans le tableau "Droits du profil" :
   - Cocher/décocher les cases pour activer/désactiver
   - Les permissions sont organisées par module
```

## 📋 Modules Disponibles

L'application propose ces modules par défaut :
- Dashboard
- Traitement
- Réconciliation
- Résultats
- Statistiques
- Classements
- Comptes
- Opérations
- Frais
- Utilisateur
- Profil
- Log utilisateur

## 🔐 Permissions Disponibles

Les permissions standard incluent :
- Consulter
- Créer
- Modifier
- Supprimer
- Valider
- Annuler
- Exporter
- EDIT_USER
- DELETE_USER

## 🎯 Exemples d'Utilisation

### Exemple 1 : Profil Administrateur
```
Modules : Tous les modules
Permissions : Toutes les permissions
```

### Exemple 2 : Profil Utilisateur Standard
```
Modules : Dashboard, Comptes, Opérations
Permissions : Consulter, Créer, Modifier
```

### Exemple 3 : Profil Consultant
```
Modules : Dashboard, Statistiques, Classements
Permissions : Consulter, Exporter
```

## 🔧 Fonctionnalités Techniques

### ✅ APIs Fonctionnelles
- `GET /api/profils` - Liste des profils
- `POST /api/profils` - Créer un profil
- `PUT /api/profils/{id}` - Modifier un profil
- `DELETE /api/profils/{id}` - Supprimer un profil
- `GET /api/profils/modules` - Liste des modules
- `GET /api/profils/permissions` - Liste des permissions
- `GET /api/profils/{id}/droits` - Droits d'un profil
- `POST /api/profils/{id}/droits` - Ajouter un droit

### ✅ Interface Réactive
- **Chargement** : Indicateurs de chargement
- **Validation** : Contrôles de formulaire
- **Feedback** : Messages de succès/erreur
- **Confirmation** : Dialogs de confirmation

## 🚨 Résolution des Problèmes

### Problème : "Aucun profil trouvé"
**Solution** : Créer un premier profil avec le bouton "Nouveau Profil"

### Problème : "Erreur lors du chargement"
**Solution** : Vérifier que le backend est démarré sur le port 8080

### Problème : "Permissions non visibles"
**Solution** : 
1. Sélectionner un profil
2. Choisir un module
3. Les permissions apparaissent dans la liste

## 📝 Notes Importantes

1. **Sauvegarde automatique** : Les modifications sont sauvegardées immédiatement
2. **Validation** : Les formulaires vérifient les données avant envoi
3. **Confirmation** : Les suppressions demandent confirmation
4. **Interface responsive** : Fonctionne sur desktop et mobile

## 🎯 Prochaines Étapes

1. **Tester l'interface** : Accéder à `/profils`
2. **Créer un profil** : Utiliser le formulaire d'ajout
3. **Ajouter des modules** : Sélectionner depuis la liste
4. **Ajouter des permissions** : Associer aux modules
5. **Tester les droits** : Vérifier les associations

---

**Status** : ✅ **PRÊT À UTILISER**
**Interface** : Complète et fonctionnelle
**APIs** : Toutes opérationnelles
**Documentation** : Ce guide 