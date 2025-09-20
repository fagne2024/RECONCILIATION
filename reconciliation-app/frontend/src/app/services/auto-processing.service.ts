import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { FileWatcherService } from './file-watcher.service';
import { ReconciliationService } from './reconciliation.service';
import { FieldTypeDetectionService } from './field-type-detection.service';
import { ExcelTypeDetectionService } from './excel-type-detection.service';
import { SpecialFileDetectionService } from './special-file-detection.service';

export interface ColumnProcessingRule {
  id?: number;
  sourceColumn: string;
  targetColumn: string;
  formatType?: string;
  toUpperCase?: boolean;
  toLowerCase?: boolean;
  trimSpaces?: boolean;
  removeSpecialChars?: boolean;
  removeAccents?: boolean;
  stringToRemove?: string;
  padZeros?: boolean;
  regexReplace?: string;
  specialCharReplacementMap?: { [key: string]: string };
  ruleOrder?: number;
}

export interface AutoProcessingModel {
  id?: string; // Optionnel pour la création
  modelId?: string; // ID retourné par le backend
  name: string;
  filePattern: string;
  fileType: 'bo' | 'partner' | 'both';
  autoApply: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  templateFile?: string;
  reconciliationKeys?: {
    partnerKeys: string[];
    boKeys: string[];
    boModelReferences?: string[];
    boModels?: string[];
    boModelKeys?: any;
    boTreatments?: any;
  };
  boColumnFilters?: BOColumnFilter[]; // Filtres BO appliqués
  columnProcessingRules?: ColumnProcessingRule[]; // Règles de traitement des colonnes
  
  // Nouvelles propriétés pour la configuration autonome
  reconciliationLogic?: {
    type: 'STANDARD' | 'SPECIAL_RATIO' | 'CUSTOM';
    parameters?: {
      expectedRatio?: string;
      tolerance?: number;
      description?: string;
    };
  };
  correspondenceRules?: {
    rules: Array<{
      name: string;
      condition: string;
      action: string;
      description?: string;
    }>;
  };
  comparisonColumns?: {
    columns: Array<{
      boColumn: string;
      partnerColumn: string;
      comparisonType: 'AUTO' | 'NUMERIC' | 'DATE' | 'STRING';
      tolerance: number;
    }>;
  };
}

export interface ProcessingResult {
  success: boolean;
  fileName: string;
  modelId: string;
  originalData: any[];
  processedData: any[];
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
  errors: string[];
  warnings: string[];
  processingTime: number;
  reconciliationTime: number;
}

export interface BOColumnFilter {
  column: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex';
  value: string;
  caseSensitive?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AutoProcessingService {
  private processingModels: AutoProcessingModel[] = [];
  private apiUrl = environment.apiUrl;
  
  // Cache pour optimiser les performances
  private modelsCache: AutoProcessingModel[] = [];
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private isLoading = false;

  constructor(
    private fileWatcherService: FileWatcherService,
    private reconciliationService: ReconciliationService,
    private fieldTypeDetectionService: FieldTypeDetectionService,
    private excelTypeDetectionService: ExcelTypeDetectionService,
    private specialFileDetectionService: SpecialFileDetectionService,
    private http: HttpClient
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
        updatedAt: new Date()
      },
      {
        id: 'partner-standard',
        name: 'Partenaire Standard - Traitement automatique',
        filePattern: '*partner*.csv',
        fileType: 'partner',
        autoApply: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  }

  // Méthodes CRUD pour les modèles avec cache
  async getAllModels(): Promise<AutoProcessingModel[]> {
    // Vérifier si le cache est valide
    if (this.isCacheValid()) {
      console.log('📋 Utilisation du cache pour getAllModels');
      return this.modelsCache;
    }

    // Éviter les requêtes multiples simultanées
    if (this.isLoading) {
      console.log('⏳ Requête en cours, attente...');
      return new Promise((resolve) => {
        const checkCache = () => {
          if (this.isCacheValid()) {
            resolve(this.modelsCache);
          } else {
            setTimeout(checkCache, 100);
          }
        };
        checkCache();
      });
    }

    this.isLoading = true;
    console.log('🔄 Chargement des modèles depuis l\'API...');

    try {
      const response = await this.http.get<any>(`${this.apiUrl}/auto-processing/models`).toPromise();
      
      let models: AutoProcessingModel[] = [];
      
      if (response && response.success && response.models) {
        models = this.normalizeModels(response.models);
      } else if (Array.isArray(response)) {
        models = this.normalizeModels(response);
      } else {
        console.warn('Réponse inattendue de l\'API getAllModels:', response);
        models = [];
      }

      // Mettre à jour le cache
      this.updateCache(models);
      
      console.log(`✅ ${models.length} modèles chargés avec succès`);
      return models;
      
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des modèles:', error);
      // Retourner les modèles par défaut en cas d'erreur
      return this.processingModels;
    } finally {
      this.isLoading = false;
    }
  }

  // Normaliser les modèles reçus du backend
  private normalizeModels(models: any[]): AutoProcessingModel[] {
    return models.map(model => this.normalizeModel(model));
  }

  // Normaliser un modèle individuel
  private normalizeModel(model: any): AutoProcessingModel {
    return {
      ...model,
      id: model.modelId || model.id, // Utiliser modelId comme id principal
      createdAt: model.createdAt ? new Date(model.createdAt) : undefined,
      updatedAt: model.updatedAt ? new Date(model.updatedAt) : undefined
    };
  }

  getModels(): Promise<AutoProcessingModel[]> {
    return this.getAllModels();
  }

  getModelById(id: string): Promise<AutoProcessingModel> {
    return this.http.get<any>(`${this.apiUrl}/auto-processing/models/${id}`).toPromise()
      .then(response => {
        if (response && response.success && response.model) {
          return this.normalizeModel(response.model);
        } else {
          throw new Error('Modèle non trouvé');
        }
      });
  }

  createModel(model: AutoProcessingModel): Promise<AutoProcessingModel> {
    return this.http.post<any>(`${this.apiUrl}/auto-processing/models`, model).toPromise()
      .then(response => {
        if (response && response.success && response.model) {
          // Invalider le cache après création
          this.invalidateCache();
          console.log('✅ Cache invalidé après création');
          return this.normalizeModel(response.model);
        } else {
          throw new Error('Erreur lors de la création du modèle');
        }
      });
  }

  updateModel(id: string, model: AutoProcessingModel): Promise<AutoProcessingModel> {
    return this.http.put<any>(`${this.apiUrl}/auto-processing/models/${id}`, model).toPromise()
      .then(response => {
        if (response && response.success && response.model) {
          // Invalider le cache après mise à jour
          this.invalidateCache();
          console.log('✅ Cache invalidé après mise à jour');
          return this.normalizeModel(response.model);
        } else {
          throw new Error('Erreur lors de la mise à jour du modèle');
        }
      });
  }

  deleteModel(id: string): Promise<void> {
    return this.http.delete<any>(`${this.apiUrl}/auto-processing/models/${id}`).toPromise()
      .then(response => {
        console.log('🔍 [DEBUG] Delete response:', response);
        // Vérifier si la suppression a réussi
        if (response && (response.success === true || response.success === false)) {
          if (response.success === true) {
            // Invalider le cache après suppression réussie
            this.invalidateCache();
            console.log('✅ Cache invalidé après suppression');
            return;
          } else {
            throw new Error('Erreur lors de la suppression du modèle');
          }
        } else {
          // Si pas de réponse ou réponse invalide, considérer comme succès (compatibilité)
          console.warn('⚠️ Réponse de suppression invalide, considéré comme succès:', response);
          // Invalider le cache quand même
          this.invalidateCache();
          console.log('✅ Cache invalidé après suppression (réponse invalide)');
          return;
        }
      })
      .catch(error => {
        console.error('❌ Erreur HTTP lors de la suppression:', error);
        throw new Error('Erreur lors de la suppression du modèle');
      });
  }

  // Méthodes de traitement automatique
  async processFile(file: File): Promise<ProcessingResult> {
    const startTime = Date.now();
    const fileName = file.name;
    
    try {
      // Détecter le type de fichier
      const fileType = this.detectFileType(fileName);
      
      // Trouver le modèle approprié
      const matchingModel = this.findMatchingModel(fileName, fileType);
      
        if (!matchingModel) {
        return {
            success: false,
          fileName,
            modelId: '',
            originalData: [],
            processedData: [],
          errors: ['Aucun modèle de traitement trouvé pour ce fichier'],
            warnings: [],
          processingTime: Date.now() - startTime
        };
      }

      // Lire le fichier
      const data = await this.readFile(file);
      
      // Traiter les données
      const processedData = this.processData(data, matchingModel);
                
                return {
                  success: true,
        fileName,
                  modelId: matchingModel.id,
                  originalData: data,
        processedData,
        errors: [],
        warnings: [],
        processingTime: Date.now() - startTime
      };
      
        } catch (error) {
      return {
        success: false,
        fileName,
        modelId: '',
        originalData: [],
        processedData: [],
        errors: [error.message],
        warnings: [],
        processingTime: Date.now() - startTime
      };
    }
  }

  private detectFileType(fileName: string): 'bo' | 'partner' | 'both' {
    const lowerFileName = fileName.toLowerCase();
    
    if (lowerFileName.includes('bo') || lowerFileName.includes('backoffice')) {
      return 'bo';
    } else if (lowerFileName.includes('partner') || lowerFileName.includes('partenaire')) {
      return 'partner';
            } else {
      return 'both';
    }
  }

  private findMatchingModel(fileName: string, fileType: 'bo' | 'partner' | 'both'): AutoProcessingModel | null {
    return this.processingModels.find(model => {
      const pattern = model.filePattern.replace('*', '.*');
        const regex = new RegExp(pattern, 'i');
      return regex.test(fileName) && (model.fileType === fileType || model.fileType === 'both');
    }) || null;
  }

  private async readFile(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csv = e.target.result as string;
          const lines = csv.split('\n');
          const headers = lines[0].split(',').map(h => h.trim());
          const data = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim());
            const row: any = {};
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });
      return row;
    });
          resolve(data);
    } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  private processData(data: any[], model: AutoProcessingModel): any[] {
    // Traitement de base - retourner les données telles quelles
    // La logique de traitement spécifique a été supprimée
    return data;
  }

  // Méthodes utilitaires
  getModelsCount(): number {
    return this.processingModels.length;
  }

  getModelsByType(type: 'bo' | 'partner' | 'both'): AutoProcessingModel[] {
    return this.processingModels.filter(model => model.fileType === type);
  }

  // ===== MÉTHODES POUR LES RÈGLES DE TRAITEMENT DES COLONNES =====

  // Récupérer les règles de traitement des colonnes pour un modèle
  getColumnProcessingRules(modelId: string): Promise<ColumnProcessingRule[]> {
    return this.http.get<{success: boolean, rules: ColumnProcessingRule[]}>(`${this.apiUrl}/auto-processing/models/${modelId}/column-rules`)
      .toPromise()
      .then(response => response?.rules || []);
  }

  // Créer une nouvelle règle de traitement
  createColumnProcessingRule(modelId: string, rule: ColumnProcessingRule): Promise<ColumnProcessingRule> {
    return this.http.post<{success: boolean, rule: ColumnProcessingRule}>(`${this.apiUrl}/auto-processing/models/${modelId}/column-rules`, rule)
      .toPromise()
      .then(response => response?.rule);
  }

  // Mettre à jour une règle de traitement
  updateColumnProcessingRule(ruleId: number, rule: ColumnProcessingRule): Promise<ColumnProcessingRule> {
    return this.http.put<{success: boolean, rule: ColumnProcessingRule}>(`${this.apiUrl}/auto-processing/column-rules/${ruleId}`, rule)
      .toPromise()
      .then(response => response?.rule);
  }

  // Supprimer une règle de traitement
  deleteColumnProcessingRule(ruleId: number): Promise<boolean> {
    return this.http.delete<{success: boolean}>(`${this.apiUrl}/auto-processing/column-rules/${ruleId}`)
      .toPromise()
      .then(response => response?.success || false);
  }

  // Sauvegarder toutes les règles d'un modèle en batch
  saveColumnProcessingRulesBatch(modelId: string, rules: ColumnProcessingRule[]): Promise<ColumnProcessingRule[]> {
    return this.http.post<{success: boolean, rules: ColumnProcessingRule[]}>(`${this.apiUrl}/auto-processing/models/${modelId}/column-rules/batch`, rules)
      .toPromise()
      .then(response => response?.rules || []);
  }

  // Traiter des données avec les règles d'un modèle
  processDataWithRules(modelId: string, data: any[]): Promise<any[]> {
    return this.http.post<{success: boolean, processedData: any[]}>(`${this.apiUrl}/auto-processing/process-data/${modelId}`, data)
      .toPromise()
      .then(response => response?.processedData || []);
  }

  // Traiter une ligne unique avec les règles d'un modèle
  processSingleRowWithRules(modelId: string, row: any): Promise<any> {
    return this.http.post<{success: boolean, processedData: any}>(`${this.apiUrl}/auto-processing/process-single-row/${modelId}`, row)
      .toPromise()
      .then(response => response?.processedData);
  }

  // Obtenir les colonnes cibles d'un modèle
  getTargetColumns(modelId: string): Promise<string[]> {
    return this.http.get<{success: boolean, targetColumns: string[]}>(`${this.apiUrl}/auto-processing/models/${modelId}/target-columns`)
      .toPromise()
      .then(response => response?.targetColumns || []);
  }

  // Valider les règles d'un modèle
  validateRules(modelId: string): Promise<boolean> {
    return this.http.get<{success: boolean, isValid: boolean}>(`${this.apiUrl}/auto-processing/models/${modelId}/validate-rules`)
      .toPromise()
      .then(response => response?.isValid || false);
  }

  /**
   * Vérifie si le cache est valide
   */
  private isCacheValid(): boolean {
    return this.modelsCache.length > 0 && 
           (Date.now() - this.cacheTimestamp) < this.CACHE_DURATION;
  }

  /**
   * Met à jour le cache
   */
  private updateCache(models: AutoProcessingModel[]): void {
    this.modelsCache = models;
    this.cacheTimestamp = Date.now();
    console.log('💾 Cache mis à jour');
  }

  /**
   * Invalide le cache (appelé après modifications)
   */
  private invalidateCache(): void {
    this.modelsCache = [];
    this.cacheTimestamp = 0;
    console.log('🗑️ Cache invalidé');
  }
} 