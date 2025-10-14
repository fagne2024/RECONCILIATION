# Guide de dépannage - Opérations Bancaires Automatiques

## Problème : Les opérations bancaires ne sont pas créées automatiquement

### ✅ Vérifications à effectuer

#### 1. Vérifier que la table existe dans la base de données

```sql
USE reconciliation_db;
SHOW TABLES LIKE 'operation_bancaire';
```

**Si la table n'existe pas**, exécutez le script PowerShell :

```powershell
.\create-operation-bancaire-table.ps1
```

Ou exécutez directement le SQL :

```powershell
cd reconciliation-app/backend/src/main/resources/sql
mysql -u root -p < create_operation_bancaire_table.sql
```

#### 2. Vérifier les logs du backend

Lors de la création d'une opération, vous devriez voir ces logs :

```
🔍 Vérification du type d'opération pour création bancaire: Compense_client
✅ Type d'opération détecté pour création bancaire automatique: Compense_client
🏦 Création automatique d'une opération bancaire pour l'opération ID: 123 (Type: Compense_client)
✅ Opération bancaire créée automatiquement avec succès pour l'opération ID: 123
```

**Si vous ne voyez pas ces logs**, le type d'opération n'est peut-être pas correct.

#### 3. Vérifier le type d'opération

Les types éligibles pour la création automatique sont **EXACTEMENT** :
- `Compense_client` (pas `compense_client` ni `COMPENSE_CLIENT`)
- `Appro_client` (pas `appro_client` ni `APPRO_CLIENT`)
- `nivellement` (pas `Nivellement` ni `NIVELLEMENT`)

**Vérifiez dans votre base de données** :

```sql
SELECT DISTINCT type_operation FROM operation 
WHERE type_operation IN ('Compense_client', 'Appro_client', 'nivellement');
```

#### 4. Redémarrer le backend

Après avoir créé la table, **redémarrez impérativement** le backend Spring Boot :

```powershell
# Arrêter le backend (Ctrl+C dans le terminal)
# Puis relancer
cd reconciliation-app/backend
mvn spring-boot:run
```

#### 5. Vérifier l'injection du service

Dans les logs au démarrage, cherchez :

```
Started ReconciliationApplication in X.XXX seconds
```

Si vous voyez des erreurs comme :
```
Error creating bean with name 'operationService'
```

Cela indique un problème d'injection de dépendance.

#### 6. Vérifier la configuration CORS

L'erreur CORS que vous avez vue :
```
When allowCredentials is true, allowedOrigins cannot contain the special value "*"
```

A été corrigée dans le fichier `OperationBancaireController.java`.

**Redémarrez le backend** pour appliquer la correction.

### 🔍 Tests de diagnostic

#### Test 1 : Créer manuellement une opération bancaire

Utilisez Postman ou curl pour tester l'API :

```bash
curl -X POST http://localhost:8080/api/operations-bancaires \
  -H "Content-Type: application/json" \
  -d '{
    "pays": "Côte d'\''Ivoire",
    "codePays": "CI",
    "mois": "Octobre 2024",
    "dateOperation": "2024-10-14T10:00:00",
    "agence": "CELCM0001",
    "typeOperation": "Test",
    "montant": 1000000,
    "statut": "En attente"
  }'
```

**Résultat attendu** : HTTP 201 Created avec les données de l'opération bancaire.

#### Test 2 : Vérifier que le service est chargé

Ajoutez temporairement un log dans `OperationService` :

```java
@PostConstruct
public void init() {
    logger.info("✅ OperationService initialisé");
    logger.info("✅ OperationBancaireService disponible: {}", (operationBancaireService != null));
}
```

Ajoutez l'import :
```java
import jakarta.annotation.PostConstruct;
```

#### Test 3 : Créer une opération de test

Dans le frontend, créez une opération avec ces valeurs **exactes** :

- **Type d'opération** : `Compense_client`
- **Montant** : 1 000 000
- **Compte** : Un compte existant
- **Date** : Date du jour

Puis vérifiez :

1. **Dans les logs backend** : Les messages de création
2. **Dans la base de données** :
   ```sql
   SELECT * FROM operation_bancaire ORDER BY id DESC LIMIT 1;
   ```
3. **Dans le frontend** : Module BANQUE > Opérations

### 🛠️ Solutions aux problèmes courants

#### Problème : "Table 'operation_bancaire' doesn't exist"

**Solution** :
```powershell
.\create-operation-bancaire-table.ps1
```

#### Problème : "Error creating bean 'operationService'"

**Solution** : Vérifiez que toutes les dépendances sont correctes dans `pom.xml` et relancez :
```powershell
mvn clean install
mvn spring-boot:run
```

#### Problème : Erreur CORS dans le navigateur

**Solution** : 
1. Vérifiez que `OperationBancaireController` a la bonne annotation `@CrossOrigin`
2. Redémarrez le backend
3. Videz le cache du navigateur (Ctrl+F5)

#### Problème : Les logs ne montrent rien

**Solution** : Activez le niveau DEBUG dans `application.properties` :
```properties
logging.level.com.reconciliation.service.OperationService=DEBUG
logging.level.com.reconciliation.service.OperationBancaireService=DEBUG
```

#### Problème : La table existe mais rien ne se crée

**Causes possibles** :
1. Type d'opération mal orthographié
2. Exception silencieuse (vérifiez les logs)
3. Transaction rollback (vérifiez les logs d'erreur)

**Solution** : Consultez les logs complets du backend pour identifier l'erreur exacte.

### 📋 Checklist complète

Avant de créer une opération, vérifiez :

- [ ] La table `operation_bancaire` existe dans la base de données
- [ ] Le backend Spring Boot est redémarré après la création de la table
- [ ] Aucune erreur dans les logs au démarrage du backend
- [ ] Le type d'opération est exactement `Compense_client`, `Appro_client` ou `nivellement`
- [ ] L'API `/api/operations-bancaires` répond (test avec curl ou Postman)
- [ ] Pas d'erreur CORS dans la console du navigateur

### 🆘 Support

Si le problème persiste après toutes ces vérifications :

1. **Collectez ces informations** :
   - Logs complets du backend lors de la création d'opération
   - Résultat de `SELECT * FROM operation ORDER BY id DESC LIMIT 1;`
   - Résultat de `SHOW TABLES LIKE 'operation_bancaire';`
   - Version de Spring Boot utilisée
   - Erreurs dans la console du navigateur

2. **Vérifiez la configuration** :
   - `application.properties` : connexion à la base de données
   - `pom.xml` : toutes les dépendances sont présentes

### 🎯 Commandes rapides de diagnostic

```powershell
# 1. Vérifier la table
mysql -u root -p -e "USE reconciliation_db; SHOW TABLES LIKE 'operation_bancaire';"

# 2. Compter les opérations bancaires
mysql -u root -p -e "USE reconciliation_db; SELECT COUNT(*) FROM operation_bancaire;"

# 3. Voir les dernières opérations
mysql -u root -p -e "USE reconciliation_db; SELECT * FROM operation WHERE type_operation IN ('Compense_client', 'Appro_client', 'nivellement') ORDER BY id DESC LIMIT 5;"

# 4. Voir les dernières opérations bancaires
mysql -u root -p -e "USE reconciliation_db; SELECT * FROM operation_bancaire ORDER BY id DESC LIMIT 5;"
```

### ✅ Test final

Pour confirmer que tout fonctionne :

1. Créez une opération `Compense_client` dans le frontend
2. Vérifiez les logs backend (vous devriez voir les emojis 🔍 ✅ 🏦)
3. Ouvrez le module BANQUE
4. Cliquez sur "Opérations"
5. Vous devriez voir la nouvelle opération bancaire avec statut "En attente"
6. La colonne ID GLPI devrait afficher un bouton orange "Créer"

Si tout cela fonctionne, la fonctionnalité est opérationnelle ! 🎉

