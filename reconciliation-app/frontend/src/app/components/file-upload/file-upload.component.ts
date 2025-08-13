import { Component, EventEmitter, Output } from '@angular/core';
import { ReconciliationService } from '../../services/reconciliation.service';
import { AutoProcessingService, ProcessingResult } from '../../services/auto-processing.service';
import { OrangeMoneyUtilsService } from '../../services/orange-money-utils.service';
import * as Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Router } from '@angular/router';
import { AppStateService } from '../../services/app-state.service';
import { forkJoin } from 'rxjs';

@Component({
    selector: 'app-file-upload',
    template: `
        <div class="file-upload-container">
            <!-- Mode de réconciliation -->
            <div class="reconciliation-mode-selector">
                <h3>🔄 Mode de Réconciliation</h3>
                <div class="mode-options">
                    <label class="mode-option">
                        <input type="radio" name="reconciliationMode" value="manual" [(ngModel)]="reconciliationMode">
                        <span class="mode-label">
                            <i class="fas fa-cogs"></i>
                            <strong>Mode Manuel</strong>
                            <small>Choisissez les fichiers BO et Partenaire séparément</small>
                        </span>
                    </label>
                    <label class="mode-option">
                        <input type="radio" name="reconciliationMode" value="automatic" [(ngModel)]="reconciliationMode">
                        <span class="mode-label">
                            <i class="fas fa-magic"></i>
                            <strong>Mode Automatique</strong>
                            <small>Uploadez un fichier et le système applique automatiquement le traitement et la réconciliation</small>
                        </span>
                    </label>
                </div>
            </div>

            <!-- Indicateur de progression pour gros fichiers -->
            <div class="large-file-progress" *ngIf="isProcessingLargeFile">
                <div class="progress-container">
                    <div class="progress-header">
                        <h4>🔄 Traitement en cours...</h4>
                        <div class="processing-info">
                            <span class="processing-mode" *ngIf="processingMode">
                                <i class="fas fa-microchip"></i>
                                {{ processingMode }}
                            </span>
                            <button class="cancel-btn" (click)="cancelProcessing()" [disabled]="processingCancelled">
                                <i class="fas fa-times"></i>
                                Annuler
                            </button>
                        </div>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" [style.width.%]="processingProgress"></div>
                    </div>
                    <div class="progress-text">{{ processingMessage }}</div>
                    <div class="progress-percentage">{{ processingProgress }}%</div>
                    <div class="progress-details" *ngIf="processingDetails">
                        <div class="detail-item">
                            <span class="detail-label">Mode:</span>
                            <span class="detail-value">{{ processingDetails.mode }}</span>
                        </div>
                        <div class="detail-item" *ngIf="processingDetails.chunks">
                            <span class="detail-label">Chunks:</span>
                            <span class="detail-value">{{ processingDetails.chunks }}</span>
                        </div>
                        <div class="detail-item" *ngIf="processingDetails.workers">
                            <span class="detail-label">Workers:</span>
                            <span class="detail-value">{{ processingDetails.workers }}</span>
                        </div>
                        <div class="detail-item" *ngIf="processingDetails.memory">
                            <span class="detail-label">Mémoire:</span>
                            <span class="detail-value">{{ processingDetails.memory }}</span>
                        </div>
                    </div>
                    <div class="progress-status" *ngIf="processingCancelled">
                        <span class="cancelled-status">⏹️ Traitement annulé</span>
                    </div>
                </div>
            </div>

            <!-- Mode Manuel -->
            <div class="file-upload-area" *ngIf="reconciliationMode === 'manual'">
                <div class="file-input-container" (click)="boFileInput.click()" [class.has-file]="boFile">
                    <div class="file-icon">🏢</div>
                    <h4>BO (Back Office)</h4>
                    <p>Cliquez pour sélectionner le fichier BO (CSV, XLS, XLSX)</p>
                    <input #boFileInput type="file" (change)="onBoFileSelected($event)" accept=".csv, .xls, .xlsx, .xlsm, .xlsb" style="display: none">
                    <div class="file-info" [class.loaded]="boFile">
                        {{ boFile ? boFile.name : 'Aucun fichier sélectionné' }}
                    </div>
                </div>

                <div class="file-input-container" (click)="partnerFileInput.click()" [class.has-file]="partnerFile">
                    <div class="file-icon">🤝</div>
                    <h4>Partenaire</h4>
                    <p>Cliquez pour sélectionner le fichier Partenaire (CSV, XLS, XLSX)</p>
                    <input #partnerFileInput type="file" (change)="onPartnerFileSelected($event)" accept=".csv, .xls, .xlsx, .xlsm, .xlsb" style="display: none">
                    <div class="file-info" [class.loaded]="partnerFile">
                        {{ partnerFile ? partnerFile.name : 'Aucun fichier sélectionné' }}
                    </div>
                </div>
            </div>

            <!-- Mode Automatique -->
            <div class="auto-reconciliation-area" *ngIf="reconciliationMode === 'automatic'">
                <div class="file-upload-area">
                    <div class="file-input-container" (click)="autoBoFileInput.click()" [class.has-file]="autoBoFile">
                        <div class="file-icon">🏢</div>
                        <h4>BO (Back Office)</h4>
                        <p>Cliquez pour sélectionner le fichier BO (CSV, XLS, XLSX)</p>
                        <input #autoBoFileInput type="file" (change)="onAutoBoFileSelected($event)" accept=".csv, .xls, .xlsx, .xlsm, .xlsb" style="display: none">
                        <div class="file-info" [class.loaded]="autoBoFile">
                            {{ autoBoFile ? autoBoFile.name : 'Aucun fichier sélectionné' }}
                        </div>
                    </div>

                    <div class="file-input-container" (click)="autoPartnerFileInput.click()" [class.has-file]="autoPartnerFile">
                        <div class="file-icon">🤝</div>
                        <h4>Partenaire</h4>
                        <p>Cliquez pour sélectionner le fichier Partenaire (CSV, XLS, XLSX)</p>
                        <input #autoPartnerFileInput type="file" (change)="onAutoPartnerFileSelected($event)" accept=".csv, .xls, .xlsx, .xlsm, .xlsb" style="display: none">
                        <div class="file-info" [class.loaded]="autoPartnerFile">
                            {{ autoPartnerFile ? autoPartnerFile.name : 'Aucun fichier sélectionné' }}
                        </div>
                    </div>
                </div>

                <!-- Status Panel pour le mode automatique -->
                <div class="status-panel" *ngIf="reconciliationMode === 'automatic'">
                    <div class="status-item">
                        <span class="status-label">BO chargé:</span>
                        <span class="status-value">{{ autoBoFile ? 'Oui' : 'Non' }}</span>
                    </div>
                    <div class="status-item" *ngIf="autoBoFile">
                        <span class="status-label">Nombre de lignes BO:</span>
                        <span class="status-value">{{ autoBoData.length }} lignes</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">Partenaire chargé:</span>
                        <span class="status-value">{{ autoPartnerFile ? 'Oui' : 'Non' }}</span>
                    </div>
                    <div class="status-item" *ngIf="autoPartnerFile">
                        <span class="status-label">Nombre de lignes Partenaire:</span>
                        <span class="status-value">{{ autoPartnerData.length }} lignes</span>
                    </div>
                </div>

                <!-- Messages d'état pour le mode automatique -->
                <div class="messages-section" *ngIf="errorMessage || successMessage">
                    <div class="error-message" *ngIf="errorMessage">
                        <span class="error-icon">❌</span>
                        {{ errorMessage }}
                        <button class="close-btn" (click)="clearMessages()">×</button>
                    </div>
                    
                    <div class="success-message" *ngIf="successMessage">
                        <span class="success-icon">✅</span>
                        {{ successMessage }}
                        <button class="close-btn" (click)="clearMessages()">×</button>
                    </div>
                </div>

                <!-- Indicateur de chargement -->
                <div class="loading-section" *ngIf="loading">
                    <div class="loading-spinner"></div>
                    <p>🔄 Traitement automatique en cours...</p>
                    <p class="loading-details">
                        Application des modèles de traitement et réconciliation automatique
                    </p>
                </div>

                <!-- Boutons pour le mode automatique -->
                <div class="button-container" *ngIf="reconciliationMode === 'automatic'">
                    <button class="btn proceed-btn" [disabled]="!canProceedAuto()" (click)="onAutoProceed()">
                        🔄 Lancer la Réconciliation Automatique
                    </button>
                    <div class="action-buttons">
                        <button class="btn dashboard-btn" (click)="goToDashboard()">
                            📈 Dashboard
                        </button>
                        <button class="btn stats-btn" (click)="goToStats()">
                            📊 Statistiques
                        </button>
                    </div>
                </div>

                <!-- Sélection des services pour TRXBO -->
                <div class="service-selection-overlay" *ngIf="showServiceSelection">
                    <div class="service-selection-modal">
                        <div class="service-selection-header">
                            <h3>🔍 Sélection des Services TRXBO</h3>
                            <p>Fichier TRXBO détecté. Veuillez sélectionner les services à inclure dans la réconciliation :</p>
                        </div>
                        
                        <div class="service-selection-content">
                            <div class="service-stats">
                                <div class="stat-item">
                                    <span class="stat-label">📊 Total de lignes :</span>
                                    <span class="stat-value">{{ serviceSelectionData.length }}</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">🔧 Services disponibles :</span>
                                    <span class="stat-value">{{ availableServices.length }}</span>
                                </div>
                            </div>
                            
                            <div class="service-controls">
                                <button class="btn select-all-btn" (click)="selectAllServices()">
                                    ✅ Tout sélectionner
                                </button>
                                <button class="btn deselect-all-btn" (click)="deselectAllServices()">
                                    ❌ Tout désélectionner
                                </button>
                            </div>
                            
                            <div class="service-list">
                                <div class="service-item" *ngFor="let service of availableServices">
                                    <label class="service-checkbox">
                                        <input type="checkbox" 
                                               [value]="service" 
                                               [checked]="selectedServices.includes(service)"
                                               (change)="onServiceSelectionChange($event, service)">
                                        <span class="service-name">{{ service }}</span>
                                        <span class="service-count">
                                            ({{ getServiceCount(service) }} lignes)
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <div class="service-selection-actions">
                            <button class="btn cancel-btn" (click)="cancelServiceSelection()">
                                ❌ Annuler
                            </button>
                            <button class="btn confirm-btn" 
                                    [disabled]="selectedServices.length === 0"
                                    (click)="confirmServiceSelection()">
                                ✅ Confirmer la sélection
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Status Panel pour le mode manuel -->
            <div class="status-panel" *ngIf="reconciliationMode === 'manual'">
                <div class="status-item">
                    <span class="status-label">BO chargé:</span>
                    <span class="status-value">{{ boFile ? 'Oui' : 'Non' }}</span>
                </div>
                <div class="status-item" *ngIf="boFile">
                    <span class="status-label">Nombre de lignes BO:</span>
                    <span class="status-value">{{ boData.length }} lignes</span>
                </div>
                <div class="status-item">
                    <span class="status-label">Partenaire chargé:</span>
                    <span class="status-value">{{ partnerFile ? 'Oui' : 'Non' }}</span>
                </div>
                <div class="status-item" *ngIf="partnerFile">
                    <span class="status-label">Nombre de lignes Partenaire:</span>
                    <span class="status-value">{{ partnerData.length }} lignes</span>
                </div>
                <div class="status-item" *ngIf="estimatedTime">
                    <span class="status-label">Temps estimé:</span>
                    <span class="status-value">{{ estimatedTime }}</span>
                </div>
            </div>

            <!-- Boutons pour le mode manuel -->
            <div class="button-container" *ngIf="reconciliationMode === 'manual'">
                <div class="debug-info" style="background: #f0f0f0; padding: 10px; margin: 10px 0; border-radius: 5px; font-size: 12px;">
                    <strong>Debug:</strong> BO: {{ boData.length }} lignes | Partenaire: {{ partnerData.length }} lignes | Bouton actif: {{ canProceed() ? 'Oui' : 'Non' }}
                </div>
                <button class="btn proceed-btn" [disabled]="!canProceed()" (click)="onProceed()" style="background-color: #4CAF50; color: white; padding: 15px 30px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; margin: 10px;">
                    🚀 Lancer la Réconciliation Manuelle
                </button>
                <div class="action-buttons">
                    <button class="btn dashboard-btn" (click)="goToDashboard()">
                        📈 Dashboard
                    </button>
                    <button class="btn stats-btn" (click)="goToStats()">
                        📊 Statistiques
                    </button>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .file-upload-container {
            padding: 20px;
        }

        .file-upload-area {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 20px;
        }

        .file-input-container {
            border: 3px dashed #ddd;
            border-radius: 10px;
            padding: 30px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .file-input-container:hover {
            border-color: #4CAF50;
            background: #f9fff9;
        }

        .file-input-container.has-file {
            border-color: #4CAF50;
            background: #f0f8f0;
        }

        .file-icon {
            font-size: 3em;
            color: #4CAF50;
            margin-bottom: 10px;
        }

        .file-info {
            margin-top: 15px;
            font-size: 0.9em;
            color: #666;
        }

        .file-info.loaded {
            color: #4CAF50;
            font-weight: bold;
        }

        .status-panel {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }

        .status-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            padding: 8px;
            border-radius: 4px;
            background: white;
        }

        /* Styles pour le mode automatique */
        .reconciliation-mode-selector {
            margin-bottom: 30px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
        }

        .reconciliation-mode-selector h3 {
            margin-bottom: 20px;
            color: #333;
            text-align: center;
        }

        .mode-options {
            display: flex;
            gap: 20px;
            justify-content: center;
        }

        .mode-option {
            display: flex;
            align-items: center;
            cursor: pointer;
            padding: 15px;
            border: 2px solid #ddd;
            border-radius: 8px;
            background: white;
            transition: all 0.3s ease;
            min-width: 200px;
        }

        .mode-option:hover {
            border-color: #4CAF50;
            background: #f9fff9;
        }

        .mode-option input[type="radio"] {
            margin-right: 10px;
        }

        .mode-label {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
        }

        .mode-label i {
            font-size: 1.5em;
            margin-bottom: 5px;
            color: #4CAF50;
        }

        .mode-label strong {
            margin-bottom: 5px;
            color: #333;
        }

        .mode-label small {
            color: #666;
            font-size: 0.8em;
        }

        .auto-reconciliation-area {
            margin-bottom: 20px;
        }

        .auto-upload-container {
            border: 3px dashed #ddd;
            border-radius: 10px;
            padding: 40px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
            background: white;
        }

        .auto-upload-container:hover,
        .auto-upload-container.dragover {
            border-color: #4CAF50;
            background: #f9fff9;
        }

        .auto-upload-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 15px;
        }

        .upload-icon {
            font-size: 3em;
            color: #4CAF50;
        }

        .upload-button {
            background: #4CAF50;
            color: white;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            transition: background 0.3s ease;
            display: inline-block;
        }

        .upload-button:hover {
            background: #45a049;
        }

        .supported-formats {
            color: #666;
            font-size: 0.9em;
        }

        .messages-section {
            margin: 20px 0;
        }

        .error-message,
        .success-message {
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .error-message {
            background: #ffebee;
            color: #c62828;
            border: 1px solid #ffcdd2;
        }

        .success-message {
            background: #e8f5e8;
            color: #2e7d32;
            border: 1px solid #c8e6c9;
        }

        .close-btn {
            background: none;
            border: none;
            font-size: 1.2em;
            cursor: pointer;
            color: inherit;
        }

        .loading-section {
            text-align: center;
            padding: 40px;
            background: #f8f9fa;
            border-radius: 10px;
            margin: 20px 0;
        }

        .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #4CAF50;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .results-section {
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin: 20px 0;
            overflow: hidden;
        }

        .results-header {
            background: #4CAF50;
            color: white;
            padding: 15px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .close-results-btn {
            background: none;
            border: none;
            color: white;
            font-size: 1.5em;
            cursor: pointer;
        }

        .results-content {
            padding: 20px;
        }

        .result-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }

        .info-item {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .label {
            font-weight: bold;
            color: #333;
        }

        .value {
            color: #666;
        }

        .applied-steps {
            margin: 20px 0;
        }

        .steps-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .step-item {
            display: flex;
            align-items: center;
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            gap: 15px;
        }

        .step-number {
            background: #4CAF50;
            color: white;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
        }

        .step-content {
            flex: 1;
        }

        .step-name {
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
        }

        .step-description {
            color: #666;
            margin-bottom: 5px;
        }

        .step-details {
            display: flex;
            gap: 10px;
        }

        .step-type,
        .step-action {
            background: #e0e0e0;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            color: #666;
        }

        .reconciliation-results {
            margin: 20px 0;
        }

        .reconciliation-summary {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            overflow-x: auto;
        }

        .reconciliation-summary pre {
            margin: 0;
            white-space: pre-wrap;
            word-wrap: break-word;
        }

        .processed-data {
            margin: 20px 0;
        }

        .data-preview {
            overflow-x: auto;
        }

        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }

        .data-table th,
        .data-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }

        .data-table th {
            background: #f8f9fa;
            font-weight: bold;
        }

        .data-note {
            margin-top: 10px;
            color: #666;
            font-style: italic;
        }

        .status-label {
            font-weight: 500;
            color: #333;
        }

        .status-value {
            color: #4CAF50;
            font-weight: 600;
        }

        .button-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
            margin-top: 20px;
        }

        .action-buttons {
            display: flex;
            justify-content: space-between;
            width: 100%;
            margin-top: 10px;
        }

        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.3s ease;
        }

        .proceed-btn {
            background-color: #4CAF50;
            color: white;
            width: 200px;
        }

        .proceed-btn:disabled {
            background-color: #cccccc;
            cursor: not-allowed;
        }

        .dashboard-btn {
            background-color: #2196F3;
            color: white;
            min-width: 150px;
        }

        .stats-btn {
            background-color: #FF9800;
            color: white;
            min-width: 150px;
        }

        .btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }
    `]
})
export class FileUploadComponent {
    @Output() filesLoaded = new EventEmitter<{
        boData: Record<string, string>[];
        partnerData: Record<string, string>[];
    }>();

    reconciliationMode: 'manual' | 'automatic' = 'manual';

    boFile: File | null = null;
    partnerFile: File | null = null;
    boData: Record<string, string>[] = [];
    partnerData: Record<string, string>[] = [];
    estimatedTime: string = '';

    // Fichiers pour le mode automatique
    autoBoFile: File | null = null;
    autoPartnerFile: File | null = null;
    autoBoData: Record<string, string>[] = [];
    autoPartnerData: Record<string, string>[] = [];

    loading = false;
    errorMessage = '';
    successMessage = '';

    // Variables pour le traitement des gros fichiers
    isProcessingLargeFile = false;
    processingProgress = 0;
    processingMessage = '';
    processingCancelled = false;
    processingAbortController: AbortController | null = null;
    processingMode: string = '';
    processingDetails: {
        mode: string;
        chunks?: number;
        workers?: number;
        memory?: string;
    } | null = null;

    // Sélection de services pour TRXBO
    showServiceSelection = false;
    availableServices: string[] = [];
    selectedServices: string[] = [];
    serviceSelectionData: Record<string, string>[] = [];

    // Sélection manuelle de services
    showManualServiceSelection = false;
    manualAvailableServices: string[] = [];
    manualSelectedServices: string[] = [];
    manualServiceSelectionData: Record<string, string>[] = [];

    // Configuration des formats supportés
    supportedFormats = [
        { name: 'CSV', extensions: ['.csv'], mimeType: 'text/csv' },
        { name: 'Excel', extensions: ['.xlsx', '.xls'], mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
        { name: 'JSON', extensions: ['.json'], mimeType: 'application/json' }
    ];

    constructor(
        private reconciliationService: ReconciliationService, 
        private autoProcessingService: AutoProcessingService,
        private orangeMoneyUtilsService: OrangeMoneyUtilsService,
        private router: Router, 
        private appStateService: AppStateService
    ) {}

    private updateEstimatedTime(): void {
        // Ne calculer l'estimation que si les deux fichiers sont chargés
        if (!this.boFile || !this.partnerFile) {
            this.estimatedTime = '';
            return;
        }

        const totalRows = this.boData.length + this.partnerData.length;
        if (totalRows === 0) {
            this.estimatedTime = '';
            return;
        }

        // Estimation basée sur le nombre total de lignes
        // On suppose une moyenne de 5000 lignes par seconde
        const estimatedSeconds = Math.ceil(totalRows / 5000);
        
        if (estimatedSeconds < 60) {
            this.estimatedTime = `${estimatedSeconds} seconde${estimatedSeconds > 1 ? 's' : ''}`;
        } else {
            const minutes = Math.floor(estimatedSeconds / 60);
            const seconds = estimatedSeconds % 60;
            this.estimatedTime = `${minutes} minute${minutes > 1 ? 's' : ''} ${seconds > 0 ? `et ${seconds} seconde${seconds > 1 ? 's' : ''}` : ''}`;
        }
    }

    onBoFileSelected(event: Event): void {
        console.log('🎯 onBoFileSelected() appelé');
        const input = event.target as HTMLInputElement;
        if (input.files?.length) {
            this.boFile = input.files[0];
            console.log('📁 Fichier BO sélectionné:', this.boFile.name, 'Taille:', this.boFile.size);
            this.processFileWithAutoProcessing(this.boFile, 'bo');
        }
    }

    onPartnerFileSelected(event: Event): void {
        console.log('🎯 onPartnerFileSelected() appelé');
        const input = event.target as HTMLInputElement;
        if (input.files?.length) {
            this.partnerFile = input.files[0];
            console.log('📁 Fichier Partenaire sélectionné:', this.partnerFile.name, 'Taille:', this.partnerFile.size);
            this.processFileWithAutoProcessing(this.partnerFile, 'partner');
        }
    }

    // Nouvelle méthode pour le traitement automatique optimisé
    private processFileWithAutoProcessing(file: File, fileType: 'bo' | 'partner'): void {
        console.log(`🔍 Vérification des modèles automatiques pour ${file.name} (${fileType})`);
        
        // Détecter si c'est un gros fichier (> 50MB)
        const isLargeFile = file.size > 50 * 1024 * 1024; // 50MB
        if (isLargeFile) {
            this.isProcessingLargeFile = true;
            this.processingProgress = 0;
            this.processingMessage = `Analyse du fichier ${file.name}...`;
            this.processingCancelled = false;
            this.processingAbortController = new AbortController();
            
            // Déterminer le mode de traitement
            const totalRows = Math.ceil(file.size / 100); // Estimation approximative
            if (totalRows > 100000) {
                this.processingMode = 'Web Workers';
                this.processingDetails = {
                    mode: 'Parallèle',
                    workers: navigator.hardwareConcurrency || 4,
                    chunks: Math.ceil(totalRows / 15000)
                };
            } else if (totalRows > 50000) {
                this.processingMode = 'Chunks';
                this.processingDetails = {
                    mode: 'Séquentiel',
                    chunks: Math.ceil(totalRows / 10000)
                };
            } else {
                this.processingMode = 'Standard';
                this.processingDetails = {
                    mode: 'Direct'
                };
            }
        }
        
        // Vérifier s'il y a un modèle de traitement automatique
        const abortController = isLargeFile && this.processingAbortController ? this.processingAbortController : undefined;
        
        // Configurer le callback de progression
        this.autoProcessingService.setProgressCallback((progress: number, message: string) => {
            this.updateProcessingProgress(progress, message);
        });
        
        this.autoProcessingService.processFile(file, fileType, abortController).subscribe({
            next: (result: ProcessingResult) => {
                console.log(`📊 Résultat du traitement automatique pour ${file.name}:`, result);
                
                if (result.success) {
                    console.log(`✅ Traitement automatique appliqué pour ${file.name}:`, result);
                    console.log(`📊 Modèle utilisé: ${result.modelId}`);
                    console.log(`⚡ Temps de traitement: ${result.processingTime}ms`);
                    console.log(`📈 Lignes traitées: ${result.processedData.length}`);
                    
                    // Utiliser les données traitées
                    if (fileType === 'bo') {
                        this.boData = result.processedData;
                        console.log(`✅ Données BO mises à jour: ${this.boData.length} lignes`);
                    } else {
                        this.partnerData = result.processedData;
                        console.log(`✅ Données Partenaire mises à jour: ${this.partnerData.length} lignes`);
                    }
                    
                    // Afficher une notification de succès
                    this.showProcessingNotification(result);
                } else {
                    console.log(`❌ Aucun modèle automatique trouvé pour ${file.name}, utilisation du traitement standard`);
                    console.log(`💡 Pour créer un modèle automatique, allez dans "Modèles de Traitement"`);
                    
                    // Traitement standard
                    this.parseFile(file, fileType === 'bo');
                }
                
                // Mettre à jour l'estimation si les deux fichiers sont chargés
                if (this.boFile && this.partnerFile) {
                    this.updateEstimatedTime();
                }
                
                // Réinitialiser les indicateurs de traitement
                this.isProcessingLargeFile = false;
                this.processingProgress = 0;
                this.processingMessage = '';
                this.processingAbortController = null;
                
                // Vérifier l'état après traitement
                console.log(`🔍 État après traitement de ${file.name}:`, {
                    boDataLength: this.boData.length,
                    partnerDataLength: this.partnerData.length,
                    canProceed: this.canProceed()
                });
            },
            error: (error) => {
                console.error('❌ Erreur lors du traitement automatique:', error);
                
                if (this.processingCancelled) {
                    console.log('🛑 Traitement annulé par l\'utilisateur');
                    this.processingMessage = 'Traitement annulé';
                } else {
                    console.log(`🔄 Fallback vers le traitement standard pour ${file.name}`);
                    
                    // Fallback vers le traitement standard
                    this.parseFile(file, fileType === 'bo');
                    
                    if (this.boFile && this.partnerFile) {
                        this.updateEstimatedTime();
                    }
                }
                
                // Réinitialiser les indicateurs de traitement
                this.isProcessingLargeFile = false;
                this.processingProgress = 0;
                this.processingMessage = '';
                this.processingAbortController = null;
                
                // Vérifier l'état après fallback
                console.log(`🔍 État après fallback pour ${file.name}:`, {
                    boDataLength: this.boData.length,
                    partnerDataLength: this.partnerData.length,
                    canProceed: this.canProceed()
                });
            }
        });
    }

    // Méthode pour annuler le traitement
    cancelProcessing(): void {
        if (this.processingAbortController) {
            this.processingCancelled = true;
            this.processingAbortController.abort();
            this.processingMessage = 'Annulation en cours...';
        }
    }

    // Méthode pour mettre à jour la progression
    updateProcessingProgress(progress: number, message: string): void {
        this.processingProgress = progress;
        this.processingMessage = message;
    }

    // Nouvelle méthode pour la réconciliation automatique
    onFileUploadWithAutoReconciliation(event: any): void {
        const file = event.target.files[0];
        if (!file) return;

        // Déterminer le type de fichier (BO ou partenaire) basé sur le nom ou l'extension
        const fileType = this.determineFileType(file.name);

        console.log(`🚀 Démarrage de la réconciliation automatique pour ${file.name} (type: ${fileType})`);

        this.autoProcessingService.processFileWithAutoReconciliation(file, fileType).subscribe({
            next: (result) => {
                // Afficher les résultats détaillés
                this.displayAutoReconciliationResults(result);
            },
            error: (error) => {
                console.error('❌ Erreur lors de la réconciliation automatique:', error);
            }
        });
    }

    // Méthode pour déterminer le type de fichier
    private determineFileType(fileName: string): 'bo' | 'partner' {
        const lowerFileName = fileName.toLowerCase();
        
        // Logique pour déterminer le type basée sur le nom du fichier
        if (lowerFileName.includes('bo') || lowerFileName.includes('backoffice') || lowerFileName.includes('trxbo')) {
            return 'bo';
        } else if (lowerFileName.includes('partner') || lowerFileName.includes('partenaire') || lowerFileName.includes('pmmtncm')) {
            return 'partner';
        } else {
            // Par défaut, considérer comme partenaire
            return 'partner';
        }
    }

    // Méthode pour afficher les résultats de la réconciliation automatique
    private displayAutoReconciliationResults(result: any): void {
        console.log('📊 Résultats de la réconciliation automatique:');
        console.log('   - Fichier traité:', result.fileName);
        console.log('   - Modèle utilisé:', result.modelId);
        console.log('   - Temps de traitement:', result.processingTime, 'ms');
        console.log('   - Temps de réconciliation:', result.reconciliationTime, 'ms');
        console.log('   - Étapes appliquées:', result.appliedSteps.length);
        console.log('   - Résultat de réconciliation:', result.reconciliationResult);
        
        // Appliquer le filtrage automatique Orange Money si nécessaire
        this.applyAutomaticOrangeMoneyFilterForReconciliation(result);
        
        // Vous pouvez ajouter ici la logique pour afficher les résultats dans l'UI
        // Par exemple, stocker les résultats dans une propriété du composant
        // et les afficher dans le template
    }

    // Afficher une notification de traitement automatique
    private showProcessingNotification(result: ProcessingResult): void {
        const message = `✅ Traitement automatique appliqué!\n\n` +
                       `📁 Fichier: ${result.fileName}\n` +
                       `🤖 Modèle: ${result.modelId}\n` +
                       `⚡ Temps: ${result.processingTime}ms\n` +
                       `📊 Lignes traitées: ${result.processedData.length}\n` +
                       `🔧 Étapes appliquées: ${result.appliedSteps.length}\n\n` +
                       `Les données ont été automatiquement traitées selon le modèle configuré.`;
        
        // Vous pouvez remplacer alert par une notification plus élégante
        alert(message);
    }

    private convertDebitCreditToNumber(records: Record<string, any>[]): Record<string, any>[] {
        return records.map(record => {
            const newRecord = { ...record };
            if (newRecord['debit']) newRecord['debit'] = parseFloat(newRecord['debit'].toString().replace(',', '.'));
            if (newRecord['credit']) newRecord['credit'] = parseFloat(newRecord['credit'].toString().replace(',', '.'));
            return newRecord;
        });
    }

    // Méthode pour appliquer le filtrage automatique Orange Money dans la réconciliation
    private applyAutomaticOrangeMoneyFilterForReconciliation(result: any): void {
        console.log('🎯 Vérification du filtrage automatique Orange Money pour la réconciliation...');
        
        // Vérifier si le fichier traité est un fichier Orange Money
        const fileName = result.fileName || '';
        const isOrangeMoneyFile = this.orangeMoneyUtilsService.isOrangeMoneyFile(fileName);
        
        if (isOrangeMoneyFile) {
            console.log('🎯 Fichier Orange Money détecté dans la réconciliation automatique');
            
            // Vérifier si le modèle utilisé est un modèle Orange Money
            const modelId = result.modelId || '';
            const isOrangeMoneyModel = modelId.toLowerCase().includes('orange') || 
                                     modelId.toLowerCase().includes('ciomcm') ||
                                     modelId.toLowerCase().includes('orange money');
            
            if (isOrangeMoneyModel) {
                console.log('✅ Modèle Orange Money détecté, application du filtrage automatique');
                
                // Appliquer le filtrage sur les données traitées
                if (result.processedData && result.processedData.length > 0) {
                    const filteredData = this.filterOrangeMoneyData(result.processedData);
                    
                    console.log(`✅ Filtrage Orange Money appliqué: ${filteredData.length} lignes avec "Succès" sur ${result.processedData.length} lignes totales`);
                    
                    // Mettre à jour les résultats avec les données filtrées
                    result.processedData = filteredData;
                    result.orangeMoneyFilterApplied = true;
                    result.filteredRowsCount = filteredData.length;
                    
                    // Afficher une notification
                    this.showOrangeMoneyFilterNotification(result);
                }
            } else {
                console.log('⚠️ Modèle non-Orange Money détecté, pas de filtrage automatique');
            }
        } else {
            console.log('⚠️ Fichier non-Orange Money détecté, pas de filtrage automatique');
        }
    }

    // Méthode pour filtrer les données Orange Money
    private filterOrangeMoneyData(data: any[]): any[] {
        return data.filter(row => {
            // Chercher la colonne "Statut" dans les données
            const statutColumn = Object.keys(row).find(key => 
                key.toLowerCase().includes('statut') || 
                key.toLowerCase().includes('status')
            );
            
            if (statutColumn) {
                const statutValue = row[statutColumn];
                return statutValue && statutValue.toString().toLowerCase().includes('succès');
            }
            
            return true; // Si pas de colonne Statut, garder toutes les lignes
        });
    }

    // Méthode pour afficher une notification de filtrage Orange Money
    private showOrangeMoneyFilterNotification(result: any): void {
        const message = `🎯 Filtrage Orange Money automatique appliqué!\n\n` +
                       `📁 Fichier: ${result.fileName}\n` +
                       `🤖 Modèle: ${result.modelId}\n` +
                       `✅ Lignes avec "Succès": ${result.filteredRowsCount}\n` +
                       `📊 Total initial: ${result.processedData.length + (result.totalRowsCount - result.filteredRowsCount)} lignes\n\n` +
                       `Seules les lignes avec le statut "Succès" ont été conservées pour la réconciliation.`;
        
        console.log('🎯 Notification Orange Money:', message);
        // Vous pouvez remplacer alert par une notification plus élégante
        alert(message);
    }

    // Méthode pour appliquer le filtrage automatique Orange Money dans le file upload
    private applyAutomaticOrangeMoneyFilterForFileUpload(fileName: string, isBo: boolean): void {
        console.log('🎯 Vérification du filtrage automatique Orange Money pour le file upload...');
        console.log('🔍 Nom du fichier:', fileName);
        console.log('🔍 Type de fichier (isBo):', isBo);
        
        // Vérifier si le fichier traité est un fichier Orange Money
        const isOrangeMoneyFile = this.orangeMoneyUtilsService.isOrangeMoneyFile(fileName);
        console.log('🔍 Est-ce un fichier Orange Money?', isOrangeMoneyFile);
        
        if (isOrangeMoneyFile) {
            console.log('🎯 Fichier Orange Money détecté dans le file upload');
            console.log('🔍 autoBoData.length:', this.autoBoData.length);
            console.log('🔍 autoPartnerData.length:', this.autoPartnerData.length);
            
            // Appliquer le filtrage sur les données appropriées
            if (isBo && this.autoBoData.length > 0) {
                const originalCount = this.autoBoData.length;
                this.autoBoData = this.filterOrangeMoneyData(this.autoBoData);
                const filteredCount = this.autoBoData.length;
                
                console.log(`✅ Filtrage Orange Money appliqué sur BO: ${filteredCount} lignes avec "Succès" sur ${originalCount} lignes totales`);
                this.showOrangeMoneyFilterNotificationForFileUpload(fileName, 'BO', originalCount, filteredCount);
            } else if (!isBo && this.autoPartnerData.length > 0) {
                const originalCount = this.autoPartnerData.length;
                this.autoPartnerData = this.filterOrangeMoneyData(this.autoPartnerData);
                const filteredCount = this.autoPartnerData.length;
                
                console.log(`✅ Filtrage Orange Money appliqué sur Partenaire: ${filteredCount} lignes avec "Succès" sur ${originalCount} lignes totales`);
                this.showOrangeMoneyFilterNotificationForFileUpload(fileName, 'Partenaire', originalCount, filteredCount);
            } else {
                console.log('⚠️ Aucune donnée disponible pour le filtrage (isBo:', isBo, ', autoBoData.length:', this.autoBoData.length, ', autoPartnerData.length:', this.autoPartnerData.length, ')');
            }
        } else {
            console.log('⚠️ Fichier non-Orange Money détecté, pas de filtrage automatique');
            console.log('🔍 Clés de détection utilisées: ciomcm, orange, orange money');
            console.log('🔍 Nom du fichier en minuscules:', fileName.toLowerCase());
        }
    }

    // Méthode pour afficher une notification de filtrage Orange Money pour le file upload
    private showOrangeMoneyFilterNotificationForFileUpload(fileName: string, fileType: string, originalCount: number, filteredCount: number): void {
        const message = `🎯 Filtrage Orange Money automatique appliqué!\n\n` +
                       `📁 Fichier: ${fileName}\n` +
                       `📂 Type: ${fileType}\n` +
                       `✅ Lignes avec "Succès": ${filteredCount}\n` +
                       `📊 Total initial: ${originalCount} lignes\n\n` +
                       `Seules les lignes avec le statut "Succès" ont été conservées.`;
        
        console.log('🎯 Notification Orange Money (File Upload):', message);
        // Vous pouvez remplacer alert par une notification plus élégante
        alert(message);
    }

    private parseFile(file: File, isBo: boolean): void {
        console.log(`🔧 parseFile() appelé pour ${file.name} (isBo: ${isBo})`);
        
        const fileName = file.name.toLowerCase();
        if (fileName.endsWith('.csv')) {
            console.log(`📄 Parsing CSV: ${file.name}`);
            this.parseCSV(file, isBo);
        } else if (this.isExcelFile(fileName)) {
            console.log(`📄 Parsing Excel: ${file.name}`);
            this.parseXLSX(file, isBo);
        } else {
            console.error(`❌ Format de fichier non supporté: ${file.name}`);
            this.errorMessage = `Format de fichier non supporté: ${file.name}. Formats supportés: CSV, XLS, XLSX, XLSM, XLSB, XLT, XLTX, XLTM`;
        }
    }

    /**
     * Vérifie si le fichier est un fichier Excel (tous formats)
     */
    private isExcelFile(fileName: string): boolean {
        const excelExtensions = [
            '.xls',    // Excel 97-2003
            '.xlsx',   // Excel 2007+
            '.xlsm',   // Excel avec macros
            '.xlsb',   // Excel binaire
            '.xlt',    // Template Excel 97-2003
            '.xltx',   // Template Excel 2007+
            '.xltm'    // Template Excel avec macros
        ];
        
        return excelExtensions.some(ext => fileName.endsWith(ext));
    }

    private parseCSV(file: File, isBo: boolean): void {
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
            let text = e.target?.result as string;
            // Nettoyer le BOM éventuel
            if (text.charCodeAt(0) === 0xFEFF) {
                text = text.slice(1);
            }
            
            // Optimisation pour gros fichiers : parsing par chunks
            const lines = text.split('\n');
            console.log(`📊 Fichier ${file.name}: ${lines.length} lignes détectées`);
            
            // Pour les gros fichiers (>50k lignes), utiliser un parsing optimisé
            if (lines.length > 50000) {
                console.log(`🚀 Traitement optimisé pour gros fichier: ${lines.length} lignes`);
                this.parseLargeCSV(lines, isBo);
            } else {
                // Parsing normal pour petits fichiers
                Papa.parse(text, {
                    header: true,
                    delimiter: ';',
                    skipEmptyLines: true,
                    complete: (results) => {
                        console.log('Première ligne lue:', results.data[0]);
                        if (isBo) {
                            this.boData = results.data as Record<string, string>[];
                        } else {
                            this.partnerData = this.convertDebitCreditToNumber(results.data as Record<string, string>[]);
                        }
                        // Mettre à jour l'estimation seulement si les deux fichiers sont chargés
                        if (this.boFile && this.partnerFile) {
                            this.updateEstimatedTime();
                        }
                    },
                    error: (error: any) => {
                        console.error('Erreur lors de la lecture du fichier CSV:', error);
                    }
                });
            }
        };
        reader.onerror = (e) => {
            console.error('Erreur lors de la lecture du fichier (FileReader):', e);
        };
        reader.readAsText(file, 'utf-8');
    }

    private parseLargeCSV(lines: string[], isBo: boolean): void {
        const CHUNK_SIZE = 10000;
        const data: Record<string, string>[] = [];
        
        // Activer l'indicateur de progression
        this.isProcessingLargeFile = true;
        this.processingMessage = 'Traitement du fichier volumineux...';
        this.processingProgress = 0;
        
        // Détecter le délimiteur et les en-têtes
        const firstLine = lines[0];
        const delimiter = this.detectDelimiter(firstLine);
        const headers = firstLine.split(delimiter);
        
        console.log(`🔧 Parsing optimisé: délimiteur "${delimiter}", ${headers.length} colonnes`);
        
        // Traitement par chunks
        for (let i = 1; i < lines.length; i += CHUNK_SIZE) {
            const chunk = lines.slice(i, i + CHUNK_SIZE);
            const chunkData: Record<string, string>[] = [];
            
            for (const line of chunk) {
                if (line.trim() === '') continue;
                
                const values = line.split(delimiter);
                const row: Record<string, string> = {};
                
                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });
                
                chunkData.push(row);
            }
            
            data.push(...chunkData);
            
            // Mettre à jour la progression
            const progress = Math.min(100, (i / lines.length) * 100);
            this.processingProgress = Math.round(progress);
            this.processingMessage = `Traitement: ${data.length} lignes traitées sur ${lines.length - 1}`;
            
            console.log(`📊 Progression parsing: ${Math.round(progress)}% (${data.length} lignes traitées)`);
            
            // Petite pause pour permettre l'affichage de la progression
            setTimeout(() => {}, 10);
        }
        
        console.log(`✅ Parsing terminé: ${data.length} lignes traitées`);
        
        // Désactiver l'indicateur de progression
        this.isProcessingLargeFile = false;
        this.processingProgress = 0;
        this.processingMessage = '';
        
        if (isBo) {
            this.boData = data;
        } else {
            this.partnerData = this.convertDebitCreditToNumber(data);
        }
        
        // Mettre à jour l'estimation seulement si les deux fichiers sont chargés
        if (this.boFile && this.partnerFile) {
            this.updateEstimatedTime();
        }
    }

    private detectDelimiter(line: string): string {
        const delimiters = [';', ',', '\t', '|'];
        for (const delimiter of delimiters) {
            if (line.includes(delimiter)) {
                return delimiter;
            }
        }
        return ';'; // Délimiteur par défaut
    }

    private parseXLSX(file: File, isBo: boolean): void {
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
            try {
                console.log(`🔄 Début lecture fichier Excel: ${file.name}`);
                console.log(`📄 Format détecté: ${this.getExcelFormat(file.name)}`);
                
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                
                console.log(`📊 Fichier Excel: ${workbook.SheetNames.length} feuilles détectées`);
                console.log(`📋 Feuilles disponibles: ${workbook.SheetNames.join(', ')}`);
                
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                console.log(`📄 Utilisation de la feuille: ${firstSheetName}`);
                
                // Conversion en tableau de tableaux pour analyse
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
                if (jsonData.length === 0) {
                    console.log('❌ Fichier Excel vide');
                    this.errorMessage = 'Le fichier Excel est vide ou ne contient pas de données';
                    return;
                }
                
                console.log(`📊 Données Excel brutes: ${jsonData.length} lignes`);
                
                // Détecter les en-têtes
                const headerDetection = this.detectExcelHeaders(jsonData);
                const headers = headerDetection.headerRow;
                const headerRowIndex = headerDetection.headerRowIndex;
                
                console.log(`✅ En-têtes détectés à la ligne ${headerRowIndex}:`, headers);
                
                // Vérifier si des en-têtes valides ont été trouvés
                if (!headers || headers.length === 0 || headers.every(h => !h || h.trim() === '')) {
                    console.log('⚠️ Aucun en-tête valide détecté, utilisation de la première ligne');
                    const fallbackHeaders = jsonData[0]?.map((h, idx) => h || `Col${idx + 1}`) || [];
                    const correctedHeaders = this.fixExcelColumnNames(fallbackHeaders);
                    
                    // Créer les lignes de données
                    const rows: any[] = [];
                    for (let i = 1; i < jsonData.length; i++) {
                        const rowData = jsonData[i] as any[];
                        if (!rowData || rowData.length === 0) continue;
                        
                        const row: any = {};
                        correctedHeaders.forEach((header: string, index: number) => {
                            const value = rowData[index];
                            row[header] = value !== undefined && value !== null ? value : '';
                        });
                        rows.push(row);
                    }
                    
                    if (isBo) {
                        this.boData = rows;
                    } else {
                        this.partnerData = this.convertDebitCreditToNumber(rows);
                    }
                } else {
                    // Corriger les caractères spéciaux dans les en-têtes
                    const correctedHeaders = this.fixExcelColumnNames(headers);
                    console.log(`🔧 En-têtes Excel corrigés:`, correctedHeaders);
                    
                    // Créer les lignes de données en commençant après la ligne d'en-tête
                    const rows: any[] = [];
                    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
                        const rowData = jsonData[i] as any[];
                        if (!rowData || rowData.length === 0) continue;
                        
                        const row: any = {};
                        correctedHeaders.forEach((header: string, index: number) => {
                            const value = rowData[index];
                            row[header] = value !== undefined && value !== null ? value : '';
                        });
                        rows.push(row);
                    }
                    
                    console.log(`📊 Lignes de données créées: ${rows.length}`);
                    
                    if (isBo) {
                        this.boData = rows;
                    } else {
                        this.partnerData = this.convertDebitCreditToNumber(rows);
                    }
                }
                
                console.log(`✅ Fichier Excel traité: ${isBo ? this.boData.length : this.partnerData.length} lignes`);
                
                // Mettre à jour l'estimation seulement si les deux fichiers sont chargés
                if (this.boFile && this.partnerFile) {
                    this.updateEstimatedTime();
                }
                
            } catch (error) {
                console.error('❌ Erreur lors de la lecture du fichier Excel:', error);
                this.errorMessage = `Erreur lors de la lecture du fichier Excel: ${error}`;
            }
        };
        reader.onerror = (e) => {
            console.error('Erreur lors de la lecture du fichier (FileReader):', e);
            this.errorMessage = 'Erreur lors de la lecture du fichier';
        };
        reader.readAsArrayBuffer(file);
    }

    /**
     * Détermine le format Excel du fichier
     */
    private getExcelFormat(fileName: string): string {
        const fileNameLower = fileName.toLowerCase();
        if (fileNameLower.endsWith('.xls')) return 'Excel 97-2003 (.xls)';
        if (fileNameLower.endsWith('.xlsx')) return 'Excel 2007+ (.xlsx)';
        if (fileNameLower.endsWith('.xlsm')) return 'Excel avec macros (.xlsm)';
        if (fileNameLower.endsWith('.xlsb')) return 'Excel binaire (.xlsb)';
        if (fileNameLower.endsWith('.xlt')) return 'Template Excel 97-2003 (.xlt)';
        if (fileNameLower.endsWith('.xltx')) return 'Template Excel 2007+ (.xltx)';
        if (fileNameLower.endsWith('.xltm')) return 'Template Excel avec macros (.xltm)';
        return 'Format Excel inconnu';
    }

    canProceed(): boolean {
        const canProceed = this.boData.length > 0 && this.partnerData.length > 0;
        console.log('🔍 canProceed() appelé:', {
            boDataLength: this.boData.length,
            partnerDataLength: this.partnerData.length,
            canProceed: canProceed
        });
        return canProceed;
    }

    onProceed(): void {
        console.log('🎯 onProceed() appelé');
        console.log('🔍 État des données:', {
            boDataLength: this.boData.length,
            partnerDataLength: this.partnerData.length,
            canProceed: this.canProceed()
        });
        
        if (this.canProceed()) {
            console.log('✅ Navigation vers la sélection des colonnes...');
            console.log('Données BO:', this.boData.length, 'lignes');
            console.log('Données Partenaire:', this.partnerData.length, 'lignes');
            
            // Sauvegarder les données dans le service d'état
            this.appStateService.setReconciliationData(this.boData, this.partnerData);
            this.appStateService.setCurrentStep(2);
            
            // Naviguer vers la page de sélection des colonnes
            this.router.navigate(['/column-selection']);
        } else {
            console.log('❌ onProceed() - Conditions non remplies');
        }
    }

    goToStats() {
        this.appStateService.setCurrentStep(4);
        this.router.navigate(['/stats']);
    }

    goToDashboard() {
        this.router.navigate(['/dashboard']);
    }

    // Méthodes utilitaires pour le mode automatique
    clearMessages(): void {
        this.errorMessage = '';
        this.successMessage = '';
    }

    getColumnsFromData(data: any[]): string[] {
        if (data.length === 0) return [];
        return Object.keys(data[0]);
    }

    // Méthodes pour le mode automatique
    onAutoBoFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files?.length) {
            this.autoBoFile = input.files[0];
            this.parseAutoFile(this.autoBoFile, true);
        }
    }

    onAutoPartnerFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files?.length) {
            this.autoPartnerFile = input.files[0];
            this.parseAutoFile(this.autoPartnerFile, false);
        }
    }

    // Méthode pour détecter si le fichier est TRXBO et extraire les services
    private detectTRXBOAndExtractServices(data: Record<string, string>[]): boolean {
        if (!data || data.length === 0) return false;
        
        const firstRow = data[0];
        const columns = Object.keys(firstRow);
        
        // Vérifier si c'est un fichier TRXBO (contient une colonne "Service" ou "service")
        const hasServiceColumn = columns.some(col => 
            col.toLowerCase().includes('service') || 
            col.toLowerCase().includes('serv')
        );
        
        if (hasServiceColumn) {
            console.log('🔍 Fichier TRXBO détecté, extraction des services...');
            
            // Trouver la colonne service
            const serviceColumn = columns.find(col => 
                col.toLowerCase().includes('service') || 
                col.toLowerCase().includes('serv')
            );
            
            if (serviceColumn) {
                // Extraire tous les services uniques
                const services = [...new Set(data.map(row => row[serviceColumn]).filter(service => service && service.trim()))];
                this.availableServices = services.sort();
                this.serviceSelectionData = data;
                
                console.log('📋 Services disponibles:', this.availableServices);
                console.log('📊 Nombre total de lignes:', data.length);
                
                return true;
            }
        }
        
        return false;
    }

    // Méthode pour afficher la sélection des services
    private showServiceSelectionStep(): void {
        this.showServiceSelection = true;
        this.selectedServices = [...this.availableServices]; // Sélectionner tous par défaut
    }

    // Méthode pour confirmer la sélection des services
    confirmServiceSelection(): void {
        if (this.selectedServices.length === 0) {
            this.errorMessage = 'Veuillez sélectionner au moins un service.';
            return;
        }

        console.log('✅ Services sélectionnés:', this.selectedServices);
        
        // Filtrer les données pour ne garder que les lignes des services sélectionnés
        const serviceColumn = Object.keys(this.serviceSelectionData[0]).find(col => 
            col.toLowerCase().includes('service') || 
            col.toLowerCase().includes('serv')
        );
        
        if (serviceColumn) {
            const filteredData = this.serviceSelectionData.filter(row => 
                this.selectedServices.includes(row[serviceColumn])
            );
            
            console.log('📊 Données filtrées:', filteredData.length, 'lignes sur', this.serviceSelectionData.length, 'originales');
            
            // Mettre à jour les données BO avec les données filtrées
            this.autoBoData = filteredData;
            
            // Masquer la sélection des services
            this.showServiceSelection = false;
            
            // Continuer avec la réconciliation automatique
            this.continueWithAutoReconciliation();
        }
    }

    // Méthode pour annuler la sélection des services
    cancelServiceSelection(): void {
        this.showServiceSelection = false;
        this.availableServices = [];
        this.selectedServices = [];
        this.serviceSelectionData = [];
    }

    // Méthode pour continuer avec la réconciliation automatique après sélection des services
    private continueWithAutoReconciliation(): void {
        // Cette méthode sera appelée après la sélection des services
        // Elle contiendra la logique de réconciliation automatique
        this.onAutoProceed();
    }

    // Méthode pour gérer le changement de sélection des services
    onServiceSelectionChange(event: Event, service: string): void {
        const checkbox = event.target as HTMLInputElement;
        if (checkbox.checked) {
            if (!this.selectedServices.includes(service)) {
                this.selectedServices.push(service);
            }
        } else {
            this.selectedServices = this.selectedServices.filter(s => s !== service);
        }
    }

    // Méthode pour compter le nombre de lignes par service
    getServiceCount(service: string): number {
        if (!this.serviceSelectionData || this.serviceSelectionData.length === 0) return 0;
        
        const serviceColumn = Object.keys(this.serviceSelectionData[0]).find(col => 
            col.toLowerCase().includes('service') || 
            col.toLowerCase().includes('serv')
        );
        
        if (serviceColumn) {
            return this.serviceSelectionData.filter(row => row[serviceColumn] === service).length;
        }
        
        return 0;
    }

    // Méthode pour sélectionner tous les services
    selectAllServices(): void {
        this.selectedServices = [...this.availableServices];
    }

    // Méthode pour désélectionner tous les services
    deselectAllServices(): void {
        this.selectedServices = [];
    }

    private parseAutoFile(file: File, isBo: boolean): void {
        const fileName = file.name.toLowerCase();
        if (fileName.endsWith('.csv')) {
            this.parseAutoCSV(file, isBo);
        } else if (this.isExcelFile(fileName)) {
            this.parseAutoXLSX(file, isBo);
        } else {
            alert('Format de fichier non supporté. Veuillez choisir un fichier CSV ou Excel (.xls, .xlsx, .xlsm, .xlsb, .xlt, .xltx, .xltm)');
        }
    }

    private parseAutoCSV(file: File, isBo: boolean): void {
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
            let text = e.target?.result as string;
            // Nettoyer le BOM éventuel
            if (text.charCodeAt(0) === 0xFEFF) {
                text = text.slice(1);
            }
            
            // Détecter automatiquement le délimiteur
            const lines = text.split('\n').filter(line => line.trim());
            if (lines.length > 0) {
                const firstLine = lines[0];
                const commaCount = (firstLine.match(/,/g) || []).length;
                const semicolonCount = (firstLine.match(/;/g) || []).length;
                const delimiter = semicolonCount > commaCount ? ';' : ',';
                
                console.log(`📊 Fichier ${file.name}: détecté délimiteur "${delimiter}"`);
                
                Papa.parse(text, {
                    header: true,
                    delimiter: delimiter,
                    skipEmptyLines: true,
                    complete: (results) => {
                        console.log('Première ligne lue:', results.data[0]);
                        if (isBo) {
                            this.autoBoData = results.data as Record<string, string>[];
                            
                            // Vérifier si c'est un fichier TRXBO et déclencher la sélection des services
                            if (this.detectTRXBOAndExtractServices(this.autoBoData)) {
                                this.showServiceSelectionStep();
                            }
                        } else {
                            this.autoPartnerData = this.convertDebitCreditToNumber(results.data as Record<string, string>[]);
                        }
                    },
                    error: (error: any) => {
                        console.error('Erreur lors de la lecture du fichier CSV:', error);
                    }
                });
            }
        };
        reader.onerror = (e) => {
            console.error('Erreur lors de la lecture du fichier (FileReader):', e);
        };
        reader.readAsText(file, 'utf-8');
    }

    private parseAutoXLSX(file: File, isBo: boolean): void {
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
            try {
                console.log('🔄 Début lecture fichier Excel automatique pour réconciliation');
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
                
                // Conversion en tableau de tableaux pour analyse
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
                if (jsonData.length === 0) {
                    console.log('❌ Fichier Excel vide');
                    return;
                }
                
                console.log(`📊 Données Excel brutes: ${jsonData.length} lignes`);
                
                // Détecter les en-têtes
                const headerDetection = this.detectExcelHeaders(jsonData);
                const headers = headerDetection.headerRow;
                const headerRowIndex = headerDetection.headerRowIndex;
                
                console.log(`✅ En-têtes détectés à la ligne ${headerRowIndex}:`, headers);
                
                // Vérifier si des en-têtes valides ont été trouvés
                if (!headers || headers.length === 0 || headers.every(h => !h || h.trim() === '')) {
                    console.log('⚠️ Aucun en-tête valide détecté, utilisation de la première ligne');
                    const fallbackHeaders = jsonData[0]?.map((h, idx) => h || `Col${idx + 1}`) || [];
                    const correctedHeaders = this.fixExcelColumnNames(fallbackHeaders);
                    
                    // Créer les lignes de données
                    const rows: any[] = [];
                    for (let i = 1; i < jsonData.length; i++) {
                        const rowData = jsonData[i] as any[];
                        if (!rowData || rowData.length === 0) continue;
                        
                        const row: any = {};
                        correctedHeaders.forEach((header: string, index: number) => {
                            const value = rowData[index];
                            row[header] = value !== undefined && value !== null ? value : '';
                        });
                        rows.push(row);
                    }
                    
            if (isBo) {
                        this.autoBoData = rows;
            } else {
                        this.autoPartnerData = this.convertDebitCreditToNumber(rows);
                    }
                } else {
                    // Corriger les caractères spéciaux dans les en-têtes
                    const correctedHeaders = this.fixExcelColumnNames(headers);
                    console.log(`🔧 En-têtes Excel corrigés:`, correctedHeaders);
                    
                    // Créer les lignes de données en commençant après la ligne d'en-tête
                    const rows: any[] = [];
                    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
                        const rowData = jsonData[i] as any[];
                        if (!rowData || rowData.length === 0) continue;
                        
                        const row: any = {};
                        correctedHeaders.forEach((header: string, index: number) => {
                            const value = rowData[index];
                            row[header] = value !== undefined && value !== null ? value : '';
                        });
                        rows.push(row);
                    }
                    
                    console.log(`📊 Lignes de données créées: ${rows.length}`);
                    
                    if (isBo) {
                        this.autoBoData = rows;
                        
                        // Vérifier si c'est un fichier TRXBO et déclencher la sélection des services
                        if (this.detectTRXBOAndExtractServices(this.autoBoData)) {
                            this.showServiceSelectionStep();
                        }
                    } else {
                        this.autoPartnerData = this.convertDebitCreditToNumber(rows);
                    }
                }
                
                console.log(`✅ Fichier Excel traité: ${isBo ? this.autoBoData.length : this.autoPartnerData.length} lignes`);
                
                // Appliquer le filtrage automatique Orange Money si nécessaire
                this.applyAutomaticOrangeMoneyFilterForFileUpload(file.name, isBo);
                
            } catch (error) {
                console.error('❌ Erreur lors de la lecture du fichier Excel:', error);
            }
        };
        reader.onerror = (e) => {
            console.error('Erreur lors de la lecture du fichier (FileReader):', e);
        };
        reader.readAsArrayBuffer(file);
    }

    // Méthode pour détecter les en-têtes dans les fichiers Excel
    private detectExcelHeaders(jsonData: any[][]): { headerRowIndex: number; headerRow: string[] } {
        console.log('🔄 Détection des en-têtes Excel pour réconciliation');
        
        // Fonction utilitaire pour vérifier si une chaîne est valide
        const isValidString = (str: any): str is string => {
            return typeof str === 'string' && str !== null && str !== undefined;
        };
        
        // Fonction utilitaire pour vérifier si une chaîne contient un motif de manière sécurisée
        const safeIncludes = (str: any, pattern: string): boolean => {
            return isValidString(str) && str.includes(pattern);
        };
        
        // Fonction utilitaire pour vérifier si une chaîne commence par un motif de manière sécurisée
        const safeStartsWith = (str: any, pattern: string): boolean => {
            return isValidString(str) && str.startsWith(pattern);
        };
        
        // Mots-clés pour identifier les en-têtes
        const headerKeywords = [
            'N°', 'Date', 'Heure', 'Référence', 'Service', 'Paiement', 'Statut', 'Mode',
            'Compte', 'Wallet', 'Pseudo', 'Débit', 'Crédit', 'Montant', 'Commissions',
            'Opération', 'Agent', 'Correspondant', 'Sous-réseau', 'Transaction'
        ];
        
        let bestHeaderRowIndex = 0;
        let bestScore = 0;
        let bestHeaderRow: string[] = [];
        
        // Analyser plus de lignes pour trouver le meilleur candidat (jusqu'à 200 lignes)
        const maxRowsToCheck = Math.min(200, jsonData.length);
        
        console.log(`🔍 Analyse de ${maxRowsToCheck} lignes sur ${jsonData.length} lignes totales`);
        
        let emptyRowCount = 0;
        let consecutiveEmptyRows = 0;
        
        for (let i = 0; i < maxRowsToCheck; i++) {
            try {
                console.log(`🔍 === DÉBUT ANALYSE LIGNE ${i} ===`);
                const row = jsonData[i] as any[];
                if (!row || row.length === 0) {
                    emptyRowCount++;
                    consecutiveEmptyRows++;
                    console.log(`🔍 Ligne ${i}: ligne vide ou null, ignorée (total vide: ${emptyRowCount}, consécutives: ${consecutiveEmptyRows})`);
                    continue;
                }
                
                // Réinitialiser le compteur de lignes vides consécutives
                consecutiveEmptyRows = 0;
                
                // Convertir la ligne en chaînes et nettoyer
                const rowStrings = row.map((cell: any) => {
                    if (cell === null || cell === undefined) return '';
                    try {
                        const cellString = String(cell).trim();
                        return cellString;
                    } catch (error) {
                        console.warn(`⚠️ Erreur lors de la conversion de la cellule:`, cell, error);
                        return '';
                    }
                });
                
                console.log(`🔍 Ligne ${i} - Nombre de cellules: ${rowStrings.length}, Cellules non vides: ${rowStrings.filter(cell => cell !== '').length}`);
                
                // Ignorer les lignes qui sont clairement des en-têtes de document
                const documentHeaders = [
                    'Relevé de vos opérations', 'Application :', 'Compte Orange Money :', 'Début de Période :', 
                    'Fin de Période :', 'Réseau :', 'Cameroon', 'Transactions réussies',
                    'Wallet commission', 'Total', 'Total activités'
                ];
                const isDocumentHeader = documentHeaders.some(header => 
                    rowStrings.some(cell => safeIncludes(cell, header))
                );
                
                if (isDocumentHeader) {
                    console.log(`🔍 Ligne ${i} ignorée (en-tête de document):`, rowStrings.filter(cell => cell !== ''));
                    continue;
                }
                
                // Ignorer les lignes qui contiennent principalement des données numériques (pas des en-têtes)
                const numericCells = rowStrings.filter(cell => {
                    if (cell === '') return false;
                    return !isNaN(Number(cell)) && cell.length > 0;
                });
                
                if (numericCells.length > rowStrings.filter(cell => cell !== '').length * 0.7) {
                    console.log(`🔍 Ligne ${i} ignorée (données numériques):`, rowStrings.filter(cell => cell !== ''));
                    continue;
                }
                
                // Log pour voir toutes les lignes analysées
                console.log(`🔍 Analyse ligne ${i}:`, rowStrings.filter(cell => cell !== ''));
                
                // Afficher aussi les lignes suivantes pour voir la structure
                if (i < maxRowsToCheck - 1) {
                    const nextRow = jsonData[i + 1] as any[];
                    if (nextRow && nextRow.length > 0) {
                        const nextRowStrings = nextRow.map((cell: any) => {
                            if (cell === null || cell === undefined) return '';
                            try {
                                const cellString = String(cell).trim();
                                return cellString;
                            } catch (error) {
                                console.warn(`⚠️ Erreur lors de la conversion de la cellule suivante:`, cell, error);
                                return '';
                            }
                        });
                        console.log(`🔍 Ligne suivante ${i + 1}:`, nextRowStrings.filter(cell => cell !== ''));
                    }
                }
                
                // Calculer le score pour cette ligne
                let score = 0;
                let hasNumberColumn = false;
                let nonEmptyColumns = 0;
                let hasHeaderKeywords = false;
                let keywordMatches = 0;
                
                for (let j = 0; j < rowStrings.length; j++) {
                    const cell = rowStrings[j];
                    if (cell === '' || cell === null || cell === undefined) continue;
                    
                    // Vérification supplémentaire pour s'assurer que cell est une chaîne valide
                    if (!isValidString(cell)) continue;
                    
                    nonEmptyColumns++;
                    
                    // Vérifier si c'est une colonne "N°"
                    if (safeStartsWith(cell, 'N°') || cell === 'N' || safeIncludes(cell, 'N°')) {
                        hasNumberColumn = true;
                        score += 25; // Bonus important pour "N°"
                    }
                    
                    // Vérifier les mots-clés d'en-tête
                    for (const keyword of headerKeywords) {
                        if (safeIncludes(cell.toLowerCase(), keyword.toLowerCase())) {
                            score += 8;
                            hasHeaderKeywords = true;
                            keywordMatches++;
                        }
                    }
                    
                    // Bonus spécial pour les lignes avec plusieurs colonnes "N°"
                    if (safeIncludes(cell, 'N°')) {
                        score += 5; // Bonus supplémentaire pour chaque colonne "N°"
                    }
                    
                    // Bonus pour les colonnes qui ressemblent à des en-têtes
                    if (cell.length > 0 && cell.length < 50 && 
                        (safeIncludes(cell, ' ') || safeIncludes(cell, '(') || safeIncludes(cell, ')') || 
                         safeIncludes(cell, ':') || safeIncludes(cell, '-') || safeIncludes(cell, '_'))) {
                        score += 3;
                    }
                    
                    // Bonus pour les colonnes avec des caractères spéciaux (typiques des en-têtes)
                    if (safeIncludes(cell, 'é') || safeIncludes(cell, 'è') || safeIncludes(cell, 'à') || 
                        safeIncludes(cell, 'ç') || safeIncludes(cell, 'ù') || safeIncludes(cell, 'ô')) {
                        score += 4;
                    }
                }
                
                // Bonus pour avoir une colonne "N°" et plusieurs colonnes non vides
                if (hasNumberColumn && nonEmptyColumns >= 3) {
                    score += 30;
                }
                
                // Bonus pour avoir des mots-clés d'en-tête
                if (hasHeaderKeywords && nonEmptyColumns >= 2) {
                    score += 15;
                }
                
                // Bonus pour avoir plusieurs mots-clés
                if (keywordMatches >= 3) {
                    score += 20;
                }
                
                // Score de base pour les lignes avec plusieurs colonnes non vides
                if (nonEmptyColumns >= 3) {
                    score += 8;
                }
                
                // Pénalité réduite pour les lignes avec peu de colonnes non vides
                if (nonEmptyColumns < 2) {
                    score -= 3; // Réduit encore plus
                }
                
                console.log(`🔍 Ligne ${i}: score=${score}, colonnes=${nonEmptyColumns}, hasNumberColumn=${hasNumberColumn}, hasHeaderKeywords=${hasHeaderKeywords}, keywordMatches=${keywordMatches}`);
                
                // Log spécial pour les lignes avec beaucoup de colonnes non vides
                if (nonEmptyColumns >= 5) {
                    console.log(`🔍 LIGNE INTÉRESSANTE ${i}: ${nonEmptyColumns} colonnes non vides:`, rowStrings.filter(cell => cell !== ''));
                }
                
                if (score > bestScore) {
                    bestScore = score;
                    bestHeaderRowIndex = i;
                    bestHeaderRow = [...rowStrings];
                    console.log(`🔍 ⭐ Nouveau meilleur en-tête trouvé à la ligne ${i} avec score ${score}`);
                }
                
                // Continuer l'analyse même après avoir trouvé un en-tête valide
                if (score > 0) {
                    console.log(`🔍 En-tête potentiel à la ligne ${i} avec score ${score}`);
                }
                
                console.log(`🔍 === FIN ANALYSE LIGNE ${i} ===`);
            } catch (error) {
                console.error(`❌ Erreur lors de l'analyse de la ligne ${i}:`, error);
                continue;
            }
        }
        
        console.log(`🔍 Meilleur en-tête trouvé à la ligne ${bestHeaderRowIndex} avec score ${bestScore}`);
        console.log(`🔍 En-tête détecté:`, bestHeaderRow);
        
        // Fallback : si aucun en-tête valide n'est trouvé, utiliser la première ligne non vide
        if (bestScore <= 0) {
            console.log('⚠️ Aucun en-tête valide détecté, utilisation de la première ligne non vide');
            for (let i = 0; i < jsonData.length; i++) {
                const row = jsonData[i] as any[];
                if (row && row.length > 0) {
                    const rowStrings = row.map((cell: any) => {
                        if (cell === null || cell === undefined) return '';
                        return String(cell).trim();
                    });
                    
                    const nonEmptyCount = rowStrings.filter(cell => cell !== '').length;
                    if (nonEmptyCount >= 2) {
                        console.log(`🔍 Fallback: utilisation de la ligne ${i} avec ${nonEmptyCount} colonnes non vides`);
                        return {
                            headerRowIndex: i,
                            headerRow: rowStrings
                        };
                    }
                }
            }
        }
        
        return {
            headerRowIndex: bestHeaderRowIndex,
            headerRow: bestHeaderRow
        };
    }

    // Méthode pour corriger les caractères spéciaux dans les en-têtes Excel
    private fixExcelColumnNames(columns: string[]): string[] {
        return columns.map((col: string) => {
            if (!col) return col;
            
            // Corrections spécifiques pour les fichiers Excel
            let corrected = col;
            
            // Corriger "Opration" -> "Opération"
            if (corrected.includes('Opration')) {
                corrected = corrected.replace(/Opration/g, 'Opération');
            }
            
            // Corriger "Montant (XAF)" -> "Montant (XAF)"
            if (corrected.includes('Montant') && corrected.includes('XAF')) {
                corrected = corrected.replace(/Montant\s*\(XAF\)/g, 'Montant (XAF)');
            }
            
            // Corriger "Commissions (XAF)" -> "Commissions (XAF)"
            if (corrected.includes('Commissions') && corrected.includes('XAF')) {
                corrected = corrected.replace(/Commissions\s*\(XAF\)/g, 'Commissions (XAF)');
            }
            
            // Corriger "N° de Compte" -> "N° de Compte"
            if (corrected.includes('N°') && corrected.includes('Compte')) {
                corrected = corrected.replace(/N°\s*de\s*Compte/g, 'N° de Compte');
            }
            
            // Corriger "N° Pseudo" -> "N° Pseudo"
            if (corrected.includes('N°') && corrected.includes('Pseudo')) {
                corrected = corrected.replace(/N°\s*Pseudo/g, 'N° Pseudo');
            }
            
            return corrected;
        });
    }

    canProceedAuto(): boolean {
        return this.autoBoData.length > 0 && this.autoPartnerData.length > 0;
    }

    onAutoProceed(): void {
        if (this.canProceedAuto()) {
            this.loading = true;
            this.errorMessage = '';
            this.successMessage = '';

            console.log('🚀 Démarrage de la réconciliation automatique...');
            console.log('📊 Données BO:', this.autoBoData.length, 'lignes');
            console.log('📊 Données Partenaire:', this.autoPartnerData.length, 'lignes');

            // Vérifier les modèles de traitement automatique pour les deux fichiers
            const boFileName = this.autoBoFile?.name || '';
            const partnerFileName = this.autoPartnerFile?.name || '';

            console.log('🔍 Vérification des modèles de traitement automatique...');
            console.log('📄 Fichier BO:', boFileName);
            console.log('📄 Fichier Partenaire:', partnerFileName);

            // Récupérer les modèles correspondants
            const boModel$ = this.autoProcessingService.findMatchingModel(boFileName, 'bo');
            const partnerModel$ = this.autoProcessingService.findMatchingModel(partnerFileName, 'partner');

            // Combiner la récupération des modèles
            forkJoin({
                boModel: boModel$,
                partnerModel: partnerModel$
            }).subscribe({
                next: (models: { boModel: any; partnerModel: any }) => {
                    console.log('📋 Modèles trouvés:', models);
                    
                    // Traiter les données avec les modèles trouvés
                    let processedBoData = this.autoBoData;
                    let processedPartnerData = this.autoPartnerData;
                    let boKeyColumn = 'ID';
                    let partnerKeyColumn = 'ID';
                    let comparisonColumns = [{ boColumn: 'ID', partnerColumn: 'ID' }];

                    // Appliquer le modèle BO s'il existe
                    if (models.boModel) {
                        console.log('🏷️ Modèle BO trouvé:', models.boModel.name);
                        console.log('🔧 Étapes de traitement BO:', models.boModel.processingSteps);
                        
                        // Appliquer les étapes de traitement
                        const boProcessingResult = this.autoProcessingService.applyProcessingSteps(this.autoBoData, models.boModel.processingSteps);
                        processedBoData = boProcessingResult.processedData;
                        
                        console.log('📊 Données BO originales:', this.autoBoData.length, 'lignes');
                        console.log('📊 Données BO traitées:', processedBoData.length, 'lignes');
                        console.log('🔍 Première ligne BO originale:', Object.keys(this.autoBoData[0] || {}));
                        console.log('🔍 Première ligne BO traitée:', Object.keys(processedBoData[0] || {}));
                        
                        // Note: Les clés de réconciliation sont configurées dans les modèles partenaire
                        console.log('ℹ️ Clés de réconciliation configurées dans le modèle partenaire');
                    }

                    // Appliquer le modèle Partenaire s'il existe
                    if (models.partnerModel) {
                        console.log('🏷️ Modèle Partenaire trouvé:', models.partnerModel.name);
                        console.log('🔧 Étapes de traitement Partenaire:', models.partnerModel.processingSteps);
                        
                        // Appliquer les étapes de traitement
                        const partnerProcessingResult = this.autoProcessingService.applyProcessingSteps(this.autoPartnerData, models.partnerModel.processingSteps);
                        processedPartnerData = partnerProcessingResult.processedData;
                        
                        console.log('📊 Données Partenaire originales:', this.autoPartnerData.length, 'lignes');
                        console.log('📊 Données Partenaire traitées:', processedPartnerData.length, 'lignes');
                        console.log('🔍 Première ligne Partenaire originale:', Object.keys(this.autoPartnerData[0] || {}));
                        console.log('🔍 Première ligne Partenaire traitée:', Object.keys(processedPartnerData[0] || {}));
                        
                        // Récupérer les clés de réconciliation du modèle Partenaire
                        if (models.partnerModel.reconciliationKeys?.partnerKeys && models.partnerModel.reconciliationKeys.partnerKeys.length > 0) {
                            partnerKeyColumn = models.partnerModel.reconciliationKeys.partnerKeys[0];
                            console.log('🔑 Clé de réconciliation Partenaire:', partnerKeyColumn);
                        }
                        
                        // Récupérer les modèles BO et leurs clés configurées
                        console.log('🔍 Configuration des clés BO dans le modèle partenaire:');
                        console.log('  - boModels:', models.partnerModel.reconciliationKeys?.boModels);
                        console.log('  - boModelKeys:', models.partnerModel.reconciliationKeys?.boModelKeys);
                        
                        if (models.partnerModel.reconciliationKeys?.boModels && 
                            models.partnerModel.reconciliationKeys.boModels.length > 0) {
                            
                            // Pour l'instant, utiliser le premier modèle BO configuré
                            const firstBoModelId = models.partnerModel.reconciliationKeys.boModels[0];
                            const boModelKeys = models.partnerModel.reconciliationKeys.boModelKeys;
                            
                            console.log('  - Premier modèle BO ID:', firstBoModelId);
                            console.log('  - Clés disponibles pour ce modèle:', boModelKeys?.[firstBoModelId]);
                            
                            if (boModelKeys && boModelKeys[firstBoModelId] && 
                                boModelKeys[firstBoModelId].length > 0) {
                                boKeyColumn = boModelKeys[firstBoModelId][0];
                                console.log('🔑 Clé BO configurée dans le modèle partenaire:', boKeyColumn);
                            } else {
                                console.log('⚠️ Aucune clé BO trouvée dans la configuration');
                                // Essayer de trouver une clé BO appropriée dans les données traitées
                                const availableBoColumns = Object.keys(processedBoData[0] || {});
                                const potentialKeys = ['IDTransaction', 'ID', 'Id', 'TransactionId', 'Reference'];
                                for (const potentialKey of potentialKeys) {
                                    if (availableBoColumns.includes(potentialKey)) {
                                        boKeyColumn = potentialKey;
                                        console.log('🔑 Clé BO automatique trouvée:', boKeyColumn);
                                        break;
                                    }
                                }
                                if (!boKeyColumn) {
                                    console.log('⚠️ Aucune clé BO appropriée trouvée, utilisation de la première colonne');
                                    boKeyColumn = availableBoColumns[0] || 'ID';
                                }
                            }
                        } else {
                            console.log('⚠️ Aucun modèle BO configuré dans le modèle partenaire');
                        }
                    }

                    // Construire les colonnes de comparaison basées sur les modèles
                    comparisonColumns = [];
                    
                    // Ajouter les clés de réconciliation
                    if (boKeyColumn && partnerKeyColumn) {
                        comparisonColumns.push({
                            boColumn: boKeyColumn,
                            partnerColumn: partnerKeyColumn
                        });
                    }

                    // Ajouter d'autres colonnes de comparaison si configurées dans le modèle partenaire
                    if (models.partnerModel?.reconciliationKeys?.partnerKeys && 
                        models.partnerModel.reconciliationKeys.partnerKeys.length > 1) {
                        
                        // Ajouter les colonnes supplémentaires du modèle partenaire
                        for (let i = 1; i < models.partnerModel.reconciliationKeys.partnerKeys.length; i++) {
                            const partnerKey = models.partnerModel.reconciliationKeys.partnerKeys[i];
                            
                            // Chercher la clé BO correspondante dans les modèles BO configurés
                            if (models.partnerModel.reconciliationKeys.boModels && 
                                models.partnerModel.reconciliationKeys.boModelKeys) {
                                
                                const firstBoModelId = models.partnerModel.reconciliationKeys.boModels[0];
                                const boModelKeys = models.partnerModel.reconciliationKeys.boModelKeys[firstBoModelId];
                                
                                if (boModelKeys && boModelKeys[i]) {
                                    comparisonColumns.push({
                                        boColumn: boModelKeys[i],
                                        partnerColumn: partnerKey
                                    });
                                }
                            }
                        }
                    }

                    console.log('🔗 Colonnes de comparaison configurées:', comparisonColumns);
                    console.log('🔑 Clé BO utilisée:', boKeyColumn);
                    console.log('🔑 Clé Partenaire utilisée:', partnerKeyColumn);
                    
                    // Vérifier si les clés existent et essayer des alternatives si nécessaire
                    let finalBoKeyColumn = boKeyColumn;
                    let finalPartnerKeyColumn = partnerKeyColumn;
                    
                    if (processedBoData.length > 0 && (!boKeyColumn || !(boKeyColumn in processedBoData[0]))) {
                        console.log('⚠️ Clé BO non trouvée, recherche d\'alternatives...');
                        
                        // Chercher des colonnes alternatives dans l'ordre de priorité
                        const priorityKeys = ['Numéro Trans GU', 'IDTransaction', 'ID', 'Reference', 'Transaction ID'];
                        let foundKey = null;
                        
                        for (const key of priorityKeys) {
                            if (key in processedBoData[0]) {
                                foundKey = key;
                                break;
                            }
                        }
                        
                        if (foundKey) {
                            finalBoKeyColumn = foundKey;
                            console.log('✅ Clé BO alternative trouvée:', finalBoKeyColumn);
                        } else {
                            // Si aucune clé prioritaire n'est trouvée, prendre la première colonne
                            const availableKeys = Object.keys(processedBoData[0]);
                            if (availableKeys.length > 0) {
                                finalBoKeyColumn = availableKeys[0];
                                console.log('⚠️ Utilisation de la première colonne disponible comme clé BO:', finalBoKeyColumn);
                            } else {
                                console.log('❌ Aucune colonne disponible pour la clé BO');
                            }
                        }
                    }
                    
                    if (processedPartnerData.length > 0 && (!partnerKeyColumn || !(partnerKeyColumn in processedPartnerData[0]))) {
                        console.log('⚠️ Clé Partenaire non trouvée, recherche d\'alternatives...');
                        
                        // Chercher des colonnes alternatives dans l'ordre de priorité
                        const priorityKeys = ['External id', 'External ID', 'ID', 'Reference', 'Transaction ID'];
                        let foundKey = null;
                        
                        for (const key of priorityKeys) {
                            if (key in processedPartnerData[0]) {
                                foundKey = key;
                                break;
                            }
                        }
                        
                        if (foundKey) {
                            finalPartnerKeyColumn = foundKey;
                            console.log('✅ Clé Partenaire alternative trouvée:', finalPartnerKeyColumn);
                        } else {
                            // Si aucune clé prioritaire n'est trouvée, prendre la première colonne
                            const availableKeys = Object.keys(processedPartnerData[0]);
                            if (availableKeys.length > 0) {
                                finalPartnerKeyColumn = availableKeys[0];
                                console.log('⚠️ Utilisation de la première colonne disponible comme clé Partenaire:', finalPartnerKeyColumn);
                            } else {
                                console.log('❌ Aucune colonne disponible pour la clé Partenaire');
                            }
                        }
                    }
                    
                    // Mettre à jour les colonnes de comparaison avec les clés finales
                    if (finalBoKeyColumn !== boKeyColumn || finalPartnerKeyColumn !== partnerKeyColumn) {
                        comparisonColumns = [{
                            boColumn: finalBoKeyColumn,
                            partnerColumn: finalPartnerKeyColumn
                        }];
                        console.log('🔄 Colonnes de comparaison mises à jour:', comparisonColumns);
                    }
                    
                    // Afficher quelques exemples de valeurs pour déboguer
                    if (processedBoData.length > 0) {
                        console.log('📋 Exemple valeur BO pour clé', boKeyColumn, ':', processedBoData[0][boKeyColumn]);
                        console.log('🔍 Clé BO existe dans les données?', boKeyColumn in processedBoData[0]);
                        console.log('🔍 Colonnes disponibles BO:', Object.keys(processedBoData[0]));
                        
                        // Afficher les 5 premières lignes pour déboguer
                        console.log('🔍 5 premières lignes BO:', processedBoData.slice(0, 5));
                        
                        // Chercher des colonnes similaires
                        const similarColumns = Object.keys(processedBoData[0]).filter(col => 
                            col.toLowerCase().includes('trans') || 
                            col.toLowerCase().includes('gu') || 
                            col.toLowerCase().includes('numero') ||
                            col.toLowerCase().includes('reference')
                        );
                        console.log('🔍 Colonnes similaires trouvées:', similarColumns);
                    }
                    if (processedPartnerData.length > 0) {
                        console.log('📋 Exemple valeur Partenaire pour clé', partnerKeyColumn, ':', processedPartnerData[0][partnerKeyColumn]);
                        console.log('🔍 Clé Partenaire existe dans les données?', partnerKeyColumn in processedPartnerData[0]);
                        console.log('🔍 Colonnes disponibles Partenaire:', Object.keys(processedPartnerData[0]));
                        
                        // Afficher les 5 premières lignes pour déboguer
                        console.log('🔍 5 premières lignes Partenaire:', processedPartnerData.slice(0, 5));
                    }

                    // Créer la requête de réconciliation avec les données traitées
                    const reconciliationRequest = {
                        boFileContent: processedBoData,
                        partnerFileContent: processedPartnerData,
                        boKeyColumn: finalBoKeyColumn,
                        partnerKeyColumn: finalPartnerKeyColumn,
                        comparisonColumns: comparisonColumns,
                        // Inclure les filtres BO si présents dans le modèle partenaire
                        boColumnFilters: models.partnerModel?.reconciliationKeys?.boColumnFilters || []
                    };

                    console.log('🔄 Lancement de la réconciliation avec les données traitées...');
                    console.log('🔑 Clé BO finale utilisée:', finalBoKeyColumn);
                    console.log('🔑 Clé Partenaire finale utilisée:', finalPartnerKeyColumn);
                    console.log('🔍 Filtres BO inclus:', models.partnerModel?.reconciliationKeys?.boColumnFilters);
                    
                    if (models.partnerModel?.reconciliationKeys?.boColumnFilters) {
                        console.log('✅ Filtres BO trouvés dans la requête:');
                        models.partnerModel.reconciliationKeys.boColumnFilters.forEach((filter: any, index: number) => {
                            console.log(`  - Filtre ${index + 1}:`, filter);
                        });
                    } else {
                        console.log('❌ Aucun filtre BO trouvé dans la requête');
                    }

                    // Lancer la réconciliation
                    this.reconciliationService.reconcile(reconciliationRequest).subscribe({
                        next: (result) => {
                            this.loading = false;
                            console.log('✅ Réconciliation automatique réussie:', result);
                            
                            // Sauvegarder les données traitées dans le service d'état
                            this.appStateService.setReconciliationData(processedBoData, processedPartnerData);
                            
                            // Sauvegarder le résultat de la réconciliation
                            this.appStateService.setReconciliationResults(result);
                            this.appStateService.setCurrentStep(4);
                            
                            // Naviguer directement vers les résultats
                            this.router.navigate(['/results']);
                        },
                        error: (error) => {
                            this.loading = false;
                            console.error('❌ Erreur lors de la réconciliation automatique:', error);
                            this.errorMessage = `Erreur lors de la réconciliation automatique: ${error.message}`;
                        }
                    });
                },
                error: (error: any) => {
                    this.loading = false;
                    console.error('❌ Erreur lors du traitement automatique:', error);
                    this.errorMessage = `Erreur lors du traitement automatique: ${error.message}`;
                }
            });
        }
    }

    // Méthodes pour la sélection de service en mode manuel
    private detectTRXBOForManualMode(data: Record<string, string>[]): boolean {
        if (!data || data.length === 0) return false;
        
        const firstRow = data[0];
        const columns = Object.keys(firstRow);
        
        // Vérifier si c'est un fichier TRXBO (contient une colonne "Service" ou "service")
        const hasServiceColumn = columns.some(col => 
            col.toLowerCase().includes('service') || 
            col.toLowerCase().includes('serv')
        );
        
        if (hasServiceColumn) {
            console.log('🔍 Fichier TRXBO détecté en mode manuel, extraction des services...');
            
            // Trouver la colonne service
            const serviceColumn = columns.find(col => 
                col.toLowerCase().includes('service') || 
                col.toLowerCase().includes('serv')
            );
            
            if (serviceColumn) {
                // Extraire tous les services uniques
                const services = [...new Set(data.map(row => row[serviceColumn]).filter(service => service && service.trim()))];
                this.manualAvailableServices = services.sort();
                this.manualServiceSelectionData = data;
                
                console.log('📋 Services disponibles (mode manuel):', this.manualAvailableServices);
                console.log('📊 Nombre total de lignes (mode manuel):', data.length);
                
                return true;
            }
        }
        
        return false;
    }

    private showManualServiceSelectionStep(): void {
        this.showManualServiceSelection = true;
        this.manualSelectedServices = [...this.manualAvailableServices]; // Sélectionner tous par défaut
    }

    confirmManualServiceSelection(): void {
        if (this.manualSelectedServices.length === 0) {
            this.errorMessage = 'Veuillez sélectionner au moins un service.';
            return;
        }

        console.log('✅ Services sélectionnés (mode manuel):', this.manualSelectedServices);
        
        // Filtrer les données pour ne garder que les lignes des services sélectionnés
        const serviceColumn = Object.keys(this.manualServiceSelectionData[0]).find(col => 
            col.toLowerCase().includes('service') || 
            col.toLowerCase().includes('serv')
        );
        
        if (serviceColumn) {
            const filteredData = this.manualServiceSelectionData.filter(row => 
                this.manualSelectedServices.includes(row[serviceColumn])
            );
            
            console.log('📊 Données filtrées (mode manuel):', filteredData.length, 'lignes sur', this.manualServiceSelectionData.length, 'originales');
            
            // Mettre à jour les données BO avec les données filtrées
            this.boData = filteredData;
            
            // Masquer la sélection des services
            this.showManualServiceSelection = false;
            
            // Continuer avec la réconciliation manuelle
            this.continueWithManualReconciliation();
        }
    }

    cancelManualServiceSelection(): void {
        this.showManualServiceSelection = false;
        this.manualAvailableServices = [];
        this.manualSelectedServices = [];
        this.manualServiceSelectionData = [];
    }

    private continueWithManualReconciliation(): void {
        console.log('✅ Navigation vers la sélection des colonnes après sélection de service...');
        console.log('Données BO filtrées:', this.boData.length, 'lignes');
        console.log('Données Partenaire:', this.partnerData.length, 'lignes');
        
        // Sauvegarder les données dans le service d'état
        this.appStateService.setReconciliationData(this.boData, this.partnerData);
        this.appStateService.setCurrentStep(2);
        
        // Naviguer vers la page de sélection des colonnes
        this.router.navigate(['/column-selection']);
    }

    onManualServiceSelectionChange(event: Event, service: string): void {
        const checkbox = event.target as HTMLInputElement;
        if (checkbox.checked) {
            if (!this.manualSelectedServices.includes(service)) {
                this.manualSelectedServices.push(service);
            }
        } else {
            this.manualSelectedServices = this.manualSelectedServices.filter(s => s !== service);
        }
    }

    getManualServiceCount(service: string): number {
        if (!this.manualServiceSelectionData || this.manualServiceSelectionData.length === 0) return 0;
        
        const serviceColumn = Object.keys(this.manualServiceSelectionData[0]).find(col => 
            col.toLowerCase().includes('service') || 
            col.toLowerCase().includes('serv')
        );
        
        if (serviceColumn) {
            return this.manualServiceSelectionData.filter(row => row[serviceColumn] === service).length;
        }
        
        return 0;
    }

    selectAllManualServices(): void {
        this.manualSelectedServices = [...this.manualAvailableServices];
    }

    deselectAllManualServices(): void {
        this.manualSelectedServices = [];
    }
} 