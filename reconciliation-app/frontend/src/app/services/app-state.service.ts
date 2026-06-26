import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { DataNormalizationService } from './data-normalization.service';
import { ReconciliationResponse } from '../models/reconciliation-response.model';
import { MagicServiceResultPart, MagicServiceSummary } from './magic-reconciliation.service';

export type ReconciliationLaunchMode = 'manual' | 'assisted' | 'magic';

const RECONCILIATION_LAUNCH_MODE_KEY = 'reconciliationLaunchMode';
const RECONCILIATION_ENTRY_PATH_KEY = 'reconciliationEntryPath';

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
    private readonly postLoginRouteCandidates: Array<{ path: string; module?: string; permissions?: string[] }> = [
        { path: '/reconciliation-launcher', module: 'Réconciliation', permissions: ['consulter'] },
        { path: '/dashboard', module: 'Dashboard', permissions: ['consulter', 'filtrer'] },
        { path: '/results', module: 'Résultats', permissions: ['consulter'] },
        { path: '/stats', module: 'Statistiques', permissions: ['consulter'] },
        { path: '/stats-report', module: 'Statistiques', permissions: ['consulter'] },
        { path: '/stats-report-graph', module: 'Statistiques', permissions: ['consulter'] },
        { path: '/comptes', module: 'Comptes', permissions: ['consulter'] },
        { path: '/operations', module: 'Opérations', permissions: ['consulter'] },
        { path: '/frais', module: 'Frais', permissions: ['consulter'] },
        { path: '/ranking', module: 'Classements', permissions: ['consulter'] },
        { path: '/traitement', module: 'Traitement', permissions: ['consulter'] },
        { path: '/banque', module: 'BANQUE', permissions: ['consulter'] },
        { path: '/comptabilite', module: 'Comptabilité', permissions: ['consulter'] },
        { path: '/service-references', module: 'Dashboard', permissions: ['consulter'] },
        { path: '/aide' },
        { path: '/user-profile' }
    ];

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

    private magicServiceSummariesSubject = new BehaviorSubject<MagicServiceSummary[]>([]);
    magicServiceSummaries$ = this.magicServiceSummariesSubject.asObservable();

    private magicPartnerFileNamesSubject = new BehaviorSubject<string[]>([]);
    magicPartnerFileNames$ = this.magicPartnerFileNamesSubject.asObservable();

    private selectedMagicPartnerFileSubject = new BehaviorSubject<string>('');
    selectedMagicPartnerFile$ = this.selectedMagicPartnerFileSubject.asObservable();

    private selectedMagicServiceSubject = new BehaviorSubject<string>('');
    selectedMagicService$ = this.selectedMagicServiceSubject.asObservable();

    private magicResponsePartsSubject = new BehaviorSubject<MagicServiceResultPart[]>([]);

    private magicServiceColumnsSubject = new BehaviorSubject<{ boColumn: string; partnerColumn: string } | null>(null);

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
        // Charger l'utilisateur et le token depuis le localStorage au démarrage
        this.loadUserFromStorage();
    }

    setCurrentStep(step: number) {
        this.currentStepSubject.next(step);
    }

    getCurrentStep(): number {
        return this.currentStepSubject.value;
    }

    async setStatsData(data: any) {
        if (!data) {
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
                return formatted;
            });

            const response = await this.http.post('/api/statistics/save', formattedData).toPromise();
            this.statsDataSubject.next(normalizedData);
        } catch (error) {
            throw error;
        }
    }

    getStatsData(): Observable<any[]> {
        return this.statsData$;
    }

    clearStatsData() {
        this.statsDataSubject.next([]);
    }

    startReconciliation(service: string) {
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
        this.boDataSubject.next(boData);
        this.partnerDataSubject.next(partnerData);
    }

    setReconciliationType(type: '1-1' | '1-2' | '1-3' | '1-4' | '1-5') {
        // Stocker dans localStorage pour persistance
        localStorage.setItem('reconciliationType', type);
    }

    getReconciliationType(): '1-1' | '1-2' | '1-3' | '1-4' | '1-5' {
        const type = localStorage.getItem('reconciliationType') as '1-1' | '1-2' | '1-3' | '1-4' | '1-5';
        return type || '1-1'; // Par défaut 1-1
    }

    setReconciliationLaunchMode(mode: ReconciliationLaunchMode): void {
        try {
            localStorage.setItem(RECONCILIATION_LAUNCH_MODE_KEY, mode);
        } catch {
            // ignore quota errors
        }
    }

    getReconciliationLaunchMode(): ReconciliationLaunchMode {
        const stored = localStorage.getItem(RECONCILIATION_LAUNCH_MODE_KEY);
        if (stored === 'manual' || stored === 'assisted' || stored === 'magic') {
            return stored;
        }
        return 'manual';
    }

    setReconciliationEntryPath(path: string): void {
        try {
            localStorage.setItem(RECONCILIATION_ENTRY_PATH_KEY, path);
        } catch {
            // ignore
        }
    }

    getReconciliationEntryPath(): string {
        return localStorage.getItem(RECONCILIATION_ENTRY_PATH_KEY) || '';
    }

    getDefaultEntryPathForMode(mode: ReconciliationLaunchMode): string {
        switch (mode) {
            case 'assisted':
                return '/upload-assisted';
            case 'magic':
                return '/reconciliation-launcher';
            default:
                return '/upload';
        }
    }

    /** Réinitialise l'état d'une réconciliation terminée (conserve le mode utilisé). */
    resetForNewReconciliation(): void {
        this.clearReconciliationResults();
        this.clearReconciliationData();
        this.clearUploadedFiles();
        this.setCurrentStep(1);
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
        this.reconciliationResultSubject.next(results);
    }

    getReconciliationResults(): Observable<ReconciliationResponse | null> {
        return this.reconciliationResult$;
    }

    clearReconciliationResults() {
        this.reconciliationResultSubject.next(null);
        this.magicServiceSummariesSubject.next([]);
        this.magicPartnerFileNamesSubject.next([]);
        this.selectedMagicPartnerFileSubject.next('');
        this.selectedMagicServiceSubject.next('');
        this.magicResponsePartsSubject.next([]);
        this.magicServiceColumnsSubject.next(null);
    }

    setMagicServiceSummaries(summaries: MagicServiceSummary[]) {
        this.magicServiceSummariesSubject.next(summaries);
    }

    getMagicServiceSummaries(): MagicServiceSummary[] {
        return this.magicServiceSummariesSubject.value;
    }

    setMagicPartnerFileNames(fileNames: string[]) {
        this.magicPartnerFileNamesSubject.next(fileNames);
    }

    getMagicPartnerFileNames(): string[] {
        return this.magicPartnerFileNamesSubject.value;
    }

    setSelectedMagicPartnerFile(fileName: string) {
        this.selectedMagicPartnerFileSubject.next(fileName);
    }

    getSelectedMagicPartnerFile(): string {
        return this.selectedMagicPartnerFileSubject.value;
    }

    setSelectedMagicService(service: string) {
        this.selectedMagicServiceSubject.next(service || '');
    }

    getSelectedMagicService(): string {
        return this.selectedMagicServiceSubject.value;
    }

    setMagicResponseParts(parts: MagicServiceResultPart[]) {
        this.magicResponsePartsSubject.next(parts);
    }

    getMagicResponseParts(): MagicServiceResultPart[] {
        return this.magicResponsePartsSubject.value;
    }

    setMagicServiceColumns(columns: { boColumn: string; partnerColumn: string } | null) {
        this.magicServiceColumnsSubject.next(columns);
    }

    getMagicServiceColumns(): { boColumn: string; partnerColumn: string } | null {
        return this.magicServiceColumnsSubject.value;
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

    /** Profil métier « Contrôle Interne » (sans inclure l'admin). */
    isControleInterneProfil(): boolean {
        const token = this.normalizeProfilToken(this.userRights?.profil);
        if (!token) {
            return false;
        }
        return token === 'CONTROLEINTERNE'
            || (token.includes('CONTROLE') && token.includes('INTERNE'));
    }

    /** Validation contrôle interne BO vs Partenaire : admin ou profil Contrôle Interne. */
    canValidateControleInterneBoPartenaire(): boolean {
        return this.isAdmin() || this.isControleInterneProfil();
    }

    /** Annulation d'une validation : administrateur uniquement. */
    canRevokeControleInterneBoPartenaire(): boolean {
        return this.isAdmin();
    }

    private normalizeProfilToken(profil?: string | null): string {
        if (!profil) {
            return '';
        }
        return profil
            .normalize('NFD')
            .replace(/\p{M}/gu, '')
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '');
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

    canAccessRoute(route: string | null | undefined): boolean {
        if (!route) {
            return false;
        }

        if (this.isAdmin()) {
            return true;
        }

        const normalizedRoute = this.normalizeRoutePath(route);
        const candidate = this.postLoginRouteCandidates.find(item => item.path === normalizedRoute);

        if (!candidate || !candidate.module) {
            return true;
        }

        return this.isModuleAllowed(candidate.module)
            && this.hasAllModulePermissions(candidate.module, candidate.permissions ?? []);
    }

    resolveAccessibleRoute(preferredRoute?: string | null): string {
        const normalizedPreferredRoute = this.normalizeRoutePath(preferredRoute);
        if (normalizedPreferredRoute && this.canAccessRoute(normalizedPreferredRoute)) {
            return preferredRoute!.trim();
        }

        const fallback = this.postLoginRouteCandidates.find(candidate => this.canAccessRoute(candidate.path));
        return fallback?.path ?? '/aide';
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

    private normalizeRoutePath(route?: string | null): string | null {
        if (!route) {
            return null;
        }

        const trimmedRoute = route.trim();
        if (!trimmedRoute) {
            return null;
        }

        const [path] = trimmedRoute.split('?');
        return path || null;
    }

    // Méthodes pour gérer les fichiers uploadés
    setUploadedFiles(files: { boFile: File | null; partnerFile: File | null }) {
        this.uploadedFilesSubject.next(files);
    }

    getUploadedFiles(): { boFile: File | null; partnerFile: File | null } {
        return this.uploadedFilesSubject.value;
    }

    // Méthodes pour gérer les données parsées
    setBoData(data: Record<string, string>[]) {
        this.boDataSubject.next(data);
    }

    setPartnerData(data: Record<string, string>[]) {
        this.partnerDataSubject.next(data);
    }

    clearData() {
        this.boDataSubject.next([]);
        this.partnerDataSubject.next([]);
        this.uploadedFilesSubject.next({ boFile: null, partnerFile: null });
    }
} 