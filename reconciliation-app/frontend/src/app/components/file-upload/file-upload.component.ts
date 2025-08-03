import { Component, EventEmitter, Output } from '@angular/core';
import { ReconciliationService } from '../../services/reconciliation.service';
import { AutoProcessingService, ProcessingResult } from '../../services/auto-processing.service';
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

            <!-- Mode Manuel -->
            <div class="file-upload-area" *ngIf="reconciliationMode === 'manual'">
                <div class="file-input-container" (click)="boFileInput.click()" [class.has-file]="boFile">
                    <div class="file-icon">🏢</div>
                    <h4>BO (Back Office)</h4>
                    <p>Cliquez pour sélectionner le fichier CSV du BO</p>
                    <input #boFileInput type="file" (change)="onBoFileSelected($event)" accept=".csv, .xls, .xlsx, .xlsm, .xlsb" style="display: none">
                    <div class="file-info" [class.loaded]="boFile">
                        {{ boFile ? boFile.name : 'Aucun fichier sélectionné' }}
                    </div>
                </div>

                <div class="file-input-container" (click)="partnerFileInput.click()" [class.has-file]="partnerFile">
                    <div class="file-icon">🤝</div>
                    <h4>Partenaire</h4>
                    <p>Cliquez pour sélectionner le fichier CSV du partenaire</p>
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
                        <p>Cliquez pour sélectionner le fichier CSV du BO</p>
                        <input #autoBoFileInput type="file" (change)="onAutoBoFileSelected($event)" accept=".csv, .xls, .xlsx, .xlsm, .xlsb" style="display: none">
                        <div class="file-info" [class.loaded]="autoBoFile">
                            {{ autoBoFile ? autoBoFile.name : 'Aucun fichier sélectionné' }}
                        </div>
                    </div>

                    <div class="file-input-container" (click)="autoPartnerFileInput.click()" [class.has-file]="autoPartnerFile">
                        <div class="file-icon">🤝</div>
                        <h4>Partenaire</h4>
                        <p>Cliquez pour sélectionner le fichier CSV du partenaire</p>
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
                <button class="btn proceed-btn" [disabled]="!canProceed()" (click)="onProceed()">
                    Continuer
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
        boData: Record<string, string>[],
        partnerData: Record<string, string>[]
    }>();

    // Mode de réconciliation
    reconciliationMode: 'manual' | 'automatic' = 'manual';

    boFile: File | null = null;
    partnerFile: File | null = null;
    boData: Record<string, string>[] = [];
    partnerData: Record<string, string>[] = [];
    estimatedTime: string = '';

    // Propriétés pour le mode automatique
    autoBoFile: File | null = null;
    autoPartnerFile: File | null = null;
    autoBoData: Record<string, string>[] = [];
    autoPartnerData: Record<string, string>[] = [];
    loading = false;
    errorMessage = '';
    successMessage = '';

    constructor(
        private reconciliationService: ReconciliationService, 
        private autoProcessingService: AutoProcessingService,
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
        const input = event.target as HTMLInputElement;
        if (input.files?.length) {
            this.boFile = input.files[0];
            this.processFileWithAutoProcessing(this.boFile, 'bo');
        }
    }

    onPartnerFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files?.length) {
            this.partnerFile = input.files[0];
            this.processFileWithAutoProcessing(this.partnerFile, 'partner');
        }
    }

    // Nouvelle méthode pour le traitement automatique
    private processFileWithAutoProcessing(file: File, fileType: 'bo' | 'partner'): void {
        console.log(`🔍 Vérification des modèles automatiques pour ${file.name} (${fileType})`);
        
        // Vérifier s'il y a un modèle de traitement automatique
        this.autoProcessingService.processFile(file, fileType).subscribe({
            next: (result: ProcessingResult) => {
                if (result.success) {
                    console.log(`✅ Traitement automatique appliqué pour ${file.name}:`, result);
                    console.log(`📊 Modèle utilisé: ${result.modelId}`);
                    console.log(`⚡ Temps de traitement: ${result.processingTime}ms`);
                    console.log(`📈 Lignes traitées: ${result.processedData.length}`);
                    
                    // Utiliser les données traitées
                    if (fileType === 'bo') {
                        this.boData = result.processedData;
                    } else {
                        this.partnerData = result.processedData;
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
            },
            error: (error) => {
                console.error('❌ Erreur lors du traitement automatique:', error);
                console.log(`🔄 Fallback vers le traitement standard pour ${file.name}`);
                
                // Fallback vers le traitement standard
                this.parseFile(file, fileType === 'bo');
                
                if (this.boFile && this.partnerFile) {
                    this.updateEstimatedTime();
                }
            }
        });
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
        // Ici vous pouvez implémenter l'affichage des résultats
        // Par exemple, ouvrir une modal avec les résultats détaillés
        console.log('📊 Résultats de la réconciliation automatique:');
        console.log('   - Fichier traité:', result.fileName);
        console.log('   - Modèle utilisé:', result.modelId);
        console.log('   - Temps de traitement:', result.processingTime, 'ms');
        console.log('   - Temps de réconciliation:', result.reconciliationTime, 'ms');
        console.log('   - Étapes appliquées:', result.appliedSteps.length);
        console.log('   - Résultat de réconciliation:', result.reconciliationResult);
        
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

    private parseFile(file: File, isBo: boolean): void {
        const fileName = file.name.toLowerCase();
        if (fileName.endsWith('.csv')) {
            this.parseCSV(file, isBo);
        } else if (fileName.endsWith('.xlsx')) {
            this.parseXLSX(file, isBo);
        } else {
            alert('Format de fichier non supporté. Veuillez choisir un fichier .csv ou .xlsx');
        }
    }

    private parseCSV(file: File, isBo: boolean): void {
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
            let text = e.target?.result as string;
            // Nettoyer le BOM éventuel
            if (text.charCodeAt(0) === 0xFEFF) {
                text = text.slice(1);
            }
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
        };
        reader.onerror = (e) => {
            console.error('Erreur lors de la lecture du fichier (FileReader):', e);
        };
        reader.readAsText(file, 'utf-8');
    }

    private parseXLSX(file: File, isBo: boolean): void {
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
            if (isBo) {
                this.boData = jsonData;
            } else {
                this.partnerData = this.convertDebitCreditToNumber(jsonData);
            }
            // Mettre à jour l'estimation seulement si les deux fichiers sont chargés
            if (this.boFile && this.partnerFile) {
                this.updateEstimatedTime();
            }
        };
        reader.onerror = (e) => {
            console.error('Erreur lors de la lecture du fichier (FileReader):', e);
        };
        reader.readAsArrayBuffer(file);
    }

    canProceed(): boolean {
        return this.boData.length > 0 && this.partnerData.length > 0;
    }

    onProceed(): void {
        if (this.canProceed()) {
            console.log('Navigation vers la sélection des colonnes...');
            console.log('Données BO:', this.boData.length, 'lignes');
            console.log('Données Partenaire:', this.partnerData.length, 'lignes');
            
            // Sauvegarder les données dans le service d'état
            this.appStateService.setReconciliationData(this.boData, this.partnerData);
            this.appStateService.setCurrentStep(2);
            
            // Naviguer vers la page de sélection des colonnes
            this.router.navigate(['/column-selection']);
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

    private parseAutoFile(file: File, isBo: boolean): void {
        const fileName = file.name.toLowerCase();
        if (fileName.endsWith('.csv')) {
            this.parseAutoCSV(file, isBo);
        } else if (fileName.endsWith('.xlsx')) {
            this.parseAutoXLSX(file, isBo);
        } else {
            alert('Format de fichier non supporté. Veuillez choisir un fichier .csv ou .xlsx');
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
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
            if (isBo) {
                this.autoBoData = jsonData;
            } else {
                this.autoPartnerData = this.convertDebitCreditToNumber(jsonData);
            }
        };
        reader.onerror = (e) => {
            console.error('Erreur lors de la lecture du fichier (FileReader):', e);
        };
        reader.readAsArrayBuffer(file);
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
                        comparisonColumns: comparisonColumns
                    };

                    console.log('🔄 Lancement de la réconciliation avec les données traitées...');
                    console.log('🔑 Clé BO finale utilisée:', finalBoKeyColumn);
                    console.log('🔑 Clé Partenaire finale utilisée:', finalPartnerKeyColumn);

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
} 