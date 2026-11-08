import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { ReconciliationResponse } from '../models/reconciliation-response.model';
import { FraisTransaction } from '../models/frais-transaction.model';

export type EcartDetailSource = 'BO' | 'PARTNER';

export type EcartRegularisationType = 'TSOP' | 'TRXSF' | 'ECART_PARTNER' | 'TRXSF_PARTNER';

export interface EcartDetailLine {
  type: EcartRegularisationType;
  source: EcartDetailSource;
  service: string;
  agence: string;
  montant: number;
  montantBo: number | null;
  frais: number;
  montantARegulariser: number;
  date: string;
  idTransaction: string;
  numeroTransGu: string;
  commentaire: string;
}

export interface EcartAggregateRow {
  code: string;
  label: string;
  count: number;
  volume: number;
  frais: number;
  montantARegulariser: number;
  details: EcartDetailLine[];
}

export interface CertificationSoldeContext {
  response: ReconciliationResponse;
  partnerData: Record<string, string>[];
  boData: Record<string, string>[];
  fraisConfigs?: FraisTransaction[];
  dateDe?: string;
  dateAu?: string;
}

export interface OppartOperationTypeVolume {
  type: string;
  volume: number;
}

export interface OppartOperationBreakdown {
  hasData: boolean;
  volume: number;
  frais: number;
  otherTypes: OppartOperationTypeVolume[];
}

export interface TrxboServiceRow {
  service: string;
  count: number;
  volume: number;
}

export interface TrxboServiceBreakdown {
  hasData: boolean;
  rows: TrxboServiceRow[];
  totalCount: number;
  totalVolume: number;
}

export interface CertificationSoldeComputed {
  soldeOuvertureOppart: number | null;
  soldeClotureOppart: number | null;
  mouvementNetOppart: number;
  fraisAttendu: number | null;
  totalDebit: number;
  totalCredit: number;
  volumeMatches: number;
  volumeEcartBo: number;
  volumeEcartPartner: number;
  totalRegularisation: number;
  aggregates: EcartAggregateRow[];
  regularisationDetails: EcartDetailLine[];
  oppartOperationBreakdown: OppartOperationBreakdown;
  trxboServiceBreakdown: TrxboServiceBreakdown;
  totals: {
    matches: number;
    boOnly: number;
    partnerOnly: number;
    mismatches: number;
    totalBoRecords: number;
    totalPartnerRecords: number;
  };
}

@Injectable({ providedIn: 'root' })
export class CertificationSoldeService {
  private static readonly OPPART_TYPE_KEYS = [
    'Type',
    'type',
    'Type Opération',
    'Type Operation',
    'Type operation',
    'typeOperation',
    'Type_Operation',
    'type_operation'
  ];

  private readonly compteSoldeBoUrl = '/api/compte-solde-bo';
  private readonly compteSoldeClotureUrl = '/api/compte-solde-cloture';

  constructor(private http: HttpClient) {}

  compute(context: CertificationSoldeContext): CertificationSoldeComputed {
    const { response, partnerData, boData, fraisConfigs = [], dateDe, dateAu } = context;
    const { aggregates, regularisationDetails } = this.buildAggregates(response, boData, fraisConfigs);
    const volumeMatches = this.sumMatchVolumes(response);
    const volumeEcartBo = this.sumVolumeEcartBo(aggregates);
    const volumeEcartPartner = this.sumVolumeEcartPartner(aggregates);
    const totalRegularisation = regularisationDetails.reduce((s, d) => s + d.montantARegulariser, 0);

    const mouvementNetOppart = this.extractOppartMouvementNet(partnerData);
    const soldesPeriode = this.extractOppartSoldesPeriode(partnerData, dateDe, dateAu);
    const oppartOperationBreakdown = this.extractOppartOperationBreakdown(partnerData);
    const trxboServiceBreakdown = this.extractTrxboServiceBreakdown(boData);
    const debitCredit = this.extractDebitCredit(partnerData);

    const fraisAttendu = trxboServiceBreakdown.hasData
      ? trxboServiceBreakdown.rows.reduce((sum, r) => sum + this.calculateFrais(fraisConfigs, r.service, '', r.volume), 0)
      : null;

    return {
      soldeOuvertureOppart: soldesPeriode.ouverture,
      soldeClotureOppart: soldesPeriode.cloture,
      mouvementNetOppart,
      fraisAttendu,
      totalDebit: debitCredit.debit,
      totalCredit: debitCredit.credit,
      volumeMatches,
      volumeEcartBo,
      volumeEcartPartner,
      totalRegularisation,
      aggregates,
      regularisationDetails,
      oppartOperationBreakdown,
      trxboServiceBreakdown,
      totals: {
        matches: response.totalMatches ?? response.matches?.length ?? 0,
        boOnly: response.totalBoOnly ?? response.boOnly?.length ?? 0,
        partnerOnly: response.totalPartnerOnly ?? response.partnerOnly?.length ?? 0,
        mismatches: response.totalMismatches ?? response.mismatches?.length ?? 0,
        totalBoRecords: response.totalBoRecords ?? 0,
        totalPartnerRecords: response.totalPartnerRecords ?? 0
      }
    };
  }

  computeVariation(soldeOuverture: number | null, soldeCloture: number | null): number | null {
    if (soldeOuverture == null || soldeCloture == null || Number.isNaN(soldeOuverture) || Number.isNaN(soldeCloture)) {
      return null;
    }
    return soldeCloture - soldeOuverture;
  }

  computeEcartCertification(variation: number | null, mouvementNetOppart: number): number | null {
    if (variation == null) {
      return null;
    }
    return variation - mouvementNetOppart;
  }

  hasRegularisationDetails(row: EcartAggregateRow): boolean {
    return ['TSOP', 'ECART_PARTNER', 'TRXSF_PARTNER'].includes(row.code) && row.details.length > 0;
  }

  /** TSOP → montant à régulariser ; ECART_BO → volume montant TRXBO. */
  private sumVolumeEcartBo(aggregates: EcartAggregateRow[]): number {
    return aggregates.reduce((sum, row) => {
      if (row.code === 'TSOP') {
        return sum + row.montantARegulariser;
      }
      if (row.code === 'ECART_BO') {
        return sum + row.volume;
      }
      return sum;
    }, 0);
  }

  /** ECART partenaire → montant OPPART ; TRX SF → frais uniquement ; RGFRAIS → volume. */
  private sumVolumeEcartPartner(aggregates: EcartAggregateRow[]): number {
    return aggregates.reduce((sum, row) => {
      if (row.code === 'ECART_PARTNER' || row.code === 'TRXSF_PARTNER') {
        return sum + row.montantARegulariser;
      }
      if (row.code === 'RGFRAIS') {
        return sum + row.volume;
      }
      return sum;
    }, 0);
  }

  saveSoldeOuverture(numeroCompte: string, dateSolde: string, soldeBo: number): Observable<unknown> {
    return this.http.post(`${this.compteSoldeBoUrl}/set`, { numeroCompte, dateSolde, soldeBo });
  }

  saveSoldeCloture(numeroCompte: string, dateSolde: string, soldeCloture: number): Observable<unknown> {
    return this.http.post(`${this.compteSoldeClotureUrl}/set`, { numeroCompte, dateSolde, soldeCloture });
  }

  async loadSoldeOuverture(numeroCompte: string, dateSolde: string): Promise<number | null> {
    if (!numeroCompte?.trim()) return null;
    try {
      const value = await firstValueFrom(
        this.http.get<number | null>(`${this.compteSoldeBoUrl}/get`, {
          params: { numeroCompte, dateSolde }
        })
      );
      return value == null ? null : Number(value);
    } catch {
      return null;
    }
  }

  async loadSoldeCloture(numeroCompte: string, dateSolde: string): Promise<number | null> {
    if (!numeroCompte?.trim()) return null;
    try {
      const value = await firstValueFrom(
        this.http.get<number | null>(`${this.compteSoldeClotureUrl}/get`, {
          params: { numeroCompte, dateSolde }
        })
      );
      return value == null ? null : Number(value);
    } catch {
      return null;
    }
  }

  private buildAggregates(
    response: ReconciliationResponse,
    boData: Record<string, string>[],
    fraisConfigs: FraisTransaction[]
  ): { aggregates: EcartAggregateRow[]; regularisationDetails: EcartDetailLine[] } {
    const map = new Map<string, EcartAggregateRow>();
    const regularisationDetails: EcartDetailLine[] = [];
    const boByTransGu = this.buildBoIndex(response, boData);
    const trxsfGuKeysFromBo = new Set<string>();

    const upsertSimple = (code: string, label: string, amount: number, frais = 0) => {
      const row = map.get(code) ?? this.emptyAggregate(code, label);
      row.count += 1;
      row.volume += amount;
      row.frais += frais;
      map.set(code, row);
    };

    const pushDetailToAggregate = (code: string, label: string, detail: EcartDetailLine) => {
      regularisationDetails.push(detail);
      const row = map.get(code) ?? this.emptyAggregate(code, label);
      row.count += 1;
      row.volume += detail.montant;
      row.frais += detail.frais;
      row.montantARegulariser += detail.montantARegulariser;
      row.details.push(detail);
      map.set(code, row);
    };

    const buildBoDetail = (
      code: EcartRegularisationType,
      label: string,
      record: Record<string, string>,
      commentaire: string
    ) => {
      const montant = this.parseAmount(record);
      const service = this.extractField(record, ['Service', 'service']);
      const agence = this.extractField(record, ['Agence', 'agence', 'Code proprietaire']);
      const frais = this.calculateFrais(fraisConfigs, service, agence, montant);
      const montantARegulariser = code === 'TSOP' ? montant + frais : frais;

      pushDetailToAggregate(code, label, {
        type: code,
        source: 'BO',
        service,
        agence,
        montant,
        montantBo: montant,
        frais,
        montantARegulariser,
        date: this.extractField(record, ['Date', 'date', 'Date opération', 'Date operation']),
        idTransaction: this.extractField(record, ['IDTransaction', 'ID Transaction', 'idTransaction']),
        numeroTransGu: this.extractNumeroTransGu(record),
        commentaire
      });
    };

    const buildBoTsopDetail = (record: Record<string, string>, commentaire: string) => {
      buildBoDetail('TSOP', 'TSOP (sans correspondance OPPART)', record, commentaire);
    };

    for (const match of response.matches ?? []) {
      const { volume, frais } = this.extractMatchVolumeAndFrais(match.partnerData);
      upsertSimple('MATCHES', 'Correspondances (TRXBO ↔ OPPART)', volume, frais);
    }

    for (const record of response.boOnly ?? []) {
      const comment = this.normalizeComment(record);
      if (comment === 'TRXSF') {
        this.pushTrxsfPartnerFeesDetail({
          boRecord: record,
          partnerRecord: null,
          boByTransGu,
          fraisConfigs,
          map,
          regularisationDetails
        });
        const guKey = this.normalizeTransGuKey(this.extractNumeroTransGu(record));
        if (guKey) {
          trxsfGuKeysFromBo.add(guKey);
        }
      } else if (comment === 'ECART' || comment === 'ÉCART') {
        upsertSimple('ECART_BO', 'Écart BO', this.parseAmount(record));
      } else {
        buildBoTsopDetail(record, comment || 'TSOP');
      }
    }

    for (const record of response.partnerOnly ?? []) {
      const comment = this.normalizeComment(record);
      const typeOp = (
        this.getTypeValue(record)
      ).toUpperCase();

      if (comment === 'TRXSF') {
        const guKey = this.normalizeTransGuKey(this.extractNumeroTransGu(record));
        if (!guKey || !trxsfGuKeysFromBo.has(guKey)) {
          this.pushTrxsfPartnerFeesDetail({
            boRecord: null,
            partnerRecord: record,
            boByTransGu,
            fraisConfigs,
            map,
            regularisationDetails
          });
        }
      } else if (comment === 'ECART' || comment === 'ÉCART') {
        this.buildPartnerEcartDetail(record, map, regularisationDetails, 'ECART_PARTNER', 'Écart Partenaire');
      } else if (typeOp.includes('FRAIS') || comment === 'RGFRAIS') {
        upsertSimple('RGFRAIS', 'RGFRAIS / Frais transaction', this.parseAmount(record));
      } else {
        this.buildPartnerEcartDetail(record, map, regularisationDetails, 'ECART_PARTNER', 'Écart Partenaire');
      }
    }

    for (const record of response.mismatches ?? []) {
      upsertSimple('MISMATCH', 'Correspondances multiples (>2 OPPART)', this.parseAmount(record));
    }

    const order = ['MATCHES', 'TSOP', 'ECART_BO', 'RGFRAIS', 'TRXSF_PARTNER', 'ECART_PARTNER', 'MISMATCH'];
    const aggregates = order.filter(code => map.has(code)).map(code => map.get(code)!);
    return { aggregates, regularisationDetails };
  }

  private buildPartnerEcartDetail(
    record: Record<string, string>,
    map: Map<string, EcartAggregateRow>,
    regularisationDetails: EcartDetailLine[],
    code: 'ECART_PARTNER',
    label: string
  ): void {
    const montant = this.parseAmount(record);
    const service = this.extractField(record, ['Service', 'service', 'Type Opération', 'Type Operation']);
    const agence = this.extractField(record, ['Agence', 'agence', 'Code proprietaire']);
    const commentaire = this.normalizeComment(record) || 'Ecart';

    const detail: EcartDetailLine = {
      type: code,
      source: 'PARTNER',
      service,
      agence,
      montant,
      montantBo: null,
      frais: 0,
      montantARegulariser: montant,
      date: this.extractField(record, ['Date opération', 'Date operation', 'Date', 'date']),
      idTransaction: this.extractField(record, ['ID Transaction', 'IDTransaction', 'idTransaction']),
      numeroTransGu: this.extractNumeroTransGu(record),
      commentaire
    };

    regularisationDetails.push(detail);
    const row = map.get(code) ?? this.emptyAggregate(code, label);
    row.count += 1;
    row.volume += montant;
    row.montantARegulariser += montant;
    row.details.push(detail);
    map.set(code, row);
  }

  private pushTrxsfPartnerFeesDetail(params: {
    boRecord: Record<string, string> | null;
    partnerRecord: Record<string, string> | null;
    boByTransGu: Map<string, Record<string, string>>;
    fraisConfigs: FraisTransaction[];
    map: Map<string, EcartAggregateRow>;
    regularisationDetails: EcartDetailLine[];
  }): void {
    const { boRecord, partnerRecord, boByTransGu, fraisConfigs, map, regularisationDetails } = params;
    const sourceRecord = partnerRecord ?? boRecord;
    if (!sourceRecord) {
      return;
    }

    const numeroTransGu = this.extractNumeroTransGu(sourceRecord);
    const resolvedBoRecord = boRecord ?? this.findBoRecord(boByTransGu, numeroTransGu);
    const montantPartner = partnerRecord ? this.parseAmount(partnerRecord) : this.parseAmount(resolvedBoRecord ?? sourceRecord);
    const montantBo = resolvedBoRecord ? this.parseAmount(resolvedBoRecord) : montantPartner;
    const service = resolvedBoRecord
      ? this.extractField(resolvedBoRecord, ['Service', 'service'])
      : this.extractField(sourceRecord, ['Service', 'service', 'Type Opération', 'Type Operation']);
    const agence = resolvedBoRecord
      ? this.extractField(resolvedBoRecord, ['Agence', 'agence'])
      : this.extractField(sourceRecord, ['Agence', 'agence', 'Code proprietaire']);
    const frais = this.calculateFrais(fraisConfigs, service, agence, montantBo);

    const detail: EcartDetailLine = {
      type: 'TRXSF_PARTNER',
      source: partnerRecord ? 'PARTNER' : 'BO',
      service,
      agence,
      montant: montantPartner,
      montantBo: resolvedBoRecord ? montantBo : null,
      frais,
      montantARegulariser: frais,
      date: this.extractField(sourceRecord, ['Date opération', 'Date operation', 'Date', 'date']),
      idTransaction: this.extractField(sourceRecord, ['ID Transaction', 'IDTransaction', 'idTransaction']),
      numeroTransGu,
      commentaire: 'TRXSF'
    };

    regularisationDetails.push(detail);
    const row = map.get('TRXSF_PARTNER') ?? this.emptyAggregate('TRXSF_PARTNER', 'TRX SF (frais → écart partenaire)');
    row.count += 1;
    row.volume += montantPartner;
    row.frais += frais;
    row.montantARegulariser += frais;
    row.details.push(detail);
    map.set('TRXSF_PARTNER', row);
  }

  private buildBoIndex(
    response: ReconciliationResponse,
    boData: Record<string, string>[]
  ): Map<string, Record<string, string>> {
    const index = new Map<string, Record<string, string>>();
    const allBoRecords: Record<string, string>[] = [
      ...(response.boOnly ?? []),
      ...(response.mismatches ?? []),
      ...(response.matches ?? []).map(m => m.boData),
      ...(boData ?? [])
    ];

    for (const record of allBoRecords) {
      const key = this.normalizeTransGuKey(this.extractNumeroTransGu(record));
      if (key && !index.has(key)) {
        index.set(key, record);
      }
    }
    return index;
  }

  private findBoRecord(
    boByTransGu: Map<string, Record<string, string>>,
    numeroTransGu: string
  ): Record<string, string> | null {
    const key = this.normalizeTransGuKey(numeroTransGu);
    if (!key) return null;
    return boByTransGu.get(key) ?? null;
  }

  private extractNumeroTransGu(record: Record<string, string>): string {
    return this.extractField(record, [
      'Numéro Trans GU',
      'Numero Trans GU',
      'numeroTransGU',
      'numero_trans_gu',
      'NUMERO_TRANS_GU'
    ]);
  }

  private normalizeTransGuKey(value: string): string {
    return (value || '').trim().toUpperCase().replace(/\s/g, '');
  }

  private emptyAggregate(code: string, label: string): EcartAggregateRow {
    return {
      code,
      label,
      count: 0,
      volume: 0,
      frais: 0,
      montantARegulariser: 0,
      details: []
    };
  }

  private calculateFrais(
    fraisConfigs: FraisTransaction[],
    service: string,
    agence: string,
    montant: number
  ): number {
    if (!fraisConfigs?.length) {
      return 0;
    }

    const normalizeKey = (s: string) => (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();

    const nService = normalizeKey(service);
    const nAgence = normalizeKey(agence);

    const matchExact = fraisConfigs.find(f =>
      normalizeKey(f.service) === nService &&
      normalizeKey(f.agence) === nAgence &&
      f.actif
    );
    const matchServiceOnly = fraisConfigs.find(f =>
      normalizeKey(f.service) === nService && f.actif
    );
    const matchAgenceOnly = fraisConfigs.find(f =>
      normalizeKey(f.agence) === nAgence && f.actif
    );
    const matchServiceContains = fraisConfigs.find(f =>
      nService.includes(normalizeKey(f.service)) && f.actif
    );

    const scored = fraisConfigs
      .filter(f => f.actif)
      .map(f => {
        const ns = normalizeKey(f.service);
        let score = 0;
        if (nService.includes(ns)) score = ns.length;
        else if (ns.includes(nService)) score = nService.length - 1;
        return { f, score };
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score);

    const config = matchExact || matchServiceOnly || matchAgenceOnly || matchServiceContains || scored[0]?.f;
    if (!config) {
      return 0;
    }

    if (config.typeCalcul === 'POURCENTAGE' && config.pourcentage) {
      return Math.round((montant * (config.pourcentage / 100)) * 100) / 100;
    }
    return config.montantFrais || 0;
  }

  private extractField(record: Record<string, string>, candidates: string[]): string {
    for (const candidate of candidates) {
      if (record[candidate] != null && String(record[candidate]).trim()) {
        return String(record[candidate]).trim();
      }
    }
    const keys = Object.keys(record);
    for (const candidate of candidates) {
      const normalized = candidate.toLowerCase().replace(/\s/g, '');
      const match = keys.find(k => k.toLowerCase().replace(/\s/g, '') === normalized);
      if (match && String(record[match]).trim()) {
        return String(record[match]).trim();
      }
    }
    return '';
  }

  private sumMatchVolumes(response: ReconciliationResponse): number {
    return (response.matches ?? []).reduce((sum, m) => sum + this.extractMatchVolumeAndFrais(m.partnerData).volume, 0);
  }

  /** Classe une ligne OPPART appariée : IMPACT_COMPTE_GENERAL → volume, FRAIS_TRANSACTION → frais (sommes signées, aucune valeur absolue). */
  private extractMatchVolumeAndFrais(record: Record<string, string> | undefined): { volume: number; frais: number } {
    if (!record) {
      return { volume: 0, frais: 0 };
    }

    let volume = 0;
    let frais = 0;
    let found = false;

    for (const sub of this.splitPartnerData(record)) {
      const montantKey = this.findColumn(sub, ['Montant', 'montant', 'Montant Transaction', 'montantTransaction']);
      if (!montantKey) {
        continue;
      }
      const montant = this.parseNumeric(sub[montantKey]) ?? 0;
      const typeKey = this.findColumn(sub, CertificationSoldeService.OPPART_TYPE_KEYS);
      const type = typeKey ? String(sub[typeKey] ?? '').trim().toUpperCase().replace(/[\s_\-]/g, '') : '';
      found = true;
      if (type === 'FRAISTRANSACTION') {
        frais += montant;
      } else {
        volume += montant;
      }
    }

    if (!found) {
      return { volume: this.parseAmount(record), frais: 0 };
    }
    return { volume, frais };
  }

  /** Splitte un partnerData fusionné (clés `Type_PARTNER_1`, `Montant_PARTNER_1`, ...) en sous-enregistrements OPPART distincts. */
  private splitPartnerData(record: Record<string, string>): Record<string, string>[] {
    const groups = new Map<string, Record<string, string>>();
    const suffixRegex = /_PARTNER_(\d+)$/i;

    for (const [key, value] of Object.entries(record)) {
      const match = key.match(suffixRegex);
      if (match) {
        const index = match[1];
        const baseKey = key.slice(0, key.length - match[0].length);
        const group = groups.get(index) ?? {};
        group[baseKey] = value;
        groups.set(index, group);
      } else {
        const group = groups.get('__raw__') ?? {};
        group[key] = value;
        groups.set('__raw__', group);
      }
    }

    return Array.from(groups.values());
  }

  private extractOppartMouvementNet(partnerData: Record<string, string>[]): number {
    if (!partnerData?.length) {
      return 0;
    }

    const montantKey = this.findColumn(partnerData[0], ['Montant', 'montant']);
    if (!montantKey) {
      return 0;
    }

    return partnerData.reduce((sum, row) => sum + (this.parseNumeric(row[montantKey]) ?? 0), 0);
  }

  private extractDebitCredit(partnerData: Record<string, string>[]): { debit: number; credit: number } {
    if (!partnerData?.length) {
      return { debit: 0, credit: 0 };
    }

    const montantKey = this.findColumn(partnerData[0], ['Montant', 'montant']);
    if (!montantKey) {
      return { debit: 0, credit: 0 };
    }

    let debit = 0;
    let credit = 0;
    for (const row of partnerData) {
      const montant = this.parseNumeric(row[montantKey]) ?? 0;
      if (montant < 0) {
        debit += montant;
      } else {
        credit += montant;
      }
    }
    return { debit, credit };
  }

  private extractOppartOperationBreakdown(partnerData: Record<string, string>[]): OppartOperationBreakdown {
    if (!partnerData?.length) {
      return { hasData: false, volume: 0, frais: 0, otherTypes: [] };
    }

    const typeKey = this.findColumn(partnerData[0], CertificationSoldeService.OPPART_TYPE_KEYS);
    const montantKey = this.findColumn(partnerData[0], ['Montant', 'montant']);
    if (!typeKey || !montantKey) {
      return { hasData: false, volume: 0, frais: 0, otherTypes: [] };
    }

    const grouped = new Map<string, number>();
    for (const row of partnerData) {
      const type = String(row[typeKey] ?? '').trim() || '(Non renseigné)';
      const montant = this.parseNumeric(row[montantKey]) ?? 0;
      grouped.set(type, (grouped.get(type) ?? 0) + montant);
    }

    const normalizeType = (type: string): string =>
      (type || '').toUpperCase().replace(/[\s_\-]/g, '');

    const entries = Array.from(grouped.entries())
      .map(([type, volume]) => ({ type, volume }));

    const volume = entries
      .filter(e => normalizeType(e.type) === 'IMPACTCOMPTEGENERAL')
      .reduce((sum, e) => sum + e.volume, 0);
    const frais = entries
      .filter(e => normalizeType(e.type) === 'FRAISTRANSACTION')
      .reduce((sum, e) => sum + e.volume, 0);

    const otherTypes = entries
      .filter(e => normalizeType(e.type) !== 'IMPACTCOMPTEGENERAL' && normalizeType(e.type) !== 'FRAISTRANSACTION')
      .sort((a, b) => b.volume - a.volume);

    return { hasData: true, volume, frais, otherTypes };
  }

  private extractTrxboServiceBreakdown(boData: Record<string, string>[]): TrxboServiceBreakdown {
    if (!boData?.length) {
      return { hasData: false, rows: [], totalCount: 0, totalVolume: 0 };
    }

    const grouped = new Map<string, { count: number; volume: number }>();
    for (const row of boData) {
      const service = this.extractField(row, ['Service', 'service']) || '(Non renseigné)';
      const current = grouped.get(service) ?? { count: 0, volume: 0 };
      current.count += 1;
      current.volume += this.parseAmount(row);
      grouped.set(service, current);
    }

    const rows = Array.from(grouped.entries())
      .map(([service, { count, volume }]) => ({ service, count, volume }))
      .sort((a, b) => b.volume - a.volume);

    const totalCount = rows.reduce((sum, r) => sum + r.count, 0);
    const totalVolume = rows.reduce((sum, r) => sum + r.volume, 0);

    return { hasData: rows.length > 0, rows, totalCount, totalVolume };
  }

  private extractOppartSoldesPeriode(
    partnerData: Record<string, string>[],
    dateDe?: string,
    dateAu?: string
  ): {
    ouverture: number | null;
    cloture: number | null;
  } {
    if (!partnerData?.length) {
      return { ouverture: null, cloture: null };
    }

    const avantKey = this.findColumn(partnerData[0], ['Solde avant', 'soldeAvant', 'Solde_avant']);
    const apresKey = this.findColumn(partnerData[0], ['Solde aprés', 'Solde apres', 'Solde après', 'soldeApres', 'Solde_apres']);
    const dateOpKey = this.findColumn(partnerData[0], ['Date opération', 'Date operation', 'Date', 'date']);

    const hasDateRange = !!(dateDe && dateAu && dateOpKey);
    const rowsInRange = hasDateRange
      ? partnerData.filter(row => this.isRowInDateRange(row, dateOpKey, dateDe!, dateAu!))
      : partnerData;

    if (!rowsInRange.length) {
      return { ouverture: null, cloture: null };
    }

    if (hasDateRange && avantKey && apresKey) {
      const rowsOpeningDay = rowsInRange.filter(row => this.extractIsoDay(row[dateOpKey!]) === dateDe);
      const rowsClosingDay = rowsInRange.filter(row => this.extractIsoDay(row[dateOpKey!]) === dateAu);

      const ouverture = rowsOpeningDay.length
        ? this.parseNumeric(rowsOpeningDay[0][avantKey])
        : this.parseNumeric(rowsInRange[0][avantKey]);

      const closingSource = rowsClosingDay.length ? rowsClosingDay : rowsInRange;
      const cloture = this.parseNumeric(closingSource[closingSource.length - 1][apresKey]);

      return { ouverture, cloture };
    }

    let minAvant: number | null = null;
    let maxApres: number | null = null;

    for (const row of rowsInRange) {
      if (avantKey) {
        const v = this.parseNumeric(row[avantKey]);
        if (v != null && (minAvant == null || v < minAvant)) minAvant = v;
      }
      if (apresKey) {
        const v = this.parseNumeric(row[apresKey]);
        if (v != null && (maxApres == null || v > maxApres)) maxApres = v;
      }
    }

    return { ouverture: minAvant, cloture: maxApres };
  }

  private isRowInDateRange(
    row: Record<string, string>,
    dateOpKey: string,
    dateDe: string,
    dateAu: string
  ): boolean {
    const day = this.extractIsoDay(row[dateOpKey]);
    return !!day && day >= dateDe && day <= dateAu;
  }

  private extractIsoDay(value: string | undefined | null): string | null {
    if (value == null || value === '') return null;
    const raw = String(value).trim();

    const isoMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoMatch) return isoMatch[1];

    const frMatch = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (frMatch) {
      const dd = frMatch[1].padStart(2, '0');
      const mm = frMatch[2].padStart(2, '0');
      return `${frMatch[3]}-${mm}-${dd}`;
    }

    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return this.formatIsoDate(parsed);
    }

    return null;
  }

  private formatIsoDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private findColumn(row: Record<string, string>, candidates: string[]): string | null {
    const keys = Object.keys(row);
    for (const candidate of candidates) {
      const exact = keys.find(k => k === candidate);
      if (exact) return exact;
    }
    for (const candidate of candidates) {
      const fuzzy = keys.find(k => k.toLowerCase().replace(/\s/g, '') === candidate.toLowerCase().replace(/\s/g, ''));
      if (fuzzy) return fuzzy;
    }
    return null;
  }

  private normalizeComment(record: Record<string, string>): string {
    return String(record['Commentaire'] || record['commentaire'] || '').trim().toUpperCase();
  }

  private getTypeValue(record: Record<string, string>): string {
    const typeKey = this.findColumn(record, CertificationSoldeService.OPPART_TYPE_KEYS);
    return typeKey ? String(record[typeKey] ?? '').trim() : '';
  }

  private parseAmount(record: Record<string, string> | undefined): number {
    if (!record) return 0;
    const keys = ['Montant', 'montant', 'Montant Transaction', 'montantTransaction'];
    for (const key of keys) {
      if (record[key] != null && record[key] !== '') {
        return this.parseNumeric(record[key]) ?? 0;
      }
    }
    for (const [key, value] of Object.entries(record)) {
      if (/montant/i.test(key) && value) {
        return this.parseNumeric(value) ?? 0;
      }
    }
    return 0;
  }

  private parseNumeric(value: string | number | undefined | null): number | null {
    if (value == null || value === '') return null;
    const normalized = String(value).replace(/\s/g, '').replace(',', '.');
    const n = parseFloat(normalized);
    return Number.isNaN(n) ? null : n;
  }
}
