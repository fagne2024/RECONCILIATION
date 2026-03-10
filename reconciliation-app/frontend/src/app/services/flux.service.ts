import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface FluxData {
  id?: number;
  agence: string;
  dateDebut: string;
  dateFin: string;
  totalMises: number;
  totalGains: number;
  totalBonus: number;
  payin: number;
  payout: number;
  retenueSurGains: number;
}

@Injectable({ providedIn: 'root' })
export class FluxService {
  private apiUrl = '/api/flux';

  constructor(private http: HttpClient) {}

  getFlux(agence: string, dateDebut: string, dateFin: string): Observable<FluxData | null> {
    const params = new HttpParams()
      .set('agence', agence)
      .set('dateDebut', dateDebut)
      .set('dateFin', dateFin);
    return this.http.get<FluxData | null>(`${this.apiUrl}`, { params });
  }

  saveFlux(flux: FluxData): Observable<FluxData> {
    return this.http.post<FluxData>(`${this.apiUrl}`, flux);
  }

  updateFlux(flux: FluxData): Observable<FluxData> {
    return this.http.put<FluxData>(`${this.apiUrl}`, flux);
  }
}
