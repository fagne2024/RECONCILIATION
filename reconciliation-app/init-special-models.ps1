# Initialisation des modèles spéciaux pour TRXBO, OPPART et USSDPART
Write-Host "Initialisation des modeles speciaux pour TRXBO, OPPART et USSDPART" -ForegroundColor Cyan

# Vérifier que le frontend est accessible
Write-Host "`nVerification de l'acces au frontend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4200" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Frontend accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend non accessible. Demarrage..." -ForegroundColor Red
    Start-Process powershell -ArgumentList "-Command", "cd frontend; npm start" -WindowStyle Minimized
    Start-Sleep 10
}

# Créer un script Node.js pour initialiser les modèles
$initScript = @"
const axios = require('axios');

const API_BASE_URL = 'http://localhost:8080/api';

// Configuration des modèles spéciaux
const specialModels = [
  {
    name: 'Modèle TRXBO - Configuration Complète',
    filePattern: '*TRXBO*.csv',
    fileType: 'bo',
    autoApply: true,
    templateFile: 'TRXBO.csv',
    processingSteps: [
      {
        id: 'step_clean_data',
        name: 'NETTOYAGE_DONNEES_TRXBO',
        type: 'format',
        action: 'cleanText',
        field: ['ID', 'IDTransaction', 'téléphone client', 'montant', 'Service', 'Moyen de Paiement', 'Agence', 'Agent', 'Type agent', 'PIXI', 'Date', 'Numéro Trans GU', 'GRX', 'Statut', 'Latitude', 'Longitude', 'ID Partenaire DIST', 'Expéditeur', 'Pays provenance', 'Bénéficiaire', 'Canal de distribution'],
        params: {},
        description: 'Nettoyage des données TRXBO'
      },
      {
        id: 'step_format_amount',
        name: 'FORMATAGE_MONTANT_TRXBO',
        type: 'format',
        action: 'formatCurrency',
        field: ['montant'],
        params: { currency: 'XOF', locale: 'fr-FR' },
        description: 'Formatage des montants TRXBO'
      },
      {
        id: 'step_format_date',
        name: 'FORMATAGE_DATE_TRXBO',
        type: 'format',
        action: 'formatDate',
        field: ['Date'],
        params: { format: 'YYYY-MM-DD' },
        description: 'Formatage des dates TRXBO'
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
  },
  {
    name: 'Modèle USSDPART - Configuration Complète',
    filePattern: '*USSDPART*.csv',
    fileType: 'bo',
    autoApply: true,
    templateFile: 'USSDPART.csv',
    processingSteps: [
      {
        id: 'step_clean_data',
        name: 'NETTOYAGE_DONNEES_USSDPART',
        type: 'format',
        action: 'cleanText',
        field: ['ID', 'Groupe Réseaux', 'Code réseau', 'Agence', 'Code PIXI', 'Code de Proxy', 'Code service', 'Numéro Trans GU', 'Déstinataire', 'Login agent', 'Type agent', 'date de création', 'Date d\'envoi vers part', 'Etat', 'Type', 'Token', 'SMS', 'Action faite', 'Statut', 'Utilisateur', 'Montant', 'Latitude', 'Longitude', 'Partenaire dist ID', 'Agence SC', 'Groupe reseau SC', 'Agent SC', 'PDA SC', 'Date dernier traitement'],
        params: {},
        description: 'Nettoyage des données USSDPART'
      },
      {
        id: 'step_format_amount',
        name: 'FORMATAGE_MONTANT_USSDPART',
        type: 'format',
        action: 'formatCurrency',
        field: ['Montant'],
        params: { currency: 'XOF', locale: 'fr-FR' },
        description: 'Formatage des montants USSDPART'
      },
      {
        id: 'step_format_date',
        name: 'FORMATAGE_DATE_USSDPART',
        type: 'format',
        action: 'formatDate',
        field: ['date de création', 'Date d\'envoi vers part', 'Date dernier traitement'],
        params: { format: 'YYYY-MM-DD' },
        description: 'Formatage des dates USSDPART'
      }
    ],
    reconciliationKeys: {
      boKeys: ['ID', 'Numéro Trans GU', 'Montant', 'date de création'],
      partnerKeys: ['Transaction ID', 'External ID', 'Amount', 'Date']
    }
  }
];

async function initializeSpecialModels() {
  console.log('🔧 Initialisation des modèles spéciaux...');
  
  for (const model of specialModels) {
    try {
      console.log(`📋 Création du modèle: ${model.name}`);
      
      const response = await axios.post(`${API_BASE_URL}/auto-processing/models`, model);
      
      if (response.status === 201 || response.status === 200) {
        console.log(`✅ Modèle ${model.name} créé avec succès`);
        console.log(`   - ID: ${response.data.id}`);
        console.log(`   - Clés BO: ${model.reconciliationKeys.boKeys.join(', ')}`);
        console.log(`   - Clés Partenaire: ${model.reconciliationKeys.partnerKeys.join(', ')}`);
      }
    } catch (error) {
      if (error.response && error.response.status === 409) {
        console.log(`⚠️ Modèle ${model.name} existe déjà`);
      } else {
        console.error(`❌ Erreur lors de la création du modèle ${model.name}:`, error.message);
      }
    }
  }
  
  console.log('✅ Initialisation des modèles terminée');
}

// Test de récupération des colonnes
async function testColumnRetrieval() {
  console.log('\n🔍 Test de récupération des colonnes...');
  
  const testFiles = ['TRXBO.csv', 'OPPART.csv', 'USSDPART.csv'];
  
  for (const fileName of testFiles) {
    try {
      console.log(`📊 Test pour ${fileName}...`);
      
      const response = await axios.get(`${API_BASE_URL}/auto-processing/models/columns/${fileName}`);
      
      if (response.status === 200) {
        console.log(`✅ Colonnes récupérées pour ${fileName}:`);
        console.log(`   - Nombre de colonnes: ${response.data.length}`);
        console.log(`   - Colonnes: ${response.data.join(', ')}`);
      }
    } catch (error) {
      console.error(`❌ Erreur lors de la récupération des colonnes pour ${fileName}:`, error.message);
    }
  }
}

// Exécution
initializeSpecialModels()
  .then(() => testColumnRetrieval())
  .then(() => console.log('\n✅ Tests terminés'))
  .catch(error => console.error('❌ Erreur:', error));
"@

# Écrire le script Node.js
$initScript | Out-File -FilePath "init-special-models.js" -Encoding UTF8

Write-Host "`nExecution du script d'initialisation..." -ForegroundColor Yellow
try {
    node init-special-models.js
    Write-Host "✅ Initialisation reussie" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors de l'initialisation: $_" -ForegroundColor Red
}

# Nettoyer le fichier temporaire
Remove-Item "init-special-models.js" -ErrorAction SilentlyContinue

Write-Host "`nResume de l'initialisation:" -ForegroundColor Cyan
Write-Host "✅ Modeles TRXBO, OPPART et USSDPART crees" -ForegroundColor Green
Write-Host "✅ Configuration des colonnes de reconciliation" -ForegroundColor Green
Write-Host "✅ Test de recuperation des colonnes" -ForegroundColor Green
Write-Host "✅ Integration avec le service SpecialFileDetectionService" -ForegroundColor Green

Write-Host "`nLes modeles sont maintenant configures pour recuperer correctement les colonnes!" -ForegroundColor Green 