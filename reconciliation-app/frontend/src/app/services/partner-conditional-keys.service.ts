import { Injectable } from '@angular/core';
import {
  AutoProcessingModel,
  BoConditionalKeysConfig,
  PartnerConditionalKeysConfig
} from './auto-processing.service';
import { fixCellEncoding } from '../utils/encoding-fixer';
import {
  BO_RECONCILIATION_KEY_ALIASES,
  PARTNER_REFERENCE_KEY_ALIASES,
  normalizeReconciliationKeyValue
} from '../utils/reconciliation-key.util';

/** Colonne synthétique injectée dans les données partenaire avant réconciliation. */
export const PARTNER_CONDITIONAL_KEY_COLUMN = '__PARTNER_RECON_KEY__';

/** Colonne synthétique injectée dans les données BO avant réconciliation. */
export const BO_CONDITIONAL_KEY_COLUMN = '__BO_RECON_KEY__';

type ConditionalKeysConfig = PartnerConditionalKeysConfig | BoConditionalKeysConfig;

@Injectable({ providedIn: 'root' })
export class PartnerConditionalKeysService {

  isEnabled(config?: PartnerConditionalKeysConfig | null): boolean {
    return this.isConditionalConfigEnabled(config);
  }

  isBoConditionalEnabled(config?: BoConditionalKeysConfig | null): boolean {
    return this.isConditionalConfigEnabled(config);
  }

  isConfigValid(data: Record<string, string>[], config: PartnerConditionalKeysConfig): boolean {
    return this.isConditionalConfigValid(data, config);
  }

  isBoConditionalConfigValid(data: Record<string, string>[], config: BoConditionalKeysConfig): boolean {
    return this.isConditionalConfigValid(data, config);
  }

  resolveBoKeyFromModel(model: AutoProcessingModel, boData: Record<string, string>[]): string | null {
    const boKeys = model.reconciliationKeys?.boKeys || [];
    if (boKeys.length) {
      const found = this.findExistingColumn(boData, boKeys);
      if (found) {
        return found;
      }
    }
    for (const boModelId of model.reconciliationKeys?.boModels || []) {
      const boModelKeys = model.reconciliationKeys?.boModelKeys?.[boModelId];
      if (boModelKeys?.length) {
        const found = this.findExistingColumn(boData, boModelKeys);
        if (found) {
          return found;
        }
      }
    }

    return this.findExistingColumn(boData, BO_RECONCILIATION_KEY_ALIASES);
  }

  resolvePartnerKeyFromModel(model: AutoProcessingModel, partnerData: Record<string, string>[]): string | null {
    const partnerKeys = model.reconciliationKeys?.partnerKeys || [];
    if (partnerKeys.length) {
      const found = this.findExistingColumn(partnerData, partnerKeys);
      if (found) {
        return found;
      }
    }

    return this.findExistingColumn(partnerData, PARTNER_REFERENCE_KEY_ALIASES);
  }

  /**
   * Si le modèle définit des clés conditionnelles partenaire valides, retourne la colonne clé synthétique.
   */
  tryResolveConditionalPartnerKey(
    model: AutoProcessingModel,
    boData: Record<string, string>[],
    partnerData: Record<string, string>[]
  ): { boKeyColumn: string; partnerKeyColumn: string } | null {
    const config = model.reconciliationKeys?.partnerConditionalKeys;
    if (!this.isEnabled(config)) {
      return null;
    }
    const boKeyColumn = this.resolveBoKeyColumnForModel(model, boData);
    if (!boKeyColumn || !this.isConfigValid(partnerData, config!)) {
      return null;
    }
    return { boKeyColumn, partnerKeyColumn: PARTNER_CONDITIONAL_KEY_COLUMN };
  }

  /**
   * Résout les colonnes clés en combinant clés statiques et clés conditionnelles BO / partenaire.
   */
  resolveReconciliationKeyColumns(
    model: AutoProcessingModel,
    boData: Record<string, string>[],
    partnerData: Record<string, string>[]
  ): { boKeyColumn: string; partnerKeyColumn: string } | null {
    const partnerConditional = model.reconciliationKeys?.partnerConditionalKeys;
    const boConditional = model.reconciliationKeys?.boConditionalKeys;

    let partnerKeyColumn = '';
    if (this.isEnabled(partnerConditional) && this.isConfigValid(partnerData, partnerConditional!)) {
      partnerKeyColumn = PARTNER_CONDITIONAL_KEY_COLUMN;
    } else {
      partnerKeyColumn = this.resolvePartnerKeyFromModel(model, partnerData) || '';
    }

    let boKeyColumn = '';
    if (this.isBoConditionalEnabled(boConditional) && this.isBoConditionalConfigValid(boData, boConditional!)) {
      boKeyColumn = BO_CONDITIONAL_KEY_COLUMN;
    } else {
      boKeyColumn = this.resolveBoKeyColumnForModel(model, boData) || '';
    }

    if (!boKeyColumn || !partnerKeyColumn) {
      return null;
    }
    return { boKeyColumn, partnerKeyColumn };
  }

  private resolveBoKeyColumnForModel(model: AutoProcessingModel, boData: Record<string, string>[]): string | null {
    if (this.isBoConditionalEnabled(model.reconciliationKeys?.boConditionalKeys)
      && this.isBoConditionalConfigValid(boData, model.reconciliationKeys!.boConditionalKeys!)) {
      return BO_CONDITIONAL_KEY_COLUMN;
    }
    return this.resolveBoKeyFromModel(model, boData);
  }

  applyPartnerConditionalKeys(
    data: Record<string, string>[],
    config: PartnerConditionalKeysConfig
  ): Record<string, string>[] {
    return this.applyConditionalKeys(data, config, PARTNER_CONDITIONAL_KEY_COLUMN);
  }

  applyBoConditionalKeys(
    data: Record<string, string>[],
    config: BoConditionalKeysConfig
  ): Record<string, string>[] {
    return this.applyConditionalKeys(data, config, BO_CONDITIONAL_KEY_COLUMN);
  }

  private applyConditionalKeys(
    data: Record<string, string>[],
    config: ConditionalKeysConfig,
    targetColumn: string
  ): Record<string, string>[] {
    if (!data?.length || !this.isConditionalConfigEnabled(config)) {
      return data;
    }

    const conditionCol = this.findExistingColumn(data, [config.conditionColumn]);
    if (!conditionCol) {
      return data;
    }

    const resolvedRules = config.rules
      .filter(r => r.whenValue?.trim() && r.keyColumn?.trim())
      .map(rule => ({
        whenValue: rule.whenValue.trim().toLowerCase(),
        keyCol: this.findExistingColumn(data, [rule.keyColumn])
      }))
      .filter((r): r is { whenValue: string; keyCol: string } => !!r.keyCol);

    const defaultCol = config.defaultKeyColumn?.trim()
      ? this.findExistingColumn(data, [config.defaultKeyColumn])
      : null;

    return data.map(row => {
      const copy = { ...row };
      const conditionVal = (copy[conditionCol] || '').trim().toLowerCase();
      let keyValue = '';

      for (const rule of resolvedRules) {
        if (conditionVal === rule.whenValue) {
          keyValue = (copy[rule.keyCol] || '').trim();
          break;
        }
      }

      if (!keyValue && defaultCol) {
        keyValue = (copy[defaultCol] || '').trim();
      }

      copy[targetColumn] = normalizeReconciliationKeyValue(keyValue);
      return copy;
    });
  }

  private isConditionalConfigEnabled(config?: ConditionalKeysConfig | null): boolean {
    return !!(
      config?.enabled &&
      config.conditionColumn?.trim() &&
      config.rules?.length &&
      config.rules.some(r => r.whenValue?.trim() && r.keyColumn?.trim())
    );
  }

  private isConditionalConfigValid(data: Record<string, string>[], config: ConditionalKeysConfig): boolean {
    if (!this.isConditionalConfigEnabled(config)) {
      return false;
    }
    const conditionCol = this.findExistingColumn(data, [config.conditionColumn]);
    if (!conditionCol) {
      return false;
    }
    return config.rules.some(rule => {
      if (!rule.whenValue?.trim() || !rule.keyColumn?.trim()) {
        return false;
      }
      return !!this.findExistingColumn(data, [rule.keyColumn]);
    });
  }

  findExistingColumn(data: Record<string, string>[], candidateKeys: string[]): string | null {
    if (!data?.length || !candidateKeys?.length) {
      return null;
    }
    const available = Object.keys(data[0]);
    const normAvailable = available.map(c => this.normalizeColumnName(c));
    const normCandidates = candidateKeys.map(k => this.normalizeColumnName(k));

    for (let i = 0; i < normCandidates.length; i++) {
      const idx = normAvailable.indexOf(normCandidates[i]);
      if (idx !== -1) {
        return available[idx];
      }
    }

    for (let i = 0; i < normCandidates.length; i++) {
      const candidate = normCandidates[i].toLowerCase();
      for (let j = 0; j < normAvailable.length; j++) {
        if (normAvailable[j].toLowerCase() === candidate) {
          return available[j];
        }
      }
    }

    for (let i = 0; i < normCandidates.length; i++) {
      const candidate = normCandidates[i].replace(/\s+/g, '').toLowerCase();
      for (let j = 0; j < normAvailable.length; j++) {
        const column = normAvailable[j].replace(/\s+/g, '').toLowerCase();
        if (candidate === column) {
          return available[j];
        }
      }
    }

    return null;
  }

  private normalizeColumnName(name: string): string {
    return fixCellEncoding(name).replace(/\s+/g, ' ').trim();
  }
}
