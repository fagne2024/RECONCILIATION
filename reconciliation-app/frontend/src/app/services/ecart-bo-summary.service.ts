import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

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
}

export interface EcartBoSummaryFilter {
  agence?: string;
  service?: string;
  pays?: string;
  statut?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EcartBoSummaryService {
  private apiUrl = '/api/ecart-bo-summary';

  constructor(private http: HttpClient) { }

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
    }

    return this.http.get<EcartBoSummary[]>(this.apiUrl, { params });
  }

  getEcartBoSummaryById(id: number): Observable<EcartBoSummary> {
    return this.http.get<EcartBoSummary>(`${this.apiUrl}/${id}`);
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
  }> {
    return new Promise((resolve, reject) => {
      this.http.post<any>(this.apiUrl, summaryData).subscribe({
        next: (response) => {
          console.log('=== RÉPONSE saveEcartBoSummary ===');
          console.log('DEBUG: Réponse complète:', response);
          resolve({
            count: response.count || 0,
            message: response.message || 'Données sauvegardées avec succès'
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
    return this.http.put<EcartBoSummary>(`${this.apiUrl}/${id}`, summary);
  }

  deleteEcartBoSummary(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getDistinctAgences(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/agences`);
  }

  getDistinctServices(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/services`);
  }

  getDistinctPays(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/pays`);
  }

  createEcartBoSummary(summary: EcartBoSummary): Observable<any> {
    const dto = {
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
    return this.http.post<any>(this.apiUrl, [dto]);
  }
}
