# Solution : Association des Profils aux Utilisateurs

## 🎯 **Problème Identifié**

Les utilisateurs n'avaient pas de profil associé dans la base de données, ce qui empêchait le bon fonctionnement du système de permissions.

## 🔧 **Solution Implémentée**

### **1. Migration de Base de Données**

**Fichier :** `V13__fix_users_profil_association.sql`

- ✅ Création automatique des profils par défaut :
  - `ADMINISTRATEUR` : Profil administrateur avec tous les droits
  - `UTILISATEUR` : Profil utilisateur standard
  - `CONSULTANT` : Profil consultant avec droits de consultation

- ✅ Association automatique des profils :
  - L'utilisateur `admin` → Profil `ADMINISTRATEUR`
  - Les autres utilisateurs → Profil `UTILISATEUR`

### **2. Service de Gestion**

**Fichier :** `UserProfilService.java`

#### **Fonctionnalités :**

- 🔄 **`associateDefaultProfilsToUsers()`** : Association automatique des profils par défaut
- 🔗 **`associateProfilToUser(username, profilName)`** : Association manuelle d'un profil spécifique
- ✅ **`checkAllUsersHaveProfil()`** : Vérification que tous les utilisateurs ont un profil
- 📊 **`displayUserProfilStatus()`** : Affichage du statut des associations

### **3. API REST**

**Fichier :** `UserProfilController.java`

#### **Endpoints Disponibles :**

- `POST /api/user-profil/associate-default` : Association automatique des profils par défaut
- `POST /api/user-profil/associate?username=X&profilName=Y` : Association manuelle
- `GET /api/user-profil/check` : Vérification de l'état des associations
- `GET /api/user-profil/status` : Affichage du statut détaillé

### **4. Script de Correction**

**Fichier :** `fix-user-profil-association.ps1`

#### **Fonctionnalités :**

- 🔍 Vérification de l'état actuel
- 📊 Affichage du statut détaillé
- 🔧 Association automatique des profils
- ✅ Vérification finale

## 🚀 **Instructions d'Utilisation**

### **Étape 1 : Exécuter la Migration**

```sql
-- La migration V13 s'exécute automatiquement au démarrage
-- Elle crée les profils et associe les utilisateurs
```

### **Étape 2 : Vérifier l'État**

```powershell
# Exécuter le script PowerShell
.\fix-user-profil-association.ps1
```

### **Étape 3 : Vérification Manuelle**

```bash
# Vérifier l'état des associations
curl -X GET http://localhost:8080/api/user-profil/check

# Afficher le statut détaillé
curl -X GET http://localhost:8080/api/user-profil/status

# Associer manuellement un profil
curl -X POST "http://localhost:8080/api/user-profil/associate?username=yamar.ndao&profilName=ADMINISTRATEUR"
```

## 📋 **Profils Disponibles**

### **ADMINISTRATEUR**
- **Description :** Profil administrateur avec tous les droits
- **Utilisateurs par défaut :** `admin`
- **Droits :** Accès complet à tous les modules et permissions

### **UTILISATEUR**
- **Description :** Profil utilisateur standard
- **Utilisateurs par défaut :** Tous sauf `admin`
- **Droits :** Droits limités selon les permissions configurées

### **CONSULTANT**
- **Description :** Profil consultant avec droits de consultation
- **Utilisateurs par défaut :** Aucun (association manuelle)
- **Droits :** Droits de consultation uniquement

## 🔍 **Vérification du Fonctionnement**

### **1. Dans les Logs du Serveur**

```
🔧 Association automatique des profils aux utilisateurs...
📝 Profil 'ADMINISTRATEUR' créé avec l'ID: 1
📝 Profil 'UTILISATEUR' créé avec l'ID: 2
✅ Utilisateur 'admin' associé au profil ADMINISTRATEUR
✅ Utilisateur 'yamar.ndao' associé au profil UTILISATEUR
🎯 Association terminée : 2 utilisateur(s) mis à jour
```

### **2. Dans la Base de Données**

```sql
-- Vérifier les associations
SELECT u.username, p.nom as profil 
FROM user u 
LEFT JOIN profil p ON u.profil_id = p.id;
```

### **3. Dans l'Application**

- ✅ Les utilisateurs peuvent se connecter
- ✅ Les permissions sont correctement appliquées
- ✅ L'interface affiche le bon profil pour chaque utilisateur

## 🛠️ **Dépannage**

### **Problème : Utilisateur sans profil**

**Solution :**
```powershell
# Associer manuellement un profil
Invoke-WebRequest -Uri "http://localhost:8080/api/user-profil/associate" -Method POST -Body @{
    username = "nom.utilisateur"
    profilName = "UTILISATEUR"
}
```

### **Problème : Profil inexistant**

**Solution :**
```sql
-- Créer le profil manuellement
INSERT INTO profil (nom, description) VALUES ('NOUVEAU_PROFIL', 'Description du profil');
```

### **Problème : Migration échouée**

**Solution :**
```sql
-- Exécuter manuellement la migration
-- Voir le contenu de V13__fix_users_profil_association.sql
```

## ✅ **Résultat Attendu**

Après l'exécution de la solution :

- ✅ Tous les utilisateurs ont un profil associé
- ✅ Les permissions sont correctement appliquées
- ✅ L'interface affiche les bonnes informations
- ✅ Le système de sécurité fonctionne correctement

## 📞 **Support**

En cas de problème :

1. Vérifiez les logs du serveur
2. Exécutez le script PowerShell de diagnostic
3. Vérifiez la base de données directement
4. Contactez l'équipe de développement 