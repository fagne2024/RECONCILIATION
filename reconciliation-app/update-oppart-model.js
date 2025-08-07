// Script pour mettre à jour le modèle OPPART avec la configuration complète
const axios = require('axios');

const API_BASE_URL = 'http://localhost:8080/api';

// Configuration complète du modèle OPPART
const oppartModelUpdate = {
  name: 'Modèle OPPART - Configuration Complète',
  filePattern: '*OPPART*.csv',
  fileType: 'partner',
  autoApply: true,
  templateFile: 'OPPART.csv',
  processingSteps: [
    {
      id: 'step_clean_data',
      name: 'NETTOYAGE_DONNEES_OPPART',
      type: 'format',
      action: 'cleanText',
      field: [
        'ID Opération', 'Type Opération', 'Montant', 'Solde avant', 'Solde aprés',
        'Code propriétaire', 'Téléphone', 'Statut', 'ID Transaction', 'Num bordereau',
        'Date opération', 'Date de versement', 'Banque appro', 'Login demandeur Appro',
        'Login valideur Appro', 'Motif rejet', 'Frais connexion', 'Numéro Trans GU',
        'Agent', 'Motif régularisation', 'groupe de réseau'
      ],
      params: {},
      description: 'Nettoyage des données OPPART'
    },
    {
      id: 'step_format_amount',
      name: 'FORMATAGE_MONTANT_OPPART',
      type: 'format',
      action: 'formatCurrency',
      field: ['Montant', 'Solde avant', 'Solde aprés', 'Frais connexion'],
      params: { currency: 'XOF', locale: 'fr-FR' },
      description: 'Formatage des montants OPPART'
    },
    {
      id: 'step_format_date',
      name: 'FORMATAGE_DATE_OPPART',
      type: 'format',
      action: 'formatDate',
      field: ['Date opération', 'Date de versement'],
      params: { format: 'YYYY-MM-DD' },
      description: 'Formatage des dates OPPART'
    }
  ],
  reconciliationKeys: {
    partnerKeys: ['Numéro Trans GU'],
    boModels: ['9'],
    boModelKeys: {
      '9': ['Numéro Trans GU']
    }
  }
};

async function updateOPPARTModel() {
  console.log('🔧 Mise à jour du modèle OPPART...');
  
  try {
    // D'abord, récupérer tous les modèles pour trouver OPPART
    console.log('📋 Récupération des modèles existants...');
    const modelsResponse = await axios.get(`${API_BASE_URL}/auto-processing/models`);
    const models = modelsResponse.data;
    
    // Chercher le modèle OPPART existant
    const oppartModel = models.find(model => 
      model.name.includes('OPPART') || 
      model.filePattern.includes('OPPART')
    );
    
    if (oppartModel) {
      console.log(`✅ Modèle OPPART trouvé (ID: ${oppartModel.id})`);
      console.log(`📝 Nom actuel: ${oppartModel.name}`);
      console.log(`🔧 Étapes actuelles: ${oppartModel.processingSteps.length}`);
      
      // Mettre à jour le modèle
      console.log('🔄 Mise à jour du modèle...');
      const updateResponse = await axios.put(
        `${API_BASE_URL}/auto-processing/models/${oppartModel.id}`,
        oppartModelUpdate
      );
      
      if (updateResponse.status === 200) {
        console.log('✅ Modèle OPPART mis à jour avec succès!');
        console.log(`📝 Nouveau nom: ${updateResponse.data.name}`);
        console.log(`🔧 Nouvelles étapes: ${updateResponse.data.processingSteps.length}`);
        console.log(`📋 Colonnes traitées: ${updateResponse.data.processingSteps[0].field.length}`);
        
        // Afficher les colonnes traitées
        console.log('\n📋 Colonnes maintenant récupérées:');
        updateResponse.data.processingSteps[0].field.forEach((col, index) => {
          console.log(`  ${index + 1}. ${col}`);
        });
      }
    } else {
      console.log('⚠️ Aucun modèle OPPART trouvé, création d\'un nouveau modèle...');
      
      const createResponse = await axios.post(
        `${API_BASE_URL}/auto-processing/models`,
        oppartModelUpdate
      );
      
      if (createResponse.status === 201) {
        console.log('✅ Nouveau modèle OPPART créé avec succès!');
        console.log(`📝 ID: ${createResponse.data.id}`);
        console.log(`🔧 Étapes: ${createResponse.data.processingSteps.length}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error.message);
    if (error.response) {
      console.error('📋 Détails:', error.response.data);
    }
  }
}

// Test de récupération des colonnes OPPART
async function testOPPARTColumns() {
  console.log('\n🧪 Test de récupération des colonnes OPPART...');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/auto-processing/models/columns/OPPART.csv`);
    
    if (response.status === 200) {
      console.log('✅ Colonnes OPPART récupérées:');
      console.log(`📊 Nombre de colonnes: ${response.data.length}`);
      response.data.forEach((col, index) => {
        console.log(`  ${index + 1}. ${col}`);
      });
    }
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  }
}

// Exécution
updateOPPARTModel()
  .then(() => testOPPARTColumns())
  .then(() => console.log('\n🎯 Mise à jour terminée!'))
  .catch(error => console.error('❌ Erreur:', error)); 