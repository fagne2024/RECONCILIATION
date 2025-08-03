import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { AutoProcessingService, AutoProcessingModel, ProcessingStep, FileModel } from '../../services/auto-processing.service';

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

  // Types d'étapes disponibles
  stepTypes = [
    { value: 'format', label: 'Formatage' },
    { value: 'validate', label: 'Validation' },
    { value: 'transform', label: 'Transformation' },
    { value: 'filter', label: 'Filtrage' },
    { value: 'calculate', label: 'Calcul' },
    { value: 'select', label: 'Sélection colonnes' },
    { value: 'deduplicate', label: 'Suppression doublons' }
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
      { value: 'filterByExactValue', label: 'Filtrer par valeur exacte' }
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
    ]
  };

  constructor(
    private autoProcessingService: AutoProcessingService,
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
        this.availableFiles = files;
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
      // Paramètres de concaténation
      newColumn: ['concatenated'],
      separator: [' '],
      // Paramètres de filtrage
      pattern: ['.*'],
      values: [''],
      value: [''],
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
      { value: 'deduplicate', label: 'Suppression doublons' }
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
  }

  // Sélectionner un fichier modèle
  selectFileModel(fileModel: FileModel): void {
    console.log('🎯 Sélection du fichier modèle:', fileModel);
    console.log('📋 Colonnes du fichier:', fileModel.columns);
    
    this.selectedFileModel = fileModel;
    this.availableColumns = fileModel.columns;
    
    console.log('✅ Colonnes disponibles après sélection:', this.availableColumns);

    // Auto-remplir le formulaire avec les informations du fichier
    this.modelForm.patchValue({
      name: `Modèle basé sur ${fileModel.fileName}`,
      filePattern: `*${fileModel.fileName.split('.')[0]}*.${fileModel.fileName.split('.').pop()}`,
      templateFile: fileModel.fileName
    });

    // S'assurer que les colonnes restent disponibles après la mise à jour du formulaire
    setTimeout(() => {
      this.availableColumns = fileModel.columns;
      console.log('🔄 Colonnes après timeout:', this.availableColumns);
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

  // Obtenir les colonnes disponibles pour le champ sélection (méthode pour debug)
  getAvailableColumns(): string[] {
    console.log('🔍 getAvailableColumns() appelé');
    console.log('   selectedFileModel:', this.selectedFileModel);
    console.log('   editingModel:', this.editingModel);
    console.log('   availableColumns:', this.availableColumns);
    console.log('   availableFiles:', this.availableFiles.length);
    
    const columns = this.availableColumnsForTemplate;
    console.log('   ✅ Retour des colonnes:', columns);
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

    // Charger les colonnes si un fichier modèle est défini
    if (model.templateFile) {
      this.autoProcessingService.getFileColumns(model.templateFile).subscribe({
        next: (columns) => {
          this.availableColumns = columns;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des colonnes:', error);
        }
      });
    }

    // Réinitialiser les étapes
    this.processingStepsFormArray.clear();
    model.processingSteps.forEach(step => {
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

    this.showCreateForm = true;
    
         // Forcer la réinitialisation des contrôles BO après un délai
     setTimeout(() => {
       this.initializeBOModelKeys();
       
       // Initialiser les traitements BO si c'est un modèle partenaire
       if (model.fileType === 'partner' && model.reconciliationKeys?.boModels) {
         model.reconciliationKeys.boModels.forEach(boModelId => {
           this.initializeBOTreatments(boModelId);
         });
       }
       
       // Note: onBOModelsChange() sera appelé automatiquement par le template
       // quand les modèles BO sont sélectionnés, donc pas besoin de l'appeler ici
     }, 500);
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
      const formValue = this.modelForm.value;

      const processingSteps: ProcessingStep[] = formValue.processingSteps.map((step: any, index: number) => {
        // Construire les paramètres selon l'action
        let params: any = {};

        switch (step.action) {
          // Formatage
          case 'currency':
            params = { locale: step.locale, currency: step.currency };
            break;
          case 'normalizeDates':
            params = { format: step.dateFormat };
            break;
          case 'removeCharacters':
            params = { 
              position: step.position, 
              count: step.count,
              specificPosition: step.specificPosition 
            };
            break;
          case 'removeSpecificCharacters':
            params = { 
              characters: step.characters, 
              caseSensitive: step.caseSensitive 
            };
            break;
          case 'insertCharacters':
            params = { 
              characters: step.characters, 
              position: step.position,
              specificPosition: step.specificPosition 
            };
            break;
          case 'trimSpaces':
          case 'toLowerCase':
          case 'toUpperCase':
          case 'removeDashesAndCommas':
          case 'removeSeparators':
          case 'dotToComma':
          case 'normalizeNumbers':
          case 'absoluteValue':
          case 'cleanAmounts':
            // Ces actions n'ont pas de paramètres spécifiques
            params = {};
            break;
          
          // Extraction
          case 'extract':
            params = {
              extractType: step.extractType,
              extractCount: step.extractCount,
              extractKey: step.extractKey,
              extractStart: step.extractStart,
              startChar: step.startChar,
              endChar: step.endChar
            };
            break;
          
          // Concaténation
          case 'concat':
            params = {
              columns: Array.isArray(step.field) ? step.field : [step.field],
              newColumn: step.newColumn,
              separator: step.separator
            };
            break;
          
          // Filtrage
          case 'keepMatching':
            params = { pattern: step.pattern };
            break;
          case 'filterByValue':
            params = { values: step.values.split(',').map((v: string) => v.trim()) };
            break;
          case 'filterByExactValue':
            params = { value: step.value };
            break;
          
          // Sélection de colonnes
          case 'keepColumns':
          case 'removeColumns':
            params = { columns: Array.isArray(step.field) ? step.field : [step.field] };
            break;
          case 'removeDuplicates':
            params = { columns: Array.isArray(step.field) ? step.field : [step.field] };
            break;
          
          // Validation
          case 'required':
          case 'email':
          case 'dateFormat':
            params = { format: step.validationDateFormat };
            break;
        }

        return {
          id: `step_${index}`,
          name: step.name,
          type: step.type,
          field: Array.isArray(step.field) ? step.field : [step.field], // S'assurer que field est un tableau
          action: step.action,
          params,
          description: step.description
        };
      });

             // Préparer les clés de réconciliation selon le type de modèle
       let reconciliationKeys: any = {};
       
       if (formValue.fileType === 'partner') {
         // Pour les modèles partenaire : clés partenaire + modèles BO sélectionnés avec leurs clés
         const selectedBOModels = this.getSelectedBOModels();
         const boModelKeys: any = {};
         
             console.log('🔍 Configuration des clés de réconciliation pour modèle partenaire:');
    console.log('  - Modèles BO sélectionnés:', selectedBOModels);
    console.log('  - formValue.reconciliationKeys:', formValue.reconciliationKeys);
    
    // Log de l'état complet du formulaire
    const boModelKeysGroup = this.modelForm.get('reconciliationKeys.boModelKeys') as FormGroup;
    console.log('  - Contrôles boModelKeys:', Object.keys(boModelKeysGroup.controls));
    Object.keys(boModelKeysGroup.controls).forEach(key => {
      const control = boModelKeysGroup.get(key);
      console.log(`  - Contrôle ${key}:`, control?.value);
    });
         
         // Sauvegarder les clés et traitements pour chaque modèle BO
         const boTreatments: any = {};
         
         selectedBOModels.forEach(boModel => {
           const keys = this.getBOModelKeys(boModel.id);
           console.log(`  - Clés pour modèle BO ${boModel.id}:`, keys);
           console.log(`  - Contrôle form pour ${boModel.id}:`, this.modelForm.get(`reconciliationKeys.boModelKeys.boKeys_${boModel.id}`)?.value);
           
           // Toujours sauvegarder les clés, même si elles sont vides (pour permettre la suppression)
           boModelKeys[boModel.id] = keys;
           console.log(`  - Clés sauvegardées pour ${boModel.id}:`, boModelKeys[boModel.id]);
           
           // Sauvegarder les traitements BO
           const treatmentArray = this.getBOTreatmentSteps(boModel.id);
           const treatments: ProcessingStep[] = treatmentArray.controls.map((control: any, index: number) => {
             const step = control.value;
             let params: any = {};

             switch (step.action) {
               // Formatage
               case 'currency':
                 params = { locale: step.locale, currency: step.currency };
                 break;
               case 'normalizeDates':
                 params = { format: step.dateFormat };
                 break;
               case 'removeCharacters':
                 params = { 
                   position: step.position, 
                   count: step.count,
                   specificPosition: step.specificPosition 
                 };
                 break;
               case 'removeSpecificCharacters':
                 params = { 
                   characters: step.characters, 
                   caseSensitive: step.caseSensitive 
                 };
                 break;
               case 'insertCharacters':
                 params = { 
                   characters: step.characters, 
                   position: step.position,
                   specificPosition: step.specificPosition 
                 };
                 break;
               case 'trimSpaces':
               case 'toLowerCase':
               case 'toUpperCase':
               case 'removeDashesAndCommas':
               case 'removeSeparators':
               case 'dotToComma':
               case 'normalizeNumbers':
               case 'absoluteValue':
               case 'cleanAmounts':
                 params = {};
                 break;
               
               // Concaténation
               case 'concat':
                 params = {
                   columns: Array.isArray(step.field) ? step.field : [step.field],
                   newColumn: step.newColumn,
                   separator: step.separator
                 };
                 break;
               
               // Filtrage
               case 'keepMatching':
                 params = { pattern: step.pattern };
                 break;
               case 'filterByValue':
                 params = { values: step.values.split(',').map((v: string) => v.trim()) };
                 break;
               case 'filterByExactValue':
                 params = { value: step.value };
                 break;
               
               // Sélection de colonnes
               case 'keepColumns':
               case 'removeColumns':
                 params = { columns: Array.isArray(step.field) ? step.field : [step.field] };
                 break;
               case 'removeDuplicates':
                 params = { columns: Array.isArray(step.field) ? step.field : [step.field] };
                 break;
             }

             return {
               id: `bo_treatment_${boModel.id}_${index}`,
               name: step.name,
               type: step.type,
               field: Array.isArray(step.field) ? step.field : [step.field],
               action: step.action,
               params,
               description: step.description
             };
           });
           
           boTreatments[boModel.id] = treatments;
           console.log(`  - Traitements sauvegardés pour ${boModel.id}:`, treatments);
         });
         
         reconciliationKeys = {
           partnerKeys: formValue.reconciliationKeys.partnerKeys,
           boModels: formValue.reconciliationKeys.boModels,
           boModelKeys: boModelKeys,
           boTreatments: boTreatments
         };
         
         console.log('  - reconciliationKeys final:', reconciliationKeys);
         console.log('  - boModelKeys détaillé:', JSON.stringify(boModelKeys, null, 2));
       } else {
         // Pour les modèles BO et "both" : pas de configuration des clés
         reconciliationKeys = {};
       }

      const modelData = {
        name: formValue.name,
        filePattern: formValue.filePattern,
        fileType: formValue.fileType,
        autoApply: formValue.autoApply,
        templateFile: formValue.templateFile,
        processingSteps,
        reconciliationKeys: reconciliationKeys
      };

      console.log('💾 Données du modèle à sauvegarder:', modelData);
      console.log('🔧 Étapes de traitement à sauvegarder:', processingSteps);
      processingSteps.forEach((step, index) => {
        console.log(`🔧 Étape ${index + 1} à sauvegarder:`, {
          name: step.name,
          type: step.type,
          action: step.action,
          field: step.field,
          params: step.params
        });
      });

      if (this.editingModel) {
        // Mise à jour
        this.autoProcessingService.updateModel(this.editingModel.id, modelData).subscribe({
          next: (updatedModel) => {
            if (updatedModel) {
              this.loadModels();
              this.closeForm();
            }
            this.loading = false;
          },
          error: (error) => {
            console.error('Erreur lors de la mise à jour du modèle:', error);
            this.errorMessage = 'Erreur lors de la mise à jour du modèle';
            this.loading = false;
          }
        });
      } else {
        // Création
        this.autoProcessingService.createModel(modelData).subscribe({
          next: (newModel) => {
            this.loadModels();
            this.closeForm();
            this.loading = false;
          },
          error: (error) => {
            console.error('Erreur lors de la création du modèle:', error);
            this.errorMessage = 'Erreur lors de la création du modèle';
            this.loading = false;
          }
        });
      }
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
    this.showCreateForm = false;
    this.editingModel = null;
    this.modelForm.reset({
      fileType: 'bo',
      autoApply: true,
      processingSteps: []
    });
    this.processingStepsFormArray.clear();
    this.selectedFileModel = null;
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
        
        // Ajouter un listener pour détecter les changements avec setTimeout pour s'assurer que le contrôle est attaché
        setTimeout(() => {
          const attachedControl = boModelKeysGroup.get(controlKey);
          console.log(`  - Contrôle attaché après timeout:`, attachedControl);
          console.log(`  - Valeur du contrôle attaché:`, attachedControl?.value);
          
          if (attachedControl) {
            attachedControl.valueChanges.subscribe(value => {
              console.log(`🔄 Changement détecté pour ${controlKey}:`, value);
              console.log(`  - Type de valeur:`, typeof value);
              console.log(`  - Longueur du tableau:`, Array.isArray(value) ? value.length : 'N/A');
            });
            console.log(`  - Listener attaché pour ${controlKey}`);
            console.log(`  - Valeur initiale du contrôle:`, attachedControl.value);
          } else {
            console.log(`  - ❌ Impossible d'attacher le listener, contrôle non trouvé après timeout: ${controlKey}`);
          }
        }, 100); // Timeout légèrement augmenté
      }
      
      // Initialiser les traitements BO si nécessaire
      this.initializeBOTreatments(model.id);
    });
    
    console.log('  - Contrôles après mise à jour:', Object.keys(boModelKeysGroup.controls));
    
    // Forcer la mise à jour du formulaire pour s'assurer que les contrôles sont bien attachés
    this.modelForm.updateValueAndValidity();
    console.log('  - Formulaire mis à jour');
    
    // Log de l'état final du FormGroup boModelKeys
    console.log('  - État final du FormGroup boModelKeys:');
    Object.keys(boModelKeysGroup.controls).forEach(key => {
      const control = boModelKeysGroup.get(key);
      console.log(`    - ${key}:`, control?.value);
    });
  }

  // Méthode pour obtenir les clés d'un modèle BO spécifique
  getBOModelKeys(modelId: string): string[] {
    const boModelKeysGroup = this.modelForm.get('reconciliationKeys.boModelKeys') as FormGroup;
    const control = boModelKeysGroup.get(`boKeys_${modelId}`);
    const value = control?.value || [];
    console.log(`🔍 getBOModelKeys(${modelId}):`, value);
    console.log(`  - Contrôle existe:`, !!control);
    console.log(`  - Valeur du contrôle:`, control?.value);
    console.log(`  - Contrôle complet:`, control);
    console.log(`  - Tous les contrôles disponibles:`, Object.keys(boModelKeysGroup.controls));
    
    // Log détaillé de tous les contrôles
    Object.keys(boModelKeysGroup.controls).forEach(key => {
      const ctrl = boModelKeysGroup.get(key);
      console.log(`    - ${key}:`, ctrl?.value);
    });
    
    return value;
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
     
     if (control) {
       console.log('  - Contrôle trouvé, mise à jour de la valeur');
       control.setValue(selectedOptions);
       console.log('  - Valeur du contrôle après mise à jour:', control.value);
     } else {
       console.log('  - ❌ Contrôle non trouvé!');
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
    this.autoProcessingService.createDefaultBOModel().subscribe({
      next: (response: any) => {
        console.log('✅ Modèle BO par défaut créé:', response);
        this.loadModels();
        this.showAlert('Modèle BO par défaut créé avec succès!', 'success');
      },
      error: (error: any) => {
        console.error('❌ Erreur lors de la création du modèle BO:', error);
        this.showAlert('Erreur lors de la création du modèle BO', 'danger');
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
    console.log(`${type.toUpperCase()}: ${message}`);
    // Ici vous pourriez utiliser un service d'alerte ou une notification toast
  }

} 