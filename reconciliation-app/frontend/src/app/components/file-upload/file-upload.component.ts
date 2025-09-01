
import { Component, EventEmitter, Output } from '@angular/core';
import { ReconciliationService } from '../../services/reconciliation.service';
import { AutoProcessingService, ProcessingResult } from '../../services/auto-processing.service';
import { OrangeMoneyUtilsService } from '../../services/orange-money-utils.service';
import { fixGarbledCharacters } from '../../utils/encoding-fixer';
import * as Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Router } from '@angular/router';
import { AppStateService } from '../../services/app-state.service';
import { forkJoin } from 'rxjs';
import { PopupService } from '../../services/popup.service';

@Component({
    selector: 'app-file-upload',
    templateUrl: './file-upload.component.html',
    styleUrls: ['./file-upload.component.scss']
})
export class FileUploadComponent {
    @Output() filesLoaded = new EventEmitter<{
        boData: Record<string, string>[];
        partnerData: Record<string, string>[];
    }>();

    reconciliationMode: 'manual' | 'automatic' | 'super-auto' = 'manual';

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

    // Fichiers pour le mode super auto
    superAutoBoFile: File | null = null;
    superAutoPartnerFile: File | null = null;
    superAutoBoData: Record<string, string>[] = [];
    superAutoPartnerData: Record<string, string>[] = [];
    superAutoEstimatedTime: string = '';

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
        private appStateService: AppStateService,
        private popupService: PopupService
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
        
        // Traitement simplifié sans callback de progression
        this.autoProcessingService.processFile(file).then((result: ProcessingResult) => {
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
        }).catch((error) => {
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

        // Méthode simplifiée sans réconciliation automatique
        console.log(`🚀 Traitement de fichier pour ${file.name} (type: ${fileType})`);
        // TODO: Implémenter le traitement de fichier
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
                                               `📊 Lignes traitées: ${result.processedData.length}\n\n` +
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
        this.popupService.showInfo(message);
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
            
            // Détection et nettoyage de l'encodage
            text = this.detectAndFixEncoding(text);
            
            // Optimisation pour gros fichiers : parsing par chunks
            const lines = text.split('\n');
            console.log(`📊 Fichier ${file.name}: ${lines.length} lignes détectées`);
            
            // Pour les gros fichiers (>50k lignes), utiliser un parsing optimisé
            if (lines.length > 50000) {
                console.log(`🚀 Traitement optimisé pour gros fichier: ${lines.length} lignes`);
                this.parseLargeCSV(lines, isBo);
            } else {
                // Parsing normal pour petits fichiers avec détection automatique du délimiteur
                const delimiter = this.detectDelimiter(lines[0]);
                console.log(`🔍 Délimiteur détecté: "${delimiter}"`);
                
                Papa.parse(text, {
                    header: true,
                    delimiter: delimiter,
                    skipEmptyLines: true,
                    complete: (results) => {
                        console.log('Première ligne lue:', results.data[0]);
                        if (isBo) {
                            this.boData = this.normalizeData(results.data as Record<string, string>[]);
                        } else {
                            this.partnerData = this.normalizeData(this.convertDebitCreditToNumber(results.data as Record<string, string>[]));
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

    /**
     * Détecte et corrige l'encodage du fichier
     */
    private detectAndFixEncoding(text: string): string {
        // Nettoyer le BOM éventuel
        if (text.charCodeAt(0) === 0xFEFF) {
            text = text.slice(1);
        }
        
        // Détecter et corriger les caractères mal encodés
        text = fixGarbledCharacters(text);
        
        // Normaliser les retours à la ligne
        text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        return text;
    }

    /**
     * Normalise les données en corrigeant les noms de colonnes et les valeurs
     */
    private normalizeData(data: Record<string, string>[]): Record<string, string>[] {
        if (!data || data.length === 0) return data;
        
        const normalizedData: Record<string, string>[] = [];
        
        for (const row of data) {
            const normalizedRow: Record<string, string> = {};
            
            for (const [key, value] of Object.entries(row)) {
                // Normaliser le nom de la colonne
                const normalizedKey = this.normalizeColumnName(key);
                
                // Normaliser la valeur
                const normalizedValue = this.normalizeValue(value);
                
                normalizedRow[normalizedKey] = normalizedValue;
            }
            
            normalizedData.push(normalizedRow);
        }
        
        return normalizedData;
    }

    /**
     * Normalise un nom de colonne
     */
    private normalizeColumnName(columnName: string): string {
        if (!columnName) return columnName;
        
        let normalized = columnName.trim();
        
        // Décoder les entités HTML et XML courantes
        normalized = normalized
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ');
        
        // Corriger l'encodage des caractères accentués (double encodage UTF-8)
        normalized = normalized
            .replace(/ÃƒÂ©/g, 'é')  // Corriger l'encodage UTF-8 mal interprété (double encodage)
            .replace(/Ã©/g, 'é')    // Corriger l'encodage UTF-8 mal interprété (simple)
            .replace(/ÃƒÂ¨/g, 'è')
            .replace(/Ã¨/g, 'è')
            .replace(/ÃƒÂ /g, 'à')
            .replace(/Ã /g, 'à')
            .replace(/ÃƒÂ¢/g, 'â')
            .replace(/Ã¢/g, 'â')
            .replace(/ÃƒÂª/g, 'ê')
            .replace(/Ãª/g, 'ê')
            .replace(/ÃƒÂ®/g, 'î')
            .replace(/Ã®/g, 'î')
            .replace(/ÃƒÂ´/g, 'ô')
            .replace(/Ã´/g, 'ô')
            .replace(/ÃƒÂ¹/g, 'ù')
            .replace(/Ã¹/g, 'ù')
            .replace(/ÃƒÂ»/g, 'û')
            .replace(/Ã»/g, 'û')
            .replace(/ÃƒÂ§/g, 'ç')
            .replace(/Ã§/g, 'ç')
            .replace(/ÃƒÂ‰/g, 'É')
            .replace(/Ã‰/g, 'É')
            .replace(/ÃƒÂ€/g, 'À')
            .replace(/Ã€/g, 'À')
            .replace(/ÃƒÂ‚/g, 'Â')
            .replace(/Ã‚/g, 'Â')
            .replace(/ÃƒÂŠ/g, 'Ê')
            .replace(/ÃŠ/g, 'Ê')
            .replace(/ÃƒÂŽ/g, 'Î')
            .replace(/ÃŽ/g, 'Î')
            .replace(/ÃƒÂ"/g, 'Ô')
            .replace(/Ã"/g, 'Ô')
            .replace(/ÃƒÂ™/g, 'Ù')
            .replace(/Ã™/g, 'Ù')
            .replace(/ÃƒÂ›/g, 'Û')
            .replace(/Ã›/g, 'Û')
            .replace(/ÃƒÂ‡/g, 'Ç')
            .replace(/Ã‡/g, 'Ç');
        
        // Corrections spécifiques pour les cas courants (AVANT la normalisation agressive)
        const corrections: { [key: string]: string } = {
            'Opration': 'Opération',
            'Montant (XAF)': 'Montant (XAF)',
            'Commissions (XAF)': 'Commissions (XAF)',
            'N° de Compte': 'N° de Compte',
            'N° Pseudo': 'N° Pseudo',
            'IDTransaction': 'ID Transaction',
            'External id': 'External ID',
            'Transaction ID': 'Transaction ID',
            'Numero Trans GU': 'Numero Trans GU',
            'NumÃ©ro Trans GU': 'Numero Trans GU',
            'Numéro Trans GU': 'Numero Trans GU',
            'Num ro Trans GU': 'Numero Trans GU',
            'Num ro Trans': 'Numero Trans GU',
            'Numero Trans': 'Numero Trans GU',
            'Token': 'Token',
            'TOKEN': 'Token',
            'token': 'Token',
            // Corrections spécifiques pour Orange Money
            'R f rence': 'Référence',
            'Reference': 'Référence',
            'reference': 'Référence',
            'REFERENCE': 'Référence'
        };
        
        // Vérifier d'abord dans les corrections spécifiques
        if (corrections[normalized]) {
            return corrections[normalized];
        }
        
        // Remplacer les caractères spéciaux par des espaces (plus agressif) - APRÈS les corrections
        normalized = normalized
            .replace(/[^\w\s-]/g, ' ') // Remplacer caractères spéciaux par espaces
            .replace(/\s+/g, ' ') // Normaliser les espaces multiples
            .trim();
        
        // Vérifier à nouveau dans les corrections après normalisation
        return corrections[normalized] || normalized;
    }

    /**
     * Normalise une valeur
     */
    private normalizeValue(value: any): string {
        if (value === null || value === undefined) return '';
        
        let normalized = String(value).trim();
        
        // Supprimer les guillemets inutiles
        if ((normalized.startsWith('"') && normalized.endsWith('"')) ||
            (normalized.startsWith("'") && normalized.endsWith("'"))) {
            normalized = normalized.slice(1, -1);
        }
        
        return normalized;
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
                
                // Détecter les en-têtes avec une méthode améliorée
                const headerDetection = this.detectExcelHeadersImproved(jsonData);
                const headers = headerDetection.headerRow;
                const headerRowIndex = headerDetection.headerRowIndex;
                
                console.log(`✅ En-têtes détectés à la ligne ${headerRowIndex}:`, headers);
                
                // Vérifier si des en-têtes valides ont été trouvés
                if (!headers || headers.length === 0 || headers.every(h => !h || h.trim() === '')) {
                    console.log('⚠️ Aucun en-tête valide détecté, utilisation de la première ligne');
                    const fallbackHeaders = jsonData[0]?.map((h, idx) => h || `Col${idx + 1}`) || [];
                    const correctedHeaders = fallbackHeaders.map(header => this.normalizeColumnName(header));
                    
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
                        this.boData = this.normalizeData(rows);
                    } else {
                        this.partnerData = this.normalizeData(this.convertDebitCreditToNumber(rows));
                    }
                } else {
                    // Corriger les caractères spéciaux dans les en-têtes
                    const correctedHeaders = headers.map(header => this.normalizeColumnName(header));
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
                        this.boData = this.normalizeData(rows);
                    } else {
                        this.partnerData = this.normalizeData(this.convertDebitCreditToNumber(rows));
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
     * Méthode améliorée pour détecter les en-têtes Excel
     */
    private detectExcelHeadersImproved(jsonData: any[][]): { headerRowIndex: number; headerRow: string[] } {
        console.log('🔄 Détection améliorée des en-têtes Excel');
        
        // Analyser les 20 premières lignes pour trouver le meilleur candidat
        const maxRowsToCheck = Math.min(20, jsonData.length);
        let bestHeaderRowIndex = 0;
        let bestScore = 0;
        let bestHeaderRow: string[] = [];
        
        for (let i = 0; i < maxRowsToCheck; i++) {
            const row = jsonData[i] as any[];
            if (!row || row.length === 0) continue;
            
            // Convertir la ligne en chaînes et nettoyer
            const rowStrings = row.map((cell: any) => {
                if (cell === null || cell === undefined || cell === '') return '';
                const cellString = String(cell).trim();
                return cellString || '';
            });
            
            // Log pour debug
            console.log(`🔍 Ligne ${i} - Données brutes:`, row);
            console.log(`🔍 Ligne ${i} - Après conversion:`, rowStrings);
            
            // Calculer le score pour cette ligne
            const score = this.calculateHeaderScore(rowStrings, i);
            
            console.log(`🔍 Ligne ${i}: score=${score}, colonnes=${rowStrings.filter(cell => cell !== '').length}`);
            
            if (score > bestScore) {
                bestScore = score;
                bestHeaderRowIndex = i;
                bestHeaderRow = [...rowStrings];
                console.log(`⭐ Nouveau meilleur en-tête trouvé à la ligne ${i} avec score ${score}`);
            }
        }
        
        console.log(`🔍 Meilleur en-tête trouvé à la ligne ${bestHeaderRowIndex} avec score ${bestScore}`);
        console.log(`🔍 En-tête détecté:`, bestHeaderRow);
        
        return {
            headerRowIndex: bestHeaderRowIndex,
            headerRow: bestHeaderRow
        };
    }

    /**
     * Calcule le score d'une ligne pour déterminer si c'est un en-tête
     */
    private calculateHeaderScore(rowStrings: string[], rowIndex: number): number {
        let score = 0;
        
        // Vérification défensive
        if (!Array.isArray(rowStrings)) {
            console.warn('⚠️ calculateHeaderScore: rowStrings n\'est pas un tableau:', rowStrings);
            return 0;
        }
        
        const nonEmptyColumns = rowStrings.filter(cell => cell !== '').length;
        
        // Bonus pour avoir plusieurs colonnes non vides
        if (nonEmptyColumns >= 3) {
            score += 10;
        }
        
        // Bonus pour les mots-clés d'en-tête
        const headerKeywords = [
            'N°', 'Date', 'Heure', 'Référence', 'Service', 'Paiement', 'Statut', 'Mode',
            'Compte', 'Wallet', 'Pseudo', 'Débit', 'Crédit', 'Montant', 'Commissions',
            'Opération', 'Agent', 'Correspondant', 'Sous-réseau', 'Transaction',
            'ID', 'External', 'Reference', 'Amount', 'Status', 'Phone', 'Email'
        ];
        
        for (const cell of rowStrings) {
            // Vérification robuste pour éviter les erreurs undefined/null
            if (!cell || cell === '' || typeof cell !== 'string') continue;
            
            for (const keyword of headerKeywords) {
                if (cell.toLowerCase().includes(keyword.toLowerCase())) {
                    score += 5;
                }
            }
            
            // Bonus pour les colonnes "N°"
            if (cell.includes('N°') || cell === 'N') {
                score += 15;
            }
            
            // Bonus pour les caractères spéciaux typiques des en-têtes
            if (cell.includes('é') || cell.includes('è') || cell.includes('à') || 
                cell.includes('ç') || cell.includes('ù') || cell.includes('ô')) {
                score += 3;
            }
        }
        
        // Pénalité pour les lignes avec peu de colonnes non vides
        if (nonEmptyColumns < 2) {
            score -= 5;
        }
        
        // Bonus pour les premières lignes (plus probable d'être des en-têtes)
        if (rowIndex <= 2) {
            score += 5;
        }
        
        return score;
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

    goToReconciliationLauncher() {
        this.router.navigate(['/reconciliation-launcher']);
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
                const headerDetection = this.detectExcelHeadersImproved(jsonData);
                const headers = headerDetection.headerRow;
                const headerRowIndex = headerDetection.headerRowIndex;
                
                console.log(`✅ En-têtes détectés à la ligne ${headerRowIndex}:`, headers);
                
                // Vérifier si des en-têtes valides ont été trouvés
                if (!headers || headers.length === 0 || headers.every(h => !h || h.trim() === '')) {
                    console.log('⚠️ Aucun en-tête valide détecté, utilisation de la première ligne');
                    const fallbackHeaders = jsonData[0]?.map((h, idx) => h || `Col${idx + 1}`) || [];
                    const correctedHeaders = fallbackHeaders.map(header => this.normalizeColumnName(header));
                    
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
                    const correctedHeaders = headers.map(header => this.normalizeColumnName(header));
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



    /**
     * Détecte les clés de réconciliation en priorisant les modèles (SANS FALLBACK)
     */
    private async detectReconciliationKeys(
        boData: Record<string, string>[], 
        partnerData: Record<string, string>[],
        boFileName: string,
        partnerFileName: string
    ): Promise<{
        boKeyColumn: string;
        partnerKeyColumn: string;
        source: 'model';
        confidence: number;
        modelId?: string;
    }> {
        console.log('🔍 Début de la détection des clés de réconciliation (MODÈLES UNIQUEMENT)');
        console.log('📄 Fichiers:', { boFileName, partnerFileName });

        // PRIORITÉ UNIQUE : Chercher un modèle partenaire qui correspond au fichier partenaire
        try {
            const models = await this.autoProcessingService.getAllModels();
            console.log(`📋 ${models.length} modèles disponibles`);
            console.log('📋 Modèles disponibles:', models.map(m => ({ name: m.name, fileType: m.fileType, filePattern: m.filePattern })));

            // Chercher les modèles partenaires qui correspondent au partnerFileName
            const partnerModels = models.filter(model => 
                model.fileType === 'partner' && 
                this.matchesFilePattern(partnerFileName, model.filePattern)
            );

            console.log(`🔍 ${partnerModels.length} modèles partenaires trouvés pour ${partnerFileName}`);
            console.log('🔍 Modèles partenaires trouvés:', partnerModels.map(m => ({ name: m.name, filePattern: m.filePattern })));

            for (const model of partnerModels) {
                console.log(`🔍 Test du modèle partenaire: ${model.name}`);
                console.log('🔍 Modèle complet:', model);
                
                // Vérifier si le modèle a des clés de réconciliation
                if (!model.reconciliationKeys) {
                    console.log(`⚠️ Modèle ${model.name} sans reconciliationKeys`);
                    continue;
                }
                
                console.log('🔍 reconciliationKeys du modèle:', model.reconciliationKeys);
                
                // Vérifier si le modèle a des clés partenaires
                if (!model.reconciliationKeys.partnerKeys || model.reconciliationKeys.partnerKeys.length === 0) {
                    console.log(`⚠️ Modèle ${model.name} sans partnerKeys`);
                    continue;
                }
                
                console.log(`✅ Modèle partenaire avec clés trouvé: ${model.name}`);
                    console.log('🔑 Clés du modèle:', model.reconciliationKeys);

                let boKeyColumn = '';
                let partnerKeyColumn = '';

                // PRIORITÉ 1: Essayer d'abord les clés génériques (plus simple et plus fiable)
                console.log('🔍 PRIORITÉ 1: Test des clés génériques');
                    const boKeys = model.reconciliationKeys.boKeys || [];
                    const partnerKeys = model.reconciliationKeys.partnerKeys || [];

                console.log('🔍 Clés génériques:', { boKeys, partnerKeys });
                
                if (boKeys.length > 0 && partnerKeys.length > 0) {
                    console.log('🔍 Recherche des clés génériques dans les données...');
                    
                    const foundBoKey = this.findExistingColumn(boData, boKeys);
                    const foundPartnerKey = this.findExistingColumn(partnerData, partnerKeys);
                    
                    console.log(`🔍 Résultats de recherche génériques:`, { foundBoKey, foundPartnerKey });
                    
                    if (foundBoKey && foundPartnerKey) {
                        boKeyColumn = foundBoKey;
                        partnerKeyColumn = foundPartnerKey;
                        console.log(`✅ Clés génériques trouvées:`, { boKeyColumn, partnerKeyColumn });
                    } else {
                        console.log(`❌ Clés génériques non trouvées`);
                    }
                } else {
                    console.log(`⚠️ Clés génériques manquantes:`, { boKeys, partnerKeys });
                }

                // PRIORITÉ 2: Si les clés génériques n'ont pas fonctionné, essayer les boModels spécifiques
                if (!boKeyColumn || !partnerKeyColumn) {
                    if (model.reconciliationKeys.boModels && model.reconciliationKeys.boModels.length > 0) {
                        console.log('🔍 PRIORITÉ 2: Test des boModels spécifiques');
                        console.log('🔍 boModels:', model.reconciliationKeys.boModels);
                        console.log('🔍 boModelKeys:', model.reconciliationKeys.boModelKeys);
                        
                        // Pour chaque modèle BO, essayer de trouver les clés correspondantes
                        for (const boModelId of model.reconciliationKeys.boModels) {
                            const boModelKeys = model.reconciliationKeys.boModelKeys?.[boModelId];
                            const partnerKeys = model.reconciliationKeys.partnerKeys;
                            
                            console.log(`🔍 Test pour boModelId ${boModelId}:`, { boModelKeys, partnerKeys });
                            
                            if (boModelKeys && boModelKeys.length > 0 && partnerKeys && partnerKeys.length > 0) {
                                console.log(`🔍 Test des clés pour le modèle BO ${boModelId}:`, { boModelKeys, partnerKeys });
                                
                                // Vérifier si ces clés existent dans les données
                                const foundBoKey = this.findExistingColumn(boData, boModelKeys);
                                const foundPartnerKey = this.findExistingColumn(partnerData, partnerKeys);
                                
                                console.log(`🔍 Résultats de recherche:`, { foundBoKey, foundPartnerKey });
                                
                                if (foundBoKey && foundPartnerKey) {
                                    boKeyColumn = foundBoKey;
                                    partnerKeyColumn = foundPartnerKey;
                                    console.log(`✅ Clés trouvées pour le modèle BO ${boModelId}:`, { boKeyColumn, partnerKeyColumn });
                                    break;
                                } else {
                                    console.log(`❌ Clés non trouvées pour le modèle BO ${boModelId}`);
                    }
                } else {
                                console.log(`⚠️ Clés manquantes pour le modèle BO ${boModelId}:`, { boModelKeys, partnerKeys });
                            }
                        }
                    } else {
                        console.log('🔍 Aucun boModel spécifique configuré');
                    }
                }

                // Si des clés valides ont été trouvées, les utiliser
                if (boKeyColumn && partnerKeyColumn) {
                    console.log(`🎉 Modèle partenaire sélectionné: ${model.name}`);
                    console.log(`🔑 Clés sélectionnées: BO='${boKeyColumn}', Partner='${partnerKeyColumn}'`);
                
                return {
                        boKeyColumn: boKeyColumn,
                        partnerKeyColumn: partnerKeyColumn,
                    source: 'model',
                        confidence: 1.0,
                        modelId: model.modelId || model.id
                };
                } else {
                    console.log(`⚠️ Modèle ${model.name} trouvé mais clés non disponibles dans les données`);
                }
            }
            
            console.log('❌ Aucun modèle partenaire valide trouvé');
        } catch (error) {
            console.warn('⚠️ Erreur lors de la recherche de modèles:', error);
            console.error('❌ Détails de l\'erreur:', error);
        }

        // AUCUN FALLBACK - Lancer une erreur si aucun modèle n'est trouvé
        console.log('🚫 AUCUN MODÈLE TROUVÉ - RÉCONCILIATION IMPOSSIBLE');
        throw new Error(`Aucun modèle de réconciliation trouvé pour les fichiers ${boFileName} et ${partnerFileName}. Veuillez configurer un modèle de traitement automatique dans la section "Modèles de Traitement".`);
    }

    /**
     * Applique les traitements BO spécifiés dans un modèle
     */
    private applyBoTreatments(
        boData: Record<string, string>[], 
        boTreatments: any
    ): Record<string, string>[] {
        console.log('🔧 Application des traitements BO:', boTreatments);
        
        if (!boTreatments || Object.keys(boTreatments).length === 0) {
            console.log('⚠️ Aucun traitement BO à appliquer');
            return boData;
        }
        
        let processedData = [...boData];
        
        // Appliquer les traitements pour chaque modèle BO
        Object.entries(boTreatments).forEach(([modelId, treatments]) => {
            console.log(`🔧 Application des traitements pour le modèle BO ${modelId}:`, treatments);
            
            if (Array.isArray(treatments)) {
                treatments.forEach((treatment: any) => {
                    console.log('🔧 Application du traitement:', treatment);
                    
                    if (treatment.type === 'removeSuffix') {
                        const column = treatment.column;
                        const suffix = treatment.suffix;
                        
                        console.log(`🔧 Suppression du suffixe "${suffix}" de la colonne "${column}"`);
                        console.log(`🔍 Valeurs avant traitement:`, processedData.slice(0, 5).map(row => row[column]));
                        
                        processedData = processedData.map(row => {
                            const newRow = { ...row };
                            if (newRow[column] && typeof newRow[column] === 'string') {
                                const originalValue = newRow[column];
                                if (originalValue.endsWith(suffix)) {
                                    newRow[column] = originalValue.slice(0, -suffix.length);
                                    console.log(`🔧 "${originalValue}" -> "${newRow[column]}" (suffixe "${suffix}" supprimé)`);
                                } else {
                                    console.log(`🔍 Valeur "${originalValue}" ne se termine pas par "${suffix}"`);
                                }
                            } else {
                                console.log(`🔍 Valeur "${newRow[column]}" n'est pas une chaîne ou est vide`);
                            }
                            return newRow;
                        });
                        
                        console.log(`🔍 Valeurs après traitement:`, processedData.slice(0, 5).map(row => row[column]));
                    } else if (treatment.type === 'toNumber') {
                        const column = treatment.column;
                        
                        console.log(`🔧 Conversion en nombre de la colonne "${column}"`);
                        
                        processedData = processedData.map(row => {
                            const newRow = { ...row };
                            if (newRow[column] !== undefined && newRow[column] !== null) {
                                const originalValue = newRow[column];
                                const numericValue = parseFloat(String(originalValue));
                                if (!isNaN(numericValue)) {
                                    newRow[column] = String(numericValue);
                                    console.log(`🔧 "${originalValue}" -> "${newRow[column]}" (conversion en nombre)`);
                                }
                            }
                            return newRow;
                        });
                    } else if (treatment.type === 'toString') {
                        const column = treatment.column;
                        
                        console.log(`🔧 Conversion en texte de la colonne "${column}"`);
                        
                        processedData = processedData.map(row => {
                            const newRow = { ...row };
                            if (newRow[column] !== undefined && newRow[column] !== null) {
                                const originalValue = newRow[column];
                                newRow[column] = String(originalValue);
                                console.log(`🔧 ${originalValue} -> "${newRow[column]}" (conversion en texte)`);
                            }
                            return newRow;
                        });
                    } else {
                        console.log('⚠️ Type de traitement non supporté:', treatment.type);
                    }
                });
            }
        });
        
        console.log(`✅ Traitements BO appliqués: ${processedData.length} lignes`);
        return processedData;
    }

    /**
     * Vérifie si un nom de fichier correspond à un pattern
     */
    private matchesFilePattern(fileName: string, pattern: string): boolean {
        if (!pattern || !fileName) return false;
        
        // Convertir le pattern en regex
        const regexPattern = pattern
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');
        
        try {
            const regex = new RegExp(regexPattern, 'i');
            return regex.test(fileName);
        } catch (error) {
            console.warn('⚠️ Pattern invalide:', pattern);
            return false;
        }
    }

    /**
     * Trouve une colonne existante dans les données (renommée pour clarifier le rôle)
     */
    private findExistingColumn(data: Record<string, string>[], candidateKeys: string[]): string | null {
        if (!data || data.length === 0) {
            console.log('❌ Données manquantes ou vides');
            return null;
        }
        
        if (!candidateKeys || candidateKeys.length === 0) {
            console.log('❌ Clés candidates manquantes ou vides');
            return null;
        }

        const availableColumns = Object.keys(data[0]);
        console.log('📊 Colonnes disponibles:', availableColumns);
        console.log('🔑 Clés candidates:', candidateKeys);

        // Normaliser les noms de colonnes pour la comparaison
        const normalizedColumns = availableColumns.map(col => this.normalizeColumnName(col));
        const normalizedCandidates = candidateKeys.map(key => this.normalizeColumnName(key));

        console.log('🔧 Colonnes normalisées:', normalizedColumns);
        console.log('🔧 Clés candidates normalisées:', normalizedCandidates);

        // PRIORITÉ 1: Chercher des correspondances exactes
        for (let i = 0; i < normalizedCandidates.length; i++) {
            const candidateIndex = normalizedColumns.indexOf(normalizedCandidates[i]);
            if (candidateIndex !== -1) {
                console.log(`✅ Correspondance exacte trouvée: ${candidateKeys[i]} -> ${availableColumns[candidateIndex]}`);
                console.log(`   Normalisé: "${normalizedCandidates[i]}" -> "${normalizedColumns[candidateIndex]}"`);
                return availableColumns[candidateIndex];
            }
        }
        
        // PRIORITÉ 1.5: Chercher des correspondances exactes insensibles à la casse
        for (let i = 0; i < normalizedCandidates.length; i++) {
            const candidate = normalizedCandidates[i].toLowerCase();
            for (let j = 0; j < normalizedColumns.length; j++) {
                const column = normalizedColumns[j].toLowerCase();
                if (candidate === column) {
                    console.log(`✅ Correspondance exacte (insensible à la casse) trouvée: ${candidateKeys[i]} -> ${availableColumns[j]}`);
                    console.log(`   Normalisé: "${normalizedCandidates[i]}" -> "${normalizedColumns[j]}"`);
                    return availableColumns[j];
                }
            }
        }

        // PRIORITÉ 2: Chercher des correspondances sans espaces (pour gérer les variations d'espaces)
        for (let i = 0; i < normalizedCandidates.length; i++) {
            const candidate = normalizedCandidates[i].replace(/\s+/g, '');
            for (let j = 0; j < normalizedColumns.length; j++) {
                const column = normalizedColumns[j].replace(/\s+/g, '');
                
                if (candidate === column) {
                    console.log(`✅ Correspondance sans espaces trouvée: ${candidateKeys[i]} -> ${availableColumns[j]}`);
                    console.log(`   Sans espaces: "${candidate}" = "${column}"`);
                    return availableColumns[j];
                }
            }
        }

        // PRIORITÉ 3: Chercher des correspondances partielles (plus flexible)
        for (let i = 0; i < normalizedCandidates.length; i++) {
            const candidate = normalizedCandidates[i];
            for (let j = 0; j < normalizedColumns.length; j++) {
                const column = normalizedColumns[j];
                
                // Vérifier si l'une contient l'autre
                if (column.includes(candidate) || candidate.includes(column)) {
                    // Vérification spéciale pour éviter les correspondances incorrectes
                    // Si on cherche "id" et qu'on trouve "Provider category", c'est incorrect
                    if (candidate.toLowerCase() === 'id' && column.toLowerCase().includes('provider')) {
                        console.log(`❌ Correspondance partielle rejetée: ${candidateKeys[i]} -> ${availableColumns[j]} (évite Provider category)`);
                        continue;
                    }
                    
                    // Vérification spéciale pour éviter les correspondances trop courtes
                    if (candidate.length < 3 && column.length > candidate.length * 3) {
                        console.log(`❌ Correspondance partielle rejetée: ${candidateKeys[i]} -> ${availableColumns[j]} (clé trop courte)`);
                        continue;
                    }
                    
                    console.log(`✅ Correspondance partielle trouvée: ${candidateKeys[i]} -> ${availableColumns[j]}`);
                    console.log(`   Normalisé: "${candidate}" contient ou est contenu dans "${column}"`);
                    return availableColumns[j];
                }
                
                // Vérifier la similarité (pour gérer les variations d'encodage)
                const similarity = this.calculateStringSimilarity(candidate, column);
                if (similarity > 0.8) {
                    console.log(`✅ Correspondance par similarité trouvée: ${candidateKeys[i]} -> ${availableColumns[j]}`);
                    console.log(`   Similarité: ${similarity} (${candidate} ~ ${column})`);
                    return availableColumns[j];
                }
            }
        }

        // PRIORITÉ 4: Gestion spéciale pour les fichiers Orange Money avec encodage problématique
        for (let i = 0; i < candidateKeys.length; i++) {
            const candidate = candidateKeys[i];
            for (let j = 0; j < availableColumns.length; j++) {
                const column = availableColumns[j];
                
                // Cas spécial pour "Référence" vs "R f rence"
                if (candidate.toLowerCase().includes('référence') || candidate.toLowerCase().includes('reference')) {
                    if (column.toLowerCase().includes('r') && column.toLowerCase().includes('f') && column.toLowerCase().includes('rence')) {
                        console.log(`✅ Correspondance Orange Money spéciale trouvée: ${candidate} -> ${column}`);
                        console.log(`   Cas spécial: Référence mal encodée`);
                        return column;
                    }
                }
                
                // Cas spécial pour "Compte Orange Money" vs "Compte Orange Money" mal encodé
                if (candidate.toLowerCase().includes('compte') && candidate.toLowerCase().includes('orange')) {
                    if (column.toLowerCase().includes('compte') && column.toLowerCase().includes('orange')) {
                        console.log(`✅ Correspondance Orange Money spéciale trouvée: ${candidate} -> ${column}`);
                        console.log(`   Cas spécial: Compte Orange Money`);
                        return column;
                    }
                }
                
                // Cas spécial pour "Tête de réseau" vs "T te de r seau"
                if (candidate.toLowerCase().includes('tête') || candidate.toLowerCase().includes('tete')) {
                    if (column.toLowerCase().includes('t') && column.toLowerCase().includes('te') && column.toLowerCase().includes('seau')) {
                        console.log(`✅ Correspondance Orange Money spéciale trouvée: ${candidate} -> ${column}`);
                        console.log(`   Cas spécial: Tête de réseau mal encodée`);
                        return column;
                    }
                }
                
                // Cas général pour les caractères mal encodés (é, è, à, etc.)
                const cleanCandidate = candidate.toLowerCase()
                    .replace(/[éèêë]/g, 'e')
                    .replace(/[àâä]/g, 'a')
                    .replace(/[îï]/g, 'i')
                    .replace(/[ôö]/g, 'o')
                    .replace(/[ûùü]/g, 'u')
                    .replace(/[ç]/g, 'c')
                    .replace(/[^a-z0-9]/g, '');
                
                const cleanColumn = column.toLowerCase()
                    .replace(/[éèêë]/g, 'e')
                    .replace(/[àâä]/g, 'a')
                    .replace(/[îï]/g, 'i')
                    .replace(/[ôö]/g, 'o')
                    .replace(/[ûùü]/g, 'u')
                    .replace(/[ç]/g, 'c')
                    .replace(/[^a-z0-9]/g, '');
                
                if (cleanCandidate === cleanColumn && cleanCandidate.length > 0) {
                    console.log(`✅ Correspondance après nettoyage des accents trouvée: ${candidate} -> ${column}`);
                    console.log(`   Nettoyé: "${cleanCandidate}" = "${cleanColumn}"`);
                    return column;
                }
            }
        }

        // PRIORITÉ 5: Gestion spéciale pour les fichiers CIOMCM sans colonne "Reference" explicite
        for (let i = 0; i < candidateKeys.length; i++) {
            const candidate = candidateKeys[i];
            
            // Si on cherche "Reference" mais qu'elle n'existe pas, chercher des alternatives
            if (candidate.toLowerCase().includes('reference') || candidate.toLowerCase().includes('référence')) {
                const availableColumns = Object.keys(data[0]);
                
                // Essayer de trouver une colonne qui pourrait contenir des références
                for (let j = 0; j < availableColumns.length; j++) {
                    const column = availableColumns[j];
                    
                    // Ignorer les colonnes vides ou undefined
                    if (column === 'undefined' || column === '' || column === null) {
                        continue;
                    }
                    
                    // Vérifier si la colonne contient des données qui ressemblent à des références
                    const sampleData = data.slice(0, 5); // Prendre les 5 premières lignes
                    let hasReferenceLikeData = false;
                    
                    for (const row of sampleData) {
                        const value = row[column];
                        if (value && typeof value === 'string') {
                            // Vérifier si la valeur ressemble à une référence (alphanumérique, longueur > 3)
                            if (value.length > 3 && /^[A-Za-z0-9_-]+$/.test(value)) {
                                hasReferenceLikeData = true;
                                break;
                            }
                        }
                    }
                    
                    if (hasReferenceLikeData) {
                        console.log(`✅ Correspondance CIOMCM alternative trouvée: ${candidate} -> ${column}`);
                        console.log(`   Cas spécial: Colonne alternative pour référence CIOMCM`);
                        return column;
                    }
                }
                
                // Si aucune colonne avec des données de référence n'est trouvée, 
                // utiliser la première colonne non-vide qui n'est pas "Compte Orange Money"
                for (let j = 0; j < availableColumns.length; j++) {
                    const column = availableColumns[j];
                    
                    if (column !== 'undefined' && column !== '' && column !== null && 
                        !column.toLowerCase().includes('compte') && 
                        !column.toLowerCase().includes('orange')) {
                        
                        console.log(`✅ Correspondance CIOMCM fallback trouvée: ${candidate} -> ${column}`);
                        console.log(`   Cas spécial: Fallback pour référence CIOMCM`);
                        return column;
                    }
                }
            }
        }

        console.log('❌ Aucune correspondance trouvée');
        console.log('🔍 Détails de debug:');
        console.log('   - Colonnes disponibles:', availableColumns);
        console.log('   - Clés candidates:', candidateKeys);
        console.log('   - Colonnes normalisées:', normalizedColumns);
        console.log('   - Clés candidates normalisées:', normalizedCandidates);
        return null;
    }

    /**
     * Calcule la similarité entre deux chaînes
     */
    private calculateStringSimilarity(str1: string, str2: string): number {
        if (str1 === str2) return 1.0;
        if (str1.length === 0 || str2.length === 0) return 0.0;
        
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    /**
     * Calcule la distance de Levenshtein
     */
    private levenshteinDistance(str1: string, str2: string): number {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }







    canProceedAuto(): boolean {
        return this.autoBoData.length > 0 && this.autoPartnerData.length > 0;
    }

    async onAutoProceed(): Promise<void> {
        if (this.canProceedAuto()) {
            this.loading = true;
            this.errorMessage = '';
            this.successMessage = '';

            console.log('🚀 Démarrage de la réconciliation automatique...');
            console.log('📊 Données BO:', this.autoBoData.length, 'lignes');
            console.log('📊 Données Partenaire:', this.autoPartnerData.length, 'lignes');

            // Récupérer les noms de fichiers
            const boFileName = this.autoBoFile?.name || '';
            const partnerFileName = this.autoPartnerFile?.name || '';

            console.log('🔍 Vérification des modèles de traitement automatique...');
            console.log('📄 Fichier BO:', boFileName);
            console.log('📄 Fichier Partenaire:', partnerFileName);

            try {
                // Détecter intelligemment les clés de réconciliation
                const keyDetectionResult = await this.detectReconciliationKeys(
                    this.autoBoData,
                    this.autoPartnerData,
                    boFileName,
                    partnerFileName
                );

                // Afficher les résultats de la détection
                console.log('🎯 Résultat de la détection des clés:', {
                    boKeyColumn: keyDetectionResult.boKeyColumn,
                    partnerKeyColumn: keyDetectionResult.partnerKeyColumn,
                    source: keyDetectionResult.source,
                    confidence: keyDetectionResult.confidence,
                    modelId: keyDetectionResult.modelId
                });

                // Afficher un message informatif pour le modèle
                const detectionMessage = `✅ Clés trouvées via modèle (${keyDetectionResult.modelId}) - Confiance: ${Math.round(keyDetectionResult.confidence * 100)}%`;
                console.log(detectionMessage);

                // Traiter les données
                let processedBoData = this.autoBoData;
                let processedPartnerData = this.autoPartnerData;

                // Appliquer les boTreatments du modèle
                if (keyDetectionResult.modelId) {
                    try {
                        const models = await this.autoProcessingService.getAllModels();
                        const usedModel = models.find(m => m.id === keyDetectionResult.modelId);
                        
                        if (usedModel && usedModel.reconciliationKeys?.boTreatments) {
                            console.log('🔧 Application des boTreatments du modèle:', usedModel.reconciliationKeys.boTreatments);
                            processedBoData = this.applyBoTreatments(processedBoData, usedModel.reconciliationKeys.boTreatments);
                        }
                    } catch (error) {
                        console.warn('⚠️ Erreur lors de l\'application des boTreatments:', error);
                    }
                }

                // Configurer les colonnes de comparaison
                const comparisonColumns = [{
                    boColumn: keyDetectionResult.boKeyColumn,
                    partnerColumn: keyDetectionResult.partnerKeyColumn
            }];

                    console.log('🔗 Colonnes de comparaison configurées:', comparisonColumns);
                console.log('🔑 Clé BO utilisée:', keyDetectionResult.boKeyColumn);
                console.log('🔑 Clé Partenaire utilisée:', keyDetectionResult.partnerKeyColumn);
                    
            // Créer la requête de réconciliation
                    const reconciliationRequest = {
                        boFileContent: processedBoData,
                        partnerFileContent: processedPartnerData,
                    boKeyColumn: keyDetectionResult.boKeyColumn,
                    partnerKeyColumn: keyDetectionResult.partnerKeyColumn,
                        comparisonColumns: comparisonColumns,
                boColumnFilters: []
            };

            console.log('🔄 Lancement de la réconciliation...');

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

            } catch (error) {
                this.loading = false;
                console.error('❌ Erreur lors de la détection des clés:', error);
                
                // Message d'erreur personnalisé pour le cas où aucun modèle n'est trouvé
                if (error.message.includes('Aucun modèle de réconciliation trouvé')) {
                    this.errorMessage = `🚫 Réconciliation impossible : ${error.message}\n\n💡 Solution : Configurez un modèle de traitement automatique dans la section "Modèles de Traitement" pour les fichiers ${boFileName} et ${partnerFileName}.`;
                } else {
                this.errorMessage = `Erreur lors de la détection des clés: ${error.message}`;
                }
            }
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

    // Méthodes pour l'aide et la configuration des modèles
    goToModelConfiguration(): void {
        console.log('🔧 Navigation vers la configuration des modèles...');
        this.router.navigate(['/auto-processing-models']);
    }

    showModelHelp(): void {
        const helpMessage = `📚 Aide - Configuration des Modèles de Réconciliation

🔧 Pour configurer un modèle de réconciliation :

1. Allez dans "Modèles de Traitement" 
2. Cliquez sur "Créer un nouveau modèle"
3. Configurez :
   - Nom du modèle (ex: "Oppart")
   - Pattern de fichier (ex: "*OPPART*.xls")
   - Type: "partner"
   - Clés de réconciliation :
     * Partner Keys: ["Numero Trans GU"]
     * BO Keys: ["Numero Trans GU"]

💡 Exemple pour vos fichiers :
   - Modèle "Oppart" : Pattern "*OPPART*.xls", Type "partner"
   - Modèle "TRXBO" : Pattern "*TRXBO*.xls", Type "bo"

✅ Une fois configuré, la réconciliation automatique utilisera ces modèles.`;

        this.popupService.showInfo(helpMessage);
    }
} 