import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class OperationServiceApi {
  private apiUrl = `${environment.apiUrl}/reconciliation`;
  constructor(private http: HttpClient) {}

  markOk(key: string): Observable<{ success: boolean }> {
    const params = new HttpParams().set('key', key);
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/mark-ok`, null, { params });
  }

  getOkKeys(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/ok-keys`);
  }

  unmarkOk(key: string): Observable<{ success: boolean }> {
    const params = new HttpParams().set('key', key);
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/mark-ok`, { params });
  }

  saveReconStatus(key: string, status: 'OK' | 'KO'): Observable<{ success: boolean }> {
    const params = new HttpParams().set('key', key).set('status', status);
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/status`, null, { params });
  }

  listReconStatus(): Observable<Record<string, 'OK' | 'KO'>> {
    return this.http.get<Record<string, 'OK' | 'KO'>>(`${this.apiUrl}/status`);
  }

  markOkBulk(keys: string[]): Observable<{ success: boolean; created: number }> {
    return this.http.post<{ success: boolean; created: number }>(`${this.apiUrl}/mark-ok/bulk`, { keys: keys || [] });
  }

  unmarkOkBulk(keys: string[]): Observable<{ success: boolean; deleted: number }> {
    return this.http.post<{ success: boolean; deleted: number }>(`${this.apiUrl}/unmark-ok/bulk`, { keys: keys || [] });
  }

  saveReconStatusBulk(entries: Array<{ key: string; status: 'OK' | 'KO' }>): Observable<{ success: boolean; saved: number }> {
    return this.http.post<{ success: boolean; saved: number }>(`${this.apiUrl}/status/bulk`, { entries: entries || [] });
  }
}

import { Operation, OperationCreateRequest, OperationUpdateRequest, OperationFilter } from '../models/operation.model';

@Injectable({
    providedIn: 'root'
})
export class OperationService {
    private apiUrl = `${environment.apiUrl}/operations`;

    constructor(private http: HttpClient) {}

    // Récupérer toutes les opérations
    getAllOperations(): Observable<Operation[]> {
        return this.http.get<Operation[]>(this.apiUrl);
    }

    // Récupérer une opération par ID
    getOperationById(id: number): Observable<Operation> {
        return this.http.get<Operation>(`${this.apiUrl}/${id}`);
    }

    // Récupérer les opérations d'un compte
    getOperationsByCompteId(compteId: number): Observable<Operation[]> {
        return this.http.get<Operation[]>(`${this.apiUrl}/compte/${compteId}`);
    }

    // Récupérer les opérations d'un compte par numéro de compte avec filtres
    getOperationsByCompte(numeroCompte: string, dateDebut?: string | null, dateFin?: string | null, typeOperation?: string | null): Observable<Operation[]> {
        let params = new HttpParams()
            .set('numeroCompte', numeroCompte);
        
        if (dateDebut) {
            params = params.set('dateDebut', dateDebut);
        }
        if (dateFin) {
            params = params.set('dateFin', dateFin);
        }
        if (typeOperation) {
            params = params.set('typeOperation', typeOperation);
        }

        return this.http.get<Operation[]>(`${this.apiUrl}/compte/numero`, { params });
    }

    // Récupérer les opérations d'un compte pour le relevé (triées par ordre chronologique)
    getOperationsByCompteForReleve(numeroCompte: string, dateDebut?: string | null, dateFin?: string | null, typeOperation?: string | null): Observable<Operation[]> {
        let params = new HttpParams()
            .set('numeroCompte', numeroCompte);
        
        if (dateDebut) {
            params = params.set('dateDebut', dateDebut);
        }
        if (dateFin) {
            params = params.set('dateFin', dateFin);
        }
        if (typeOperation) {
            params = params.set('typeOperation', typeOperation);
        }

        return this.http.get<Operation[]>(`${this.apiUrl}/compte/numero/releve`, { params });
    }

    // Récupérer les opérations par type
    getOperationsByType(typeOperation: string): Observable<Operation[]> {
        return this.http.get<Operation[]>(`${this.apiUrl}/type/${typeOperation}`);
    }

    // Récupérer les opérations par pays
    getOperationsByPays(pays: string): Observable<Operation[]> {
        return this.http.get<Operation[]>(`${this.apiUrl}/pays/${pays}`);
    }

    // Récupérer les opérations par statut
    getOperationsByStatut(statut: string): Observable<Operation[]> {
        return this.http.get<Operation[]>(`${this.apiUrl}/statut/${statut}`);
    }

    // Récupérer les opérations par banque
    getOperationsByBanque(banque: string): Observable<Operation[]> {
        return this.http.get<Operation[]>(`${this.apiUrl}/banque/${banque}`);
    }

    // Récupérer les opérations par service
    getOperationsByService(service: string): Observable<Operation[]> {
        return this.http.get<Operation[]>(`${this.apiUrl}/service/${service}`);
    }

    // Récupérer les opérations avec un montant supérieur à un seuil
    getOperationsByMontantSuperieurA(montantMin: number): Observable<Operation[]> {
        return this.http.get<Operation[]>(`${this.apiUrl}/montant/${montantMin}`);
    }

    // Récupérer les opérations par code propriétaire
    getOperationsByCodeProprietaire(codeProprietaire: string): Observable<Operation[]> {
        return this.http.get<Operation[]>(`${this.apiUrl}/proprietaire/${codeProprietaire}`);
    }

    // Récupérer les opérations par nom de bordereau
    getOperationsByNomBordereau(nomBordereau: string): Observable<Operation[]> {
        return this.http.get<Operation[]>(`${this.apiUrl}/bordereau/${nomBordereau}`);
    }

    // Récupérer les opérations par plage de dates
    getOperationsByDateRange(dateDebut: string, dateFin: string): Observable<Operation[]> {
        const params = new HttpParams()
            .set('dateDebut', dateDebut)
            .set('dateFin', dateFin);
        return this.http.get<Operation[]>(`${this.apiUrl}/date-range`, { params });
    }

    // Créer une nouvelle opération
    createOperation(operation: OperationCreateRequest): Observable<Operation> {
        return this.http.post<Operation>(this.apiUrl, operation);
    }

    // Créer une opération avec la logique des 4 opérations
    createOperationWithFourOperations(operation: OperationCreateRequest): Observable<Operation> {
        return this.http.post<Operation>(`${this.apiUrl}/manual-with-four-operations`, operation);
    }

    // Mettre à jour une opération
    updateOperation(id: number, operation: OperationUpdateRequest): Observable<Operation> {
        return this.http.put<Operation>(`${this.apiUrl}/${id}`, operation);
    }

    // Mettre à jour le statut d'une opération
    updateOperationStatut(id: number, nouveauStatut: string): Observable<boolean> {
        return this.http.put<boolean>(`${this.apiUrl}/${id}/statut`, nouveauStatut);
    }

    // Rejeter une opération
    rejectOperation(id: number): Observable<boolean> {
        return this.http.put<boolean>(`${this.apiUrl}/${id}/reject`, {});
    }

    // Annuler une opération
    cancelOperation(id: number): Observable<boolean> {
        return this.http.put<boolean>(`${this.apiUrl}/${id}/cancel`, {});
    }

    // Supprimer une opération
    deleteOperation(id: number): Observable<boolean> {
        return this.http.delete<boolean>(`${this.apiUrl}/${id}`);
    }

    // Supprimer plusieurs opérations en lot
    deleteOperations(ids: number[]): Observable<{ success: boolean, deletedCount: number, errors: string[] }> {
        return this.http.post<{ success: boolean, deletedCount: number, errors: string[] }>(`${this.apiUrl}/delete-batch`, { ids });
    }

    // Filtrer les opérations avec des paramètres
    filterOperations(filter: OperationFilter): Observable<Operation[]> {
        let params = new HttpParams();
        
        if (filter.compteId) {
            params = params.set('compteId', filter.compteId.toString());
        }
        if (filter.typeOperation) {
            params = params.set('typeOperation', filter.typeOperation);
        }
        if (filter.pays) {
            params = params.set('pays', filter.pays);
        }
        if (filter.statut) {
            params = params.set('statut', filter.statut);
        }
        if (filter.banque) {
            params = params.set('banque', filter.banque);
        }
        if (filter.service) {
            params = params.set('service', filter.service);
        }
        if (filter.codeProprietaire) {
            params = params.set('codeProprietaire', filter.codeProprietaire);
        }
        if (filter.nomBordereau) {
            params = params.set('nomBordereau', filter.nomBordereau);
        }
        if (filter.dateDebut) {
            params = params.set('dateDebut', filter.dateDebut);
        }
        if (filter.dateFin) {
            params = params.set('dateFin', filter.dateFin);
        }

        return this.http.get<Operation[]>(`${this.apiUrl}/filter`, { params });
    }

    // Récupérer les statistiques des opérations
    getOperationsStats(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/stats`);
    }

    // Récupérer les statistiques par type d'opération
    getOperationsStatsByType(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/stats/by-type`);
    }

    // Récupérer les statistiques par type d'opération avec filtres
    getOperationsStatsByTypeWithFilters(pays?: string, compteId?: number): Observable<any> {
        let params = new HttpParams();
        if (pays) params = params.set('pays', pays);
        if (compteId) params = params.set('compteId', compteId.toString());
        
        return this.http.get<any>(`${this.apiUrl}/stats/by-type/filtered`, { params });
    }

    // Récupérer les opérations récentes
    getRecentOperations(limit: number = 10): Observable<Operation[]> {
        return this.http.get<Operation[]>(`${this.apiUrl}/recent?limit=${limit}`);
    }

    // Récupérer la liste des codes propriétaires uniques
    getDistinctCodeProprietaire(): Observable<string[]> {
        return this.http.get<string[]>(`${this.apiUrl}/code-proprietaire/list`);
    }

    // Récupérer la liste des banques uniques
    getDistinctBanque(): Observable<string[]> {
        return this.http.get<string[]>(`${this.apiUrl}/banque/list`);
    }

    // Récupérer la liste des services uniques
    getDistinctService(): Observable<string[]> {
        return this.http.get<string[]>(`${this.apiUrl}/service/list`);
    }

    // Récupérer la liste des services uniques par code propriétaire
    getDistinctServiceByCodeProprietaire(codeProprietaire: string): Observable<string[]> {
        return this.http.get<string[]>(`${this.apiUrl}/service/list/${codeProprietaire}`);
    }
} 