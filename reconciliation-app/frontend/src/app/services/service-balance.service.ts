import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Compte } from '../models/compte.model';

export interface MergeRequest {
  compteIds: number[];
  nouveauNomCompte: string;
  pays: string;
}

export interface FusionResult {
  nouveauCompteId: number;
  nouveauNomCompte: string;
  totalSolde: number;
  nombreComptesFusionnes: number;
  pays: string;
}

@Injectable({
  providedIn: 'root'
})
export class ServiceBalanceService {
  private apiUrl = 'http://localhost:8080/api/service-balance';

  constructor(private http: HttpClient) { }

  /**
   * Test de connectivité de l'API
   */
  testConnection(): Observable<any> {
    return this.http.get(`${this.apiUrl}/test`);
  }

  /**
   * Test de connectivité simple
   */
  testPing(): Observable<any> {
    return this.http.get('http://localhost:8080/api/test/ping');
  }

  /**
   * Récupère tous les comptes service
   */
  getServiceComptes(): Observable<Compte[]> {
    return this.http.get<Compte[]>(`${this.apiUrl}/comptes`);
  }
  
  /**
   * Récupère tous les comptes (pour debug)
   */
  getAllComptes(): Observable<Compte[]> {
    return this.http.get<Compte[]>(`${this.apiUrl}/comptes/all`);
  }

  /**
   * Fusionne plusieurs comptes service en un nouveau compte
   */
  mergeServiceComptes(compteIds: number[], nouveauNomCompte: string, pays: string): Observable<FusionResult> {
    const request: MergeRequest = {
      compteIds,
      nouveauNomCompte,
      pays
    };
    
    console.log('Envoi de la requête de fusion:', request);
    return this.http.post<FusionResult>(`${this.apiUrl}/merge`, request, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}
