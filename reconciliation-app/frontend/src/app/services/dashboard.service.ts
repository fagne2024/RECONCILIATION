import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DashboardMetrics {
    totalReconciliations: number;
    totalFiles: number;
    lastActivity: string;
    todayReconciliations: number;
}

export interface DetailedMetrics {
    totalVolume: number;
    totalFees: number;
    totalTransactions: number;
    totalClients: number;
    averageVolume: number;
    averageTransactions: number;
    averageFeesPerDay: number;
    operationStats: OperationStat[];
    frequencyStats: FrequencyStat[];
}

export interface TransactionCreatedStats {
    serviceStats: ServiceStat[];
    totalServices: number;
    totalCashinVolume: number;
    totalPaymentVolume: number;
    totalCashinCount: number;
    totalPaymentCount: number;
    totalTransactionCount: number;
}

export interface ServiceStat {
    service: string;
    totalCashinVolume: number;
    totalPaymentVolume: number;
    totalCashinCount: number;
    totalPaymentCount: number;
    totalTransactions: number;
}

export interface OperationStat {
    operationType: string;
    transactionCount: number;
    totalVolume: number;
    averageVolume: number;
}

export interface FrequencyStat {
    operationType: string;
    frequency: number;
}

export interface FilterOptions {
    agencies: string[];
    services: string[];
    countries: string[];
    banques: string[];
    timeFilters: string[];
}

@Injectable({
    providedIn: 'root'
})
export class DashboardService {
    private apiUrl = '/api/statistics';

    constructor(private http: HttpClient) {}

    getDashboardMetrics(): Observable<DashboardMetrics> {
        return this.http.get<DashboardMetrics>(`${this.apiUrl}/dashboard-metrics`);
    }

    getFilterOptions(): Observable<FilterOptions> {
        return this.http.get<FilterOptions>(`${this.apiUrl}/filter-options`);
    }

    getDetailedMetrics(
        agencies?: string[], 
        services?: string[], 
        countries?: string[],
        timeFilter?: string,
        startDate?: string,
        endDate?: string
    ): Observable<DetailedMetrics> {
        let params = '';
        const queryParams = [];
        
        if (agencies && agencies.length > 0 && !agencies.includes('Tous')) {
            agencies.forEach(agency => queryParams.push(`agency=${encodeURIComponent(agency)}`));
        }
        if (services && services.length > 0 && !services.includes('Tous')) {
            services.forEach(service => queryParams.push(`service=${encodeURIComponent(service)}`));
        }
        if (countries && countries.length > 0 && !countries.includes('Tous')) {
            countries.forEach(country => queryParams.push(`country=${encodeURIComponent(country)}`));
        }
        if (timeFilter) queryParams.push(`timeFilter=${encodeURIComponent(timeFilter)}`);
        if (startDate) queryParams.push(`startDate=${encodeURIComponent(startDate)}`);
        if (endDate) queryParams.push(`endDate=${encodeURIComponent(endDate)}`);
        
        if (queryParams.length > 0) {
            params = '?' + queryParams.join('&');
        }
        
        return this.http.get<DetailedMetrics>(`${this.apiUrl}/detailed-metrics${params}`);
    }

    getTransactionCreatedStats(
        agencies?: string[], 
        services?: string[], 
        countries?: string[],
        timeFilter?: string,
        startDate?: string,
        endDate?: string
    ): Observable<TransactionCreatedStats> {
        let params = '';
        const queryParams = [];
        
        if (agencies && agencies.length > 0 && !agencies.includes('Tous')) {
            agencies.forEach(agency => queryParams.push(`agency=${encodeURIComponent(agency)}`));
        }
        if (services && services.length > 0 && !services.includes('Tous')) {
            services.forEach(service => queryParams.push(`service=${encodeURIComponent(service)}`));
        }
        if (countries && countries.length > 0 && !countries.includes('Tous')) {
            countries.forEach(country => queryParams.push(`country=${encodeURIComponent(country)}`));
        }
        if (timeFilter) queryParams.push(`timeFilter=${encodeURIComponent(timeFilter)}`);
        if (startDate) queryParams.push(`startDate=${encodeURIComponent(startDate)}`);
        if (endDate) queryParams.push(`endDate=${encodeURIComponent(endDate)}`);
        
        if (queryParams.length > 0) {
            params = '?' + queryParams.join('&');
        }
        
        return this.http.get<TransactionCreatedStats>(`${this.apiUrl}/transaction-created-stats${params}`);
    }
} 