# 🔒 Intégration JWT dans le Frontend Angular

**Date :** 14 novembre 2025  
**Application :** Reconciliation App - Frontend Angular  
**Version :** 1.0.0

---

## ✅ Modifications Appliquées

### 1. ✅ Intercepteur HTTP (`auth.interceptor.ts`)

**Modifications :**
- ✅ Ajout du header `Authorization: Bearer <token>` automatiquement sur toutes les requêtes HTTP
- ✅ Gestion des erreurs 401 (Unauthorized) avec déconnexion automatique
- ✅ Conservation du header `X-Username` pour compatibilité

**Fonctionnalités :**
- Intercepte toutes les requêtes HTTP
- Ajoute le token JWT dans le header `Authorization`
- Redirige vers `/login` en cas d'erreur 401

---

### 2. ✅ Service d'État (`app-state.service.ts`)

**Modifications :**
- ✅ Ajout de la gestion du token JWT (`getToken()`, `setToken()`)
- ✅ Stockage du token dans `localStorage`
- ✅ Chargement automatique du token au démarrage
- ✅ Méthode `isAuthenticated()` pour vérifier l'authentification

**Nouvelles méthodes :**
```typescript
setToken(token: string): void
getToken(): string | null
isAuthenticated(): boolean
```

**Stockage :**
- Token stocké dans `localStorage` avec la clé `auth_token`
- Chargé automatiquement au démarrage de l'application

---

### 3. ✅ Composant de Login (`login.component.ts`)

**Modifications :**
- ✅ Récupération du token JWT depuis la réponse du backend
- ✅ Stockage du token via `AppStateService`
- ✅ Vérification de la présence du token avant redirection

**Flux de connexion :**
1. Utilisateur saisit username/password
2. Requête POST vers `/api/auth/login`
3. Backend retourne le token JWT dans `response.token`
4. Token stocké dans `AppStateService` et `localStorage`
5. Redirection vers le dashboard

---

### 4. ✅ Guard d'Authentification (`auth.guard.ts`)

**Modifications :**
- ✅ Vérification de la présence du token JWT
- ✅ Utilisation de `isAuthenticated()` pour valider l'authentification
- ✅ Redirection vers `/login` si token manquant

**Protection des routes :**
Toutes les routes protégées vérifient maintenant :
- Présence du token JWT
- Présence de l'username
- Présence des droits utilisateur

---

## 🚀 Fonctionnement

### 1. Connexion

**Flux :**
```
Utilisateur → LoginComponent → POST /api/auth/login
                                      ↓
                           Backend génère JWT
                                      ↓
                           Réponse avec token
                                      ↓
                    AppStateService.setUserRights(..., token)
                                      ↓
                           Token stocké (localStorage)
                                      ↓
                           Redirection vers dashboard
```

### 2. Requêtes Authentifiées

**Flux :**
```
Component → HttpClient → AuthInterceptor
                              ↓
                    Récupération du token
                              ↓
                    Ajout header Authorization
                              ↓
                    Requête vers Backend
                              ↓
                    Backend valide JWT
                              ↓
                    Réponse
```

### 3. Gestion des Erreurs

**Erreur 401 (Unauthorized) :**
```
Backend retourne 401
        ↓
AuthInterceptor détecte 401
        ↓
AppStateService.logout()
        ↓
Suppression token du localStorage
        ↓
Redirection vers /login
```

---

## 📝 Code Exemple

### Utilisation dans un Service

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private apiUrl = '/api/users';

  constructor(private http: HttpClient) {}

  // Le token est automatiquement ajouté par AuthInterceptor
  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  // Toutes les requêtes incluent automatiquement le token
  createUser(user: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, user);
  }
}
```

### Vérification de l'Authentification

```typescript
import { Component } from '@angular/core';
import { AppStateService } from './services/app-state.service';

@Component({
  selector: 'app-example',
  template: `
    <div *ngIf="isAuthenticated">
      Utilisateur connecté: {{ username }}
    </div>
  `
})
export class ExampleComponent {
  constructor(private appState: AppStateService) {}

  get isAuthenticated(): boolean {
    return this.appState.isAuthenticated();
  }

  get username(): string | null {
    return this.appState.getUsername();
  }
}
```

---

## 🔧 Configuration

### Variables d'Environnement

**`environment.ts` :**
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api'
};
```

**`environment.prod.ts` :**
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://votre-domaine.com/api'
};
```

---

## 🧪 Tests

### Test Manuel

1. **Se connecter :**
   - Ouvrir l'application
   - Se connecter avec un compte valide
   - Vérifier que le token est stocké dans `localStorage` (DevTools > Application > Local Storage)

2. **Vérifier les requêtes :**
   - Ouvrir DevTools > Network
   - Faire une requête (ex: charger les utilisateurs)
   - Vérifier le header `Authorization: Bearer <token>` dans la requête

3. **Tester la déconnexion :**
   - Vérifier que le token est supprimé du `localStorage` lors du logout
   - Vérifier la redirection vers `/login`

4. **Tester l'expiration :**
   - Attendre que le token expire (24h par défaut)
   - Faire une requête
   - Vérifier la redirection automatique vers `/login` (401)

---

## ⚠️ Points d'Attention

### 1. Sécurité du Token

- ✅ Token stocké dans `localStorage` (accessible via JavaScript)
- ⚠️ Risque XSS : assurez-vous que votre application est protégée contre XSS
- 💡 Alternative : utiliser `sessionStorage` (supprimé à la fermeture du navigateur)

### 2. Expiration du Token

- ✅ Le token expire après 24 heures (configurable côté backend)
- ✅ Déconnexion automatique en cas d'erreur 401
- 💡 Amélioration future : rafraîchir automatiquement le token avant expiration

### 3. Refresh Token (Optionnel)

Pour l'instant, aucun refresh token n'est implémenté. Pour une sécurité accrue :
- Implémenter un refresh token avec expiration plus longue
- Renouveler automatiquement le token avant expiration
- Invalider l'ancien token lors du renouvellement

---

## 📊 Structure des Données

### Token JWT Stocké

```json
{
  "username": "admin",
  "role": "ADMIN",
  "iat": 1700000000,
  "exp": 1700086400
}
```

### LocalStorage

```javascript
{
  "auth_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "username": "admin",
  "userRights": {
    "profil": "ADMIN",
    "modules": ["RECONCILIATION", "USERS", ...],
    "permissions": {
      "RECONCILIATION": ["READ", "WRITE", ...],
      ...
    }
  }
}
```

---

## 🔍 Dépannage

### Problème : Token non envoyé dans les requêtes

**Vérifier :**
1. Le token est-il stocké dans `localStorage` ?
   ```javascript
   localStorage.getItem('auth_token')
   ```
2. L'intercepteur est-il bien enregistré dans `app.module.ts` ?
   ```typescript
   providers: [
     {
       provide: HTTP_INTERCEPTORS,
       useClass: AuthInterceptor,
       multi: true
     }
   ]
   ```

### Problème : Redirection infinie vers /login

**Vérifier :**
1. Le token est-il valide et non expiré ?
2. Le backend retourne-t-il bien le token dans la réponse de login ?
3. Y a-t-il une boucle de redirection dans le guard ?

### Problème : Erreur 401 même avec token valide

**Vérifier :**
1. Le token est-il bien formaté dans le header ?
   - Format attendu : `Authorization: Bearer <token>`
2. Le secret JWT côté backend correspond-il ?
3. Le token n'est-il pas expiré ?

---

## 📚 Ressources

- **Angular HTTP Interceptors :** https://angular.io/api/common/http/HttpInterceptor
- **JWT.io :** https://jwt.io/ (décoder et tester les tokens)
- **LocalStorage API :** https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage

---

**Date de création :** 14 novembre 2025  
**Dernière mise à jour :** 14 novembre 2025  
**Version :** 1.0

