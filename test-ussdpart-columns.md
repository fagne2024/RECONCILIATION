# Test des Colonnes USSDPART - Guide de Vérification

## 🎯 Objectif
Vérifier que le fichier USSDPART.xls affiche maintenant 29 colonnes au lieu de 4.

## 📋 Étapes de Test

### 1. **Accès à l'Interface**
- Ouvrir le navigateur
- Aller sur `http://localhost:4200`
- Naviguer vers la section "Modèles de traitement automatique"

### 2. **Test de Sélection du Fichier USSDPART**
- Cliquer sur "Créer un nouveau modèle"
- Sélectionner le type de fichier : **"BO"** ou **"Partenaire"**
- Dans "Fichier modèle", sélectionner **"USSDPART.xls"**

### 3. **Vérification des Colonnes**
- Observer la section "Clés de réconciliation"
- Vérifier que **29 colonnes** s'affichent dans le dropdown approprié
- Les colonnes doivent inclure :
  - ID
  - Groupe Réseaux
  - Code réseau
  - Agence
  - Code PIXI
  - Code de Proxy
  - Code service
  - Numéro Trans GU
  - Déstinataire
  - Login agent
  - Type agent
  - date de création
  - Date d'envoi vers part
  - Etat
  - Type
  - Token
  - SMS
  - Action faite
  - Statut
  - Utilisateur
  - Montant
  - Date dernier traitement
  - Latitude
  - Longitude
  - Partenaire dist ID
  - Agence SC
  - Groupe reseau SC
  - Agent SC
  - PDA SC

### 4. **Test des Modèles BO**
- Sélectionner un modèle BO qui utilise USSDPART.xls
- Vérifier que les "Clés BO" affichent aussi les 29 colonnes

### 5. **Vérification des Logs Console**
- Ouvrir les outils de développement (F12)
- Aller dans l'onglet "Console"
- Vérifier la présence des messages :
  ```
  🔧 Correction des colonnes USSDPART dans loadAvailableFiles
  ✅ Colonnes USSDPART corrigées: [29 colonnes]
  🔍 Détection spécifique USSDPART - Application des colonnes par défaut
  ✅ Colonnes USSDPART par défaut appliquées: [29 colonnes]
  ```

## ✅ Critères de Succès

- [ ] USSDPART.xls affiche 29 colonnes au lieu de 4
- [ ] Les colonnes sont les bonnes (liste ci-dessus)
- [ ] Les logs console confirment la correction
- [ ] Les modèles BO utilisant USSDPART affichent aussi 29 colonnes

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

**Avant** : USSDPART.xls → 4 colonnes génériques
- date
- montant  
- description
- reference

**Après** : USSDPART.xls → 29 colonnes spécifiques
- ID, Groupe Réseaux, Code réseau, Agence, Code PIXI, etc.
