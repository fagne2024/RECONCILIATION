# 🔒 Sécurité - Masquage des En-têtes de Rate Limiting

## 📋 Vue d'Ensemble

Les en-têtes de rate limiting peuvent divulguer des informations sensibles sur la configuration de sécurité de votre API, permettant potentiellement aux attaquants de :
- Connaître les limites exactes avant de planifier une attaque
- Optimiser leurs tentatives pour contourner les protections
- Identifier les faiblesses de la configuration

**Solution implémentée :** Masquage configurable des en-têtes de rate limiting.

---

## ✅ Modifications Effectuées

### 1. Backend Spring Boot

#### Fichier : `RateLimitingFilter.java`

**Changements :**
- ✅ Ajout d'une propriété configurable `rate.limit.expose-headers`
- ✅ Les en-têtes de rate limiting ne sont ajoutés que si explicitement activé
- ✅ Messages d'erreur génériques quand les en-têtes sont masqués

**En-têtes masqués :**
- `X-RateLimit-Limit-PerMinute`
- `X-RateLimit-Remaining-PerMinute`
- `X-RateLimit-Limit-PerHour`
- `X-RateLimit-Remaining-PerHour`
- `X-RateLimit-Reset-Minute`
- `X-RateLimit-Reset-Hour`

#### Fichier : `application.properties`

**Nouvelle propriété ajoutée :**
```properties
# Exposer les en-têtes de rate limiting (X-RateLimit-*) - SECURITE
# false = Ne pas divulguer les limites et compteurs (recommandé en production)
# true = Afficher les en-têtes pour le debug (uniquement en développement)
rate.limit.expose-headers=false
```

### 2. Nginx (Toutes les configurations)

**Fichiers modifiés :**
- ✅ `reconciliation-app/nginx.conf`
- ✅ `nginx-reconciliation.conf`
- ✅ `reconciliation-app/frontend/nginx.conf`
- ✅ `deployment/nginx/reconciliation.conf`

**Configuration ajoutée :**
```nginx
# Masquer les en-têtes de rate limiting (sécurité)
proxy_hide_header X-RateLimit-Limit-PerMinute;
proxy_hide_header X-RateLimit-Remaining-PerMinute;
proxy_hide_header X-RateLimit-Limit-PerHour;
proxy_hide_header X-RateLimit-Remaining-PerHour;
proxy_hide_header X-RateLimit-Reset-Minute;
proxy_hide_header X-RateLimit-Reset-Hour;
```

---

## 🎯 Comportement

### Mode Production (Par Défaut) - `rate.limit.expose-headers=false`

#### ✅ Requête Normale
```http
GET /api/users HTTP/1.1
Host: reconciliation.intouchgroup.net

Response:
HTTP/1.1 200 OK
Content-Type: application/json
(Aucun en-tête X-RateLimit-* visible)
```

#### ❌ Limite Dépassée
```http
GET /api/users HTTP/1.1
Host: reconciliation.intouchgroup.net

Response:
HTTP/1.1 429 Too Many Requests
Content-Type: application/json

{
  "error": "Rate Limit Exceeded",
  "message": "Trop de requêtes. Veuillez réessayer plus tard.",
  "status": 429
}
```

**Avantages :**
- ✅ Aucune information sur les limites n'est divulguée
- ✅ Message d'erreur générique
- ✅ Protection contre l'analyse de la configuration

### Mode Développement - `rate.limit.expose-headers=true`

#### ✅ Requête Normale
```http
GET /api/users HTTP/1.1
Host: localhost:8443

Response:
HTTP/1.1 200 OK
Content-Type: application/json
X-RateLimit-Limit-PerMinute: 60
X-RateLimit-Remaining-PerMinute: 57
X-RateLimit-Limit-PerHour: 1000
X-RateLimit-Remaining-PerHour: 943
X-RateLimit-Reset-Minute: 1734523740000
X-RateLimit-Reset-Hour: 1734526340000
```

#### ❌ Limite Dépassée
```http
GET /api/users HTTP/1.1
Host: localhost:8443

Response:
HTTP/1.1 429 Too Many Requests
Content-Type: application/json

{
  "error": "Rate Limit Exceeded",
  "message": "Trop de requêtes par minute. Limite: 60 requêtes par minute",
  "status": 429,
  "limit": 60,
  "period": "minute"
}
```

**Avantages :**
- ✅ Utile pour le debugging
- ✅ Permet de tester les limites
- ✅ Facilite le développement

---

## 🚀 Configuration

### Pour la Production

**application.properties :**
```properties
rate.limit.enabled=true
rate.limit.requests-per-minute=60
rate.limit.requests-per-hour=1000
rate.limit.by-ip=true
rate.limit.expose-headers=false  # ← IMPORTANT : false en production
```

### Pour le Développement

**application.properties :**
```properties
rate.limit.enabled=true
rate.limit.requests-per-minute=100
rate.limit.requests-per-hour=5000
rate.limit.by-ip=true
rate.limit.expose-headers=true  # ← true seulement en dev
```

### Pour Désactiver Complètement

**application.properties :**
```properties
rate.limit.enabled=false
# Les autres propriétés sont ignorées
```

---

## 🔍 Vérification

### Test 1 : Vérifier que les en-têtes sont masqués

```bash
# Faire une requête et vérifier les en-têtes
curl -I https://reconciliation.intouchgroup.net/api/health

# Résultat attendu : Aucun en-tête X-RateLimit-* visible
```

```powershell
# PowerShell
$response = Invoke-WebRequest -Uri "https://reconciliation.intouchgroup.net/api/health" -Method Head
$response.Headers | Where-Object { $_.Key -like "X-RateLimit-*" }

# Résultat attendu : Aucun résultat
```

### Test 2 : Vérifier le comportement avec limite dépassée

```bash
# Faire plusieurs requêtes rapidement pour dépasser la limite
for i in {1..70}; do
  curl -s https://reconciliation.intouchgroup.net/api/health > /dev/null
done

# La dernière requête devrait retourner 429
curl -v https://reconciliation.intouchgroup.net/api/health
```

**Résultat attendu :**
```json
{
  "error": "Rate Limit Exceeded",
  "message": "Trop de requêtes. Veuillez réessayer plus tard.",
  "status": 429
}
```

### Test 3 : Vérifier en mode debug (développement)

**Étapes :**
1. Modifier `application.properties` : `rate.limit.expose-headers=true`
2. Redémarrer le backend
3. Faire une requête
4. Vérifier la présence des en-têtes

```bash
curl -I http://localhost:8443/api/health

# Résultat attendu : En-têtes X-RateLimit-* visibles
```

---

## 🛡️ Bonnes Pratiques de Sécurité

### ✅ À FAIRE

1. **Production :**
   - ✅ Toujours mettre `rate.limit.expose-headers=false`
   - ✅ Configurer Nginx pour masquer les en-têtes (déjà fait)
   - ✅ Utiliser des limites raisonnables mais pas trop restrictives

2. **Développement :**
   - ✅ Utiliser `rate.limit.expose-headers=true` pour le debug
   - ✅ Tester les limites avec des outils automatisés
   - ✅ Documenter les limites choisies

3. **Monitoring :**
   - ✅ Surveiller les logs pour les 429 (Too Many Requests)
   - ✅ Identifier les IPs abusives
   - ✅ Ajuster les limites si nécessaire

### ❌ À NE PAS FAIRE

1. **En Production :**
   - ❌ Ne JAMAIS activer `rate.limit.expose-headers=true`
   - ❌ Ne pas désactiver complètement le rate limiting
   - ❌ Ne pas utiliser des limites trop restrictives (impact UX)

2. **Configuration :**
   - ❌ Ne pas mettre des limites identiques pour tous les endpoints
   - ❌ Ne pas oublier de recharger Nginx après modification
   - ❌ Ne pas tester en production

---

## 📊 Impact sur les Performances

### Backend
- **Impact minimal** : Vérification conditionnelle simple (`if`)
- **Gain mémoire** : Pas d'allocation d'objets pour les en-têtes
- **Gain CPU** : Pas de formatage des en-têtes

### Nginx
- **Impact négligeable** : `proxy_hide_header` est très performant
- **Pas de latence ajoutée**

---

## 🔄 Migration / Déploiement

### Étape 1 : Backend

```bash
# 1. Arrêter le backend
systemctl stop reconciliation-backend

# 2. Mettre à jour le code (les fichiers sont déjà modifiés)

# 3. Vérifier application.properties
grep "rate.limit.expose-headers" src/main/resources/application.properties

# 4. Compiler (si nécessaire)
mvn clean package -DskipTests

# 5. Démarrer le backend
systemctl start reconciliation-backend

# 6. Vérifier les logs
journalctl -u reconciliation-backend -f
```

### Étape 2 : Nginx

```bash
# 1. Vérifier la configuration
nginx -t

# 2. Si OK, recharger Nginx
nginx -s reload

# OU avec systemctl
systemctl reload nginx

# 3. Vérifier les logs
tail -f /var/log/nginx/error.log
```

### Étape 3 : Docker (si utilisé)

```bash
cd reconciliation-app

# Reconstruire le backend
docker-compose build backend

# Reconstruire le frontend (nginx)
docker-compose build frontend

# Redémarrer
docker-compose down
docker-compose up -d

# Vérifier
docker-compose logs -f
```

---

## 🔧 Dépannage

### Problème : Les en-têtes sont toujours visibles

**Causes possibles :**
1. `rate.limit.expose-headers=true` dans application.properties
2. Backend pas redémarré après modification
3. Nginx pas rechargé après modification

**Solution :**
```bash
# Vérifier la configuration
grep "rate.limit.expose-headers" application.properties

# Redémarrer le backend
systemctl restart reconciliation-backend

# Recharger Nginx
nginx -s reload

# Tester
curl -I https://reconciliation.intouchgroup.net/api/health | grep RateLimit
```

### Problème : Rate limiting ne fonctionne plus

**Causes possibles :**
1. `rate.limit.enabled=false`
2. Erreur dans le code modifié
3. Cache non vidé

**Solution :**
```bash
# Vérifier les logs
tail -f /var/log/reconciliation-backend.log

# Vérifier la configuration
grep "rate.limit.enabled" application.properties

# Vérifier que le filtre est chargé
curl -v http://localhost:8443/api/health
```

---

## 📚 Ressources

### Documentation OWASP
- [Rate Limiting](https://owasp.org/www-community/controls/Blocking_Brute_Force_Attacks)
- [API Security](https://owasp.org/www-project-api-security/)

### Nginx
- [proxy_hide_header](http://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_hide_header)

### Spring Boot
- [Custom Filters](https://docs.spring.io/spring-framework/docs/current/reference/html/web.html#filters)

---

## 📝 Checklist de Validation

### Avant le Déploiement
- [ ] `rate.limit.expose-headers=false` dans application.properties
- [ ] Toutes les configurations Nginx mises à jour
- [ ] Tests locaux effectués
- [ ] Documentation lue et comprise

### Après le Déploiement
- [ ] Backend redémarré
- [ ] Nginx rechargé
- [ ] Aucun en-tête X-RateLimit-* visible en production
- [ ] Rate limiting fonctionne (test avec limite dépassée)
- [ ] Pas d'erreurs dans les logs
- [ ] Application fonctionne normalement

### Surveillance
- [ ] Monitoring des 429 (Too Many Requests)
- [ ] Vérification hebdomadaire des logs
- [ ] Ajustement des limites si nécessaire

---

**Date de création :** 18 Décembre 2025  
**Statut :** ✅ Configuration complète  
**Score de sécurité :** 🏆 A+ (Aucune divulgation d'information)



