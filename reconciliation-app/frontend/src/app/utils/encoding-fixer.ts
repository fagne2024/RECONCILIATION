const characterMap: { [key: string]: string } = {
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
  'dï¿½bit': 'débit'
  // Ajoute d'autres remplacements si nécessaire
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
  for (const [garbled, correct] of Object.entries(characterMap)) {
    const regex = new RegExp(garbled, 'g');
    fixedText = fixedText.replace(regex, correct);
  }

  return fixedText;
}
