# 🔒 Guide - Protection des Endpoints avec JWT

**Date :** 14 novembre 2025  
**Application :** Reconciliation App  
**Version :** 1.0.0

---

## ✅ Protection des Endpoints Implémentée

La protection des endpoints a été implémentée avec **JWT (JSON Web Tokens)** et **Spring Security**.

---

## 📋 Ce qui a été fait

### 1. ✅ Ajout des Dépendances JWT

- ✅ `jjwt-api` - API JWT
- ✅ `jjwt-impl` - Implémentation JWT
- ✅ `jjwt-jackson` - Support Jackson pour JWT

### 2. ✅ Création des Services et Filtres

- ✅ `JwtService.java` - Service pour générer et valider les tokens JWT
- ✅ `JwtAuthenticationFilter.java` - Filtre pour intercepter et valider les tokens
- ✅ `CustomUserDetailsService.java` - Service pour charger les détails des utilisateurs

### 3. ✅ Modification de la Configuration

- ✅ `SecurityConfig.java` - Configuration Spring Security avec protection des endpoints
- ✅ `AuthController.java` - Génération de tokens JWT lors du login
- ✅ `application.properties` - Configuration JWT (secret et expiration)

### 4. ✅ Endpoints Protégés

**Endpoints publics (pas d'authentification) :**
- ✅ `/api/auth/**` - Authentification
- ✅ `/` - Page d'accueil
- ✅ `/health` - Santé de l'application

**Endpoints protégés (authentification JWT requise) :**
- 🔒 `/api/users/**` - Gestion des utilisateurs
- 🔒 `/api/operations/**` - Gestion des opérations
- 🔒 `/api/accounts/**` - Gestion des comptes
- 🔒 `/api/comptes/**` - Gestion des comptes (alias)
- 🔒 `/api/reconciliation/**` - Réconciliation
- 🔒 `/api/rankings/**` - Classements
- 🔒 `/api/statistics/**` - Statistiques

**Endpoints Admin seulement :**
- 🔒 `/api/sql/**` - Requêtes SQL (ROLE_ADMIN requis)

---

## 🚀 Comment Utiliser

### 1. Se connecter et obtenir un token

**Requête :**
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"votre_mot_de_passe"}'
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

### 2. Utiliser le token pour accéder aux endpoints protégés

**Requête avec token :**
```bash
curl -X GET http://localhost:8080/api/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Si le token est valide :** ✅ Accès autorisé  
**Si le token est absent ou invalide :** ❌ 401 Unauthorized

### 3. Exemple avec un endpoint protégé

```bash
# 1. Se connecter et récupérer le token
TOKEN=$(curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"votre_mot_de_passe"}' \
  | jq -r '.token')

# 2. Utiliser le token pour accéder à /api/users
curl -X GET http://localhost:8080/api/users \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🔧 Configuration

### Variables d'Environnement

**JWT Secret (Recommandé en production) :**
```bash
# Windows
set JWT_SECRET=votre-secret-jwt-securise-minimum-32-caracteres

# Linux/Mac
export JWT_SECRET=votre-secret-jwt-securise-minimum-32-caracteres
```

**Dans `application.properties` :**
```properties
jwt.secret=${JWT_SECRET:your-256-bit-secret-key-change-this-in-production-minimum-32-characters-required-for-hmac-sha256}
jwt.expiration=86400000  # 24 heures en millisecondes
```

---

## 🛡️ Sécurité

### ✅ Fonctionnalités de Sécurité Implémentées

1. **Hashage BCrypt des mots de passe**
   - ✅ Mots de passe hashés avant stockage
   - ✅ Migration automatique des anciens mots de passe

2. **JWT avec expiration**
   - ✅ Tokens avec date d'expiration (24h par défaut)
   - ✅ Validation automatique des tokens

3. **Protection des endpoints**
   - ✅ Endpoints sensibles protégés
   - ✅ Endpoints admin avec rôle requis

4. **Filtre JWT**
   - ✅ Validation automatique des tokens sur chaque requête
   - ✅ Gestion des erreurs de token

### ⚠️ Bonnes Pratiques

1. **Changer le secret JWT en production**
   ```properties
   jwt.secret=${JWT_SECRET}
   ```
   Définir `JWT_SECRET` avec une valeur aléatoire de minimum 32 caractères.

2. **Ajuster l'expiration selon vos besoins**
   ```properties
   jwt.expiration=3600000  # 1 heure
   jwt.expiration=86400000  # 24 heures
   jwt.expiration=604800000  # 7 jours
   ```

3. **Utiliser HTTPS en production**
   - Les tokens JWT sont transmis dans les headers HTTP
   - HTTPS est essentiel pour protéger les tokens en transit

4. **Gérer la révocation des tokens**
   - Pour l'instant, les tokens sont valides jusqu'à expiration
   - Pour une révocation immédiate, implémenter une blacklist de tokens

---

## 📝 Frontend Angular

### Exemple d'utilisation dans Angular

**Service d'authentification :**
```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private tokenKey = 'auth_token';
  private apiUrl = 'http://localhost:8080/api';

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/login`, { username, password })
      .pipe(
        tap((response: any) => {
          if (response.token) {
            localStorage.setItem(this.tokenKey, response.token);
          }
        })
      );
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}
```

**Interceptor HTTP pour ajouter le token :**
```typescript
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getToken();
    
    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
    
    return next.handle(request);
  }
}
```

**Configuration dans `app.module.ts` :**
```typescript
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { JwtInterceptor } from './services/jwt.interceptor';

providers: [
  {
    provide: HTTP_INTERCEPTORS,
    useClass: JwtInterceptor,
    multi: true
  }
]
```

---

## 🧪 Tests

### Test avec curl

**1. Tester l'accès sans token (devrait échouer) :**
```bash
curl -X GET http://localhost:8080/api/users
# Réponse: 401 Unauthorized
```

**2. Se connecter et obtenir un token :**
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"votre_mot_de_passe"}'
```

**3. Tester l'accès avec token (devrait réussir) :**
```bash
curl -X GET http://localhost:8080/api/users \
  -H "Authorization: Bearer VOTRE_TOKEN_ICI"
```

### Test avec Postman

1. **Créer une requête de login :**
   - URL: `POST http://localhost:8080/api/auth/login`
   - Body (JSON): `{"username":"admin","password":"votre_mot_de_passe"}`
   - Copier le token de la réponse

2. **Créer une requête protégée :**
   - URL: `GET http://localhost:8080/api/users`
   - Headers: `Authorization: Bearer VOTRE_TOKEN_ICI`

---

## 📊 Structure des Tokens JWT

Un token JWT contient :
- **Header** : Algorithme de signature (HS256)
- **Payload** : 
  - `username` : Nom d'utilisateur
  - `role` : Rôle (ADMIN ou USER)
  - `iat` : Date d'émission
  - `exp` : Date d'expiration
- **Signature** : Signature HMAC-SHA256

Exemple de payload décodé :
```json
{
  "username": "admin",
  "role": "ADMIN",
  "iat": 1700000000,
  "exp": 1700086400
}
```

---

## 🔍 Dépannage

### Erreur 401 Unauthorized

**Causes possibles :**
1. Token absent dans le header `Authorization`
2. Token expiré
3. Token invalide ou malformé
4. Secret JWT différent entre génération et validation

**Solutions :**
1. Vérifier que le header `Authorization: Bearer TOKEN` est présent
2. Refaire un login pour obtenir un nouveau token
3. Vérifier que le token est bien formaté
4. Vérifier la configuration JWT (secret et expiration)

### Erreur 403 Forbidden

**Causes possibles :**
1. Rôle insuffisant (ex: USER essayant d'accéder à `/api/sql/**`)

**Solutions :**
1. Utiliser un compte avec le rôle approprié (ADMIN)

---

## 📚 Ressources

- **Spring Security Documentation :** https://spring.io/projects/spring-security
- **JWT.io :** https://jwt.io/ (décoder et tester les tokens)
- **JJWT Library :** https://github.com/jwtk/jjwt

---

**Date de création :** 14 novembre 2025  
**Dernière mise à jour :** 14 novembre 2025  
**Version :** 1.0

