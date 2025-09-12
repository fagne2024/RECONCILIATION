import { Injectable, OnInit, OnDestroy } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, Subject, timer, from } from 'rxjs';
import { catchError, tap, map, finalize, retry, takeUntil, switchMap } from 'rxjs/operators';
import { ReconciliationRequest } from '../models/reconciliation-request.model';
import { ReconciliationResponse } from '../models/reconciliation-response.model';
import { AppStateService } from './app-state.service';

export interface ReconciliationConfig {
    boFile: File;
    partnerFile: File;
    boReconciliationKey: string;
    partnerReconciliationKey: string;
    additionalKeys?: Array<{ boColumn: string; partnerColumn: string }>;
    tolerance?: number;
}

export interface ProgressUpdate {
    percentage: number;
    processed: number;
    total: number;
    step: string;
    currentFile?: number;
    totalFiles?: number;
    estimatedTimeRemaining?: number;
}

@Injectable({
    providedIn: 'root'
})
export class ReconciliationService implements OnInit, OnDestroy {
    private apiUrl = 'http://localhost:8080/api/reconciliation';
    
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
    
    // Job management
    private currentJobId: string | null = null;
    private destroy$ = new Subject<void>();
    
    constructor(private http: HttpClient, private appStateService: AppStateService) {
        console.log('🚀 ReconciliationService initialisé - Mode HTTP classique');
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
        console.log('🚀 Démarrage de la réconciliation HTTP classique');
        
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

        return this.http.post<{ jobId: string; status: string }>(`${this.apiUrl}/upload-and-prepare`, formData)
            .pipe(
                tap(response => {
                    console.log('✅ Job créé:', response);
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
     * Obtient le statut d'un job de réconciliation
     */
    getJobStatus(jobId: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/status/${jobId}`)
            .pipe(
                tap((status: any) => {
                    console.log('📊 Statut du job:', status);
                    
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
        return this.http.get<ReconciliationResponse>(`${this.apiUrl}/results/${jobId}`)
            .pipe(
                tap(results => {
                    console.log('✅ Résultats obtenus:', results);
                    
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
     * Annule un job de réconciliation
     */
    cancelJob(jobId: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/cancel`, { jobId })
            .pipe(
                tap(() => {
                    console.log('❌ Job annulé:', jobId);
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

    /**
     * Méthode de réconciliation classique (sans WebSocket)
     */
    reconcile(request: ReconciliationRequest): Observable<ReconciliationResponse> {
        console.log('🔄 Démarrage de la réconciliation classique');
        
        // Récupérer le type de réconciliation depuis le service d'état
        const reconciliationType = this.appStateService.getReconciliationType();
        request.reconciliationType = reconciliationType;
        
        console.log('🎯 Type de réconciliation utilisé:', reconciliationType);
        
        this.updateProgress({
            percentage: 0,
            processed: 0,
            total: 100,
            step: 'Démarrage de la réconciliation...',
            estimatedTimeRemaining: 30000
        });

        return this.http.post<ReconciliationResponse>(`${this.apiUrl}/reconcile`, request)
            .pipe(
                tap(response => {
                    console.log('✅ Réconciliation terminée:', response);
                    
                    this.updateProgress({
                        percentage: 100,
                        processed: response.totalBoRecords + response.totalPartnerRecords,
                        total: response.totalBoRecords + response.totalPartnerRecords,
                        step: 'Terminé',
                        estimatedTimeRemaining: 0
                    });
                }),
                catchError(this.handleError)
            );
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
        return this.http.post(`${this.apiUrl}/analyze-keys`, formData)
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
    private handleError = (error: HttpErrorResponse): Observable<never> => {
        console.error('❌ Erreur dans ReconciliationService:', error);
        
        let errorMessage = 'Une erreur est survenue';
        
        if (error.error instanceof ErrorEvent) {
            // Erreur côté client
            errorMessage = `Erreur: ${error.error.message}`;
        } else {
            // Erreur côté serveur
            errorMessage = `Erreur ${error.status}: ${error.message}`;
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