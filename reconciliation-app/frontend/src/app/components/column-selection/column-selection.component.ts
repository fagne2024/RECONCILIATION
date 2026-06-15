import { Component, Input, Output, EventEmitter, OnDestroy, OnChanges, SimpleChanges, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { ColumnComparison } from '../../models/column-comparison.model';
import { AppStateService } from '../../services/app-state.service';
import { ReconciliationService } from '../../services/reconciliation.service';
import { KeySuggestionService, KeySuggestion, KeyAnalysisResult } from '../../services/key-suggestion.service';
import { PopupService } from '../../services/popup.service';
import { Subscription } from 'rxjs';
import { ReconciliationRequest } from '../../models/reconciliation-request.model';

@Component({
    selector: 'app-column-selection',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
        <div class="column-selection-container">
            <h2>📊 Sélection des colonnes</h2>
            <p class="description">Sélectionnez les colonnes clés pour la réconciliation</p>

            <!-- Option pour désactiver l'analyse automatique (seulement en mode assisté) -->
            <div class="section analysis-options-section" *ngIf="!disableAutoAnalysis">
                <h3>⚙️ Options d'analyse</h3>
                <div class="analysis-toggle">
                    <label class="toggle-label">
                        <input type="checkbox" 
                               [(ngModel)]="disableAutoAnalysis" 
                               (ngModelChange)="onAnalysisToggleChange($event)">
                        <span class="toggle-text">Désactiver l'analyse automatique des clés</span>
                    </label>
                    <p class="toggle-description">
                        Si activé, vous devrez sélectionner manuellement toutes les colonnes sans suggestions automatiques
                    </p>
                </div>
            </div>

            <!-- Message pour le mode manuel -->
            <div class="section manual-mode-section" *ngIf="disableAutoAnalysis">
                <h3>🖐️ Mode Manuel</h3>
                <p class="manual-mode-description">
                    Vous êtes en mode manuel. Sélectionnez manuellement les colonnes clés sans analyse automatique.
                </p>
            </div>

            <!-- Suggestions automatiques -->
            <div class="section suggestions-section" *ngIf="showSuggestions && !disableAutoAnalysis">
                <h3>🤖 Suggestions Automatiques</h3>
                <p class="section-description">Le système a analysé vos données et suggère les meilleures clés de réconciliation</p>
                
                <div class="confidence-indicator">
                    <div class="confidence-bar">
                        <div class="confidence-fill" [style.width.%]="overallConfidence * 100"></div>
                    </div>
                    <span class="confidence-text">Confiance globale: {{ (overallConfidence * 100) | number:'1.0-0' }}%</span>
                </div>

                <div class="suggestions-list">
                    <div class="suggestion-item" *ngFor="let suggestion of keySuggestions; let i = index">
                        <div class="suggestion-header">
                            <span class="suggestion-rank">#{{ i + 1 }}</span>
                            <span class="suggestion-confidence">{{ (suggestion.confidence * 100) | number:'1.0-0' }}%</span>
                        </div>
                        <div class="suggestion-pair">
                            <span class="bo-column">{{ suggestion.boColumn }}</span>
                            <span class="arrow">↔</span>
                            <span class="partner-column">{{ suggestion.partnerColumn }}</span>
                        </div>
                        <div class="suggestion-reason">{{ suggestion.reason }}</div>
                        <div class="suggestion-samples" *ngIf="suggestion.sampleValues.length > 0">
                            <small>Exemples: {{ suggestion.sampleValues.join(', ') }}</small>
                        </div>
                    </div>
                </div>

                <div class="auto-apply-section">
                    <button class="auto-apply-btn" (click)="applyTopSuggestions()" 
                            [disabled]="keySuggestions.length === 0">
                        ✅ Appliquer les suggestions automatiquement
                    </button>
                    <p class="auto-apply-note">Les meilleures suggestions seront appliquées automatiquement</p>
                </div>
            </div>

            <!-- Indicateur d'analyse -->
            <div class="section" *ngIf="isAnalyzing">
                <div class="analyzing-indicator">
                    <div class="spinner"></div>
                    <p>🔍 Analyse des données en cours...</p>
                </div>
            </div>

            <!-- Colonnes clés -->
            <div class="section">
                <h3>🔑 Colonnes clés</h3>
                <p class="section-description">Sélectionnez les colonnes qui serviront à identifier les enregistrements correspondants</p>
                
                <div class="key-columns">
                    <div class="column-group">
                        <label>Colonne clé BO</label>
                        <select 
                            [(ngModel)]="selectedBoKeyColumn"
                            (ngModelChange)="onBoKeyColumnChange($event)">
                            <option value="">Sélectionnez une colonne</option>
                            <option *ngFor="let column of boColumns" [ngValue]="column">
                                {{column}}
                            </option>
                        </select>
                    </div>

                    <div class="column-group">
                        <label>Colonne clé Partenaire</label>
                        <select 
                            [(ngModel)]="selectedPartnerKeyColumn"
                            (ngModelChange)="onPartnerKeyColumnChange($event)">
                            <option value="">Sélectionnez une colonne</option>
                            <option *ngFor="let column of partnerColumns" [ngValue]="column">
                                {{column}}
                            </option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Clés supplémentaires -->
            <div class="section" *ngIf="additionalKeys.length > 0">
                <h3>🔑 Clés supplémentaires (optionnel)</h3>
                <p class="section-description">Ajoutez des clés supplémentaires pour une réconciliation plus précise</p>
                
                <div class="additional-keys">
                    <div class="additional-key-pair" *ngFor="let keyPair of additionalKeys; let i = index">
                        <div class="key-columns-wrapper">
                            <div class="column-group">
                                <label>Colonne clé BO</label>
                                <select 
                                    [(ngModel)]="keyPair.boColumn"
                                    (ngModelChange)="onAdditionalBoKeyChange($event, i)">
                                    <option value="">Sélectionnez une colonne</option>
                                    <option *ngFor="let column of boColumns" [ngValue]="column">
                                        {{column}}
                                    </option>
                                </select>
                            </div>

                            <div class="column-group">
                                <label>Colonne clé Partenaire</label>
                                <select 
                                    [(ngModel)]="keyPair.partnerColumn"
                                    (ngModelChange)="onAdditionalPartnerKeyChange($event, i)">
                                    <option value="">Sélectionnez une colonne</option>
                                    <option *ngFor="let column of partnerColumns" [ngValue]="column">
                                        {{column}}
                                    </option>
                                </select>
                            </div>
                        </div>
                        
                        <button class="remove-key-btn" (click)="removeAdditionalKey(i)" title="Supprimer cette clé">
                            🗑️ Supprimer
                        </button>
                    </div>
                </div>

                <button class="add-btn" (click)="addAdditionalKey()">
                    ➕ Ajouter une clé supplémentaire
                </button>
            </div>
            
            <!-- Bouton pour ajouter la première clé supplémentaire -->
            <div class="section" *ngIf="additionalKeys.length === 0">
                <h3>🔑 Clés supplémentaires (optionnel)</h3>
                <p class="section-description">Ajoutez des clés supplémentaires pour une réconciliation plus précise</p>
                <button class="add-btn" (click)="addAdditionalKey()">
                    ➕ Ajouter une clé supplémentaire
                </button>
            </div>

            <!-- Barre de progression -->
            <div class="reconciliation-progress" *ngIf="isReconciliationInProgress">
                <div class="progress-card">
                    <div class="progress-header">
                        <h3>🔄 Réconciliation en cours...</h3>
                        <span class="progress-percentage">{{ reconciliationProgress }}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" [style.width.%]="reconciliationProgress"></div>
                    </div>
                    <div class="progress-status">
                        <span class="status-text">{{ reconciliationStatus }}</span>
                        <span class="status-time" *ngIf="reconciliationStartTime">
                            Temps écoulé : {{ getElapsedTime() }}
                        </span>
                    </div>
                </div>
            </div>

            <!-- Bouton de validation -->
            <div class="validation-section">
                <button 
                    class="validate-btn" 
                    [disabled]="!isValid || isReconciliationInProgress"
                    [class.processing]="isReconciliationInProgress"
                    (click)="proceedWithReconciliation()">
                    <span *ngIf="!isReconciliationInProgress">🚀 Lancer la réconciliation</span>
                    <span *ngIf="isReconciliationInProgress">⏳ Réconciliation en cours...</span>
                </button>
            </div>
        </div>
    `,
    styles: [`
        .column-selection-container {
            padding: 20px;
        }

        h2 {
            color: #2196F3;
            margin-bottom: 10px;
        }

        .description {
            color: #666;
            margin-bottom: 30px;
        }

        .section {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
        }

        h3 {
            color: #1976D2;
            margin-bottom: 10px;
        }

        .section-description {
            color: #666;
            margin-bottom: 20px;
            font-size: 0.9em;
        }

        .key-columns {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }

        .column-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        label {
            color: #333;
            font-weight: 500;
        }

        select {
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: white;
            font-size: 1em;
        }

        .comparison-columns {
            display: flex;
            flex-direction: column;
            gap: 15px;
            margin-bottom: 20px;
        }

        .comparison-row {
            display: grid;
            grid-template-columns: 1fr 1fr auto;
            gap: 15px;
            align-items: end;
        }

        .remove-btn {
            background: none;
            border: none;
            color: #dc3545;
            font-size: 1.2em;
            cursor: pointer;
            padding: 10px;
            line-height: 1;
        }

        .add-btn {
            background: #e3f2fd;
            border: 1px solid #2196F3;
            color: #2196F3;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 1em;
            transition: all 0.3s ease;
        }

        .add-btn:hover {
            background: #2196F3;
            color: white;
        }

        /* Styles pour les clés supplémentaires */
        .additional-keys {
            display: flex;
            flex-direction: column;
            gap: 20px;
            margin-bottom: 20px;
        }

        .additional-key-pair {
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding: 15px;
            background: white;
            border-radius: 8px;
            border: 1px solid #e0e0e0;
        }

        .key-columns-wrapper {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }

        .remove-key-btn {
            background: #fff3f3;
            border: 1px solid #dc3545;
            color: #dc3545;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.9em;
            transition: all 0.3s ease;
            align-self: flex-start;
        }

        .remove-key-btn:hover {
            background: #dc3545;
            color: white;
        }

        /* Styles pour les suggestions automatiques */
        .suggestions-section {
            background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
            border: 2px solid #2196F3;
        }

        .confidence-indicator {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 20px;
            padding: 15px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .confidence-bar {
            flex: 1;
            height: 20px;
            background: #e0e0e0;
            border-radius: 10px;
            overflow: hidden;
        }

        .confidence-fill {
            height: 100%;
            background: linear-gradient(90deg, #4CAF50, #8BC34A);
            transition: width 0.5s ease;
        }

        .confidence-text {
            font-weight: bold;
            color: #1976D2;
            min-width: 150px;
        }

        .suggestions-list {
            display: flex;
            flex-direction: column;
            gap: 15px;
            margin-bottom: 20px;
        }

        .suggestion-item {
            background: white;
            border-radius: 8px;
            padding: 15px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            border-left: 4px solid #2196F3;
        }

        .suggestion-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }

        .suggestion-rank {
            background: #2196F3;
            color: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.8em;
            font-weight: bold;
        }

        .suggestion-confidence {
            font-weight: bold;
            color: #2196f3;
            font-size: 14px;
            margin-left: 10px;
        }

        .confidence-display {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .confidence-bar-small {
            width: 60px;
            height: 8px;
            background: #e0e0e0;
            border-radius: 4px;
            overflow: hidden;
        }

        .confidence-fill-small {
            height: 100%;
            background: linear-gradient(90deg, #ff6b6b, #ffa726, #66bb6a);
            border-radius: 4px;
            transition: width 0.3s ease;
        }

        .suggestion-transformation {
            margin: 8px 0;
        }

        .transformation-badge {
            background: linear-gradient(135deg, #ff9800, #ff5722);
            color: white;
            padding: 6px 12px;
            border-radius: 15px;
            font-size: 0.85em;
            font-weight: 500;
            display: inline-block;
            box-shadow: 0 2px 4px rgba(255, 152, 0, 0.3);
        }

        .suggestion-pair {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 8px;
            font-weight: 500;
        }

        .bo-column {
            background: #e3f2fd;
            padding: 4px 8px;
            border-radius: 4px;
            color: #1976D2;
        }

        .arrow {
            color: #666;
            font-size: 1.2em;
        }

        .partner-column {
            background: #f3e5f5;
            padding: 4px 8px;
            border-radius: 4px;
            color: #7B1FA2;
        }

        .suggestion-reason {
            color: #666;
            font-size: 0.9em;
            margin-bottom: 5px;
        }

        .suggestion-samples {
            color: #999;
            font-size: 0.8em;
        }

        .auto-apply-section {
            text-align: center;
            padding: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .auto-apply-btn {
            background: linear-gradient(135deg, #4CAF50, #8BC34A);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-size: 1em;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-bottom: 10px;
        }

        .auto-apply-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }

        .auto-apply-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
        }

        .auto-apply-note {
            color: #666;
            font-size: 0.9em;
        }

        .analyzing-indicator {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
            padding: 30px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .spinner {
            width: 30px;
            height: 30px;
            border: 3px solid #e0e0e0;
            border-top: 3px solid #2196F3;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .validation-section {
            text-align: center;
            margin-top: 30px;
        }

        .validate-btn {
            background: linear-gradient(45deg, #2196F3, #1976D2);
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 8px;
            font-size: 1.1em;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .validate-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
        }

        .validate-btn:not(:disabled):hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(33, 150, 243, 0.3);
        }

        .validate-btn.processing {
            opacity: 0.7;
            cursor: progress;
        }

        .reconciliation-progress {
            margin: 20px 0;
        }

        .progress-card {
            background: linear-gradient(135deg, #f8fff5 0%, #e8f5e9 100%);
            border: 2px solid #28a745;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(40, 167, 69, 0.15);
        }

        .progress-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }

        .progress-percentage {
            font-weight: bold;
            font-size: 1.4em;
            color: #1b5e20;
        }

        .progress-bar {
            width: 100%;
            height: 20px;
            background: #e9ecef;
            border-radius: 10px;
            overflow: hidden;
            margin-bottom: 12px;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #28a745, #20c997);
            border-radius: 10px;
            transition: width 0.3s ease;
        }

        .progress-status {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.95em;
            color: #2e7d32;
        }

        .status-text {
            font-weight: 500;
        }

        .status-time {
            font-style: italic;
        }

        /* Styles pour les options d'analyse */
        .analysis-options-section {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border: 2px solid #6c757d;
        }

        .analysis-toggle {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .toggle-label {
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
            font-weight: 500;
            color: #495057;
        }

        .toggle-label input[type="checkbox"] {
            width: 18px;
            height: 18px;
            cursor: pointer;
        }

        .toggle-text {
            font-size: 1em;
            color: #495057;
        }

        .toggle-description {
            color: #6c757d;
            font-size: 0.9em;
            margin: 0;
            padding-left: 28px;
        }

        /* Styles pour le mode manuel */
        .manual-mode-section {
            background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
            border: 2px solid #ffc107;
        }

        .manual-mode-description {
            color: #856404;
            font-size: 1em;
            margin: 0;
            padding: 15px;
            background: rgba(255, 255, 255, 0.7);
            border-radius: 6px;
            border-left: 4px solid #ffc107;
        }
    `]
})
export class ColumnSelectionComponent implements OnDestroy, OnChanges, OnInit {
    @Input() boData: Record<string, string>[] = [];
    @Input() partnerData: Record<string, string>[] = [];
    @Input() disableAutoAnalysis: boolean = false; // Nouvelle propriété pour désactiver l'analyse automatique
    @Output() selectionComplete = new EventEmitter<{
        boKeyColumn: string;
        partnerKeyColumn: string;
        comparisonColumns: { boColumn: string, partnerColumn: string }[];
        additionalKeys: { boColumn: string, partnerColumn: string }[];
    }>();

    boColumns: string[] = [];
    partnerColumns: string[] = [];
    selectedBoKeyColumn: string = '';
    selectedPartnerKeyColumn: string = '';

    additionalKeys: { boColumn: string, partnerColumn: string }[] = [];
    comparisonColumns: { boColumn: string, partnerColumn: string }[] = [];
    isValid: boolean = false;
    private subscription: Subscription = new Subscription();

    // Variables pour la réconciliation
    isReconciliationInProgress: boolean = false;
    reconciliationProgress: number = 0;
    reconciliationStatus: string = '';
    reconciliationStartTime: number | null = null;

    // Optimisations pour gros volumes de données
    private compressedBoData: any[] = [];
    private compressedPartnerData: any[] = [];
    private dataLoaded = false;
    private loadingInProgress = false;
    private readonly CHUNK_SIZE = 1000; // Traiter par chunks de 1000 lignes
    private readonly SAMPLE_SIZE = 1000; // Échantillon pour l'analyse des clés

    // Propriétés pour les suggestions de clés
    keySuggestions: KeySuggestion[] = [];
    overallConfidence = 0;
    recommendedKeys: string[] = [];
    showSuggestions = false;
    isAnalyzing = false;

    constructor(
        private reconciliationService: ReconciliationService,
        private appStateService: AppStateService,
        private keySuggestionService: KeySuggestionService,
        private router: Router,
        private cdr: ChangeDetectorRef,
        private popupService: PopupService
    ) {}

    ngOnChanges(changes: SimpleChanges) {
        console.log('Input data changed:', changes);
        if (changes['boData'] || changes['partnerData']) {
            this.initializeColumns();
        }
    }

    ngOnDestroy() {
        console.log('ColumnSelectionComponent destroyed');
        this.subscription.unsubscribe();
    }

    ngOnInit() {
        console.log('🔍 DEBUG - ColumnSelectionComponent initialized');
        
        // Détecter automatiquement le mode manuel depuis l'URL
        const urlParams = new URLSearchParams(window.location.search);
        const mode = urlParams.get('mode');
        
        // Si on est en mode manuel (pas de paramètre mode ou mode = 'manual'), désactiver l'analyse automatique
        if (!mode || mode === 'manual') {
            console.log('🚫 Mode manuel détecté - désactivation de l\'analyse automatique');
            this.disableAutoAnalysis = true;
        } else {
            console.log('🤖 Mode assisté détecté - activation de l\'analyse automatique');
            this.disableAutoAnalysis = false;
        }
        
        // Suivre la progression temps réel de la réconciliation
        this.subscription.add(
            this.reconciliationService.progress$.subscribe(progress => {
                if (!progress) {
                    return;
                }

                this.reconciliationProgress = Math.round(progress.percentage || 0);

                if (progress.step) {
                    this.reconciliationStatus = progress.step;
                }

                this.cdr.detectChanges();
            })
        );

        this.loadDataFromService();
    }

    /**
     * Charge les données depuis le service avec optimisation
     */
    private loadDataFromService(): void {
        console.log('🔍 DEBUG - Chargement des données depuis le service...');
        
        // Récupérer les données directement depuis le service
        this.boData = this.appStateService.getBoData();
        this.partnerData = this.appStateService.getPartnerData();
        
        console.log('🔍 DEBUG - Données récupérées depuis le service:', {
            boDataLength: this.boData?.length || 0,
            partnerDataLength: this.partnerData?.length || 0,
            boDataSample: this.boData?.slice(0, 2),
            partnerDataSample: this.partnerData?.slice(0, 2)
        });
        
        // Permettre de charger les colonnes même si un seul fichier est disponible
        if ((this.boData?.length > 0 || this.partnerData?.length > 0)) {
            if (this.boData?.length > 0 && this.partnerData?.length > 0) {
                console.log('✅ Données complètes trouvées, optimisation en cours...');
                this.optimizeAndLoadData(this.boData, this.partnerData);
            } else {
                console.log('⚠️ Données partielles trouvées, chargement des colonnes disponibles...');
                // Charger au moins les colonnes disponibles même si un fichier manque
                this.loadAvailableColumns();
            }
        } else {
            console.log('⚠️ Aucune donnée trouvée, tentative de parsing automatique...');
            this.tryAutoParseFiles();
        }
    }
    
    /**
     * Charge les colonnes disponibles même si un seul fichier est disponible
     */
    private loadAvailableColumns(): void {
        console.log('📊 Chargement des colonnes disponibles...');
        
        // Extraire les colonnes disponibles
        if (this.boData?.length > 0) {
            this.boColumns = Object.keys(this.boData[0]);
            console.log('📋 Colonnes BO disponibles:', this.boColumns);
        } else {
            this.boColumns = [];
            console.log('⚠️ Aucune colonne BO disponible');
        }
        
        if (this.partnerData?.length > 0) {
            this.partnerColumns = Object.keys(this.partnerData[0]);
            console.log('📋 Colonnes Partenaire disponibles:', this.partnerColumns);
        } else {
            this.partnerColumns = [];
            console.log('⚠️ Aucune colonne Partenaire disponible');
        }
        
        // Si on a au moins un fichier avec des colonnes, on peut continuer
        if (this.boColumns.length > 0 || this.partnerColumns.length > 0) {
            console.log('✅ Colonnes chargées avec succès');
            // Ne pas lancer l'analyse automatique si les deux fichiers ne sont pas disponibles
            if (this.boData?.length === 0 || this.partnerData?.length === 0) {
                console.log('⚠️ Fichier(s) manquant(s), désactivation de l\'analyse automatique');
                this.disableAutoAnalysis = true;
            }
        } else {
            console.error('❌ Aucune colonne disponible, redirection vers l\'upload');
            this.router.navigate(['/upload']);
        }
    }

    /**
     * Tente de parser automatiquement les fichiers uploadés
     */
    private async tryAutoParseFiles(): Promise<void> {
        console.log('🔄 Tentative de parsing automatique des fichiers...');
        
        // Récupérer les fichiers uploadés
        const uploadedFiles = this.appStateService.getUploadedFiles();
        
        if (!uploadedFiles.boFile || !uploadedFiles.partnerFile) {
            console.warn('❌ Aucun fichier disponible pour le parsing automatique');
            this.router.navigate(['/upload']);
            return;
        }
        
        try {
            console.log('📁 Fichiers trouvés, début du parsing automatique...');
            
            // Parser les fichiers CSV
            const boData = await this.parseCsvFile(uploadedFiles.boFile);
            const partnerData = await this.parseCsvFile(uploadedFiles.partnerFile);
            
            // Sauvegarder les données parsées dans le service
            this.appStateService.setBoData(boData);
            this.appStateService.setPartnerData(partnerData);
            
            console.log('✅ Parsing automatique réussi:', {
                boRecords: boData.length,
                partnerRecords: partnerData.length
            });
            
            // Charger les données parsées
            this.boData = boData;
            this.partnerData = partnerData;
            this.optimizeAndLoadData(boData, partnerData);
            
        } catch (error) {
            console.error('❌ Erreur lors du parsing automatique:', error);
            this.router.navigate(['/upload']);
        }
    }

    /**
     * Parse un fichier CSV
     */
    private parseCsvFile(file: File): Promise<Record<string, string>[]> {
        return new Promise((resolve, reject) => {
            console.log(`📖 Début de la lecture du fichier: ${file.name} (${file.size} bytes)`);
            
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const content = e.target?.result as string;
                    console.log(`📄 Contenu du fichier ${file.name}: ${content.length} caractères`);
                    
                    const lines = content.split('\n');
                    console.log(`📋 Nombre de lignes dans ${file.name}: ${lines.length}`);
                    
                    if (lines.length < 2) {
                        reject(new Error('Fichier CSV invalide: au moins 2 lignes requises (en-tête + données)'));
                        return;
                    }
                    
                    // Détecter le séparateur (virgule ou point-virgule)
                    const firstLine = lines[0];
                    const commaCount = (firstLine.match(/,/g) || []).length;
                    const semicolonCount = (firstLine.match(/;/g) || []).length;
                    const separator = semicolonCount > commaCount ? ';' : ',';
                    
                    console.log(`🔧 Séparateur détecté pour ${file.name}: "${separator}" (virgules: ${commaCount}, points-virgules: ${semicolonCount})`);
                    
                    // Parser l'en-tête
                    const headers = lines[0].split(separator).map(h => h.trim());
                    console.log(`🏷️ En-têtes trouvées dans ${file.name}:`, headers);
                    
                    const data: Record<string, string>[] = [];
                    
                    // Parser les données (limitées à 10000 lignes pour l'analyse des clés)
                    const maxLines = Math.min(lines.length - 1, 10000);
                    console.log(`📊 Parsing de ${maxLines} lignes de données dans ${file.name}`);
                    
                    for (let i = 1; i <= maxLines; i++) {
                        if (lines[i].trim().length === 0) continue;
                        
                        const values = lines[i].split(separator).map(v => v.trim());
                        const row: Record<string, string> = {};
                        
                        for (let j = 0; j < Math.min(headers.length, values.length); j++) {
                            row[headers[j]] = values[j];
                        }
                        
                        data.push(row);
                    }
                    
                    console.log(`✅ Fichier ${file.name} parsé avec succès: ${data.length} enregistrements`);
                    if (data.length > 0) {
                        console.log(`📊 Exemple de données:`, data[0]);
                    }
                    resolve(data);
                    
                } catch (error) {
                    console.error(`❌ Erreur lors du parsing du fichier ${file.name}:`, error);
                    reject(new Error(`Erreur lors du parsing du fichier ${file.name}: ${error}`));
                }
            };
            
            reader.onerror = (error) => {
                console.error(`❌ Erreur lors de la lecture du fichier ${file.name}:`, error);
                reject(new Error(`Erreur lors de la lecture du fichier ${file.name}`));
            };
            
            reader.readAsText(file, 'UTF-8');
        });
    }

    /**
     * Optimise et charge les données par chunks
     */
    private optimizeAndLoadData(boData: any[], partnerData: any[]): void {
        if (this.loadingInProgress) return;
        
        this.loadingInProgress = true;
        console.log('🚀 Début de l\'optimisation des données...');
        
        // Traiter les données par chunks pour éviter le blocage
        setTimeout(() => {
            this.processDataInChunks(boData, partnerData);
        }, 10);
    }

    /**
     * Traite les données par chunks
     */
    private processDataInChunks(boData: any[], partnerData: any[]): void {
        const totalBoRows = boData.length;
        const totalPartnerRows = partnerData.length;
        
        console.log(`📊 Traitement de ${totalBoRows} lignes BO et ${totalPartnerRows} lignes Partner`);
        
        // Utiliser un échantillon pour l'initialisation rapide
        const boSample = this.getDataSample(boData, this.SAMPLE_SIZE);
        const partnerSample = this.getDataSample(partnerData, this.SAMPLE_SIZE);
        
        // Initialiser les colonnes avec l'échantillon
        this.initializeColumnsWithSample(boSample, partnerSample);
        
        // Traiter le reste des données en arrière-plan
        this.processRemainingData(boData, partnerData);
    }

    /**
     * Obtient un échantillon des données
     */
    private getDataSample(data: any[], sampleSize: number): any[] {
        if (data.length <= sampleSize) return data;
        
        const step = Math.floor(data.length / sampleSize);
        const sample: any[] = [];
        
        for (let i = 0; i < sampleSize; i++) {
            sample.push(data[i * step]);
        }
        
        return sample;
    }

    /**
     * Initialise les colonnes avec un échantillon
     */
    private initializeColumnsWithSample(boSample: any[], partnerSample: any[]): void {
        console.log('🔧 DEBUG - Initializing columns with sample data');
        
        if (boSample.length > 0) {
            this.boColumns = Object.keys(boSample[0]);
            console.log('✅ BO columns initialized from sample:', this.boColumns);
        }
        
        if (partnerSample.length > 0) {
            this.partnerColumns = Object.keys(partnerSample[0]);
            console.log('✅ Partner columns initialized from sample:', this.partnerColumns);
        }
        
        this.dataLoaded = true;
        this.loadingInProgress = false;
        
        // Analyser et suggérer les clés automatiquement (seulement si pas désactivée)
        this.launchKeyAnalysis();
        
        this.cdr.detectChanges();
    }

    /**
     * Analyse les données et suggère les meilleures clés
     */
    private analyzeAndSuggestKeys(): void {
        if (!this.boData || !this.partnerData || this.boData.length === 0 || this.partnerData.length === 0) {
            console.warn('⚠️ Données insuffisantes pour l\'analyse des clés');
            return;
        }

        console.log('🔍 Début de l\'analyse des clés de réconciliation...');
        this.isAnalyzing = true;
        this.showSuggestions = false;
        
        // Utiliser un timeout pour éviter de bloquer l'interface
        setTimeout(() => {
            try {
                // Vérifications supplémentaires
                if (!Array.isArray(this.boData) || !Array.isArray(this.partnerData)) {
                    throw new Error('Les données ne sont pas des tableaux valides');
                }
                
                if (this.boData.length === 0 || this.partnerData.length === 0) {
                    throw new Error('Les données sont vides');
                }
                
                // Vérifier que les premières lignes ont des propriétés
                if (!this.boData[0] || typeof this.boData[0] !== 'object') {
                    throw new Error('La première ligne BO n\'est pas un objet valide');
                }
                
                if (!this.partnerData[0] || typeof this.partnerData[0] !== 'object') {
                    throw new Error('La première ligne Partner n\'est pas un objet valide');
                }
                
                console.log('🔍 Données validées, lancement de l\'analyse...');
                const result = this.keySuggestionService.analyzeAndSuggestKeys(this.boData, this.partnerData);
                
                this.keySuggestions = result.suggestions;
                this.overallConfidence = result.overallConfidence;
                this.recommendedKeys = result.recommendedKeys;
                this.showSuggestions = true;
                
                console.log('✅ Analyse des clés terminée:', {
                    suggestionsCount: this.keySuggestions.length,
                    overallConfidence: this.overallConfidence,
                    recommendedKeys: this.recommendedKeys
                });
                
                // Appliquer automatiquement les meilleures suggestions
                this.applyTopSuggestions();
                
            } catch (error) {
                console.error('❌ Erreur lors de l\'analyse des clés:', error);
                this.showSuggestions = false;
                this.keySuggestions = [];
                this.overallConfidence = 0;
            } finally {
                this.isAnalyzing = false;
                this.cdr.detectChanges();
            }
        }, 100);
    }

    /**
     * Gère le changement de l'option d'analyse automatique
     */
    onAnalysisToggleChange(disabled: boolean): void {
        console.log('🔄 Option d\'analyse automatique changée:', disabled ? 'désactivée' : 'activée');
        
        if (disabled) {
            // Désactiver les suggestions automatiques
            this.showSuggestions = false;
            this.keySuggestions = [];
            this.overallConfidence = 0;
            console.log('🚫 Analyse automatique désactivée - mode manuel uniquement');
        } else {
            // Relancer l'analyse automatique
            console.log('🔄 Relance de l\'analyse automatique...');
            this.launchKeyAnalysis();
        }
        
        this.cdr.detectChanges();
    }

    /**
     * Lance l'analyse automatique des clés (seulement si pas désactivée)
     */
    private launchKeyAnalysis(): void {
        // Vérifier si l'analyse automatique est désactivée
        if (this.disableAutoAnalysis) {
            console.log('🚫 Analyse automatique des clés désactivée - mode manuel uniquement');
            this.showSuggestions = false;
            this.isAnalyzing = false;
            return;
        }

        console.log('🔍 Lancement de l\'analyse automatique des clés...');
        this.isAnalyzing = true;
        this.cdr.detectChanges();

        // Délai pour permettre l'affichage de l'indicateur de chargement
        setTimeout(() => {
            try {
                // Vérifications de sécurité
                if (!this.boData || this.boData.length === 0) {
                    throw new Error('Données BO manquantes ou vides');
                }
                
                if (!this.partnerData || this.partnerData.length === 0) {
                    throw new Error('Données Partner manquantes ou vides');
                }
                
                // Vérifier que les premières lignes ont des propriétés
                if (!this.boData[0] || typeof this.boData[0] !== 'object') {
                    throw new Error('La première ligne BO n\'est pas un objet valide');
                }
                
                if (!this.partnerData[0] || typeof this.partnerData[0] !== 'object') {
                    throw new Error('La première ligne Partner n\'est pas un objet valide');
                }
                
                console.log('🔍 Données validées, lancement de l\'analyse...');
                const result = this.keySuggestionService.analyzeAndSuggestKeys(this.boData, this.partnerData);
                
                this.keySuggestions = result.suggestions;
                this.overallConfidence = result.overallConfidence;
                this.recommendedKeys = result.recommendedKeys;
                this.showSuggestions = true;
                
                console.log('✅ Analyse des clés terminée:', {
                    suggestionsCount: this.keySuggestions.length,
                    overallConfidence: this.overallConfidence,
                    recommendedKeys: this.recommendedKeys
                });
                
                // Appliquer automatiquement les meilleures suggestions
                this.applyTopSuggestions();
                
            } catch (error) {
                console.error('❌ Erreur lors de l\'analyse des clés:', error);
                this.showSuggestions = false;
                this.keySuggestions = [];
                this.overallConfidence = 0;
            } finally {
                this.isAnalyzing = false;
                this.cdr.detectChanges();
            }
        }, 100);
    }

    /**
     * Applique automatiquement les meilleures suggestions (clés principales uniquement)
     */
    applyTopSuggestions(): void {
        if (this.keySuggestions.length === 0) return;
        
        // Appliquer la première suggestion comme clé principale
        const topSuggestion = this.keySuggestions[0];
        if (topSuggestion.confidence > 0.7) {
            this.selectedBoKeyColumn = topSuggestion.boColumn;
            this.selectedPartnerKeyColumn = topSuggestion.partnerColumn;
            console.log('✅ Clé principale appliquée automatiquement:', {
                boColumn: topSuggestion.boColumn,
                partnerColumn: topSuggestion.partnerColumn,
                confidence: topSuggestion.confidence
            });
        }
        
        // Ne pas appliquer de clés supplémentaires
        this.additionalKeys = [];
        console.log('✅ Aucune clé supplémentaire appliquée (mode clés principales uniquement)');
    }

    /**
     * Traite les données restantes en arrière-plan
     */
    private processRemainingData(boData: any[], partnerData: any[]): void {
        // Compresser les données en arrière-plan
        setTimeout(() => {
            this.compressData(boData, partnerData);
        }, 100);
    }

    /**
     * Compresse les données pour économiser la mémoire
     */
    private compressData(boData: any[], partnerData: any[]): void {
        console.log('🗜️ Compression des données en cours...');
        
        // Compresser les données BO
        this.compressedBoData = this.compressDataset(boData);
        console.log(`✅ Données BO compressées: ${boData.length} → ${this.compressedBoData.length} lignes`);
        
        // Compresser les données Partner
        this.compressedPartnerData = this.compressDataset(partnerData);
        console.log(`✅ Données Partner compressées: ${partnerData.length} → ${this.compressedPartnerData.length} lignes`);
        
        console.log('🎯 Optimisation terminée !');
    }

    /**
     * Compresse un dataset en supprimant les doublons et valeurs vides
     */
    private compressDataset(data: any[]): any[] {
        if (data.length === 0) return data;
        
        const compressed: any[] = [];
        const seen = new Set();
        
        for (const row of data) {
            // Créer une clé unique pour détecter les doublons
            const key = JSON.stringify(row);
            
            if (!seen.has(key)) {
                seen.add(key);
                
                // Supprimer les valeurs vides pour économiser l'espace
                const cleanRow: any = {};
                Object.keys(row).forEach(col => {
                    if (row[col] !== null && row[col] !== undefined && row[col] !== '') {
                        cleanRow[col] = row[col];
                    }
                });
                
                compressed.push(cleanRow);
            }
        }
        
        return compressed;
    }

    private initializeColumns() {
        console.log('🔧 DEBUG - Initializing columns with data:', {
            boDataLength: this.boData.length,
            partnerDataLength: this.partnerData.length,
            boDataFirstRow: this.boData[0],
            partnerDataFirstRow: this.partnerData[0]
        });

        if (this.boData.length > 0) {
            this.boColumns = Object.keys(this.boData[0]);
            console.log('✅ BO columns initialized:', this.boColumns);
        } else {
            console.warn('❌ Pas de données BO disponibles');
        }
        
        if (this.partnerData.length > 0) {
            this.partnerColumns = Object.keys(this.partnerData[0]);
            console.log('✅ Partner columns initialized:', this.partnerColumns);
        } else {
            console.warn('❌ Pas de données Partner disponibles');
        }
        
        console.log('🔧 DEBUG - État final des colonnes:', {
            boColumns: this.boColumns,
            partnerColumns: this.partnerColumns,
            boColumnsLength: this.boColumns.length,
            partnerColumnsLength: this.partnerColumns.length
        });
    }

    onBoKeyColumnChange(value: string) {
        console.log('🔧 DEBUG - BO key column changed:', value);
        console.log('🔧 DEBUG - État avant changement:', {
            selectedBoKeyColumn: this.selectedBoKeyColumn,
            boColumns: this.boColumns,
            boDataLength: this.boData.length
        });
        
        this.selectedBoKeyColumn = value;
        this.isValid = this.validateSelection();
        
        console.log('🔧 DEBUG - État après changement:', {
            selectedBoKeyColumn: this.selectedBoKeyColumn,
            isValid: this.isValid
        });
        
        // Afficher quelques exemples de valeurs pour aider au debug
        if (value && this.boData.length > 0) {
            const sampleValues = this.boData.slice(0, 5).map(row => row[value]).filter(val => val !== undefined && val !== null);
            console.log(`🔍 Exemples de valeurs pour la colonne BO "${value}":`, sampleValues);
        }
    }

    onPartnerKeyColumnChange(value: string) {
        console.log('Partner key column changed:', value);
        this.selectedPartnerKeyColumn = value;
        this.isValid = this.validateSelection();
        
        // Afficher quelques exemples de valeurs pour aider au debug
        if (value && this.partnerData.length > 0) {
            const sampleValues = this.partnerData.slice(0, 5).map(row => row[value]).filter(val => val !== undefined && val !== null);
            console.log(`🔍 Exemples de valeurs pour la colonne Partner "${value}":`, sampleValues);
        }
    }

    onBoComparisonColumnChange(value: string, index: number) {
        console.log('BO comparison column changed:', value, 'at index:', index);
        this.comparisonColumns[index].boColumn = value;
        this.isValid = this.validateSelection();
    }

    onPartnerComparisonColumnChange(value: string, index: number) {
        console.log('Partner comparison column changed:', value, 'at index:', index);
        this.comparisonColumns[index].partnerColumn = value;
        this.isValid = this.validateSelection();
    }

    addComparisonColumn() {
        console.log('Adding new comparison column');
        this.comparisonColumns.push({ boColumn: '', partnerColumn: '' });
        this.isValid = this.validateSelection();
    }

    removeComparisonColumn(index: number) {
        console.log('Removing comparison column at index:', index);
        this.comparisonColumns.splice(index, 1);
        this.isValid = this.validateSelection();
    }

    addAdditionalKey() {
        console.log('Adding new additional key');
        this.additionalKeys.push({ boColumn: '', partnerColumn: '' });
        this.isValid = this.validateSelection();
    }

    removeAdditionalKey(index: number) {
        console.log('Removing additional key at index:', index);
        this.additionalKeys.splice(index, 1);
        this.isValid = this.validateSelection();
    }

    onAdditionalBoKeyChange(value: string, index: number) {
        console.log('Additional BO key changed:', value, 'at index:', index);
        this.additionalKeys[index].boColumn = value;
        this.isValid = this.validateSelection();
    }

    onAdditionalPartnerKeyChange(value: string, index: number) {
        console.log('Additional Partner key changed:', value, 'at index:', index);
        this.additionalKeys[index].partnerColumn = value;
        this.isValid = this.validateSelection();
    }

    validateSelection(): boolean {
        const hasBoKey = Boolean(this.selectedBoKeyColumn && this.selectedBoKeyColumn.trim() !== '');
        const hasPartnerKey = Boolean(this.selectedPartnerKeyColumn && this.selectedPartnerKeyColumn.trim() !== '');
        
        // Les colonnes de comparaison sont optionnelles - on vérifie seulement celles qui sont remplies
        const hasValidComparisonColumns = this.comparisonColumns.every(col => 
            !col.boColumn || !col.partnerColumn || // Si vide, c'est OK
            (Boolean(col.boColumn && col.boColumn.trim() !== '' && 
            col.partnerColumn && col.partnerColumn.trim() !== ''))
        );
        
        // Les clés supplémentaires sont optionnelles - on vérifie seulement celles qui sont remplies
        const hasValidAdditionalKeys = this.additionalKeys.every(key => 
            !key.boColumn || !key.partnerColumn || // Si vide, c'est OK
            (Boolean(key.boColumn && key.boColumn.trim() !== '' && 
            key.partnerColumn && key.partnerColumn.trim() !== ''))
        );
        
        // Seules les colonnes clés principales sont obligatoires
        this.isValid = hasBoKey && hasPartnerKey && hasValidComparisonColumns && hasValidAdditionalKeys;
        
        console.log('🔍 Validation de la sélection:', {
            hasBoKey,
            hasPartnerKey,
            hasValidComparisonColumns,
            hasValidAdditionalKeys,
            selectedBoKeyColumn: this.selectedBoKeyColumn,
            selectedPartnerKeyColumn: this.selectedPartnerKeyColumn,
            comparisonColumns: this.comparisonColumns,
            additionalKeys: this.additionalKeys,
            isValid: this.isValid
        });
        
        return this.isValid;
    }

    /**
     * Optimisé pour les gros volumes de données
     */
    logKeyStatistics() {
        if (!this.selectedBoKeyColumn || !this.selectedPartnerKeyColumn) {
            console.log('❌ Colonnes clés non sélectionnées');
            return;
        }

        console.log('📊 Analyse des statistiques des clés...');
        
        // Utiliser les données compressées si disponibles
        const boDataToAnalyze = this.compressedBoData.length > 0 ? this.compressedBoData : this.boData;
        const partnerDataToAnalyze = this.compressedPartnerData.length > 0 ? this.compressedPartnerData : this.partnerData;
        
        // Analyser par échantillons pour les gros volumes
        const boSample = this.getDataSample(boDataToAnalyze, 1000);
        const partnerSample = this.getDataSample(partnerDataToAnalyze, 1000);
        
        const boValues = boSample.map(row => row[this.selectedBoKeyColumn]).filter(val => val !== null && val !== undefined);
        const partnerValues = partnerSample.map(row => row[this.selectedPartnerKeyColumn]).filter(val => val !== null && val !== undefined);
        
        const boUnique = new Set(boValues);
        const partnerUnique = new Set(partnerValues);
        
        console.log('📈 Statistiques des clés:', {
            boColumn: this.selectedBoKeyColumn,
            partnerColumn: this.selectedPartnerKeyColumn,
            boTotalValues: boValues.length,
            boUniqueValues: boUnique.size,
            partnerTotalValues: partnerValues.length,
            partnerUniqueValues: partnerUnique.size,
            boDuplicates: boValues.length - boUnique.size,
            partnerDuplicates: partnerValues.length - partnerUnique.size
        });
        
        // Analyser les correspondances potentielles
        const commonValues = [...boUnique].filter(value => partnerUnique.has(value));
        console.log('🔗 Correspondances potentielles:', {
            commonValuesCount: commonValues.length,
            commonValuesSample: commonValues.slice(0, 10)
        });
    }

    proceedWithReconciliation() {
        if (!this.validateSelection()) {
            console.error('❌ Sélection invalide, impossible de procéder');
            return;
        }

        console.log('🚀 Début de la réconciliation optimisée...');
        
        // Utiliser les données compressées si disponibles
        let boDataToReconcile = this.compressedBoData.length > 0 ? this.compressedBoData : this.boData;
        const partnerDataToReconcile = this.compressedPartnerData.length > 0 ? this.compressedPartnerData : this.partnerData;
        
        // Appliquer la transformation détectée si elle existe pour la paire de clés sélectionnée
        const selectedSuggestion = this.keySuggestions?.find(s => 
            s.boColumn === this.selectedBoKeyColumn && 
            s.partnerColumn === this.selectedPartnerKeyColumn
        );
        
        if (selectedSuggestion?.transformation) {
            console.log('🔧 Application de la transformation détectée:', selectedSuggestion.transformation.description);
            
            // Créer une copie des données BO avec la transformation appliquée
            boDataToReconcile = boDataToReconcile.map(row => {
                const transformedRow = { ...row };
                const originalValue = transformedRow[this.selectedBoKeyColumn];
                
                if (originalValue && typeof originalValue === 'string') {
                    let transformedValue = originalValue;
                    
                    // Appliquer la transformation selon le type
                    switch (selectedSuggestion.transformation.type) {
                        case 'remove_suffix':
                            const suffix = selectedSuggestion.transformation.pattern;
                            if (originalValue.endsWith(suffix)) {
                                transformedValue = originalValue.slice(0, -suffix.length);
                            }
                            break;
                        case 'remove_prefix':
                            const prefix = selectedSuggestion.transformation.pattern;
                            if (originalValue.startsWith(prefix)) {
                                transformedValue = originalValue.slice(prefix.length);
                            }
                            break;
                        case 'remove_pattern':
                            const pattern = new RegExp(selectedSuggestion.transformation.pattern + '$');
                            transformedValue = originalValue.replace(pattern, '');
                            break;
                    }
                    
                    transformedRow[this.selectedBoKeyColumn] = transformedValue;
                    console.log(`🔧 Transformation: "${originalValue}" → "${transformedValue}"`);
                }
                
                return transformedRow;
            });
            
            console.log('✅ Transformation appliquée aux données BO');
        }
        
        console.log('📊 Données pour réconciliation:', {
            boDataLength: boDataToReconcile.length,
            partnerDataLength: partnerDataToReconcile.length,
            usingCompressedData: this.compressedBoData.length > 0,
            transformationApplied: selectedSuggestion?.transformation ? true : false
        });

        // Préparer les paramètres de réconciliation
        const reconciliationParams = {
            boFileContent: boDataToReconcile,
            partnerFileContent: partnerDataToReconcile,
            boKeyColumn: this.selectedBoKeyColumn,
            partnerKeyColumn: this.selectedPartnerKeyColumn,
            comparisonColumns: this.comparisonColumns.filter(col => 
                col.boColumn && col.partnerColumn
            ),
            additionalKeys: this.additionalKeys.filter(key => 
                key.boColumn && key.partnerColumn
            )
        };

        // Vérifier si le traitement par chunks sera utilisé
        const willUseChunks = this.willUseChunkedProcessing(boDataToReconcile, partnerDataToReconcile);
        if (willUseChunks) {
            console.log('📊 Gros fichier détecté - Le système utilisera un traitement par chunks optimisé');
            this.popupService.showInfo(
                'Gros fichier détecté ! Le système utilisera un traitement par chunks optimisé pour éviter les erreurs de mémoire. Le traitement peut prendre plus de temps mais sera plus stable.',
                'Traitement Optimisé'
            );
            
            // Pour les très gros fichiers, utiliser directement le traitement par chunks
            console.log('🚀 Lancement direct du traitement par chunks pour éviter l\'erreur de sérialisation');
            this.launchChunkedReconciliation(reconciliationParams);
            return;
        }
        
        // Log des échantillons de données transformées
        if (selectedSuggestion?.transformation) {
            const boSample = boDataToReconcile.slice(0, 3).map(row => row[this.selectedBoKeyColumn]);
            const partnerSample = partnerDataToReconcile.slice(0, 3).map(row => row[this.selectedPartnerKeyColumn]);
            console.log('🔍 Échantillons après transformation:', {
                boKeys: boSample,
                partnerKeys: partnerSample
            });
        }

        console.log('⚙️ Paramètres de réconciliation:', {
            boKeyColumn: reconciliationParams.boKeyColumn,
            partnerKeyColumn: reconciliationParams.partnerKeyColumn,
            comparisonColumnsCount: reconciliationParams.comparisonColumns.length,
            additionalKeysCount: reconciliationParams.additionalKeys.length
        });

        // Démarrer la réconciliation avec progression
        this.startReconciliationProgress();
        
        // Lancer la réconciliation avec gestion d'erreur
        this.reconciliationService.reconcile(reconciliationParams).subscribe({
            next: (result: any) => {
                console.log('✅ Réconciliation terminée avec succès');
                console.log('📊 Résultats de la réconciliation:', {
                    matches: result.matches?.length || 0,
                    boOnly: result.boOnly?.length || 0,
                    partnerOnly: result.partnerOnly?.length || 0,
                    mismatches: result.mismatches?.length || 0,
                    totalBoRecords: result.totalBoRecords || 0,
                    totalPartnerRecords: result.totalPartnerRecords || 0
                });
                
                this.finishReconciliationProgress();
                
                this.rememberReconciliationLaunchContext();
                this.appStateService.setReconciliationResults(result);
                
                // Naviguer vers la page des résultats avec un délai pour voir la progression
                setTimeout(() => {
                    console.log('🚀 Navigation vers les résultats...');
                    this.router.navigate(['/results']);
                }, 2000); // 2 secondes de délai pour voir la progression
            },
            error: (error: any) => {
                console.error('❌ Erreur lors de la réconciliation:', error);
                this.finishReconciliationProgress();
                
                // Afficher l'erreur à l'utilisateur
                this.popupService.showError(`Erreur lors de la réconciliation: ${error.message || 'Erreur inconnue'}`, 'Erreur de Réconciliation');
            }
        });
    }

    /**
     * Lance directement le traitement par chunks pour éviter l'erreur de sérialisation
     */
    private launchChunkedReconciliation(reconciliationParams: any): void {
        console.log('🚀 Lancement direct du traitement par chunks');
        
        // Démarrer la progression
        this.startReconciliationProgress();
        
        // Créer une requête simplifiée pour le traitement par chunks
        const chunkedRequest = {
            boFileContent: reconciliationParams.boFileContent,
            partnerFileContent: reconciliationParams.partnerFileContent,
            boKeyColumn: reconciliationParams.boKeyColumn,
            partnerKeyColumn: reconciliationParams.partnerKeyColumn,
            comparisonColumns: reconciliationParams.comparisonColumns,
            additionalKeys: reconciliationParams.additionalKeys
        };
        
        // Lancer la réconciliation par chunks
        this.reconciliationService.reconcile(chunkedRequest).subscribe({
            next: (result: any) => {
                console.log('✅ Réconciliation par chunks terminée avec succès');
                console.log('📊 Résultats de la réconciliation:', {
                    matches: result.matches?.length || 0,
                    boOnly: result.boOnly?.length || 0,
                    partnerOnly: result.partnerOnly?.length || 0,
                    mismatches: result.mismatches?.length || 0,
                    totalBoRecords: result.totalBoRecords || 0,
                    totalPartnerRecords: result.totalPartnerRecords || 0
                });
                
                this.finishReconciliationProgress();
                
                this.rememberReconciliationLaunchContext();
                this.appStateService.setReconciliationResults(result);
                
                // Naviguer vers la page des résultats avec un délai pour voir la progression
                setTimeout(() => {
                    console.log('🚀 Navigation vers les résultats...');
                    this.router.navigate(['/results']);
                }, 2000); // 2 secondes de délai pour voir la progression
            },
            error: (error: any) => {
                console.error('❌ Erreur lors de la réconciliation par chunks:', error);
                this.finishReconciliationProgress();
                
                // Afficher l'erreur à l'utilisateur
                this.popupService.showError(`Erreur lors de la réconciliation par chunks: ${error.message || 'Erreur inconnue'}`, 'Erreur de Réconciliation');
            }
        });
    }

    /**
     * Détermine si le traitement par chunks sera utilisé
     */
    private willUseChunkedProcessing(boData: any[], partnerData: any[]): boolean {
        // Désactiver le traitement par chunks frontend pour forcer l'utilisation du backend
        // Le backend est plus optimisé pour les gros volumes et la logique de correspondance
        console.log('📊 Utilisation du backend pour tous les fichiers (traitement optimisé)');
        return false;
    }

    // Méthodes pour gérer la progression
    private startReconciliationProgress(): void {
        console.log('🎯 startReconciliationProgress() appelé');
        this.isReconciliationInProgress = true;
        this.reconciliationProgress = 0;
        this.reconciliationStatus = 'Initialisation...';
        this.reconciliationStartTime = Date.now();
        
        // Déclencher l'affichage de la progression globale
        console.log('📈 Déclenchement de la progression globale dans appStateService');
        this.appStateService.setReconciliationProgress(true);
        
        console.log('✅ État de progression:', {
            isReconciliationInProgress: this.isReconciliationInProgress,
            reconciliationProgress: this.reconciliationProgress,
            reconciliationStatus: this.reconciliationStatus
        });
        
        // Forcer la détection de changement
        this.cdr.detectChanges();
        
        // Vérifier si l'élément DOM existe après un délai
        setTimeout(() => {
            const progressElement = document.querySelector('.reconciliation-progress');
            console.log('🔍 Élément DOM de progression:', progressElement);
            if (progressElement) {
                console.log('✅ Barre de progression trouvée dans le DOM');
                console.log('📏 Styles appliqués:', window.getComputedStyle(progressElement));
            } else {
                console.log('❌ Barre de progression non trouvée dans le DOM');
            }
        }, 100);
    }

    private updateProgressStatus(): void {
        console.log('📊 updateProgressStatus() - Progression:', this.reconciliationProgress);
        if (this.reconciliationProgress < 20) {
            this.reconciliationStatus = 'Analyse des données...';
        } else if (this.reconciliationProgress < 40) {
            this.reconciliationStatus = 'Indexation des enregistrements...';
        } else if (this.reconciliationProgress < 60) {
            this.reconciliationStatus = 'Traitement parallèle...';
        } else if (this.reconciliationProgress < 80) {
            this.reconciliationStatus = 'Comparaison des enregistrements...';
        } else if (this.reconciliationProgress < 95) {
            this.reconciliationStatus = 'Finalisation...';
        } else {
            this.reconciliationStatus = 'Terminé !';
        }
        console.log('📝 Nouveau statut:', this.reconciliationStatus);
        
        // Forcer la détection de changement
        this.cdr.detectChanges();
    }

    private finishReconciliationProgress(): void {
        console.log('🏁 finishReconciliationProgress() appelé');
        this.reconciliationProgress = 100;
        this.reconciliationStatus = 'Réconciliation terminée !';
        // Ne pas masquer immédiatement la barre
        // this.isReconciliationInProgress = false;
        console.log('✅ Progression terminée');
        
        // Arrêter la progression globale
        console.log('📈 Arrêt de la progression globale dans appStateService');
        this.appStateService.setReconciliationProgress(false);
        
        // Forcer la détection de changement
        this.cdr.detectChanges();
        
        // Masquer la barre après 3 secondes pour voir le résultat
        setTimeout(() => {
            this.isReconciliationInProgress = false;
            this.cdr.detectChanges();
        }, 3000);
    }

    getElapsedTime(): string {
        if (!this.reconciliationStartTime) return '';
        
        const elapsed = Date.now() - this.reconciliationStartTime;
        const seconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        } else {
            return `${remainingSeconds}s`;
        }
    }

    // Méthode de test pour afficher la barre de progression
    testProgressBar(): void {
        console.log('🧪 Test de la barre de progression');
        this.isReconciliationInProgress = true;
        this.reconciliationProgress = 50;
        this.reconciliationStatus = 'Test en cours...';
        this.reconciliationStartTime = Date.now();
        this.cdr.detectChanges();
        
        // Masquer après 3 secondes
        setTimeout(() => {
            this.isReconciliationInProgress = false;
            this.cdr.detectChanges();
        }, 3000);
    }

    private rememberReconciliationLaunchContext(): void {
        const urlMode = new URLSearchParams(window.location.search).get('mode');
        if (urlMode === 'assisted') {
            this.appStateService.setReconciliationLaunchMode('assisted');
            this.appStateService.setReconciliationEntryPath('/reconciliation-launcher');
            return;
        }
        if (urlMode === 'manual') {
            this.appStateService.setReconciliationLaunchMode('manual');
            this.appStateService.setReconciliationEntryPath('/reconciliation-launcher');
            return;
        }
        this.appStateService.setReconciliationLaunchMode('manual');
        this.appStateService.setReconciliationEntryPath('/upload');
    }
} 