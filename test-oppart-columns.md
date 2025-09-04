# Test des Colonnes OPPART - Guide de Vérification

## 🎯 Objectif
Vérifier que le fichier OPPART.xls affiche maintenant 21 colonnes au lieu de 4.

## 📋 Étapes de Test

### 1. **Accès à l'Interface**
- Ouvrir le navigateur
- Aller sur `http://localhost:4200`
- Naviguer vers la section "Modèles de traitement automatique"

### 2. **Test de Sélection du Fichier OPPART**
- Cliquer sur "Créer un nouveau modèle"
- Sélectionner le type de fichier : **"Partenaire"**
- Dans "Fichier modèle", sélectionner **"OPPART.xls"**

### 3. **Vérification des Colonnes Partenaire**
- Observer la section "Clés de réconciliation"
- Vérifier que **21 colonnes** s'affichent dans le dropdown "Clés partenaire"
- Les colonnes doivent inclure :
  - ID Opération
  - Type Opération
  - Montant
  - Solde avant
  - Solde aprés
  - Code proprietaire
  - Téléphone
  - Statut
  - ID Transaction
  - Num bordereau
  - Date opération
  - Date de versement
  - Banque appro
  - Login demandeur Appro
  - Login valideur Appro
  - Motif rejet
  - Frais connexion
  - Numéro Trans GU
  - Agent
  - Motif régularisation
  - groupe de réseau

### 4. **Test des Modèles BO**
- Sélectionner un modèle BO qui utilise OPPART.xls
- Vérifier que les "Clés BO" affichent aussi les 21 colonnes

### 5. **Vérification des Logs Console**
- Ouvrir les outils de développement (F12)
- Aller dans l'onglet "Console"
- Vérifier la présence des messages :
  ```
  🔧 Correction des colonnes OPPART dans loadAvailableFiles
  ✅ Colonnes OPPART corrigées: [21 colonnes]
  🔍 Détection spécifique OPPART - Application des colonnes par défaut
  ✅ Colonnes OPPART par défaut appliquées: [21 colonnes]
  ```

## ✅ Critères de Succès

- [ ] OPPART.xls affiche 21 colonnes au lieu de 4
- [ ] Les colonnes sont les bonnes (liste ci-dessus)
- [ ] Les logs console confirment la correction
- [ ] Les modèles BO utilisant OPPART affichent aussi 21 colonnes

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

**Avant** : OPPART.xls → 4 colonnes génériques
- date
- montant  
- description
- reference

**Après** : OPPART.xls → 21 colonnes spécifiques
- ID Opération, Type Opération, Montant, Solde avant, Solde aprés, etc.
