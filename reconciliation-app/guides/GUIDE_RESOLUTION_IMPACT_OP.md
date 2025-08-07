# 🔧 Guide de Résolution des Problèmes - Impact OP

## 🚨 Problème Actuel
L'erreur 500 indique que le contrôleur est reconnu mais qu'il y a un problème avec la base de données.

## ✅ Solutions à Appliquer

### 1. **Créer la Table impact_op**

Exécutez le script SQL suivant dans votre base de données MySQL :

```sql
-- Copiez et exécutez le contenu du fichier execute-migration-impact-op.sql
-- dans votre client MySQL (phpMyAdmin, MySQL Workbench, etc.)
```

### 2. **Redémarrer le Backend**

```bash
# Arrêter le backend actuel (Ctrl+C)
# Puis redémarrer :
cd reconciliation-app/backend
mvn spring-boot:run
```

### 3. **Vérifier la Connexion à la Base de Données**

Assurez-vous que votre fichier `application.properties` contient les bonnes informations de connexion :

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/votre_base_de_donnees
spring.datasource.username=votre_utilisateur
spring.datasource.password=votre_mot_de_passe
```

### 4. **Tester les Endpoints**

Une fois le backend redémarré, testez avec :

```bash
# Test de base
curl http://localhost:8080/api/impact-op

# Test des statistiques
curl http://localhost:8080/api/impact-op/stats

# Test des options de filtres
curl http://localhost:8080/api/impact-op/filter-options
```

## 🔍 Diagnostic des Erreurs

### Erreur 404
- **Cause** : Contrôleur non reconnu
- **Solution** : Redémarrer le backend

### Erreur 500
- **Cause** : Problème de base de données
- **Solution** : Créer la table impact_op

### Erreur de Connexion
- **Cause** : Base de données inaccessible
- **Solution** : Vérifier les paramètres de connexion

## 📋 Checklist de Vérification

- [ ] Table `impact_op` créée dans la base de données
- [ ] Backend redémarré avec succès
- [ ] Endpoint `/api/impact-op` accessible
- [ ] Endpoint `/api/impact-op/stats` fonctionne
- [ ] Endpoint `/api/impact-op/filter-options` fonctionne
- [ ] Upload de fichiers fonctionne

## 🧪 Test avec le Fichier CSV

1. **Préparer le fichier** : `test-impact-op.csv`
2. **Accéder au menu** : Impact OP dans l'interface
3. **Uploader le fichier** : Valider puis uploader
4. **Vérifier les données** : Dans le tableau

## 📞 En cas de Problème Persistant

1. **Vérifier les logs** : Regarder les erreurs dans la console
2. **Tester la base de données** : Vérifier la connexion MySQL
3. **Vérifier les permissions** : Droits d'accès à la base de données
4. **Redémarrer complètement** : Backend + Base de données

## 🎯 Résultat Attendu

Une fois tout configuré, vous devriez pouvoir :
- ✅ Accéder au menu "Impact OP"
- ✅ Voir les statistiques (0 au début)
- ✅ Uploader des fichiers CSV/Excel
- ✅ Voir les données dans le tableau
- ✅ Modifier les statuts
- ✅ Exporter les données

---

**Impact OP** : Gestion complète des écarts partenaires avec interface moderne. 