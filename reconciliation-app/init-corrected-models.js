const axios = require('axios');

const API_BASE_URL = 'http://localhost:8080/api';

// Configuration des modèles corrigés
const correctedModels = [
    {
        name: 'Modèle TRXBO - Colonnes Corrigées',
        filePattern: '*TRXBO*.csv',
        fileType: 'bo',
        autoApply: true,
        templateFile: 'TRXBO.csv',
        processingSteps: [
            {
                id: 'step_keep_essential_columns',
                name: 'GARDER_COLONNES_ESSENTIELLES',
                type: 'select',
                action: 'keepColumns',
                field: ['ID', 'IDTransaction', 'téléphone client', 'montant', 'Service', 'Agence', 'Date', 'Numéro Trans GU', 'Statut'],
                params: {},
                description: 'Garder seulement les colonnes essentielles pour la réconciliation'
            }
        ],
        reconciliationKeys: {
            boKeys: ['ID', 'IDTransaction', 'Numéro Trans GU', 'montant', 'Date'],
            partnerKeys: ['External id', 'Transaction ID', 'Amount', 'Date']
        }
    },
    {
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
                field: ['ID Opération', 'Type Opération', 'Montant', 'Solde avant', 'Solde aprés', 'Code propriétaire', 'Téléphone', 'Statut', 'ID Transaction', 'Num bordereau', 'Date opération', 'Date de versement', 'Banque appro', 'Login demandeur Appro', 'Login valideur Appro', 'Motif rejet', 'Frais connexion', 'Numéro Trans GU', 'Agent', 'Motif régularisation', 'groupe de réseau'],
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
    }
];

async function initCorrectedModels() {
    console.log('🔧 Initialisation des modèles corrigés...');
    
    for (const modelConfig of correctedModels) {
        try {
            console.log(`📋 Création du modèle: ${modelConfig.name}`);
            
            // Créer le nouveau modèle
            const response = await axios.post(`${API_BASE_URL}/auto-processing-models`, modelConfig);
            
            if (response.data.success) {
                console.log(`✅ Modèle créé avec succès: ${modelConfig.name}`);
                console.log(`📊 Colonnes configurées: ${modelConfig.processingSteps[0].field.join(', ')}`);
            } else {
                console.log(`❌ Erreur lors de la création du modèle: ${modelConfig.name}`);
            }
        } catch (error) {
            console.log(`❌ Erreur lors de la création du modèle ${modelConfig.name}: ${error.message}`);
        }
    }
    
    console.log('✅ Initialisation des modèles terminée !');
}

// Exécuter l'initialisation
initCorrectedModels().catch(console.error); 