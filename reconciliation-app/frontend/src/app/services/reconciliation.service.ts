import { Injectable, OnInit, OnDestroy } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, Subject, timer, from, timeout, of, defer, firstValueFrom, Subscription } from 'rxjs';
import { catchError, tap, map, finalize, retry, takeUntil, switchMap, retryWhen, delay, concatMap } from 'rxjs/operators';
import { ReconciliationRequest } from '../models/reconciliation-request.model';
import { ReconciliationResponse } from '../models/reconciliation-response.model';
import { AppStateService } from './app-state.service';
import { AgencySummaryData } from './reconciliation-summary.service';
import { EcartBoSummaryPendingLine } from './ecart-bo-summary.service';
import { fixGarbledCharacters } from '../utils/encoding-fixer';
import { countryNameFromCode } from '../utils/country-codes.util';

export interface ReconciliationConfig {
    boFile: File;
    partnerFile: File;
    boReconciliationKey: string;
    partnerReconciliationKey: string;
    additionalKeys?: Array<{ boColumn: string; partnerColumn: string }>;
    tolerance?: number;
}

export interface ChunkProcessingConfig {
    boReconciliationKey: string;
    partnerReconciliationKey: string;
}

export interface ProgressUpdate {
    percentage: number;
    processed: number;
    total: number;
    step: string;
    currentFile?: number;
    totalFiles?: number;
    estimatedTimeRemaining?: number;
    // Informations détaillées pour le traitement par chunks
    currentBoChunk?: number;
    totalBoChunks?: number;
    matchesCount?: number;
    boOnlyCount?: number;
    partnerRemaining?: number;
}

@Injectable({
    providedIn: 'root'
})
export class ReconciliationService implements OnInit, OnDestroy {
    private static readonly MAX_429_RETRIES = 4;
    private static readonly LAUNCH_WATCHDOG_MS = 30_000;
    private static readonly LAUNCH_WATCHDOG_MAX_MS = 600_000;
    private static readonly LIVE_PROGRESS_POLL_MS = 4_500;
    private static readonly MAX_AUTO_RELAUNCH_ATTEMPTS = 2;
    private static readonly BACKEND_PENDING_STEP = 'en attente';
    private apiUrl = '/api/reconciliation';
    private memoryResults = new Map<string, any>(); // Stockage en mémoire pour les gros fichiers
    
    // Progress management
    private progressSubject = new BehaviorSubject<ProgressUpdate>({
        percentage: 0,
        processed: 0,
        total: 0,
        step: '',
        currentFile: 0,
        totalFiles: 0,
        estimatedTimeRemaining: 0
    });
    
    public progress$ = this.progressSubject.asObservable();

    /** Indique si un appel reconcile() est en cours (tous modes). */
    private reconciliationRunningSubject = new BehaviorSubject<boolean>(false);
    public reconciliationRunning$ = this.reconciliationRunningSubject.asObservable();
    
    // Job management
    private currentJobId: string | null = null;
    private boEcartsSessionCache = new Map<string, { boOnly: Record<string, string>[]; mismatches: Record<string, string>[] }>();
    private ecartBoSummaryLinesCache = new Map<string, EcartBoSummaryPendingLine[]>();
    private partnerOnlySessionCache = new Map<string, Record<string, string>[]>();
    private destroy$ = new Subject<void>();
    
    constructor(private http: HttpClient, private appStateService: AppStateService) {
    }

    private with429Retry<T>(factory: () => Observable<T>, attempt = 0): Observable<T> {
        return factory().pipe(
            catchError((error: HttpErrorResponse | any) => {
                if (error?.status === 429 && attempt < ReconciliationService.MAX_429_RETRIES) {
                    const delayMs = Math.min(3000 * Math.pow(2, attempt), 30000);
                    return timer(delayMs).pipe(
                        switchMap(() => this.with429Retry(factory, attempt + 1))
                    );
                }

                return throwError(() => error);
            })
        );
    }

    ngOnInit(): void {
        // Initialisation si nécessaire
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Démarre la réconciliation avec upload des fichiers
     * Mode HTTP classique sans WebSocket
     */
    startReconciliation(config: ReconciliationConfig): Observable<{ jobId: string; status: string }> {
        
        // Détecter si c'est un gros fichier nécessitant un traitement par chunks
        const isLargeFile = this.isLargeFile(config.boFile, config.partnerFile);
        
        if (isLargeFile) {
            return this.startChunkedReconciliation(config);
        }
        
        // Créer le FormData pour l'upload
        const formData = new FormData();
        formData.append('boFile', config.boFile);
        formData.append('partnerFile', config.partnerFile);
        formData.append('boReconciliationKey', config.boReconciliationKey);
        formData.append('partnerReconciliationKey', config.partnerReconciliationKey);
        
        if (config.additionalKeys) {
            formData.append('additionalKeys', JSON.stringify(config.additionalKeys));
        }
        
        if (config.tolerance) {
            formData.append('tolerance', config.tolerance.toString());
        }

        // Mettre à jour la progression
        this.updateProgress({
            percentage: 10,
            processed: 0,
            total: 100,
            step: 'Upload des fichiers...',
            estimatedTimeRemaining: 30000
        });

        return this.with429Retry(() => this.http.post<{ jobId: string; status: string }>(`${this.apiUrl}/upload-and-prepare`, formData))
            .pipe(
                tap(response => {
                    this.currentJobId = response.jobId;
                    
                    this.updateProgress({
                        percentage: 20,
                        processed: 0,
                        total: 100,
                        step: 'Traitement en cours...',
                        estimatedTimeRemaining: 25000
                    });
                }),
                catchError(this.handleError)
            );
    }

    /**
     * Démarre la réconciliation par chunks pour les gros fichiers
     */
    private startChunkedReconciliation(config: ReconciliationConfig): Observable<{ jobId: string; status: string }> {
        
        // Pour les très gros fichiers, utiliser le traitement côté frontend
        if (this.isVeryLargeFile(config.boFile, config.partnerFile)) {
            return this.startFrontendChunkedReconciliation(config);
        }
        
        // Créer le FormData avec indication de traitement par chunks
        const formData = new FormData();
        formData.append('boFile', config.boFile);
        formData.append('partnerFile', config.partnerFile);
        formData.append('boReconciliationKey', config.boReconciliationKey);
        formData.append('partnerReconciliationKey', config.partnerReconciliationKey);
        formData.append('chunkedProcessing', 'true'); // Indicateur pour le backend
        
        if (config.additionalKeys) {
            formData.append('additionalKeys', JSON.stringify(config.additionalKeys));
        }
        
        if (config.tolerance) {
            formData.append('tolerance', config.tolerance.toString());
        }

        // Mettre à jour la progression
        this.updateProgress({
            percentage: 5,
            processed: 0,
            total: 100,
            step: 'Préparation du traitement par chunks...',
            estimatedTimeRemaining: 60000
        });

        return this.with429Retry(() => this.http.post<{ jobId: string; status: string }>(`${this.apiUrl}/upload-and-prepare-chunked`, formData))
            .pipe(
                tap(response => {
                    this.currentJobId = response.jobId;
                    
                    this.updateProgress({
                        percentage: 15,
                        processed: 0,
                        total: 100,
                        step: 'Traitement par chunks en cours...',
                        estimatedTimeRemaining: 45000
                    });
                }),
                catchError(this.handleError)
            );
    }

    /**
     * Démarre la réconciliation par chunks côté frontend pour les très gros fichiers
     */
    private startFrontendChunkedReconciliation(config: ReconciliationConfig): Observable<{ jobId: string; status: string }> {
        
        return new Observable(observer => {
            // Simuler un job ID pour le traitement frontend
            const jobId = `frontend-chunked-${Date.now()}`;
            this.currentJobId = jobId;
            
            // Mettre à jour la progression
            this.updateProgress({
                percentage: 10,
                processed: 0,
                total: 100,
                step: 'Traitement frontend par chunks...',
                estimatedTimeRemaining: 120000
            });
            
            // Lancer le traitement asynchrone
            this.processFrontendChunkedReconciliation(config, jobId)
                .then(() => {
                    observer.next({ jobId, status: 'completed' });
                    observer.complete();
                })
                .catch(error => {
                    observer.error(error);
                });
        });
    }

    /**
     * Traite la réconciliation par chunks côté frontend
     */
    private async processFrontendChunkedReconciliation(config: ReconciliationConfig, jobId: string): Promise<void> {
        try {
            
            // Lire les fichiers par chunks
            const boData = await this.readFileInChunks(config.boFile);
            const partnerData = await this.readFileInChunks(config.partnerFile);
            
            
            // Traitement par chunks de la réconciliation
            const chunkSize = 10000; // 10k lignes par chunk
            const results = {
                matchedRecords: [],
                unmatchedBoRecords: [],
                unmatchedPartnerRecords: [],
                totalBoRecords: boData.length,
                totalPartnerRecords: partnerData.length
            };
            const partnerIndex = this.buildPartnerIndex(partnerData, config.partnerReconciliationKey);
            
            // Traiter les données par chunks
            for (let i = 0; i < boData.length; i += chunkSize) {
                const boChunk = boData.slice(i, i + chunkSize);
                
                // Traitement du chunk contre l'index partenaire global.
                const chunkResults = this.processReconciliationChunk(boChunk, partnerIndex, config);
                
                // Fusionner les résultats
                results.matchedRecords.push(...chunkResults.matchedRecords);
                results.unmatchedBoRecords.push(...chunkResults.unmatchedBoRecords);
                
                // Mettre à jour la progression
                const progress = Math.min(90, (i / boData.length) * 100);
                this.updateProgress({
                    percentage: progress,
                    processed: i,
                    total: boData.length,
                    step: `Traitement chunk ${Math.floor(i / chunkSize) + 1}...`,
                    estimatedTimeRemaining: Math.max(0, (boData.length - i) * 10)
                });
                
                // Permettre à l'interface de respirer
                if (i % (chunkSize * 5) === 0) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
            }
            results.unmatchedPartnerRecords.push(...this.collectRemainingPartnerRecords(partnerIndex));
            
            // Sauvegarder les résultats
            this.saveChunkedResults(jobId, results, config);
            
            this.updateProgress({
                percentage: 100,
                processed: boData.length,
                total: boData.length,
                step: 'Traitement terminé',
                estimatedTimeRemaining: 0
            });
            
        } catch (error) {
            throw error;
        }
    }

    /**
     * Lit un fichier par chunks pour éviter les problèmes de mémoire
     */
    private async readFileInChunks(file: File): Promise<any[]> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            const data: any[] = [];
            
            reader.onload = (e) => {
                try {
                    const text = (e.target as FileReader).result as string;
                    const lines = text.split('\n');
                    
                    // Traitement par chunks des lignes
                    const chunkSize = 5000;
                    for (let i = 0; i < lines.length; i += chunkSize) {
                        const chunk = lines.slice(i, i + chunkSize);
                        // Traitement du chunk (parsing CSV simplifié)
                        const parsedChunk = this.parseCsvChunk(chunk);
                        data.push(...parsedChunk);
                    }
                    
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    /**
     * Parse un chunk de CSV
     */
    private parseCsvChunk(lines: string[]): any[] {
        const result: any[] = [];
        const headers = lines[0]?.split(';') || [];
        
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const values = lines[i].split(';');
                const row: any = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });
                result.push(row);
            }
        }
        
        return result;
    }

    /**
     * Traite un chunk de réconciliation
     */
    private processReconciliationChunk(boChunk: any[], partnerIndex: Map<string, any[]>, config: ChunkProcessingConfig): any {
        const matchedRecords: any[] = [];
        const unmatchedBoRecords: any[] = [];
        const unmatchedPartnerRecords: any[] = [];
        
        // Traiter les enregistrements BO
        for (const boRecord of boChunk) {
            const boKey = boRecord[config.boReconciliationKey];
            if (boKey && partnerIndex.has(boKey)) {
                const matchingPartners = partnerIndex.get(boKey);
                if (matchingPartners && matchingPartners.length > 0) {
                    // Une ligne BO consomme une ligne partenaire (clé identique = file d’attente 1:1).
                    // Ne pas retirer 2 lignes d’un coup : les doublons partenaire sinon ne remontent pas en écart part.
                    const consumedPartners = matchingPartners.splice(0, 1);
                    matchedRecords.push({
                        bo: boRecord,
                        partner: consumedPartners[0],
                        partnerDataList: consumedPartners
                    });
                    if (matchingPartners.length === 0) {
                        partnerIndex.delete(boKey);
                    }
                } else {
                    unmatchedBoRecords.push(boRecord);
                }
            } else {
                unmatchedBoRecords.push(boRecord);
            }
        }

        return { matchedRecords, unmatchedBoRecords, unmatchedPartnerRecords };
    }

    private buildPartnerIndex(partnerData: any[], partnerReconciliationKey: string): Map<string, any[]> {
        const partnerIndex = new Map<string, any[]>();
        partnerData.forEach(partner => {
            const key = partner[partnerReconciliationKey];
            if (key) {
                if (!partnerIndex.has(key)) {
                    partnerIndex.set(key, []);
                }
                partnerIndex.get(key)!.push(partner);
            }
        });
        return partnerIndex;
    }

    private collectRemainingPartnerRecords(partnerIndex: Map<string, any[]>): any[] {
        const remainingPartnerRecords: any[] = [];
        partnerIndex.forEach(partners => {
            if (partners.length > 0) {
                remainingPartnerRecords.push(...partners);
            }
        });
        return remainingPartnerRecords;
    }

    /**
     * Sauvegarde les résultats du traitement par chunks
     */
    private saveChunkedResults(jobId: string, results: any, config?: ChunkProcessingConfig): void {
        try {
            
            // Sauvegarder toutes les données mais de manière optimisée
            const fullResults = {
                jobId: jobId,
                status: 'completed',
                totalBoRecords: results.totalBoRecords,
                totalPartnerRecords: results.totalPartnerRecords,
                totalMatched: results.matchedRecords.length,
                totalUnmatchedBo: results.unmatchedBoRecords.length,
                totalUnmatchedPartner: results.unmatchedPartnerRecords.length,
                boReconciliationKey: config?.boReconciliationKey || 'IDTransaction',
                partnerReconciliationKey: config?.partnerReconciliationKey || 'Identifiant de session API',
                // Sauvegarder TOUTES les données
                matchedRecords: results.matchedRecords,
                unmatchedBoRecords: results.unmatchedBoRecords,
                unmatchedPartnerRecords: results.unmatchedPartnerRecords,
                // Indicateur que c'est un traitement par chunks
                isChunkedProcessing: true,
                processedAt: new Date().toISOString()
            };
            
            // Sauvegarder par chunks pour éviter l'erreur de sérialisation
            this.saveResultsInChunks(jobId, fullResults);
            
            
        } catch (error) {
            // Sauvegarder au moins les métadonnées essentielles
            const minimalResults = {
                jobId: jobId,
                status: 'completed',
                totalBoRecords: results.totalBoRecords,
                totalPartnerRecords: results.totalPartnerRecords,
                totalMatched: results.matchedRecords.length,
                totalUnmatchedBo: results.unmatchedBoRecords.length,
                totalUnmatchedPartner: results.unmatchedPartnerRecords.length,
                isChunkedProcessing: true,
                processedAt: new Date().toISOString()
            };
            
            localStorage.setItem(`reconciliation-results-${jobId}`, JSON.stringify(minimalResults));
        }
    }

    /**
     * Sauvegarde les résultats par chunks pour éviter les erreurs de sérialisation
     */
    private saveResultsInChunks(jobId: string, results: any): void {
        try {
            // Pour les très gros fichiers, utiliser la mémoire en temps réel au lieu du localStorage
            if (results.totalMatched > 10000 || results.totalUnmatchedBo > 10000 || results.totalUnmatchedPartner > 10000) {
                this.saveInMemory(jobId, results);
                return;
            }
            
            // Sauvegarder les métadonnées d'abord
            const metadata = {
                jobId: results.jobId,
                status: results.status,
                totalBoRecords: results.totalBoRecords,
                totalPartnerRecords: results.totalPartnerRecords,
                totalMatched: results.totalMatched,
                totalUnmatchedBo: results.totalUnmatchedBo,
                totalUnmatchedPartner: results.totalUnmatchedPartner,
                boReconciliationKey: results.boReconciliationKey,
                partnerReconciliationKey: results.partnerReconciliationKey,
                isChunkedProcessing: results.isChunkedProcessing,
                processedAt: results.processedAt
            };
            
            localStorage.setItem(`reconciliation-results-${jobId}`, JSON.stringify(metadata));
            
            // Sauvegarder les données par chunks plus petits
            const chunkSize = 500; // 500 enregistrements par chunk pour éviter le quota
            
            // Sauvegarder les matches par chunks
            for (let i = 0; i < results.matchedRecords.length; i += chunkSize) {
                const chunk = results.matchedRecords.slice(i, i + chunkSize);
                const chunkKey = `reconciliation-matches-${jobId}-${Math.floor(i / chunkSize)}`;
                try {
                    localStorage.setItem(chunkKey, JSON.stringify(chunk));
                } catch (error) {
                    this.saveInMemory(jobId, results);
                    return;
                }
            }
            
            // Sauvegarder les unmatchedBo par chunks
            for (let i = 0; i < results.unmatchedBoRecords.length; i += chunkSize) {
                const chunk = results.unmatchedBoRecords.slice(i, i + chunkSize);
                const chunkKey = `reconciliation-bo-only-${jobId}-${Math.floor(i / chunkSize)}`;
                try {
                    localStorage.setItem(chunkKey, JSON.stringify(chunk));
                } catch (error) {
                    this.saveInMemory(jobId, results);
                    return;
                }
            }
            
            // Sauvegarder les unmatchedPartner par chunks
            for (let i = 0; i < results.unmatchedPartnerRecords.length; i += chunkSize) {
                const chunk = results.unmatchedPartnerRecords.slice(i, i + chunkSize);
                const chunkKey = `reconciliation-partner-only-${jobId}-${Math.floor(i / chunkSize)}`;
                try {
                    localStorage.setItem(chunkKey, JSON.stringify(chunk));
                } catch (error) {
                    this.saveInMemory(jobId, results);
                    return;
                }
            }
            
        } catch (error) {
            // En cas d'erreur, passer en mode mémoire
            this.saveInMemory(jobId, results);
        }
    }

    /**
     * Sauvegarde en mémoire pour les très gros fichiers
     */
    private saveInMemory(jobId: string, results: any): void {
        // Stocker en mémoire dans le service
        this.memoryResults.set(jobId, {
            jobId: results.jobId,
            status: results.status,
            totalBoRecords: results.totalBoRecords,
            totalPartnerRecords: results.totalPartnerRecords,
            totalMatched: results.totalMatched,
            totalUnmatchedBo: results.totalUnmatchedBo,
            totalUnmatchedPartner: results.totalUnmatchedPartner,
            boReconciliationKey: results.boReconciliationKey,
            partnerReconciliationKey: results.partnerReconciliationKey,
            isChunkedProcessing: results.isChunkedProcessing,
            processedAt: results.processedAt,
            // Stocker toutes les données en mémoire
            matchedRecords: results.matchedRecords,
            unmatchedBoRecords: results.unmatchedBoRecords,
            unmatchedPartnerRecords: results.unmatchedPartnerRecords
        });
        
    }

    /**
     * Détermine si c'est un très gros fichier nécessitant un traitement frontend
     */
    private isVeryLargeFile(boFile: File, partnerFile: File): boolean {
        // Désactiver le traitement frontend pour forcer l'utilisation du backend
        // Le backend est plus optimisé pour les gros volumes et la logique de correspondance
        return false;
    }

    /**
     * Détermine si les fichiers nécessitent un traitement par chunks
     */
    private isLargeFile(boFile: File, partnerFile: File): boolean {
        const totalSize = boFile.size + partnerFile.size;
        const sizeThreshold = 50 * 1024 * 1024; // 50MB
        
        // Vérifier la taille totale
        if (totalSize > sizeThreshold) {
            return true;
        }
        
        // Vérifier le nombre de lignes estimé (basé sur la taille)
        const estimatedBoRows = Math.ceil(boFile.size / 100); // Estimation approximative
        const estimatedPartnerRows = Math.ceil(partnerFile.size / 100);
        
        return estimatedBoRows > 100000 || estimatedPartnerRows > 100000;
    }

    /**
     * Obtient le statut d'un job de réconciliation
     */
    getJobStatus(jobId: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/progress/${jobId}`)
            .pipe(
                tap((status: any) => {
                    
                    // Mettre à jour la progression basée sur le statut
                    if (status.progress) {
                        this.updateProgress({
                            percentage: status.progress.percentage || 0,
                            processed: status.progress.processed || 0,
                            total: status.progress.total || 100,
                            step: status.progress.step || 'Traitement...',
                            estimatedTimeRemaining: status.progress.estimatedTimeRemaining || 0
                        });
                    }
                }),
                catchError(this.handleError)
            );
    }

    /**
     * Obtient les résultats d'un job de réconciliation
     */
    getJobResults(jobId: string): Observable<ReconciliationResponse> {
        // Vérifier si c'est un job de traitement frontend
        if (jobId.startsWith('frontend-chunked-')) {
            return this.getFrontendChunkedResults(jobId);
        }
        
        // Pour les fichiers volumineux, charger uniquement le résumé
        return this.getJobResultsSummary(jobId);
    }

    /**
     * Charge uniquement le résumé des résultats (sans les données détaillées)
     * Optimisé pour les fichiers volumineux et les connexions distantes
     */
    getJobResultsSummary(jobId: string): Observable<ReconciliationResponse> {
        
        // Timeout adapté pour les connexions distantes (60 secondes pour les gros fichiers)
        const RESULTS_TIMEOUT = 60000;
        
        return this.http.get<ReconciliationResponse>(`${this.apiUrl}/results/summary?sessionId=${jobId}`)
            .pipe(
                timeout(RESULTS_TIMEOUT),
                // Retry avec backoff exponentiel pour les erreurs réseau
                retryWhen(errors =>
                    errors.pipe(
                        concatMap((error, index) => {
                            const retryAttempt = index + 1;
                            // Ne pas retry les erreurs 404 (résultats non trouvés) ou 4xx (erreurs client)
                            if (error.status === 404 || (error.status >= 400 && error.status < 500)) {
                                return throwError(error);
                            }
                            // Maximum 3 tentatives avec backoff exponentiel : 2s, 4s, 8s
                            if (retryAttempt > 3) {
                                return throwError(error);
                            }
                            const delayTime = Math.min(2000 * Math.pow(2, retryAttempt - 1), 8000);
                            return timer(delayTime);
                        })
                    )
                ),
                tap(results => {
                    
                    this.updateProgress({
                        percentage: 100,
                        processed: results.totalBoRecords + results.totalPartnerRecords,
                        total: results.totalBoRecords + results.totalPartnerRecords,
                        step: 'Terminé',
                        estimatedTimeRemaining: 0
                    });
                }),
                catchError(this.handleError)
            );
    }

    /**
     * Charge les matches avec pagination
     */
    getMatches(jobId: string, page: number = 0, size: number = 1000): Observable<{ matches: any[], total: number, page: number, size: number, totalPages: number }> {
        
        return this.http.get<{ matches: any[], total: number, page: number, size: number, totalPages: number }>(
            `${this.apiUrl}/results/matches?sessionId=${jobId}&page=${page}&size=${size}`
        ).pipe(
            tap(response => {
            }),
            catchError(this.handleError)
        );
    }

    /**
     * Charge les mismatches avec pagination
     */
    getMismatches(jobId: string, page: number = 0, size: number = 1000): Observable<{ mismatches: any[], total: number, page: number, size: number, totalPages: number }> {
        
        return this.http.get<{ mismatches: any[], total: number, page: number, size: number, totalPages: number }>(
            `${this.apiUrl}/results/mismatches?sessionId=${jobId}&page=${page}&size=${size}`
        ).pipe(
            tap(response => {
            }),
            catchError(this.handleError)
        );
    }

    /**
     * Charge les boOnly avec pagination
     */
    getBoOnly(jobId: string, page: number = 0, size: number = 1000): Observable<{ boOnly: any[], total: number, page: number, size: number, totalPages: number }> {
        
        return this.http.get<{ boOnly: any[], total: number, page: number, size: number, totalPages: number }>(
            `${this.apiUrl}/results/bo-only?sessionId=${jobId}&page=${page}&size=${size}`
        ).pipe(
            tap(response => {
            }),
            catchError(this.handleError)
        );
    }

    /**
     * Charge les partnerOnly avec pagination
     */
    getPartnerOnly(jobId: string, page: number = 0, size: number = 1000): Observable<{ partnerOnly: any[], total: number, page: number, size: number, totalPages: number }> {
        
        return this.http.get<{ partnerOnly: any[], total: number, page: number, size: number, totalPages: number }>(
            `${this.apiUrl}/results/partner-only?sessionId=${jobId}&page=${page}&size=${size}`
        ).pipe(
            tap(response => {
            }),
            catchError(this.handleError)
        );
    }

    /**
     * Charge toutes les pages de détail (réponse HTTP tronquée / pagination serveur).
     */
    async loadAllDetailResults(
        sessionId: string,
        pageSize = 2000
    ): Promise<Pick<ReconciliationResponse, 'matches' | 'boOnly' | 'partnerOnly' | 'mismatches'>> {
        const [matches, boOnly, partnerOnly, mismatches] = await Promise.all([
            this.loadAllPaginatedPages(
                page => firstValueFrom(this.getMatches(sessionId, page, pageSize)),
                'matches'
            ),
            this.loadAllPaginatedPages(
                page => firstValueFrom(this.getBoOnly(sessionId, page, pageSize)),
                'boOnly'
            ),
            this.loadAllPaginatedPages(
                page => firstValueFrom(this.getPartnerOnly(sessionId, page, pageSize)),
                'partnerOnly'
            ),
            this.loadAllPaginatedPages(
                page => firstValueFrom(this.getMismatches(sessionId, page, pageSize)),
                'mismatches'
            )
        ]);

        return { matches, boOnly, partnerOnly, mismatches };
    }

    private async loadAllPaginatedPages<T extends Record<string, unknown>>(
        fetchPage: (page: number) => Promise<T>,
        itemsKey: keyof T
    ): Promise<any[]> {
        const all: any[] = [];
        let page = 0;
        let totalPages = 1;

        while (page < totalPages) {
            const response = await fetchPage(page);
            totalPages = typeof response.totalPages === 'number' ? response.totalPages : 1;
            const chunk = response[itemsKey];
            if (Array.isArray(chunk)) {
                all.push(...chunk);
            }
            page++;
        }

        return all;
    }

    /**
     * Agrège le résumé par agence (serveur en priorité, repli pagination client).
     */
    async loadAgencySummaryAggregated(
        sessionId: string,
        pageSize = 5000,
        onProgress?: (processedPages: number, totalPages: number) => void
    ): Promise<{
        summary: AgencySummaryData[];
        meta: { totalPartnerOnly: number; hasPartnerOnlyWithAgencyService: boolean; partnerOnlyWithoutAgency: number };
    }> {
        try {
            const serverPayload = await firstValueFrom(this.http.get<{
                success?: boolean;
                summary?: AgencySummaryData[];
                meta?: {
                    totalPartnerOnly?: number;
                    hasPartnerOnlyWithAgencyService?: boolean;
                    partnerOnlyWithoutAgency?: number;
                };
            }>(`${this.apiUrl}/results/agency-summary?sessionId=${encodeURIComponent(sessionId)}`));

            if (serverPayload?.success && Array.isArray(serverPayload.summary) && serverPayload.summary.length > 0) {
                const meta = serverPayload.meta ?? {};
                return {
                    summary: serverPayload.summary,
                    meta: {
                        totalPartnerOnly: meta.totalPartnerOnly ?? 0,
                        hasPartnerOnlyWithAgencyService: !!meta.hasPartnerOnlyWithAgencyService,
                        partnerOnlyWithoutAgency: meta.partnerOnlyWithoutAgency ?? 0
                    }
                };
            }
        } catch (error) {
            console.warn('Agrégation serveur indisponible, repli pagination client:', error);
        }

        return this.loadAgencySummaryAggregatedClient(sessionId, pageSize, onProgress);
    }

    /**
     * Précharge les écarts BO en arrière-plan (juste après la réconciliation).
     */
    prefetchBoEcarts(sessionId: string): void {
        if (!sessionId || this.boEcartsSessionCache.has(sessionId)) {
            return;
        }
        void this.loadBoEcartsFromSession(sessionId).catch(() => undefined);
    }

    prefetchEcartBoSummaryLines(sessionId: string): void {
        if (!sessionId || this.ecartBoSummaryLinesCache.has(sessionId)) {
            return;
        }
        void this.loadEcartBoSummaryLines(sessionId).catch(() => undefined);
    }

    prefetchPartnerOnly(sessionId: string): void {
        if (!sessionId || this.partnerOnlySessionCache.has(sessionId)) {
            return;
        }
        void this.loadPartnerOnlyFromSession(sessionId).catch(() => undefined);
    }

    async loadPartnerOnlyFromSession(sessionId: string, pageSize = 5000): Promise<Record<string, string>[]> {
        const cached = this.partnerOnlySessionCache.get(sessionId);
        if (cached) {
            return cached;
        }

        const records = await this.loadAllPaginatedPages(
            page => firstValueFrom(this.getPartnerOnly(sessionId, page, pageSize)),
            'partnerOnly'
        );
        this.partnerOnlySessionCache.set(sessionId, records);
        return records;
    }

    /**
     * Charge uniquement les écarts BO (boOnly + mismatches) — léger même après réconciliation volumineuse.
     */
    async loadBoEcartsFromSession(
        sessionId: string
    ): Promise<{ boOnly: Record<string, string>[]; mismatches: Record<string, string>[] }> {
        const cached = this.boEcartsSessionCache.get(sessionId);
        if (cached) {
            return cached;
        }

        try {
            const payload = await firstValueFrom(this.http.get<{
                success?: boolean;
                boOnly?: Record<string, string>[];
                mismatches?: Record<string, string>[];
            }>(`${this.apiUrl}/results/ecart-bo-ecarts?sessionId=${encodeURIComponent(sessionId)}`));

            if (payload?.success) {
                const result = {
                    boOnly: payload.boOnly ?? [],
                    mismatches: payload.mismatches ?? []
                };
                this.boEcartsSessionCache.set(sessionId, result);
                return result;
            }
        } catch (error) {
            console.warn('Endpoint ecart-bo-ecarts indisponible, repli pagination:', error);
        }

        const [boOnly, mismatches] = await Promise.all([
            this.loadAllPaginatedPages(
                page => firstValueFrom(this.getBoOnly(sessionId, page, 5000)),
                'boOnly'
            ),
            this.loadAllPaginatedPages(
                page => firstValueFrom(this.getMismatches(sessionId, page, 5000)),
                'mismatches'
            )
        ]);
        const result = { boOnly, mismatches };
        this.boEcartsSessionCache.set(sessionId, result);
        return result;
    }

    /**
     * Lignes agrégées prêtes pour ecart-bo-summary (agrégation serveur).
     */
    async loadEcartBoSummaryLines(sessionId: string): Promise<EcartBoSummaryPendingLine[]> {
        const cached = this.ecartBoSummaryLinesCache.get(sessionId);
        if (cached) {
            return cached;
        }

        try {
            const payload = await firstValueFrom(this.http.get<{
                success?: boolean;
                lines?: Array<{
                    agence?: string;
                    service?: string;
                    pays?: string;
                    date?: string;
                    montant?: number;
                    statut?: string;
                    nombreTransactions?: number;
                }>;
            }>(`${this.apiUrl}/results/ecart-bo-summary-lines?sessionId=${encodeURIComponent(sessionId)}`));

            if (payload?.success && Array.isArray(payload.lines)) {
                const lines: EcartBoSummaryPendingLine[] = payload.lines.map(line => ({
                    agence: String(line.agence ?? ''),
                    service: String(line.service ?? ''),
                    pays: String(line.pays ?? ''),
                    date: String(line.date ?? ''),
                    montant: Number(line.montant) || 0,
                    statut: String(line.statut ?? 'EN_COURS'),
                    nombreTransactions: Number(line.nombreTransactions) || 1
                }));
                this.ecartBoSummaryLinesCache.set(sessionId, lines);
                return lines;
            }
        } catch (error) {
            console.warn('Endpoint ecart-bo-summary-lines indisponible:', error);
        }

        return [];
    }

    /**
     * Repli : agrège page par page côté client (gros volumes, plus lent).
     */
    private async loadAgencySummaryAggregatedClient(
        sessionId: string,
        pageSize = 5000,
        onProgress?: (processedPages: number, totalPages: number) => void
    ): Promise<{
        summary: AgencySummaryData[];
        meta: { totalPartnerOnly: number; hasPartnerOnlyWithAgencyService: boolean; partnerOnlyWithoutAgency: number };
    }> {

        const agenceKeys = ['Agence', 'agence', 'AGENCE', 'agency', 'Agency'];
        const serviceKeys = ['Service', 'service', 'SERVICE', 'serv', 'Serv'];
        const paysKeys = ['Pays', 'pays', 'PAYS', 'country', 'Country', 'GRX', 'grx', 'Pays provenance', 'pays provenance'];
        const dateKeys = ['Date', 'date', 'DATE', 'jour', 'Jour', 'JOUR', 'dateTransaction', 'DateTransaction', 'Date opération', 'dateOperation'];
        const amountKeys = ['montant', 'Montant', 'MONTANT', 'amount', 'Amount', 'AMOUNT', 'volume', 'Volume', 'VOLUME'];

        const getValue = (record: Record<string, string>, keys: string[]): string => {
            for (const key of keys) {
                const originalKey = Object.keys(record).find(k =>
                    fixGarbledCharacters(k).toLowerCase() === key.toLowerCase() ||
                    k.toLowerCase() === key.toLowerCase()
                );
                if (originalKey && record[originalKey] != null && String(record[originalKey]).trim() !== '') {
                    return String(record[originalKey]);
                }
                if (record[key] != null && String(record[key]).trim() !== '') {
                    return String(record[key]);
                }
            }
            return '';
        };

        const parseAmount = (raw: string): number => {
            if (!raw) return 0;
            const cleaned = String(raw).replace(/\s/g, '').replace(',', '.');
            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? 0 : parsed;
        };

        const ensureEntry = (
            targetMap: Map<string, AgencySummaryData>,
            agency: string,
            service: string,
            country: string,
            date: string
        ): AgencySummaryData => {
            const key = `${agency}|${service}|${country}`;
            let entry = targetMap.get(key);
            if (!entry) {
                entry = {
                    agency,
                    service,
                    country,
                    date,
                    totalVolume: 0,
                    recordCount: 0,
                    matches: 0,
                    boOnly: 0,
                    partnerOnly: 0,
                    mismatches: 0
                };
                targetMap.set(key, entry);
            }
            return entry;
        };

        const addBoRecordToMap = (
            targetMap: Map<string, AgencySummaryData>,
            record: Record<string, string>,
            field: 'matches' | 'boOnly' | 'mismatches'
        ) => {
            const agency = getValue(record, agenceKeys) || 'Inconnue';
            const service = getValue(record, serviceKeys) || 'Inconnu';
            const rawCountry = getValue(record, paysKeys);
            const country = rawCountry ? (countryNameFromCode(rawCountry.trim()) || rawCountry.trim()) : 'Inconnu';
            const date = getValue(record, dateKeys) || new Date().toISOString().split('T')[0];
            const entry = ensureEntry(targetMap, agency, service, country, date);
            entry[field]++;
            entry.recordCount++;
            entry.totalVolume += parseAmount(getValue(record, amountKeys) || '0');
        };

        let processedPages = 0;
        let totalPagesHint = 0;

        const aggregatePaginated = async <T extends Record<string, unknown>>(
            fetchPage: (page: number) => Promise<T>,
            itemsKey: keyof T,
            handler: (item: any) => void
        ) => {
            let page = 0;
            let totalPages = 1;
            while (page < totalPages) {
                const response = await fetchPage(page);
                totalPages = typeof response.totalPages === 'number' ? response.totalPages : 1;
                totalPagesHint = Math.max(totalPagesHint, totalPages);
                const chunk = response[itemsKey];
                if (Array.isArray(chunk)) {
                    for (const item of chunk) {
                        handler(item);
                    }
                }
                page++;
                processedPages++;
                onProgress?.(processedPages, totalPagesHint * 4);
                if (page < totalPages) {
                    await new Promise<void>(resolve => setTimeout(resolve, 0));
                }
            }
        };

        const aggregateBoStream = async (field: 'matches' | 'boOnly' | 'mismatches', fetchPage: (page: number) => Promise<any>, itemsKey: string) => {
            const streamMap = new Map<string, AgencySummaryData>();
            await aggregatePaginated(
                fetchPage,
                itemsKey as any,
                item => {
                    if (field === 'matches') {
                        addBoRecordToMap(streamMap, item?.boData || item || {}, field);
                    } else {
                        addBoRecordToMap(streamMap, item || {}, field);
                    }
                }
            );
            return streamMap;
        };

        const aggregatePartnerStream = async () => {
            const streamMap = new Map<string, AgencySummaryData>();
            let localPartnerOnlyWithoutAgency = 0;
            let localHasPartnerOnlyWithAgencyService = false;

            await aggregatePaginated(
                page => firstValueFrom(this.getPartnerOnly(sessionId, page, pageSize)),
                'partnerOnly',
                record => {
                    const agency = getValue(record || {}, agenceKeys) || 'Inconnue';
                    const service = getValue(record || {}, serviceKeys) || 'Inconnu';
                    if (agency !== 'Inconnue' && service !== 'Inconnu') {
                        localHasPartnerOnlyWithAgencyService = true;
                        const rawCountry = getValue(record || {}, paysKeys);
                        const country = rawCountry ? (countryNameFromCode(rawCountry.trim()) || rawCountry.trim()) : 'Inconnu';
                        const date = getValue(record || {}, dateKeys) || new Date().toISOString().split('T')[0];
                        const entry = ensureEntry(streamMap, agency, service, country, date);
                        entry.partnerOnly!++;
                        entry.recordCount++;
                        entry.totalVolume += parseAmount(getValue(record || {}, amountKeys) || '0');
                    } else {
                        localPartnerOnlyWithoutAgency++;
                    }
                }
            );

            return {
                map: streamMap,
                partnerOnlyWithoutAgency: localPartnerOnlyWithoutAgency,
                hasPartnerOnlyWithAgencyService: localHasPartnerOnlyWithAgencyService
            };
        };

        const mergeSummaryMaps = (maps: Map<string, AgencySummaryData>[]): Map<string, AgencySummaryData> => {
            const merged = new Map<string, AgencySummaryData>();
            for (const source of maps) {
                for (const [key, entry] of source) {
                    let target = merged.get(key);
                    if (!target) {
                        target = { ...entry };
                        merged.set(key, target);
                        continue;
                    }
                    target.matches = (target.matches || 0) + (entry.matches || 0);
                    target.boOnly = (target.boOnly || 0) + (entry.boOnly || 0);
                    target.partnerOnly = (target.partnerOnly || 0) + (entry.partnerOnly || 0);
                    target.mismatches = (target.mismatches || 0) + (entry.mismatches || 0);
                    target.recordCount = (target.recordCount || 0) + (entry.recordCount || 0);
                    target.totalVolume = (target.totalVolume || 0) + (entry.totalVolume || 0);
                    if (!target.date && entry.date) {
                        target.date = entry.date;
                    }
                }
            }
            return merged;
        };

        const [matchesMap, boOnlyMap, mismatchesMap, partnerResult] = await Promise.all([
            aggregateBoStream('matches', page => firstValueFrom(this.getMatches(sessionId, page, pageSize)), 'matches'),
            aggregateBoStream('boOnly', page => firstValueFrom(this.getBoOnly(sessionId, page, pageSize)), 'boOnly'),
            aggregateBoStream('mismatches', page => firstValueFrom(this.getMismatches(sessionId, page, pageSize)), 'mismatches'),
            aggregatePartnerStream()
        ]);

        const summaryMap = mergeSummaryMaps([matchesMap, boOnlyMap, mismatchesMap, partnerResult.map]);
        const partnerOnlyWithoutAgency = partnerResult.partnerOnlyWithoutAgency;
        const hasPartnerOnlyWithAgencyService = partnerResult.hasPartnerOnlyWithAgencyService;

        const summary = Array.from(summaryMap.values()).sort((a, b) => {
            if (a.agency !== b.agency) {
                return a.agency.localeCompare(b.agency);
            }
            return a.service.localeCompare(b.service);
        });

        const totalPartnerOnly = summary.reduce((n, s) => n + (s.partnerOnly || 0), 0) + partnerOnlyWithoutAgency;

        return {
            summary,
            meta: {
                totalPartnerOnly,
                hasPartnerOnlyWithAgencyService,
                partnerOnlyWithoutAgency
            }
        };
    }

    /**
     * Récupère les résultats du traitement frontend par chunks
     */
    private getFrontendChunkedResults(jobId: string): Observable<ReconciliationResponse> {
        return new Observable(observer => {
            try {
                // Vérifier d'abord en mémoire
                if (this.memoryResults.has(jobId)) {
                    const results = this.memoryResults.get(jobId);
                    
                    // Convertir au format standard
                    const response: ReconciliationResponse = {
                        matches: results.matchedRecords.map(match => ({
                            key: match.bo[results.boReconciliationKey] || '',
                            boData: match.bo,
                            partnerData: match.partner,
                            partnerDataList: match.partnerDataList,
                            differences: []
                        })),
                        boOnly: results.unmatchedBoRecords,
                        partnerOnly: results.unmatchedPartnerRecords,
                        mismatches: [],
                        totalBoRecords: results.totalBoRecords,
                        totalPartnerRecords: results.totalPartnerRecords,
                        totalMatches: results.totalMatched,
                        totalMismatches: 0,
                        totalBoOnly: results.totalUnmatchedBo,
                        totalPartnerOnly: results.totalUnmatchedPartner,
                        executionTimeMs: Date.now() - parseInt(jobId.split('-')[2]),
                        processedRecords: results.totalBoRecords + results.totalPartnerRecords,
                        progressPercentage: 100
                    };
                    
                    observer.next(response);
                    observer.complete();
                    return;
                }
                
                // Sinon, essayer le localStorage
                const resultsData = localStorage.getItem(`reconciliation-results-${jobId}`);
                if (resultsData) {
                    const results = JSON.parse(resultsData);
                    
                    // Vérifier si c'est un traitement par chunks avec données complètes
                    if (results.isChunkedProcessing) {
                        
                        // Récupérer toutes les données depuis les chunks
                        const allMatches = this.loadDataFromChunks(jobId, 'matches');
                        const allBoOnly = this.loadDataFromChunks(jobId, 'bo-only');
                        const allPartnerOnly = this.loadDataFromChunks(jobId, 'partner-only');
                        
                        
                        // Convertir au format standard
                        const response: ReconciliationResponse = {
                            matches: allMatches.map(match => ({
                                key: match.bo[results.boReconciliationKey] || '',
                                boData: match.bo,
                                partnerData: match.partner,
                                partnerDataList: match.partnerDataList,
                                differences: []
                            })),
                            boOnly: allBoOnly,
                            partnerOnly: allPartnerOnly,
                            mismatches: [],
                            totalBoRecords: results.totalBoRecords,
                            totalPartnerRecords: results.totalPartnerRecords,
                            totalMatches: results.totalMatched,
                            totalMismatches: 0,
                            totalBoOnly: results.totalUnmatchedBo,
                            totalPartnerOnly: results.totalUnmatchedPartner,
                            executionTimeMs: Date.now() - parseInt(jobId.split('-')[2]),
                            processedRecords: results.totalBoRecords + results.totalPartnerRecords,
                            progressPercentage: 100
                        };
                        
                        observer.next(response);
                        observer.complete();
                    } else {
                        // Ancien format (pour compatibilité)
                        const response: ReconciliationResponse = {
                            matches: (results.matchedRecords || []).map(match => ({
                                key: match.bo[results.boReconciliationKey] || '',
                                boData: match.bo,
                                partnerData: match.partner,
                                partnerDataList: match.partnerDataList,
                                differences: []
                            })),
                            boOnly: results.unmatchedBoRecords || [],
                            partnerOnly: results.unmatchedPartnerRecords || [],
                            mismatches: [],
                            totalBoRecords: results.totalBoRecords,
                            totalPartnerRecords: results.totalPartnerRecords,
                            totalMatches: results.matchedRecords?.length || 0,
                            totalMismatches: 0,
                            totalBoOnly: results.unmatchedBoRecords?.length || 0,
                            totalPartnerOnly: results.unmatchedPartnerRecords?.length || 0,
                            executionTimeMs: Date.now() - parseInt(jobId.split('-')[2]),
                            processedRecords: results.totalBoRecords + results.totalPartnerRecords,
                            progressPercentage: 100
                        };
                        
                        observer.next(response);
                        observer.complete();
                    }
                } else {
                    observer.error(new Error('Résultats non trouvés pour le job frontend'));
                }
            } catch (error) {
                observer.error(error);
            }
        });
    }

    /**
     * Charge les données depuis les chunks sauvegardés
     */
    private loadDataFromChunks(jobId: string, dataType: 'matches' | 'bo-only' | 'partner-only'): any[] {
        const allData: any[] = [];
        let chunkIndex = 0;
        
        while (true) {
            const chunkKey = `reconciliation-${dataType}-${jobId}-${chunkIndex}`;
            const chunkData = localStorage.getItem(chunkKey);
            
            if (!chunkData) {
                break; // Plus de chunks disponibles
            }
            
            try {
                const chunk = JSON.parse(chunkData);
                allData.push(...chunk);
                chunkIndex++;
            } catch (error) {
                break;
            }
        }
        
        return allData;
    }

    /**
     * Annule un job de réconciliation
     */
    cancelJob(jobId: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/cancel`, { jobId })
            .pipe(
                tap(() => {
                    this.currentJobId = null;
                }),
                catchError(this.handleError)
            );
    }

    /**
     * Obtient la progression actuelle
     */
    getProgress(): Observable<ProgressUpdate> {
        return this.progress$;
    }

    /**
     * Met à jour la progression
     */
    private updateProgress(progress: ProgressUpdate): void {
        this.progressSubject.next(progress);
    }

    /**
     * Obtient l'ID du job actuel
     */
    getCurrentJobId(): string | null {
        return this.currentJobId;
    }

    /**
     * Vérifie si un job est en cours
     */
    isJobRunning(): boolean {
        return this.currentJobId !== null;
    }

    isReconciliationRunning(): boolean {
        return this.reconciliationRunningSubject.value;
    }

    private createProgressSessionId(prefix = 'reco'): string {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }

    private ensureProgressSessionId(request: ReconciliationRequest): string {
        if (!request.progressSessionId?.trim()) {
            request.progressSessionId = this.createProgressSessionId();
        }
        return request.progressSessionId;
    }

    /**
     * Délai avant de considérer un blocage. Le backend ne crée le job qu'après réception
     * complète du JSON : les gros fichiers ont besoin de plus de temps d'upload/désérialisation.
     */
    private estimateLaunchWatchdogMs(request: ReconciliationRequest): number {
        const totalRows =
            (request.boFileContent?.length ?? 0) +
            (request.partnerFileContent?.length ?? 0);
        const estimated = ReconciliationService.LAUNCH_WATCHDOG_MS + totalRows * 5;
        return Math.min(
            Math.max(estimated, ReconciliationService.LAUNCH_WATCHDOG_MS),
            ReconciliationService.LAUNCH_WATCHDOG_MAX_MS
        );
    }

    private isBackendProgressAcknowledged(step?: string | null): boolean {
        if (!step) {
            return false;
        }
        const normalized = step.trim().toLowerCase();
        return normalized !== '' && normalized !== ReconciliationService.BACKEND_PENDING_STEP;
    }

    private pollLiveProgressOnce(sessionId: string): Observable<{
        acknowledged: boolean;
        step?: string;
        percentage?: number;
        processed?: number;
        total?: number;
        matchesCount?: number;
        boOnlyCount?: number;
        partnerRemaining?: number;
    }> {
        return this.http.get<{
            progress?: {
                step?: string;
                progress?: number;
                processedRecords?: number;
                totalRecords?: number;
                matchesCount?: number;
                boOnlyCount?: number;
                partnerRemaining?: number;
            };
        }>(`${this.apiUrl}/live-progress/${sessionId}`).pipe(
            map(res => ({
                acknowledged: this.isBackendProgressAcknowledged(res?.progress?.step),
                step: res?.progress?.step,
                percentage: typeof res?.progress?.progress === 'number' ? res.progress.progress : undefined,
                processed: res?.progress?.processedRecords,
                total: res?.progress?.totalRecords,
                matchesCount: res?.progress?.matchesCount,
                boOnlyCount: res?.progress?.boOnlyCount,
                partnerRemaining: res?.progress?.partnerRemaining
            })),
            catchError(() => of({ acknowledged: false }))
        );
    }

    private applyLiveProgressUpdate(
        step?: string,
        percentage?: number,
        details?: {
            processed?: number;
            total?: number;
            matchesCount?: number;
            boOnlyCount?: number;
            partnerRemaining?: number;
        }
    ): void {
        if (!step) {
            return;
        }
        const current = this.progressSubject.value;
        this.updateProgress({
            percentage: typeof percentage === 'number' ? percentage : current.percentage,
            processed: details?.processed ?? current.processed,
            total: details?.total ?? current.total,
            step: this.sanitizeLiveProgressStep(step),
            estimatedTimeRemaining: current.estimatedTimeRemaining,
            currentFile: current.currentFile,
            totalFiles: current.totalFiles,
            currentBoChunk: current.currentBoChunk,
            totalBoChunks: current.totalBoChunks,
            matchesCount: details?.matchesCount ?? current.matchesCount,
            boOnlyCount: details?.boOnlyCount ?? current.boOnlyCount,
            partnerRemaining: details?.partnerRemaining ?? current.partnerRemaining
        });
    }

    private markReconciliationRun<T>(source: Observable<T>): Observable<T> {
        return defer(() => {
            this.reconciliationRunningSubject.next(true);
            return source;
        }).pipe(
            finalize(() => this.reconciliationRunningSubject.next(false))
        );
    }

    /**
     * Relance automatiquement si le backend n'accuse pas réception (live-progress reste « En attente »)
     * alors que le front affiche déjà la réconciliation en cours.
     */
    private withAutoRelaunchOnStall(
        factory: () => Observable<ReconciliationResponse>,
        request: ReconciliationRequest
    ): Observable<ReconciliationResponse> {
        return new Observable<ReconciliationResponse>(subscriber => {
            let finished = false;
            let attemptNumber = 0;
            let responseReceived = false;
            let backendAcknowledged = false;
            let currentSub: Subscription | null = null;
            let pollSub: Subscription | null = null;
            let watchdogTimer: ReturnType<typeof setTimeout> | null = null;
            let activeSessionId = this.ensureProgressSessionId(request);

            const clearWatchdog = () => {
                if (watchdogTimer !== null) {
                    clearTimeout(watchdogTimer);
                    watchdogTimer = null;
                }
            };

            const stopPolling = () => {
                pollSub?.unsubscribe();
                pollSub = null;
            };

            const abortCurrentAttempt = () => {
                currentSub?.unsubscribe();
                currentSub = null;
                if (this.reconciliationRunningSubject.value) {
                    this.reconciliationRunningSubject.next(false);
                }
            };

            const rotateSessionForRelaunch = () => {
                activeSessionId = this.createProgressSessionId();
                request.progressSessionId = activeSessionId;
                backendAcknowledged = false;
                responseReceived = false;
            };

            const startPolling = () => {
                stopPolling();
                pollSub = timer(
                    ReconciliationService.LIVE_PROGRESS_POLL_MS,
                    ReconciliationService.LIVE_PROGRESS_POLL_MS
                ).pipe(
                    switchMap(() => this.pollLiveProgressOnce(activeSessionId))
                ).subscribe(result => {
                    if (result.acknowledged) {
                        backendAcknowledged = true;
                    }
                    this.applyLiveProgressUpdate(result.step, result.percentage, {
                        processed: result.processed,
                        total: result.total,
                        matchesCount: result.matchesCount,
                        boOnlyCount: result.boOnlyCount,
                        partnerRemaining: result.partnerRemaining
                    });
                });
            };

            const scheduleWatchdog = () => {
                clearWatchdog();
                const watchdogMs = this.estimateLaunchWatchdogMs(request);
                watchdogTimer = setTimeout(() => {
                    watchdogTimer = null;
                    if (finished || subscriber.closed || responseReceived || backendAcknowledged) {
                        return;
                    }
                    if (attemptNumber >= ReconciliationService.MAX_AUTO_RELAUNCH_ATTEMPTS) {
                        finished = true;
                        stopPolling();
                        abortCurrentAttempt();
                        subscriber.error(new Error(
                            'La réconciliation n\'a pas démarré côté serveur après plusieurs tentatives. Actualisez la page puis relancez.'
                        ));
                        return;
                    }
                    runAttempt(true);
                }, watchdogMs);
            };

            const runAttempt = (isAutoRetry: boolean) => {
                const watchdogMs = this.estimateLaunchWatchdogMs(request);
                if (isAutoRetry) {
                    console.warn('[ReconciliationService] Relance automatique : aucune activité backend détectée');
                    rotateSessionForRelaunch();
                    this.updateProgress({
                        percentage: 0,
                        processed: 0,
                        total: 100,
                        step: 'Relance automatique de la réconciliation...',
                        estimatedTimeRemaining: watchdogMs
                    });
                }

                attemptNumber++;
                abortCurrentAttempt();
                startPolling();
                scheduleWatchdog();

                currentSub = factory().subscribe({
                    next: (value) => {
                        responseReceived = true;
                        finished = true;
                        clearWatchdog();
                        stopPolling();
                        subscriber.next(value);
                    },
                    error: (err) => {
                        responseReceived = true;
                        clearWatchdog();
                        stopPolling();
                        const isClientAbort = (err as HttpErrorResponse)?.status === 0;
                        if (
                            !finished &&
                            !isClientAbort &&
                            attemptNumber < ReconciliationService.MAX_AUTO_RELAUNCH_ATTEMPTS &&
                            !backendAcknowledged
                        ) {
                            runAttempt(true);
                            return;
                        }
                        if (isClientAbort && !finished && attemptNumber < ReconciliationService.MAX_AUTO_RELAUNCH_ATTEMPTS) {
                            // Annulation volontaire (watchdog) : la relance est déjà déclenchée.
                            return;
                        }
                        finished = true;
                        abortCurrentAttempt();
                        subscriber.error(err);
                    },
                    complete: () => {
                        responseReceived = true;
                        finished = true;
                        clearWatchdog();
                        stopPolling();
                        subscriber.complete();
                    }
                });
            };

            runAttempt(false);

            return () => {
                finished = true;
                clearWatchdog();
                stopPolling();
                abortCurrentAttempt();
            };
        });
    }

    private executeReconcileOnce(request: ReconciliationRequest): Observable<ReconciliationResponse> {
        const boDataLength = request.boFileContent?.length || 0;
        const partnerDataLength = request.partnerFileContent?.length || 0;

        if (boDataLength > 100000 || partnerDataLength > 100000) {
            return this.markReconciliationRun(this.reconcileWithBackendChunks(request));
        }

        const totalRows = boDataLength + partnerDataLength;
        const watchdogMs = this.estimateLaunchWatchdogMs(request);
        const launchStep = totalRows > 5000
            ? `Envoi de ${totalRows.toLocaleString('fr-FR')} lignes au serveur...`
            : 'Démarrage de la réconciliation...';

        this.updateProgress({
            percentage: 0,
            processed: 0,
            total: 100,
            step: launchStep,
            estimatedTimeRemaining: watchdogMs
        });

        const RECONCILIATION_TIMEOUT = 3600000;

        return this.markReconciliationRun(
            this.with429Retry(() => this.http.post<ReconciliationResponse>(`${this.apiUrl}/reconcile`, request, {
                headers: new HttpHeaders({
                    'Content-Type': 'application/json'
                })
            })).pipe(
                timeout(RECONCILIATION_TIMEOUT),
                tap(response => {
                    const sessionId = response.progressSessionId || request.progressSessionId;
                    if (sessionId && (response.resultsPaginated || ((response.totalMatches ?? 0) > 0 && !(response.matches?.length)))) {
                        this.currentJobId = sessionId;
                        this.prefetchBoEcarts(sessionId);
                        this.prefetchEcartBoSummaryLines(sessionId);
                        this.prefetchPartnerOnly(sessionId);
                    }

                    this.updateProgress({
                        percentage: 100,
                        processed: response.totalBoRecords + response.totalPartnerRecords,
                        total: response.totalBoRecords + response.totalPartnerRecords,
                        step: 'Terminé',
                        estimatedTimeRemaining: 0
                    });
                }),
                catchError(this.handleError)
            )
        );
    }

    /**
     * Méthode de réconciliation classique (sans WebSocket)
     */
    reconcile(request: ReconciliationRequest): Observable<ReconciliationResponse> {
        const reconciliationType = this.appStateService.getReconciliationType();
        request.reconciliationType = reconciliationType;
        this.ensureProgressSessionId(request);

        return this.withAutoRelaunchOnStall(() => this.executeReconcileOnce(request), request);
    }

    /** Polling progression temps réel pendant un appel /reconcile synchrone. */
    reconcileWithLiveProgress(
        request: ReconciliationRequest,
        onStep?: (step: string, percentage?: number) => void
    ): Observable<ReconciliationResponse> {
        const sessionId = request.progressSessionId
            || `magic-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        request.progressSessionId = sessionId;

        const stopPolling$ = new Subject<void>();
        const pollSub = timer(0, 450).pipe(
            takeUntil(stopPolling$),
            switchMap(() => this.http.get<{ progress?: { progress?: number; step?: string } }>(
                `${this.apiUrl}/live-progress/${sessionId}`
            ).pipe(catchError(() => of(null)))),
            tap(res => {
                const rawStep = res?.progress?.step;
                const pct = res?.progress?.progress;
                if (!rawStep) {
                    return;
                }
                const step = this.sanitizeLiveProgressStep(rawStep);
                onStep?.(step, typeof pct === 'number' ? pct : undefined);
                this.updateProgress({
                    percentage: typeof pct === 'number' ? pct : this.progressSubject.value.percentage,
                    processed: this.progressSubject.value.processed,
                    total: this.progressSubject.value.total,
                    step,
                    estimatedTimeRemaining: this.progressSubject.value.estimatedTimeRemaining
                });
            })
        ).subscribe();

        return this.reconcile(request).pipe(
            finalize(() => {
                stopPolling$.next();
                stopPolling$.complete();
                pollSub.unsubscribe();
            })
        );
    }

    private sanitizeLiveProgressStep(step: string): string {
        const trimmed = step.trim();
        if (!trimmed || /^en attente$/i.test(trimmed)) {
            return 'En cours...';
        }
        return trimmed.replace(/en attente/gi, 'En cours');
    }

    /**
     * Agrège, par clé de réconciliation partenaire, le nombre de lignes OPPART consommées par les matches
     * d'un chunk (supporte le format fusionné TRXBO/OPPART avec colonnes suffixées _PARTNER_1 / _PARTNER_2).
     */
    private buildMatchedPartnerKeyCountsFromChunkResponse(
        matches: any[] | undefined,
        boKeyColumn: string,
        partnerKeyColumn: string
    ): Map<string, number> {
        const counts = new Map<string, number>();
        if (!matches || matches.length === 0) {
            return counts;
        }
        for (const match of matches) {
            for (const [key, n] of this.getConsumedPartnerKeyCountsForMatch(match, boKeyColumn, partnerKeyColumn)) {
                counts.set(key, (counts.get(key) || 0) + n);
            }
        }
        return counts;
    }

    /**
     * Pour un match, retourne les paires (clé partenaire, nombre de lignes à retirer du pool partenaire).
     */
    private getConsumedPartnerKeyCountsForMatch(
        match: any,
        boKeyColumn: string,
        partnerKeyColumn: string
    ): Array<[string, number]> {
        const list = match?.partnerDataList;
        if (Array.isArray(list) && list.length > 0) {
            const perKey = new Map<string, number>();
            for (const row of list) {
                const raw = row?.[partnerKeyColumn];
                if (raw === null || raw === undefined) {
                    continue;
                }
                const key = String(raw).trim();
                if (!key) {
                    continue;
                }
                perKey.set(key, (perKey.get(key) || 0) + 1);
            }
            return Array.from(perKey.entries());
        }

        const pd = match?.partnerData;
        if (pd && typeof pd === 'object' && !Array.isArray(pd)) {
            const keys = Object.keys(pd);
            const isCombined = keys.some(k => k.includes('_PARTNER_'));
            if (isCombined) {
                const k1 = pd[`${partnerKeyColumn}_PARTNER_1`];
                if (k1 !== null && k1 !== undefined && String(k1).trim() !== '') {
                    const key = String(k1).trim();
                    const k2 = pd[`${partnerKeyColumn}_PARTNER_2`];
                    const count =
                        k2 !== null && k2 !== undefined && String(k2).trim() !== '' ? 2 : 1;
                    return [[key, count]];
                }
            }
            const direct = pd[partnerKeyColumn];
            if (direct !== null && direct !== undefined && String(direct).trim() !== '') {
                return [[String(direct).trim(), 1]];
            }
        }

        const boVal = match?.boData?.[boKeyColumn] ?? match?.key;
        if (boVal !== null && boVal !== undefined && String(boVal).trim() !== '') {
            return [[String(boVal).trim(), 1]];
        }
        return [];
    }

    /**
     * Réconciliation par chunks avec le backend (utilise l'endpoint classique)
     */
    private reconcileWithBackendChunks(request: ReconciliationRequest): Observable<ReconciliationResponse> {
        
        return new Observable(observer => {
            // Réduire la taille des chunks pour éviter les timeouts (50000 lignes au lieu de 100000)
            // Avec 258952 lignes Partner, des chunks plus petits réduisent le temps de traitement par requête
            const boDataLength = (request.boFileContent || []).length;
            const partnerDataLength = (request.partnerFileContent || []).length;
            
            // Ajuster dynamiquement la taille des chunks selon la taille des données
            // Optimisation : augmenter la taille des chunks pour réduire le nombre de requêtes
            let chunkSize = 50000; // Par défaut 50k lignes
            if (partnerDataLength > 200000 && partnerDataLength < 300000) {
                // Pour fichiers Partner moyens (200k-300k), utiliser 50k pour équilibrer vitesse/stabilité
                chunkSize = 50000;
            } else if (partnerDataLength >= 300000) {
                // Pour très gros fichiers Partner (>300k), réduire les chunks pour éviter les timeouts
                chunkSize = 40000; // 40k lignes pour très gros fichiers
            } else if (boDataLength > 200000) {
                chunkSize = 50000; // 50k lignes pour gros fichiers BO
            }
            
            // Diviser seulement les données BO en chunks
            const boChunks = this.createChunks(request.boFileContent || [], chunkSize);
            const allPartnerData = request.partnerFileContent || [];
            
            
            // Émettre une mise à jour initiale de progression
            this.progressSubject.next({
                percentage: 0,
                processed: 0,
                total: boChunks.length,
                step: `Initialisation - ${boChunks.length} chunks à traiter`,
                currentBoChunk: 0,
                totalBoChunks: boChunks.length,
                matchesCount: 0,
                boOnlyCount: 0,
                partnerRemaining: allPartnerData.length
            });
            
            // Traiter chaque chunk BO avec TOUTES les lignes Partner
            this.processOptimizedChunks(request, boChunks, allPartnerData, [], observer);
        });
    }

    /**
     * Traite les chunks BO de manière optimisée avec toutes les lignes Partner
     * OPTIMISATION: Traitement parallèle avec limite de concurrence
     */
    private processOptimizedChunks(
        originalRequest: ReconciliationRequest, 
        boChunks: any[][], 
        allPartnerData: any[], 
        accumulatedResults: any[], 
        observer: any
    ): void {
        
        // OPTIMISATION: Index Partner avec gestion des doublons (multiset)
        // On doit conserver TOUTES les occurrences d'une clé (ex: même numéro+montant n fois)
        // pour permettre un matching occurrence-par-occurrence.
        const partnerKeyCounts = new Map<string, number>();
        allPartnerData.forEach(partnerRow => {
            const rawKey = partnerRow?.[originalRequest.partnerKeyColumn];
            if (rawKey === null || rawKey === undefined) return;
            const key = String(rawKey).trim();
            if (!key) return;
            partnerKeyCounts.set(key, (partnerKeyCounts.get(key) || 0) + 1);
        });
        let remainingPartnerData = [...allPartnerData]; // Garder pour compatibilité avec le backend
        let allMatches: any[] = [];
        let allBoOnly: any[] = [];
        const startTime = Date.now(); // Pour calculer le temps d'exécution réel
        
        // OPTIMISATION: Traitement parallèle avec limite de concurrence adaptée à l'environnement
        // Détecter si on est en production (hostname de production uniquement, pas le port)
        const isProduction = typeof window !== 'undefined' && (
            window.location.hostname.includes('reconciliation.intouchgroup.net') ||
            (window.location.hostname.includes('intouchgroup') && !window.location.hostname.includes('localhost'))
        );
        
        // En production, utiliser un traitement séquentiel pour éviter les problèmes de connexion
        // En local, on peut être plus agressif avec le parallélisme
        let MAX_CONCURRENT_CHUNKS = isProduction 
            ? 1  // Production : traitement séquentiel (1 chunk à la fois) pour éviter les timeouts
            : Math.min(3, boChunks.length); // Local : max 3 chunks simultanés
        
        
        if (isProduction) {
        }
        
        let completedChunks = 0;
        const chunkResults = new Map<number, { matches: any[], boOnly: any[], matchedKeyCounts: Map<string, number> }>();
        const processingChunks = new Set<number>();
        let consecutiveErrors = 0; // Compteur d'erreurs consécutives pour réduire la concurrence dynamiquement
        
        // Synchronisation pour éviter les conflits lors du retrait des données Partner
        const lock = { locked: false, queue: [] as Array<() => void> };
        
        const acquireLock = (): Promise<void> => {
            return new Promise((resolve) => {
                if (!lock.locked) {
                    lock.locked = true;
                    resolve();
                } else {
                    lock.queue.push(resolve);
                }
            });
        };
        
        const releaseLock = () => {
            lock.locked = false;
            if (lock.queue.length > 0) {
                const next = lock.queue.shift();
                if (next) {
                    lock.locked = true;
                    next();
                }
            }
        };
        
        const processChunk = async (chunkIndex: number) => {
            if (chunkIndex >= boChunks.length) {
                return;
            }
            
            const boChunk = boChunks[chunkIndex];
            processingChunks.add(chunkIndex);
            
            const modeText = MAX_CONCURRENT_CHUNKS === 1 ? 'séquentiel' : 'parallèle';
            
            // Mettre à jour la progression
            this.progressSubject.next({
                percentage: Math.min(95, ((chunkIndex + 1) / boChunks.length) * 90),
                processed: chunkIndex + 1,
                total: boChunks.length,
                step: `Traitement chunk BO ${chunkIndex + 1}/${boChunks.length} (${modeText})`,
                currentBoChunk: chunkIndex + 1,
                totalBoChunks: boChunks.length,
                matchesCount: allMatches.length,
                boOnlyCount: allBoOnly.length,
                partnerRemaining: remainingPartnerData.length
            });
            
            // Acquérir le lock pour lire les données Partner actuelles
            await acquireLock();
            const currentPartnerData = [...remainingPartnerData]; // Copie pour ce chunk
            releaseLock();
            
            // 🔍 DEBUG: Log des clés et exemples de valeurs pour le premier chunk
            if (chunkIndex === 0) {
                
                // Vérifier que les colonnes existent dans les données
                if (boChunk.length > 0) {
                    const boColumns = Object.keys(boChunk[0]);
                    const boKeyExists = boColumns.includes(originalRequest.boKeyColumn);
                    if (!boKeyExists) {
                        // Chercher des colonnes similaires
                        const similarColumns = boColumns.filter(col => 
                            col.toLowerCase().includes(originalRequest.boKeyColumn.toLowerCase()) ||
                            originalRequest.boKeyColumn.toLowerCase().includes(col.toLowerCase())
                        );
                        if (similarColumns.length > 0) {
                        }
                    }
                    
                    // Afficher quelques exemples de clés BO
                    const boKeys = boChunk.slice(0, 5).map(record => {
                        const key = record[originalRequest.boKeyColumn];
                        return {
                            key: key,
                            keyType: typeof key,
                            keyLength: key ? key.length : 0,
                            trimmed: key ? key.trim() : null,
                            exists: key !== undefined
                        };
                    });
                }
                
                // Vérifier que les colonnes existent dans les données Partner
                if (currentPartnerData.length > 0) {
                    const partnerColumns = Object.keys(currentPartnerData[0]);
                    const partnerKeyExists = partnerColumns.includes(originalRequest.partnerKeyColumn);
                    if (!partnerKeyExists) {
                        // Chercher des colonnes similaires
                        const similarColumns = partnerColumns.filter(col => 
                            col.toLowerCase().includes(originalRequest.partnerKeyColumn.toLowerCase()) ||
                            originalRequest.partnerKeyColumn.toLowerCase().includes(col.toLowerCase())
                        );
                        if (similarColumns.length > 0) {
                        }
                    }
                    
                    // Afficher quelques exemples de clés Partner
                    const partnerKeys = currentPartnerData.slice(0, 5).map(record => {
                        const key = record[originalRequest.partnerKeyColumn];
                        return {
                            key: key,
                            keyType: typeof key,
                            keyLength: key ? key.length : 0,
                            trimmed: key ? key.trim() : null,
                            exists: key !== undefined
                        };
                    });
                    
                    // Vérifier si les clés correspondent
                    const boKeySet = new Set(boChunk.slice(0, 100).map(r => {
                        const key = r[originalRequest.boKeyColumn];
                        return key ? String(key).trim() : null;
                    }).filter(k => k !== null && k !== ''));
                    const partnerKeySet = new Set(currentPartnerData.slice(0, 100).map(r => {
                        const key = r[originalRequest.partnerKeyColumn];
                        return key ? String(key).trim() : null;
                    }).filter(k => k !== null && k !== ''));
                    const intersection = [...boKeySet].filter(k => partnerKeySet.has(k));
                    if (intersection.length === 0 && boKeySet.size > 0 && partnerKeySet.size > 0) {
                        const firstBoKey = [...boKeySet][0];
                        const firstPartnerKey = [...partnerKeySet][0];
                    }
                }
            }
            
            const chunkRequest: ReconciliationRequest = {
                ...originalRequest,
                boFileContent: boChunk,
                partnerFileContent: currentPartnerData
            };
            
            // Timeout de 60 minutes pour chaque chunk
            const RECONCILIATION_TIMEOUT = 3600000; // 60 minutes
            
            // Fonction de retry avec backoff exponentiel
            const processChunkWithRetry = (retryCount: number = 0, maxRetries: number = 3): Promise<void> => {
                return new Promise((resolve, reject) => {
                    const isTimeoutError = (error: any) => {
                        return error.name === 'TimeoutError' || 
                               error.status === 408 || 
                               error.status === 0 ||
                               error.message?.includes('timeout') ||
                               error.message?.includes('Timeout') ||
                               error.message?.includes('ERR_CONNECTION_RESET') ||
                               error.message?.includes('Connection reset') ||
                               (error.error && error.error.message && error.error.message.includes('timeout'));
                    };
                    
                    this.http.post<ReconciliationResponse>(`${this.apiUrl}/reconcile`, chunkRequest, {
                        headers: new HttpHeaders({
                            'Content-Type': 'application/json'
                        })
                    }).pipe(
                        timeout(RECONCILIATION_TIMEOUT),
                        retry({
                            count: 0,
                            delay: 0
                        })
                    ).subscribe({
                        next: async (response: ReconciliationResponse) => {
                            try {
                                // Réinitialiser le compteur d'erreurs en cas de succès
                                consecutiveErrors = Math.max(0, consecutiveErrors - 1);
                                
                                
                                // Stocker les résultats pour traitement séquentiel
                                // IMPORTANT: gérer les doublons -> on compte les occurrences Partner retirées par clé.
                                // TRXBO/OPPART (SPECIAL_RATIO): partnerData est un map fusionné avec suffixes _PARTNER_1 / _PARTNER_2,
                                // donc partnerData[colonne] est absent — il faut dériver la clé et compter 2 lignes consommées.
                                const matchedKeyCounts = this.buildMatchedPartnerKeyCountsFromChunkResponse(
                                    response.matches,
                                    originalRequest.boKeyColumn,
                                    originalRequest.partnerKeyColumn
                                );
                                
                                chunkResults.set(chunkIndex, {
                                    matches: response.matches || [],
                                    boOnly: response.boOnly || [],
                                    matchedKeyCounts: matchedKeyCounts
                                });
                                
                                // Traiter les résultats de manière séquentielle pour éviter les conflits
                                await processChunkResults();
                                
                                resolve();
                            } catch (error) {
                                reject(error);
                            }
                        },
                        error: (error) => {
                            const isTimeout = isTimeoutError(error);
                            
                            if (isTimeout && retryCount < maxRetries) {
                                consecutiveErrors++;
                                
                                // Réduire dynamiquement la concurrence si trop d'erreurs
                                if (consecutiveErrors >= 2 && MAX_CONCURRENT_CHUNKS > 1) {
                                    MAX_CONCURRENT_CHUNKS = Math.max(1, MAX_CONCURRENT_CHUNKS - 1);
                                }
                                
                                // En production, augmenter le délai de backoff pour laisser le serveur récupérer
                                const baseDelay = isProduction ? 3000 : 1000; // 3s en prod, 1s en local
                                const backoffDelay = Math.min(baseDelay * Math.pow(2, retryCount), isProduction ? 60000 : 30000);
                                
                                setTimeout(() => {
                                    processChunkWithRetry(retryCount + 1, maxRetries).then(resolve).catch(reject);
                                }, backoffDelay);
                            } else {
                                consecutiveErrors++;
                                
                                // Réduire la concurrence si erreur persistante
                                if (consecutiveErrors >= 3 && MAX_CONCURRENT_CHUNKS > 1) {
                                    MAX_CONCURRENT_CHUNKS = 1; // Passer en mode séquentiel
                                }
                                
                                if (isTimeout) {
                                } else {
                                }
                                
                                // En cas d'erreur, ajouter le chunk comme "bo-only"
                                chunkResults.set(chunkIndex, {
                                    matches: [],
                                    boOnly: boChunk,
                                    matchedKeyCounts: new Map()
                                });
                                
                                processChunkResults().then(() => resolve()).catch(reject);
                            }
                        }
                    });
                });
            };
            
            return processChunkWithRetry();
        };
        
        // Fonction pour traiter les résultats des chunks de manière séquentielle
        const processChunkResults = async (): Promise<void> => {
            await acquireLock();
            try {
                // Traiter les chunks dans l'ordre, en commençant par le plus petit index disponible
                let nextChunkToProcess = completedChunks;
                while (chunkResults.has(nextChunkToProcess)) {
                    const result = chunkResults.get(nextChunkToProcess)!;
                    
                    // Ajouter les matches
                    if (result.matches.length > 0) {
                        allMatches.push(...result.matches);
                        
                        // Retirer UNIQUEMENT les occurrences matchées (pas toutes les lignes d'une même clé)
                        const beforeCount = remainingPartnerData.length;
                        const toRemove = new Map<string, number>(result.matchedKeyCounts);
                        remainingPartnerData = remainingPartnerData.filter(partnerRow => {
                            const rawKey = partnerRow?.[originalRequest.partnerKeyColumn];
                            if (rawKey === null || rawKey === undefined) return true;
                            const key = String(rawKey).trim();
                            if (!key) return true;
                            const remaining = toRemove.get(key) || 0;
                            if (remaining > 0) {
                                toRemove.set(key, remaining - 1);
                                // Mettre à jour le compteur global (optionnel mais cohérent)
                                const globalCount = partnerKeyCounts.get(key) || 0;
                                if (globalCount > 0) partnerKeyCounts.set(key, globalCount - 1);
                                return false; // retirer cette occurrence (une seule)
                            }
                            return true;
                        });
                        
                    }
                    
                    // Ajouter les bo-only
                    if (result.boOnly.length > 0) {
                        allBoOnly.push(...result.boOnly);
                    }
                    
                    completedChunks++;
                    chunkResults.delete(nextChunkToProcess);
                    nextChunkToProcess++;
                    
                    // Mettre à jour la progression
                    this.progressSubject.next({
                        percentage: Math.min(95, (completedChunks / boChunks.length) * 90),
                        processed: completedChunks,
                        total: boChunks.length,
                        step: `Chunk BO ${completedChunks}/${boChunks.length} traité`,
                        currentBoChunk: completedChunks,
                        totalBoChunks: boChunks.length,
                        matchesCount: allMatches.length,
                        boOnlyCount: allBoOnly.length,
                        partnerRemaining: remainingPartnerData.length
                    });
                    
                    // Vérifier si tous les chunks sont terminés
                    if (completedChunks >= boChunks.length) {
                        this.finalizeOptimizedResults(
                            allMatches,
                            allBoOnly,
                            remainingPartnerData,
                            observer,
                            startTime,
                            allPartnerData.length
                        );
                    }
                }
            } finally {
                releaseLock();
            }
        };
        
        // Lancer le traitement avec limite de concurrence
        const startProcessing = async () => {
            // En production avec MAX_CONCURRENT_CHUNKS = 1, traitement séquentiel strict
            if (isProduction && MAX_CONCURRENT_CHUNKS === 1) {
                for (let i = 0; i < boChunks.length; i++) {
                    try {
                        await processChunk(i);
                        // Délai entre les chunks en production pour laisser le serveur récupérer
                        if (i < boChunks.length - 1) {
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                    } catch (error) {
                        // Continuer avec le chunk suivant même en cas d'erreur
                    }
                }
            } else {
                // Traitement parallèle avec limite de concurrence
                const promises: Promise<void>[] = [];
                
                for (let i = 0; i < boChunks.length; i++) {
                    // Attendre qu'un slot soit disponible
                    while (processingChunks.size >= MAX_CONCURRENT_CHUNKS) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                    
                    // Lancer le traitement du chunk
                    const promise = processChunk(i).finally(() => {
                        processingChunks.delete(i);
                    });
                    
                    promises.push(promise);
                }
                
                // Attendre que tous les chunks soient terminés
                await Promise.allSettled(promises);
            }
        };
        
        startProcessing();
    }

    /**
     * Finalise les résultats optimisés
     */
    private finalizeOptimizedResults(
        allMatches: any[], 
        allBoOnly: any[], 
        remainingPartnerData: any[], 
        observer: any,
        startTime?: number,
        initialPartnerRowCount?: number
    ): void {
        try {
            
            // OPTIMISATION: Calculer le temps d'exécution réel
            const executionTimeMs = startTime ? Date.now() - startTime : 0;
            
            // Créer le résultat final avec gestion d'erreur
            const finalResult: ReconciliationResponse = {
                matches: allMatches,
                boOnly: allBoOnly,
                partnerOnly: remainingPartnerData,
                mismatches: [],
                totalBoRecords: allMatches.length + allBoOnly.length,
                totalPartnerRecords:
                    initialPartnerRowCount ??
                    allMatches.length + remainingPartnerData.length,
                totalMatches: allMatches.length,
                totalMismatches: 0,
                totalBoOnly: allBoOnly.length,
                totalPartnerOnly: remainingPartnerData.length,
                executionTimeMs: executionTimeMs,
                processedRecords: allMatches.length + allBoOnly.length + remainingPartnerData.length,
                progressPercentage: 100
            };
            
            
            observer.next(finalResult);
            observer.complete();
            
        } catch (error) {
            observer.error(error);
        }
    }

    /**
     * Agrège les résultats de tous les chunks
     */
    private aggregateChunkResults(accumulatedResults: any[], observer: any): void {
        
        if (accumulatedResults.length === 0) {
            observer.error(new Error('Aucun résultat à agréger'));
            return;
        }
        
        // Agrégation complète de tous les résultats
        const aggregatedResult: ReconciliationResponse = {
            matches: [],
            boOnly: [],
            partnerOnly: [],
            mismatches: [],
            totalBoRecords: 0,
            totalPartnerRecords: 0,
            totalMatches: 0,
            totalMismatches: 0,
            totalBoOnly: 0,
            totalPartnerOnly: 0,
            executionTimeMs: 0,
            processedRecords: 0,
            progressPercentage: 100
        };
        
        // Combiner tous les résultats
        accumulatedResults.forEach((result, index) => {
            if (result && result.matches) {
                aggregatedResult.matches.push(...result.matches);
                aggregatedResult.boOnly.push(...result.boOnly);
                aggregatedResult.partnerOnly.push(...result.partnerOnly);
                aggregatedResult.mismatches.push(...result.mismatches);
                
                aggregatedResult.totalBoRecords += result.totalBoRecords || 0;
                aggregatedResult.totalPartnerRecords += result.totalPartnerRecords || 0;
                aggregatedResult.totalMatches += result.totalMatches || 0;
                aggregatedResult.totalMismatches += result.totalMismatches || 0;
                aggregatedResult.totalBoOnly += result.totalBoOnly || 0;
                aggregatedResult.totalPartnerOnly += result.totalPartnerOnly || 0;
                aggregatedResult.executionTimeMs += result.executionTimeMs || 0;
                aggregatedResult.processedRecords += result.processedRecords || 0;
                
            }
        });
        
        
        observer.next(aggregatedResult);
        observer.complete();
    }

    /**
     * Crée des chunks à partir d'un tableau de données
     */
    private createChunks(data: any[], chunkSize: number): any[][] {
        const chunks: any[][] = [];
        for (let i = 0; i < data.length; i += chunkSize) {
            chunks.push(data.slice(i, i + chunkSize));
        }
        return chunks;
    }


    /**
     * Détermine si une requête de réconciliation nécessite un traitement par chunks
     */
    private isLargeReconciliationRequest(request: ReconciliationRequest): boolean {
        // Désactiver le traitement par chunks frontend pour forcer l'utilisation du backend
        // Le backend est plus optimisé pour les gros volumes et la logique de correspondance
        return false;
    }

    /**
     * Réconciliation par chunks pour les gros fichiers
     */
    private reconcileWithChunks(request: ReconciliationRequest): Observable<ReconciliationResponse> {
        
        return new Observable(observer => {
            // Simuler un job ID pour le traitement frontend
            const jobId = `frontend-chunked-${Date.now()}`;
            this.currentJobId = jobId;
            
            // Mettre à jour la progression
            this.updateProgress({
                percentage: 10,
                processed: 0,
                total: 100,
                step: 'Traitement par chunks...',
                estimatedTimeRemaining: 120000
            });
            
            // Lancer le traitement asynchrone
            this.processReconciliationChunks(request, jobId)
                .then(() => {
                    // Récupérer les résultats
                    this.getFrontendChunkedResults(jobId).subscribe({
                        next: (response) => {
                            observer.next(response);
                            observer.complete();
                        },
                        error: (error) => {
                            observer.error(error);
                        }
                    });
                })
                .catch(error => {
                    observer.error(error);
                });
        });
    }

    /**
     * Traite la réconciliation par chunks
     */
    private async processReconciliationChunks(request: ReconciliationRequest, jobId: string): Promise<void> {
        try {
            
            const boData = request.boFileContent || [];
            const partnerData = request.partnerFileContent || [];
            
            
            // Traitement par chunks de la réconciliation
            const chunkSize = 10000; // 10k lignes par chunk
            const results = {
                matchedRecords: [],
                unmatchedBoRecords: [],
                unmatchedPartnerRecords: [],
                totalBoRecords: boData.length,
                totalPartnerRecords: partnerData.length
            };
            const partnerIndex = this.buildPartnerIndex(partnerData, request.partnerKeyColumn);
            
            // Traiter les données par chunks
            for (let i = 0; i < boData.length; i += chunkSize) {
                const boChunk = boData.slice(i, i + chunkSize);
                
                // Traitement du chunk
                const chunkResults = this.processReconciliationChunk(boChunk, partnerIndex, {
                    boReconciliationKey: request.boKeyColumn,
                    partnerReconciliationKey: request.partnerKeyColumn
                } as ChunkProcessingConfig);
                
                // Fusionner les résultats
                results.matchedRecords.push(...chunkResults.matchedRecords);
                results.unmatchedBoRecords.push(...chunkResults.unmatchedBoRecords);
                
                // Mettre à jour la progression
                const progress = Math.min(90, (i / boData.length) * 100);
                this.updateProgress({
                    percentage: progress,
                    processed: i,
                    total: boData.length,
                    step: `Traitement chunk ${Math.floor(i / chunkSize) + 1}...`,
                    estimatedTimeRemaining: Math.max(0, (boData.length - i) * 10)
                });
                
                // Permettre à l'interface de respirer
                if (i % (chunkSize * 5) === 0) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
            }
            results.unmatchedPartnerRecords.push(...this.collectRemainingPartnerRecords(partnerIndex));
            
            // Sauvegarder les résultats
            this.saveChunkedResults(jobId, results, {
                boReconciliationKey: request.boKeyColumn,
                partnerReconciliationKey: request.partnerKeyColumn
            } as ChunkProcessingConfig);
            
            this.updateProgress({
                percentage: 100,
                processed: boData.length,
                total: boData.length,
                step: 'Traitement terminé',
                estimatedTimeRemaining: 0
            });
            
        } catch (error) {
            throw error;
        }
    }

    /**
     * Test de santé du service
     */
    healthCheck(): Observable<any> {
        return this.http.get(`${this.apiUrl}/health`)
            .pipe(
                catchError(this.handleError)
            );
    }

    /**
     * Analyse les clés de réconciliation
     */
    analyzeReconciliationKeys(formData: FormData): Observable<any> {
        return this.with429Retry(() => this.http.post(`${this.apiUrl}/analyze-keys`, formData))
            .pipe(
                catchError(this.handleError)
            );
    }

    /**
     * Exécute la réconciliation
     */
    executeReconciliation(config: ReconciliationConfig): Observable<ReconciliationResponse> {
        return this.reconcile({
            boFileContent: [],
            partnerFileContent: [],
            boKeyColumn: config.boReconciliationKey,
            partnerKeyColumn: config.partnerReconciliationKey,
            additionalKeys: config.additionalKeys || [],
            comparisonColumns: [],
            selectedService: undefined,
            boColumnFilters: []
        });
    }

    /**
     * Annule la réconciliation
     */
    cancelReconciliation(jobId: string): Observable<any> {
        return this.cancelJob(jobId);
    }

    /**
     * Obtient la progression d'un job
     */
    getJobProgress(jobId: string): Observable<ProgressUpdate> {
        return this.getJobStatus(jobId).pipe(
            map((status: any) => ({
                percentage: status.progress?.percentage || 0,
                processed: status.progress?.processed || 0,
                total: status.progress?.total || 100,
                step: status.progress?.step || 'Traitement...',
                currentFile: status.progress?.currentFile || 0,
                totalFiles: status.progress?.totalFiles || 0,
                estimatedTimeRemaining: status.progress?.estimatedTimeRemaining || 0
            }))
        );
    }

    /**
     * Sauvegarde le résumé sélectionné
     */
    saveSelectedSummary(summary: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/save-summary`, summary)
            .pipe(
                catchError(this.handleError)
            );
    }

    /**
     * Efface les données
     */
    clearData(): void {
        this.currentJobId = null;
        this.updateProgress({
            percentage: 0,
            processed: 0,
            total: 0,
            step: '',
            currentFile: 0,
            totalFiles: 0,
            estimatedTimeRemaining: 0
        });
    }

    /**
     * Gestion des erreurs
     */
    private handleError = (error: HttpErrorResponse | any): Observable<never> => {
        
        let errorMessage = 'Une erreur est survenue';
        
        // Détecter les erreurs de timeout
        if (error.name === 'TimeoutError' || error.message?.includes('timeout') || error.message?.includes('Timeout')) {
            errorMessage = 'Le délai d\'attente a été dépassé. La réconciliation prend plus de temps que prévu. ' +
                          'Pour les très gros fichiers, veuillez patienter ou diviser les fichiers en plus petits lots.';
        } else if (error.error instanceof ErrorEvent) {
            // Erreur côté client
            errorMessage = `Erreur: ${error.error.message}`;
        } else if (error.status) {
            // Erreur côté serveur
            if (error.status === 504 || error.status === 408) {
                errorMessage = 'Le serveur a mis trop de temps à répondre. ' +
                              'Veuillez réessayer ou diviser les fichiers en plus petits lots.';
            } else if (error.status === 429) {
                errorMessage = 'Trop de requêtes. Le client a automatiquement réessayé, mais le serveur refuse encore la réconciliation. Veuillez patienter quelques instants puis relancer.';
            } else {
                errorMessage = `Erreur ${error.status}: ${error.message || 'Erreur serveur'}`;
            }
            if (error.error && error.error.message) {
                errorMessage = error.error.message;
            }
        }
        
        // Mettre à jour la progression en cas d'erreur
        this.updateProgress({
            percentage: 0,
            processed: 0,
            total: 100,
            step: `Erreur: ${errorMessage}`,
            estimatedTimeRemaining: 0
        });
        
        return throwError(() => new Error(errorMessage));
    };
}