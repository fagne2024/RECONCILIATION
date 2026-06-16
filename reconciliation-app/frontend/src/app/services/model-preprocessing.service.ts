import { Injectable } from '@angular/core';
import {
  AutoProcessingModel,
  ColumnProcessingRule,
  ModelFormatAction,
  ModelPreProcessingConfig,
  ModelRowFilter,
  ModelColumnValueMapping,
  ModelColumnConcatRule,
  ModelColumnRenameRule
} from './auto-processing.service';
import { buildConcatenatedValue } from '../utils/concat.util';

@Injectable({
  providedIn: 'root'
})
export class ModelPreProcessingService {

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

      filtered = filtered.filter(row =>
        filter.selectedValues.includes(String(row[filter.column] ?? ''))
      );
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

    return rows.map(row => {
      const newRow = { ...row };

      for (const action of enabledActions) {
        for (const column of action.columns) {
          if (newRow[column] === undefined || newRow[column] === null) {
            continue;
          }

          newRow[column] = this.applyFormatActionToValue(String(newRow[column]), action);
        }
      }

      return newRow;
    });
  }

  applyColumnConcatRules(
    rows: Record<string, string>[],
    rules: ModelColumnConcatRule[]
  ): Record<string, string>[] {
    const activeRules = this.getActiveColumnConcatRules(rules);
    if (!activeRules.length) {
      return rows;
    }

    return rows.map(row => {
      const newRow = { ...row };

      for (const rule of activeRules) {
        newRow[rule.targetColumn] = buildConcatenatedValue(
          rule.sourceColumns.map(column => newRow[column]),
          rule.separator ?? ''
        );
      }

      return newRow;
    });
  }

  applyColumnRenameRules(
    rows: Record<string, string>[],
    rules: ModelColumnRenameRule[]
  ): Record<string, string>[] {
    const activeRules = this.getActiveColumnRenameRules(rules);
    if (!activeRules.length) {
      return rows;
    }

    return rows.map(row => {
      const newRow = { ...row };

      for (const rule of activeRules) {
        const sourceColumn = rule.sourceColumn;
        const targetColumn = rule.targetColumn?.trim();
        if (!sourceColumn || !targetColumn || sourceColumn === targetColumn) {
          continue;
        }

        if (Object.prototype.hasOwnProperty.call(newRow, sourceColumn)) {
          newRow[targetColumn] = newRow[sourceColumn];
          delete newRow[sourceColumn];
        }
      }

      return newRow;
    });
  }

  applyValueMappings(
    rows: Record<string, string>[],
    mappings: ModelColumnValueMapping[]
  ): Record<string, string>[] {
    const activeMappings = this.getActiveValueMappings(mappings);
    if (!activeMappings.length) {
      return rows;
    }

    return rows.map(row => {
      const newRow = { ...row };

      for (const mapping of activeMappings) {
        if (newRow[mapping.column] === undefined || newRow[mapping.column] === null) {
          continue;
        }

        const currentValue = String(newRow[mapping.column]);
        if (currentValue === mapping.fromValue) {
          newRow[mapping.column] = mapping.toValue;
        }
      }

      return newRow;
    });
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
    const separator = action.decimalSeparator ?? ',';
    const keepTrailingZeros = action.keepTrailingZeros ?? false;

    if (separator === ',') {
      const frenchPattern = /^([\d\s]+)\s*,\s*(\d+)\s*$/;
      const match = trimmed.match(frenchPattern);
      if (match) {
        const decimalPart = match[2];
        if (keepTrailingZeros && !/^0+$/.test(decimalPart)) {
          return trimmed;
        }
        return match[1].replace(/\s/g, '');
      }
      return trimmed;
    }

    const englishPattern = /^([\d,]+)\s*\.\s*(\d+)\s*$/;
    const match = trimmed.match(englishPattern);
    if (match) {
      const decimalPart = match[2];
      if (keepTrailingZeros && !/^0+$/.test(decimalPart)) {
        return trimmed;
      }
      return match[1].replace(/,/g, '');
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

    switch (action.type) {
      case 'removeSpecialStrings':
        return `${columns} — supprimer « ${action.specialStringToRemove ?? ''} » (${action.specialStringRemovalMode ?? 'all'})`;
      case 'removeCharacters': {
        const mode = action.removeCharMode === 'keep' ? 'conserver' : 'supprimer';
        const position = action.removeCharPosition === 'end'
          ? 'fin'
          : action.removeCharPosition === 'specific'
            ? `position ${action.removeCharSpecificPosition ?? 1}`
            : 'début';
        return `${columns} — ${mode} ${action.removeCharCount ?? 1} caractère(s) depuis la ${position}`;
      }
      case 'removeNumbers':
        return `${columns} — supprimer les chiffres`;
      case 'removeIndicatif':
        return `${columns} — supprimer indicatif (${action.indicatifType ?? 'international'})`;
      case 'removeDecimals':
        return `${columns} — supprimer décimales (séparateur ${action.decimalSeparator ?? ','})`;
      case 'keepLastDigits':
        return `${columns} — garder ${action.keepLastDigitsCount ?? 3} derniers chiffres`;
      case 'removeZeroDecimals':
        return `${columns} — supprimer .0 en fin de valeur`;
      case 'removeSpaces':
        return `${columns} — supprimer espaces (${action.removeSpacesType ?? 'all'})`;
      default:
        return columns;
    }
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
    return (columnName || '')
      .trim()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  private resolveRowColumnValue(row: Record<string, string>, column: string): string {
    if (Object.prototype.hasOwnProperty.call(row, column)) {
      return row[column] ?? '';
    }

    const targetKey = this.normalizeColumnKey(column);
    for (const [key, value] of Object.entries(row)) {
      if (this.normalizeColumnKey(key) === targetKey) {
        return value ?? '';
      }
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
