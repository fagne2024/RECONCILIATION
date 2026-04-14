import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AgencySummaryService {
  private apiUrl = '/api/agency-summary';

  constructor(private http: HttpClient) { }

  private buildContextHeaders(moduleContext?: string): HttpHeaders | undefined {
    return moduleContext ? new HttpHeaders({ 'X-Permission-Module': moduleContext }) : undefined;
  }

  getAllSummaries(moduleContext?: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/all`, {
      headers: this.buildContextHeaders(moduleContext)
    });
  }

  exportAllSummaries(moduleContext?: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/export`, {
      headers: this.buildContextHeaders(moduleContext)
    });
  }

  deleteSummary(id: number, moduleContext?: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, {
      headers: this.buildContextHeaders(moduleContext)
    });
  }


} 