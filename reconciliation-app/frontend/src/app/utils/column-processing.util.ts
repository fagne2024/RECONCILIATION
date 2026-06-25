import { ColumnProcessingRule } from '../services/auto-processing.service';
import { getOrangeMoneyAliasHeadersForColumn } from './bilingual-column.util';
import { resolveColumnKeyInRow } from './row-column.util';

function findColumnKey(data: Record<string, unknown>, sourceColumn: string): string | null {
  const resolved = resolveColumnKeyInRow(data as Record<string, string>, sourceColumn);
  if (resolved) {
    return resolved;
  }

  for (const alias of getOrangeMoneyAliasHeadersForColumn(sourceColumn)) {
    const aliasKey = resolveColumnKeyInRow(data as Record<string, string>, alias);
    if (aliasKey) {
      return aliasKey;
    }
  }

  const normalizedSource = normalizeColumnName(sourceColumn);
  for (const key of Object.keys(data)) {
    if (key.includes(normalizedSource) || normalizedSource.includes(normalizeColumnName(key))) {
      return key;
    }
  }

  return null;
}

function normalizeColumnName(columnName: string): string {
  if (!columnName) {
    return '';
  }
  let normalized = columnName
    .replace(/Num\?\?ro/g, 'Numéro')
    .replace(/\?\?/g, 'é')
    .replace(/\?/g, '');
  normalized = normalized.normalize('NFD').replace(/\p{M}/gu, '');
  return normalized.trim().toLowerCase().replace(/\s+/g, ' ');
}

function applyFormatType(value: string, formatType?: string): string {
  if (!formatType) {
    return value;
  }
  switch (formatType.toLowerCase()) {
    case 'numeric':
      return value.replace(/[^0-9.-]/g, '');
    case 'boolean':
      return value.toLowerCase() === 'true' ? 'true' : 'false';
    default:
      return value;
  }
}

function applyRule(value: unknown, rule: ColumnProcessingRule): string {
  if (value === null || value === undefined) {
    return '';
  }

  let stringValue = String(value);
  stringValue = applyFormatType(stringValue, rule.formatType);

  if (rule.removeAccents) {
    stringValue = stringValue.normalize('NFD').replace(/\p{M}/gu, '');
  }

  if (rule.stringToRemove?.trim()) {
    const escaped = rule.stringToRemove.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    stringValue = stringValue.replace(new RegExp(escaped, 'g'), '');
  }

  const replacementMap = rule.specialCharReplacementMap;
  if (replacementMap) {
    for (const [from, to] of Object.entries(replacementMap)) {
      stringValue = stringValue.split(from).join(to);
    }
  }

  if (rule.removeSpecialChars) {
    stringValue = stringValue.replace(/[^a-zA-Z0-9\s]/g, '');
  }

  if (rule.toUpperCase) {
    stringValue = stringValue.toUpperCase();
  }
  if (rule.toLowerCase) {
    stringValue = stringValue.toLowerCase();
  }
  if (rule.padZeros && /^\d+$/.test(stringValue)) {
    stringValue = stringValue.padStart(8, '0');
  }

  if (rule.regexReplace?.includes('|')) {
    const [pattern, replacement] = rule.regexReplace.split('|', 2);
    try {
      stringValue = stringValue.replace(new RegExp(pattern, 'g'), replacement);
    } catch {
      // ignore invalid regex
    }
  }

  if (rule.trimSpaces) {
    stringValue = stringValue.trim();
  }

  return stringValue;
}

export function applyColumnProcessingRulesToRow(
  row: Record<string, string>,
  rules: ColumnProcessingRule[]
): Record<string, string> {
  for (const rule of rules) {
    const actualColumnKey = findColumnKey(row, rule.sourceColumn);
    if (!actualColumnKey) {
      continue;
    }

    const processedValue = applyRule(row[actualColumnKey], rule);
    const targetColumn = rule.targetColumn?.trim();

    if (!targetColumn) {
      row[actualColumnKey] = processedValue;
    } else {
      row[targetColumn] = processedValue;
    }
  }

  return row;
}

export async function applyColumnProcessingRulesAsync(
  data: Record<string, string>[],
  rules: ColumnProcessingRule[],
  batchSize = 2500,
  onProgress?: (processed: number, total: number) => void | Promise<void>,
  yieldFn?: () => Promise<void>
): Promise<Record<string, string>[]> {
  if (!data.length) {
    return [];
  }

  const sortedRules = [...rules].sort((a, b) => (a.ruleOrder ?? 0) - (b.ruleOrder ?? 0));
  const effectiveBatch = data.length > 50000 ? batchSize : Math.min(batchSize, 500);

  for (let start = 0; start < data.length; start += effectiveBatch) {
    await onProgress?.(start, data.length);
    await yieldFn?.();
    const end = Math.min(start + effectiveBatch, data.length);
    for (let i = start; i < end; i++) {
      applyColumnProcessingRulesToRow(data[i], sortedRules);
    }
    await onProgress?.(end, data.length);
    await yieldFn?.();
  }

  return data;
}
