import { Component, Input, Output, EventEmitter, OnDestroy, OnChanges, SimpleChanges, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { ColumnComparison } from '../../models/column-comparison.model';
import { AppStateService } from '../../services/app-state.service';
import { ReconciliationService } from '../../services/reconciliation.service';
import { Subscription } from 'rxjs';
import { ReconciliationRequest } from '../../models/reconciliation-request.model';

@Component({
    selector: 'app-column-selection',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
        <div class="column-selection-container">
            <h2>📊 Sélection des colonnes</h2>
            <p class="description">Sélectionnez les colonnes clés et les colonnes à comparer</p>

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
            <div class="section">
                <h3>🔑 Clés supplémentaires (optionnel)</h3>
                <p class="section-description">Ajoutez des clés supplémentaires pour une réconciliation plus précise</p>
                
                <div class="additional-keys">
                    <div class="additional-key-row" *ngFor="let keyPair of additionalKeys; let i = index">
                        <div class="column-group">
                            <label>Colonne BO supplémentaire</label>
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
                            <label>Colonne Partenaire supplémentaire</label>
                            <select 
                                [(ngModel)]="keyPair.partnerColumn"
                                (ngModelChange)="onAdditionalPartnerKeyChange($event, i)">
                                <option value="">Sélectionnez une colonne</option>
                                <option *ngFor="let column of partnerColumns" [ngValue]="column">
                                    {{column}}
                                </option>
                            </select>
                        </div>

                        <button class="remove-btn" (click)="removeAdditionalKey(i)">
                            🗑️
                        </button>
                    </div>
                </div>

                <button class="add-btn" (click)="addAdditionalKey()">
                    ➕ Ajouter une clé supplémentaire
                </button>
            </div>

            <!-- Colonnes à comparer -->
            <div class="section">
                <h3>🔄 Colonnes à comparer</h3>
                <p class="section-description">Sélectionnez les colonnes que vous souhaitez comparer entre les deux fichiers</p>
                
                <div class="comparison-columns">
                    <div class="comparison-row" *ngFor="let comparison of comparisonColumns; let i = index">
                        <div class="column-group">
                            <label>Colonne BO</label>
                            <select 
                                [(ngModel)]="comparison.boColumn"
                                (ngModelChange)="onBoComparisonColumnChange($event, i)">
                                <option value="">Sélectionnez une colonne</option>
                                <option *ngFor="let column of boColumns" [ngValue]="column">
                                    {{column}}
                                </option>
                            </select>
                        </div>

                        <div class="column-group">
                            <label>Colonne Partenaire</label>
                            <select 
                                [(ngModel)]="comparison.partnerColumn"
                                (ngModelChange)="onPartnerComparisonColumnChange($event, i)">
                                <option value="">Sélectionnez une colonne</option>
                                <option *ngFor="let column of partnerColumns" [ngValue]="column">
                                    {{column}}
                                </option>
                            </select>
                        </div>

                        <button class="remove-btn" (click)="removeComparisonColumn(i)" *ngIf="comparisonColumns.length > 1">
                            🗑️
                        </button>
                    </div>
                </div>

                <button class="add-btn" (click)="addComparisonColumn()">
                    ➕ Ajouter une colonne à comparer
                </button>
            </div>

            <!-- Bouton de validation -->
            <div class="validation-section">
                <button 
                    class="validate-btn" 
                    [disabled]="!isValid"
                    (click)="proceedWithReconciliation()">
                    🔄 Lancer la réconciliation
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
    `]
})
export class ColumnSelectionComponent implements OnDestroy, OnChanges, OnInit {
    @Input() boData: Record<string, string>[] = [];
    @Input() partnerData: Record<string, string>[] = [];
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
    comparisonColumns: { boColumn: string, partnerColumn: string }[] = [{ boColumn: '', partnerColumn: '' }];
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
    private readonly SAMPLE_SIZE = 100; // Échantillon pour l'analyse

    constructor(
        private reconciliationService: ReconciliationService,
        private appStateService: AppStateService,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnChanges(changes: SimpleChanges) {
        console.log('Input data changed:', changes);
        if (changes['boData'] || changes['partnerData']) {
            this.initializeColumns();
        }
    }

    ngOnDestroy() {
        console.log('ColumnSelectionComponent destroyed');
    }

    ngOnInit() {
        console.log('🔍 DEBUG - ColumnSelectionComponent initialized');
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
        
        if (this.boData?.length > 0 && this.partnerData?.length > 0) {
            console.log('✅ Données trouvées, optimisation en cours...');
            this.optimizeAndLoadData(this.boData, this.partnerData);
        } else {
            console.warn('❌ Aucune donnée trouvée dans le service');
            this.router.navigate(['/upload']);
        }
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
        this.cdr.detectChanges();
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
        const boDataToReconcile = this.compressedBoData.length > 0 ? this.compressedBoData : this.boData;
        const partnerDataToReconcile = this.compressedPartnerData.length > 0 ? this.compressedPartnerData : this.partnerData;
        
        console.log('📊 Données pour réconciliation:', {
            boDataLength: boDataToReconcile.length,
            partnerDataLength: partnerDataToReconcile.length,
            usingCompressedData: this.compressedBoData.length > 0
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
                
                // Stocker les résultats dans le service d'état
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
                alert(`Erreur lors de la réconciliation: ${error.message || 'Erreur inconnue'}`);
            }
        });
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
} 