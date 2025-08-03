import { Injectable } from '@angular/core';
import { FileWatcherService, ProcessingSpecification } from './file-watcher.service';
import { ReconciliationService } from './reconciliation.service';
import { Observable, of, throwError } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http'; // Added for new methods
import { environment } from '../../environments/environment'; // Added for new methods

export interface FileModel {
  fileName: string;
  filePath: string;
  columns: string[];
  sampleData: any[];
  fileType: 'csv' | 'excel' | 'json';
  recordCount: number;
}

export interface AutoProcessingModel {
  id: string;
  name: string;
  filePattern: string;
  fileType: 'bo' | 'partner' | 'both';
  processingSteps: ProcessingStep[];
  autoApply: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Nouveau champ pour référencer le fichier modèle
  templateFile?: string;
  // Configuration des clés de réconciliation
  reconciliationKeys?: {
    partnerKeys?: string[]; // Clés côté partenaire
    boKeys?: string[];      // Clés côté BO
    boModels?: string[];    // IDs des modèles BO sélectionnés (pour les modèles partenaire)
    boModelKeys?: {         // Clés spécifiques pour chaque modèle BO
      [modelId: string]: string[];
    };
    boTreatments?: {        // Traitements spécifiques pour chaque modèle BO
      [modelId: string]: ProcessingStep[];
    };
  };
}

export interface ProcessingStep {
  id: string;
  name: string;
  type: 'format' | 'validate' | 'transform' | 'filter' | 'calculate' | 'select' | 'deduplicate';
  field: string[];
  action: string;
  params?: any;
  description: string;
}

export interface ProcessingResult {
  success: boolean;
  fileName: string;
  modelId: string;
  originalData: any[];
  processedData: any[];
  appliedSteps: ProcessingStep[];
  errors: string[];
  warnings: string[];
  processingTime: number;
}

export interface AutoReconciliationResult {
  success: boolean;
  fileName: string;
  modelId: string;
  originalData: any[];
  processedData: any[];
  reconciliationResult: any;
  appliedSteps: ProcessingStep[];
  errors: string[];
  warnings: string[];
  processingTime: number;
  reconciliationTime: number;
}

@Injectable({
  providedIn: 'root'
})
export class AutoProcessingService {
  private processingModels: AutoProcessingModel[] = [];
  private apiUrl = environment.apiUrl; // Added for new methods

  constructor(
    private fileWatcherService: FileWatcherService,
    private reconciliationService: ReconciliationService,
    private http: HttpClient // Added for new methods
  ) {
    this.loadDefaultModels();
  }

  // Modèles de traitement prédéfinis
  private loadDefaultModels(): void {
    this.processingModels = [
      {
        id: 'bo-standard',
        name: 'BO Standard - Traitement automatique',
        filePattern: '*bo*.csv',
        fileType: 'bo',
        autoApply: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        processingSteps: [
          {
            id: 'format-amounts',
            name: 'Formatage des montants',
            type: 'format',
            field: ['montant'],
            action: 'currency',
            params: { locale: 'fr-FR', currency: 'EUR' },
            description: 'Convertit les montants au format monétaire français'
          },
          {
            id: 'validate-dates',
            name: 'Validation des dates',
            type: 'validate',
            field: ['date'],
            action: 'dateFormat',
            params: { format: 'DD/MM/YYYY' },
            description: 'Valide et formate les dates'
          },
          {
            id: 'clean-strings',
            name: 'Nettoyage des chaînes',
            type: 'transform',
            field: ['description'],
            action: 'trim',
            params: {},
            description: 'Supprime les espaces en début et fin'
          }
        ]
      },
      {
        id: 'partner-standard',
        name: 'Partenaire Standard - Traitement automatique',
        filePattern: '*partner*.csv',
        fileType: 'partner',
        autoApply: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        processingSteps: [
          {
            id: 'format-partner-amounts',
            name: 'Formatage des montants partenaire',
            type: 'format',
            field: ['montant'],
            action: 'currency',
            params: { locale: 'fr-FR', currency: 'EUR' },
            description: 'Convertit les montants au format monétaire français'
          },
          {
            id: 'validate-partner-dates',
            name: 'Validation des dates partenaire',
            type: 'validate',
            field: ['date'],
            action: 'dateFormat',
            params: { format: 'DD/MM/YYYY' },
            description: 'Valide et formate les dates'
          }
        ]
      }
    ];
  }

  // === NOUVELLES MÉTHODES POUR LES MODÈLES DE FICHIERS ===

  // Récupérer tous les fichiers disponibles dans watch-folder
  getAvailableFileModels(): Observable<FileModel[]> {
    console.log('🔍 Appel de getAvailableFileModels()');
    return this.fileWatcherService.getStatus().pipe(
      switchMap(status => {
        console.log('📊 Statut du service:', status);
        const url = `${this.apiUrl}/file-watcher/available-files`;
        console.log('🌐 URL de requête:', url);
        return this.http.get<FileModel[]>(url).pipe(
          map(files => {
            console.log('📄 Fichiers récupérés:', files);
            files.forEach(file => {
              console.log(`   - ${file.fileName}: ${file.columns.length} colonnes`);
            });
            return files;
          }),
          catchError(error => {
            console.error('❌ Erreur lors de la récupération des fichiers:', error);
            // Retourner des données de test en cas d'erreur
            console.log('🔄 Utilisation des données de test');
            return of(this.getTestFileModels());
          })
        );
      }),
      catchError(error => {
        console.error('❌ Erreur lors de la récupération du statut:', error);
        // Retourner des données de test en cas d'erreur
        console.log('🔄 Utilisation des données de test');
        return of(this.getTestFileModels());
      })
    );
  }

  // Méthode pour retourner des données de test
  private getTestFileModels(): FileModel[] {
    return [
      {
        fileName: 'CIMTNCM.csv',
        filePath: 'watch-folder/CIMTNCM.csv',
        columns: ['date', 'montant', 'description', 'reference', 'compte'],
        sampleData: [
          { date: '2025-08-01', montant: '1000.00', description: 'Transaction 1', reference: 'REF001', compte: 'CELCM001' },
          { date: '2025-08-02', montant: '2000.00', description: 'Transaction 2', reference: 'REF002', compte: 'CELCM002' }
        ],
        fileType: 'csv',
        recordCount: 100
      },
      {
        fileName: 'PMMTNCM.csv',
        filePath: 'watch-folder/PMMTNCM.csv',
        columns: ['date', 'montant', 'description', 'reference', 'partenaire'],
        sampleData: [
          { date: '2025-08-01', montant: '1500.00', description: 'Paiement 1', reference: 'PAY001', partenaire: 'PART001' },
          { date: '2025-08-02', montant: '2500.00', description: 'Paiement 2', reference: 'PAY002', partenaire: 'PART002' }
        ],
        fileType: 'csv',
        recordCount: 50
      }
    ];
  }

  // Analyser un fichier pour extraire ses colonnes et données d'exemple
  analyzeFileModel(filePath: string): Observable<FileModel> {
    return this.http.post<FileModel>(`${this.apiUrl}/file-watcher/analyze-file`, {
      filePath: filePath
    });
  }

  // Récupérer les colonnes d'un fichier spécifique
  getFileColumns(fileName: string): Observable<string[]> {
    return this.analyzeFileModel(fileName).pipe(
      map(fileModel => fileModel.columns)
    );
  }

  // Créer un modèle basé sur un fichier existant
  createModelFromFile(fileModel: FileModel, modelName: string, fileType: 'bo' | 'partner'): Observable<AutoProcessingModel> {
    const newModel: Omit<AutoProcessingModel, 'id' | 'createdAt' | 'updatedAt'> = {
      name: modelName,
      filePattern: `*${fileModel.fileName.split('.')[0]}*.${fileModel.fileName.split('.').pop()}`,
      fileType: fileType,
      processingSteps: [],
      autoApply: true,
      templateFile: fileModel.fileName
    };

    return this.createModel(newModel);
  }

  // Obtenir les colonnes disponibles pour un modèle
  getAvailableColumnsForModel(modelId: string): Observable<string[]> {
    return this.getModel(modelId).pipe(
      switchMap(model => {
        if (!model || !model.templateFile) {
          return of([]);
        }
        return this.getFileColumns(model.templateFile);
      })
    );
  }

  // === MÉTHODES EXISTANTES MODIFIÉES ===

  // Obtenir tous les modèles
  getModels(): Observable<AutoProcessingModel[]> {
    return this.http.get<{success: boolean, models: AutoProcessingModel[]}>(`${this.apiUrl}/auto-processing/models`)
      .pipe(
        map(response => {
          console.log('📥 Réponse du backend (getModels):', response);
          console.log('📋 Modèles reçus:', response.models);
          if (response.models && response.models.length > 0) {
            response.models.forEach((model, index) => {
              console.log(`📋 Modèle ${index + 1}:`, {
                id: model.id,
                name: model.name,
                processingStepsCount: model.processingSteps?.length || 0
              });
              if (model.processingSteps && model.processingSteps.length > 0) {
                model.processingSteps.forEach((step, stepIndex) => {
                  console.log(`🔧 Étape ${stepIndex + 1} du modèle ${index + 1}:`, {
                    name: step.name,
                    type: step.type,
                    action: step.action,
                    field: step.field,
                    params: step.params
                  });
                });
              }
            });
          }
          return response.models;
        }),
        catchError(error => {
          console.error('Erreur lors de la récupération des modèles:', error);
          return of([]);
        })
      );
  }

  // Obtenir un modèle par ID
  getModel(id: string): Observable<AutoProcessingModel | null> {
    return this.http.get<{success: boolean, model: AutoProcessingModel}>(`${this.apiUrl}/auto-processing/models/${id}`)
      .pipe(
        map(response => response.model),
        catchError(error => {
          console.error('Erreur lors de la récupération du modèle:', error);
          return of(null);
        })
      );
  }

  // Créer un nouveau modèle (version étendue)
  createModel(model: Omit<AutoProcessingModel, 'id' | 'createdAt' | 'updatedAt'>): Observable<AutoProcessingModel> {
    return this.http.post<{success: boolean, model: AutoProcessingModel}>(`${this.apiUrl}/auto-processing/models`, model)
      .pipe(
        map(response => response.model),
        catchError(error => {
          console.error('Erreur lors de la création du modèle:', error);
          throw error;
        })
      );
  }

  // Mettre à jour un modèle (version étendue)
  updateModel(id: string, updates: Partial<AutoProcessingModel>): Observable<AutoProcessingModel | null> {
    return this.http.put<{success: boolean, model: AutoProcessingModel}>(`${this.apiUrl}/auto-processing/models/${id}`, updates)
      .pipe(
        map(response => response.model),
        catchError(error => {
          console.error('Erreur lors de la mise à jour du modèle:', error);
          return of(null);
        })
      );
  }

  // Supprimer un modèle
  deleteModel(id: string): Observable<boolean> {
    return this.http.delete<{success: boolean}>(`${this.apiUrl}/auto-processing/models/${id}`)
      .pipe(
        map(response => response.success),
        catchError(error => {
          console.error('Erreur lors de la suppression du modèle:', error);
          return of(false);
        })
      );
  }

  // Fonction pour parser les paramètres JSON si nécessaire
  private parseStepParams(step: ProcessingStep): ProcessingStep {
    if (step.params && typeof step.params === 'string') {
      try {
        step.params = JSON.parse(step.params);
        console.log('🔧 Paramètres parsés:', step.params);
      } catch (error) {
        console.error('❌ Erreur lors du parsing des paramètres:', error);
      }
    }
    return step;
  }

  // Vérifier si un fichier correspond à un modèle
  findMatchingModel(fileName: string, fileType: 'bo' | 'partner'): Observable<AutoProcessingModel | null> {
    return this.getModels().pipe(
      map(models => {
        console.log('🔍 Recherche de modèle pour:', fileName, 'type:', fileType);
        console.log('📋 Modèles disponibles:', models);
        
        const matchingModel = models.find(model => {
          const pattern = model.filePattern.replace('*', '.*');
          const regex = new RegExp(pattern, 'i');
          const matches = regex.test(fileName) && model.fileType === fileType && model.autoApply;
          console.log(`🔍 Modèle "${model.name}": pattern=${pattern}, fileType=${model.fileType}, autoApply=${model.autoApply}, matches=${matches}`);
          return matches;
        }) || null;
        
        if (matchingModel) {
          console.log('✅ Modèle trouvé:', matchingModel);
          console.log('🔧 Étapes de traitement:', matchingModel.processingSteps);
          if (matchingModel.processingSteps && matchingModel.processingSteps.length > 0) {
            // Parser les paramètres de chaque étape
            matchingModel.processingSteps = matchingModel.processingSteps.map(step => this.parseStepParams(step));
            
            matchingModel.processingSteps.forEach((step, index) => {
              console.log(`🔧 Étape ${index + 1}:`, {
                name: step.name,
                type: step.type,
                action: step.action,
                field: step.field,
                params: step.params
              });
            });
          }
        } else {
          console.log('❌ Aucun modèle trouvé');
        }
        
        return matchingModel;
      })
    );
  }

  // Méthode pour créer un modèle BO par défaut avec les bonnes étapes
  createDefaultBOModel(): Observable<AutoProcessingModel> {
    const defaultBOModel = {
      name: 'Modèle BO TRXBO - Filtrage',
      filePattern: '*TRXBO*.csv',
      fileType: 'bo' as const,
      autoApply: true,
      templateFile: 'TRXBO.csv',
      processingSteps: [
        {
          id: 'step_filter_columns',
          name: 'FILTRAGE_COLONNES_ESSENTIELLES',
          type: 'select' as const,
          action: 'keepColumns',
          field: ['ID', 'IDTransaction', 'montant', 'Service', 'Date', 'Numéro Trans GU'],
          params: {
            columns: ['ID', 'IDTransaction', 'montant', 'Service', 'Date', 'Numéro Trans GU']
          },
          description: 'Garder seulement les colonnes essentielles pour la réconciliation'
        }
      ],
      reconciliationKeys: {
        boKeys: ['ID', 'IDTransaction', 'Numéro Trans GU'],
        partnerKeys: ['External id']
      }
    };

    console.log('🔧 Création du modèle BO par défaut:', defaultBOModel);
    return this.createModel(defaultBOModel);
  }

  fixReconciliationKeys(): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/auto-processing/models/fix-reconciliation-keys`, {}).pipe(
      catchError(error => {
        console.error('❌ Erreur lors de la correction des clés de réconciliation:', error);
        return throwError(() => error);
      })
    );
  }

  // Méthode pour nettoyer les modèles sans étapes de traitement
  cleanupModelsWithoutSteps(): Observable<void> {
    return this.getModels().pipe(
      switchMap(models => {
        const modelsToDelete = models.filter(model => 
          model.processingSteps.length === 0 && model.autoApply
        );
        
        console.log('🧹 Modèles à supprimer (sans étapes):', modelsToDelete);
        
        const deletePromises = modelsToDelete.map(model => 
          this.deleteModel(model.id)
        );
        
        return Promise.all(deletePromises).then(() => {
          console.log('✅ Nettoyage terminé');
        });
      })
    );
  }

  // Méthode améliorée pour trouver le meilleur modèle
  findBestMatchingModel(fileName: string, fileType: 'bo' | 'partner'): Observable<AutoProcessingModel | null> {
    return this.getModels().pipe(
      map(models => {
        console.log('🔍 Recherche du meilleur modèle pour:', fileName, 'type:', fileType);
        console.log('📋 Modèles disponibles:', models);
        
        // Filtrer les modèles qui correspondent au fichier
        const matchingModels = models.filter(model => {
          const pattern = model.filePattern.replace('*', '.*');
          const regex = new RegExp(pattern, 'i');
          const matches = regex.test(fileName) && model.fileType === fileType && model.autoApply;
          console.log(`🔍 Modèle "${model.name}": pattern=${pattern}, fileType=${model.fileType}, autoApply=${model.autoApply}, matches=${matches}, steps=${model.processingSteps.length}`);
          return matches;
        });
        
        if (matchingModels.length === 0) {
          console.log('❌ Aucun modèle trouvé');
          return null;
        }
        
        // Prioriser les modèles avec des étapes de traitement
        const modelsWithSteps = matchingModels.filter(model => model.processingSteps.length > 0);
        const modelsWithoutSteps = matchingModels.filter(model => model.processingSteps.length === 0);
        
        console.log('📊 Modèles avec étapes:', modelsWithSteps.length);
        console.log('📊 Modèles sans étapes:', modelsWithoutSteps.length);
        
        // Retourner le premier modèle avec des étapes, sinon le premier modèle
        const bestModel = modelsWithSteps.length > 0 ? modelsWithSteps[0] : modelsWithoutSteps[0];
        
        if (bestModel) {
          console.log('✅ Meilleur modèle trouvé:', bestModel.name);
          console.log('🔧 Étapes de traitement:', bestModel.processingSteps.length);
          
          if (bestModel.processingSteps && bestModel.processingSteps.length > 0) {
            // Parser les paramètres de chaque étape
            bestModel.processingSteps = bestModel.processingSteps.map(step => this.parseStepParams(step));
            
            bestModel.processingSteps.forEach((step, index) => {
              console.log(`🔧 Étape ${index + 1}:`, {
                name: step.name,
                type: step.type,
                action: step.action,
                field: step.field,
                params: step.params
              });
            });
          }
        }
        
        return bestModel;
      })
    );
  }

  // Traiter automatiquement un fichier
  processFile(file: File, fileType: 'bo' | 'partner'): Observable<ProcessingResult> {
    return this.findBestMatchingModel(file.name, fileType).pipe(
      switchMap(matchingModel => {
        if (!matchingModel) {
          return of({
            success: false,
            fileName: file.name,
            modelId: '',
            originalData: [],
            processedData: [],
            appliedSteps: [],
            errors: ['Aucun modèle de traitement automatique trouvé pour ce fichier'],
            warnings: [],
            processingTime: 0
          });
        }

        return this.parseFile(file).pipe(
          map(data => {
            const startTime = Date.now();
            const result = this.applyProcessingSteps(data, matchingModel.processingSteps);
            const processingTime = Date.now() - startTime;

            return {
              success: result.errors.length === 0,
              fileName: file.name,
              modelId: matchingModel.id,
              originalData: data,
              processedData: result.processedData,
              appliedSteps: matchingModel.processingSteps,
              errors: result.errors,
              warnings: result.warnings,
              processingTime
            };
          })
        );
      })
    );
  }

  // Nouvelle méthode pour la réconciliation automatique complète
  processFileWithAutoReconciliation(file: File, fileType: 'bo' | 'partner'): Observable<AutoReconciliationResult> {
    return this.findBestMatchingModel(file.name, fileType).pipe(
      switchMap(matchingModel => {
        if (!matchingModel) {
          return of({
            success: false,
            fileName: file.name,
            modelId: '',
            originalData: [],
            processedData: [],
            reconciliationResult: null,
            appliedSteps: [],
            errors: ['Aucun modèle de traitement automatique trouvé pour ce fichier'],
            warnings: [],
            processingTime: 0,
            reconciliationTime: 0
          });
        }

        return this.parseFile(file).pipe(
          switchMap(data => {
            const processingStartTime = Date.now();
            const processingResult = this.applyProcessingSteps(data, matchingModel.processingSteps);
            const processingTime = Date.now() - processingStartTime;

            if (processingResult.errors.length > 0) {
              return of({
                success: false,
                fileName: file.name,
                modelId: matchingModel.id,
                originalData: data,
                processedData: processingResult.processedData,
                reconciliationResult: null,
                appliedSteps: matchingModel.processingSteps,
                errors: processingResult.errors,
                warnings: processingResult.warnings,
                processingTime,
                reconciliationTime: 0
              });
            }

            // Si le traitement a réussi, lancer automatiquement la réconciliation
            const reconciliationStartTime = Date.now();
            
            // Préparer les données pour la réconciliation selon le type de fichier
            let reconciliationRequest: any;
            
            if (fileType === 'partner') {
              // Pour un fichier partenaire, on a besoin des données BO correspondantes
              reconciliationRequest = {
                boFileContent: [], // Sera rempli par le service de réconciliation
                partnerFileContent: processingResult.processedData,
                boKeyColumn: matchingModel.reconciliationKeys?.partnerKeys?.[0] || '',
                partnerKeyColumn: matchingModel.reconciliationKeys?.partnerKeys?.[0] || '',
                comparisonColumns: matchingModel.reconciliationKeys?.partnerKeys?.map(key => ({
                  boColumn: key,
                  partnerColumn: key
                })) || []
              };
            } else if (fileType === 'bo') {
              // Pour un fichier BO, on a besoin des données partenaire correspondantes
              reconciliationRequest = {
                boFileContent: processingResult.processedData,
                partnerFileContent: [], // Sera rempli par le service de réconciliation
                boKeyColumn: matchingModel.reconciliationKeys?.boKeys?.[0] || '',
                partnerKeyColumn: matchingModel.reconciliationKeys?.boKeys?.[0] || '',
                comparisonColumns: matchingModel.reconciliationKeys?.boKeys?.map(key => ({
                  boColumn: key,
                  partnerColumn: key
                })) || []
              };
            } else {
              // Pour un fichier "both", on utilise les données traitées
              reconciliationRequest = {
                boFileContent: processingResult.processedData,
                partnerFileContent: processingResult.processedData,
                boKeyColumn: matchingModel.reconciliationKeys?.boKeys?.[0] || '',
                partnerKeyColumn: matchingModel.reconciliationKeys?.partnerKeys?.[0] || '',
                comparisonColumns: [
                  ...(matchingModel.reconciliationKeys?.boKeys?.map(key => ({
                    boColumn: key,
                    partnerColumn: key
                  })) || []),
                  ...(matchingModel.reconciliationKeys?.partnerKeys?.map(key => ({
                    boColumn: key,
                    partnerColumn: key
                  })) || [])
                ]
              };
            }

            // Lancer la réconciliation automatique
            return this.reconciliationService.reconcile(reconciliationRequest).pipe(
              map(reconciliationResult => {
                const reconciliationTime = Date.now() - reconciliationStartTime;
                
                return {
                  success: true,
                  fileName: file.name,
                  modelId: matchingModel.id,
                  originalData: data,
                  processedData: processingResult.processedData,
                  reconciliationResult: reconciliationResult,
                  appliedSteps: matchingModel.processingSteps,
                  errors: processingResult.errors,
                  warnings: processingResult.warnings,
                  processingTime,
                  reconciliationTime
                };
              }),
              catchError(reconciliationError => {
                const reconciliationTime = Date.now() - reconciliationStartTime;
                return of({
                  success: false,
                  fileName: file.name,
                  modelId: matchingModel.id,
                  originalData: data,
                  processedData: processingResult.processedData,
                  reconciliationResult: null,
                  appliedSteps: matchingModel.processingSteps,
                  errors: [...processingResult.errors, `Erreur lors de la réconciliation: ${reconciliationError.message}`],
                  warnings: processingResult.warnings,
                  processingTime,
                  reconciliationTime
                });
              })
            );
          })
        );
      })
    );
  }

  // Parser un fichier (CSV ou Excel)
  private parseFile(file: File): Observable<any[]> {
    return new Observable(observer => {
      const reader = new FileReader();
      
      reader.onload = (e: any) => {
        try {
          let data: any[] = [];
          
          if (file.name.toLowerCase().endsWith('.csv')) {
            // Parser CSV
            const csv = e.target.result;
            const lines = csv.split('\n');
            const headers = lines[0].split(',').map((h: string) => h.trim());
            
            for (let i = 1; i < lines.length; i++) {
              if (lines[i].trim()) {
                const values = lines[i].split(',').map((v: string) => v.trim());
                const row: any = {};
                headers.forEach((header: string, index: number) => {
                  row[header] = values[index] || '';
                });
                data.push(row);
              }
            }
          } else {
            // Parser Excel (simplifié)
            // Ici vous pouvez ajouter la logique pour Excel
            data = [];
          }
          
          observer.next(data);
          observer.complete();
        } catch (error) {
          observer.error(error);
        }
      };
      
      reader.readAsText(file);
    });
  }

  // Appliquer les étapes de traitement
  public applyProcessingSteps(data: any[], steps: ProcessingStep[]): {
    processedData: any[];
    errors: string[];
    warnings: string[];
  } {
    console.log('🔧 Début du traitement avec', steps.length, 'étapes');
    console.log('📊 Données initiales:', data.length, 'lignes');
    
    let processedData = [...data];
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (data.length > 0) {
      console.log('🔍 Colonnes initiales:', Object.keys(data[0]));
    }
    
    steps.forEach((step, index) => {
      try {
        console.log(`🔧 Étape ${index + 1}/${steps.length}: ${step.type.toUpperCase()} ( ${step.action} )`);
        console.log('🔧 Paramètres de l\'étape:', step);
        console.log('🔧 step.field:', step.field);
        console.log('🔧 step.params:', step.params);
        
        // Log des données avant l'étape
        if (processedData.length > 0) {
          console.log('📊 Données avant étape - Première ligne:', processedData[0]);
          console.log('📊 Colonnes avant étape:', Object.keys(processedData[0]));
        }
        
        processedData = this.applyStep(processedData, step);
        
        // Log des données après l'étape
        console.log('📊 Données après étape:', processedData.length, 'lignes');
        if (processedData.length > 0) {
          console.log('📊 Données après étape - Première ligne:', processedData[0]);
          console.log('🔍 Colonnes disponibles après étape:', Object.keys(processedData[0]));
        }
      } catch (error) {
        const errorMsg = `Erreur lors de l'étape ${index + 1} (${step.name}): ${error}`;
        console.error('❌', errorMsg);
        errors.push(errorMsg);
      }
    });
    
    return { processedData, errors, warnings };
  }

  // Appliquer une étape de traitement
  private applyStep(data: any[], step: ProcessingStep): any[] {
    switch (step.type) {
      case 'format':
        return this.applyFormatStep(data, step);
      case 'validate':
        return this.applyValidateStep(data, step);
      case 'transform':
        return this.applyTransformStep(data, step);
      case 'filter':
        return this.applyFilterStep(data, step);
      case 'calculate':
        return this.applyCalculateStep(data, step);
      case 'select':
        return this.applySelectStep(data, step);
      case 'deduplicate':
        return this.applyDeduplicateStep(data, step);
      default:
        return data;
    }
  }

  // Formater un champ (version simple)
  private formatFieldSimple(value: any, action: string, params: any): any {
    switch (action) {
      case 'currency':
        const num = parseFloat(value);
        if (!isNaN(num)) {
          return new Intl.NumberFormat(params.locale, {
            style: 'currency',
            currency: params.currency
          }).format(num);
        }
        return value;
      default:
        return value;
    }
  }

  // Valider un champ
  private validateField(value: any, action: string, params: any): { valid: boolean; value: any; error?: string } {
    switch (action) {
      case 'dateFormat':
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return { valid: false, value, error: 'Format de date invalide' };
        }
        return { valid: true, value: date.toLocaleDateString('fr-FR') };
      default:
        return { valid: true, value };
    }
  }

  // Transformer un champ
  private transformField(value: any, action: string, params: any): any {
    switch (action) {
      case 'trim':
        return typeof value === 'string' ? value.trim() : value;
      case 'uppercase':
        return typeof value === 'string' ? value.toUpperCase() : value;
      case 'lowercase':
        return typeof value === 'string' ? value.toLowerCase() : value;
      default:
        return value;
    }
  }

  // Calculer un champ
  private calculateField(row: any, action: string, params: any): any {
    switch (action) {
      case 'sum':
        return params.fields.reduce((sum: number, field: string) => {
          const val = parseFloat(row[field]) || 0;
          return sum + val;
        }, 0);
      default:
        return row[params.field] || 0;
    }
  }

  // === NOUVELLES MÉTHODES DE TRAITEMENT ===

  // Appliquer une étape de formatage
  private applyFormatStep(data: any[], step: ProcessingStep): any[] {
    console.log('🔧 applyFormatStep - action:', step.action);
    console.log('🔧 applyFormatStep - step.field:', step.field);
    console.log('🔧 applyFormatStep - step.params:', step.params);
    
    // Déterminer les colonnes à traiter
    const columnsToFormat = Array.isArray(step.field) ? step.field : [step.field];
    console.log('🔧 Colonnes à formater:', columnsToFormat);
    
    return data.map(row => {
      const newRow = { ...row };
      
      // Appliquer le formatage à chaque colonne sélectionnée
      columnsToFormat.forEach((column: string) => {
        if (row.hasOwnProperty(column)) {
          newRow[column] = this.formatFieldExtended(row[column], step.action, step.params);
        }
      });
      
      return newRow;
    });
  }

  // Appliquer une étape de validation
  private applyValidateStep(data: any[], step: ProcessingStep): any[] {
    return data.map(row => {
      const newRow = { ...row };
      const validation = this.validateField(row[step.field[0]], step.action, step.params); // Assuming field is an array of one string
      if (!validation.valid) {
        throw new Error(`Validation échouée pour ${step.field[0]}: ${validation.error}`);
      }
      newRow[step.field[0]] = validation.value;
      return newRow;
    });
  }

  // Appliquer une étape de transformation
  private applyTransformStep(data: any[], step: ProcessingStep): any[] {
    if (step.action === 'extract') {
      return this.applyExtractionStep(data, step);
    } else if (step.action === 'concat') {
      return this.applyConcatStep(data, step);
    } else {
      return data.map(row => {
        const newRow = { ...row };
        newRow[step.field[0]] = this.transformField(row[step.field[0]], step.action, step.params); // Assuming field is an array of one string
        return newRow;
      });
    }
  }

  // Appliquer une étape de filtrage
  private applyFilterStep(data: any[], step: ProcessingStep): any[] {
    switch (step.action) {
      case 'removeEmpty':
        return data.filter(row => {
          const value = row[step.field[0]]; // Assuming field is an array of one string
          return value !== null && value !== undefined && value !== '';
        });
      case 'keepMatching':
        const pattern = step.params?.pattern || '';
        const regex = new RegExp(pattern, 'i');
        return data.filter(row => {
          const value = row[step.field[0]]; // Assuming field is an array of one string
          return regex.test(String(value));
        });
      case 'filterByValue':
        const values = step.params?.values || [];
        return data.filter(row => {
          const value = row[step.field[0]]; // Assuming field is an array of one string
          return values.includes(String(value));
        });
      case 'filterByExactValue':
        const exactValue = step.params?.value || '';
        return data.filter(row => {
          const value = row[step.field[0]]; // Assuming field is an array of one string
          return String(value) === exactValue;
        });
      default:
        return data;
    }
  }

  // Appliquer une étape de calcul
  private applyCalculateStep(data: any[], step: ProcessingStep): any[] {
    return data.map(row => {
      const newRow = { ...row };
      newRow[step.field[0]] = this.calculateField(row, step.action, step.params); // Assuming field is an array of one string
      return newRow;
    });
  }

  // Appliquer une étape de sélection de colonnes
  private applySelectStep(data: any[], step: ProcessingStep): any[] {
    console.log('🔧 applySelectStep - action:', step.action);
    console.log('🔧 applySelectStep - step.params:', step.params);
    console.log('🔧 applySelectStep - step.field:', step.field);
    
    if (step.action === 'keepColumns') {
      // Priorité 1: step.params?.columns (paramètres configurés)
      // Priorité 2: step.field (si c'est un tableau)
      // Priorité 3: fallback
      let columnsToKeep: string[] = [];
      
      if (step.params && step.params.columns && Array.isArray(step.params.columns)) {
        columnsToKeep = step.params.columns;
        console.log('🔧 Colonnes à conserver (depuis params):', columnsToKeep);
      } else if (Array.isArray(step.field)) {
        columnsToKeep = step.field;
        console.log('🔧 Colonnes à conserver (depuis field):', columnsToKeep);
      } else {
        console.log('⚠️ Aucune colonne configurée pour keepColumns');
        return data;
      }
      
      console.log('🔧 Colonnes à conserver finales:', columnsToKeep);
      
      return data.map(row => {
        const newRow: any = {};
        columnsToKeep.forEach((col: string) => {
          if (row.hasOwnProperty(col)) {
            newRow[col] = row[col];
          }
        });
        return newRow;
      });
    } else if (step.action === 'removeColumns') {
      // Priorité 1: step.params?.columns (paramètres configurés)
      // Priorité 2: step.field (si c'est un tableau)
      // Priorité 3: fallback
      let columnsToRemove: string[] = [];
      
      if (step.params && step.params.columns && Array.isArray(step.params.columns)) {
        columnsToRemove = step.params.columns;
        console.log('🔧 Colonnes à supprimer (depuis params):', columnsToRemove);
      } else if (Array.isArray(step.field)) {
        columnsToRemove = step.field;
        console.log('🔧 Colonnes à supprimer (depuis field):', columnsToRemove);
      } else {
        console.log('⚠️ Aucune colonne configurée pour removeColumns');
        return data;
      }
      
      console.log('🔧 Colonnes à supprimer finales:', columnsToRemove);
      
      return data.map(row => {
        const newRow = { ...row };
        columnsToRemove.forEach((col: string) => {
          delete newRow[col];
        });
        return newRow;
      });
    }
    return data;
  }

  // Appliquer une étape de suppression de doublons
  private applyDeduplicateStep(data: any[], step: ProcessingStep): any[] {
    const columns = step.params?.columns || [step.field[0]]; // Assuming field is an array of one string
    const seen = new Set();
    
    return data.filter(row => {
      const key = columns.map((col: string) => String(row[col] || '')).join('|');
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // Appliquer une étape d'extraction
  private applyExtractionStep(data: any[], step: ProcessingStep): any[] {
    const { extractType, extractCount, extractKey, extractStart } = step.params || {};
    
    return data.map(row => {
      const newRow = { ...row };
      const value = String(row[step.field[0]] || ''); // Assuming field is an array of one string
      
      let extractedValue = '';
      switch (extractType) {
        case 'first':
          extractedValue = value.substring(0, extractCount);
          break;
        case 'last':
          extractedValue = value.substring(Math.max(0, value.length - extractCount));
          break;
        case 'from':
          const startIndex = Math.max(0, extractStart - 1);
          extractedValue = value.substring(startIndex, startIndex + extractCount);
          break;
        case 'between':
          const { startChar, endChar } = step.params || {};
          const startIndex2 = value.indexOf(startChar);
          const endIndex = value.indexOf(endChar, startIndex2 + 1);
          if (startIndex2 !== -1 && endIndex !== -1) {
            extractedValue = value.substring(startIndex2 + 1, endIndex);
          }
          break;
        case 'key':
          const keyValue = extractKey || '';
          const keyIndex = value.indexOf(keyValue);
          if (keyIndex !== -1) {
            extractedValue = value.substring(keyIndex + keyValue.length, keyIndex + keyValue.length + extractCount);
          }
          break;
      }
      
      newRow[step.field[0]] = extractedValue; // Assuming field is an array of one string
      return newRow;
    });
  }

  // Appliquer une étape de concaténation
  private applyConcatStep(data: any[], step: ProcessingStep): any[] {
    const { columns, newColumn, separator } = step.params || {};
    
    return data.map(row => {
      const newRow = { ...row };
      const values = columns.map((col: string) => String(row[col] || ''));
      const concatenatedValue = values.join(separator || ' ');
      newRow[newColumn || 'concatenated'] = concatenatedValue;
      return newRow;
    });
  }

  // === MÉTHODES DE FORMATAGE ÉTENDUES ===

  // Formater un champ avec toutes les options du menu traitement
  private formatFieldExtended(value: any, action: string, params: any): any {
    if (value === null || value === undefined) return value;
    
    let result = String(value);
    
    switch (action) {
      case 'currency':
        const num = parseFloat(result);
        if (!isNaN(num)) {
          return new Intl.NumberFormat(params.locale || 'fr-FR', {
            style: 'currency',
            currency: params.currency || 'EUR'
          }).format(num);
        }
        return result;
        
      case 'trimSpaces':
        return result.trim();
        
      case 'toLowerCase':
        return result.toLowerCase();
        
      case 'toUpperCase':
        return result.toUpperCase();
        
      case 'normalizeDates':
        return this.normalizeDate(result, params?.format || 'yyyy-MM-dd');
        
      case 'normalizeNumbers':
        return this.normalizeNumber(result);
        
      case 'removeDashesAndCommas':
        return result.replace(/[-,\s]/g, '');
        
      case 'removeSeparators':
        return result.replace(/[.,\s]/g, '');
        
      case 'dotToComma':
        return result.replace(/\./g, ',');
        
      case 'absoluteValue':
        const num2 = parseFloat(result);
        return !isNaN(num2) ? Math.abs(num2).toString() : result;
        
      case 'removeCharacters':
        const { position, count } = params || {};
        switch (position) {
          case 'start':
            return result.substring(count || 1);
          case 'end':
            return result.substring(0, result.length - (count || 1));
          case 'specific':
            const pos = params?.specificPosition || 1;
            return result.substring(0, pos - 1) + result.substring(pos - 1 + (count || 1));
          default:
            return result;
        }
        
      case 'removeSpecificCharacters':
        const charsToRemove = params?.characters || '';
        const caseSensitive = params?.caseSensitive !== false;
        if (caseSensitive) {
          return result.split('').filter(char => !charsToRemove.includes(char)).join('');
        } else {
          const regex = new RegExp(`[${charsToRemove}]`, 'gi');
          return result.replace(regex, '');
        }
        
      case 'cleanAmounts':
        return this.cleanAmount(result);
        
      case 'insertCharacters':
        const charsToInsert = params?.characters || '';
        const insertPosition = params?.position || 'start';
        const specificPos = params?.specificPosition || 1;
        
        switch (insertPosition) {
          case 'start':
            return charsToInsert + result;
          case 'end':
            return result + charsToInsert;
          case 'specific':
            return result.substring(0, specificPos - 1) + charsToInsert + result.substring(specificPos - 1);
          default:
            return result;
        }
        
      default:
        return result;
    }
  }

  // Normaliser une date
  private normalizeDate(dateStr: string, format: string): string {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return format
      .replace('yyyy', year.toString())
      .replace('MM', month)
      .replace('dd', day);
  }

  // Normaliser un nombre
  private normalizeNumber(numStr: string): string {
    const num = parseFloat(numStr.replace(/[^\d.-]/g, ''));
    return !isNaN(num) ? num.toString() : numStr;
  }

  // Nettoyer un montant
  private cleanAmount(amountStr: string): string {
    // Supprimer tous les caractères non numériques sauf le point et la virgule
    let cleaned = amountStr.replace(/[^\d.,]/g, '');
    
    // Remplacer la virgule par un point pour la conversion
    cleaned = cleaned.replace(',', '.');
    
    // Convertir en nombre et formater
    const num = parseFloat(cleaned);
    if (!isNaN(num)) {
      return new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(num);
    }
    
    return amountStr;
  }

  // Générer un ID unique
  private generateId(): string {
    return 'model_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
} 