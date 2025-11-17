import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RankingItem {
  agency?: string;
  service?: string;
  country?: string;
  transactionCount: number;
  totalVolume: number;
  totalFees: number;
  averageVolume: number;
  averageFees: number;
  uniqueAgencies?: number;
}

export interface AllRankings {
  agenciesByTransactions: RankingItem[];
  agenciesByVolume: RankingItem[];
  agenciesByFees: RankingItem[];
  servicesByTransactions: RankingItem[];
  servicesByVolume: RankingItem[];
  servicesByFees: RankingItem[];
}

@Injectable({
  providedIn: 'root'
})
export class RankingService {
  private apiUrl = '/api/rankings';

  constructor(private http: HttpClient) { }

  /**
   * Récupérer tous les classements
   */
  getAllRankings(period: string = 'month'): Observable<AllRankings> {
    return this.http.get<AllRankings>(`${this.apiUrl}?period=${period}`);
  }

  /**
   * Récupérer la liste des pays
   */
  getCountries(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/countries`);
  }

  /**
   * Classement des agences par nombre de transactions
   */
  getAgencyRankingByTransactions(countries?: string[], period: string = 'month', startDate?: string, endDate?: string): Observable<RankingItem[]> {
    let url = `${this.apiUrl}/agencies/transactions?period=${period}`;
    if (countries && countries.length > 0 && !countries.includes('Tous les pays')) {
      const countryParams = countries.map(c => `country=${encodeURIComponent(c)}`).join('&');
      url += `&${countryParams}`;
    }
    if (startDate && endDate) {
      url += `&startDate=${startDate}&endDate=${endDate}`;
    }
    return this.http.get<RankingItem[]>(url);
  }

  /**
   * Classement des agences par volume
   */
  getAgencyRankingByVolume(countries?: string[], period: string = 'month', startDate?: string, endDate?: string): Observable<RankingItem[]> {
    let url = `${this.apiUrl}/agencies/volume?period=${period}`;
    if (countries && countries.length > 0 && !countries.includes('Tous les pays')) {
      const countryParams = countries.map(c => `country=${encodeURIComponent(c)}`).join('&');
      url += `&${countryParams}`;
    }
    if (startDate && endDate) {
      url += `&startDate=${startDate}&endDate=${endDate}`;
    }
    return this.http.get<RankingItem[]>(url);
  }

  /**
   * Classement des agences par frais
   */
  getAgencyRankingByFees(countries?: string[], period: string = 'month', startDate?: string, endDate?: string): Observable<RankingItem[]> {
    let url = `${this.apiUrl}/agencies/fees?period=${period}`;
    if (countries && countries.length > 0 && !countries.includes('Tous les pays')) {
      const countryParams = countries.map(c => `country=${encodeURIComponent(c)}`).join('&');
      url += `&${countryParams}`;
    }
    if (startDate && endDate) {
      url += `&startDate=${startDate}&endDate=${endDate}`;
    }
    return this.http.get<RankingItem[]>(url);
  }

  /**
   * Classement des services par nombre de transactions
   */
  getServiceRankingByTransactions(countries?: string[], period: string = 'month', startDate?: string, endDate?: string): Observable<RankingItem[]> {
    let url = `${this.apiUrl}/services/transactions?period=${period}`;
    if (countries && countries.length > 0 && !countries.includes('Tous les pays')) {
      const countryParams = countries.map(c => `country=${encodeURIComponent(c)}`).join('&');
      url += `&${countryParams}`;
    }
    if (startDate && endDate) {
      url += `&startDate=${startDate}&endDate=${endDate}`;
    }
    return this.http.get<RankingItem[]>(url);
  }

  /**
   * Classement des services par volume
   */
  getServiceRankingByVolume(countries?: string[], period: string = 'month', startDate?: string, endDate?: string): Observable<RankingItem[]> {
    let url = `${this.apiUrl}/services/volume?period=${period}`;
    if (countries && countries.length > 0 && !countries.includes('Tous les pays')) {
      const countryParams = countries.map(c => `country=${encodeURIComponent(c)}`).join('&');
      url += `&${countryParams}`;
    }
    if (startDate && endDate) {
      url += `&startDate=${startDate}&endDate=${endDate}`;
    }
    return this.http.get<RankingItem[]>(url);
  }

  /**
   * Classement des services par frais
   */
  getServiceRankingByFees(countries?: string[], period: string = 'month', startDate?: string, endDate?: string): Observable<RankingItem[]> {
    let url = `${this.apiUrl}/services/fees?period=${period}`;
    if (countries && countries.length > 0 && !countries.includes('Tous les pays')) {
      const countryParams = countries.map(c => `country=${encodeURIComponent(c)}`).join('&');
      url += `&${countryParams}`;
    }
    if (startDate && endDate) {
      url += `&startDate=${startDate}&endDate=${endDate}`;
    }
    return this.http.get<RankingItem[]>(url);
  }

  /**
   * Formater un montant en FCFA avec séparateurs de milliers
   */
  formatAmount(amount: number): string {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '0 FCFA';
    }
    
    const formatted = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      useGrouping: true
    }).format(amount);
    
    // Log pour vérifier que le formatage fonctionne
    console.log(`[RANKING SERVICE] Formatting ${amount} -> ${formatted}`);
    return formatted;
  }

  /**
   * Formater un nombre avec séparateurs de milliers
   */
  formatNumber(num: number): string {
    if (num === null || num === undefined || isNaN(num)) {
      return '0';
    }
    
    const formatted = new Intl.NumberFormat('fr-FR', {
      useGrouping: true
    }).format(num);
    
    // Log pour vérifier que le formatage fonctionne
    console.log(`[RANKING SERVICE] Formatting number ${num} -> ${formatted}`);
    return formatted;
  }
} 