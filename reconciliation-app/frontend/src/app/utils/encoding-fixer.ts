const characterMap: { [key: string]: string } = {
  // Corrections d'encodage UTF-8 mal interprété
  'Ã©': 'é',
  'Ã¨': 'è',
  'Ãª': 'ê',
  'Ã«': 'ë',
  'Ã ': 'à',
  'Ã¢': 'â',
  'Ã¤': 'ä',
  'Ã§': 'ç',
  'Ã´': 'ô',
  'Ã¶': 'ö',
  'Ã¹': 'ù',
  'Ã»': 'û',
  'Ã¼': 'ü',
  'Ã®': 'î',
  'Ã¯': 'ï',
  'tï¿½lï¿½phone': 'téléphone',
  'Numï¿½ro': 'Numéro',
  'Opï¿½ration': 'Opération',
  'aprï¿½s': 'après',
  'rï¿½fï¿½rence': 'référence',
  'crï¿½dit': 'crédit',
  'dï¿½bit': 'débit',
  // Corrections pour les caractères manquants (é supprimé)
  'Expditeur': 'Expéditeur',
  'Expéditeur': 'Expéditeur', // Garder si déjà correct
  'Bnficiaire': 'Bénéficiaire',
  'Bénéficiaire': 'Bénéficiaire', // Garder si déjà correct
  'Opration': 'Opération',
  'Opération': 'Opération', // Garder si déjà correct
  'rgularisation': 'régularisation',
  'régularisation': 'régularisation', // Garder si déjà correct
  'rseau': 'réseau',
  'réseau': 'réseau', // Garder si déjà correct
  'Sous-rseau': 'Sous-réseau',
  'Sous-réseau': 'Sous-réseau', // Garder si déjà correct
  'T te de r seau': 'Tête de réseau',
  'Tête de réseau': 'Tête de réseau', // Garder si déjà correct
  // Corrections génériques pour les caractères accentués manquants
  '([A-Za-z])diteur': '$1éditeur', // Expéditeur, Bénéficiaire, etc.
  '([A-Za-z])nficiaire': '$1énéficiaire',
  '([A-Za-z])pration': '$1opération',
  '([A-Za-z])gularisation': '$1égularisation',
  '([A-Za-z])seau': '$1éseau',
};

/**
 * Répare les chaînes de caractères où l'encodage UTF-8 a été mal interprété.
 * @param text La chaîne de caractères à nettoyer.
 * @returns La chaîne de caractères corrigée.
 */
export function fixGarbledCharacters(text: string | null | undefined): string {
  if (!text) {
    return '';
  }

  let fixedText = text;
  
  // D'abord, gérer spécifiquement le caractère Unicode de remplacement (U+FFFD = )
  // Remplacer les patterns avec ce caractère (doit être fait en premier)
  fixedText = fixedText.replace(/Exp\uFFFD?diteur/gi, 'Expéditeur');
  fixedText = fixedText.replace(/B\uFFFD?n\uFFFD?ficiaire/gi, 'Bénéficiaire');
  fixedText = fixedText.replace(/B\uFFFD?nficiaire/gi, 'Bénéficiaire');
  fixedText = fixedText.replace(/Bn\uFFFD?ficiaire/gi, 'Bénéficiaire');
  fixedText = fixedText.replace(/O\uFFFD?pration/gi, 'Opération');
  fixedText = fixedText.replace(/op\uFFFD?ration/gi, 'opération');
  fixedText = fixedText.replace(/r\uFFFD?gularisation/gi, 'régularisation');
  fixedText = fixedText.replace(/r\uFFFD?seau/gi, 'réseau');
  fixedText = fixedText.replace(/r\uFFFD?f\uFFFD?rence/gi, 'référence');
  fixedText = fixedText.replace(/Num\uFFFD?ro/gi, 'Numéro');
  fixedText = fixedText.replace(/num\uFFFD?ro/gi, 'numéro');
  fixedText = fixedText.replace(/apr\uFFFD?s/gi, 'après');
  fixedText = fixedText.replace(/cr\uFFFD?dit/gi, 'crédit');
  fixedText = fixedText.replace(/d\uFFFD?bit/gi, 'débit');
  fixedText = fixedText.replace(/t\uFFFD?l\uFFFD?phone/gi, 'téléphone');
  
  // Ensuite, gérer les patterns où le caractère est complètement absent (le plus courant)
  fixedText = fixedText.replace(/Expditeur/gi, 'Expéditeur');
  fixedText = fixedText.replace(/Bnficiaire/gi, 'Bénéficiaire');
  fixedText = fixedText.replace(/Opration/gi, 'Opération');
  fixedText = fixedText.replace(/opration/gi, 'opération');
  fixedText = fixedText.replace(/rgularisation/gi, 'régularisation');
  fixedText = fixedText.replace(/rseau/gi, 'réseau');
  fixedText = fixedText.replace(/rfrence/gi, 'référence');
  fixedText = fixedText.replace(/Numro/gi, 'Numéro');
  fixedText = fixedText.replace(/numro/gi, 'numéro');
  fixedText = fixedText.replace(/aprs/gi, 'après');
  fixedText = fixedText.replace(/crdit/gi, 'crédit');
  fixedText = fixedText.replace(/dbit/gi, 'débit');
  fixedText = fixedText.replace(/tlphone/gi, 'téléphone');
  
  // Pattern générique pour remplacer n'importe quel caractère (y compris U+FFFD) entre B et n dans "Bénéficiaire"
  // Le caractère peut être présent ou absent
  fixedText = fixedText.replace(/B[\uFFFD\u0000-\u001F\u007F-\u009F\s]?n[\uFFFD\u0000-\u001F\u007F-\u009F\s]?ficiaire/gi, 'Bénéficiaire');
  fixedText = fixedText.replace(/B[\uFFFD\u0000-\u001F\u007F-\u009F\s]?nficiaire/gi, 'Bénéficiaire');
  fixedText = fixedText.replace(/Bn[\uFFFD\u0000-\u001F\u007F-\u009F\s]?ficiaire/gi, 'Bénéficiaire');
  // Pattern simple pour Bnficiaire (sans caractère)
  fixedText = fixedText.replace(/Bnficiaire/gi, 'Bénéficiaire');
  
  // D'abord, appliquer les corrections exactes
  for (const [garbled, correct] of Object.entries(characterMap)) {
    // Ignorer les patterns regex (qui contiennent des parenthèses et $)
    if (!garbled.includes('(') && !garbled.includes('$')) {
      const regex = new RegExp(garbled.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      fixedText = fixedText.replace(regex, correct);
    }
  }
  
  // Ensuite, appliquer les corrections génériques avec regex
  // Expéditeur, Bénéficiaire, etc.
  fixedText = fixedText.replace(/([A-Za-z])diteur/gi, '$1éditeur');
  fixedText = fixedText.replace(/([A-Za-z])nficiaire/gi, '$1énéficiaire');
  fixedText = fixedText.replace(/([A-Za-z])pration/gi, '$1opération');
  fixedText = fixedText.replace(/([A-Za-z])gularisation/gi, '$1égularisation');
  fixedText = fixedText.replace(/([A-Za-z])seau/gi, '$1éseau');
  
  // Correction spéciale pour "T te de r seau" -> "Tête de réseau"
  fixedText = fixedText.replace(/T\s+te\s+de\s+r\s+seau/gi, 'Tête de réseau');
  fixedText = fixedText.replace(/T te de r seau/gi, 'Tête de réseau');
  
  // Gérer les cas où le "é" est complètement absent (le plus courant)
  // Patterns spécifiques pour les mots courants
  fixedText = fixedText.replace(/\bExpditeur\b/gi, 'Expéditeur');
  fixedText = fixedText.replace(/\bBnficiaire\b/gi, 'Bénéficiaire');
  fixedText = fixedText.replace(/\bOpration\b/gi, 'Opération');
  fixedText = fixedText.replace(/\bopration\b/gi, 'opération');
  fixedText = fixedText.replace(/\brgularisation\b/gi, 'régularisation');
  fixedText = fixedText.replace(/\brseau\b/gi, 'réseau');
  fixedText = fixedText.replace(/\brfrence\b/gi, 'référence');
  fixedText = fixedText.replace(/\bNumro\b/gi, 'Numéro');
  fixedText = fixedText.replace(/\bnumro\b/gi, 'numéro');
  fixedText = fixedText.replace(/\baprs\b/gi, 'après');
  fixedText = fixedText.replace(/\bcrdit\b/gi, 'crédit');
  fixedText = fixedText.replace(/\bdbit\b/gi, 'débit');
  fixedText = fixedText.replace(/\btlphone\b/gi, 'téléphone');
  
  // Patterns dans des contextes plus larges (avec espaces, etc.)
  fixedText = fixedText.replace(/Expditeur/gi, 'Expéditeur');
  fixedText = fixedText.replace(/Bnficiaire/gi, 'Bénéficiaire');
  fixedText = fixedText.replace(/Opration/gi, 'Opération');
  fixedText = fixedText.replace(/opration/gi, 'opération');
  fixedText = fixedText.replace(/rgularisation/gi, 'régularisation');
  fixedText = fixedText.replace(/rseau/gi, 'réseau');
  fixedText = fixedText.replace(/rfrence/gi, 'référence');
  fixedText = fixedText.replace(/Numro/gi, 'Numéro');
  fixedText = fixedText.replace(/numro/gi, 'numéro');
  fixedText = fixedText.replace(/aprs/gi, 'après');
  fixedText = fixedText.replace(/crdit/gi, 'crédit');
  fixedText = fixedText.replace(/dbit/gi, 'débit');
  fixedText = fixedText.replace(/tlphone/gi, 'téléphone');
  
  // Gérer le caractère de remplacement Unicode () si présent
  fixedText = fixedText.replace(/Expditeur/gi, 'Expéditeur');
  fixedText = fixedText.replace(/Bnficiaire/gi, 'Bénéficiaire');
  fixedText = fixedText.replace(/Opration/gi, 'Opération');
  fixedText = fixedText.replace(/opration/gi, 'opération');
  fixedText = fixedText.replace(/rgularisation/gi, 'régularisation');
  fixedText = fixedText.replace(/rseau/gi, 'réseau');
  
  return fixedText;
}
