import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ImpactOP, ImpactOPFilter, ImpactOPValidationResult, ImpactOPUploadResult } from '../models/impact-op.model';

@Injectable({
  providedIn: 'root'
})
export class ImpactOPService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Récupérer tous les impacts OP
  getImpactOPs(filter?: ImpactOPFilter): Observable<ImpactOP[]> {
    let params = new HttpParams();
    
    if (filter) {
      if (filter.codeProprietaire) {
        params = params.set('codeProprietaire', filter.codeProprietaire);
      }
      if (filter.typeOperation) {
        params = params.set('typeOperation', filter.typeOperation);
      }
      if (filter.groupeReseau) {
        params = params.set('groupeReseau', filter.groupeReseau);
      }
      if (filter.statut) {
        params = params.set('statut', filter.statut);
      }
      if (filter.dateDebut) {
        params = params.set('dateDebut', filter.dateDebut);
      }
      if (filter.dateFin) {
        params = params.set('dateFin', filter.dateFin);
      }
      if (filter.montantMin !== undefined) {
        params = params.set('montantMin', filter.montantMin.toString());
      }
      if (filter.montantMax !== undefined) {
        params = params.set('montantMax', filter.montantMax.toString());
      }
    }

    return this.http.get<ImpactOP[]>(`${this.apiUrl}/impact-op`, { params });
  }

  // Récupérer un impact OP par ID
  getImpactOP(id: number): Observable<ImpactOP | null> {
    return this.http.get<ImpactOP>(`${this.apiUrl}/impact-op/${id}`).pipe(
      catchError(() => of(null))
    );
  }

  // Créer un nouvel impact OP
  createImpactOP(impactOP: Omit<ImpactOP, 'id'>): Observable<ImpactOP> {
    return this.http.post<ImpactOP>(`${this.apiUrl}/impact-op`, impactOP);
  }

  // Mettre à jour un impact OP
  updateImpactOP(id: number, impactOP: Partial<ImpactOP>): Observable<ImpactOP> {
    return this.http.put<ImpactOP>(`${this.apiUrl}/impact-op/${id}`, impactOP);
  }

  // Supprimer un impact OP
  deleteImpactOP(id: number): Observable<boolean> {
    return this.http.delete(`${this.apiUrl}/impact-op/${id}`).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  // Valider un fichier d'impacts OP
  validateImpactOPFile(file: File): Observable<ImpactOPValidationResult> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<ImpactOPValidationResult>(`${this.apiUrl}/impact-op/validate`, formData);
  }

  // Uploader un fichier d'impacts OP
  uploadImpactOPFile(file: File): Observable<ImpactOPUploadResult> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<ImpactOPUploadResult>(`${this.apiUrl}/impact-op/upload`, formData);
  }

  // Mettre à jour le statut d'un impact OP
  updateImpactOPStatut(id: number, statut: string, commentaire?: string): Observable<ImpactOP> {
    return this.http.patch<ImpactOP>(`${this.apiUrl}/impact-op/${id}/statut`, {
      statut,
      commentaire
    });
  }

  // Récupérer les options de filtres
  getFilterOptions(): Observable<{
    codeProprietaires: string[];
    typeOperations: string[];
    groupeReseaux: string[];
  }> {
    return this.http.get<{
      codeProprietaires: string[];
      typeOperations: string[];
      groupeReseaux: string[];
    }>(`${this.apiUrl}/impact-op/filter-options`);
  }

  // Exporter les impacts OP
  exportImpactOPs(filter?: ImpactOPFilter): Observable<Blob> {
    let params = new HttpParams();
    
    if (filter) {
      if (filter.codeProprietaire) {
        params = params.set('codeProprietaire', filter.codeProprietaire);
      }
      if (filter.typeOperation) {
        params = params.set('typeOperation', filter.typeOperation);
      }
      if (filter.groupeReseau) {
        params = params.set('groupeReseau', filter.groupeReseau);
      }
      if (filter.statut) {
        params = params.set('statut', filter.statut);
      }
      if (filter.dateDebut) {
        params = params.set('dateDebut', filter.dateDebut);
      }
      if (filter.dateFin) {
        params = params.set('dateFin', filter.dateFin);
      }
      if (filter.montantMin !== undefined) {
        params = params.set('montantMin', filter.montantMin.toString());
      }
      if (filter.montantMax !== undefined) {
        params = params.set('montantMax', filter.montantMax.toString());
      }
    }

    return this.http.get(`${this.apiUrl}/impact-op/export`, { 
      params, 
      responseType: 'blob' 
    });
  }

  // Récupérer les statistiques des impacts OP
  getImpactOPStats(): Observable<{
    total: number;
    enAttente: number;
    traite: number;
    erreur: number;
    montantTotal: number;
  }> {
    return this.http.get<{
      total: number;
      enAttente: number;
      traite: number;
      erreur: number;
      montantTotal: number;
    }>(`${this.apiUrl}/impact-op/stats`);
  }

  // Récupérer la somme des impacts OP pour une date et un code propriétaire donnés
  getImpactOPSumForDate(date: string, codeProprietaire: string): Observable<number> {
    const params = new HttpParams()
      .set('date', date)
      .set('codeProprietaire', codeProprietaire);

    return this.http.get<{ sum: number }>(`${this.apiUrl}/impact-op/sum-for-date`, { params }).pipe(
      map(response => response.sum),
      catchError(() => of(0))
    );
  }
} 