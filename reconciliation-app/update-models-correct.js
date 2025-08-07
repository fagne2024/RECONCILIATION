const axios = require('axios');

const API_BASE_URL = 'http://localhost:8080/api/auto-processing/models';

// Nouvelles actions à ajouter
const newActions = [
  {
    name: 'normalizeHeaders',
    description: 'Normalisation des en-têtes de colonnes',
    type: 'format'
  },
  {
    name: 'fixSpecialCharacters', 
    description: 'Correction des caractères spéciaux corrompus',
    type: 'format'
  },
  {
    name: 'formatToNumber',
    description: 'Formatage en nombre des valeurs',
    type: 'format'
  },
  {
    name: 'removeAccents',
    description: 'Suppression des accents',
    type: 'format'
  },
  {
    name: 'standardizeHeaders',
    description: 'Standardisation des en-têtes',
    type: 'format'
  }
];

async function getModels() {
  try {
    const response = await axios.get(API_BASE_URL);
    if (response.data && response.data.models) {
      return response.data.models;
    } else if (Array.isArray(response.data)) {
      return response.data;
    } else {
      console.error('❌ Format de réponse inattendu');
      return [];
    }
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des modèles:', error.message);
    return [];
  }
}

async function updateModelWithCorrectFormat(modelId, updatedModel) {
  try {
    // Utiliser le bon format pour la mise à jour
    const updateData = {
      name: updatedModel.name,
      filePattern: updatedModel.filePattern,
      fileType: updatedModel.fileType,
      autoApply: updatedModel.autoApply,
      templateFile: updatedModel.templateFile,
      processingSteps: updatedModel.processingSteps,
      reconciliationKeys: updatedModel.reconciliationKeys
    };

    const response = await axios.put(`${API_BASE_URL}/${modelId}`, updateData);
    console.log(`✅ Modèle ${modelId} mis à jour avec succès`);
    return response.data;
  } catch (error) {
    console.error(`❌ Erreur lors de la mise à jour du modèle ${modelId}:`, error.message);
    if (error.response) {
      console.error('📋 Détails de l\'erreur:', error.response.data);
    }
    return null;
  }
}

function createNewStepsForModel(model) {
  const newSteps = [];
  const timestamp = Date.now();
  
  // Récupérer tous les champs du modèle
  const allFields = [];
  model.processingSteps.forEach(step => {
    if (step.field && Array.isArray(step.field)) {
      allFields.push(...step.field);
    }
  });
  
  // Dédupliquer les champs
  const uniqueFields = [...new Set(allFields)];
  
  // Champs numériques communs
  const numberFields = ['Montant', 'Amount', 'Solde', 'Balance', 'Frais', 'Fees', 'Prix', 'Price', 'Coût', 'Cost'];
  
  // Créer les nouvelles étapes
  newActions.forEach((action, index) => {
    let fields = uniqueFields;
    
    // Pour formatToNumber, utiliser seulement les champs numériques
    if (action.name === 'formatToNumber') {
      fields = uniqueFields.filter(field => 
        numberFields.some(numField => 
          field.toLowerCase().includes(numField.toLowerCase())
        )
      );
    }
    
    if (fields.length > 0) {
      newSteps.push({
        stepId: `step_${action.name}_${timestamp}_${index}`,
        name: action.name.toUpperCase(),
        type: action.type,
        action: action.name,
        field: fields,
        params: {},
        description: action.description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  });
  
  return newSteps;
}

async function addActionsToAllModels() {
  console.log('🚀 Ajout des nouvelles actions aux modèles de traitement');
  console.log('=' .repeat(60));

  try {
    const models = await getModels();
    console.log(`📋 ${models.length} modèles trouvés`);

    let successCount = 0;
    let errorCount = 0;

    for (const model of models) {
      console.log(`\n🔧 Traitement du modèle: ${model.name} (ID: ${model.id})`);
      
      // Vérifier si les nouvelles actions sont déjà présentes
      const hasNewActions = model.processingSteps.some(step => 
        newActions.some(action => step.action === action.name)
      );

      if (hasNewActions) {
        console.log(`✅ Le modèle ${model.name} a déjà les nouvelles actions`);
        continue;
      }

      // Créer les nouvelles étapes pour ce modèle
      const newSteps = createNewStepsForModel(model);
      
      if (newSteps.length === 0) {
        console.log(`⚠️ Aucune nouvelle étape à ajouter pour le modèle ${model.name}`);
        continue;
      }

      // Ajouter les nouvelles étapes au début
      const updatedSteps = [...newSteps, ...model.processingSteps];
      
      // Mettre à jour le modèle avec le bon format
      const updatedModel = {
        ...model,
        processingSteps: updatedSteps
      };

      const result = await updateModelWithCorrectFormat(model.id, updatedModel);
      if (result) {
        successCount++;
        console.log(`✅ ${newSteps.length} actions ajoutées au modèle ${model.name}`);
        console.log(`📊 Champs traités: ${newSteps[0].field.length}`);
      } else {
        errorCount++;
      }
    }

    console.log(`\n📊 Résumé:`);
    console.log(`✅ Modèles mis à jour: ${successCount}`);
    console.log(`❌ Erreurs: ${errorCount}`);
    console.log(`📋 Total: ${models.length}`);

  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
  }
}

// Fonction pour afficher les actions disponibles
function showAvailableActions() {
  console.log('\n📋 Actions disponibles dans les modèles:');
  newActions.forEach((action, index) => {
    console.log(`${index + 1}. ${action.name} - ${action.description}`);
  });
}

// Fonction pour afficher les détails d'un modèle
async function showModelDetails(modelId) {
  try {
    const models = await getModels();
    const model = models.find(m => m.id === modelId);
    
    if (model) {
      console.log(`\n📋 Détails du modèle: ${model.name}`);
      console.log(`ID: ${model.id}`);
      console.log(`Type: ${model.fileType}`);
      console.log(`Pattern: ${model.filePattern}`);
      console.log(`Étapes de traitement: ${model.processingSteps.length}`);
      
      model.processingSteps.forEach((step, index) => {
        console.log(`  ${index + 1}. ${step.name} (${step.action}) - ${step.field.length} champs`);
        if (step.field.length > 0) {
          console.log(`     Champs: ${step.field.join(', ')}`);
        }
      });
    } else {
      console.log(`❌ Modèle ${modelId} non trouvé`);
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'affichage des détails:', error.message);
  }
}

// Fonction pour tester une mise à jour simple
async function testSimpleUpdate() {
  try {
    const models = await getModels();
    const testModel = models.find(m => m.id === 20); // OPPART
    
    if (testModel) {
      console.log(`🧪 Test de mise à jour simple pour le modèle: ${testModel.name}`);
      
      // Ajouter une seule nouvelle étape pour tester
      const newStep = {
        stepId: `step_test_${Date.now()}`,
        name: 'TEST_ACTION',
        type: 'format',
        action: 'normalizeHeaders',
        field: ['Type Opération', 'Montant'],
        params: {},
        description: 'Test de nouvelle action',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const updatedSteps = [newStep, ...testModel.processingSteps];
      const updatedModel = {
        ...testModel,
        processingSteps: updatedSteps
      };
      
      const result = await updateModelWithCorrectFormat(testModel.id, updatedModel);
      if (result) {
        console.log('✅ Test de mise à jour réussi');
      } else {
        console.log('❌ Test de mise à jour échoué');
      }
    }
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  }
}

// Exécution principale
async function main() {
  console.log('🔧 Script d\'ajout des nouvelles actions aux modèles de traitement');
  console.log('=' .repeat(60));
  
  showAvailableActions();
  
  // Test simple d'abord
  console.log('\n🧪 Test de mise à jour simple...');
  await testSimpleUpdate();
  
  // Ajouter les actions aux modèles
  console.log('\n🚀 Ajout des actions à tous les modèles...');
  await addActionsToAllModels();
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ Script terminé');
  
  // Afficher les détails d'un modèle spécifique
  console.log('\n📋 Détails du modèle OPPART:');
  await showModelDetails(20);
}

// Exécuter le script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  addActionsToAllModels,
  showModelDetails,
  testSimpleUpdate,
  newActions
}; 