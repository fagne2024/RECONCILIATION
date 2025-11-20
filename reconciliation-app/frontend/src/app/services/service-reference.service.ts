import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ServiceReference, ServiceReferencePayload, ServiceReferenceDashboard } from '../models/service-reference.model';

@Injectable({
    providedIn: 'root'
})
export class ServiceReferenceService {
    private readonly apiUrl = '/api/service-references';

    constructor(private http: HttpClient) {}

    listAll(): Observable<ServiceReference[]> {
        return this.http.get<ServiceReference[]>(this.apiUrl);
    }

    getByPays(pays: string): Observable<ServiceReference[]> {
        return this.http.get<ServiceReference[]>(`${this.apiUrl}/pays/${pays}`);
    }

    getByCodeReco(codeReco: string): Observable<ServiceReference> {
        return this.http.get<ServiceReference>(`${this.apiUrl}/code-reco/${codeReco}`);
    }

    create(payload: ServiceReferencePayload): Observable<ServiceReference> {
        return this.http.post<ServiceReference>(this.apiUrl, payload);
    }

    update(id: number, payload: Partial<ServiceReferencePayload>): Observable<ServiceReference> {
        return this.http.put<ServiceReference>(`${this.apiUrl}/${id}`, payload);
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }

    getDashboardStats(): Observable<ServiceReferenceDashboard[]> {
        return this.http.get<ServiceReferenceDashboard[]>(`${this.apiUrl}/dashboard`);
    }
}
