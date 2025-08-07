# 🔧 Guide de Diagnostic - Impact OP

## 🚨 **Problème : Validation échouée avec 2 erreurs**

### 🔍 **Diagnostic des Erreurs**

Les erreurs de validation peuvent venir de plusieurs sources :

#### 1. **Table `impact_op` manquante**
- **Symptôme** : Erreur 500 lors de l'accès aux endpoints
- **Solution** : Créer la table dans la base de données

#### 2. **Format de date incorrect**
- **Symptôme** : "Date invalide" dans les erreurs
- **Solution** : Utiliser le format `YYYY-MM-DD HH:mm:ss` (sans `.0`)

#### 3. **Champs manquants ou invalides**
- **Symptôme** : "Champ obligatoire manquant"
- **Solution** : Vérifier tous les champs requis

### ✅ **Solutions à Appliquer**

#### **Étape 1 : Créer la Table**

Exécutez ce script SQL dans votre base de données :

```sql
CREATE TABLE IF NOT EXISTS impact_op (
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_code_proprietaire (code_proprietaire),
    INDEX idx_type_operation (type_operation),
    INDEX idx_groupe_reseau (groupe_reseau),
    INDEX idx_statut (statut),
    INDEX idx_date_operation (date_operation),
    INDEX idx_numero_trans_gu (numero_trans_gu),
    UNIQUE INDEX idx_unique_impact (code_proprietaire, numero_trans_gu, date_operation)
);
```

#### **Étape 2 : Utiliser le Fichier Corrigé**

Utilisez le fichier `test-impact-op-corrected.csv` qui a le bon format de date :

```csv
Type Opération,Montant,Solde avant,Solde après,Code propriétaire,Date opération,Numéro Trans GU,Groupe de réseau
IMPACT_COMPTIMPACT-COMPTE-GENERAL,-9233,33080816.224,33071583.224,CELCM0001,2025-08-03 06:47:56,1754147433445,CM
FRAIS_TRANSACTION,-300,33071583.224,33071283.224,CELCM0001,2025-08-03 06:47:56,1754147433445,CM
```

**Différence** : Les dates n'ont plus `.0` à la fin.

#### **Étape 3 : Redémarrer le Backend**

```bash
cd backend
mvn spring-boot:run
```

#### **Étape 4 : Tester les Endpoints**

```bash
# Test des statistiques
curl http://localhost:8080/api/impact-op/stats

# Test de validation avec le fichier corrigé
curl -X POST -F "file=@test-impact-op-corrected.csv" http://localhost:8080/api/impact-op/validate
```

### 📋 **Checklist de Vérification**

- [ ] Table `impact_op` créée dans la base de données
- [ ] Backend redémarré après création de la table
- [ ] Endpoint `/api/impact-op/stats` retourne des statistiques
- [ ] Fichier CSV utilise le bon format de date
- [ ] Tous les champs requis sont présents
- [ ] Validation réussie avec 0 erreur

### 🎯 **Format de Données Attendu**

| Champ | Type | Format | Exemple |
|-------|------|--------|---------|
| Type Opération | Texte | - | IMPACT_COMPTIMPACT-COMPTE-GENERAL |
| Montant | Décimal | - | -9233 |
| Solde avant | Décimal | - | 33080816.224 |
| Solde après | Décimal | - | 33071583.224 |
| Code propriétaire | Texte | - | CELCM0001 |
| Date opération | DateTime | YYYY-MM-DD HH:mm:ss | 2025-08-03 06:47:56 |
| Numéro Trans GU | Texte | - | 1754147433445 |
| Groupe de réseau | Texte | - | CM |

### 🔧 **En cas d'Erreur Persistante**

1. **Vérifiez les logs du backend** pour voir les erreurs exactes
2. **Testez la connexion à la base de données**
3. **Vérifiez les permissions** de l'utilisateur MySQL
4. **Redémarrez complètement** : Backend + Base de données

---

**Impact OP** : Une fois la table créée et le format corrigé, tout devrait fonctionner ! ✅ 