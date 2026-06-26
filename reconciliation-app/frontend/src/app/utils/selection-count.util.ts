/** Index valeur → nombre de lignes pour les popups de sélection (pays, agences, services…). */
export interface ColumnValueIndex {
  values: string[];
  counts: Map<string, number>;
}

export function columnValueCountsToRecord(counts: Map<string, number>): Record<string, number> {
  const record: Record<string, number> = {};
  counts.forEach((count, key) => {
    record[key] = count;
  });
  return record;
}

/** Parcourt les données une seule fois : valeurs uniques triées + effectifs par valeur. */
export function buildColumnValueIndex(
  data: Record<string, string>[],
  column: string,
  normalize: (raw: string) => string = (raw) => raw.trim()
): ColumnValueIndex {
  const counts = new Map<string, number>();
  for (let i = 0; i < data.length; i++) {
    const raw = data[i][column];
    if (raw === undefined || raw === null) {
      continue;
    }
    const key = normalize(String(raw));
    if (!key) {
      continue;
    }
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return { values: [...counts.keys()].sort(), counts };
}

/** Version non bloquante pour gros fichiers TRXBO. */
export async function buildColumnValueIndexAsync(
  data: Record<string, string>[],
  column: string,
  yieldFn: () => Promise<void>,
  batchSize = 8000,
  normalize: (raw: string) => string = (raw) => raw.trim()
): Promise<ColumnValueIndex> {
  if (data.length <= batchSize) {
    return buildColumnValueIndex(data, column, normalize);
  }

  const counts = new Map<string, number>();
  for (let start = 0; start < data.length; start += batchSize) {
    const end = Math.min(start + batchSize, data.length);
    for (let i = start; i < end; i++) {
      const raw = data[i][column];
      if (raw === undefined || raw === null) {
        continue;
      }
      const key = normalize(String(raw));
      if (!key) {
        continue;
      }
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    await yieldFn();
  }
  return { values: [...counts.keys()].sort(), counts };
}
