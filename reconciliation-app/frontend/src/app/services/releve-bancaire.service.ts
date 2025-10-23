import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ReleveBancaireRow, ReleveUploadResponse } from '../models/releve-bancaire.model';

@Injectable({ providedIn: 'root' })
export class ReleveBancaireService {
  private apiUrl = `${environment.apiUrl}/releve-bancaire`;

  constructor(private http: HttpClient) {}

  upload(file: File): Observable<ReleveUploadResponse> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<ReleveUploadResponse>(`${this.apiUrl}/upload`, form);
  }

  list(batchId?: string): Observable<any> {
    const url = batchId ? `${this.apiUrl}/list?batchId=${encodeURIComponent(batchId)}` : `${this.apiUrl}/list`;
    return this.http.get<any>(url);
  }

  update(id: number, payload: Partial<ReleveBancaireRow>): Observable<ReleveBancaireRow> {
    return this.http.put<ReleveBancaireRow>(`${this.apiUrl}/${id}`, payload);
  }

  updateReconStatus(id: number, status: 'OK' | 'KO'): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/recon-status?status=${encodeURIComponent(status)}`, {});
  }

  delete(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/delete`, {});
  }

  downloadTemplate(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/template`, { responseType: 'blob' });
  }
}


