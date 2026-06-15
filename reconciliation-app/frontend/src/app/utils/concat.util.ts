const WHITESPACE_RE = /[\s\u00A0\u202F\u2007\u2060]+/g;

/**
 * Normalise une valeur avant concaténation : supprime espaces et séparateurs de milliers.
 */
export function normalizeConcatSourceValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'number' && isFinite(value)) {
    if (Number.isInteger(value) || Math.abs(value - Math.round(value)) < 1e-9) {
      return String(Math.round(value));
    }
    return String(value);
  }

  return String(value).replace(WHITESPACE_RE, '');
}

/**
 * Concatène des parties sans aucun espace dans le résultat final.
 */
export function buildConcatenatedValue(parts: unknown[], separator = ''): string {
  const joined = parts
    .map(part => normalizeConcatSourceValue(part))
    .join(separator ?? '');
  return joined.replace(WHITESPACE_RE, '');
}

/**
 * Supprime tous les espaces d'une valeur (utile pour les colonnes clé après traitement).
 */
export function stripAllWhitespace(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).replace(WHITESPACE_RE, '');
}
