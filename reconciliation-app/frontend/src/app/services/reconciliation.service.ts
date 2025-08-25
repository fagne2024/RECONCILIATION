import { Injectable, OnInit, OnDestroy } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, Subject, timer } from 'rxjs';
import { catchError, tap, map, finalize, retry, takeUntil } from 'rxjs/operators';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { ReconciliationRequest } from '../models/reconciliation-request.model';
import { ReconciliationResponse } from '../models/reconciliation-response.model';

export interface ReconciliationConfig {
    boFile: File;
    partnerFile: File;
    boReconciliationKey: string;
    partnerReconciliationKey: string;
    additionalKeys?: Array<{ boColumn: string; partnerColumn: string }>;
    tolerance?: number;
}

export interface WebSocketMessage {
    type: 'PROGRESS_UPDATE' | 'RECONCILIATION_COMPLETE' | 'RECONCILIATION_ERROR' | 'CONNECTION_STATUS';
    payload: any;
    timestamp: number;
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
    private wsUrl = 'ws://localhost:8080/ws/reconciliation';
    
    // WebSocket management
    private wsConnection: WebSocketSubject<WebSocketMessage> | null = null;
    private isConnected = false;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 2000;
    
    // Progress management
    private progressSubject = new BehaviorSubject<ProgressUpdate>({
        percentage: 0,
        processed: 0,
        total: 0,
        step: 'Initialisation...'
    });
    public progress$ = this.progressSubject.asObservable();
    
    // Connection status
    private connectionStatusSubject = new BehaviorSubject<boolean>(false);
    public connectionStatus$ = this.connectionStatusSubject.asObservable();
    
    // Messages from WebSocket
    private messageSubject = new Subject<WebSocketMessage>();
    public messages$ = this.messageSubject.asObservable();
    
    // Cleanup
    private destroy$ = new Subject<void>();

    constructor(private http: HttpClient) {
        console.log('🚀 ReconciliationService initialisé');
        // Désactiver temporairement les WebSockets en attendant le backend
        this.initializeWebSocket();
        console.log('🔌 WebSockets activés - mode temps réel');
    }

    ngOnInit(): void {
        console.log('🔄 ReconciliationService ngOnInit');
    }

    ngOnDestroy(): void {
        console.log('🧹 Nettoyage du ReconciliationService');
        this.disconnect();
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Initialise la connexion WebSocket avec gestion automatique de reconnexion
     */
    private initializeWebSocket(): void {
        if (this.wsConnection) {
            this.wsConnection.complete();
        }

        console.log('🔌 Tentative de connexion WebSocket...');
        
        this.wsConnection = webSocket<WebSocketMessage>({
            url: this.wsUrl,
            openObserver: {
                next: () => {
                    console.log('✅ Connexion WebSocket établie');
                    this.isConnected = true;
                    this.connectionStatusSubject.next(true);
                    this.reconnectAttempts = 0;
                    
                    // Envoyer un message de statut de connexion
                    this.sendMessage({
                        type: 'CONNECTION_STATUS',
                        payload: { status: 'connected', clientId: this.generateClientId() },
                        timestamp: Date.now()
                    });
                }
            },
            closeObserver: {
                next: () => {
                    console.log('❌ Connexion WebSocket fermée');
                    this.isConnected = false;
                    this.connectionStatusSubject.next(false);
                    this.handleReconnection();
                }
            }
        });

        // Écouter les messages entrants sans retry automatique
        this.wsConnection.pipe(
            takeUntil(this.destroy$)
        ).subscribe({
            next: (message: WebSocketMessage) => {
                console.log('📨 Message WebSocket reçu:', message);
                this.handleWebSocketMessage(message);
            },
            error: (error) => {
                console.error('❌ Erreur WebSocket:', error);
                this.isConnected = false;
                this.connectionStatusSubject.next(false);
                this.handleReconnection();
            },
            complete: () => {
                console.log('🔌 WebSocket fermé');
                this.isConnected = false;
                this.connectionStatusSubject.next(false);
                this.handleReconnection();
            }
        });
    }

    /**
     * Gère la reconnexion automatique
     */
    private handleReconnection(): void {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 Tentative de reconnexion ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
            
            // Délai progressif pour éviter de surcharger le serveur
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
            
            timer(delay).pipe(
                takeUntil(this.destroy$)
            ).subscribe(() => {
                console.log(`🔄 Tentative de reconnexion après ${delay}ms`);
                this.initializeWebSocket();
            });
        } else {
            console.error('❌ Nombre maximum de tentatives de reconnexion atteint');
            // Réinitialiser le compteur après un délai plus long
            timer(30000).pipe(takeUntil(this.destroy$)).subscribe(() => {
                this.reconnectAttempts = 0;
                console.log('🔄 Réinitialisation du compteur de reconnexion');
            });
        }
    }

    /**
     * Traite les messages WebSocket reçus
     */
    private handleWebSocketMessage(message: WebSocketMessage): void {
        switch (message.type) {
            case 'PROGRESS_UPDATE':
                this.progressSubject.next(message.payload);
                break;
                
            case 'RECONCILIATION_COMPLETE':
                console.log('✅ Réconciliation terminée:', message.payload);
                break;
                
            case 'RECONCILIATION_ERROR':
                console.error('❌ Erreur de réconciliation:', message.payload);
                break;
                
            case 'CONNECTION_STATUS':
                console.log('📡 Statut de connexion:', message.payload);
                break;
                
            default:
                console.warn('⚠️ Type de message inconnu:', message.type);
        }
        
        // Transmettre le message aux observateurs
        this.messageSubject.next(message);
    }

    /**
     * Envoie un message via WebSocket
     */
    private sendMessage(message: WebSocketMessage): void {
        if (this.wsConnection && this.isConnected) {
            this.wsConnection.next(message);
        } else {
            console.warn('⚠️ Impossible d\'envoyer le message: WebSocket non connecté');
        }
    }

    /**
     * Génère un ID client unique
     */
    private generateClientId(): string {
        return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Démarre la réconciliation avec upload des fichiers et communication WebSocket
     * Version temporaire qui utilise l'API existante en attendant le backend WebSocket
     */
    startReconciliation(config: ReconciliationConfig): Observable<{ jobId: string; status: string }> {
        console.log('🚀 Démarrage de la réconciliation avec config:', config);
        
        // Réinitialiser la progression
        this.progressSubject.next({
            percentage: 0,
            processed: 0,
            total: 0,
            step: 'Préparation des fichiers...'
        });

        // Version temporaire : utiliser l'API existante
        // TODO: Remplacer par l'API WebSocket quand le backend sera prêt
        return new Observable(observer => {
            // Simuler un jobId
            const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            console.log('📤 Utilisation de l\'API existante (mode temporaire)');
            
            // Mettre à jour la progression
            this.progressSubject.next({
                percentage: 10,
                processed: 0,
                total: 0,
                step: 'Préparation des fichiers...'
            });

            // Retourner le jobId immédiatement
            observer.next({ jobId, status: 'prepared' });
            observer.complete();
        });
    }

    /**
     * Obtient les mises à jour de réconciliation en temps réel
     */
    getReconciliationUpdates(): Observable<WebSocketMessage> {
        return this.messages$;
    }

    /**
     * Obtient la progression actuelle
     */
    getProgress(): Observable<ProgressUpdate> {
        return this.progress$;
    }

    /**
     * Obtient le statut de connexion
     */
    getConnectionStatus(): Observable<boolean> {
        return this.connectionStatus$;
    }

    /**
     * Se connecte explicitement au WebSocket
     */
    connect(): void {
        if (!this.isConnected) {
            this.initializeWebSocket();
        }
    }

    /**
     * Se déconnecte du WebSocket
     */
    disconnect(): void {
        console.log('🔌 Déconnexion WebSocket...');
        if (this.wsConnection) {
            this.wsConnection.complete();
            this.wsConnection = null;
        }
        this.isConnected = false;
        this.connectionStatusSubject.next(false);
    }

    /**
     * Annule une réconciliation en cours
     */
    cancelReconciliation(jobId: string): Observable<{ status: string }> {
        return this.http.post<{ status: string }>(`${this.apiUrl}/cancel`, { jobId })
            .pipe(
                tap(response => {
                    console.log('❌ Réconciliation annulée:', response);
                    this.sendMessage({
                        type: 'CONNECTION_STATUS',
                        payload: { action: 'CANCEL_RECONCILIATION', jobId },
                        timestamp: Date.now()
                    });
                }),
                catchError(this.handleError)
            );
    }

    /**
     * Récupère le statut d'un job de réconciliation
     */
    getJobStatus(jobId: string): Observable<{ status: string; progress?: ProgressUpdate; result?: ReconciliationResponse }> {
        return this.http.get<{ status: string; progress?: ProgressUpdate; result?: ReconciliationResponse }>(`${this.apiUrl}/status/${jobId}`)
            .pipe(catchError(this.handleError));
    }

    // Méthodes utilitaires conservées pour compatibilité
    uploadFile(file: File): Observable<string> {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post<string>(`${this.apiUrl}/upload`, formData)
            .pipe(catchError(this.handleError));
    }

    /**
     * Méthode de compatibilité pour l'ancienne API
     * Utilise l'API existante du backend
     */
    reconcile(request: ReconciliationRequest): Observable<ReconciliationResponse> {
        console.log('🔄 Utilisation de l\'API reconcile existante');
        
        // Utiliser l'API existante du backend
        return this.http.post<ReconciliationResponse>(`${this.apiUrl}/reconcile`, request, {
            headers: new HttpHeaders({
                'Content-Type': 'application/json'
            })
        })
        .pipe(
            tap(response => {
                console.log('✅ Réconciliation terminée via API existante:', response);
                
                // Mettre à jour la progression à 100%
                this.progressSubject.next({
                    percentage: 100,
                    processed: response.processedRecords || 0,
                    total: (response.totalBoRecords || 0) + (response.totalPartnerRecords || 0),
                    step: 'Réconciliation terminée'
                });
            }),
            catchError(this.handleError)
        );
    }

    saveSummary(summary: any[]): Observable<any> {
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

    private handleError(error: HttpErrorResponse) {
        let errorMessage = 'Une erreur est survenue';
        
        if (error.error instanceof ErrorEvent) {
            errorMessage = `Erreur: ${error.error.message}`;
        } else if (error.status === 0) {
            errorMessage = 'Impossible de se connecter au serveur. Veuillez vérifier que le serveur est en cours d\'exécution.';
        } else {
            errorMessage = `Code d'erreur: ${error.status}\nMessage: ${error.message}`;
            if (error.error && error.error.message) {
                errorMessage += `\nDétails: ${error.error.message}`;
            }
        }
        
        console.error('Erreur complète:', error);
        return throwError(() => new Error(errorMessage));
    }
} 