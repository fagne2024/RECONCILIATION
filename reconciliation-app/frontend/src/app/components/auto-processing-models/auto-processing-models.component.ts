import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, FormControl } from '@angular/forms';
import { AutoProcessingService, AutoProcessingModel, ProcessingStep, FileModel } from '../../services/auto-processing.service';
import { OrangeMoneyUtilsService } from '../../services/orange-money-utils.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-auto-processing-models',
  templateUrl: './auto-processing-models.component.html',
  styleUrls: ['./auto-processing-models.component.scss']
})
export class AutoProcessingModelsComponent implements OnInit {
  models: AutoProcessingModel[] = [];
  availableFiles: FileModel[] = [];
  showCreateForm = false;
  editingModel: AutoProcessingModel | null = null;
  modelForm: FormGroup;
  loading = false;
  errorMessage = '';
  showFileSelector = false;
  selectedFileModel: FileModel | null = null;
  availableColumns: string[] = [];

  // --- FILTRAGE DES MODÈLES PARTENAIRES ---
  showPartnerFilter = false;
  selectedPartnerFilterColumn: string = '';
  partnerFilterValues: string[] = [];
  selectedPartnerFilterValues: string[] = [];
  filteredPartnerModels: AutoProcessingModel[] = [];
  partnerFilterApplied: boolean = false;
  partnerFilterValueSearchCtrl = new FormControl('');

  // --- FILTRAGE PAR PAYS DES MODÈLES PARTENAIRES ---
  selectedPartnerCountries: string[] = [];
  partnerCountrySearchCtrl = new FormControl('');

  // --- FILTRAGE GÉNÉRAL DES MODÈLES (BO + PARTENAIRES) ---
  showModelFilter = false;
  selectedModelFilterColumn: string = '';
  modelFilterValues: string[] = [];
  selectedModelFilterValues: string[] = [];
  filteredModels: AutoProcessingModel[] = [];
  modelFilterApplied: boolean = false;
  modelFilterValueSearchCtrl = new FormControl('');

  // --- RECHERCHE DE FICHIERS DANS LE POPUP ---
  fileSearchTerm: string = '';
  filteredFiles: FileModel[] = [];



  // Types d'étapes disponibles
  stepTypes = [
    { value: 'format', label: 'Formatage' },
    { value: 'validate', label: 'Validation' },
    { value: 'transform', label: 'Transformation' },
    { value: 'filter', label: 'Filtrage' },
    { value: 'calculate', label: 'Calcul' },
    { value: 'select', label: 'Sélection colonnes' },
    { value: 'deduplicate', label: 'Suppression doublons' },
    { value: 'extract', label: 'Extraction de données' },
    { value: 'export', label: 'Export par type' }
  ];

  // Actions disponibles par type
  actionsByType = {
    format: [
      { value: 'currency', label: 'Format monétaire' },
      { value: 'date', label: 'Format date' },
      { value: 'number', label: 'Format nombre' },
      { value: 'trimSpaces', label: 'Supprimer espaces' },
      { value: 'toLowerCase', label: 'Convertir en minuscules' },
      { value: 'toUpperCase', label: 'Convertir en majuscules' },
      { value: 'normalizeDates', label: 'Normaliser les dates' },
      { value: 'normalizeNumbers', label: 'Normaliser les nombres' },
      { value: 'removeDashesAndCommas', label: 'Supprimer tirets et virgules' },
      { value: 'removeSeparators', label: 'Supprimer séparateurs' },
      { value: 'dotToComma', label: 'Point vers virgule' },
      { value: 'absoluteValue', label: 'Valeur absolue' },
      { value: 'removeCharacters', label: 'Supprimer caractères' },
      { value: 'removeSpecificCharacters', label: 'Supprimer caractères spécifiques' },
      { value: 'cleanAmounts', label: 'Nettoyer montants' },
      { value: 'insertCharacters', label: 'Insérer caractères' }
    ],
    validate: [
      { value: 'dateFormat', label: 'Validation date' },
      { value: 'email', label: 'Validation email' },
      { value: 'required', label: 'Champ requis' }
    ],
    transform: [
      { value: 'trim', label: 'Supprimer espaces' },
      { value: 'uppercase', label: 'Majuscules' },
      { value: 'lowercase', label: 'Minuscules' },
      { value: 'replace', label: 'Remplacer' },
      { value: 'extract', label: 'Extraire données' },
      { value: 'concat', label: 'Concaténer colonnes' }
    ],
    filter: [
      { value: 'removeEmpty', label: 'Supprimer lignes vides' },
      { value: 'keepMatching', label: 'Garder lignes correspondantes' },
      { value: 'filterByValue', label: 'Filtrer par valeur' },
      { value: 'filterByExactValue', label: 'Filtrer par valeur exacte' },
      { value: 'filterByColumn', label: 'Filtrer par colonne' },
      { value: 'filterByMultipleValues', label: 'Filtrer par valeurs multiples' }
    ],
    calculate: [
      { value: 'sum', label: 'Somme' },
      { value: 'average', label: 'Moyenne' },
      { value: 'count', label: 'Comptage' }
    ],
    select: [
      { value: 'keepColumns', label: 'Conserver colonnes' },
      { value: 'removeColumns', label: 'Supprimer colonnes' }
    ],
    deduplicate: [
      { value: 'removeDuplicates', label: 'Supprimer doublons' }
    ],
    extract: [
      { value: 'extractFirst', label: 'Extraire premiers caractères' },
      { value: 'extractLast', label: 'Extraire derniers caractères' },
      { value: 'extractFrom', label: 'Extraire à partir de' },
      { value: 'extractBetween', label: 'Extraire entre deux caractères' },
      { value: 'extractAfterKey', label: 'Extraire après une clé' }
    ],
    export: [
      { value: 'exportByType', label: 'Export par type' },
      { value: 'exportByColumn', label: 'Export par colonne' },
      { value: 'exportByValue', label: 'Export par valeur' }
    ]
  };

  constructor(
    private autoProcessingService: AutoProcessingService,
    private orangeMoneyUtilsService: OrangeMoneyUtilsService,
    private fb: FormBuilder
  ) {
    this.modelForm = this.fb.group({
      name: ['', Validators.required],
      filePattern: ['', Validators.required],
      fileType: ['bo', Validators.required],
      autoApply: [true],
      templateFile: [''],
      processingSteps: this.fb.array([]),
      // Configuration des clés de réconciliation
      reconciliationKeys: this.fb.group({
        partnerKeys: [[]],
        boKeys: [[]],
        boModels: [[]], // Nouveaux champs pour les modèles BO
        boModelKeys: this.fb.group({}), // Clés dynamiques pour chaque modèle BO
        boTreatments: this.fb.group({}) // Traitements dynamiques pour chaque modèle BO
      })
    });

    // Écouter les changements de type de fichier
    this.modelForm.get('fileType')?.valueChanges.subscribe(fileType => {
      this.updateReconciliationKeysValidation(fileType);
    });

    // Écouter les changements de sélection des modèles BO
    this.modelForm.get('reconciliationKeys.boModels')?.valueChanges.subscribe(() => {
      this.onBOModelsChange();
    });
  }

  ngOnInit(): void {
    this.loadModels();
    this.loadAvailableFiles();
  }

  loadModels(): void {
    this.autoProcessingService.getModels().subscribe({
      next: (models) => {
        this.models = models;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des modèles:', error);
        this.errorMessage = 'Erreur lors du chargement des modèles';
      }
    });
  }

  loadAvailableFiles(): void {
    console.log('🚀 loadAvailableFiles() appelé');
    this.loading = true;
    this.autoProcessingService.getAvailableFileModels().subscribe({
      next: (files) => {
        console.log('✅ Fichiers chargés avec succès:', files);
        
        // Corriger les noms de colonnes corrompus dans tous les fichiers
        this.availableFiles = files.map(file => ({
          ...file,
          columns: file.columns.map(col => this.normalizeColumnName(col))
        }));
        
        this.filteredFiles = [...this.availableFiles]; // Initialiser filteredFiles avec tous les fichiers corrigés
        console.log('✅ Colonnes corrigées dans les fichiers:', this.availableFiles.map(f => ({ fileName: f.fileName, columns: f.columns })));
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement des fichiers:', error);
        this.errorMessage = 'Erreur lors du chargement des fichiers disponibles';
        this.loading = false;
      }
    });
  }

  // Gestion du formulaire
  get processingStepsFormArray(): FormArray {
    return this.modelForm.get('processingSteps') as FormArray;
  }

  addProcessingStep(): void {
    const stepForm = this.fb.group({
      name: ['', Validators.required],
      type: ['format', Validators.required],
      field: [[], Validators.required], // Changé en tableau pour sélection multiple
      action: ['', Validators.required],
      description: ['', Validators.required],
      // Paramètres de formatage
      locale: ['fr-FR'],
      currency: ['EUR'],
      dateFormat: ['yyyy-MM-dd'],
      position: ['start'],
      count: [1],
      characters: [''],
      caseSensitive: [true],
      specificPosition: [1], // Pour removeCharacters avec position spécifique
      // Paramètres d'extraction
      extractType: ['first'],
      extractCount: [5],
      extractKey: [''],
      extractStart: [1],
      startChar: [''],
      endChar: [''],
      searchKey: [''],
      sourceColumn: [''],
      // Paramètres de concaténation
      newColumn: ['concatenated'],
      separator: [' '],
      // Paramètres de filtrage
      pattern: ['.*'],
      values: [''],
      value: [''],
      filterColumn: [''],
      filterValues: [''],
      // Paramètres d'export
      exportColumn: [''],
      exportValues: [''],
      exportSuffix: ['_export'],
      exportDescription: ['Export par type'],
      // Paramètres de validation
      required: [false],
      email: [false],
      validationDateFormat: ['yyyy-MM-dd'] // Renommé pour éviter le conflit
    });

    this.processingStepsFormArray.push(stepForm);
  }

  removeProcessingStep(index: number): void {
    this.processingStepsFormArray.removeAt(index);
  }

  onStepTypeChange(stepIndex: number): void {
    const stepForm = this.processingStepsFormArray.at(stepIndex);
    const type = stepForm.get('type')?.value;
    const actions = this.actionsByType[type as keyof typeof this.actionsByType] || [];

    if (actions.length > 0) {
      stepForm.get('action')?.setValue(actions[0].value);
    }
  }

  getActionsForType(type: string): any[] {
    const actions = this.actionsByType[type as keyof typeof this.actionsByType] || [];
    return actions;
  }

  // Méthode alternative pour obtenir les stepTypes
  getStepTypesArray(): any[] {
    return [
      { value: 'format', label: 'Formatage' },
      { value: 'validate', label: 'Validation' },
      { value: 'transform', label: 'Transformation' },
      { value: 'filter', label: 'Filtrage' },
      { value: 'calculate', label: 'Calcul' },
      { value: 'select', label: 'Sélection colonnes' },
      { value: 'deduplicate', label: 'Suppression doublons' },
      { value: 'extract', label: 'Extraction de données' },
      { value: 'export', label: 'Export par type' }
    ];
  }

  // === NOUVELLES MÉTHODES POUR LA SÉLECTION DE FICHIERS ===

  // Ouvrir le sélecteur de fichiers
  openFileSelector(): void {
    this.showFileSelector = true;
    this.loadAvailableFiles();
  }

  // Fermer le sélecteur de fichiers
  closeFileSelector(): void {
    this.showFileSelector = false;
    this.selectedFileModel = null;
    this.clearFileSearch();
  }

  // Méthodes pour la recherche de fichiers
  onFileSearchChange(): void {
    this.filterFiles();
  }

  clearFileSearch(): void {
    this.fileSearchTerm = '';
    this.filteredFiles = [...this.availableFiles];
  }

  private filterFiles(): void {
    if (!this.fileSearchTerm.trim()) {
      this.filteredFiles = [...this.availableFiles];
      return;
    }

    const searchTerm = this.fileSearchTerm.toLowerCase().trim();
    
    this.filteredFiles = this.availableFiles.filter(file => {
      // Recherche par nom de fichier
      if (file.fileName.toLowerCase().includes(searchTerm)) {
        return true;
      }
      
      // Recherche par type de fichier
      if (file.fileType.toLowerCase().includes(searchTerm)) {
        return true;
      }
      
      // Recherche par colonnes
      if (file.columns && file.columns.some(column => 
        column.toLowerCase().includes(searchTerm)
      )) {
        return true;
      }
      
      // Recherche par nombre d'enregistrements
      if (file.recordCount && file.recordCount.toString().includes(searchTerm)) {
        return true;
      }
      
      return false;
    });
  }

  // Sélectionner un fichier modèle
  selectFileModel(fileModel: FileModel): void {
    console.log('🎯 Sélection du fichier modèle:', fileModel);
    console.log('📋 Colonnes du fichier:', fileModel.columns);
    
    this.selectedFileModel = fileModel;
    // Corriger les noms de colonnes corrompus
    this.availableColumns = fileModel.columns.map(col => this.normalizeColumnName(col));
    
    console.log('✅ Colonnes corrigées disponibles après sélection:', this.availableColumns);

    // Auto-remplir le formulaire avec les informations du fichier
    this.modelForm.patchValue({
      name: `Modèle basé sur ${fileModel.fileName}`,
      filePattern: `*${fileModel.fileName.split('.')[0]}*.${fileModel.fileName.split('.').pop()}`,
      templateFile: fileModel.fileName
    });

    // S'assurer que les colonnes corrigées restent disponibles après la mise à jour du formulaire
    setTimeout(() => {
      this.availableColumns = fileModel.columns.map(col => this.normalizeColumnName(col));
      console.log('🔄 Colonnes corrigées après timeout:', this.availableColumns);
    }, 100);

    this.closeFileSelector();
  }

  // Créer un modèle à partir d'un fichier sélectionné
  createModelFromSelectedFile(): void {
    if (!this.selectedFileModel) return;

    const modelName = this.modelForm.get('name')?.value || `Modèle basé sur ${this.selectedFileModel.fileName}`;
    const fileType = this.modelForm.get('fileType')?.value || 'bo';

    this.autoProcessingService.createModelFromFile(
      this.selectedFileModel,
      modelName,
      fileType
    ).subscribe({
      next: (newModel) => {
        this.loadModels();
        this.editingModel = newModel;
        this.editModel(newModel);
      },
      error: (error) => {
        console.error('Erreur lors de la création du modèle:', error);
        this.errorMessage = 'Erreur lors de la création du modèle';
      }
    });
  }

  // Propriété calculée pour les colonnes disponibles (évite les appels répétés)
  get availableColumnsForTemplate(): string[] {
    // Priorité 1: Colonnes du fichier sélectionné
    if (this.selectedFileModel && this.selectedFileModel.columns.length > 0) {
      return this.selectedFileModel.columns;
    }
    
    // Priorité 2: Colonnes disponibles dans le composant
    if (this.availableColumns && this.availableColumns.length > 0) {
      return this.availableColumns;
    }
    
    // Priorité 3: Colonnes du modèle en édition - chercher dans les fichiers disponibles
    if (this.editingModel?.templateFile) {
      const fileModel = this.availableFiles.find(f => f.fileName === this.editingModel?.templateFile);
      if (fileModel && fileModel.columns.length > 0) {
        return fileModel.columns;
      }
    }
    
    // Priorité 4: Colonnes du premier fichier disponible (pour création de nouveau modèle)
    if (this.availableFiles.length > 0) {
      const firstFile = this.availableFiles[0];
      if (firstFile.columns.length > 0) {
        return firstFile.columns;
      }
    }
    
    return [];
  }

  // Méthode pour corriger les noms de colonnes corrompus
  private normalizeColumnName(columnName: string): string {
    // Remplacer les caractères spéciaux corrompus
    const replacements: { [key: string]: string } = {
      'tlphone client': 'téléphone client',
      'Numro Trans GU': 'Numéro Trans GU',
      'Solde aprs': 'Solde aprés',
      'Code proprietaire': 'Code propriétaire',
      'groupe de rseau': 'groupe de réseau',
      'Code rseau': 'Code réseau',
      'Dstinataire': 'Déstinataire',
      'date de cration': 'date de création',
      'Motif rgularisation': 'Motif régularisation',
      'Login demandeur Appro': 'Login demandeur Appro',
      'Login valideur Appro': 'Login valideur Appro',
      'Motif rejet': 'Motif rejet',
      'Frais connexion': 'Frais connexion',
      'Login agent': 'Login agent',
      'Type agent': 'Type agent',
      'Date d\'envoi vers part': 'Date d\'envoi vers part',
      'Action faite': 'Action faite',
      'Partenaire dist ID': 'Partenaire dist ID',
      'Agence SC': 'Agence SC',
      'Groupe reseau SC': 'Groupe reseau SC',
      'Agent SC': 'Agent SC',
      'PDA SC': 'PDA SC',
      'Date dernier traitement': 'Date dernier traitement',
      
      // Corrections spécifiques pour TRXBO
      'tÃ©lÃ©phone client': 'téléphone client',
      'NumÃ©ro Trans GU': 'Numéro Trans GU',
      'tÃ©lÃ©phone': 'téléphone',
      'NumÃ©ro': 'Numéro'
    };

    // Appliquer les remplacements
    let normalizedName = columnName;
    for (const [corrupted, correct] of Object.entries(replacements)) {
      if (normalizedName.includes(corrupted)) {
        normalizedName = normalizedName.replace(new RegExp(corrupted, 'g'), correct);
      }
    }

    return normalizedName;
  }

  // Méthode pour obtenir les colonnes corrigées
  get correctedAvailableColumns(): string[] {
    const originalColumns = this.availableColumnsForTemplate;
    return originalColumns.map(col => this.normalizeColumnName(col));
  }

  // Obtenir les colonnes disponibles pour le champ sélection (méthode pour debug)
  getAvailableColumns(): string[] {
    console.log('🔍 getAvailableColumns() appelé');
    console.log('   selectedFileModel:', this.selectedFileModel);
    console.log('   editingModel:', this.editingModel);
    console.log('   availableColumns:', this.availableColumns);
    console.log('   availableFiles:', this.availableFiles.length);
    
    // Utiliser les colonnes corrigées au lieu des colonnes originales
    const columns = this.correctedAvailableColumns;
    console.log('   ✅ Retour des colonnes corrigées:', columns);
    return columns;
  }

  // Création/édition de modèle
  createModel(): void {
    this.editingModel = null;
    this.modelForm.reset({
      fileType: 'bo',
      autoApply: true,
      processingSteps: []
    });
    this.showCreateForm = true;
    this.selectedFileModel = null;
    // Ne pas vider availableColumns pour permettre l'utilisation des colonnes des fichiers disponibles
    // this.availableColumns = [];
  }

  editModel(model: AutoProcessingModel): void {
    console.log('🔧 editModel() appelé pour:', model.name);
    console.log('🔧 Type de fichier:', model.fileType);
    console.log('🔧 reconciliationKeys:', model.reconciliationKeys);
    console.log('🔧 État actuel du formulaire:', this.modelForm.value);
    
    this.editingModel = model;
    this.modelForm.patchValue({
      name: model.name,
      filePattern: model.filePattern,
      fileType: model.fileType,
      autoApply: model.autoApply,
      templateFile: model.templateFile || '',
      reconciliationKeys: {
        partnerKeys: model.reconciliationKeys?.partnerKeys || [],
        boKeys: model.reconciliationKeys?.boKeys || [],
        boModels: model.reconciliationKeys?.boModels || [],
        boModelKeys: model.reconciliationKeys?.boModelKeys || {}
      }
    });

    // Initialiser les contrôles dynamiques pour les clés BO si c'est un modèle partenaire
    console.log('🔧 Vérification des conditions pour initialiser les contrôles BO:');
    console.log('  - model.fileType === "partner":', model.fileType === 'partner');
    console.log('  - model.reconciliationKeys?.boModels:', model.reconciliationKeys?.boModels);
    
    if (model.fileType === 'partner' && model.reconciliationKeys?.boModels) {
      console.log('✅ Conditions remplies, initialisation des contrôles BO');
      const boModelKeysGroup = this.modelForm.get('reconciliationKeys.boModelKeys') as FormGroup;
      
      console.log('🔧 Contrôles existants avant suppression:', Object.keys(boModelKeysGroup.controls));
      
      // Supprimer les contrôles existants
      Object.keys(boModelKeysGroup.controls).forEach(key => {
        boModelKeysGroup.removeControl(key);
      });
      
                      // Ajouter les contrôles pour chaque modèle BO configuré
                model.reconciliationKeys.boModels.forEach(boModelId => {
                  const keys = model.reconciliationKeys?.boModelKeys?.[boModelId] || [];
                  const control = this.fb.control(keys);
                  boModelKeysGroup.addControl(`boKeys_${boModelId}`, control);
                  console.log(`🔧 Contrôle BO initialisé: boKeys_${boModelId} =`, keys);
                  console.log(`🔧 Contrôle créé:`, control);
                  
                  // Ajouter un listener pour détecter les changements
                  control.valueChanges.subscribe(value => {
                    console.log(`🔄 Changement détecté dans editModel pour boKeys_${boModelId}:`, value);
                  });
                });
      
      console.log('🔧 Contrôles BO initialisés:', Object.keys(boModelKeysGroup.controls));
      console.log('🔧 Valeurs des contrôles:', Object.keys(boModelKeysGroup.controls).map(key => ({
        control: key,
        value: boModelKeysGroup.get(key)?.value
      })));
    } else {
      console.log('❌ Conditions non remplies pour l\'initialisation des contrôles BO');
      console.log('  - Raison: fileType !== "partner" ou boModels manquant');
    }

    // Charger les données du fichier modèle si défini
    if (model.templateFile) {
      console.log('🔄 Chargement des données du fichier modèle:', model.templateFile);
      
      // Charger les colonnes
      this.autoProcessingService.getFileColumns(model.templateFile).subscribe({
        next: (columns) => {
          // Corriger les noms de colonnes corrompus
          this.availableColumns = columns.map(col => this.normalizeColumnName(col));
          console.log('✅ Colonnes corrigées chargées:', this.availableColumns);
        },
        error: (error) => {
          console.error('Erreur lors du chargement des colonnes:', error);
        }
      });

      // Charger les données complètes du fichier pour avoir accès aux valeurs
      this.autoProcessingService.analyzeFileModel(model.templateFile).subscribe({
        next: (fileModel) => {
          console.log('✅ Données du fichier modèle chargées:', fileModel);
          
          // Mettre à jour selectedFileModel avec les données du fichier modèle
          this.selectedFileModel = fileModel;
          
          // Mettre à jour availableFiles si le fichier n'y est pas déjà
          const existingFile = this.availableFiles.find(f => f.fileName === model.templateFile);
          if (!existingFile) {
            this.availableFiles.push(fileModel);
          }
          
          console.log('✅ selectedFileModel mis à jour avec les vraies données');
        },
        error: (error) => {
          console.error('Erreur lors du chargement des données du fichier:', error);
        }
      });
    }

    // Réinitialiser les étapes - s'assurer qu'il n'y a pas de duplication
    this.processingStepsFormArray.clear();
    
    // Vérifier que les étapes ne sont pas vides ou dupliquées
    if (model.processingSteps && model.processingSteps.length > 0) {
      console.log(`🔧 Chargement de ${model.processingSteps.length} étapes pour l'édition`);
      
      // Créer un Set pour éviter les doublons basés sur le nom et le type
      const uniqueSteps = new Set<string>();
      
      model.processingSteps.forEach((step, index) => {
        const stepKey = `${step.name}_${step.type}_${step.action}`;
        
        // Vérifier si cette étape n'a pas déjà été ajoutée
        if (uniqueSteps.has(stepKey)) {
          console.log(`⚠️ Étape dupliquée détectée et ignorée: ${step.name} (${step.type})`);
          return;
        }
        
        uniqueSteps.add(stepKey);
        console.log(`🔧 Étape ${index + 1}: ${step.name} (${step.type})`);
        
        const stepForm = this.fb.group({
          name: [step.name, Validators.required],
          type: [step.type, Validators.required],
          field: [Array.isArray(step.field) ? step.field : [step.field], Validators.required], // Gérer les champs multiples
          action: [step.action, Validators.required],
          description: [step.description, Validators.required],
          // Patch des paramètres spécifiques
          locale: [step.params?.locale || 'fr-FR'],
          currency: [step.params?.currency || 'EUR'],
          dateFormat: [step.params?.format || 'yyyy-MM-dd'],
          position: [step.params?.position || 'start'],
          count: [step.params?.count || 1],
          characters: [step.params?.characters || ''],
          caseSensitive: [step.params?.caseSensitive !== false],
          extractType: [step.params?.extractType || 'first'],
          extractCount: [step.params?.extractCount || 5],
          extractKey: [step.params?.extractKey || ''],
          extractStart: [step.params?.extractStart || 1],
          columns: [step.params?.columns?.join(',') || ''],
          newColumn: [step.params?.newColumn || 'concatenated'],
          separator: [step.params?.separator || ' '],
          pattern: [step.params?.pattern || '.*'],
          values: [step.params?.values?.join(',') || ''],
          value: [step.params?.value || ''],
          startChar: [step.params?.startChar || ''],
          endChar: [step.params?.endChar || '']
        });
        
        this.processingStepsFormArray.push(stepForm);
      });
      
      console.log(`✅ ${this.processingStepsFormArray.length} étapes uniques chargées dans le formulaire`);
    } else {
      console.log('⚠️ Aucune étape trouvée dans le modèle à éditer');
    }

    this.showCreateForm = true;
    
    // Initialiser les contrôles BO immédiatement (sans setTimeout)
    this.initializeBOModelKeys();
    
    // Initialiser les traitements BO si c'est un modèle partenaire
    if (model.fileType === 'partner' && model.reconciliationKeys?.boModels) {
      model.reconciliationKeys.boModels.forEach(boModelId => {
        this.initializeBOTreatments(boModelId);
      });
    }
    
    // Mettre à jour la carte des clés BO
    this.updateBOModelKeysMap();
  }
  
  // Méthode pour initialiser les contrôles BO
  private initializeBOModelKeys(): void {
    console.log('🔧 initializeBOModelKeys() appelé');
    
    if (this.editingModel?.fileType === 'partner' && this.editingModel?.reconciliationKeys?.boModels) {
      console.log('✅ Conditions remplies pour initialiser les contrôles BO');
      const boModelKeysGroup = this.modelForm.get('reconciliationKeys.boModelKeys') as FormGroup;
      
      console.log('🔧 Contrôles existants avant suppression:', Object.keys(boModelKeysGroup.controls));
      
      // Supprimer les contrôles existants
      Object.keys(boModelKeysGroup.controls).forEach(key => {
        boModelKeysGroup.removeControl(key);
      });
      
      // Ajouter les contrôles pour chaque modèle BO configuré
      this.editingModel!.reconciliationKeys!.boModels.forEach(boModelId => {
        const keys = this.editingModel!.reconciliationKeys?.boModelKeys?.[boModelId] || [];
        const control = this.fb.control(keys);
        boModelKeysGroup.addControl(`boKeys_${boModelId}`, control);
        console.log(`🔧 Contrôle BO initialisé: boKeys_${boModelId} =`, keys);
        console.log(`🔧 Contrôle créé:`, control);
        
        // Ajouter un listener pour détecter les changements
        control.valueChanges.subscribe(value => {
          console.log(`🔄 Changement détecté dans initializeBOModelKeys pour boKeys_${boModelId}:`, value);
        });
      });
      
      console.log('🔧 Contrôles BO initialisés:', Object.keys(boModelKeysGroup.controls));
      console.log('🔧 Valeurs des contrôles:', Object.keys(boModelKeysGroup.controls).map(key => ({
        control: key,
        value: boModelKeysGroup.get(key)?.value
      })));
    } else {
      console.log('❌ Conditions non remplies pour l\'initialisation des contrôles BO');
      console.log('  - Raison: fileType !== "partner" ou boModels manquant');
    }
  }

  private initializeBOTreatments(modelId: string): void {
    console.log(`🔧 initializeBOTreatments() appelé pour ${modelId}`);
    
    if (!this.editingModel?.reconciliationKeys?.boTreatments?.[modelId]) {
      console.log(`  - Aucun traitement sauvegardé pour ${modelId}`);
      return;
    }

    const treatmentArray = this.getBOTreatmentSteps(modelId);
    const savedTreatments = (this.editingModel.reconciliationKeys as any).boTreatments[modelId];
    
    console.log(`  - Traitements sauvegardés pour ${modelId}:`, savedTreatments);
    
    // Vider le tableau existant
    while (treatmentArray.length > 0) {
      treatmentArray.removeAt(0);
    }
    
    // Ajouter les traitements sauvegardés
    savedTreatments.forEach((treatment: any) => {
      const stepForm = this.fb.group({
        name: [treatment.name, Validators.required],
        type: [treatment.type, Validators.required],
        field: [treatment.field, Validators.required],
        action: [treatment.action, Validators.required],
        description: [treatment.description, Validators.required],
        // Paramètres de formatage
        locale: [treatment.params?.locale || 'fr-FR'],
        currency: [treatment.params?.currency || 'EUR'],
        dateFormat: [treatment.params?.dateFormat || 'yyyy-MM-dd'],
        position: [treatment.params?.position || 'start'],
        count: [treatment.params?.count || 1],
        characters: [treatment.params?.characters || ''],
        caseSensitive: [treatment.params?.caseSensitive || true],
        specificPosition: [treatment.params?.specificPosition || 1],
        // Paramètres d'extraction
        extractType: [treatment.params?.extractType || 'first'],
        extractCount: [treatment.params?.extractCount || 5],
        extractKey: [treatment.params?.extractKey || ''],
        extractStart: [treatment.params?.extractStart || 1],
        startChar: [treatment.params?.startChar || ''],
        endChar: [treatment.params?.endChar || ''],
        // Paramètres de concaténation
        newColumn: [treatment.params?.newColumn || 'concatenated'],
        separator: [treatment.params?.separator || ' '],
        // Paramètres de filtrage
        pattern: [treatment.params?.pattern || '.*'],
        values: [treatment.params?.values || ''],
        value: [treatment.params?.value || ''],
        // Paramètres de validation
        validationDateFormat: [treatment.params?.validationDateFormat || 'yyyy-MM-dd']
      });
      
      treatmentArray.push(stepForm);
    });
    
    console.log(`  - Traitements initialisés pour ${modelId}:`, treatmentArray.length);
  }

  saveModel(): void {
    if (this.modelForm.valid) {
      this.loading = true;
      this.errorMessage = '';

      const formValue = this.modelForm.value;
      
      // Récupérer les étapes de traitement
      console.log('🔧 saveModel() - Nombre d\'étapes dans le formulaire:', this.processingStepsFormArray.length);
      console.log('🔧 saveModel() - Valeurs des étapes:', this.processingStepsFormArray.value);
      
      const processingSteps = this.processingStepsFormArray.value.map((step: any, index: number) => {
        console.log(`🔧 saveModel() - Traitement de l'étape ${index + 1}:`, step);
        
        const stepData = {
          name: step.name,
          type: step.type,
          action: step.action,
          field: step.field,
          description: step.description, // Ajouter la description
          params: {}
        };

        // Ajouter les paramètres selon le type d'action
        if (step.action === 'removeSpecificCharacters') {
          stepData.params = {
            characters: step.characters || '',
            position: step.position || 'anywhere'
          };
        } else if (step.action === 'formatAmount') {
          stepData.params = {
            decimalPlaces: step.decimalPlaces || 2,
            currency: step.currency || 'XOF'
          };
        } else if (step.action === 'extractFirst') {
          stepData.params = {
            searchKey: step.searchKey || '',
            sourceColumn: step.sourceColumn || ''
          };
        } else if (step.action === 'extractAfterKey') {
          stepData.params = {
            searchKey: step.searchKey || '',
            sourceColumn: step.sourceColumn || ''
          };
        } else if (step.action === 'filterByColumn') {
          stepData.params = {
            filterColumn: step.filterColumn || '',
            filterValues: step.filterValues || []
          };
        } else if (step.action === 'filterByMultipleValues') {
          stepData.params = {
            filterColumn: step.filterColumn || '',
            filterValues: step.filterValues || []
          };
        } else if (step.action === 'exportByType') {
          stepData.params = {
            exportColumn: step.exportColumn || '',
            exportValues: step.exportValues || [],
            exportSuffix: step.exportSuffix || '',
            exportDescription: step.exportDescription || ''
          };
        } else if (step.action === 'filterByValue') {
          stepData.params = {
            values: step.params?.values || []
          };
        }

        return stepData;
      });

      // Vérifier et supprimer les doublons dans les étapes
      const uniqueSteps: any[] = [];
      const seenSteps = new Set();
      
      processingSteps.forEach((step: any) => {
        const stepKey = `${step.name}_${step.type}_${step.action}`;
        if (!seenSteps.has(stepKey)) {
          seenSteps.add(stepKey);
          uniqueSteps.push(step);
        } else {
          console.log(`⚠️ saveModel() - Étape dupliquée détectée et supprimée: ${step.name}`);
        }
      });
      
      console.log(`🔧 saveModel() - Étapes uniques à sauvegarder: ${uniqueSteps.length}`);

      // Configuration des clés de réconciliation pour modèle partenaire
      let reconciliationKeys: any = null;
       if (formValue.fileType === 'partner') {
         const selectedBOModels = this.getSelectedBOModels();

        reconciliationKeys = {
          partnerKeys: formValue.reconciliationKeys?.partnerKeys || [],
          boModels: selectedBOModels.map(m => m.id),
          boModelKeys: {},
          boTreatments: {}
        };

        // Récupérer les clés pour chaque modèle BO
        const boModelKeysControls = formValue.reconciliationKeys?.boModelKeys || {};
        
        console.log('🔧 saveModel() - Récupération des clés BO:');
        console.log('  - boModelKeysControls:', boModelKeysControls);
        console.log('  - selectedBOModels:', selectedBOModels.map(m => ({ id: m.id, name: m.name })));
         
        selectedBOModels.forEach(boModel => {
          const controlKey = `boKeys_${boModel.id}`;
          const control = boModelKeysControls[controlKey];

          console.log(`  - Traitement du modèle BO ${boModel.name} (${boModel.id}):`);
          console.log(`    - controlKey: ${controlKey}`);
          console.log(`    - control trouvé: ${!!control}`);
          console.log(`    - control value:`, control);

          if (control && Array.isArray(control)) {
            const keys = control;
            reconciliationKeys.boModelKeys[boModel.id] = keys;
            console.log(`    - ✅ Clés sauvegardées pour ${boModel.name}:`, keys);

            // Récupérer les traitements BO
            const boTreatments = this.getBOTreatmentSteps(boModel.id.toString()).value;
            reconciliationKeys.boTreatments[boModel.id] = boTreatments;
            console.log(`    - ✅ Traitements sauvegardés pour ${boModel.name}:`, boTreatments);
          } else {
            console.log(`    - ⚠️ Aucune clé trouvée pour ${boModel.name}`);
          }
        });
       }

      const modelData = {
        ...formValue,
        processingSteps: uniqueSteps, // Utiliser les étapes uniques
        reconciliationKeys
      };

      console.log('💾 Données du modèle à sauvegarder:', modelData);
      console.log('🔧 Étapes de traitement à sauvegarder:', processingSteps);
      console.log('🔍 Filtres BO dans reconciliationKeys:', reconciliationKeys?.boColumnFilters);
      console.log('🔍 Nombre de filtres BO:', reconciliationKeys?.boColumnFilters?.length || 0);
      
      if (reconciliationKeys?.boColumnFilters && reconciliationKeys.boColumnFilters.length > 0) {
        console.log('✅ Filtres BO trouvés dans le modèle:');
        reconciliationKeys.boColumnFilters.forEach((filter: any, index: number) => {
          console.log(`  - Filtre ${index + 1}:`, filter);
        });
      } else {
        console.log('❌ Aucun filtre BO trouvé dans le modèle');
      }

      const operation = this.editingModel 
        ? this.autoProcessingService.updateModel(this.editingModel.id, modelData)
        : this.autoProcessingService.createModel(modelData);

      operation.subscribe({
        next: (response: any) => {
          this.loading = false;
          
          // Vérifier si la réponse contient un ID (succès) ou une propriété success
          const isSuccess = response && (response.id || response.success);
          
          if (isSuccess) {
            this.showAlert(
              this.editingModel 
                ? 'Modèle mis à jour avec succès !' 
                : 'Modèle créé avec succès !', 
              'success'
            );
            this.closeForm();
            this.loadModels();
          } else {
            this.errorMessage = (response && response.message) || 'Erreur lors de la sauvegarde';
          }
        },
        error: (error) => {
          this.loading = false;
          console.error('Erreur lors de la sauvegarde:', error);
          this.errorMessage = 'Erreur lors de la sauvegarde du modèle';
        }
      });
    }
  }

  deleteModel(id: string): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce modèle ?')) {
      this.autoProcessingService.deleteModel(id).subscribe({
        next: (success) => {
          if (success) {
            this.loadModels();
          } else {
            this.errorMessage = 'Erreur lors de la suppression du modèle';
          }
        },
        error: (error) => {
          console.error('Erreur lors de la suppression du modèle:', error);
          this.errorMessage = 'Erreur lors de la suppression du modèle';
        }
      });
    }
  }

  closeForm(): void {
    console.log('🔧 closeForm() appelé - réinitialisation complète du formulaire');
    
    this.showCreateForm = false;
    this.editingModel = null;
    
    // Réinitialiser complètement le formulaire
    this.modelForm.reset({
      fileType: 'bo',
      autoApply: true,
      processingSteps: []
    });
    
    // S'assurer que le FormArray des étapes est complètement vidé
    this.processingStepsFormArray.clear();
    
    // Nettoyer les traitements BO si présents
    const boTreatmentsGroup = this.modelForm.get('reconciliationKeys.boTreatments') as FormGroup;
    if (boTreatmentsGroup) {
      Object.keys(boTreatmentsGroup.controls).forEach(key => {
        const treatmentArray = boTreatmentsGroup.get(key) as FormArray;
        if (treatmentArray) {
          treatmentArray.clear();
        }
      });
    }
    
    this.selectedFileModel = null;
    
    // Réinitialiser la carte des clés BO
    this.boModelKeysMap = {};
    
    console.log('✅ Formulaire complètement réinitialisé');
    // Ne pas vider availableColumns pour maintenir les colonnes disponibles
    // this.availableColumns = [];
  }

  clearError(): void {
    this.errorMessage = '';
  }

  // Test d'un modèle
  testModel(model: AutoProcessingModel): void {
    // Ici vous pouvez ajouter la logique pour tester le modèle
    console.log('Test du modèle:', model);
  }

  // Obtenir le nombre d'étapes d'un modèle
  getStepCount(model: AutoProcessingModel): number {
    return model.processingSteps.length;
  }

  // Obtenir la description des étapes
  getStepDescriptions(model: AutoProcessingModel): string {
    return model.processingSteps.map(step => step.name).join(', ');
  }

  // Nouvelles méthodes pour la configuration des modèles BO
  getAvailableBOModels(): AutoProcessingModel[] {
    return this.models.filter(model => model.fileType === 'bo');
  }

  getSelectedBOModels(): AutoProcessingModel[] {
    const selectedIds = this.modelForm.get('reconciliationKeys.boModels')?.value || [];
    return this.getAvailableBOModels().filter(model => selectedIds.includes(model.id));
  }

  getBOModelColumns(boModel: AutoProcessingModel): string[] {
    // Retourner les colonnes du modèle BO basées sur son templateFile
    if (boModel.templateFile) {
      const fileModel = this.availableFiles.find(f => f.fileName === boModel.templateFile);
      const columns = fileModel?.columns || [];
      return columns;
    }
    return [];
  }

  // Propriété calculée pour éviter les appels répétés dans le template
  getBOModelColumnsForTemplate(): { [key: string]: string[] } {
    const result: { [key: string]: string[] } = {};
    this.getAvailableBOModels().forEach(boModel => {
      result[boModel.id] = this.getBOModelColumns(boModel);
    });
    return result;
  }

  // Méthode pour gérer les changements de sélection des modèles BO
  onBOModelsChange(): void {
    console.log('🔄 onBOModelsChange() appelé');
    const selectedModels = this.getSelectedBOModels();
    const boModelKeysGroup = this.modelForm.get('reconciliationKeys.boModelKeys') as FormGroup;
    
    console.log('  - Modèles BO sélectionnés:', selectedModels);
    console.log('  - Contrôles existants:', Object.keys(boModelKeysGroup.controls));
    
    // Sauvegarder les valeurs existantes avant de modifier les contrôles
    const existingValues: { [key: string]: string[] } = {};
    Object.keys(boModelKeysGroup.controls).forEach(key => {
      const control = boModelKeysGroup.get(key);
      if (control) {
        existingValues[key] = control.value || [];
        console.log(`  - Sauvegarde de ${key}:`, existingValues[key]);
      }
    });
    
    // Obtenir les IDs des contrôles actuels
    const currentControlIds = new Set(Object.keys(boModelKeysGroup.controls).map(key => key.replace('boKeys_', '')));
    const newSelectedModelIds = new Set(selectedModels.map(model => model.id));
    
    // Supprimer les contrôles pour les modèles désélectionnés
    currentControlIds.forEach(controlId => {
      if (!newSelectedModelIds.has(controlId)) {
        boModelKeysGroup.removeControl(`boKeys_${controlId}`);
        console.log(`  - Contrôle supprimé: boKeys_${controlId}`);
      }
    });
    
    // Ajouter les contrôles pour les nouveaux modèles sélectionnés ou mettre à jour les existants
    selectedModels.forEach(model => {
      const controlKey = `boKeys_${model.id}`;
      if (!boModelKeysGroup.contains(controlKey)) {
        // Récupérer les valeurs existantes depuis plusieurs sources
        let existingKeys: string[] = [];
        
        // 1. Depuis les valeurs sauvegardées du formulaire
        if (existingValues[controlKey]) {
          existingKeys = existingValues[controlKey];
          console.log(`  - Valeurs récupérées du formulaire pour ${model.id}:`, existingKeys);
        }
        // 2. Depuis le modèle en édition
        else if (this.editingModel?.reconciliationKeys?.boModelKeys?.[model.id]) {
          existingKeys = this.editingModel.reconciliationKeys.boModelKeys[model.id];
          console.log(`  - Valeurs récupérées du modèle en édition pour ${model.id}:`, existingKeys);
        }
        
        const control = this.fb.control(existingKeys);
        boModelKeysGroup.addControl(controlKey, control);
        console.log(`  - Contrôle ajouté: ${controlKey} avec valeurs:`, existingKeys);
        console.log(`  - Contrôle créé:`, control);
        console.log(`  - Contrôle dans le FormGroup:`, boModelKeysGroup.get(controlKey));
        
        // Ajouter un listener pour détecter les changements immédiatement
        const attachedControl = boModelKeysGroup.get(controlKey);
        if (attachedControl) {
          attachedControl.valueChanges.subscribe(value => {
            console.log(`🔄 Changement détecté pour ${controlKey}:`, value);
            console.log(`  - Type de valeur:`, typeof value);
            console.log(`  - Longueur du tableau:`, Array.isArray(value) ? value.length : 'N/A');
          });
          console.log(`  - Listener attaché immédiatement pour ${controlKey}`);
          console.log(`  - Valeur initiale du contrôle:`, attachedControl.value);
        } else {
          console.log(`  - ❌ Contrôle non trouvé immédiatement: ${controlKey}`);
        }
      }
      
      // Initialiser les traitements BO si nécessaire
      this.initializeBOTreatments(model.id);
    });
    
    console.log('  - Contrôles après mise à jour:', Object.keys(boModelKeysGroup.controls));
    
    // Forcer la mise à jour du formulaire pour s'assurer que les contrôles sont bien attachés
    this.modelForm.updateValueAndValidity();
    console.log('  - Formulaire mis à jour');
    
    // Forcer la détection des changements
    this.modelForm.markAsTouched();
    this.modelForm.markAsDirty();
    
    // Mettre à jour la carte des clés BO
    this.updateBOModelKeysMap();
    
    // Log de l'état final du FormGroup boModelKeys
    console.log('  - État final du FormGroup boModelKeys:');
    Object.keys(boModelKeysGroup.controls).forEach(key => {
      const control = boModelKeysGroup.get(key);
      console.log(`    - ${key}:`, control?.value);
    });
    
    // Vérification supplémentaire après un court délai
    setTimeout(() => {
      console.log('  - Vérification finale des contrôles:');
      Object.keys(boModelKeysGroup.controls).forEach(key => {
        const control = boModelKeysGroup.get(key);
        console.log(`    - ${key}:`, control?.value);
      });
    }, 100);
  }

  // Méthode pour obtenir les clés d'un modèle BO spécifique
  getBOModelKeys(modelId: string): string[] {
    const boModelKeysGroup = this.modelForm.get('reconciliationKeys.boModelKeys') as FormGroup;
    const control = boModelKeysGroup.get(`boKeys_${modelId}`);
    const value = control?.value || [];
    
    return value;
  }

  // Propriété pour stocker les clés BO (évite les appels multiples dans le template)
  boModelKeysMap: { [key: string]: string[] } = {};

  // Méthode pour mettre à jour la carte des clés BO
  updateBOModelKeysMap(): void {
    const boModelKeysGroup = this.modelForm.get('reconciliationKeys.boModelKeys') as FormGroup;
    this.boModelKeysMap = {};
    
    Object.keys(boModelKeysGroup.controls).forEach(key => {
      const modelId = key.replace('boKeys_', '');
      const control = boModelKeysGroup.get(key);
      this.boModelKeysMap[modelId] = control?.value || [];
    });
  }

  // Méthode pour obtenir les clés sélectionnées pour un modèle spécifique
  getSelectedKeysForModel(modelId: string): string[] {
    return this.boModelKeysMap[modelId] || [];
  }

     // Méthode pour mettre à jour la validation des clés de réconciliation selon le type
   updateReconciliationKeysValidation(fileType: string): void {
     const reconciliationKeysGroup = this.modelForm.get('reconciliationKeys') as FormGroup;
     const partnerKeysControl = reconciliationKeysGroup.get('partnerKeys');
     const boModelsControl = reconciliationKeysGroup.get('boModels');

     // Réinitialiser les validations
     partnerKeysControl?.clearValidators();
     boModelsControl?.clearValidators();

     // Appliquer les validations uniquement pour les modèles partenaire
     if (fileType === 'partner') {
       partnerKeysControl?.setValidators([Validators.required]);
       boModelsControl?.setValidators([Validators.required]);
     }

     // Mettre à jour les contrôles
     partnerKeysControl?.updateValueAndValidity();
     boModelsControl?.updateValueAndValidity();
   }



     // Méthode pour détecter les changements de sélection des clés BO
  onBOKeysChange(modelId: string, event: any): void {
    console.log('🎯 onBOKeysChange() appelé pour:', modelId);
    console.log('  - Événement:', event);
    console.log('  - Target:', event.target);
    console.log('  - Selected options:', event.target.selectedOptions);
    
    const selectedOptions = Array.from(event.target.selectedOptions).map((option: any) => {
      // Nettoyer la valeur si elle contient des informations supplémentaires
      let value = option.value;
      console.log(`  - Option value brute: "${value}"`);
      if (value.includes(": '") && value.includes("'")) {
        // Extraire la valeur entre les guillemets
        const match = value.match(/: '([^']+)'/);
        if (match) {
          value = match[1];
          console.log(`  - Valeur nettoyée: "${value}"`);
        }
      }
      return value;
    });
    console.log('  - Valeurs sélectionnées (nettoyées):', selectedOptions);
    
    // Mettre à jour le contrôle du formulaire
    const boModelKeysGroup = this.modelForm.get('reconciliationKeys.boModelKeys') as FormGroup;
    const controlKey = `boKeys_${modelId}`;
    const control = boModelKeysGroup.get(controlKey);
    
    console.log('  - État du FormGroup boModelKeys:', {
      controls: Object.keys(boModelKeysGroup.controls),
      controlKey: controlKey,
      controlExists: !!control,
      controlValue: control?.value
    });
    
    if (control) {
      console.log('  - Contrôle trouvé, mise à jour de la valeur');
      console.log('  - Valeur avant mise à jour:', control.value);
      control.setValue(selectedOptions);
      console.log('  - Valeur du contrôle après mise à jour:', control.value);
      
      // Mettre à jour la carte des clés BO
      this.updateBOModelKeysMap();
      
      // Vérifier que la valeur a bien été mise à jour
      setTimeout(() => {
        const updatedControl = boModelKeysGroup.get(controlKey);
        console.log('  - Vérification après timeout - Valeur du contrôle:', updatedControl?.value);
        console.log('  - État final du FormGroup:', {
          controls: Object.keys(boModelKeysGroup.controls),
          values: Object.keys(boModelKeysGroup.controls).map(key => ({
            key: key,
            value: boModelKeysGroup.get(key)?.value
           }))
         });
       }, 50);
     } else {
       console.log('  - ❌ Contrôle non trouvé!');
       console.log('  - Contrôles disponibles:', Object.keys(boModelKeysGroup.controls));
     }
   }

   // Méthodes pour les traitements BO
   getBOTreatmentSteps(modelId: string): FormArray {
     const boTreatmentsGroup = this.modelForm.get('reconciliationKeys.boTreatments') as FormGroup;
     const treatmentKey = `boTreatments_${modelId}`;
     let treatmentArray = boTreatmentsGroup.get(treatmentKey) as FormArray;
     
     if (!treatmentArray) {
       treatmentArray = this.fb.array([]);
       boTreatmentsGroup.addControl(treatmentKey, treatmentArray);
     }
     
     return treatmentArray;
   }

   getBOTreatmentStepsArray(modelId: string): any[] {
     return this.getBOTreatmentSteps(modelId).controls;
   }

   getBOTreatmentStep(modelId: string, index: number): FormGroup | null {
     const treatmentArray = this.getBOTreatmentSteps(modelId);
     return treatmentArray.at(index) as FormGroup;
   }

   addBOTreatmentStep(modelId: string): void {
     const treatmentArray = this.getBOTreatmentSteps(modelId);
     const stepForm = this.fb.group({
       name: ['', Validators.required],
       type: ['format', Validators.required],
       field: [[], Validators.required],
       action: ['', Validators.required],
       description: ['', Validators.required],
       // Paramètres de formatage
       locale: ['fr-FR'],
       currency: ['EUR'],
       dateFormat: ['yyyy-MM-dd'],
       position: ['start'],
       count: [1],
       characters: [''],
       caseSensitive: [true],
       specificPosition: [1],
       // Paramètres d'extraction
       extractType: ['first'],
       extractCount: [5],
       extractKey: [''],
       extractStart: [1],
       startChar: [''],
       endChar: [''],
       // Paramètres de concaténation
       newColumn: ['concatenated'],
       separator: [' '],
       // Paramètres de filtrage
       pattern: ['.*'],
       values: [''],
       value: [''],
       // Paramètres de validation
       validationDateFormat: ['yyyy-MM-dd']
     });
     
     treatmentArray.push(stepForm);
   }

   removeBOTreatmentStep(modelId: string, index: number): void {
     const treatmentArray = this.getBOTreatmentSteps(modelId);
     treatmentArray.removeAt(index);
   }

   onBOTreatmentTypeChange(modelId: string, index: number): void {
     const step = this.getBOTreatmentStep(modelId, index);
     if (step) {
       // Réinitialiser l'action quand le type change
       step.get('action')?.setValue('');
       
       // Forcer la détection de changement d'Angular
       step.markAsTouched();
       step.updateValueAndValidity();
       
       // Forcer la détection de changement du formulaire parent
       this.modelForm.updateValueAndValidity();
     }
   }

   // Méthode pour obtenir le type sélectionné d'un traitement BO
   getBOTreatmentType(modelId: string, index: number): string {
     const step = this.getBOTreatmentStep(modelId, index);
     return step?.get('type')?.value || '';
   }

     // Méthode pour obtenir les actions d'un traitement BO
  getBOTreatmentActions(modelId: string, index: number): any[] {
    const type = this.getBOTreatmentType(modelId, index);
    const actions = this.getActionsForType(type);
    
    // Si c'est un type qui nécessite des colonnes (select, concat, etc.)
    if (type === 'select' || type === 'transform') {
      // Trouver le modèle BO correspondant
      const boModel = this.models.find(m => m.id === modelId);
      if (boModel) {
        // Si le modèle BO n'a pas de templateFile, essayer de le définir
        if (!boModel.templateFile && this.availableFiles.length > 0) {
          // Chercher un fichier qui pourrait correspondre au modèle BO
          const matchingFile = this.availableFiles.find(f => 
            f.fileName.toLowerCase().includes(boModel.name.toLowerCase()) ||
            boModel.name.toLowerCase().includes(f.fileName.toLowerCase())
          );
          if (matchingFile) {
            boModel.templateFile = matchingFile.fileName;
          }
        }
      }
    }
    
    return actions;
  }

  // Nettoyer les modèles sans étapes de traitement
  cleanupModels(): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer tous les modèles sans étapes de traitement ?')) {
      this.autoProcessingService.cleanupModelsWithoutSteps().subscribe({
        next: () => {
          console.log('✅ Nettoyage terminé');
          this.loadModels();
        },
        error: (error) => {
          console.error('❌ Erreur lors du nettoyage:', error);
          this.errorMessage = 'Erreur lors du nettoyage des modèles';
        }
      });
    }
  }

  // Créer un modèle BO par défaut
  createDefaultBOModel(): void {
    console.log('🔧 createDefaultBOModel() appelé');
    this.autoProcessingService.createDefaultBOModel().subscribe({
      next: (model) => {
        console.log('✅ Modèle BO créé avec succès:', model);
        this.showAlert('Modèle BO TRXBO créé avec succès', 'success');
        this.loadModels();
      },
      error: (error) => {
        console.error('❌ Erreur lors de la création du modèle BO:', error);
        this.showAlert('Erreur lors de la création du modèle BO', 'danger');
      }
    });
  }

  createDefaultOrangeMoneyModel(): void {
    console.log('🔧 createDefaultOrangeMoneyModel() appelé');
    this.autoProcessingService.createDefaultOrangeMoneyModel().subscribe({
      next: (model) => {
        console.log('✅ Modèle Orange Money créé avec succès:', model);
        this.showAlert('Modèle Orange Money créé avec succès', 'success');
        this.loadModels();
      },
      error: (error) => {
        console.error('❌ Erreur lors de la création du modèle Orange Money:', error);
        this.showAlert('Erreur lors de la création du modèle Orange Money', 'danger');
      }
    });
  }

  createExtendedCIOMModel(): void {
    console.log('🔧 createExtendedCIOMModel() appelé');
    this.autoProcessingService.createExtendedCIOMModel().subscribe({
      next: (model) => {
        console.log('✅ Modèle CIOM/PMOM étendu créé avec succès:', model);
        this.showAlert('Modèle CIOM/PMOM étendu créé avec succès', 'success');
        this.loadModels();
      },
      error: (error) => {
        console.error('❌ Erreur lors de la création du modèle CIOM/PMOM étendu:', error);
        this.showAlert('Erreur lors de la création du modèle CIOM/PMOM étendu', 'danger');
      }
    });
  }

  fixReconciliationKeys(): void {
    this.autoProcessingService.fixReconciliationKeys().subscribe({
      next: (response: any) => {
        console.log('✅ Clés de réconciliation corrigées:', response);
        this.loadModels();
        this.showAlert(`Clés corrigées: ${response.fixedModels} modèles sur ${response.totalModels}`, 'success');
      },
      error: (error: any) => {
        console.error('❌ Erreur lors de la correction des clés:', error);
        this.showAlert('Erreur lors de la correction des clés', 'danger');
      }
    });
  }

  showAlert(message: string, type: 'success' | 'danger' | 'warning' | 'info'): void {
    // Implémentation simple d'alerte - vous pouvez l'améliorer selon vos besoins
    alert(`${type.toUpperCase()}: ${message}`);
  }

  // --- MÉTHODES DE FILTRAGE DES MODÈLES PARTENAIRES ---

  // Obtenir les modèles partenaires
  getPartnerModels(): AutoProcessingModel[] {
    return this.models.filter(model => model.fileType === 'partner' || model.fileType === 'both');
  }

  // Obtenir les modèles partenaires filtrés
  getDisplayedPartnerModels(): AutoProcessingModel[] {
    if (this.partnerFilterApplied) {
      return this.filteredPartnerModels;
    }
    return this.getPartnerModels();
  }

  // Basculer l'affichage du filtre
  togglePartnerFilter(): void {
    this.showPartnerFilter = !this.showPartnerFilter;
    if (!this.showPartnerFilter) {
      this.resetPartnerFilter();
    }
  }

  // Changer la colonne de filtre
  onPartnerFilterColumnChange(): void {
    this.selectedPartnerFilterValues = [];
    this.partnerFilterValues = [];
    
    if (this.selectedPartnerFilterColumn) {
      // Extraire les valeurs uniques de la colonne sélectionnée
      const partnerModels = this.getPartnerModels();
      const values = new Set<string>();
      
      partnerModels.forEach(model => {
        const value = this.getModelValueByColumn(model, this.selectedPartnerFilterColumn);
        if (value !== undefined && value !== null) {
          values.add(String(value));
        }
      });
      
      this.partnerFilterValues = Array.from(values).sort();
      this.partnerFilterValueSearchCtrl.setValue('');
    }
  }

  // Obtenir la valeur d'un modèle selon la colonne
  getModelValueByColumn(model: AutoProcessingModel, column: string): any {
    switch (column) {
      case 'name':
        return model.name;
      case 'filePattern':
        return model.filePattern;
      case 'fileType':
        return model.fileType;
      case 'autoApply':
        return model.autoApply ? 'Oui' : 'Non';
      case 'templateFile':
        return model.templateFile || '';
      case 'stepsCount':
        return model.processingSteps.length;
      default:
        return '';
    }
  }

  // Sélectionner toutes les valeurs de filtre
  selectAllPartnerFilterValues(): void {
    this.selectedPartnerFilterValues = [...this.partnerFilterValues];
  }

  // Appliquer le filtre partenaire (inclut le filtrage par pays)
  applyPartnerFilter(): void {
    let filteredModels = this.getPartnerModels();

    // Appliquer le filtre par colonne si sélectionné
    if (this.selectedPartnerFilterColumn && this.selectedPartnerFilterValues.length > 0) {
      filteredModels = filteredModels.filter(model => {
        const modelValue = this.getModelValueByColumn(model, this.selectedPartnerFilterColumn);
        return this.selectedPartnerFilterValues.includes(String(modelValue));
      });
    }

    // Appliquer le filtre par pays si sélectionné
    if (this.selectedPartnerCountries.length > 0) {
      filteredModels = filteredModels.filter(model => {
        const modelCountry = this.extractCountryCode(model.name);
        return this.selectedPartnerCountries.includes(modelCountry);
      });
    }

    this.filteredPartnerModels = filteredModels;
    this.partnerFilterApplied = true;
  }

  // Réinitialiser le filtre
  resetPartnerFilter(): void {
    this.selectedPartnerFilterColumn = '';
    this.selectedPartnerFilterValues = [];
    this.partnerFilterValues = [];
    this.filteredPartnerModels = [];
    this.partnerFilterApplied = false;
    this.partnerFilterValueSearchCtrl.setValue('');
    this.selectedPartnerCountries = [];
    this.partnerCountrySearchCtrl.setValue('');
  }

  // --- MÉTHODES DE FILTRAGE PAR PAYS DES MODÈLES PARTENAIRES ---

  // Extraire le code pays des deux dernières lettres du nom du modèle
  private extractCountryCode(modelName: string): string {
    if (!modelName || modelName.length < 2) return '';
    return modelName.slice(-2).toUpperCase();
  }

  // Obtenir tous les codes pays disponibles
  getAvailablePartnerCountries(): string[] {
    const partnerModels = this.getPartnerModels();
    const countries = new Set<string>();
    
    partnerModels.forEach(model => {
      const countryCode = this.extractCountryCode(model.name);
      if (countryCode) {
        countries.add(countryCode);
      }
    });
    
    return Array.from(countries).sort();
  }

  // Obtenir les pays filtrés pour la recherche
  get filteredPartnerCountries(): string[] {
    const searchTerm = this.partnerCountrySearchCtrl.value?.toLowerCase() || '';
    const allCountries = this.getAvailablePartnerCountries();
    
    if (!searchTerm) {
      return allCountries;
    }
    
    return allCountries.filter(country => 
      country.toLowerCase().includes(searchTerm)
    );
  }

  // Sélectionner tous les pays
  selectAllPartnerCountries(): void {
    this.selectedPartnerCountries = [...this.getAvailablePartnerCountries()];
  }

  // Gérer le changement de sélection des pays
  onPartnerCountryChange(): void {
    // Appliquer automatiquement le filtre par pays
    this.applyPartnerFilter();
  }

  // Obtenir les valeurs filtrées pour la recherche
  get filteredPartnerFilterValues(): string[] {
    const searchTerm = this.partnerFilterValueSearchCtrl.value?.toLowerCase() || '';
    if (!searchTerm) {
      return this.partnerFilterValues;
    }
    return this.partnerFilterValues.filter(value => 
      value.toLowerCase().includes(searchTerm)
    );
  }

  // Obtenir les colonnes disponibles pour le filtrage
  getPartnerFilterColumns(): { value: string; label: string }[] {
    return [
      { value: 'name', label: 'Nom du modèle' },
      { value: 'filePattern', label: 'Pattern de fichier' },
      { value: 'fileType', label: 'Type de fichier' },
      { value: 'autoApply', label: 'Auto-appliqué' },
      { value: 'templateFile', label: 'Fichier modèle' },
      { value: 'stepsCount', label: 'Nombre d\'étapes' }
    ];
  }

  // --- MÉTHODES DE FILTRAGE GÉNÉRAL (TOUS LES MODÈLES) ---

  // Basculer l'affichage du filtre général
  toggleModelFilter(): void {
    this.showModelFilter = !this.showModelFilter;
    if (!this.showModelFilter) {
      this.resetModelFilter();
    }
  }

  // Changer la colonne de filtre général
  onModelFilterColumnChange(): void {
    this.selectedModelFilterValues = [];
    this.modelFilterValues = [];
    
    if (this.selectedModelFilterColumn) {
      // Extraire les valeurs uniques de la colonne sélectionnée
      const values = new Set<string>();
      
      this.models.forEach(model => {
        const value = this.getModelValueByColumn(model, this.selectedModelFilterColumn);
        if (value !== undefined && value !== null) {
          values.add(String(value));
        }
      });
      
      this.modelFilterValues = Array.from(values).sort();
      this.modelFilterValueSearchCtrl.setValue('');
    }
  }

  // Sélectionner toutes les valeurs de filtre général
  selectAllModelFilterValues(): void {
    this.selectedModelFilterValues = [...this.modelFilterValues];
  }

  // Appliquer le filtre général
  applyModelFilter(): void {
    if (!this.selectedModelFilterColumn || this.selectedModelFilterValues.length === 0) {
      return;
    }

    this.filteredModels = this.models.filter(model => {
      const modelValue = this.getModelValueByColumn(model, this.selectedModelFilterColumn);
      return this.selectedModelFilterValues.includes(String(modelValue));
    });

    this.modelFilterApplied = true;
  }

  // Réinitialiser le filtre général
  resetModelFilter(): void {
    this.selectedModelFilterColumn = '';
    this.selectedModelFilterValues = [];
    this.modelFilterValues = [];
    this.filteredModels = [];
    this.modelFilterApplied = false;
    this.modelFilterValueSearchCtrl.setValue('');
  }

  // Obtenir les valeurs filtrées pour la recherche générale
  get filteredModelFilterValues(): string[] {
    const searchTerm = this.modelFilterValueSearchCtrl.value?.toLowerCase() || '';
    if (!searchTerm) {
      return this.modelFilterValues;
    }
    return this.modelFilterValues.filter(value => 
      value.toLowerCase().includes(searchTerm)
    );
  }

  // Obtenir les modèles affichés (avec ou sans filtre)
  getDisplayedModels(): AutoProcessingModel[] {
    if (this.modelFilterApplied) {
      return this.filteredModels;
    }
    return this.models;
  }

  // Méthodes de détection pour la coloration des modèles
  isCIModel(model: AutoProcessingModel): boolean {
    const name = model.name || '';
    const upperName = name.toUpperCase();
    const result = upperName.includes('CI') || upperName.includes('CIOM');
    console.log(`🔍 isCIModel - Nom: "${name}", Upper: "${upperName}", Résultat: ${result}`);
    return result;
  }

  isPMModel(model: AutoProcessingModel): boolean {
    const name = model.name || '';
    const upperName = name.toUpperCase();
    const result = upperName.includes('PM') || upperName.includes('PMOM');
    console.log(`🔍 isPMModel - Nom: "${name}", Upper: "${upperName}", Résultat: ${result}`);
    return result;
  }

  // Obtenir les colonnes disponibles pour le filtrage général
  getModelFilterColumns(): { value: string; label: string }[] {
    return [
      { value: 'name', label: 'Nom du modèle' },
      { value: 'filePattern', label: 'Pattern de fichier' },
      { value: 'fileType', label: 'Type de fichier' },
      { value: 'autoApply', label: 'Application automatique' },
      { value: 'templateFile', label: 'Fichier template' },
      { value: 'stepsCount', label: 'Nombre d\'étapes' }
    ];
  }

  // --- MÉTHODES POUR LE FILTRAGE DYNAMIQUE DES COLONNES BO ---

  // Méthode pour récupérer les valeurs uniques d'une colonne BO
  getBOColumnValues(boModelId: string, columnName: string): string[] {
    if (!boModelId || !columnName) {
      return [];
    }
    
    // Trouver le modèle BO
    const boModel = this.models.find(m => m.id.toString() === boModelId);
    if (!boModel) {
      return [];
    }
    
    // Si le modèle a un templateFile, utiliser ses données
    if (boModel.templateFile) {
      const fileModel = this.availableFiles.find(f => f.fileName === boModel.templateFile);
      
      if (fileModel && fileModel.sampleData) {
        // Extraire les valeurs uniques de la colonne
        const uniqueValues = new Set<string>();
        
        fileModel.sampleData.forEach((row) => {
          const value = row[columnName];
          if (value) {
            uniqueValues.add(value.toString());
          }
        });
        
        const result = Array.from(uniqueValues).sort();
        return result;
      }
    }
    
    // Fallback vers les données mockées
    return this.getMockColumnValues(columnName);
  }

  // Méthode pour obtenir des valeurs simulées selon la colonne
  private getMockColumnValues(columnName: string): string[] {
    const fileName = this.selectedFileModel?.fileName || this.editingModel?.templateFile;
    return this.orangeMoneyUtilsService.getFieldValues(columnName, fileName);
  }



  // Méthode pour gérer le changement de champ dans le filtrage par valeur
  async onFilterFieldChange(stepIndex: number): Promise<void> {
    console.log('🔍 onFilterFieldChange appelée pour stepIndex:', stepIndex);
    
    const step = this.processingStepsFormArray.at(stepIndex);
    const fieldName = step.get('field')?.value;
    
    console.log('🔍 fieldName sélectionné:', fieldName);
    console.log('🔍 availableColumnsForTemplate:', this.availableColumnsForTemplate);
    console.log('🔍 selectedFileModel:', this.selectedFileModel);
    console.log('🔍 editingModel:', this.editingModel);
    
    if (fieldName) {
      // Initialiser les valeurs sélectionnées pour cette étape
      this.initializeSelectedValuesForStep(stepIndex);
      
      // Si on n'a pas de données du fichier, essayer de les charger
      if (!this.selectedFileModel?.sampleData && this.editingModel?.templateFile) {
        console.log('🔄 Chargement des données du fichier pour obtenir les vraies valeurs');
        await this.loadFileDataForField(fieldName);
      } else if (this.selectedFileModel?.sampleData) {
        console.log('✅ Données déjà disponibles dans selectedFileModel');
        console.log('✅ sampleData length:', this.selectedFileModel.sampleData.length);
      } else {
        console.log('❌ Aucune donnée disponible');
      }
      
      // Forcer la détection des changements pour mettre à jour l'interface
      setTimeout(() => {
        console.log('🔄 Mise à jour de l\'interface après changement de champ');
        console.log('🔍 selectedFileModel après délai:', this.selectedFileModel);
        console.log('🔍 Valeurs disponibles maintenant:', this.getAvailableValuesForField(fieldName));
      }, 500); // Augmenté le délai pour s'assurer que les données sont chargées
    }
  }

  // Méthode synchrone pour le template (utilise les données en cache)
  getAvailableValuesForField(fieldName: string): string[] {
    // Normaliser le fieldName (gérer les tableaux)
    let normalizedFieldName = fieldName;
    if (Array.isArray(fieldName)) {
      normalizedFieldName = fieldName[0] || '';
    }
    
    if (!normalizedFieldName || normalizedFieldName === '' || normalizedFieldName === '[]') {
      return [];
    }

    // Utiliser les données en cache si disponibles
    if (this.selectedFileModel?.sampleData) {
      console.log('🔍 Utilisation des données en cache pour:', normalizedFieldName);
      console.log('🔍 sampleData length:', this.selectedFileModel.sampleData.length);
      console.log('🔍 Première ligne sampleData:', this.selectedFileModel.sampleData[0]);
      
      const uniqueValues = new Set<string>();
      
      this.selectedFileModel.sampleData.forEach((row: any, index: number) => {
        console.log(`🔍 Ligne ${index}:`, row);
        console.log(`🔍 Valeur pour ${normalizedFieldName}:`, row[normalizedFieldName]);
        
        if (row && typeof row === 'object' && row[normalizedFieldName] && row[normalizedFieldName] !== '') {
          uniqueValues.add(row[normalizedFieldName].toString());
          console.log(`✅ Valeur ajoutée: ${row[normalizedFieldName]}`);
        } else {
          console.log(`❌ Valeur ignorée pour ${normalizedFieldName}:`, row[normalizedFieldName]);
        }
      });
      
      const result = Array.from(uniqueValues).sort();
      console.log('🔍 Valeurs uniques trouvées:', result);
      
      if (result.length > 0) {
        console.log('✅ Retour des vraies valeurs:', result);
        return result;
      } else {
        console.log('❌ Aucune vraie valeur trouvée, utilisation des valeurs mockées');
      }
    }

    // Fallback vers les valeurs mockées
    return this.getMockColumnValues(normalizedFieldName);
  }

  // Méthode asynchrone pour obtenir les valeurs disponibles pour un champ (avec lecture directe)
  async getAvailableValuesForFieldAsync(fieldName: string): Promise<string[]> {
    console.log('🔍 getAvailableValuesForField appelée avec fieldName:', fieldName);
    console.log('🔍 selectedFileModel:', this.selectedFileModel);
    console.log('🔍 editingModel:', this.editingModel);
    console.log('🔍 availableFiles:', this.availableFiles);
    console.log('🔍 availableFiles.length:', this.availableFiles.length);
    
    // Normaliser le fieldName (gérer les tableaux)
    let normalizedFieldName = fieldName;
    if (Array.isArray(fieldName)) {
      normalizedFieldName = fieldName[0] || '';
      console.log('🔄 fieldName normalisé de tableau vers chaîne:', normalizedFieldName);
    }
    
    if (!normalizedFieldName || normalizedFieldName === '' || normalizedFieldName === '[]') {
      console.log('❌ fieldName est vide ou invalide:', normalizedFieldName);
      return [];
    }

    // Priorité 1: Utiliser les données du fichier sélectionné
    if (this.selectedFileModel?.sampleData) {
      console.log('✅ Utilisation des données du fichier sélectionné');
      console.log('📊 sampleData length:', this.selectedFileModel.sampleData.length);
      console.log('📊 Colonnes du fichier:', this.selectedFileModel.columns);
      console.log('📊 Champ recherché:', normalizedFieldName);
      console.log('📊 Champ existe dans les colonnes?', this.selectedFileModel.columns.includes(normalizedFieldName));
      
      const uniqueValues = new Set<string>();
      
      this.selectedFileModel.sampleData.forEach((row: any, index: number) => {
        console.log(`🔍 Ligne ${index} complète:`, row);
        
        // Essayer différentes façons d'accéder à la valeur
        let value = null;
        
        // Méthode 1: Accès direct par nom de champ
        if (row && typeof row === 'object') {
          value = row[normalizedFieldName];
          console.log(`📋 Méthode 1 - ${normalizedFieldName}:`, value);
        }
        
        // Méthode 2: Si c'est un tableau, essayer l'index
        if (value === undefined && Array.isArray(row) && this.selectedFileModel?.columns) {
          const columnIndex = this.selectedFileModel.columns.indexOf(normalizedFieldName);
          if (columnIndex >= 0) {
            value = row[columnIndex];
            console.log(`📋 Méthode 2 - Index ${columnIndex}:`, value);
          }
        }
        
        // Méthode 3: Recherche insensible à la casse
        if (value === undefined && row && typeof row === 'object') {
          const keys = Object.keys(row);
          const matchingKey = keys.find(key => key.toLowerCase() === normalizedFieldName.toLowerCase());
          if (matchingKey) {
            value = row[matchingKey];
            console.log(`📋 Méthode 3 - Clé trouvée ${matchingKey}:`, value);
          }
        }
        
        console.log(`📋 Valeur finale pour ${normalizedFieldName}:`, value);
        
        if (value !== null && value !== undefined && value !== '') {
          uniqueValues.add(value.toString());
        }
      });
      
      const result = Array.from(uniqueValues).sort();
      console.log('✅ Valeurs uniques trouvées:', result);
      
      // Si aucune valeur trouvée, essayer avec les valeurs mockées
      if (result.length === 0) {
        console.log('⚠️ Aucune valeur trouvée, utilisation des valeurs mockées');
        console.log('⚠️ Le champ', normalizedFieldName, 'n\'existe pas dans les colonnes:', this.selectedFileModel.columns);
        const mockValues = this.getMockColumnValues(normalizedFieldName);
        console.log('✅ Valeurs mockées utilisées:', mockValues);
        return mockValues;
      }
      
      return result;
    }

    // Priorité 2: Utiliser les données du modèle en édition
    if (this.editingModel && this.editingModel.templateFile) {
      console.log('🔍 Recherche du fichier modèle dans availableFiles');
      const fileModel = this.availableFiles.find(f => f.fileName === this.editingModel?.templateFile);
      
      if (fileModel && fileModel.sampleData) {
        console.log('✅ Utilisation des données du fichier modèle en édition');
        console.log('📊 sampleData length:', fileModel.sampleData.length);
        
        const uniqueValues = new Set<string>();
        
        console.log('🔍 Structure des données sampleData:', fileModel.sampleData);
        console.log('🔍 Première ligne complète:', fileModel.sampleData[0]);
        console.log('🔍 Colonnes disponibles dans la première ligne:', Object.keys(fileModel.sampleData[0] || {}));
        console.log('🔍 Colonnes du fichier modèle:', fileModel.columns);
        console.log('🔍 Champ recherché:', normalizedFieldName);
        console.log('🔍 Champ existe dans les colonnes?', fileModel.columns.includes(normalizedFieldName));
        
        fileModel.sampleData.forEach((row: any, index: number) => {
          console.log(`🔍 Ligne ${index} complète:`, row);
          
          // Essayer différentes façons d'accéder à la valeur
          let value = null;
          
          // Méthode 1: Accès direct par nom de champ
          if (row && typeof row === 'object') {
            value = row[normalizedFieldName];
            console.log(`📋 Méthode 1 - ${normalizedFieldName}:`, value);
          }
          
          // Méthode 2: Si c'est un tableau, essayer l'index
          if (value === undefined && Array.isArray(row)) {
            const columnIndex = fileModel.columns.indexOf(normalizedFieldName);
            if (columnIndex >= 0) {
              value = row[columnIndex];
              console.log(`📋 Méthode 2 - Index ${columnIndex}:`, value);
            }
          }
          
          // Méthode 3: Recherche insensible à la casse
          if (value === undefined && row && typeof row === 'object') {
            const keys = Object.keys(row);
            const matchingKey = keys.find(key => key.toLowerCase() === normalizedFieldName.toLowerCase());
            if (matchingKey) {
              value = row[matchingKey];
              console.log(`📋 Méthode 3 - Clé trouvée ${matchingKey}:`, value);
            }
          }
          
          console.log(`📋 Valeur finale pour ${normalizedFieldName}:`, value);
          
          if (value !== null && value !== undefined && value !== '') {
            uniqueValues.add(value.toString());
          }
        });
        
        const result = Array.from(uniqueValues).sort();
        console.log('✅ Valeurs uniques trouvées:', result);
        
        // Si aucune valeur trouvée, essayer avec les valeurs mockées
        if (result.length === 0) {
          console.log('⚠️ Aucune valeur trouvée, utilisation des valeurs mockées');
          console.log('⚠️ Le champ', normalizedFieldName, 'n\'existe pas dans les colonnes:', fileModel.columns);
          const mockValues = this.getMockColumnValues(normalizedFieldName);
          console.log('✅ Valeurs mockées utilisées:', mockValues);
          return mockValues;
        }
        
        return result;
      }
    }

    // Priorité 3: Essayer de lire directement le fichier Excel si c'est un fichier Excel
    if (this.selectedFileModel && this.selectedFileModel.fileName.toLowerCase().endsWith('.xls')) {
      console.log('🔄 Tentative de lecture directe du fichier Excel:', this.selectedFileModel.fileName);
      
      try {
        // Créer un objet File à partir du chemin du fichier
        const filePath = this.selectedFileModel.filePath;
        const fileName = this.selectedFileModel.fileName;
        
        // Essayer de récupérer le fichier depuis le dossier watch-folder
        const response = await fetch(`/api/file-watcher/analyze-file`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ filePath })
        });
        
        if (response.ok) {
          const fileData = await response.json();
          console.log('📊 Données du fichier récupérées:', fileData);
          
          // Si les données contiennent des vraies valeurs, les utiliser
          if (fileData.sampleData && fileData.sampleData.length > 0) {
            const uniqueValues = new Set<string>();
            
            fileData.sampleData.forEach((row: any) => {
              if (row && row[normalizedFieldName] && row[normalizedFieldName] !== '') {
                uniqueValues.add(row[normalizedFieldName].toString());
              }
            });
            
            const result = Array.from(uniqueValues).sort();
            if (result.length > 0) {
              console.log('✅ Valeurs trouvées dans le fichier Excel:', result);
              return result;
            }
          }
        }
      } catch (error) {
        console.error('❌ Erreur lors de la lecture directe du fichier Excel:', error);
      }
    }

    // Fallback vers les données mockées
    console.log('🔄 Utilisation des données mockées pour:', normalizedFieldName);
    const mockValues = this.getMockColumnValues(normalizedFieldName);
    console.log('✅ Valeurs mockées:', mockValues);
    return mockValues;
  }

  // Méthode pour lire directement un fichier Excel et extraire les vraies données
  async readExcelFileDirectly(file: File): Promise<{ columns: string[], sampleData: any[] }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Convertir en JSON pour faciliter le traitement
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          console.log('📊 Fichier Excel lu directement:', {
            sheetName,
            totalRows: jsonData.length,
            firstRow: jsonData[0]
          });
          
          // Détecter les en-têtes Orange Money
          let headerRowIndex = -1;
          let headerRow: string[] = [];
          
          // Chercher la ligne d'en-têtes Orange Money
          for (let i = 0; i < Math.min(50, jsonData.length); i++) {
            const row = jsonData[i] as any[];
            if (!row) continue;
            
            const rowStrings = row.map(cell => cell ? cell.toString().trim() : '');
            
            // Vérifier si c'est une ligne d'en-têtes Orange Money
            const orangeMoneyHeaders = ['N°', 'Date', 'Heure', 'Référence', 'Service', 'Paiement', 'Statut', 'Mode'];
            const matchingHeaders = orangeMoneyHeaders.filter(header => 
              rowStrings.some(cell => cell.includes(header))
            );
            
            if (matchingHeaders.length >= 4) {
              headerRowIndex = i;
              headerRow = rowStrings;
              console.log(`✅ En-têtes Orange Money détectés à la ligne ${i}:`, headerRow);
              break;
            }
          }
          
          if (headerRowIndex === -1) {
            // Fallback : utiliser la première ligne non vide
            for (let i = 0; i < jsonData.length; i++) {
              const row = jsonData[i] as any[];
              if (row && row.some(cell => cell && cell.toString().trim())) {
                headerRowIndex = i;
                headerRow = row.map(cell => cell ? cell.toString().trim() : '');
                console.log(`📋 En-têtes de fallback à la ligne ${i}:`, headerRow);
                break;
              }
            }
          }
          
          if (headerRowIndex === -1) {
            reject(new Error('Aucune ligne d\'en-têtes trouvée'));
            return;
          }
          
          // Extraire les données d'exemple (max 10 lignes après l'en-tête)
          const sampleData: any[] = [];
          const maxSampleRows = Math.min(10, jsonData.length - headerRowIndex - 1);
          
          for (let i = headerRowIndex + 1; i <= headerRowIndex + maxSampleRows; i++) {
            const row = jsonData[i] as any[];
            if (!row) continue;
            
            const rowData: any = {};
            let hasData = false;
            
            headerRow.forEach((header, index) => {
              const value = row[index] ? row[index].toString().trim() : '';
              rowData[header] = value;
              if (value) hasData = true;
            });
            
            // Ajouter seulement les lignes qui contiennent des données
            if (hasData) {
              sampleData.push(rowData);
            }
          }
          
          console.log(`📊 Données d'exemple extraites: ${sampleData.length} lignes`);
          console.log('📊 Première ligne d\'exemple:', sampleData[0]);
          
          resolve({
            columns: headerRow,
            sampleData: sampleData
          });
          
        } catch (error) {
          console.error('❌ Erreur lors de la lecture du fichier Excel:', error);
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Erreur lors de la lecture du fichier'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  }

  // Méthode pour charger les données du fichier pour un champ spécifique
  private async loadFileDataForField(fieldName: string): Promise<void> {
    console.log('🔄 loadFileDataForField appelée pour:', fieldName);
    console.log('🔄 editingModel:', this.editingModel);
    console.log('🔄 selectedFileModel:', this.selectedFileModel);
    
    // Si on a un modèle en édition avec un fichier template
    if (this.editingModel?.templateFile) {
      console.log('🔄 Recherche du fichier template:', this.editingModel.templateFile);
      
      // Chercher le fichier dans availableFiles
      const fileModel = this.availableFiles.find(f => f.fileName === this.editingModel?.templateFile);
      
      if (fileModel) {
        console.log('✅ Fichier trouvé dans availableFiles:', fileModel.fileName);
        
        // Si c'est un fichier Excel, essayer de lire directement
        if (fileModel.fileName.toLowerCase().endsWith('.xls')) {
          console.log('🔄 Chargement des données Excel pour:', fieldName);
          
          try {
            const response = await fetch(`/api/file-watcher/analyze-file`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ filePath: fileModel.filePath })
            });
            
            if (response.ok) {
              const fileData = await response.json();
              console.log('📊 Données Excel récupérées:', fileData);
              console.log('📊 sampleData length:', fileData.sampleData?.length);
              console.log('📊 Première ligne sampleData:', fileData.sampleData?.[0]);
              
              // Mettre à jour les données en cache
              if (fileData.sampleData && fileData.sampleData.length > 0) {
                fileModel.sampleData = fileData.sampleData;
                fileModel.columns = fileData.columns;
                this.selectedFileModel = fileModel;
                console.log('✅ Données mises à jour en cache');
                console.log('✅ Nouvelle première ligne:', this.selectedFileModel.sampleData[0]);
              } else {
                console.log('❌ Aucune donnée sampleData trouvée dans la réponse');
              }
            } else {
              console.log('❌ Réponse non-OK du backend:', response.status);
            }
          } catch (error) {
            console.error('❌ Erreur lors du chargement des données Excel:', error);
          }
        } else {
          // Pour les fichiers non-Excel, utiliser les données existantes
          this.selectedFileModel = fileModel;
          console.log('✅ Fichier non-Excel, utilisation des données existantes');
        }
      } else {
        console.log('❌ Fichier template non trouvé dans availableFiles');
      }
    }
  }

  // Méthode pour initialiser les valeurs sélectionnées pour une étape
  private initializeSelectedValuesForStep(stepIndex: number): void {
    const step = this.processingStepsFormArray.at(stepIndex) as FormGroup;
    const currentValues = step.get('params')?.get('values')?.value || [];
    
    // Stocker les valeurs sélectionnées dans le formulaire
    if (!step.get('params')) {
      step.addControl('params', this.fb.group({
        values: [currentValues]
      }));
    } else if (!step.get('params.values')) {
      (step.get('params') as FormGroup)?.addControl('values', this.fb.control(currentValues));
    }
  }

  // Méthode pour basculer la sélection d'une valeur
  toggleValueSelection(stepIndex: number, value: string): void {
    const step = this.processingStepsFormArray.at(stepIndex);
    const currentValues = this.getSelectedValuesForField(stepIndex);
    
    if (currentValues.includes(value)) {
      this.removeValueSelection(stepIndex, value);
    } else {
      this.addValueSelection(stepIndex, value);
    }
  }

  // Méthode pour ajouter une valeur à la sélection
  addValueSelection(stepIndex: number, value: string): void {
    const step = this.processingStepsFormArray.at(stepIndex);
    const currentValues = this.getSelectedValuesForField(stepIndex);
    
    if (!currentValues.includes(value)) {
      const newValues = [...currentValues, value];
      this.updateSelectedValuesForField(stepIndex, newValues);
    }
  }

  // Méthode pour supprimer une valeur de la sélection
  removeValueSelection(stepIndex: number, value: string): void {
    const step = this.processingStepsFormArray.at(stepIndex);
    const currentValues = this.getSelectedValuesForField(stepIndex);
    
    const newValues = currentValues.filter(v => v !== value);
    this.updateSelectedValuesForField(stepIndex, newValues);
  }

  // Méthode pour vérifier si une valeur est sélectionnée
  isValueSelected(stepIndex: number, value: string): boolean {
    const selectedValues = this.getSelectedValuesForField(stepIndex);
    return selectedValues.includes(value);
  }

  // Méthode pour obtenir les valeurs sélectionnées pour un champ
  getSelectedValuesForField(stepIndex: number): string[] {
    const step = this.processingStepsFormArray.at(stepIndex);
    const params = step.get('params');
    
    if (params && params.get('values')) {
      return params.get('values')?.value || [];
    }
    
    return [];
  }

  // Méthode pour mettre à jour les valeurs sélectionnées
  private updateSelectedValuesForField(stepIndex: number, values: string[]): void {
    const step = this.processingStepsFormArray.at(stepIndex) as FormGroup;
    
    if (!step.get('params')) {
      step.addControl('params', this.fb.group({
        values: [values]
      }));
    } else if (!step.get('params.values')) {
      (step.get('params') as FormGroup)?.addControl('values', this.fb.control(values));
    } else {
      step.get('params.values')?.setValue(values);
    }
  }






} 