import { Injectable } from '@angular/core';
import {
  ModelFormatAction,
  ModelPreProcessingConfig,
  ModelRowFilter,
  ModelColumnValueMapping,
  ModelColumnConcatRule
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
      || this.getActiveValueMappings(config?.valueMappings).length > 0;
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

  getPreProcessingSummary(config?: ModelPreProcessingConfig | null): {
    activeFilterCount: number;
    activeFormatCount: number;
    activeConcatCount: number;
    activeValueMappingCount: number;
    summaryText: string;
    detailText: string;
  } {
    const filters = this.getActiveFilters(config);
    const formats = this.getActiveFormatActions(config);
    const concatRules = this.getActiveColumnConcatRules(config?.columnConcatRules);
    const valueMappings = this.getActiveValueMappings(config?.valueMappings);
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

    return {
      activeFilterCount: filters.length,
      activeFormatCount: formats.length,
      activeConcatCount: concatRules.length,
      activeValueMappingCount: valueMappings.length,
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
}
