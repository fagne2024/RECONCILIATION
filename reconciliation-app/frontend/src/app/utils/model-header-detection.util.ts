/**
 * Détection de la ligne d'en-tête à partir des colonnes attendues
 * (fichier modèle du watch-folder, règles de traitement, etc.).
 */

export function normalizeHeaderLabelForMatch(label: string): string {
  return (label || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[_\s./\\-]+/g, ' ')
    .replace(/[^\w\sàâäéèêëïîôùûüç]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function headerLabelsMatch(cell: string, expected: string): boolean {
  if (!cell || !expected) {
    return false;
  }
  if (cell === expected) {
    return true;
  }
  if (cell.length >= 3 && expected.length >= 3) {
    return cell.includes(expected) || expected.includes(cell);
  }
  return false;
}

/**
 * Score une ligne comme en-tête modèle (0 = pas assez de correspondances).
 */
export function scoreHeaderRowMatch(rowCells: string[], expectedColumns: string[]): number {
  const expected = (expectedColumns || [])
    .map(col => normalizeHeaderLabelForMatch(col))
    .filter(Boolean);
  if (!expected.length) {
    return 0;
  }

  const row = (rowCells || [])
    .map(cell => normalizeHeaderLabelForMatch(String(cell ?? '')))
    .filter(Boolean);
  if (row.length < 2) {
    return 0;
  }

  let matches = 0;
  for (const exp of expected) {
    if (row.some(cell => headerLabelsMatch(cell, exp))) {
      matches++;
    }
  }

  const minMatches = Math.max(2, Math.ceil(expected.length * 0.35));
  if (matches < minMatches) {
    return 0;
  }

  const ratio = matches / expected.length;
  return matches * 100 + ratio * 50;
}

/** Cherche la meilleure ligne d'en-tête dans une grille (CSV / Excel). */
export function findHeaderRowIndexInGrid(
  grid: unknown[][],
  expectedColumns: string[],
  maxScanRows = 80
): number | null {
  if (!grid?.length || !expectedColumns?.length) {
    return null;
  }

  const limit = Math.min(maxScanRows, grid.length);
  let bestIndex: number | null = null;
  let bestScore = 0;

  for (let i = 0; i < limit; i++) {
    const row = grid[i];
    if (!Array.isArray(row) || !row.length) {
      continue;
    }
    const cells = row.map(cell => String(cell ?? '').trim());
    const score = scoreHeaderRowMatch(cells, expectedColumns);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return bestIndex;
}

/** Cherche l'index de la ligne d'en-tête dans des lignes CSV brutes. */
export function findHeaderLineIndexInCsvLines(
  lines: string[],
  delimiter: string,
  expectedColumns: string[],
  maxScanLines = 80
): number | null {
  if (!lines?.length || !expectedColumns?.length) {
    return null;
  }

  const limit = Math.min(maxScanLines, lines.length);
  let bestIndex: number | null = null;
  let bestScore = 0;

  for (let i = 0; i < limit; i++) {
    const line = lines[i];
    if (!line?.trim()) {
      continue;
    }
    const cells = line.split(delimiter).map(cell => cell.trim());
    const score = scoreHeaderRowMatch(cells, expectedColumns);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return bestIndex;
}

/** Indique si une ligne ressemble à un préambule Airtel (User ou Customer report). */
export function looksLikeAirtelReportPreamble(cells: string[]): boolean {
  const lower = cells.join(' ').toLowerCase();
  return (
    lower.includes('user_transaction_report') ||
    lower.includes('user transaction report') ||
    lower.includes('customer_transaction_report') ||
    lower.includes('customer transaction report') ||
    (lower.includes('selection criteria') && (lower.includes('from date') || lower.includes('to date')))
  );
}

/** En-tête transactionnel Airtel (User ou Customer report). */
export function looksLikeAirtelTransactionalHeader(cells: string[]): boolean {
  const lower = cells.join(' ').toLowerCase();
  const hasTransactionId = lower.includes('transaction id') || lower.includes('transaction_id');
  const hasSerialOrSender =
    lower.includes('s. no') ||
    lower.includes('s.no') ||
    lower.includes('record no') ||
    lower.includes('record_no') ||
    lower.includes('sender msisdn') ||
    lower.includes('sender_msisdn') ||
    lower.includes('payer mobile number');
  return hasTransactionId && hasSerialOrSender;
}
