import { Injectable } from '@angular/core';
import {
  AutoProcessingModel,
  ColumnProcessingRule,
  ModelFormatAction,
  ModelPreProcessingConfig,
  ModelRowFilter,
  ModelColumnValueMapping,
  ModelColumnConcatRule,
  ModelColumnRenameRule,
  matchesConditionValues,
  parseConditionValues
} from './auto-processing.service';
import { buildConcatenatedValue } from '../utils/concat.util';
import {
  normalizeColumnKey,
  renameKeyPreservingOrder,
  resolveColumnKeyInRow,
  resolveCanonicalColumnKeysInRow
} from '../utils/row-column.util';
import { fixCellEncoding, fixCellEncodingIfNeeded } from '../utils/encoding-fixer';

interface PrecomputedFormatTarget {
  keys: readonly string[];
  action: ModelFormatAction;
  conditionColumnKey: string | null;
  expectedValues: ReadonlySet<string> | null;
}

@Injectable({
  providedIn: 'root'
})
export class ModelPreProcessingService {

  async applyPreProcessingAsync(
    rows: Record<string, string>[],
    config?: ModelPreProcessingConfig | null,
    options?: {
      batchSize?: number;
      onProgress?: (message: string, done: number, total: number) => void | Promise<void>;
      yieldFn?: () => Promise<void>;
    }
  ): Promise<Record<string, string>[]> {
    if (!config || !rows?.length) {
      return rows;
    }

    const batchSize = options?.batchSize ?? (rows.length > 100000 ? 10000 : 5000);
    let result = rows;

    if (config.rowFilters?.length) {
      await options?.onProgress?.('Filtres du modèle...', 0, result.length);
      await options?.yieldFn?.();
      result = await this.applyRowFiltersAsync(result, config.rowFilters, batchSize, options);
    }

    if (config.formatActions?.length) {
      result = await this.applyFormatActionsAsync(result, config.formatActions, batchSize, options);
    }

    if (config.columnConcatRules?.length) {
      result = await this.mapRowsBatched(
        result,
        batchSize,
        row => this.applyColumnConcatRulesToRow(row, config.columnConcatRules!),
        'Concaténation du modèle...',
        options
      );
    }

    if (config.valueMappings?.length) {
      result = await this.mapRowsBatched(
        result,
        batchSize,
        row => this.applyValueMappingsToRow(row, config.valueMappings!),
        'Renommage des valeurs...',
        options
      );
    }

    if (config.columnRenameRules?.length) {
      result = await this.mapRowsBatched(
        result,
        batchSize,
        row => this.applyColumnRenameRulesToRow(row, config.columnRenameRules!),
        'Renommage des en-têtes...',
        options
      );
    }

    return result;
  }

  private async mapRowsBatched(
    rows: Record<string, string>[],
    batchSize: number,
    mapRow: (row: Record<string, string>) => Record<string, string>,
    message: string,
    options?: {
      onProgress?: (message: string, done: number, total: number) => void | Promise<void>;
      yieldFn?: () => Promise<void>;
    }
  ): Promise<Record<string, string>[]> {
    if (!rows.length) {
      return rows;
    }

    const effectiveBatch = rows.length > 50000 ? batchSize : Math.min(batchSize, 500);
    for (let start = 0; start < rows.length; start += effectiveBatch) {
      await options?.onProgress?.(message, start, rows.length);
      await options?.yieldFn?.();
      const end = Math.min(start + effectiveBatch, rows.length);
      for (let i = start; i < end; i++) {
        const updated = mapRow(rows[i]);
        if (updated !== rows[i]) {
          rows[i] = updated;
        }
      }
      await options?.onProgress?.(message, end, rows.length);
      await options?.yieldFn?.();
    }
    return rows;
  }

  private async applyFormatActionsAsync(
    rows: Record<string, string>[],
    actions: ModelFormatAction[],
    batchSize: number,
    options?: {
      onProgress?: (message: string, done: number, total: number) => void | Promise<void>;
      yieldFn?: () => Promise<void>;
    }
  ): Promise<Record<string, string>[]> {
    const enabledActions = actions.filter(action => action.enabled && action.columns?.length);
    if (!enabledActions.length) {
      return rows;
    }

    const orderedActions = [...enabledActions].sort(
      (a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER)
    );

    const plan = this.buildFormatActionPlan(rows[0], orderedActions);
    if (!plan.length) {
      return rows;
    }

    const macroBatch = rows.length > 50000 ? batchSize : Math.min(batchSize, 200);
    const microBatch = rows.length > 50000 ? 200 : 50;
    const progressMessage = 'Formatage du modèle...';

    for (let start = 0; start < rows.length; start += macroBatch) {
      const macroEnd = Math.min(start + macroBatch, rows.length);
      for (let micro = start; micro < macroEnd; micro += microBatch) {
        const microEnd = Math.min(micro + microBatch, macroEnd);
        await options?.onProgress?.(progressMessage, micro, rows.length);
        await options?.yieldFn?.();
        this.applyFormatPlanToRows(rows, plan, micro, microEnd);
        await options?.onProgress?.(progressMessage, microEnd, rows.length);
        await options?.yieldFn?.();
      }
    }

    return rows;
  }

  private buildFormatActionPlan(
    sampleRow: Record<string, string>,
    orderedActions: ModelFormatAction[]
  ): PrecomputedFormatTarget[] {
    const targets: PrecomputedFormatTarget[] = [];

    for (const action of orderedActions) {
      for (const column of action.columns) {
        const keys = resolveCanonicalColumnKeysInRow(sampleRow, column);
        if (!keys.length) {
          continue;
        }

        const merged = this.mergeFormatActionForColumn(action, column);
        const columnSettings = this.findFormatColumnSettings(action, column);
        let conditionColumnKey: string | null = null;
        let expectedValues: ReadonlySet<string> | null = null;

        if (columnSettings?.applyConditionEnabled === true) {
          const conditionColumn = (columnSettings.conditionColumn ?? '').trim();
          if (conditionColumn) {
            conditionColumnKey = resolveColumnKeyInRow(sampleRow, conditionColumn);
            const parsed = parseConditionValues(columnSettings.conditionValue);
            expectedValues = parsed.length ? new Set(parsed) : null;
          }
        } else if (action.applyConditionEnabled) {
          const conditionColumn = (action.conditionColumn ?? '').trim();
          if (conditionColumn) {
            conditionColumnKey = resolveColumnKeyInRow(sampleRow, conditionColumn);
            const parsed = parseConditionValues(action.conditionValue);
            expectedValues = parsed.length ? new Set(parsed) : null;
          }
        }

        targets.push({
          keys,
          action: merged,
          conditionColumnKey,
          expectedValues
        });
      }
    }

    return targets;
  }

  private applyFormatPlanToRows(
    rows: Record<string, string>[],
    plan: PrecomputedFormatTarget[],
    start: number,
    end: number
  ): void {
    for (let i = start; i < end; i++) {
      const row = rows[i];
      for (const target of plan) {
        if (target.conditionColumnKey && target.expectedValues?.size) {
          const conditionValue = String(row[target.conditionColumnKey] ?? '').trim();
          if (!target.expectedValues.has(conditionValue)) {
            continue;
          }
        }

        const primaryKey = target.keys[0];
        const rawValue = row[primaryKey];
        if (rawValue === undefined || rawValue === null) {
          continue;
        }

        const formattedValue = this.applyFormatActionToValue(
          this.coerceFormatCellValueFast(rawValue),
          target.action
        );

        for (const key of target.keys) {
          row[key] = formattedValue;
        }
      }
    }
  }

  private applyFormatActionsToRow(
    row: Record<string, string>,
    orderedActions: ModelFormatAction[]
  ): Record<string, string> {
    for (const action of orderedActions) {
      for (const column of action.columns) {
        const merged = this.mergeFormatActionForColumn(action, column);
        if (!this.isFormatActionConditionMet(row, action, column)) {
          continue;
        }

        const key = resolveColumnKeyInRow(row, column);
        if (!key) {
          continue;
        }

        const rawValue = row[key];
        if (rawValue === undefined || rawValue === null) {
          continue;
        }

        const formattedValue = this.applyFormatActionToValue(
          this.coerceFormatCellValue(rawValue),
          merged
        );

        for (const aliasKey of resolveCanonicalColumnKeysInRow(row, column)) {
          row[aliasKey] = formattedValue;
        }
      }
    }

    return row;
  }

  private applyColumnConcatRulesToRow(
    row: Record<string, string>,
    rules: ModelColumnConcatRule[]
  ): Record<string, string> {
    const activeRules = this.getActiveColumnConcatRules(rules);
    if (!activeRules.length) {
      return row;
    }

    const newRow = row;
    for (const rule of activeRules) {
      newRow[rule.targetColumn] = buildConcatenatedValue(
        rule.sourceColumns.map(column => newRow[column]),
        rule.separator ?? ''
      );
    }
    return newRow;
  }

  private applyValueMappingsToRow(
    row: Record<string, string>,
    mappings: ModelColumnValueMapping[]
  ): Record<string, string> {
    const activeMappings = this.getActiveValueMappings(mappings);
    if (!activeMappings.length) {
      return row;
    }

    for (const mapping of activeMappings) {
      const key = resolveColumnKeyInRow(row, mapping.column);
      if (!key || row[key] === undefined || row[key] === null) {
        continue;
      }
      const currentValue = String(row[key]);
      if (currentValue === mapping.fromValue) {
        row[key] = mapping.toValue;
      }
    }
    return row;
  }

  private applyColumnRenameRulesToRow(
    row: Record<string, string>,
    rules: ModelColumnRenameRule[]
  ): Record<string, string> {
    const activeRules = this.getActiveColumnRenameRules(rules);
    if (!activeRules.length) {
      return row;
    }

    let newRow = { ...row };
    for (const rule of activeRules) {
      const targetColumn = rule.targetColumn?.trim();
      if (!rule.sourceColumn || !targetColumn) {
        continue;
      }
      const sourceKey = resolveColumnKeyInRow(newRow, rule.sourceColumn);
      if (!sourceKey || sourceKey === targetColumn) {
        continue;
      }
      newRow = renameKeyPreservingOrder(newRow, sourceKey, targetColumn);
    }
    return newRow;
  }

  applyPreProcessing(
    rows: Record<string, string>[],
    config?: ModelPreProcessingConfig | null
  ): Record<string, string>[] {
    if (!config || !rows?.length) {
      return rows;
    }

    let result = rows.map(row => ({ ...row }));

    if (config.rowFilters?.length) {
      result = this.applyRowFilters(result, config.rowFilters);
    }

    if (config.formatActions?.length) {
      result = this.applyFormatActions(result, config.formatActions);
    }

    if (config.columnConcatRules?.length) {
      result = this.applyColumnConcatRules(result, config.columnConcatRules);
    }

    if (config.valueMappings?.length) {
      result = this.applyValueMappings(result, config.valueMappings);
    }

    if (config.columnRenameRules?.length) {
      result = this.applyColumnRenameRules(result, config.columnRenameRules);
    }

    return result;
  }

  applyRowFilters(
    rows: Record<string, string>[],
    filters: ModelRowFilter[]
  ): Record<string, string>[] {
    if (!filters.length) {
      return rows;
    }

    let filtered = [...rows];

    for (const filter of filters) {
      if (!filter.enabled || !filter.column || !filter.selectedValues?.length) {
        continue;
      }

      if (filter.selectedValues.includes('__TOUS__')) {
        continue;
      }

      filtered = filtered.filter(row => {
        const key = resolveColumnKeyInRow(row, filter.column);
        if (!key) {
          return false;
        }
        return filter.selectedValues.includes(String(row[key] ?? ''));
      });
    }

    return filtered;
  }

  private async applyRowFiltersAsync(
    rows: Record<string, string>[],
    filters: ModelRowFilter[],
    batchSize: number,
    options?: {
      onProgress?: (message: string, done: number, total: number) => void | Promise<void>;
      yieldFn?: () => Promise<void>;
    }
  ): Promise<Record<string, string>[]> {
    if (!filters.length || !rows.length) {
      return rows;
    }

    let filtered = rows;
    for (const filter of filters) {
      if (!filter.enabled || !filter.column || !filter.selectedValues?.length) {
        continue;
      }
      if (filter.selectedValues.includes('__TOUS__')) {
        continue;
      }

      const next: Record<string, string>[] = [];
      for (let start = 0; start < filtered.length; start += batchSize) {
        const end = Math.min(start + batchSize, filtered.length);
        for (let i = start; i < end; i++) {
          const row = filtered[i];
          const key = resolveColumnKeyInRow(row, filter.column);
          if (key && filter.selectedValues.includes(String(row[key] ?? ''))) {
            next.push(row);
          }
        }
        await options?.onProgress?.('Filtres du modèle...', end, filtered.length);
        await options?.yieldFn?.();
      }
      filtered = next;
    }

    return filtered;
  }

  applyFormatActions(
    rows: Record<string, string>[],
    actions: ModelFormatAction[]
  ): Record<string, string>[] {
    const enabledActions = actions.filter(action => action.enabled && action.columns?.length);
    if (!enabledActions.length) {
      return rows;
    }

    const orderedActions = [...enabledActions].sort(
      (a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER)
    );

    const plan = this.buildFormatActionPlan(rows[0], orderedActions);
    if (!plan.length) {
      return rows;
    }

    for (let i = 0; i < rows.length; i++) {
      this.applyFormatPlanToRows(rows, plan, i, i + 1);
    }

    return rows;
  }

  applyColumnConcatRules(
    rows: Record<string, string>[],
    rules: ModelColumnConcatRule[]
  ): Record<string, string>[] {
    const activeRules = this.getActiveColumnConcatRules(rules);
    if (!activeRules.length) {
      return rows;
    }

    return rows.map(row => this.applyColumnConcatRulesToRow(row, rules));
  }

  applyColumnRenameRules(
    rows: Record<string, string>[],
    rules: ModelColumnRenameRule[]
  ): Record<string, string>[] {
    const activeRules = this.getActiveColumnRenameRules(rules);
    if (!activeRules.length) {
      return rows;
    }

    return rows.map(row => this.applyColumnRenameRulesToRow(row, rules));
  }

  applyValueMappings(
    rows: Record<string, string>[],
    mappings: ModelColumnValueMapping[]
  ): Record<string, string>[] {
    const activeMappings = this.getActiveValueMappings(mappings);
    if (!activeMappings.length) {
      return rows;
    }

    return rows.map(row => this.applyValueMappingsToRow(row, mappings));
  }

  private mergeFormatActionForColumn(action: ModelFormatAction, column: string): ModelFormatAction {
    const overrides = this.findFormatColumnSettings(action, column);
    if (!overrides) {
      return action;
    }
    return {
      ...action,
      ...overrides,
      type: action.type,
      enabled: action.enabled,
      columns: action.columns,
      order: action.order,
      columnSettings: action.columnSettings
    };
  }

  private findFormatColumnSettings(
    action: ModelFormatAction,
    column: string
  ): ModelFormatAction['columnSettings'] extends Record<string, infer S> ? S | undefined : undefined {
    if (!action.columnSettings) {
      return undefined;
    }
    if (action.columnSettings[column]) {
      return action.columnSettings[column];
    }
    const targetKey = this.normalizeColumnKey(column);
    for (const [key, settings] of Object.entries(action.columnSettings)) {
      if (this.normalizeColumnKey(key) === targetKey) {
        return settings;
      }
    }
    return undefined;
  }

  /** Vérifie la condition optionnelle (action ou colonne) avant d'appliquer le formatage. */
  private isFormatActionConditionMet(
    row: Record<string, string>,
    action: ModelFormatAction,
    targetColumn: string
  ): boolean {
    const columnSettings = this.findFormatColumnSettings(action, targetColumn);

    let conditionColumn = '';
    let conditionValue = '';

    if (columnSettings?.applyConditionEnabled === true) {
      conditionColumn = (columnSettings.conditionColumn ?? '').trim();
      conditionValue = String(columnSettings.conditionValue ?? '').trim();
    } else if (action.applyConditionEnabled) {
      conditionColumn = (action.conditionColumn ?? '').trim();
      conditionValue = String(action.conditionValue ?? '').trim();
    } else {
      return true;
    }

    if (!conditionColumn) {
      return true;
    }

    const key = resolveColumnKeyInRow(row, conditionColumn);
    if (!key) {
      return false;
    }

    return matchesConditionValues(String(row[key] ?? ''), conditionValue);
  }

  private coerceFormatCellValueFast(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        return '';
      }
      return String(value);
    }

    const asString = String(value);
    if (!/Ã.|Â.|ï¿½|\uFFFD/.test(asString)) {
      return asString.trim();
    }

    return fixCellEncodingIfNeeded(asString).trim();
  }

  private coerceFormatCellValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        return '';
      }
      return String(value);
    }
    return fixCellEncodingIfNeeded(String(value)).trim();
  }

  private applyFormatActionToValue(value: string, action: ModelFormatAction): string {
    if (!value.length) {
      return value;
    }

    switch (action.type) {
      case 'removeSpecialStrings':
        return this.applyRemoveSpecialString(value, action);
      case 'removeCharacters':
        return this.applyRemoveCharacters(value, action);
      case 'removeNumbers':
        return value.replace(/\d/g, '');
      case 'removeIndicatif':
        return this.applyRemoveIndicatif(value, action);
      case 'removeDecimals':
        return this.applyRemoveDecimals(value, action);
      case 'keepLastDigits':
        return this.applyKeepLastDigits(value, action);
      case 'removeZeroDecimals':
        return value.endsWith('.0') ? value.slice(0, -2) : value;
      case 'removeSpaces':
        return this.applyRemoveSpaces(value, action);
      default:
        return value;
    }
  }

  private applyRemoveSpecialString(value: string, action: ModelFormatAction): string {
    const target = action.specialStringToRemove ?? '';
    if (!target) {
      return value;
    }

    switch (action.specialStringRemovalMode ?? 'all') {
      case 'start':
        return value.startsWith(target) ? value.substring(target.length) : value;
      case 'end':
        return value.endsWith(target) ? value.substring(0, value.length - target.length) : value;
      case 'all':
      default:
        return value.split(target).join('');
    }
  }

  private applyRemoveCharacters(value: string, action: ModelFormatAction): string {
    const mode = action.removeCharMode ?? 'remove';
    const position = action.removeCharPosition ?? 'start';
    const count = action.removeCharCount ?? 1;
    const specificPosition = action.removeCharSpecificPosition ?? 1;

    if (mode === 'keep') {
      switch (position) {
        case 'start':
          return value.substring(0, count);
        case 'end':
          return value.substring(Math.max(0, value.length - count));
        default:
          return value;
      }
    }

    switch (position) {
      case 'start':
        return value.length >= count ? value.substring(count) : value;
      case 'end':
        return value.length >= count ? value.substring(0, value.length - count) : value;
      case 'specific': {
        const pos = specificPosition - 1;
        if (pos >= 0 && pos < value.length && pos + count <= value.length) {
          return value.substring(0, pos) + value.substring(pos + count);
        }
        return value;
      }
      default:
        return value;
    }
  }

  private applyRemoveIndicatif(value: string, action: ModelFormatAction): string {
    const trimmed = value.trim();
    const type = action.indicatifType ?? 'international';

    switch (type) {
      case 'international': {
        const internationalPattern = /^\+(\d{1,4})\s*/;
        return internationalPattern.test(trimmed)
          ? trimmed.replace(internationalPattern, '')
          : trimmed;
      }
      case 'national': {
        const nationalPattern = /^0\d\s*\d{2}\s*\d{2}\s*\d{2}\s*\d{2}$/;
        if (nationalPattern.test(trimmed.replace(/\s/g, ''))) {
          const cleanNumber = trimmed.replace(/\s/g, '').substring(1);
          return cleanNumber.replace(/(\d{2})(?=\d)/g, '$1 ');
        }
        return trimmed;
      }
      case 'custom': {
        const custom = action.customIndicatif ?? '';
        return custom && trimmed.startsWith(custom)
          ? trimmed.substring(custom.length).trim()
          : trimmed;
      }
      default:
        return trimmed;
    }
  }

  private applyRemoveDecimals(value: string, action: ModelFormatAction): string {
    const trimmed = value.trim();
    if (!trimmed) {
      return value;
    }

    const keepTrailingZeros = action.keepTrailingZeros ?? false;
    const preferredSeparator = action.decimalSeparator ?? ',';
    const sign = trimmed.startsWith('-') ? '-' : trimmed.startsWith('+') ? '+' : '';
    const unsigned = sign ? trimmed.slice(1).trim() : trimmed;

    const stripDecimalPart = (integerPart: string, decimalPart: string): string | null => {
      if (keepTrailingZeros && !/^0+$/.test(decimalPart)) {
        return null;
      }
      return integerPart;
    };

    const tryFrench = (input: string): string | null => {
      const match = input.match(/^([\d\s]+)\s*,\s*(\d+)\s*$/);
      if (!match) {
        return null;
      }
      const result = stripDecimalPart(match[1].replace(/\s/g, ''), match[2]);
      return result;
    };

    const tryEnglish = (input: string): string | null => {
      const match = input.match(/^([\d,]+)\s*\.\s*(\d+)\s*$/);
      if (!match) {
        return null;
      }
      const result = stripDecimalPart(match[1].replace(/,/g, ''), match[2]);
      return result;
    };

    const tryPlainDot = (input: string): string | null => {
      const match = input.match(/^(\d+)\.(\d+)$/);
      if (!match) {
        return null;
      }
      return stripDecimalPart(match[1], match[2]);
    };

    const tryPlainComma = (input: string): string | null => {
      const match = input.match(/^(\d+),(\d+)$/);
      if (!match) {
        return null;
      }
      return stripDecimalPart(match[1], match[2]);
    };

    const attempts = preferredSeparator === '.'
      ? [tryEnglish, tryPlainDot, tryFrench, tryPlainComma]
      : [tryFrench, tryPlainComma, tryEnglish, tryPlainDot];

    for (const attempt of attempts) {
      const result = attempt(unsigned);
      if (result !== null) {
        return `${sign}${result}`;
      }
    }

    return trimmed;
  }

  private applyKeepLastDigits(value: string, action: ModelFormatAction): string {
    const count = action.keepLastDigitsCount ?? 3;
    const trimmed = value.trim();
    const digitsOnly = trimmed.replace(/\D/g, '');

    if (!digitsOnly.length) {
      return trimmed;
    }

    if (digitsOnly.length >= count) {
      return digitsOnly.slice(-count);
    }

    return digitsOnly;
  }

  private applyRemoveSpaces(value: string, action: ModelFormatAction): string {
    switch (action.removeSpacesType ?? 'all') {
      case 'leading':
        return value.replace(/^\s+/, '');
      case 'trailing':
        return value.replace(/\s+$/, '');
      case 'multiple':
        return value.replace(/\s+/g, ' ');
      case 'all':
      default:
        return value.replace(/\s/g, '');
    }
  }

  hasPreProcessing(config?: ModelPreProcessingConfig | null): boolean {
    if (!config) {
      return false;
    }

    return this.getActiveFilters(config).length > 0
      || this.getActiveFormatActions(config).length > 0
      || this.getActiveColumnConcatRules(config?.columnConcatRules).length > 0
      || this.getActiveValueMappings(config?.valueMappings).length > 0
      || this.getActiveColumnRenameRules(config?.columnRenameRules).length > 0;
  }

  /** Colonnes référencées par la config pré-traitement (filtres, formatage, etc.). */
  collectReferencedColumns(config?: ModelPreProcessingConfig | null): string[] {
    const columns = new Set<string>();

    for (const filter of this.getActiveFilters(config)) {
      if (filter.column) {
        columns.add(filter.column);
      }
    }

    for (const action of this.getActiveFormatActions(config)) {
      action.columns?.forEach(column => columns.add(column));
      if (action.conditionColumn) {
        columns.add(action.conditionColumn);
      }
      Object.values(action.columnSettings ?? {}).forEach(settings => {
        if (settings.conditionColumn) {
          columns.add(settings.conditionColumn);
        }
      });
    }

    for (const rule of this.getActiveColumnConcatRules(config?.columnConcatRules)) {
      rule.sourceColumns?.forEach(column => columns.add(column));
      if (rule.targetColumn) {
        columns.add(rule.targetColumn);
      }
    }

    for (const mapping of this.getActiveValueMappings(config?.valueMappings)) {
      if (mapping.column) {
        columns.add(mapping.column);
      }
    }

    for (const rule of this.getActiveColumnRenameRules(config?.columnRenameRules)) {
      if (rule.sourceColumn) {
        columns.add(rule.sourceColumn);
      }
      if (rule.targetColumn) {
        columns.add(rule.targetColumn);
      }
    }

    return Array.from(columns);
  }

  /**
   * Colonnes sources requises avant traitement (exclut les cibles créées par renommage / concaténation).
   */
  collectInputColumns(config?: ModelPreProcessingConfig | null): string[] {
    const columns = new Set<string>();

    for (const filter of this.getActiveFilters(config)) {
      if (filter.column) {
        columns.add(filter.column);
      }
    }

    for (const action of this.getActiveFormatActions(config)) {
      action.columns?.forEach(column => columns.add(column));
      if (action.conditionColumn) {
        columns.add(action.conditionColumn);
      }
      Object.values(action.columnSettings ?? {}).forEach(settings => {
        if (settings.conditionColumn) {
          columns.add(settings.conditionColumn);
        }
      });
    }

    for (const rule of this.getActiveColumnConcatRules(config?.columnConcatRules)) {
      rule.sourceColumns?.forEach(column => columns.add(column));
    }

    for (const mapping of this.getActiveValueMappings(config?.valueMappings)) {
      if (mapping.column) {
        columns.add(mapping.column);
      }
    }

    for (const rule of this.getActiveColumnRenameRules(config?.columnRenameRules)) {
      if (rule.sourceColumn) {
        columns.add(rule.sourceColumn);
      }
    }

    return Array.from(columns);
  }

  getActiveFilters(config?: ModelPreProcessingConfig | null): ModelRowFilter[] {
    return (config?.rowFilters ?? []).filter(
      filter => filter.enabled && filter.column && filter.selectedValues?.length
    );
  }

  getActiveFormatActions(config?: ModelPreProcessingConfig | null): ModelFormatAction[] {
    return (config?.formatActions ?? []).filter(
      action => action.enabled && action.columns?.length
    );
  }

  getActiveValueMappings(mappings?: ModelColumnValueMapping[] | null): ModelColumnValueMapping[] {
    return (mappings ?? []).filter(
      mapping => mapping.enabled
        && !!mapping.column
        && mapping.fromValue !== undefined
        && mapping.fromValue !== null
        && String(mapping.fromValue).length > 0
    );
  }

  getActiveColumnConcatRules(rules?: ModelColumnConcatRule[] | null): ModelColumnConcatRule[] {
    return (rules ?? []).filter(
      rule => rule.enabled
        && !!rule.targetColumn?.trim()
        && rule.sourceColumns?.length >= 2
    );
  }

  getActiveColumnRenameRules(rules?: ModelColumnRenameRule[] | null): ModelColumnRenameRule[] {
    return (rules ?? []).filter(
      rule => rule.enabled
        && !!rule.sourceColumn
        && !!rule.targetColumn?.trim()
        && rule.sourceColumn !== rule.targetColumn.trim()
    );
  }

  getPreProcessingSummary(config?: ModelPreProcessingConfig | null): {
    activeFilterCount: number;
    activeFormatCount: number;
    activeConcatCount: number;
    activeValueMappingCount: number;
    activeColumnRenameCount: number;
    summaryText: string;
    detailText: string;
  } {
    const filters = this.getActiveFilters(config);
    const formats = this.getActiveFormatActions(config);
    const concatRules = this.getActiveColumnConcatRules(config?.columnConcatRules);
    const valueMappings = this.getActiveValueMappings(config?.valueMappings);
    const columnRenameRules = this.getActiveColumnRenameRules(config?.columnRenameRules);
    const parts: string[] = [];

    if (filters.length) {
      parts.push(`${filters.length} filtre(s) de lignes`);
    }
    if (formats.length) {
      parts.push(`${formats.length} action(s) de formatage`);
    }
    if (concatRules.length) {
      parts.push(`${concatRules.length} concaténation(s) de colonnes`);
    }
    if (valueMappings.length) {
      parts.push(`${valueMappings.length} renommage(s) de valeurs`);
    }
    if (columnRenameRules.length) {
      parts.push(`${columnRenameRules.length} renommage(s) d'en-têtes`);
    }

    const detailLines: string[] = [];
    filters.forEach(filter => {
      detailLines.push(`• Filtre : ${filter.column} → ${filter.selectedValues.join(', ')}`);
    });
    formats.forEach(action => {
      detailLines.push(`• Format : ${this.describeFormatAction(action)}`);
    });
    concatRules.forEach(rule => {
      const separatorLabel = rule.separator === ' '
        ? 'espace'
        : `« ${rule.separator} »`;
      detailLines.push(
        `• Concaténation : ${rule.sourceColumns.join(' + ')} → ${rule.targetColumn} (séparateur ${separatorLabel})`
      );
    });
    valueMappings.forEach(mapping => {
      detailLines.push(`• Renommage : ${mapping.column} — « ${mapping.fromValue} » → « ${mapping.toValue} »`);
    });
    columnRenameRules.forEach(rule => {
      detailLines.push(`• En-tête : ${rule.sourceColumn} → ${rule.targetColumn}`);
    });

    return {
      activeFilterCount: filters.length,
      activeFormatCount: formats.length,
      activeConcatCount: concatRules.length,
      activeValueMappingCount: valueMappings.length,
      activeColumnRenameCount: columnRenameRules.length,
      summaryText: parts.length ? parts.join(' + ') : '',
      detailText: detailLines.join('\n')
    };
  }

  buildApplicationResult(
    rowsBefore: number,
    rowsAfter: number,
    config?: ModelPreProcessingConfig | null
  ): string {
    const summary = this.getPreProcessingSummary(config);
    if (!summary.summaryText) {
      return '';
    }

    const removed = rowsBefore - rowsAfter;
    const filterInfo = removed > 0
      ? `${removed} ligne(s) exclue(s) par les filtres`
      : 'aucune ligne exclue par les filtres';

    return `${summary.summaryText} appliqués (${filterInfo}).\n${summary.detailText}`;
  }

  private describeFormatAction(action: ModelFormatAction): string {
    const columns = action.columns.join(', ');
    const conditionSuffix = this.describeFormatActionCondition(action);

    switch (action.type) {
      case 'removeSpecialStrings':
        return `${columns} — supprimer « ${action.specialStringToRemove ?? ''} » (${action.specialStringRemovalMode ?? 'all'})${conditionSuffix}`;
      case 'removeCharacters': {
        const mode = action.removeCharMode === 'keep' ? 'conserver' : 'supprimer';
        const position = action.removeCharPosition === 'end'
          ? 'fin'
          : action.removeCharPosition === 'specific'
            ? `position ${action.removeCharSpecificPosition ?? 1}`
            : 'début';
        return `${columns} — ${mode} ${action.removeCharCount ?? 1} caractère(s) depuis la ${position}${conditionSuffix}`;
      }
      case 'removeNumbers':
        return `${columns} — supprimer les chiffres${conditionSuffix}`;
      case 'removeIndicatif':
        return `${columns} — supprimer indicatif (${action.indicatifType ?? 'international'})${conditionSuffix}`;
      case 'removeDecimals':
        return `${columns} — supprimer décimales (séparateur ${action.decimalSeparator ?? ','})${conditionSuffix}`;
      case 'keepLastDigits':
        return `${columns} — garder ${action.keepLastDigitsCount ?? 3} derniers chiffres${conditionSuffix}`;
      case 'removeZeroDecimals':
        return `${columns} — supprimer .0 en fin de valeur${conditionSuffix}`;
      case 'removeSpaces':
        return `${columns} — supprimer espaces (${action.removeSpacesType ?? 'all'})${conditionSuffix}`;
      default:
        return `${columns}${conditionSuffix}`;
    }
  }

  private describeFormatActionCondition(action: ModelFormatAction): string {
    if (!action.applyConditionEnabled || !action.conditionColumn?.trim()) {
      return '';
    }
    const values = (action.conditionValue ?? '').trim();
    return values.includes(',')
      ? ` [si ${action.conditionColumn} ∈ { ${values} }]`
      : ` [si ${action.conditionColumn} = « ${values} »]`;
  }

  /** Colonnes nécessaires en entrée / conservées en sortie pour le mode assisté. */
  buildAssistedColumnPlan(
    model: AutoProcessingModel,
    columnRules: ColumnProcessingRule[]
  ): { inputColumns: string[]; outputColumns: string[] } {
    const input = new Set<string>();
    const output: string[] = [];
    const outputSeen = new Set<string>();

    const addInput = (col?: string | null) => {
      const trimmed = (col || '').trim();
      if (trimmed) {
        input.add(trimmed);
      }
    };

    const addOutput = (col?: string | null) => {
      const trimmed = (col || '').trim();
      if (trimmed && !outputSeen.has(trimmed)) {
        outputSeen.add(trimmed);
        output.push(trimmed);
      }
    };

    const sortedRules = [...(columnRules || [])].sort(
      (a, b) => (a.ruleOrder ?? 0) - (b.ruleOrder ?? 0)
    );

    for (const rule of sortedRules) {
      addInput(rule.sourceColumn);
      if (rule.targetColumn?.trim()) {
        addOutput(rule.targetColumn.trim());
      } else {
        addOutput(rule.sourceColumn);
      }
    }

    const cfg = model.preProcessingConfig;
    if (cfg) {
      for (const filter of this.getActiveFilters(cfg)) {
        addInput(filter.column);
        addOutput(filter.column);
      }
      for (const action of this.getActiveFormatActions(cfg)) {
        for (const column of action.columns || []) {
          addInput(column);
          addOutput(column);
        }
        if (action.applyConditionEnabled && action.conditionColumn?.trim()) {
          addInput(action.conditionColumn.trim());
        }
        if (action.columnSettings) {
          for (const settings of Object.values(action.columnSettings)) {
            if (settings.applyConditionEnabled && settings.conditionColumn?.trim()) {
              addInput(settings.conditionColumn.trim());
            }
          }
        }
      }
      for (const rule of this.getActiveColumnConcatRules(cfg.columnConcatRules)) {
        for (const column of rule.sourceColumns || []) {
          addInput(column);
        }
        addOutput(rule.targetColumn);
      }
      for (const mapping of this.getActiveValueMappings(cfg.valueMappings)) {
        addInput(mapping.column);
        addOutput(mapping.column);
      }
    }

    const outputColumns = this.applyRenameRulesToOutputColumns(
      output,
      this.getActiveColumnRenameRules(cfg?.columnRenameRules)
    );

    return {
      inputColumns: [...input],
      outputColumns
    };
  }

  mergeOutputColumns(primary: string[], secondary: string[] = []): string[] {
    const merged: string[] = [];
    const seen = new Set<string>();
    for (const col of [...primary, ...secondary]) {
      const trimmed = (col || '').trim();
      if (trimmed && !seen.has(trimmed)) {
        seen.add(trimmed);
        merged.push(trimmed);
      }
    }
    return merged;
  }

  private applyRenameRulesToOutputColumns(
    columns: string[],
    renameRules: ModelColumnRenameRule[]
  ): string[] {
    if (!renameRules.length) {
      return [...columns];
    }

    const renameMap = new Map<string, string>();
    for (const rule of renameRules) {
      if (rule.sourceColumn && rule.targetColumn?.trim()) {
        renameMap.set(rule.sourceColumn, rule.targetColumn.trim());
      }
    }

    const seen = new Set<string>();
    const result: string[] = [];
    for (const col of columns) {
      let current = col;
      let guard = 0;
      while (renameMap.has(current) && guard < 10) {
        current = renameMap.get(current)!;
        guard++;
      }
      if (current && !seen.has(current)) {
        seen.add(current);
        result.push(current);
      }
    }
    return result;
  }

  private normalizeColumnKey(columnName: string): string {
    return normalizeColumnKey(columnName);
  }

  private resolveRowColumnValue(row: Record<string, string>, column: string): string {
    const key = resolveColumnKeyInRow(row, column);
    if (key) {
      return row[key] ?? '';
    }
    return '';
  }

  /** Projette les lignes vers les colonnes finales du modèle (avec repli sur colonnes sources). */
  projectRowsToExportColumns(
    rows: Record<string, string>[],
    outputColumns: string[],
    columnRules: ColumnProcessingRule[],
    model?: AutoProcessingModel
  ): Record<string, string>[] {
    if (!rows.length || !outputColumns.length) {
      return rows;
    }

    const aliasesByOutput = this.buildOutputColumnAliases(columnRules, model?.preProcessingConfig);
    const orderedColumns = outputColumns.map(col => col.trim()).filter(Boolean);

    return rows.map(row => {
      const projected: Record<string, string> = {};
      for (const col of orderedColumns) {
        projected[col] = this.resolveRowColumnValueWithAliases(
          row,
          col,
          aliasesByOutput.get(col) || []
        );
      }
      return projected;
    });
  }

  private buildOutputColumnAliases(
    columnRules: ColumnProcessingRule[],
    config?: ModelPreProcessingConfig | null
  ): Map<string, string[]> {
    const map = new Map<string, string[]>();
    const renameRules = this.getActiveColumnRenameRules(config?.columnRenameRules);

    for (const rule of columnRules || []) {
      const source = (rule.sourceColumn || '').trim();
      const target = (rule.targetColumn || '').trim() || source;
      if (!target) {
        continue;
      }

      const aliases = new Set<string>();
      if (source && source !== target) {
        aliases.add(source);
      }

      for (const rename of renameRules) {
        const renameSource = (rename.sourceColumn || '').trim();
        const renameTarget = (rename.targetColumn || '').trim();
        if (!renameSource || !renameTarget) {
          continue;
        }
        if (renameTarget === target) {
          aliases.add(renameSource);
        }
        if (renameSource === target) {
          aliases.add(renameTarget);
        }
        if (renameSource === source) {
          aliases.add(renameTarget);
        }
      }

      if (aliases.size) {
        map.set(target, [...aliases]);
      }
    }

    return map;
  }

  private resolveRowColumnValueWithAliases(
    row: Record<string, string>,
    column: string,
    aliases: string[]
  ): string {
    const direct = this.resolveRowColumnValue(row, column);
    if (direct) {
      return direct;
    }

    for (const alias of aliases) {
      const value = this.resolveRowColumnValue(row, alias);
      if (value) {
        return value;
      }
    }

    return '';
  }

  /** Ne conserve que les colonnes attendues dans le fichier final (toutes présentes, même vides). */
  filterRowsToColumns(
    rows: Record<string, string>[],
    columns: string[]
  ): Record<string, string>[] {
    if (!rows.length || !columns.length) {
      return rows;
    }

    const orderedColumns = columns.map(col => col.trim()).filter(Boolean);
    if (!orderedColumns.length) {
      return rows;
    }

    return rows.map(row => {
      const filtered: Record<string, string> = {};
      for (const col of orderedColumns) {
        filtered[col] = this.resolveRowColumnValue(row, col);
      }
      return filtered;
    });
  }
}
