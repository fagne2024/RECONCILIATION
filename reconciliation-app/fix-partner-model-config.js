// Script pour corriger la configuration du modèle partenaire OPPART
const axios = require('axios');

const API_BASE_URL = 'http://localhost:8080/api';

// Configuration corrigée du modèle OPPART
const correctedOPPARTModel = {
  name: 'Modèle basé sur OPPART.csv',
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
    boModels: [], // Supprimer les références aux modèles BO avec des fichiers manquants
    boModelKeys: {},
    boTreatments: {}
  }
};

async function fixOPPARTModel() {
  try {
    console.log('🔧 Correction de la configuration du modèle OPPART...');
    
    // D'abord, récupérer tous les modèles pour identifier le modèle OPPART
    const response = await axios.get(`${API_BASE_URL}/auto-processing/models`);
    const models = response.data.models;
    
    // Trouver le modèle OPPART
    const oppartModel = models.find(model => 
      model.name.includes('OPPART') || 
      model.templateFile === 'OPPART.csv'
    );
    
    if (!oppartModel) {
      console.log('❌ Modèle OPPART non trouvé');
      return;
    }
    
    console.log(`✅ Modèle OPPART trouvé avec l'ID: ${oppartModel.id}`);
    console.log(`📋 Configuration actuelle:`, oppartModel.reconciliationKeys);
    
    // Mettre à jour le modèle avec la configuration corrigée
    const updateResponse = await axios.put(
      `${API_BASE_URL}/auto-processing/models/${oppartModel.id}`,
      correctedOPPARTModel
    );
    
    if (updateResponse.data.success) {
      console.log('✅ Modèle OPPART corrigé avec succès !');
      console.log('📋 Nouvelle configuration:', correctedOPPARTModel.reconciliationKeys);
    } else {
      console.log('❌ Erreur lors de la mise à jour:', updateResponse.data);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error.response?.data || error.message);
  }
}

// Exécuter la correction
fixOPPARTModel();
