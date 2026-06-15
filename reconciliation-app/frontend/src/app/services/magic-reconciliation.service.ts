import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AutoProcessingService, AutoProcessingModel } from './auto-processing.service';
import { ReconciliationService } from './reconciliation.service';
import { KeySuggestionService } from './key-suggestion.service';
import { ReconciliationResponse } from '../models/reconciliation-response.model';
import { fixCellEncoding } from '../utils/encoding-fixer';

export interface MagicServiceSummary {
  service: string;
  partnerFileName?: string;
  partnerService?: string;
  boServiceColumn?: string;
  partnerServiceColumn?: string;
  totalMatches: number;
  totalBoOnly: number;
  totalPartnerOnly: number;
  totalBoRecords: number;
  totalPartnerRecords: number;
}

export interface MagicPartnerInput {
  fileName: string;
  data: Record<string, string>[];
}

export interface MatchedServiceColumns {
  boColumn: string;
  partnerColumn: string;
  overlapScore: number;
}

export interface MagicReconciliationResult {
  response: ReconciliationResponse;
  mode: 'pattern' | 'discovery' | 'mixed';
  serviceSummaries: MagicServiceSummary[];
  boKeyColumn: string;
  partnerKeyColumn: string;
  boModelName?: string;
  partnerModelName?: string;
  partnerFileNames?: string[];
  warnings?: string[];
}

export interface MagicReconciliationProgress {
  step: string;
  current?: number;
  total?: number;
}

@Injectable({ providedIn: 'root' })
export class MagicReconciliationService {

  constructor(
    private autoProcessingService: AutoProcessingService,
    private reconciliationService: ReconciliationService,
    private keySuggestionService: KeySuggestionService
  ) {}

  async runMultiPartner(
    boFileName: string,
    boData: Record<string, string>[],
    partners: MagicPartnerInput[],
    onProgress?: (p: MagicReconciliationProgress) => void
  ): Promise<MagicReconciliationResult> {
    if (!partners.length) {
      throw new Error('Aucun fichier partenaire sélectionné.');
    }
    if (partners.length === 1) {
      const single = await this.run(
        boFileName,
        partners[0].fileName,
        boData,
        partners[0].data,
        onProgress
      );
      return {
        ...single,
        partnerFileNames: [partners[0].fileName],
        serviceSummaries: single.serviceSummaries.map(s => ({
          ...s,
          partnerFileName: partners[0].fileName
        }))
      };
    }

    const merged = this.emptyResponse();
    const allSummaries: MagicServiceSummary[] = [];
    const warnings: string[] = [];
    let lastBoKey = '';
    let lastPartnerKey = '';
    let lastBoModel: string | undefined;
    let lastPartnerModel: string | undefined;
    let usedPattern = false;
    let usedDiscovery = false;

    for (let i = 0; i < partners.length; i++) {
      const partner = partners[i];
      onProgress?.({
        step: `Fichier partenaire ${i + 1}/${partners.length} : ${partner.fileName}...`,
        current: i + 1,
        total: partners.length
      });

      try {
        const result = await this.run(
          boFileName,
          partner.fileName,
          boData,
          partner.data,
          sub => onProgress?.({ step: `[${partner.fileName}] ${sub.step}` })
        );

        if (result.mode === 'pattern') {
          usedPattern = true;
        } else {
          usedDiscovery = true;
        }

        this.mergeResponses(merged, this.tagResponseWithPartnerFile(result.response, partner.fileName));
        allSummaries.push(
          ...result.serviceSummaries.map(s => ({
            ...s,
            partnerFileName: partner.fileName
          }))
        );
        lastBoKey = result.boKeyColumn;
        lastPartnerKey = result.partnerKeyColumn;
        lastBoModel = result.boModelName;
        lastPartnerModel = result.partnerModelName;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        warnings.push(`${partner.fileName} : ${msg}`);
      }
    }

    if (!allSummaries.length) {
      throw new Error(
        warnings.length
          ? `Aucune réconciliation réussie.\n${warnings.join('\n')}`
          : 'Aucune réconciliation réussie.'
      );
    }

    return {
      response: merged,
      mode: usedPattern && usedDiscovery ? 'mixed' : usedPattern ? 'pattern' : 'discovery',
      serviceSummaries: allSummaries,
      boKeyColumn: lastBoKey,
      partnerKeyColumn: lastPartnerKey,
      boModelName: lastBoModel,
      partnerModelName: lastPartnerModel,
      partnerFileNames: partners.map(p => p.fileName),
      warnings: warnings.length ? warnings : undefined
    };
  }

  async run(
    boFileName: string,
    partnerFileName: string,
    boData: Record<string, string>[],
    partnerData: Record<string, string>[],
    onProgress?: (p: MagicReconciliationProgress) => void
  ): Promise<MagicReconciliationResult> {
    onProgress?.({ step: `Analyse de ${partnerFileName}...` });

    const models = await this.autoProcessingService.getAllModels('Réconciliation');
    const boModel = this.findModelForFile(models, boFileName, 'bo');
    const partnerModel = this.findModelForFile(models, partnerFileName, 'partner');

    let keyResult: { boKeyColumn: string; partnerKeyColumn: string; modelId?: string; model?: AutoProcessingModel } | null = null;
    let mode: 'pattern' | 'discovery' = 'discovery';

    onProgress?.({ step: `Recherche des clés pour ${partnerFileName}...` });
    keyResult = this.resolveKeysFromModels(models, boFileName, partnerFileName, boData, partnerData);
    if (keyResult) {
      mode = 'pattern';
    }

    if (!keyResult) {
      onProgress?.({ step: `Détection automatique des clés pour ${partnerFileName}...` });
      keyResult = this.discoverKeysFromColumns(boData, partnerData);
      mode = 'discovery';
    }

    if (!keyResult) {
      throw new Error(
        'Impossible de déterminer les colonnes clés entre les fichiers BO et Partenaire. ' +
        'Utilisez le mode Assisté pour configurer manuellement les clés.'
      );
    }

    let processedBo = boData;
    const usedModel = keyResult.model ?? partnerModel ?? boModel;
    if (usedModel?.reconciliationKeys?.boTreatments) {
      processedBo = this.applyBoTreatments(processedBo, usedModel.reconciliationKeys.boTreatments);
    }

    const serviceColumns = this.findServiceColumnsByContent(processedBo, partnerData);
    const commonServices = serviceColumns
      ? this.findCommonServices(processedBo, partnerData, serviceColumns.boColumn, serviceColumns.partnerColumn)
      : [];

    onProgress?.({
      step: commonServices.length > 1
        ? `Réconciliation par service (${commonServices.length} communs aux deux fichiers)...`
        : commonServices.length === 1
          ? `Réconciliation du service « ${commonServices[0]} »...`
          : 'Lancement de la réconciliation...',
      current: 0,
      total: Math.max(commonServices.length, 1)
    });

    if (commonServices.length >= 1 && serviceColumns) {
      const merged = await this.reconcilePerService(
        processedBo,
        partnerData,
        commonServices,
        serviceColumns.boColumn,
        serviceColumns.partnerColumn,
        keyResult.boKeyColumn,
        keyResult.partnerKeyColumn,
        partnerFileName,
        onProgress
      );
      return {
        response: this.tagResponseWithPartnerFile(merged.response, partnerFileName),
        mode,
        serviceSummaries: merged.summaries.map(s => ({ ...s, partnerFileName })),
        boKeyColumn: keyResult.boKeyColumn,
        partnerKeyColumn: keyResult.partnerKeyColumn,
        boModelName: boModel?.name,
        partnerModelName: partnerModel?.name
      };
    }

    if (serviceColumns && commonServices.length === 0) {
      throw new Error(
        'Aucun service commun trouvé entre les fichiers BO et Partenaire. ' +
        'Vérifiez que les colonnes de service/type contiennent les mêmes valeurs dans les deux fichiers.'
      );
    }

    const response = this.tagResponseWithPartnerFile(
      await this.reconcileOnce(
        processedBo,
        partnerData,
        keyResult.boKeyColumn,
        keyResult.partnerKeyColumn
      ),
      partnerFileName
    );

    return {
      response,
      mode,
      serviceSummaries: [{
        service: 'Tous',
        partnerFileName,
        totalMatches: response.totalMatches,
        totalBoOnly: response.totalBoOnly,
        totalPartnerOnly: response.totalPartnerOnly,
        totalBoRecords: response.totalBoRecords,
        totalPartnerRecords: response.totalPartnerRecords
      }],
      boKeyColumn: keyResult.boKeyColumn,
      partnerKeyColumn: keyResult.partnerKeyColumn,
      boModelName: boModel?.name,
      partnerModelName: partnerModel?.name
    };
  }

  private async reconcilePerService(
    boData: Record<string, string>[],
    partnerData: Record<string, string>[],
    services: string[],
    boServiceCol: string,
    partnerServiceCol: string,
    boKeyColumn: string,
    partnerKeyColumn: string,
    partnerFileName: string,
    onProgress?: (p: MagicReconciliationProgress) => void
  ): Promise<{ response: ReconciliationResponse; summaries: MagicServiceSummary[] }> {
    const summaries: MagicServiceSummary[] = [];
    const merged: ReconciliationResponse = {
      matches: [],
      boOnly: [],
      partnerOnly: [],
      mismatches: [],
      totalBoRecords: 0,
      totalPartnerRecords: 0,
      totalMatches: 0,
      totalMismatches: 0,
      totalBoOnly: 0,
      totalPartnerOnly: 0
    };

    for (let i = 0; i < services.length; i++) {
      const service = services[i];
      onProgress?.({
        step: `Service « ${service} » (${i + 1}/${services.length})...`,
        current: i + 1,
        total: services.length
      });

      const boSlice = boData.filter(r => (r[boServiceCol] || '').trim() === service);
      const partnerSlice = partnerData.filter(r => (r[partnerServiceCol] || '').trim() === service);

      if (!boSlice.length && !partnerSlice.length) {
        continue;
      }

      const taggedBo = boSlice.map(r => ({ ...r, _magicService: service, _magicPartnerFile: partnerFileName }));
      const taggedPartner = partnerSlice.map(r => ({ ...r, _magicService: service, _magicPartnerFile: partnerFileName }));

      const result = await this.reconcileOnce(taggedBo, taggedPartner, boKeyColumn, partnerKeyColumn);
      summaries.push({
        service,
        partnerFileName,
        partnerService: service,
        boServiceColumn: boServiceCol,
        partnerServiceColumn: partnerServiceCol,
        totalMatches: result.totalMatches,
        totalBoOnly: result.totalBoOnly,
        totalPartnerOnly: result.totalPartnerOnly,
        totalBoRecords: result.totalBoRecords,
        totalPartnerRecords: result.totalPartnerRecords
      });

      merged.matches.push(...result.matches.map(m => ({
        ...m,
        boData: { ...m.boData, _magicService: service, _magicPartnerFile: partnerFileName },
        partnerData: { ...m.partnerData, _magicService: service, _magicPartnerFile: partnerFileName }
      })));
      merged.boOnly.push(...result.boOnly.map(r => ({ ...r, _magicService: service, _magicPartnerFile: partnerFileName })));
      merged.partnerOnly.push(...result.partnerOnly.map(r => ({ ...r, _magicService: service, _magicPartnerFile: partnerFileName })));
      merged.mismatches.push(...(result.mismatches || []).map(r => ({ ...r, _magicService: service, _magicPartnerFile: partnerFileName })));
      merged.totalBoRecords += result.totalBoRecords;
      merged.totalPartnerRecords += result.totalPartnerRecords;
      merged.totalMatches += result.totalMatches;
      merged.totalMismatches += result.totalMismatches;
      merged.totalBoOnly += result.totalBoOnly;
      merged.totalPartnerOnly += result.totalPartnerOnly;
    }

    return { response: merged, summaries };
  }

  private async reconcileOnce(
    boData: Record<string, string>[],
    partnerData: Record<string, string>[],
    boKeyColumn: string,
    partnerKeyColumn: string
  ): Promise<ReconciliationResponse> {
    const request = {
      boFileContent: boData,
      partnerFileContent: partnerData,
      boKeyColumn,
      partnerKeyColumn,
      comparisonColumns: [{ boColumn: boKeyColumn, partnerColumn: partnerKeyColumn }],
      boColumnFilters: []
    };
    return firstValueFrom(this.reconciliationService.reconcile(request));
  }

  private findModelForFile(
    models: AutoProcessingModel[],
    fileName: string,
    side: 'bo' | 'partner'
  ): AutoProcessingModel | undefined {
    return models.find(m =>
      (m.fileType === side || m.fileType === 'both') &&
      this.matchesFilePattern(fileName, m.filePattern)
    );
  }

  private resolveKeysFromModels(
    models: AutoProcessingModel[],
    boFileName: string,
    partnerFileName: string,
    boData: Record<string, string>[],
    partnerData: Record<string, string>[]
  ): { boKeyColumn: string; partnerKeyColumn: string; modelId?: string; model?: AutoProcessingModel } | null {
    let candidates = models.filter(m =>
      (m.fileType === 'partner' || m.fileType === 'both') &&
      partnerFileName &&
      this.matchesFilePattern(partnerFileName, m.filePattern)
    );

    if (!candidates.length && boFileName) {
      candidates = models.filter(m =>
        (m.fileType === 'partner' || m.fileType === 'both') &&
        this.matchesFilePattern(boFileName, m.filePattern)
      );
    }

    if (!candidates.length) {
      candidates = models.filter(m =>
        (m.fileType === 'partner' || m.fileType === 'both') &&
        !!m.reconciliationKeys?.partnerKeys?.length
      );
    }

    for (const model of candidates) {
      const resolved = this.resolveKeysFromPartnerModel(model, boData, partnerData);
      if (resolved) {
        return { ...resolved, model };
      }
    }
    return null;
  }

  private resolveKeysFromPartnerModel(
    model: AutoProcessingModel,
    boData: Record<string, string>[],
    partnerData: Record<string, string>[]
  ): { boKeyColumn: string; partnerKeyColumn: string; modelId?: string } | null {
    if (!model.reconciliationKeys?.partnerKeys?.length) {
      return null;
    }

    const boKeys = model.reconciliationKeys.boKeys || [];
    const partnerKeys = model.reconciliationKeys.partnerKeys || [];
    let boKeyColumn = '';
    let partnerKeyColumn = '';

    if (boKeys.length && partnerKeys.length) {
      boKeyColumn = this.findExistingColumn(boData, boKeys) || '';
      partnerKeyColumn = this.findExistingColumn(partnerData, partnerKeys) || '';
    }

    if (!boKeyColumn || !partnerKeyColumn) {
      const boModels = model.reconciliationKeys.boModels || [];
      for (const boModelId of boModels) {
        const boModelKeys = model.reconciliationKeys.boModelKeys?.[boModelId];
        if (boModelKeys?.length && partnerKeys.length) {
          const foundBo = this.findExistingColumn(boData, boModelKeys);
          const foundPartner = this.findExistingColumn(partnerData, partnerKeys);
          if (foundBo && foundPartner) {
            boKeyColumn = foundBo;
            partnerKeyColumn = foundPartner;
            break;
          }
        }
      }
    }

    if (!boKeyColumn || !partnerKeyColumn) {
      return null;
    }

    return {
      boKeyColumn,
      partnerKeyColumn,
      modelId: model.modelId || model.id
    };
  }

  private discoverKeysFromColumns(
    boData: Record<string, string>[],
    partnerData: Record<string, string>[]
  ): { boKeyColumn: string; partnerKeyColumn: string } | null {
    const boCols = Object.keys(boData[0] || {});
    const partnerCols = Object.keys(partnerData[0] || {});

    const cleBo = boCols.find(c => c.toUpperCase() === 'CLE');
    const clePartner = partnerCols.find(c => c.toUpperCase() === 'CLE');
    if (cleBo && clePartner) {
      return { boKeyColumn: cleBo, partnerKeyColumn: clePartner };
    }

    const analysis = this.keySuggestionService.analyzeAndSuggestKeys(boData, partnerData);
    const best = analysis.suggestions?.[0];
    if (best && best.confidence >= 0.5) {
      return { boKeyColumn: best.boColumn, partnerKeyColumn: best.partnerColumn };
    }

    return this.bruteForceKeyMatch(boData, partnerData);
  }

  private bruteForceKeyMatch(
    boData: Record<string, string>[],
    partnerData: Record<string, string>[]
  ): { boKeyColumn: string; partnerKeyColumn: string } | null {
    const boCols = Object.keys(boData[0] || {});
    const partnerCols = Object.keys(partnerData[0] || {});
    let best: { bo: string; partner: string; score: number } | null = null;

    for (const boCol of boCols) {
      const boValues = new Set(
        boData.slice(0, 200).map(r => (r[boCol] || '').trim()).filter(Boolean)
      );
      if (boValues.size < 2) {
        continue;
      }
      for (const partnerCol of partnerCols) {
        const partnerValues = new Set(
          partnerData.slice(0, 200).map(r => (r[partnerCol] || '').trim()).filter(Boolean)
        );
        if (partnerValues.size < 2) {
          continue;
        }
        let overlap = 0;
        for (const v of boValues) {
          if (partnerValues.has(v)) {
            overlap++;
          }
        }
        const score = overlap / Math.max(boValues.size, partnerValues.size);
        if (!best || score > best.score) {
          best = { bo: boCol, partner: partnerCol, score };
        }
      }
    }

    if (best && best.score >= 0.15) {
      return { boKeyColumn: best.bo, partnerKeyColumn: best.partner };
    }
    return null;
  }

  private findExistingColumn(data: Record<string, string>[], candidateKeys: string[]): string | null {
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

  /**
   * Repère les colonnes « service » en comparant le contenu entre BO et Partenaire
   * (les en-têtes peuvent différer).
   */
  findServiceColumnsByContent(
    boData: Record<string, string>[],
    partnerData: Record<string, string>[]
  ): MatchedServiceColumns | null {
    if (!boData?.length || !partnerData?.length) {
      return null;
    }

    const boCols = Object.keys(boData[0]);
    const partnerCols = Object.keys(partnerData[0]);
    let best: MatchedServiceColumns | null = null;

    const scorePair = (boCol: string, partnerCol: string): number => {
      const boValues = this.extractDistinctValues(boData, boCol);
      const partnerValues = this.extractDistinctValues(partnerData, partnerCol);
      if (boValues.length < 1 || partnerValues.length < 1 || boValues.length > 40 || partnerValues.length > 40) {
        return 0;
      }
      const partnerSet = new Set(partnerValues);
      let overlap = 0;
      for (const v of boValues) {
        if (partnerSet.has(v)) {
          overlap++;
        }
      }
      if (overlap === 0) {
        return 0;
      }
      return overlap / Math.min(boValues.length, partnerValues.length);
    };

    const isServiceLikeHeader = (col: string): boolean => {
      const l = col.toLowerCase();
      return l.includes('service') || l.includes('serv') || l.includes('type') || l.includes('produit');
    };

    for (const boCol of boCols) {
      for (const partnerCol of partnerCols) {
        const overlapScore = scorePair(boCol, partnerCol);
        if (overlapScore <= 0) {
          continue;
        }
        const headerBonus =
          (isServiceLikeHeader(boCol) ? 0.15 : 0) + (isServiceLikeHeader(partnerCol) ? 0.15 : 0);
        const totalScore = overlapScore + headerBonus;
        if (!best || totalScore > best.overlapScore) {
          best = { boColumn: boCol, partnerColumn: partnerCol, overlapScore: totalScore };
        }
      }
    }

    return best;
  }

  findCommonServices(
    boData: Record<string, string>[],
    partnerData: Record<string, string>[],
    boColumn: string,
    partnerColumn: string
  ): string[] {
    const boValues = new Set(this.extractDistinctValues(boData, boColumn));
    const partnerValues = new Set(this.extractDistinctValues(partnerData, partnerColumn));
    return [...boValues].filter(v => partnerValues.has(v)).sort();
  }

  private findServiceColumn(data: Record<string, string>[]): string | null {
    if (!data?.length) {
      return null;
    }
    return Object.keys(data[0]).find(c => {
      const l = c.toLowerCase();
      return l.includes('service') || l.includes('serv');
    }) || null;
  }

  private extractDistinctValues(data: Record<string, string>[], column: string): string[] {
    return [...new Set(data.map(r => (r[column] || '').trim()).filter(Boolean))].sort();
  }

  private applyBoTreatments(
    boData: Record<string, string>[],
    boTreatments: Record<string, unknown>
  ): Record<string, string>[] {
    let processed = [...boData];
    for (const treatments of Object.values(boTreatments)) {
      if (!Array.isArray(treatments)) {
        continue;
      }
      for (const treatment of treatments as Array<{ type?: string; column?: string; suffix?: string }>) {
        if (treatment?.type === 'removeSuffix' && treatment.column && treatment.suffix) {
          processed = processed.map(row => {
            const copy = { ...row };
            const val = copy[treatment.column!];
            if (typeof val === 'string' && val.endsWith(treatment.suffix!)) {
              copy[treatment.column!] = val.slice(0, -treatment.suffix!.length);
            }
            return copy;
          });
        }
      }
    }
    return processed;
  }

  matchesFilePattern(fileName: string, pattern: string): boolean {
    if (!pattern || !fileName) {
      return false;
    }
    const lowerName = fileName.toLowerCase();
    const lowerPattern = pattern.toLowerCase();
    const acceptedExtensions = ['.csv', '.xls', '.xlsx'];
    const getExtension = (name: string): string => {
      const match = name.match(/\.[^/.]+$/);
      return match ? match[0] : '';
    };
    const fileNameExt = getExtension(lowerName);
    const patternExt = getExtension(lowerPattern);
    const nameNoExt = lowerName.replace(/\.[^/.]+$/, '');
    const patternNoExt = lowerPattern.replace(/\.[^/.]+$/, '');

    if (patternNoExt.includes('*') || patternNoExt.includes('?')) {
      const regexPattern = patternNoExt.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.');
      try {
        if (new RegExp(`^${regexPattern}$`, 'i').test(nameNoExt)) {
          return !patternExt || acceptedExtensions.includes(patternExt) && acceptedExtensions.includes(fileNameExt);
        }
      } catch { /* ignore */ }
      return false;
    }

    if (patternExt && acceptedExtensions.includes(patternExt)) {
      return nameNoExt === patternNoExt && acceptedExtensions.includes(fileNameExt);
    }

    if (nameNoExt === patternNoExt) {
      return true;
    }
    if (nameNoExt.includes(patternNoExt) || patternNoExt.includes(nameNoExt)) {
      return true;
    }
    return nameNoExt.startsWith(patternNoExt);
  }

  private emptyResponse(): ReconciliationResponse {
    return {
      matches: [],
      boOnly: [],
      partnerOnly: [],
      mismatches: [],
      totalBoRecords: 0,
      totalPartnerRecords: 0,
      totalMatches: 0,
      totalMismatches: 0,
      totalBoOnly: 0,
      totalPartnerOnly: 0
    };
  }

  private mergeResponses(target: ReconciliationResponse, source: ReconciliationResponse): void {
    target.matches.push(...source.matches);
    target.boOnly.push(...source.boOnly);
    target.partnerOnly.push(...source.partnerOnly);
    target.mismatches.push(...(source.mismatches || []));
    target.totalBoRecords += source.totalBoRecords;
    target.totalPartnerRecords += source.totalPartnerRecords;
    target.totalMatches += source.totalMatches;
    target.totalMismatches += source.totalMismatches;
    target.totalBoOnly += source.totalBoOnly;
    target.totalPartnerOnly += source.totalPartnerOnly;
  }

  private tagResponseWithPartnerFile(
    response: ReconciliationResponse,
    partnerFileName: string
  ): ReconciliationResponse {
    const tagRow = (row: Record<string, string>) => ({ ...row, _magicPartnerFile: partnerFileName });
    return {
      ...response,
      matches: response.matches.map(m => ({
        ...m,
        boData: tagRow(m.boData),
        partnerData: tagRow(m.partnerData),
        partnerDataList: m.partnerDataList?.map(tagRow)
      })),
      boOnly: response.boOnly.map(tagRow),
      partnerOnly: response.partnerOnly.map(tagRow),
      mismatches: (response.mismatches || []).map(tagRow)
    };
  }
}
