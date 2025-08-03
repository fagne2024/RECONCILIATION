# Guide de Test - Récupération des Colonnes

## 🎯 Objectif
Vérifier que les colonnes des fichiers sont correctement récupérées et affichées dans l'interface de sélection de fichiers modèles.

## 📋 Étapes de Test

### 1. Vérifier le serveur backend

```powershell
# Tester l'endpoint des fichiers disponibles
Invoke-RestMethod -Uri "http://localhost:3000/api/file-watcher/available-files" -Method GET
```

**Résultat attendu :**
```json
[
  {
    "fileName": "exemple_clients.csv",
    "filePath": "watch-folder\\exemple_clients.csv",
    "fileType": "csv",
    "recordCount": 5,
    "columns": ["nom", "email", "telephone", "montant"],
    "sampleData": [...]
  }
]
```

### 2. Vérifier les logs du navigateur

1. Ouvrez les outils de développement (F12)
2. Allez dans l'onglet "Console"
3. Recherchez les logs suivants :
   - `🔍 Appel de getAvailableFileModels()`
   - `📄 Fichiers récupérés:`
   - `🎯 Sélection du fichier modèle:`
   - `📋 Colonnes du fichier:`
   - `🔍 getAvailableColumns() appelé`

### 3. Test de l'interface

1. Démarrez le frontend : `cd frontend && ng serve`
2. Ouvrez http://localhost:4200
3. Allez dans "Modèles de Traitement"
4. Cliquez sur "Nouveau modèle"
5. Cliquez sur "Choisir" pour sélectionner un fichier modèle
6. Sélectionnez un fichier dans la liste
7. Vérifiez que les colonnes apparaissent dans le champ "Champ à traiter"

### 4. Vérifications spécifiques

#### Dans la console du navigateur, vous devriez voir :
```
🔍 Appel de getAvailableFileModels()
📊 Statut du service: {success: true, ...}
🌐 URL de requête: http://localhost:3000/api/file-watcher/available-files
📄 Fichiers récupérés: [...]
   - exemple_clients.csv: 4 colonnes
🎯 Sélection du fichier modèle: {fileName: "exemple_clients.csv", ...}
📋 Colonnes du fichier: ["nom", "email", "telephone", "montant"]
✅ Colonnes disponibles après sélection: ["nom", "email", "telephone", "montant"]
🔍 getAvailableColumns() appelé
   selectedFileModel: {fileName: "exemple_clients.csv", ...}
   ✅ Retour des colonnes du fichier sélectionné: ["nom", "email", "telephone", "montant"]
```

#### Dans l'interface, vous devriez voir :
- Modal avec la liste des fichiers disponibles
- Chaque fichier affiche ses colonnes
- Après sélection, le champ "Champ à traiter" contient les colonnes du fichier

## 🔧 Dépannage

### Si les colonnes sont vides dans l'API :
1. Vérifiez que le serveur backend a été redémarré après les modifications
2. Vérifiez que les fichiers dans `watch-folder` sont bien formatés
3. Vérifiez les logs du serveur backend

### Si les colonnes sont vides dans l'interface :
1. Vérifiez la console du navigateur pour les erreurs
2. Vérifiez que l'URL de l'API est correcte dans `environment.ts`
3. Vérifiez que CORS est activé sur le serveur

### Si les colonnes n'apparaissent pas dans le select :
1. Vérifiez que `getAvailableColumns()` retourne bien un tableau
2. Vérifiez que le template HTML utilise bien `getAvailableColumns()`
3. Vérifiez que le changement de détection fonctionne

## 📝 Logs de Débogage

### Backend (simple-server.js)
Ajoutez des logs dans l'endpoint `available-files` :

```javascript
app.get('/api/file-watcher/available-files', (req, res) => {
  console.log('🔍 Requête reçue pour /api/file-watcher/available-files');
  try {
    // ... code existant ...
    
    const files = fs.readdirSync(watchPath)
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.csv', '.xlsx', '.xls', '.json'].includes(ext);
      })
      .map(file => {
        // ... analyse du fichier ...
        
        console.log(`📄 ${file}: ${columns.length} colonnes trouvées`);
        return {
          fileName: file,
          filePath: filePath,
          fileType: fileType,
          recordCount: recordCount,
          columns: columns,
          sampleData: sampleData
        };
      });
    
    console.log('✅ Fichiers analysés:', files.length);
    res.json(files);
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

### Frontend (AutoProcessingService)
Les logs sont déjà ajoutés dans le service.

### Frontend (AutoProcessingModelsComponent)
Les logs sont déjà ajoutés dans le composant.

## ✅ Critères de Succès

1. **Backend** : L'endpoint `/api/file-watcher/available-files` retourne les colonnes
2. **Frontend** : Les colonnes sont affichées dans la modal de sélection
3. **Interface** : Le champ "Champ à traiter" contient les colonnes du fichier sélectionné
4. **Logs** : Tous les logs de débogage apparaissent dans la console

---

**🎯 Objectif atteint : Les colonnes des fichiers sont maintenant correctement récupérées et affichées dans l'interface !** 