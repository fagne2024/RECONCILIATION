import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

export interface EcartBoSummary {
  id?: number;
  dateTransaction: string;
  agence: string;
  service: string;
  pays: string;
  nombreTransactions: number;
  montantTotal: number;
  statut: string;
  dateImport?: string;
  commentaire?: string;
  env?: string;
  /** Environnement technique (BET, HT, PROD, etc.) */
  envCode?: string | null;
  token?: string;
}

export interface EcartBoSummaryFilter {
  agence?: string;
  service?: string;
  pays?: string;
  statut?: string;
  token?: string;
  startDate?: string;
  endDate?: string;
  env?: string;
  platform?: string;
}

/** Données préremplies depuis la page /matches pour le formulaire "Ajouter une nouvelle ligne" */
export interface EcartBoSummaryPrefill {
  date: string;
  agence: string;
  service: string;
  pays: string;
  nombre: number;
  volume: number;
}

/** Contexte d’origine pour la valeur par défaut d’ENV dans le formulaire d’ajout */
export type EcartBoSummarySource = 'ecart-bo' | 'matches';

/** Ligne en attente depuis la page écarts BO (multi-agence) : rien n'est enregistré tant que l'utilisateur ne clique pas sur Sauvegarder sur ecart-bo-summary. */
export interface EcartBoSummaryPendingLine {
  agence: string;
  service: string;
  pays: string;
  montant: number;
  date: string;
  statut: string;
  nombreTransactions: number;
}

@Injectable({
  providedIn: 'root'
})
export class EcartBoSummaryService {
  private apiUrl = '/api/ecart-bo-summary';
  private readonly resultsHeaders = new HttpHeaders({ 'X-Permission-Module': 'Résultats' });
  /** Retries après 429 (rate limit backend / proxy) — backoff exponentiel */
  private static readonly MAX_429_RETRIES = 6;
  private prefillFromMatches: EcartBoSummaryPrefill | null = null;
  /** Lignes en attente depuis écarts BO (multi-agence) : affichées sur ecart-bo-summary, enregistrées uniquement au clic sur Sauvegarder. */
  private pendingLinesFromEcartBo: EcartBoSummaryPendingLine[] | null = null;
  /** ENV par défaut dans le formulaire "Ajouter" : BO si on vient des écarts BO, PARTENAIRE si on vient des correspondances. */
  private defaultEnvForAddModal: 'BO' | 'PARTENAIRE' = 'PARTENAIRE';

  constructor(private http: HttpClient) { }

  /**
   * Réessaie automatiquement sur 429 (Too Many Requests) avec délai croissant.
   */
  private with429Retry<T>(factory: () => Observable<T>, attempt = 0): Observable<T> {
    return factory().pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 429 && attempt < EcartBoSummaryService.MAX_429_RETRIES) {
          const delayMs = Math.min(1500 * Math.pow(2, attempt), 30000);
          return timer(delayMs).pipe(switchMap(() => this.with429Retry(factory, attempt + 1)));
        }
        return throwError(() => err);
      })
    );
  }

  /**
   * Définit les données à préremplir et le contexte (écarts BO ou correspondances).
   * Contexte utilisé pour ENV par défaut : écarts BO → BO, correspondances → PARTENAIRE.
   */
  setPrefillFromMatches(data: EcartBoSummaryPrefill | null, source?: EcartBoSummarySource): void {
    this.prefillFromMatches = data;
    if (source === 'ecart-bo') {
      this.defaultEnvForAddModal = 'BO';
    } else if (source === 'matches') {
      this.defaultEnvForAddModal = 'PARTENAIRE';
    }
  }

  /** Définit les lignes en attente depuis écarts BO (aucun enregistrement : l'utilisateur sauvegarde sur ecart-bo-summary). */
  setPendingLinesFromEcartBo(lines: EcartBoSummaryPendingLine[], source?: EcartBoSummarySource): void {
    this.pendingLinesFromEcartBo = lines;
    if (source === 'ecart-bo') {
      this.defaultEnvForAddModal = 'BO';
    }
  }

  /** Récupère et consomme les données de préremplissage (utilisé par ecart-bo-summary au chargement). */
  getAndClearPrefillFromMatches(): EcartBoSummaryPrefill | null {
    const data = this.prefillFromMatches;
    this.prefillFromMatches = null;
    return data;
  }

  /** Récupère et consomme les lignes en attente depuis écarts BO (utilisé par ecart-bo-summary au chargement). */
  getAndClearPendingLinesFromEcartBo(): EcartBoSummaryPendingLine[] | null {
    const data = this.pendingLinesFromEcartBo;
    this.pendingLinesFromEcartBo = null;
    return data;
  }

  /** Valeur par défaut d’ENV pour le formulaire "Ajouter une ligne" selon la page d’origine. */
  getDefaultEnvForAddModal(): 'BO' | 'PARTENAIRE' {
    return this.defaultEnvForAddModal;
  }

  getEcartBoSummaries(filter?: EcartBoSummaryFilter): Observable<EcartBoSummary[]> {
    let params = new HttpParams();

    if (filter) {
      if (filter.agence) {
        params = params.set('agence', filter.agence);
      }
      if (filter.service) {
        params = params.set('service', filter.service);
      }
      if (filter.pays) {
        params = params.set('pays', filter.pays);
      }
      if (filter.statut) {
        params = params.set('statut', filter.statut);
      }
      if (filter.token) {
        params = params.set('token', filter.token);
      }
      if (filter.startDate) {
        params = params.set('startDate', filter.startDate);
      }
      if (filter.endDate) {
        params = params.set('endDate', filter.endDate);
      }
      if (filter.env && filter.env !== 'ALL') {
        params = params.set('env', filter.env);
      }
      if (filter.platform) {
        params = params.set('platform', filter.platform);
      }
    }

    return this.http.get<EcartBoSummary[]>(this.apiUrl, { params, headers: this.resultsHeaders });
  }

  getEcartBoSummaryById(id: number): Observable<EcartBoSummary> {
    return this.http.get<EcartBoSummary>(`${this.apiUrl}/${id}`, { headers: this.resultsHeaders });
  }

  saveEcartBoSummary(summaryData: Array<{
    agence: string;
    service: string;
    pays: string;
    montant: number;
    date: string;
    statut: string;
    nombreTransactions: number;
  }>): Promise<{
    count: number;
    message: string;
    totalReceived: number;
    duplicates: number;
    duplicateRecords?: Array<{
      agence: string;
      service: string;
      pays: string;
      dateTransaction: string;
      statut: string;
      montant: number;
      nombreTransactions: number;
      message: string;
      idExistant: number;
    }>;
  }> {
    return new Promise((resolve, reject) => {
      this.http.post<any>(this.apiUrl, summaryData, { headers: this.resultsHeaders }).subscribe({
        next: (response) => {
          console.log('=== RÉPONSE saveEcartBoSummary ===');
          console.log('DEBUG: Réponse complète:', response);
          resolve({
            count: response.count || 0,
            message: response.message || 'Données sauvegardées avec succès',
            totalReceived: response.totalReceived || summaryData.length,
            duplicates: response.duplicates || 0,
            duplicateRecords: response.duplicateRecords || []
          });
        },
        error: (error) => {
          console.error('=== ERREUR saveEcartBoSummary ===');
          console.error('DEBUG: Erreur complète:', error);
          reject(error);
        }
      });
    });
  }

  updateEcartBoSummary(id: number, summary: Partial<EcartBoSummary>): Observable<EcartBoSummary> {
    return this.with429Retry(() =>
      this.http.put<EcartBoSummary>(`${this.apiUrl}/${id}`, summary, { headers: this.resultsHeaders })
    );
  }

  deleteEcartBoSummary(id: number): Observable<void> {
    return this.with429Retry(() => this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.resultsHeaders }));
  }

  getDistinctAgences(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/agences`, { headers: this.resultsHeaders });
  }

  getDistinctServices(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/services`, { headers: this.resultsHeaders });
  }

  getDistinctPays(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/pays`, { headers: this.resultsHeaders });
  }

  createEcartBoSummary(summary: EcartBoSummary): Observable<any> {
    const dto: any = {
      agence: summary.agence,
      service: summary.service,
      pays: summary.pays,
      montant: summary.montantTotal || 0,
      date: summary.dateTransaction,
      statut: summary.statut,
      nombreTransactions: summary.nombreTransactions,
      commentaire: summary.commentaire || '',
      env: summary.env || 'BO'
    };
    if (summary.token) {
      dto.token = summary.token;
    }
    if (summary.envCode != null && String(summary.envCode).trim() !== '') {
      dto.envCode = String(summary.envCode).trim();
    }
    return this.http.post<any>(this.apiUrl, [dto], { headers: this.resultsHeaders });
  }
}
