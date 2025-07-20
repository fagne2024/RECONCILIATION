import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { DataNormalizationService } from './data-normalization.service';
import { ReconciliationResponse } from '../models/reconciliation-response.model';

export interface ReconciliationState {
    isActive: boolean;
    lastUpdate: Date | null;
    needsRefresh: boolean;
}

export interface UserRights {
  profil: string;
  modules: string[];
  permissions: { [module: string]: string[] };
}

@Injectable({
    providedIn: 'root'
})
export class AppStateService {
    private currentStepSubject = new BehaviorSubject<number>(1);
    currentStep$ = this.currentStepSubject.asObservable();

    private statsDataSubject = new BehaviorSubject<any[]>([]);
    statsData$ = this.statsDataSubject.asObservable();

    private selectedServiceSubject = new BehaviorSubject<string>('');
    selectedService$ = this.selectedServiceSubject.asObservable();

    // Données temporaires pour la réconciliation
    private boDataSubject = new BehaviorSubject<Record<string, string>[]>([]);
    boData$ = this.boDataSubject.asObservable();

    private partnerDataSubject = new BehaviorSubject<Record<string, string>[]>([]);
    partnerData$ = this.partnerDataSubject.asObservable();

    // Données des résultats de la réconciliation
    private reconciliationResultSubject = new BehaviorSubject<ReconciliationResponse | null>(null);
    reconciliationResult$ = this.reconciliationResultSubject.asObservable();

    // Gestion de la progression de la réconciliation
    private reconciliationProgressSubject = new BehaviorSubject<boolean>(false);
    private reconciliationStartTimeSubject = new BehaviorSubject<number>(0);

    private reconciliationStateSubject = new BehaviorSubject<ReconciliationState>({
        isActive: false,
        lastUpdate: null,
        needsRefresh: false
    });

    private dataUpdateSubject = new BehaviorSubject<boolean>(false);

    private userRights: UserRights | null = null;
    private username: string | null = null;

    constructor(
        private http: HttpClient,
        private dataNormalizationService: DataNormalizationService
    ) {
        console.log('AppStateService initialized');
        // Charger l'utilisateur depuis le localStorage au démarrage
        this.loadUserFromStorage();
    }

    setCurrentStep(step: number) {
        console.log('Setting current step to:', step);
        this.currentStepSubject.next(step);
    }

    getCurrentStep(): number {
        return this.currentStepSubject.value;
    }

    async setStatsData(data: any) {
        console.log('Setting stats data:', JSON.stringify(data, null, 2));
        if (!data) {
            console.warn('Attempting to set null stats data');
            return;
        }
        try {
            // Normaliser les données
            const normalizedData = this.dataNormalizationService.normalizeData(data);

            // Formatage des données pour le backend
            const formattedData = normalizedData.map((item: any) => {
                // Conversion des valeurs numériques
                const totalVolume = typeof item.totalVolume === 'string' 
                    ? parseFloat(item.totalVolume.replace(/,/g, '')) 
                    : Number(item.totalVolume);
                
                const recordCount = typeof item.recordCount === 'string'
                    ? parseInt(item.recordCount.replace(/,/g, ''))
                    : Number(item.recordCount);

                // Formatage de la date
                const date = item.date ? new Date(item.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

                const formatted = {
                    agency: item.agency || '',
                    service: item.service || '',
                    date: date,
                    totalVolume: totalVolume || 0,
                    recordCount: recordCount || 0
                };
                console.log('Formatted item for backend:', JSON.stringify(formatted, null, 2));
                return formatted;
            });

            console.log('Sending formatted data to backend:', JSON.stringify(formattedData, null, 2));
            const response = await this.http.post(`${environment.apiUrl}/statistics/save`, formattedData).toPromise();
            console.log('Backend response:', response);
            this.statsDataSubject.next(normalizedData);
        } catch (error) {
            console.error('Error setting stats data:', error);
            throw error;
        }
    }

    getStatsData(): Observable<any[]> {
        return this.statsData$;
    }

    clearStatsData() {
        console.log('Clearing stats data');
        this.statsDataSubject.next([]);
    }

    startReconciliation(service: string) {
        console.log('Starting reconciliation for service:', service);
        this.selectedServiceSubject.next(service);
        this.setCurrentStep(2);
        this.reconciliationStateSubject.next({
            isActive: true,
            lastUpdate: null,
            needsRefresh: false // Ne pas rafraîchir automatiquement au début
        });
    }

    getSelectedService(): string {
        return this.selectedServiceSubject.value;
    }

    // Méthodes pour les données de réconciliation
    setReconciliationData(boData: Record<string, string>[], partnerData: Record<string, string>[]) {
        console.log('Stockage des données de réconciliation:', {
            boDataLength: boData.length,
            partnerDataLength: partnerData.length
        });
        this.boDataSubject.next(boData);
        this.partnerDataSubject.next(partnerData);
    }

    getBoData(): Record<string, string>[] {
        return this.boDataSubject.value;
    }

    getPartnerData(): Record<string, string>[] {
        return this.partnerDataSubject.value;
    }

    clearReconciliationData() {
        this.boDataSubject.next([]);
        this.partnerDataSubject.next([]);
    }

    // Méthodes pour les résultats de la réconciliation
    setReconciliationResults(results: ReconciliationResponse) {
        console.log('Stockage des résultats de la réconciliation:', results);
        this.reconciliationResultSubject.next(results);
    }

    getReconciliationResults(): Observable<ReconciliationResponse | null> {
        return this.reconciliationResult$;
    }

    clearReconciliationResults() {
        this.reconciliationResultSubject.next(null);
    }

    // Gestion de la progression de la réconciliation
    setReconciliationProgress(show: boolean) {
        this.reconciliationProgressSubject.next(show);
        if (show) {
            this.reconciliationStartTimeSubject.next(Date.now());
        }
    }

    getReconciliationProgress(): Observable<boolean> {
        return this.reconciliationProgressSubject.asObservable();
    }

    getReconciliationStartTime(): number {
        return this.reconciliationStartTimeSubject.value;
    }

    // Observable pour les changements d'état de réconciliation
    get reconciliationState$(): Observable<ReconciliationState> {
        return this.reconciliationStateSubject.asObservable();
    }

    // Observable pour les mises à jour de données
    get dataUpdate$(): Observable<boolean> {
        return this.dataUpdateSubject.asObservable();
    }

    // Méthodes pour gérer l'état de réconciliation
    completeReconciliation() {
        this.reconciliationStateSubject.next({
            isActive: false,
            lastUpdate: new Date(),
            needsRefresh: false // Ne pas rafraîchir automatiquement
        });
    }

    // Notifier quand le résumé est enregistré avec succès
    notifySummarySaved() {
        this.reconciliationStateSubject.next({
            isActive: false,
            lastUpdate: new Date(),
            needsRefresh: true
        });
        
        // Notifier que les données ont été mises à jour
        this.notifyDataUpdate();
    }

    // Notifier une mise à jour de données
    notifyDataUpdate() {
        this.dataUpdateSubject.next(true);
    }

    // Marquer que les données ont été rafraîchies
    markDataRefreshed() {
        const currentState = this.reconciliationStateSubject.value;
        this.reconciliationStateSubject.next({
            ...currentState,
            needsRefresh: false
        });
    }

    // Obtenir l'état actuel
    getCurrentState(): ReconciliationState {
        return this.reconciliationStateSubject.value;
    }

    setUserRights(rights: UserRights, username?: string) {
        this.userRights = rights;
        if (username) this.username = username;
        // Sauvegarder dans le localStorage
        localStorage.setItem('userRights', JSON.stringify(rights));
        if (username) localStorage.setItem('username', username);
    }

    private loadUserFromStorage() {
        const rightsStr = localStorage.getItem('userRights');
        const username = localStorage.getItem('username');
        if (rightsStr && username) {
            try {
                this.userRights = JSON.parse(rightsStr);
                this.username = username;
            } catch (e) {
                // Nettoyer si erreur de parsing
                localStorage.removeItem('userRights');
                localStorage.removeItem('username');
            }
        }
    }

    logout() {
        this.userRights = null;
        this.username = null;
        localStorage.removeItem('userRights');
        localStorage.removeItem('username');
    }

    getUserRights(): UserRights | null {
        return this.userRights;
    }

    getUsername(): string | null {
        return this.username;
    }

    isAdmin(): boolean {
        return this.username === 'admin';
    }

    isModuleAllowed(module: string): boolean {
        return this.userRights?.modules.includes(module) ?? false;
    }
} 