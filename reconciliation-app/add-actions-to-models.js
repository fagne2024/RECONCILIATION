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

async function addActionsToModel(modelId, actions) {
  try {
    // Récupérer le modèle actuel
    const response = await axios.get(`${API_BASE_URL}/${modelId}`);
    const model = response.data;
    
    console.log(`🔧 Ajout des actions au modèle: ${model.name}`);
    
    // Créer les nouvelles étapes
    const newSteps = actions.map((action, index) => ({
      stepId: `step_${action.name}_${Date.now()}_${index}`,
      name: action.name.toUpperCase(),
      type: action.type,
      action: action.name,
      field: [], // Sera rempli avec les champs du modèle
      params: {},
      description: action.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    // Ajouter les nouvelles étapes au début
    const updatedSteps = [...newSteps, ...model.processingSteps];
    
    // Mettre à jour le modèle
    const updateResponse = await axios.put(`${API_BASE_URL}/${modelId}`, {
      ...model,
      processingSteps: updatedSteps
    });
    
    console.log(`✅ Actions ajoutées au modèle ${model.name}`);
    return updateResponse.data;
  } catch (error) {
    console.error(`❌ Erreur lors de l'ajout des actions au modèle ${modelId}:`, error.message);
    return null;
  }
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

      const result = await addActionsToModel(model.id, newActions);
      if (result) {
        successCount++;
        console.log(`✅ Actions ajoutées avec succès au modèle ${model.name}`);
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

// Fonction pour tester une action spécifique
async function testAction(actionName) {
  console.log(`🧪 Test de l'action: ${actionName}`);
  
  // Exemple de données de test
  const testData = [
    { 'Type Opération': 'impactcomptimpactcomptegeneral', 'Montant': '439,22' },
    { 'Type Opération': 'tlphone', 'Montant': '1 234,56' },
    { 'Type Opération': 'Téléphone', 'Montant': '2,500.00' }
  ];
  
  console.log('📊 Données de test:');
  testData.forEach((row, index) => {
    console.log(`Ligne ${index + 1}:`, row);
  });
  
  // Simuler les transformations
  console.log('\n🔄 Transformations appliquées:');
  testData.forEach((row, index) => {
    const original = row['Type Opération'];
    let normalized = original;
    
    switch (actionName) {
      case 'normalizeHeaders':
        normalized = original.trim().replace(/\s+/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        break;
      case 'fixSpecialCharacters':
        normalized = original.replace('tlphone', 'téléphone');
        break;
      case 'removeAccents':
        normalized = original.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        break;
      case 'standardizeHeaders':
        normalized = original.replace(/\s+/g, '_').replace(/[^\w_]/g, '');
        break;
      case 'formatToNumber':
        const amount = row['Montant'];
        const cleanAmount = amount.replace(/[^\d.,-]/g, '').replace(',', '.');
        normalized = parseFloat(cleanAmount) || amount;
        break;
    }
    
    console.log(`Ligne ${index + 1}: "${original}" → "${normalized}"`);
  });
}

// Exécution principale
async function main() {
  console.log('🔧 Script d\'ajout des nouvelles actions aux modèles de traitement');
  console.log('=' .repeat(60));
  
  showAvailableActions();
  
  // Ajouter les actions aux modèles
  await addActionsToAllModels();
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ Script terminé');
  
  // Tester une action
  console.log('\n🧪 Test des actions:');
  await testAction('normalizeHeaders');
  await testAction('fixSpecialCharacters');
  await testAction('formatToNumber');
}

// Exécuter le script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  addActionsToAllModels,
  testAction,
  newActions
}; 