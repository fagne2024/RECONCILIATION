const fetch = require('node-fetch');

// Test de l'endpoint de sauvegarde du solde BO
async function testSoldeBoEndpoint() {
    console.log('🔧 Test de l\'endpoint /api/compte-solde-bo/set...');
    
    const testData = {
        numeroCompte: 'CELCM0001',
        dateSolde: '2025-01-01',
        soldeBo: 1000000.50
    };
    
    try {
        const response = await fetch('http://localhost:8080/api/compte-solde-bo/set', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData)
        });
        
        console.log('📊 Status:', response.status);
        console.log('📊 Status Text:', response.statusText);
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Réponse réussie:', result);
        } else {
            const errorText = await response.text();
            console.log('❌ Erreur de l\'endpoint:', errorText);
        }
        
    } catch (error) {
        console.error('❌ Erreur réseau:', error.message);
    }
}

// Test de l'endpoint de lecture du solde BO
async function testGetSoldeBoEndpoint() {
    console.log('\n🔧 Test de l\'endpoint /api/compte-solde-bo/get...');
    
    const testParams = {
        numeroCompte: 'CELCM0001',
        dateSolde: '2025-01-01'
    };
    
    try {
        const url = `http://localhost:8080/api/compte-solde-bo/get?numeroCompte=${testParams.numeroCompte}&dateSolde=${testParams.dateSolde}`;
        const response = await fetch(url);
        
        console.log('📊 Status:', response.status);
        console.log('📊 Status Text:', response.statusText);
        
        if (response.ok) {
            const result = await response.text();
            console.log('✅ Réponse réussie:', result);
        } else {
            const errorText = await response.text();
            console.log('❌ Erreur de l\'endpoint:', errorText);
        }
        
    } catch (error) {
        console.error('❌ Erreur réseau:', error.message);
    }
}

// Test de la connectivité générale
async function testApiConnectivity() {
    console.log('\n🔧 Test de connectivité générale...');
    
    try {
        const response = await fetch('http://localhost:8080/api/comptes');
        console.log('📊 Status (comptes):', response.status);
        
        if (response.ok) {
            console.log('✅ API accessible');
        } else {
            console.log('❌ API non accessible');
        }
        
    } catch (error) {
        console.error('❌ Erreur de connectivité:', error.message);
    }
}

// Exécuter tous les tests
async function runAllTests() {
    console.log('🚀 Début des tests des endpoints Solde BO\n');
    
    await testApiConnectivity();
    await testSoldeBoEndpoint();
    await testGetSoldeBoEndpoint();
    
    console.log('\n✅ Tests terminés');
}

runAllTests();
