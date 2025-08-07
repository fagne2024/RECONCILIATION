# Guide de démarrage rapide - TRX SF

## 🚀 Démarrage rapide

### 1. Redémarrer le backend
```bash
# Dans le dossier reconciliation-app/backend
./mvnw spring-boot:run
```

### 2. Vérifier que les migrations sont appliquées
- La table `trx_sf` doit être créée
- La permission "TRX SF" doit être ajoutée

### 3. Tester les API
```bash
# Exécuter le script de test
./test-complet-trx-sf.ps1
```

### 4. Démarrer le frontend
```bash
# Dans le dossier reconciliation-app/frontend
ng serve
```

### 5. Accéder à l'application
- Ouvrir http://localhost:4200
- Se connecter avec un utilisateur admin
- Aller dans "Suivi des écarts" > "TRX SF"

## 📋 Checklist de vérification

### ✅ Backend
- [ ] Table `trx_sf` créée
- [ ] Permission "TRX SF" ajoutée
- [ ] API `/api/trx-sf` accessible
- [ ] Upload de fichiers fonctionnel
- [ ] Validation de fichiers fonctionnelle

### ✅ Frontend
- [ ] Service `TrxSfService` créé
- [ ] Composant `TrxSfComponent` connecté aux API
- [ ] Menu "TRX SF" visible
- [ ] Upload de fichiers fonctionnel
- [ ] Filtres fonctionnels

### ✅ Tests
- [ ] Création de transaction
- [ ] Récupération de données
- [ ] Upload de fichier CSV
- [ ] Validation de fichier
- [ ] Mise à jour de statut
- [ ] Suppression de transaction

## 🔧 Dépannage

### Problème : API non accessible
```bash
# Vérifier que le backend démarre
curl http://localhost:8080/api/trx-sf
```

### Problème : Migration non appliquée
```bash
# Vérifier les migrations
SELECT * FROM trx_sf LIMIT 1;
SELECT * FROM permission WHERE nom = 'TRX SF';
```

### Problème : Frontend ne charge pas
```bash
# Vérifier les logs Angular
ng serve --verbose
```

### Problème : Upload ne fonctionne pas
- Vérifier le format du fichier CSV
- Vérifier les permissions du dossier
- Vérifier la taille du fichier

## 📁 Fichiers importants

### Backend
- `TrxSfEntity.java` - Entité JPA
- `TrxSfRepository.java` - Repository
- `TrxSfService.java` - Service métier
- `TrxSfController.java` - Contrôleur REST
- `V22__create_trx_sf_table.sql` - Migration table
- `V23__add_trx_sf_permission.sql` - Migration permission

### Frontend
- `trx-sf.service.ts` - Service Angular
- `trx-sf.component.ts` - Composant principal
- `trx-sf.component.html` - Template
- `trx-sf.component.scss` - Styles

### Tests
- `test-trx-sf-api.ps1` - Tests API
- `test-complet-trx-sf.ps1` - Tests complets
- `test-trx-sf-data.csv` - Données de test

## 📊 Format des données

### CSV attendu
```csv
ID Transaction;Téléphone Client;Montant;Service;Agence;Date Transaction;Numéro Trans GU;Pays;Frais;Commentaire
TRX_SF_000001;+22112345678;50000.00;TRANSFERT;AGENCE_A;2024-01-15 10:30:00;GU_12345678;SENEGAL;500.00;Transaction test
```

### API Endpoints
- `GET /api/trx-sf` - Récupérer toutes les transactions
- `POST /api/trx-sf` - Créer une transaction
- `POST /api/trx-sf/upload` - Upload de fichier
- `POST /api/trx-sf/validate` - Valider un fichier
- `GET /api/trx-sf/statistics` - Statistiques
- `PATCH /api/trx-sf/{id}/statut` - Mettre à jour le statut
- `DELETE /api/trx-sf/{id}` - Supprimer une transaction

## 🎯 Fonctionnalités disponibles

### ✅ CRUD complet
- Création de transactions SF
- Lecture avec filtres multiples
- Mise à jour des données
- Suppression sécurisée

### ✅ Upload de fichiers
- Support CSV avec séparateur `;`
- Support Excel (XLS, XLSX)
- Validation préalable des données
- Gestion des erreurs et doublons

### ✅ Filtres avancés
- Par agence, service, pays, statut
- Par période (date début/fin)
- Combinaison de plusieurs critères
- Listes dynamiques des valeurs distinctes

### ✅ Gestion des statuts
- Mise à jour en ligne
- Ajout de commentaires
- Validation des statuts autorisés
- Historique des modifications

### ✅ Statistiques
- Comptage par statut
- Calcul des montants totaux
- Calcul des frais totaux
- Métriques en temps réel

## 🚀 Prochaines étapes

1. **Tests en production** : Tester avec des données réelles
2. **Optimisations** : Améliorer les performances
3. **Sécurité** : Ajouter l'authentification
4. **Monitoring** : Ajouter les logs et métriques
5. **Documentation** : Générer la documentation API
