const axios = require('axios');

const API_BASE_URL = 'http://localhost:8080/api/auto-processing/models';

// Configuration des nouvelles étapes de formatage
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

// Champs à traiter pour chaque type de modèle
const modelFields = {
  OPPART: {
    allFields: ['ID Opération', 'Type Opération', 'Montant', 'Solde avant', 'Solde aprés', 'Code propriétaire', 'Téléphone', 'Statut', 'ID Transaction', 'Num bordereau', 'Date opération', 'Date de versement', 'Banque appro', 'Login demandeur Appro', 'Login valideur Appro', 'Motif rejet', 'Frais connexion', 'Numéro Trans GU', 'Agent', 'Motif régularisation', 'groupe de réseau'],
    numberFields: ['Montant', 'Solde avant', 'Solde aprés', 'Frais connexion']
  },
  USSDPART: {
    allFields: ['ID', 'Groupe Réseaux', 'Code réseau', 'Agence', 'Code PIXI', 'Code de Proxy', 'Code service', 'Numéro Trans GU', 'Déstinataire', 'Login agent', 'Type agent', 'date de création', 'Date d\'envoi vers part', 'Etat', 'Type', 'Token', 'SMS', 'Action faite', 'Statut', 'Utilisateur', 'Montant', 'Latitude', 'Longitude', 'Partenaire dist ID', 'Agence SC', 'Groupe reseau SC', 'Agent SC', 'PDA SC', 'Date dernier traitement'],
    numberFields: ['Montant']
  }
};

async function getModels() {
  try {
    const response = await axios.get(API_BASE_URL);
    return response.data;
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

function addNewFormattingSteps(existingSteps, modelType) {
  const fields = modelFields[modelType];
  if (!fields) {
    console.warn(`⚠️ Type de modèle ${modelType} non reconnu`);
    return existingSteps;
  }

  const newSteps = [];

  // Ajouter l'étape de normalisation des en-têtes
  newSteps.push({
    ...newFormattingSteps.normalizeHeaders,
    field: fields.allFields
  });

  // Ajouter l'étape de correction des caractères spéciaux
  newSteps.push({
    ...newFormattingSteps.fixSpecialCharacters,
    field: fields.allFields
  });

  // Ajouter l'étape de formatage en nombre
  newSteps.push({
    ...newFormattingSteps.formatToNumber,
    field: fields.numberFields
  });

  // Insérer les nouvelles étapes au début (avant le nettoyage des données)
  return [...newSteps, ...existingSteps];
}

async function updateModelsWithNewFormatting() {
  console.log('🔄 Début de la mise à jour des modèles avec les nouvelles options de formatage...');

  try {
    // Récupérer tous les modèles
    const models = await getModels();
    console.log(`📋 ${models.length} modèles trouvés`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const model of models) {
      console.log(`\n🔧 Traitement du modèle: ${model.name} (${model.id})`);

      // Identifier le type de modèle basé sur le nom ou le pattern
      let modelType = null;
      if (model.name.includes('OPPART') || model.filePattern.includes('OPPART')) {
        modelType = 'OPPART';
      } else if (model.name.includes('USSDPART') || model.filePattern.includes('USSDPART')) {
        modelType = 'USSDPART';
      }

      if (!modelType) {
        console.log(`⚠️ Type de modèle non reconnu pour ${model.name}, ignoré`);
        continue;
      }

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

      // Ajouter les nouvelles étapes
      const updatedSteps = addNewFormattingSteps(model.processingSteps, modelType);
      
      // Mettre à jour le modèle
      const updatedModel = {
        ...model,
        processingSteps: updatedSteps
      };

      const result = await updateModel(model.id, updatedModel);
      if (result) {
        updatedCount++;
        console.log(`✅ Modèle ${model.name} mis à jour avec ${updatedSteps.length - model.processingSteps.length} nouvelles étapes`);
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

// Fonction pour créer un nouveau modèle avec les nouvelles options
async function createNewModelWithFormatting(modelName, filePattern, fileType, modelType) {
  console.log(`\n🔧 Création d'un nouveau modèle: ${modelName}`);

  const fields = modelFields[modelType];
  if (!fields) {
    console.error(`❌ Type de modèle ${modelType} non reconnu`);
    return;
  }

  const newModel = {
    name: modelName,
    filePattern: filePattern,
    fileType: fileType,
    autoApply: true,
    templateFile: `${modelType}.csv`,
    processingSteps: addNewFormattingSteps([], modelType),
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

// Exécution principale
async function main() {
  console.log('🚀 Script de mise à jour des modèles avec nouvelles options de formatage');
  console.log('=' .repeat(60));

  // Mettre à jour les modèles existants
  await updateModelsWithNewFormatting();

  console.log('\n' + '=' .repeat(60));
  console.log('✅ Script terminé');
}

// Exécuter le script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  updateModelsWithNewFormatting,
  createNewModelWithFormatting,
  addNewFormattingSteps
}; 