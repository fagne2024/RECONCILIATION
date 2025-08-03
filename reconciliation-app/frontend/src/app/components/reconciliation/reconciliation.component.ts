import { Component, OnInit } from '@angular/core';
import { ReconciliationRequest } from '../../models/reconciliation-request.model';
import { ReconciliationResponse } from '../../models/reconciliation-response.model';
import { ReconciliationService } from '../../services/reconciliation.service';
import { AppStateService } from '../../services/app-state.service';
import { OrangeMoneyUtilsService } from '../../services/orange-money-utils.service';

@Component({
    selector: 'app-reconciliation',
    templateUrl: './reconciliation.component.html',
    styleUrls: ['./reconciliation.component.scss']
})
export class ReconciliationComponent implements OnInit {
    reconciliationRequest: ReconciliationRequest | null = null;
    reconciliationResponse: ReconciliationResponse | null = null;
    isLoading = false;
    error: string | null = null;
    
    // Propriétés pour la progression
    showProgress = false;
    progressPercentage = 0;
    processedRecords = 0;
    totalRecords = 0;
    executionTime = 0;
    startTime = 0;

    // Popup de performance
    showPerformancePopup = false;
    progressStep: string = '';
    progressCurrentFile: number = 0;
    progressTotalFiles: number = 0;

    constructor(
        private reconciliationService: ReconciliationService,
        private appStateService: AppStateService,
        private orangeMoneyUtilsService: OrangeMoneyUtilsService
    ) {}

    ngOnInit(): void {
        // Initialisation du composant
    }

    startReconciliation(request: ReconciliationRequest) {
        this.reconciliationRequest = request;
        this.isLoading = true;
        this.error = null;
        this.showProgress = true;
        this.startTime = Date.now();
        this.progressPercentage = 0;
        this.processedRecords = 0;
        this.totalRecords = request.boFileContent.length + request.partnerFileContent.length;
        this.showPerformancePopup = false;

        // Notifier le début de la réconciliation (sans rafraîchir le dashboard)
        this.appStateService.startReconciliation('reconciliation');

        // Simulation de progression (car le backend ne supporte pas encore les mises à jour en temps réel)
        this.simulateProgress();

        this.reconciliationService.reconcile(request).subscribe({
            next: (response) => {
                this.reconciliationResponse = response;
                this.isLoading = false;
                this.showProgress = false;
                this.executionTime = Date.now() - this.startTime;
                
                // Mise à jour avec les vraies données de performance
                if (response.executionTimeMs) {
                    this.executionTime = response.executionTimeMs;
                }
                if (response.processedRecords) {
                    this.processedRecords = response.processedRecords;
                }
                if (response.progressPercentage) {
                    this.progressPercentage = response.progressPercentage;
                }
                
                // Notifier la fin de la réconciliation (sans rafraîchir le dashboard)
                this.appStateService.completeReconciliation();
                
                // Afficher la popup de performance
                this.showPerformancePopup = true;
            },
            error: (err) => {
                this.error = 'Erreur lors de la réconciliation: ' + err.message;
                this.isLoading = false;
                this.showProgress = false;
                
                // Notifier la fin de la réconciliation même en cas d'erreur
                this.appStateService.completeReconciliation();
            }
        });
    }

    closePerformancePopup() {
        this.showPerformancePopup = false;
    }

    private simulateProgress() {
        const interval = setInterval(() => {
            if (this.progressPercentage < 90 && this.isLoading) {
                this.progressPercentage += Math.random() * 10;
                this.processedRecords = Math.floor((this.progressPercentage / 100) * this.totalRecords);
            } else {
                clearInterval(interval);
            }
        }, 500);
    }

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

    getElapsedTime(): number {
        return this.startTime > 0 ? Date.now() - this.startTime : 0;
    }

    getSafeValue(value: number | null | undefined): number {
        return value || 0;
    }

    /**
     * Obtient les valeurs spécifiques pour un champ donné, en tenant compte du type de fichier
     */
    getFieldValues(fieldName: string, fileName?: string): string[] {
        return this.orangeMoneyUtilsService.getFieldValues(fieldName, fileName);
    }
} 