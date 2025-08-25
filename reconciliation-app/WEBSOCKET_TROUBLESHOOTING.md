# 🔧 Dépannage WebSocket

## 🚨 Problème Actuel

Le backend ne démarre pas correctement après les modifications WebSocket. Voici les étapes pour résoudre le problème.

## 🔍 Diagnostic

### 1. Vérifier les Logs du Backend
```bash
cd backend
mvn spring-boot:run
```

### 2. Problèmes Potentiels

#### A. Conflit de Configuration WebSocket
- **Problème**: Deux configurations WebSocket actives (STOMP + Natif)
- **Solution**: Désactiver complètement la configuration STOMP

#### B. Erreurs de Compilation
- **Problème**: Erreurs dans les nouveaux fichiers WebSocket
- **Solution**: Vérifier la compilation avec `mvn clean compile`

#### C. Port Occupé
- **Problème**: Le port 8080 est déjà utilisé
- **Solution**: Arrêter les processus existants ou changer le port

## 🛠️ Solutions

### Solution 1: Configuration WebSocket Simplifiée

1. **Désactiver complètement STOMP** :
   ```java
   // Dans WebSocketConfig.java
   // @Configuration
   // @EnableWebSocketMessageBroker
   public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
   ```

2. **Utiliser seulement la configuration native** :
   ```java
   @Configuration
   @EnableWebSocket
   public class SimpleWebSocketConfig implements WebSocketConfigurer {
   ```

### Solution 2: Vérifier les Dépendances

Assurez-vous que les dépendances WebSocket sont correctes dans `pom.xml` :
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-websocket</artifactId>
</dependency>
```

### Solution 3: Redémarrer Proprement

1. **Arrêter tous les processus** :
   ```bash
   # Windows
   taskkill /f /im java.exe
   
   # Ou arrêter manuellement les processus dans le gestionnaire de tâches
   ```

2. **Nettoyer et recompiler** :
   ```bash
   cd backend
   mvn clean compile
   ```

3. **Redémarrer le backend** :
   ```bash
   mvn spring-boot:run
   ```

## 🧪 Test de Connexion

### Test du Backend
```bash
curl http://localhost:8080/api/reconciliation/health
```

### Test du Frontend
```bash
curl http://localhost:4200
```

### Test WebSocket
Ouvrir la console du navigateur (F12) et vérifier :
```
🔌 WebSockets activés - mode temps réel
🔌 Tentative de connexion WebSocket...
✅ Connexion WebSocket établie
```

## 📋 Checklist de Vérification

- [ ] Backend compile sans erreur
- [ ] Backend démarre sur le port 8080
- [ ] Health check répond correctement
- [ ] Frontend est accessible sur le port 4200
- [ ] WebSocket se connecte sans erreur
- [ ] Messages WebSocket sont reçus

## 🚀 Prochaines Étapes

1. **Résoudre le problème de démarrage backend**
2. **Tester la connexion WebSocket**
3. **Vérifier les messages de progression**
4. **Tester avec des fichiers CSV**

## 📞 Support

Si le problème persiste :
1. Vérifier les logs complets du backend
2. Vérifier la console du navigateur
3. Vérifier les erreurs de compilation
4. Redémarrer complètement l'environnement

---

**🎯 Objectif**: Avoir un système WebSocket fonctionnel pour la réconciliation en temps réel.
