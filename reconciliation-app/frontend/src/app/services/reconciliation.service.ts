import { Injectable, OnInit, OnDestroy } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, Subject, timer, from, timeout } from 'rxjs';
import { catchError, tap, map, finalize, retry, takeUntil, switchMap } from 'rxjs/operators';
import { ReconciliationRequest } from '../models/reconciliation-request.model';
import { ReconciliationResponse } from '../models/reconciliation-response.model';
import { AppStateService } from './app-state.service';

export interface ReconciliationConfig {
    boFile: File;
    partnerFile: File;
    boReconciliationKey: string;
    partnerReconciliationKey: string;
    additionalKeys?: Array<{ boColumn: string; partnerColumn: string }>;
    tolerance?: number;
}

export interface ChunkProcessingConfig {
    boReconciliationKey: string;
    partnerReconciliationKey: string;
}

export interface ProgressUpdate {
    percentage: number;
    processed: number;
    total: number;
    step: string;
    currentFile?: number;
    totalFiles?: number;
    estimatedTimeRemaining?: number;
    // Informations détaillées pour le traitement par chunks
    currentBoChunk?: number;
    totalBoChunks?: number;
    matchesCount?: number;
    boOnlyCount?: number;
    partnerRemaining?: number;
}

@Injectable({
    providedIn: 'root'
})
export class ReconciliationService implements OnInit, OnDestroy {
    private apiUrl = '/api/reconciliation';
    private memoryResults = new Map<string, any>(); // Stockage en mémoire pour les gros fichiers
    
    // Progress management
    private progressSubject = new BehaviorSubject<ProgressUpdate>({
        percentage: 0,
        processed: 0,
        total: 0,
        step: '',
        currentFile: 0,
        totalFiles: 0,
        estimatedTimeRemaining: 0
    });
    
    public progress$ = this.progressSubject.asObservable();
    
    // Job management
    private currentJobId: string | null = null;
    private destroy$ = new Subject<void>();
    
    constructor(private http: HttpClient, private appStateService: AppStateService) {
        console.log('🚀 ReconciliationService initialisé - Mode HTTP classique');
    }

    ngOnInit(): void {
        // Initialisation si nécessaire
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Démarre la réconciliation avec upload des fichiers
     * Mode HTTP classique sans WebSocket
     */
    startReconciliation(config: ReconciliationConfig): Observable<{ jobId: string; status: string }> {
        console.log('🚀 Démarrage de la réconciliation HTTP classique');
        
        // Détecter si c'est un gros fichier nécessitant un traitement par chunks
        const isLargeFile = this.isLargeFile(config.boFile, config.partnerFile);
        
        if (isLargeFile) {
            console.log('📊 Gros fichier détecté, utilisation du traitement par chunks');
            return this.startChunkedReconciliation(config);
        }
        
        // Créer le FormData pour l'upload
        const formData = new FormData();
        formData.append('boFile', config.boFile);
        formData.append('partnerFile', config.partnerFile);
        formData.append('boReconciliationKey', config.boReconciliationKey);
        formData.append('partnerReconciliationKey', config.partnerReconciliationKey);
        
        if (config.additionalKeys) {
            formData.append('additionalKeys', JSON.stringify(config.additionalKeys));
        }
        
        if (config.tolerance) {
            formData.append('tolerance', config.tolerance.toString());
        }

        // Mettre à jour la progression
        this.updateProgress({
            percentage: 10,
            processed: 0,
            total: 100,
            step: 'Upload des fichiers...',
            estimatedTimeRemaining: 30000
        });

        return this.http.post<{ jobId: string; status: string }>(`${this.apiUrl}/upload-and-prepare`, formData)
            .pipe(
                tap(response => {
                    console.log('✅ Job créé:', response);
                    this.currentJobId = response.jobId;
                    
                    this.updateProgress({
                        percentage: 20,
                        processed: 0,
                        total: 100,
                        step: 'Traitement en cours...',
                        estimatedTimeRemaining: 25000
                    });
                }),
                catchError(this.handleError)
            );
    }

    /**
     * Démarre la réconciliation par chunks pour les gros fichiers
     */
    private startChunkedReconciliation(config: ReconciliationConfig): Observable<{ jobId: string; status: string }> {
        console.log('🔄 Démarrage de la réconciliation par chunks');
        
        // Pour les très gros fichiers, utiliser le traitement côté frontend
        if (this.isVeryLargeFile(config.boFile, config.partnerFile)) {
            console.log('📊 Très gros fichier détecté, utilisation du traitement frontend');
            return this.startFrontendChunkedReconciliation(config);
        }
        
        // Créer le FormData avec indication de traitement par chunks
        const formData = new FormData();
        formData.append('boFile', config.boFile);
        formData.append('partnerFile', config.partnerFile);
        formData.append('boReconciliationKey', config.boReconciliationKey);
        formData.append('partnerReconciliationKey', config.partnerReconciliationKey);
        formData.append('chunkedProcessing', 'true'); // Indicateur pour le backend
        
        if (config.additionalKeys) {
            formData.append('additionalKeys', JSON.stringify(config.additionalKeys));
        }
        
        if (config.tolerance) {
            formData.append('tolerance', config.tolerance.toString());
        }

        // Mettre à jour la progression
        this.updateProgress({
            percentage: 5,
            processed: 0,
            total: 100,
            step: 'Préparation du traitement par chunks...',
            estimatedTimeRemaining: 60000
        });

        return this.http.post<{ jobId: string; status: string }>(`${this.apiUrl}/upload-and-prepare-chunked`, formData)
            .pipe(
                tap(response => {
                    console.log('✅ Job par chunks créé:', response);
                    this.currentJobId = response.jobId;
                    
                    this.updateProgress({
                        percentage: 15,
                        processed: 0,
                        total: 100,
                        step: 'Traitement par chunks en cours...',
                        estimatedTimeRemaining: 45000
                    });
                }),
                catchError(this.handleError)
            );
    }

    /**
     * Démarre la réconciliation par chunks côté frontend pour les très gros fichiers
     */
    private startFrontendChunkedReconciliation(config: ReconciliationConfig): Observable<{ jobId: string; status: string }> {
        console.log('🔄 Démarrage de la réconciliation par chunks côté frontend');
        
        return new Observable(observer => {
            // Simuler un job ID pour le traitement frontend
            const jobId = `frontend-chunked-${Date.now()}`;
            this.currentJobId = jobId;
            
            // Mettre à jour la progression
            this.updateProgress({
                percentage: 10,
                processed: 0,
                total: 100,
                step: 'Traitement frontend par chunks...',
                estimatedTimeRemaining: 120000
            });
            
            // Lancer le traitement asynchrone
            this.processFrontendChunkedReconciliation(config, jobId)
                .then(() => {
                    observer.next({ jobId, status: 'completed' });
                    observer.complete();
                })
                .catch(error => {
                    observer.error(error);
                });
        });
    }

    /**
     * Traite la réconciliation par chunks côté frontend
     */
    private async processFrontendChunkedReconciliation(config: ReconciliationConfig, jobId: string): Promise<void> {
        try {
            console.log('🔄 Début du traitement frontend par chunks');
            
            // Lire les fichiers par chunks
            const boData = await this.readFileInChunks(config.boFile);
            const partnerData = await this.readFileInChunks(config.partnerFile);
            
            console.log(`📊 Données chargées: BO=${boData.length}, Partner=${partnerData.length}`);
            
            // Traitement par chunks de la réconciliation
            const chunkSize = 10000; // 10k lignes par chunk
            const results = {
                matchedRecords: [],
                unmatchedBoRecords: [],
                unmatchedPartnerRecords: [],
                totalBoRecords: boData.length,
                totalPartnerRecords: partnerData.length
            };
            
            // Traiter les données par chunks
            for (let i = 0; i < boData.length; i += chunkSize) {
                const boChunk = boData.slice(i, i + chunkSize);
                const partnerChunk = partnerData.slice(i, i + chunkSize);
                
                // Traitement du chunk (logique de réconciliation simplifiée)
                const chunkResults = this.processReconciliationChunk(boChunk, partnerChunk, config);
                
                // Fusionner les résultats
                results.matchedRecords.push(...chunkResults.matchedRecords);
                results.unmatchedBoRecords.push(...chunkResults.unmatchedBoRecords);
                results.unmatchedPartnerRecords.push(...chunkResults.unmatchedPartnerRecords);
                
                // Mettre à jour la progression
                const progress = Math.min(90, (i / boData.length) * 100);
                this.updateProgress({
                    percentage: progress,
                    processed: i,
                    total: boData.length,
                    step: `Traitement chunk ${Math.floor(i / chunkSize) + 1}...`,
                    estimatedTimeRemaining: Math.max(0, (boData.length - i) * 10)
                });
                
                // Permettre à l'interface de respirer
                if (i % (chunkSize * 5) === 0) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
            }
            
            // Sauvegarder les résultats
            this.saveChunkedResults(jobId, results, config);
            
            this.updateProgress({
                percentage: 100,
                processed: boData.length,
                total: boData.length,
                step: 'Traitement terminé',
                estimatedTimeRemaining: 0
            });
            
        } catch (error) {
            console.error('❌ Erreur lors du traitement frontend par chunks:', error);
            throw error;
        }
    }

    /**
     * Lit un fichier par chunks pour éviter les problèmes de mémoire
     */
    private async readFileInChunks(file: File): Promise<any[]> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            const data: any[] = [];
            
            reader.onload = (e) => {
                try {
                    const text = (e.target as FileReader).result as string;
                    const lines = text.split('\n');
                    
                    // Traitement par chunks des lignes
                    const chunkSize = 5000;
                    for (let i = 0; i < lines.length; i += chunkSize) {
                        const chunk = lines.slice(i, i + chunkSize);
                        // Traitement du chunk (parsing CSV simplifié)
                        const parsedChunk = this.parseCsvChunk(chunk);
                        data.push(...parsedChunk);
                    }
                    
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    /**
     * Parse un chunk de CSV
     */
    private parseCsvChunk(lines: string[]): any[] {
        const result: any[] = [];
        const headers = lines[0]?.split(';') || [];
        
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const values = lines[i].split(';');
                const row: any = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });
                result.push(row);
            }
        }
        
        return result;
    }

    /**
     * Traite un chunk de réconciliation
     */
    private processReconciliationChunk(boChunk: any[], partnerChunk: any[], config: ChunkProcessingConfig): any {
        const matchedRecords: any[] = [];
        const unmatchedBoRecords: any[] = [];
        const unmatchedPartnerRecords: any[] = [];
        
        // Créer un index des clés partenaires pour une recherche plus rapide
        const partnerIndex = new Map();
        partnerChunk.forEach(partner => {
            const key = partner[config.partnerReconciliationKey];
            if (key) {
                if (!partnerIndex.has(key)) {
                    partnerIndex.set(key, []);
                }
                partnerIndex.get(key).push(partner);
            }
        });
        
        // Traiter les enregistrements BO
        for (const boRecord of boChunk) {
            const boKey = boRecord[config.boReconciliationKey];
            if (boKey && partnerIndex.has(boKey)) {
                const matchingPartners = partnerIndex.get(boKey);
                // Prendre le premier partenaire correspondant
                const partnerRecord = matchingPartners.shift();
                matchedRecords.push({ bo: boRecord, partner: partnerRecord });
                
                // Marquer les autres partenaires comme non matchés si nécessaire
                if (matchingPartners.length > 0) {
                    unmatchedPartnerRecords.push(...matchingPartners);
                }
            } else {
                unmatchedBoRecords.push(boRecord);
            }
        }
        
        // Ajouter les partenaires non matchés
        partnerIndex.forEach((partners, key) => {
            if (partners.length > 0) {
                unmatchedPartnerRecords.push(...partners);
            }
        });
        
        return { matchedRecords, unmatchedBoRecords, unmatchedPartnerRecords };
    }

    /**
     * Sauvegarde les résultats du traitement par chunks
     */
    private saveChunkedResults(jobId: string, results: any, config?: ChunkProcessingConfig): void {
        try {
            console.log('💾 Sauvegarde des résultats complets...');
            
            // Sauvegarder toutes les données mais de manière optimisée
            const fullResults = {
                jobId: jobId,
                status: 'completed',
                totalBoRecords: results.totalBoRecords,
                totalPartnerRecords: results.totalPartnerRecords,
                totalMatched: results.matchedRecords.length,
                totalUnmatchedBo: results.unmatchedBoRecords.length,
                totalUnmatchedPartner: results.unmatchedPartnerRecords.length,
                boReconciliationKey: config?.boReconciliationKey || 'IDTransaction',
                partnerReconciliationKey: config?.partnerReconciliationKey || 'Identifiant de session API',
                // Sauvegarder TOUTES les données
                matchedRecords: results.matchedRecords,
                unmatchedBoRecords: results.unmatchedBoRecords,
                unmatchedPartnerRecords: results.unmatchedPartnerRecords,
                // Indicateur que c'est un traitement par chunks
                isChunkedProcessing: true,
                processedAt: new Date().toISOString()
            };
            
            // Sauvegarder par chunks pour éviter l'erreur de sérialisation
            this.saveResultsInChunks(jobId, fullResults);
            
            console.log('💾 Résultats complets sauvegardés:', {
                totalMatched: fullResults.totalMatched,
                totalUnmatchedBo: fullResults.totalUnmatchedBo,
                totalUnmatchedPartner: fullResults.totalUnmatchedPartner
            });
            
        } catch (error) {
            console.error('❌ Erreur lors de la sauvegarde des résultats:', error);
            // Sauvegarder au moins les métadonnées essentielles
            const minimalResults = {
                jobId: jobId,
                status: 'completed',
                totalBoRecords: results.totalBoRecords,
                totalPartnerRecords: results.totalPartnerRecords,
                totalMatched: results.matchedRecords.length,
                totalUnmatchedBo: results.unmatchedBoRecords.length,
                totalUnmatchedPartner: results.unmatchedPartnerRecords.length,
                isChunkedProcessing: true,
                processedAt: new Date().toISOString()
            };
            
            localStorage.setItem(`reconciliation-results-${jobId}`, JSON.stringify(minimalResults));
            console.log('💾 Résultats minimaux sauvegardés');
        }
    }

    /**
     * Sauvegarde les résultats par chunks pour éviter les erreurs de sérialisation
     */
    private saveResultsInChunks(jobId: string, results: any): void {
        try {
            // Pour les très gros fichiers, utiliser la mémoire en temps réel au lieu du localStorage
            if (results.totalMatched > 10000 || results.totalUnmatchedBo > 10000 || results.totalUnmatchedPartner > 10000) {
                console.log('📊 Fichier très volumineux détecté - Utilisation de la mémoire en temps réel');
                this.saveInMemory(jobId, results);
                return;
            }
            
            // Sauvegarder les métadonnées d'abord
            const metadata = {
                jobId: results.jobId,
                status: results.status,
                totalBoRecords: results.totalBoRecords,
                totalPartnerRecords: results.totalPartnerRecords,
                totalMatched: results.totalMatched,
                totalUnmatchedBo: results.totalUnmatchedBo,
                totalUnmatchedPartner: results.totalUnmatchedPartner,
                boReconciliationKey: results.boReconciliationKey,
                partnerReconciliationKey: results.partnerReconciliationKey,
                isChunkedProcessing: results.isChunkedProcessing,
                processedAt: results.processedAt
            };
            
            localStorage.setItem(`reconciliation-results-${jobId}`, JSON.stringify(metadata));
            console.log('💾 Métadonnées sauvegardées');
            
            // Sauvegarder les données par chunks plus petits
            const chunkSize = 500; // 500 enregistrements par chunk pour éviter le quota
            
            // Sauvegarder les matches par chunks
            for (let i = 0; i < results.matchedRecords.length; i += chunkSize) {
                const chunk = results.matchedRecords.slice(i, i + chunkSize);
                const chunkKey = `reconciliation-matches-${jobId}-${Math.floor(i / chunkSize)}`;
                try {
                    localStorage.setItem(chunkKey, JSON.stringify(chunk));
                } catch (error) {
                    console.warn(`⚠️ Quota localStorage atteint pour les matches, passage en mode mémoire`);
                    this.saveInMemory(jobId, results);
                    return;
                }
            }
            console.log(`💾 Matches sauvegardés en ${Math.ceil(results.matchedRecords.length / chunkSize)} chunks`);
            
            // Sauvegarder les unmatchedBo par chunks
            for (let i = 0; i < results.unmatchedBoRecords.length; i += chunkSize) {
                const chunk = results.unmatchedBoRecords.slice(i, i + chunkSize);
                const chunkKey = `reconciliation-bo-only-${jobId}-${Math.floor(i / chunkSize)}`;
                try {
                    localStorage.setItem(chunkKey, JSON.stringify(chunk));
                } catch (error) {
                    console.warn(`⚠️ Quota localStorage atteint pour les bo-only, passage en mode mémoire`);
                    this.saveInMemory(jobId, results);
                    return;
                }
            }
            console.log(`💾 UnmatchedBo sauvegardés en ${Math.ceil(results.unmatchedBoRecords.length / chunkSize)} chunks`);
            
            // Sauvegarder les unmatchedPartner par chunks
            for (let i = 0; i < results.unmatchedPartnerRecords.length; i += chunkSize) {
                const chunk = results.unmatchedPartnerRecords.slice(i, i + chunkSize);
                const chunkKey = `reconciliation-partner-only-${jobId}-${Math.floor(i / chunkSize)}`;
                try {
                    localStorage.setItem(chunkKey, JSON.stringify(chunk));
                } catch (error) {
                    console.warn(`⚠️ Quota localStorage atteint pour les partner-only, passage en mode mémoire`);
                    this.saveInMemory(jobId, results);
                    return;
                }
            }
            console.log(`💾 UnmatchedPartner sauvegardés en ${Math.ceil(results.unmatchedPartnerRecords.length / chunkSize)} chunks`);
            
        } catch (error) {
            console.error('❌ Erreur lors de la sauvegarde par chunks:', error);
            // En cas d'erreur, passer en mode mémoire
            this.saveInMemory(jobId, results);
        }
    }

    /**
     * Sauvegarde en mémoire pour les très gros fichiers
     */
    private saveInMemory(jobId: string, results: any): void {
        // Stocker en mémoire dans le service
        this.memoryResults.set(jobId, {
            jobId: results.jobId,
            status: results.status,
            totalBoRecords: results.totalBoRecords,
            totalPartnerRecords: results.totalPartnerRecords,
            totalMatched: results.totalMatched,
            totalUnmatchedBo: results.totalUnmatchedBo,
            totalUnmatchedPartner: results.totalUnmatchedPartner,
            boReconciliationKey: results.boReconciliationKey,
            partnerReconciliationKey: results.partnerReconciliationKey,
            isChunkedProcessing: results.isChunkedProcessing,
            processedAt: results.processedAt,
            // Stocker toutes les données en mémoire
            matchedRecords: results.matchedRecords,
            unmatchedBoRecords: results.unmatchedBoRecords,
            unmatchedPartnerRecords: results.unmatchedPartnerRecords
        });
        
        console.log('💾 Résultats sauvegardés en mémoire:', {
            totalMatched: results.totalMatched,
            totalUnmatchedBo: results.totalUnmatchedBo,
            totalUnmatchedPartner: results.totalUnmatchedPartner
        });
    }

    /**
     * Détermine si c'est un très gros fichier nécessitant un traitement frontend
     */
    private isVeryLargeFile(boFile: File, partnerFile: File): boolean {
        // Désactiver le traitement frontend pour forcer l'utilisation du backend
        // Le backend est plus optimisé pour les gros volumes et la logique de correspondance
        return false;
    }

    /**
     * Détermine si les fichiers nécessitent un traitement par chunks
     */
    private isLargeFile(boFile: File, partnerFile: File): boolean {
        const totalSize = boFile.size + partnerFile.size;
        const sizeThreshold = 50 * 1024 * 1024; // 50MB
        
        // Vérifier la taille totale
        if (totalSize > sizeThreshold) {
            return true;
        }
        
        // Vérifier le nombre de lignes estimé (basé sur la taille)
        const estimatedBoRows = Math.ceil(boFile.size / 100); // Estimation approximative
        const estimatedPartnerRows = Math.ceil(partnerFile.size / 100);
        
        return estimatedBoRows > 100000 || estimatedPartnerRows > 100000;
    }

    /**
     * Obtient le statut d'un job de réconciliation
     */
    getJobStatus(jobId: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/status/${jobId}`)
            .pipe(
                tap((status: any) => {
                    console.log('📊 Statut du job:', status);
                    
                    // Mettre à jour la progression basée sur le statut
                    if (status.progress) {
                        this.updateProgress({
                            percentage: status.progress.percentage || 0,
                            processed: status.progress.processed || 0,
                            total: status.progress.total || 100,
                            step: status.progress.step || 'Traitement...',
                            estimatedTimeRemaining: status.progress.estimatedTimeRemaining || 0
                        });
                    }
                }),
                catchError(this.handleError)
            );
    }

    /**
     * Obtient les résultats d'un job de réconciliation
     */
    getJobResults(jobId: string): Observable<ReconciliationResponse> {
        // Vérifier si c'est un job de traitement frontend
        if (jobId.startsWith('frontend-chunked-')) {
            return this.getFrontendChunkedResults(jobId);
        }
        
        return this.http.get<ReconciliationResponse>(`${this.apiUrl}/results/${jobId}`)
            .pipe(
                tap(results => {
                    console.log('✅ Résultats obtenus:', results);
                    
                    this.updateProgress({
                        percentage: 100,
                        processed: results.totalBoRecords + results.totalPartnerRecords,
                        total: results.totalBoRecords + results.totalPartnerRecords,
                        step: 'Terminé',
                        estimatedTimeRemaining: 0
                    });
                }),
                catchError(this.handleError)
            );
    }

    /**
     * Récupère les résultats du traitement frontend par chunks
     */
    private getFrontendChunkedResults(jobId: string): Observable<ReconciliationResponse> {
        return new Observable(observer => {
            try {
                // Vérifier d'abord en mémoire
                if (this.memoryResults.has(jobId)) {
                    const results = this.memoryResults.get(jobId);
                    console.log('✅ Résultats frontend récupérés depuis la mémoire:', results);
                    
                    // Convertir au format standard
                    const response: ReconciliationResponse = {
                        matches: results.matchedRecords.map(match => ({
                            key: match.bo[results.boReconciliationKey] || '',
                            boData: match.bo,
                            partnerData: match.partner,
                            differences: []
                        })),
                        boOnly: results.unmatchedBoRecords,
                        partnerOnly: results.unmatchedPartnerRecords,
                        mismatches: [],
                        totalBoRecords: results.totalBoRecords,
                        totalPartnerRecords: results.totalPartnerRecords,
                        totalMatches: results.totalMatched,
                        totalMismatches: 0,
                        totalBoOnly: results.totalUnmatchedBo,
                        totalPartnerOnly: results.totalUnmatchedPartner,
                        executionTimeMs: Date.now() - parseInt(jobId.split('-')[2]),
                        processedRecords: results.totalBoRecords + results.totalPartnerRecords,
                        progressPercentage: 100
                    };
                    
                    observer.next(response);
                    observer.complete();
                    return;
                }
                
                // Sinon, essayer le localStorage
                const resultsData = localStorage.getItem(`reconciliation-results-${jobId}`);
                if (resultsData) {
                    const results = JSON.parse(resultsData);
                    console.log('✅ Résultats frontend récupérés depuis localStorage:', results);
                    
                    // Vérifier si c'est un traitement par chunks avec données complètes
                    if (results.isChunkedProcessing) {
                        console.log('📊 Résultats de traitement par chunks détectés - Récupération des données complètes');
                        
                        // Récupérer toutes les données depuis les chunks
                        const allMatches = this.loadDataFromChunks(jobId, 'matches');
                        const allBoOnly = this.loadDataFromChunks(jobId, 'bo-only');
                        const allPartnerOnly = this.loadDataFromChunks(jobId, 'partner-only');
                        
                        console.log(`📊 Données complètes récupérées: ${allMatches.length} matches, ${allBoOnly.length} bo-only, ${allPartnerOnly.length} partner-only`);
                        
                        // Convertir au format standard
                        const response: ReconciliationResponse = {
                            matches: allMatches.map(match => ({
                                key: match.bo[results.boReconciliationKey] || '',
                                boData: match.bo,
                                partnerData: match.partner,
                                differences: []
                            })),
                            boOnly: allBoOnly,
                            partnerOnly: allPartnerOnly,
                            mismatches: [],
                            totalBoRecords: results.totalBoRecords,
                            totalPartnerRecords: results.totalPartnerRecords,
                            totalMatches: results.totalMatched,
                            totalMismatches: 0,
                            totalBoOnly: results.totalUnmatchedBo,
                            totalPartnerOnly: results.totalUnmatchedPartner,
                            executionTimeMs: Date.now() - parseInt(jobId.split('-')[2]),
                            processedRecords: results.totalBoRecords + results.totalPartnerRecords,
                            progressPercentage: 100
                        };
                        
                        observer.next(response);
                        observer.complete();
                    } else {
                        // Ancien format (pour compatibilité)
                        const response: ReconciliationResponse = {
                            matches: (results.matchedRecords || []).map(match => ({
                                key: match.bo[results.boReconciliationKey] || '',
                                boData: match.bo,
                                partnerData: match.partner,
                                differences: []
                            })),
                            boOnly: results.unmatchedBoRecords || [],
                            partnerOnly: results.unmatchedPartnerRecords || [],
                            mismatches: [],
                            totalBoRecords: results.totalBoRecords,
                            totalPartnerRecords: results.totalPartnerRecords,
                            totalMatches: results.matchedRecords?.length || 0,
                            totalMismatches: 0,
                            totalBoOnly: results.unmatchedBoRecords?.length || 0,
                            totalPartnerOnly: results.unmatchedPartnerRecords?.length || 0,
                            executionTimeMs: Date.now() - parseInt(jobId.split('-')[2]),
                            processedRecords: results.totalBoRecords + results.totalPartnerRecords,
                            progressPercentage: 100
                        };
                        
                        observer.next(response);
                        observer.complete();
                    }
                } else {
                    observer.error(new Error('Résultats non trouvés pour le job frontend'));
                }
            } catch (error) {
                observer.error(error);
            }
        });
    }

    /**
     * Charge les données depuis les chunks sauvegardés
     */
    private loadDataFromChunks(jobId: string, dataType: 'matches' | 'bo-only' | 'partner-only'): any[] {
        const allData: any[] = [];
        let chunkIndex = 0;
        
        while (true) {
            const chunkKey = `reconciliation-${dataType}-${jobId}-${chunkIndex}`;
            const chunkData = localStorage.getItem(chunkKey);
            
            if (!chunkData) {
                break; // Plus de chunks disponibles
            }
            
            try {
                const chunk = JSON.parse(chunkData);
                allData.push(...chunk);
                chunkIndex++;
            } catch (error) {
                console.error(`❌ Erreur lors du chargement du chunk ${chunkKey}:`, error);
                break;
            }
        }
        
        console.log(`📊 ${dataType}: ${allData.length} enregistrements chargés depuis ${chunkIndex} chunks`);
        return allData;
    }

    /**
     * Annule un job de réconciliation
     */
    cancelJob(jobId: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/cancel`, { jobId })
            .pipe(
                tap(() => {
                    console.log('❌ Job annulé:', jobId);
                    this.currentJobId = null;
                }),
                catchError(this.handleError)
            );
    }

    /**
     * Obtient la progression actuelle
     */
    getProgress(): Observable<ProgressUpdate> {
        return this.progress$;
    }

    /**
     * Met à jour la progression
     */
    private updateProgress(progress: ProgressUpdate): void {
        this.progressSubject.next(progress);
    }

    /**
     * Obtient l'ID du job actuel
     */
    getCurrentJobId(): string | null {
        return this.currentJobId;
    }

    /**
     * Vérifie si un job est en cours
     */
    isJobRunning(): boolean {
        return this.currentJobId !== null;
    }

    /**
     * Méthode de réconciliation classique (sans WebSocket)
     */
    reconcile(request: ReconciliationRequest): Observable<ReconciliationResponse> {
        console.log('🔄 Démarrage de la réconciliation classique');
        
        // Récupérer le type de réconciliation depuis le service d'état
        const reconciliationType = this.appStateService.getReconciliationType();
        request.reconciliationType = reconciliationType;
        
        console.log('🎯 Type de réconciliation utilisé:', reconciliationType);
        
        // Vérifier si les données sont trop volumineuses pour la sérialisation
        const boDataLength = request.boFileContent?.length || 0;
        const partnerDataLength = request.partnerFileContent?.length || 0;
        
        if (boDataLength > 100000 || partnerDataLength > 100000) {
            console.log('📊 Gros fichier détecté - Utilisation du traitement par chunks backend');
            console.log('🔍 Détails de la détection:', {
                boDataLength: boDataLength,
                partnerDataLength: partnerDataLength
            });
            return this.reconcileWithBackendChunks(request);
        }
        
        this.updateProgress({
            percentage: 0,
            processed: 0,
            total: 100,
            step: 'Démarrage de la réconciliation...',
            estimatedTimeRemaining: 30000
        });

        // Timeout de 60 minutes (3600000ms) pour les très gros fichiers (augmenté de 30 à 60 minutes)
        const RECONCILIATION_TIMEOUT = 3600000; // 60 minutes
        
        return this.http.post<ReconciliationResponse>(`${this.apiUrl}/reconcile`, request, {
            headers: new HttpHeaders({
                'Content-Type': 'application/json'
            })
        }).pipe(
            timeout(RECONCILIATION_TIMEOUT),
            tap(response => {
                console.log('✅ Réconciliation terminée:', response);
                
                this.updateProgress({
                    percentage: 100,
                    processed: response.totalBoRecords + response.totalPartnerRecords,
                    total: response.totalBoRecords + response.totalPartnerRecords,
                    step: 'Terminé',
                    estimatedTimeRemaining: 0
                });
            }),
            catchError(this.handleError)
        );
    }

    /**
     * Réconciliation par chunks avec le backend (utilise l'endpoint classique)
     */
    private reconcileWithBackendChunks(request: ReconciliationRequest): Observable<ReconciliationResponse> {
        console.log('🔄 Démarrage de la réconciliation par chunks backend optimisée');
        
        return new Observable(observer => {
            // Réduire la taille des chunks pour éviter les timeouts (50000 lignes au lieu de 100000)
            // Avec 258952 lignes Partner, des chunks plus petits réduisent le temps de traitement par requête
            const boDataLength = (request.boFileContent || []).length;
            const partnerDataLength = (request.partnerFileContent || []).length;
            
            // Ajuster dynamiquement la taille des chunks selon la taille des données
            // Optimisation : augmenter la taille des chunks pour réduire le nombre de requêtes
            let chunkSize = 50000; // Par défaut 50k lignes
            if (partnerDataLength > 200000 && partnerDataLength < 300000) {
                // Pour fichiers Partner moyens (200k-300k), utiliser 50k pour équilibrer vitesse/stabilité
                chunkSize = 50000;
                console.log('📊 Fichier Partner volumineux détecté - Utilisation de chunks optimisés (50k)');
            } else if (partnerDataLength >= 300000) {
                // Pour très gros fichiers Partner (>300k), réduire les chunks pour éviter les timeouts
                chunkSize = 40000; // 40k lignes pour très gros fichiers
                console.log('📊 Fichier Partner très volumineux détecté - Utilisation de chunks réduits (40k)');
            } else if (boDataLength > 200000) {
                chunkSize = 50000; // 50k lignes pour gros fichiers BO
            }
            
            // Diviser seulement les données BO en chunks
            const boChunks = this.createChunks(request.boFileContent || [], chunkSize);
            const allPartnerData = request.partnerFileContent || [];
            
            console.log(`📊 Données divisées: ${boChunks.length} chunks BO (${chunkSize} lignes/chunk), ${allPartnerData.length} lignes Partner complètes`);
            
            // Traiter chaque chunk BO avec TOUTES les lignes Partner
            this.processOptimizedChunks(request, boChunks, allPartnerData, [], observer);
        });
    }

    /**
     * Traite les chunks BO de manière optimisée avec toutes les lignes Partner
     * OPTIMISATION: Traitement parallèle avec limite de concurrence
     */
    private processOptimizedChunks(
        originalRequest: ReconciliationRequest, 
        boChunks: any[][], 
        allPartnerData: any[], 
        accumulatedResults: any[], 
        observer: any
    ): void {
        
        // OPTIMISATION: Utiliser un Map pour un accès O(1) au lieu de O(n) pour le filtrage
        // Créer un index des données Partner par clé pour un retrait rapide
        const partnerDataMap = new Map<string, any>();
        allPartnerData.forEach(partnerRow => {
            const key = partnerRow[originalRequest.partnerKeyColumn];
            if (key) {
                // Stocker la première occurrence de chaque clé (pour 1-1)
                if (!partnerDataMap.has(key)) {
                    partnerDataMap.set(key, partnerRow);
                }
            }
        });
        let remainingPartnerData = [...allPartnerData]; // Garder pour compatibilité avec le backend
        let allMatches: any[] = [];
        let allBoOnly: any[] = [];
        const startTime = Date.now(); // Pour calculer le temps d'exécution réel
        
        // OPTIMISATION: Traitement parallèle avec limite de concurrence adaptée à l'environnement
        // Détecter si on est en production (hostname de production uniquement, pas le port)
        const isProduction = typeof window !== 'undefined' && (
            window.location.hostname.includes('reconciliation.intouchgroup.net') ||
            (window.location.hostname.includes('intouchgroup') && !window.location.hostname.includes('localhost'))
        );
        
        // En production, utiliser un traitement séquentiel pour éviter les problèmes de connexion
        // En local, on peut être plus agressif avec le parallélisme
        let MAX_CONCURRENT_CHUNKS = isProduction 
            ? 1  // Production : traitement séquentiel (1 chunk à la fois) pour éviter les timeouts
            : Math.min(3, boChunks.length); // Local : max 3 chunks simultanés
        
        console.log(`🔧 Environnement détecté: ${isProduction ? 'PRODUCTION' : 'LOCAL'} - Limite de concurrence: ${MAX_CONCURRENT_CHUNKS} chunk(s)`);
        
        if (isProduction) {
            console.log('⚠️ Mode PRODUCTION: Traitement séquentiel activé pour éviter les problèmes de connexion');
        }
        
        let completedChunks = 0;
        const chunkResults = new Map<number, { matches: any[], boOnly: any[], matchedKeys: Set<string> }>();
        const processingChunks = new Set<number>();
        let consecutiveErrors = 0; // Compteur d'erreurs consécutives pour réduire la concurrence dynamiquement
        
        // Synchronisation pour éviter les conflits lors du retrait des données Partner
        const lock = { locked: false, queue: [] as Array<() => void> };
        
        const acquireLock = (): Promise<void> => {
            return new Promise((resolve) => {
                if (!lock.locked) {
                    lock.locked = true;
                    resolve();
                } else {
                    lock.queue.push(resolve);
                }
            });
        };
        
        const releaseLock = () => {
            lock.locked = false;
            if (lock.queue.length > 0) {
                const next = lock.queue.shift();
                if (next) {
                    lock.locked = true;
                    next();
                }
            }
        };
        
        const processChunk = async (chunkIndex: number) => {
            if (chunkIndex >= boChunks.length) {
                return;
            }
            
            const boChunk = boChunks[chunkIndex];
            processingChunks.add(chunkIndex);
            
            const modeText = MAX_CONCURRENT_CHUNKS === 1 ? 'séquentiel' : 'parallèle';
            console.log(`🔄 Traitement chunk BO ${chunkIndex + 1}/${boChunks.length} (${modeText}) avec ${remainingPartnerData.length} lignes Partner`);
            
            // Mettre à jour la progression
            this.progressSubject.next({
                percentage: Math.min(95, ((chunkIndex + 1) / boChunks.length) * 90),
                processed: chunkIndex + 1,
                total: boChunks.length,
                step: `Traitement chunk BO ${chunkIndex + 1}/${boChunks.length} (${modeText})`,
                currentBoChunk: chunkIndex + 1,
                totalBoChunks: boChunks.length,
                matchesCount: allMatches.length,
                boOnlyCount: allBoOnly.length,
                partnerRemaining: remainingPartnerData.length
            });
            
            // Acquérir le lock pour lire les données Partner actuelles
            await acquireLock();
            const currentPartnerData = [...remainingPartnerData]; // Copie pour ce chunk
            releaseLock();
            
            // 🔍 DEBUG: Log des clés et exemples de valeurs pour le premier chunk
            if (chunkIndex === 0) {
                console.log('🔍 DEBUG - Clés de réconciliation:');
                console.log(`  - BO Key Column: "${originalRequest.boKeyColumn}"`);
                console.log(`  - Partner Key Column: "${originalRequest.partnerKeyColumn}"`);
                
                // Vérifier que les colonnes existent dans les données
                if (boChunk.length > 0) {
                    const boColumns = Object.keys(boChunk[0]);
                    const boKeyExists = boColumns.includes(originalRequest.boKeyColumn);
                    console.log('🔍 DEBUG - Colonnes disponibles dans les données BO:', boColumns);
                    console.log(`🔍 DEBUG - Colonne clé BO existe? ${boKeyExists}`);
                    if (!boKeyExists) {
                        console.error(`❌ ERREUR: La colonne "${originalRequest.boKeyColumn}" n'existe pas dans les données BO!`);
                        console.error('  Colonnes disponibles:', boColumns);
                        // Chercher des colonnes similaires
                        const similarColumns = boColumns.filter(col => 
                            col.toLowerCase().includes(originalRequest.boKeyColumn.toLowerCase()) ||
                            originalRequest.boKeyColumn.toLowerCase().includes(col.toLowerCase())
                        );
                        if (similarColumns.length > 0) {
                            console.warn('  Colonnes similaires trouvées:', similarColumns);
                        }
                    }
                    
                    // Afficher quelques exemples de clés BO
                    const boKeys = boChunk.slice(0, 5).map(record => {
                        const key = record[originalRequest.boKeyColumn];
                        return {
                            key: key,
                            keyType: typeof key,
                            keyLength: key ? key.length : 0,
                            trimmed: key ? key.trim() : null,
                            exists: key !== undefined
                        };
                    });
                    console.log('🔍 DEBUG - Exemples de clés BO (5 premiers):', boKeys);
                }
                
                // Vérifier que les colonnes existent dans les données Partner
                if (currentPartnerData.length > 0) {
                    const partnerColumns = Object.keys(currentPartnerData[0]);
                    const partnerKeyExists = partnerColumns.includes(originalRequest.partnerKeyColumn);
                    console.log('🔍 DEBUG - Colonnes disponibles dans les données Partner:', partnerColumns);
                    console.log(`🔍 DEBUG - Colonne clé Partner existe? ${partnerKeyExists}`);
                    if (!partnerKeyExists) {
                        console.error(`❌ ERREUR: La colonne "${originalRequest.partnerKeyColumn}" n'existe pas dans les données Partner!`);
                        console.error('  Colonnes disponibles:', partnerColumns);
                        // Chercher des colonnes similaires
                        const similarColumns = partnerColumns.filter(col => 
                            col.toLowerCase().includes(originalRequest.partnerKeyColumn.toLowerCase()) ||
                            originalRequest.partnerKeyColumn.toLowerCase().includes(col.toLowerCase())
                        );
                        if (similarColumns.length > 0) {
                            console.warn('  Colonnes similaires trouvées:', similarColumns);
                        }
                    }
                    
                    // Afficher quelques exemples de clés Partner
                    const partnerKeys = currentPartnerData.slice(0, 5).map(record => {
                        const key = record[originalRequest.partnerKeyColumn];
                        return {
                            key: key,
                            keyType: typeof key,
                            keyLength: key ? key.length : 0,
                            trimmed: key ? key.trim() : null,
                            exists: key !== undefined
                        };
                    });
                    console.log('🔍 DEBUG - Exemples de clés Partner (5 premiers):', partnerKeys);
                    
                    // Vérifier si les clés correspondent
                    const boKeySet = new Set(boChunk.slice(0, 100).map(r => {
                        const key = r[originalRequest.boKeyColumn];
                        return key ? String(key).trim() : null;
                    }).filter(k => k !== null && k !== ''));
                    const partnerKeySet = new Set(currentPartnerData.slice(0, 100).map(r => {
                        const key = r[originalRequest.partnerKeyColumn];
                        return key ? String(key).trim() : null;
                    }).filter(k => k !== null && k !== ''));
                    const intersection = [...boKeySet].filter(k => partnerKeySet.has(k));
                    console.log(`🔍 DEBUG - Intersection des 100 premières clés: ${intersection.length} correspondances trouvées`);
                    console.log(`  - Clés BO uniques: ${boKeySet.size}`);
                    console.log(`  - Clés Partner uniques: ${partnerKeySet.size}`);
                    if (intersection.length === 0 && boKeySet.size > 0 && partnerKeySet.size > 0) {
                        console.warn('⚠️ DEBUG - Aucune correspondance trouvée dans les 100 premiers enregistrements!');
                        const firstBoKey = [...boKeySet][0];
                        const firstPartnerKey = [...partnerKeySet][0];
                        console.warn('  Exemple clé BO:', firstBoKey, `(type: ${typeof firstBoKey}, longueur: ${firstBoKey?.length})`);
                        console.warn('  Exemple clé Partner:', firstPartnerKey, `(type: ${typeof firstPartnerKey}, longueur: ${firstPartnerKey?.length})`);
                        console.warn('  Correspondance exacte?', firstBoKey === firstPartnerKey);
                        console.warn('  Correspondance après trim?', firstBoKey?.trim() === firstPartnerKey?.trim());
                        console.warn('  Correspondance ignore case?', firstBoKey?.toLowerCase() === firstPartnerKey?.toLowerCase());
                    }
                }
            }
            
            const chunkRequest: ReconciliationRequest = {
                ...originalRequest,
                boFileContent: boChunk,
                partnerFileContent: currentPartnerData
            };
            
            // Timeout de 60 minutes pour chaque chunk
            const RECONCILIATION_TIMEOUT = 3600000; // 60 minutes
            
            // Fonction de retry avec backoff exponentiel
            const processChunkWithRetry = (retryCount: number = 0, maxRetries: number = 3): Promise<void> => {
                return new Promise((resolve, reject) => {
                    const isTimeoutError = (error: any) => {
                        return error.name === 'TimeoutError' || 
                               error.status === 408 || 
                               error.status === 0 ||
                               error.message?.includes('timeout') ||
                               error.message?.includes('Timeout') ||
                               error.message?.includes('ERR_CONNECTION_RESET') ||
                               error.message?.includes('Connection reset') ||
                               (error.error && error.error.message && error.error.message.includes('timeout'));
                    };
                    
                    this.http.post<ReconciliationResponse>(`${this.apiUrl}/reconcile`, chunkRequest, {
                        headers: new HttpHeaders({
                            'Content-Type': 'application/json'
                        })
                    }).pipe(
                        timeout(RECONCILIATION_TIMEOUT),
                        retry({
                            count: 0,
                            delay: 0
                        })
                    ).subscribe({
                        next: async (response: ReconciliationResponse) => {
                            try {
                                // Réinitialiser le compteur d'erreurs en cas de succès
                                consecutiveErrors = Math.max(0, consecutiveErrors - 1);
                                
                                console.log(`✅ Chunk BO ${chunkIndex + 1} traité: ${response.matches?.length || 0} matches`);
                                
                                // Stocker les résultats pour traitement séquentiel
                                const matchedPartnerKeys = new Set<string>();
                                if (response.matches && response.matches.length > 0) {
                                    response.matches.forEach(match => {
                                        const key = match.partnerData?.[originalRequest.partnerKeyColumn];
                                        if (key) {
                                            matchedPartnerKeys.add(key);
                                        }
                                    });
                                }
                                
                                chunkResults.set(chunkIndex, {
                                    matches: response.matches || [],
                                    boOnly: response.boOnly || [],
                                    matchedKeys: matchedPartnerKeys
                                });
                                
                                // Traiter les résultats de manière séquentielle pour éviter les conflits
                                await processChunkResults();
                                
                                resolve();
                            } catch (error) {
                                console.error(`❌ Erreur lors du traitement des résultats du chunk BO ${chunkIndex + 1}:`, error);
                                reject(error);
                            }
                        },
                        error: (error) => {
                            const isTimeout = isTimeoutError(error);
                            
                            if (isTimeout && retryCount < maxRetries) {
                                consecutiveErrors++;
                                
                                // Réduire dynamiquement la concurrence si trop d'erreurs
                                if (consecutiveErrors >= 2 && MAX_CONCURRENT_CHUNKS > 1) {
                                    MAX_CONCURRENT_CHUNKS = Math.max(1, MAX_CONCURRENT_CHUNKS - 1);
                                    console.warn(`⚠️ Réduction de la concurrence à ${MAX_CONCURRENT_CHUNKS} chunk(s) en raison des erreurs répétées`);
                                }
                                
                                // En production, augmenter le délai de backoff pour laisser le serveur récupérer
                                const baseDelay = isProduction ? 3000 : 1000; // 3s en prod, 1s en local
                                const backoffDelay = Math.min(baseDelay * Math.pow(2, retryCount), isProduction ? 60000 : 30000);
                                console.warn(`⏰ Timeout chunk BO ${chunkIndex + 1} (tentative ${retryCount + 1}/${maxRetries}). Retry dans ${backoffDelay}ms...`);
                                
                                setTimeout(() => {
                                    processChunkWithRetry(retryCount + 1, maxRetries).then(resolve).catch(reject);
                                }, backoffDelay);
                            } else {
                                consecutiveErrors++;
                                
                                // Réduire la concurrence si erreur persistante
                                if (consecutiveErrors >= 3 && MAX_CONCURRENT_CHUNKS > 1) {
                                    MAX_CONCURRENT_CHUNKS = 1; // Passer en mode séquentiel
                                    console.warn(`⚠️ Passage en mode séquentiel (1 chunk) en raison des erreurs persistantes`);
                                }
                                
                                if (isTimeout) {
                                    console.error(`❌ Timeout persistant pour le chunk BO ${chunkIndex + 1} après ${maxRetries} tentatives`);
                                } else {
                                    console.error(`❌ Erreur lors du traitement du chunk BO ${chunkIndex + 1}:`, error);
                                }
                                
                                // En cas d'erreur, ajouter le chunk comme "bo-only"
                                chunkResults.set(chunkIndex, {
                                    matches: [],
                                    boOnly: boChunk,
                                    matchedKeys: new Set()
                                });
                                
                                processChunkResults().then(() => resolve()).catch(reject);
                            }
                        }
                    });
                });
            };
            
            return processChunkWithRetry();
        };
        
        // Fonction pour traiter les résultats des chunks de manière séquentielle
        const processChunkResults = async (): Promise<void> => {
            await acquireLock();
            try {
                // Traiter les chunks dans l'ordre, en commençant par le plus petit index disponible
                let nextChunkToProcess = completedChunks;
                while (chunkResults.has(nextChunkToProcess)) {
                    const result = chunkResults.get(nextChunkToProcess)!;
                    
                    // Ajouter les matches
                    if (result.matches.length > 0) {
                        allMatches.push(...result.matches);
                        
                        // Retirer les clés matchées du Map
                        result.matchedKeys.forEach(key => partnerDataMap.delete(key));
                        
                        // Retirer les lignes Partner matchées
                        const beforeCount = remainingPartnerData.length;
                        remainingPartnerData = remainingPartnerData.filter(partnerRow => {
                            const key = partnerRow[originalRequest.partnerKeyColumn];
                            return !result.matchedKeys.has(key);
                        });
                        
                        console.log(`📊 Chunk ${nextChunkToProcess + 1}: ${beforeCount - remainingPartnerData.length} lignes Partner retirées, ${remainingPartnerData.length} restantes`);
                    }
                    
                    // Ajouter les bo-only
                    if (result.boOnly.length > 0) {
                        allBoOnly.push(...result.boOnly);
                    }
                    
                    completedChunks++;
                    chunkResults.delete(nextChunkToProcess);
                    nextChunkToProcess++;
                    
                    // Mettre à jour la progression
                    this.progressSubject.next({
                        percentage: Math.min(95, (completedChunks / boChunks.length) * 90),
                        processed: completedChunks,
                        total: boChunks.length,
                        step: `Chunk BO ${completedChunks}/${boChunks.length} traité`,
                        currentBoChunk: completedChunks,
                        totalBoChunks: boChunks.length,
                        matchesCount: allMatches.length,
                        boOnlyCount: allBoOnly.length,
                        partnerRemaining: remainingPartnerData.length
                    });
                    
                    // Vérifier si tous les chunks sont terminés
                    if (completedChunks >= boChunks.length) {
                        console.log('✅ Tous les chunks BO traités, finalisation des résultats...');
                        this.finalizeOptimizedResults(allMatches, allBoOnly, remainingPartnerData, observer, startTime);
                    }
                }
            } finally {
                releaseLock();
            }
        };
        
        // Lancer le traitement avec limite de concurrence
        const startProcessing = async () => {
            // En production avec MAX_CONCURRENT_CHUNKS = 1, traitement séquentiel strict
            if (isProduction && MAX_CONCURRENT_CHUNKS === 1) {
                console.log('🔄 Mode séquentiel strict activé pour la production');
                for (let i = 0; i < boChunks.length; i++) {
                    try {
                        await processChunk(i);
                        // Délai entre les chunks en production pour laisser le serveur récupérer
                        if (i < boChunks.length - 1) {
                            console.log(`⏳ Pause de 1s avant le chunk suivant...`);
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                    } catch (error) {
                        console.error(`❌ Erreur lors du traitement du chunk ${i + 1}:`, error);
                        // Continuer avec le chunk suivant même en cas d'erreur
                    }
                }
            } else {
                // Traitement parallèle avec limite de concurrence
                const promises: Promise<void>[] = [];
                
                for (let i = 0; i < boChunks.length; i++) {
                    // Attendre qu'un slot soit disponible
                    while (processingChunks.size >= MAX_CONCURRENT_CHUNKS) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                    
                    // Lancer le traitement du chunk
                    const promise = processChunk(i).finally(() => {
                        processingChunks.delete(i);
                    });
                    
                    promises.push(promise);
                }
                
                // Attendre que tous les chunks soient terminés
                await Promise.allSettled(promises);
            }
        };
        
        startProcessing();
    }

    /**
     * Finalise les résultats optimisés
     */
    private finalizeOptimizedResults(
        allMatches: any[], 
        allBoOnly: any[], 
        remainingPartnerData: any[], 
        observer: any,
        startTime?: number
    ): void {
        try {
            console.log('📊 Finalisation des résultats optimisés:', {
                totalMatches: allMatches.length,
                totalBoOnly: allBoOnly.length,
                totalPartnerOnly: remainingPartnerData.length
            });
            
            // OPTIMISATION: Calculer le temps d'exécution réel
            const executionTimeMs = startTime ? Date.now() - startTime : 0;
            
            // Créer le résultat final avec gestion d'erreur
            const finalResult: ReconciliationResponse = {
                matches: allMatches,
                boOnly: allBoOnly,
                partnerOnly: remainingPartnerData,
                mismatches: [],
                totalBoRecords: allMatches.length + allBoOnly.length,
                totalPartnerRecords: allMatches.length + remainingPartnerData.length,
                totalMatches: allMatches.length,
                totalMismatches: 0,
                totalBoOnly: allBoOnly.length,
                totalPartnerOnly: remainingPartnerData.length,
                executionTimeMs: executionTimeMs,
                processedRecords: allMatches.length + allBoOnly.length + remainingPartnerData.length,
                progressPercentage: 100
            };
            
            console.log('✅ Résultats optimisés finalisés:', {
                matches: finalResult.matches.length,
                boOnly: finalResult.boOnly.length,
                partnerOnly: finalResult.partnerOnly.length,
                totalBoRecords: finalResult.totalBoRecords,
                totalPartnerRecords: finalResult.totalPartnerRecords
            });
            
            observer.next(finalResult);
            observer.complete();
            
        } catch (error) {
            console.error('❌ Erreur lors de la finalisation des résultats:', error);
            observer.error(error);
        }
    }

    /**
     * Agrège les résultats de tous les chunks
     */
    private aggregateChunkResults(accumulatedResults: any[], observer: any): void {
        console.log(`📊 Agrégation de ${accumulatedResults.length} résultats de chunks`);
        
        if (accumulatedResults.length === 0) {
            console.error('❌ Aucun résultat à agréger');
            observer.error(new Error('Aucun résultat à agréger'));
            return;
        }
        
        // Agrégation complète de tous les résultats
        const aggregatedResult: ReconciliationResponse = {
            matches: [],
            boOnly: [],
            partnerOnly: [],
            mismatches: [],
            totalBoRecords: 0,
            totalPartnerRecords: 0,
            totalMatches: 0,
            totalMismatches: 0,
            totalBoOnly: 0,
            totalPartnerOnly: 0,
            executionTimeMs: 0,
            processedRecords: 0,
            progressPercentage: 100
        };
        
        // Combiner tous les résultats
        accumulatedResults.forEach((result, index) => {
            if (result && result.matches) {
                aggregatedResult.matches.push(...result.matches);
                aggregatedResult.boOnly.push(...result.boOnly);
                aggregatedResult.partnerOnly.push(...result.partnerOnly);
                aggregatedResult.mismatches.push(...result.mismatches);
                
                aggregatedResult.totalBoRecords += result.totalBoRecords || 0;
                aggregatedResult.totalPartnerRecords += result.totalPartnerRecords || 0;
                aggregatedResult.totalMatches += result.totalMatches || 0;
                aggregatedResult.totalMismatches += result.totalMismatches || 0;
                aggregatedResult.totalBoOnly += result.totalBoOnly || 0;
                aggregatedResult.totalPartnerOnly += result.totalPartnerOnly || 0;
                aggregatedResult.executionTimeMs += result.executionTimeMs || 0;
                aggregatedResult.processedRecords += result.processedRecords || 0;
                
                console.log(`📊 Chunk ${index + 1}: ${result.matches?.length || 0} matches, ${result.boOnly?.length || 0} bo-only, ${result.partnerOnly?.length || 0} partner-only`);
            }
        });
        
        console.log('✅ Résultats agrégés avec succès:', {
            totalMatches: aggregatedResult.matches.length,
            totalBoOnly: aggregatedResult.boOnly.length,
            totalPartnerOnly: aggregatedResult.partnerOnly.length,
            totalBoRecords: aggregatedResult.totalBoRecords,
            totalPartnerRecords: aggregatedResult.totalPartnerRecords
        });
        
        observer.next(aggregatedResult);
        observer.complete();
    }

    /**
     * Crée des chunks à partir d'un tableau de données
     */
    private createChunks(data: any[], chunkSize: number): any[][] {
        const chunks: any[][] = [];
        for (let i = 0; i < data.length; i += chunkSize) {
            chunks.push(data.slice(i, i + chunkSize));
        }
        return chunks;
    }


    /**
     * Détermine si une requête de réconciliation nécessite un traitement par chunks
     */
    private isLargeReconciliationRequest(request: ReconciliationRequest): boolean {
        // Désactiver le traitement par chunks frontend pour forcer l'utilisation du backend
        // Le backend est plus optimisé pour les gros volumes et la logique de correspondance
        console.log('📊 Utilisation du backend pour tous les fichiers (traitement optimisé)');
        return false;
    }

    /**
     * Réconciliation par chunks pour les gros fichiers
     */
    private reconcileWithChunks(request: ReconciliationRequest): Observable<ReconciliationResponse> {
        console.log('🔄 Démarrage de la réconciliation par chunks');
        
        return new Observable(observer => {
            // Simuler un job ID pour le traitement frontend
            const jobId = `frontend-chunked-${Date.now()}`;
            this.currentJobId = jobId;
            
            // Mettre à jour la progression
            this.updateProgress({
                percentage: 10,
                processed: 0,
                total: 100,
                step: 'Traitement par chunks...',
                estimatedTimeRemaining: 120000
            });
            
            // Lancer le traitement asynchrone
            this.processReconciliationChunks(request, jobId)
                .then(() => {
                    // Récupérer les résultats
                    this.getFrontendChunkedResults(jobId).subscribe({
                        next: (response) => {
                            observer.next(response);
                            observer.complete();
                        },
                        error: (error) => {
                            observer.error(error);
                        }
                    });
                })
                .catch(error => {
                    observer.error(error);
                });
        });
    }

    /**
     * Traite la réconciliation par chunks
     */
    private async processReconciliationChunks(request: ReconciliationRequest, jobId: string): Promise<void> {
        try {
            console.log('🔄 Début du traitement par chunks');
            
            const boData = request.boFileContent || [];
            const partnerData = request.partnerFileContent || [];
            
            console.log(`📊 Données à traiter: BO=${boData.length}, Partner=${partnerData.length}`);
            
            // Traitement par chunks de la réconciliation
            const chunkSize = 10000; // 10k lignes par chunk
            const results = {
                matchedRecords: [],
                unmatchedBoRecords: [],
                unmatchedPartnerRecords: [],
                totalBoRecords: boData.length,
                totalPartnerRecords: partnerData.length
            };
            
            // Traiter les données par chunks
            for (let i = 0; i < boData.length; i += chunkSize) {
                const boChunk = boData.slice(i, i + chunkSize);
                const partnerChunk = partnerData.slice(i, i + chunkSize);
                
                // Traitement du chunk
                const chunkResults = this.processReconciliationChunk(boChunk, partnerChunk, {
                    boReconciliationKey: request.boKeyColumn,
                    partnerReconciliationKey: request.partnerKeyColumn
                } as ChunkProcessingConfig);
                
                // Fusionner les résultats
                results.matchedRecords.push(...chunkResults.matchedRecords);
                results.unmatchedBoRecords.push(...chunkResults.unmatchedBoRecords);
                results.unmatchedPartnerRecords.push(...chunkResults.unmatchedPartnerRecords);
                
                // Mettre à jour la progression
                const progress = Math.min(90, (i / boData.length) * 100);
                this.updateProgress({
                    percentage: progress,
                    processed: i,
                    total: boData.length,
                    step: `Traitement chunk ${Math.floor(i / chunkSize) + 1}...`,
                    estimatedTimeRemaining: Math.max(0, (boData.length - i) * 10)
                });
                
                // Permettre à l'interface de respirer
                if (i % (chunkSize * 5) === 0) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
            }
            
            // Sauvegarder les résultats
            this.saveChunkedResults(jobId, results, {
                boReconciliationKey: request.boKeyColumn,
                partnerReconciliationKey: request.partnerKeyColumn
            } as ChunkProcessingConfig);
            
            this.updateProgress({
                percentage: 100,
                processed: boData.length,
                total: boData.length,
                step: 'Traitement terminé',
                estimatedTimeRemaining: 0
            });
            
        } catch (error) {
            console.error('❌ Erreur lors du traitement par chunks:', error);
            throw error;
        }
    }

    /**
     * Test de santé du service
     */
    healthCheck(): Observable<any> {
        return this.http.get(`${this.apiUrl}/health`)
            .pipe(
                catchError(this.handleError)
            );
    }

    /**
     * Analyse les clés de réconciliation
     */
    analyzeReconciliationKeys(formData: FormData): Observable<any> {
        return this.http.post(`${this.apiUrl}/analyze-keys`, formData)
            .pipe(
                catchError(this.handleError)
            );
    }

    /**
     * Exécute la réconciliation
     */
    executeReconciliation(config: ReconciliationConfig): Observable<ReconciliationResponse> {
        return this.reconcile({
            boFileContent: [],
            partnerFileContent: [],
            boKeyColumn: config.boReconciliationKey,
            partnerKeyColumn: config.partnerReconciliationKey,
            additionalKeys: config.additionalKeys || [],
            comparisonColumns: [],
            selectedService: undefined,
            boColumnFilters: []
        });
    }

    /**
     * Annule la réconciliation
     */
    cancelReconciliation(jobId: string): Observable<any> {
        return this.cancelJob(jobId);
    }

    /**
     * Obtient la progression d'un job
     */
    getJobProgress(jobId: string): Observable<ProgressUpdate> {
        return this.getJobStatus(jobId).pipe(
            map((status: any) => ({
                percentage: status.progress?.percentage || 0,
                processed: status.progress?.processed || 0,
                total: status.progress?.total || 100,
                step: status.progress?.step || 'Traitement...',
                currentFile: status.progress?.currentFile || 0,
                totalFiles: status.progress?.totalFiles || 0,
                estimatedTimeRemaining: status.progress?.estimatedTimeRemaining || 0
            }))
        );
    }

    /**
     * Sauvegarde le résumé sélectionné
     */
    saveSelectedSummary(summary: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/save-summary`, summary)
            .pipe(
                catchError(this.handleError)
            );
    }

    /**
     * Efface les données
     */
    clearData(): void {
        this.currentJobId = null;
        this.updateProgress({
            percentage: 0,
            processed: 0,
            total: 0,
            step: '',
            currentFile: 0,
            totalFiles: 0,
            estimatedTimeRemaining: 0
        });
    }

    /**
     * Gestion des erreurs
     */
    private handleError = (error: HttpErrorResponse | any): Observable<never> => {
        console.error('❌ Erreur dans ReconciliationService:', error);
        
        let errorMessage = 'Une erreur est survenue';
        
        // Détecter les erreurs de timeout
        if (error.name === 'TimeoutError' || error.message?.includes('timeout') || error.message?.includes('Timeout')) {
            errorMessage = 'Le délai d\'attente a été dépassé. La réconciliation prend plus de temps que prévu. ' +
                          'Pour les très gros fichiers, veuillez patienter ou diviser les fichiers en plus petits lots.';
            console.warn('⏰ Timeout détecté lors de la réconciliation');
        } else if (error.error instanceof ErrorEvent) {
            // Erreur côté client
            errorMessage = `Erreur: ${error.error.message}`;
        } else if (error.status) {
            // Erreur côté serveur
            if (error.status === 504 || error.status === 408) {
                errorMessage = 'Le serveur a mis trop de temps à répondre. ' +
                              'Veuillez réessayer ou diviser les fichiers en plus petits lots.';
            } else {
                errorMessage = `Erreur ${error.status}: ${error.message || 'Erreur serveur'}`;
            }
            if (error.error && error.error.message) {
                errorMessage = error.error.message;
            }
        }
        
        // Mettre à jour la progression en cas d'erreur
        this.updateProgress({
            percentage: 0,
            processed: 0,
            total: 100,
            step: `Erreur: ${errorMessage}`,
            estimatedTimeRemaining: 0
        });
        
        return throwError(() => new Error(errorMessage));
    };
}