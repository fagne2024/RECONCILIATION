const express = require('express');
const cors = require('cors');
const { FileWatcherService } = require('./backend/src/services/file-watcher.service');
const { FileWatcherController } = require('./backend/src/controllers/file-watcher.controller');

const app = express();
const PORT = process.env.PORT || 8080;

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

// === ENDPOINT DE RÉCONCILIATION ===

app.post('/api/reconciliation/reconcile', (req, res) => {
  try {
    const {
      boFileContent,
      partnerFileContent,
      boKeyColumn,
      partnerKeyColumn,
      additionalKeys = [],
      comparisonColumns = []
    } = req.body;

    console.log('🔍 Début de la réconciliation');
    console.log(`📊 Données BO: ${boFileContent.length} lignes`);
    console.log(`📊 Données Partner: ${partnerFileContent.length} lignes`);
    console.log(`🔑 Clé BO: ${boKeyColumn}`);
    console.log(`🔑 Clé Partner: ${partnerKeyColumn}`);
    console.log(`🔑 Clés supplémentaires: ${additionalKeys.length}`);

    // Créer des index pour les données BO et Partner
    const boIndex = new Map();
    const partnerIndex = new Map();

    // Indexer les données BO avec la clé principale
    boFileContent.forEach((row, index) => {
      const key = row[boKeyColumn];
      if (key) {
        boIndex.set(key, { ...row, _originalIndex: index });
      }
    });

    // Indexer les données Partner avec la clé principale
    partnerFileContent.forEach((row, index) => {
      const key = row[partnerKeyColumn];
      if (key) {
        partnerIndex.set(key, { ...row, _originalIndex: index });
      }
    });

    // Fonction pour vérifier les correspondances avec clés supplémentaires
    const findMatchesWithAdditionalKeys = () => {
      const matches = [];
      const boOnly = [];
      const partnerOnly = [];
      const mismatches = [];

      // Vérifier les correspondances BO -> Partner
      boFileContent.forEach((boRow, boIndex) => {
        const boKey = boRow[boKeyColumn];
        const partnerRow = partnerIndex.get(boKey);

        if (partnerRow) {
          // Vérifier les clés supplémentaires si elles existent
          let additionalKeysMatch = true;
          if (additionalKeys.length > 0) {
            additionalKeysMatch = additionalKeys.every(keyPair => {
              const boValue = boRow[keyPair.boColumn];
              const partnerValue = partnerRow[keyPair.partnerColumn];
              return boValue && partnerValue && boValue === partnerValue;
            });
          }

          if (additionalKeysMatch) {
            matches.push({
              bo: boRow,
              partner: partnerRow,
              boIndex: boIndex,
              partnerIndex: partnerRow._originalIndex
            });
          } else {
            mismatches.push({
              bo: boRow,
              partner: partnerRow,
              boIndex: boIndex,
              partnerIndex: partnerRow._originalIndex,
              reason: 'Clés supplémentaires ne correspondent pas'
            });
          }
        } else {
          boOnly.push({
            bo: boRow,
            boIndex: boIndex
          });
        }
      });

      // Vérifier les données Partner uniquement
      partnerFileContent.forEach((partnerRow, partnerIndex) => {
        const partnerKey = partnerRow[partnerKeyColumn];
        const boRow = boIndex.get(partnerKey);

        if (!boRow) {
          partnerOnly.push({
            partner: partnerRow,
            partnerIndex: partnerIndex
          });
        }
      });

      return { matches, boOnly, partnerOnly, mismatches };
    };

    const result = findMatchesWithAdditionalKeys();

    console.log(`✅ Réconciliation terminée:`);
    console.log(`   - Correspondances: ${result.matches.length}`);
    console.log(`   - BO uniquement: ${result.boOnly.length}`);
    console.log(`   - Partner uniquement: ${result.partnerOnly.length}`);
    console.log(`   - Incohérences: ${result.mismatches.length}`);

    res.json({
      matches: result.matches,
      boOnly: result.boOnly,
      partnerOnly: result.partnerOnly,
      mismatches: result.mismatches,
      totalBoRecords: boFileContent.length,
      totalPartnerRecords: partnerFileContent.length,
      totalMatches: result.matches.length,
      totalBoOnly: result.boOnly.length,
      totalPartnerOnly: result.partnerOnly.length,
      totalMismatches: result.mismatches.length,
      executionTimeMs: Date.now() - req.startTime || 0,
      processedRecords: boFileContent.length + partnerFileContent.length,
      progressPercentage: 100
    });

  } catch (error) {
    console.error('❌ Erreur lors de la réconciliation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la réconciliation',
      error: error.message
    });
  }
});

// Route de test
app.get('/', (req, res) => {
  res.json({
    message: 'Système de surveillance de fichiers opérationnel',
    endpoints: {
      status: '/api/file-watcher/status',
      specifications: '/api/file-watcher/specifications',
      examples: '/api/file-watcher/examples',
      reconciliation: '/api/reconciliation/reconcile'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📁 Dossier de surveillance: ${fileWatcherService.getWatchPath()}`);
  console.log(`🌐 API disponible sur: http://localhost:${PORT}`);
}); 