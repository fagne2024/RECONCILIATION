import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface BoPartenaireControleInterneRecord {
  id?: number;
  monthYyyyMm: string;
  country: string;
  env: string;
  service: string;
  statut: 'EN_COURS_VALIDATION' | 'VALIDE';
  validatedBy?: string;
  validatedAt?: string;
}

export interface BoPartenaireControleInterneValidatePayload {
  monthYyyyMm: string;
  country: string;
  env: string;
  service: string;
}

@Injectable({ providedIn: 'root' })
export class BoPartenaireControleInterneService {
  private readonly baseUrl = '/api/bo-partenaire-controle-interne';

  constructor(private http: HttpClient) {}

  list(params: {
    country: string;
    env: string;
    startMonth: string;
    endMonth: string;
  }): Observable<BoPartenaireControleInterneRecord[]> {
    const headers = new HttpHeaders({ 'X-Permission-Module': 'Résultats' });
    const q = new URLSearchParams({
      country: params.country,
      env: params.env,
      startMonth: params.startMonth,
      endMonth: params.endMonth
    });
    return this.http.get<BoPartenaireControleInterneRecord[]>(`${this.baseUrl}?${q}`, { headers });
  }

  validate(payload: BoPartenaireControleInterneValidatePayload): Observable<BoPartenaireControleInterneRecord> {
    const headers = new HttpHeaders({ 'X-Permission-Module': 'Résultats' });
    return this.http.post<BoPartenaireControleInterneRecord>(`${this.baseUrl}/validate`, payload, { headers });
  }

  revoke(payload: BoPartenaireControleInterneValidatePayload): Observable<BoPartenaireControleInterneRecord> {
    const headers = new HttpHeaders({ 'X-Permission-Module': 'Résultats' });
    return this.http.post<BoPartenaireControleInterneRecord>(`${this.baseUrl}/revoke`, payload, { headers });
  }
}
