// Script de test pour la normalisation des caractères spéciaux
const axios = require('axios');

const API_BASE_URL = 'http://localhost:8080/api';

// Données de test avec des caractères spéciaux corrompus
const testData = [
  {
    'ID': '1',
    'IDTransaction': 'TRX001',
    'tlphone client': '+237612345678',
    'montant': '50000',
    'Service': 'Transfert',
    'Moyen de Paiement': 'Mobile Money',
    'Agence': 'Douala Centre',
    'Agent': 'Agent001',
    'Type agent': 'Agent',
    'PIXI': 'PIXI001',
    'Date': '2024-01-15',
    'Numro Trans GU': 'GU001',
    'GRX': 'GRX001',
    'Statut': 'Succès',
    'Latitude': '4.0511',
    'Longitude': '9.7679',
    'ID Partenaire DIST': 'PART001',
    'Expéditeur': 'Client001',
    'Pays provenance': 'Cameroun',
    'Bénéficiaire': 'Client002',
    'Canal de distribution': 'Mobile'
  },
  {
    'ID': '2',
    'IDTransaction': 'TRX002',
    'tlphone client': '+237698765432',
    'montant': '75000',
    'Service': 'Paiement',
    'Moyen de Paiement': 'Carte',
    'Agence': 'Yaoundé Centre',
    'Agent': 'Agent002',
    'Type agent': 'Agent',
    'PIXI': 'PIXI002',
    'Date': '2024-01-16',
    'Numro Trans GU': 'GU002',
    'GRX': 'GRX002',
    'Statut': 'Succès',
    'Latitude': '3.8480',
    'Longitude': '11.5021',
    'ID Partenaire DIST': 'PART002',
    'Expéditeur': 'Client003',
    'Pays provenance': 'Cameroun',
    'Bénéficiaire': 'Client004',
    'Canal de distribution': 'Carte'
  }
];

// Fonction de normalisation (copie de la logique du service)
function normalizeColumnName(columnName) {
  if (!columnName) return columnName;
  
  let normalizedName = columnName;
  
  // Normalisation des caractères spéciaux français
  const frenchCharReplacements = {
    'tlphone': 'téléphone',
    'Numro': 'Numéro',
    'Solde aprs': 'Solde après',
    'Code proprietaire': 'Code propriétaire',
    'groupe de rseau': 'groupe de réseau',
    'Code rseau': 'Code réseau',
    'date de cration': 'date de création',
    'Motif rgularisation': 'Motif régularisation',
    'Dstinataire': 'Destinataire',
    'Login demandeur Appro': 'Login demandeur Appro',
    'Login valideur Appro': 'Login valideur Appro',
    'Motif rejet': 'Motif rejet',
    'Frais connexion': 'Frais connexion',
    'Login agent': 'Login agent',
    'Type agent': 'Type agent',
    'Date d\'envoi vers part': 'Date d\'envoi vers part',
    'Action faite': 'Action faite',
    'Partenaire dist ID': 'Partenaire dist ID',
    'Agence SC': 'Agence SC',
    'Groupe reseau SC': 'Groupe reseau SC',
    'Agent SC': 'Agent SC',
    'PDA SC': 'PDA SC',
    'Date dernier traitement': 'Date dernier traitement',
    
    // Corrections spécifiques pour les fichiers Excel
    'Opration': 'Opération',
    'Montant (XAF)': 'Montant (XAF)',
    'Commissions (XAF)': 'Commissions (XAF)',
    'N° de Compte': 'N° de Compte',
    'N° Pseudo': 'N° Pseudo'
  };

  // Appliquer les remplacements de caractères spéciaux
  for (const [corrupted, correct] of Object.entries(frenchCharReplacements)) {
    if (normalizedName.includes(corrupted)) {
      normalizedName = normalizedName.replace(new RegExp(escapeRegExp(corrupted), 'g'), correct);
    }
  }

  // Normalisation des espaces multiples et caractères invisibles
  normalizedName = normalizedName
    .replace(/\s+/g, ' ')  // Espaces multiples -> un seul espace
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')  // Caractères invisibles -> espace
    .trim();

  // Normalisation de la casse pour les mots-clés spécifiques
  const keywordsToNormalize = [
    'téléphone', 'numéro', 'propriétaire', 'réseau', 'création', 
    'régularisation', 'destinataire', 'connexion', 'opération'
  ];
  
  keywordsToNormalize.forEach(keyword => {
    const regex = new RegExp(escapeRegExp(keyword), 'gi');
    normalizedName = normalizedName.replace(regex, keyword);
  });

  return normalizedName;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeFileData(data) {
  if (!data || data.length === 0) return data;

  return data.map(row => {
    const normalizedRow = {};
    
    // Normaliser les clés (noms de colonnes)
    Object.keys(row).forEach(key => {
      const normalizedKey = normalizeColumnName(key);
      normalizedRow[normalizedKey] = row[key];
    });
    
    return normalizedRow;
  });
}

// Test de normalisation
async function testNormalization() {
  console.log('🧪 Test de normalisation des caractères spéciaux...\n');
  
  console.log('📋 Données originales:');
  console.log('Colonnes:', Object.keys(testData[0]));
  console.log('Première ligne:', testData[0]);
  console.log('');
  
  const normalizedData = normalizeFileData(testData);
  
  console.log('✅ Données normalisées:');
  console.log('Colonnes:', Object.keys(normalizedData[0]));
  console.log('Première ligne:', normalizedData[0]);
  console.log('');
  
  // Vérifier les corrections spécifiques
  const corrections = [
    { original: 'tlphone client', expected: 'téléphone client' },
    { original: 'Numro Trans GU', expected: 'Numéro Trans GU' },
    { original: 'Code proprietaire', expected: 'Code propriétaire' },
    { original: 'groupe de rseau', expected: 'groupe de réseau' },
    { original: 'Code rseau', expected: 'Code réseau' },
    { original: 'date de cration', expected: 'date de création' },
    { original: 'Motif rgularisation', expected: 'Motif régularisation' },
    { original: 'Dstinataire', expected: 'Destinataire' },
    { original: 'Frais connexion', expected: 'Frais connexion' },
    { original: 'Opration', expected: 'Opération' }
  ];
  
  console.log('🔍 Vérification des corrections:');
  corrections.forEach(correction => {
    const normalized = normalizeColumnName(correction.original);
    const status = normalized === correction.expected ? '✅' : '❌';
    console.log(`${status} "${correction.original}" -> "${normalized}" (attendu: "${correction.expected}")`);
  });
  
  console.log('\n🎯 Test terminé!');
}

// Exécution du test
testNormalization().catch(console.error); 