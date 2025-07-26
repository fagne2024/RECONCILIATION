import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';
import { EcartSolde, EcartSoldeUploadResponse, EcartSoldeFilter, FraisAssocie } from '../models/ecart-solde.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EcartSoldeService {
  private apiUrl = `${environment.apiUrl}/ecart-solde`;
  private operationsUrl = `${environment.apiUrl}/operations`;
  private fraisTransactionUrl = `${environment.apiUrl}/frais-transaction`;

  constructor(private http: HttpClient) { }

  getAllEcartSoldes(): Observable<EcartSolde[]> {
    return forkJoin({
      ecartSoldes: this.http.get<EcartSolde[]>(this.apiUrl),
      fraisTransactions: this.http.get<any[]>(this.fraisTransactionUrl)
    }).pipe(
      map(result => {
        const ecartSoldes = result.ecartSoldes;
        const fraisTransactions = result.fraisTransactions;
        
        // Calculer les frais pour chaque écart de solde
        ecartSoldes.forEach(ecart => {
          const fraisCalcule = this.calculerFraisPourEcart(ecart, fraisTransactions);
          if (fraisCalcule) {
            ecart.fraisAssocie = fraisCalcule;
          }
        });

        return ecartSoldes;
      })
    );
  }

  // Méthode pour calculer les frais pour un écart de solde
  private calculerFraisPourEcart(ecart: EcartSolde, fraisTransactions: any[]): FraisAssocie | null {
    // Chercher la configuration de frais pour ce service et cette agence
    const fraisConfig = fraisTransactions.find(frais => 
      frais.service === ecart.service && 
      frais.agence === ecart.agence &&
      frais.actif === true
    );

    if (!fraisConfig) {
      console.log(`Aucune configuration de frais trouvée pour service=${ecart.service} et agence=${ecart.agence}`);
      return null;
    }

    // Calculer le montant des frais selon le type
    let montantFrais = 0;
    let typeCalcul = fraisConfig.typeCalcul || 'NOMINAL';
    let pourcentage = fraisConfig.pourcentage;

    if (typeCalcul === 'POURCENTAGE' && pourcentage) {
      // Frais en pourcentage : Montant de l'écart × Pourcentage
      montantFrais = ecart.montant * (pourcentage / 100.0);
    } else {
      // Frais fixe : Valeur fixe × 1 transaction (comme pour les annulations)
      montantFrais = fraisConfig.montantFrais || 0;
    }

    // Créer l'objet frais calculé
    return {
      id: fraisConfig.id,
      montant: montantFrais,
      typeCalcul: typeCalcul,
      pourcentage: pourcentage,
      description: fraisConfig.description,
      bordereau: `CALCULE_${ecart.service}_${ecart.agence}`,
      dateOperation: ecart.dateTransaction
    };
  }

  // Méthode pour récupérer les frais associés à un écart de solde spécifique
  getFraisAssocie(ecartSolde: EcartSolde): Observable<FraisAssocie | null> {
    return this.http.get<any[]>(this.fraisTransactionUrl).pipe(
      map(fraisTransactions => {
        return this.calculerFraisPourEcart(ecartSolde, fraisTransactions);
      })
    );
  }

  getEcartSoldeById(id: number): Observable<EcartSolde> {
    return this.http.get<EcartSolde>(`${this.apiUrl}/${id}`);
  }

  getEcartSoldesByAgence(agence: string): Observable<EcartSolde[]> {
    return this.http.get<EcartSolde[]>(`${this.apiUrl}/agence/${agence}`);
  }

  getEcartSoldesByService(service: string): Observable<EcartSolde[]> {
    return this.http.get<EcartSolde[]>(`${this.apiUrl}/service/${service}`);
  }

  getEcartSoldesByPays(pays: string): Observable<EcartSolde[]> {
    return this.http.get<EcartSolde[]>(`${this.apiUrl}/pays/${pays}`);
  }

  getEcartSoldesByStatut(statut: string): Observable<EcartSolde[]> {
    return this.http.get<EcartSolde[]>(`${this.apiUrl}/statut/${statut}`);
  }

  getEcartSoldesByDateRange(dateDebut: string, dateFin: string): Observable<EcartSolde[]> {
    const params = new HttpParams()
      .set('dateDebut', dateDebut)
      .set('dateFin', dateFin);
    return this.http.get<EcartSolde[]>(`${this.apiUrl}/date-range`, { params });
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

  createEcartSolde(ecartSolde: EcartSolde): Observable<EcartSolde> {
    return this.http.post<EcartSolde>(this.apiUrl, ecartSolde);
  }

  createMultipleEcartSoldes(ecartSoldes: EcartSolde[]): Promise<number> {
    return new Promise((resolve, reject) => {
      this.http.post<any>(`${this.apiUrl}/batch`, ecartSoldes).subscribe({
        next: (response) => {
          resolve(response.count || ecartSoldes.length);
        },
        error: (error) => {
          console.error('Erreur lors de la sauvegarde en lot:', error);
          reject(error);
        }
      });
    });
  }

  updateEcartSolde(id: number, ecartSolde: EcartSolde): Observable<EcartSolde> {
    return this.http.put<EcartSolde>(`${this.apiUrl}/${id}`, ecartSolde);
  }

  deleteEcartSolde(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  updateStatut(id: number, statut: string): Observable<any> {
    const params = new HttpParams().set('statut', statut);
    return this.http.post(`${this.apiUrl}/${id}/statut`, null, { params });
  }

  updateStatutWithComment(id: number, statut: string, commentaire: string): Observable<any> {
    const params = new HttpParams()
      .set('statut', statut)
      .set('commentaire', commentaire);
    return this.http.post(`${this.apiUrl}/${id}/statut`, null, { params });
  }

  uploadCsvFile(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.http.post<any>(`${this.apiUrl}/upload`, formData);
  }

  validateFile(file: File): Observable<{
    validLines: number;
    errorLines: number;
    duplicates: number;
    newRecords: number;
    hasErrors: boolean;
    errors?: string[];
  }> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.http.post<{
      validLines: number;
      errorLines: number;
      duplicates: number;
      newRecords: number;
      hasErrors: boolean;
      errors?: string[];
    }>(`${this.apiUrl}/validate`, formData);
  }

  // Méthode pour filtrer les écarts de solde avec plusieurs critères
  filterEcartSoldes(filters: EcartSoldeFilter): Observable<EcartSolde[]> {
    let params = new HttpParams();
    
    if (filters.agence) {
      params = params.set('agence', filters.agence);
    }
    if (filters.service) {
      params = params.set('service', filters.service);
    }
    if (filters.pays) {
      params = params.set('pays', filters.pays);
    }
    if (filters.statut) {
      params = params.set('statut', filters.statut);
    }
    if (filters.dateDebut) {
      params = params.set('dateDebut', filters.dateDebut);
    }
    if (filters.dateFin) {
      params = params.set('dateFin', filters.dateFin);
    }

    return this.http.get<EcartSolde[]>(`${this.apiUrl}`, { params });
  }
} 