# 🔐 Guide - Activation de l'Authentification à Deux Facteurs (2FA)

**Date :** 14 novembre 2025  
**Application :** Reconciliation App  
**Version :** 1.0.0

---

## 🚀 Guide Rapide d'Activation

### Pour Activer le 2FA

#### Étape 1 : Installer Google Authenticator

1. **Android :** [Télécharger depuis Google Play](https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2)
2. **iOS :** [Télécharger depuis l'App Store](https://apps.apple.com/app/google-authenticator/id388497605)

#### Étape 2 : Générer la Clé Secrète et le QR Code

**Via l'API :**
```bash
curl -X POST http://localhost:8080/api/auth/2fa/setup \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -d '{"username":"admin"}'
```

**Réponse :**
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "data:image/png;base64,iVBORw0KG...",
  "otpAuthUrl": "otpauth://totp/Reconciliation%20App:admin?secret=JBSWY3DPEHPK3PXP&issuer=Reconciliation%20App"
}
```

#### Étape 3 : Scanner le QR Code

1. Ouvrir Google Authenticator sur votre téléphone
2. Cliquer sur **"+"** > **"Scanner un code QR"**
3. Scanner le QR code affiché (ou utiliser l'URL manuelle)

#### Étape 4 : Valider avec un Code

Entrer le code à 6 chiffres affiché dans Google Authenticator :

```bash
curl -X POST http://localhost:8080/api/auth/2fa/enable \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -d '{"username":"admin","code":"123456"}'
```

**Réponse :**
```json
{
  "message": "Authentification à deux facteurs activée avec succès",
  "enabled": true
}
```

---

## 📱 Utilisation après Activation

### Connexion avec 2FA

1. **Étape 1 :** Entrer username et password
2. **Étape 2 :** Si le 2FA est activé, un formulaire demande le code
3. **Étape 3 :** Ouvrir Google Authenticator et entrer le code à 6 chiffres
4. **Étape 4 :** La connexion est complétée avec le token JWT

---

## ⚙️ Désactiver le 2FA

```bash
curl -X POST http://localhost:8080/api/auth/2fa/disable \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -d '{"username":"admin"}'
```

**Réponse :**
```json
{
  "message": "Authentification à deux facteurs désactivée",
  "enabled": false
}
```

---

## 🔍 Vérifier le Statut du 2FA

```bash
curl -X GET "http://localhost:8080/api/auth/2fa/status?username=admin" \
  -H "Authorization: Bearer VOTRE_TOKEN"
```

**Réponse :**
```json
{
  "enabled": true,
  "hasSecret": true
}
```

---

## ⚠️ Points Importants

1. **Sauvegarder la clé secrète** : Si vous perdez votre téléphone, vous pourrez réactiver le 2FA avec la clé secrète
2. **Synchronisation de l'horloge** : Assurez-vous que l'horloge de votre téléphone est synchronisée
3. **Codes de récupération** : Notez la clé secrète (`secret`) en lieu sûr

---

## 🛠️ Créer un Composant Angular pour l'Activation

Pour une meilleure expérience utilisateur, vous pouvez créer un composant dédié pour :
- Afficher le QR code
- Activer/désactiver le 2FA
- Gérer les codes de récupération

**Exemple de service :**
```typescript
@Injectable({
  providedIn: 'root'
})
export class TwoFactorAuthService {
  constructor(private http: HttpClient) {}
  
  setup2FA(username: string): Observable<any> {
    return this.http.post('/api/auth/2fa/setup', { username });
  }
  
  enable2FA(username: string, code: string): Observable<any> {
    return this.http.post('/api/auth/2fa/enable', { username, code });
  }
  
  disable2FA(username: string): Observable<any> {
    return this.http.post('/api/auth/2fa/disable', { username });
  }
  
  get2FAStatus(username: string): Observable<any> {
    return this.http.get(`/api/auth/2fa/status?username=${username}`);
  }
}
```

---

**Date de création :** 14 novembre 2025  
**Version :** 1.0

