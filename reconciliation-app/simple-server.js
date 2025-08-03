const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { PrismaClient } = require('@prisma/client');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialiser Prisma Client
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());

// Variables globales pour simuler le système
let isWatching = false;
let watchPath = './watch-folder';
let specifications = new Map();
let processingQueue = [];
let isProcessing = false;

// Routes pour la surveillance
app.post('/api/file-watcher/start', (req, res) => {
  try {
    isWatching = true;
    console.log('✅ Surveillance démarrée');
    res.json({
      success: true,
      message: 'Surveillance démarrée avec succès',
      watchPath: watchPath
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors du démarrage de la surveillance',
      error: error.message
    });
  }
});

app.post('/api/file-watcher/stop', (req, res) => {
  try {
    isWatching = false;
    console.log('⏹️ Surveillance arrêtée');
    res.json({
      success: true,
      message: 'Surveillance arrêtée avec succès'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'arrêt de la surveillance',
      error: error.message
    });
  }
});

app.get('/api/file-watcher/status', (req, res) => {
  try {
    res.json({
      success: true,
      watchPath: watchPath,
      isProcessing: isWatching,
      queueLength: processingQueue.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du statut',
      error: error.message
    });
  }
});

// Routes pour les spécifications
app.post('/api/file-watcher/specifications', (req, res) => {
  try {
    const {
      name,
      filePattern,
      processingType,
      delimiter,
      encoding,
      outputFormat,
      autoProcess
    } = req.body;

    if (!name || !filePattern || !processingType) {
      res.status(400).json({
        success: false,
        message: 'Les champs name, filePattern et processingType sont requis'
      });
      return;
    }

    const specification = {
      id: uuidv4(),
      name,
      filePattern,
      processingType,
      delimiter,
      encoding,
      outputFormat,
      autoProcess: autoProcess ?? true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    specifications.set(specification.id, specification);
    console.log(`✅ Spécification créée: ${specification.name}`);

    res.status(201).json({
      success: true,
      message: 'Spécification créée avec succès',
      specification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la spécification',
      error: error.message
    });
  }
});

app.get('/api/file-watcher/specifications', (req, res) => {
  try {
    const specs = Array.from(specifications.values());
    res.json({
      success: true,
      specifications: specs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des spécifications',
      error: error.message
    });
  }
});

app.get('/api/file-watcher/examples', (req, res) => {
  const examples = [
    {
      name: 'Fichiers CSV avec point-virgule',
      filePattern: '*.csv',
      processingType: 'csv',
      delimiter: ';',
      encoding: 'utf8',
      outputFormat: 'json',
      autoProcess: true
    },
    {
      name: 'Fichiers JSON de transactions',
      filePattern: 'transactions_*.json',
      processingType: 'json',
      outputFormat: 'csv',
      autoProcess: true
    }
  ];

  res.json({
    success: true,
    examples
  });
});

// Nouveaux endpoints pour les modèles de fichiers
app.get('/api/file-watcher/available-files', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    if (!fs.existsSync(watchPath)) {
      return res.json([]);
    }
    
    const files = fs.readdirSync(watchPath)
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.csv', '.xlsx', '.xls', '.json'].includes(ext);
      })
      .map(file => {
        const filePath = path.join(watchPath, file);
        const stats = fs.statSync(filePath);
        const fileType = path.extname(file).toLowerCase() === '.json' ? 'json' : 
                        path.extname(file).toLowerCase() === '.csv' ? 'csv' : 'excel';
        
        // Analyser le fichier pour extraire les colonnes et métadonnées
        let columns = [];
        let sampleData = [];
        let recordCount = 0;
        
        try {
          if (fileType === 'csv') {
            const csv = fs.readFileSync(filePath, 'utf8');
            const lines = csv.split('\n').filter(line => line.trim());
            
            if (lines.length > 0) {
              // Détecter automatiquement le séparateur (virgule ou point-virgule)
              const firstLine = lines[0];
              const commaCount = (firstLine.match(/,/g) || []).length;
              const semicolonCount = (firstLine.match(/;/g) || []).length;
              const delimiter = semicolonCount > commaCount ? ';' : ',';
              
              console.log(`📊 Fichier ${file}: détecté séparateur "${delimiter}"`);
              
              columns = lines[0].split(delimiter).map(col => col.trim());
              recordCount = lines.length - 1;
              
              // Récupérer les 5 premières lignes comme échantillon
              sampleData = lines.slice(1, 6).map(line => {
                const values = line.split(delimiter).map(val => val.trim());
                const row = {};
                columns.forEach((col, index) => {
                  row[col] = values[index] || '';
                });
                return row;
              });
            }
          } else if (fileType === 'json') {
            const jsonContent = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(jsonContent);
            
            if (Array.isArray(data) && data.length > 0) {
              columns = Object.keys(data[0]);
              recordCount = data.length;
              sampleData = data.slice(0, 5);
            }
          } else {
            // Pour Excel, on retourne des colonnes par défaut
            columns = ['colonne1', 'colonne2', 'colonne3', 'colonne4', 'colonne5'];
            recordCount = 0;
            sampleData = [];
          }
        } catch (analysisError) {
          console.error(`Erreur lors de l'analyse de ${file}:`, analysisError.message);
          // En cas d'erreur d'analyse, on garde des colonnes vides
          columns = [];
          sampleData = [];
          recordCount = 0;
        }
        
        return {
          fileName: file,
          filePath: filePath,
          fileType: fileType,
          recordCount: recordCount,
          columns: columns,
          sampleData: sampleData
        };
      });
    
    res.json(files);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des fichiers', 
      error: error.message 
    });
  }
});

app.post('/api/file-watcher/analyze-file', (req, res) => {
  try {
    const { filePath } = req.body;
    const fs = require('fs');
    const path = require('path');
    
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ 
        success: false, 
        message: 'Fichier non trouvé' 
      });
    }
    
    const fileName = path.basename(filePath);
    const fileType = path.extname(fileName).toLowerCase() === '.json' ? 'json' : 
                    path.extname(fileName).toLowerCase() === '.csv' ? 'csv' : 'excel';
    
    let columns = [];
    let sampleData = [];
    let recordCount = 0;
    
    if (fileType === 'csv') {
      const csv = fs.readFileSync(filePath, 'utf8');
      const lines = csv.split('\n').filter(line => line.trim());
      
      if (lines.length > 0) {
        // Détecter automatiquement le séparateur (virgule ou point-virgule)
        const firstLine = lines[0];
        const commaCount = (firstLine.match(/,/g) || []).length;
        const semicolonCount = (firstLine.match(/;/g) || []).length;
        const delimiter = semicolonCount > commaCount ? ';' : ',';
        
        console.log(`📊 Fichier ${fileName}: détecté séparateur "${delimiter}"`);
        
        columns = lines[0].split(delimiter).map(col => col.trim());
        recordCount = lines.length - 1;
        
        // Récupérer les 5 premières lignes comme échantillon
        sampleData = lines.slice(1, 6).map(line => {
          const values = line.split(delimiter).map(val => val.trim());
          const row = {};
          columns.forEach((col, index) => {
            row[col] = values[index] || '';
          });
          return row;
        });
      }
    } else if (fileType === 'json') {
      const jsonContent = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(jsonContent);
      
      if (Array.isArray(data) && data.length > 0) {
        columns = Object.keys(data[0]);
        recordCount = data.length;
        sampleData = data.slice(0, 5);
      }
    } else {
      // Pour Excel, on retourne des colonnes par défaut
      columns = ['colonne1', 'colonne2', 'colonne3', 'colonne4', 'colonne5'];
      recordCount = 0;
      sampleData = [];
    }
    
    const fileModel = {
      fileName: fileName,
      filePath: filePath,
      columns: columns,
      sampleData: sampleData,
      fileType: fileType,
      recordCount: recordCount
    };
    
    res.json(fileModel);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de l\'analyse du fichier', 
      error: error.message 
    });
  }
});

// Route de test
// === ENDPOINTS POUR LES MODÈLES DE TRAITEMENT AUTOMATIQUE ===

// Récupérer tous les modèles
app.get('/api/auto-processing/models', async (req, res) => {
  try {
    const models = await prisma.autoProcessingModel.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    // Convertir les modèles pour la compatibilité avec le frontend
    const formattedModels = models.map(model => ({
      ...model,
      processingSteps: model.processingSteps || [],
      reconciliationKeys: model.reconciliationKeys || {
        partnerKeys: [],
        boKeys: []
      }
    }));
    
    res.json({
      success: true,
      models: formattedModels
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des modèles',
      error: error.message
    });
  }
});

// Créer un nouveau modèle
app.post('/api/auto-processing/models', async (req, res) => {
  try {
    const modelData = req.body;
    
    if (!modelData.name || !modelData.filePattern || !modelData.fileType) {
      return res.status(400).json({
        success: false,
        message: 'Les champs name, filePattern et fileType sont requis'
      });
    }

    const newModel = await prisma.autoProcessingModel.create({
      data: {
        name: modelData.name,
        filePattern: modelData.filePattern,
        fileType: modelData.fileType,
        processingSteps: modelData.processingSteps || [],
        autoApply: modelData.autoApply !== false,
        templateFile: modelData.templateFile,
        reconciliationKeys: modelData.reconciliationKeys || {
          partnerKeys: [],
          boKeys: []
        }
      }
    });

    console.log(`✅ Modèle créé: ${newModel.name} (ID: ${newModel.id})`);

    res.status(201).json({
      success: true,
      message: 'Modèle créé avec succès',
      model: newModel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du modèle',
      error: error.message
    });
  }
});

// Mettre à jour un modèle
app.put('/api/auto-processing/models/:id', async (req, res) => {
  try {
    const modelId = req.params.id;
    const updates = req.body;

    const existingModel = await prisma.autoProcessingModel.findUnique({
      where: { id: modelId }
    });

    if (!existingModel) {
      return res.status(404).json({
        success: false,
        message: 'Modèle non trouvé'
      });
    }

    const updatedModel = await prisma.autoProcessingModel.update({
      where: { id: modelId },
      data: {
        ...updates,
        updatedAt: new Date()
      }
    });

    console.log(`✅ Modèle mis à jour: ${updatedModel.name}`);

    res.json({
      success: true,
      message: 'Modèle mis à jour avec succès',
      model: updatedModel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du modèle',
      error: error.message
    });
  }
});

// Supprimer un modèle
app.delete('/api/auto-processing/models/:id', async (req, res) => {
  try {
    const modelId = req.params.id;

    const existingModel = await prisma.autoProcessingModel.findUnique({
      where: { id: modelId }
    });

    if (!existingModel) {
      return res.status(404).json({
        success: false,
        message: 'Modèle non trouvé'
      });
    }

    await prisma.autoProcessingModel.delete({
      where: { id: modelId }
    });

    console.log(`✅ Modèle supprimé: ${existingModel.name}`);

    res.json({
      success: true,
      message: 'Modèle supprimé avec succès'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du modèle',
      error: error.message
    });
  }
});

// Récupérer un modèle par ID
app.get('/api/auto-processing/models/:id', async (req, res) => {
  try {
    const modelId = req.params.id;

    const model = await prisma.autoProcessingModel.findUnique({
      where: { id: modelId }
    });

    if (!model) {
      return res.status(404).json({
        success: false,
        message: 'Modèle non trouvé'
      });
    }

    res.json({
      success: true,
      model: model
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du modèle',
      error: error.message
    });
  }
});

app.get('/', (req, res) => {
  res.json({
    message: 'Système de surveillance de fichiers opérationnel',
    version: '1.0.0',
    endpoints: {
      status: '/api/file-watcher/status',
      specifications: '/api/file-watcher/specifications',
      examples: '/api/file-watcher/examples',
      autoProcessingModels: '/api/auto-processing/models'
    }
  });
});

// Démarrer le serveur
const server = app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📁 Dossier de surveillance: ${watchPath}`);
  console.log(`🌐 API disponible sur: http://localhost:${PORT}`);
  console.log(`📋 Testez avec: curl http://localhost:${PORT}/api/file-watcher/status`);
});

// Gestion propre de l'arrêt du serveur
process.on('SIGINT', async () => {
  console.log('\n🛑 Arrêt du serveur...');
  await prisma.$disconnect();
  server.close(() => {
    console.log('✅ Serveur arrêté proprement');
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Arrêt du serveur...');
  await prisma.$disconnect();
  server.close(() => {
    console.log('✅ Serveur arrêté proprement');
    process.exit(0);
  });
}); 