const express = require('express');
const cors = require('cors');
const { FileWatcherService } = require('./backend/src/services/file-watcher.service');
const { FileWatcherController } = require('./backend/src/controllers/file-watcher.controller');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Créer les instances
const fileWatcherService = new FileWatcherService();
const fileWatcherController = new FileWatcherController(fileWatcherService);

// Routes pour la surveillance
app.post('/api/file-watcher/start', fileWatcherController.startWatching);
app.post('/api/file-watcher/stop', fileWatcherController.stopWatching);
app.get('/api/file-watcher/status', fileWatcherController.getStatus);

// Routes pour les spécifications
app.post('/api/file-watcher/specifications', fileWatcherController.createSpecification);
app.get('/api/file-watcher/specifications', fileWatcherController.getSpecifications);
app.get('/api/file-watcher/specifications/:id', fileWatcherController.getSpecification);
app.put('/api/file-watcher/specifications/:id', fileWatcherController.updateSpecification);
app.delete('/api/file-watcher/specifications/:id', fileWatcherController.deleteSpecification);

// Routes pour le traitement manuel
app.post('/api/file-watcher/process-file', fileWatcherController.processFile);

// Routes pour les exemples
app.get('/api/file-watcher/examples', fileWatcherController.getExampleSpecifications);

// Route de test
app.get('/', (req, res) => {
  res.json({
    message: 'Système de surveillance de fichiers opérationnel',
    endpoints: {
      status: '/api/file-watcher/status',
      specifications: '/api/file-watcher/specifications',
      examples: '/api/file-watcher/examples'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📁 Dossier de surveillance: ${fileWatcherService.getWatchPath()}`);
  console.log(`🌐 API disponible sur: http://localhost:${PORT}`);
}); 