import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Compte, CompteCreateRequest, CompteUpdateRequest, CompteFilter } from '../models/compte.model';

@Injectable({
    providedIn: 'root'
})
export class CompteService {
    private apiUrl = `${environment.apiUrl}/comptes`;

    constructor(private http: HttpClient) {}

    // Récupérer tous les comptes
    getAllComptes(): Observable<Compte[]> {
        return this.http.get<Compte[]>(this.apiUrl);
    }

    // Récupérer un compte par ID
    getCompteById(id: number): Observable<Compte> {
        return this.http.get<Compte>(`${this.apiUrl}/${id}`);
    }

    // Récupérer un compte par numéro
    getCompteByNumero(numeroCompte: string): Observable<Compte> {
        return this.http.get<Compte>(`${this.apiUrl}/numero/${numeroCompte}`);
    }

    // Récupérer les comptes par pays
    getComptesByPays(pays: string): Observable<Compte[]> {
        return this.http.get<Compte[]>(`${this.apiUrl}/pays/${pays}`);
    }

    // Récupérer les comptes par code propriétaire
    getComptesByCodeProprietaire(codeProprietaire: string): Observable<Compte[]> {
        return this.http.get<Compte[]>(`${this.apiUrl}/code-proprietaire/${codeProprietaire}`);
    }

    // Récupérer les comptes par agence
    getComptesByAgency(agency: string): Observable<Compte[]> {
        return this.http.get<Compte[]>(`${this.apiUrl}/agency/${agency}`);
    }

    // Récupérer les comptes par service
    getComptesByService(service: string): Observable<Compte[]> {
        return this.http.get<Compte[]>(`${this.apiUrl}/service/${service}`);
    }

    // Récupérer un compte par agence et service
    getCompteByAgencyAndService(agency: string, service: string): Observable<Compte> {
        return this.http.get<Compte>(`${this.apiUrl}/agency/${agency}/service/${service}`);
    }

    // Récupérer les comptes avec un solde supérieur à un seuil
    getComptesBySoldeSuperieurA(soldeMin: number): Observable<Compte[]> {
        return this.http.get<Compte[]>(`${this.apiUrl}/solde/${soldeMin}`);
    }

    // Créer un nouveau compte
    createCompte(compte: CompteCreateRequest): Observable<Compte> {
        return this.http.post<Compte>(this.apiUrl, compte);
    }

    // Mettre à jour un compte
    updateCompte(id: number, compte: CompteUpdateRequest): Observable<Compte> {
        return this.http.put<Compte>(`${this.apiUrl}/${id}`, compte);
    }

    // Mettre à jour le solde d'un compte
    updateSolde(id: number, nouveauSolde: number): Observable<boolean> {
        return this.http.put<boolean>(`${this.apiUrl}/${id}/solde`, nouveauSolde);
    }

    // Supprimer un compte
    deleteCompte(id: number): Observable<{success: boolean, message: string}> {
        return this.http.delete<{success: boolean, message: string}>(`${this.apiUrl}/${id}`);
    }

    // Vérifier si un compte existe
    checkCompteExists(numeroCompte: string): Observable<boolean> {
        return this.http.get<boolean>(`${this.apiUrl}/exists/${numeroCompte}`);
    }

    // Filtrer les comptes avec des paramètres
    filterComptes(filter: CompteFilter): Observable<Compte[]> {
        let params = new HttpParams();
        
        if (filter.pays && Array.isArray(filter.pays)) {
            filter.pays.forEach((p: string) => {
                params = params.append('pays', p);
            });
        }
        if (filter.codeProprietaire && Array.isArray(filter.codeProprietaire)) {
            filter.codeProprietaire.forEach((c: string) => {
                params = params.append('codeProprietaire', c);
            });
        }
        if (filter.dateDebut) {
            params = params.set('dateDebut', filter.dateDebut);
        }
        if (filter.dateFin) {
            params = params.set('dateFin', filter.dateFin);
        }
        if (filter.categorie && Array.isArray(filter.categorie)) {
            filter.categorie.forEach((c: string) => {
                params = params.append('categorie', c);
            });
        }

        return this.http.get<Compte[]>(`${this.apiUrl}/filter`, { params });
    }

    // Récupérer les statistiques des comptes
    getComptesStats(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/stats`);
    }

    // Récupérer la liste des pays uniques
    getDistinctPays(): Observable<string[]> {
        return this.http.get<string[]>(`${this.apiUrl}/pays/list`);
    }

    // Récupérer la liste des codes propriétaires uniques
    getDistinctCodeProprietaire(): Observable<string[]> {
        return this.http.get<string[]>(`${this.apiUrl}/code-proprietaire/list`);
    }

    // Récupérer la liste des agences uniques
    getDistinctAgencies(): Observable<string[]> {
        return this.http.get<string[]>(`${this.apiUrl}/agency/list`);
    }

    // Récupérer la liste des services uniques
    getDistinctServices(): Observable<string[]> {
        return this.http.get<string[]>(`${this.apiUrl}/service/list`);
    }

    // Solde de clôture BO historique
    setSoldeBo(numeroCompte: string, dateSolde: string, soldeBo: number) {
        return this.http.post(`${environment.apiUrl}/compte-solde-bo/set`, { numeroCompte, dateSolde, soldeBo });
    }

    getSoldeBo(numeroCompte: string, dateSolde: string) {
        return this.http.get<number>(`${environment.apiUrl}/compte-solde-bo/get`, { params: { numeroCompte, dateSolde } });
    }
} 