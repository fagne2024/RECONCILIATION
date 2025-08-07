# Guide des Formats de Fichiers Supportés

## 📋 Formats Supportés

L'application de réconciliation supporte maintenant les formats suivants sur tous les composants :

### ✅ Formats Supportés
- **CSV** (Comma-Separated Values)
- **XLS** (Excel 97-2003)
- **XLSX** (Excel 2007+)
- **XLSM** (Excel avec macros)
- **XLSB** (Excel binaire)

## 🔧 Composants Mis à Jour

### 1. **Composant Traitement** (`/traitement`)
- ✅ Accepte CSV, XLS, XLSX
- ✅ Détection automatique du séparateur pour CSV
- ✅ Support spécial pour les fichiers Orange Money
- ✅ Traitement optimisé pour les gros fichiers

### 2. **Composant Upload de Fichiers** (`/file-upload`)
- ✅ Mode manuel : BO et Partenaire
- ✅ Mode automatique : BO et Partenaire
- ✅ Accepte tous les formats Excel et CSV
- ✅ Messages d'aide mis à jour

### 3. **Composant Écart-Solde** (`/ecart-solde`)
- ✅ Import de fichiers CSV, XLS, XLSX
- ✅ Validation des données
- ✅ Détection des doublons

### 4. **Modèles de Traitement Automatique** (`/auto-processing-models`)
- ✅ Création de modèles basés sur tous les formats
- ✅ Application automatique des traitements
- ✅ Support des fichiers Orange Money

### 5. **Service Auto-Processing**
- ✅ Parsing de tous les formats
- ✅ Détection automatique du type de fichier
- ✅ Traitement spécial Orange Money

## 🎯 Fonctionnalités Spéciales

### Détection Orange Money
- ✅ Détection automatique des fichiers Orange Money
- ✅ Correction des caractères corrompus dans les en-têtes
- ✅ Ignore les lignes d'informations au début du fichier
- ✅ Utilise la ligne contenant "N°" comme en-tête

### Traitement Optimisé
- ✅ Traitement par chunks pour les gros fichiers
- ✅ Détection automatique des séparateurs CSV
- ✅ Support des encodages UTF-8
- ✅ Gestion des erreurs robuste

## 📝 Messages d'Aide Mis à Jour

### Interface Utilisateur
- **Traitement** : "Traitement de fichiers (CSV, XLS, XLSX)"
- **Upload** : "Sélectionner des fichiers (CSV, XLS, XLSX)"
- **Écart-Solde** : "Import de fichier (CSV, XLS, XLSX)"
- **File Upload** : "Fichier BO/Partenaire (CSV, XLS, XLSX)"

### Messages d'Erreur
- ✅ Messages d'erreur cohérents pour tous les formats
- ✅ Indication claire des formats supportés
- ✅ Suggestions d'action en cas d'erreur

## 🔄 Backend

### Contrôleurs Java
- ✅ `EcartSoldeController` : Support CSV, XLS, XLSX
- ✅ Validation des formats côté serveur
- ✅ Gestion des erreurs appropriée

### Services
- ✅ `EcartSoldeService` : Parsing de tous les formats
- ✅ Détection automatique du type de fichier
- ✅ Traitement optimisé

## 🚀 Utilisation

### Upload de Fichiers
1. **Traitement** : Allez dans le menu "Traitement"
2. **Réconciliation** : Utilisez le composant "File Upload"
3. **Écart-Solde** : Utilisez la section "Import de fichier"
4. **Modèles** : Créez des modèles basés sur vos fichiers

### Formats Recommandés
- **CSV** : Pour les fichiers simples, facilement modifiables
- **XLSX** : Pour les fichiers Excel modernes, meilleure compatibilité
- **XLS** : Pour les fichiers Excel anciens (97-2003)

## ⚠️ Notes Importantes

### Limitations
- Les fichiers Excel avec macros (XLSM) peuvent nécessiter des permissions spéciales
- Les très gros fichiers (>100MB) peuvent prendre du temps à traiter
- Certains caractères spéciaux peuvent nécessiter un encodage UTF-8

### Bonnes Pratiques
- ✅ Utilisez des en-têtes clairs dans vos fichiers
- ✅ Évitez les caractères spéciaux dans les noms de colonnes
- ✅ Vérifiez l'encodage de vos fichiers CSV
- ✅ Testez avec de petits fichiers avant de traiter de gros volumes

## 🔧 Support Technique

### Dépannage
- **Fichier non reconnu** : Vérifiez l'extension et le format
- **Erreur d'encodage** : Utilisez UTF-8 pour les CSV
- **Fichier corrompu** : Essayez de rouvrir et resauvegarder dans Excel
- **Performance lente** : Divisez les gros fichiers en plus petits

### Formats Spéciaux
- **Orange Money** : Détection automatique, correction des en-têtes
- **Fichiers avec métadonnées** : Les lignes d'info sont automatiquement ignorées
- **Fichiers multi-feuilles** : Seule la première feuille est traitée

---

*Dernière mise à jour : Décembre 2024* 