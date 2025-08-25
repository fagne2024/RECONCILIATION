import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ReconciliationRequest } from '../../models/reconciliation-request.model';
import { ReconciliationResponse } from '../../models/reconciliation-response.model';
import { ReconciliationService, ReconciliationConfig, WebSocketMessage, ProgressUpdate } from '../../services/reconciliation.service';
import { AppStateService } from '../../services/app-state.service';
import { OrangeMoneyUtilsService } from '../../services/orange-money-utils.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'app-reconciliation',
    templateUrl: './reconciliation.component.html',
    styleUrls: ['./reconciliation.component.scss']
})
export class ReconciliationComponent implements OnInit, OnDestroy {
    reconciliationRequest: ReconciliationRequest | null = null;
    reconciliationResponse: ReconciliationResponse | null = null;
    isLoading = false;
    error: string | null = null;
    
    // Propriétés pour la progression en temps réel
    showProgress = false;
    progressPercentage = 0;
    processedRecords = 0;
    totalRecords = 0;
    executionTime = 0;
    startTime = 0;
    currentStep = 'Initialisation...';
    estimatedTimeRemaining = 0;

    // Popup de performance
    showPerformancePopup = false;
    progressStep: string = '';
    progressCurrentFile: number = 0;
    progressTotalFiles: number = 0;

    // Gestion des WebSockets
    isConnected = false;
    currentJobId: string | null = null;
    private destroy$ = new Subject<void>();

    constructor(
        private reconciliationService: ReconciliationService,
        private appStateService: AppStateService,
        private orangeMoneyUtilsService: OrangeMoneyUtilsService,
        private cd: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        console.log('🚀 ReconciliationComponent initialisé');
        // Activer les WebSockets maintenant que le backend est prêt
        this.initializeWebSocketListeners();
        this.connectToWebSocket();
        console.log('🔌 WebSockets activés - mode temps réel');
    }

    ngOnDestroy(): void {
        console.log('🧹 Nettoyage du ReconciliationComponent');
        this.destroy$.next();
        this.destroy$.complete();
        
        // Annuler la réconciliation en cours si nécessaire
        if (this.currentJobId && this.isLoading) {
            this.cancelReconciliation();
        }
    }

    /**
     * Initialise les écouteurs WebSocket
     */
    private initializeWebSocketListeners(): void {
        // Écouter le statut de connexion
        this.reconciliationService.getConnectionStatus()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (connected) => {
                    this.isConnected = connected;
                    console.log('📡 Statut de connexion WebSocket:', connected);
                    this.cd.detectChanges();
                },
                error: (error) => {
                    console.error('❌ Erreur de statut de connexion:', error);
                    this.isConnected = false;
                    this.cd.detectChanges();
                }
            });

        // Écouter les mises à jour de réconciliation
        this.reconciliationService.getReconciliationUpdates()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (message: WebSocketMessage) => {
                    this.handleWebSocketMessage(message);
                },
                error: (error) => {
                    console.error('❌ Erreur lors de la réception des mises à jour:', error);
                    this.handleError('Erreur de communication avec le serveur');
                }
            });

        // Écouter les mises à jour de progression
        this.reconciliationService.getProgress()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (progress: ProgressUpdate) => {
                    this.updateProgress(progress);
                },
                error: (error) => {
                    console.error('❌ Erreur de progression:', error);
                }
            });
    }

    /**
     * Se connecte au WebSocket
     */
    private connectToWebSocket(): void {
        this.reconciliationService.connect();
    }

    /**
     * Traite les messages WebSocket reçus
     */
    private handleWebSocketMessage(message: WebSocketMessage): void {
        console.log('📨 Message reçu dans le composant:', message);

        switch (message.type) {
            case 'PROGRESS_UPDATE':
                this.updateProgress(message.payload);
                break;

            case 'RECONCILIATION_COMPLETE':
                this.handleReconciliationComplete(message.payload);
                break;

            case 'RECONCILIATION_ERROR':
                this.handleReconciliationError(message.payload);
                break;

            case 'CONNECTION_STATUS':
                console.log('📡 Statut de connexion:', message.payload);
                break;

            default:
                console.warn('⚠️ Type de message inconnu:', message.type);
        }

        // Forcer la détection de changement
        this.cd.detectChanges();
    }

    /**
     * Met à jour la progression avec les vraies données
     */
    private updateProgress(progress: ProgressUpdate): void {
        this.progressPercentage = progress.percentage;
        this.processedRecords = progress.processed;
        this.totalRecords = progress.total;
        this.currentStep = progress.step;
        this.estimatedTimeRemaining = progress.estimatedTimeRemaining || 0;
        
        if (progress.currentFile !== undefined) {
            this.progressCurrentFile = progress.currentFile;
        }
        if (progress.totalFiles !== undefined) {
            this.progressTotalFiles = progress.totalFiles;
        }

        console.log(`📈 Progression: ${progress.percentage}% - ${progress.step}`);
        this.cd.detectChanges();
    }

    /**
     * Gère la fin de réconciliation
     */
    private handleReconciliationComplete(payload: any): void {
        console.log('✅ Réconciliation terminée:', payload);
        
        this.reconciliationResponse = payload.result || payload;
        this.isLoading = false;
        this.showProgress = false;
        this.executionTime = Date.now() - this.startTime;
        
        // Mettre à jour avec les vraies données de performance
        if (payload.executionTimeMs) {
            this.executionTime = payload.executionTimeMs;
        }
        if (payload.processedRecords) {
            this.processedRecords = payload.processedRecords;
        }
        if (payload.progressPercentage) {
            this.progressPercentage = payload.progressPercentage;
        }
        
        // Notifier la fin de la réconciliation
        this.appStateService.completeReconciliation();
        
        // Afficher la popup de performance
        this.showPerformancePopup = true;
        
        // Réinitialiser le jobId
        this.currentJobId = null;
        
        this.cd.detectChanges();
    }

    /**
     * Gère les erreurs de réconciliation
     */
    private handleReconciliationError(payload: any): void {
        console.error('❌ Erreur de réconciliation:', payload);
        
        this.error = payload.error || 'Une erreur est survenue lors de la réconciliation';
        this.isLoading = false;
        this.showProgress = false;
        
        // Notifier la fin de la réconciliation même en cas d'erreur
        this.appStateService.completeReconciliation();
        
        // Réinitialiser le jobId
        this.currentJobId = null;
        
        this.cd.detectChanges();
    }

    /**
     * Démarre la réconciliation avec la nouvelle architecture
     */
    startReconciliation(config: ReconciliationConfig) {
        console.log('🚀 Démarrage de la réconciliation avec config:', config);
        
        // Vérifier la connexion WebSocket
        if (!this.isConnected) {
            this.handleError('Pas de connexion au serveur. Tentative de reconnexion...');
            this.connectToWebSocket();
            return;
        }

        // Réinitialiser l'état
        this.reconciliationRequest = null;
        this.reconciliationResponse = null;
        this.isLoading = true;
        this.error = null;
        this.showProgress = true;
        this.startTime = Date.now();
        this.progressPercentage = 0;
        this.processedRecords = 0;
        this.totalRecords = 0;
        this.currentStep = 'Préparation des fichiers...';
        this.showPerformancePopup = false;

        // Notifier le début de la réconciliation
        this.appStateService.startReconciliation('reconciliation');

        // Démarrer la réconciliation via le service
        this.reconciliationService.startReconciliation(config)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    console.log('📤 Réconciliation démarrée, jobId:', response.jobId);
                    this.currentJobId = response.jobId;
                    this.currentStep = 'Réconciliation en cours...';
                    this.cd.detectChanges();
                },
                error: (error) => {
                    console.error('❌ Erreur lors du démarrage de la réconciliation:', error);
                    this.handleError('Erreur lors du démarrage de la réconciliation: ' + error.message);
                }
            });
    }

    /**
     * Annule la réconciliation en cours
     */
    cancelReconciliation(): void {
        if (this.currentJobId && this.isLoading) {
            console.log('❌ Annulation de la réconciliation...');
            
            this.reconciliationService.cancelReconciliation(this.currentJobId)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (response) => {
                        console.log('✅ Réconciliation annulée:', response);
                        this.isLoading = false;
                        this.showProgress = false;
                        this.currentJobId = null;
                        this.appStateService.completeReconciliation();
                        this.cd.detectChanges();
                    },
                    error: (error) => {
                        console.error('❌ Erreur lors de l\'annulation:', error);
                        this.handleError('Erreur lors de l\'annulation: ' + error.message);
                    }
                });
        }
    }

    /**
     * Gère les erreurs
     */
    private handleError(message: string): void {
        this.error = message;
        this.isLoading = false;
        this.showProgress = false;
        this.currentJobId = null;
        this.appStateService.completeReconciliation();
        this.cd.detectChanges();
    }

    /**
     * Ferme la popup de performance
     */
    closePerformancePopup(): void {
        this.showPerformancePopup = false;
    }

    /**
     * Formate le temps d'exécution
     */
    formatTime(ms: number): string {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Obtient le temps écoulé
     */
    getElapsedTime(): number {
        return this.startTime > 0 ? Date.now() - this.startTime : 0;
    }

    /**
     * Obtient une valeur sécurisée
     */
    getSafeValue(value: number | null | undefined): number {
        return value || 0;
    }

    /**
     * Obtient les valeurs spécifiques pour un champ donné
     */
    getFieldValues(fieldName: string, fileName?: string): string[] {
        return this.orangeMoneyUtilsService.getFieldValues(fieldName, fileName);
    }

    /**
     * Vérifie si la réconciliation peut être annulée
     */
    canCancelReconciliation(): boolean {
        return this.isLoading && this.currentJobId !== null;
    }

    /**
     * Obtient le statut de connexion pour l'affichage
     */
    getConnectionStatusText(): string {
        return this.isConnected ? 'Connecté' : 'Déconnecté';
    }

    /**
     * Obtient la classe CSS pour le statut de connexion
     */
    getConnectionStatusClass(): string {
        return this.isConnected ? 'connected' : 'disconnected';
    }
} 