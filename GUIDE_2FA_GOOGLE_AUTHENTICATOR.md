# 🔐 Guide - Authentification à Deux Facteurs (2FA) avec Google Authenticator

**Date :** 14 novembre 2025  
**Application :** Reconciliation App  
**Version :** 1.0.0

---

## ✅ Implémentation Complète

L'authentification à deux facteurs (2FA) avec Google Authenticator a été implémentée dans l'application.

---

## 📋 Ce qui a été fait

### Backend (Spring Boot)

#### 1. ✅ Dépendances ajoutées
- ✅ `googleauth` - Bibliothèque TOTP (Time-based One-Time Password)
- ✅ `zxing-core` et `zxing-javase` - Génération de QR codes

#### 2. ✅ Entité User mise à jour
- ✅ Champ `enabled2FA` - Indique si le 2FA est activé
- ✅ Champ `secret2FA` - Stocke la clé secrète TOTP

#### 3. ✅ Services créés
- ✅ `TwoFactorAuthService` - Génération et validation des codes TOTP
- ✅ Génération de QR codes en Base64
- ✅ Validation des codes avec tolérance de ±1 période (30 secondes)

#### 4. ✅ Contrôleurs modifiés/créés
- ✅ `AuthController` - Gestion du login avec 2FA
  - `/api/auth/login` - Retourne `requires2FA: true` si activé
  - `/api/auth/verify-2fa` - Valide le code et retourne le token JWT
- ✅ `TwoFactorAuthController` - Gestion du 2FA
  - `/api/auth/2fa/setup` - Génère une clé secrète et un QR code
  - `/api/auth/2fa/enable` - Active le 2FA après validation
  - `/api/auth/2fa/disable` - Désactive le 2FA
  - `/api/auth/2fa/status` - Vérifie si le 2FA est activé

#### 5. ✅ Migration SQL
- ✅ `V31__add_2fa_to_user.sql` - Ajoute les colonnes `enabled_2fa` et `secret_2fa`

### Frontend (Angular)

#### 1. ✅ Composant Login modifié
- ✅ Détection du besoin de 2FA (`requires2FA: true`)
- ✅ Affichage d'un formulaire 2FA avec champ de code à 6 chiffres
- ✅ Validation du code 2FA via `/api/auth/verify-2fa`
- ✅ Bouton "Retour" pour revenir au formulaire de login

#### 2. ✅ Formulaire 2FA
- ✅ Champ de code avec validation (6 chiffres)
- ✅ Message d'information pour guider l'utilisateur
- ✅ Gestion des erreurs (code invalide)

---

## 🚀 Fonctionnement

### 1. Activation du 2FA

**Étape 1 : Générer la clé secrète et le QR code**

```bash
POST /api/auth/2fa/setup
{
  "username": "admin"
}
```

**Réponse :**
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "data:image/png;base64,iVBORw0KG...",
  "otpAuthUrl": "otpauth://totp/Reconciliation%20App:admin?secret=JBSWY3DPEHPK3PXP&issuer=Reconciliation%20App",
  "message": "Scannez le QR code avec Google Authenticator et validez avec un code"
}
```

**Étape 2 : Scanner le QR code avec Google Authenticator**

1. Ouvrir Google Authenticator sur votre téléphone
2. Cliquer sur "Ajouter un compte" > "Scanner un code QR"
3. Scanner le QR code affiché

**Étape 3 : Activer le 2FA**

```bash
POST /api/auth/2fa/enable
{
  "username": "admin",
  "code": "123456"
}
```

**Réponse :**
```json
{
  "message": "Authentification à deux facteurs activée avec succès",
  "enabled": true
}
```

### 2. Connexion avec 2FA

**Étape 1 : Login (username/password)**

```bash
POST /api/auth/login
{
  "username": "admin",
  "password": "votre_mot_de_passe"
}
```

**Réponse (si 2FA activé) :**
```json
{
  "username": "admin",
  "requires2FA": true,
  "message": "Code d'authentification à deux facteurs requis"
}
```

**Étape 2 : Valider le code 2FA**

```bash
POST /api/auth/verify-2fa
{
  "username": "admin",
  "code": "123456"
}
```

**Réponse :**
```json
{
  "username": "admin",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "type": "Bearer",
  "profil": "ADMIN",
  "droits": [...]
}
```

### 3. Connexion sans 2FA

Si le 2FA n'est pas activé, le flux reste identique à avant :
- Login avec username/password
- Token JWT retourné directement

---

## 📱 Utilisation de Google Authenticator

### Installation

1. **Android :** [Google Play Store](https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2)
2. **iOS :** [App Store](https://apps.apple.com/app/google-authenticator/id388497605)

### Comment utiliser

1. **Scanner le QR code :**
   - Ouvrir Google Authenticator
   - Cliquer sur "+" > "Scanner un code QR"
   - Scanner le QR code affiché

2. **Saisie manuelle (alternative) :**
   - Cliquer sur "+" > "Saisir une clé"
   - Nom du compte : `Reconciliation App - admin`
   - Clé secrète : copier la clé depuis `otpAuthUrl`
   - Type : "Basé sur le temps"
   - Ajouter

3. **Obtenir le code :**
   - Le code change toutes les 30 secondes
   - Entrer le code à 6 chiffres affiché

---

## 🔧 Configuration

### Backend (`application.properties`)

```properties
# Nom de l'application (utilisé dans le QR code)
app.name=Reconciliation App

# Host de l'application (utilisé dans l'URL OTP)
app.host=localhost:8080
```

### Frontend

Le frontend détecte automatiquement si le 2FA est requis et affiche le formulaire approprié.

---

## 📊 Flux Complet

### Activation du 2FA

```
Utilisateur → /api/auth/2fa/setup
                    ↓
          Génération clé secrète
                    ↓
          Génération QR code
                    ↓
    Utilisateur scanne avec Google Authenticator
                    ↓
    Utilisateur entre un code pour valider
                    ↓
          /api/auth/2fa/enable
                    ↓
          2FA activé ✅
```

### Connexion avec 2FA

```
Utilisateur → /api/auth/login (username/password)
                    ↓
          Vérification credentials
                    ↓
          2FA activé ? → OUI
                    ↓
          Retourne requires2FA: true
                    ↓
    Utilisateur entre code depuis Google Authenticator
                    ↓
          /api/auth/verify-2fa (code)
                    ↓
          Validation code TOTP
                    ↓
          Génération token JWT
                    ↓
          Connexion réussie ✅
```

---

## 🛡️ Sécurité

### ✅ Fonctionnalités de Sécurité

1. **Codes TOTP avec expiration**
   - Codes valides pendant 30 secondes
   - Génération automatique basée sur le temps

2. **Tolérance de ±1 période**
   - Permet de gérer les légers décalages d'horloge
   - Validation sur 3 périodes (90 secondes au total)

3. **Clé secrète unique par utilisateur**
   - Chaque utilisateur a sa propre clé
   - Stockée de manière sécurisée dans la base de données

4. **QR code unique**
   - Généré dynamiquement pour chaque utilisateur
   - Contient le nom d'utilisateur et la clé secrète

### ⚠️ Bonnes Pratiques

1. **Sauvegarder les codes de récupération**
   - Enregistrer la clé secrète en lieu sûr
   - Permet de réactiver le 2FA si le téléphone est perdu

2. **Ne pas partager le QR code**
   - Le QR code contient la clé secrète
   - Ne le partagez jamais publiquement

3. **Utiliser un téléphone sécurisé**
   - Protéger Google Authenticator avec un verrouillage d'écran
   - Ne pas rooter/jailbreaker le téléphone si possible

---

## 📝 API Endpoints

### Setup 2FA
```
POST /api/auth/2fa/setup
Body: { "username": "admin" }
Response: { "secret", "qrCode", "otpAuthUrl" }
```

### Activer 2FA
```
POST /api/auth/2fa/enable
Body: { "username": "admin", "code": "123456" }
Response: { "message", "enabled": true }
```

### Désactiver 2FA
```
POST /api/auth/2fa/disable
Body: { "username": "admin" }
Response: { "message", "enabled": false }
```

### Statut 2FA
```
GET /api/auth/2fa/status?username=admin
Response: { "enabled": true/false, "hasSecret": true/false }
```

### Login avec 2FA
```
POST /api/auth/login
Body: { "username": "admin", "password": "..." }
Response (si 2FA activé): { "requires2FA": true, "username": "admin" }
```

### Vérifier code 2FA
```
POST /api/auth/verify-2fa
Body: { "username": "admin", "code": "123456" }
Response: { "token": "...", "username": "admin", ... }
```

---

## 🧪 Tests

### Test avec curl

**1. Activer le 2FA :**
```bash
# Générer la clé
curl -X POST http://localhost:8080/api/auth/2fa/setup \
  -H "Content-Type: application/json" \
  -d '{"username":"admin"}'

# Activer (remplacer 123456 par le code de Google Authenticator)
curl -X POST http://localhost:8080/api/auth/2fa/enable \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","code":"123456"}'
```

**2. Se connecter avec 2FA :**
```bash
# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"votre_mot_de_passe"}'
# Réponse: {"requires2FA": true, ...}

# Vérifier le code (remplacer 123456 par le code actuel)
curl -X POST http://localhost:8080/api/auth/verify-2fa \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","code":"123456"}'
# Réponse: {"token": "...", ...}
```

---

## 📚 Ressources

- **Google Authenticator :** https://www.google.com/landing/2step/
- **TOTP RFC 6238 :** https://tools.ietf.org/html/rfc6238
- **Bibliothèque googleauth :** https://github.com/wstrange/GoogleAuth

---

## 🔍 Dépannage

### Problème : Le code est toujours invalide

**Vérifier :**
1. L'horloge du téléphone est synchronisée
2. Le code est entré avant expiration (30 secondes)
3. La clé secrète dans la base correspond à celle dans Google Authenticator

**Solution :**
- Vérifier l'heure du serveur et du téléphone
- Réactiver le 2FA si nécessaire

### Problème : Le QR code ne peut pas être scanné

**Solution :**
- Utiliser l'URL OTP manuelle (`otpAuthUrl`)
- Saisir manuellement dans Google Authenticator

### Problème : Perte du téléphone

**Solution :**
- Désactiver le 2FA via `/api/auth/2fa/disable`
- Réactiver avec une nouvelle clé secrète
- Si vous avez sauvegardé la clé secrète, vous pouvez la réimporter

---

**Date de création :** 14 novembre 2025  
**Dernière mise à jour :** 14 novembre 2025  
**Version :** 1.0

