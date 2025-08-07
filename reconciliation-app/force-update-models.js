const axios = require('axios');

const API_BASE_URL = 'http://localhost:8080/api';

// Configuration des mises à jour forcées pour les modèles
const forceUpdates = [
    {
        // Modèle TRXBO existant (ID 9)
        id: 9,
        updates: {
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
        }
    },
    {
        // Modèle OPPART existant (ID 20)
        id: 20,
        updates: {
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
    }
];

async function forceUpdateModels() {
    console.log('🔧 Mise à jour forcée des modèles...');
    
    for (const modelUpdate of forceUpdates) {
        try {
            console.log(`📋 Mise à jour forcée du modèle ID ${modelUpdate.id}...`);
            
            // Supprimer d'abord le modèle existant
            try {
                await axios.delete(`${API_BASE_URL}/auto-processing-models/${modelUpdate.id}`);
                console.log(`🗑️ Modèle ID ${modelUpdate.id} supprimé`);
            } catch (deleteError) {
                console.log(`⚠️ Erreur lors de la suppression du modèle ID ${modelUpdate.id}: ${deleteError.message}`);
            }
            
            // Créer un nouveau modèle avec les bonnes configurations
            const response = await axios.post(`${API_BASE_URL}/auto-processing-models`, modelUpdate.updates);
            
            if (response.data.success) {
                console.log(`✅ Nouveau modèle créé avec succès`);
                console.log(`📊 Nom: ${modelUpdate.updates.name}`);
                console.log(`📊 Colonnes configurées: ${modelUpdate.updates.processingSteps[0].field.join(', ')}`);
            } else {
                console.log(`❌ Erreur lors de la création du nouveau modèle`);
            }
        } catch (error) {
            console.log(`❌ Erreur lors de la mise à jour du modèle ID ${modelUpdate.id}: ${error.message}`);
        }
    }
    
    console.log('✅ Mise à jour forcée des modèles terminée !');
}

// Exécuter la mise à jour forcée
forceUpdateModels().catch(console.error); 