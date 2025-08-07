const axios = require('axios');

const API_BASE_URL = 'http://localhost:8080/api/auto-processing/models';

// Configuration des nouvelles étapes de formatage pour tous les modèles
const newFormattingSteps = {
  normalizeHeaders: {
    id: 'step_normalize_headers',
    name: 'NORMALISATION_ENTETES',
    type: 'format',
    action: 'normalizeHeaders',
    params: {},
    description: 'Normalisation des en-têtes de colonnes'
  },
  fixSpecialCharacters: {
    id: 'step_fix_special_chars',
    name: 'CORRECTION_CARACTERES_SPECIAUX',
    type: 'format',
    action: 'fixSpecialCharacters',
    params: {},
    description: 'Correction des caractères spéciaux corrompus'
  },
  formatToNumber: {
    id: 'step_format_to_number',
    name: 'FORMATAGE_NOMBRE',
    type: 'format',
    action: 'formatToNumber',
    params: {},
    description: 'Formatage en nombre des valeurs'
  }
};

// Champs numériques communs pour tous les modèles
const commonNumberFields = ['Montant', 'Amount', 'Solde', 'Balance', 'Frais', 'Fees', 'Prix', 'Price', 'Coût', 'Cost'];

async function getModels() {
  try {
    const response = await axios.get(API_BASE_URL);
    // Vérifier si la réponse contient un objet avec une propriété 'models'
    if (response.data && response.data.models) {
      return response.data.models;
    } else if (Array.isArray(response.data)) {
      return response.data;
    } else {
      console.error('❌ Format de réponse inattendu:', response.data);
      return [];
    }
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des modèles:', error.message);
    return [];
  }
}

async function updateModel(modelId, updatedModel) {
  try {
    const response = await axios.put(`${API_BASE_URL}/${modelId}`, updatedModel);
    console.log(`✅ Modèle ${modelId} mis à jour avec succès`);
    return response.data;
  } catch (error) {
    console.error(`❌ Erreur lors de la mise à jour du modèle ${modelId}:`, error.message);
    return null;
  }
}

function addNewFormattingStepsToAllModels(existingSteps, allFields) {
  const newSteps = [];

  // Ajouter l'étape de normalisation des en-têtes
  newSteps.push({
    stepId: `step_normalize_headers_${Date.now()}`,
    name: 'NORMALISATION_ENTETES',
    type: 'format',
    action: 'normalizeHeaders',
    field: allFields,
    params: {},
    description: 'Normalisation des en-têtes de colonnes',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // Ajouter l'étape de correction des caractères spéciaux
  newSteps.push({
    stepId: `step_fix_special_chars_${Date.now()}`,
    name: 'CORRECTION_CARACTERES_SPECIAUX',
    type: 'format',
    action: 'fixSpecialCharacters',
    field: allFields,
    params: {},
    description: 'Correction des caractères spéciaux corrompus',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // Ajouter l'étape de formatage en nombre (seulement pour les champs numériques)
  const numberFields = allFields.filter(field => 
    commonNumberFields.some(numField => 
      field.toLowerCase().includes(numField.toLowerCase())
    )
  );

  if (numberFields.length > 0) {
    newSteps.push({
      stepId: `step_format_to_number_${Date.now()}`,
      name: 'FORMATAGE_NOMBRE',
      type: 'format',
      action: 'formatToNumber',
      field: numberFields,
      params: {},
      description: 'Formatage en nombre des valeurs',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  // Insérer les nouvelles étapes au début (avant le nettoyage des données)
  return [...newSteps, ...existingSteps];
}

async function applyFormattingToAllModels() {
  console.log('🔄 Début de l\'application des nouvelles options de formatage à tous les modèles...');

  try {
    // Récupérer tous les modèles
    const models = await getModels();
    console.log(`📋 ${models.length} modèles trouvés`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const model of models) {
      console.log(`\n🔧 Traitement du modèle: ${model.name} (${model.id})`);

      // Vérifier si les nouvelles étapes sont déjà présentes
      const hasNewSteps = model.processingSteps.some(step => 
        step.action === 'normalizeHeaders' || 
        step.action === 'fixSpecialCharacters' || 
        step.action === 'formatToNumber'
      );

      if (hasNewSteps) {
        console.log(`✅ Le modèle ${model.name} a déjà les nouvelles étapes, ignoré`);
        continue;
      }

      // Récupérer tous les champs du modèle
      const allFields = [];
      model.processingSteps.forEach(step => {
        if (step.field && Array.isArray(step.field)) {
          allFields.push(...step.field);
        }
      });

      // Dédupliquer les champs
      const uniqueFields = [...new Set(allFields)];

      if (uniqueFields.length === 0) {
        console.log(`⚠️ Aucun champ trouvé pour le modèle ${model.name}, ignoré`);
        continue;
      }

      // Ajouter les nouvelles étapes
      const updatedSteps = addNewFormattingStepsToAllModels(model.processingSteps, uniqueFields);
      
      // Mettre à jour le modèle
      const updatedModel = {
        ...model,
        processingSteps: updatedSteps
      };

      const result = await updateModel(model.id, updatedModel);
      if (result) {
        updatedCount++;
        console.log(`✅ Modèle ${model.name} mis à jour avec ${updatedSteps.length - model.processingSteps.length} nouvelles étapes`);
        console.log(`📊 Champs traités: ${uniqueFields.length} (dont ${uniqueFields.filter(f => commonNumberFields.some(nf => f.toLowerCase().includes(nf.toLowerCase()))).length} numériques)`);
      } else {
        errorCount++;
      }
    }

    console.log(`\n📊 Résumé de la mise à jour:`);
    console.log(`✅ Modèles mis à jour: ${updatedCount}`);
    console.log(`❌ Erreurs: ${errorCount}`);
    console.log(`📋 Total traité: ${models.length}`);

  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
  }
}

// Fonction pour créer un nouveau modèle avec toutes les options de formatage
async function createNewModelWithAllFormatting(modelName, filePattern, fileType, fields) {
  console.log(`\n🔧 Création d'un nouveau modèle: ${modelName}`);

  const newModel = {
    name: modelName,
    filePattern: filePattern,
    fileType: fileType,
    autoApply: true,
    templateFile: `${modelName}.csv`,
    processingSteps: addNewFormattingStepsToAllModels([], fields),
    reconciliationKeys: {
      partnerKeys: ['Numéro Trans GU'],
      boModels: ['9'],
      boModelKeys: {
        '9': ['Numéro Trans GU']
      }
    }
  };

  try {
    const response = await axios.post(API_BASE_URL, newModel);
    console.log(`✅ Nouveau modèle créé avec succès: ${response.data.id}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Erreur lors de la création du modèle:`, error.message);
    return null;
  }
}

// Fonction pour afficher les statistiques des modèles
async function showModelStatistics() {
  try {
    const models = await getModels();
    console.log('\n📊 Statistiques des modèles:');
    console.log(`📋 Total des modèles: ${models.length}`);
    
    let modelsWithNewFormatting = 0;
    let totalSteps = 0;
    let totalFields = 0;

    models.forEach(model => {
      const hasNewFormatting = model.processingSteps.some(step => 
        step.action === 'normalizeHeaders' || 
        step.action === 'fixSpecialCharacters' || 
        step.action === 'formatToNumber'
      );

      if (hasNewFormatting) {
        modelsWithNewFormatting++;
      }

      totalSteps += model.processingSteps.length;
      
      const fields = new Set();
      model.processingSteps.forEach(step => {
        if (step.field && Array.isArray(step.field)) {
          step.field.forEach(field => fields.add(field));
        }
      });
      totalFields += fields.size;
    });

    console.log(`✅ Modèles avec nouveau formatage: ${modelsWithNewFormatting}`);
    console.log(`📊 Étapes totales: ${totalSteps}`);
    console.log(`📊 Champs uniques: ${totalFields}`);
  } catch (error) {
    console.error('❌ Erreur lors de l\'affichage des statistiques:', error.message);
  }
}

// Exécution principale
async function main() {
  console.log('🚀 Script d\'application des nouvelles options de formatage à tous les modèles');
  console.log('=' .repeat(70));

  // Afficher les statistiques avant
  await showModelStatistics();

  // Appliquer les nouvelles options à tous les modèles
  await applyFormattingToAllModels();

  // Afficher les statistiques après
  await showModelStatistics();

  console.log('\n' + '=' .repeat(70));
  console.log('✅ Script terminé');
}

// Exécuter le script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  applyFormattingToAllModels,
  createNewModelWithAllFormatting,
  addNewFormattingStepsToAllModels,
  showModelStatistics
}; 