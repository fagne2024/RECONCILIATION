# Guide de Dépannage - Sélection de Fichiers Modèles

## 🚨 Erreur : "Erreur lors du chargement des fichiers disponibles"

### 🔍 Diagnostic

Cette erreur peut survenir pour plusieurs raisons. Suivez ce guide étape par étape pour identifier et résoudre le problème.

### 📋 Étapes de Diagnostic

#### 1. Vérifier le serveur backend

```powershell
# Vérifier si le serveur est en cours d'exécution
netstat -an | findstr :3000

# Tester l'endpoint de statut
Invoke-RestMethod -Uri "http://localhost:3000/api/file-watcher/status" -Method GET
```

**Résultat attendu :**
```json
{
  "success": true,
  "watchPath": "./watch-folder",
  "isProcessing": false,
  "queueLength": 0
}
```

#### 2. Tester l'endpoint des fichiers disponibles

```powershell
# Tester l'endpoint available-files
Invoke-RestMethod -Uri "http://localhost:3000/api/file-watcher/available-files" -Method GET
```

**Résultat attendu :**
```json
[
  {
    "fileName": "exemple_clients.csv",
    "filePath": "watch-folder\\exemple_clients.csv",
    "fileType": "csv",
    "recordCount": 0,
    "columns": [],
    "sampleData": []
  }
]
```

#### 3. Vérifier le dossier watch-folder

```powershell
# Vérifier que le dossier existe
Test-Path "watch-folder"

# Lister les fichiers dans le dossier
Get-ChildItem "watch-folder" -File
```

### 🔧 Solutions

#### Solution 1 : Redémarrer le serveur backend

Si le serveur ne répond pas ou si les endpoints ne fonctionnent pas :

```powershell
# Arrêter tous les processus Node.js
taskkill /F /IM node.exe

# Redémarrer le serveur
node simple-server.js
```

#### Solution 2 : Vérifier la configuration CORS

Le serveur doit avoir CORS activé. Vérifiez dans `simple-server.js` :

```javascript
const cors = require('cors');
app.use(cors());
```

#### Solution 3 : Vérifier la configuration frontend

Dans `environment.ts`, vérifiez que l'URL est correcte :

```typescript
export const environment = {
    production: false,
    apiUrl: 'http://localhost:3000'
};
```

#### Solution 4 : Créer des fichiers de test

Si aucun fichier n'est trouvé, créez des fichiers de test :

```powershell
# Créer le dossier watch-folder s'il n'existe pas
New-Item -ItemType Directory -Path "watch-folder" -Force

# Créer un fichier CSV de test
@"
id,nom,montant,date,description
1,Client A,1500.50,2024-01-15,Paiement facture
2,Client B,2300.75,2024-01-16,Remboursement
"@ | Out-File -FilePath "watch-folder/exemple_test.csv" -Encoding UTF8
```

#### Solution 5 : Vérifier les logs du navigateur

1. Ouvrez les outils de développement (F12)
2. Allez dans l'onglet "Console"
3. Recherchez les erreurs liées aux requêtes HTTP
4. Vérifiez l'onglet "Network" pour voir les requêtes échouées

### 🧪 Script de Test Automatique

Utilisez le script de test pour diagnostiquer automatiquement :

```powershell
# Exécuter le script de test
.\test-frontend-connection.ps1
```

### 📝 Logs de Débogage

#### Backend (simple-server.js)

Ajoutez des logs pour déboguer :

```javascript
app.get('/api/file-watcher/available-files', (req, res) => {
  console.log('🔍 Requête reçue pour /api/file-watcher/available-files');
  try {
    const fs = require('fs');
    const path = require('path');
    
    console.log('📁 Vérification du dossier:', watchPath);
    if (!fs.existsSync(watchPath)) {
      console.log('❌ Dossier watch-folder non trouvé');
      return res.json([]);
    }
    
    const files = fs.readdirSync(watchPath);
    console.log('📄 Fichiers trouvés:', files);
    
    // ... reste du code
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des fichiers', 
      error: error.message 
    });
  }
});
```

#### Frontend (AutoProcessingService)

Ajoutez des logs dans le service :

```typescript
getAvailableFileModels(): Observable<FileModel[]> {
  console.log('🔍 Appel de getAvailableFileModels()');
  return this.fileWatcherService.getStatus().pipe(
    switchMap(status => {
      console.log('📊 Statut du service:', status);
      const url = `${this.apiUrl}/api/file-watcher/available-files`;
      console.log('🌐 URL de requête:', url);
      return this.http.get<FileModel[]>(url);
    })
  );
}
```

### 🎯 Vérifications Finales

1. **Serveur backend** : `http://localhost:3000/api/file-watcher/status` répond
2. **Endpoint fichiers** : `http://localhost:3000/api/file-watcher/available-files` retourne une liste
3. **Dossier watch-folder** : Contient des fichiers CSV, JSON ou Excel
4. **Configuration frontend** : `environment.ts` pointe vers `http://localhost:3000`
5. **CORS** : Activé sur le serveur backend
6. **Console navigateur** : Aucune erreur CORS ou réseau

### 🚀 Test Complet

Une fois tout configuré, testez la fonctionnalité complète :

1. Démarrez le backend : `node simple-server.js`
2. Démarrez le frontend : `cd frontend && ng serve`
3. Ouvrez http://localhost:4200
4. Allez dans "Modèles de Traitement"
5. Cliquez sur "Nouveau modèle"
6. Cliquez sur "Choisir" pour sélectionner un fichier modèle

### 📞 Support

Si le problème persiste après avoir suivi ce guide :

1. Vérifiez les logs du serveur backend
2. Vérifiez la console du navigateur
3. Testez les endpoints avec PowerShell
4. Vérifiez que tous les fichiers sont bien sauvegardés

---

**✅ Le backend et le frontend sont maintenant configurés pour la fonctionnalité de sélection de fichiers modèles !** 