import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AutoProcessingService, AutoProcessingModel } from './auto-processing.service';
import { ReconciliationService } from './reconciliation.service';
import { KeySuggestionService } from './key-suggestion.service';
import { PartnerConditionalKeysService, PARTNER_CONDITIONAL_KEY_COLUMN, BO_CONDITIONAL_KEY_COLUMN } from './partner-conditional-keys.service';
import { ReconciliationResponse } from '../models/reconciliation-response.model';
import { fixCellEncoding } from '../utils/encoding-fixer';
import { normalizeColumnKey, getRowColumnValue } from '../utils/row-column.util';
import {
  countPartnerBoServiceOverlap,
  filterBoRowsForServiceMatch,
  filterPartnerRowsForServiceMatch,
  matchPartnerServicesToBo,
  partnerServiceMatchesBo,
  parseAllowedBoServiceLabels,
  scopeReconciliationResultToPartnerService
} from '../utils/service-match.util';
import {
  discoverReconciliationKeyColumns,
  alignReconciliationKeyFormatsAsync,
  areReconciliationKeysCompatible,
  verifyReconciliationKeyFormats,
  isExcludedFromServiceColumnDetection
} from '../utils/reconciliation-key.util';

export interface MagicServiceMatch {
  /** Libellé canonique côté partenaire (ex. CASHINOMCI). */
  partnerService: string;
  /** Valeurs distinctes côté BO rattachées à ce service (ex. CASHINOMCIPART2, MYTP_CASHINOMCI). */
  boServices: string[];
}

export interface MagicServiceSummary {
  service: string;
  partnerFileName?: string;
  partnerService?: string;
  boServices?: string;
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

export interface MagicServiceResultPart {
  service: string;
  partnerFileName: string;
  response: ReconciliationResponse;
}

export interface MagicReconciliationResult {
  response: ReconciliationResponse;
  /** Réponses par service — fusionnées en arrière-plan après navigation. */
  responseParts?: MagicServiceResultPart[];
  mode: 'pattern' | 'discovery' | 'mixed' | 'assisted';
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
  percentage?: number;
}

/** Concurrence max pour les réconciliations par service / partenaire. */
const MAGIC_SERVICE_CONCURRENCY = 3;
/** Réconciliation magique : un service à la fois (évite 2/2 à 100 % alors qu'un autre tourne encore). */
const MAGIC_RECONCILE_SEQUENTIAL = 1;
/** Relâche le thread UI entre les lots de traitement. */
const MAGIC_YIELD_EVERY_ROWS = 15000;
/** Seuil au-delà duquel on limite les colonnes analysées pour la détection service. */
const MAGIC_LARGE_DATASET_ROWS = 25000;
const MAGIC_PARTNER_CONCURRENCY = 2;

@Injectable({ providedIn: 'root' })
export class MagicReconciliationService {

  private modelsCache: AutoProcessingModel[] | null = null;
  private modelsLoading: Promise<AutoProcessingModel[]> | null = null;

  constructor(
    private autoProcessingService: AutoProcessingService,
    private reconciliationService: ReconciliationService,
    private keySuggestionService: KeySuggestionService,
    private partnerConditionalKeysService: PartnerConditionalKeysService
  ) {}

  /** Précharge les modèles en arrière-plan (dès l'ouverture du modal magique). */
  preloadTraitementModels(): Promise<AutoProcessingModel[]> {
    if (this.modelsCache) {
      return Promise.resolve(this.modelsCache);
    }
    if (!this.modelsLoading) {
      this.modelsLoading = this.autoProcessingService
        .getAllModels(AutoProcessingService.RECONCILIATION_MODULE)
        .then(models => {
          this.modelsCache = models;
          return models;
        })
        .finally(() => {
          this.modelsLoading = null;
        });
    }
    return this.modelsLoading;
  }

  private yieldToMainThread(): Promise<void> {
    return new Promise(resolve => {
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => resolve());
      } else {
        setTimeout(resolve, 0);
      }
    });
  }

  private getAlignYieldEvery(totalRows: number): number {
    return totalRows > MAGIC_LARGE_DATASET_ROWS ? MAGIC_YIELD_EVERY_ROWS : 25000;
  }

  async runMultiPartner(
    boFileName: string,
    boData: Record<string, string>[],
    partners: MagicPartnerInput[],
    onProgress?: (p: MagicReconciliationProgress) => void
  ): Promise<MagicReconciliationResult> {
    if (!partners.length) {
      throw new Error('Aucun fichier partenaire sélectionné.');
    }

    onProgress?.({ step: 'Chargement des modèles de traitement…' });
    await this.yieldToMainThread();
    const models = await this.preloadTraitementModels();

    if (partners.length === 1) {
      const single = await this.run(
        boFileName,
        partners[0].fileName,
        boData,
        partners[0].data,
        onProgress,
        models
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
    const allResponseParts: MagicServiceResultPart[] = [];
    const warnings: string[] = [];
    let lastBoKey = '';
    let lastPartnerKey = '';
    let lastBoModel: string | undefined;
    let lastPartnerModel: string | undefined;
    let usedPattern = false;
    let usedDiscovery = false;

    const partnerResults = await this.runPool(
      partners,
      MAGIC_PARTNER_CONCURRENCY,
      async (partner, i) => {
        onProgress?.({
          step: `Partenaire ${i + 1}/${partners.length} : ${partner.fileName} — En cours`,
          current: i + 1,
          total: partners.length
        });

        try {
          const result = await this.run(
            boFileName,
            partner.fileName,
            boData,
            partner.data,
            sub => onProgress?.({
              step: `[${partner.fileName}] ${sub.step}`,
              percentage: sub.percentage
            }),
            models
          );
          return { partner, result, error: null as string | null };
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          return { partner, result: null, error: msg };
        }
      }
    );

    for (const entry of partnerResults) {
      if (entry.error || !entry.result) {
        warnings.push(`${entry.partner.fileName} : ${entry.error ?? 'erreur inconnue'}`);
        continue;
      }

      const result = entry.result;
      if (result.mode === 'pattern' || result.mode === 'assisted') {
        usedPattern = true;
      } else {
        usedDiscovery = true;
      }

      this.mergeResponses(
        merged,
        this.tagResponseWithPartnerFile(result.response, entry.partner.fileName)
      );
      allSummaries.push(
        ...result.serviceSummaries.map(s => ({
          ...s,
          partnerFileName: entry.partner.fileName
        }))
      );
      if (result.responseParts?.length) {
        allResponseParts.push(...result.responseParts);
      }
      lastBoKey = result.boKeyColumn;
      lastPartnerKey = result.partnerKeyColumn;
      lastBoModel = result.boModelName;
      lastPartnerModel = result.partnerModelName;
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
      responseParts: allResponseParts,
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
    onProgress?: (p: MagicReconciliationProgress) => void,
    preloadedModels?: AutoProcessingModel[]
  ): Promise<MagicReconciliationResult> {
    const models = preloadedModels ?? await this.loadTraitementModels();
    const boModel = this.findModelForFile(models, boFileName, 'bo');
    const partnerModel = this.findModelForFile(models, partnerFileName, 'partner');

    if (partnerModel) {
      return this.runWithAssistedModels(
        boFileName,
        partnerFileName,
        boData,
        partnerData,
        boModel,
        partnerModel,
        onProgress
      );
    }

    return this.runWithDiscovery(
      boFileName,
      partnerFileName,
      boData,
      partnerData,
      boModel,
      onProgress,
      models
    );
  }

  /**
   * Fichiers reconnus par modèle : clés et réconciliation du modèle (données déjà traitées),
   * filtrées sur les services partenaire appariés au TRXBO.
   */
  private async runWithAssistedModels(
    boFileName: string,
    partnerFileName: string,
    boData: Record<string, string>[],
    partnerData: Record<string, string>[],
    boModel: AutoProcessingModel | undefined,
    partnerModel: AutoProcessingModel,
    onProgress?: (p: MagicReconciliationProgress) => void
  ): Promise<MagicReconciliationResult> {
    const report = (step: string) => onProgress?.({ step });

    let processedBo = boData;
    let processedPartner = partnerData;

    await this.yieldToMainThread();
    report('Analyse des services partenaire…');
    const serviceColumns =
      this.findServiceColumnsByHeader(processedBo, processedPartner)
      ?? await this.findServiceColumnsByContentAsync(processedBo, processedPartner);

    if (!serviceColumns) {
      throw new Error(
        'Impossible d\'identifier les colonnes service entre le TRXBO et le fichier partenaire.'
      );
    }

    await this.yieldToMainThread();
    const serviceMatches = this.findServiceMatches(
      processedBo,
      processedPartner,
      serviceColumns.boColumn,
      serviceColumns.partnerColumn
    );

    if (!serviceMatches.length) {
      throw new Error(
        'Aucun service commun entre le TRXBO et le fichier partenaire. ' +
        'Ex. partenaire CASHINMTN ↔ BO GU2_CASHINMTN, CASHINMTNPART, MYTP_CASHINMTN.'
      );
    }

    await this.yieldToMainThread();
    report('Résolution des clés via modèle partenaire…');
    const keyResolution = this.resolveBestReconciliationKeys(processedBo, processedPartner, partnerModel);
    if (!keyResolution) {
      throw new Error(
        'Les clés de réconciliation configurées dans le modèle partenaire sont incompatibles ' +
        'avec les données chargées. Vérifiez le modèle dans « Modèles de Traitement ».'
      );
    }
    let boKeyColumn = keyResolution.boKeyColumn;
    let partnerKeyColumn = keyResolution.partnerKeyColumn;

    if (partnerModel.reconciliationKeys?.boTreatments) {
      await this.yieldToMainThread();
      this.applyBoTreatmentsInPlace(processedBo, partnerModel.reconciliationKeys.boTreatments);
    }

    const boConditional = partnerModel.reconciliationKeys?.boConditionalKeys;
    if (this.partnerConditionalKeysService.isBoConditionalEnabled(boConditional)) {
      await this.yieldToMainThread();
      processedBo = this.partnerConditionalKeysService.applyBoConditionalKeys(processedBo, boConditional!);
      boKeyColumn = BO_CONDITIONAL_KEY_COLUMN;
    }

    const partnerConditional = partnerModel.reconciliationKeys?.partnerConditionalKeys;
    if (this.partnerConditionalKeysService.isEnabled(partnerConditional)) {
      await this.yieldToMainThread();
      processedPartner = this.partnerConditionalKeysService.applyPartnerConditionalKeys(
        processedPartner,
        partnerConditional!
      );
      partnerKeyColumn = PARTNER_CONDITIONAL_KEY_COLUMN;
    }

    await this.yieldToMainThread();
    report('Alignement du format des clés…');
    const totalRows = processedBo.length + processedPartner.length;
    await alignReconciliationKeyFormatsAsync(
      processedBo,
      processedPartner,
      boKeyColumn,
      partnerKeyColumn,
      {
        yieldEvery: this.getAlignYieldEvery(totalRows),
        yieldFn: () => this.yieldToMainThread(),
        onProgress: report
      }
    );

    if (!this.hasAnyServiceRows(processedBo, processedPartner, serviceMatches, serviceColumns)) {
      throw new Error('Aucune ligne à réconcilier après filtrage sur les services appariés.');
    }

    report(
      `Réconciliation assistée (${serviceMatches.length} service(s)) — ` +
      `filtrage par service avant envoi serveur…`
    );

    const { response, summaries: serviceSummaries, responseParts } = await this.reconcilePerService(
      processedBo,
      processedPartner,
      serviceMatches,
      serviceColumns.boColumn,
      serviceColumns.partnerColumn,
      boKeyColumn,
      partnerKeyColumn,
      partnerFileName,
      onProgress
    );

    return {
      response,
      responseParts,
      mode: 'assisted',
      serviceSummaries,
      boKeyColumn,
      partnerKeyColumn,
      boModelName: boModel?.name,
      partnerModelName: partnerModel.name
    };
  }

  /** Fichiers sans modèle partenaire : détection automatique des clés et des services. */
  private async runWithDiscovery(
    boFileName: string,
    partnerFileName: string,
    boData: Record<string, string>[],
    partnerData: Record<string, string>[],
    boModel: AutoProcessingModel | undefined,
    onProgress?: (p: MagicReconciliationProgress) => void,
    preloadedModels?: AutoProcessingModel[]
  ): Promise<MagicReconciliationResult> {
    onProgress?.({ step: `Analyse de ${partnerFileName}…` });
    await this.yieldToMainThread();

    const models = preloadedModels ?? await this.preloadTraitementModels();
    const partnerModel = this.findModelForFile(models, partnerFileName, 'partner');

    onProgress?.({ step: `Analyse des services pour ${partnerFileName}…` });
    await this.yieldToMainThread();
    const serviceColumns =
      this.findServiceColumnsByHeader(boData, partnerData)
      ?? await this.findServiceColumnsByContentAsync(boData, partnerData);
    const serviceMatches = serviceColumns
      ? this.findServiceMatches(boData, partnerData, serviceColumns.boColumn, serviceColumns.partnerColumn)
      : [];

    let keyResult: { boKeyColumn: string; partnerKeyColumn: string; modelId?: string; model?: AutoProcessingModel } | null = null;
    let mode: 'pattern' | 'discovery' = 'discovery';

    onProgress?.({ step: `Recherche des clés (modèles) pour ${partnerFileName}...` });
    keyResult = this.resolveKeysFromModels(models, boFileName, partnerFileName, boData, partnerData);
    if (keyResult) {
      mode = 'pattern';
    }

    const modelForKeys = keyResult?.model ?? partnerModel;
    const bestKeys = this.resolveBestReconciliationKeys(boData, partnerData, modelForKeys ?? undefined);
    if (bestKeys) {
      keyResult = {
        boKeyColumn: bestKeys.boKeyColumn,
        partnerKeyColumn: bestKeys.partnerKeyColumn,
        modelId: keyResult?.modelId ?? modelForKeys?.modelId ?? modelForKeys?.id,
        model: modelForKeys ?? keyResult?.model
      };
      if (modelForKeys) {
        mode = 'pattern';
      } else {
        mode = 'discovery';
      }
    } else if (!keyResult) {
      throw new Error(
        'Impossible de déterminer les colonnes clés entre les fichiers BO et Partenaire. ' +
        'Configurez un modèle dans « Modèles de Traitement » ou utilisez le mode Assisté.'
      );
    }

    if (!keyResult) {
      throw new Error(
        'Impossible de déterminer les colonnes clés entre les fichiers BO et Partenaire. ' +
        'Configurez un modèle dans « Modèles de Traitement » ou utilisez le mode Assisté.'
      );
    }

    let processedBo = boData;
    const usedModel = keyResult.model ?? partnerModel ?? boModel;
    if (usedModel?.reconciliationKeys?.boTreatments) {
      await this.yieldToMainThread();
      this.applyBoTreatmentsInPlace(processedBo, usedModel.reconciliationKeys.boTreatments);
    }

    const { partnerData: processedPartner, partnerKeyColumn } =
      this.preparePartnerDataForReconciliation(partnerData, usedModel, keyResult.partnerKeyColumn);

    const { boData: processedBoWithKeys, boKeyColumn } =
      this.prepareBoDataForReconciliation(processedBo, usedModel, keyResult.boKeyColumn);
    processedBo = processedBoWithKeys;

    await this.yieldToMainThread();
    const totalRows = processedBo.length + processedPartner.length;
    await alignReconciliationKeyFormatsAsync(processedBo, processedPartner, boKeyColumn, partnerKeyColumn, {
      yieldEvery: this.getAlignYieldEvery(totalRows),
      yieldFn: () => this.yieldToMainThread()
    });

    const resolvedServiceColumns = serviceColumns
      ?? this.findServiceColumnsByHeader(processedBo, processedPartner)
      ?? await this.findServiceColumnsByContentAsync(processedBo, processedPartner);
    const resolvedServiceMatches = resolvedServiceColumns
      ? this.findServiceMatches(processedBo, processedPartner, resolvedServiceColumns.boColumn, resolvedServiceColumns.partnerColumn)
      : serviceMatches;

    onProgress?.({
      step: resolvedServiceMatches.length > 1
        ? `Réconciliation par service (${resolvedServiceMatches.length} communs) — En cours`
        : resolvedServiceMatches.length === 1
          ? `Réconciliation du service « ${resolvedServiceMatches[0].partnerService} » — En cours`
          : 'Lancement de la réconciliation — En cours',
      current: 0,
      total: Math.max(resolvedServiceMatches.length, 1)
    });

    if (resolvedServiceColumns && resolvedServiceMatches.length === 0) {
      throw new Error(
        'Aucun service commun entre le TRXBO et le fichier partenaire. ' +
        'Seuls les services appariés sont réconciliés en mode magique — les autres lignes BO sont ignorées.'
      );
    }

    if (resolvedServiceMatches.length >= 1 && resolvedServiceColumns) {
      const merged = await this.reconcilePerService(
        processedBo,
        processedPartner,
        resolvedServiceMatches,
        resolvedServiceColumns.boColumn,
        resolvedServiceColumns.partnerColumn,
        boKeyColumn,
        partnerKeyColumn,
        partnerFileName,
        onProgress
      );
      return {
        response: merged.response,
        responseParts: merged.responseParts,
        mode,
        serviceSummaries: merged.summaries.map(s => ({ ...s, partnerFileName })),
        boKeyColumn: boKeyColumn,
        partnerKeyColumn,
        boModelName: boModel?.name,
        partnerModelName: partnerModel?.name ?? usedModel?.name
      };
    }

    throw new Error(
      'Impossible d\'identifier les colonnes service entre le TRXBO et le fichier partenaire. ' +
      'La réconciliation magique ne traite que les lignes des services appariés.'
    );
  }

  private preparePartnerDataForReconciliation(
    partnerData: Record<string, string>[],
    usedModel: AutoProcessingModel | undefined,
    defaultPartnerKeyColumn: string
  ): { partnerData: Record<string, string>[]; partnerKeyColumn: string } {
    const config = usedModel?.reconciliationKeys?.partnerConditionalKeys;
    if (this.partnerConditionalKeysService.isEnabled(config)) {
      return {
        partnerData: this.partnerConditionalKeysService.applyPartnerConditionalKeys(partnerData, config!),
        partnerKeyColumn: PARTNER_CONDITIONAL_KEY_COLUMN
      };
    }
    return { partnerData, partnerKeyColumn: defaultPartnerKeyColumn };
  }

  private prepareBoDataForReconciliation(
    boData: Record<string, string>[],
    usedModel: AutoProcessingModel | undefined,
    defaultBoKeyColumn: string
  ): { boData: Record<string, string>[]; boKeyColumn: string } {
    const config = usedModel?.reconciliationKeys?.boConditionalKeys;
    if (this.partnerConditionalKeysService.isBoConditionalEnabled(config)) {
      return {
        boData: this.partnerConditionalKeysService.applyBoConditionalKeys(boData, config!),
        boKeyColumn: BO_CONDITIONAL_KEY_COLUMN
      };
    }
    return { boData, boKeyColumn: defaultBoKeyColumn };
  }

  private async reconcilePerService(
    boData: Record<string, string>[],
    partnerData: Record<string, string>[],
    serviceMatches: MagicServiceMatch[],
    boServiceCol: string,
    partnerServiceCol: string,
    boKeyColumn: string,
    partnerKeyColumn: string,
    partnerFileName: string,
    onProgress?: (p: MagicReconciliationProgress) => void
  ): Promise<{
    response: ReconciliationResponse;
    summaries: MagicServiceSummary[];
    responseParts: MagicServiceResultPart[];
  }> {
    const summaries: MagicServiceSummary[] = [];
    const responseParts: MagicServiceResultPart[] = [];

    await this.yieldToMainThread();
    onProgress?.({ step: 'Indexation des lignes par service…' });
    const boServiceIndex = await this.buildBoServiceIndexAsync(boData, boServiceCol, serviceMatches);
    const partnerServiceIndex = await this.buildPartnerServiceIndexAsync(
      partnerData,
      partnerServiceCol,
      serviceMatches
    );

    if (!this.hasRowsInServiceIndexes(serviceMatches, boServiceIndex, partnerServiceIndex)) {
      throw new Error('Aucune ligne BO ou partenaire à réconcilier pour les services appariés.');
    }

    const serviceResults = await this.runPool(
      serviceMatches,
      MAGIC_RECONCILE_SEQUENTIAL,
      async (match, i) => {
        const partnerService = match.partnerService;
        const partitionTag = partnerService;
        const serviceIndex = i + 1;

        const boSlice = this.getBoSliceForMatch(boServiceIndex, match, boData, boServiceCol);
        const partnerSlice = this.getPartnerSliceForMatch(
          partnerServiceIndex,
          partnerService,
          partnerData,
          partnerServiceCol
        );

        onProgress?.(
          this.buildServiceProgress(
            partitionTag,
            serviceIndex,
            serviceMatches.length,
            `Filtrage — ${boSlice.length.toLocaleString('fr-FR')} ligne(s) BO, ` +
              `${partnerSlice.length.toLocaleString('fr-FR')} ligne(s) partenaire`,
            Math.round(((serviceIndex - 1) / serviceMatches.length) * 100)
          )
        );

        if (!boSlice.length && !partnerSlice.length) {
          return null;
        }

        const taggedBo = this.tagRowsForMagic(boSlice, partitionTag, partnerFileName);
        const taggedPartner = this.tagRowsForMagic(partnerSlice, partitionTag, partnerFileName);

        onProgress?.(
          this.buildServiceProgress(
            partitionTag,
            serviceIndex,
            serviceMatches.length,
            'Réconciliation serveur…',
            Math.round(((serviceIndex - 0.5) / serviceMatches.length) * 100)
          )
        );

        const result = await this.reconcileOnce(
          taggedBo,
          taggedPartner,
          boKeyColumn,
          partnerKeyColumn
        );

        const scopedResult = scopeReconciliationResultToPartnerService(
          result,
          match.partnerService,
          boServiceCol,
          partnerServiceCol,
          match.boServices
        );
        this.tagReconciliationResultInPlace(scopedResult, partitionTag, partnerFileName);

        onProgress?.(
          this.buildServiceProgress(
            partitionTag,
            serviceIndex,
            serviceMatches.length,
            'Terminé',
            Math.round((serviceIndex / serviceMatches.length) * 100)
          )
        );

        return { match, result: scopedResult, partitionTag };
      }
    );

    for (const entry of serviceResults) {
      if (!entry) {
        continue;
      }
      const { match, result, partitionTag } = entry;
      const service = partitionTag ?? match.partnerService;
      summaries.push({
        service,
        partnerFileName,
        partnerService: match.partnerService,
        boServices: match.boServices.join(', '),
        boServiceColumn: boServiceCol,
        partnerServiceColumn: partnerServiceCol,
        totalMatches: result.totalMatches,
        totalBoOnly: result.totalBoOnly,
        totalPartnerOnly: result.totalPartnerOnly,
        totalBoRecords: result.totalBoRecords,
        totalPartnerRecords: result.totalPartnerRecords
      });
      responseParts.push({ service, partnerFileName, response: result });
    }

    onProgress?.({
      step: 'Ouverture des résultats…',
      current: serviceMatches.length,
      total: serviceMatches.length,
      percentage: 100
    });

    return {
      summaries,
      responseParts,
      response: this.summariesToStubResponse(summaries)
    };
  }

  /** Fusionne les réponses par service sans bloquer le thread principal. */
  async mergeServiceResponsesAsync(parts: MagicServiceResultPart[]): Promise<ReconciliationResponse> {
    const merged = this.emptyResponse();
    for (let i = 0; i < parts.length; i++) {
      const result = parts[i].response;
      if (result.matches.length) {
        merged.matches = merged.matches.concat(result.matches);
      }
      if (result.boOnly.length) {
        merged.boOnly = merged.boOnly.concat(result.boOnly);
      }
      if (result.partnerOnly.length) {
        merged.partnerOnly = merged.partnerOnly.concat(result.partnerOnly);
      }
      if (result.mismatches?.length) {
        merged.mismatches = merged.mismatches.concat(result.mismatches);
      }
      merged.totalBoRecords += result.totalBoRecords;
      merged.totalPartnerRecords += result.totalPartnerRecords;
      merged.totalMatches += result.totalMatches;
      merged.totalMismatches += result.totalMismatches;
      merged.totalBoOnly += result.totalBoOnly;
      merged.totalPartnerOnly += result.totalPartnerOnly;
      if (i < parts.length - 1) {
        await new Promise<void>(resolve => setTimeout(resolve, 0));
      }
    }
    return merged;
  }

  private summariesToStubResponse(summaries: MagicServiceSummary[]): ReconciliationResponse {
    return {
      matches: [],
      boOnly: [],
      partnerOnly: [],
      mismatches: [],
      totalBoRecords: summaries.reduce((sum, s) => sum + (s.totalBoRecords || 0), 0),
      totalPartnerRecords: summaries.reduce((sum, s) => sum + (s.totalPartnerRecords || 0), 0),
      totalMatches: summaries.reduce((sum, s) => sum + (s.totalMatches || 0), 0),
      totalBoOnly: summaries.reduce((sum, s) => sum + (s.totalBoOnly || 0), 0),
      totalPartnerOnly: summaries.reduce((sum, s) => sum + (s.totalPartnerOnly || 0), 0),
      totalMismatches: 0
    };
  }

  private tagReconciliationResultInPlace(
    result: ReconciliationResponse,
    service: string,
    partnerFileName: string
  ): void {
    const tags = { _magicService: service, _magicPartnerFile: partnerFileName };
    for (const match of result.matches) {
      Object.assign(match.boData, tags);
      Object.assign(match.partnerData, tags);
      match.partnerDataList?.forEach(row => Object.assign(row, tags));
    }
    for (const row of result.boOnly) {
      Object.assign(row, tags);
    }
    for (const row of result.partnerOnly) {
      Object.assign(row, tags);
    }
    for (const row of result.mismatches ?? []) {
      Object.assign(row, tags);
    }
  }

  private appendReconcileResult(
    merged: ReconciliationResponse,
    result: ReconciliationResponse,
    service: string,
    partnerFileName: string
  ): void {
    this.tagReconciliationResultInPlace(result, service, partnerFileName);
    if (result.matches.length) {
      merged.matches = merged.matches.concat(result.matches);
    }
    if (result.boOnly.length) {
      merged.boOnly = merged.boOnly.concat(result.boOnly);
    }
    if (result.partnerOnly.length) {
      merged.partnerOnly = merged.partnerOnly.concat(result.partnerOnly);
    }
    if (result.mismatches?.length) {
      merged.mismatches = merged.mismatches.concat(result.mismatches);
    }
    merged.totalBoRecords += result.totalBoRecords;
    merged.totalPartnerRecords += result.totalPartnerRecords;
    merged.totalMatches += result.totalMatches;
    merged.totalMismatches += result.totalMismatches;
    merged.totalBoOnly += result.totalBoOnly;
    merged.totalPartnerOnly += result.totalPartnerOnly;
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
    // Pas de polling live-progress : évite les requêtes en boucle et allège le serveur.
    // La progression est portée par reconcilePerService (par service magique).
    return firstValueFrom(this.reconciliationService.reconcile(request));
  }

  private loadTraitementModels(): Promise<AutoProcessingModel[]> {
    return this.preloadTraitementModels();
  }

  private hasAnyServiceRows(
    boData: Record<string, string>[],
    partnerData: Record<string, string>[],
    serviceMatches: MagicServiceMatch[],
    serviceColumns: MatchedServiceColumns
  ): boolean {
    const boIndex = this.buildBoServiceIndex(boData, serviceColumns.boColumn, serviceMatches);
    const partnerIndex = this.buildPartnerServiceIndex(
      partnerData,
      serviceColumns.partnerColumn,
      serviceMatches
    );
    return this.hasRowsInServiceIndexes(serviceMatches, boIndex, partnerIndex);
  }

  private hasRowsInServiceIndexes(
    serviceMatches: MagicServiceMatch[],
    boIndex: Map<string, Record<string, string>[]>,
    partnerIndex: Map<string, Record<string, string>[]>
  ): boolean {
    return serviceMatches.some(
      match => (boIndex.get(match.partnerService)?.length ?? 0) > 0
        || (partnerIndex.get(match.partnerService)?.length ?? 0) > 0
    );
  }

  private async buildBoServiceIndexAsync(
    boData: Record<string, string>[],
    boServiceCol: string,
    serviceMatches: MagicServiceMatch[]
  ): Promise<Map<string, Record<string, string>[]>> {
    const allowedBo = new Set<string>();
    const partnerByBo = new Map<string, string>();
    for (const match of serviceMatches) {
      for (const boSvc of match.boServices) {
        allowedBo.add(boSvc);
        partnerByBo.set(boSvc, match.partnerService);
      }
    }

    const index = new Map<string, Record<string, string>[]>();
    for (let i = 0; i < boData.length; i++) {
      const row = boData[i];
      const boSvc = String(getRowColumnValue(row, boServiceCol) ?? '').trim();
      if (!boSvc) {
        continue;
      }
      let partnerKey = '';
      if (allowedBo.has(boSvc)) {
        partnerKey = partnerByBo.get(boSvc) || '';
      } else {
        for (const match of serviceMatches) {
          if (partnerServiceMatchesBo(match.partnerService, boSvc)) {
            partnerKey = match.partnerService;
            break;
          }
        }
      }
      if (!partnerKey) {
        continue;
      }
      let bucket = index.get(partnerKey);
      if (!bucket) {
        bucket = [];
        index.set(partnerKey, bucket);
      }
      bucket.push(row);
      if (i > 0 && i % MAGIC_YIELD_EVERY_ROWS === 0) {
        await this.yieldToMainThread();
      }
    }
    return index;
  }

  private async buildPartnerServiceIndexAsync(
    partnerData: Record<string, string>[],
    partnerServiceCol: string,
    serviceMatches: MagicServiceMatch[]
  ): Promise<Map<string, Record<string, string>[]>> {
    const canonicalPartners = new Set(serviceMatches.map(m => m.partnerService));
    const index = new Map<string, Record<string, string>[]>();

    for (let i = 0; i < partnerData.length; i++) {
      const row = partnerData[i];
      const partnerSvc = String(getRowColumnValue(row, partnerServiceCol) ?? '').trim();
      if (!partnerSvc) {
        continue;
      }
      let partnerKey = '';
      if (canonicalPartners.has(partnerSvc)) {
        partnerKey = partnerSvc;
      } else {
        for (const canonical of canonicalPartners) {
          if (partnerServiceMatchesBo(canonical, partnerSvc)) {
            partnerKey = canonical;
            break;
          }
        }
      }
      if (!partnerKey) {
        continue;
      }
      let bucket = index.get(partnerKey);
      if (!bucket) {
        bucket = [];
        index.set(partnerKey, bucket);
      }
      bucket.push(row);
      if (i > 0 && i % MAGIC_YIELD_EVERY_ROWS === 0) {
        await this.yieldToMainThread();
      }
    }
    return index;
  }

  private buildBoServiceIndex(
    boData: Record<string, string>[],
    boServiceCol: string,
    serviceMatches: MagicServiceMatch[]
  ): Map<string, Record<string, string>[]> {
    const allowedBo = new Set<string>();
    const partnerByBo = new Map<string, string>();
    for (const match of serviceMatches) {
      for (const boSvc of match.boServices) {
        allowedBo.add(boSvc);
        partnerByBo.set(boSvc, match.partnerService);
      }
    }

    const index = new Map<string, Record<string, string>[]>();
    for (const row of boData) {
      const boSvc = String(getRowColumnValue(row, boServiceCol) ?? '').trim();
      if (!boSvc) {
        continue;
      }
      let partnerKey = '';
      if (allowedBo.has(boSvc)) {
        partnerKey = partnerByBo.get(boSvc) || '';
      } else {
        for (const match of serviceMatches) {
          if (partnerServiceMatchesBo(match.partnerService, boSvc)) {
            partnerKey = match.partnerService;
            break;
          }
        }
      }
      if (!partnerKey) {
        continue;
      }
      let bucket = index.get(partnerKey);
      if (!bucket) {
        bucket = [];
        index.set(partnerKey, bucket);
      }
      bucket.push(row);
    }
    return index;
  }

  private buildPartnerServiceIndex(
    partnerData: Record<string, string>[],
    partnerServiceCol: string,
    serviceMatches: MagicServiceMatch[]
  ): Map<string, Record<string, string>[]> {
    const canonicalPartners = new Set(serviceMatches.map(m => m.partnerService));
    const index = new Map<string, Record<string, string>[]>();

    for (const row of partnerData) {
      const partnerSvc = String(getRowColumnValue(row, partnerServiceCol) ?? '').trim();
      if (!partnerSvc) {
        continue;
      }
      let partnerKey = '';
      if (canonicalPartners.has(partnerSvc)) {
        partnerKey = partnerSvc;
      } else {
        for (const canonical of canonicalPartners) {
          if (partnerServiceMatchesBo(canonical, partnerSvc)) {
            partnerKey = canonical;
            break;
          }
        }
      }
      if (!partnerKey) {
        continue;
      }
      let bucket = index.get(partnerKey);
      if (!bucket) {
        bucket = [];
        index.set(partnerKey, bucket);
      }
      bucket.push(row);
    }
    return index;
  }

  private getBoSliceForMatch(
    boIndex: Map<string, Record<string, string>[]>,
    match: MagicServiceMatch,
    boData: Record<string, string>[],
    boServiceCol: string
  ): Record<string, string>[] {
    const indexed = boIndex.get(match.partnerService);
    if (indexed?.length) {
      return indexed;
    }
    return filterBoRowsForServiceMatch(boData, boServiceCol, match);
  }

  private getPartnerSliceForMatch(
    partnerIndex: Map<string, Record<string, string>[]>,
    partnerService: string,
    partnerData: Record<string, string>[],
    partnerServiceCol: string
  ): Record<string, string>[] {
    const indexed = partnerIndex.get(partnerService);
    if (indexed?.length) {
      return indexed;
    }
    return filterPartnerRowsForServiceMatch(partnerData, partnerServiceCol, partnerService);
  }

  private isServiceLikeColumn(column: string): boolean {
    if (isExcludedFromServiceColumnDetection(column)) {
      return false;
    }
    const l = column.toLowerCase();
    return l.includes('service') || l.includes('serv') || l.includes('type') || l.includes('produit');
  }

  private async findServiceColumnsByContentAsync(
    boData: Record<string, string>[],
    partnerData: Record<string, string>[]
  ): Promise<MatchedServiceColumns | null> {
    await this.yieldToMainThread();
    return this.findServiceColumnsByContent(boData, partnerData);
  }

  private async runPool<T, R>(
    items: T[],
    concurrency: number,
    worker: (item: T, index: number) => Promise<R>
  ): Promise<R[]> {
    if (!items.length) {
      return [];
    }

    const results = new Array<R>(items.length);
    let nextIndex = 0;
    const poolSize = Math.max(1, Math.min(concurrency, items.length));

    const runWorker = async (): Promise<void> => {
      while (true) {
        const index = nextIndex++;
        if (index >= items.length) {
          break;
        }
        results[index] = await worker(items[index], index);
      }
    };

    await Promise.all(Array.from({ length: poolSize }, () => runWorker()));
    return results;
  }

  private indexRowsByColumn(
    data: Record<string, string>[],
    column: string
  ): Map<string, Record<string, string>[]> {
    const map = new Map<string, Record<string, string>[]>();
    for (const row of data) {
      const key = String(getRowColumnValue(row, column) ?? '').trim();
      if (!key) {
        continue;
      }
      let bucket = map.get(key);
      if (!bucket) {
        bucket = [];
        map.set(key, bucket);
      }
      bucket.push(row);
    }
    return map;
  }

  private tagRowsForMagic(
    rows: Record<string, string>[],
    service: string,
    partnerFileName: string
  ): Record<string, string>[] {
    if (!rows.length) {
      return rows;
    }
    const tagged = new Array<Record<string, string>>(rows.length);
    for (let i = 0; i < rows.length; i++) {
      tagged[i] = {
        ...rows[i],
        _magicService: service,
        _magicPartnerFile: partnerFileName
      };
    }
    return tagged;
  }

  private sanitizeProgressDetail(detail?: string): string {
    const trimmed = (detail ?? '').trim();
    if (!trimmed || /^en attente$/i.test(trimmed)) {
      return 'En cours...';
    }
    return trimmed.replace(/en attente/gi, 'En cours');
  }

  private buildServiceProgress(
    service: string,
    index: number,
    total: number,
    detail?: string,
    percentage?: number
  ): MagicReconciliationProgress {
    const safeDetail = this.sanitizeProgressDetail(detail)
      .replace(/^réconciliation terminée$/i, 'Terminé');
    return {
      step: `Service ${index}/${total} « ${service} » — ${safeDetail}`,
      current: index,
      total,
      percentage
    };
  }

  /**
   * Détection rapide via en-têtes « service » / « type » identiques ou compatibles.
   */
  private findServiceColumnsByHeader(
    boData: Record<string, string>[],
    partnerData: Record<string, string>[]
  ): MatchedServiceColumns | null {
    const boCol = this.findBoServiceColumn(boData);
    const partnerCol = this.findPartnerServiceColumn(partnerData);
    if (!boCol || !partnerCol) {
      return null;
    }
    const matches = this.findServiceMatches(boData, partnerData, boCol, partnerCol);
    if (!matches.length) {
      return null;
    }
    return { boColumn: boCol, partnerColumn: partnerCol, overlapScore: 1 };
  }

  private modelHasPartnerKeyConfig(model: AutoProcessingModel): boolean {
    return !!(
      model.reconciliationKeys?.partnerKeys?.length ||
      this.partnerConditionalKeysService.isEnabled(model.reconciliationKeys?.partnerConditionalKeys) ||
      this.partnerConditionalKeysService.isBoConditionalEnabled(model.reconciliationKeys?.boConditionalKeys)
    );
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
        this.modelHasPartnerKeyConfig(m)
      );
    }

    for (const model of candidates) {
      const resolved = this.resolveKeysFromPartnerModel(model, boData, partnerData);
      if (resolved && areReconciliationKeysCompatible(boData, partnerData, resolved.boKeyColumn, resolved.partnerKeyColumn)) {
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
    const resolved = this.partnerConditionalKeysService.resolveReconciliationKeyColumns(
      model,
      boData,
      partnerData
    );
    if (resolved) {
      return {
        ...resolved,
        modelId: model.modelId || model.id
      };
    }
    return null;
  }

  /**
   * Choisit la paire de clés avec le meilleur recouvrement (modèle vs détection auto).
   * Évite les faux positifs du modèle (ex. IDTransaction sur MOOVGA alors que CLE matche mieux).
   */
  private resolveBestReconciliationKeys(
    boData: Record<string, string>[],
    partnerData: Record<string, string>[],
    model?: AutoProcessingModel
  ): { boKeyColumn: string; partnerKeyColumn: string } | null {
    const candidates: { boKeyColumn: string; partnerKeyColumn: string }[] = [];

    if (model) {
      const fromModel = this.resolveKeysFromPartnerModel(model, boData, partnerData);
      if (fromModel) {
        candidates.push(fromModel);
      }
    }

    const discovered = discoverReconciliationKeyColumns(boData, partnerData, this.keySuggestionService);
    if (discovered) {
      candidates.push(discovered);
    }

    let best: { boKeyColumn: string; partnerKeyColumn: string } | null = null;
    let bestOverlap = 0;

    for (const candidate of candidates) {
      if (!areReconciliationKeysCompatible(
        boData,
        partnerData,
        candidate.boKeyColumn,
        candidate.partnerKeyColumn
      )) {
        continue;
      }
      const check = verifyReconciliationKeyFormats(
        boData,
        partnerData,
        candidate.boKeyColumn,
        candidate.partnerKeyColumn
      );
      const overlap = check.overlapAfter ?? 0;
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        best = candidate;
      }
    }

    return best;
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

    const partnerCol = this.findPartnerServiceColumn(partnerData);
    const boCols = Object.keys(boData[0]);
    const partnerCols = Object.keys(partnerData[0]);
    const boColsForCache = boCols.filter(c => this.isServiceLikeColumn(c));
    const partnerColsForCache = partnerCols.filter(c => this.isServiceLikeColumn(c));
    const boDistinct = this.buildDistinctValueCache(boData, boColsForCache.length ? boColsForCache : boCols.slice(0, 8));
    const partnerDistinct = this.buildDistinctValueCache(
      partnerData,
      partnerColsForCache.length ? partnerColsForCache : partnerCols.slice(0, 8)
    );

    const scorePair = (boCol: string, partnerColName: string): number => {
      const boValues = boDistinct.get(boCol) ?? [];
      const partnerValues = partnerDistinct.get(partnerColName) ?? [];
      if (boValues.length < 1 || partnerValues.length < 1 || boValues.length > 40 || partnerValues.length > 40) {
        return 0;
      }
      const overlap = countPartnerBoServiceOverlap(boValues, partnerValues);
      if (overlap === 0) {
        return 0;
      }
      return overlap / Math.min(boValues.length, partnerValues.length);
    };

    const isServiceLikeHeader = (col: string): boolean => {
      const l = col.toLowerCase();
      return l.includes('service') || l.includes('serv') || l.includes('type') || l.includes('produit');
    };

    if (partnerCol && this.isExactServiceColumn(partnerCol)) {
      let bestForService: MatchedServiceColumns | null = null;
      for (const boCol of boCols) {
        if (isExcludedFromServiceColumnDetection(boCol)) {
          continue;
        }
        const overlapScore = scorePair(boCol, partnerCol);
        if (overlapScore <= 0) {
          continue;
        }
        const headerBonus = (isServiceLikeHeader(boCol) ? 0.15 : 0) + 0.5;
        const totalScore = overlapScore + headerBonus;
        if (!bestForService || totalScore > bestForService.overlapScore) {
          bestForService = { boColumn: boCol, partnerColumn: partnerCol, overlapScore: totalScore };
        }
      }
      if (bestForService) {
        return bestForService;
      }
    }

    let best: MatchedServiceColumns | null = null;

    const boColsOrdered = [...boCols].sort(
      (a, b) => Number(isServiceLikeHeader(b)) - Number(isServiceLikeHeader(a))
    );
    const partnerColsOrdered = [...partnerCols].sort(
      (a, b) => this.scorePartnerServiceColumnPriority(b) - this.scorePartnerServiceColumnPriority(a)
    );

    for (const boCol of boColsOrdered) {
      if (isExcludedFromServiceColumnDetection(boCol)) {
        continue;
      }
      for (const partnerColName of partnerColsOrdered) {
        if (isExcludedFromServiceColumnDetection(partnerColName)) {
          continue;
        }
        const overlapScore = scorePair(boCol, partnerColName);
        if (overlapScore <= 0) {
          continue;
        }
        const headerBonus =
          (isServiceLikeHeader(boCol) ? 0.15 : 0)
          + (this.isExactServiceColumn(partnerColName) ? 0.5 : isServiceLikeHeader(partnerColName) ? 0.15 : 0);
        const totalScore = overlapScore + headerBonus;
        if (!best || totalScore > best.overlapScore) {
          best = { boColumn: boCol, partnerColumn: partnerColName, overlapScore: totalScore };
        }
        if (totalScore >= 0.95) {
          return best;
        }
      }
    }

    return best;
  }

  /**
   * Associe chaque service partenaire aux variantes BO correspondantes (égalité ou inclusion).
   * Ex. partenaire CASHINOMCI ↔ BO CASHINOMCIPART2, MYTP_CASHINOMCI, GU2_CASHINOMCIPART_CI.
   */
  findServiceMatches(
    boData: Record<string, string>[],
    partnerData: Record<string, string>[],
    boColumn: string,
    partnerColumn: string
  ): MagicServiceMatch[] {
    const boValues = this.extractDistinctValues(boData, boColumn);
    const partnerValues = this.extractDistinctValues(partnerData, partnerColumn);
    return matchPartnerServicesToBo(boValues, partnerValues);
  }

  /** @deprecated Préférer findServiceMatches ; retourne les libellés partenaire reconnus. */
  findCommonServices(
    boData: Record<string, string>[],
    partnerData: Record<string, string>[],
    boColumn: string,
    partnerColumn: string
  ): string[] {
    return this.findServiceMatches(boData, partnerData, boColumn, partnerColumn)
      .map(m => m.partnerService);
  }

  private serviceValuesMatch(boValue: string, partnerValue: string): boolean {
    return partnerServiceMatchesBo(partnerValue, boValue);
  }

  private isExactServiceColumn(column: string): boolean {
    return normalizeColumnKey(column).replace(/\s/g, '') === 'service';
  }

  /** Côté partenaire : colonne « Service » en priorité absolue si elle existe. */
  private findPartnerServiceColumn(data: Record<string, string>[]): string | null {
    if (!data?.length) {
      return null;
    }

    const columns = Object.keys(data[0]);
    const exactService = columns.find(column =>
      !isExcludedFromServiceColumnDetection(column) && this.isExactServiceColumn(column)
    );
    if (exactService) {
      return exactService;
    }

    return this.findServiceColumnByScore(data);
  }

  private findBoServiceColumn(data: Record<string, string>[]): string | null {
    if (!data?.length) {
      return null;
    }

    const columns = Object.keys(data[0]);
    const exactService = columns.find(column =>
      !isExcludedFromServiceColumnDetection(column) && this.isExactServiceColumn(column)
    );
    if (exactService) {
      return exactService;
    }

    return this.findServiceColumnByScore(data);
  }

  private scorePartnerServiceColumnPriority(column: string): number {
    if (this.isExactServiceColumn(column)) {
      return 1000;
    }
    const normalized = column.toLowerCase().trim();
    if (normalized === 'service name' || normalized === 'nom service') {
      return 80;
    }
    if (normalized.includes('service') && !normalized.includes('type')) {
      return 60;
    }
    if (normalized.includes('type')) {
      return 10;
    }
    return 0;
  }

  private findServiceColumnByScore(data: Record<string, string>[]): string | null {
    if (!data?.length) {
      return null;
    }

    const columns = Object.keys(data[0]);
    let bestColumn: string | null = null;
    let bestScore = 0;

    for (const column of columns) {
      if (isExcludedFromServiceColumnDetection(column)) {
        continue;
      }
      const score = this.scoreServiceColumnHeader(column);
      if (score > bestScore) {
        bestScore = score;
        bestColumn = column;
      }
    }

    return bestScore > 0 ? bestColumn : null;
  }

  private scoreServiceColumnHeader(column: string): number {
    const normalized = column.toLowerCase().trim();
    if (this.isExactServiceColumn(column)) {
      return 100;
    }
    if (normalized === 'service name' || normalized === 'nom service' || normalized === 'nom du service') {
      return 90;
    }
    if (normalized.includes('service') && !normalized.includes('type')) {
      return 80;
    }
    if (normalized.includes('serv') && !normalized.includes('type')) {
      return 70;
    }
    if (normalized.includes('produit')) {
      return 60;
    }
    if (normalized.includes('type') && !normalized.includes('transaction')) {
      return 40;
    }
    if (normalized === 'transaction type') {
      return 5;
    }
    if (normalized.includes('type')) {
      return 15;
    }
    return 0;
  }

  private buildDistinctValueCache(
    data: Record<string, string>[],
    columns: string[]
  ): Map<string, string[]> {
    const cache = new Map<string, string[]>();
    for (const column of columns) {
      cache.set(column, this.extractDistinctValues(data, column));
    }
    return cache;
  }

  private extractDistinctValues(data: Record<string, string>[], column: string): string[] {
    const values = new Set<string>();
    for (const row of data) {
      const value = String(getRowColumnValue(row, column) ?? '').trim();
      if (value) {
        values.add(value);
      }
    }
    return [...values].sort();
  }

  private applyBoTreatmentsInPlace(
    boData: Record<string, string>[],
    boTreatments: Record<string, unknown>
  ): void {
    for (const treatments of Object.values(boTreatments)) {
      if (!Array.isArray(treatments)) {
        continue;
      }
      for (const treatment of treatments as Array<{ type?: string; column?: string; suffix?: string }>) {
        if (treatment?.type !== 'removeSuffix' || !treatment.column || !treatment.suffix) {
          continue;
        }
        const col = treatment.column;
        const suffix = treatment.suffix;
        for (const row of boData) {
          const val = row[col];
          if (typeof val === 'string' && val.endsWith(suffix)) {
            row[col] = val.slice(0, -suffix.length);
          }
        }
      }
    }
  }

  /** @deprecated Préférer applyBoTreatmentsInPlace pour les gros jeux de données. */
  private applyBoTreatments(
    boData: Record<string, string>[],
    boTreatments: Record<string, unknown>
  ): Record<string, string>[] {
    const copy = boData.map(row => ({ ...row }));
    this.applyBoTreatmentsInPlace(copy, boTreatments);
    return copy;
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
