# Guide de test du frontend TRX SF

## 🚀 Démarrage du frontend

Le frontend Angular devrait être en cours de démarrage. Vérifiez que :

1. **Le serveur Angular est démarré** sur `http://localhost:4200`
2. **Le backend est accessible** sur `http://localhost:8080`

## 🔍 Vérifications à effectuer

### 1. **Accès au menu TRX SF**

1. Ouvrez votre navigateur sur `http://localhost:4200`
2. Connectez-vous avec vos identifiants
3. Dans la sidebar, vérifiez que :
   - Le menu "Suivi des écarts" est visible
   - Le sous-menu "TRX SF" apparaît sous "Suivi des écarts"
   - Le menu "TSOP" est également visible

### 2. **Navigation vers TRX SF**

1. Cliquez sur "TRX SF" dans la sidebar
2. Vérifiez que la page TRX SF se charge
3. Vérifiez que l'URL change vers `/trx-sf`

### 3. **Interface TRX SF**

Sur la page TRX SF, vérifiez la présence de :

#### 📊 **Section Statistiques**
- Total des transactions
- En attente
- Traitées
- Erreurs
- Montant total
- Frais total

#### 📤 **Section Upload**
- Bouton "Choisir un fichier"
- Zone de glisser-déposer
- Bouton "Valider le fichier"
- Bouton "Importer le fichier"
- Messages de validation

#### 🔍 **Section Filtres**
- Filtre par agence
- Filtre par service
- Filtre par pays
- Filtre par statut
- Filtre par date

#### 📋 **Tableau des données**
- Colonnes : ID Transaction, Téléphone Client, Montant, Service, Agence, Date Transaction, Numéro Trans GU, Pays, Statut, Frais, Commentaire, Date Import
- Actions : Modifier, Supprimer
- Pagination

### 4. **Test de l'upload**

1. **Test de validation** :
   - Cliquez sur "Choisir un fichier"
   - Sélectionnez `test-trx-sf-new.csv`
   - Cliquez sur "Valider le fichier"
   - Vérifiez que la validation fonctionne

2. **Test d'import** :
   - Cliquez sur "Importer le fichier"
   - Vérifiez que les données apparaissent dans le tableau

### 5. **Test des actions**

1. **Modifier le statut** :
   - Cliquez sur l'icône de modification d'une transaction
   - Changez le statut
   - Vérifiez que le changement est sauvegardé

2. **Supprimer une transaction** :
   - Cliquez sur l'icône de suppression
   - Confirmez la suppression
   - Vérifiez que la transaction disparaît

## 🐛 Problèmes possibles

### **Menu TRX SF non visible**
- Vérifiez les permissions utilisateur
- Vérifiez que la migration V23 a été exécutée
- Vérifiez les logs du backend

### **Page TRX SF ne se charge pas**
- Vérifiez la console du navigateur (F12)
- Vérifiez les logs du frontend
- Vérifiez que le backend répond

### **Upload ne fonctionne pas**
- Vérifiez que le backend est accessible
- Vérifiez le format du fichier CSV
- Vérifiez les logs du backend

## 📝 Format de fichier attendu

```csv
ID Transaction;Téléphone Client;Montant;Service;Agence;Date Transaction;Numéro Trans GU;Pays;Frais;Commentaire
TRX_SF_TEST_001;+22112345678;1000;TRANSFERT;AGENCE_A;2024-01-15 10:30:00;GU_12345678;SENEGAL;100;Test
```

## ✅ Checklist de validation

- [ ] Menu TRX SF visible dans la sidebar
- [ ] Page TRX SF se charge correctement
- [ ] Section statistiques affichée
- [ ] Section upload fonctionnelle
- [ ] Section filtres opérationnelle
- [ ] Tableau des données affiché
- [ ] Validation de fichier fonctionne
- [ ] Import de fichier fonctionne
- [ ] Actions (modifier/supprimer) fonctionnent
- [ ] Pagination fonctionne
- [ ] Filtres fonctionnent

## 🎯 Résultat attendu

Le frontend TRX SF devrait fonctionner exactement comme TSOP, avec :
- Même interface utilisateur
- Même logique de validation
- Même logique d'upload
- Même gestion des actions
- Même système de filtres
