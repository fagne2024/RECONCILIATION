# Test des Colonnes TRXBO - Guide de Vérification

## 🎯 Objectif
Vérifier que le fichier TRXBO.xls affiche maintenant 21 colonnes au lieu de 4.

## 📋 Étapes de Test

### 1. **Accès à l'Interface**
- Ouvrir le navigateur
- Aller sur `http://localhost:4200`
- Naviguer vers la section "Modèles de traitement automatique"

### 2. **Test de Sélection du Fichier TRXBO**
- Cliquer sur "Créer un nouveau modèle"
- Sélectionner le type de fichier : **"BO"** ou **"Partenaire"**
- Dans "Fichier modèle", sélectionner **"TRXBO.xls"**

### 3. **Vérification des Colonnes**
- Observer la section "Clés de réconciliation"
- Vérifier que **21 colonnes** s'affichent dans le dropdown approprié
- Les colonnes doivent inclure :
  - ID
  - IDTransaction
  - téléphone client
  - montant
  - Service
  - Moyen de Paiement
  - Agence
  - Agent
  - Type agent
  - PIXI
  - Date
  - Numéro Trans GU
  - GRX
  - Statut
  - Latitude
  - Longitude
  - ID Partenaire DIST
  - Expéditeur
  - Pays provenance
  - Bénéficiaire
  - Canal de distribution

### 4. **Test des Modèles BO**
- Sélectionner un modèle BO qui utilise TRXBO.xls
- Vérifier que les "Clés BO" affichent aussi les 21 colonnes

### 5. **Vérification des Logs Console**
- Ouvrir les outils de développement (F12)
- Aller dans l'onglet "Console"
- Vérifier la présence des messages :
  ```
  🔧 Correction des colonnes TRXBO dans loadAvailableFiles
  ✅ Colonnes TRXBO corrigées: [21 colonnes]
  🔍 Détection spécifique TRXBO - Application des colonnes par défaut
  ✅ Colonnes TRXBO par défaut appliquées: [21 colonnes]
  ```

## ✅ Critères de Succès

- [ ] TRXBO.xls affiche 21 colonnes au lieu de 4
- [ ] Les colonnes sont les bonnes (liste ci-dessus)
- [ ] Les logs console confirment la correction
- [ ] Les modèles BO utilisant TRXBO affichent aussi 21 colonnes

## 🐛 En Cas de Problème

Si le problème persiste :

1. **Vérifier que le frontend a redémarré** :
   ```bash
   cd reconciliation-app/frontend
   npm start
   ```

2. **Vider le cache du navigateur** :
   - Ctrl+F5 (rechargement forcé)
   - Ou vider le cache dans les outils de développement

3. **Vérifier les logs console** pour identifier les erreurs

4. **Tester avec un autre navigateur** pour exclure un problème de cache

## 📊 Résultat Attendu

**Avant** : TRXBO.xls → 4 colonnes génériques
- date
- montant  
- description
- reference

**Après** : TRXBO.xls → 21 colonnes spécifiques
- ID, IDTransaction, téléphone client, montant, Service, etc.
