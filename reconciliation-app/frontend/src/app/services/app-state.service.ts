import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
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
    private token: string | null = null;
    private normalizedModuleSet = new Set<string>();

    // Gestion des fichiers uploadés
    private uploadedFilesSubject = new BehaviorSubject<{ boFile: File | null; partnerFile: File | null }>({
        boFile: null,
        partnerFile: null
    });
    uploadedFiles$ = this.uploadedFilesSubject.asObservable();



    constructor(
        private http: HttpClient,
        private dataNormalizationService: DataNormalizationService
    ) {
        console.log('AppStateService initialized');
        // Charger l'utilisateur et le token depuis le localStorage au démarrage
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
            // Utiliser les données directement sans normalisation
            const normalizedData = data;

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
            const response = await this.http.post('/api/statistics/save', formattedData).toPromise();
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

    setReconciliationType(type: '1-1' | '1-2' | '1-3' | '1-4' | '1-5') {
        console.log('Stockage du type de réconciliation:', type);
        // Stocker dans localStorage pour persistance
        localStorage.setItem('reconciliationType', type);
    }

    getReconciliationType(): '1-1' | '1-2' | '1-3' | '1-4' | '1-5' {
        const type = localStorage.getItem('reconciliationType') as '1-1' | '1-2' | '1-3' | '1-4' | '1-5';
        return type || '1-1'; // Par défaut 1-1
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

    clearUploadedFiles() {
        this.uploadedFilesSubject.next({ boFile: null, partnerFile: null });
    }

    // Méthodes pour les résultats de la réconciliation
    setReconciliationResults(results: ReconciliationResponse) {
        console.log('💾 AppStateService - Stockage des résultats de la réconciliation:', results);
        console.log('📊 TotalMatches:', results.totalMatches);
        console.log('📊 TotalBoRecords:', results.totalBoRecords);
        console.log('📊 TotalPartnerRecords:', results.totalPartnerRecords);
        console.log('📊 Matches length:', results.matches?.length);
        console.log('📊 BoOnly length:', results.boOnly?.length);
        console.log('📊 PartnerOnly length:', results.partnerOnly?.length);
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

    setUserRights(rights: UserRights, username?: string, token?: string) {
        const deduplicatedModules: string[] = [];
        const seen = new Set<string>();
        (rights.modules ?? []).forEach(moduleName => {
            const normalized = this.normalizeModuleName(moduleName);
            if (!normalized || seen.has(normalized)) {
                return;
            }
            seen.add(normalized);
            deduplicatedModules.push(moduleName);
        });

        this.userRights = {
            ...rights,
            modules: deduplicatedModules
        };
        this.rebuildNormalizedModuleSet(deduplicatedModules);
        if (username) this.username = username;
        if (token) this.token = token;
        // Sauvegarder dans le localStorage
        localStorage.setItem('userRights', JSON.stringify(this.userRights));
        if (username) localStorage.setItem('username', username);
        if (token) localStorage.setItem('auth_token', token);
    }

    setToken(token: string) {
        this.token = token;
        localStorage.setItem('auth_token', token);
    }

    getToken(): string | null {
        return this.token;
    }

    private loadUserFromStorage() {
        const rightsStr = localStorage.getItem('userRights');
        const username = localStorage.getItem('username');
        const token = localStorage.getItem('auth_token');
        if (rightsStr && username) {
            try {
                this.userRights = JSON.parse(rightsStr);
                this.username = username;
                if (token) this.token = token;
                this.rebuildNormalizedModuleSet();
            } catch (e) {
                // Nettoyer si erreur de parsing
                localStorage.removeItem('userRights');
                localStorage.removeItem('username');
                localStorage.removeItem('auth_token');
            }
        }
    }

    logout() {
        this.userRights = null;
        this.username = null;
        this.token = null;
        this.normalizedModuleSet.clear();
        localStorage.removeItem('userRights');
        localStorage.removeItem('username');
        localStorage.removeItem('auth_token');
    }

    isAuthenticated(): boolean {
        return !!(this.token && this.username);
    }

    getUserRights(): UserRights | null {
        return this.userRights;
    }

    getUsername(): string | null {
        return this.username;
    }

    isAdmin(): boolean {
        // Vérifier si l'utilisateur est admin par son nom d'utilisateur OU par son profil
        if (this.username === 'admin') {
            return true;
        }
        // Vérifier si le profil est ADMIN, ADMINISTRATEUR, ou Admin (insensible à la casse)
        const profil = this.userRights?.profil;
        if (!profil) {
            return false;
        }
        const profilUpper = profil.toUpperCase();
        // Vérifier toutes les variations possibles : ADMIN, ADMINISTRATEUR, Admin
        return profilUpper === 'ADMIN' || profilUpper === 'ADMINISTRATEUR';
    }

    isModuleAllowed(module: string): boolean {
        const normalized = this.normalizeModuleName(module);
        if (!normalized) {
            return false;
        }
        return this.normalizedModuleSet.has(normalized);
    }

    hasModulePermission(module: string, permission: string): boolean {
        const normalizedModule = this.normalizeModuleName(module);
        const normalizedPermission = this.normalizePermissionName(permission);

        if (!normalizedModule || !normalizedPermission) {
            return false;
        }

        const permissions = this.userRights?.permissions ?? {};
        for (const [moduleName, modulePermissions] of Object.entries(permissions)) {
            if (this.normalizeModuleName(moduleName) !== normalizedModule) {
                continue;
            }

            if ((modulePermissions || []).some(candidate =>
                this.normalizePermissionName(candidate) === normalizedPermission
            )) {
                return true;
            }
        }

        return false;
    }

    hasAllModulePermissions(module: string, permissions: string[]): boolean {
        return (permissions || []).every(permission => this.hasModulePermission(module, permission));
    }

    private rebuildNormalizedModuleSet(modules?: string[]) {
        const source = modules ?? this.userRights?.modules ?? [];
        this.normalizedModuleSet = new Set(
            source
                .map(name => this.normalizeModuleName(name))
                .filter((name): name is string => !!name)
        );
    }

    private normalizeModuleName(name?: string | null): string | null {
        if (!name) {
            return null;
        }
        return name
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toLowerCase();
    }

    private normalizePermissionName(name?: string | null): string | null {
        if (!name) {
            return null;
        }

        return name
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toLowerCase();
    }

    // Méthodes pour gérer les fichiers uploadés
    setUploadedFiles(files: { boFile: File | null; partnerFile: File | null }) {
        console.log('📁 Sauvegarde des fichiers uploadés:', {
            boFile: files.boFile?.name,
            partnerFile: files.partnerFile?.name
        });
        this.uploadedFilesSubject.next(files);
    }

    getUploadedFiles(): { boFile: File | null; partnerFile: File | null } {
        return this.uploadedFilesSubject.value;
    }

    // Méthodes pour gérer les données parsées
    setBoData(data: Record<string, string>[]) {
        console.log('📊 Sauvegarde des données BO:', data.length, 'enregistrements');
        this.boDataSubject.next(data);
    }

    setPartnerData(data: Record<string, string>[]) {
        console.log('📊 Sauvegarde des données Partenaire:', data.length, 'enregistrements');
        this.partnerDataSubject.next(data);
    }

    clearData() {
        console.log('🧹 Nettoyage des données');
        this.boDataSubject.next([]);
        this.partnerDataSubject.next([]);
        this.uploadedFilesSubject.next({ boFile: null, partnerFile: null });
    }
} 