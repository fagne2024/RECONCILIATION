# Guide de résolution des problèmes de validation TRX SF

## 🔍 Diagnostic du problème

### Symptômes observés
- **Lignes valides : 0**
- **Lignes avec erreurs : 1**
- **Doublons détectés : 0**
- **Nouveaux enregistrements : 0**

### Causes possibles

#### 1. **Format des nombres décimaux**
**Problème** : Les nombres avec virgules (format français) ne sont pas parsés correctement.
**Solution** : Le service a été modifié pour gérer les virgules en les remplaçant par des points.

#### 2. **Format de date**
**Problème** : Le format de date `2024-01-15 10:30:00` doit correspondre au pattern `yyyy-MM-dd HH:mm:ss`.
**Solution** : Le formatter est configuré pour ce format.

#### 3. **Encodage du fichier**
**Problème** : Caractères spéciaux mal encodés.
**Solution** : Utiliser l'encodage UTF-8.

## 🛠️ Solutions appliquées

### 1. Amélioration du parsing des nombres
```java
// Gestion des nombres avec virgules (format français)
String montantStr = values[2].trim().replace(",", ".");
trxSf.setMontant(Double.parseDouble(montantStr));
```

### 2. Amélioration des messages d'erreur
```java
errors.add("Ligne " + lineNumber + ": Nombre de colonnes insuffisant (" + values.length + " au lieu de 8 minimum)");
```

### 3. Ajout de logs de debug
```java
System.err.println("Erreur parsing CSV: " + e.getMessage());
e.printStackTrace();
```

## 📋 Tests à effectuer

### 1. Test avec fichier simplifié
```bash
./test-validation-trx-sf.ps1
```

### 2. Test de diagnostic
```bash
./debug-csv-validation.ps1
```

### 3. Test de création directe
```bash
curl -X POST http://localhost:8080/api/trx-sf \
  -H "Content-Type: application/json" \
  -d '{
    "idTransaction": "TRX_SF_TEST_001",
    "telephoneClient": "+22112345678",
    "montant": 50000.0,
    "service": "TRANSFERT",
    "agence": "AGENCE_A",
    "dateTransaction": "2024-01-15T10:30:00",
    "numeroTransGu": "GU_12345678",
    "pays": "SENEGAL",
    "frais": 500.0,
    "commentaire": "Test"
  }'
```

## 📊 Formats de fichiers supportés

### CSV avec nombres entiers (recommandé)
```csv
ID Transaction;Téléphone Client;Montant;Service;Agence;Date Transaction;Numéro Trans GU;Pays;Frais;Commentaire
TRX_SF_001;+22112345678;50000;TRANSFERT;AGENCE_A;2024-01-15 10:30:00;GU_12345678;SENEGAL;500;Test
```

### CSV avec nombres décimaux
```csv
ID Transaction;Téléphone Client;Montant;Service;Agence;Date Transaction;Numéro Trans GU;Pays;Frais;Commentaire
TRX_SF_001;+22112345678;50000.00;TRANSFERT;AGENCE_A;2024-01-15 10:30:00;GU_12345678;SENEGAL;500.00;Test
```

### CSV avec virgules (format français)
```csv
ID Transaction;Téléphone Client;Montant;Service;Agence;Date Transaction;Numéro Trans GU;Pays;Frais;Commentaire
TRX_SF_001;+22112345678;50000,00;TRANSFERT;AGENCE_A;2024-01-15 10:30:00;GU_12345678;SENEGAL;500,00;Test
```

## 🔧 Vérifications à effectuer

### 1. Vérifier le backend
```bash
# Redémarrer le backend
cd reconciliation-app/backend
./mvnw spring-boot:run
```

### 2. Vérifier les logs
```bash
# Vérifier les logs du backend pour les erreurs de parsing
tail -f logs/application.log
```

### 3. Vérifier la base de données
```sql
-- Vérifier que la table existe
SHOW TABLES LIKE 'trx_sf';

-- Vérifier la structure
DESCRIBE trx_sf;

-- Vérifier les permissions
SELECT * FROM permission WHERE nom = 'TRX SF';
```

## 📝 Checklist de résolution

### ✅ Backend
- [ ] Backend redémarré avec les nouvelles modifications
- [ ] Logs d'erreur vérifiés
- [ ] API accessible (`curl http://localhost:8080/api/trx-sf`)

### ✅ Fichiers de test
- [ ] Fichier CSV simple créé (`test-trx-sf-simple.csv`)
- [ ] Fichier CSV original vérifié (`test-trx-sf-data.csv`)
- [ ] Encodage UTF-8 confirmé

### ✅ Tests
- [ ] Test de validation exécuté
- [ ] Test d'upload exécuté
- [ ] Test de création directe exécuté

### ✅ Frontend
- [ ] Service Angular connecté aux API
- [ ] Composant mis à jour
- [ ] Upload fonctionnel dans l'interface

## 🚨 Problèmes courants

### Problème : "Format invalide - données non parsables"
**Cause** : Problème de parsing des nombres ou dates
**Solution** : Vérifier le format des nombres et dates dans le CSV

### Problème : "Nombre de colonnes insuffisant"
**Cause** : Fichier CSV mal formaté
**Solution** : Vérifier le séparateur (;) et le nombre de colonnes

### Problème : "Erreur de parsing"
**Cause** : Caractères spéciaux ou encodage
**Solution** : Utiliser un éditeur de texte avec encodage UTF-8

## 📞 Support

Si les problèmes persistent :
1. Vérifier les logs du backend
2. Tester avec le fichier CSV simplifié
3. Vérifier l'encodage du fichier
4. Contacter l'équipe de développement
