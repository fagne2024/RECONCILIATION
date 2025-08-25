# Implémentation WebSocket - Backend

## 🎯 Vue d'ensemble

Cette implémentation ajoute le support WebSocket au backend Spring Boot pour permettre la réconciliation asynchrone et en temps réel des fichiers volumineux.

## 📁 Structure des Fichiers

### DTOs (Data Transfer Objects)
- `WebSocketMessage.java` - Messages WebSocket typés
- `ProgressUpdate.java` - Mises à jour de progression
- `ReconciliationConfig.java` - Configuration de réconciliation

### Entités
- `ReconciliationJob.java` - Entité JPA pour les jobs de réconciliation

### Repository
- `ReconciliationJobRepository.java` - Interface JPA pour les opérations de base de données

### Services
- `ReconciliationJobService.java` - Gestion des jobs de réconciliation
- `ReconciliationWebSocketService.java` - Communication WebSocket

### Contrôleurs
- `WebSocketController.java` - Gestion des messages WebSocket
- `ReconciliationWebSocketController.java` - Endpoints REST pour WebSocket

### Configuration
- `WebSocketConfig.java` - Configuration Spring WebSocket

## 🚀 Installation et Configuration

### 1. Dépendances Maven

Les dépendances WebSocket ont été ajoutées au `pom.xml` :

```xml
<!-- Spring Boot WebSocket -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-websocket</artifactId>
</dependency>

<!-- Spring Boot WebFlux -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-webflux</artifactId>
</dependency>
```

### 2. Base de Données

Exécuter le script de configuration :

```powershell
# Dans le répertoire backend
.\execute-websocket-setup.ps1
```

Ou manuellement :

```sql
-- Exécuter le contenu de create-reconciliation-jobs-table.sql
```

### 3. Redémarrage du Backend

```bash
# Redémarrer le serveur Spring Boot
mvn spring-boot:run
```

## 🔗 Endpoints Disponibles

### WebSocket
- **Endpoint** : `ws://localhost:8080/ws/reconciliation`
- **Protocole** : STOMP over WebSocket
- **Support** : SockJS pour la compatibilité

### REST API
- **Upload** : `POST /api/reconciliation/upload-and-prepare`
- **Status** : `GET /api/reconciliation/status/{jobId}`
- **Cancel** : `POST /api/reconciliation/cancel`
- **Health** : `GET /api/reconciliation/health`

## 📨 Messages WebSocket

### Messages Entrants (Client → Serveur)

#### Connexion
```json
{
  "type": "CONNECTION_STATUS",
  "payload": {
    "status": "connected",
    "clientId": "client_1234567890_abc123"
  },
  "timestamp": 1640995200000
}
```

#### Démarrage Réconciliation
```json
{
  "type": "CONNECTION_STATUS",
  "payload": {
    "action": "START_RECONCILIATION",
    "jobId": "job_1640995200000_abc123",
    "clientId": "client_1234567890_abc123"
  },
  "timestamp": 1640995200000
}
```

### Messages Sortants (Serveur → Client)

#### Mise à Jour Progression
```json
{
  "type": "PROGRESS_UPDATE",
  "payload": {
    "percentage": 50,
    "processed": 50000,
    "total": 100000,
    "step": "Correspondance des enregistrements...",
    "currentFile": 1,
    "totalFiles": 2,
    "estimatedTimeRemaining": 30000
  },
  "timestamp": 1640995200000
}
```

#### Réconciliation Terminée
```json
{
  "type": "RECONCILIATION_COMPLETE",
  "payload": {
    "matches": [...],
    "boOnly": [...],
    "partnerOnly": [...],
    "mismatches": [...],
    "totalBoRecords": 100000,
    "totalPartnerRecords": 100000,
    "totalMatches": 80000,
    "totalMismatches": 20000,
    "totalBoOnly": 10000,
    "totalPartnerOnly": 10000,
    "executionTimeMs": 120000,
    "processedRecords": 200000,
    "progressPercentage": 100
  },
  "timestamp": 1640995200000
}
```

#### Erreur
```json
{
  "type": "RECONCILIATION_ERROR",
  "payload": {
    "error": "Erreur lors du traitement des fichiers"
  },
  "timestamp": 1640995200000
}
```

## 🔄 Flux de Traitement

### 1. Upload et Préparation
1. Client envoie fichiers via `POST /api/reconciliation/upload-and-prepare`
2. Serveur sauvegarde fichiers et crée un job
3. Serveur retourne `jobId` et `clientId`

### 2. Démarrage Réconciliation
1. Client envoie message WebSocket pour démarrer la réconciliation
2. Serveur lance le traitement en arrière-plan
3. Serveur envoie mises à jour de progression via WebSocket

### 3. Suivi Progression
1. Serveur traite les fichiers par étapes
2. Chaque étape envoie une mise à jour de progression
3. Client affiche la progression en temps réel

### 4. Finalisation
1. Serveur termine le traitement
2. Serveur envoie le résultat final via WebSocket
3. Job marqué comme `COMPLETED` en base

## 🗄️ Structure de la Base de Données

### Table `reconciliation_jobs`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | BIGINT | Clé primaire auto-incrémentée |
| `job_id` | VARCHAR(255) | Identifiant unique du job |
| `status` | ENUM | Statut du job (PENDING, PROCESSING, etc.) |
| `bo_file_path` | VARCHAR(500) | Chemin du fichier BO |
| `partner_file_path` | VARCHAR(500) | Chemin du fichier partenaire |
| `config_json` | TEXT | Configuration JSON |
| `progress_json` | TEXT | Progression JSON |
| `result_json` | TEXT | Résultat JSON |
| `error_message` | TEXT | Message d'erreur |
| `created_at` | TIMESTAMP | Date de création |
| `updated_at` | TIMESTAMP | Date de mise à jour |
| `completed_at` | TIMESTAMP | Date de fin |
| `client_id` | VARCHAR(255) | Identifiant du client |

## 🛠️ Gestion des Erreurs

### Types d'Erreurs
- **Erreurs d'upload** : Fichiers corrompus, taille excessive
- **Erreurs de traitement** : Format invalide, données manquantes
- **Erreurs de connexion** : WebSocket déconnecté
- **Erreurs de base de données** : Problèmes de persistance

### Gestion des Jobs Expirés
- Nettoyage automatique des jobs de plus de 24h
- Marquage automatique comme `FAILED`
- Notification aux clients concernés

## 🔧 Configuration

### WebSocket
```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig {
    // Configuration du broker de messages
    // Endpoints STOMP
    // Support SockJS
}
```

### Base de Données
```properties
# application.properties
spring.jpa.hibernate.ddl-auto=validate
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true
```

## 🧪 Tests

### Tests de Connexion WebSocket
```bash
# Test avec wscat (installer avec npm)
npm install -g wscat
wscat -c ws://localhost:8080/ws/reconciliation
```

### Tests d'Endpoints REST
```bash
# Test de santé
curl http://localhost:8080/api/reconciliation/health

# Test d'upload (avec fichiers)
curl -X POST http://localhost:8080/api/reconciliation/upload-and-prepare \
  -F "boFile=@bo.csv" \
  -F "partnerFile=@partner.csv" \
  -F "boReconciliationKey=CLE" \
  -F "partnerReconciliationKey=CLE"
```

## 📊 Monitoring

### Logs
- Logs détaillés pour chaque étape
- Métriques de performance
- Alertes d'erreurs

### Métriques
- Nombre de jobs actifs
- Temps de traitement moyen
- Taux de succès/échec
- Utilisation mémoire

## 🔄 Migration depuis l'API Existante

### Compatibilité
- L'API existante reste fonctionnelle
- Migration progressive possible
- Pas de breaking changes

### Activation
1. Décommenter les WebSockets dans le frontend
2. Tester avec de petits fichiers
3. Migrer progressivement vers la nouvelle API

## 🚀 Prochaines Étapes

### Optimisations
- [ ] Traitement par chunks pour fichiers très volumineux
- [ ] Cache Redis pour les résultats
- [ ] Load balancing pour plusieurs instances
- [ ] Métriques Prometheus/Grafana

### Fonctionnalités
- [ ] Notifications push
- [ ] Historique des jobs
- [ ] Reprocessing automatique
- [ ] Export des résultats

---

**Status** : ✅ Implémentation complète
**Version** : 1.0.0
**Date** : 2025-01-25
