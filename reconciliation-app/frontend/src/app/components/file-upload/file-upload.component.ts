import { Component, EventEmitter, Output, ChangeDetectorRef } from '@angular/core';
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
import { ProgressIndicatorService } from '../../services/progress-indicator.service';

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

    reconciliationMode: 'manual' | 'automatic' = 'manual'; // 'super-auto' commenté
    reconciliationType: '1-1' = '1-1'; // Autres types commentés: '1-2' | '1-3' | '1-4' | '1-5'

    boFile: File | null = null;
    partnerFile: File | null = null;
    boData: Record<string, string>[] = [];
    partnerData: Record<string, string>[] = [];
    estimatedTime: string = '';

    // Fichiers pour le mode automatique
    autoBoFile: File | null = null;
    autoPartnerFile: File | null = null;
    autoBoFileName: string = '';
    autoPartnerFileName: string = '';
    autoBoData: Record<string, string>[] = [];
    autoPartnerData: Record<string, string>[] = [];

    // Fichiers pour le mode super auto - COMMENTÉ
    // superAutoBoFile: File | null = null;
    // superAutoPartnerFile: File | null = null;
    // superAutoBoData: Record<string, string>[] = [];
    // superAutoPartnerData: Record<string, string>[] = [];
    // superAutoEstimatedTime: string = '';

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
        private popupService: PopupService,
        private progressIndicatorService: ProgressIndicatorService,
        private cd: ChangeDetectorRef
    ) {
        // Initialiser le type de réconciliation depuis le service (forcé à 1-1)
        const serviceType = this.appStateService.getReconciliationType();
        this.reconciliationType = serviceType === '1-1' ? '1-1' : '1-1'; // Forcer à 1-1
    }

    // onReconciliationTypeChange - COMMENTÉ (seul le type 1-1 est conservé)
    // onReconciliationTypeChange(type: '1-1' | '1-2' | '1-3' | '1-4' | '1-5'): void {
    //     this.reconciliationType = type;
    //     // Sauvegarder le type dans le service
    //     this.appStateService.setReconciliationType(type);
    //     // Réinitialiser les fichiers si on change de type
    //     this.boFile = null;
    //     this.partnerFile = null;
    //     this.boData = [];
    //     this.partnerData = [];
    //     this.estimatedTime = '';
    // }

    // showReconciliationTypeSelector - COMMENTÉ (seul le type 1-1 est conservé)
    // showReconciliationTypeSelector(): void {
    //     // Permettre à l'utilisateur de changer le type de réconciliation
    //     // En changeant temporairement le type pour afficher le sélecteur
    //     this.reconciliationType = '1-2'; // Changer temporairement pour afficher le sélecteur
    // }

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
            
            if (this.reconciliationMode === 'manual') {
                // Mode manuel: pas de traitement automatique
                this.processManualBoFile(this.boFile);
            } else {
                // Mode automatique: utiliser le traitement automatique
                this.processFileWithAutoProcessing(this.boFile, 'bo');
            }
        }
    }

    onPartnerFileSelected(event: Event): void {
        console.log('🎯 onPartnerFileSelected() appelé');
        const input = event.target as HTMLInputElement;
        if (input.files?.length) {
            this.partnerFile = input.files[0];
            console.log('📁 Fichier Partenaire sélectionné:', this.partnerFile.name, 'Taille:', this.partnerFile.size);
            
            if (this.reconciliationMode === 'manual') {
                // Mode manuel: pas de traitement automatique
                this.parseFile(this.partnerFile, false);
            } else {
                // Mode automatique: utiliser le traitement automatique
                this.processFileWithAutoProcessing(this.partnerFile, 'partner');
            }
        }
    }

    // Nouvelle méthode pour traiter le fichier BO en mode manuel avec détection TRXBO
    private processManualBoFile(file: File): void {
        console.log('🔧 Traitement du fichier BO en mode manuel:', file.name);
        
        // En mode manuel, ne pas utiliser le traitement automatique: parser directement le fichier
        this.parseFile(file, true);
        
        // Ensuite, vérifier si c'est un fichier TRXBO et extraire les services
        // On va attendre que les données soient chargées avant de vérifier
        setTimeout(() => {
            if (this.boData && this.boData.length > 0) {
                console.log('🔍 Vérification TRXBO sur les données BO chargées...');
                if (this.detectTRXBOAndExtractServicesForManual(this.boData)) {
                    this.showManualServiceSelectionStep();
                }
            }
        }, 1000); // Attendre 1 seconde pour que les données soient chargées
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
                       `📊 Lignes traitées: ${result.processedData.length}\n\n` +
                       `Les données ont été automatiquement traitées selon le modèle configuré.`;
        
        this.popupService.showSuccess(message, 'Traitement Automatique');
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
        console.log('🔍 filterOrangeMoneyData appelé avec', data.length, 'lignes');
        console.log('📊 Colonnes disponibles avant filtrage:', data.length > 0 ? Object.keys(data[0]) : []);
        
        // Vérifier si c'est un fichier Orange Money avec traitement spécial
        const isOrangeMoneyFile = data.length > 0 && Object.keys(data[0]).some(col => 
            col.toLowerCase().includes('compte orange money') || 
            col.toLowerCase().includes('référence') ||
            col.toLowerCase().includes('reference')
        );
        
        if (isOrangeMoneyFile) {
            console.log('🟠 Fichier Orange Money détecté, préservation de toutes les colonnes');
            
            const filteredData = data.filter(row => {
                // Chercher la colonne "Statut" dans les données
                const statutColumn = Object.keys(row).find(key => 
                    key.toLowerCase().includes('statut') || 
                    key.toLowerCase().includes('status')
                );
                
                if (statutColumn) {
                    const statutValue = row[statutColumn];
                    const shouldKeep = statutValue && statutValue.toString().toLowerCase().includes('succès');
                    if (!shouldKeep) {
                        console.log(`❌ Ligne exclue: statut="${statutValue}" ne contient pas "succès"`);
                    }
                    return shouldKeep;
                }
                
                console.log('⚠️ Aucune colonne Statut trouvée, garder toutes les lignes');
                return true; // Si pas de colonne Statut, garder toutes les lignes
            });
            
            console.log('✅ Filtrage Orange Money terminé:', filteredData.length, 'lignes conservées sur', data.length);
            console.log('📊 Colonnes disponibles après filtrage Orange Money:', filteredData.length > 0 ? Object.keys(filteredData[0]) : []);
            
            return filteredData;
        } else {
            // Traitement normal pour les autres fichiers
            const filteredData = data.filter(row => {
                // Chercher la colonne "Statut" dans les données
                const statutColumn = Object.keys(row).find(key => 
                    key.toLowerCase().includes('statut') || 
                    key.toLowerCase().includes('status')
                );
                
                if (statutColumn) {
                    const statutValue = row[statutColumn];
                    const shouldKeep = statutValue && statutValue.toString().toLowerCase().includes('succès');
                    if (!shouldKeep) {
                        console.log(`❌ Ligne exclue: statut="${statutValue}" ne contient pas "succès"`);
                    }
                    return shouldKeep;
                }
                
                console.log('⚠️ Aucune colonne Statut trouvée, garder toutes les lignes');
                return true; // Si pas de colonne Statut, garder toutes les lignes
            });
            
            console.log('✅ Filtrage normal terminé:', filteredData.length, 'lignes conservées sur', data.length);
            console.log('📊 Colonnes disponibles après filtrage normal:', filteredData.length > 0 ? Object.keys(filteredData[0]) : []);
            
            return filteredData;
        }
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
            console.log('🔍 boData.length:', this.boData.length);
            console.log('🔍 partnerData.length:', this.partnerData.length);
            
            // Appliquer le filtrage sur les données appropriées
            if (isBo && this.boData.length > 0) {
                const originalCount = this.boData.length;
                this.boData = this.filterOrangeMoneyData(this.boData);
                const filteredCount = this.boData.length;
                
                console.log(`✅ Filtrage Orange Money appliqué sur BO: ${filteredCount} lignes avec "Succès" sur ${originalCount} lignes totales`);
                this.showOrangeMoneyFilterNotificationForFileUpload(fileName, 'BO', originalCount, filteredCount);
            } else if (!isBo && this.partnerData.length > 0) {
                const originalCount = this.partnerData.length;
                this.partnerData = this.filterOrangeMoneyData(this.partnerData);
                const filteredCount = this.partnerData.length;
                
                console.log(`✅ Filtrage Orange Money appliqué sur Partenaire: ${filteredCount} lignes avec "Succès" sur ${originalCount} lignes totales`);
                this.showOrangeMoneyFilterNotificationForFileUpload(fileName, 'Partenaire', originalCount, filteredCount);
            } else {
                console.log('⚠️ Aucune donnée disponible pour le filtrage (isBo:', isBo, ', boData.length:', this.boData.length, ', partnerData.length:', this.partnerData.length, ')');
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
        this.popupService.showInfo(message, 'Filtrage Orange Money');
    }

    /**
     * Sélectionne et ordonne les colonnes Orange Money pour correspondre à la logique du menu Traitement
     * Ordre attendu: Référence, Débit, Crédit, N° de Compte, Date, Service, Statut
     * Si le fichier ne semble pas être Orange Money, renvoie les données telles quelles.
     * EXCEPTION: Le fichier PMOMBF ne doit pas utiliser les colonnes par défaut Orange Money.
     */
    private applyOrangeMoneyColumnSelection<T extends Record<string, any>>(rows: T[], fileName?: string): T[] {
        if (!rows || rows.length === 0) return rows;

        const startTime = performance.now();
        const isLargeDataset = rows.length > 100000;
        console.log(`🔄 [APPLY_OM] Début de applyOrangeMoneyColumnSelection pour ${rows.length} enregistrements (fichier volumineux: ${isLargeDataset})`);

        // Pour les gros datasets, normaliser par chunks pour éviter de bloquer l'UI
        let normalizedRows: T[];
        if (isLargeDataset) {
            console.log(`📦 [APPLY_OM] Normalisation par chunks pour éviter le blocage de l'UI...`);
            const normalizeStartTime = performance.now();
            const CHUNK_SIZE = 50000;
            normalizedRows = [] as T[];
            
            for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
                const chunk = rows.slice(i, i + CHUNK_SIZE);
                const normalizedChunk = chunk.map(row => {
                    const normalizedRow: Record<string, any> = {};
                    Object.keys(row).forEach(key => {
                        const normalizedKey = this.normalizeColumnName(key);
                        normalizedRow[normalizedKey] = row[key];
                    });
                    return normalizedRow as T;
                });
                normalizedRows.push(...normalizedChunk);
                
                // Logger la progression tous les 100k enregistrements
                if ((i + CHUNK_SIZE) % 100000 === 0 || i + CHUNK_SIZE >= rows.length) {
                    const progress = ((i + CHUNK_SIZE) / rows.length * 100).toFixed(1);
                    const duration = ((performance.now() - normalizeStartTime) / 1000).toFixed(2);
                    console.log(`📊 [APPLY_OM] Normalisation: ${progress}% (${Math.min(i + CHUNK_SIZE, rows.length)}/${rows.length} enregistrements, ${duration}s)`);
                }
                
                // Petite pause pour permettre à l'UI de se mettre à jour (sans await car fonction synchrone)
                // Utiliser setTimeout de manière synchrone n'est pas possible, donc on continue
                // La pause sera gérée par le traitement par chunks lui-même
            }
            const normalizeDuration = ((performance.now() - normalizeStartTime) / 1000).toFixed(2);
            console.log(`✅ [APPLY_OM] Normalisation terminée en ${normalizeDuration}s`);
        } else {
            // Normaliser les colonnes dans les données d'abord
            const normalizeStartTime = performance.now();
            normalizedRows = rows.map(row => {
                const normalizedRow: Record<string, any> = {};
                Object.keys(row).forEach(key => {
                    const normalizedKey = this.normalizeColumnName(key);
                    normalizedRow[normalizedKey] = row[key];
                });
                return normalizedRow as T;
            });
            const normalizeDuration = ((performance.now() - normalizeStartTime) / 1000).toFixed(2);
            console.log(`✅ [APPLY_OM] Normalisation terminée en ${normalizeDuration}s`);
        }

        const headers = Object.keys(normalizedRows[0]);
        console.log('🔍 [APPLY_OM] Colonnes d\'entrée (normalisées):', headers);
        console.log('🔍 [APPLY_OM] Nom du fichier:', fileName);
        
        const lower = (s: string) => s.toLowerCase();

        // EXCEPTION: Le fichier PMOMBF ne doit pas utiliser les colonnes par défaut Orange Money
        if (fileName && lower(fileName).includes('pmombf')) {
            console.log('🚫 Exception PMOMBF détectée - retour des données originales sans transformation Orange Money');
            return normalizedRows;
        }

        // Détection d'un fichier Orange Money basée sur la présence de colonnes clés
        const looksLikeOM = headers.some(h => lower(h).includes('référence') || lower(h).includes('reference'))
            && headers.some(h => lower(h).includes('statut') || lower(h).includes('status'))
            && headers.some(h => lower(h).includes('date'));

        console.log('🔍 Détection Orange Money:', looksLikeOM);
        
        if (!looksLikeOM) {
            console.log('✅ Fichier non-Orange Money détecté, retour des données originales (normalisées)');
            return normalizedRows;
        }

        const targetOrder = [
            'Référence',
            'Débit',
            'Crédit',
            'N° de Compte',
            'Date',
            'Service',
            'Statut'
        ];

        // Fonction de matching souple inspirée de la logique du menu Traitement
        const findColumn = (target: string): string | null => {
            const targetLower = target.toLowerCase();
            // Correspondance exacte d'abord
            const exact = headers.find(h => h === target);
            if (exact) return exact;

            // Correspondances partielles spécifiques
            for (const h of headers) {
                const hLower = lower(h);
                if (target === 'Référence' && (hLower.includes('référence') || hLower.includes('reference'))) return h;
                if (target === 'Débit' && hLower.includes('débit')) return h;
                if (target === 'Crédit' && hLower.includes('crédit')) return h;
                if (target === 'N° de Compte' && ((hLower.includes('n°') || hLower.includes('no') || hLower.includes('nº')) && hLower.includes('compte'))) return h;
                if (target === 'Date' && hLower.includes('date')) return h;
                if (target === 'Service' && hLower.includes('service')) return h;
                if (target === 'Statut' && (hLower.includes('statut') || hLower.includes('status'))) return h;
            }
            return null;
        };

        const mappedColumns: (string | null)[] = targetOrder.map(findColumn);
        console.log(`🔍 [APPLY_OM] Colonnes mappées:`, mappedColumns);

        // Si aucune correspondance pertinente, ne pas altérer
        if (mappedColumns.every(c => c === null)) {
            console.log(`✅ [APPLY_OM] Aucune correspondance Orange Money, retour des données normalisées`);
            const totalDuration = ((performance.now() - startTime) / 1000).toFixed(2);
            console.log(`✅ [APPLY_OM] Processus complet terminé en ${totalDuration}s`);
            return normalizedRows;
        }

        // Recomposer les lignes avec uniquement les colonnes cibles, dans l'ordre
        console.log(`🔄 [APPLY_OM] Début du remapping des colonnes...`);
        const remapStartTime = performance.now();
        
        let remapped: T[];
        if (isLargeDataset) {
            // Pour les gros datasets, remapper par chunks
            console.log(`📦 [APPLY_OM] Remapping par chunks...`);
            const REMAP_CHUNK_SIZE = 50000;
            remapped = [] as T[];
            
            for (let i = 0; i < normalizedRows.length; i += REMAP_CHUNK_SIZE) {
                const chunk = normalizedRows.slice(i, i + REMAP_CHUNK_SIZE);
                const remappedChunk = chunk.map(row => {
                    const obj: any = {};
                    mappedColumns.forEach((col, idx) => {
                        const targetName = targetOrder[idx];
                        if (col && Object.prototype.hasOwnProperty.call(row, col)) {
                            obj[targetName] = row[col];
                        } else {
                            obj[targetName] = '';
                        }
                    });
                    return obj as T;
                });
                remapped.push(...remappedChunk);
                
                // Logger la progression
                if ((i + REMAP_CHUNK_SIZE) % 100000 === 0 || i + REMAP_CHUNK_SIZE >= normalizedRows.length) {
                    const progress = ((i + REMAP_CHUNK_SIZE) / normalizedRows.length * 100).toFixed(1);
                    const duration = ((performance.now() - remapStartTime) / 1000).toFixed(2);
                    console.log(`📊 [APPLY_OM] Remapping: ${progress}% (${Math.min(i + REMAP_CHUNK_SIZE, normalizedRows.length)}/${normalizedRows.length} enregistrements, ${duration}s)`);
                }
            }
        } else {
            remapped = normalizedRows.map(row => {
                const obj: any = {};
                mappedColumns.forEach((col, idx) => {
                    const targetName = targetOrder[idx];
                    if (col && Object.prototype.hasOwnProperty.call(row, col)) {
                        obj[targetName] = row[col];
                    } else {
                        obj[targetName] = '';
                    }
                });
                return obj as T;
            });
        }
        
        const remapDuration = ((performance.now() - remapStartTime) / 1000).toFixed(2);
        const totalDuration = ((performance.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ [APPLY_OM] Remapping terminé en ${remapDuration}s`);
        console.log(`✅ [APPLY_OM] Processus complet terminé en ${totalDuration}s: ${remapped.length} enregistrements`);

        return remapped;
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
                this.parseLargeCSV(lines, isBo, file.name);
            } else {
                // Parsing normal pour petits fichiers avec détection automatique du délimiteur
                const delimiter = this.detectDelimiter(lines[0]);
                console.log(`🔍 Délimiteur détecté: "${delimiter}"`);
                
                // Détection Orange Money
                const orangeMoneyDetection = this.detectOrangeMoneyFile(text, delimiter);
                console.log(`🟠 Détection Orange Money:`, orangeMoneyDetection);
                
                if (orangeMoneyDetection.isOrangeMoney) {
                    console.log(`🟠 Fichier Orange Money détecté, traitement spécial`);
                    
                    // Traitement spécial pour les fichiers Orange Money
                    Papa.parse(text, {
                        header: false,
                        delimiter: delimiter,
                        skipEmptyLines: true,
                        complete: (results) => {
                            const rawRows = results.data as any[];
                            console.log(`📊 Données Excel brutes: ${rawRows.length} lignes`);
                            
                            if (rawRows.length > orangeMoneyDetection.headerRowIndex) {
                                const headerRow = orangeMoneyDetection.headerRow;
                                const dataRows = rawRows.slice(orangeMoneyDetection.headerRowIndex + 1);
                                // Normaliser les noms de colonnes (corriger l'encodage)
                                const colNames = headerRow.map((v: any, i: number) => {
                                    const header = v ? v.toString() : 'Col' + (i+1);
                                    return this.normalizeColumnName(header);
                                });
                                
                                console.log(`✅ En-têtes détectés à la ligne ${orangeMoneyDetection.headerRowIndex}:`, colNames);
                                
                                // Créer les lignes de données avec les en-têtes corrects
                                const processedRows: any[] = [];
                                for (const rowData of dataRows) {
                                    if (!rowData || rowData.length === 0) continue;
                                    
                                    const row: any = {};
                                    colNames.forEach((header: string, index: number) => {
                                        const value = rowData[index];
                                        row[header] = value !== undefined && value !== null ? this.normalizeValue(value) : '';
                                    });
                                    processedRows.push(row);
                                }
                                
                                console.log(`📊 Lignes de données créées: ${processedRows.length}`);
                                
                                if (isBo) {
                                    this.boData = this.applyOrangeMoneyColumnSelection(this.normalizeData(processedRows), file.name);
                                } else {
                                    this.partnerData = this.applyOrangeMoneyColumnSelection(this.normalizeData(this.convertDebitCreditToNumber(processedRows)), file.name);
                                }
                                
                                console.log(`✅ Fichier Excel traité: ${isBo ? this.boData.length : this.partnerData.length} lignes`);
                                // Forcer la détection des changements
                                this.cd.detectChanges();
                                
                                // Appliquer le filtrage automatique Orange Money si nécessaire
                                this.applyAutomaticOrangeMoneyFilterForFileUpload(file.name, isBo);
                            }
                        },
                        error: (error: any) => {
                            console.error('Erreur lors de la lecture du fichier CSV Orange Money:', error);
                        }
                    });
                } else {
                    // Traitement normal pour les autres fichiers
                    Papa.parse(text, {
                        header: true,
                        delimiter: delimiter,
                        skipEmptyLines: true,
                        transformHeader: (header: string) => {
                            // Normaliser les noms de colonnes (corriger l'encodage)
                            return this.normalizeColumnName(header);
                        },
                        transform: (value: string) => {
                            // Normaliser les valeurs
                            return this.normalizeValue(value);
                        },
                        complete: (results) => {
                            console.log('Première ligne lue:', results.data[0]);
                            const rawData = results.data as Record<string, string>[];
                            console.log('📊 Colonnes détectées dans le CSV (avant normalisation):', rawData.length > 0 ? Object.keys(rawData[0]) : []);
                            
                            // Normaliser les noms de colonnes dans les données (au cas où transformHeader n'aurait pas fonctionné)
                            const normalizedData = rawData.map(row => {
                                const normalizedRow: Record<string, string> = {};
                                Object.keys(row).forEach(key => {
                                    const normalizedKey = this.normalizeColumnName(key);
                                    normalizedRow[normalizedKey] = row[key];
                                });
                                return normalizedRow;
                            });
                            
                            console.log('📊 Colonnes après normalisation:', normalizedData.length > 0 ? Object.keys(normalizedData[0]) : []);
                            console.log('📊 Données brutes CSV:', normalizedData.length, 'lignes');
                            
                            // Vérifier si les colonnes semblent être des données au lieu d'en-têtes
                            const firstRowKeys = Object.keys(normalizedData[0] || {});
                            const hasValidHeaders = this.hasValidHeaders(firstRowKeys);
                            
                            if (!hasValidHeaders && normalizedData.length > 0) {
                                console.log('⚠️ En-têtes invalides détectés, tentative de parsing sans en-têtes');
                                this.parseCSVWithoutHeaders(text, delimiter, isBo, file.name);
                                return;
                            }
                            
                            if (isBo) {
                                this.boData = this.applyOrangeMoneyColumnSelection(this.normalizeData(normalizedData), file.name);
                                console.log('📊 Données BO après traitement:', this.boData.length, 'lignes');
                                console.log('📊 Colonnes BO après traitement:', this.boData.length > 0 ? Object.keys(this.boData[0]) : []);
                            } else {
                                this.partnerData = this.applyOrangeMoneyColumnSelection(this.normalizeData(this.convertDebitCreditToNumber(normalizedData)), file.name);
                                console.log('📊 Données Partenaire après traitement:', this.partnerData.length, 'lignes');
                                console.log('📊 Colonnes Partenaire après traitement:', this.partnerData.length > 0 ? Object.keys(this.partnerData[0]) : []);
                            }
                            // Mettre à jour l'estimation seulement si les deux fichiers sont chargés
                            if (this.boFile && this.partnerFile) {
                                this.updateEstimatedTime();
                            }
                            // Forcer la détection des changements
                            this.cd.detectChanges();
                        },
                        error: (error: any) => {
                            console.error('Erreur lors de la lecture du fichier CSV:', error);
                        }
                    });
                }
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
     * Détecte si un fichier est un fichier Orange Money et trouve la ligne d'en-tête
     */
    private detectOrangeMoneyFile(content: string, delimiter: string): {
        isOrangeMoney: boolean;
        headerRowIndex: number;
        headerRow: string[];
    } {
        console.log('🔍 Détection ciblée des en-têtes Excel - Nouvelle approche');
        
        const lines = content.split('\n').filter(line => line.trim());
        let bestHeaderRowIndex = -1;
        let bestScore = -1;
        let bestHeaderRow: string[] = [];
        
        // NOUVELLE APPROCHE : Chercher d'abord à la ligne 23 (ligne spécifique) mais vérifier que ce sont des en-têtes
        console.log('🎯 ÉTAPE 1: Recherche ciblée à la ligne 23');
        
        // Vérifier si la ligne 23 existe
        if (lines.length > 22) {
            const line23 = lines[22]; // Index 22 = ligne 23
            const cells23 = line23.split(delimiter).map(cell => cell.trim());
            const rowStrings23 = cells23.map(cell => cell.toString());
            const nonEmptyColumns23 = rowStrings23.filter(cell => cell && cell !== '').length;
            
            console.log(`🔍 Ligne 23 - Données brutes:`, cells23);
            console.log(`🔍 Ligne 23 - Colonnes non vides: ${nonEmptyColumns23}`);
            
            // Vérifier si la ligne 23 contient des en-têtes valides (pas des données)
            const hasValidHeaders = this.hasValidHeaders(rowStrings23);
            
            // Si la ligne 23 a beaucoup de colonnes ET contient des en-têtes valides
            // ET que ce ne sont PAS des données (vérification stricte)
            if (nonEmptyColumns23 >= 10 && hasValidHeaders) {
                console.log('✅ Ligne 23 trouvée avec suffisamment de colonnes et en-têtes valides!');
                return {
                    isOrangeMoney: true,
                    headerRowIndex: 22, // Index 22 = ligne 23
                    headerRow: cells23
                };
            } else {
                if (!hasValidHeaders) {
                    console.log('❌ Ligne 23 contient des données au lieu d\'en-têtes, recherche dans les premières lignes');
                } else {
                    console.log('⚠️ Ligne 23 n\'a pas assez de colonnes, recherche dans les 50 premières lignes');
                }
            }
        } else {
            console.log('⚠️ Ligne 23 n\'existe pas, recherche dans les 50 premières lignes');
        }
        
        // ÉTAPE 2: Si ligne 23 pas trouvée, chercher dans les 50 premières lignes
        console.log('🎯 ÉTAPE 2: Recherche dans les 50 premières lignes');
        
        for (let i = 0; i < Math.min(50, lines.length); i++) {
            const line = lines[i];
            const cells = line.split(delimiter).map(cell => cell.trim());
            
            // Calculer un score pour cette ligne
            let score = 0;
            let nonEmptyColumns = 0;
            
            const rowStrings = cells.map(cell => cell.toString());
            
            // Compter les colonnes non vides
            nonEmptyColumns = rowStrings.filter(cell => cell && cell !== '').length;
            
            // Mots-clés typiques des en-têtes Orange Money
            const headerKeywords = [
                'N°', 'Date', 'Heure', 'Référence', 'Opération', 'Agent', 'Correspondant',
                'Montant', 'Commissions', 'Service', 'Paiement', 'Statut', 'Mode',
                'Compte', 'Wallet', 'Pseudo', 'Débit', 'Crédit', 'Sous-réseau',
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
            
            // Vérifier si cette ligne contient des en-têtes valides (CRITÈRE CRITIQUE)
            const hasValidHeaders = this.hasValidHeaders(rowStrings);
            
            // PÉNALITÉ MAJEURE si la ligne ressemble à des données
            if (!hasValidHeaders) {
                score -= 1000; // Pénalité massive pour rejeter les lignes de données
                console.log(`❌ Ligne ${i} rejetée: contient des données au lieu d'en-têtes`);
            }
            
            // Bonus pour avoir plusieurs colonnes non vides (critère important pour Orange Money)
            // MAIS seulement si ce sont de vrais en-têtes
            if (hasValidHeaders) {
                if (nonEmptyColumns >= 10) {
                    score += 50; // Bonus très important pour les vraies lignes d'en-tête
                }
                
                if (nonEmptyColumns >= 15) {
                    score += 100; // Bonus maximum pour les vraies lignes d'en-tête
                }
            }
            
            // Pénalité pour les lignes avec peu de colonnes non vides
            if (nonEmptyColumns < 5) {
                score -= 20;
            }
            
            // Bonus pour les lignes qui contiennent "N°" ET "Référence" (critère spécifique Orange Money)
            const hasNColumn = rowStrings.some(cell => cell && (cell.includes('N°') || cell === 'N'));
            const hasReferenceColumn = rowStrings.some(cell => cell && cell.toLowerCase().includes('référence'));
            if (hasNColumn && hasReferenceColumn) {
                score += 100; // Bonus très important pour les vraies lignes d'en-tête Orange Money
            }
            
            // Bonus pour les lignes qui contiennent "N°" ET "Date" ET "Heure" (critère très spécifique Orange Money)
            const hasDateColumn = rowStrings.some(cell => cell && cell.toLowerCase().includes('date'));
            const hasHeureColumn = rowStrings.some(cell => cell && cell.toLowerCase().includes('heure'));
            if (hasNColumn && hasDateColumn && hasHeureColumn) {
                score += 200; // Bonus maximum pour les vraies lignes d'en-tête Orange Money
            }
            
            // Bonus pour les lignes qui contiennent "N°" ET "Date" ET "Heure" ET "Référence" (critère ultra spécifique)
            if (hasNColumn && hasDateColumn && hasHeureColumn && hasReferenceColumn) {
                score += 500; // Bonus ultra maximum pour les vraies lignes d'en-tête Orange Money
            }
            
            // Bonus pour les premières lignes (plus probable d'être des en-têtes)
            if (i <= 20) {
                score += 10;
            }
            
            console.log(`🔍 Ligne ${i} - Données brutes:`, cells);
            console.log(`🔍 Ligne ${i} - Après conversion:`, cells);
            console.log(`🔍 Ligne ${i}: score=${score}, colonnes=${nonEmptyColumns}`);
            
            if (score > bestScore) {
                bestScore = score;
                bestHeaderRowIndex = i;
                bestHeaderRow = cells;
                console.log(`⭐ Nouveau meilleur en-tête trouvé à la ligne ${i} avec score ${score}`);
            }
        }
        
        console.log(`🔍 Meilleur en-tête trouvé à la ligne ${bestHeaderRowIndex} avec score ${bestScore}`);
        console.log(`🔍 En-tête détecté:`, bestHeaderRow);
        
        // Vérifier que le meilleur en-tête trouvé est vraiment valide
        // (score > 0 signifie qu'il a passé la validation hasValidHeaders)
        const isValidResult = bestScore > 0 && bestHeaderRowIndex >= 0 && bestHeaderRow.length > 0;
        
        if (!isValidResult) {
            console.warn('⚠️ Aucun en-tête valide trouvé dans les 50 premières lignes');
        }
        
        return {
            isOrangeMoney: isValidResult,
            headerRowIndex: isValidResult ? bestHeaderRowIndex : -1,
            headerRow: isValidResult ? bestHeaderRow : []
        };
    }

    /**
     * Méthode simple qui retourne les données sans modification
     */
    private normalizeData(data: Record<string, string>[]): Record<string, string>[] {
        return data;
    }

    /**
     * Normalise un nom de colonne en corrigeant l'encodage et en nettoyant les caractères
     */
    private normalizeColumnName(columnName: string): string {
        if (!columnName) return '';
        
        // Nettoyer les espaces d'abord
        let normalized = columnName.trim();
        
        // Supprimer les guillemets
        if ((normalized.startsWith('"') && normalized.endsWith('"')) ||
            (normalized.startsWith("'") && normalized.endsWith("'"))) {
            normalized = normalized.slice(1, -1);
        }
        
        // Nettoyer les caractères invisibles (BOM, etc.)
        normalized = normalized.replace(/[\u200B-\u200D\uFEFF]/g, '');
        
        // Corriger les caractères mal encodés (é, è, à, etc.) - IMPORTANT: après le nettoyage
        normalized = fixGarbledCharacters(normalized);
        
        // Remplacer les espaces multiples par un seul
        normalized = normalized.replace(/\s+/g, ' ');
        
        return normalized.trim();
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

    private parseLargeCSV(lines: string[], isBo: boolean, fileName: string): void {
        const parseStartTime = performance.now();
        const CHUNK_SIZE = 10000;
        const data: Record<string, string>[] = [];
        
        console.log(`📦 [PARSE_LARGE] Début du parsing optimisé pour ${fileName}`);
        console.log(`📊 [PARSE_LARGE] Nombre de lignes: ${lines.length}`);
        console.log(`📊 [PARSE_LARGE] Taille de chunk: ${CHUNK_SIZE} lignes`);
        
        // Activer l'indicateur de progression
        this.isProcessingLargeFile = true;
        this.processingMessage = 'Traitement du fichier volumineux...';
        this.processingProgress = 0;
        
        // Détecter le délimiteur et les en-têtes
        const detectStartTime = performance.now();
        const firstLine = lines[0];
        const delimiter = this.detectDelimiter(firstLine);
        const headers = firstLine.split(delimiter);
        const detectDuration = ((performance.now() - detectStartTime) / 1000).toFixed(3);
        
        console.log(`🔧 [PARSE_LARGE] Parsing optimisé: délimiteur "${delimiter}", ${headers.length} colonnes (${detectDuration}s)`);
        
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
        
        const parseEndTime = performance.now();
        const parseDuration = ((parseEndTime - parseStartTime) / 1000).toFixed(2);
        console.log(`✅ [PARSE_LARGE] Parsing terminé en ${parseDuration}s: ${data.length} lignes traitées`);
        console.log(`📊 [PARSE_LARGE] Taille mémoire approximative: ${(JSON.stringify(data).length / (1024 * 1024)).toFixed(2)} MB`);
        
        // Désactiver l'indicateur de progression
        this.isProcessingLargeFile = false;
        this.processingProgress = 0;
        this.processingMessage = '';
        
        // Traitement des données avec logs
        console.log(`🔄 [PARSE_LARGE] Début du traitement post-parsing...`);
        const postProcessStartTime = performance.now();
        
        try {
            if (isBo) {
                console.log(`🔄 [PARSE_LARGE] Application de applyOrangeMoneyColumnSelection pour BO...`);
                const selectionStartTime = performance.now();
                this.boData = this.applyOrangeMoneyColumnSelection(data, fileName);
                const selectionDuration = ((performance.now() - selectionStartTime) / 1000).toFixed(2);
                console.log(`✅ [PARSE_LARGE] applyOrangeMoneyColumnSelection terminé en ${selectionDuration}s: ${this.boData.length} enregistrements`);
            } else {
                console.log(`🔄 [PARSE_LARGE] Conversion débit/crédit pour Partenaire...`);
                const convertStartTime = performance.now();
                const convertedData = this.convertDebitCreditToNumber(data);
                const convertDuration = ((performance.now() - convertStartTime) / 1000).toFixed(2);
                console.log(`✅ [PARSE_LARGE] Conversion terminée en ${convertDuration}s`);
                
                console.log(`🔄 [PARSE_LARGE] Application de applyOrangeMoneyColumnSelection pour Partenaire...`);
                const selectionStartTime = performance.now();
                this.partnerData = this.applyOrangeMoneyColumnSelection(convertedData, fileName);
                const selectionDuration = ((performance.now() - selectionStartTime) / 1000).toFixed(2);
                console.log(`✅ [PARSE_LARGE] applyOrangeMoneyColumnSelection terminé en ${selectionDuration}s: ${this.partnerData.length} enregistrements`);
            }
            
            const postProcessDuration = ((performance.now() - postProcessStartTime) / 1000).toFixed(2);
            console.log(`✅ [PARSE_LARGE] Traitement post-parsing terminé en ${postProcessDuration}s`);
            
            // Mettre à jour l'estimation seulement si les deux fichiers sont chargés
            if (this.boFile && this.partnerFile) {
                console.log(`🔄 [PARSE_LARGE] Mise à jour de l'estimation du temps...`);
                const estimateStartTime = performance.now();
                this.updateEstimatedTime();
                const estimateDuration = ((performance.now() - estimateStartTime) / 1000).toFixed(2);
                console.log(`✅ [PARSE_LARGE] Estimation mise à jour en ${estimateDuration}s`);
            }
            
            // Forcer la détection des changements
            console.log(`🔄 [PARSE_LARGE] Détection des changements...`);
            this.cd.detectChanges();
            console.log(`✅ [PARSE_LARGE] Processus complet terminé`);
            
        } catch (error) {
            const errorTime = performance.now();
            const errorDuration = ((errorTime - postProcessStartTime) / 1000).toFixed(2);
            console.error(`❌ [PARSE_LARGE] Erreur lors du traitement post-parsing après ${errorDuration}s:`, error);
            console.error(`❌ [PARSE_LARGE] Détails de l'erreur:`, {
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : 'N/A',
                dataLength: data.length,
                isBo: isBo
            });
            throw error;
        }
    }

    private detectDelimiter(line: string): string {
        const delimiters = [';', ',', '\t', '|'];
        let bestDelimiter = ';'; // Délimiteur par défaut
        let maxCount = 0;
        
        for (const delimiter of delimiters) {
            const count = (line.match(new RegExp('\\' + delimiter, 'g')) || []).length;
            if (count > maxCount) {
                maxCount = count;
                bestDelimiter = delimiter;
            }
        }
        
        console.log(`🔍 Détection délimiteur: "${bestDelimiter}" (${maxCount} occurrences)`);
        return bestDelimiter;
    }

    /**
     * Vérifie si les clés semblent être des en-têtes valides plutôt que des données
     */
    private hasValidHeaders(keys: string[]): boolean {
        if (!keys || keys.length === 0) return false;
        
        // Filtrer les clés vides et les colonnes génériques
        const nonEmptyKeys = keys.filter(key => key && key.trim() !== '' && !key.startsWith('Col'));
        
        if (nonEmptyKeys.length === 0) return false;
        
        // Patterns de données à rejeter (plus stricts)
        const dataPatterns = [
            /^\d{8,}$/, // Numéros longs (IDs, téléphones, etc.) - 8 chiffres ou plus
            /^\d{4}-\d{2}-\d{2}/, // Dates
            /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/, // Dates avec heures
            /^\d+\.\d+$/, // Nombres décimaux simples
            /^[a-z0-9-]{10,}$/i, // Codes/identifiants alphanumériques longs (ex: cos-20w0wph3r2a1t)
            /^0\d{9}$/, // Numéros de téléphone (10 chiffres commençant par 0)
            /^[A-Z]{2,}_[A-Z0-9_]+$/i, // Codes en majuscules avec underscores (ex: CI_PAIEMENTWAVE_LONACI)
            /^[A-Z]{3,}$/, // Codes en majuscules (ex: CASH, API)
            /^Col\d+$/, // Colonnes génériques
            /^Successful$/, // Statuts
            /^Cash in$/, // Types de transaction
            /^Cash out$/, // Types de transaction
            /^FRI:\d+\/MSISDN$/, // Références Orange Money
            /^ID:\d+\/(MM|MSISDN|USER)$/, // IDs Orange Money
            /^INTOUCH CASHIN CASHOUT$/, // Services Orange Money
            /^INTOUCH PAYMENT$/, // Services Orange Money
            /^depot\s+\d+\s+\d+$/, // Descriptions de dépôt
            /^Un paiement de \d+ XAF/, // Descriptions de paiement
            /^-\d+$/, // Montants négatifs
            /^XAF$/, // Devises
            /^Debit$/, // Types de transaction
            /^PC0_\d+$/, // Codes de transaction
            /^null$/i, // Valeurs null
            /^\d{13,}$/, // Timestamps longs
        ];
        
        // Patterns d'en-têtes valides (mots-clés typiques)
        const headerPatterns = [
            /^(N°|Numéro|Number|ID|Id)$/i,
            /^(Date|Heure|Time|Timestamp)$/i,
            /^(Référence|Reference|Ref)$/i,
            /^(Montant|Amount|Somme)$/i,
            /^(Opération|Operation|Transaction)$/i,
            /^(Agent|Correspondant|Correspondent)$/i,
            /^(Service|Type|Category)$/i,
            /^(Statut|Status|État|State)$/i,
            /^(Compte|Account|Wallet)$/i,
            /^(Téléphone|Phone|Tel)$/i,
            /^(Description|Libellé|Label)$/i,
            /^(Colonne|Column|Champ|Field)$/i,
        ];
        
        // Compter les correspondances avec les patterns de données
        const dataMatches = nonEmptyKeys.filter(key => 
            dataPatterns.some(pattern => pattern.test(key.trim()))
        ).length;
        
        // Compter les correspondances avec les patterns d'en-têtes
        const headerMatches = nonEmptyKeys.filter(key => 
            headerPatterns.some(pattern => pattern.test(key.trim()))
        ).length;
        
        // Calculer le ratio de données vs en-têtes
        const dataRatio = dataMatches / nonEmptyKeys.length;
        const headerRatio = headerMatches / nonEmptyKeys.length;
        
        // Critères de rejet (plus stricts)
        // 1. Si plus de 40% des clés sont des données, c'est probablement une ligne de données
        // 2. Si moins de 10% des clés sont des en-têtes valides, c'est probablement une ligne de données
        // 3. Si on a beaucoup de numéros longs ou de codes, c'est probablement des données
        const hasManyDataPatterns = dataRatio > 0.4;
        const hasFewHeaders = headerRatio < 0.1;
        const hasManyLongNumbers = nonEmptyKeys.filter(k => /^\d{8,}$/.test(k.trim())).length > nonEmptyKeys.length * 0.3;
        const hasManyCodes = nonEmptyKeys.filter(k => /^[A-Z0-9_-]{8,}$/i.test(k.trim())).length > nonEmptyKeys.length * 0.3;
        
        const isDataLike = hasManyDataPatterns || (hasFewHeaders && (hasManyLongNumbers || hasManyCodes));
        
        console.log('🔍 Validation des en-têtes:', {
            keys: keys.slice(0, 10), // Afficher les 10 premiers
            nonEmptyKeys: nonEmptyKeys.slice(0, 10),
            dataMatches,
            headerMatches,
            dataRatio: (dataRatio * 100).toFixed(1) + '%',
            headerRatio: (headerRatio * 100).toFixed(1) + '%',
            nonEmptyKeysCount: nonEmptyKeys.length,
            totalKeys: keys.length,
            hasManyDataPatterns,
            hasFewHeaders,
            hasManyLongNumbers,
            hasManyCodes,
            isDataLike,
            result: !isDataLike ? '✅ EN-TÊTES VALIDES' : '❌ DONNÉES DÉTECTÉES'
        });
        
        return !isDataLike;
    }

    /**
     * Parse un fichier CSV sans en-têtes en générant des noms de colonnes
     * Essaie d'abord de trouver une vraie ligne d'en-tête dans les premières lignes
     */
    private parseCSVWithoutHeaders(text: string, delimiter: string, isBo: boolean, fileName: string): void {
        console.log('🔧 Parsing CSV sans en-têtes - Recherche d\'une ligne d\'en-tête valide');
        
        Papa.parse(text, {
            header: false,
            delimiter: delimiter,
            skipEmptyLines: true,
            complete: (results) => {
                const rawRows = results.data as any[][];
                console.log('📊 Lignes brutes sans en-têtes:', rawRows.length);
                
                if (rawRows.length === 0) {
                    console.log('⚠️ Aucune donnée trouvée');
                    return;
                }
                
                // Chercher une vraie ligne d'en-tête dans les 20 premières lignes
                let headerRowIndex = -1;
                let headers: string[] = [];
                
                for (let i = 0; i < Math.min(20, rawRows.length); i++) {
                    const row = rawRows[i];
                    if (!row || row.length === 0) continue;
                    
                    const rowStrings = row.map(cell => String(cell || '').trim());
                    if (this.hasValidHeaders(rowStrings)) {
                        headerRowIndex = i;
                        headers = rowStrings.map((h, idx) => {
                            const normalized = this.normalizeColumnName(h);
                            return normalized || `Colonne_${idx + 1}`;
                        });
                        console.log(`✅ Ligne d'en-tête trouvée à la ligne ${i + 1}:`, headers);
                        break;
                    }
                }
                
                // Si aucune ligne d'en-tête valide trouvée, générer des noms de colonnes
                if (headerRowIndex === -1) {
                    const firstRow = rawRows[0];
                    const columnCount = firstRow ? firstRow.length : 0;
                    headers = Array.from({ length: columnCount }, (_, i) => `Colonne_${i + 1}`);
                    headerRowIndex = 0; // Utiliser la première ligne comme données
                    console.log('⚠️ Aucune ligne d\'en-tête valide trouvée, génération de noms génériques:', headers);
                }
                
                console.log('📊 En-têtes utilisés:', headers);
                
                // Créer les lignes de données avec les en-têtes trouvés ou générés
                const processedRows: any[] = [];
                const dataStartIndex = headerRowIndex + 1; // Commencer après la ligne d'en-tête
                
                for (let i = dataStartIndex; i < rawRows.length; i++) {
                    const rowData = rawRows[i];
                    if (!rowData || rowData.length === 0) continue;
                    
                    const row: any = {};
                    headers.forEach((header: string, index: number) => {
                        const value = rowData[index];
                        row[header] = value !== undefined && value !== null ? String(value).trim() : '';
                    });
                    processedRows.push(row);
                }
                
                console.log('📊 Lignes de données créées:', processedRows.length);
                
                if (isBo) {
                    this.boData = this.applyOrangeMoneyColumnSelection(this.normalizeData(processedRows), fileName);
                } else {
                    this.partnerData = this.applyOrangeMoneyColumnSelection(this.normalizeData(this.convertDebitCreditToNumber(processedRows)), fileName);
                }
                
                // Mettre à jour l'estimation seulement si les deux fichiers sont chargés
                if (this.boFile && this.partnerFile) {
                    this.updateEstimatedTime();
                }
                // Forcer la détection des changements
                this.cd.detectChanges();
            },
            error: (error: any) => {
                console.error('Erreur lors de la lecture du fichier CSV sans en-têtes:', error);
            }
        });
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
                
                // Vérifier si c'est un fichier Orange Money
                const isOrangeMoneyFile = headers.some(header => 
                    header && (
                        header.toLowerCase().includes('n°') || 
                        header.toLowerCase().includes('référence') ||
                        header.toLowerCase().includes('reference') ||
                        header.toLowerCase().includes('compte orange money')
                    )
                );
                
                console.log(`🟠 Détection Orange Money Excel: ${isOrangeMoneyFile}`);
                
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
                        this.boData = this.applyOrangeMoneyColumnSelection(this.normalizeData(rows), file.name);
                    } else {
                        this.partnerData = this.applyOrangeMoneyColumnSelection(this.normalizeData(this.convertDebitCreditToNumber(rows)), file.name);
                    }
                    // Forcer la détection des changements
                    this.cd.detectChanges();
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
                        this.boData = this.applyOrangeMoneyColumnSelection(this.normalizeData(rows), file.name);
                    } else {
                        this.partnerData = this.applyOrangeMoneyColumnSelection(this.normalizeData(this.convertDebitCreditToNumber(rows)), file.name);
                    }
                    // Forcer la détection des changements
                    this.cd.detectChanges();
                }
                
                console.log(`✅ Fichier Excel traité: ${isBo ? this.boData.length : this.partnerData.length} lignes`);
                
                // Appliquer le filtrage automatique Orange Money si nécessaire
                if (isOrangeMoneyFile) {
                    console.log(`🟠 Fichier Orange Money Excel détecté, application du filtrage`);
                    this.applyAutomaticOrangeMoneyFilterForFileUpload(file.name, isBo);
                }
                
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
        
        // Analyser davantage de lignes pour les rapports avec entête tardif (ex: Orange Money)
        const maxRowsToCheck = Math.min(300, jsonData.length);
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
        
        // Fallback orienté Orange Money: si la meilleure ligne ne contient pas assez d'indices, chercher plus bas
        const omTargets = ['référence','reference','débit','debit','crédit','credit','n°','no','nº','compte','date','service','statut','status'];
        const bestOmMatches = (bestHeaderRow || []).reduce((acc, c) => {
            const v = (c || '').toString().toLowerCase();
            return acc + (omTargets.some(t => v.includes(t)) ? 1 : 0);
        }, 0);
        if (bestOmMatches < 4) {
            for (let i = bestHeaderRowIndex + 1; i < Math.min(bestHeaderRowIndex + 80, jsonData.length); i++) {
                const row = jsonData[i] || [];
                const rowStrings = row.map(cell => (cell !== undefined && cell !== null) ? String(cell).trim() : '');
                const matches = rowStrings.reduce((acc, c) => acc + (omTargets.some(t => c.toLowerCase().includes(t)) ? 1 : 0), 0);
                if (matches >= 4) {
                    bestHeaderRowIndex = i;
                    bestHeaderRow = [...rowStrings];
                    console.log(`⭐ Fallback OM: en-tête ajusté à la ligne ${i} (matches=${matches})`);
                    break;
                }
            }
        }

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
        if (nonEmptyColumns >= 3) score += 10;
        if (nonEmptyColumns >= 6) score += 10;
        
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
            if (cell.includes('N°') || cell === 'N') score += 15;
            
            // Bonus pour les caractères spéciaux typiques des en-têtes
            if (cell.includes('é') || cell.includes('è') || cell.includes('à') || 
                cell.includes('ç') || cell.includes('ù') || cell.includes('ô')) score += 3;
        }

        // Heuristique spécifique Orange Money
        const rowLower = rowStrings.map(c => c.toLowerCase());
        const omTargets = ['référence','reference','débit','debit','crédit','credit','n°','no','nº','compte','date','service','statut','status'];
        const omMatches = rowLower.reduce((acc, v) => acc + (omTargets.some(t => v.includes(t)) ? 1 : 0), 0);
        score += omMatches * 5;
        if (omMatches >= 5) score += 30;
        // Bonus si présence combinée de Date + (Référence) + (Débit|Crédit)
        const hasDate = rowLower.some(v => v.includes('date'));
        const hasRef  = rowLower.some(v => v.includes('référence') || v.includes('reference'));
        const hasAmt  = rowLower.some(v => v.includes('débit') || v.includes('debit') || v.includes('crédit') || v.includes('credit'));
        if (hasDate && hasRef && hasAmt) score += 20;
        
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

    private _canProceedCache: boolean | null = null;
    private _lastDataLengths = { bo: 0, partner: 0 };

    canProceed(): boolean {
        // Cache pour éviter les recalculs inutiles
        const currentBoLength = this.boData.length;
        const currentPartnerLength = this.partnerData.length;
        
        // Vérifier si les données ont changé depuis le dernier calcul
        if (this._lastDataLengths.bo === currentBoLength && 
            this._lastDataLengths.partner === currentPartnerLength && 
            this._canProceedCache !== null) {
            return this._canProceedCache;
        }

        const canProceed = currentBoLength > 0 && currentPartnerLength > 0;
        
        // Mettre à jour le cache et les longueurs
        this._canProceedCache = canProceed;
        this._lastDataLengths = { bo: currentBoLength, partner: currentPartnerLength };
        
        // Log seulement si les données ont changé
        console.log('🔍 canProceed() mis à jour:', {
            boDataLength: currentBoLength,
            partnerDataLength: currentPartnerLength,
            canProceed: canProceed
        });
        
        // Forcer la détection des changements si l'état a changé
        this.cd.detectChanges();
        
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
            this.appStateService.setReconciliationType(this.reconciliationType);
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

    /**
     * Détermine si un gros fichier est détecté
     */
    isLargeFileDetected(): boolean {
        if (!this.boFile || !this.partnerFile) {
            return false;
        }
        
        const totalSize = this.boFile.size + this.partnerFile.size;
        const sizeThreshold = 50 * 1024 * 1024; // 50MB
        
        // Vérifier la taille totale
        if (totalSize > sizeThreshold) {
            return true;
        }
        
        // Vérifier le nombre de lignes estimé
        const estimatedBoRows = Math.ceil(this.boFile.size / 100);
        const estimatedPartnerRows = Math.ceil(this.partnerFile.size / 100);
        
        return estimatedBoRows > 100000 || estimatedPartnerRows > 100000;
    }

    goToDashboard() {
        this.router.navigate(['/dashboard']);
    }

    // goToReconciliationLauncher() - COMMENTÉ (mode super auto désactivé)
    // goToReconciliationLauncher() {
    //     this.router.navigate(['/reconciliation-launcher']);
    // }

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
            this.autoBoFileName = this.autoBoFile.name; // Conserver le nom du fichier
            this.cd.detectChanges(); // Forcer la mise à jour de la vue
            this.parseAutoFile(this.autoBoFile, true);
        }
    }

    onAutoPartnerFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files?.length) {
            this.autoPartnerFile = input.files[0];
            this.autoPartnerFileName = this.autoPartnerFile.name; // Conserver le nom du fichier
            this.cd.detectChanges(); // Forcer la mise à jour de la vue
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

    // Méthode pour détecter TRXBO et extraire les services pour le mode manuel
    private detectTRXBOAndExtractServicesForManual(data: Record<string, string>[]): boolean {
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
            
            // Forcer la détection des changements pour mettre à jour la vue
            this.cd.detectChanges();
            
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
        const fileSizeMB = file.size / (1024 * 1024);
        
        if (fileName.endsWith('.csv')) {
            this.parseAutoCSV(file, isBo);
        } else if (this.isExcelFile(fileName)) {
            // Utiliser la méthode alternative pour les très gros fichiers Excel
            if (fileSizeMB > 50) {
                console.log(`🔄 Fichier Excel très volumineux détecté (${fileSizeMB.toFixed(1)} MB), utilisation de la méthode alternative`);
                this.parseAutoXLSXLargeFile(file, isBo);
            } else {
                this.parseAutoXLSX(file, isBo);
            }
        } else {
            this.popupService.showError('Format de fichier non supporté. Veuillez choisir un fichier CSV ou Excel (.xls, .xlsx, .xlsm, .xlsb, .xlt, .xltx, .xltm)', 'Format Non Supporté');
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
                        // Forcer la détection des changements pour mettre à jour la vue
                        this.cd.detectChanges();
                    },
                    error: (error: any) => {
                        console.error('Erreur lors de la lecture du fichier CSV:', error);
                        this.cd.detectChanges();
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
        // Afficher un indicateur de progression pour les fichiers volumineux
        const fileSizeMB = file.size / (1024 * 1024);
        const startTime = Date.now();
        
        if (fileSizeMB > 5) {
            console.log(`📁 Fichier volumineux détecté (${fileSizeMB.toFixed(1)} MB). Traitement optimisé en cours...`);
            this.progressIndicatorService.showProgress(
                'Lecture du fichier Excel en cours...',
                file.name,
                file.size
            );
        }

        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
            try {
                console.log('🔄 Début lecture fichier Excel automatique pour réconciliation');
                
                // Options optimisées pour les fichiers volumineux
                const options: XLSX.ParsingOptions = {
                    type: 'array',
                    cellDates: true,
                    cellNF: false,
                    cellText: false,
                    sheetStubs: false,
                    // Lire toutes les lignes
                    sheetRows: undefined,
                };

                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, options);
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // Vérifier si la feuille est valide avant de continuer
                console.log('🔍 Informations sur la feuille Excel:', {
                    sheetName: firstSheetName,
                    hasWorksheet: !!worksheet,
                    hasRef: !!worksheet?.['!ref'],
                    ref: worksheet?.['!ref'],
                    range: worksheet?.['!range'],
                    workbookSheets: workbook.SheetNames.length
                });

                if (!worksheet) {
                    console.log('❌ Feuille Excel non trouvée');
                    if (fileSizeMB > 5) {
                        this.progressIndicatorService.hideProgress();
                    }
                    this.popupService.showError('Impossible de lire la feuille Excel. Vérifiez que le fichier n\'est pas corrompu.', 'Erreur de lecture Excel');
                    return;
                }

                // Pour les gros fichiers, on essaie de lire même sans !ref
                if (!worksheet['!ref'] && fileSizeMB < 10) {
                    console.log('❌ Feuille Excel vide (petit fichier)');
                    if (fileSizeMB > 5) {
                        this.progressIndicatorService.hideProgress();
                    }
                    this.popupService.showError('Le fichier Excel semble être vide. Veuillez vérifier le fichier et réessayer.', 'Fichier Excel vide');
                    return;
                }

                // Conversion optimisée en tableau de tableaux pour analyse
                let jsonData: any[][];
                try {
                    jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                        header: 1,
                        defval: '', // Valeur par défaut pour les cellules vides
                        raw: false // Convertir les dates en strings
                    }) as any[][];
                } catch (error) {
                    console.log('⚠️ Erreur lors de la conversion JSON, tentative avec options alternatives:', error);
                    // Tentative alternative avec options plus permissives
                    jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                        header: 1,
                        defval: '',
                        raw: true, // Garder les valeurs brutes
                        blankrows: false // Ignorer les lignes vides
                    }) as any[][];
                }
                
                if (!jsonData || jsonData.length === 0) {
                    console.log('❌ Fichier Excel vide ou aucune donnée trouvée');
                    if (fileSizeMB > 5) {
                        this.progressIndicatorService.hideProgress();
                    }
                    
                    // Pour les très gros fichiers, suggérer des solutions alternatives
                    if (fileSizeMB > 50) {
                        this.popupService.showError(
                            `Le fichier Excel (${fileSizeMB.toFixed(1)} MB) est très volumineux et ne peut pas être traité entièrement. 
                            Suggestions : 
                            1. Divisez le fichier en plusieurs parties plus petites
                            2. Supprimez les colonnes non nécessaires
                            3. Utilisez un fichier CSV à la place si possible`,
                            'Fichier trop volumineux'
                        );
                    } else {
                        this.popupService.showError('Aucune donnée trouvée dans le fichier Excel. Veuillez vérifier que le fichier contient des données.', 'Aucune donnée');
                    }
                    return;
                }
                
                console.log(`📊 Données Excel brutes: ${jsonData.length} lignes`);
                
                // Pour les très gros fichiers, informer l'utilisateur de la limitation
                if (fileSizeMB > 50 && jsonData.length === 10000) {
                    console.log('⚠️ Fichier très volumineux : seulement les 10,000 premières lignes ont été lues');
                    this.progressIndicatorService.updateMessage(
                        'Fichier très volumineux détecté. Traitement des 10,000 premières lignes seulement...'
                    );
                }
                
                // Détecter les en-têtes avec une méthode optimisée
                const headerDetection = this.detectExcelHeadersImproved(jsonData);
                const headers = headerDetection.headerRow;
                const headerRowIndex = headerDetection.headerRowIndex;
                
                console.log(`✅ En-têtes détectés à la ligne ${headerRowIndex}:`, headers);
                
                // Vérifier si des en-têtes valides ont été trouvés
                if (!headers || headers.length === 0 || headers.every(h => !h || h.trim() === '')) {
                    console.log('⚠️ Aucun en-tête valide détecté, utilisation de la première ligne');
                    const fallbackHeaders = jsonData[0]?.map((h, idx) => h || `Col${idx + 1}`) || [];
                    const correctedHeaders = fallbackHeaders.map(header => this.normalizeColumnName(header));
                    
                    // Créer les lignes de données avec traitement par chunks pour les gros fichiers
                    const rows: any[] = [];
                    const chunkSize = 1000; // Traiter par chunks de 1000 lignes
                    
                    for (let i = 1; i < jsonData.length; i += chunkSize) {
                        const endIndex = Math.min(i + chunkSize, jsonData.length);
                        
                        for (let j = i; j < endIndex; j++) {
                            const rowData = jsonData[j] as any[];
                            if (!rowData || rowData.length === 0) continue;
                            
                            const row: any = {};
                            correctedHeaders.forEach((header: string, index: number) => {
                                const value = rowData[index];
                                row[header] = value !== undefined && value !== null ? value : '';
                            });
                            rows.push(row);
                        }
                        
                        // Log de progression pour gros fichiers
                        if (fileSizeMB > 5 && i % (chunkSize * 10) === 1) {
                            const progress = ((i - 1) / jsonData.length * 100);
                            console.log(`📈 Progression: ${progress.toFixed(1)}% (${i}/${jsonData.length} lignes traitées)`);
                            this.progressIndicatorService.updateProgress(
                                progress,
                                `Traitement des données: ${progress.toFixed(1)}%`
                            );
                        }
                    }
                    
                    if (isBo) {
                        this.autoBoData = rows;
                    } else {
                        this.autoPartnerData = this.convertDebitCreditToNumber(rows);
                    }
                    
                    // Invalider le cache de canProceed
                    this._canProceedCache = null;
                    // Forcer la détection des changements pour mettre à jour la vue
                    this.cd.detectChanges();
                } else {
                    // Corriger les caractères spéciaux dans les en-têtes
                    const correctedHeaders = headers.map(header => this.normalizeColumnName(header));
                    console.log(`🔧 En-têtes Excel corrigés:`, correctedHeaders);
                    
                    // Créer les lignes de données en commençant après la ligne d'en-tête
                    const rows: any[] = [];
                    const chunkSize = 1000; // Traiter par chunks de 1000 lignes
                    
                    for (let i = headerRowIndex + 1; i < jsonData.length; i += chunkSize) {
                        const endIndex = Math.min(i + chunkSize, jsonData.length);
                        
                        for (let j = i; j < endIndex; j++) {
                            const rowData = jsonData[j] as any[];
                            if (!rowData || rowData.length === 0) continue;
                            
                            const row: any = {};
                            correctedHeaders.forEach((header: string, index: number) => {
                                const value = rowData[index];
                                row[header] = value !== undefined && value !== null ? value : '';
                            });
                            rows.push(row);
                        }
                        
                        // Log de progression pour gros fichiers
                        if (fileSizeMB > 5 && i % (chunkSize * 10) === headerRowIndex + 1) {
                            const progress = ((i - headerRowIndex - 1) / (jsonData.length - headerRowIndex - 1) * 100);
                            console.log(`📈 Progression: ${progress.toFixed(1)}% (${i - headerRowIndex}/${jsonData.length - headerRowIndex - 1} lignes traitées)`);
                            this.progressIndicatorService.updateProgress(
                                progress,
                                `Traitement des données: ${progress.toFixed(1)}%`
                            );
                        }
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
                    
                    // Invalider le cache de canProceed
                    this._canProceedCache = null;
                    // Forcer la détection des changements pour mettre à jour la vue
                    this.cd.detectChanges();
                }
                
                console.log(`✅ Fichier Excel traité: ${isBo ? this.autoBoData.length : this.autoPartnerData.length} lignes`);
                
                // Masquer l'indicateur de progression
                if (fileSizeMB > 5) {
                    this.progressIndicatorService.updateProgress(100, 'Traitement terminé avec succès !');
                    setTimeout(() => {
                        this.progressIndicatorService.hideProgress();
                    }, 1500);
                }
                
                // Appliquer le filtrage automatique Orange Money si nécessaire
                // ATTENTION: Le filtrage se fait APRÈS le traitement complet pour préserver toutes les colonnes
                this.applyAutomaticOrangeMoneyFilterForFileUpload(file.name, isBo);
                
            } catch (error) {
                console.error('❌ Erreur lors de la lecture du fichier Excel:', error);
                // Masquer l'indicateur de progression en cas d'erreur
                if (fileSizeMB > 5) {
                    this.progressIndicatorService.hideProgress();
                }
                // En cas d'erreur avec un gros fichier, suggérer des solutions
                if (file.size > 10 * 1024 * 1024) { // > 10MB
                    console.log('💡 Suggestion: Le fichier est très volumineux. Considérez diviser le fichier ou utiliser le mode de traitement par lots.');
                }
            }
        };
        reader.onerror = (e) => {
            console.error('Erreur lors de la lecture du fichier (FileReader):', e);
        };
        reader.readAsArrayBuffer(file);
    }

    /**
     * Méthode alternative pour traiter les fichiers Excel très volumineux
     * Utilise une approche de lecture par chunks pour éviter les problèmes de mémoire
     */
    private async parseAutoXLSXLargeFile(file: File, isBo: boolean): Promise<void> {
        const fileSizeMB = file.size / (1024 * 1024);
        console.log(`🔄 Traitement fichier très volumineux (${fileSizeMB.toFixed(1)} MB) avec méthode alternative`);
        
        this.progressIndicatorService.showProgress(
            'Lecture du fichier Excel volumineux...',
            file.name,
            file.size
        );

        try {
            // Lire le fichier par chunks pour éviter les problèmes de mémoire
            const arrayBuffer = await this.readFileAsArrayBuffer(file);
            const data = new Uint8Array(arrayBuffer);
            
            // Options pour forcer le chargement des feuilles
            const options: XLSX.ParsingOptions = {
                type: 'array',
                cellDates: false,
                cellNF: false,
                cellText: false,
                sheetStubs: false,
                sheetRows: undefined,
                // Forcer le chargement des feuilles
                bookSheets: true,
                bookProps: false,
                bookVBA: false,
                // Options supplémentaires pour les gros fichiers
                cellStyles: false,
                cellHTML: false,
                cellFormula: false
            };

            const workbook = XLSX.read(data, options);
            console.log('📋 Toutes les feuilles disponibles:', workbook.SheetNames);
            console.log('🔍 Workbook.Sheets existe:', !!workbook.Sheets);
            
            // Vérifier si les feuilles sont chargées
            if (!workbook.Sheets || workbook.SheetNames.length === 0) {
                throw new Error('Aucune feuille chargée dans le workbook');
            }
            
            let firstSheetName = workbook.SheetNames[0];
            let worksheet = workbook.Sheets[firstSheetName];

            console.log('🔍 Informations workbook volumineux:', {
                sheetName: firstSheetName,
                hasWorksheet: !!worksheet,
                hasRef: !!worksheet?.['!ref'],
                ref: worksheet?.['!ref'],
                workbookSheets: workbook.SheetNames.length
            });

            // Si la première feuille n'est pas accessible, essayer les autres
            if (!worksheet && workbook.SheetNames.length > 1) {
                console.log('⚠️ Première feuille inaccessible, tentative avec les autres feuilles...');
                for (let i = 1; i < workbook.SheetNames.length; i++) {
                    const sheetName = workbook.SheetNames[i];
                    const testWorksheet = workbook.Sheets[sheetName];
                    if (testWorksheet) {
                        firstSheetName = sheetName;
                        worksheet = testWorksheet;
                        console.log(`✅ Feuille alternative trouvée: ${sheetName}`);
                        break;
                    }
                }
            }

            if (!worksheet) {
                console.log('❌ Aucune feuille accessible trouvée');
                throw new Error('Impossible de lire la feuille Excel');
            }

            // Lecture limitée des données avec fallback
            let jsonData: any[][];
            try {
                jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                    header: 1,
                    defval: '',
                    raw: true
                }) as any[][];
            } catch (error) {
                console.log('⚠️ Erreur lors de la lecture avec range, tentative sans range:', error);
                // Tentative sans limitation de range
                jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                    header: 1,
                    defval: '',
                    raw: true,
                    blankrows: false
                }) as any[][];
            }

            if (!jsonData || jsonData.length === 0) {
                throw new Error('Aucune donnée trouvée dans le fichier');
            }

            console.log(`📊 Données Excel volumineux: ${jsonData.length} lignes (limitées)`);

            // Traitement standard des données
            const headerDetection = this.detectExcelHeadersImproved(jsonData);
            const headers = headerDetection.headerRow;
            const headerRowIndex = headerDetection.headerRowIndex;

            if (!headers || headers.length === 0 || headers.every(h => !h || h.trim() === '')) {
                const fallbackHeaders = jsonData[0]?.map((h, idx) => h || `Col${idx + 1}`) || [];
                const correctedHeaders = fallbackHeaders.map(header => this.normalizeColumnName(header));
                
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
                const correctedHeaders = headers.map(header => this.normalizeColumnName(header));
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
                
                if (isBo) {
                    this.autoBoData = rows;
                    if (this.detectTRXBOAndExtractServices(this.autoBoData)) {
                        this.showServiceSelectionStep();
                    }
                } else {
                    this.autoPartnerData = this.convertDebitCreditToNumber(rows);
                }
            }

            // Forcer la détection des changements pour mettre à jour la vue
            this.cd.detectChanges();
            
            console.log(`✅ Fichier Excel volumineux traité: ${isBo ? this.autoBoData.length : this.autoPartnerData.length} lignes`);
            this.progressIndicatorService.updateProgress(100, 'Traitement terminé avec succès !');
            
            setTimeout(() => {
                this.progressIndicatorService.hideProgress();
            }, 1500);

            // Invalider le cache de canProceed
            this._canProceedCache = null;

        } catch (error) {
            console.error('❌ Erreur lors du traitement du fichier volumineux, tentative de fallback ultime:', error);
            
            // Tentative de fallback ultime avec options minimales
            try {
                console.log('🔄 Tentative de fallback ultime avec options minimales...');
                const arrayBuffer = await this.readFileAsArrayBuffer(file);
                const data = new Uint8Array(arrayBuffer);
                
                // Options ultra-minimales pour forcer le chargement
                const minimalOptions: XLSX.ParsingOptions = {
                    type: 'array',
                    cellDates: false,
                    cellNF: false,
                    cellText: false,
                    sheetStubs: false,
                    // Essayer sans limitation de lignes
                    sheetRows: undefined,
                    // Forcer le chargement des feuilles
                    bookSheets: true
                };

                const workbook = XLSX.read(data, minimalOptions);
                console.log('📋 Feuilles disponibles (fallback):', workbook.SheetNames);
                console.log('🔍 Workbook.Sheets existe (fallback):', !!workbook.Sheets);
                
                if (!workbook.Sheets || workbook.SheetNames.length === 0) {
                    throw new Error('Aucune feuille chargée en fallback');
                }
                
                if (workbook.SheetNames.length > 0) {
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    
                    if (worksheet) {
                        console.log(`✅ Feuille trouvée en fallback: ${sheetName}`);
                        
                        // Lecture ultra-simple
                        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                            header: 1,
                            defval: '',
                            raw: true
                        }) as any[][];

                        if (jsonData && jsonData.length > 0) {
                            console.log(`📊 Données fallback: ${jsonData.length} lignes`);
                            
                            // Traitement simplifié
                            const fallbackHeaders = jsonData[0]?.map((h, idx) => h || `Col${idx + 1}`) || [];
                            const correctedHeaders = fallbackHeaders.map(header => this.normalizeColumnName(header));
                            
                            const rows: any[] = [];
                            const maxRows = Math.min(jsonData.length, 1000); // Limiter à 1000 lignes max
                            
                            for (let i = 1; i < maxRows; i++) {
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

                            console.log(`✅ Fallback réussi: ${rows.length} lignes traitées`);
                            this.progressIndicatorService.updateProgress(100, 'Traitement réussi en mode fallback !');
                            
                            setTimeout(() => {
                                this.progressIndicatorService.hideProgress();
                            }, 1500);

                            this._canProceedCache = null;
                            // Forcer la détection des changements pour mettre à jour la vue
                            this.cd.detectChanges();
                            return;
                        }
                    }
                }
                
                throw new Error('Fallback ultime échoué');
                
            } catch (fallbackError) {
                console.error('❌ Fallback ultime échoué, tentative du fallback final:', fallbackError);
                // Dernière tentative avec la méthode de fallback ultime
                await this.parseAutoXLSXUltimateFallback(file, isBo);
            }
        }
    }

    /**
     * Lit un fichier comme ArrayBuffer de manière asynchrone
     */
    private readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
            reader.onerror = (e) => reject(e);
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Méthode de fallback ultime pour les fichiers Excel problématiques
     * Utilise une approche complètement différente
     */
    private async parseAutoXLSXUltimateFallback(file: File, isBo: boolean): Promise<void> {
        const fileSizeMB = file.size / (1024 * 1024);
        console.log(`🔄 Fallback ultime pour fichier Excel (${fileSizeMB.toFixed(1)} MB)`);
        
        this.progressIndicatorService.showProgress(
            'Tentative de lecture alternative...',
            file.name,
            file.size
        );

        try {
            const arrayBuffer = await this.readFileAsArrayBuffer(file);
            const data = new Uint8Array(arrayBuffer);
            
            // Essayer différentes approches de lecture
            const approaches = [
                // Approche 1: Lecture complète sans limitations
                {
                    name: 'Lecture complète',
                    options: {
                        type: 'array' as const,
                        cellDates: false,
                        cellNF: false,
                        cellText: false,
                        sheetStubs: false
                    }
                },
                // Approche 2: Lecture avec cellDates activé
                {
                    name: 'Avec cellDates',
                    options: {
                        type: 'array' as const,
                        cellDates: true,
                        cellNF: false,
                        cellText: false,
                        sheetStubs: false
                    }
                },
                // Approche 3: Lecture avec cellText activé
                {
                    name: 'Avec cellText',
                    options: {
                        type: 'array' as const,
                        cellDates: false,
                        cellNF: false,
                        cellText: true,
                        sheetStubs: false
                    }
                }
            ];

            for (const approach of approaches) {
                try {
                    console.log(`🔍 Tentative: ${approach.name}`);
                    const workbook = XLSX.read(data, approach.options);
                    
                    console.log(`📋 ${approach.name} - Feuilles:`, workbook.SheetNames);
                    console.log(`📋 ${approach.name} - Sheets existe:`, !!workbook.Sheets);
                    
                    if (workbook.Sheets && workbook.SheetNames.length > 0) {
                        const sheetName = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[sheetName];
                        
                        if (worksheet) {
                            console.log(`✅ Succès avec ${approach.name}: ${sheetName}`);
                            
                            // Lecture des données avec options permissives
                            const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                                header: 1,
                                defval: '',
                                raw: true,
                                blankrows: false
                            }) as any[][];

                            if (jsonData && jsonData.length > 0) {
                                console.log(`📊 Données lues: ${jsonData.length} lignes`);
                                
                                // Traitement simplifié
                                const fallbackHeaders = jsonData[0]?.map((h, idx) => h || `Col${idx + 1}`) || [];
                                const correctedHeaders = fallbackHeaders.map(header => this.normalizeColumnName(header));
                                
                                const rows: any[] = [];
                                const maxRows = jsonData.length;
                                
                                for (let i = 1; i < maxRows; i++) {
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

                                console.log(`✅ Fallback ultime réussi avec ${approach.name}: ${rows.length} lignes`);
                                this.progressIndicatorService.updateProgress(100, 'Lecture réussie avec méthode alternative !');
                                
                                setTimeout(() => {
                                    this.progressIndicatorService.hideProgress();
                                }, 1500);

                                this._canProceedCache = null;
                                // Forcer la détection des changements pour mettre à jour la vue
                                this.cd.detectChanges();
                                return;
                            }
                        }
                    }
                } catch (approachError) {
                    console.log(`❌ ${approach.name} échoué:`, approachError);
                    continue;
                }
            }
            
            throw new Error('Toutes les approches de lecture ont échoué');
            
        } catch (error) {
            console.error('❌ Fallback ultime complètement échoué:', error);
            this.progressIndicatorService.hideProgress();
            this.popupService.showError(
                `Impossible de traiter ce fichier Excel de ${fileSizeMB.toFixed(1)} MB. 
                
                Le fichier semble avoir un format ou une structure qui empêche sa lecture par la bibliothèque XLSX.
                
                Solutions recommandées :
                1. Ouvrez le fichier dans Excel et sauvegardez-le au format CSV
                2. Divisez le fichier en plusieurs parties plus petites
                3. Vérifiez que le fichier n'est pas protégé par mot de passe
                4. Essayez de supprimer les colonnes non nécessaires
                
                Si le problème persiste, le fichier pourrait être corrompu.`,
                'Fichier non lisible'
            );
        }
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
        const MAX_LOG_SAMPLES = 5;
        
        const logSample = (phase: string, column: string, data: Record<string, string>[]) => {
            const sampleValues = data.slice(0, MAX_LOG_SAMPLES).map(row => row?.[column]);
            console.log(`   ${phase} (${column})`, sampleValues, data.length > MAX_LOG_SAMPLES ? '...' : '');
        };
        
        // Appliquer les traitements pour chaque modèle BO
        Object.entries(boTreatments).forEach(([modelId, treatments]) => {
            console.log(`🔧 Application des traitements pour le modèle BO ${modelId}:`, treatments);
            
            if (Array.isArray(treatments)) {
                treatments.forEach((treatment: any) => {
                    if (!treatment?.type || !treatment?.column) {
                        console.log('⚠️ Traitement invalide, paramètres manquants:', treatment);
                        return;
                    }
                    
                    const column = treatment.column;
                    
                    switch (treatment.type) {
                        case 'removeSuffix': {
                            const suffix = treatment.suffix;
                            if (typeof suffix !== 'string' || !suffix.length) {
                                console.log(`⚠️ Suffixe invalide pour removeSuffix: "${suffix}"`);
                                return;
                            }
                            
                            console.log(`🔧 Suppression du suffixe "${suffix}" de la colonne "${column}"`);
                            logSample('🔍 Valeurs avant traitement', column, processedData);
                            
                            processedData = processedData.map(row => {
                                const newRow = { ...row };
                                if (typeof newRow[column] === 'string' && newRow[column].endsWith(suffix)) {
                                    newRow[column] = newRow[column].slice(0, -suffix.length);
                                }
                                return newRow;
                            });
                            
                            logSample('🔍 Valeurs après traitement', column, processedData);
                            break;
                        }
                        case 'toNumber': {
                            console.log(`🔧 Conversion en nombre de la colonne "${column}"`);
                            logSample('🔍 Valeurs avant conversion', column, processedData);
                            
                            processedData = processedData.map(row => {
                                const newRow = { ...row };
                                if (newRow[column] !== undefined && newRow[column] !== null) {
                                    const numericValue = parseFloat(String(newRow[column]).replace(/\s/g, ''));
                                    if (!isNaN(numericValue)) {
                                        newRow[column] = String(numericValue);
                                    }
                                }
                                return newRow;
                            });
                            
                            logSample('🔍 Valeurs après conversion', column, processedData);
                            break;
                        }
                        case 'toString': {
                            console.log(`🔧 Conversion en texte de la colonne "${column}"`);
                            logSample('🔍 Valeurs avant conversion', column, processedData);
                            
                            processedData = processedData.map(row => {
                                const newRow = { ...row };
                                if (newRow[column] !== undefined && newRow[column] !== null) {
                                    newRow[column] = String(newRow[column]);
                                }
                                return newRow;
                            });
                            
                            logSample('🔍 Valeurs après conversion', column, processedData);
                            break;
                        }
                        default:
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
     * Supporte plusieurs modes de détection :
     * 1. Patterns avec wildcards (* et ?) - comportement classique
     * 2. Patterns avec extension - correspondance exacte avec extension
     * 3. Patterns simples - détection par inclusion (ex: "TRXBO" détecte "TRXBO_02082025.xlsx")
     * 4. Détection par préfixe - détection par début de nom
     */
    private matchesFilePattern(fileName: string, pattern: string): boolean {
        if (!pattern || !fileName) return false;
        
        console.log(`🔍 Test de correspondance: "${fileName}" vs pattern "${pattern}"`);
        
        const lowerName = fileName.toLowerCase();
        const lowerPattern = pattern.toLowerCase();
        
        // Extensions acceptées comme équivalentes
        const acceptedExtensions = ['.csv', '.xls', '.xlsx'];
        
        // Extraire les extensions
        const getExtension = (name: string): string => {
            const match = name.match(/\.[^/.]+$/);
            return match ? match[0] : '';
        };
        
        const fileNameExt = getExtension(lowerName);
        const patternExt = getExtension(lowerPattern);
        
        // Noms sans extension
        const nameNoExt = lowerName.replace(/\.[^/.]+$/, '');
        const patternNoExt = lowerPattern.replace(/\.[^/.]+$/, '');
        
        // Mode 1: Pattern avec wildcards
        if (patternNoExt.includes('*') || patternNoExt.includes('?')) {
            // Construire le regex à partir du pattern sans extension
            const regexPattern = patternNoExt
                .replace(/\./g, '\\.')
                .replace(/\*/g, '.*')
                .replace(/\?/g, '.');
            
            try {
                const regex = new RegExp(`^${regexPattern}$`, 'i');
                const matches = regex.test(nameNoExt);
                
                if (matches) {
                    // Si le pattern a une extension, vérifier que l'extension du fichier est acceptée
                    if (patternExt && acceptedExtensions.includes(patternExt)) {
                        // Le pattern spécifie une extension, accepter les extensions équivalentes
                        const fileExtAccepted = acceptedExtensions.includes(fileNameExt);
                        console.log(`🔍 Test wildcard (sans extension): ✅ - Extension fichier: ${fileNameExt}, Extension acceptée: ${fileExtAccepted ? '✅' : '❌'}`);
                        return fileExtAccepted;
                    } else {
                        // Le pattern n'a pas d'extension spécifique, accepter n'importe quelle extension
                        console.log(`🔍 Test wildcard (sans extension): ✅`);
                        return true;
                    }
                } else {
                    console.log(`🔍 Test wildcard (sans extension): ❌`);
                    return false;
                }
            } catch (error) {
                console.warn('⚠️ Pattern wildcard invalide:', pattern);
                return false;
            }
        }
        
        // Mode 2: Pattern avec extension - correspondance exacte (insensible à la casse)
        // Exemple: pattern "pmmoovbf.xlsx" détecte "PMMOOVBF.xlsx" ou "PMMOOVBF.csv"
        if (patternExt && acceptedExtensions.includes(patternExt)) {
            // Si le pattern a une extension acceptée, tester sans extension puis vérifier l'extension
            if (nameNoExt === patternNoExt) {
                // Correspondance exacte du nom, vérifier que l'extension est acceptée
                const fileExtAccepted = acceptedExtensions.includes(fileNameExt);
                console.log(`🔍 Test correspondance exacte avec extension: ${fileExtAccepted ? '✅' : '❌'}`);
                return fileExtAccepted;
            }
        } else if (patternExt) {
            // Extension non standard, correspondance exacte stricte
            const exactMatch = lowerName === lowerPattern;
            console.log(`🔍 Test correspondance exacte avec extension: ${exactMatch ? '✅' : '❌'}`);
            if (exactMatch) {
                return true;
            }
        }
        
        // Mode 3: Pattern simple - détection par inclusion (sans extension)
        // Exemple: pattern "TRXBO" détecte "TRXBO_02082025.xlsx"
        const containsPattern = nameNoExt.includes(patternNoExt);
        console.log(`🔍 Test inclusion (sans extension): "${nameNoExt}" contient "${patternNoExt}": ${containsPattern ? '✅' : '❌'}`);
        
        if (containsPattern) {
            // Si le pattern avait une extension acceptée, vérifier que l'extension du fichier est aussi acceptée
            if (patternExt && acceptedExtensions.includes(patternExt)) {
                const fileExtAccepted = acceptedExtensions.includes(fileNameExt);
                return fileExtAccepted;
            }
            return true;
        }
        
        // Mode 4: Détection par préfixe (optionnel, pour plus de flexibilité)
        // Exemple: pattern "TRXBO" détecte "TRXBO_02082025.xlsx"
        const startsWithPattern = nameNoExt.startsWith(patternNoExt);
        console.log(`🔍 Test préfixe (sans extension): "${nameNoExt}" commence par "${patternNoExt}": ${startsWithPattern ? '✅' : '❌'}`);
        
        if (startsWithPattern) {
            // Si le pattern avait une extension acceptée, vérifier que l'extension du fichier est aussi acceptée
            if (patternExt && acceptedExtensions.includes(patternExt)) {
                const fileExtAccepted = acceptedExtensions.includes(fileNameExt);
                return fileExtAccepted;
            }
            return true;
        }
        
        return false;
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
        
        // Normaliser les noms de colonnes AVANT de les logger
        const normalizedColumns = availableColumns.map(col => this.normalizeColumnName(col));
        const normalizedCandidates = candidateKeys.map(key => this.normalizeColumnName(key));
        
        // Créer un mapping entre colonnes normalisées et originales pour l'accès aux données
        const columnMapping = new Map<string, string>();
        availableColumns.forEach((originalCol, index) => {
            const normalizedCol = normalizedColumns[index];
            columnMapping.set(normalizedCol, originalCol);
        });

        console.log('📊 Colonnes disponibles (normalisées):', normalizedColumns);
        console.log('🔑 Clés candidates (normalisées):', normalizedCandidates);

        // PRIORITÉ 1: Chercher des correspondances exactes
        for (let i = 0; i < normalizedCandidates.length; i++) {
            const candidateIndex = normalizedColumns.indexOf(normalizedCandidates[i]);
            if (candidateIndex !== -1) {
                // ⚠️ IMPORTANT: Retourner la colonne ORIGINALE (non normalisée) car c'est celle qui existe dans les données
                const foundColumn = availableColumns[candidateIndex];
                console.log(`✅ Correspondance exacte trouvée: ${candidateKeys[i]} -> ${foundColumn}`);
                console.log(`   Normalisé: "${normalizedCandidates[i]}" -> "${normalizedColumns[candidateIndex]}"`);
                console.log(`   Colonne originale retournée: "${foundColumn}"`);
                return foundColumn;
            }
        }
        
        // PRIORITÉ 1.5: Chercher des correspondances exactes insensibles à la casse
        for (let i = 0; i < normalizedCandidates.length; i++) {
            const candidate = normalizedCandidates[i].toLowerCase();
            for (let j = 0; j < normalizedColumns.length; j++) {
                const column = normalizedColumns[j].toLowerCase();
                if (candidate === column) {
                    // ⚠️ IMPORTANT: Retourner la colonne ORIGINALE (non normalisée) car c'est celle qui existe dans les données
                    const foundColumn = availableColumns[j];
                    console.log(`✅ Correspondance exacte (insensible à la casse) trouvée: ${candidateKeys[i]} -> ${foundColumn}`);
                    console.log(`   Normalisé: "${normalizedCandidates[i]}" -> "${normalizedColumns[j]}"`);
                    console.log(`   Colonne originale retournée: "${foundColumn}"`);
                    return foundColumn;
                }
            }
        }
        
        // PRIORITÉ 2: Chercher des correspondances sans espaces (pour gérer les variations d'espaces)
        for (let i = 0; i < normalizedCandidates.length; i++) {
            const candidate = normalizedCandidates[i].replace(/\s+/g, '');
            for (let j = 0; j < normalizedColumns.length; j++) {
                const column = normalizedColumns[j].replace(/\s+/g, '');
                
                if (candidate === column) {
                    // ⚠️ IMPORTANT: Retourner la colonne ORIGINALE (non normalisée) car c'est celle qui existe dans les données
                    const foundColumn = availableColumns[j];
                    console.log(`✅ Correspondance sans espaces trouvée: ${candidateKeys[i]} -> ${foundColumn}`);
                    console.log(`   Sans espaces: "${candidate}" = "${column}"`);
                    console.log(`   Colonne originale retournée: "${foundColumn}"`);
                    return foundColumn;
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
                        console.log(`❌ Correspondance partielle rejetée: ${candidateKeys[i]} -> ${normalizedColumns[j]} (évite Provider category)`);
                        continue;
                    }
                    
                    // Vérification spéciale pour éviter les correspondances trop courtes
                    if (candidate.length < 3 && column.length > candidate.length * 3) {
                        console.log(`❌ Correspondance partielle rejetée: ${candidateKeys[i]} -> ${normalizedColumns[j]} (clé trop courte)`);
                        continue;
                    }
                    
                    // ⚠️ IMPORTANT: Retourner la colonne ORIGINALE (non normalisée) car c'est celle qui existe dans les données
                    const foundColumn = availableColumns[j];
                    console.log(`✅ Correspondance partielle trouvée: ${candidateKeys[i]} -> ${foundColumn}`);
                    console.log(`   Normalisé: "${candidate}" contient ou est contenu dans "${column}"`);
                    console.log(`   Colonne originale retournée: "${foundColumn}"`);
                    return foundColumn;
                }
                
                // Vérifier la similarité (pour gérer les variations d'encodage)
                const similarity = this.calculateStringSimilarity(candidate, column);
                if (similarity > 0.8) {
                    // ⚠️ IMPORTANT: Retourner la colonne ORIGINALE (non normalisée) car c'est celle qui existe dans les données
                    const foundColumn = availableColumns[j];
                    console.log(`✅ Correspondance par similarité trouvée: ${candidateKeys[i]} -> ${foundColumn}`);
                    console.log(`   Similarité: ${similarity} (${candidate} ~ ${column})`);
                    console.log(`   Colonne originale retournée: "${foundColumn}"`);
                    return foundColumn;
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
                
                // 🔍 VÉRIFICATION CRITIQUE: Vérifier que les colonnes existent dans les données
                if (processedBoData.length > 0) {
                    const boColumns = Object.keys(processedBoData[0]);
                    const boKeyExists = boColumns.includes(keyDetectionResult.boKeyColumn);
                    console.log('🔍 VÉRIFICATION - Colonnes disponibles dans les données BO:', boColumns);
                    console.log(`🔍 VÉRIFICATION - Colonne clé BO "${keyDetectionResult.boKeyColumn}" existe? ${boKeyExists}`);
                    if (!boKeyExists) {
                        console.error(`❌ ERREUR CRITIQUE: La colonne "${keyDetectionResult.boKeyColumn}" n'existe pas dans les données BO!`);
                        console.error('  Colonnes disponibles:', boColumns);
                        // Chercher des colonnes similaires
                        const similarColumns = boColumns.filter(col => 
                            col.toLowerCase().includes(keyDetectionResult.boKeyColumn.toLowerCase()) ||
                            keyDetectionResult.boKeyColumn.toLowerCase().includes(col.toLowerCase())
                        );
                        if (similarColumns.length > 0) {
                            console.warn('  ⚠️ Colonnes similaires trouvées:', similarColumns);
                            console.warn(`  💡 Suggestion: Utiliser "${similarColumns[0]}" au lieu de "${keyDetectionResult.boKeyColumn}"`);
                        }
                        throw new Error(`Colonne clé BO "${keyDetectionResult.boKeyColumn}" introuvable dans les données. Colonnes disponibles: ${boColumns.join(', ')}`);
                    }
                }
                
                if (processedPartnerData.length > 0) {
                    const partnerColumns = Object.keys(processedPartnerData[0]);
                    const partnerKeyExists = partnerColumns.includes(keyDetectionResult.partnerKeyColumn);
                    console.log('🔍 VÉRIFICATION - Colonnes disponibles dans les données Partner:', partnerColumns);
                    console.log(`🔍 VÉRIFICATION - Colonne clé Partner "${keyDetectionResult.partnerKeyColumn}" existe? ${partnerKeyExists}`);
                    if (!partnerKeyExists) {
                        console.error(`❌ ERREUR CRITIQUE: La colonne "${keyDetectionResult.partnerKeyColumn}" n'existe pas dans les données Partner!`);
                        console.error('  Colonnes disponibles:', partnerColumns);
                        // Chercher des colonnes similaires
                        const similarColumns = partnerColumns.filter(col => 
                            col.toLowerCase().includes(keyDetectionResult.partnerKeyColumn.toLowerCase()) ||
                            keyDetectionResult.partnerKeyColumn.toLowerCase().includes(col.toLowerCase())
                        );
                        if (similarColumns.length > 0) {
                            console.warn('  ⚠️ Colonnes similaires trouvées:', similarColumns);
                            console.warn(`  💡 Suggestion: Utiliser "${similarColumns[0]}" au lieu de "${keyDetectionResult.partnerKeyColumn}"`);
                        }
                        throw new Error(`Colonne clé Partner "${keyDetectionResult.partnerKeyColumn}" introuvable dans les données. Colonnes disponibles: ${partnerColumns.join(', ')}`);
                    }
                }
                    
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
        
        // Vérifier si le fichier partenaire est uploadé
        if (!this.partnerFile) {
            console.log('⚠️ Fichier partenaire manquant - retour à l\'upload');
            this.errorMessage = 'Veuillez d\'abord uploader le fichier partenaire avant de continuer.';
            return;
        }
        
        // Vérifier si les données partenaire sont chargées
        if (this.partnerData.length === 0) {
            console.log('⚠️ Données partenaire non chargées - traitement du fichier partenaire');
            this.processFileWithAutoProcessing(this.partnerFile, 'partner');
            return;
        }
        
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