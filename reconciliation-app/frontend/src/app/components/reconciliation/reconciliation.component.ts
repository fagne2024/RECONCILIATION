import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { ReconciliationRequest } from '../../models/reconciliation-request.model';
import { ReconciliationResponse } from '../../models/reconciliation-response.model';
import { ReconciliationService, ReconciliationConfig, ProgressUpdate } from '../../services/reconciliation.service';
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

    // Gestion des jobs
    currentJobId: string | null = null;
    private destroy$ = new Subject<void>();

    // Propriétés pour le mode magique
    isMagicMode = false;
    magicResults: any = null;
    detectedKeys: any[] = [];
    appliedTransformations: any[] = [];
    magicConfidence = 0;

    constructor(
        private reconciliationService: ReconciliationService,
        private appStateService: AppStateService,
        private orangeMoneyUtilsService: OrangeMoneyUtilsService,
        private cd: ChangeDetectorRef,
        private router: Router
    ) {}

    ngOnInit(): void {
        console.log('🚀 ReconciliationComponent initialisé');
        
        // Vérifier si on est en mode magique
        this.checkMagicMode();
        
        // Mode API classique activé
        console.log('✅ Mode API classique activé');
    }

    /**
     * Vérifie si on est en mode magique et initialise l'affichage
     */
    private checkMagicMode(): void {
        // Récupérer les paramètres de l'URL
        const urlParams = new URLSearchParams(window.location.search);
        const mode = urlParams.get('mode');
        const jobId = urlParams.get('jobId');
        
        if (mode === 'magic' && jobId) {
            console.log('🪄 Mode magique détecté - Job ID:', jobId);
            this.isMagicMode = true;
            // Démarrer directement le suivi de progression du job
            this.startProgressTracking(jobId);
        } else {
            console.log('⚠️ Mode magique non détecté ou Job ID manquant');
        }
    }



    /**
     * Retourne la classe CSS pour l'affichage de la confiance
     */
    getConfidenceClass(confidence: number): string {
        if (confidence >= 0.8) return 'high-confidence';
        if (confidence >= 0.6) return 'medium-confidence';
        if (confidence >= 0.4) return 'low-confidence';
        return 'very-low-confidence';
    }

    /**
     * Démarre le suivi de progression pour un job
     */
    private startProgressTracking(jobId: string): void {
        console.log('📊 Démarrage du suivi de progression pour le job:', jobId);
        
        let isCompleted = false; // Flag pour éviter les appels répétés
        let retryCount = 0;
        const maxRetries = 3;
        
        // Polling de la progression toutes les 5 secondes avec retry limité (plus long pour permettre le traitement)
        const progressInterval = setInterval(() => {
            if (isCompleted) {
                clearInterval(progressInterval);
                return;
            }
            
            this.reconciliationService.getJobProgress(jobId).subscribe({
                next: (progress: any) => {
                    console.log('📊 Progression reçue:', progress);
                    console.log('📊 Progress value:', progress.progress, 'Step:', progress.step);
                    
                    if (progress) {
                        this.progressPercentage = progress.progress || 0;
                        this.progressStep = progress.step || 'Traitement en cours...';
                        
                        // Si la réconciliation est terminée ou a échoué
                        if (progress.progress >= 100 || progress.step.includes('Échec')) {
                            console.log('✅ Réconciliation terminée, arrêt du polling');
                            isCompleted = true;
                            clearInterval(progressInterval);
                            this.showProgress = false;
                            
                            if (progress.step.includes('Échec')) {
                                this.error = progress.step;
                            } else {
                                console.log('📋 Chargement des résultats...');
                                this.isLoading = false; // Important : mettre isLoading à false
                                this.loadReconciliationResults(jobId);
                            }
                            this.cd.detectChanges();
                        } else {
                            this.cd.detectChanges();
                        }
                    }
                },
                error: (error) => {
                    console.error('❌ Erreur lors du suivi de progression:', error);
                    
                    // Si c'est une erreur 404, c'est normal pendant le traitement initial
                    if (error.status === 404) {
                        console.log('⚠️ Job en cours de traitement (404 normal), continuation du polling...');
                        // Ne pas incrémenter retryCount pour les 404
                        this.cd.detectChanges();
                        return;
                    }
                    
                    retryCount++;
                    
                    if (retryCount >= maxRetries) {
                        console.log('⚠️ Nombre maximum de tentatives atteint, arrêt du processus');
                        isCompleted = true;
                        clearInterval(progressInterval);
                        this.showProgress = false;
                        this.isLoading = false;
                        
                        // Afficher un message d'erreur clair au lieu de continuer avec des données factices
                        this.error = `Impossible de suivre la progression de la réconciliation. 
                            Erreur: ${error.status || 'Unknown'} - ${error.message || 'Unknown error'}. 
                            Veuillez contacter le support technique.`;
                        this.cd.detectChanges();
                    } else {
                        console.log(`⚠️ Tentative ${retryCount}/${maxRetries} échouée, nouvelle tentative dans 5 secondes`);
                        this.cd.detectChanges();
                    }
                }
            });
        }, 5000); // Polling toutes les 5 secondes
        
        // Timeout de 60 secondes pour permettre le traitement asynchrone
        setTimeout(() => {
            if (!isCompleted) {
                console.log('⏰ Timeout atteint, arrêt du processus');
                isCompleted = true;
                clearInterval(progressInterval);
                this.showProgress = false;
                this.isLoading = false;
                
                // Afficher un message d'erreur de timeout
                this.error = `Délai d'attente dépassé pour la réconciliation. 
                    Le processus prend plus de temps que prévu. 
                    Veuillez réessayer ou contacter le support technique.`;
                this.cd.detectChanges();
            }
        }, 60000);
        
        // Nettoyer l'intervalle lors de la destruction du composant
        this.destroy$.subscribe({
            next: () => {
                clearInterval(progressInterval);
            }
        });
    }

    /**
     * Charge les résultats de la réconciliation
     */
    private loadReconciliationResults(jobId: string): void {
        console.log('📋 Chargement des résultats pour le job:', jobId);
        
        this.reconciliationService.getJobResults(jobId).subscribe({
            next: (results: any) => {
                console.log('📊 Résultats reçus du backend:', results);
                
                // Extraire les résultats de la réponse
                let reconciliationResult;
                if (results && results.result) {
                    reconciliationResult = results.result;
                } else if (results && results.matches !== undefined) {
                    reconciliationResult = results;
                } else {
                    console.error('❌ Aucun résultat valide reçu du backend');
                    this.error = 'Aucun résultat de réconciliation valide reçu du serveur';
                    this.isLoading = false;
                    this.cd.detectChanges();
                    return;
                }
                
                // Traitement universel des résultats (magique et manuel)
                        this.reconciliationResponse = {
                            totalMatches: reconciliationResult.totalMatches || 0,
                            totalMismatches: reconciliationResult.totalMismatches || 0,
                            totalBoOnly: reconciliationResult.totalBoOnly || 0,
                            totalPartnerOnly: reconciliationResult.totalPartnerOnly || 0,
                            totalBoRecords: reconciliationResult.totalBoRecords || 0,
                            totalPartnerRecords: reconciliationResult.totalPartnerRecords || 0,
                            matches: reconciliationResult.matches || [],
                            mismatches: reconciliationResult.mismatches || [],
                            boOnly: reconciliationResult.boOnly || [],
                            partnerOnly: reconciliationResult.partnerOnly || []
                        };
                        
                        this.executionTime = reconciliationResult.executionTime || 0;
                        this.processedRecords = reconciliationResult.processedRecords || 0;
                        
                        console.log('✅ Résultats chargés:', this.reconciliationResponse);
                        
                        // Stocker les résultats dans AppStateService
                        this.appStateService.setReconciliationResults(this.reconciliationResponse);
                        
                // Rediriger vers la page des résultats
                this.router.navigate(['/results'], { queryParams: { jobId } });
                
                this.cd.detectChanges();
            },
            error: (error) => {
                console.error('❌ Erreur lors du chargement des résultats:', error);
                this.error = `Impossible de récupérer les résultats de la réconciliation. Erreur: ${error.status} - ${error.message}`;
                this.isLoading = false;
                this.cd.detectChanges();
            }
        });
    }



    /**
     * Navigation vers le mode assisté
     */
    goToAssistedMode(): void {
        this.router.navigate(['/column-selection'], { queryParams: { mode: 'assisted' } });
    }

    /**
     * Navigation vers le mode manuel
     */
    goToManualMode(): void {
        this.router.navigate(['/column-selection']);
    }

    /**
     * Démarre le mode assisté
     */
    async startAssistedMode(): Promise<void> {
        console.log('🔍 Démarrage du mode assisté...');
        
        // Vérifier si des fichiers sont disponibles dans l'état
        const uploadedFiles = this.appStateService.getUploadedFiles();
        console.log('📁 Fichiers récupérés:', {
            boFile: uploadedFiles.boFile?.name,
            partnerFile: uploadedFiles.partnerFile?.name,
            boFileExists: !!uploadedFiles.boFile,
            partnerFileExists: !!uploadedFiles.partnerFile
        });
        
        if (!uploadedFiles.boFile || !uploadedFiles.partnerFile) {
            console.log('⚠️ Aucun fichier disponible, redirection vers le launcher...');
            // Rediriger vers le launcher pour permettre l'upload des fichiers
            this.router.navigate(['/reconciliation-launcher'], { queryParams: { mode: 'assisted' } });
            return;
        }
        
        try {
            console.log('🔄 Début du parsing des fichiers...');
            
            // Parser les fichiers CSV
            console.log('📊 Parsing du fichier BO:', uploadedFiles.boFile.name);
            const boData = await this.parseCsvFile(uploadedFiles.boFile);
            console.log('📊 Parsing du fichier Partner:', uploadedFiles.partnerFile.name);
            const partnerData = await this.parseCsvFile(uploadedFiles.partnerFile);
            
            console.log('💾 Sauvegarde des données dans le service...');
            // Sauvegarder les données parsées dans le service
            this.appStateService.setBoData(boData);
            this.appStateService.setPartnerData(partnerData);
            
            console.log('✅ Fichiers parsés et données sauvegardées:', {
                boRecords: boData.length,
                partnerRecords: partnerData.length
            });
            
            // Vérifier que les données sont bien sauvegardées
            const savedBoData = this.appStateService.getBoData();
            const savedPartnerData = this.appStateService.getPartnerData();
            console.log('🔍 Vérification de la sauvegarde:', {
                savedBoRecords: savedBoData.length,
                savedPartnerRecords: savedPartnerData.length
            });
            
            console.log('🚀 Redirection vers la page de sélection de colonnes...');
            // Rediriger vers la page de sélection de colonnes
            this.router.navigate(['/column-selection'], { queryParams: { mode: 'assisted' } });
            
        } catch (error) {
            console.error('❌ Erreur lors du parsing des fichiers:', error);
            this.error = 'Erreur lors de la lecture des fichiers: ' + (error instanceof Error ? error.message : 'Erreur inconnue');
            this.cd.detectChanges();
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
                    
                    // Parser l'en-tête
                    const headers = lines[0].split(',').map(h => h.trim());
                    console.log(`🏷️ En-têtes trouvées dans ${file.name}:`, headers);
                    
                    const data: Record<string, string>[] = [];
                    
                    // Parser les données (limitées à 1000 lignes pour les performances)
                    const maxLines = Math.min(lines.length - 1, 1000);
                    console.log(`📊 Parsing de ${maxLines} lignes de données dans ${file.name}`);
                    
                    for (let i = 1; i <= maxLines; i++) {
                        if (lines[i].trim().length === 0) continue;
                        
                        const values = lines[i].split(',').map(v => v.trim());
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
     * Démarre le mode magique avec flux robuste en deux étapes
     */
    async startMagicMode(): Promise<void> {
        console.log('🪄 Démarrage du mode magique (flux robuste)...');
        
        // Vérifier si des fichiers sont disponibles dans l'état
        const uploadedFiles = this.appStateService.getUploadedFiles();
        
        if (!uploadedFiles.boFile || !uploadedFiles.partnerFile) {
            console.log('⚠️ Aucun fichier disponible, redirection vers le launcher...');
            this.router.navigate(['/reconciliation-launcher'], { queryParams: { mode: 'magic' } });
            return;
        }
        
        // Afficher l'état de chargement
        this.isLoading = true;
        this.error = null;
        
        try {
            // Créer un FormData avec les fichiers disponibles
            const formData = new FormData();
            formData.append('boFile', uploadedFiles.boFile);
            formData.append('partnerFile', uploadedFiles.partnerFile);
            
            // Étape 1: Analyse des clés de réconciliation
            console.log('🔍 Étape 1: Analyse des clés de réconciliation...');
            const analysisResponse = await this.reconciliationService.analyzeReconciliationKeys(formData).toPromise();
            
            if (!analysisResponse || !analysisResponse.suggestions || analysisResponse.suggestions.length === 0) {
                throw new Error('Aucune suggestion de clé trouvée lors de l\'analyse');
            }
            
            // Trouver la suggestion avec le plus haut score de confiance
            const bestSuggestion = analysisResponse.suggestions.reduce((best, current) => 
                current.confidence > best.confidence ? current : best
            );
            
            console.log('🎯 Meilleure suggestion trouvée:', bestSuggestion);
            
            // Étape 2: Décision basée sur le seuil de confiance
            if (bestSuggestion.confidence > 0.90) {
                console.log('✅ Confiance élevée détectée, lancement de la réconciliation...');
                
                // Créer la configuration de réconciliation
                const config: ReconciliationConfig = {
                    boFile: uploadedFiles.boFile,
                    partnerFile: uploadedFiles.partnerFile,
                    boReconciliationKey: bestSuggestion.boColumn,
                    partnerReconciliationKey: bestSuggestion.partnerColumn,
                    additionalKeys: bestSuggestion.additionalKeys || [],
                    tolerance: 0.01 // Tolérance par défaut
                };
                
                // Lancer la réconciliation
                const reconciliationResponse = await this.reconciliationService.executeReconciliation(config).toPromise();
                
                if (reconciliationResponse) {
                    console.log('✅ Réconciliation terminée:', reconciliationResponse);
                    // La réconciliation est déjà terminée avec l'API /reconcile, 
                    // on peut directement charger les résultats
                    this.loadReconciliationResults(null);
                } else {
                    throw new Error('Aucune réponse reçue lors de la réconciliation');
                }
            } else {
                console.warn('⚠️ Confiance insuffisante:', bestSuggestion.confidence);
                this.error = `Échec de la détection automatique : Confiance insuffisante (${(bestSuggestion.confidence * 100).toFixed(1)}%). Veuillez utiliser le Mode Assisté pour choisir les clés manuellement.`;
                this.isLoading = false;
            }
            
        } catch (error) {
            console.error('❌ Erreur lors du démarrage du mode magique:', error);
            this.error = 'Erreur lors du démarrage du mode magique: ' + (error instanceof Error ? error.message : 'Erreur inconnue');
            this.isLoading = false;
        } finally {
            this.cd.detectChanges();
        }
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
        console.log('✅ Mode HTTP classique activé');

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
        return 'Connecté (HTTP)';
    }

    /**
     * Obtient la classe CSS pour le statut de connexion
     */
    getConnectionStatusClass(): string {
        return 'connected';
    }



    private createRealisticMockData(): any[] {
        // Créer des données simulées réalistes basées sur vos fichiers CSV
        const mockData = [];
        
        // Générer 10 correspondances réalistes
        for (let i = 1; i <= 10; i++) {
            const key = `CLE${i.toString().padStart(3, '0')}`;
            const amount = (1000000 + i * 50000).toString();
            const date = `2024-01-${(15 + i).toString().padStart(2, '0')}`;
            const agency = `Agence ${String.fromCharCode(65 + (i % 5))}`;
            const service = `Service ${(i % 3) + 1}`;
            
            mockData.push({
                key: key,
                boData: {
                    'CLE': key,
                    'montant': amount,
                    'Date': date,
                    'Agence': agency,
                    'Service': service,
                    'IDTransaction': `${key}_CM`,
                    'Type': 'Transaction'
                },
                partnerData: {
                    'CLE': key,
                    'montant': amount,
                    'Date': date,
                    'Agence': agency,
                    'Service': service,
                    'Id': key,
                    'Type': 'Transaction'
                },
                differences: []
            });
        }
        
        return mockData;
    }
} 