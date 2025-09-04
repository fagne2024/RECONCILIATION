const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Route de test simple
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Serveur de test opérationnel',
    timestamp: new Date().toISOString()
  });
});

// Route pour les modèles de traitement automatique
app.get('/api/auto-processing-models', (req, res) => {
  res.json([
    {
      id: 'oppart_36d9200f',
      modelId: 'oppart_36d9200f',
      name: 'Oppart',
      filePattern: '*OPPART*.xls',
      fileType: 'partner',
      reconciliationKeys: {
        partnerKeys: ['ID Opération'],
        boModels: ['mod_le_bas_sur_trxbo_xls_47e01b03'],
        boModelKeys: {
          'mod_le_bas_sur_trxbo_xls_47e01b03': ['Numéro Trans GU']
        },
        boKeys: ['Numéro Trans GU'],
        boTreatments: {}
      }
    }
  ]);
});

// Route racine
app.get('/', (req, res) => {
  res.json({
    message: 'Serveur de test opérationnel',
    version: '1.0.0',
    endpoints: {
      test: '/api/test',
      autoProcessingModels: '/api/auto-processing-models'
    }
  });
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur de test démarré sur le port ${PORT}`);
  console.log(`🌐 API disponible sur: http://localhost:${PORT}`);
  console.log(`📋 Testez avec: curl http://localhost:${PORT}/api/test`);
});

// Gestion propre de l'arrêt du serveur
process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt du serveur...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Arrêt du serveur...');
  process.exit(0);
});
