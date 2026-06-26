import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { AutoProcessingService, AutoProcessingModel, DEFAULT_PRE_PROCESSING_SECTION_ORDER, ModelColumnMathRule, ModelFormatAction, ModelFormatActionType, ModelFormatColumnSettings, ModelPreProcessingConfig, ModelPreProcessingSectionId, ModelRowFilter, ModelColumnValueMapping, ModelColumnConcatRule, ModelColumnRenameRule, PartnerConditionalKeyRule, PartnerConditionalKeysConfig, BoConditionalKeysConfig } from '../../services/auto-processing.service';
import { FileWatcherService } from '../../services/file-watcher.service';
import { ModelManagementService } from '../../services/model-management.service';
import { PopupService } from '../../services/popup.service';

// Interface pour les règles de traitement des colonnes
interface ColumnProcessingRule {
  id?: number;
  sourceColumn: string;
  sourceColumns?: string[]; // Support pour les colonnes multiples
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

@Component({
  selector: 'app-auto-processing-models',
  templateUrl: './auto-processing-models.component.html',
  styleUrls: ['./auto-processing-models.component.css']
})
export class AutoProcessingModelsComponent implements OnInit {
  models: AutoProcessingModel[] = [];
  modelForm: FormGroup;
  availableFiles: any[] = [];
  availableColumns: string[] = [];
  availableColumnsForTemplate: string[] = [];
  availableBOModels: AutoProcessingModel[] = [];
  availableBOColumns: string[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';
  editingModel: AutoProcessingModel | null = null;
  showCreateForm = false;
  isDuplicatingModel = false;
  
  // Propriétés pour forcer la mise à jour des classes CSS
  forceUpdate = false;
  
  // Nouvelles propriétés pour les règles de traitement des colonnes (ancien)
  columnProcessingRules: ColumnProcessingRule[] = [];
  showColumnRulesSection = false;
  editingRule: ColumnProcessingRule | null = null;
  ruleForm: FormGroup;
  
  // Propriétés pour la configuration des modèles autonomes
  showReconciliationLogicSection = false;
  showCorrespondenceRulesSection = false;
  showComparisonColumnsSection = false;
  showColumnProcessingSection = false;
  showRowFiltersSection = false;
  showFormatActionsSection = false;
  showColumnConcatSection = false;
  showColumnMathSection = false;
  showValueMappingsSection = false;
  showColumnRenameSection = false;
  modelRowFilters: ModelRowFilter[] = [];
  modelFormatActions: ModelFormatAction[] = [];
  modelColumnConcatRules: ModelColumnConcatRule[] = [];
  modelColumnMathRules: ModelColumnMathRule[] = [];
  modelValueMappings: ModelColumnValueMapping[] = [];
  modelColumnRenameRules: ModelColumnRenameRule[] = [];
  preProcessingSectionOrder: ModelPreProcessingSectionId[] = [...DEFAULT_PRE_PROCESSING_SECTION_ORDER];
  readonly preProcessingSectionLabels: Record<ModelPreProcessingSectionId, string> = {
    rowFilters: 'Filtrer les lignes',
    formatActions: 'Formatage automatique',
    columnConcatRules: 'Concaténer plusieurs colonnes',
    columnMathRules: 'Addition / soustraction de colonnes',
    valueMappings: 'Renommer les valeurs de colonnes',
    columnRenameRules: 'Renommer un en-tête de colonne'
  };
  nextModelFilterId = 1;
  nextModelConcatRuleId = 1;
  nextModelMathRuleId = 1;
  nextModelValueMappingId = 1;
  nextModelColumnRenameId = 1;
  nextModelFormatActionId = 1;
  newFormatActionType: ModelFormatActionType = 'removeCharacters';
  readonly formatActionTypes: Array<{ type: ModelFormatActionType; label: string }> = [
    { type: 'removeSpecialStrings', label: 'Supprimer une chaîne spécifique' },
    { type: 'removeCharacters', label: 'Supprimer / conserver des caractères' },
    { type: 'removeNumbers', label: 'Supprimer les chiffres' },
    { type: 'removeIndicatif', label: 'Supprimer l\'indicatif téléphonique' },
    { type: 'removeDecimals', label: 'Supprimer les décimales' },
    { type: 'keepLastDigits', label: 'Garder les N derniers chiffres' },
    { type: 'removeZeroDecimals', label: 'Supprimer .0 sur les dates' },
    { type: 'removeSpaces', label: 'Supprimer les espaces' }
  ];
  
  // États d'édition
  editingReconciliationLogic = false;
  
  // Règles de correspondance
  correspondenceRules: any[] = [];
  editingCorrespondenceRule: any = null;
  correspondenceRuleForm: FormGroup;
  
  // Colonnes de comparaison
  comparisonColumns: any[] = [];
  editingComparisonColumn: any = null;
  comparisonColumnForm: FormGroup;
  
  // Règles de traitement des colonnes (nouvelle structure)
  editingColumnProcessingRule: any = null;
  columnProcessingRuleForm: FormGroup;
  
  // Clés sélectionnées
  selectedPartnerKeys: string[] = [];
  selectedBOModels: string[] = [];
  selectedBOKeys: string[] = [];

  /** Clés partenaire conditionnelles (optionnel). */
  partnerConditionalKeysEnabled = false;
  partnerConditionColumn = '';
  partnerConditionalDefaultKeyColumn = '';
  partnerConditionalKeyRules: PartnerConditionalKeyRule[] = [];

  /** Clés BO conditionnelles (optionnel). */
  boConditionalKeysEnabled = false;
  boConditionColumn = '';
  boConditionalDefaultKeyColumn = '';
  boConditionalKeyRules: PartnerConditionalKeyRule[] = [];
  
  // Colonnes disponibles pour le fichier modèle
  availableTemplateColumns: string[] = [];

  /** Évite les réinitialisations lors du chargement programmatique d'un modèle en édition. */
  private isRestoringModelState = false;
  
  // Sélection multiple de colonnes
  selectedColumns: string[] = [];
  
  // États de chargement
  isLoadingTemplateColumns = false;
  isLoadingBOColumns = false;
  
  // Options pour les types de format
  formatTypes = [
    { value: 'string', label: 'Texte' },
    { value: 'numeric', label: 'Numérique' },
    { value: 'date', label: 'Date' },
    { value: 'boolean', label: 'Booléen' }
  ];

  // Nouvelles propriétés pour le filtrage
  filterGroup: string = '';
  filterCountry: string = '';
  filterName: string = '';
  filteredModels: AutoProcessingModel[] = [];
  availableGroups: string[] = [];
  availableCountries: string[] = [];

  constructor(
    private fb: FormBuilder,
    private autoProcessingService: AutoProcessingService,
    private fileWatcherService: FileWatcherService,
    private cdr: ChangeDetectorRef,
    private modelManagementService: ModelManagementService,
    private popupService: PopupService
  ) {
    this.modelForm = this.fb.group({
      name: ['', Validators.required],
      filePattern: ['', Validators.required],
      fileType: ['bo', Validators.required],
      autoApply: [true],
      templateFile: [''],
      reconciliationKeys: this.fb.group({
        partnerKeys: [[]],
        boKeys: [[]],
        boModels: [[]],
        boModelKeys: this.fb.group({}),
        boTreatments: this.fb.group({})
      }),
      // Nouveaux champs pour la configuration autonome
      logicType: ['STANDARD'],
      expectedRatio: ['1:1'],
      logicDescription: [''],
      tolerance: [0.0]
    });

    // Initialiser le formulaire pour les règles de traitement des colonnes (ancien)
    this.ruleForm = this.fb.group({
      sourceColumn: ['', Validators.required],
      targetColumn: ['', Validators.required],
      formatType: ['string'],
      toUpperCase: [false],
      toLowerCase: [false],
      trimSpaces: [false],
      removeSpecialChars: [false],
      stringToRemove: [''],
      padZeros: [false],
      regexReplace: [''],
      specialCharReplacementMap: this.fb.group({})
    });

    // Initialiser le formulaire pour les règles de correspondance
    this.correspondenceRuleForm = this.fb.group({
      name: ['', Validators.required],
      condition: ['', Validators.required],
      action: ['', Validators.required],
      description: ['']
    });

    // Initialiser le formulaire pour les colonnes de comparaison
    this.comparisonColumnForm = this.fb.group({
      boColumn: ['', Validators.required],
      partnerColumn: ['', Validators.required],
      comparisonType: ['AUTO', Validators.required],
      tolerance: [0.01]
    });

    // Initialiser le formulaire pour les règles de traitement des colonnes (nouveau)
    this.columnProcessingRuleForm = this.fb.group({
      sourceColumn: [''], // Plus requis car on utilise la sélection multiple
      targetColumn: [''], // Plus requis car on utilise la sélection multiple
      formatType: [''],
      toUpperCase: [false],
      toLowerCase: [false],
      trimSpaces: [false],
      removeSpecialChars: [true],
      removeAccents: [false],
      stringToRemove: [''],
      padZeros: [false],
      regexReplace: [''],
      specialCharReplacementMap: this.fb.group({})
    });

    this.modelForm.get('fileType')?.valueChanges.subscribe(fileType => {
      this.updateReconciliationKeysValidation(fileType);
      
      // Réinitialiser les clés de réconciliation si le type est BO
      if (fileType === 'bo') {
        this.resetReconciliationKeysForBO();
        this.resetReconciliationLogicForBO();
      }
      
      // Réinitialiser le pattern seulement si on n'est pas en mode édition
      if (!this.editingModel && this.modelForm.get('filePattern')?.value) {
        this.modelForm.patchValue({ filePattern: '' });
      }
      
      if (fileType === 'partner') {
        // Pour les modèles partenaires, charger les colonnes TRXBO pour les clés BO
        this.loadColumnsForBOType();
        // Et aussi les colonnes partenaires si nécessaire
        if (this.availableColumnsForTemplate.length === 0) {
          this.loadColumnsForPartnerType();
        }
      } else if (fileType === 'bo' && this.availableColumnsForTemplate.length === 0) {
        this.loadColumnsForBOType();
      }
    });

    // Écouter les changements du fichier modèle pour charger les colonnes
    this.modelForm.get('templateFile')?.valueChanges.subscribe(templateFile => {
      if (templateFile) {
        this.loadTemplateColumns();
        // Charger automatiquement les colonnes pour les règles de traitement
        this.ensureModelColumnsLoaded();
      } else {
        // Réinitialiser les colonnes si aucun fichier n'est sélectionné
        this.availableTemplateColumns = [];
        this.selectedPartnerKeys = [];
        this.availableColumnsForTemplate = [];
      }
    });

    this.modelForm.get('reconciliationKeys.boModels')?.valueChanges.subscribe(() => {
      this.onBOModelsChange();
    });

    // Écouter les changements du type de fichier
    this.modelForm.get('fileType')?.valueChanges.subscribe(fileType => {
      console.log('🔄 Changement de type de fichier détecté:', fileType);
      
      if (fileType === 'bo') {
        // Réinitialiser les clés de réconciliation pour les fichiers BO
        this.selectedPartnerKeys = [];
        this.selectedBOModels = [];
        this.availableTemplateColumns = [];
      }
      
      // Charger automatiquement les colonnes appropriées pour le nouveau type
      this.ensureModelColumnsLoaded();
    });
  }

  ngOnInit(): void {
    this.loadAvailableFiles().then(() => {
      this.loadModels();
      
      if (this.availableFiles.length > 0 && this.availableColumns.length === 0) {
        const firstFile = this.availableFiles[0];
        
        if (firstFile.columns && firstFile.columns.length > 0) {
          this.availableColumns = firstFile.columns;
          this.modelForm.updateValueAndValidity();
        }
      }
    });
  }

  loadModels(): void {
    this.autoProcessingService.getAllModels(AutoProcessingService.MODELES_MODULE).then(models => {
        if (Array.isArray(models)) {
          this.models = models;
          
          // Filtrer les modèles BO disponibles
          this.availableBOModels = models.filter(model => model.fileType === 'bo');
          console.log('📋 Modèles BO disponibles:', this.availableBOModels);
          
          this.preloadBOModelColumns();
          // Charger les règles de traitement des colonnes pour chaque modèle
          this.models.forEach(model => {
            this.loadColumnProcessingRules(model.id);
          });
          
          // Initialiser les filtres et appliquer le filtrage
          this.initializeFilters();
          this.applyFilters();
        } else {
          console.warn('La réponse getAllModels n\'est pas un tableau:', models);
          this.models = [];
          this.filteredModels = [];
          this.errorMessage = 'Format de réponse invalide pour les modèles';
        }
    }).catch(error => {
        console.error('Erreur lors du chargement des modèles:', error);
        this.errorMessage = 'Erreur lors du chargement des modèles';
        this.models = [];
        this.filteredModels = [];
    });
  }

  /**
   * Initialise les options de filtrage disponibles
   */
  private initializeFilters(): void {
    // Extraire les groupes uniques
    const groups = new Set<string>();
    const countries = new Set<string>();
    
    this.models.forEach(model => {
      // Ajouter le groupe (catégorie)
      const category = this.getModelCategory(model);
      groups.add(category);
      
      // Extraire le pays du nom du modèle
      const country = this.extractCountryFromModelName(model.name);
      if (country) {
        countries.add(country);
      }
    });
    
    this.availableGroups = Array.from(groups).sort();
    this.availableCountries = Array.from(countries).sort();
    
    console.log('🔍 Options de filtrage initialisées:', {
      groups: this.availableGroups,
      countries: this.availableCountries
    });

    // Définir par défaut l'affichage des modèles Back Office si disponible
    if (!this.hasActiveFilters() && this.availableGroups.includes('Back Office')) {
      this.filterGroup = 'Back Office';
    }
  }

  /**
   * Extrait le pays du nom du modèle selon la règle spécifiée
   * Exemple: "Modèle basé sur CIMTNCM" -> "CM"
   */
  private extractCountryFromModelName(modelName: string): string | null {
    // Chercher le pattern "Modèle basé sur" suivi du nom
    const match = modelName.match(/Modèle basé sur\s+([A-Z]+)/i);
    if (match && match[1]) {
      const baseName = match[1];
      // Prendre les deux dernières lettres comme code pays
      if (baseName.length >= 2) {
        return baseName.slice(-2).toUpperCase();
      }
    }
    
    // Fallback: chercher directement dans le nom du modèle
    const countryMatch = modelName.match(/([A-Z]{2})$/);
    if (countryMatch) {
      return countryMatch[1];
    }
    
    return null;
  }

  /**
   * Extrait le nom du modèle après "Modèle basé sur"
   */
  private extractModelBaseName(modelName: string): string {
    const match = modelName.match(/Modèle basé sur\s+(.+)/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    return modelName;
  }

  /**
   * Applique les filtres sur les modèles
   */
  applyFilters(): void {
    console.log('🔍 Application des filtres:', {
      group: this.filterGroup,
      country: this.filterCountry,
      name: this.filterName
    });
    
    this.filteredModels = this.models.filter(model => {
      // Filtre par groupe (catégorie)
      if (this.filterGroup && this.getModelCategory(model) !== this.filterGroup) {
        return false;
      }
      
      // Filtre par pays
      if (this.filterCountry) {
        const modelCountry = this.extractCountryFromModelName(model.name);
        if (!modelCountry || modelCountry !== this.filterCountry) {
          return false;
        }
      }
      
      // Filtre par nom (recherche dans le nom après "Modèle basé sur")
      if (this.filterName) {
        const baseName = this.extractModelBaseName(model.name);
        if (!baseName.toLowerCase().includes(this.filterName.toLowerCase())) {
          return false;
        }
      }
      
      return true;
    });
    
    console.log('✅ Filtrage appliqué:', {
      totalModels: this.models.length,
      filteredModels: this.filteredModels.length,
      filters: {
        group: this.filterGroup,
        country: this.filterCountry,
        name: this.filterName
      }
    });
  }

  /**
   * Réinitialise tous les filtres
   */
  resetFilters(): void {
    this.filterGroup = '';
    this.filterCountry = '';
    this.filterName = '';
    this.applyFilters();
  }

  /**
   * Vérifie si des filtres sont actifs
   */
  hasActiveFilters(): boolean {
    return !!(this.filterGroup || this.filterCountry || this.filterName);
  }

  /**
   * Obtient le nombre de modèles filtrés
   */
  getFilteredModelsCount(): number {
    return this.filteredModels.length;
  }

  /**
   * Obtient les modèles filtrés par catégorie
   */
  getFilteredModelsByCategory(): { [category: string]: AutoProcessingModel[] } {
    const groupedModels: { [category: string]: AutoProcessingModel[] } = {
      'Partenaire CASHIN': [],
      'Partenaire PAIEMENT': [],
      'Back Office': []
    };

    this.filteredModels.forEach(model => {
      const category = this.getModelCategory(model);
      groupedModels[category].push(model);
    });

    return groupedModels;
  }

  /**
   * Obtient les catégories actives parmi les modèles filtrés
   */
  getActiveFilteredCategories(): string[] {
    const groupedModels = this.getFilteredModelsByCategory();
    return Object.keys(groupedModels).filter(category => groupedModels[category].length > 0);
  }

  /**
   * Obtient le nombre de modèles filtrés par catégorie
   */
  getFilteredCategoryCount(category: string): number {
    const groupedModels = this.getFilteredModelsByCategory();
    return groupedModels[category]?.length || 0;
  }

  // Charger les règles de traitement des colonnes pour un modèle
  loadColumnProcessingRules(modelId: string): void {
    this.autoProcessingService.getColumnProcessingRules(modelId, AutoProcessingService.MODELES_MODULE)
      .then(rules => {
        // Trier les règles par ruleOrder pour garantir l'ordre d'application
        this.columnProcessingRules = rules.sort((a, b) => {
          const orderA = a.ruleOrder !== undefined ? a.ruleOrder : 0;
          const orderB = b.ruleOrder !== undefined ? b.ruleOrder : 0;
          return orderA - orderB;
        });
        
        // Vérifier que stringToRemove est bien chargé depuis la base
        console.log('🔍 [DEBUG] Règles chargées depuis la base de données (triées par ruleOrder):');
        this.columnProcessingRules.forEach((rule, index) => {
          console.log(`  Règle ${index} (ruleOrder: ${rule.ruleOrder}):`, {
            sourceColumn: rule.sourceColumn,
            stringToRemove: rule.stringToRemove || '(aucun)',
            removeSpecialChars: rule.removeSpecialChars,
            removeAccents: rule.removeAccents,
            id: rule.id
          });
        });
      })
      .catch(error => {
        console.error('Erreur lors du chargement des règles:', error);
        this.columnProcessingRules = [];
      });
  }

  private preloadBOModelColumns(): void {
    const boModels = this.getAvailableBOModels();
    
    boModels.forEach(model => {
      if (model.templateFile) {
        const existingFile = this.availableFiles.find(f => f.fileName === model.templateFile);
        if (!existingFile || !existingFile.columns || existingFile.columns.length === 0) {
          this.loadBOModelColumns(model);
        }
      }
    });
  }

  loadAvailableFiles(): Promise<void> {
    this.loading = true;
    
    return this.fileWatcherService.getAvailableFiles().toPromise().then(files => {
      this.availableFiles = files || [];
      
      // Correction spécifique pour OPPART.xls
      this.availableFiles.forEach(file => {
        if (file.fileName.toLowerCase().includes('oppart')) {
          file.columns = [
            'ID Opération', 'Type Opération', 'Montant', 'Solde avant', 'Solde aprés',
            'Code proprietaire', 'Téléphone', 'Statut', 'ID Transaction', 'Num bordereau',
            'Date opération', 'Date de versement', 'Banque appro', 'Login demandeur Appro',
            'Login valideur Appro', 'Motif rejet', 'Frais connexion', 'Numéro Trans GU',
            'Agent', 'Motif régularisation', 'groupe de réseau'
          ];
        }
        
        // Correction spécifique pour TRXBO.xls
        if (file.fileName.toLowerCase().includes('trxbo')) {
          file.columns = [
            'ID', 'IDTransaction', 'téléphone client', 'montant', 'Service',
            'Moyen de Paiement', 'Agence', 'Agent', 'Type agent', 'PIXI',
            'Date', 'Numéro Trans GU', 'GRX', 'Statut', 'Latitude',
            'Longitude', 'ID Partenaire DIST', 'Expéditeur', 'Pays provenance',
            'Bénéficiaire', 'Canal de distribution'
          ];
        }
        
        // Correction spécifique pour USSDPART.xls
        if (file.fileName.toLowerCase().includes('ussdpart')) {
          file.columns = [
            'ID', 'Groupe Réseaux', 'Code réseau', 'Agence', 'Code PIXI',
            'Code de Proxy', 'Code service', 'Numéro Trans GU', 'Déstinataire',
            'Login agent', 'Type agent', 'date de création', 'Date d\'envoi vers part',
            'Etat', 'Type', 'Token', 'SMS', 'Action faite', 'Statut',
            'Utilisateur', 'Montant', 'Date dernier traitement', 'Latitude',
            'Longitude', 'Partenaire dist ID', 'Agence SC', 'Groupe reseau SC',
            'Agent SC', 'PDA SC'
          ];
        }
      });
      
      this.loading = false;
    }).catch(error => {
      console.error('Erreur lors du chargement des fichiers:', error);
      this.loading = false;
    });
  }

  private loadBOModelColumns(model: AutoProcessingModel): void {
    console.log('🔍 [AutoProcessingModelsComponent] loadBOModelColumns() appelé pour:', model.templateFile);
    
    // Charger les colonnes directement depuis les fichiers Excel du watch-folder
    this.loadColumnsFromExcelFiles();
  }

  /**
   * Charge les colonnes depuis les fichiers Excel dans le dossier watch-folder
   */
  private loadColumnsFromExcelFiles(): void {
    console.log('🔍 Chargement des colonnes depuis les fichiers Excel...');
    
    this.fileWatcherService.getAvailableFiles().subscribe({
      next: (files) => {
        console.log('📁 Fichiers disponibles:', files);
        
        // Extraire toutes les colonnes uniques de tous les fichiers
        const allColumns = new Set<string>();
        
        files.forEach(file => {
          if (file.columns && Array.isArray(file.columns)) {
            file.columns.forEach((column: string) => {
              allColumns.add(column);
            });
          }
        });
        
        // Convertir en tableau et trier
        this.availableColumns = Array.from(allColumns).sort();
        console.log('📋 Colonnes disponibles:', this.availableColumns);
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement des colonnes:', error);
        this.availableColumns = [];
      }
    });
  }

  private loadColumnsForPartnerType(): void {
    const partnerFiles = this.availableFiles.filter(f => 
      f.fileName.toLowerCase().includes('partner') || 
      f.fileName.toLowerCase().includes('partenaire')
    );
    
    if (partnerFiles.length > 0) {
      const firstPartnerFile = partnerFiles[0];
      if (firstPartnerFile.columns) {
                  this.availableColumnsForTemplate = firstPartnerFile.columns;
      }
    }
  }

  private loadColumnsForBOType(): void {
    console.log('🔍 Chargement des colonnes pour le type BO...');
    
    this.loadColumnsFromExcelFiles();
    
    // Mettre à jour le formulaire
    this.modelForm.updateValueAndValidity();
  }

  private updateReconciliationKeysValidation(fileType: string): void {
    const reconciliationKeysGroup = this.modelForm.get('reconciliationKeys');
    if (reconciliationKeysGroup) {
      if (fileType === 'partner') {
        reconciliationKeysGroup.get('partnerKeys')?.setValidators([Validators.required]);
        reconciliationKeysGroup.get('boKeys')?.setValidators([Validators.required]);
        } else {
        reconciliationKeysGroup.get('partnerKeys')?.clearValidators();
        reconciliationKeysGroup.get('boKeys')?.clearValidators();
      }
      reconciliationKeysGroup.updateValueAndValidity();
    }
  }

  private resetReconciliationKeysForBO(): void {
    const reconciliationKeys = this.modelForm.get('reconciliationKeys');
    reconciliationKeys?.patchValue({
      partnerKeys: [],
      boKeys: [],
      boModels: [],
      boModelKeys: {},
      boTreatments: {}
    });
    console.log('✅ Clés de réconciliation réinitialisées pour le type BO');
  }

  private resetReconciliationLogicForBO(): void {
    // Réinitialiser la logique de réconciliation pour les modèles BO
    this.modelForm.patchValue({
      logicType: null,
      expectedRatio: null,
      logicDescription: null
    });
    this.showReconciliationLogicSection = false;
    this.editingReconciliationLogic = false;
    console.log('✅ Logique de réconciliation réinitialisée pour le type BO');
  }

  private loadColumnsForTemplateFile(templateFile: string): void {
    const fileType = this.modelForm.get('fileType')?.value || 'partner';
    void this.resolveAndApplyTemplateColumns(templateFile, fileType).then(() => {
      this.cdr.detectChanges();
    });
  }

  private async ensureAvailableFilesLoaded(): Promise<void> {
    if (!this.availableFiles?.length) {
      await this.loadAvailableFiles();
    }
  }

  private findAvailableFile(templateFile: string) {
    const normalized = (templateFile || '').trim().toLowerCase();
    if (!normalized) {
      return undefined;
    }
    const exact = this.availableFiles.find(f => f.fileName === templateFile);
    if (exact) {
      return exact;
    }
    const caseInsensitive = this.availableFiles.find(
      f => f.fileName.trim().toLowerCase() === normalized
    );
    if (caseInsensitive) {
      return caseInsensitive;
    }
    const templateBase = normalized.replace(/\.[^.]+$/, '');
    return this.availableFiles.find(f => {
      const fileBase = f.fileName.trim().toLowerCase().replace(/\.[^.]+$/, '');
      return fileBase === templateBase
        || normalized.includes(fileBase)
        || fileBase.includes(templateBase);
    });
  }

  private getHardcodedColumnsForTemplate(templateFile: string): string[] | null {
    const lower = templateFile.toLowerCase();
    if (lower.includes('oppart')) {
      return [
        'ID Opération', 'Type Opération', 'Montant', 'Solde avant', 'Solde après',
        'Code propriétaire', 'Téléphone', 'Statut', 'ID Transaction', 'Num bordereau',
        'Date opération', 'Date de versement', 'Banque appro', 'Login demandeur Appro',
        'Login valideur Appro', 'Motif rejet', 'Frais connexion', 'Numéro Trans GU',
        'Agent', 'Motif régularisation', 'groupe de réseau'
      ];
    }
    if (lower.includes('trxbo')) {
      return [
        'ID', 'IDTransaction', 'téléphone client', 'montant', 'Service',
        'Moyen de Paiement', 'Agence', 'Agent', 'Type agent', 'PIXI',
        'Date', 'Numéro Trans GU', 'GRX', 'Statut', 'Latitude',
        'Longitude', 'ID Partenaire DIST', 'Expéditeur', 'Pays provenance',
        'Bénéficiaire', 'Canal de distribution'
      ];
    }
    if (lower.includes('ussdpart')) {
      return [
        'ID', 'Groupe Réseaux', 'Code réseau', 'Agence', 'Code PIXI',
        'Code de Proxy', 'Code service', 'Numéro Trans GU', 'Destinataire',
        'Login agent', 'Type agent', 'date de création', 'Date d\'envoi vers part',
        'Etat', 'Type', 'Token', 'SMS', 'Action faite', 'Statut',
        'Utilisateur', 'Montant', 'Date dernier traitement', 'Latitude',
        'Longitude', 'Partenaire dist ID', 'Agence SC', 'Groupe reseau SC',
        'Agent SC', 'PDA SC'
      ];
    }
    return null;
  }

  private async resolveTemplateColumnNames(templateFile: string): Promise<string[]> {
    await this.ensureAvailableFilesLoaded();

    const hardcoded = this.getHardcodedColumnsForTemplate(templateFile);
    if (hardcoded?.length) {
      return this.normalizeColumnNames(hardcoded);
    }

    const selectedFile = this.findAvailableFile(templateFile);
    if (selectedFile?.columns?.length) {
      return this.normalizeColumnNames(selectedFile.columns);
    }

    const simulated = await this.getFileColumns(templateFile);
    return this.normalizeColumnNames(simulated);
  }

  private extractColumnsFromPreProcessingConfig(config?: ModelPreProcessingConfig | null): string[] {
    if (!config) {
      return [];
    }
    const columns = new Set<string>();
    (config.rowFilters || []).forEach(filter => filter.column?.trim() && columns.add(filter.column.trim()));
    (config.valueMappings || []).forEach(mapping => mapping.column?.trim() && columns.add(mapping.column.trim()));
    (config.columnRenameRules || []).forEach(rule => {
      if (rule.sourceColumn?.trim()) {
        columns.add(rule.sourceColumn.trim());
      }
      if (rule.targetColumn?.trim()) {
        columns.add(rule.targetColumn.trim());
      }
    });
    (config.columnConcatRules || []).forEach(rule => {
      rule.sourceColumns?.forEach(col => col?.trim() && columns.add(col.trim()));
      if (rule.targetColumn?.trim()) {
        columns.add(rule.targetColumn.trim());
      }
    });
    (config.columnMathRules || []).forEach(rule => {
      [rule.sourceColumnA, rule.sourceColumnB, rule.targetColumn].forEach(col => {
        if (col?.trim()) {
          columns.add(col.trim());
        }
      });
    });
    (config.formatActions || []).forEach(action => {
      action.columns?.forEach(col => col?.trim() && columns.add(col.trim()));
      Object.keys(action.columnSettings || {}).forEach(col => col?.trim() && columns.add(col.trim()));
    });
    return [...columns];
  }

  private extractColumnsFromConditionalKeys(config?: PartnerConditionalKeysConfig | BoConditionalKeysConfig | null): string[] {
    if (!config) {
      return [];
    }
    const columns = new Set<string>();
    if (config.conditionColumn?.trim()) {
      columns.add(config.conditionColumn.trim());
    }
    if (config.defaultKeyColumn?.trim()) {
      columns.add(config.defaultKeyColumn.trim());
    }
    (config.rules || []).forEach(rule => {
      if (rule.keyColumn?.trim()) {
        columns.add(rule.keyColumn.trim());
      }
    });
    return [...columns];
  }

  private mergeTemplateColumnLists(base: string[], extra: string[]): string[] {
    const merged = [...base];
    for (const column of extra) {
      const normalized = this.normalizeColumnName(column);
      if (normalized && !merged.includes(normalized)) {
        merged.push(normalized);
      }
    }
    return merged.sort((a, b) => a.localeCompare(b, 'fr'));
  }

  private syncTemplateColumnLists(columns: string[]): void {
    const normalized = this.normalizeColumnNames(columns.filter(Boolean));
    this.availableTemplateColumns = [...normalized];
    this.availableColumnsForTemplate = [...normalized];
    this.availableColumns = [...normalized];
  }

  private async resolveAndApplyTemplateColumns(
    templateFile: string,
    fileType: string,
    extras?: {
      partnerKeys?: string[];
      boKeys?: string[];
      preProcessingConfig?: ModelPreProcessingConfig | null;
      partnerConditionalKeys?: PartnerConditionalKeysConfig | null;
      boConditionalKeys?: BoConditionalKeysConfig | null;
    }
  ): Promise<string[]> {
    if (!templateFile?.trim()) {
      this.syncTemplateColumnLists([]);
      return [];
    }

    this.isLoadingTemplateColumns = true;
    try {
      const resolved = await this.resolveTemplateColumnNames(templateFile);
      const extraColumns = [
        ...(extras?.partnerKeys || []),
        ...(extras?.boKeys || []),
        ...this.extractColumnsFromPreProcessingConfig(extras?.preProcessingConfig),
        ...this.extractColumnsFromConditionalKeys(extras?.partnerConditionalKeys)
      ];
      const columns = this.mergeTemplateColumnLists(resolved, extraColumns);
      this.syncTemplateColumnLists(columns);
      console.log('✅ Colonnes modèle appliquées:', {
        templateFile,
        fileType,
        count: columns.length
      });
      return columns;
    } catch (error) {
      console.error('❌ Erreur lors du chargement des colonnes du fichier modèle:', error);
      this.errorMessage = 'Erreur lors du chargement des colonnes du fichier modèle';
      return [];
    } finally {
      this.isLoadingTemplateColumns = false;
    }
  }

  private onBOModelsChange(): void {
    if (this.isRestoringModelState) {
      return;
    }

    const selectedBOModels = this.modelForm.get('reconciliationKeys.boModels')?.value || [];
    const boModelKeysGroup = this.modelForm.get('reconciliationKeys.boModelKeys') as FormGroup;
    const boTreatmentsGroup = this.modelForm.get('reconciliationKeys.boTreatments') as FormGroup;

    const preservedKeys: Record<string, string[]> = {};
    const preservedTreatments: Record<string, unknown> = {};
    Object.keys(boModelKeysGroup.controls).forEach(key => {
      preservedKeys[key] = boModelKeysGroup.get(key)?.value || [];
    });
    Object.keys(boTreatmentsGroup.controls).forEach(key => {
      preservedTreatments[key] = boTreatmentsGroup.get(key)?.value || [];
    });

    console.log('🔍 Modèles BO sélectionnés:', selectedBOModels);

    Object.keys(boModelKeysGroup.controls).forEach(key => {
      boModelKeysGroup.removeControl(key);
    });
    Object.keys(boTreatmentsGroup.controls).forEach(key => {
      boTreatmentsGroup.removeControl(key);
    });

    this.loadBOColumnsFromSelectedModels(selectedBOModels);

    const fallbackKeys = this.selectedBOKeys.length > 0 ? [...this.selectedBOKeys] : [];

    selectedBOModels.forEach((modelId: string) => {
      const model = this.models.find(m => m.id === modelId || m.modelId === modelId);
      if (model) {
        const keys = preservedKeys[modelId]?.length
          ? preservedKeys[modelId]
          : fallbackKeys;
        boModelKeysGroup.addControl(modelId, this.fb.control(keys));
        boTreatmentsGroup.addControl(
          modelId,
          this.fb.control(preservedTreatments[modelId] || [])
        );
      }
    });

    if (fallbackKeys.length > 0) {
      this.selectedBOKeys = [...fallbackKeys];
    }
  }

  getAvailableBOModels(): AutoProcessingModel[] {
    if (!Array.isArray(this.models)) {
      console.warn('this.models n\'est pas un tableau:', this.models);
      return [];
    }
    return this.models.filter(model => model.fileType === 'bo');
  }

  private loadBOColumnsFromSelectedModels(selectedModelIds: string[]): void {
    console.log('🔍 Chargement des colonnes pour les modèles BO sélectionnés:', selectedModelIds);
    
    const allColumns = new Set<string>();
    
    // Toujours charger les colonnes TRXBO par défaut
    const trxboColumns = [
      'ID', 'IDTransaction', 'téléphone client', 'montant', 'Service',
      'Moyen de Paiement', 'Agence', 'Agent', 'Type agent', 'PIXI',
      'Date', 'Numéro Trans GU', 'GRX', 'Statut', 'Latitude',
      'Longitude', 'ID Partenaire DIST', 'Expéditeur', 'Pays provenance',
      'Bénéficiaire', 'Canal de distribution'
    ];
    trxboColumns.forEach(col => allColumns.add(col));
    console.log('✅ Colonnes TRXBO par défaut ajoutées:', trxboColumns);
    
    selectedModelIds.forEach(modelId => {
      const model = this.models.find(m => m.id === modelId);
      if (model && model.templateFile) {
        // Les modèles BO ne devraient utiliser que les colonnes de TRXBO
        if (model.templateFile.toLowerCase().includes('trxbo')) {
          console.log(`🔍 Détection spécifique TRXBO pour le modèle BO ${model.name}`);
          console.log(`✅ Colonnes TRXBO déjà appliquées pour le modèle BO ${model.name}`);
        } else {
          // Chercher le fichier dans les fichiers disponibles
          const file = this.availableFiles.find(f => f.fileName === model.templateFile);
          if (file && file.columns) {
            file.columns.forEach((col: string) => {
              allColumns.add(this.normalizeColumnName(col));
            });
            console.log(`✅ Colonnes chargées pour le modèle BO ${model.name}:`, file.columns);
          } else {
            console.warn(`⚠️ Fichier modèle non trouvé pour le modèle BO ${model.name}:`, model.templateFile);
          }
        }
      }
    });
    
    this.availableBOColumns = Array.from(allColumns).sort();
    console.log('📋 Toutes les colonnes BO disponibles:', this.availableBOColumns);

    this.selectedBOKeys.forEach(key => {
      if (key && !this.availableBOColumns.includes(key)) {
        this.availableBOColumns.push(key);
      }
    });
    
    // S'assurer que les clés BO sélectionnées sont dans la liste
    if (this.editingModel && this.editingModel.reconciliationKeys?.boKeys) {
      this.editingModel.reconciliationKeys.boKeys.forEach(key => {
        if (!this.availableBOColumns.includes(key)) {
          this.availableBOColumns.push(key);
          console.log(`✅ Clé BO "${key}" ajoutée à la liste`);
        }
      });
    }
  }

  /**
   * Normalise un nom de colonne (gestion de l'encodage et du typage)
   * Méthode centralisée et standardisée pour toutes les sections
   * 
   * Cette méthode gère :
   * - ENCODAGE : Suppression des caractères de contrôle et normalisation Unicode
   * - NORMALISATION : Remplacement des caractères spéciaux par des espaces
   * - TYPAGE : Standardisation du format des noms de colonnes
   * 
   * @param columnName Le nom de colonne à normaliser
   * @return Le nom de colonne normalisé et standardisé
   */

  /**
   * Méthode simple qui retourne la valeur de la colonne sans modification
   */
  private normalizeColumnName(columnName: string): string {
    return columnName;
  }

  private extractBOKeysFromReconciliationKeys(reconciliationKeys: {
    boKeys?: string[];
    boModelKeys?: Record<string, string[]>;
  }): string[] {
    let allBOKeys: string[] = [];
    if (reconciliationKeys.boModelKeys && Object.keys(reconciliationKeys.boModelKeys).length > 0) {
      Object.values(reconciliationKeys.boModelKeys).forEach((keys: string[]) => {
        if (Array.isArray(keys)) {
          allBOKeys = allBOKeys.concat(keys);
        }
      });
    }
    if (allBOKeys.length === 0 && reconciliationKeys.boKeys?.length) {
      allBOKeys = reconciliationKeys.boKeys;
    }
    return [...new Set(allBOKeys.map(key => this.normalizeColumnName(key)))];
  }

  /** Synchronise les sélections UI vers le formulaire avant sauvegarde. */
  private syncReconciliationKeysBeforeSave(): void {
    const boModelKeys: Record<string, string[]> = {};
    this.selectedBOModels.forEach(modelId => {
      boModelKeys[modelId] = [...this.selectedBOKeys];
    });
    this.modelForm.patchValue({
      reconciliationKeys: {
        partnerKeys: this.selectedPartnerKeys,
        boModels: this.selectedBOModels,
        boKeys: this.selectedBOKeys,
        boModelKeys
      }
    }, { emitEvent: false });
  }

  saveModel(): void {
    // Utiliser notre logique de validation personnalisée
    if (this.isFormValid()) {
      this.syncReconciliationKeysBeforeSave();
      const formValue = this.modelForm.value;
      
      // Validation supplémentaire pour le pattern
      if (!formValue.filePattern || formValue.filePattern.trim() === '') {
        this.errorMessage = 'Veuillez sélectionner un pattern de fichier.';
        return;
      }
      
      // Pour la création, ne pas inclure l'id
      const modelData: any = {
        name: formValue.name,
        filePattern: formValue.filePattern,
        fileType: formValue.fileType,
        autoApply: formValue.autoApply,
        templateFile: formValue.templateFile,
        reconciliationKeys: {
          partnerKeys: formValue.reconciliationKeys.partnerKeys || [],
          boKeys: formValue.reconciliationKeys.boKeys || [],
          boModels: formValue.reconciliationKeys.boModels || [],
          boModelKeys: formValue.reconciliationKeys.boModelKeys || {},
          boTreatments: formValue.reconciliationKeys.boTreatments || {},
          partnerConditionalKeys: this.buildPartnerConditionalKeysConfig(),
          boConditionalKeys: this.buildBoConditionalKeysConfig()
        },
        columnProcessingRules: this.columnProcessingRules, // Ajouter les règles de traitement
        // Nouvelles configurations autonomes
        reconciliationLogic: {
          type: formValue.logicType || 'STANDARD',
          parameters: {
            expectedRatio: formValue.expectedRatio || '1:1',
            tolerance: formValue.tolerance || 0.0,
            description: formValue.logicDescription || ''
          }
        },
        correspondenceRules: {
          rules: this.correspondenceRules
        },
        comparisonColumns: {
          columns: this.comparisonColumns
        },
        preProcessingConfig: this.buildPreProcessingConfig()
      };

      // 🔧 SOLUTION: Ne pas inclure les champs de base de données pour la création
      // if (this.editingModel) {
      //   modelData.id = this.editingModel.id;
      //   modelData.createdAt = this.editingModel.createdAt;
      //   modelData.updatedAt = new Date();
      // }
      
      // Données à sauvegarder

      // Utiliser updateModel si on modifie, createModel si création
      let savePromise: Promise<any>;
      
      console.log('🔍 [DEBUG] État editingModel:', {
        editingModel: this.editingModel,
        hasEditingModel: !!this.editingModel,
        id: this.editingModel?.id,
        modelId: this.editingModel?.modelId
      });
      
      if (this.editingModel) {
        // Mise à jour du modèle existant
        // Le backend utilise l'ID numérique (Long) dans l'URL, pas le modelId
        const modelIdToUse = this.editingModel.id || this.editingModel.modelId;
        if (!modelIdToUse) {
          console.error('❌ Erreur: Aucun ID disponible pour la mise à jour du modèle');
          console.error('   - editingModel:', this.editingModel);
          this.errorMessage = 'Erreur: Aucun ID disponible pour la mise à jour du modèle';
          return;
        }
        
        console.log('🔄 Mise à jour du modèle avec ID:', modelIdToUse);
        console.log('   - Type:', typeof modelIdToUse);
        console.log('   - Données à envoyer:', JSON.stringify(modelData, null, 2));
        savePromise = this.autoProcessingService.updateModel(modelIdToUse, modelData);
      } else {
        // Création d'un nouveau modèle
        console.log('➕ Création d\'un nouveau modèle');
        console.log('   - Données à envoyer:', JSON.stringify(modelData, null, 2));
        savePromise = this.autoProcessingService.createModel(modelData);
      }

      savePromise.then(savedModel => {
        const wasEdit = !!this.editingModel;
        const wasDuplicate = this.isDuplicatingModel;
        const actionLabel = wasEdit ? 'modifié' : (wasDuplicate ? 'dupliqué' : 'créé');

        // Sauvegarder les règles de traitement des colonnes si elles existent
        // Note: Les règles sont déjà incluses dans modelData.columnProcessingRules
        // mais on les sauvegarde séparément pour s'assurer qu'elles sont bien persistées
        const finalModelId = savedModel.modelId || savedModel.id;
        if (this.columnProcessingRules.length > 0 && finalModelId) {
          this.autoProcessingService.saveColumnProcessingRulesBatch(finalModelId, this.columnProcessingRules)
            .then((savedRules) => {
              console.log('✅ Règles de traitement sauvegardées:', savedRules.length);
              this.successMessage = `Modèle ${actionLabel} avec ${this.columnProcessingRules.length} règle(s) de traitement`;
            })
            .catch(error => {
              console.error('❌ Erreur lors de la sauvegarde des règles:', error);
              this.successMessage = `Modèle ${actionLabel} mais erreur lors de la sauvegarde des règles`;
            });
        } else {
          this.successMessage = `Modèle ${actionLabel} avec succès`;
        }
        
        this.showCreateForm = false;
        this.editingModel = null;
        this.isDuplicatingModel = false;
        this.modelForm.reset({
          fileType: 'bo',
          autoApply: true,
          reconciliationKeys: {
            partnerKeys: [],
            boKeys: [],
            boModels: [],
            boModelKeys: {},
            boTreatments: {}
          }
        });
        this.columnProcessingRules = []; // Réinitialiser les règles
        this.loadModels();
      }).catch(error => {
        console.error('Erreur lors de la sauvegarde:', error);
        this.errorMessage = 'Erreur lors de la sauvegarde du modèle';
      });
    }
  }

  editModel(model: AutoProcessingModel, mode: 'edit' | 'duplicate' = 'edit'): void {
    const isDuplicate = mode === 'duplicate';
    this.isDuplicatingModel = isDuplicate;
    this.editingModel = isDuplicate ? null : model;
    this.showCreateForm = isDuplicate || !!this.editingModel;

    const sourceModel = isDuplicate ? this.buildModelDuplicate(model) : model;

    console.log('🔍 editModel() appelé avec le modèle:', sourceModel, 'mode:', mode);

    this.isRestoringModelState = true;
    
    // S'assurer que les reconciliationKeys sont complètes
    const reconciliationKeys = {
      partnerKeys: sourceModel.reconciliationKeys?.partnerKeys || [],
      boKeys: sourceModel.reconciliationKeys?.boKeys || [],
      boModels: sourceModel.reconciliationKeys?.boModels || [],
      boModelKeys: sourceModel.reconciliationKeys?.boModelKeys || {},
      boTreatments: sourceModel.reconciliationKeys?.boTreatments || {},
      partnerConditionalKeys: sourceModel.reconciliationKeys?.partnerConditionalKeys,
      boConditionalKeys: sourceModel.reconciliationKeys?.boConditionalKeys
    };
    
    console.log('🔍 Valeurs à patcher dans le formulaire:', {
      name: sourceModel.name,
      filePattern: sourceModel.filePattern,
      fileType: sourceModel.fileType,
      autoApply: sourceModel.autoApply,
      templateFile: sourceModel.templateFile
    });
    
    // Debug: Afficher les valeurs de la logique de réconciliation avant le patchValue
    console.log('🔍 [DEBUG] Logique de réconciliation du modèle:', {
      reconciliationLogic: sourceModel.reconciliationLogic,
      type: sourceModel.reconciliationLogic?.type,
      expectedRatio: sourceModel.reconciliationLogic?.parameters?.expectedRatio,
      description: sourceModel.reconciliationLogic?.parameters?.description,
      tolerance: sourceModel.reconciliationLogic?.parameters?.tolerance
    });
    
    this.modelForm.patchValue({
      name: sourceModel.name,
      filePattern: sourceModel.filePattern,
      fileType: sourceModel.fileType,
      autoApply: sourceModel.autoApply,
      templateFile: sourceModel.templateFile,
      reconciliationKeys: reconciliationKeys,
      // Charger les configurations autonomes
      logicType: sourceModel.reconciliationLogic?.type || 'STANDARD',
      expectedRatio: sourceModel.reconciliationLogic?.parameters?.expectedRatio || '1:1',
      logicDescription: sourceModel.reconciliationLogic?.parameters?.description || '',
      tolerance: sourceModel.reconciliationLogic?.parameters?.tolerance || 0.0
    }, { emitEvent: false });

    this.selectedBOModels = reconciliationKeys.boModels || [];
    this.selectedBOKeys = this.extractBOKeysFromReconciliationKeys(reconciliationKeys);
    
    // Debug: Vérifier les valeurs après le patchValue
    setTimeout(() => {
      console.log('🔍 [DEBUG] Valeurs du formulaire après patchValue:', {
        logicType: this.modelForm.get('logicType')?.value,
        expectedRatio: this.modelForm.get('expectedRatio')?.value,
        logicDescription: this.modelForm.get('logicDescription')?.value,
        tolerance: this.modelForm.get('tolerance')?.value
      });
      
      // Forcer la mise à jour de l'affichage
      this.cdr.detectChanges();
      
      // Vérifier à nouveau après la détection des changements
      setTimeout(() => {
        console.log('🔍 [DEBUG] Valeurs du formulaire après detectChanges:', {
          logicType: this.modelForm.get('logicType')?.value,
          expectedRatio: this.modelForm.get('expectedRatio')?.value,
          logicDescription: this.modelForm.get('logicDescription')?.value,
          tolerance: this.modelForm.get('tolerance')?.value
        });
      }, 50);
    }, 100);
    
    console.log('🔍 Valeur du filePattern après patchValue:', this.modelForm.get('filePattern')?.value);
    
    // Charger les règles de traitement des colonnes du modèle
    if (isDuplicate) {
      this.loadColumnProcessingRulesForDuplicate(model, sourceModel.columnProcessingRules);
    } else {
      this.loadColumnProcessingRules(model.id!);
    }

    // Charger les configurations autonomes
    this.correspondenceRules = sourceModel.correspondenceRules?.rules
      ? sourceModel.correspondenceRules.rules.map(rule => ({ ...rule }))
      : [];
    this.comparisonColumns = sourceModel.comparisonColumns?.columns
      ? sourceModel.comparisonColumns.columns.map(col => ({ ...col }))
      : [];
    if (reconciliationKeys.boModels && reconciliationKeys.boModels.length > 0) {
      this.loadBOColumnsFromSelectedModels(reconciliationKeys.boModels);
      
      // S'assurer que les FormGroup pour boModelKeys et boTreatments sont correctement initialisés
      const boModelKeysGroup = this.modelForm.get('reconciliationKeys.boModelKeys') as FormGroup;
      const boTreatmentsGroup = this.modelForm.get('reconciliationKeys.boTreatments') as FormGroup;
      
      // Nettoyer les contrôles existants
      Object.keys(boModelKeysGroup.controls).forEach(key => {
        boModelKeysGroup.removeControl(key);
      });
      Object.keys(boTreatmentsGroup.controls).forEach(key => {
        boTreatmentsGroup.removeControl(key);
      });
      
      // Ajouter les contrôles pour chaque modèle BO
      reconciliationKeys.boModels.forEach((modelId: string) => {
        boModelKeysGroup.addControl(modelId, this.fb.control(reconciliationKeys.boModelKeys[modelId] || []));
        boTreatmentsGroup.addControl(modelId, this.fb.control(reconciliationKeys.boTreatments[modelId] || []));
      });
    }
    
    const correctedPartnerKeys = (reconciliationKeys.partnerKeys || []).map(key => {
      return this.normalizeColumnName(key);
    });

    // Supprimer les doublons
    this.selectedPartnerKeys = [...new Set(correctedPartnerKeys)];
    console.log('✅ Clés partenaires chargées pour édition (corrigées):', this.selectedPartnerKeys);

    this.loadPartnerConditionalKeysConfig(sourceModel.reconciliationKeys?.partnerConditionalKeys);
    this.loadBoConditionalKeysConfig(sourceModel.reconciliationKeys?.boConditionalKeys);

    console.log('✅ Modèles BO chargés pour édition:', this.selectedBOModels);
    console.log('✅ Clés BO chargées pour édition (corrigées):', this.selectedBOKeys);
    console.log('🔍 boModelKeys original:', reconciliationKeys.boModelKeys);
    
    // Afficher les sections de configuration
    this.showColumnRulesSection = true;
    this.showReconciliationLogicSection = true;
    this.showCorrespondenceRulesSection = true;
    this.showComparisonColumnsSection = true;

    this.syncReconciliationKeysBeforeSave();

    const finishEditRestore = () => {
      this.highlightSelectedKeys(reconciliationKeys);
      this.forceUpdate = true;
      setTimeout(() => {
        this.forceUpdate = false;
        this.isRestoringModelState = false;
        this.cdr.detectChanges();
      }, 100);
    };

    const loadColumnsAndPreProcessing = async () => {
      if (sourceModel.templateFile) {
        await this.resolveAndApplyTemplateColumns(
          sourceModel.templateFile,
          sourceModel.fileType || 'partner',
          {
            partnerKeys: reconciliationKeys.partnerKeys,
            boKeys: this.selectedBOKeys,
            preProcessingConfig: sourceModel.preProcessingConfig,
            partnerConditionalKeys: sourceModel.reconciliationKeys?.partnerConditionalKeys,
            boConditionalKeys: sourceModel.reconciliationKeys?.boConditionalKeys
          }
        );
      }
      this.loadPreProcessingConfig(sourceModel.preProcessingConfig);
      finishEditRestore();
    };

    void loadColumnsAndPreProcessing();
  }

  duplicateModel(model: AutoProcessingModel): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.editModel(model, 'duplicate');
  }

  private buildDuplicateName(baseName: string): string {
    const trimmed = (baseName || 'Modèle').trim();
    let candidate = `${trimmed} (copie)`;
    let index = 2;
    while (this.models.some(m => m.name.trim().toLowerCase() === candidate.toLowerCase())) {
      candidate = `${trimmed} (copie ${index})`;
      index++;
    }
    return candidate;
  }

  private buildModelDuplicate(source: AutoProcessingModel): AutoProcessingModel {
    const clone = JSON.parse(JSON.stringify(source)) as AutoProcessingModel;
    delete clone.id;
    delete clone.modelId;
    delete clone.createdAt;
    delete clone.updatedAt;
    clone.name = this.buildDuplicateName(source.name);
    clone.columnProcessingRules = (source.columnProcessingRules || []).map(rule => {
      const { id, ...rest } = rule as ColumnProcessingRule & { id?: number };
      return { ...rest };
    });
    return clone;
  }

  private loadColumnProcessingRulesForDuplicate(
    sourceModel: AutoProcessingModel,
    embeddedRules?: ColumnProcessingRule[]
  ): void {
    if (embeddedRules?.length) {
      this.columnProcessingRules = embeddedRules.map(rule => {
        const { id, ...rest } = rule as ColumnProcessingRule & { id?: number };
        return { ...rest };
      });
      return;
    }

    const modelId = sourceModel.id || sourceModel.modelId;
    if (!modelId) {
      this.columnProcessingRules = [];
      return;
    }

    this.autoProcessingService.getColumnProcessingRules(modelId, AutoProcessingService.MODELES_MODULE)
      .then(rules => {
        this.columnProcessingRules = rules
          .sort((a, b) => (a.ruleOrder ?? 0) - (b.ruleOrder ?? 0))
          .map(rule => {
            const { id, ...rest } = rule as ColumnProcessingRule & { id?: number };
            return { ...rest };
          });
      })
      .catch(() => {
        this.columnProcessingRules = [];
      });
  }
    
  async deleteModel(model: AutoProcessingModel): Promise<void> {
    const confirmed = await this.popupService.showConfirm(`Êtes-vous sûr de vouloir supprimer le modèle "${model.name}" ?`, 'Confirmation de suppression');
    if (confirmed) {
      this.autoProcessingService.deleteModel(model.id).then(() => {
        this.successMessage = 'Modèle supprimé avec succès';
          this.loadModels();
      }).catch(error => {
        console.error('Erreur lors de la suppression:', error);
        this.errorMessage = 'Erreur lors de la suppression du modèle';
      });
    }
  }



  /**
   * Méthode alternative pour afficher le formulaire de création
   */
  displayCreateForm(): void {
    console.log('🔄 displayCreateForm() appelé - affichage du formulaire de création');
    this.resetForm();
  }

  /**
   * Met en évidence visuellement les clés sélectionnées dans l'interface
   */
  highlightSelectedKeys(reconciliationKeys: any): void {
    console.log('🎯 Mise en évidence des clés sélectionnées:', reconciliationKeys);
    
    // Forcer la détection des changements pour mettre à jour les classes CSS
    setTimeout(() => {
      // Déclencher un événement de changement pour forcer la mise à jour des classes
      const partnerKeysControl = this.modelForm.get('reconciliationKeys.partnerKeys');
      const boKeysControl = this.modelForm.get('reconciliationKeys.boKeys');
      const boModelsControl = this.modelForm.get('reconciliationKeys.boModels');
      
      if (partnerKeysControl) {
        partnerKeysControl.updateValueAndValidity();
        partnerKeysControl.markAsTouched();
      }
      
      if (boKeysControl) {
        boKeysControl.updateValueAndValidity();
        boKeysControl.markAsTouched();
      }
      
      if (boModelsControl) {
        boModelsControl.updateValueAndValidity();
        boModelsControl.markAsTouched();
      }
      
      // Forcer la détection des changements
      this.modelForm.updateValueAndValidity();
      this.cdr.detectChanges();
      
      console.log('✨ Classes CSS mises à jour pour la mise en évidence');
    }, 100);
  }

  /**
   * Méthodes pour vérifier si les clés sont sélectionnées
   */
  hasPartnerKeys(): boolean {
    const partnerKeys = this.modelForm.get('reconciliationKeys.partnerKeys')?.value;
    return partnerKeys && partnerKeys.length > 0;
  }

  hasBoKeys(): boolean {
    const boKeys = this.modelForm.get('reconciliationKeys.boKeys')?.value;
    return boKeys && boKeys.length > 0;
  }

  hasBoModels(): boolean {
    const boModels = this.modelForm.get('reconciliationKeys.boModels')?.value;
    return boModels && boModels.length > 0;
  }

  /**
   * Retourne les suggestions de patterns basées sur le type de fichier
   */
  getPatternSuggestions(): string[] {
    const fileType = this.modelForm.get('fileType')?.value;
    
    switch (fileType) {
      case 'bo':
        return [
          '*TRXBO*.csv',
          '*TRXBO*.xls',
          '*TRXBO*.xlsx',
          '*bo*.csv',
          '*backoffice*.csv',
          '*BO*.csv'
        ];
      case 'partner':
        return [
          '*CIOMCM*.xls',
          '*CIOMCM*.xlsx',
          '*CIOMCM*.csv',
          '*PMOMCM*.xls',
          '*PMOMCM*.xlsx',
          '*PMOMCM*.csv',
          '*CIOMML*.xls',
          '*PMOMML*.xls',
          '*CIOMGN*.xls',
          '*PMOMGN*.xls',
          '*CIOMCI*.xls',
          '*PMOMCI*.xls',
          '*CIOMSN*.xls',
          '*PMOMSN*.xls',
          '*CIOMKN*.xls',
          '*PMOMKN*.xls',
          '*CIOMBJ*.xls',
          '*PMOMBJ*.xls',
          '*CIOMGB*.xls',
          '*PMOMGB*.xls',
          '*OPPART*.xls',
          '*OPPART*.xlsx',
          '*USSDPART*.csv',
          '*USSDPART*.xls',
          '*partner*.csv',
          '*partner*.xls',
          '*partenaire*.csv'
        ];
      case 'both':
        return [
          '*TRXBO*.csv',
          '*CIOMCM*.xls',
          '*PMOMCM*.xls',
          '*OPPART*.xls',
          '*USSDPART*.csv',
          '*bo*.csv',
          '*partner*.csv'
        ];
      default:
        return [
          '*TRXBO*.csv',
          '*CIOMCM*.xls',
          '*PMOMCM*.xls',
          '*OPPART*.xls',
          '*USSDPART*.csv'
        ];
    }
  }

  /**
   * Applique un pattern suggéré
   */
  applyPatternSuggestion(pattern: string): void {
    this.modelForm.patchValue({
      filePattern: pattern
    });
    console.log(`✅ Pattern appliqué: ${pattern}`);
  }

  /**
   * Marque tous les contrôles du formulaire comme touchés pour afficher les erreurs
   */
  private markFormGroupTouched(): void {
    Object.keys(this.modelForm.controls).forEach(key => {
      const control = this.modelForm.get(key);
      if (control) {
        control.markAsTouched();
        if (control instanceof FormGroup) {
          this.markFormGroupTouched();
        }
      }
    });
  }

  /**
   * Ajoute une classe CSS pour mettre en évidence les éléments sélectionnés
   */
  private addHighlightClass(controlName: string, selectedValues: string[]): void {
    console.log(`🎨 Mise en évidence ${controlName}:`, selectedValues);
    
    // Les classes CSS sont maintenant gérées directement dans le template
    // via les directives [class.has-selected-keys] et [class.*-selected]
    // Cette méthode peut être étendue pour d'autres types de mise en évidence
    
    // Optionnel : Ajouter une animation ou un effet visuel supplémentaire
    if (selectedValues.length > 0) {
      console.log(`✨ ${selectedValues.length} élément(s) sélectionné(s) pour ${controlName}`);
    }
  }

  cancelEdit(): void {
    this.modelForm.reset({
      fileType: 'bo',
      autoApply: true,
      reconciliationKeys: {
        partnerKeys: [],
        boKeys: [],
        boModels: [],
        boModelKeys: {},
        boTreatments: {}
      }
    });
    this.editingModel = null;
    this.isDuplicatingModel = false;
    this.showCreateForm = false;
    this.errorMessage = '';
    this.successMessage = '';
  }

  // ===== MÉTHODES POUR LES RÈGLES DE TRAITEMENT DES COLONNES =====

  toggleColumnRulesSection(): void {
    this.showColumnRulesSection = !this.showColumnRulesSection;
  }

  addColumnRule(): void {
    this.editingRule = null;
    this.ruleForm.reset({
      sourceColumn: '',
      targetColumn: '',
      formatType: 'string',
      toUpperCase: false,
      toLowerCase: false,
      trimSpaces: false,
      removeSpecialChars: true,
      stringToRemove: '',
      padZeros: false,
      regexReplace: '',
      specialCharReplacementMap: {}
    });
  }

  editColumnRule(rule: ColumnProcessingRule): void {
    this.editingRule = rule;
    this.ruleForm.patchValue({
      sourceColumn: rule.sourceColumn,
      targetColumn: rule.targetColumn,
      formatType: rule.formatType || 'string',
      toUpperCase: rule.toUpperCase || false,
      toLowerCase: rule.toLowerCase || false,
      trimSpaces: rule.trimSpaces || false,
      removeSpecialChars: rule.removeSpecialChars || false,
      stringToRemove: rule.stringToRemove || '',
      padZeros: rule.padZeros || false,
      regexReplace: rule.regexReplace || '',
      specialCharReplacementMap: rule.specialCharReplacementMap || {}
    });
  }

  saveColumnRule(): void {
    if (this.ruleForm.valid) {
      const ruleData = this.ruleForm.value;
      
      if (this.editingRule) {
        // Mise à jour d'une règle existante
        const index = this.columnProcessingRules.findIndex(r => r.id === this.editingRule!.id);
        if (index !== -1) {
          this.columnProcessingRules[index] = { ...this.editingRule, ...ruleData };
        }
      } else {
        // Ajout d'une nouvelle règle
        const newRule: ColumnProcessingRule = {
          ...ruleData,
          id: Date.now(), // ID temporaire
          ruleOrder: this.columnProcessingRules.length
        };
        this.columnProcessingRules.push(newRule);
      }
      
      this.editingRule = null;
      this.ruleForm.reset();
      this.successMessage = 'Règle de traitement sauvegardée';
    }
  }

  async deleteColumnRule(rule: ColumnProcessingRule): Promise<void> {
    const confirmed = await this.popupService.showConfirm('Êtes-vous sûr de vouloir supprimer cette règle ?', 'Confirmation de suppression');
    if (confirmed) {
      const index = this.columnProcessingRules.findIndex(r => r.id === rule.id);
      if (index !== -1) {
        this.columnProcessingRules.splice(index, 1);
        this.successMessage = 'Règle de traitement supprimée';
      }
    }
  }

  cancelColumnRuleEdit(): void {
    this.editingRule = null;
    this.ruleForm.reset();
  }

  moveRuleUp(index: number): void {
    if (index > 0) {
      const temp = this.columnProcessingRules[index];
      this.columnProcessingRules[index] = this.columnProcessingRules[index - 1];
      this.columnProcessingRules[index - 1] = temp;
    }
  }

  moveRuleDown(index: number): void {
    if (index < this.columnProcessingRules.length - 1) {
      const temp = this.columnProcessingRules[index];
      this.columnProcessingRules[index] = this.columnProcessingRules[index + 1];
      this.columnProcessingRules[index + 1] = temp;
    }
  }

  // Méthode pour obtenir toutes les colonnes disponibles (améliorée)
  getAllAvailableColumns(): string[] {
    const allColumns = new Set<string>();
    
    // Ajouter les colonnes des fichiers disponibles
    this.availableFiles.forEach(file => {
      if (file.columns && Array.isArray(file.columns)) {
        // Gestion spécifique pour OPPART.xls
        if (file.fileName.toLowerCase().includes('oppart')) {
          console.log('🔍 Détection spécifique OPPART dans getAllAvailableColumns');
          const oppartColumns = [
            'ID Opération', 'Type Opération', 'Montant', 'Solde avant', 'Solde aprés',
            'Code proprietaire', 'Téléphone', 'Statut', 'ID Transaction', 'Num bordereau',
            'Date opération', 'Date de versement', 'Banque appro', 'Login demandeur Appro',
            'Login valideur Appro', 'Motif rejet', 'Frais connexion', 'Numéro Trans GU',
            'Agent', 'Motif régularisation', 'groupe de réseau'
          ];
          oppartColumns.forEach(col => allColumns.add(col));
        }
        // Gestion spécifique pour TRXBO.xls
        else if (file.fileName.toLowerCase().includes('trxbo')) {
          console.log('🔍 Détection spécifique TRXBO dans getAllAvailableColumns');
          const trxboColumns = [
            'ID', 'IDTransaction', 'téléphone client', 'montant', 'Service',
            'Moyen de Paiement', 'Agence', 'Agent', 'Type agent', 'PIXI',
            'Date', 'Numéro Trans GU', 'GRX', 'Statut', 'Latitude',
            'Longitude', 'ID Partenaire DIST', 'Expéditeur', 'Pays provenance',
            'Bénéficiaire', 'Canal de distribution'
          ];
          trxboColumns.forEach(col => allColumns.add(col));
        }
        // Gestion spécifique pour USSDPART.xls
        else if (file.fileName.toLowerCase().includes('ussdpart')) {
          console.log('🔍 Détection spécifique USSDPART dans getAllAvailableColumns');
          const ussdpartColumns = [
            'ID', 'Groupe Réseaux', 'Code réseau', 'Agence', 'Code PIXI',
            'Code de Proxy', 'Code service', 'Numéro Trans GU', 'Déstinataire',
            'Login agent', 'Type agent', 'date de création', 'Date d\'envoi vers part',
            'Etat', 'Type', 'Token', 'SMS', 'Action faite', 'Statut',
            'Utilisateur', 'Montant', 'Date dernier traitement', 'Latitude',
            'Longitude', 'Partenaire dist ID', 'Agence SC', 'Groupe reseau SC',
            'Agent SC', 'PDA SC'
          ];
          ussdpartColumns.forEach(col => allColumns.add(col));
        } else {
          file.columns.forEach((col: string) => {
            allColumns.add(this.normalizeColumnName(col));
          });
        }
      }
    });
    
    // Ajouter les colonnes du template
    this.availableColumnsForTemplate.forEach(col => {
      allColumns.add(this.normalizeColumnName(col));
    });
    
    // Ajouter les colonnes disponibles
    this.availableColumns.forEach(col => {
      allColumns.add(this.normalizeColumnName(col));
    });
    
    return Array.from(allColumns).sort();
  }

  // ===== MÉTHODES POUR LA CONFIGURATION DES MODÈLES AUTONOMES =====

  // Toggle des sections
  toggleReconciliationLogicSection(): void {
    this.showReconciliationLogicSection = !this.showReconciliationLogicSection;
  }

  toggleCorrespondenceRulesSection(): void {
    this.showCorrespondenceRulesSection = !this.showCorrespondenceRulesSection;
  }

  toggleComparisonColumnsSection(): void {
    this.showComparisonColumnsSection = !this.showComparisonColumnsSection;
  }

  // Gestion du changement de type de logique
  onLogicTypeChange(): void {
    const logicType = this.modelForm.get('logicType')?.value;
    
    // Réinitialiser les règles de correspondance selon le type
    if (logicType === 'STANDARD') {
      this.correspondenceRules = [
        {
          name: 'Correspondance Parfaite Standard',
          condition: 'partnerMatches == 1',
          action: 'MARK_AS_MATCH',
          description: 'Une correspondance exacte entre BO et Partenaire'
        },
        {
          name: 'Écart Standard',
          condition: 'partnerMatches != 1',
          action: 'MARK_AS_MISMATCH',
          description: 'Nombre de correspondances différent de 1'
        }
      ];
    } else if (logicType === 'SPECIAL_RATIO') {
      this.correspondenceRules = [
        {
          name: 'Correspondance Parfaite TRXBO/OPPART',
          condition: 'partnerMatches == 2',
          action: 'MARK_AS_MATCH',
          description: 'Une ligne TRXBO correspond exactement à 2 lignes OPPART'
        },
        {
          name: 'Écart Insuffisant',
          condition: 'partnerMatches < 2',
          action: 'MARK_AS_MISMATCH',
          description: 'Moins de 2 correspondances OPPART pour une ligne TRXBO'
        },
        {
          name: 'Écart Excessif',
          condition: 'partnerMatches > 2',
          action: 'MARK_AS_MISMATCH',
          description: 'Plus de 2 correspondances OPPART pour une ligne TRXBO'
        }
      ];
    }
  }

  // ===== MÉTHODES POUR LES RÈGLES DE CORRESPONDANCE =====

  addCorrespondenceRule(): void {
    this.editingCorrespondenceRule = null;
    this.correspondenceRuleForm.reset({
      name: '',
      condition: '',
      action: '',
      description: ''
    });
  }

  editCorrespondenceRule(rule: any): void {
    this.editingCorrespondenceRule = rule;
    this.correspondenceRuleForm.patchValue({
      name: rule.name,
      condition: rule.condition,
      action: rule.action,
      description: rule.description
    });
  }

  saveCorrespondenceRule(): void {
    if (this.correspondenceRuleForm.valid) {
      const ruleData = this.correspondenceRuleForm.value;
      
      if (this.editingCorrespondenceRule) {
        // Mise à jour d'une règle existante
        const index = this.correspondenceRules.findIndex(r => r === this.editingCorrespondenceRule);
        if (index !== -1) {
          this.correspondenceRules[index] = ruleData;
        }
      } else {
        // Ajout d'une nouvelle règle
        this.correspondenceRules.push(ruleData);
      }
      
      this.editingCorrespondenceRule = null;
      this.correspondenceRuleForm.reset();
      this.successMessage = 'Règle de correspondance sauvegardée';
    }
  }

  deleteCorrespondenceRule(rule: any): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette règle ?')) {
      const index = this.correspondenceRules.findIndex(r => r === rule);
      if (index !== -1) {
        this.correspondenceRules.splice(index, 1);
        this.successMessage = 'Règle de correspondance supprimée';
      }
    }
  }

  cancelCorrespondenceRuleEdit(): void {
    this.editingCorrespondenceRule = null;
    this.correspondenceRuleForm.reset();
  }

  moveCorrespondenceRuleUp(index: number): void {
    if (index > 0) {
      const temp = this.correspondenceRules[index];
      this.correspondenceRules[index] = this.correspondenceRules[index - 1];
      this.correspondenceRules[index - 1] = temp;
    }
  }

  moveCorrespondenceRuleDown(index: number): void {
    if (index < this.correspondenceRules.length - 1) {
      const temp = this.correspondenceRules[index];
      this.correspondenceRules[index] = this.correspondenceRules[index + 1];
      this.correspondenceRules[index + 1] = temp;
    }
  }

  // ===== CLÉS PARTENAIRE CONDITIONNELLES (OPTIONNEL) =====

  isPartnerConditionalKeysConfigValid(): boolean {
    if (!this.partnerConditionalKeysEnabled) {
      return false;
    }
    if (!this.partnerConditionColumn?.trim()) {
      return false;
    }
    return this.partnerConditionalKeyRules.some(
      rule => rule.whenValue?.trim() && rule.keyColumn?.trim()
    );
  }

  buildPartnerConditionalKeysConfig() {
    if (!this.partnerConditionalKeysEnabled) {
      return { enabled: false, conditionColumn: '', rules: [] };
    }
    return {
      enabled: true,
      conditionColumn: this.partnerConditionColumn.trim(),
      rules: this.partnerConditionalKeyRules
        .filter(rule => rule.whenValue?.trim() && rule.keyColumn?.trim())
        .map(rule => ({
          whenValue: rule.whenValue.trim(),
          keyColumn: rule.keyColumn.trim()
        })),
      defaultKeyColumn: this.partnerConditionalDefaultKeyColumn?.trim() || undefined
    };
  }

  loadPartnerConditionalKeysConfig(config?: {
    enabled?: boolean;
    conditionColumn?: string;
    rules?: PartnerConditionalKeyRule[];
    defaultKeyColumn?: string;
  }): void {
    this.partnerConditionalKeysEnabled = !!config?.enabled;
    this.partnerConditionColumn = config?.conditionColumn || '';
    this.partnerConditionalDefaultKeyColumn = config?.defaultKeyColumn || '';
    this.partnerConditionalKeyRules = config?.rules?.length
      ? config.rules.map(rule => ({ ...rule }))
      : [{ whenValue: '', keyColumn: '' }];
  }

  resetPartnerConditionalKeysConfig(): void {
    this.partnerConditionalKeysEnabled = false;
    this.partnerConditionColumn = '';
    this.partnerConditionalDefaultKeyColumn = '';
    this.partnerConditionalKeyRules = [{ whenValue: '', keyColumn: '' }];
  }

  addPartnerConditionalKeyRule(): void {
    this.partnerConditionalKeyRules.push({ whenValue: '', keyColumn: '' });
  }

  removePartnerConditionalKeyRule(index: number): void {
    if (this.partnerConditionalKeyRules.length <= 1) {
      this.partnerConditionalKeyRules[0] = { whenValue: '', keyColumn: '' };
      return;
    }
    this.partnerConditionalKeyRules.splice(index, 1);
  }

  // ===== CLÉS BO CONDITIONNELLES (OPTIONNEL) =====

  isBoConditionalKeysConfigValid(): boolean {
    if (!this.boConditionalKeysEnabled) {
      return false;
    }
    if (!this.boConditionColumn?.trim()) {
      return false;
    }
    return this.boConditionalKeyRules.some(
      rule => rule.whenValue?.trim() && rule.keyColumn?.trim()
    );
  }

  buildBoConditionalKeysConfig(): BoConditionalKeysConfig {
    if (!this.boConditionalKeysEnabled) {
      return { enabled: false, conditionColumn: '', rules: [] };
    }
    return {
      enabled: true,
      conditionColumn: this.boConditionColumn.trim(),
      rules: this.boConditionalKeyRules
        .filter(rule => rule.whenValue?.trim() && rule.keyColumn?.trim())
        .map(rule => ({
          whenValue: rule.whenValue.trim(),
          keyColumn: rule.keyColumn.trim()
        })),
      defaultKeyColumn: this.boConditionalDefaultKeyColumn?.trim() || undefined
    };
  }

  loadBoConditionalKeysConfig(config?: BoConditionalKeysConfig): void {
    this.boConditionalKeysEnabled = !!config?.enabled;
    this.boConditionColumn = config?.conditionColumn || '';
    this.boConditionalDefaultKeyColumn = config?.defaultKeyColumn || '';
    this.boConditionalKeyRules = config?.rules?.length
      ? config.rules.map(rule => ({ ...rule }))
      : [{ whenValue: '', keyColumn: '' }];
  }

  resetBoConditionalKeysConfig(): void {
    this.boConditionalKeysEnabled = false;
    this.boConditionColumn = '';
    this.boConditionalDefaultKeyColumn = '';
    this.boConditionalKeyRules = [{ whenValue: '', keyColumn: '' }];
  }

  addBoConditionalKeyRule(): void {
    this.boConditionalKeyRules.push({ whenValue: '', keyColumn: '' });
  }

  removeBoConditionalKeyRule(index: number): void {
    if (this.boConditionalKeyRules.length <= 1) {
      this.boConditionalKeyRules[0] = { whenValue: '', keyColumn: '' };
      return;
    }
    this.boConditionalKeyRules.splice(index, 1);
  }

  // ===== MÉTHODES POUR LES CLÉS DE RÉCONCILIATION =====

  /**
   * Charge les colonnes du fichier modèle sélectionné
   * Méthode centralisée avec encodage, typage et normalisation standardisés
   */
  async loadTemplateColumns(): Promise<void> {
    const templateFile = this.modelForm.get('templateFile')?.value;
    if (!templateFile) {
      this.syncTemplateColumnLists([]);
      if (!this.isRestoringModelState) {
        this.selectedPartnerKeys = [];
      }
      return;
    }

    const preservedPartnerKeys = [...this.selectedPartnerKeys];
    const fileType = this.modelForm.get('fileType')?.value || 'partner';

    if (!this.isRestoringModelState) {
      this.selectedPartnerKeys = [];
    }

    await this.resolveAndApplyTemplateColumns(templateFile, fileType, {
      partnerKeys: preservedPartnerKeys
    });

    if (preservedPartnerKeys.length > 0) {
      this.selectedPartnerKeys = preservedPartnerKeys.filter(key =>
        this.availableTemplateColumns.includes(key) || key.length > 0
      );
      this.modelForm.patchValue({
        reconciliationKeys: { partnerKeys: this.selectedPartnerKeys }
      }, { emitEvent: false });
    }
  }

  /**
   * Met à jour toutes les sections avec les colonnes du modèle normalisées
   * Méthode centralisée pour assurer la cohérence entre toutes les sections
   */
  private updateAllSectionsWithModelColumns(): void {
    console.log('🔄 Mise à jour de toutes les sections avec les colonnes du modèle...');
    
    // Mettre à jour les colonnes disponibles pour les règles de traitement
    this.availableColumnsForTemplate = [...this.availableTemplateColumns];
    
    // Mettre à jour les colonnes disponibles pour les clés de réconciliation
    if (this.modelForm.get('fileType')?.value === 'partner') {
      // Pour les modèles partenaires, les colonnes du modèle sont les colonnes partenaires
      this.availableColumns = [...this.availableTemplateColumns];
    }
    
    console.log('✅ Toutes les sections mises à jour avec les colonnes normalisées:', {
      templateColumns: this.availableTemplateColumns.length,
      forTemplate: this.availableColumnsForTemplate.length,
      availableColumns: this.availableColumns.length
    });
  }

  /**
   * Charge les colonnes des modèles BO sélectionnés
   */
  async loadBOColumns(): Promise<void> {
    if (this.selectedBOModels.length === 0) {
      this.availableBOColumns = [];
      if (!this.isRestoringModelState) {
        this.selectedBOKeys = [];
      }
      return;
    }

    const preservedBOKeys = [...this.selectedBOKeys];

    this.isLoadingBOColumns = true;
    this.availableBOColumns = [];

    try {
      // Récupérer les colonnes de tous les modèles BO sélectionnés
      const allColumns = new Set<string>();
      
      for (const modelId of this.selectedBOModels) {
        const model = this.availableBOModels.find(m => m.id === modelId);
        if (model && model.templateFile) {
          // Chercher le fichier dans les fichiers disponibles
          const file = this.availableFiles.find(f => f.fileName === model.templateFile);
          
          if (file && file.columns && file.columns.length > 0) {
            // Utiliser les colonnes hardcodées correctes au lieu des colonnes corrompues du fichier
            console.log(`📋 Utilisation des colonnes hardcodées pour ${model.templateFile}`);
            let correctColumns: string[] = [];
            
            // Colonnes correctes selon le type de fichier
            if (model.templateFile.toLowerCase().includes('trxbo')) {
              correctColumns = [
                'ID', 'IDTransaction', 'téléphone client', 'montant', 'Service',
                'Moyen de Paiement', 'Agence', 'Agent', 'Type agent', 'PIXI',
                'Date', 'Numéro Trans GU', 'GRX', 'Statut', 'Latitude',
                'Longitude', 'ID Partenaire DIST', 'Expéditeur', 'Pays provenance',
                'Bénéficiaire', 'Canal de distribution'
              ];
            } else if (model.templateFile.toLowerCase().includes('oppart')) {
              correctColumns = [
                'ID Opération', 'Type Opération', 'Montant', 'Solde avant', 'Solde aprés',
                'Code proprietaire', 'Téléphone', 'Statut', 'ID Transaction', 'Num bordereau',
                'Date opération', 'Date de versement', 'Banque appro', 'Login demandeur Appro',
                'Login valideur Appro', 'Motif rejet', 'Frais connexion', 'Numéro Trans GU',
                'Agent', 'Motif régularisation', 'groupe de réseau'
              ];
            } else if (model.templateFile.toLowerCase().includes('ussdpart')) {
              correctColumns = [
                'ID', 'Groupe Réseaux', 'Code réseau', 'Agence', 'Code PIXI',
                'Code de Proxy', 'Code service', 'Numéro Trans GU', 'Déstinataire',
                'Login agent', 'Type agent', 'date de création', 'Date d\'envoi vers part',
                'Etat', 'Type', 'Token', 'SMS', 'Action faite', 'Statut',
                'Utilisateur', 'Montant', 'Date dernier traitement', 'Latitude',
                'Longitude', 'Partenaire dist ID', 'Agence SC', 'Groupe reseau SC',
                'Agent SC', 'PDA SC'
              ];
            } else {
              // Fallback vers les colonnes du fichier avec normalisation
              console.log(`📋 Colonnes brutes du fichier ${model.templateFile}:`, file.columns);
              correctColumns = this.normalizeColumnNames(file.columns);
            }
            
            correctColumns.forEach(col => allColumns.add(col));
            console.log(`✅ Colonnes du modèle BO ${model.name} chargées (correctes):`, correctColumns);
          } else {
            // Fallback vers la simulation
            console.warn(`⚠️ Fichier ${model.templateFile} non trouvé, utilisation de la simulation`);
            const columns = await this.getFileColumns(model.templateFile);
            console.log(`📋 Colonnes simulées pour ${model.templateFile}:`, columns);
            const normalizedColumns = this.normalizeColumnNames(columns);
            normalizedColumns.forEach(col => allColumns.add(col));
            console.log(`✅ Colonnes du modèle BO ${model.name} chargées (simulation normalisée):`, normalizedColumns);
          }
        }
      }

      this.availableBOColumns = Array.from(allColumns);
      console.log('✅ Colonnes des modèles BO chargées:', this.availableBOColumns);
      console.log('📊 Détails des modèles BO:', {
        selectedModels: this.selectedBOModels,
        totalColumns: this.availableBOColumns.length,
        columns: this.availableBOColumns
      });
      
      // DEBUG: Vérifier si les colonnes sont correctes
      console.log('🔍 DEBUG - Vérification des colonnes chargées:');
      this.availableBOColumns.forEach((col, index) => {
        console.log(`  ${index + 1}. "${col}"`);
      });

      if (preservedBOKeys.length > 0) {
        this.selectedBOKeys = preservedBOKeys.filter(key =>
          this.availableBOColumns.includes(key)
        );
        this.syncReconciliationKeysBeforeSave();
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des colonnes des modèles BO:', error);
      this.errorMessage = 'Erreur lors du chargement des colonnes des modèles BO';
    } finally {
      this.isLoadingBOColumns = false;
    }
  }



  /**
   * Récupère les colonnes d'un fichier (avec fallback vers la simulation)
   */
  private async getFileColumns(fileName: string): Promise<string[]> {
    // D'abord, essayer de trouver le fichier dans les fichiers disponibles
    const file = this.availableFiles.find(f => f.fileName === fileName);
    if (file && file.columns && file.columns.length > 0) {
      console.log('✅ Colonnes trouvées dans availableFiles pour:', fileName);
      return file.columns;
    }

    // Fallback vers la simulation si le fichier n'est pas trouvé
    console.warn('⚠️ Fichier non trouvé dans availableFiles, utilisation de la simulation pour:', fileName);
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simuler différents types de fichiers avec leurs colonnes
        const fileColumns: { [key: string]: string[] } = {
          'TRXBO.xls': ['IDTransaction', 'téléphone client', 'montant', 'Service', 'Agence', 'Date', 'Numero Trans GU'],
          'OPPART.xls': ['IDTransaction', 'téléphone client', 'montant', 'Service', 'Agence', 'Date', 'Numero Trans GU'],
          'USSDPART.xls': ['IDTransaction', 'téléphone client', 'montant', 'Service', 'Agence', 'Date', 'Numero Trans GU'],
          'CIOMCM.xls': ['IDTransaction', 'téléphone client', 'montant', 'Service', 'Agence', 'Date', 'Numero Trans GU'],
          'PMOMCM.xls': ['IDTransaction', 'téléphone client', 'montant', 'Service', 'Agence', 'Date', 'Numero Trans GU']
        };
        
        resolve(fileColumns[fileName] || ['Colonne 1', 'Colonne 2', 'Colonne 3']);
      }, 500); // Délai réduit pour la simulation
    });
  }

  /**
   * Normalise les noms de colonnes (gestion de l'encodage et du typage)
   * Méthode centralisée qui utilise normalizeColumnName pour chaque colonne
   */
  private normalizeColumnNames(columns: string[]): string[] {
    return columns.map(column => this.normalizeColumnName(column));
  }

  /**
   * Obtient les noms des modèles BO sélectionnés
   */
  getSelectedBOModelNames(): string {
    return this.selectedBOModels
      .map(id => {
        const model = this.availableBOModels.find(m => m.id === id);
        return model ? model.name : id;
      })
      .join(', ');
  }

  togglePartnerKey(column: string, event: any): void {
    // Normaliser le nom de la colonne avant traitement
    const normalizedColumn = this.normalizeColumnName(column);
    
    if (event.target.checked) {
      if (!this.selectedPartnerKeys.includes(normalizedColumn)) {
        this.selectedPartnerKeys.push(normalizedColumn);
        console.log('✅ Clé partenaire ajoutée:', normalizedColumn, '(original:', column, ')');
        console.log('📋 Clés partenaire actuelles:', this.selectedPartnerKeys);
      }
    } else {
      this.selectedPartnerKeys = this.selectedPartnerKeys.filter(key => key !== normalizedColumn);
      console.log('❌ Clé partenaire supprimée:', normalizedColumn, '(original:', column, ')');
      console.log('📋 Clés partenaire actuelles:', this.selectedPartnerKeys);
    }
    
    // Synchroniser avec le formulaire
    this.modelForm.patchValue({
      reconciliationKeys: {
        partnerKeys: this.selectedPartnerKeys
      }
    }, { emitEvent: false });
  }

  toggleBOModel(modelId: string, event: any): void {
    if (event.target.checked) {
      if (!this.selectedBOModels.includes(modelId)) {
        this.selectedBOModels.push(modelId);
        console.log('✅ Modèle BO ajouté:', modelId);
        console.log('📋 Modèles BO actuels:', this.selectedBOModels);
      }
    } else {
      this.selectedBOModels = this.selectedBOModels.filter(id => id !== modelId);
      console.log('❌ Modèle BO supprimé:', modelId);
      console.log('📋 Modèles BO actuels:', this.selectedBOModels);
      if (this.selectedBOModels.length === 0) {
        this.selectedBOKeys = [];
      }
    }

    this.modelForm.patchValue({
      reconciliationKeys: {
        boModels: this.selectedBOModels
      }
    }, { emitEvent: false });
    this.onBOModelsChange();
    this.loadBOColumns();
  }

  toggleBOKey(column: string, event: any): void {
    if (event.target.checked) {
      if (!this.selectedBOKeys.includes(column)) {
        this.selectedBOKeys.push(column);
        console.log('✅ Clé BO ajoutée:', column);
        console.log('📋 Clés BO actuelles:', this.selectedBOKeys);
      }
    } else {
      this.selectedBOKeys = this.selectedBOKeys.filter(key => key !== column);
      console.log('❌ Clé BO supprimée:', column);
      console.log('📋 Clés BO actuelles:', this.selectedBOKeys);
    }
    
    // Construire l'objet boModelKeys avec les clés associées aux modèles BO
    const boModelKeys: { [key: string]: string[] } = {};
    this.selectedBOModels.forEach(modelId => {
      boModelKeys[modelId] = this.selectedBOKeys;
    });
    
    // Synchroniser avec le formulaire
    this.modelForm.patchValue({
      reconciliationKeys: {
        boModelKeys: boModelKeys
      }
    }, { emitEvent: false });
    
    console.log('🔧 boModelKeys mis à jour:', boModelKeys);
  }

  // ===== MÉTHODES POUR LES RÈGLES DE TRAITEMENT DES COLONNES (NOUVELLE STRUCTURE) =====

  toggleColumnProcessingSection(): void {
    this.showColumnProcessingSection = !this.showColumnProcessingSection;
    
    // Si on affiche la section, s'assurer que les colonnes sont chargées avec la méthode centralisée
    if (this.showColumnProcessingSection) {
      this.ensureModelColumnsLoaded();
      this.updateAllSectionsWithModelColumns();
      
      console.log('✅ Section règles de traitement ouverte avec colonnes centralisées:', {
        availableTemplateColumns: this.availableTemplateColumns.length,
        availableColumnsForTemplate: this.availableColumnsForTemplate.length
      });
    }
  }

  // Méthodes pour la logique de réconciliation
  editReconciliationLogic(): void {
    this.editingReconciliationLogic = true;
    
    // Initialiser les valeurs si elles n'existent pas
    if (!this.modelForm.get('logicType')?.value) {
      this.modelForm.patchValue({
        logicType: 'STANDARD',
        expectedRatio: '1:1',
        logicDescription: '',
        tolerance: 0.0
      });
    }
    
    // Forcer la mise à jour de l'affichage
    this.cdr.detectChanges();
    
    console.log('🔧 Édition de la logique de réconciliation - Valeurs actuelles:', {
      logicType: this.modelForm.get('logicType')?.value,
      expectedRatio: this.modelForm.get('expectedRatio')?.value,
      logicDescription: this.modelForm.get('logicDescription')?.value,
      tolerance: this.modelForm.get('tolerance')?.value
    });
  }

  saveReconciliationLogic(): void {
    // Vérifier seulement les champs de logique de réconciliation
    const logicType = this.modelForm.get('logicType')?.value;
    const expectedRatio = this.modelForm.get('expectedRatio')?.value;
    const logicDescription = this.modelForm.get('logicDescription')?.value;
    const tolerance = this.modelForm.get('tolerance')?.value;
    
    // Validation spécifique pour la logique de réconciliation
    if (logicType && logicType.trim() !== '') {
      // Sauvegarder dans la configuration de réconciliation
      const reconciliationLogic = {
        type: logicType,
        parameters: {
          expectedRatio: expectedRatio || '1:1',
          description: logicDescription || '',
          tolerance: tolerance || 0.0
        }
      };
      
      // Mettre à jour le modèle en cours d'édition si on est en mode édition
      if (this.editingModel) {
        this.editingModel.reconciliationLogic = reconciliationLogic;
      }
      
      this.editingReconciliationLogic = false;
      this.successMessage = 'Logique de réconciliation sauvegardée avec succès !';
      
      console.log('✅ Logique de réconciliation sauvegardée:', reconciliationLogic);
      
      // Effacer le message de succès après 3 secondes
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);
    } else {
      this.errorMessage = 'Veuillez sélectionner un type de logique de réconciliation.';
      console.error('❌ Erreur: Type de logique non sélectionné');
    }
  }

  cancelReconciliationLogicEdit(): void {
    this.editingReconciliationLogic = false;
  }

  // Méthode de debug pour vérifier l'état des sélections
  debugValidationState(): void {
    // Méthode de debug supprimée pour nettoyer l'interface
  }

  addColumnProcessingRule(): void {
    this.editingColumnProcessingRule = -1;
    
    // S'assurer que les colonnes du modèle sont chargées avec la méthode centralisée
    this.ensureModelColumnsLoaded();
    
    // Mettre à jour les colonnes disponibles pour les règles de traitement
    this.updateAllSectionsWithModelColumns();
    
    // Réinitialiser la sélection de colonnes
    this.selectedColumns = [];
    
    this.columnProcessingRuleForm.reset({
      sourceColumn: '',
      targetColumn: '',
      formatType: '',
      toUpperCase: false,
      toLowerCase: false,
      trimSpaces: false,
      removeSpecialChars: true,
      removeAccents: false,
      stringToRemove: '',
      padZeros: false,
      regexReplace: ''
    });
    
    console.log('✅ Règle de traitement ajoutée avec sélection multiple de colonnes:', {
      availableTemplateColumns: this.availableTemplateColumns.length,
      availableColumnsForTemplate: this.availableColumnsForTemplate.length,
      selectedColumns: this.selectedColumns.length
    });
  }

  editColumnProcessingRule(index: number): void {
    this.editingColumnProcessingRule = index;
    const rule = this.columnProcessingRules[index];
    
    // S'assurer que les colonnes sont à jour avec la méthode centralisée
    this.ensureModelColumnsLoaded();
    this.updateAllSectionsWithModelColumns();
    
    // Charger la colonne source dans selectedColumns
    if (rule.sourceColumn) {
      this.selectedColumns = [rule.sourceColumn];
    } else if (rule.sourceColumns && rule.sourceColumns.length > 0) {
      this.selectedColumns = [...rule.sourceColumns];
    } else {
      this.selectedColumns = [];
    }
    
    this.columnProcessingRuleForm.patchValue({
      sourceColumn: rule.sourceColumn,
      targetColumn: rule.targetColumn || '',
      formatType: rule.formatType || '',
      toUpperCase: rule.toUpperCase || false,
      toLowerCase: rule.toLowerCase || false,
      trimSpaces: rule.trimSpaces || false,
      removeSpecialChars: rule.removeSpecialChars || false,
      removeAccents: rule.removeAccents || false,
      stringToRemove: rule.stringToRemove || '',
      padZeros: rule.padZeros || false,
      regexReplace: rule.regexReplace || ''
    });
    
    console.log('✅ Édition de règle de traitement avec colonnes centralisées:', {
      ruleSourceColumn: rule.sourceColumn,
      selectedColumns: this.selectedColumns,
      availableTemplateColumns: this.availableTemplateColumns.length,
      availableColumnsForTemplate: this.availableColumnsForTemplate.length
    });
  }

  saveColumnProcessingRule(): void {
    console.log('🚀 [DEBUG] saveColumnProcessingRule() appelée');
    console.log('🔍 [DEBUG] État du formulaire:', this.columnProcessingRuleForm.valid);
    console.log('🔍 [DEBUG] Colonnes sélectionnées:', this.selectedColumns);
    
    // Validation personnalisée pour la sélection multiple
    if (this.selectedColumns.length === 0) {
      this.errorMessage = 'Veuillez sélectionner au moins une colonne';
      console.log('❌ [DEBUG] Aucune colonne sélectionnée');
      return;
    }
    
    if (this.columnProcessingRuleForm.valid) {
      const ruleData = this.columnProcessingRuleForm.value;
      
      console.log('🔍 [DEBUG] Règle à sauvegarder:', ruleData);
      console.log('🔍 [DEBUG] Règles existantes avant ajout:', this.columnProcessingRules.length);
      
      // Validation déjà faite plus haut
      
      // S'assurer que les colonnes sont à jour avec la méthode centralisée
      this.ensureModelColumnsLoaded();
      this.updateAllSectionsWithModelColumns();
      
      // Si on est en mode édition, mettre à jour uniquement la règle en cours d'édition
      if (this.editingColumnProcessingRule !== null && this.editingColumnProcessingRule !== -1) {
        const editingIndex = this.editingColumnProcessingRule;
        const editingRule = this.columnProcessingRules[editingIndex];
        
        if (editingRule) {
          // Pour l'édition, on ne met à jour que la première colonne sélectionnée (ou la colonne de la règle)
          const columnToUpdate = this.selectedColumns.length > 0 ? this.selectedColumns[0] : editingRule.sourceColumn;
          const normalizedColumn = this.normalizeColumnName(columnToUpdate);
          const availableColumns = [...this.availableTemplateColumns, ...this.availableColumnsForTemplate];
          
          if (availableColumns.includes(normalizedColumn) || availableColumns.includes(columnToUpdate)) {
            const finalColumn = normalizedColumn !== columnToUpdate ? normalizedColumn : columnToUpdate;
            
            const updatedRule = {
              ...ruleData,
              sourceColumn: finalColumn,
              sourceColumns: [finalColumn],
              removeAccents: ruleData.removeAccents || false
            };
            
            // Préserver l'ID et ruleOrder de la règle existante
            this.columnProcessingRules[editingIndex] = {
              ...updatedRule,
              id: editingRule.id,
              ruleOrder: editingRule.ruleOrder !== undefined ? editingRule.ruleOrder : editingIndex
            };
            
            console.log(`✅ [DEBUG] Règle mise à jour pour la colonne: ${finalColumn} (index: ${editingIndex}, id: ${editingRule.id})`);
          }
        }
      } else {
        // Créer une règle pour chaque colonne sélectionnée (mode création)
        this.selectedColumns.forEach(columnName => {
          // Vérifier que la colonne existe dans les colonnes disponibles
          const normalizedColumn = this.normalizeColumnName(columnName);
          const availableColumns = [...this.availableTemplateColumns, ...this.availableColumnsForTemplate];
          
          if (!availableColumns.includes(normalizedColumn) && !availableColumns.includes(columnName)) {
            console.warn(`Colonne "${columnName}" non disponible, ignorée`);
            return;
          }
          
          const finalColumn = normalizedColumn !== columnName ? normalizedColumn : columnName;
          
          // Créer la règle pour cette colonne
          const ruleForColumn = {
            ...ruleData,
            sourceColumn: finalColumn,
            sourceColumns: [finalColumn],
            removeAccents: ruleData.removeAccents || false
          };
          
          // Log pour vérifier que stringToRemove est bien inclus
          if (ruleForColumn.stringToRemove) {
            console.log(`🔍 [DEBUG] Règle créée avec stringToRemove: "${ruleForColumn.stringToRemove}" pour la colonne: ${finalColumn}`);
          }
          
          // Calculer le ruleOrder pour la nouvelle règle (plus grand ordre existant + 1)
          const maxOrder = this.columnProcessingRules.length > 0 
            ? Math.max(...this.columnProcessingRules.map(r => r.ruleOrder || 0)) 
            : -1;
          ruleForColumn.ruleOrder = maxOrder + 1;
          
          // Ajouter une nouvelle règle (permet plusieurs règles pour la même colonne)
          this.columnProcessingRules.push(ruleForColumn);
          console.log(`✅ [DEBUG] Nouvelle règle ajoutée pour la colonne: ${finalColumn} (ruleOrder: ${ruleForColumn.ruleOrder})`);
        });
      }
      
      console.log('✅ [DEBUG] Total des règles après modification:', this.columnProcessingRules.length);
      
      // Sauvegarder les valeurs du formulaire et l'état avant réinitialisation (pour préserver l'état)
      const savedFormValues = { ...this.columnProcessingRuleForm.value };
      const savedSelectedColumns = [...this.selectedColumns];
      const wasEditing = this.editingColumnProcessingRule !== null && this.editingColumnProcessingRule !== -1;
      const wasEditingModel = this.editingModel && this.editingModel.modelId;
      
      // Sauvegarder immédiatement dans la base de données si le modèle existe déjà
      if (wasEditingModel) {
        const columnsCount = this.selectedColumns.length; // Sauvegarder avant réinitialisation
        console.log('💾 [DEBUG] Sauvegarde immédiate des règles pour le modèle:', this.editingModel.modelId);
        
        this.autoProcessingService.saveColumnProcessingRulesBatch(this.editingModel.modelId, this.columnProcessingRules)
          .then((savedRules) => {
            console.log('✅ [DEBUG] Règles sauvegardées avec succès dans la base de données');
            
            // Vérifier que stringToRemove est bien présent dans les règles sauvegardées
            savedRules.forEach((rule, index) => {
              if (rule.stringToRemove) {
                console.log(`  ✓ Règle ${index} - stringToRemove: "${rule.stringToRemove}" pour colonne: ${rule.sourceColumn}`);
              } else {
                console.log(`  ✓ Règle ${index} - Aucun stringToRemove pour colonne: ${rule.sourceColumn}`);
              }
            });
            
            this.successMessage = `Règles de traitement sauvegardées pour ${columnsCount} colonne(s)`;
            
            // Si on était en mode édition d'un modèle existant, préserver l'état du formulaire
            if (wasEditing) {
              // Mettre à jour les règles locales avec celles sauvegardées (pour avoir les IDs)
              this.columnProcessingRules = savedRules;
              
              // Trouver l'index de la règle qui correspond aux colonnes sauvegardées
              const matchingRuleIndex = this.columnProcessingRules.findIndex(rule => 
                rule.sourceColumn === savedSelectedColumns[0] ||
                (rule.sourceColumns && rule.sourceColumns.length > 0 && 
                 rule.sourceColumns.includes(savedSelectedColumns[0]))
              );
              
              if (matchingRuleIndex !== -1) {
                // Rééditer la règle mise à jour pour préserver l'affichage
                this.editColumnProcessingRule(matchingRuleIndex);
              } else {
                // Si pas trouvé, restaurer manuellement le formulaire et la sélection
                this.selectedColumns = savedSelectedColumns;
                this.columnProcessingRuleForm.patchValue(savedFormValues);
              }
            } else {
              // Si c'était une nouvelle règle, réinitialiser
              this.editingColumnProcessingRule = null;
              this.columnProcessingRuleForm.reset();
              this.selectedColumns = [];
            }
          })
          .catch(error => {
            console.error('❌ [DEBUG] Erreur lors de la sauvegarde des règles:', error);
            this.errorMessage = 'Erreur lors de la sauvegarde des règles dans la base de données';
            // Afficher quand même un message de succès local
            this.successMessage = `Règles de traitement mises à jour localement pour ${columnsCount} colonne(s) (sauvegarde en base échouée)`;
            
            // En cas d'erreur, préserver quand même l'état si on était en mode édition
            if (wasEditing) {
              this.selectedColumns = savedSelectedColumns;
              this.columnProcessingRuleForm.patchValue(savedFormValues);
            } else {
              this.editingColumnProcessingRule = null;
              this.columnProcessingRuleForm.reset();
              this.selectedColumns = [];
            }
          });
      } else {
        // Si le modèle n'existe pas encore, sauvegarder seulement localement
        // Les règles seront sauvegardées lors de la création du modèle
        const columnsCount = this.selectedColumns.length; // Sauvegarder avant réinitialisation
        this.successMessage = `Règles de traitement préparées pour ${columnsCount} colonne(s) (seront sauvegardées avec le modèle)`;
        
        // Réinitialiser seulement si on n'est pas en mode édition
        if (!wasEditing) {
          this.editingColumnProcessingRule = null;
          this.columnProcessingRuleForm.reset();
          this.selectedColumns = []; // Réinitialiser la sélection
        }
      }
      
      console.log('🔍 [DEBUG] Règles après modification:', this.columnProcessingRules);
    }
  }

  deleteColumnProcessingRule(index: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette règle de traitement ?')) {
      this.columnProcessingRules.splice(index, 1);
      
      // Sauvegarder immédiatement dans la base de données si le modèle existe déjà
      if (this.editingModel && this.editingModel.modelId) {
        console.log('💾 [DEBUG] Sauvegarde immédiate après suppression de règle pour le modèle:', this.editingModel.modelId);
        
        this.autoProcessingService.saveColumnProcessingRulesBatch(this.editingModel.modelId, this.columnProcessingRules)
          .then((savedRules) => {
            console.log('✅ [DEBUG] Règles sauvegardées avec succès après suppression');
            this.successMessage = 'Règle de traitement supprimée et sauvegardée';
          })
          .catch(error => {
            console.error('❌ [DEBUG] Erreur lors de la sauvegarde après suppression:', error);
            this.errorMessage = 'Erreur lors de la sauvegarde dans la base de données';
            this.successMessage = 'Règle supprimée localement (sauvegarde en base échouée)';
          });
      } else {
        this.successMessage = 'Règle de traitement supprimée';
      }
    }
  }

  cancelColumnProcessingRuleEdit(): void {
    this.editingColumnProcessingRule = null;
    this.columnProcessingRuleForm.reset();
  }

  /**
   * S'assure que les colonnes du modèle sont chargées avec encodage et typage corrects
   * Méthode centralisée qui utilise la normalisation standardisée
   * Fonctionne pour TOUS les types de modèles (partner, bo, both)
   */
  private ensureModelColumnsLoaded(): void {
    const fileType = this.modelForm.get('fileType')?.value;
    const templateFile = this.modelForm.get('templateFile')?.value;
    
    console.log('🔍 Vérification du chargement des colonnes du modèle...');
    console.log('  - Type de fichier:', fileType);
    console.log('  - Fichier modèle:', templateFile);
    console.log('  - Colonnes disponibles:', this.availableColumnsForTemplate.length);
    
    // Si les colonnes ne sont pas chargées, forcer le chargement
    if (this.availableColumnsForTemplate.length === 0) {
      console.log('⚠️ Colonnes non chargées, chargement automatique...');
      
      if (fileType === 'partner') {
        if (templateFile) {
          // Charger les colonnes du fichier modèle partenaire
          this.loadColumnsForTemplateFile(templateFile);
        } else {
          // Charger les colonnes partenaires par défaut selon le pattern
          this.loadColumnsForPartnerType();
        }
      } else if (fileType === 'bo') {
        if (templateFile) {
          // Charger les colonnes du fichier modèle BO
          this.loadColumnsForTemplateFile(templateFile);
        } else {
          // Charger les colonnes BO par défaut
          this.loadColumnsForBOType();
        }
      } else if (fileType === 'both') {
        // Pour les modèles 'both', charger les colonnes des deux types
        this.loadColumnsForBothTypes();
      }
    }
    
    // Normaliser toutes les colonnes pour l'encodage et le typage
    this.availableColumnsForTemplate = this.availableColumnsForTemplate.map(col => 
      this.normalizeColumnName(col)
    );
    
    // Mettre à jour toutes les sections avec les colonnes normalisées
    this.updateAllSectionsWithModelColumns();
    
    console.log('✅ Colonnes du modèle chargées et normalisées:', this.availableColumnsForTemplate);
  }

  /**
   * Charge les colonnes pour les modèles de type 'both' (partenaire et BO)
   */
  private loadColumnsForBothTypes(): void {
    console.log('🔍 Chargement des colonnes pour modèle type "both"');
    
    // Combiner les colonnes BO et partenaires
    const boColumns = [
      'ID', 'IDTransaction', 'téléphone client', 'montant', 'Service', 'Moyen de Paiement',
      'Agence', 'Agent', 'Type agent', 'PIXI', 'Date', 'Numero Trans GU', 'GRX', 'Statut',
      'Latitude', 'Longitude', 'ID Partenaire DIST', 'Expéditeur', 'Pays provenance',
      'Bénéficiaire', 'Canal de distribution'
    ];
    
    const partnerColumns = [
      'ID Opération', 'Type Opération', 'Montant', 'Solde avant', 'Solde aprés',
      'Code proprietaire', 'Téléphone', 'Statut', 'ID Transaction', 'Num bordereau',
      'Date opération', 'Date de versement', 'Banque appro', 'Login demandeur Appro',
      'Login valideur Appro', 'Motif rejet', 'Frais connexion', 'Numero Trans GU',
      'Agent', 'Motif régularisation', 'groupe de réseau'
    ];
    
    // Combiner et dédupliquer
    this.availableColumnsForTemplate = [...new Set([...boColumns, ...partnerColumns])];
    
    console.log('✅ Colonnes combinées pour modèle "both":', this.availableColumnsForTemplate.length);
  }

  // ===== MÉTHODES POUR LES COLONNES DE COMPARAISON =====

  addComparisonColumn(): void {
    this.editingComparisonColumn = null;
    this.comparisonColumnForm.reset({
      boColumn: '',
      partnerColumn: '',
      comparisonType: 'AUTO',
      tolerance: 0.01
    });
  }

  editComparisonColumn(column: any): void {
    this.editingComparisonColumn = column;
    this.comparisonColumnForm.patchValue({
      boColumn: column.boColumn,
      partnerColumn: column.partnerColumn,
      comparisonType: column.comparisonType,
      tolerance: column.tolerance
    });
  }

  saveComparisonColumn(): void {
    if (this.comparisonColumnForm.valid) {
      const columnData = this.comparisonColumnForm.value;
      
      if (this.editingComparisonColumn) {
        // Mise à jour d'une colonne existante
        const index = this.comparisonColumns.findIndex(c => c === this.editingComparisonColumn);
        if (index !== -1) {
          this.comparisonColumns[index] = columnData;
        }
      } else {
        // Ajout d'une nouvelle colonne
        this.comparisonColumns.push(columnData);
      }
      
      this.editingComparisonColumn = null;
      this.comparisonColumnForm.reset();
      this.successMessage = 'Colonne de comparaison sauvegardée';
    }
  }

  deleteComparisonColumn(column: any): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette colonne ?')) {
      const index = this.comparisonColumns.findIndex(c => c === column);
      if (index !== -1) {
        this.comparisonColumns.splice(index, 1);
        this.successMessage = 'Colonne de comparaison supprimée';
      }
    }
  }

  cancelComparisonColumnEdit(): void {
    this.editingComparisonColumn = null;
    this.comparisonColumnForm.reset();
  }

  moveComparisonColumnUp(index: number): void {
    if (index > 0) {
      const temp = this.comparisonColumns[index];
      this.comparisonColumns[index] = this.comparisonColumns[index - 1];
      this.comparisonColumns[index - 1] = temp;
    }
  }

  moveComparisonColumnDown(index: number): void {
    if (index < this.comparisonColumns.length - 1) {
      const temp = this.comparisonColumns[index];
      this.comparisonColumns[index] = this.comparisonColumns[index + 1];
      this.comparisonColumns[index + 1] = temp;
    }
  }

  // ===== MÉTHODES UTILITAIRES POUR LES BADGES =====

  getActionBadgeClass(action: string): string {
    switch (action) {
      case 'MARK_AS_MATCH':
        return 'badge-success';
      case 'MARK_AS_MISMATCH':
        return 'badge-danger';
      case 'MARK_AS_BO_ONLY':
        return 'badge-warning';
      default:
        return 'badge-secondary';
    }
  }

  getComparisonTypeBadgeClass(type: string): string {
    switch (type) {
      case 'NUMERIC':
        return 'badge-primary';
      case 'DATE':
        return 'badge-info';
      case 'STRING':
        return 'badge-secondary';
      case 'AUTO':
        return 'badge-success';
      default:
        return 'badge-secondary';
    }
  }

  // ===== MÉTHODES DE VALIDATION =====

  isFormValid(): boolean {
    // Validation de base du formulaire (en excluant reconciliationKeys pour les partenaires)
    const fileType = this.modelForm.get('fileType')?.value;
    let basicValidation = true;
    
    if (fileType === 'partner') {
      // Pour les partenaires, vérifier manuellement tous les champs sauf reconciliationKeys
      const fieldsToCheck = ['name', 'filePattern', 'fileType', 'autoApply', 'templateFile', 'logicType', 'expectedRatio', 'logicDescription', 'tolerance'];
      basicValidation = fieldsToCheck.every(field => this.modelForm.get(field)?.valid);
    } else {
      // Pour les BO, utiliser la validation normale
      basicValidation = this.modelForm.valid;
    }
    
    // Validation des clés de réconciliation
    const hasPartnerKeys = this.selectedPartnerKeys.length > 0;
    const hasBOModels = this.selectedBOModels.length > 0;
    
    // Pour les fichiers de type 'bo', pas besoin de clés de réconciliation
    if (fileType === 'bo') {
      console.log('🔍 Validation BO - Formulaire valide:', basicValidation);
      return basicValidation;
    }
    
    // Pour les fichiers partenaires, nécessite modèles BO ET (clés partenaire OU clés conditionnelles)
    const hasConditionalKeys = this.isPartnerConditionalKeysConfigValid();
    const hasBoConditionalKeys = this.isBoConditionalKeysConfigValid();
    const hasBoKeySelection = this.selectedBOKeys.length > 0 || hasBoConditionalKeys;
    const reconciliationKeysValid = hasBOModels && (hasPartnerKeys || hasConditionalKeys) && hasBoKeySelection;
    
    // Vérifier si le groupe reconciliationKeys est valide en ignorant boKeys pour les partenaires
    const reconciliationKeysGroup = this.modelForm.get('reconciliationKeys');
    let reconciliationKeysGroupValid = true;
    
    if (reconciliationKeysGroup) {
      if (fileType === 'partner') {
        // Pour les partenaires, ignorer boKeys et vérifier seulement partnerKeys et boModels
        reconciliationKeysGroupValid = 
          reconciliationKeysGroup.get('partnerKeys')?.valid && 
          reconciliationKeysGroup.get('boModels')?.valid;
        
        // Forcer la validation du groupe reconciliationKeys pour les partenaires
        if (reconciliationKeysGroupValid && !reconciliationKeysGroup.valid) {
          // Marquer le groupe comme valide en supprimant les erreurs
          reconciliationKeysGroup.setErrors(null);
          // Forcer la mise à jour de l'état
          reconciliationKeysGroup.updateValueAndValidity({ onlySelf: false, emitEvent: false });
        }
      } else {
        // Pour les BO, vérifier tous les champs
        reconciliationKeysGroupValid = reconciliationKeysGroup.valid;
      }
    }
    
    // Pour les partenaires, ignorer complètement la validation du groupe reconciliationKeys
    const finalValidation = fileType === 'partner' ? 
      (basicValidation && reconciliationKeysValid) : 
      (basicValidation && reconciliationKeysValid && reconciliationKeysGroupValid);
    
    // Logs détaillés seulement si la validation échoue
    if (!finalValidation) {
      console.log('🔍 Validation partenaire échouée:', {
        basicValidation,
        hasPartnerKeys,
        hasBOModels,
        fileType,
        reconciliationKeysValid,
        selectedPartnerKeys: this.selectedPartnerKeys,
        selectedBOModels: this.selectedBOModels,
        finalValidation
      });
      
      // Logs détaillés pour identifier le problème
      if (!basicValidation) {
        console.log('❌ Problème: Formulaire de base invalide');
        console.log('  - Nom valide:', this.modelForm.get('name')?.valid);
        console.log('  - Pattern valide:', this.modelForm.get('filePattern')?.valid);
        console.log('  - Type valide:', this.modelForm.get('fileType')?.valid);
        console.log('  - Template valide:', this.modelForm.get('templateFile')?.valid);
        console.log('  - Nom valeur:', this.modelForm.get('name')?.value);
        console.log('  - Pattern valeur:', this.modelForm.get('filePattern')?.value);
        console.log('  - Type valeur:', this.modelForm.get('fileType')?.value);
        console.log('  - Template valeur:', this.modelForm.get('templateFile')?.value);
        
        // Vérifier les erreurs de validation
        console.log('  - Erreurs du formulaire:', this.modelForm.errors);
        console.log('  - Erreurs du nom:', this.modelForm.get('name')?.errors);
        console.log('  - Erreurs du pattern:', this.modelForm.get('filePattern')?.errors);
        console.log('  - Erreurs du type:', this.modelForm.get('fileType')?.errors);
        console.log('  - Erreurs du template:', this.modelForm.get('templateFile')?.errors);
        
        // Vérifier tous les champs du formulaire
        console.log('  - Tous les champs du formulaire:');
        Object.keys(this.modelForm.controls).forEach(key => {
          const control = this.modelForm.get(key);
          console.log(`    - ${key}: valid=${control?.valid}, errors=`, control?.errors);
        });
        
        // Vérifier l'état du formulaire
        console.log('  - État du formulaire:', {
          valid: this.modelForm.valid,
          invalid: this.modelForm.invalid,
          pristine: this.modelForm.pristine,
          dirty: this.modelForm.dirty,
          touched: this.modelForm.touched,
          untouched: this.modelForm.untouched
        });
        
        // Vérifier les groupes imbriqués
        console.log('  - ReconciliationKeys valide:', this.modelForm.get('reconciliationKeys')?.valid);
        console.log('  - ReconciliationKeys erreurs:', this.modelForm.get('reconciliationKeys')?.errors);
        console.log('  - PartnerKeys valide:', this.modelForm.get('reconciliationKeys.partnerKeys')?.valid);
        console.log('  - BOKeys valide:', this.modelForm.get('reconciliationKeys.boKeys')?.valid);
        console.log('  - BOModels valide:', this.modelForm.get('reconciliationKeys.boModels')?.valid);
        console.log('  - BOModelKeys valide:', this.modelForm.get('reconciliationKeys.boModelKeys')?.valid);
        console.log('  - BOTreatments valide:', this.modelForm.get('reconciliationKeys.boTreatments')?.valid);
        
        // Logs pour la nouvelle validation
        const reconciliationKeysGroup = this.modelForm.get('reconciliationKeys');
        if (reconciliationKeysGroup) {
          console.log('  - Validation personnalisée ReconciliationKeys:', {
            fileType: fileType,
            partnerKeysValid: reconciliationKeysGroup.get('partnerKeys')?.valid,
            boModelsValid: reconciliationKeysGroup.get('boModels')?.valid,
            boKeysValid: reconciliationKeysGroup.get('boKeys')?.valid,
            groupValid: reconciliationKeysGroup.valid
          });
        }
        
        // Log de la validation finale
        console.log('  - Validation finale détaillée:', {
          basicValidation,
          hasPartnerKeys,
          hasBOModels,
          reconciliationKeysValid,
          reconciliationKeysGroupValid,
          finalValidation
        });
      }
      
      if (!hasPartnerKeys) {
        console.log('❌ Problème: Aucune clé partenaire sélectionnée');
      }
      
      if (!hasBOModels) {
        console.log('❌ Problème: Aucun modèle BO sélectionné');
      }
    } else {
      console.log('✅ Validation partenaire réussie - Bouton activé !');
    }
    
    return finalValidation;
  }

  // ===== MÉTHODES DE RÉINITIALISATION =====

  resetForm(): void {
    this.modelForm.reset({
      name: '',
      filePattern: '',
      fileType: 'partner',
      autoApply: true,
      templateFile: '',
      logicType: 'STANDARD',
      expectedRatio: '1:1',
      logicDescription: '',
      tolerance: 0.0
    });
    
    // Réinitialiser les sections
    this.showReconciliationLogicSection = false;
    this.showCorrespondenceRulesSection = false;
    this.showComparisonColumnsSection = false;
    this.showColumnProcessingSection = false;
    this.showRowFiltersSection = false;
    this.showFormatActionsSection = false;
    this.showValueMappingsSection = false;
    this.showColumnRenameSection = false;
    
    // Réinitialiser les données
    this.correspondenceRules = [];
    this.comparisonColumns = [];
    this.columnProcessingRules = [];
    this.resetPreProcessingConfig();
    this.selectedPartnerKeys = [];
    this.selectedBOModels = [];
    this.selectedBOKeys = [];
    this.resetPartnerConditionalKeysConfig();
    this.resetBoConditionalKeysConfig();
    this.availableBOColumns = [];
    this.selectedColumns = []; // Réinitialiser la sélection multiple
    
    // Réinitialiser les formulaires
    this.correspondenceRuleForm.reset();
    this.comparisonColumnForm.reset();
    this.columnProcessingRuleForm.reset();
    
    // Réinitialiser les états d'édition
    this.editingCorrespondenceRule = null;
    this.editingComparisonColumn = null;
    this.editingColumnProcessingRule = null;
    
    this.editingModel = null;
    this.isDuplicatingModel = false;
    this.showCreateForm = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  // ===== MÉTHODES POUR LA SÉLECTION MULTIPLE DE COLONNES =====

  toggleColumnSelection(columnName: string, isChecked: boolean): void {
    if (isChecked) {
      if (!this.selectedColumns.includes(columnName)) {
        this.selectedColumns.push(columnName);
      }
    } else {
      this.selectedColumns = this.selectedColumns.filter(col => col !== columnName);
    }
  }

  isColumnSelected(columnName: string): boolean {
    return this.selectedColumns.includes(columnName);
  }

  getSelectedColumnsCount(): number {
    return this.selectedColumns.length;
  }

  selectAllColumns(): void {
    this.selectedColumns = [...this.availableTemplateColumns];
  }

  deselectAllColumns(): void {
    this.selectedColumns = [];
  }

  // ===== MÉTHODES POUR LE REGROUPEMENT DES MODÈLES =====

  /**
   * Détermine la catégorie d'un modèle basée sur son nom
   * RÈGLE SPÉCIALE: Tous les modèles commençant par "PM" sont des partenaires paiement
   */
  getModelCategory(model: AutoProcessingModel): string {
    const modelName = model.name.toLowerCase();
    const modelPattern = (model.filePattern || '').toLowerCase();
    const patternKey = `${modelName} ${modelPattern}`;

    // RÈGLE SPÉCIALE: Tous les modèles commençant par "PM" sont des partenaires paiement
    // - "PMWAVECI" 
    // - "Modèle basé sur PMWAVECI.xls"
    // - "PMOMCI", "PMMTNCM", etc.
    if (modelName.startsWith('pm') || 
        modelName.includes('pmwaveci') || 
        modelName.includes('pmom') ||
        modelName.includes('pmmoovbf') ||
        modelName.includes('pmmtncm') ||
        /pm[a-z0-9]{4,}/.test(modelName)) {
      return 'Partenaire PAIEMENT';
    }
    
    // Patterns pour Partenaire CASHIN
    const cashinPatterns = [
      'ciom', 'cashin', 'cash', 'ci_', '_ci', 'ciomcm', 'ciomml', 'ciomgn', 
      'ciomci', 'ciomsn', 'ciomkn', 'ciombj', 'ciomgb'
    ];
    
    // Patterns pour Partenaire PAIEMENT
    const paiementPatterns = [
      'pmom', 'paiement', 'payment', 'pm_', '_pm', 'pmomcm', 'pmomml', 'pmomgn',
      'pmomci', 'pmomsn', 'pmomkn', 'pmombj', 'pmomgb'
    ];
    
    // Vérifier les patterns CASHIN
    for (const pattern of cashinPatterns) {
      if (patternKey.includes(pattern)) {
        return 'Partenaire CASHIN';
      }
    }
    
    // Vérifier les patterns PAIEMENT
    for (const pattern of paiementPatterns) {
      if (patternKey.includes(pattern)) {
        return 'Partenaire PAIEMENT';
      }
    }
    
    // Vérifier les patterns génériques CI et PM
    if (modelName.includes('ci') && !modelName.includes('city') && !modelName.includes('circle')) {
      return 'Partenaire CASHIN';
    }
    
    if (modelName.includes('pm') && !modelName.includes('pump') && !modelName.includes('prime')) {
      return 'Partenaire PAIEMENT';
    }
    
    // Par défaut, c'est un modèle Back Office
    return 'Back Office';
  }

  /**
   * Regroupe les modèles par catégorie
   */
  getModelsByCategory(): { [category: string]: AutoProcessingModel[] } {
    const groupedModels: { [category: string]: AutoProcessingModel[] } = {
      'Partenaire CASHIN': [],
      'Partenaire PAIEMENT': [],
      'Back Office': []
    };

    this.models.forEach(model => {
      const category = this.getModelCategory(model);
      groupedModels[category].push(model);
    });

    return groupedModels;
  }

  /**
   * Obtient les catégories qui ont des modèles
   */
  getActiveCategories(): string[] {
    const groupedModels = this.getModelsByCategory();
    return Object.keys(groupedModels).filter(category => groupedModels[category].length > 0);
  }

  /**
   * Obtient le nombre de modèles par catégorie
   */
  getCategoryCount(category: string): number {
    const groupedModels = this.getModelsByCategory();
    return groupedModels[category]?.length || 0;
  }

  /**
   * Obtient la description de la catégorie
   */
  getCategoryDescription(category: string): string {
    switch (category) {
      case 'Partenaire CASHIN':
        return 'Modèles pour les opérations de cash-in (dépôt d\'argent)';
      case 'Partenaire PAIEMENT':
        return 'Modèles pour les opérations de paiement et transfert';
      case 'Back Office':
        return 'Modèles pour les opérations internes et de gestion';
      default:
        return '';
    }
  }

  /**
   * Obtient l'icône de la catégorie
   */
  getCategoryIcon(category: string): string {
    switch (category) {
      case 'Partenaire CASHIN':
        return 'fas fa-money-bill-wave';
      case 'Partenaire PAIEMENT':
        return 'fas fa-credit-card';
      case 'Back Office':
        return 'fas fa-folder';
      default:
        return 'fas fa-cog';
    }
  }

  // ===== PRÉ-TRAITEMENT (filtres lignes + formatage /traitement) =====

  toggleRowFiltersSection(): void {
    this.showRowFiltersSection = !this.showRowFiltersSection;
  }

  toggleFormatActionsSection(): void {
    this.showFormatActionsSection = !this.showFormatActionsSection;
    if (this.showFormatActionsSection && !this.modelFormatActions.length) {
      this.initDefaultFormatActions();
    }
  }

  toggleValueMappingsSection(): void {
    this.showValueMappingsSection = !this.showValueMappingsSection;
  }

  toggleColumnConcatSection(): void {
    this.showColumnConcatSection = !this.showColumnConcatSection;
  }

  toggleColumnMathSection(): void {
    this.showColumnMathSection = !this.showColumnMathSection;
  }

  toggleColumnRenameSection(): void {
    this.showColumnRenameSection = !this.showColumnRenameSection;
  }

  addModelColumnRenameRule(): void {
    const columns = this.getPreProcessingColumns();
    this.modelColumnRenameRules.push({
      id: `rename-${this.nextModelColumnRenameId++}`,
      sourceColumn: columns[0] || '',
      targetColumn: '',
      enabled: true
    });
  }

  removeModelColumnRenameRule(index: number): void {
    this.modelColumnRenameRules.splice(index, 1);
  }

  addModelColumnConcatRule(): void {
    this.modelColumnConcatRules.push({
      id: `concat-${this.nextModelConcatRuleId++}`,
      sourceColumns: [],
      targetColumn: '',
      separator: '',
      enabled: true
    });
  }

  removeModelColumnConcatRule(index: number): void {
    this.modelColumnConcatRules.splice(index, 1);
  }

  addModelColumnMathRule(): void {
    const columns = this.getPreProcessingColumns();
    this.modelColumnMathRules.push({
      id: `math-${this.nextModelMathRuleId++}`,
      sourceColumnA: columns[0] || '',
      sourceColumnB: columns[1] || columns[0] || '',
      targetColumn: '',
      operation: 'add',
      enabled: true
    });
  }

  removeModelColumnMathRule(index: number): void {
    this.modelColumnMathRules.splice(index, 1);
  }

  getPreProcessingSectionOrderIndex(sectionId: ModelPreProcessingSectionId): number {
    return this.preProcessingSectionOrder.indexOf(sectionId);
  }

  onPreProcessingSectionDrop(event: CdkDragDrop<ModelPreProcessingSectionId[]>): void {
    if (event.previousIndex === event.currentIndex) {
      return;
    }
    moveItemInArray(this.preProcessingSectionOrder, event.previousIndex, event.currentIndex);
  }

  movePreProcessingSectionUp(index: number): void {
    if (index <= 0) {
      return;
    }
    moveItemInArray(this.preProcessingSectionOrder, index, index - 1);
  }

  movePreProcessingSectionDown(index: number): void {
    if (index >= this.preProcessingSectionOrder.length - 1) {
      return;
    }
    moveItemInArray(this.preProcessingSectionOrder, index, index + 1);
  }

  isConcatSourceColumnSelected(rule: ModelColumnConcatRule, column: string): boolean {
    return (rule.sourceColumns || []).includes(column);
  }

  toggleConcatSourceColumn(rule: ModelColumnConcatRule, column: string, checked: boolean): void {
    if (!rule.sourceColumns) {
      rule.sourceColumns = [];
    }

    if (checked) {
      if (!rule.sourceColumns.includes(column)) {
        rule.sourceColumns.push(column);
      }
    } else {
      rule.sourceColumns = rule.sourceColumns.filter(col => col !== column);
    }
  }

  moveConcatSourceColumnUp(rule: ModelColumnConcatRule, index: number): void {
    if (index <= 0 || index >= rule.sourceColumns.length) {
      return;
    }

    const columns = [...rule.sourceColumns];
    [columns[index - 1], columns[index]] = [columns[index], columns[index - 1]];
    rule.sourceColumns = columns;
  }

  moveConcatSourceColumnDown(rule: ModelColumnConcatRule, index: number): void {
    if (index < 0 || index >= rule.sourceColumns.length - 1) {
      return;
    }

    const columns = [...rule.sourceColumns];
    [columns[index + 1], columns[index]] = [columns[index], columns[index + 1]];
    rule.sourceColumns = columns;
  }

  addModelValueMapping(): void {
    const columns = this.getPreProcessingColumns();
    this.modelValueMappings.push({
      id: `mapping-${this.nextModelValueMappingId++}`,
      column: columns[0] || '',
      fromValue: '',
      toValue: '',
      enabled: true
    });
  }

  removeModelValueMapping(index: number): void {
    this.modelValueMappings.splice(index, 1);
  }

  getPreProcessingColumns(): string[] {
    const columns = [
      ...this.availableTemplateColumns,
      ...this.availableColumnsForTemplate,
      ...this.availableColumns
    ];
    return [...new Set(columns.filter(column => !!column))];
  }

  addModelRowFilter(): void {
    const columns = this.getPreProcessingColumns();
    this.modelRowFilters.push({
      id: `filter-${this.nextModelFilterId++}`,
      column: columns[0] || '',
      selectedValues: [],
      enabled: true
    });
  }

  removeModelRowFilter(index: number): void {
    this.modelRowFilters.splice(index, 1);
  }

  parseFilterValuesInput(input: string): string[] {
    if (!input?.trim()) {
      return [];
    }

    return input
      .split(/[\n,;]+/)
      .map(value => value.trim())
      .filter(value => value.length > 0);
  }

  getFilterValuesInput(filter: ModelRowFilter): string {
    return (filter.selectedValues || []).join(', ');
  }

  updateFilterValuesInput(filter: ModelRowFilter, input: string): void {
    filter.selectedValues = this.parseFilterValuesInput(input);
  }

  toggleFormatActionColumn(action: ModelFormatAction, column: string, checked: boolean): void {
    if (!action.columns) {
      action.columns = [];
    }

    if (checked) {
      if (!action.columns.includes(column)) {
        action.columns.push(column);
      }
      this.ensureFormatColumnSettings(action, column);
    } else {
      action.columns = action.columns.filter(col => col !== column);
      this.removeFormatColumnSettings(action, column);
    }
  }

  actionNeedsPerColumnSettings(type: ModelFormatActionType): boolean {
    return type !== 'removeNumbers' && type !== 'removeZeroDecimals';
  }

  getFormatColumnSettings(action: ModelFormatAction, column: string): ModelFormatColumnSettings {
    if (!action.columnSettings) {
      action.columnSettings = {};
    }
    if (!action.columnSettings[column]) {
      action.columnSettings[column] = this.createColumnSettingsFromAction(action);
    }
    return action.columnSettings[column];
  }

  applyDefaultSettingsToAllFormatColumns(action: ModelFormatAction): void {
    if (!action.columns?.length) {
      return;
    }
    const defaults = this.createColumnSettingsFromAction(action);
    if (!action.columnSettings) {
      action.columnSettings = {};
    }
    for (const column of action.columns) {
      action.columnSettings[column] = { ...defaults };
    }
  }

  private ensureFormatColumnSettings(action: ModelFormatAction, column: string): void {
    this.getFormatColumnSettings(action, column);
  }

  private removeFormatColumnSettings(action: ModelFormatAction, column: string): void {
    if (!action.columnSettings) {
      return;
    }
    delete action.columnSettings[column];
    if (!Object.keys(action.columnSettings).length) {
      delete action.columnSettings;
    }
  }

  private createColumnSettingsFromAction(action: ModelFormatAction): ModelFormatColumnSettings {
    return {
      specialStringToRemove: action.specialStringToRemove ?? '',
      specialStringRemovalMode: action.specialStringRemovalMode ?? 'all',
      removeCharMode: action.removeCharMode ?? 'remove',
      removeCharPosition: action.removeCharPosition ?? 'start',
      removeCharCount: action.removeCharCount ?? 1,
      removeCharSpecificPosition: action.removeCharSpecificPosition ?? 1,
      removeSpacesType: action.removeSpacesType ?? 'all',
      keepLastDigitsCount: action.keepLastDigitsCount ?? 3,
      indicatifType: action.indicatifType ?? 'international',
      customIndicatif: action.customIndicatif ?? '+33',
      decimalSeparator: action.decimalSeparator ?? ',',
      keepTrailingZeros: action.keepTrailingZeros ?? false,
      applyConditionEnabled: action.applyConditionEnabled ?? false,
      conditionColumn: action.conditionColumn ?? '',
      conditionValue: action.conditionValue ?? ''
    };
  }

  private migrateFormatActionColumnSettings(action: ModelFormatAction): void {
    if (!action.columns?.length) {
      return;
    }
    if (action.columnSettings && Object.keys(action.columnSettings).length > 0) {
      for (const column of action.columns) {
        this.ensureFormatColumnSettings(action, column);
      }
      return;
    }
    action.columnSettings = {};
    const defaults = this.createColumnSettingsFromAction(action);
    for (const column of action.columns) {
      action.columnSettings[column] = { ...defaults };
    }
  }

  isFormatActionColumnSelected(action: ModelFormatAction, column: string): boolean {
    return (action.columns || []).includes(column);
  }

  selectAllFormatActionColumns(action: ModelFormatAction): void {
    action.columns = [...this.getPreProcessingColumns()];
    for (const column of action.columns) {
      this.ensureFormatColumnSettings(action, column);
    }
  }

  deselectAllFormatActionColumns(action: ModelFormatAction): void {
    action.columns = [];
    delete action.columnSettings;
  }

  areAllFormatActionColumnsSelected(action: ModelFormatAction): boolean {
    const available = this.getPreProcessingColumns();
    return available.length > 0 && available.every(col => (action.columns || []).includes(col));
  }

  getFormatActionByType(type: ModelFormatActionType): ModelFormatAction {
    let action = this.modelFormatActions.find(item => item.type === type);
    if (!action) {
      action = this.createDefaultFormatAction(type);
      this.modelFormatActions.push(action);
      this.syncFormatActionOrders();
    }
    return action;
  }

  getFormatActionLabel(type: ModelFormatActionType): string {
    return this.formatActionTypes.find(item => item.type === type)?.label ?? type;
  }

  getFormatActionDisplayLabel(action: ModelFormatAction, index: number): string {
    const base = this.getFormatActionLabel(action.type);
    const instanceNumber = this.modelFormatActions
      .slice(0, index + 1)
      .filter(item => item.type === action.type).length;
    const totalSameType = this.modelFormatActions.filter(item => item.type === action.type).length;
    return totalSameType > 1 ? `${base} (#${instanceNumber})` : base;
  }

  addFormatAction(type: ModelFormatActionType = this.newFormatActionType): void {
    this.modelFormatActions.push(this.createDefaultFormatAction(type));
    this.syncFormatActionOrders();
    this.newFormatActionType = type;
    this.cdr.markForCheck();
  }

  duplicateFormatAction(index: number): void {
    const source = this.modelFormatActions[index];
    if (!source) {
      return;
    }
    const clone: ModelFormatAction = {
      ...this.createDefaultFormatAction(source.type),
      ...source,
      id: this.createFormatActionId(),
      enabled: source.enabled,
      columns: [...(source.columns || [])],
      columnSettings: source.columnSettings
        ? Object.fromEntries(
          Object.entries(source.columnSettings).map(([column, settings]) => [column, { ...settings }])
        )
        : undefined
    };
    this.modelFormatActions.splice(index + 1, 0, clone);
    this.syncFormatActionOrders();
    this.cdr.markForCheck();
  }

  removeFormatAction(index: number): void {
    if (index < 0 || index >= this.modelFormatActions.length) {
      return;
    }
    this.modelFormatActions.splice(index, 1);
    this.syncFormatActionOrders();
    this.cdr.markForCheck();
  }

  onFormatActionDrop(event: CdkDragDrop<ModelFormatAction[]>): void {
    if (event.previousIndex === event.currentIndex) {
      return;
    }
    moveItemInArray(this.modelFormatActions, event.previousIndex, event.currentIndex);
    this.syncFormatActionOrders();
  }

  moveFormatActionUp(index: number): void {
    if (index <= 0) {
      return;
    }
    moveItemInArray(this.modelFormatActions, index, index - 1);
    this.syncFormatActionOrders();
  }

  moveFormatActionDown(index: number): void {
    if (index >= this.modelFormatActions.length - 1) {
      return;
    }
    moveItemInArray(this.modelFormatActions, index, index + 1);
    this.syncFormatActionOrders();
  }

  private syncFormatActionOrders(): void {
    this.modelFormatActions.forEach((action, index) => {
      action.order = index + 1;
    });
  }

  private createFormatActionId(): string {
    return `format-${this.nextModelFormatActionId++}`;
  }

  private ensureFormatActionIds(): void {
    for (const action of this.modelFormatActions) {
      if (!action.id) {
        action.id = this.createFormatActionId();
      } else if (action.id.startsWith('format-')) {
        const numericPart = Number.parseInt(action.id.replace('format-', ''), 10);
        if (Number.isFinite(numericPart) && numericPart >= this.nextModelFormatActionId) {
          this.nextModelFormatActionId = numericPart + 1;
        }
      }
    }
  }

  private initDefaultFormatActions(): void {
    this.modelFormatActions = this.formatActionTypes.map(item =>
      this.createDefaultFormatAction(item.type)
    );
    this.syncFormatActionOrders();
  }

  private createDefaultFormatAction(type: ModelFormatActionType): ModelFormatAction {
    return {
      id: this.createFormatActionId(),
      type,
      enabled: false,
      columns: [],
      specialStringToRemove: '',
      specialStringRemovalMode: 'all',
      removeCharMode: 'remove',
      removeCharPosition: 'start',
      removeCharCount: 1,
      removeCharSpecificPosition: 1,
      removeSpacesType: 'all',
      keepLastDigitsCount: 3,
      indicatifType: 'international',
      customIndicatif: '+33',
      decimalSeparator: ',',
      keepTrailingZeros: false,
      applyConditionEnabled: false,
      conditionColumn: '',
      conditionValue: ''
    };
  }

  buildPreProcessingConfig(): ModelPreProcessingConfig {
    const rowFilters = this.modelRowFilters
      .filter(filter => filter.column && filter.selectedValues?.length)
      .map(filter => ({
        id: filter.id,
        column: filter.column,
        selectedValues: [...filter.selectedValues],
        enabled: filter.enabled !== false
      }));

    this.ensureFormatActionIds();
    const formatActions = this.modelFormatActions.map((action, index) => {
      this.migrateFormatActionColumnSettings(action);
      return {
        ...action,
        id: action.id || this.createFormatActionId(),
        order: index + 1,
        columns: [...(action.columns || [])],
        columnSettings: action.columnSettings
          ? Object.fromEntries(
            Object.entries(action.columnSettings).map(([column, settings]) => [column, { ...settings }])
          )
          : undefined
      };
    });

    const valueMappings = this.modelValueMappings
      .filter(mapping => mapping.column && mapping.fromValue?.trim())
      .map(mapping => ({
        id: mapping.id,
        column: mapping.column,
        fromValue: mapping.fromValue.trim(),
        toValue: mapping.toValue ?? '',
        enabled: mapping.enabled !== false
      }));

    const columnConcatRules = this.modelColumnConcatRules
      .filter(rule => rule.targetColumn?.trim() && rule.sourceColumns?.length >= 2)
      .map(rule => ({
        id: rule.id,
        sourceColumns: [...rule.sourceColumns],
        targetColumn: rule.targetColumn.trim(),
        separator: rule.separator ?? '',
        enabled: rule.enabled !== false
      }));

    const columnMathRules = this.modelColumnMathRules
      .filter(rule =>
        rule.targetColumn?.trim()
        && rule.sourceColumnA
        && rule.sourceColumnB
        && rule.sourceColumnA !== rule.sourceColumnB
      )
      .map(rule => ({
        id: rule.id,
        sourceColumnA: rule.sourceColumnA,
        sourceColumnB: rule.sourceColumnB,
        targetColumn: rule.targetColumn.trim(),
        operation: rule.operation,
        enabled: rule.enabled !== false
      }));

    const columnRenameRules = this.modelColumnRenameRules
      .filter(rule => rule.sourceColumn && rule.targetColumn?.trim() && rule.sourceColumn !== rule.targetColumn.trim())
      .map(rule => ({
        id: rule.id,
        sourceColumn: rule.sourceColumn,
        targetColumn: rule.targetColumn.trim(),
        enabled: rule.enabled !== false
      }));

    if (!rowFilters.length && !formatActions.length && !columnConcatRules.length && !columnMathRules.length && !valueMappings.length && !columnRenameRules.length) {
      return {
        rowFilters: [],
        formatActions: [],
        columnConcatRules: [],
        columnMathRules: [],
        valueMappings: [],
        columnRenameRules: [],
        sectionOrder: [...this.preProcessingSectionOrder]
      };
    }

    return {
      rowFilters,
      formatActions,
      columnConcatRules,
      columnMathRules,
      valueMappings,
      columnRenameRules,
      sectionOrder: [...this.preProcessingSectionOrder]
    };
  }

  loadPreProcessingConfig(config?: ModelPreProcessingConfig | null): void {
    this.modelRowFilters = [];
    this.modelFormatActions = [];
    this.modelColumnConcatRules = [];
    this.modelColumnMathRules = [];
    this.modelValueMappings = [];
    this.modelColumnRenameRules = [];
    this.preProcessingSectionOrder = [...DEFAULT_PRE_PROCESSING_SECTION_ORDER];
    this.nextModelFilterId = 1;
    this.nextModelConcatRuleId = 1;
    this.nextModelMathRuleId = 1;
    this.nextModelValueMappingId = 1;
    this.nextModelColumnRenameId = 1;
    this.nextModelFormatActionId = 1;

    if (!config) {
      return;
    }

    this.modelRowFilters = (config.rowFilters || []).map(filter => ({
      id: filter.id || `filter-${this.nextModelFilterId++}`,
      column: filter.column || '',
      selectedValues: [...(filter.selectedValues || [])],
      enabled: filter.enabled !== false
    }));

    this.modelFormatActions = (config.formatActions || [])
      .map(action => {
        const defaults = this.createDefaultFormatAction(action.type);
        return {
          ...defaults,
          ...action,
          id: action.id || defaults.id,
          columns: [...(action.columns || [])],
          columnSettings: action.columnSettings
            ? Object.fromEntries(
              Object.entries(action.columnSettings).map(([column, settings]) => [column, { ...settings }])
            )
            : undefined
        };
      })
      .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));
    this.modelFormatActions.forEach(action => this.migrateFormatActionColumnSettings(action));
    this.ensureFormatActionIds();

    this.modelValueMappings = (config.valueMappings || []).map(mapping => ({
      id: mapping.id || `mapping-${this.nextModelValueMappingId++}`,
      column: mapping.column || '',
      fromValue: mapping.fromValue || '',
      toValue: mapping.toValue || '',
      enabled: mapping.enabled !== false
    }));

    this.modelColumnConcatRules = (config.columnConcatRules || []).map(rule => ({
      id: rule.id || `concat-${this.nextModelConcatRuleId++}`,
      sourceColumns: [...(rule.sourceColumns || [])],
      targetColumn: rule.targetColumn || '',
      separator: rule.separator ?? '',
      enabled: rule.enabled !== false
    }));

    this.modelColumnMathRules = (config.columnMathRules || []).map(rule => ({
      id: rule.id || `math-${this.nextModelMathRuleId++}`,
      sourceColumnA: rule.sourceColumnA || '',
      sourceColumnB: rule.sourceColumnB || '',
      targetColumn: rule.targetColumn || '',
      operation: rule.operation === 'subtract' ? 'subtract' : 'add',
      enabled: rule.enabled !== false
    }));

    if (config.sectionOrder?.length) {
      const resolved: ModelPreProcessingSectionId[] = [];
      for (const sectionId of config.sectionOrder) {
        if (DEFAULT_PRE_PROCESSING_SECTION_ORDER.includes(sectionId) && !resolved.includes(sectionId)) {
          resolved.push(sectionId);
        }
      }
      for (const sectionId of DEFAULT_PRE_PROCESSING_SECTION_ORDER) {
        if (!resolved.includes(sectionId)) {
          resolved.push(sectionId);
        }
      }
      this.preProcessingSectionOrder = resolved;
    }

    this.modelColumnRenameRules = (config.columnRenameRules || []).map(rule => ({
      id: rule.id || `rename-${this.nextModelColumnRenameId++}`,
      sourceColumn: rule.sourceColumn || '',
      targetColumn: rule.targetColumn || '',
      enabled: rule.enabled !== false
    }));

    if (this.modelRowFilters.length) {
      this.showRowFiltersSection = true;
    }

    if (this.modelFormatActions.some(action => action.enabled)) {
      this.showFormatActionsSection = true;
    }

    if (this.modelColumnConcatRules.length) {
      this.showColumnConcatSection = true;
    }

    if (this.modelColumnMathRules.length) {
      this.showColumnMathSection = true;
    }

    if (this.modelValueMappings.length) {
      this.showValueMappingsSection = true;
    }

    if (this.modelColumnRenameRules.length) {
      this.showColumnRenameSection = true;
    }

    if (this.showFormatActionsSection && !this.modelFormatActions.length) {
      this.initDefaultFormatActions();
    }
  }

  resetPreProcessingConfig(): void {
    this.modelRowFilters = [];
    this.modelFormatActions = [];
    this.modelColumnConcatRules = [];
    this.modelColumnMathRules = [];
    this.modelValueMappings = [];
    this.modelColumnRenameRules = [];
    this.preProcessingSectionOrder = [...DEFAULT_PRE_PROCESSING_SECTION_ORDER];
    this.nextModelFilterId = 1;
    this.nextModelConcatRuleId = 1;
    this.nextModelMathRuleId = 1;
    this.nextModelValueMappingId = 1;
    this.nextModelColumnRenameId = 1;
    this.nextModelFormatActionId = 1;
    this.showRowFiltersSection = false;
    this.showFormatActionsSection = false;
    this.showColumnConcatSection = false;
    this.showColumnMathSection = false;
    this.showValueMappingsSection = false;
    this.showColumnRenameSection = false;
  }
}
