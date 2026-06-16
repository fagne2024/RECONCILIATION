import { ColumnProcessingRule } from '../services/auto-processing.service';

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

function findColumnKey(data: Record<string, unknown>, sourceColumn: string): string | null {
  if (Object.prototype.hasOwnProperty.call(data, sourceColumn)) {
    return sourceColumn;
  }

  const normalizedSource = normalizeColumnName(sourceColumn);
  for (const key of Object.keys(data)) {
    if (normalizedSource === normalizeColumnName(key)) {
      return key;
    }
  }

  for (const key of Object.keys(data)) {
    if (key.includes(normalizedSource) || normalizedSource.includes(key)) {
      return key;
    }
  }

  return null;
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
  const processedData: Record<string, string> = { ...row };

  for (const rule of rules) {
    const actualColumnKey = findColumnKey(processedData, rule.sourceColumn);
    if (!actualColumnKey) {
      continue;
    }

    const processedValue = applyRule(processedData[actualColumnKey], rule);
    const targetColumn = rule.targetColumn?.trim();

    if (!targetColumn) {
      processedData[actualColumnKey] = processedValue;
    } else {
      processedData[targetColumn] = processedValue;
    }
  }

  return processedData;
}

export async function applyColumnProcessingRulesAsync(
  data: Record<string, string>[],
  rules: ColumnProcessingRule[],
  batchSize = 2500,
  onProgress?: (processed: number, total: number) => void | Promise<void>
): Promise<Record<string, string>[]> {
  if (!data.length) {
    return [];
  }

  const sortedRules = [...rules].sort((a, b) => (a.ruleOrder ?? 0) - (b.ruleOrder ?? 0));
  const result: Record<string, string>[] = new Array(data.length);

  for (let start = 0; start < data.length; start += batchSize) {
    const end = Math.min(start + batchSize, data.length);
    for (let i = start; i < end; i++) {
      result[i] = applyColumnProcessingRulesToRow(data[i], sortedRules);
    }
    if (onProgress) {
      await onProgress(end, data.length);
    }
  }

  return result;
}
