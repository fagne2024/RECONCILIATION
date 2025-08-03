import { Injectable } from '@angular/core';
import { FileWatcherService, ProcessingSpecification } from './file-watcher.service';
import { ReconciliationService } from './reconciliation.service';
import { Observable, of, throwError } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http'; // Added for new methods
import { environment } from '../../environments/environment'; // Added for new methods
import { BOColumnFilter } from '../models/reconciliation-request.model';
import * as Papa from 'papaparse'; // Added for CSV parsing
import * as XLSX from 'xlsx'; // Added for Excel parsing

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
    boColumnFilters?: BOColumnFilter[]; // Filtres BO appliqués
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
          console.log('🔍 Clés de réconciliation:', matchingModel.reconciliationKeys);
          console.log('🔍 Filtres BO:', matchingModel.reconciliationKeys?.boColumnFilters);
          
          if (matchingModel.reconciliationKeys?.boColumnFilters) {
            console.log('✅ Filtres BO trouvés dans le modèle:');
            matchingModel.reconciliationKeys.boColumnFilters.forEach((filter: any, index: number) => {
              console.log(`  - Filtre ${index + 1}:`, filter);
            });
          } else {
            console.log('❌ Aucun filtre BO trouvé dans le modèle');
          }
          
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
    console.log('🔍 findBestMatchingModel appelé');
    console.log('📄 Nom du fichier:', fileName);
    console.log('📋 Type de fichier:', fileType);
    
    return this.getModels().pipe(
      map(models => {
        console.log('📋 Nombre total de modèles disponibles:', models.length);
        
        // Filtrer les modèles par type de fichier
        const filteredModels = models.filter(model => {
          console.log(`🔍 Vérification du modèle ${model.name}:`);
          console.log(`  - Type du modèle: ${model.fileType}`);
          console.log(`  - Type recherché: ${fileType}`);
          console.log(`  - Pattern du fichier: ${model.filePattern}`);
          console.log(`  - Nom du fichier: ${fileName}`);
          
          const typeMatch = model.fileType === fileType || model.fileType === 'both';
          const patternMatch = this.matchesFilePattern(fileName, model.filePattern);
          
          console.log(`  - Correspondance de type: ${typeMatch}`);
          console.log(`  - Correspondance de pattern: ${patternMatch}`);
          
          return typeMatch && patternMatch;
        });
        
        console.log('📋 Modèles filtrés:', filteredModels.length);
        filteredModels.forEach((model, index) => {
          console.log(`  ${index + 1}. ${model.name} (${model.fileType})`);
        });
        
        // Trier par priorité (modèles avec plus d'étapes de traitement en premier)
        const sortedModels = filteredModels.sort((a, b) => {
          const aSteps = a.processingSteps?.length || 0;
          const bSteps = b.processingSteps?.length || 0;
          return bSteps - aSteps;
        });
        
        console.log('📋 Modèles triés par priorité:');
        sortedModels.forEach((model, index) => {
          console.log(`  ${index + 1}. ${model.name} (${model.processingSteps?.length || 0} étapes)`);
        });
        
        const bestMatch = sortedModels[0] || null;
        
        if (bestMatch) {
          console.log('✅ Meilleur modèle trouvé:', bestMatch.name);
          console.log('  - ID:', bestMatch.id);
          console.log('  - Type:', bestMatch.fileType);
          console.log('  - Étapes de traitement:', bestMatch.processingSteps?.length || 0);
          console.log('  - Clés de réconciliation:', bestMatch.reconciliationKeys);
          console.log('  - Filtres BO:', bestMatch.reconciliationKeys?.boColumnFilters);
        } else {
          console.log('❌ Aucun modèle correspondant trouvé');
        }
        
        return bestMatch;
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
        console.log('🔍 Recherche du modèle pour:', file.name, 'type:', fileType);
        console.log('📋 Modèle trouvé:', matchingModel);
        
        if (matchingModel) {
          console.log('✅ Modèle de traitement trouvé:', matchingModel.name);
          console.log('  - Type:', matchingModel.fileType);
          console.log('  - Clés de réconciliation:', matchingModel.reconciliationKeys);
          console.log('  - Filtres BO:', matchingModel.reconciliationKeys?.boColumnFilters);
        }

        if (!matchingModel) {
          console.log('❌ Aucun modèle de traitement automatique trouvé pour:', file.name);
          return throwError(() => new Error('Aucun modèle de traitement automatique trouvé'));
        }

        console.log('✅ Modèle de traitement trouvé:', matchingModel);
        console.log('  - Nom:', matchingModel.name);
        console.log('  - Type:', matchingModel.fileType);
        console.log('  - Clés de réconciliation:', matchingModel.reconciliationKeys);
        console.log('  - Filtres BO:', matchingModel.reconciliationKeys?.boColumnFilters);
        
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
                })) || [],
                // Inclure les filtres BO si présents
                boColumnFilters: matchingModel.reconciliationKeys?.boColumnFilters || []
              };
              
              console.log('🔍 Requête de réconciliation partenaire:', reconciliationRequest);
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
                })) || [],
                // Inclure les filtres BO si présents
                boColumnFilters: matchingModel.reconciliationKeys?.boColumnFilters || []
              };
              
              console.log('🔍 Requête de réconciliation BO:', reconciliationRequest);
            }

            return this.reconciliationService.reconcile(reconciliationRequest).pipe(
              map(reconciliationResult => {
                const reconciliationTime = Date.now() - reconciliationStartTime;
                
                return {
                  success: true,
                  fileName: file.name,
                  modelId: matchingModel.id,
                  originalData: data,
                  processedData: processingResult.processedData,
                  reconciliationResult,
                  appliedSteps: matchingModel.processingSteps,
                  errors: processingResult.errors,
                  warnings: processingResult.warnings,
                  processingTime,
                  reconciliationTime
                };
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
          const content = e.target.result;
          
          if (file.name.toLowerCase().endsWith('.csv')) {
            // Détecter le délimiteur
            const delimiter = content.includes(';') ? ';' : ',';
            
            // Détecter si c'est un fichier Orange Money
            const orangeMoneyDetection = this.detectOrangeMoneyFile(content, delimiter);
            
            if (orangeMoneyDetection.isOrangeMoney) {
              console.log('🟠 Fichier Orange Money détecté dans parseFile');
              
              // Traitement spécial pour Orange Money
              const lines = content.split('\n').filter((line: string) => line.trim());
              const dataRows = lines.slice(orangeMoneyDetection.headerRowIndex + 1);
              const headerRow = lines[orangeMoneyDetection.headerRowIndex];
              const colNames = headerRow.split(delimiter).map((col: string) => col.trim());
              
              const processedData = dataRows.map((line: string) => {
                const values = line.split(delimiter);
                const obj: any = {};
                colNames.forEach((col: string, idx: number) => {
                  obj[col] = values[idx] || '';
                });
                return obj;
              });
              
              console.log(`Orange Money parsé: ${processedData.length} lignes`);
              observer.next(processedData);
              observer.complete();
              return;
            }
            
            // Traitement normal pour les autres fichiers CSV
            Papa.parse(content, {
              header: true,
              delimiter,
              skipEmptyLines: true,
              complete: (results) => {
                observer.next(results.data);
                observer.complete();
              },
              error: (error) => {
                observer.error(error);
              }
            });
          } else if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
            // Traitement Excel avec détection d'en-têtes
            console.log('🔄 Début lecture fichier Excel pour modèles de traitement');
            const workbook = XLSX.read(content, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // Conversion en tableau de tableaux pour analyse
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
            if (jsonData.length === 0) {
              console.log('❌ Fichier Excel vide');
              observer.error(new Error('Fichier Excel vide'));
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
              
              console.log(`✅ Fichier Excel traité (fallback): ${rows.length} lignes`);
              observer.next(rows);
              observer.complete();
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
              console.log(`✅ Fichier Excel traité: ${rows.length} lignes`);
              
              observer.next(rows);
          observer.complete();
            }
          } else {
            observer.error(new Error('Format de fichier non supporté'));
          }
        } catch (error) {
          observer.error(error);
        }
      };
      
      reader.onerror = () => {
        observer.error(new Error('Erreur lors de la lecture du fichier'));
      };
      
      reader.readAsText(file, 'utf-8');
    });
  }

  // Appliquer les étapes de traitement
  public applyProcessingSteps(data: any[], steps: ProcessingStep[]): {
    processedData: any[];
    errors: string[];
    warnings: string[];
  } {
    let processedData = [...data];
    const errors: string[] = [];
    const warnings: string[] = [];
    
    steps.forEach((step, index) => {
      try {
        console.log(`🔧 Application de l'étape ${index + 1}: ${step.name} (${step.type})`);
        
        switch (step.type) {
          case 'format':
            processedData = this.applyFormatStep(processedData, step);
            break;
          case 'validate':
            processedData = this.applyValidateStep(processedData, step);
            break;
          case 'transform':
            if (step.action === 'detectOrangeMoneyHeader') {
              processedData = this.applyOrangeMoneyDetectionStep(processedData, step);
            } else if (step.action === 'extract') {
              processedData = this.applyExtractionStep(processedData, step);
            } else if (step.action === 'concat') {
              processedData = this.applyConcatStep(processedData, step);
            } else {
              processedData = this.applyTransformStep(processedData, step);
            }
            break;
          case 'filter':
            processedData = this.applyFilterStep(processedData, step);
            break;
          case 'calculate':
            processedData = this.applyCalculateStep(processedData, step);
            break;
          case 'select':
            processedData = this.applySelectStep(processedData, step);
            break;
          case 'deduplicate':
            processedData = this.applyDeduplicateStep(processedData, step);
            break;
          default:
            warnings.push(`Type d'étape non reconnu: ${step.type}`);
        }
        
        console.log(`✅ Étape ${index + 1} appliquée avec succès - ${processedData.length} lignes`);
      } catch (error) {
        const errorMsg = `Erreur lors de l'application de l'étape ${step.name}: ${error}`;
        console.error(errorMsg);
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
      return data.map(row => {
        const newRow = { ...row };
      step.field.forEach(field => {
        if (row[field] !== undefined) {
          newRow[field] = this.transformField(row[field], step.action, step.params);
        }
      });
        return newRow;
      });
    }

  // Nouvelle méthode pour appliquer l'étape de détection Orange Money
  private applyOrangeMoneyDetectionStep(data: any[], step: ProcessingStep): any[] {
    // Cette étape est appliquée avant le parsing, donc on retourne les données telles quelles
    // La détection est gérée dans parseFile
    console.log('🟠 Étape de détection Orange Money appliquée');
    return data;
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
        
        // Liste des chaînes autorisées pour la suppression
        const allowedStrings = ['_CM', '_ML', '_GN', '_CI', '_BF', '_KE', '_SN', '_KN', '_BJ', '_GB'];
        
        // Vérifier si la chaîne à supprimer est dans la liste autorisée
        if (!allowedStrings.includes(charsToRemove)) {
          console.warn(`⚠️ Chaîne "${charsToRemove}" non autorisée. Chaînes autorisées: ${allowedStrings.join(', ')}`);
          return result; // Retourner la valeur originale sans modification
        }
        
        // Logique de suppression de chaînes complètes : supprimer la chaîne spécifiée partout où elle apparaît
        if (caseSensitive) {
          // Suppression sensible à la casse de la chaîne complète partout où elle apparaît
          const escapedPattern = this.escapeRegExp(charsToRemove);
          const regex = new RegExp(escapedPattern, 'g');
          return result.replace(regex, '');
        } else {
          // Suppression insensible à la casse de la chaîne complète partout où elle apparaît
          const escapedPattern = this.escapeRegExp(charsToRemove);
          const regex = new RegExp(escapedPattern, 'gi');
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

  // Échapper les caractères spéciaux pour les expressions régulières
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

  // Méthode pour détecter les fichiers Orange Money
  private detectOrangeMoneyFile(csvContent: string, delimiter: string): { isOrangeMoney: boolean; headerRowIndex: number; headerRow: string[] } {
    const lines = csvContent.split('\n').filter((line: string) => line.trim());
    let headerRowIndex = -1;
    let headerRow: string[] = [];

    // Parcourir les lignes pour trouver la première colonne commençant par "N°"
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const columns = line.split(delimiter).map((col: string) => col.trim());
      
      // Vérifier si la première colonne commence par "N°"
      if (columns.length > 0 && columns[0].startsWith('N°')) {
        headerRowIndex = i;
        headerRow = columns;
        console.log(`🔍 Fichier Orange Money détecté - Ligne d'en-tête trouvée à l'index ${i}:`, columns);
        break;
      }
    }

    const isOrangeMoney = headerRowIndex !== -1;
    
    if (isOrangeMoney) {
      console.log(`📊 Fichier Orange Money détecté - Ignorer les lignes 0 à ${headerRowIndex - 1}`);
    }

    return { isOrangeMoney, headerRowIndex, headerRow };
  }

  // Méthode pour créer un modèle Orange Money par défaut
  createDefaultOrangeMoneyModel(): Observable<AutoProcessingModel> {
    const defaultOrangeMoneyModel = {
      name: 'Modèle Orange Money - Traitement automatique',
      filePattern: '*orange*money*.csv',
      fileType: 'partner' as const,
      autoApply: true,
      templateFile: 'orange_money.csv',
      processingSteps: [
        {
          id: 'step_detect_header',
          name: 'DÉTECTION_EN_TÊTE_ORANGE_MONEY',
          type: 'transform' as const,
          action: 'detectOrangeMoneyHeader',
          field: ['*'],
          params: {
            headerPattern: 'N°',
            skipLines: true
          },
          description: 'Détecter et ignorer les lignes au-dessus de la première colonne N°'
        },
        {
          id: 'step_clean_amounts',
          name: 'NETTOYAGE_MONTANTS_ORANGE_MONEY',
          type: 'format' as const,
          action: 'cleanAmounts',
          field: ['Montant (XAF)', 'Commissions (XAF)'],
          params: {
            removeSpaces: true,
            removeCommas: true,
            normalizeDecimals: true
          },
          description: 'Nettoyer les montants Orange Money'
        },
        {
          id: 'step_format_dates',
          name: 'FORMATAGE_DATES_ORANGE_MONEY',
          type: 'format' as const,
          action: 'date',
          field: ['Date'],
          params: {
            format: 'dd/MM/yyyy',
            locale: 'fr-FR'
          },
          description: 'Formater les dates Orange Money'
        }
      ],
      reconciliationKeys: {
        partnerKeys: ['Référence', 'N°'],
        boKeys: ['IDTransaction', 'Reference']
      }
    };

    console.log('🔧 Création du modèle Orange Money par défaut:', defaultOrangeMoneyModel);
    return this.createModel(defaultOrangeMoneyModel);
  }

  // Méthode pour créer un modèle étendu pour CIOM/PMOM avec codes de pays
  createExtendedCIOMModel(): Observable<AutoProcessingModel> {
    const extendedCIOMModel = {
      name: 'Modèle CIOM/PMOM étendu - Traitement automatique',
      filePattern: '*CIOMCM*.xls,*PMOMCM*.xls,*CIOMCM*.csv,*PMOMCM*.csv,*CIOMML*.xls,*PMOMML*.xls,*CIOMML*.csv,*PMOMML*.csv,*CIOMGN*.xls,*PMOMGN*.xls,*CIOMGN*.csv,*PMOMGN*.csv,*CIOMCI*.xls,*PMOMCI*.xls,*CIOMCI*.csv,*PMOMCI*.csv,*CIOMSN*.xls,*PMOMSN*.xls,*CIOMSN*.csv,*PMOMSN*.csv,*CIOMKN*.xls,*PMOMKN*.xls,*CIOMKN*.csv,*PMOMKN*.csv,*CIOMBJ*.xls,*PMOMBJ*.xls,*CIOMBJ*.csv,*PMOMBJ*.csv,*CIOMGB*.xls,*PMOMGB*.xls,*CIOMGB*.csv,*PMOMGB*.csv',
      fileType: 'partner' as const,
      autoApply: true,
      templateFile: 'CIOMCM.xls',
      processingSteps: [
        {
          id: 'step_detect_header',
          name: 'DÉTECTION_EN_TÊTE_CIOM_PMOM',
          type: 'transform' as const,
          action: 'detectOrangeMoneyHeader',
          field: ['*'],
          params: {
            headerPattern: 'N°',
            skipLines: true
          },
          description: 'Détecter et ignorer les lignes au-dessus de la première colonne N°'
        },
        {
          id: 'step_clean_amounts',
          name: 'NETTOYAGE_MONTANTS_CIOM_PMOM',
          type: 'format' as const,
          action: 'cleanAmounts',
          field: ['Montant (XAF)', 'Commissions (XAF)'],
          params: {
            removeSpaces: true,
            removeCommas: true,
            normalizeDecimals: true
          },
          description: 'Nettoyer les montants CIOM/PMOM'
        },
        {
          id: 'step_format_dates',
          name: 'FORMATAGE_DATES_CIOM_PMOM',
          type: 'format' as const,
          action: 'date',
          field: ['Date'],
          params: {
            format: 'dd/MM/yyyy',
            locale: 'fr-FR'
          },
          description: 'Formater les dates CIOM/PMOM'
        }
      ],
      reconciliationKeys: {
        partnerKeys: ['Référence', 'N°'],
        boKeys: ['IDTransaction', 'Reference']
      }
    };

    console.log('🔧 Création du modèle CIOM/PMOM étendu:', extendedCIOMModel);
    return this.createModel(extendedCIOMModel);
  }

  // Générer un ID unique
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private matchesFilePattern(fileName: string, pattern: string): boolean {
    const regexPattern = pattern.replace(/\*/g, '.*');
    const regex = new RegExp(regexPattern, 'i');
    return regex.test(fileName);
  }

  // Méthode pour détecter les en-têtes dans les fichiers Excel
  private detectExcelHeaders(jsonData: any[][]): { headerRowIndex: number; headerRow: string[] } {
    console.log('🔄 Détection des en-têtes Excel pour modèles de traitement');
    
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
          return String(cell).trim();
        });
        
        console.log(`🔍 Ligne ${i} - Nombre de cellules: ${rowStrings.length}, Cellules non vides: ${rowStrings.filter(cell => cell !== '').length}`);
        
        // Ignorer les lignes qui sont clairement des en-têtes de document
        const documentHeaders = [
          'Relevé de vos opérations', 'Application :', 'Compte Orange Money :', 'Début de Période :', 
          'Fin de Période :', 'Réseau :', 'Cameroon', 'Transactions réussies',
          'Wallet commission', 'Total', 'Total activités'
        ];
        const isDocumentHeader = documentHeaders.some(header => 
          rowStrings.some(cell => cell.includes(header))
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
              return String(cell).trim();
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
          if (cell === '') continue;
          
          nonEmptyColumns++;
          
          // Vérifier si c'est une colonne "N°"
          if (cell.startsWith('N°') || cell === 'N' || cell.includes('N°')) {
            hasNumberColumn = true;
            score += 25; // Bonus important pour "N°"
          }
          
          // Vérifier les mots-clés d'en-tête
          for (const keyword of headerKeywords) {
            if (cell.toLowerCase().includes(keyword.toLowerCase())) {
              score += 8;
              hasHeaderKeywords = true;
              keywordMatches++;
            }
          }
          
          // Bonus spécial pour les lignes avec plusieurs colonnes "N°"
          if (cell.includes('N°')) {
            score += 5; // Bonus supplémentaire pour chaque colonne "N°"
          }
          
          // Bonus pour les colonnes qui ressemblent à des en-têtes
          if (cell.length > 0 && cell.length < 50 && 
              (cell.includes(' ') || cell.includes('(') || cell.includes(')') || 
               cell.includes(':') || cell.includes('-') || cell.includes('_'))) {
            score += 3;
          }
          
          // Bonus pour les colonnes avec des caractères spéciaux (typiques des en-têtes)
          if (cell.includes('é') || cell.includes('è') || cell.includes('à') || 
              cell.includes('ç') || cell.includes('ù') || cell.includes('ô')) {
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
} 