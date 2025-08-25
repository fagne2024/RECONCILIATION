# Migration WebSocket - Réconciliation Scalable

## 🎯 Objectif
Transformer le système de réconciliation pour gérer des fichiers volumineux (2M+ lignes) avec une architecture WebSocket moderne et asynchrone.

## ✅ État Actuel - Frontend Prêt

### Architecture Implémentée
- **ReconciliationService** : Architecture WebSocket complète avec reconnexion automatique
- **ReconciliationComponent** : Interface réactive avec gestion temps réel
- **Types modernes** : `ReconciliationConfig`, `WebSocketMessage`, `ProgressUpdate`
- **Compatibilité** : L'ancienne API `reconcile()` fonctionne encore

### Fonctionnalités WebSocket
- ✅ Connexion persistante avec reconnexion automatique
- ✅ Messages typés : `PROGRESS_UPDATE`, `RECONCILIATION_COMPLETE`, `RECONCILIATION_ERROR`
- ✅ Progression en temps réel avec étapes détaillées
- ✅ Gestion d'état avancée (jobId, annulation, etc.)
- ✅ Détection de changements optimisée

## ⚠️ Mode Temporaire Actuel

**WebSockets désactivés temporairement** pour permettre à l'application de fonctionner avec le backend existant.

### Changements Temporaires
- `ReconciliationService` : Utilise l'API `reconcile()` existante
- `ReconciliationComponent` : WebSockets désactivés
- Progression simulée via l'API classique

## 🚀 Prochaines Étapes - Backend

### 1. Endpoints WebSocket à Implémenter

#### WebSocket Endpoint
```
ws://localhost:8080/ws/reconciliation
```

#### Messages à Gérer
```typescript
// Messages entrants (client → serveur)
{
  type: 'CONNECTION_STATUS',
  payload: { 
    status: 'connected', 
    clientId: string 
  }
}

{
  type: 'CONNECTION_STATUS',
  payload: {
    action: 'START_RECONCILIATION',
    jobId: string,
    config: ReconciliationConfig
  }
}

// Messages sortants (serveur → client)
{
  type: 'PROGRESS_UPDATE',
  payload: {
    percentage: number,
    processed: number,
    total: number,
    step: string,
    estimatedTimeRemaining?: number
  }
}

{
  type: 'RECONCILIATION_COMPLETE',
  payload: ReconciliationResponse
}

{
  type: 'RECONCILIATION_ERROR',
  payload: { error: string }
}
```

### 2. Nouveaux Endpoints HTTP

#### Upload et Préparation
```
POST /api/reconciliation/upload-and-prepare
Content-Type: multipart/form-data

FormData:
- boFile: File
- partnerFile: File
- boReconciliationKey: string
- partnerReconciliationKey: string
- additionalKeys?: string (JSON)
- tolerance?: string

Response: { jobId: string, status: string }
```

#### Statut de Job
```
GET /api/reconciliation/status/{jobId}
Response: { 
  status: string, 
  progress?: ProgressUpdate, 
  result?: ReconciliationResponse 
}
```

#### Annulation
```
POST /api/reconciliation/cancel
Body: { jobId: string }
Response: { status: string }
```

### 3. Architecture Backend Recommandée

#### Structure de Job
```java
public class ReconciliationJob {
    private String jobId;
    private ReconciliationConfig config;
    private JobStatus status;
    private ProgressUpdate progress;
    private ReconciliationResponse result;
    private String error;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
}
```

#### Gestionnaire de Jobs
```java
@Service
public class ReconciliationJobManager {
    private Map<String, ReconciliationJob> activeJobs = new ConcurrentHashMap<>();
    
    public String createJob(ReconciliationConfig config);
    public void updateProgress(String jobId, ProgressUpdate progress);
    public void completeJob(String jobId, ReconciliationResponse result);
    public void failJob(String jobId, String error);
    public void cancelJob(String jobId);
}
```

#### WebSocket Handler
```java
@Component
public class ReconciliationWebSocketHandler {
    public void handleStartReconciliation(String jobId, ReconciliationConfig config);
    public void broadcastProgress(String jobId, ProgressUpdate progress);
    public void broadcastComplete(String jobId, ReconciliationResponse result);
    public void broadcastError(String jobId, String error);
}
```

## 🔄 Activation des WebSockets

### Étape 1 : Backend Prêt
Une fois le backend implémenté, décommenter dans `ReconciliationService` :
```typescript
constructor(private http: HttpClient) {
    console.log('🚀 ReconciliationService initialisé');
    this.initializeWebSocket(); // ← Décommenter cette ligne
}
```

### Étape 2 : Composant Prêt
Décommenter dans `ReconciliationComponent` :
```typescript
ngOnInit(): void {
    console.log('🚀 ReconciliationComponent initialisé');
    this.initializeWebSocketListeners(); // ← Décommenter
    this.connectToWebSocket(); // ← Décommenter
}
```

### Étape 3 : API Moderne
Remplacer la méthode `startReconciliation` temporaire par la vraie implémentation WebSocket.

## 📊 Avantages de la Nouvelle Architecture

### Performance
- **Upload séparé** : Fichiers uploadés avant traitement
- **Traitement asynchrone** : Pas de blocage du navigateur
- **Progression temps réel** : Feedback utilisateur immédiat
- **Annulation** : Possibilité d'arrêter un job en cours

### Scalabilité
- **Fichiers volumineux** : 2M+ lignes sans problème
- **Mémoire optimisée** : Traitement côté serveur
- **Connexion persistante** : Moins de surcharge réseau
- **Jobs en arrière-plan** : Traitement non-bloquant

### UX
- **Progression détaillée** : Étapes visibles
- **Temps estimé** : Prédiction de fin
- **Statut en temps réel** : Connexion, traitement, erreurs
- **Interface réactive** : Mises à jour instantanées

## 🧪 Tests Recommandés

### Tests de Performance
1. **Fichiers volumineux** : 1M, 2M, 5M lignes
2. **Connexion instable** : Test de reconnexion
3. **Annulation** : Test d'arrêt en cours
4. **Mémoire** : Vérifier l'usage mémoire

### Tests d'Intégration
1. **WebSocket** : Connexion/déconnexion
2. **Messages** : Tous les types de messages
3. **Progression** : Mises à jour temps réel
4. **Erreurs** : Gestion des erreurs réseau

## 📝 Notes de Migration

### Compatibilité
- L'ancienne API `reconcile()` reste fonctionnelle
- Migration progressive possible
- Pas de breaking changes

### Rollback
- WebSockets peuvent être désactivés facilement
- API classique toujours disponible
- Migration réversible

### Monitoring
- Logs WebSocket détaillés
- Métriques de performance
- Alertes de déconnexion

---

**Status** : Frontend prêt, Backend à implémenter
**Priorité** : Moyenne (application fonctionne actuellement)
**Complexité** : Élevée (architecture distribuée)
