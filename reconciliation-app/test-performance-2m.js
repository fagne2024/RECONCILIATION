/**
 * Script de test pour vérifier les performances du menu traitement
 * avec des fichiers contenant jusqu'à 2 millions de lignes
 */

const fs = require('fs');
const path = require('path');

// Configuration
const TEST_DIR = './test-files';
const MAX_ROWS = 2000000;
const CHUNK_SIZE = 100000;

// Créer le répertoire de test
if (!fs.existsSync(TEST_DIR)) {
  fs.mkdirSync(TEST_DIR);
}

/**
 * Génère un fichier CSV de test avec le nombre de lignes spécifié
 */
function generateTestCSV(filename, numRows) {
  console.log(`📝 Génération du fichier ${filename} avec ${numRows.toLocaleString()} lignes...`);
  
  const startTime = Date.now();
  const headers = [
    'N°', 'Date', 'Heure', 'Référence', 'Service', 'Paiement', 'Statut', 
    'Mode', 'Compte', 'Wallet', 'Pseudo', 'Débit', 'Crédit', 'Montant', 
    'Commissions', 'Opération', 'Agent', 'Correspondant', 'Sous-réseau', 'Transaction'
  ];
  
  // Écrire l'en-tête
  let csvContent = headers.join(';') + '\n';
  
  // Générer les données par chunks
  for (let i = 1; i <= numRows; i += CHUNK_SIZE) {
    const chunkSize = Math.min(CHUNK_SIZE, numRows - i + 1);
    const chunk = [];
    
    for (let j = 0; j < chunkSize; j++) {
      const rowNum = i + j;
      const row = [
        rowNum.toString().padStart(8, '0'),
        `2024-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
        `${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
        `REF${rowNum.toString().padStart(10, '0')}`,
        ['Transfert', 'Paiement', 'Retrait', 'Dépôt'][Math.floor(Math.random() * 4)],
        ['Réussi', 'Échoué', 'En cours'][Math.floor(Math.random() * 3)],
        ['En ligne', 'Mobile', 'Agent'][Math.floor(Math.random() * 3)],
        ['Orange Money', 'Mobile Money', 'Carte'][Math.floor(Math.random() * 3)],
        `237${Math.floor(Math.random() * 90000000) + 10000000}`,
        `W${rowNum.toString().padStart(8, '0')}`,
        `User${rowNum}`,
        Math.floor(Math.random() * 1000000),
        Math.floor(Math.random() * 1000000),
        Math.floor(Math.random() * 1000000),
        Math.floor(Math.random() * 100000),
        ['Transfert', 'Paiement', 'Retrait'][Math.floor(Math.random() * 3)],
        `Agent${Math.floor(Math.random() * 1000)}`,
        `Corresp${Math.floor(Math.random() * 100)}`,
        `Réseau${Math.floor(Math.random() * 50)}`,
        `TXN${rowNum.toString().padStart(12, '0')}`
      ];
      chunk.push(row.join(';'));
    }
    
    csvContent += chunk.join('\n') + '\n';
    
    // Afficher la progression
    if (i % (CHUNK_SIZE * 10) === 0) {
      const progress = ((i - 1) / numRows * 100).toFixed(1);
      console.log(`   Progression: ${progress}% (${i.toLocaleString()}/${numRows.toLocaleString()} lignes)`);
    }
  }
  
  // Écrire le fichier
  const filePath = path.join(TEST_DIR, filename);
  fs.writeFileSync(filePath, csvContent, 'utf8');
  
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  const fileSize = (fs.statSync(filePath).size / (1024 * 1024)).toFixed(2);
  
  console.log(`✅ Fichier généré: ${filename}`);
  console.log(`   Taille: ${fileSize} MB`);
  console.log(`   Durée: ${duration.toFixed(2)} secondes`);
  console.log(`   Vitesse: ${(numRows / duration).toFixed(0)} lignes/seconde`);
  
  return {
    filename,
    rows: numRows,
    size: fileSize,
    duration,
    speed: numRows / duration
  };
}

/**
 * Génère une série de fichiers de test avec différentes tailles
 */
function generateTestFiles() {
  console.log('🚀 Génération des fichiers de test pour les optimisations 2M lignes\n');
  
  const testSizes = [
    10000,      // 10k lignes - Test basique
    50000,      // 50k lignes - Test standard
    100000,     // 100k lignes - Test moyen
    500000,     // 500k lignes - Test gros
    1000000,    // 1M lignes - Test très gros
    2000000     // 2M lignes - Test ultra gros
  ];
  
  const results = [];
  
  for (const size of testSizes) {
    const filename = `test-${size.toLocaleString()}-lignes.csv`;
    const result = generateTestCSV(filename, size);
    results.push(result);
    console.log(''); // Ligne vide pour séparer
  }
  
  // Générer un rapport de test
  generateTestReport(results);
}

/**
 * Génère un rapport de test avec les statistiques
 */
function generateTestReport(results) {
  console.log('📊 RAPPORT DE GÉNÉRATION DES FICHIERS DE TEST');
  console.log('=' .repeat(60));
  
  console.log('\n📋 Résumé des fichiers générés:');
  console.log('-' .repeat(60));
  console.log('Fichier'.padEnd(25) + 'Lignes'.padEnd(12) + 'Taille'.padEnd(10) + 'Durée'.padEnd(10) + 'Vitesse');
  console.log('-'.repeat(60));
  
  let totalSize = 0;
  let totalDuration = 0;
  
  results.forEach(result => {
    const filename = result.filename.padEnd(25);
    const rows = result.rows.toLocaleString().padEnd(12);
    const size = `${result.size} MB`.padEnd(10);
    const duration = `${result.duration.toFixed(1)}s`.padEnd(10);
    const speed = `${result.speed.toFixed(0)} l/s`;
    
    console.log(`${filename}${rows}${size}${duration}${speed}`);
    
    totalSize += parseFloat(result.size);
    totalDuration += result.duration;
  });
  
  console.log('-'.repeat(60));
  console.log(`Total: ${results.length} fichiers, ${(totalSize).toFixed(2)} MB, ${totalDuration.toFixed(1)}s`);
  
  // Générer un fichier de rapport
  const reportPath = path.join(TEST_DIR, 'rapport-test.txt');
  const reportContent = `RAPPORT DE GÉNÉRATION DES FICHIERS DE TEST
${'='.repeat(60)}

Date: ${new Date().toLocaleString()}
Nombre de fichiers: ${results.length}

DÉTAIL DES FICHIERS:
${'-'.repeat(60)}
${results.map(r => `${r.filename}: ${r.rows.toLocaleString()} lignes, ${r.size} MB, ${r.duration.toFixed(1)}s`).join('\n')}

STATISTIQUES:
${'-'.repeat(60)}
Total lignes: ${results.reduce((sum, r) => sum + r.rows, 0).toLocaleString()}
Total taille: ${totalSize.toFixed(2)} MB
Total durée: ${totalDuration.toFixed(1)} secondes
Vitesse moyenne: ${(results.reduce((sum, r) => sum + r.rows, 0) / totalDuration).toFixed(0)} lignes/seconde

INSTRUCTIONS DE TEST:
${'-'.repeat(60)}
1. Ouvrir l'application de réconciliation
2. Aller dans le menu "Traitement"
3. Charger les fichiers de test un par un
4. Vérifier les performances et les optimisations
5. Tester les fonctionnalités: formatage, export, filtres
6. Vérifier que l'interface reste réactive

OPTIMISATIONS À VÉRIFIER:
${'-'.repeat(60)}
- Traitement par chunks (25k lignes par chunk)
- Gestion mémoire (limite 500MB)
- Cache de performance
- Export ultra-rapide
- Formatage optimisé
- Messages de progression
- Interface réactive
`;

  fs.writeFileSync(reportPath, reportContent, 'utf8');
  console.log(`\n📄 Rapport généré: ${reportPath}`);
}

/**
 * Fonction principale
 */
function main() {
  console.log('🧪 SCRIPT DE TEST - OPTIMISATIONS 2M LIGNES');
  console.log('=' .repeat(50));
  
  try {
    generateTestFiles();
    console.log('\n🎉 Génération terminée avec succès!');
    console.log('\n📝 Prochaines étapes:');
    console.log('1. Tester les fichiers dans l\'application');
    console.log('2. Vérifier les performances du menu traitement');
    console.log('3. Confirmer que les optimisations fonctionnent');
    
  } catch (error) {
    console.error('❌ Erreur lors de la génération:', error);
    process.exit(1);
  }
}

// Exécuter le script
if (require.main === module) {
  main();
}

module.exports = {
  generateTestCSV,
  generateTestFiles,
  generateTestReport
};
