import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface AgencySummaryData {
    agency: string;
    service: string;
    date: string;
    country: string;
    totalVolume: number;
    recordCount: number;
}

@Injectable({
    providedIn: 'root'
})
export class ReconciliationSummaryService {
    private agencySummarySubject = new BehaviorSubject<AgencySummaryData[]>([]);
    public agencySummary$ = this.agencySummarySubject.asObservable();

    setAgencySummary(summary: AgencySummaryData[]) {
        console.log('📊 ReconciliationSummaryService - Stockage du résumé par agence:', summary);
        this.agencySummarySubject.next(summary);
    }

    getAgencySummary(): AgencySummaryData[] {
        return this.agencySummarySubject.value;
    }

    clearAgencySummary() {
        this.agencySummarySubject.next([]);
    }
}

