// Script de test simple pour OPPART
const axios = require('axios');

const API_BASE_URL = 'http://localhost:8080/api';

async function testOPPARTModel() {
  console.log('🔧 Test du modèle OPPART...');
  
  try {
    // Récupérer tous les modèles
    console.log('📋 Récupération des modèles...');
    const response = await axios.get(`${API_BASE_URL}/auto-processing/models`);
    const models = response.data;
    
    // Chercher le modèle OPPART
    const oppartModel = models.find(model => 
      model.name.includes('OPPART') || 
      model.filePattern.includes('OPPART')
    );
    
    if (oppartModel) {
      console.log(`✅ Modèle OPPART trouvé:`);
      console.log(`   - ID: ${oppartModel.id}`);
      console.log(`   - Nom: ${oppartModel.name}`);
      console.log(`   - Étapes: ${oppartModel.processingSteps.length}`);
      
      // Vérifier les colonnes traitées
      if (oppartModel.processingSteps.length > 0) {
        const firstStep = oppartModel.processingSteps[0];
        console.log(`   - Action: ${firstStep.action}`);
        console.log(`   - Colonnes: ${firstStep.field.length}`);
        
        if (firstStep.field && firstStep.field.length > 0) {
          console.log('\n📋 Colonnes traitées:');
          firstStep.field.forEach((col, index) => {
            console.log(`   ${index + 1}. ${col}`);
          });
        }
      }
    } else {
      console.log('❌ Aucun modèle OPPART trouvé');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

// Exécution
testOPPARTModel()
  .then(() => console.log('\n✅ Test terminé'))
  .catch(error => console.error('❌ Erreur:', error)); 