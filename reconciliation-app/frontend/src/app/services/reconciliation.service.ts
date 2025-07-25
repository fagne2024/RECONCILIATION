import { Injectable, OnInit } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, tap, map, finalize } from 'rxjs/operators';
import { ReconciliationRequest } from '../models/reconciliation-request.model';
import { ReconciliationResponse } from '../models/reconciliation-response.model';

@Injectable({
    providedIn: 'root'
})
export class ReconciliationService implements OnInit {
    private apiUrl = 'http://localhost:8080/api/reconciliation';
    private progressSubject: BehaviorSubject<number> | null = null;
    public progress$!: Observable<number>;
    private isInitialized = false;

    constructor(private http: HttpClient) {
        console.log('ReconciliationService constructor called');
        this.initializeProgressSubject();
    }

    ngOnInit(): void {
        // Cette méthode sera appelée automatiquement par Angular
        console.log('ReconciliationService ngOnInit called');
        this.ensureInitialized();
    }

    private ensureInitialized(): void {
        if (!this.isInitialized) {
            console.log('Ensuring service is initialized');
            this.initializeProgressSubject();
            this.isInitialized = true;
        }
    }

    private initializeProgressSubject(): void {
        if (!this.progressSubject) {
            console.log('Initializing progressSubject');
            this.progressSubject = new BehaviorSubject<number>(0);
            this.progress$ = this.progressSubject.asObservable();
        }
    }

    // Méthode sécurisée pour accéder au progressSubject
    private getProgressSubject(): BehaviorSubject<number> {
        this.ensureInitialized();
        if (!this.progressSubject) {
            console.warn('progressSubject was undefined, creating new instance');
            this.initializeProgressSubject();
        }
        return this.progressSubject!;
    }

    uploadFile(file: File): Observable<string> {
        this.ensureInitialized();
        const formData = new FormData();
        formData.append('file', file);

        return this.http.post<string>(`${this.apiUrl}/upload`, formData)
            .pipe(catchError(this.handleError));
    }

    reconcile(request: ReconciliationRequest): Observable<ReconciliationResponse> {
        this.ensureInitialized();
        console.log('Sending reconciliation request:', request);
        
        // Utiliser la méthode sécurisée
        const progressSubject = this.getProgressSubject();
        
        // Commencer la progression avant l'envoi de la requête
        progressSubject.next(10);
        
        // Créer un intervalle pour mettre à jour la progression pendant le traitement
        const progressInterval = setInterval(() => {
            const currentProgress = progressSubject.value;
            if (currentProgress < 90) {
                progressSubject.next(currentProgress + 10);
            }
        }, 1000);

        return this.http.post<ReconciliationResponse>(`${this.apiUrl}/reconcile`, request)
            .pipe(
                tap(response => {
                    console.log('Received reconciliation response:', response);
                }),
                finalize(() => {
                    clearInterval(progressInterval);
                    progressSubject.next(100);
                }),
                catchError(error => {
                    clearInterval(progressInterval);
                    progressSubject.next(0);
                    return this.handleError(error);
                })
            );
    }

    saveSummary(summary: any[]): Observable<any> {
        this.ensureInitialized();
        // Correction de l'URL pour correspondre à la route backend
        return this.http.post('http://localhost:8080/api/agency-summary/save', {
            summary,
            timestamp: new Date().toISOString()
        })
        .pipe(catchError(this.handleError));
    }

    saveSelectedSummary(summary: any[]): Observable<any> {
        return this.http.post('http://localhost:8080/api/agency-summary/save-selection', summary)
            .pipe(catchError(this.handleError));
    }

    startReconciliation(request: any): Observable<{ jobId: string }> {
        return this.http.post<{ jobId: string }>(`${this.apiUrl}/reconciliation/start`, request);
    }

    getProgress(jobId: string): Observable<{ progress: number }> {
        return this.http.get<{ progress: number }>(`${this.apiUrl}/reconciliation/progress`, { params: { jobId } });
    }

    private handleError(error: HttpErrorResponse) {
        let errorMessage = 'Une erreur est survenue';
        
        if (error.error instanceof ErrorEvent) {
            // Erreur côté client
            errorMessage = `Erreur: ${error.error.message}`;
        } else if (error.status === 0) {
            // Erreur de connexion au serveur
            errorMessage = 'Impossible de se connecter au serveur. Veuillez vérifier que le serveur est en cours d\'exécution.';
        } else {
            // Erreur côté serveur
            errorMessage = `Code d'erreur: ${error.status}\nMessage: ${error.message}`;
            if (error.error && error.error.message) {
                errorMessage += `\nDétails: ${error.error.message}`;
            }
        }
        
        console.error('Erreur complète:', error);
        // Réinitialiser la progression en cas d'erreur
        try {
            const progressSubject = this.getProgressSubject();
            progressSubject.next(0);
        } catch (e) {
            console.error('Erreur lors de la réinitialisation de la progression:', e);
        }
        return throwError(() => new Error(errorMessage));
    }
} 