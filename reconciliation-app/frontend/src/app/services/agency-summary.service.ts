import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AgencySummaryService {
  private apiUrl = `${environment.apiUrl}/agency-summary`;

  constructor(private http: HttpClient) { }

  getAllSummaries(): Observable<any> {
    return this.http.get(`${this.apiUrl}/all`);
  }

  exportAllSummaries(): Observable<any> {
    return this.http.get(`${this.apiUrl}/export`);
  }

  deleteSummary(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  saveSelectedSummaries(summaries: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/save-selected`, summaries);
  }
} 