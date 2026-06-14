import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { ReconciliationResponse } from '../models/reconciliation-response.model';

export interface EcartAggregateRow {
  code: string;
  label: string;
  count: number;
  volume: number;
}

export interface CertificationSoldeContext {
  response: ReconciliationResponse;
  partnerData: Record<string, string>[];
  boData: Record<string, string>[];
}

export interface CertificationSoldeComputed {
  soldeOuvertureOppart: number | null;
  soldeClotureOppart: number | null;
  mouvementNetOppart: number;
  volumeMatches: number;
  volumeEcartBo: number;
  volumeEcartPartner: number;
  aggregates: EcartAggregateRow[];
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
  private readonly compteSoldeBoUrl = '/api/compte-solde-bo';
  private readonly compteSoldeClotureUrl = '/api/compte-solde-cloture';

  constructor(private http: HttpClient) {}

  compute(context: CertificationSoldeContext): CertificationSoldeComputed {
    const { response, partnerData } = context;
    const aggregates = this.buildAggregates(response);
    const volumeMatches = this.sumMatchVolumes(response);
    const volumeEcartBo = aggregates
      .filter(a => ['TSOP', 'TRXSF', 'ECART_BO'].includes(a.code))
      .reduce((s, a) => s + a.volume, 0);
    const volumeEcartPartner = aggregates
      .filter(a => ['ECART_PARTNER', 'RGFRAIS', 'TRXSF_PARTNER'].includes(a.code))
      .reduce((s, a) => s + a.volume, 0);

    const soldesOppart = this.extractOppartSoldes(partnerData);

    return {
      soldeOuvertureOppart: soldesOppart.ouverture,
      soldeClotureOppart: soldesOppart.cloture,
      mouvementNetOppart: soldesOppart.mouvementNet,
      volumeMatches,
      volumeEcartBo,
      volumeEcartPartner,
      aggregates,
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

  computeEcartCertification(
    variation: number | null,
    mouvementNetOppart: number,
    volumeEcartBo: number,
    volumeEcartPartner: number
  ): number | null {
    if (variation == null) {
      return null;
    }
    const ecartsNonSoldes = volumeEcartBo + volumeEcartPartner;
    return variation - mouvementNetOppart - ecartsNonSoldes;
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

  private buildAggregates(response: ReconciliationResponse): EcartAggregateRow[] {
    const map = new Map<string, EcartAggregateRow>();

    const upsert = (code: string, label: string, amount: number) => {
      const row = map.get(code) ?? { code, label, count: 0, volume: 0 };
      row.count += 1;
      row.volume += amount;
      map.set(code, row);
    };

    for (const match of response.matches ?? []) {
      upsert('MATCHES', 'Correspondances (TRXBO ↔ OPPART)', this.parseAmount(match.boData));
    }

    for (const record of response.boOnly ?? []) {
      const comment = this.normalizeComment(record);
      if (comment === 'TRXSF') {
        upsert('TRXSF', 'TRXSF (1 OPPART / clé BO)', this.parseAmount(record));
      } else if (comment === 'ECART' || comment === 'ÉCART') {
        upsert('ECART_BO', 'Écart BO', this.parseAmount(record));
      } else {
        upsert('TSOP', 'TSOP (sans correspondance OPPART)', this.parseAmount(record));
      }
    }

    for (const record of response.partnerOnly ?? []) {
      const comment = this.normalizeComment(record);
      const typeOp = (record['Type Opération'] || record['Type Operation'] || record['typeOperation'] || '').toUpperCase();
      if (comment === 'TRXSF') {
        upsert('TRXSF_PARTNER', 'TRXSF Partenaire', this.parseAmount(record));
      } else if (typeOp.includes('FRAIS') || comment === 'RGFRAIS') {
        upsert('RGFRAIS', 'RGFRAIS / Frais transaction', this.parseAmount(record));
      } else if (comment === 'ECART' || comment === 'ÉCART') {
        upsert('ECART_PARTNER', 'Écart Partenaire', this.parseAmount(record));
      } else {
        upsert('ECART_PARTNER', 'Écart Partenaire', this.parseAmount(record));
      }
    }

    for (const record of response.mismatches ?? []) {
      upsert('MISMATCH', 'Correspondances multiples (>2 OPPART)', this.parseAmount(record));
    }

    const order = ['MATCHES', 'TSOP', 'TRXSF', 'ECART_BO', 'RGFRAIS', 'TRXSF_PARTNER', 'ECART_PARTNER', 'MISMATCH'];
    return order
      .filter(code => map.has(code))
      .map(code => map.get(code)!);
  }

  private sumMatchVolumes(response: ReconciliationResponse): number {
    return (response.matches ?? []).reduce((sum, m) => sum + this.parseAmount(m.boData), 0);
  }

  private extractOppartSoldes(partnerData: Record<string, string>[]): {
    ouverture: number | null;
    cloture: number | null;
    mouvementNet: number;
  } {
    if (!partnerData?.length) {
      return { ouverture: null, cloture: null, mouvementNet: 0 };
    }

    const avantKey = this.findColumn(partnerData[0], ['Solde avant', 'soldeAvant', 'Solde_avant']);
    const apresKey = this.findColumn(partnerData[0], ['Solde aprés', 'Solde apres', 'Solde après', 'soldeApres', 'Solde_apres']);
    const montantKey = this.findColumn(partnerData[0], ['Montant', 'montant']);

    let minAvant: number | null = null;
    let maxApres: number | null = null;
    let mouvementNet = 0;

    for (const row of partnerData) {
      if (avantKey) {
        const v = this.parseNumeric(row[avantKey]);
        if (v != null && (minAvant == null || v < minAvant)) minAvant = v;
      }
      if (apresKey) {
        const v = this.parseNumeric(row[apresKey]);
        if (v != null && (maxApres == null || v > maxApres)) maxApres = v;
      }
      if (montantKey) {
        mouvementNet += this.parseNumeric(row[montantKey]) ?? 0;
      }
    }

    return { ouverture: minAvant, cloture: maxApres, mouvementNet };
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
