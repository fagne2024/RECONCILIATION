// Script de test pour la normalisation des colonnes TRXBO
console.log('🧪 Test de normalisation des colonnes TRXBO');

// Fonction de normalisation (copie de la logique du service)
function normalizeColumnName(columnName) {
  if (!columnName) return columnName;
  
  let normalizedName = columnName;
  
  // Normalisation des caractères spéciaux français
  const frenchCharReplacements = {
    // Caractères corrompus spécifiques aux colonnes
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
    'N° Pseudo': 'N° Pseudo',
    
    // Corrections spécifiques pour TRXBO
    'tÃ©lÃ©phone client': 'téléphone client',
    'NumÃ©ro Trans GU': 'Numéro Trans GU',
    'tÃ©lÃ©phone': 'téléphone',
    'NumÃ©ro': 'Numéro'
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

  return normalizedName;
}

// Fonction utilitaire pour échapper les caractères spéciaux dans les regex
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Tests
const testCases = [
  'tÃ©lÃ©phone client',
  'NumÃ©ro Trans GU',
  'tÃ©lÃ©phone',
  'NumÃ©ro',
  'téléphone client',
  'Numéro Trans GU',
  'IDTransaction',
  'montant',
  'Service',
  'Agence'
];

console.log('\n📋 Tests de normalisation:');
testCases.forEach(testCase => {
  const normalized = normalizeColumnName(testCase);
  console.log(`"${testCase}" -> "${normalized}"`);
});

console.log('\n✅ Tests terminés');
