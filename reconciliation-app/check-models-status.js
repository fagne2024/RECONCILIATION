const axios = require('axios');

const API_BASE_URL = 'http://localhost:8080/api';

async function checkModelsStatus() {
    console.log('🔍 Vérification de l\'état des modèles...');
    
    try {
        // Récupérer tous les modèles
        const response = await axios.get(`${API_BASE_URL}/auto-processing-models`);
        
        if (response.data.success) {
            const models = response.data.models;
            console.log(`📊 Nombre total de modèles: ${models.length}`);
            
            // Analyser chaque modèle
            models.forEach(model => {
                console.log(`\n📋 Modèle ID ${model.id}: ${model.name}`);
                console.log(`   Type: ${model.fileType}`);
                console.log(`   Pattern: ${model.filePattern}`);
                
                if (model.processingSteps && model.processingSteps.length > 0) {
                    console.log(`   Étapes de traitement: ${model.processingSteps.length}`);
                    model.processingSteps.forEach((step, index) => {
                        console.log(`     Étape ${index + 1}: ${step.name} (${step.type})`);
                        if (step.field && step.field.length > 0) {
                            console.log(`       Colonnes: ${step.field.join(', ')}`);
                        }
                    });
                }
                
                if (model.reconciliationKeys) {
                    console.log(`   Clés de réconciliation configurées`);
                    if (model.reconciliationKeys.boKeys) {
                        console.log(`     BO Keys: ${model.reconciliationKeys.boKeys.join(', ')}`);
                    }
                    if (model.reconciliationKeys.partnerKeys) {
                        console.log(`     Partner Keys: ${model.reconciliationKeys.partnerKeys.join(', ')}`);
                    }
                } else {
                    console.log(`   ❌ Aucune clé de réconciliation configurée`);
                }
            });
        } else {
            console.log('❌ Erreur lors de la récupération des modèles');
        }
    } catch (error) {
        console.log(`❌ Erreur: ${error.message}`);
    }
}

// Exécuter la vérification
checkModelsStatus().catch(console.error); 