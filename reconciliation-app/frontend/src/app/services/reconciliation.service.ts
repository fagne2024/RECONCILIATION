import { Injectable, OnInit } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, timeout } from 'rxjs';
import { catchError, tap, map, finalize } from 'rxjs/operators';
import { ReconciliationRequest } from '../models/reconciliation-request.model';
import { ReconciliationResponse } from '../models/reconciliation-response.model';

@Injectable({
    providedIn: 'root'
})
export class ReconciliationService implements OnInit {
    private apiUrl = 'http://localhost:8080/api/reconciliation';
    private progressSubject: BehaviorSubject<number> | null = null;
    public progress$!: Observable<number>;
    private isInitialized = false;

    constructor(private http: HttpClient) {
        console.log('ReconciliationService constructor called');
        this.initializeProgressSubject();
    }

    ngOnInit(): void {
        // Cette méthode sera appelée automatiquement par Angular
        console.log('ReconciliationService ngOnInit called');
        this.ensureInitialized();
    }

    private ensureInitialized(): void {
        if (!this.isInitialized) {
            console.log('Ensuring service is initialized');
            this.initializeProgressSubject();
            this.isInitialized = true;
        }
    }

    private initializeProgressSubject(): void {
        if (!this.progressSubject) {
            console.log('Initializing progressSubject');
            this.progressSubject = new BehaviorSubject<number>(0);
            this.progress$ = this.progressSubject.asObservable();
        }
    }

    // Méthode sécurisée pour accéder au progressSubject
    private getProgressSubject(): BehaviorSubject<number> {
        this.ensureInitialized();
        if (!this.progressSubject) {
            console.warn('progressSubject was undefined, creating new instance');
            this.initializeProgressSubject();
        }
        return this.progressSubject!;
    }

    uploadFile(file: File): Observable<string> {
        this.ensureInitialized();
        const formData = new FormData();
        formData.append('file', file);

        return this.http.post<string>(`${this.apiUrl}/upload`, formData)
            .pipe(catchError(this.handleError));
    }

    /**
     * Normalise une valeur de clé pour la réconciliation avec une logique intelligente
     */
    private normalizeKeyValue(value: any): string {
        if (value === null || value === undefined) {
            return '';
        }
        
        let normalized = value.toString().trim();
        
        // 1. Supprimer les espaces multiples et en début/fin
        normalized = normalized.replace(/\s+/g, ' ').trim();
        
        // 2. Supprimer les préfixes courants (CI, PM, etc.) - optimisé
        const commonPrefixes = ['ci', 'pm', 'om', 'trx', 'tx'];
        for (const prefix of commonPrefixes) {
            if (normalized.toLowerCase().startsWith(prefix.toLowerCase())) {
                normalized = normalized.substring(prefix.length);
                break;
            }
        }
        
        // 3. Supprimer les caractères spéciaux courants (points, tirets, etc.)
        normalized = normalized.replace(/[.\-_]/g, '');
        
        // 4. Extraire uniquement les chiffres et lettres (supprimer les caractères spéciaux restants)
        normalized = normalized.replace(/[^\w]/g, '');
        
        // 5. Si la valeur ne contient que des chiffres, la garder telle quelle
        if (/^\d+$/.test(normalized)) {
            return normalized;
        }
        
        // 6. Pour les autres cas, convertir en minuscules
        normalized = normalized.toLowerCase();
        
        // 7. Si la valeur est vide après normalisation, essayer d'extraire des chiffres
        if (normalized === '') {
            const numbers = value.toString().match(/\d+/g);
            if (numbers && numbers.length > 0) {
                normalized = numbers.join('');
            }
        }
        
        return normalized;
    }

    /**
     * Normalise les données de réconciliation en appliquant des transformations sur les clés
     */
    private normalizeReconciliationData(request: ReconciliationRequest): ReconciliationRequest {
        const normalizedRequest = { ...request };
        
        // Normaliser les données BO
        if (normalizedRequest.boFileContent && normalizedRequest.boKeyColumn) {
            normalizedRequest.boFileContent = normalizedRequest.boFileContent.map(row => {
                const normalizedRow = { ...row };
                if (normalizedRow[normalizedRequest.boKeyColumn]) {
                    normalizedRow[normalizedRequest.boKeyColumn] = this.normalizeKeyValue(normalizedRow[normalizedRequest.boKeyColumn]);
                }
                return normalizedRow;
            });
        }
        
        // Normaliser les clés supplémentaires BO
        if (normalizedRequest.additionalKeys && normalizedRequest.boFileContent) {
            normalizedRequest.additionalKeys.forEach((keyPair) => {
                normalizedRequest.boFileContent = normalizedRequest.boFileContent.map(row => {
                    const normalizedRow = { ...row };
                    if (normalizedRow[keyPair.boColumn]) {
                        normalizedRow[keyPair.boColumn] = this.normalizeKeyValue(normalizedRow[keyPair.boColumn]);
                    }
                    return normalizedRow;
                });
            });
        }
        
        // Normaliser les données Partner
        if (normalizedRequest.partnerFileContent && normalizedRequest.partnerKeyColumn) {
            normalizedRequest.partnerFileContent = normalizedRequest.partnerFileContent.map(row => {
                const normalizedRow = { ...row };
                if (normalizedRow[normalizedRequest.partnerKeyColumn]) {
                    normalizedRow[normalizedRequest.partnerKeyColumn] = this.normalizeKeyValue(normalizedRow[normalizedRequest.partnerKeyColumn]);
                }
                return normalizedRow;
            });
        }
        
        // Normaliser les clés supplémentaires Partner
        if (normalizedRequest.additionalKeys && normalizedRequest.partnerFileContent) {
            normalizedRequest.additionalKeys.forEach((keyPair) => {
                normalizedRequest.partnerFileContent = normalizedRequest.partnerFileContent.map(row => {
                    const normalizedRow = { ...row };
                    if (normalizedRow[keyPair.partnerColumn]) {
                        normalizedRow[keyPair.partnerColumn] = this.normalizeKeyValue(normalizedRow[keyPair.partnerColumn]);
                    }
                    return normalizedRow;
                });
            });
        }
        
        return normalizedRequest;
    }

    /**
     * Détecte si la normalisation est nécessaire en analysant un échantillon des données
     */
    private isNormalizationNeeded(request: ReconciliationRequest): boolean {
        // Échantillon de 100 enregistrements pour détecter les patterns
        const sampleSize = Math.min(100, Math.min(
            request.boFileContent?.length || 0,
            request.partnerFileContent?.length || 0
        ));
        
        if (sampleSize === 0) return false;
        
        // Vérifier les clés BO
        for (let i = 0; i < sampleSize; i++) {
            const boRecord = request.boFileContent[i];
            const boKey = boRecord[request.boKeyColumn];
            
            if (boKey && (boKey.includes(' ') || boKey.includes('.') || boKey.includes('-') || boKey.includes('_'))) {
                return true; // Normalisation nécessaire
            }
        }
        
        // Vérifier les clés Partner
        for (let i = 0; i < sampleSize; i++) {
            const partnerRecord = request.partnerFileContent[i];
            const partnerKey = partnerRecord[request.partnerKeyColumn];
            
            if (partnerKey && (partnerKey.includes(' ') || partnerKey.includes('.') || partnerKey.includes('-') || partnerKey.includes('_'))) {
                return true; // Normalisation nécessaire
            }
        }
        
        return false; // Pas de normalisation nécessaire
    }

    reconcile(request: ReconciliationRequest): Observable<ReconciliationResponse> {
        this.ensureInitialized();
        
        console.log('🚀 Début de la réconciliation...');
        console.log('📊 Données de la requête:', {
            boDataLength: request.boFileContent?.length || 0,
            partnerDataLength: request.partnerFileContent?.length || 0,
            boKeyColumn: request.boKeyColumn,
            partnerKeyColumn: request.partnerKeyColumn,
            additionalKeys: request.additionalKeys?.length || 0
        });
        
        // Détecter si la normalisation est nécessaire
        const needsNormalization = this.isNormalizationNeeded(request);
        console.log(`🔧 Normalisation nécessaire: ${needsNormalization ? 'Oui' : 'Non'}`);
        
        // Normaliser les données avant la réconciliation (seulement si nécessaire)
        const normalizedRequest = needsNormalization ? this.normalizeReconciliationData(request) : request;
        
        console.log('📤 Envoi de la requête de réconciliation...');
        console.log('🔗 URL:', `${this.apiUrl}/reconcile`);
        
        // Utiliser la méthode sécurisée
        const progressSubject = this.getProgressSubject();
        
        // Commencer la progression avant l'envoi de la requête
        progressSubject.next(10);
        console.log('📈 Progression initialisée à 10%');
        
        // Créer un intervalle pour mettre à jour la progression pendant le traitement
        const progressInterval = setInterval(() => {
            const currentProgress = progressSubject.value;
            if (currentProgress < 90) {
                // Progression plus réaliste basée sur la taille des données
                const dataSize = (request.boFileContent?.length || 0) + (request.partnerFileContent?.length || 0);
                const progressIncrement = dataSize > 100000 ? 2 : 5; // Plus lent pour gros fichiers
                progressSubject.next(Math.min(90, currentProgress + progressIncrement));
                console.log(`📈 Progression mise à jour: ${Math.min(90, currentProgress + progressIncrement)}%`);
            }
        }, 1000);

        return this.http.post<ReconciliationResponse>(`${this.apiUrl}/reconcile`, normalizedRequest, {
            headers: new HttpHeaders({
                'Content-Type': 'application/json'
            })
        })
            .pipe(
                timeout(600000), // Timeout de 10 minutes
                tap(response => {
                    console.log('✅ Réponse de réconciliation reçue:', response);
                    console.log('📊 Résultats:', {
                        matches: response.matches?.length || 0,
                        boOnly: response.boOnly?.length || 0,
                        partnerOnly: response.partnerOnly?.length || 0,
                        mismatches: response.mismatches?.length || 0
                    });
                }),
                finalize(() => {
                    console.log('🏁 Finalisation de la réconciliation...');
                    clearInterval(progressInterval);
                    progressSubject.next(100);
                    console.log('✅ Réconciliation terminée avec succès');
                }),
                catchError(error => {
                    console.error('❌ Erreur lors de la réconciliation:', error);
                    console.error('🔍 Détails de l\'erreur:', {
                        status: error.status,
                        statusText: error.statusText,
                        message: error.message,
                        error: error.error
                    });
                    clearInterval(progressInterval);
                    progressSubject.next(0);
                    return this.handleError(error);
                })
            );
    }

    saveSummary(summary: any[]): Observable<any> {
        this.ensureInitialized();
        // Correction de l'URL pour correspondre à la route backend
        return this.http.post('http://localhost:8080/api/agency-summary/save', {
            summary,
            timestamp: new Date().toISOString()
        })
        .pipe(catchError(this.handleError));
    }

    saveSelectedSummary(summary: any[]): Observable<any> {
        return this.http.post('http://localhost:8080/api/agency-summary/save-selection', summary)
            .pipe(catchError(this.handleError));
    }

    startReconciliation(request: any): Observable<{ jobId: string }> {
        return this.http.post<{ jobId: string }>(`${this.apiUrl}/reconciliation/start`, request);
    }

    getProgress(jobId: string): Observable<{ progress: number }> {
        return this.http.get<{ progress: number }>(`${this.apiUrl}/reconciliation/progress`, { params: { jobId } });
    }

    private handleError(error: HttpErrorResponse) {
        let errorMessage = 'Une erreur est survenue';
        
        if (error.error instanceof ErrorEvent) {
            // Erreur côté client
            errorMessage = `Erreur: ${error.error.message}`;
        } else if (error.status === 0) {
            // Erreur de connexion au serveur
            errorMessage = 'Impossible de se connecter au serveur. Veuillez vérifier que le serveur est en cours d\'exécution.';
        } else {
            // Erreur côté serveur
            errorMessage = `Code d'erreur: ${error.status}\nMessage: ${error.message}`;
            if (error.error && error.error.message) {
                errorMessage += `\nDétails: ${error.error.message}`;
            }
        }
        
        console.error('Erreur complète:', error);
        // Réinitialiser la progression en cas d'erreur
        try {
            const progressSubject = this.getProgressSubject();
            progressSubject.next(0);
        } catch (e) {
            console.error('Erreur lors de la réinitialisation de la progression:', e);
        }
        return throwError(() => new Error(errorMessage));
    }
} 