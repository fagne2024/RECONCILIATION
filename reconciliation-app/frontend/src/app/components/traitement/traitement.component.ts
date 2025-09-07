import { Component, OnInit, ChangeDetectorRef, AfterViewInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { MatSelect } from '@angular/material/select';
import { OrangeMoneyUtilsService } from '../../services/orange-money-utils.service';
import { FieldTypeDetectionService, ColumnAnalysis } from '../../services/field-type-detection.service';
import { DataProcessingService } from '../../services/data-processing.service';
import { fixGarbledCharacters } from '../../utils/encoding-fixer';
import * as Papa from 'papaparse';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-traitement',
  templateUrl: './traitement.component.html',
  styleUrls: ['./traitement.component.scss']
})
export class TraitementComponent implements OnInit, AfterViewInit {
  readonly LOCAL_STORAGE_KEY = 'traitement_data';
  selectedFiles: File[] = [];
  combinedRows: any[] = [];
  columns: string[] = [];
  dedupCols: string[] = [];
  formatOptions: any = {
    removeCharacters: false,
    removeNumbers: false,
    removeIndicatif: false,
    removeDecimals: false,
    keepLastDigits: false
  };
  extractCol: string = '';
  extractType: string = '';
  extractCount: number = 1;
  extractKey: string = '';
  extractStart: number = 1;
  selectedCols: string[] = [];
  successMsg: any = {};
  errorMsg: any = {};
  selectedDateFormat: string = 'yyyy-MM-dd';
  exportTypeCol: string = '';
  exportTypeValues: string[] = [];
  exportTypeSelected: string[] = [];
  allRows: any[] = [];
  allColumns: string[] = [];
  originalRows: any[] = []; // Ajout pour garder toutes les données d'origine
  // Ajout d'un flag pour savoir si une sélection a été appliquée
  selectionApplied: boolean = false;

  // --- FILTRAGE DYNAMIQUE ---
  selectedFilterColumn: string = '';
  filterValues: string[] = [];
  selectedFilterValues: string[] = [];
  filteredRows: any[] = [];
  filterApplied: boolean = false;

  // --- FILTRES MULTIPLES ---
  multipleFilters: Array<{
    id: string;
    column: string;
    values: string[];
    selectedValues: string[];
    filterValues: string[];
    filteredFilterValues: string[];
    enabled: boolean;
  }> = [];
  nextFilterId: number = 1;

  // --- CONTRÔLES DE RECHERCHE POUR COHÉRENCE AVEC LES FILTRES ---
  filterValueSearchCtrl = new FormControl('');
  filteredFilterValues: string[] = [];
  @ViewChild('filterValueSelect') filterValueSelect!: MatSelect;

  // --- CONCATÉNATION DE COLONNES (MULTI) ---
  concatCols: string[] = [];
  concatNewCol: string = '';
  concatSeparator: string = ' ';
  concatOrderMode: boolean = false;

  exportTypeSuffix: string = '';
  exportTypeDescription: string = '';

  // --- EXPORT PAR DATE ---
  exportDateCol: string = '';
  exportDatePeriod: 'day' | 'week' | 'month' = 'day';
  exportDateFormat: 'csv' | 'xls' | 'xlsx' = 'csv';
  exportDatePrefix: string = 'export';
  detectedPeriods: Array<{ label: string; count: number; key: string }> = [];

  // --- SUPPRESSION DE CARACTÈRES ---
  removeCharPosition: 'start' | 'end' | 'specific' = 'start';
  removeCharCount: number = 1;
  removeCharSpecificPosition: number = 1;

  // --- SUPPRESSION D'INDICATIF ---
  indicatifType: 'international' | 'national' | 'custom' = 'international';
  customIndicatif: string = '+33';
  indicatifLength: number = 2;

  // --- GARDER N DERNIERS DIGITS ---
  keepLastDigitsCount: number = 3;

  // --- SUPPRESSION DE DÉCIMALES ---
  decimalSeparator: ',' | '.' = ',';
  keepTrailingZeros: boolean = false;

  // --- SUPPRESSION DE CARACTÈRES SPÉCIFIQUES ---
  specificCharactersToRemove: string = '';
  removeSpecificCharactersCaseSensitive: boolean = true;
  
  // --- INSERTION DE CARACTÈRES ---
  charactersToInsert: string = '';
  insertPosition: 'start' | 'end' | 'specific' = 'start';
  insertSpecificPosition: number = 1;
  
  // --- PROPRIÉTÉS POUR LE FILTRAGE PAR VALEUR EXACTE ---
  filterByExactValue: boolean = false;
  exactValueToFilter: string = '';
  exactValueColumn: string = '';

  // --- DÉTECTION AUTOMATIQUE DE SÉPARATEUR CSV ---
  detectedDelimiter: string = ';';
  delimiterDetectionEnabled: boolean = true;
  csvPreviewData: any[] = [];
  csvPreviewColumns: string[] = [];
  showCsvPreview: boolean = false;
  csvContentToProcess: string = '';

  // --- DÉTECTION AUTOMATIQUE DES TYPES DE CHAMPS ---
  fieldTypeAnalysis: ColumnAnalysis[] = [];
  showFieldTypeAnalysis: boolean = false;
  autoFormattingEnabled: boolean = true;
  formattingRecommendations: any[] = [];
  csvFileToProcess: File | null = null;

  // --- DÉTECTION FICHIERS ORANGE MONEY ---
  isOrangeMoneyFile: boolean = false;
  orangeMoneyHeaderRowIndex: number = -1;

  // --- PAGINATION ET AFFICHAGE ---
  currentPage: number = 1;
  rowsPerPage: number = 100;
  maxDisplayedRows: number = 1000;
  showAllRows: boolean = false;
  displayedRows: any[] = [];

  // --- RÉORGANISATION DES COLONNES ---
  isColumnReorderMode: boolean = false;
  reorderedColumns: string[] = [];
  draggedColumn: string | null = null;
  dragOverColumn: string | null = null;

  // --- INDICATEURS DE PROGRESSION ---
  isProcessing: boolean = false;
  processingProgress: number = 0;
  processingMessage: string = '';
  totalFilesToProcess: number = 0;
  currentFileIndex: number = 0;
  fileProcessStats: { name: string; rows: number; status: 'succès' | 'erreur'; errorMsg?: string }[] = [];

  // Optimisations pour gros fichiers
  private worker: Worker | null = null;
  private processingQueue: any[] = [];
  private isProcessingQueue: boolean = false;
  private chunkSize: number = 5000; // Taille optimisée pour 50k lignes
  private maxConcurrentChunks: number = 4;
  private activeChunks: number = 0;

  // Sélection de colonnes par option de formatage
  formatSelections: { [key: string]: string[] } = {
    removeCharacters: [],
    removeNumbers: [],
    removeIndicatif: [],
    removeDecimals: [],
    keepLastDigits: []
  };

  constructor(
    private cd: ChangeDetectorRef, 
    private fb: FormBuilder,
    private orangeMoneyUtilsService: OrangeMoneyUtilsService,
    private fieldTypeDetectionService: FieldTypeDetectionService,
    public dataProcessingService: DataProcessingService
  ) {}

  private showSuccess(key: string, msg: string) {
    this.successMsg[key] = msg;
  }
  private showError(key: string, msg: string) {
    this.errorMsg[key] = msg;
    setTimeout(() => { this.errorMsg[key] = ''; }, 3000);
  }

  triggerFileInput() {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.addFiles(input.files);
      input.value = '';
    }
    this.processFiles();
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer && event.dataTransfer.files) {
      this.addFiles(event.dataTransfer.files);
    }
    this.removeDragOverStyle();
    this.processFiles();
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.addDragOverStyle();
  }

  addFiles(fileList: FileList) {
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList.item(i);
      if (file && !this.selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
        this.selectedFiles.push(file);
        
        // Si c'est un fichier CSV, déclencher la prévisualisation
        if (file.name.toLowerCase().endsWith('.csv')) {
          this.previewCsvFile(file);
        }
      }
    }
  }

  // Méthode pour prévisualiser un fichier CSV
  async previewCsvFile(file: File) {
    const reader = new FileReader();
    reader.onload = async (e: any) => {
      try {
        const csv = e.target.result;
        
        // Stocker le contenu pour le traitement ultérieur
        this.csvContentToProcess = csv;
        this.csvFileToProcess = file;
        
        // Détection automatique du séparateur
        this.detectedDelimiter = this.detectCsvDelimiter(csv);
        console.log('Séparateur CSV détecté:', this.detectedDelimiter);
        
        // Prévisualiser les données
        const preview = await this.previewCsvData(csv, this.detectedDelimiter);
        this.csvPreviewColumns = preview.columns;
        this.csvPreviewData = preview.data;
        this.showCsvPreview = true;
        
        console.log('Prévisualisation CSV:', {
          columns: preview.columns,
          dataLength: preview.data.length,
          hasHeader: preview.hasHeader
        });
        
        this.cd.detectChanges();
      } catch (error) {
        console.error('Erreur lors de la prévisualisation CSV:', error);
        this.showError('upload', 'Erreur lors de la prévisualisation du fichier CSV');
      }
    };
    reader.readAsText(file, 'UTF-8');
  }

  addDragOverStyle() {
    const uploadArea = document.querySelector('.upload-area');
    if (uploadArea) {
      uploadArea.classList.add('dragover');
    }
  }

  removeDragOverStyle() {
    const uploadArea = document.querySelector('.upload-area');
    if (uploadArea) {
      uploadArea.classList.remove('dragover');
    }
  }

  async processFiles() {
    // Si une prévisualisation CSV est en cours, ne pas traiter automatiquement
    if (this.showCsvPreview) {
      console.log('Prévisualisation CSV en cours, traitement différé');
      return;
    }
    
    // Vérifier la taille totale des fichiers
    const totalSize = this.selectedFiles.reduce((sum, file) => sum + file.size, 0);
    const totalSizeMB = totalSize / (1024 * 1024);
    const isLargeUpload = totalSizeMB > 100; // Plus de 100MB
    
    console.log(`📊 Upload détecté: ${totalSizeMB.toFixed(2)} MB (${isLargeUpload ? 'gros upload' : 'upload normal'})`);

    this.isProcessing = true;
    this.processingProgress = 0;
    this.processingMessage = isLargeUpload ? 'Initialisation du traitement optimisé pour gros fichiers...' : 'Initialisation du traitement ultra-rapide...';
    
    this.combinedRows = [];
    this.columns = [];
    this.allRows = [];
    this.allColumns = [];
    this.originalRows = [];
    
    // Réinitialiser les paramètres d'affichage
    this.currentPage = 1;
    this.showAllRows = false;
    this.displayedRows = [];
    
    let totalRows = 0;
    this.totalFilesToProcess = this.selectedFiles.length;
    this.currentFileIndex = 0;
    this.fileProcessStats = [];
    const startTime = Date.now();
    
    try {
      for (const file of this.selectedFiles) {
        this.currentFileIndex++;
        this.processingMessage = `Traitement ${isLargeUpload ? 'optimisé' : 'ultra-rapide'} du fichier ${this.currentFileIndex}/${this.totalFilesToProcess}: ${file.name}`;
        this.processingProgress = (this.currentFileIndex - 1) / this.totalFilesToProcess * 100;
        
        const fileName = file.name.toLowerCase();
        const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
        console.log(`🚀 Traitement ${isLargeUpload ? 'optimisé' : 'ultra-rapide'}: ${file.name} (${fileSizeMB} MB)`);
        
        let beforeRows = this.allRows.length;
        try {
          // Gestion mémoire pour gros fichiers
          if (isLargeUpload && this.allRows.length > 500000) {
            console.log('⚠️ Mémoire élevée détectée, optimisation en cours...');
            this.processingMessage = 'Optimisation mémoire en cours...';
            await this.optimizeMemoryUsage();
          }
          if (fileName.endsWith('.csv')) {
            await this.readCsvFileOptimized(file);
          } else if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
            await this.readExcelFileOptimized(file);
          } else {
            this.showError('upload', 'Seuls les fichiers CSV ou Excel (.xls, .xlsx) sont acceptés.');
            this.fileProcessStats.push({ name: file.name, rows: 0, status: 'erreur', errorMsg: 'Format non supporté' });
            continue;
          }
          
          let afterRows = this.allRows.length;
          let fileRows = afterRows - beforeRows;
          totalRows += fileRows;
          this.fileProcessStats.push({ name: file.name, rows: fileRows, status: 'succès' });
          
          console.log(`✅ Fichier traité en ${fileRows} lignes`);
        } catch (fileError) {
          console.error('Erreur lors du traitement du fichier:', file.name, fileError);
          this.fileProcessStats.push({ name: file.name, rows: 0, status: 'erreur', errorMsg: (fileError as any)?.message || 'Erreur inconnue' });
        }
        
        // Mettre à jour la progression
        this.processingProgress = this.currentFileIndex / this.totalFilesToProcess * 100;
        
        // Pause pour gros uploads
        if (isLargeUpload && this.currentFileIndex < this.totalFilesToProcess) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Fusion optimisée des colonnes
      this.processingMessage = `Fusion ${isLargeUpload ? 'optimisée' : 'ultra-rapide'} des colonnes...`;
      this.allColumns = await this.mergeColumnsOptimized();
      
      // Normalisation optimisée des données
      this.processingMessage = `Normalisation ${isLargeUpload ? 'optimisée' : 'ultra-rapide'} des données...`;
      await this.normalizeDataOptimized();
      
      // Finalisation
      this.processingMessage = 'Finalisation du traitement...';
      this.combinedRows = [...this.allRows];
      this.columns = [...this.allColumns];
      this.originalRows = [...this.allRows];
      
      // Optimiser l'affichage pour les gros fichiers
      this.optimizeForLargeFiles();
      
      // Mettre à jour l'affichage
      this.updateDisplayedRows();
      this.updatePagination();
      
      this.isProcessing = false;
      this.processingProgress = 100;
      
      const totalProcessed = this.allRows.length;
      const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`🚀 Traitement ${isLargeUpload ? 'optimisé' : 'ultra-rapide'} terminé: ${totalProcessed.toLocaleString()} lignes en ${processingTime}s`);
      
      this.showSuccess('upload', `Traitement ${isLargeUpload ? 'optimisé' : 'ultra-rapide'} terminé ! ${totalProcessed.toLocaleString()} lignes traitées en ${processingTime}s`);
      
    } catch (error) {
      console.error('Erreur lors du traitement:', error);
      this.isProcessing = false;
      this.showError('upload', 'Erreur lors du traitement ultra-rapide des fichiers');
    }
  }

  // Méthodes optimisées pour le traitement ultra-rapide
  private async readCsvFileOptimized(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e: any) => {
        try {
          const csv = e.target.result;
          const lines = csv.split('\n');
          
          if (lines.length === 0) {
            resolve();
            return;
          }
          
          // Détecter le séparateur
          const firstLine = lines[0];
          const delimiter = this.detectDelimiter(firstLine);
          
          // Extraire les en-têtes avec correction des caractères spéciaux
          const headers = firstLine.split(delimiter).map((h: string) => fixGarbledCharacters(h.trim()));
          
          // Traitement par chunks optimisé pour gros fichiers (jusqu'à 1M lignes)
          const totalLines = lines.length - 1; // Exclure l'en-tête
          const isLargeFile = totalLines > 100000; // Plus de 100k lignes
          const chunkSize = isLargeFile ? 5000 : 1000; // Chunks plus gros pour gros fichiers
          
          console.log(`📊 Traitement optimisé: ${totalLines} lignes, chunks de ${chunkSize} (${isLargeFile ? 'gros fichier' : 'fichier normal'})`);
          
          // Mise à jour de la progression pour gros fichiers
          let processedLines = 0;
          const updateProgress = () => {
            if (isLargeFile) {
              this.processingProgress = Math.min(95, (processedLines / totalLines) * 100);
              this.processingMessage = `Traitement CSV: ${processedLines.toLocaleString()}/${totalLines.toLocaleString()} lignes`;
            }
          };
          
          for (let i = 1; i < lines.length; i += chunkSize) {
            const chunkEnd = Math.min(i + chunkSize, lines.length);
            const chunkLines = lines.slice(i, chunkEnd);
            
            const chunkRows: any[] = [];
            for (const line of chunkLines) {
              if (line.trim()) {
                const values = line.split(delimiter);
                const row: any = {};
                headers.forEach((header: string, index: number) => {
                  row[header] = fixGarbledCharacters(values[index] || '');
                });
                chunkRows.push(row);
              }
            }
            
            // Ajouter le chunk aux données
            this.allRows.push(...chunkRows);
            processedLines += chunkLines.length;
            
            // Mettre à jour la progression pour gros fichiers
            if (isLargeFile) {
              updateProgress();
            }
            
            // Permettre à l'interface de respirer (plus fréquent pour gros fichiers)
            const yieldInterval = isLargeFile ? chunkSize : chunkSize * 5;
            if (i % yieldInterval === 0) {
              await new Promise(resolve => setTimeout(resolve, isLargeFile ? 0 : 1));
            }
          }
          
          console.log(`✅ Traitement CSV terminé: ${this.allRows.length.toLocaleString()} lignes`);
          resolve();
        } catch (error) {
          console.error('❌ Erreur lors du traitement optimisé:', error);
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file, 'UTF-8');
    });
  }
  
  // Méthode optimisée pour détecter le délimiteur
  private detectDelimiter(line: string): string {
    const delimiters = [';', ',', '\t', '|'];
    const scores: { [key: string]: number } = {};
    
    // Optimisation : analyser seulement les premiers caractères pour les gros fichiers
    const sampleLine = line.length > 1000 ? line.substring(0, 1000) : line;
    
    delimiters.forEach(delimiter => {
      const parts = sampleLine.split(delimiter);
      scores[delimiter] = parts.length;
    });
    
    // Retourner le délimiteur qui donne le plus de colonnes
    const bestDelimiter = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
    
    // Validation supplémentaire pour les gros fichiers
    if (line.length > 1000) {
      console.log(`🔍 Délimiteur détecté: "${bestDelimiter}" (${scores[bestDelimiter]} colonnes) sur échantillon de ${sampleLine.length} caractères`);
    }
    
    return bestDelimiter;
  }

  // Nouvelle méthode pour détecter les en-têtes dans les fichiers Excel
  private detectExcelHeaders(jsonData: any[][]): { headerRowIndex: number; headerRow: string[] } {
    console.log('🔄 VERSION AMÉLIORÉE - Détection des en-têtes Excel avec analyse étendue');
    
    // Mots-clés pour identifier les en-têtes
    const headerKeywords = [
      'N°', 'Date', 'Heure', 'Référence', 'Service', 'Paiement', 'Statut', 'Mode',
      'Compte', 'Wallet', 'Pseudo', 'Débit', 'Crédit', 'Montant', 'Commissions',
      'Opération', 'Agent', 'Correspondant', 'Sous-réseau', 'Transaction'
    ];
    
    let bestHeaderRowIndex = 0;
    let bestScore = 0;
    let bestHeaderRow: string[] = [];
    
    // Analyser plus de lignes pour trouver le meilleur candidat (optimisé pour gros fichiers)
    const maxRowsToCheck = Math.min(jsonData.length > 100000 ? 50 : 200, jsonData.length);
    
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
        return fixGarbledCharacters(String(cell).trim());
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

  private async readExcelFileOptimized(file: File): Promise<void> {
    try {
      console.log('🔄 VERSION AMÉLIORÉE - Début lecture fichier Excel avec détection d\'en-têtes étendue');
      const workbook = await this.readExcelFile(file);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Conversion en tableau de tableaux pour analyse
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      if (jsonData.length === 0) {
        console.log('❌ Fichier Excel vide');
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
        console.log('⚠️ Aucun en-tête valide détecté, tentative de fallback');
        // Essayer de trouver la première ligne avec des données
        for (let i = 0; i < Math.min(200, jsonData.length); i++) {
          const row = jsonData[i] as any[];
          if (row && row.length > 0) {
            const rowStrings = row.map((cell: any) => {
              if (cell === null || cell === undefined) return '';
              return String(cell).trim();
            });
            
            const nonEmptyCount = rowStrings.filter(cell => cell !== '').length;
            if (nonEmptyCount >= 2) {
              console.log(`🔍 Fallback: utilisation de la ligne ${i} avec ${nonEmptyCount} colonnes non vides`);
              const fallbackHeaders = rowStrings.map((h, idx) => h || `Col${idx + 1}`);
              const correctedHeaders = this.fixExcelColumnNames(fallbackHeaders);
              
              // Créer les lignes de données
              const rows: any[] = [];
              for (let j = i + 1; j < jsonData.length; j++) {
                const rowData = jsonData[j] as any[];
                if (!rowData || rowData.length === 0) continue;
                
                const row: any = {};
                correctedHeaders.forEach((header: string, index: number) => {
                  const value = rowData[index];
                  row[header] = value !== undefined && value !== null ? value : '';
                });
                rows.push(row);
              }
              
              console.log(`📊 Lignes de données créées (fallback): ${rows.length}`);
              
              // Mettre à jour les propriétés du composant
              this.allRows.push(...rows);
              this.allColumns = [...correctedHeaders];
              this.columns = [...correctedHeaders];
              
              console.log(`✅ Fichier Excel traité (fallback): ${rows.length} lignes, ${correctedHeaders.length} colonnes`);
              
              // Vérifier si c'est un fichier Orange Money et appliquer le filtre automatique
              const fileName = this.selectedFiles.length > 0 ? this.selectedFiles[0].name : '';
              const isOrangeMoneyFile = this.orangeMoneyUtilsService.isOrangeMoneyFile(fileName);
              
              if (isOrangeMoneyFile) {
                console.log('🎯 Fichier Orange Money détecté dans le traitement Excel (fallback)');
                // Appliquer le filtre automatique après un délai pour s'assurer que les données sont bien chargées
                setTimeout(() => {
                  this.applyAutomaticOrangeMoneyFilter();
                }, 500);
              }
              
              return;
            }
          }
        }
        
        console.log('❌ Impossible de trouver des en-têtes valides dans le fichier Excel');
        return;
      }
      
      // Corriger les caractères spéciaux dans les en-têtes
      const correctedHeaders = this.fixExcelColumnNames(headers);
      console.log(`🔧 En-têtes Excel corrigés:`, correctedHeaders);
      
      // Créer les lignes de données en commençant après la ligne d'en-tête
      const totalDataRows = jsonData.length - headerRowIndex - 1;
      const isLargeFile = totalDataRows > 100000; // Plus de 100k lignes
      const chunkSize = isLargeFile ? 5000 : 1000; // Chunks plus gros pour gros fichiers
      
      console.log(`📊 Traitement Excel optimisé: ${totalDataRows} lignes, chunks de ${chunkSize} (${isLargeFile ? 'gros fichier' : 'fichier normal'})`);
      
      // Mise à jour de la progression pour gros fichiers
      let processedRows = 0;
      const updateProgress = () => {
        if (isLargeFile) {
          this.processingProgress = Math.min(95, (processedRows / totalDataRows) * 100);
          this.processingMessage = `Traitement Excel: ${processedRows.toLocaleString()}/${totalDataRows.toLocaleString()} lignes`;
        }
      };
      
      // Traitement optimisé par chunks pour Excel
      for (let i = headerRowIndex + 1; i < jsonData.length; i += chunkSize) {
        const chunkEnd = Math.min(i + chunkSize, jsonData.length);
        const chunkRows: any[] = [];
        
        for (let j = i; j < chunkEnd; j++) {
          const rowData = jsonData[j] as any[];
          if (!rowData || rowData.length === 0) continue;
          
          const row: any = {};
          correctedHeaders.forEach((header: string, index: number) => {
            const value = rowData[index];
            row[header] = value !== undefined && value !== null ? value : '';
          });
          chunkRows.push(row);
        }
        
        // Ajouter le chunk aux données
        this.allRows.push(...chunkRows);
        processedRows += chunkRows.length;
        
        // Mettre à jour la progression pour gros fichiers
        if (isLargeFile) {
          updateProgress();
        }
        
        // Permettre à l'interface de respirer (plus fréquent pour gros fichiers)
        const yieldInterval = isLargeFile ? chunkSize : chunkSize * 5;
        if (i % yieldInterval === 0) {
          await new Promise(resolve => setTimeout(resolve, isLargeFile ? 0 : 1));
        }
      }
      
      console.log(`📊 Lignes de données Excel créées: ${this.allRows.length.toLocaleString()}`);
      
      // Mettre à jour les propriétés du composant
      this.allColumns = [...correctedHeaders];
      this.columns = [...correctedHeaders];
      
      console.log(`✅ Fichier Excel traité: ${this.allRows.length.toLocaleString()} lignes, ${correctedHeaders.length} colonnes`);
      console.log(`📋 Colonnes détectées:`, this.allColumns);
      
      // Vérifier si c'est un fichier Orange Money et appliquer le filtre automatique
      const fileName = this.selectedFiles.length > 0 ? this.selectedFiles[0].name : '';
      const isOrangeMoneyFile = this.orangeMoneyUtilsService.isOrangeMoneyFile(fileName);
      
      if (isOrangeMoneyFile) {
        console.log('🎯 Fichier Orange Money détecté dans le traitement Excel');
        // Appliquer le filtre automatique après un délai pour s'assurer que les données sont bien chargées
        setTimeout(() => {
          this.applyAutomaticOrangeMoneyFilter();
        }, 500);
      }
      
      // Détection automatique des types de champs
      this.performFieldTypeAnalysis();
      
    } catch (error) {
      console.error('❌ Erreur lors de la lecture du fichier Excel:', error);
      throw error;
    }
  }

  private async mergeColumnsOptimized(): Promise<string[]> {
    const allColsSet = new Set<string>();
    
    // Traitement optimisé par chunks
    for (let i = 0; i < this.allRows.length; i += this.chunkSize) {
      const chunk = this.allRows.slice(i, i + this.chunkSize);
      chunk.forEach(row => {
        Object.keys(row).forEach(col => allColsSet.add(col));
      });
    }
    
    return Array.from(allColsSet);
  }

  private async normalizeDataOptimized(): Promise<void> {
    // Traitement optimisé par chunks
    for (let i = 0; i < this.allRows.length; i += this.chunkSize) {
      const chunk = this.allRows.slice(i, i + this.chunkSize);
      const normalizedChunk = chunk.map(row => {
        const newRow: any = {};
        for (const col of this.allColumns) {
          newRow[col] = row[col] !== undefined ? row[col] : '';
        }
        return newRow;
      });
      
      // Remplacer les lignes dans le tableau original
      for (let j = 0; j < normalizedChunk.length; j++) {
        this.allRows[i + j] = normalizedChunk[j];
      }
    }
  }

  // Méthode utilitaire pour créer un délai
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Méthode d'optimisation mémoire pour gros fichiers
  private async optimizeMemoryUsage(): Promise<void> {
    try {
      console.log('🧹 Optimisation mémoire en cours...');
      
      // Forcer le garbage collection si disponible
      if ('gc' in window && typeof (window as any).gc === 'function') {
        (window as any).gc();
      }
      
      // Nettoyer les références temporaires
      this.displayedRows = [];
      
      // Compacter les données si nécessaire
      if (this.allRows.length > 1000000) {
        console.log('📦 Compaction des données pour optimiser la mémoire...');
        // Créer une copie compacte des données
        const compactRows = this.allRows.map(row => {
          const compactRow: any = {};
          Object.keys(row).forEach(key => {
            if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
              compactRow[key] = row[key];
            }
          });
          return compactRow;
        });
        this.allRows = compactRows;
      }
      
      // Pause pour permettre au navigateur de libérer la mémoire
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('✅ Optimisation mémoire terminée');
    } catch (error) {
      console.warn('⚠️ Erreur lors de l\'optimisation mémoire:', error);
    }
  }

  // Méthode optimisée pour traiter les données en arrière-plan sans bloquer l'interface
  private async processDataInBackground<T>(
    data: T[], 
    processor: (chunk: T[]) => void, 
    chunkSize: number = 5000, // Chunks plus grands pour optimiser
    progressCallback?: (progress: number) => void
  ): Promise<void> {
    const totalChunks = Math.ceil(data.length / chunkSize);
    let processedChunks = 0;

    // Traitement par chunks optimisé
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      
      // Traiter le chunk immédiatement
      processor(chunk);
      processedChunks++;
      
      // Mettre à jour la progression
      if (progressCallback) {
        const progress = (processedChunks / totalChunks) * 100;
        progressCallback(progress);
      }
      
      // Céder le contrôle moins fréquemment pour optimiser la vitesse
      if (processedChunks % 10 === 0) { // Tous les 10 chunks
        await new Promise<void>((resolve) => {
          if ('requestIdleCallback' in window) {
            (window as any).requestIdleCallback(() => resolve(), { timeout: 10 });
          } else {
            setTimeout(resolve, 0);
          }
        });
      }
    }
  }

  // Nouvelle méthode asynchrone pour lire les fichiers Excel
  async readExcelFileAsync(file: File) {
    try {
      const workbook = await this.readExcelFile(file);
      let header: string[] | undefined = undefined;
      
      for (let i = 0; i < workbook.SheetNames.length; i++) {
        try {
          const sheetName = workbook.SheetNames[i];
          this.processingMessage = `Traitement de la feuille: ${sheetName}`;
          await this.delay(10);
          
          const worksheet = workbook.Sheets[sheetName];
          let rows: any[];
          
          if (i === 0) {
            // Première feuille : extraire l'en-tête
            rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
            if (rows.length > 0) {
              header = Object.keys(rows[0]);
              console.log('En-tête extrait:', header);
            }
          } else {
            // Autres feuilles : lire sans en-tête et mapper avec l'en-tête de la première feuille
            const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '', header: 1 });
            console.log('Raw rows pour feuille', sheetName, ':', rawRows.length);
            
            if (header && rawRows.length > 0) {
              rows = rawRows.map((row: any) => {
                const mappedRow: any = {};
                header!.forEach((colName, index) => {
                  mappedRow[colName] = row[index] || '';
                });
                return mappedRow;
              });
            } else {
              rows = [];
            }
          }
          
          console.log('Feuille lue :', sheetName, 'Nombre de lignes :', rows.length, 'Header:', header ? 'présent' : 'absent');
          
          if (rows.length > 0) {
            console.log('Ajout de', rows.length, 'lignes à allRows');
            try {
              console.log('Début du try-catch pour l\'ajout');
              
              // Traitement en arrière-plan avec chunks très petits
              await this.processDataInBackground(
                rows,
                (chunk) => {
                  this.combinedRows.push(...chunk);
                  this.allRows.push(...chunk);
                },
                50, // Chunks très petits pour éviter le blocage
                (progress) => {
                  this.processingMessage = `Traitement de la feuille ${sheetName}: ${Math.round(progress)}%`;
                }
              );
              
              console.log('Immédiatement après ajout - allRows.length:', this.allRows.length);
              const rowCols = header ? header : Object.keys(rows[0]);
              
              for (const col of rowCols) {
                if (!this.columns.includes(col)) {
                  this.columns.push(col);
                }
                if (!this.allColumns.includes(col)) {
                  this.allColumns.push(col);
                }
              }
              
              console.log('Après ajout - allRows.length:', this.allRows.length, 'columns.length:', this.columns.length);
            } catch (addError) {
              console.error('Erreur lors de l\'ajout des lignes:', addError);
              this.showError('upload', `Erreur lors du traitement de la feuille ${sheetName}: ${addError}`);
            }
          }
        } catch (sheetError) {
          console.error('Erreur lors du traitement de la feuille', workbook.SheetNames[i], ':', sheetError);
          this.showError('upload', `Erreur lors du traitement de la feuille ${workbook.SheetNames[i]}: ${sheetError}`);
          // Continuer avec les autres feuilles
        }
      }
    } catch (e) {
      console.error('Erreur lors de la lecture du fichier Excel:', e);
      this.showError('upload', 'Erreur lors de la lecture du fichier Excel.');
      throw e;
    }
  }

  // Méthode améliorée pour détecter automatiquement les séparateurs CSV
  detectCsvDelimiter(csvContent: string): string {
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) return ';';

    const firstLine = lines[0];
    const secondLine = lines.length > 1 ? lines[1] : '';
    
    // Séparateurs à tester
    const delimiters = [',', ';', '\t', '|', ':'];
    const delimiterScores: { [key: string]: number } = {};
    
    // Analyser la première ligne pour chaque séparateur
    delimiters.forEach(delimiter => {
      const fields = firstLine.split(delimiter);
      delimiterScores[delimiter] = fields.length;
    });
    
    // Si on a une deuxième ligne, comparer la cohérence
    if (secondLine) {
      delimiters.forEach(delimiter => {
        const fields1 = firstLine.split(delimiter);
        const fields2 = secondLine.split(delimiter);
        
        // Bonus pour la cohérence entre les lignes
        if (Math.abs(fields1.length - fields2.length) <= 1) {
          delimiterScores[delimiter] += 10;
        }
      });
    }
    
    // Trouver le séparateur avec le meilleur score
    let bestDelimiter = ';';
    let bestScore = 0;
    
    Object.entries(delimiterScores).forEach(([delimiter, score]) => {
      if (score > bestScore) {
        bestScore = score;
        bestDelimiter = delimiter;
      }
    });
    
    console.log('Scores des séparateurs:', delimiterScores);
    console.log('Séparateur détecté:', bestDelimiter);
    
    return bestDelimiter;
  }

  // Méthode pour prévisualiser les données CSV
  async previewCsvData(csvContent: string, delimiter: string): Promise<{ columns: string[], data: any[], hasHeader: boolean }> {
    return new Promise((resolve, reject) => {
      // Détecter si c'est un fichier Orange Money AVANT le parsing
      const orangeMoneyDetection = this.detectOrangeMoneyFile(csvContent, delimiter);
      this.isOrangeMoneyFile = orangeMoneyDetection.isOrangeMoney;
      this.orangeMoneyHeaderRowIndex = orangeMoneyDetection.headerRowIndex;
      
      if (orangeMoneyDetection.isOrangeMoney) {
        console.log(`🟠 Fichier Orange Money détecté - Utilisation des colonnes détectées`);
        
        // Parser sans header pour avoir toutes les lignes
        Papa.parse(csvContent, {
          header: false,
          delimiter,
          skipEmptyLines: true,
          complete: (results) => {
            const rawRows = results.data as any[];
            console.log(`📊 Lignes brutes parsées: ${rawRows.length}`);
            
            if (rawRows.length > orangeMoneyDetection.headerRowIndex) {
              // Utiliser les colonnes détectées
              const headerRow = orangeMoneyDetection.headerRow;
              const columns = headerRow.map((col, index) => col || `Col${index + 1}`);
              
              // Extraire les données à partir de la ligne après l'en-tête
              const dataRows = rawRows.slice(orangeMoneyDetection.headerRowIndex + 1, orangeMoneyDetection.headerRowIndex + 11);
              const data = dataRows.map((row: any[]) => {
                const obj: any = {};
                columns.forEach((col, idx) => {
                  obj[col] = row[idx] || '';
                });
                return obj;
              });
              
              console.log(`📊 Prévisualisation Orange Money: ${columns.length} colonnes, ${data.length} lignes`);
              console.log(`📊 En-tête détecté:`, columns);
              console.log(`📊 Données d'exemple:`, data.slice(0, 2));
              
              // Mettre à jour l'interface avec les colonnes détectées
              this.updateOrangeMoneyDisplay(columns);
              
              resolve({ columns, data, hasHeader: true });
            } else {
              resolve({ columns: [], data: [], hasHeader: false });
            }
          },
          error: (error: any) => {
            reject(error);
          }
        });
        return;
      }
      
      // Traitement normal pour les autres fichiers
      Papa.parse(csvContent, {
        delimiter,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as any[];
          if (rows.length === 0) {
            resolve({ columns: [], data: [], hasHeader: false });
            return;
          }
          
          // Essayer avec header d'abord
          Papa.parse(csvContent, {
            header: true,
            delimiter,
            skipEmptyLines: true,
            complete: (headerResults) => {
              const headerRows = headerResults.data as any[];
              const firstRow = headerRows[0] || {};
              const allKeys = Object.keys(firstRow);
              
              // Vérifier si ça ressemble à un header valide
              const looksLikeHeader = allKeys.length > 1 && 
                !allKeys.some(k => k.toLowerCase().startsWith('field')) &&
                allKeys.some(k => k.trim().length > 0);
              
              if (looksLikeHeader) {
                // Avec header
                const columns = allKeys.map((key, index) => key || `Col${index + 1}`);
                const data = headerRows.slice(0, 10); // Limiter à 10 lignes pour la prévisualisation
                resolve({ columns, data, hasHeader: true });
              } else {
                // Sans header
                const firstRow = rows[0];
                const columns = firstRow.map((val: any, index: number) => 
                  val ? val.toString() : `Col${index + 1}`
                );
                const data = rows.slice(0, 10); // Limiter à 10 lignes pour la prévisualisation
                resolve({ columns, data, hasHeader: false });
              }
            },
                         error: (error: any) => {
               reject(error);
             }
           });
         },
         error: (error: any) => {
           reject(error);
         }
      });
    });
  }

  async readCsvFile(file: File) {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e: any) => {
        try {
          const csv = e.target.result;
          
          // Détection automatique du séparateur
          this.detectedDelimiter = this.detectCsvDelimiter(csv);
          console.log('Séparateur CSV détecté:', this.detectedDelimiter);
          
          // Détecter si c'est un fichier Orange Money AVANT la prévisualisation
          const orangeMoneyDetection = this.detectOrangeMoneyFile(csv, this.detectedDelimiter);
          this.isOrangeMoneyFile = orangeMoneyDetection.isOrangeMoney;
          this.orangeMoneyHeaderRowIndex = orangeMoneyDetection.headerRowIndex;
          
          console.log(`🟠 Détection Orange Money - isOrangeMoneyFile: ${this.isOrangeMoneyFile}`);
          
          // Prévisualiser les données
          try {
            console.log('🔄 DÉBUT PRÉVISUALISATION - Vérification du rechargement du code');
            const preview = await this.previewCsvData(csv, this.detectedDelimiter);
            this.csvPreviewColumns = preview.columns;
            this.csvPreviewData = preview.data;
            this.showCsvPreview = true;
            
            // Si c'est un fichier Orange Money, utiliser les colonnes détectées
            console.log(`🔄 PRÉVISUALISATION - isOrangeMoneyFile: ${this.isOrangeMoneyFile}`);
            console.log(`🔄 PRÉVISUALISATION - preview.columns:`, preview.columns);
            console.log(`🔄 PRÉVISUALISATION - orangeMoneyDetection.headerRow:`, orangeMoneyDetection.headerRow);
            
            if (this.isOrangeMoneyFile) {
              console.log(`🟠 Prévisualisation - isOrangeMoneyFile: ${this.isOrangeMoneyFile}`);
              console.log(`🟠 Prévisualisation - preview.columns:`, preview.columns);
              console.log(`🟠 Prévisualisation - orangeMoneyDetection.headerRow:`, orangeMoneyDetection.headerRow);
              
              // Utiliser les colonnes détectées au lieu des colonnes de prévisualisation
              this.updateOrangeMoneyDisplay(orangeMoneyDetection.headerRow);
              console.log(`🟠 Interface mise à jour avec les colonnes Orange Money:`, orangeMoneyDetection.headerRow);
            } else {
              console.log(`❌ Prévisualisation - isOrangeMoneyFile: ${this.isOrangeMoneyFile}`);
            }
            
            console.log('Prévisualisation CSV:', {
              columns: preview.columns,
              dataLength: preview.data.length,
              hasHeader: preview.hasHeader
            });
          } catch (previewError) {
            console.warn('Erreur lors de la prévisualisation:', previewError);
          }
          
          if (orangeMoneyDetection.isOrangeMoney) {
            // Traitement spécial pour les fichiers Orange Money
            console.log('🟠 Traitement fichier Orange Money détecté');
            
            // Mettre à jour l'interface immédiatement avec les colonnes détectées
            this.updateOrangeMoneyDisplay(orangeMoneyDetection.headerRow);
            
            Papa.parse(csv, {
              header: false,
              delimiter: this.detectedDelimiter,
              skipEmptyLines: true,
              complete: async (results) => {
                try {
                  const rawRows = results.data as any[];
                  console.log(`CSV Orange Money parsé: ${rawRows.length} lignes brutes`);
                  
                  if (rawRows.length > orangeMoneyDetection.headerRowIndex) {
                    const headerRow = orangeMoneyDetection.headerRow;
                    const dataRows = rawRows.slice(orangeMoneyDetection.headerRowIndex + 1);
                    const colNames = headerRow.map((v: any, i: number) => v ? v.toString() : 'Col' + (i+1));
                    
                    console.log(`Traitement Orange Money: ${dataRows.length} lignes de données avec ${colNames.length} colonnes`);
                    console.log(`Colonnes détectées:`, colNames);
                    
                    // Traitement en arrière-plan avec chunks très petits
                    await this.processDataInBackground(
                      dataRows,
                      (chunk) => {
                        const rowsWithHeader = chunk.map((row: any[]) => {
                          const obj: any = {};
                          colNames.forEach((col: string, idx: number) => {
                            obj[col] = row[idx];
                          });
                          return obj;
                        });
                        
                        this.combinedRows.push(...rowsWithHeader);
                        this.allRows.push(...rowsWithHeader);
                      },
                      50, // Chunks très petits pour éviter le blocage
                      (progress) => {
                        this.processingMessage = `Traitement Orange Money: ${Math.round(progress)}%`;
                      }
                    );
                    
                    for (const col of colNames) {
                      if (!this.columns.includes(col)) this.columns.push(col);
                      if (!this.allColumns.includes(col)) this.allColumns.push(col);
                    }
                    
                    console.log(`Orange Money traité avec succès: ${this.allRows.length} lignes ajoutées`);
                  }
                  this.cd.detectChanges();
                  resolve();
                } catch (error) {
                  console.error('Erreur lors du traitement Orange Money:', error);
                  reject(error);
                }
              },
              error: (err) => {
                console.error('Erreur lors de la lecture du CSV Orange Money:', err);
                this.showError('upload', 'Erreur lors de la lecture du fichier Orange Money.');
                reject(err);
              }
            });
            return;
          }
          
                      // On tente d'abord avec header: true
            Papa.parse(csv, {
              header: true,
              delimiter: this.detectedDelimiter,
              skipEmptyLines: true,
            complete: async (results) => {
              try {
                let rows = results.data as any[];
                console.log(`CSV parsé avec header: ${rows.length} lignes détectées`);
                
                // Si les colonnes sont nommées field1, field2... ou qu'il n'y a qu'une seule colonne, on relit sans header
                const firstRow = rows[0] || {};
                const allKeys = Object.keys(firstRow);
                const looksLikeNoHeader = allKeys.length <= 1 || allKeys.some(k => k.toLowerCase().startsWith('field'));
                
                if (looksLikeNoHeader) {
                  console.log('Détection d\'un fichier sans en-tête, relecture...');
                  Papa.parse(csv, {
                    header: false,
                    delimiter: this.detectedDelimiter, // Utiliser le séparateur détecté
                    skipEmptyLines: true,
                    complete: async (res2) => {
                      try {
                        const rawRows = res2.data as any[];
                        console.log(`CSV parsé sans header: ${rawRows.length} lignes brutes`);
                        
                        if (rawRows.length > 1) {
                          const headerRow = rawRows[0];
                          const dataRows = rawRows.slice(1);
                          const colNames = headerRow.map((v: any, i: number) => v ? v.toString() : 'Col' + (i+1));
                          
                          console.log(`Traitement de ${dataRows.length} lignes de données avec ${colNames.length} colonnes`);
                          
                          // Traitement en arrière-plan avec chunks très petits
                          await this.processDataInBackground(
                            dataRows,
                            (chunk) => {
                              const rowsWithHeader = chunk.map((row: any[]) => {
                                const obj: any = {};
                                colNames.forEach((col: string, idx: number) => {
                                  obj[col] = row[idx];
                                });
                                return obj;
                              });
                              
                              this.combinedRows.push(...rowsWithHeader);
                              this.allRows.push(...rowsWithHeader);
                            },
                            50, // Chunks très petits pour éviter le blocage
                            (progress) => {
                              this.processingMessage = `Traitement CSV: ${Math.round(progress)}%`;
                            }
                          );
                          
                          for (const col of colNames) {
                            if (!this.columns.includes(col)) this.columns.push(col);
                            if (!this.allColumns.includes(col)) this.allColumns.push(col);
                          }
                          
                          console.log(`CSV traité avec succès: ${this.allRows.length} lignes ajoutées`);
                        }
                        this.cd.detectChanges();
                        resolve();
                      } catch (error) {
                        console.error('Erreur lors du traitement CSV sans header:', error);
                        reject(error);
                      }
                    },
                    error: (err) => {
                      console.error('Erreur lors de la lecture du CSV sans header:', err);
                      this.showError('upload', 'Erreur lors de la lecture du CSV.');
                      reject(err);
                    }
                  });
                  return;
                }
                
                // Cas normal avec header
                if (rows.length > 0) {
                  console.log(`Traitement de ${rows.length} lignes avec en-tête`);
                  
                  // Traitement en arrière-plan avec chunks très petits
                  await this.processDataInBackground(
                    rows,
                    (chunk) => {
                      this.combinedRows.push(...chunk);
                      this.allRows.push(...chunk);
                    },
                    50, // Chunks très petits pour éviter le blocage
                    (progress) => {
                      this.processingMessage = `Traitement CSV: ${Math.round(progress)}%`;
                    }
                  );
                  
                  const rowCols = Object.keys(rows[0]);
                  for (const col of rowCols) {
                    if (!this.columns.includes(col)) {
                      this.columns.push(col);
                    }
                    if (!this.allColumns.includes(col)) {
                      this.allColumns.push(col);
                    }
                  }
                  
                  console.log(`CSV traité avec succès: ${this.allRows.length} lignes ajoutées, ${this.columns.length} colonnes`);
                }
                this.cd.detectChanges();
                resolve();
              } catch (error) {
                console.error('Erreur lors du traitement CSV avec header:', error);
                reject(error);
              }
            },
            error: (err) => {
              console.error('Erreur lors de la lecture du CSV avec header:', err);
              this.showError('upload', 'Erreur lors de la lecture du CSV.');
              reject(err);
            }
          });
        } catch (error) {
          console.error('Erreur lors du traitement CSV:', error);
          reject(error);
        }
      };
      reader.onerror = () => {
        console.error('Erreur lors de la lecture du fichier CSV');
        this.showError('upload', 'Erreur lors de la lecture du fichier.');
        reject();
      };
      reader.readAsText(file, 'utf-8');
    });
  }

  updateDisplayedRows() {
    console.log('updateDisplayedRows appelée - selectionApplied:', this.selectionApplied, 'selectedCols.length:', this.selectedCols.length);
    console.log('allRows.length:', this.allRows.length, 'allColumns.length:', this.allColumns.length);
    
    // Vérification spéciale pour Orange Money
    if (this.isOrangeMoneyFile) {
      console.log(`🟠 Vérification Orange Money - allColumns:`, this.allColumns);
      console.log(`🟠 Vérification Orange Money - columns:`, this.columns);
    }
    
    // Si une sélection est appliquée, afficher seulement les colonnes sélectionnées
    if (this.selectionApplied && this.selectedCols.length > 0) {
      this.combinedRows = this.allRows.map(row => {
        const newRow: any = {};
        for (const col of this.selectedCols) {
          newRow[col] = row[col];
        }
        return newRow;
      });
      this.columns = [...this.selectedCols];
      console.log('Affichage filtré - combinedRows.length:', this.combinedRows.length, 'columns.length:', this.columns.length);
    } else {
      // Si pas de sélection appliquée, afficher toutes les colonnes
      // Ne pas réinitialiser combinedRows si des modifications ont été appliquées
      const hasExistingData = this.combinedRows.length > 0;
      const hasSameRowCount = this.combinedRows.length === this.allRows.length;
      
      if (!hasExistingData || !hasSameRowCount) {
        this.combinedRows = [...this.allRows];
        this.columns = [...this.allColumns];
        console.log('Affichage complet - combinedRows.length:', this.combinedRows.length, 'columns.length:', this.columns.length);
      } else {
        console.log('Conservation des modifications de formatage - combinedRows.length:', this.combinedRows.length);
      }
    }
    
    // Réinitialiser la pagination pour le premier chargement
    this.currentPage = 1;
    this.showAllRows = false;
    
    // Optimisation automatique pour les gros fichiers
    this.optimizeForLargeFiles();
    
    // Mettre à jour l'affichage paginé
    this.updatePagination();
    
    // Forcer la détection de changement avec un délai pour s'assurer que le DOM est prêt
    setTimeout(() => {
      this.cd.detectChanges();
      // Forcer un second rafraîchissement pour s'assurer que tout est bien affiché
      setTimeout(() => {
        this.cd.detectChanges();
      }, 100);
    }, 50);
  }

  updatePagination() {
    // S'assurer que la pagination est correctement initialisée
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }
    this.updateDisplayedRowsForPage();
    
    // Forcer la détection de changement
    this.cd.detectChanges();
  }

  updateDisplayedRowsForPage() {
    console.log('updateDisplayedRowsForPage - combinedRows.length:', this.combinedRows.length, 'showAllRows:', this.showAllRows, 'maxDisplayedRows:', this.maxDisplayedRows);
    
    if (this.showAllRows || this.combinedRows.length <= this.maxDisplayedRows) {
      this.displayedRows = this.combinedRows;
      console.log('Affichage complet - displayedRows.length:', this.displayedRows.length);
    } else {
      const startIndex = (this.currentPage - 1) * this.rowsPerPage;
      const endIndex = startIndex + this.rowsPerPage;
      this.displayedRows = this.combinedRows.slice(startIndex, endIndex);
      console.log('Affichage paginé - page:', this.currentPage, 'startIndex:', startIndex, 'endIndex:', endIndex, 'displayedRows.length:', this.displayedRows.length);
    }
    
    // Forcer la détection de changement avec un délai pour s'assurer que le DOM est prêt
    setTimeout(() => {
      this.cd.detectChanges();
      // Forcer un second rafraîchissement pour s'assurer que tout est bien affiché
      setTimeout(() => {
        this.cd.detectChanges();
      }, 100);
    }, 50);
  }

  get totalPages(): number {
    if (this.showAllRows || this.combinedRows.length <= this.maxDisplayedRows) {
      return 1;
    }
    return Math.ceil(this.combinedRows.length / this.rowsPerPage);
  }

  get startRow(): number {
    if (this.showAllRows || this.combinedRows.length <= this.maxDisplayedRows) {
      return 1;
    }
    return (this.currentPage - 1) * this.rowsPerPage + 1;
  }

  get endRow(): number {
    if (this.showAllRows || this.combinedRows.length <= this.maxDisplayedRows) {
      return this.combinedRows.length;
    }
    return Math.min(this.currentPage * this.rowsPerPage, this.combinedRows.length);
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.updateDisplayedRowsForPage();
  }

  onRowsPerPageChange() {
    this.currentPage = 1;
    this.updateDisplayedRowsForPage();
  }

  toggleShowAllRows() {
    this.showAllRows = !this.showAllRows;
    this.updateDisplayedRowsForPage();
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const totalPages = this.totalPages;
    const currentPage = this.currentPage;
    
    // Toujours afficher la première page
    pages.push(1);
    
    // Ajouter les pages autour de la page courante
    const start = Math.max(2, currentPage - 2);
    const end = Math.min(totalPages - 1, currentPage + 2);
    
    if (start > 2) {
      pages.push(-1); // Indicateur de pages manquantes
    }
    
    for (let i = start; i <= end; i++) {
      if (i > 1 && i < totalPages) {
        pages.push(i);
      }
    }
    
    if (end < totalPages - 1) {
      pages.push(-1); // Indicateur de pages manquantes
    }
    
    // Toujours afficher la dernière page
    if (totalPages > 1) {
      pages.push(totalPages);
    }
    
    return pages;
  }

  // Méthode pour optimiser les performances d'affichage
  optimizeForLargeFiles() {
    if (this.combinedRows.length > 50000) {
      // Pour les très gros fichiers, réduire automatiquement le nombre de lignes par page
      if (this.rowsPerPage > 200) {
        this.rowsPerPage = 200;
        this.showSuccess('performance', 'Performance optimisée pour les gros fichiers. Affichage limité à 200 lignes par page.');
      }
      
      // Désactiver l'option "Afficher toutes les lignes" pour les très gros fichiers
      if (this.showAllRows) {
        this.showAllRows = false;
        this.updateDisplayedRowsForPage();
        this.showSuccess('performance', 'Affichage optimisé pour les performances. Utilisez la pagination pour naviguer.');
      }
    }
  }

  // Méthode pour obtenir des statistiques sur le fichier
  getFileStats() {
    return {
      totalRows: this.combinedRows.length,
      totalColumns: this.columns.length,
      fileSize: this.estimateFileSize(),
      isLargeFile: this.combinedRows.length > 100000,
      isVeryLargeFile: this.combinedRows.length > 500000
    };
  }

  // Estimation de la taille du fichier en mémoire
  private estimateFileSize(): string {
    if (this.combinedRows.length === 0) return '0 MB';
    
    // Estimation approximative : chaque ligne ≈ 1KB
    const estimatedSizeMB = (this.combinedRows.length * 1024) / (1024 * 1024);
    
    if (estimatedSizeMB > 1024) {
      return `${(estimatedSizeMB / 1024).toFixed(1)} GB`;
    } else {
      return `${estimatedSizeMB.toFixed(1)} MB`;
    }
  }

  onDedupColChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.checked) {
      if (!this.dedupCols.includes(input.value)) {
        this.dedupCols.push(input.value);
      }
    } else {
      this.dedupCols = this.dedupCols.filter(col => col !== input.value);
    }
  }

  deduplicate() {
    try {
      if (this.dedupCols.length === 0) return;
      const seen = new Set<string>();
      const deduped: any[] = [];
      for (const row of this.combinedRows) {
        const key = this.dedupCols.map(col => (row[col] ?? '').toString().trim().toLowerCase()).join('||');
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(row);
        }
      }
      this.combinedRows = deduped;
      this.showSuccess('dedup', 'Doublons supprimés avec succès.');
    } catch (e) {
      this.showError('dedup', 'Erreur lors de la suppression des doublons.');
    }
  }

  hasFormattingOption(): boolean {
    return this.formatOptions.removeCharacters || this.formatOptions.removeNumbers || this.formatOptions.removeIndicatif || this.formatOptions.removeDecimals || this.formatOptions.keepLastDigits;
  }

  hasHeaderFormattingOption(): boolean {
    return false; // Plus d'options d'en-têtes
  }

  applyHeaderFormatting() {
    this.showError('format', 'Aucune option de formatage des en-têtes disponible.');
  }

  applyFormatting() {
    if (this.formatOptions.removeCharacters) {
      this.applyRemoveCharactersFormatting();
    }
    if (this.formatOptions.removeNumbers) {
      this.applyRemoveNumbersFormatting();
    }
    if (this.formatOptions.removeIndicatif) {
      this.applyRemoveIndicatifFormatting();
    }
    if (this.formatOptions.removeDecimals) {
      this.applyRemoveDecimalsFormatting();
    }
    if (this.formatOptions.keepLastDigits) {
      this.applyKeepLastDigitsFormatting();
    }
  }

  // Méthode simple qui ne fait rien
  private normalizeColumnHeaders() {
    // Ne fait rien - les colonnes restent inchangées
  }

  // Méthode simple qui retourne la valeur sans modification
  private fixSpecialCharacters(text: string): string {
    return text;
  }

  // Méthode simple qui retourne la valeur sans modification
  private removeAccents(text: string): string {
    return text;
  }

  // Méthode simple qui retourne la valeur sans modification
  private standardizeHeader(text: string): string {
    return text;
  }

  // Méthode simple qui retourne la valeur sans modification
  private normalizeHeader(text: string): string {
    return text;
  }

  applyExtraction() {
    try {
      if (!this.extractCol || !this.extractType) return;
      // Utilise la clé personnalisée si fournie, sinon nom par défaut
      const newCol = this.extractKey?.trim() ? this.extractKey.trim() : this.getExtractionColName();
      for (const row of this.combinedRows) {
        const value = row[this.extractCol];
        if (typeof value === 'string') {
          if (this.extractType === 'emailDomain') {
            const atIdx = value.indexOf('@');
            row[newCol] = atIdx !== -1 ? value.substring(atIdx + 1) : '';
          } else if (this.extractType === 'firstChars') {
            // Extraction à gauche à partir de extractStart (1-based)
            const start = Math.max(0, (this.extractStart || 1) - 1);
            row[newCol] = value.substring(start, start + this.extractCount);
          } else if (this.extractType === 'lastChars') {
            // Extraction à droite à partir de extractStart (depuis la fin, 1-based)
            const start = Math.max(0, value.length - (this.extractStart || 1) - this.extractCount + 1);
            row[newCol] = value.substring(start, start + this.extractCount);
          }
        } else {
          row[newCol] = '';
        }
      }
      // Ajoute la colonne extraite en première position si pas déjà présente
      if (!this.columns.includes(newCol)) {
        this.columns = [newCol, ...this.columns];
      } else {
        this.columns = [newCol, ...this.columns.filter(c => c !== newCol)];
      }
      this.showSuccess('extract', 'Extraction réalisée avec succès.');
    } catch (e) {
      this.showError('extract', 'Erreur lors de l\'extraction.');
    }
  }

  getExtractionColName(): string {
    if (this.extractType === 'emailDomain') {
      return this.extractCol + '_domaine';
    } else if (this.extractType === 'firstChars') {
      return this.extractCol + '_debut_' + this.extractCount;
    } else if (this.extractType === 'lastChars') {
      return this.extractCol + '_fin_' + this.extractCount;
    }
    return this.extractCol + '_extrait';
  }

  resetExtraction() {
    this.extractCol = '';
    this.extractType = '';
    this.extractKey = '';
    this.extractStart = 1;
    this.extractCount = 1;
    this.successMsg.extract = '';
    this.errorMsg.extract = '';
  }

  onSelectColChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.checked) {
      if (!this.selectedCols.includes(input.value)) {
        this.selectedCols.push(input.value);
      }
    } else {
      this.selectedCols = this.selectedCols.filter(col => col !== input.value);
    }
  }

  applyColumnSelection() {
    try {
      if (this.selectedCols.length === 0) {
        // Si aucune colonne n'est sélectionnée, sélectionner toutes les colonnes actuellement affichées
        this.selectedCols = [...this.columns];
      }
      this.selectionApplied = true;
      this.updateDisplayedRows();
      this.autoShowPreviewSection(); // Afficher automatiquement la section d'aperçu
      this.showSuccess('select', 'Sélection de colonnes appliquée.');
    } catch (e) {
      this.showError('select', 'Erreur lors de la sélection de colonnes.');
    }
  }

  resetColumnSelection() {
    // Garder les colonnes actuellement affichées comme sélectionnées
    this.selectedCols = [...this.columns];
    this.selectionApplied = false;
    this.updateDisplayedRows();
    this.showSuccess('select', 'Sélection réinitialisée. Vous pouvez maintenant ajouter d\'autres colonnes.');
  }

  onFilterColumnChange() {
    if (this.selectedFilterColumn) {
      // Extraire les valeurs uniques de la colonne sélectionnée (comportement normal)
      console.log('🔍 Extraction des valeurs pour la colonne:', this.selectedFilterColumn);
      console.log('📊 Nombre total de lignes:', this.allRows.length);
      console.log('📋 Colonnes disponibles:', this.columns);
      console.log('📋 Toutes les colonnes:', this.allColumns);
      
      // Vérifier si la colonne existe dans les données
      if (this.allRows.length > 0) {
        const firstRow = this.allRows[0];
        console.log('🔍 Première ligne de données:', firstRow);
        console.log('🔍 Clés de la première ligne:', Object.keys(firstRow));
        console.log('🔍 La colonne sélectionnée existe-t-elle?', this.selectedFilterColumn in firstRow);
      }
      
      // Extraire toutes les valeurs uniques de la colonne sélectionnée depuis allRows (données originales)
      const uniqueValues = Array.from(new Set(this.allRows.map(row => row[this.selectedFilterColumn])));
      console.log('🔍 Valeurs uniques trouvées:', uniqueValues);
      console.log('🔍 Nombre de valeurs uniques:', uniqueValues.length);
      
      this.filterValues = uniqueValues;
      this.filteredFilterValues = this.filterValues.slice();
      this.selectedFilterValues = [];
    } else {
      this.filterValues = [];
      this.filteredFilterValues = [];
      this.selectedFilterValues = [];
    }
  }

  selectAllFilterValues() {
    // Si "Tous" est sélectionné, sélectionner toutes les valeurs
    if (this.selectedFilterValues.includes('__TOUS__')) {
      this.selectedFilterValues = ['__TOUS__', ...this.filteredFilterValues];
    } else {
      // Retirer "Tous" si d'autres valeurs sont sélectionnées
      this.selectedFilterValues = this.selectedFilterValues.filter(val => val !== '__TOUS__');
    }
  }

  applyFilter() {
    if (this.selectedFilterColumn && this.selectedFilterValues && this.selectedFilterValues.length > 0) {
      // Si "Tous" est sélectionné, ne pas filtrer (garder toutes les lignes)
      if (this.selectedFilterValues.includes('__TOUS__')) {
        this.filteredRows = [...this.originalRows];
        this.allRows = [...this.originalRows];
        this.combinedRows = [...this.originalRows];
        this.filterApplied = true;
        this.showSuccess('filter', `Aucun filtre appliqué - toutes les lignes conservées (${this.combinedRows.length} lignes).`);
      } else {
        // Filtrage normal basé sur les valeurs sélectionnées
        this.filteredRows = this.originalRows.filter(row => this.selectedFilterValues.includes(row[this.selectedFilterColumn]));
        this.allRows = [...this.filteredRows];
        this.combinedRows = [...this.filteredRows];
        this.filterApplied = true;
        this.showSuccess('filter', `Filtre appliqué sur « ${this.selectedFilterColumn} » = « ${this.selectedFilterValues.join(', ')} » (${this.combinedRows.length} lignes).`);
      }
      this.updateDisplayedRows();
      this.autoShowPreviewSection(); // Afficher automatiquement la section d'aperçu
    }
  }

  resetFilter() {
    this.selectedFilterColumn = '';
    this.selectedFilterValues = [];
    this.filterValues = [];
    this.filteredFilterValues = [];
    this.filterApplied = false;
    this.allRows = [...this.originalRows];
    this.combinedRows = [...this.originalRows];
    this.updateDisplayedRows();
  }

  // --- MÉTHODES POUR FILTRES MULTIPLES ---

  addNewFilter() {
    const newFilter = {
      id: `filter_${this.nextFilterId++}`,
      column: '',
      values: [],
      selectedValues: [],
      filterValues: [],
      filteredFilterValues: [],
      enabled: true
    };
    this.multipleFilters.push(newFilter);
    this.showSuccess('filter', 'Nouveau filtre ajouté. Sélectionnez une colonne pour commencer.');
  }

  removeFilter(filterId: string) {
    this.multipleFilters = this.multipleFilters.filter(f => f.id !== filterId);
    this.applyMultipleFilters();
    this.showSuccess('filter', 'Filtre supprimé.');
  }

  onMultipleFilterColumnChange(filter: any) {
    if (filter.column) {
      // Extraire les valeurs uniques de la colonne sélectionnée
      const uniqueValues = Array.from(new Set(this.allRows.map(row => row[filter.column])));
      filter.values = uniqueValues;
      filter.filteredFilterValues = filter.values.slice();
      filter.selectedValues = [];
    } else {
      filter.values = [];
      filter.filteredFilterValues = [];
      filter.selectedValues = [];
    }
  }

  selectAllMultipleFilterValues(filter: any) {
    if (filter.selectedValues.includes('__TOUS__')) {
      filter.selectedValues = ['__TOUS__', ...filter.filteredFilterValues];
    } else {
      filter.selectedValues = filter.selectedValues.filter(val => val !== '__TOUS__');
    }
  }

  applyMultipleFilters() {
    if (this.multipleFilters.length === 0) {
      // Aucun filtre, restaurer toutes les données
      this.allRows = [...this.originalRows];
      this.combinedRows = [...this.originalRows];
      this.filterApplied = false;
      this.updateDisplayedRows();
      return;
    }

    // Appliquer tous les filtres actifs
    let filteredData = [...this.originalRows];
    const appliedFilters: string[] = [];

    for (const filter of this.multipleFilters) {
      if (filter.enabled && filter.column && filter.selectedValues.length > 0) {
        if (filter.selectedValues.includes('__TOUS__')) {
          // "Tous" sélectionné, pas de filtrage pour cette colonne
          continue;
        }

        filteredData = filteredData.filter(row => 
          filter.selectedValues.includes(row[filter.column])
        );
        appliedFilters.push(`${filter.column}: ${filter.selectedValues.join(', ')}`);
      }
    }

    this.allRows = filteredData;
    this.combinedRows = filteredData;
    this.filterApplied = appliedFilters.length > 0;
    
    if (this.filterApplied) {
      this.showSuccess('filter', `Filtres appliqués: ${appliedFilters.join(' | ')} (${this.combinedRows.length} lignes).`);
    } else {
      this.showSuccess('filter', 'Aucun filtre actif appliqué - toutes les lignes conservées.');
    }
    
    this.updateDisplayedRows();
    this.autoShowPreviewSection();
  }

  resetAllFilters() {
    this.selectedFilterColumn = '';
    this.selectedFilterValues = [];
    this.filterValues = [];
    this.filteredFilterValues = [];
    this.multipleFilters = [];
    this.nextFilterId = 1;
    this.filterApplied = false;
    this.allRows = [...this.originalRows];
    this.combinedRows = [...this.originalRows];
    this.updateDisplayedRows();
    this.showSuccess('filter', 'Tous les filtres ont été réinitialisés.');
  }

  trackByFilterId(index: number, filter: any): string {
    return filter.id;
  }

  readExcelFile(file: File): Promise<XLSX.WorkBook> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          // Options spécifiques pour les fichiers .xls
          const options: XLSX.ParsingOptions = {
            type: 'array',
            cellDates: true,
            cellNF: false,
            cellText: false
          };
          const workbook = XLSX.read(data, options);
          resolve(workbook);
        } catch (error) {
          console.error('Erreur lors de la lecture du fichier Excel:', error);
          reject(error);
        }
      };
      reader.onerror = (error) => {
        console.error('Erreur FileReader:', error);
        reject(error);
      };
      reader.readAsArrayBuffer(file);
    });
  }

  // Propriété pour le nom du fichier d'export
  exportFileName: string = 'resultat.csv';

  // Propriétés pour l'affichage/masquage des sections
  showSections = {
    selectCols: false,
    extract: false,
    filter: false,
    concat: false,
    exportByType: false,
    exportByDate: false,
    dedup: false,
    format: false,
    preview: true  // Aperçu des données combinées visible par défaut
  };

  // Propriété pour vérifier si toutes les sections sont visibles
  get allSectionsVisible(): boolean {
    return Object.values(this.showSections).every(visible => visible);
  }

  exportCSV() {
    try {
      if (this.combinedRows.length === 0) return;
      // Remplacement de l'en-tête GRX par PAYS
      const exportColumns = this.columns.map(col => col === 'GRX' ? 'PAYS' : col);
      const csvRows: string[] = [];
      csvRows.push(exportColumns.join(';'));
      for (const row of this.combinedRows) {
        const line = this.columns.map((col, idx) => {
          let val = row[col] !== undefined && row[col] !== null ? row[col].toString() : '';
          if (val.includes('"')) val = val.replace(/"/g, '""');
          if (val.includes(';') || val.includes('"') || val.includes('\n')) val = '"' + val + '"';
          return val;
        }).join(';');
        csvRows.push(line);
      }
      const csvContent = csvRows.join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Utiliser le nom personnalisé ou le nom par défaut
      const fileName = this.exportFileName.trim() || 'resultat.csv';
      // S'assurer que le fichier a l'extension .csv
      const finalFileName = fileName.endsWith('.csv') ? fileName : fileName + '.csv';
      
      a.download = finalFileName;
      a.click();
      URL.revokeObjectURL(url);
      this.showSuccess('export', `Export CSV réussi: ${finalFileName}`);
    } catch (e) {
      this.showError('export', 'Erreur lors de l\'export CSV.');
    }
  }

  exportXLS() {
    try {
      if (this.combinedRows.length === 0) return;
      
      // Remplacement de l'en-tête GRX par PAYS
      const exportColumns = this.columns.map(col => col === 'GRX' ? 'PAYS' : col);
      
      // Préparer les données pour l'export XLS
      const exportData = this.combinedRows.map(row => {
        const exportRow: any = {};
        this.columns.forEach((col, idx) => {
          const exportCol = exportColumns[idx];
          exportRow[exportCol] = row[col] !== undefined && row[col] !== null ? row[col] : '';
        });
        return exportRow;
      });
      
      // Créer le workbook et la worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Ajouter la worksheet au workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Données');
      
      // Utiliser le nom personnalisé ou le nom par défaut
      const fileName = this.exportFileName.trim() || 'resultat.xls';
      // S'assurer que le fichier a l'extension .xls
      const finalFileName = fileName.endsWith('.xls') ? fileName : fileName + '.xls';
      
      // Générer et télécharger le fichier
      XLSX.writeFile(workbook, finalFileName);
      
      this.showSuccess('export', `Export XLS réussi: ${finalFileName}`);
    } catch (e) {
      console.error('Erreur lors de l\'export XLS:', e);
      this.showError('export', 'Erreur lors de l\'export XLS.');
    }
  }

  // Méthode pour basculer l'affichage d'une section
  toggleSection(sectionName: keyof typeof this.showSections) {
    this.showSections[sectionName] = !this.showSections[sectionName];
  }

  // Méthode pour afficher automatiquement la section d'aperçu quand des données sont disponibles
  private autoShowPreviewSection() {
    if (this.combinedRows.length > 0 && !this.showSections.preview) {
      // Afficher automatiquement la section d'aperçu si elle n'est pas déjà visible
      this.showSections.preview = true;
    }
  }

  // Méthode pour basculer l'affichage de toutes les sections
  toggleAllSections() {
    const shouldShow = !this.allSectionsVisible;
    Object.keys(this.showSections).forEach(key => {
      this.showSections[key as keyof typeof this.showSections] = shouldShow;
    });
  }

  convertColumnsToNumber() {
    try {
      for (const col of this.formatOptions.numberColumns) {
        for (const row of this.combinedRows) {
          if (row[col] !== undefined && row[col] !== null) {
            const num = parseFloat(row[col].toString().replace(/\s/g, '').replace(',', '.'));
            row[col] = isNaN(num) ? row[col] : num;
          }
        }
      }
      this.showSuccess('number', 'Conversion en nombre réussie.');
    } catch (e) {
      this.showError('number', 'Erreur lors de la conversion en nombre.');
    }
  }

  convertColumnsToDate() {
    try {
      for (const col of this.formatOptions.dateColumns) {
        for (const row of this.combinedRows) {
          if (row[col]) {
            let val = row[col].toString();
            if (val.endsWith('.0')) {
              val = val.slice(0, -2);
            }
            const d = new Date(val);
            if (!isNaN(d.getTime())) {
              row[col] = this.formatDate(d, this.formatOptions.dateFormat);
            }
          }
        }
      }
      this.showSuccess('date', 'Formatage des dates réussi.');
    } catch (e) {
      this.showError('date', 'Erreur lors du formatage des dates.');
    }
  }

  formatDate(date: Date, format: string): string {
    // Prise en charge de yyyy-MM-dd, dd/MM/yyyy, HH:mm:ss, etc. Sans .0 final
    const yyyy = date.getFullYear();
    const MM = ('0' + (date.getMonth() + 1)).slice(-2);
    const dd = ('0' + date.getDate()).slice(-2);
    const HH = ('0' + date.getHours()).slice(-2);
    const mm = ('0' + date.getMinutes()).slice(-2);
    const ss = ('0' + date.getSeconds()).slice(-2);
    let result = format
      .replace('yyyy', yyyy.toString())
      .replace('MM', MM)
      .replace('dd', dd)
      .replace('HH', HH)
      .replace('mm', mm)
      .replace('ss', ss);
    // Supprime le .0 final si présent et non demandé
    if (result.endsWith('.0') && !format.includes('.0')) {
      result = result.slice(0, -2);
    }
    return result;
  }

  onDateFormatChange() {
    if (this.selectedDateFormat !== 'custom') {
      this.formatOptions.dateFormat = this.selectedDateFormat;
    }
  }

  onExportTypeColChange() {
    this.exportTypeSelected = [];
    if (!this.exportTypeCol) {
      this.exportTypeValues = [];
      return;
    }
    const valuesSet = new Set<string>();
    for (const row of this.combinedRows) {
      valuesSet.add(row[this.exportTypeCol] ?? '');
    }
    this.exportTypeValues = Array.from(valuesSet);
  }

  onExportTypeValueChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.checked) {
      if (!this.exportTypeSelected.includes(input.value)) {
        this.exportTypeSelected.push(input.value);
      }
    } else {
      this.exportTypeSelected = this.exportTypeSelected.filter(v => v !== input.value);
    }
  }

  selectAllExportTypes() {
    console.log('selectAllExportTypes appelée');
    console.log('exportTypeValues:', this.exportTypeValues);
    this.exportTypeSelected = [...this.exportTypeValues];
    console.log('exportTypeSelected après sélection:', this.exportTypeSelected);
  }

  deselectAllExportTypes() {
    console.log('deselectAllExportTypes appelée');
    this.exportTypeSelected = [];
    console.log('exportTypeSelected après désélection:', this.exportTypeSelected);
  }

  exportByType() {
    try {
      if (!this.exportTypeCol || this.exportTypeSelected.length === 0) return;
      let exported = 0;
      for (const type of this.exportTypeSelected) {
        const filteredRows = this.combinedRows.filter(row => (row[this.exportTypeCol] ?? '') === type);
        if (filteredRows.length === 0) continue;
        // Cherche la valeur la plus fréquente dans la colonne 'Date'
        const dateCounts: Record<string, number> = {};
        for (const row of filteredRows) {
          const val = row['Date'] ? row['Date'].toString() : '';
          if (val) dateCounts[val] = (dateCounts[val] || 0) + 1;
        }
        let modeDate = '';
        let maxCount = 0;
        for (const [val, count] of Object.entries(dateCounts)) {
          if (count > maxCount) {
            modeDate = val;
            maxCount = count;
          }
        }
        // Formate la date en YYYYMMDD
        let dateStr = '';
        if (modeDate) {
          const d = new Date(modeDate);
          if (!isNaN(d.getTime())) {
            const yyyy = d.getFullYear();
            const MM = ('0'+(d.getMonth()+1)).slice(-2);
            const dd = ('0'+d.getDate()).slice(-2);
            dateStr = `${yyyy}${MM}${dd}`;
          } else {
            dateStr = modeDate.replace(/[^0-9]/g, '').slice(0,8);
          }
        } else {
          dateStr = 'nodate';
        }
        // Remplacement de l'en-tête GRX par PAYS
        const exportColumns = this.columns.map(col => col === 'GRX' ? 'PAYS' : col);
        const csvRows: string[] = [];
        csvRows.push(exportColumns.join(';'));
        for (const row of filteredRows) {
          const line = this.columns.map((col, idx) => {
            let val = row[col] !== undefined && row[col] !== null ? row[col].toString() : '';
            if (val.includes('"')) val = val.replace(/"/g, '""');
            if (val.includes(';') || val.includes('"') || val.includes('\n')) val = '"' + val + '"';
            return val;
          }).join(';');
          csvRows.push(line);
        }
        const csvContent = csvRows.join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const safeType = (type || 'vide').replace(/[^a-zA-Z0-9_-]/g, '_');
        const sufixe = this.exportTypeSuffix ? this.exportTypeSuffix.replace(/[^a-zA-Z0-9_-]/g, '_') : '';
        const description = this.exportTypeDescription ? this.exportTypeDescription.replace(/[^a-zA-Z0-9_-]/g, '_') : '';
        let filename = safeType;
        if (sufixe) filename += `_` + sufixe;
        if (description) filename += `_` + description;
        a.href = url;
        a.download = `${filename}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        exported++;
      }
      if (exported > 0) {
        this.showSuccess('exportType', `Export par type réussi (${exported} fichier(s)).`);
      } else {
        this.showError('exportType', 'Aucune donnée à exporter pour les types sélectionnés.');
      }
    } catch (e) {
      this.showError('exportType', 'Erreur lors de l\'export par type.');
    }
  }

  convertColumnsToAmount() {
    try {
      for (const col of this.formatOptions.amountColumns) {
        for (const row of this.combinedRows) {
          if (row[col] !== undefined && row[col] !== null) {
            const num = parseFloat(row[col].toString().replace(/\s/g, '').replace(',', '.'));
            row[col] = isNaN(num) ? row[col] : num;
          }
        }
      }
      this.showSuccess('amount', 'Conversion en montant réussie.');
    } catch (e) {
      this.showError('amount', 'Erreur lors de la conversion en montant.');
    }
  }

  applyConcat() {
    if (!this.concatCols.length || !this.concatNewCol) return;
    try {
      // Appliquer la concaténation sur toutes les données d'origine
      this.originalRows = this.originalRows.map(row => {
        const newRow = { ...row };
        // Utiliser l'ordre des colonnes tel qu'il est dans concatCols
        newRow[this.concatNewCol] = this.concatCols.map(col => row[col] ?? '').join(this.concatSeparator ?? '');
        return newRow;
      });
      // Mettre à jour la liste des colonnes si besoin
      if (!this.allColumns.includes(this.concatNewCol)) {
        this.allColumns = [this.concatNewCol, ...this.allColumns];
      }
      if (!this.columns.includes(this.concatNewCol)) {
        this.columns = [this.concatNewCol, ...this.columns];
      }
      // Si une sélection de colonnes est active, ajouter la nouvelle colonne à la sélection
      if (this.selectionApplied && this.selectedCols.length > 0 && !this.selectedCols.includes(this.concatNewCol)) {
        this.selectedCols = [this.concatNewCol, ...this.selectedCols];
      }
      // Réappliquer le filtre si actif, sinon tout afficher
      if (this.filterApplied && this.selectedFilterColumn && this.selectedFilterValues && this.selectedFilterValues.length > 0 && this.selectedFilterValues.includes(this.selectedFilterValues[0])) {
        this.applyFilter();
      } else {
        this.allRows = [...this.originalRows];
        this.combinedRows = [...this.originalRows];
        this.updateDisplayedRows();
      }
      this.showSuccess('concat', `Colonne « ${this.concatNewCol} » créée par concaténation.`);
    } catch (e) {
      this.showError('concat', 'Erreur lors de la concaténation.');
    }
  }

  // Méthodes pour gérer l'ordre des colonnes dans la concaténation
  toggleConcatOrderMode() {
    this.concatOrderMode = !this.concatOrderMode;
  }

  moveConcatColumnUp(index: number) {
    if (index > 0 && index < this.concatCols.length) {
      const temp = this.concatCols[index];
      this.concatCols[index] = this.concatCols[index - 1];
      this.concatCols[index - 1] = temp;
    }
  }

  moveConcatColumnDown(index: number) {
    if (index >= 0 && index < this.concatCols.length - 1) {
      const temp = this.concatCols[index];
      this.concatCols[index] = this.concatCols[index + 1];
      this.concatCols[index + 1] = temp;
    }
  }

  removeConcatColumn(index: number) {
    if (index >= 0 && index < this.concatCols.length) {
      this.concatCols.splice(index, 1);
    }
  }

  addConcatColumn(column: string) {
    if (!this.concatCols.includes(column)) {
      this.concatCols.push(column);
    }
  }

  getAvailableColumnsForConcat(): string[] {
    return this.columns.filter(col => !this.concatCols.includes(col));
  }

  // Méthodes pour le dropdown d'ordre
  onConcatColumnOrderChange(event: any, index: number) {
    const newIndex = parseInt(event.target.value);
    if (newIndex !== index && newIndex >= 0 && newIndex < this.concatCols.length) {
      // Déplacer la colonne à la nouvelle position
      const column = this.concatCols[index];
      this.concatCols.splice(index, 1);
      this.concatCols.splice(newIndex, 0, column);
    }
  }

  getConcatColumnOrderOptions(): number[] {
    return Array.from({ length: this.concatCols.length }, (_, i) => i + 1);
  }

















  applyRemoveCharactersFormatting() {
    if (!this.formatSelections['removeCharacters'].length) {
      this.showError('format', 'Veuillez sélectionner au moins une colonne');
      return;
    }

    // Vérifier les paramètres de suppression
    if (!this.removeCharPosition) {
      this.showError('format', 'Veuillez sélectionner une position de suppression');
      return;
    }

    if (!this.removeCharCount || this.removeCharCount <= 0) {
      this.showError('format', 'Veuillez spécifier un nombre de caractères à supprimer (supérieur à 0)');
      return;
    }

    // Vérification supplémentaire pour la position spécifique
    if (this.removeCharPosition === 'specific' && (!this.removeCharSpecificPosition || this.removeCharSpecificPosition <= 0)) {
      this.showError('format', 'Veuillez spécifier une position valide pour la suppression spécifique');
      return;
    }



    try {
      let processedCells = 0;
      let totalCells = 0;
      
      // Traiter les données affichées (combinedRows)
      this.combinedRows.forEach((row, rowIndex) => {
        this.formatSelections['removeCharacters'].forEach(col => {
          totalCells++;
          if (row[col] !== undefined && row[col] !== null) {
            // Convertir en chaîne si ce n'est pas déjà le cas
            let value = String(row[col]);
            const originalValue = value;
            
            // Vérifier que la chaîne a une longueur suffisante
            if (value.length === 0) {
      return;
    }
            
            switch (this.removeCharPosition) {
              case 'start':
                if (value.length >= this.removeCharCount) {
                value = value.substring(this.removeCharCount);
                }
                break;
              case 'end':
                if (value.length >= this.removeCharCount) {
                value = value.substring(0, value.length - this.removeCharCount);
                }
                break;
              case 'specific':
                const pos = this.removeCharSpecificPosition - 1; // Convert to 0-based
                if (pos >= 0 && pos < value.length && pos + this.removeCharCount <= value.length) {
                  value = value.substring(0, pos) + value.substring(pos + this.removeCharCount);
                }
                break;
            }
            
            if (value !== originalValue) {
              processedCells++;
            }
            
            row[col] = value;
          }
        });
      });

      // Mettre à jour aussi allRows si la sélection n'est pas appliquée
      if (!this.selectionApplied) {
        this.allRows.forEach((row, rowIndex) => {
          this.formatSelections['removeCharacters'].forEach(col => {
            if (row[col] !== undefined && row[col] !== null) {
              // Convertir en chaîne si ce n'est pas déjà le cas
              let value = String(row[col]);
              
              // Vérifier que la chaîne a une longueur suffisante
              if (value.length === 0) {
                return;
              }
              
              switch (this.removeCharPosition) {
                case 'start':
                  if (value.length >= this.removeCharCount) {
                  value = value.substring(this.removeCharCount);
                  }
                  break;
                case 'end':
                  if (value.length >= this.removeCharCount) {
                  value = value.substring(0, value.length - this.removeCharCount);
                  }
                  break;
                case 'specific':
                  const pos = this.removeCharSpecificPosition - 1; // Convert to 0-based
                  if (pos >= 0 && pos < value.length && pos + this.removeCharCount <= value.length) {
                    value = value.substring(0, pos) + value.substring(pos + this.removeCharCount);
                  }
                  break;
              }
              
              row[col] = value;
            }
          });
        });
      }

      console.log(`📊 RÉSUMÉ: ${totalCells} cellules vérifiées, ${processedCells} cellules modifiées`);

      this.showSuccess('format', `Suppression de caractères appliquée sur ${this.formatSelections['removeCharacters'].length} colonne(s) (${processedCells} modifications)`);
      
      // Forcer la mise à jour de l'affichage
      this.updateDisplayedRowsForPage();
      this.cd.detectChanges();
    } catch (error) {
      console.error('❌ Erreur lors de la suppression:', error);
      this.showError('format', 'Erreur lors de la suppression de caractères');
    }
  }

  applyRemoveNumbersFormatting() {
    if (!this.formatSelections['removeNumbers'].length) {
      this.showError('format', 'Veuillez sélectionner au moins une colonne');
      return;
    }

    try {
      let processedCells = 0;
      let totalCells = 0;
      
      // Traiter les données affichées (combinedRows)
      this.combinedRows.forEach((row, rowIndex) => {
        this.formatSelections['removeNumbers'].forEach(col => {
          totalCells++;
          if (row[col] !== undefined && row[col] !== null) {
            // Convertir en chaîne si ce n'est pas déjà le cas
            let value = String(row[col]);
            const originalValue = value;
            
            // Vérifier que la chaîne a une longueur suffisante
            if (value.length === 0) {
              return;
            }
            
            // Supprimer tous les chiffres (0-9)
            value = value.replace(/\d/g, '');
            
            if (value !== originalValue) {
                processedCells++;
              }
              
            row[col] = value;
          }
        });
      });

      // Mettre à jour aussi allRows si la sélection n'est pas appliquée
      if (!this.selectionApplied) {
        this.allRows.forEach((row, rowIndex) => {
          this.formatSelections['removeNumbers'].forEach(col => {
            if (row[col] !== undefined && row[col] !== null) {
              // Convertir en chaîne si ce n'est pas déjà le cas
              let value = String(row[col]);
              
              // Vérifier que la chaîne a une longueur suffisante
              if (value.length === 0) {
                return;
              }
              
              // Supprimer tous les chiffres (0-9)
              value = value.replace(/\d/g, '');
              
              row[col] = value;
            }
          });
        });
      }

      console.log(`📊 RÉSUMÉ: ${totalCells} cellules vérifiées, ${processedCells} cellules modifiées`);

      this.showSuccess('format', `Suppression de nombres appliquée sur ${this.formatSelections['removeNumbers'].length} colonne(s) (${processedCells} modifications)`);
      
      // Forcer la mise à jour de l'affichage
      this.updateDisplayedRowsForPage();
      this.cd.detectChanges();
    } catch (error) {
      console.error('❌ Erreur lors de la suppression des nombres:', error);
      this.showError('format', 'Erreur lors de la suppression des nombres');
    }
  }

  applyRemoveIndicatifFormatting() {
    if (!this.formatSelections['removeIndicatif'].length) {
      this.showError('format', 'Veuillez sélectionner au moins une colonne');
      return;
    }

    try {
      let processedCells = 0;
      let totalCells = 0;
      
      // Traiter les données affichées (combinedRows)
      this.combinedRows.forEach((row, rowIndex) => {
        this.formatSelections['removeIndicatif'].forEach(col => {
          totalCells++;
          if (row[col] !== undefined && row[col] !== null) {
            // Convertir en chaîne si ce n'est pas déjà le cas
            let value = String(row[col]).trim();
            const originalValue = value;
            
            // Vérifier que la chaîne a une longueur suffisante
            if (value.length === 0) {
      return;
    }

            let modified = false;

            switch (this.indicatifType) {
              case 'international':
                // Supprimer les indicatifs internationaux courants
                // Format: +XX ou +XXX ou +XXXX
                const internationalPattern = /^\+(\d{1,4})\s*/;
                if (internationalPattern.test(value)) {
                  value = value.replace(internationalPattern, '');
                  modified = true;
                }
                break;

              case 'national':
                // Supprimer les indicatifs nationaux français
                // Format: 0X XX XX XX XX ou 0XXXXXXXXX
                const nationalPattern = /^0\d\s*\d{2}\s*\d{2}\s*\d{2}\s*\d{2}$/;
                if (nationalPattern.test(value.replace(/\s/g, ''))) {
                  // Supprimer le premier chiffre (0) et reformater
                  const cleanNumber = value.replace(/\s/g, '').substring(1);
                  value = cleanNumber.replace(/(\d{2})(?=\d)/g, '$1 ');
                  modified = true;
                }
                break;

              case 'custom':
                // Supprimer un indicatif personnalisé
                if (this.customIndicatif && value.startsWith(this.customIndicatif)) {
                  value = value.substring(this.customIndicatif.length).trim();
                  modified = true;
                }
                break;
            }
            
            if (modified) {
              processedCells++;
            }
            
            row[col] = value;
          }
        });
      });

      // Mettre à jour aussi allRows si la sélection n'est pas appliquée
      if (!this.selectionApplied) {
        this.allRows.forEach((row, rowIndex) => {
          this.formatSelections['removeIndicatif'].forEach(col => {
            if (row[col] !== undefined && row[col] !== null) {
              // Convertir en chaîne si ce n'est pas déjà le cas
              let value = String(row[col]).trim();
              
              // Vérifier que la chaîne a une longueur suffisante
              if (value.length === 0) {
                return;
              }

              switch (this.indicatifType) {
                case 'international':
                  // Supprimer les indicatifs internationaux courants
                  const internationalPattern = /^\+(\d{1,4})\s*/;
                  if (internationalPattern.test(value)) {
                    value = value.replace(internationalPattern, '');
                  }
                  break;

                case 'national':
                  // Supprimer les indicatifs nationaux français
                  const nationalPattern = /^0\d\s*\d{2}\s*\d{2}\s*\d{2}\s*\d{2}$/;
                  if (nationalPattern.test(value.replace(/\s/g, ''))) {
                    // Supprimer le premier chiffre (0) et reformater
                    const cleanNumber = value.replace(/\s/g, '').substring(1);
                    value = cleanNumber.replace(/(\d{2})(?=\d)/g, '$1 ');
                  }
                  break;

                case 'custom':
                  // Supprimer un indicatif personnalisé
                  if (this.customIndicatif && value.startsWith(this.customIndicatif)) {
                    value = value.substring(this.customIndicatif.length).trim();
                  }
                  break;
              }
              
              row[col] = value;
            }
          });
        });
      }

      console.log(`📊 RÉSUMÉ: ${totalCells} cellules vérifiées, ${processedCells} cellules modifiées`);

      this.showSuccess('format', `Suppression d'indicatif appliquée sur ${this.formatSelections['removeIndicatif'].length} colonne(s) (${processedCells} modifications)`);
      
      // Forcer la mise à jour de l'affichage
      this.updateDisplayedRowsForPage();
      this.cd.detectChanges();
    } catch (error) {
      console.error('❌ Erreur lors de la suppression d\'indicatif:', error);
      this.showError('format', 'Erreur lors de la suppression d\'indicatif');
    }
  }

  applyRemoveDecimalsFormatting() {
    if (!this.formatSelections['removeDecimals'].length) {
      this.showError('format', 'Veuillez sélectionner au moins une colonne');
      return;
    }

    try {
      let processedCells = 0;
      let totalCells = 0;
      
      // Traiter les données affichées (combinedRows)
      this.combinedRows.forEach((row, rowIndex) => {
        this.formatSelections['removeDecimals'].forEach(col => {
          totalCells++;
          if (row[col] !== undefined && row[col] !== null) {
            // Convertir en chaîne si ce n'est pas déjà le cas
            let value = String(row[col]).trim();
            const originalValue = value;
            
            // Vérifier que la chaîne a une longueur suffisante
            if (value.length === 0) {
              return;
            }

            let modified = false;

            // Détecter et supprimer les décimales selon le séparateur choisi
            if (this.decimalSeparator === ',') {
              // Format français : 3 000,00 ou 3000,00 - gère les séparateurs de milliers (espaces)
              // Pattern: nombre avec espaces possibles + virgule + décimales
              const frenchPattern = /^([\d\s]+)\s*,\s*(\d+)\s*$/;
              const match = value.match(frenchPattern);
              console.log(`🔍 Test français pour "${value}":`, match);
              if (match) {
                let integerPart = match[1];
                const decimalPart = match[2];
                console.log(`📊 Partie entière brute: "${integerPart}", Partie décimale: "${decimalPart}"`);
                
                // Nettoyer la partie entière en supprimant les espaces (séparateurs de milliers)
                integerPart = integerPart.replace(/\s/g, '');
                console.log(`📊 Partie entière nettoyée: "${integerPart}"`);
                
                // Si on garde les zéros de fin et que la partie décimale n'est pas que des zéros
                if (this.keepTrailingZeros && !/^0+$/.test(decimalPart)) {
                  console.log(`⏭️ Garde "${value}" car partie décimale non nulle: "${decimalPart}"`);
                  // Garder le nombre tel quel
                  return;
                }
                
                // Supprimer la partie décimale et retourner la partie entière nettoyée
                value = integerPart;
                modified = true;
                console.log(`✅ Modifié "${originalValue}" → "${value}"`);
              } else {
                console.log(`❌ Pas de match pour "${value}" avec le pattern français`);
              }
            } else {
              // Format anglais : 3,000.00 ou 3000.00 - gère les séparateurs de milliers (virgules)
              // Pattern: nombre avec virgules possibles + point + décimales
              const englishPattern = /^([\d,]+)\s*\.\s*(\d+)\s*$/;
              const match = value.match(englishPattern);
              console.log(`🔍 Test anglais pour "${value}":`, match);
              if (match) {
                let integerPart = match[1];
                const decimalPart = match[2];
                console.log(`📊 Partie entière brute: "${integerPart}", Partie décimale: "${decimalPart}"`);
                
                // Nettoyer la partie entière en supprimant les virgules (séparateurs de milliers)
                integerPart = integerPart.replace(/,/g, '');
                console.log(`📊 Partie entière nettoyée: "${integerPart}"`);
                
                // Si on garde les zéros de fin et que la partie décimale n'est pas que des zéros
                if (this.keepTrailingZeros && !/^0+$/.test(decimalPart)) {
                  console.log(`⏭️ Garde "${value}" car partie décimale non nulle: "${decimalPart}"`);
                  // Garder le nombre tel quel
                  return;
                }
                
                // Supprimer la partie décimale et retourner la partie entière nettoyée
                value = integerPart;
                modified = true;
                console.log(`✅ Modifié "${originalValue}" → "${value}"`);
              } else {
                console.log(`❌ Pas de match pour "${value}" avec le pattern anglais`);
              }
            }
            
            if (modified) {
              processedCells++;
            }
            
            row[col] = value;
          }
        });
      });

      // Mettre à jour aussi allRows si la sélection n'est pas appliquée
      if (!this.selectionApplied) {
        this.allRows.forEach((row, rowIndex) => {
          this.formatSelections['removeDecimals'].forEach(col => {
            if (row[col] !== undefined && row[col] !== null) {
              // Convertir en chaîne si ce n'est pas déjà le cas
              let value = String(row[col]).trim();
              
              // Vérifier que la chaîne a une longueur suffisante
              if (value.length === 0) {
                return;
              }

              // Détecter et supprimer les décimales selon le séparateur choisi
              if (this.decimalSeparator === ',') {
                // Format français : 3 000,00 ou 3000,00 - gère les séparateurs de milliers (espaces)
                // Pattern: nombre avec espaces possibles + virgule + décimales
                const frenchPattern = /^([\d\s]+)\s*,\s*(\d+)\s*$/;
                const match = value.match(frenchPattern);
                if (match) {
                  let integerPart = match[1];
                  const decimalPart = match[2];
                  
                  // Nettoyer la partie entière en supprimant les espaces (séparateurs de milliers)
                  integerPart = integerPart.replace(/\s/g, '');
                  
                  // Si on garde les zéros de fin et que la partie décimale n'est pas que des zéros
                  if (this.keepTrailingZeros && !/^0+$/.test(decimalPart)) {
                    // Garder le nombre tel quel
                    return;
                  }
                  
                  // Supprimer la partie décimale et retourner la partie entière nettoyée
                  value = integerPart;
                }
              } else {
                // Format anglais : 3,000.00 ou 3000.00 - gère les séparateurs de milliers (virgules)
                // Pattern: nombre avec virgules possibles + point + décimales
                const englishPattern = /^([\d,]+)\s*\.\s*(\d+)\s*$/;
                const match = value.match(englishPattern);
                if (match) {
                  let integerPart = match[1];
                  const decimalPart = match[2];
                  
                  // Nettoyer la partie entière en supprimant les virgules (séparateurs de milliers)
                  integerPart = integerPart.replace(/,/g, '');
                  
                  // Si on garde les zéros de fin et que la partie décimale n'est pas que des zéros
                  if (this.keepTrailingZeros && !/^0+$/.test(decimalPart)) {
                    // Garder le nombre tel quel
                    return;
                  }
                  
                  // Supprimer la partie décimale et retourner la partie entière nettoyée
                  value = integerPart;
                }
              }
              
              row[col] = value;
            }
          });
        });
      }

      console.log(`📊 RÉSUMÉ: ${totalCells} cellules vérifiées, ${processedCells} cellules modifiées`);

      this.showSuccess('format', `Suppression de décimales appliquée sur ${this.formatSelections['removeDecimals'].length} colonne(s) (${processedCells} modifications)`);
      
      // Forcer la mise à jour de l'affichage
      this.updateDisplayedRowsForPage();
      this.cd.detectChanges();
    } catch (error) {
      console.error('❌ Erreur lors de la suppression des décimales:', error);
      this.showError('format', 'Erreur lors de la suppression des décimales');
    }
  }

  /**
   * Applique le formatage pour garder les N derniers digits
   */
  applyKeepLastDigitsFormatting() {
    if (!this.formatSelections['keepLastDigits'].length) {
      this.showError('format', 'Veuillez sélectionner au moins une colonne');
      return;
    }

    if (this.keepLastDigitsCount <= 0) {
      this.showError('format', 'Le nombre de digits à garder doit être supérieur à 0');
      return;
    }

    try {
      let processedCells = 0;
      let totalCells = 0;
      
      console.log(`🔄 Formatage: Garder les ${this.keepLastDigitsCount} derniers digits`);
      
      // Traiter les données affichées (combinedRows)
      this.combinedRows.forEach((row, rowIndex) => {
        this.formatSelections['keepLastDigits'].forEach(col => {
          totalCells++;
          if (row[col] !== undefined && row[col] !== null) {
            // Convertir en chaîne si ce n'est pas déjà le cas
            let value = String(row[col]).trim();
            const originalValue = value;
            
            // Vérifier que la chaîne a une longueur suffisante
            if (value.length === 0) {
              return;
            }

            // Extraire seulement les digits (nombres)
            const digitsOnly = value.replace(/\D/g, '');
            
            if (digitsOnly.length === 0) {
              // Aucun digit trouvé, garder la valeur originale
              return;
            }

            // Garder les N derniers digits
            if (digitsOnly.length >= this.keepLastDigitsCount) {
              value = digitsOnly.slice(-this.keepLastDigitsCount);
              row[col] = value;
              processedCells++;
              
              if (rowIndex < 5) { // Log pour les 5 premières lignes
                console.log(`📝 ${col}[${rowIndex}]: "${originalValue}" -> "${value}"`);
              }
            } else {
              // Si moins de digits que demandé, garder tous les digits disponibles
              value = digitsOnly;
              row[col] = value;
              processedCells++;
              
              if (rowIndex < 5) { // Log pour les 5 premières lignes
                console.log(`📝 ${col}[${rowIndex}]: "${originalValue}" -> "${value}" (moins de ${this.keepLastDigitsCount} digits)`);
              }
            }
          }
        });
      });

      // Mettre à jour aussi allRows si la sélection n'est pas appliquée
      if (!this.selectionApplied) {
        this.allRows.forEach((row, rowIndex) => {
          this.formatSelections['keepLastDigits'].forEach(col => {
            if (row[col] !== undefined && row[col] !== null) {
              // Convertir en chaîne si ce n'est pas déjà le cas
              let value = String(row[col]).trim();
              
              // Vérifier que la chaîne a une longueur suffisante
              if (value.length === 0) {
                return;
              }

              // Extraire seulement les digits (nombres)
              const digitsOnly = value.replace(/\D/g, '');
              
              if (digitsOnly.length === 0) {
                // Aucun digit trouvé, garder la valeur originale
                return;
              }

              // Garder les N derniers digits
              if (digitsOnly.length >= this.keepLastDigitsCount) {
                value = digitsOnly.slice(-this.keepLastDigitsCount);
                row[col] = value;
              } else {
                // Si moins de digits que demandé, garder tous les digits disponibles
                value = digitsOnly;
                row[col] = value;
              }
            }
          });
        });
      }

      console.log(`📊 RÉSUMÉ: ${totalCells} cellules vérifiées, ${processedCells} cellules modifiées`);

      this.showSuccess('format', `Formatage "garder ${this.keepLastDigitsCount} derniers digits" appliqué sur ${this.formatSelections['keepLastDigits'].length} colonne(s) (${processedCells} modifications)`);
      
      // Forcer la mise à jour de l'affichage
      this.updateDisplayedRowsForPage();
      this.cd.detectChanges();
    } catch (error) {
      console.error('❌ Erreur lors du formatage des digits:', error);
      this.showError('format', 'Erreur lors du formatage des digits');
    }
  }

  ngOnInit() {
    // Initialiser l'affichage au démarrage
    this.currentPage = 1;
    this.showAllRows = false;
    this.displayedRows = [];
    this.combinedRows = [];
    this.columns = [];
    
    // Configurer le listener de recherche pour les filtres
    this.filterValueSearchCtrl.valueChanges.subscribe((search: string | null) => {
      const s = (search || '').toLowerCase();
      this.filteredFilterValues = this.filterValues.filter(val => 
        (val || '').toString().toLowerCase().includes(s)
      );
    });
    
    // Optimiser l'affichage initial
    this.optimizeInitialDisplay();
    
    // Forcer la détection de changement
    this.cd.detectChanges();
    
    // Restaurer l'état si présent
    const saved = localStorage.getItem(this.LOCAL_STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      Object.assign(this, data);
      this.updateDisplayedRows();
    }
  }

  ngAfterViewInit() {
    // Forcer le recalcul du layout et la détection de changement après affichage
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
      this.cd.detectChanges();
    }, 100);
    
    // Sauvegarder l'état seulement pour les petits fichiers (éviter le quota localStorage)
    const save = () => {
      try {
        // Vérifier la taille des données avant de sauvegarder
        const dataToSave = {
          selectedFiles: this.selectedFiles.map(f => ({ name: f.name, size: f.size })),
          columns: this.columns,
          dedupCols: this.dedupCols,
          formatOptions: this.formatOptions,
          extractCol: this.extractCol,
          extractType: this.extractType,
          extractCount: this.extractCount,
          extractKey: this.extractKey,
          extractStart: this.extractStart,
          selectedCols: this.selectedCols,
          successMsg: this.successMsg,
          errorMsg: this.errorMsg,
          selectedDateFormat: this.selectedDateFormat,
          exportTypeCol: this.exportTypeCol,
          exportTypeValues: this.exportTypeValues,
          exportTypeSelected: this.exportTypeSelected,
          allColumns: this.allColumns,
          selectionApplied: this.selectionApplied,
          selectedFilterColumn: this.selectedFilterColumn,
          filterValues: this.filterValues,
          selectedFilterValues: this.selectedFilterValues,
          filterApplied: this.filterApplied,
          concatCols: this.concatCols,
          concatNewCol: this.concatNewCol,
          concatSeparator: this.concatSeparator,
          exportTypeSuffix: this.exportTypeSuffix,
          exportTypeDescription: this.exportTypeDescription,
          removeCharPosition: this.removeCharPosition,
          removeCharCount: this.removeCharCount,
          removeCharSpecificPosition: this.removeCharSpecificPosition,
          specificCharactersToRemove: this.specificCharactersToRemove,
          removeSpecificCharactersCaseSensitive: this.removeSpecificCharactersCaseSensitive,
          currentPage: this.currentPage,
          rowsPerPage: this.rowsPerPage,
          maxDisplayedRows: this.maxDisplayedRows,
          showAllRows: this.showAllRows
        };
        
        // Ne pas sauvegarder les données volumineuses (allRows, combinedRows, etc.)
        const dataString = JSON.stringify(dataToSave);
        
        // Vérifier si la taille est raisonnable (< 1MB)
        if (dataString.length < 1024 * 1024) {
          localStorage.setItem(this.LOCAL_STORAGE_KEY, dataString);
        } else {
          console.log('⚠️ Données trop volumineuses pour localStorage, sauvegarde ignorée');
          // Nettoyer l'ancienne sauvegarde si elle existe
          localStorage.removeItem(this.LOCAL_STORAGE_KEY);
        }
      } catch (error) {
        console.warn('⚠️ Erreur lors de la sauvegarde localStorage:', error);
        // Nettoyer en cas d'erreur
        localStorage.removeItem(this.LOCAL_STORAGE_KEY);
      }
    };
    
    // Sauvegarder seulement pour les petits fichiers
    if (this.allRows.length < 10000) { // Seulement pour les fichiers < 10k lignes
      setInterval(save, 5000); // Sauvegarde moins fréquente
    }
  }

  // Méthode pour optimiser l'affichage initial
  private optimizeInitialDisplay() {
    // S'assurer que les éléments sont correctement dimensionnés
    setTimeout(() => {
      this.cd.detectChanges();
      // Forcer un second rafraîchissement pour s'assurer que tout est bien affiché
      setTimeout(() => {
        this.cd.detectChanges();
      }, 100);
    }, 50);
  }

  newTraitement() {
    // Vider toutes les données et supprimer la clé locale
    this.selectedFiles = [];
    this.combinedRows = [];
    this.columns = [];
    this.dedupCols = [];
    this.formatOptions = {
      trimSpaces: false,
      toLowerCase: false,
      toUpperCase: false,
      normalizeDates: false,
      normalizeNumbers: false,
      amountColumns: [],
      numberColumns: [],
      dateColumns: [],
      dateFormat: 'yyyy-MM-dd',
      removeSeparators: false,
      dotToComma: false,
      removeDashesAndCommas: false,
      absoluteValue: false,
      removeCharacters: false,
      removeSpecificCharacters: false,
      cleanAmounts: false
    };
    this.extractCol = '';
    this.extractType = '';
    this.extractCount = 1;
    this.extractKey = '';
    this.extractStart = 1;
    this.selectedCols = [];
    this.successMsg = {};
    this.errorMsg = {};
    this.selectedDateFormat = 'yyyy-MM-dd';
    this.exportTypeCol = '';
    this.exportTypeValues = [];
    this.exportTypeSelected = [];
    this.allRows = [];
    this.allColumns = [];
    this.originalRows = [];
    this.selectionApplied = false;
    this.selectedFilterColumn = '';
    this.filterValues = [];
    this.selectedFilterValues = [];
    this.filteredRows = [];
    this.filterApplied = false;
    this.concatCols = [];
    this.concatNewCol = '';
    this.concatSeparator = ' ';
    this.exportTypeSuffix = '';
    this.exportTypeDescription = '';
    this.removeCharPosition = 'start';
    this.removeCharCount = 1;
    this.removeCharSpecificPosition = 1;
    this.specificCharactersToRemove = '';
    this.removeSpecificCharactersCaseSensitive = true;
    this.currentPage = 1;
    this.rowsPerPage = 100;
    this.maxDisplayedRows = 1000;
    this.showAllRows = false;
    this.displayedRows = [];
    localStorage.removeItem(this.LOCAL_STORAGE_KEY);
    this.updateDisplayedRows();
  }

  toggleSelectAllCols(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.checked) {
      this.selectedCols = [...this.allColumns];
    } else {
      this.selectedCols = [];
    }
  }

  // --- MÉTHODES POUR LA RÉORGANISATION DES COLONNES ---
  
  toggleColumnReorderMode() {
    this.isColumnReorderMode = !this.isColumnReorderMode;
    if (this.isColumnReorderMode) {
      this.reorderedColumns = [...this.columns];
    }
  }

  getDisplayColumns(): string[] {
    return this.isColumnReorderMode ? this.reorderedColumns : this.columns;
  }

  onColumnDragStart(event: DragEvent, column: string) {
    if (!this.isColumnReorderMode) return;
    this.draggedColumn = column;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', column);
    }
  }

  onColumnDragOver(event: DragEvent, column: string) {
    if (!this.isColumnReorderMode || !this.draggedColumn) return;
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
    this.dragOverColumn = column;
  }

  onColumnDrop(event: DragEvent, targetColumn: string) {
    if (!this.isColumnReorderMode || !this.draggedColumn) return;
    event.preventDefault();
    
    if (this.draggedColumn !== targetColumn) {
      const draggedIndex = this.reorderedColumns.indexOf(this.draggedColumn);
      const targetIndex = this.reorderedColumns.indexOf(targetColumn);
      
      // Réorganiser les colonnes
      const newColumns = [...this.reorderedColumns];
      newColumns.splice(draggedIndex, 1);
      newColumns.splice(targetIndex, 0, this.draggedColumn);
      
      this.reorderedColumns = newColumns;
    }
    
    this.draggedColumn = null;
    this.dragOverColumn = null;
  }

  onColumnDragEnd() {
    this.draggedColumn = null;
    this.dragOverColumn = null;
  }

  applyColumnReorder() {
    if (this.isColumnReorderMode) {
      this.columns = [...this.reorderedColumns];
      this.isColumnReorderMode = false;
      this.showSuccess('reorder', 'Ordre des colonnes appliqué avec succès');
    }
  }

  cancelColumnReorder() {
    this.isColumnReorderMode = false;
    this.reorderedColumns = [...this.columns];
    this.draggedColumn = null;
    this.dragOverColumn = null;
  }

  moveColumnUp(column: string) {
    if (!this.isColumnReorderMode) return;
    
    const index = this.reorderedColumns.indexOf(column);
    if (index > 0) {
      const newColumns = [...this.reorderedColumns];
      [newColumns[index], newColumns[index - 1]] = [newColumns[index - 1], newColumns[index]];
      this.reorderedColumns = newColumns;
    }
  }

  moveColumnDown(column: string) {
    if (!this.isColumnReorderMode) return;
    
    const index = this.reorderedColumns.indexOf(column);
    if (index < this.reorderedColumns.length - 1) {
      const newColumns = [...this.reorderedColumns];
      [newColumns[index], newColumns[index + 1]] = [newColumns[index + 1], newColumns[index]];
      this.reorderedColumns = newColumns;
    }
  }

  isColumnDragging(column: string): boolean {
    return this.draggedColumn === column;
  }

  isColumnDragOver(column: string): boolean {
    return this.dragOverColumn === column && this.draggedColumn !== column;
  }

  // Méthodes pour la prévisualisation CSV
  async confirmCsvImport() {
    if (!this.csvContentToProcess || !this.csvFileToProcess) {
      this.showError('upload', 'Aucun fichier CSV à traiter');
      return;
    }

    try {
      this.isProcessing = true;
      this.processingMessage = 'Traitement du fichier CSV confirmé...';
      
      // Réinitialiser les données existantes
      this.combinedRows = [];
      this.columns = [];
      this.allRows = [];
      this.allColumns = [];
      this.originalRows = [];
      
      // Réinitialiser les paramètres d'affichage
      this.currentPage = 1;
      this.showAllRows = false;
      this.displayedRows = [];
      
      // Traiter le CSV avec le séparateur détecté
      await this.processCsvContent(this.csvContentToProcess, this.detectedDelimiter);
      
      // Finaliser le traitement
      this.combinedRows = [...this.allRows];
      this.columns = [...this.allColumns];
      this.originalRows = [...this.allRows];
      
      // Optimiser l'affichage pour les gros fichiers
      this.optimizeForLargeFiles();
      
      // Mettre à jour l'affichage
      this.updateDisplayedRows();
      this.updatePagination();
      
      // Masquer la prévisualisation
      this.showCsvPreview = false;
      this.isProcessing = false;
      
      const totalProcessed = this.allRows.length;
      console.log(`✅ CSV traité avec succès: ${totalProcessed} lignes`);
      
      this.showSuccess('upload', `Fichier CSV traité avec succès ! ${totalProcessed} lignes importées`);
      
      // Nettoyer les données temporaires
      this.csvContentToProcess = '';
      this.csvFileToProcess = null;
      this.csvPreviewData = [];
      this.csvPreviewColumns = [];
      
    } catch (error) {
      console.error('Erreur lors du traitement du CSV:', error);
      this.isProcessing = false;
      this.showError('upload', 'Erreur lors du traitement du fichier CSV');
    }
  }

  // Méthode pour traiter le contenu CSV comme un tableau normal
  async processCsvContent(csvContent: string, delimiter: string) {
    return new Promise<void>((resolve, reject) => {
      Papa.parse(csvContent, {
        header: true,
        delimiter,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            let rows = results.data as any[];
            console.log(`CSV parsé avec header: ${rows.length} lignes détectées`);
            
            // Si les colonnes sont nommées field1, field2... ou qu'il n'y a qu'une seule colonne, on relit sans header
            const firstRow = rows[0] || {};
            const allKeys = Object.keys(firstRow);
            const looksLikeNoHeader = allKeys.length <= 1 || allKeys.some(k => k.toLowerCase().startsWith('field'));
            
            if (looksLikeNoHeader) {
              console.log('Détection d\'un fichier sans en-tête, relecture...');
              Papa.parse(csvContent, {
                header: false,
                delimiter: delimiter,
                skipEmptyLines: true,
                complete: async (res2) => {
                  try {
                    const rawRows = res2.data as any[];
                    console.log(`CSV parsé sans header: ${rawRows.length} lignes brutes`);
                    
                    if (rawRows.length > 1) {
                      const headerRow = rawRows[0];
                      const dataRows = rawRows.slice(1);
                      const colNames = headerRow.map((v: any, i: number) => v ? v.toString() : 'Col' + (i+1));
                      
                      console.log(`Traitement de ${dataRows.length} lignes de données avec ${colNames.length} colonnes`);
                      
                      // Traitement en arrière-plan avec chunks très petits
                      await this.processDataInBackground(
                        dataRows,
                        (chunk) => {
                          const rowsWithHeader = chunk.map((row: any[]) => {
                            const obj: any = {};
                            colNames.forEach((col: string, idx: number) => {
                              obj[col] = row[idx];
                            });
                            return obj;
                          });
                          
                          this.combinedRows.push(...rowsWithHeader);
                          this.allRows.push(...rowsWithHeader);
                        },
                        50, // Chunks très petits pour éviter le blocage
                        (progress) => {
                          this.processingMessage = `Traitement CSV: ${Math.round(progress)}%`;
                        }
                      );
                      
                      console.log('🔍 Colonnes extraites sans en-tête:', colNames);
                      for (const col of colNames) {
                        if (!this.columns.includes(col)) this.columns.push(col);
                        if (!this.allColumns.includes(col)) this.allColumns.push(col);
                      }
                      console.log('🔍 Colonnes finales après traitement sans en-tête:', this.columns);
                      
                      console.log(`CSV traité avec succès: ${this.allRows.length} lignes ajoutées`);
                    }
                    resolve();
                  } catch (error) {
                    console.error('Erreur lors du traitement CSV sans header:', error);
                    reject(error);
                  }
                },
                error: (error: any) => {
                  console.error('Erreur lors de la lecture du CSV sans header:', error);
                  reject(error);
                }
              });
              return;
            }
            
            // Cas normal avec header
            if (rows.length > 0) {
              console.log(`Traitement de ${rows.length} lignes avec en-tête`);
              
              // Traitement en arrière-plan avec chunks très petits
              await this.processDataInBackground(
                rows,
                (chunk) => {
                  this.combinedRows.push(...chunk);
                  this.allRows.push(...chunk);
                },
                50, // Chunks très petits pour éviter le blocage
                (progress) => {
                  this.processingMessage = `Traitement CSV: ${Math.round(progress)}%`;
                }
              );
              
              // Extraire les colonnes
              const firstRow = rows[0];
              console.log('🔍 Extraction des colonnes depuis la première ligne:', firstRow);
              console.log('🔍 Clés de la première ligne:', Object.keys(firstRow));
              
              for (const key of Object.keys(firstRow)) {
                if (!this.columns.includes(key)) this.columns.push(key);
                if (!this.allColumns.includes(key)) this.allColumns.push(key);
              }
              
              console.log('🔍 Colonnes extraites:', this.columns);
              console.log('🔍 Toutes les colonnes:', this.allColumns);
              
              console.log(`CSV traité avec succès: ${this.allRows.length} lignes ajoutées`);
            }
            resolve();
          } catch (error) {
            console.error('Erreur lors du traitement CSV:', error);
            reject(error);
          }
        },
        error: (error: any) => {
          console.error('Erreur lors de la lecture du CSV:', error);
          reject(error);
        }
      });
    });
  }

  cancelCsvPreview() {
    // Annuler la prévisualisation et réinitialiser
    this.showCsvPreview = false;
    this.csvPreviewData = [];
    this.csvPreviewColumns = [];
    this.csvContentToProcess = '';
    this.csvFileToProcess = null;
    this.selectedFiles = [];
    this.detectedDelimiter = ';';
  }

  escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Obtient les valeurs spécifiques pour un champ donné, en tenant compte du type de fichier
   */
  getFieldValues(fieldName: string): string[] {
    // Utiliser le nom du premier fichier sélectionné pour détecter le type
    const fileName = this.selectedFiles.length > 0 ? this.selectedFiles[0].name : '';
    return this.orangeMoneyUtilsService.getFieldValues(fieldName, fileName);
  }

  // Méthode pour détecter les fichiers Orange Money et trouver la ligne d'en-tête
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
      
      // Vérifier si "N°" est présent dans n'importe quelle colonne (détection plus flexible)
      if (columns.some((col: string) => col.startsWith('N°'))) {
        headerRowIndex = i;
        headerRow = columns;
        console.log(`🔍 Fichier Orange Money détecté (flexible) - Ligne d'en-tête trouvée à l'index ${i}:`, columns);
        break;
      }
      
      // Vérifier les patterns Orange Money typiques
      const orangeMoneyPatterns = [
        'Orange Money',
        'Relevé de vos opérations',
        'Application:',
        'Réseau:',
        'Début de Période:',
        'Fin de Période:',
        'Type de rapport:',
        'Généré le:'
      ];
      
      const hasOrangeMoneyPattern = orangeMoneyPatterns.some(pattern => 
        columns.some((col: string) => col.includes(pattern))
      );
      
      if (hasOrangeMoneyPattern) {
        console.log(`🔍 Pattern Orange Money détecté à la ligne ${i}:`, columns);
        // Continuer à chercher la ligne avec "N°"
      }
    }

    const isOrangeMoney = headerRowIndex !== -1;
    
    if (isOrangeMoney) {
      console.log(`📊 Fichier Orange Money détecté - Ignorer les lignes 0 à ${headerRowIndex - 1}`);
    } else {
      console.log(`❌ Fichier Orange Money non détecté - Vérification des patterns...`);
      // Vérifier si c'est un fichier Orange Money même sans "N°" visible
      const allContent = csvContent.toLowerCase();
      if (allContent.includes('orange money') || allContent.includes('relevé de vos opérations')) {
        console.log(`🟠 Pattern Orange Money détecté dans le contenu, mais pas de ligne "N°" trouvée`);
        // Chercher la première ligne qui ressemble à un en-tête de données
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const columns = line.split(delimiter).map((col: string) => col.trim());
          
          // Chercher des patterns d'en-tête de données
          const dataHeaderPatterns = [
            'date', 'heure', 'référence', 'service', 'paiement', 'statut', 'mode',
            'agent', 'correspondant', 'montant', 'commissions', 'débit', 'crédit'
          ];
          
          const hasDataHeader = dataHeaderPatterns.some(pattern => 
            columns.some((col: string) => col.toLowerCase().includes(pattern))
          );
          
          if (hasDataHeader && columns.length >= 5) {
            headerRowIndex = i;
            headerRow = columns;
            console.log(`🔍 En-tête de données Orange Money détecté à l'index ${i}:`, columns);
            break;
          }
        }
      }
    }

    // Si on n'a pas trouvé d'en-tête mais qu'on a des colonnes génériques, chercher la ligne suivante
    if (headerRowIndex === -1 && lines.length > 1) {
      const firstLine = lines[0];
      const firstColumns = firstLine.split(delimiter).map((col: string) => col.trim());
      
      // Vérifier si la première ligne contient des colonnes génériques (Col1, Col2, etc.)
      const hasGenericColumns = firstColumns.some((col: string) => 
        col.toLowerCase().startsWith('col') || col.toLowerCase().startsWith('_')
      );
      
      if (hasGenericColumns && lines.length > 1) {
        // Chercher dans la deuxième ligne et suivantes
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          const columns = line.split(delimiter).map((col: string) => col.trim());
          
          // Vérifier si cette ligne contient "N°" ou des en-têtes de données
          if (columns.some((col: string) => col.startsWith('N°')) || 
              columns.some((col: string) => col.toLowerCase().includes('date')) ||
              columns.some((col: string) => col.toLowerCase().includes('heure')) ||
              columns.some((col: string) => col.toLowerCase().includes('référence'))) {
            headerRowIndex = i;
            headerRow = columns;
            console.log(`🔍 En-tête Orange Money trouvé à l'index ${i} (après colonnes génériques):`, columns);
            break;
          }
        }
      }
    }

    // Si toujours pas trouvé, chercher des patterns plus spécifiques
    if (headerRowIndex === -1) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const columns = line.split(delimiter).map((col: string) => col.trim());
        
        // Chercher des patterns très spécifiques à Orange Money
        const orangeMoneySpecificPatterns = [
          'opération', 'agent', 'correspondant', 'montant (xaf)', 'commissions (xaf)',
          'débit', 'crédit', 'compte:', 'sous-réseau'
        ];
        
        const hasSpecificPattern = orangeMoneySpecificPatterns.some(pattern => 
          columns.some((col: string) => col.toLowerCase().includes(pattern))
        );
        
        if (hasSpecificPattern && columns.length >= 10) {
          headerRowIndex = i;
          headerRow = columns;
          console.log(`🔍 En-tête Orange Money spécifique trouvé à l'index ${i}:`, columns);
          break;
        }
      }
    }

    // Corriger les caractères spéciaux dans les colonnes détectées
    if (headerRowIndex !== -1) {
      headerRow = this.fixOrangeMoneyColumnNames(headerRow);
      console.log(`🔧 Colonnes Orange Money corrigées:`, headerRow);
    }

    return { isOrangeMoney: headerRowIndex !== -1, headerRowIndex, headerRow };
  }

  // Méthode pour forcer la mise à jour de l'affichage après détection Orange Money
  private updateOrangeMoneyDisplay(columns: string[]): void {
    console.log(`🟠 updateOrangeMoneyDisplay appelée avec:`, columns);
    console.log(`🟠 updateOrangeMoneyDisplay - allColumns avant:`, this.allColumns);
    
    // Vider les anciennes colonnes
    this.allColumns = [];
    this.columns = [];
    this.selectedCols = [];
    
    // Mettre à jour avec les nouvelles colonnes
    this.allColumns = [...columns];
    this.columns = [...columns];
    this.selectedCols = [...columns]; // Sélectionner toutes les colonnes par défaut
    
    console.log(`🟠 Affichage Orange Money mis à jour:`, this.allColumns);
    console.log(`🟠 updateOrangeMoneyDisplay - allColumns après:`, this.allColumns);
    
    // Forcer la détection des changements
    this.cd.detectChanges();
    
    // Attendre un peu puis forcer à nouveau
    setTimeout(() => {
      this.cd.detectChanges();
      console.log(`🟠 Détection des changements forcée - allColumns:`, this.allColumns.length);
      
      // Appliquer automatiquement le filtre Orange Money complet (filtres + colonnes spécifiques)
      this.applyAutomaticOrangeMoneyFilter();
    }, 100);
  }

  // Méthode pour corriger les caractères spéciaux dans les colonnes Orange Money
  private fixOrangeMoneyColumnNames(columns: string[]): string[] {
    return columns.map(col => {
      if (!col) return col;
      
      // Corrections spécifiques pour les caractères corrompus
      let corrected = col
        .replace(/Opration/g, 'Opération')
        .replace(/Rfrence/g, 'Référence')
        .replace(/N/g, 'N°')
        .replace(/Tte/g, 'Tête')
        .replace(/rseau/g, 'réseau')
        .replace(/Compte :/g, 'Compte:')
        .replace(/Montant \(XAF\)/g, 'Montant (XAF)')
        .replace(/Commissions \(XAF\)/g, 'Commissions (XAF)')
        .replace(/Crdit/g, 'Crédit')
        .replace(/Dbit/g, 'Débit')
        .replace(/Sous-rseau/g, 'Sous-réseau');
      
      // Suppression des accents pour les colonnes spécifiques
      corrected = corrected
        .replace(/Référence/g, 'Reference')
        .replace(/Débit/g, 'Debit')
        .replace(/Crédit/g, 'Credit');
      
      return corrected;
    });
  }

  // Méthode pour appliquer automatiquement le filtre "Succès" sur les fichiers Orange Money
  private applyAutomaticOrangeMoneyFilter(): void {
    console.log('🎯 Application automatique du filtre Orange Money...');
    
    // Chercher la colonne "Statut" dans les colonnes disponibles
    const statutColumn = this.allColumns.find(col => 
      col.toLowerCase().includes('statut') || 
      col.toLowerCase().includes('status')
    );
    
    // Chercher la colonne "Type d'opération" ou "Opération" pour filtrer Cash in et Merchant Payment
    const operationColumn = this.allColumns.find(col => {
      const colLower = col.toLowerCase();
      return (colLower.includes('type') && colLower.includes('opération')) ||
             colLower.includes('opération') ||
             colLower.includes('operation') ||
             colLower.includes('transaction') ||
             colLower.includes('service') ||
             colLower.includes('type') ||
             colLower.includes('catégorie') ||
             colLower.includes('categorie') ||
             colLower.includes('nature');
    });
    
    let filteredRows = [...this.allRows];
    
    // Appliquer le filtre sur le statut "Succès"
    if (statutColumn && filteredRows.length > 0) {
      console.log('✅ Colonne Statut trouvée:', statutColumn);
      
      filteredRows = filteredRows.filter(row => {
        const statutValue = row[statutColumn];
        return statutValue && statutValue.toString().toLowerCase().includes('succès');
      });
      
      console.log(`✅ Filtre Statut "Succès" appliqué: ${filteredRows.length} lignes restantes`);
    } else {
      console.log('⚠️ Colonne Statut non trouvée ou aucune donnée disponible');
    }
    
    // Appliquer le filtre sur les types d'opération (Cash in et Merchant Payment)
    if (operationColumn && filteredRows.length > 0) {
      console.log('✅ Colonne Type d\'opération trouvée:', operationColumn);
      
      const originalCount = filteredRows.length;
      
      // Collecter les types d'opération uniques pour le debug
      const uniqueOperations = new Set();
      filteredRows.forEach(row => {
        const operationValue = row[operationColumn];
        if (operationValue) {
          uniqueOperations.add(operationValue.toString());
        }
      });
      console.log('🔍 Types d\'opération disponibles:', Array.from(uniqueOperations));
      
      filteredRows = filteredRows.filter(row => {
        const operationValue = row[operationColumn];
        if (!operationValue) return false;
        
        const operationLower = operationValue.toString().toLowerCase();
        const isAccepted = operationLower.includes('cash in') || 
               operationLower.includes('merchant payment') ||
               operationLower.includes('paiement marchand') ||
               operationLower.includes('versement') ||
               operationLower.includes('deposit') ||
               operationLower.includes('cash-in') ||
               operationLower.includes('cashin') ||
               operationLower.includes('merchant') ||
               operationLower.includes('marchand') ||
               operationLower.includes('recharge') ||
               operationLower.includes('top up') ||
               operationLower.includes('topup');
        
        if (isAccepted) {
          console.log(`✅ Opération acceptée: "${operationValue}"`);
        }
        
        return isAccepted;
      });
      
      console.log(`✅ Filtre Type d'opération appliqué: ${filteredRows.length} lignes restantes (${originalCount - filteredRows.length} lignes filtrées)`);
    } else {
      console.log('⚠️ Colonne Type d\'opération non trouvée ou aucune donnée disponible');
      console.log('🔍 Colonnes disponibles:', this.allColumns);
    }
    
    // Appliquer le filtre de colonnes spécifique pour Orange Money
    this.applyOrangeMoneyColumnFilter();
      
      // Mettre à jour les données affichées
    if (filteredRows.length > 0) {
      this.allRows = [...filteredRows];
      this.combinedRows = [...filteredRows];
      this.filterApplied = true;
      
      // Mettre à jour l'affichage
      this.updateDisplayedRows();
      
      console.log(`✅ Filtres automatiques appliqués: ${filteredRows.length} lignes finales`);
      this.showSuccess('filter', `Filtres automatiques Orange Money appliqués: ${filteredRows.length} lignes (Succès + Cash in/Merchant Payment)`);
    } else {
      console.log('⚠️ Aucune ligne ne correspond aux critères de filtrage');
      this.showError('filter', 'Aucune ligne ne correspond aux critères de filtrage automatique.');
    }
    
    // Concaténation automatique des colonnes Date et Heure pour Orange Money
    this.applyAutomaticDateHeureConcatenation();
  }

  // Nouvelle méthode pour appliquer le filtre de colonnes spécifique Orange Money
  private applyOrangeMoneyColumnFilter(): void {
    console.log('🎯 Application du filtre de colonnes Orange Money...');
    
    // Définir l'ordre spécifique des colonnes pour Orange Money
    const orangeMoneyColumnOrder = [
      'Référence',
      'Débit', 
      'Crédit',
      'N° de Compte',
      'DATE',
      'Service',
      'Statut'
    ];
    
    // Chercher les colonnes correspondantes dans les données disponibles
    const availableColumns: string[] = [];
    
    for (const targetColumn of orangeMoneyColumnOrder) {
      // Chercher une correspondance exacte ou partielle
      const foundColumn = this.allColumns.find(col => {
        const colLower = col.toLowerCase();
        const targetLower = targetColumn.toLowerCase();
        
        // Correspondance exacte
        if (col === targetColumn) return true;
        
        // Correspondance partielle pour les colonnes spécifiques
        if (targetColumn === 'Référence' && colLower.includes('référence')) return true;
        if (targetColumn === 'Débit' && colLower.includes('débit')) return true;
        if (targetColumn === 'Crédit' && colLower.includes('crédit')) return true;
        if (targetColumn === 'N° de Compte' && (colLower.includes('n°') && colLower.includes('compte'))) return true;
        if (targetColumn === 'DATE' && colLower.includes('date')) return true;
        if (targetColumn === 'Service' && colLower.includes('service')) return true;
        if (targetColumn === 'Statut' && (colLower.includes('statut') || colLower.includes('status'))) return true;
        
        return false;
      });
      
      if (foundColumn) {
        availableColumns.push(foundColumn);
        console.log(`✅ Colonne trouvée pour "${targetColumn}": "${foundColumn}"`);
      } else {
        console.log(`⚠️ Colonne non trouvée pour "${targetColumn}"`);
      }
    }
    
    // Appliquer le filtre de colonnes si des colonnes ont été trouvées
    if (availableColumns.length > 0) {
      console.log(`🎯 Application du filtre de colonnes Orange Money: ${availableColumns.length} colonnes`);
      console.log(`📋 Colonnes sélectionnées:`, availableColumns);
      
      // Mettre à jour les colonnes affichées
      this.columns = [...availableColumns];
      this.selectedCols = [...availableColumns];
      this.selectionApplied = true;
      
      // Mettre à jour l'affichage
      this.updateDisplayedRows();
      
      console.log(`✅ Filtre de colonnes Orange Money appliqué avec succès`);
      this.showSuccess('select', `Filtre de colonnes Orange Money appliqué: ${availableColumns.length} colonnes affichées dans l'ordre spécifique`);
    } else {
      console.log('⚠️ Aucune colonne correspondante trouvée pour le filtre Orange Money');
    }
  }

  // Méthode pour concaténer automatiquement les colonnes Date et Heure pour les fichiers Orange Money
  private applyAutomaticDateHeureConcatenation(): void {
    console.log('📅 Application de la concaténation automatique Date + Heure pour Orange Money...');
    
    // Chercher les colonnes Date et Heure avec une détection plus flexible
    const dateColumn = this.allColumns.find(col => {
      const colLower = col.toLowerCase();
      return (colLower.includes('date') || colLower.includes('jour')) && 
             !colLower.includes('heure') && 
             !colLower.includes('time') &&
             !colLower.includes('horaire');
    });
    
    const heureColumn = this.allColumns.find(col => {
      const colLower = col.toLowerCase();
      return colLower.includes('heure') || 
             colLower.includes('time') ||
             colLower.includes('horaire') ||
             colLower.includes('moment');
    });
    
    if (dateColumn && heureColumn && this.allRows.length > 0) {
      console.log('✅ Colonnes Date et Heure trouvées:', { date: dateColumn, heure: heureColumn });
      
      // Vérifier si la colonne DATE existe déjà
      const dateColumnExists = this.allColumns.includes('DATE');
      
      if (!dateColumnExists) {
        // Ajouter la nouvelle colonne DATE aux colonnes
        this.allColumns.push('DATE');
        this.columns.push('DATE');
        
        // Concaténer les données
        let concatenatedCount = 0;
        for (const row of this.allRows) {
          const dateValue = row[dateColumn] || '';
          const heureValue = row[heureColumn] || '';
          
          // Concaténer avec un espace entre Date et Heure
          const concatenatedValue = `${dateValue} ${heureValue}`.trim();
          row['DATE'] = concatenatedValue;
          
          if (concatenatedValue) {
            concatenatedCount++;
          }
        }
        
        // Mettre à jour les données affichées
        this.combinedRows = [...this.allRows];
        this.originalRows = [...this.allRows];
        
        // Mettre à jour l'affichage
        this.updateDisplayedRows();
        
        console.log(`✅ Concaténation automatique appliquée: colonne DATE créée avec ${concatenatedCount} valeurs`);
        this.showSuccess('concat', `Concaténation automatique Orange Money: colonne DATE créée (${dateColumn} + ${heureColumn}) - ${concatenatedCount} valeurs traitées`);
      } else {
        console.log('ℹ️ Colonne DATE existe déjà, pas de concaténation automatique');
      }
    } else {
      console.log('⚠️ Colonnes Date et/ou Heure non trouvées pour la concaténation automatique');
      console.log('🔍 Colonnes disponibles:', this.allColumns);
      if (!dateColumn) console.log('❌ Colonne Date non trouvée');
      if (!heureColumn) console.log('❌ Colonne Heure non trouvée');
    }
  }

  /**
   * Effectue l'analyse automatique des types de champs
   */
  private performFieldTypeAnalysis(): void {
    try {
      console.log('🔍 Début de l\'analyse automatique des types de champs');
      
      if (this.allRows.length === 0) {
        console.log('⚠️ Aucune donnée à analyser');
        return;
      }

      // Analyser toutes les colonnes
      this.fieldTypeAnalysis = this.fieldTypeDetectionService.analyzeDataset(this.allRows);
      
      // Générer les recommandations de formatage
      this.formattingRecommendations = this.fieldTypeDetectionService.generateFormattingRecommendations(this.fieldTypeAnalysis);
      
      console.log('✅ Analyse des types de champs terminée:', this.fieldTypeAnalysis.length, 'colonnes analysées');
      console.log('📋 Recommandations de formatage:', this.formattingRecommendations.length, 'recommandations');
      
      // Appliquer automatiquement les formatages si activé
      if (this.autoFormattingEnabled && this.formattingRecommendations.length > 0) {
        this.applyAutomaticFormatting();
      }
      
      // Afficher l'analyse si des types intéressants sont détectés
      const interestingTypes = this.fieldTypeAnalysis.filter(a => 
        a.typeInfo.type === 'date' || 
        a.typeInfo.type === 'amount' || 
        a.typeInfo.type === 'number'
      );
      
      if (interestingTypes.length > 0) {
        this.showFieldTypeAnalysis = true;
        console.log('📊 Types de champs détectés:', interestingTypes.map(a => ({
          column: a.columnName,
          type: a.typeInfo.type,
          confidence: a.typeInfo.confidence
        })));
      }
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'analyse des types de champs:', error);
    }
  }

  /**
   * Applique automatiquement les formatages recommandés
   */
  private applyAutomaticFormatting(): void {
    try {
      console.log('🔄 Application automatique des formatages recommandés');
      
      for (const recommendation of this.formattingRecommendations) {
        if (recommendation.confidence > 0.7) {
          console.log(`📋 Application du formatage pour ${recommendation.column} (${recommendation.type})`);
          
          switch (recommendation.type) {
            case 'date':
              this.formatOptions.normalizeDates = true;
              break;
            case 'amount':
              this.formatOptions.cleanAmounts = true;
              this.formatOptions.normalizeNumbers = true;
              break;
            case 'number':
              this.formatOptions.normalizeNumbers = true;
              break;
            case 'text':
              this.formatOptions.trimSpaces = true;
              break;
          }
        }
      }
      
      // Appliquer le formatage si des options ont été activées
      if (this.hasFormattingOption()) {
        this.applyFormatting();
        console.log('✅ Formatage automatique appliqué');
      }
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'application automatique du formatage:', error);
    }
  }

  /**
   * Affiche l'analyse des types de champs
   */
  toggleFieldTypeAnalysis(): void {
    this.showFieldTypeAnalysis = !this.showFieldTypeAnalysis;
  }

  /**
   * Applique un formatage spécifique basé sur l'analyse
   */
  applySpecificFormatting(column: string, type: string): void {
    try {
      console.log(`🔄 Application du formatage spécifique pour ${column} (${type})`);
      
      switch (type) {
        case 'date':
          this.formatOptions.normalizeDates = true;
          this.selectedDateFormat = 'yyyy-MM-dd';
          break;
        case 'amount':
          this.formatOptions.cleanAmounts = true;
          this.formatOptions.normalizeNumbers = true;
          break;
        case 'number':
          this.formatOptions.normalizeNumbers = true;
          break;
        case 'text':
          this.formatOptions.trimSpaces = true;
          break;
      }
      
      this.applyFormatting();
      this.showSuccess('format', `Formatage appliqué pour ${column} (${type})`);
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'application du formatage spécifique:', error);
      this.showError('format', 'Erreur lors de l\'application du formatage');
    }
  }

  /**
   * Obtient les statistiques d'une colonne
   */
  getColumnStats(columnName: string): any {
    const analysis = this.fieldTypeAnalysis.find(a => a.columnName === columnName);
    if (!analysis) return null;
    
    return {
      type: analysis.typeInfo.type,
      confidence: analysis.typeInfo.confidence,
      nullCount: analysis.nullCount,
      uniqueCount: analysis.uniqueCount,
      totalCount: analysis.totalCount,
      minValue: analysis.minValue,
      maxValue: analysis.maxValue,
      averageValue: analysis.averageValue,
      sampleValues: analysis.sampleValues
    };
  }

  // ===== MÉTHODES POUR L'EXPORT PAR DATE =====

  // Pagination pour l'aperçu des périodes détectées
  detectedPeriodsPage: number = 1;
  detectedPeriodsPageSize: number = 10;
  detectedPeriodsTotalPages: number = 0;

  /**
   * Gère le changement de colonne de date pour l'export
   */
  onExportDateColChange(): void {
    this.detectedPeriods = [];
    this.detectedPeriodsPage = 1;
    this.detectedPeriodsTotalPages = 0;
    if (this.exportDateCol && this.exportDatePeriod) {
      this.detectPeriods();
    }
  }

  /**
   * Détecte les périodes disponibles dans la colonne de date sélectionnée
   */
  private detectPeriods(): void {
    if (!this.exportDateCol || !this.exportDatePeriod) return;

    const periodMap = new Map<string, number>();

    this.combinedRows.forEach(row => {
      const dateValue = row[this.exportDateCol];
      if (dateValue) {
        const periodKey = this.getPeriodKey(dateValue, this.exportDatePeriod);
        if (periodKey) {
          periodMap.set(periodKey, (periodMap.get(periodKey) || 0) + 1);
        }
      }
    });

    this.detectedPeriods = Array.from(periodMap.entries())
      .map(([key, count]) => ({
        key,
        label: this.formatPeriodLabel(key, this.exportDatePeriod),
        count
      }))
      .sort((a, b) => a.key.localeCompare(b.key));

    // Calculer le nombre total de pages pour la pagination
    this.detectedPeriodsTotalPages = Math.ceil(this.detectedPeriods.length / this.detectedPeriodsPageSize);
  }

  /**
   * Obtient les périodes détectées pour la page courante
   */
  getPagedDetectedPeriods(): any[] {
    const startIndex = (this.detectedPeriodsPage - 1) * this.detectedPeriodsPageSize;
    const endIndex = startIndex + this.detectedPeriodsPageSize;
    return this.detectedPeriods.slice(startIndex, endIndex);
  }

  /**
   * Va à la page précédente des périodes détectées
   */
  previousDetectedPeriodsPage(): void {
    if (this.detectedPeriodsPage > 1) {
      this.detectedPeriodsPage--;
    }
  }

  /**
   * Va à la page suivante des périodes détectées
   */
  nextDetectedPeriodsPage(): void {
    if (this.detectedPeriodsPage < this.detectedPeriodsTotalPages) {
      this.detectedPeriodsPage++;
    }
  }

  /**
   * Va à une page spécifique des périodes détectées
   */
  goToDetectedPeriodsPage(page: number): void {
    if (page >= 1 && page <= this.detectedPeriodsTotalPages) {
      this.detectedPeriodsPage = page;
    }
  }

  /**
   * Gère le changement de taille de page pour les périodes détectées
   */
  onPeriodsPageSizeChange(): void {
    this.detectedPeriodsPage = 1; // Retourner à la première page
    this.detectedPeriodsTotalPages = Math.ceil(this.detectedPeriods.length / this.detectedPeriodsPageSize);
  }

  /**
   * Exporte toutes les périodes (toutes les pages)
   */
  exportAllPages(): void {
    console.log('🔄 Début de l\'export de toutes les pages...');
    console.log('📋 Paramètres:', {
      exportDateCol: this.exportDateCol,
      exportDatePeriod: this.exportDatePeriod,
      exportDateFormat: this.exportDateFormat,
      totalPages: this.detectedPeriodsTotalPages,
      totalPeriods: this.detectedPeriods.length,
      totalRows: this.combinedRows.length,
      totalColumns: this.columns.length
    });

    if (!this.exportDateCol || !this.exportDatePeriod || !this.exportDateFormat) {
      this.showError('exportDate', 'Veuillez sélectionner une colonne de date, une période et un format.');
      return;
    }

    if (!this.combinedRows || this.combinedRows.length === 0) {
      this.showError('exportDate', 'Aucune donnée disponible pour l\'export. Veuillez d\'abord charger des fichiers.');
      return;
    }

    if (!this.columns || this.columns.length === 0) {
      this.showError('exportDate', 'Aucune colonne définie. Veuillez d\'abord charger des fichiers.');
      return;
    }

    // Vérifier que la colonne de date existe
    if (!this.columns.includes(this.exportDateCol)) {
      this.showError('exportDate', `La colonne "${this.exportDateCol}" n'existe pas dans les données chargées.`);
      return;
    }

    // Vérifier qu'il y a des périodes détectées
    if (!this.detectedPeriods || this.detectedPeriods.length === 0) {
      this.showError('exportDate', 'Aucune période détectée. Veuillez d\'abord sélectionner une colonne de date et une période.');
      return;
    }

    try {
      // Grouper les données pour toutes les périodes
      const periodGroups = this.groupDataByPeriod();
      console.log(`📊 Groupes de périodes pour toutes les pages: ${periodGroups.size}`);

      let exportedCount = 0;
      const errors: string[] = [];

      console.log(`🚀 Début de l'export de ${periodGroups.size} périodes (toutes les pages)...`);
      
      for (const [periodKey, rows] of periodGroups.entries()) {
        try {
          const periodLabel = this.formatPeriodLabel(periodKey, this.exportDatePeriod);
          const fileName = this.generateExportFileName(periodKey, periodLabel);
          
          console.log(`📁 Export de la période: ${periodLabel} (${rows.length} lignes) -> ${fileName}`);
          
          if (this.exportDateFormat === 'csv') {
            this.exportPeriodAsCSV(rows, fileName);
          } else if (this.exportDateFormat === 'xls') {
            this.exportPeriodAsXLS(rows, fileName);
          } else if (this.exportDateFormat === 'xlsx') {
            this.exportPeriodAsXLSX(rows, fileName);
          } else {
            throw new Error(`Format d'export non supporté: ${this.exportDateFormat}`);
          }
          
          exportedCount++;
          console.log(`✅ Fichier exporté avec succès: ${fileName}`);
        } catch (periodError) {
          console.error(`❌ Erreur pour la période ${periodKey}:`, periodError);
          errors.push(`Période ${periodKey}: ${periodError.message}`);
        }
      }
      
      console.log(`🏁 Export terminé: ${exportedCount} fichiers créés, ${errors.length} erreurs`);

      if (exportedCount > 0) {
        const message = errors.length > 0 
          ? `${exportedCount} fichier(s) exporté(s) avec succès (toutes les pages), ${errors.length} erreur(s).`
          : `${exportedCount} fichier(s) exporté(s) avec succès (toutes les pages) !`;
        this.showSuccess('exportDate', message);
        
        if (errors.length > 0) {
          console.warn('⚠️ Erreurs lors de l\'export:', errors);
        }
      } else {
        this.showError('exportDate', 'Aucun fichier n\'a pu être exporté. Vérifiez les données et les paramètres.');
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'export de toutes les pages:', error);
      this.showError('exportDate', `Erreur lors de l'export de toutes les pages: ${error.message}`);
    }
  }

  /**
   * Génère une clé de période basée sur la date et le type de période
   */
  private getPeriodKey(dateValue: any, period: string): string | null {
    try {
      const date = this.parseDate(dateValue);
      if (!date) {
        console.warn(`⚠️ Impossible de parser la date: ${dateValue}`);
        return null;
      }

      let periodKey: string | null = null;
      
      switch (period) {
        case 'day':
          periodKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
          break;
        case 'week':
          const year = date.getFullYear();
          const week = this.getWeekNumber(date);
          periodKey = `${year}-W${week.toString().padStart(2, '0')}`;
          break;
        case 'month':
          periodKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
          break;
        default:
          console.warn(`⚠️ Type de période non supporté: ${period}`);
          return null;
      }
      
      // Log seulement pour les premières dates pour éviter de surcharger la console
      if (Math.random() < 0.01) { // 1% des cas seulement
        console.log(`🔑 Clé de période générée: ${dateValue} -> ${periodKey} (${period})`);
      }
      return periodKey;
    } catch (error) {
      console.error('❌ Erreur lors de la génération de la clé de période:', error, 'pour la valeur:', dateValue);
      return null;
    }
  }

  /**
   * Formate le label d'une période pour l'affichage
   */
  private formatPeriodLabel(key: string, period: string): string {
    switch (period) {
      case 'day':
        return new Date(key).toLocaleDateString('fr-FR');
      case 'week':
        const [year, week] = key.split('-W');
        return `Semaine ${week} de ${year}`;
      case 'month':
        const [yearMonth, month] = key.split('-');
        const monthNames = [
          'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
          'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
        ];
        return `${monthNames[parseInt(month) - 1]} ${yearMonth}`;
      default:
        return key;
    }
  }

  /**
   * Calcule le numéro de semaine d'une date
   */
  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  /**
   * Parse une date depuis différentes formats
   */
  private parseDate(dateValue: any): Date | null {
    if (!dateValue) {
      console.warn('⚠️ Valeur de date vide ou nulle');
      return null;
    }

    // Si c'est déjà un objet Date
    if (dateValue instanceof Date) {
      console.log(`📅 Date déjà parsée: ${dateValue.toISOString()}`);
      return dateValue;
    }

    // Si c'est une string, essayer de la parser
    if (typeof dateValue === 'string') {
      const trimmedValue = dateValue.trim();
      // Log seulement pour les premières dates pour éviter de surcharger la console
      if (Math.random() < 0.01) { // 1% des cas seulement
        console.log(`🔍 Tentative de parsing de la date: "${trimmedValue}"`);
      }
      
      // Essayer différents formats de date
      const formats = [
        { pattern: /^\d{4}-\d{2}-\d{2}$/, name: 'YYYY-MM-DD' },
        { pattern: /^\d{2}\/\d{2}\/\d{4}$/, name: 'DD/MM/YYYY' },
        { pattern: /^\d{2}-\d{2}-\d{4}$/, name: 'DD-MM-YYYY' },
        { pattern: /^\d{4}\/\d{2}\/\d{2}$/, name: 'YYYY/MM/DD' },
        { pattern: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, name: 'ISO DateTime' },
      ];

      for (const format of formats) {
        if (format.pattern.test(trimmedValue)) {
          const parsed = new Date(trimmedValue);
          if (!isNaN(parsed.getTime())) {
            if (Math.random() < 0.01) { // 1% des cas seulement
              console.log(`✅ Date parsée avec le format ${format.name}: ${parsed.toISOString()}`);
            }
            return parsed;
          }
        }
      }

      // Essayer de parser directement
      const parsed = new Date(trimmedValue);
      if (!isNaN(parsed.getTime())) {
        if (Math.random() < 0.01) { // 1% des cas seulement
          console.log(`✅ Date parsée directement: ${parsed.toISOString()}`);
        }
        return parsed;
      }
      
      console.warn(`❌ Impossible de parser la date: "${trimmedValue}"`);
    } else {
      console.warn(`❌ Type de valeur non supporté pour le parsing de date: ${typeof dateValue}`, dateValue);
    }

    return null;
  }

  /**
   * Exporte les données par période de date (page courante seulement)
   */
  exportByDate(): void {
    console.log('🔄 Début de l\'export par date (page courante)...');
    console.log('📋 Paramètres:', {
      exportDateCol: this.exportDateCol,
      exportDatePeriod: this.exportDatePeriod,
      exportDateFormat: this.exportDateFormat,
      currentPage: this.detectedPeriodsPage,
      totalPages: this.detectedPeriodsTotalPages,
      totalRows: this.combinedRows.length,
      totalColumns: this.columns.length
    });

    if (!this.exportDateCol || !this.exportDatePeriod || !this.exportDateFormat) {
      this.showError('exportDate', 'Veuillez sélectionner une colonne de date, une période et un format.');
      return;
    }

    if (!this.combinedRows || this.combinedRows.length === 0) {
      this.showError('exportDate', 'Aucune donnée disponible pour l\'export. Veuillez d\'abord charger des fichiers.');
      return;
    }

    if (!this.columns || this.columns.length === 0) {
      this.showError('exportDate', 'Aucune colonne définie. Veuillez d\'abord charger des fichiers.');
      return;
    }

    // Vérifier que la colonne de date existe
    if (!this.columns.includes(this.exportDateCol)) {
      this.showError('exportDate', `La colonne "${this.exportDateCol}" n'existe pas dans les données chargées.`);
      return;
    }

    // Vérifier qu'il y a des périodes détectées
    if (!this.detectedPeriods || this.detectedPeriods.length === 0) {
      this.showError('exportDate', 'Aucune période détectée. Veuillez d\'abord sélectionner une colonne de date et une période.');
      return;
    }

    try {
      // Obtenir les périodes de la page courante
      const currentPagePeriods = this.getPagedDetectedPeriods();
      console.log(`📊 Périodes de la page courante (${this.detectedPeriodsPage}/${this.detectedPeriodsTotalPages}): ${currentPagePeriods.length}`);
      
      if (currentPagePeriods.length === 0) {
        this.showError('exportDate', 'Aucune période sur la page courante à exporter.');
        return;
      }

      // Grouper les données pour les périodes de la page courante seulement
      const periodGroups = this.groupDataByPeriodForPage(currentPagePeriods);
      console.log(`📊 Groupes de périodes pour la page courante: ${periodGroups.size}`);

      let exportedCount = 0;
      const errors: string[] = [];

      console.log(`🚀 Début de l'export de ${periodGroups.size} périodes de la page courante...`);
      
      for (const [periodKey, rows] of periodGroups.entries()) {
        try {
          const periodLabel = this.formatPeriodLabel(periodKey, this.exportDatePeriod);
          const fileName = this.generateExportFileName(periodKey, periodLabel);
          
          console.log(`📁 Export de la période: ${periodLabel} (${rows.length} lignes) -> ${fileName}`);
          
          if (this.exportDateFormat === 'csv') {
            this.exportPeriodAsCSV(rows, fileName);
          } else if (this.exportDateFormat === 'xls') {
            this.exportPeriodAsXLS(rows, fileName);
          } else if (this.exportDateFormat === 'xlsx') {
            this.exportPeriodAsXLSX(rows, fileName);
          } else {
            throw new Error(`Format d'export non supporté: ${this.exportDateFormat}`);
          }
          
          exportedCount++;
          console.log(`✅ Fichier exporté avec succès: ${fileName}`);
        } catch (periodError) {
          console.error(`❌ Erreur pour la période ${periodKey}:`, periodError);
          errors.push(`Période ${periodKey}: ${periodError.message}`);
        }
      }
      
      console.log(`🏁 Export terminé: ${exportedCount} fichiers créés, ${errors.length} erreurs`);

      if (exportedCount > 0) {
        const message = errors.length > 0 
          ? `${exportedCount} fichier(s) exporté(s) avec succès (page ${this.detectedPeriodsPage}), ${errors.length} erreur(s).`
          : `${exportedCount} fichier(s) exporté(s) avec succès (page ${this.detectedPeriodsPage}) !`;
        this.showSuccess('exportDate', message);
        
        if (errors.length > 0) {
          console.warn('⚠️ Erreurs lors de l\'export:', errors);
        }
      } else {
        this.showError('exportDate', 'Aucun fichier n\'a pu être exporté. Vérifiez les données et les paramètres.');
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'export par date:', error);
      this.showError('exportDate', `Erreur lors de l'export par date: ${error.message}`);
    }
  }

  /**
   * Groupe les données par période pour les périodes de la page courante seulement
   */
  private groupDataByPeriodForPage(currentPagePeriods: any[]): Map<string, any[]> {
    const groups = new Map<string, any[]>();
    
    console.log('🔍 Début du groupement des données pour la page courante...');
    console.log(`📊 Périodes à traiter: ${currentPagePeriods.length}`);
    console.log(`📊 Nombre total de lignes: ${this.combinedRows.length}`);

    // Créer un Set des clés de période de la page courante pour un accès rapide
    const currentPageKeys = new Set(currentPagePeriods.map(period => period.key));
    console.log(`🔑 Clés de période de la page courante:`, Array.from(currentPageKeys));

    let processedRows = 0;
    let validDates = 0;
    let invalidDates = 0;
    let matchedPeriods = 0;

    this.combinedRows.forEach((row, index) => {
      const dateValue = row[this.exportDateCol];
      if (dateValue) {
        const periodKey = this.getPeriodKey(dateValue, this.exportDatePeriod);
        if (periodKey && currentPageKeys.has(periodKey)) {
          if (!groups.has(periodKey)) {
            groups.set(periodKey, []);
          }
          groups.get(periodKey)!.push(row);
          validDates++;
          matchedPeriods++;
        } else if (periodKey) {
          // Période valide mais pas dans la page courante
          validDates++;
        } else {
          invalidDates++;
          if (invalidDates <= 5) {
            console.warn(`⚠️ Date invalide à la ligne ${index}:`, dateValue);
          }
        }
      } else {
        invalidDates++;
        if (invalidDates <= 5) {
          console.warn(`⚠️ Valeur de date vide à la ligne ${index}`);
        }
      }
      processedRows++;
    });

    console.log(`✅ Groupement pour la page courante terminé:`);
    console.log(`   - Lignes traitées: ${processedRows}`);
    console.log(`   - Dates valides: ${validDates}`);
    console.log(`   - Dates invalides: ${invalidDates}`);
    console.log(`   - Périodes correspondantes: ${matchedPeriods}`);
    console.log(`   - Groupes créés: ${groups.size}`);
    
    // Afficher les détails de chaque groupe
    for (const [periodKey, rows] of groups.entries()) {
      console.log(`   📅 ${periodKey}: ${rows.length} lignes`);
    }

    return groups;
  }

  /**
   * Groupe les données par période (toutes les périodes)
   */
  private groupDataByPeriod(): Map<string, any[]> {
    const groups = new Map<string, any[]>();
    
    console.log('🔍 Début du groupement des données par période...');
    console.log(`📊 Nombre total de lignes à traiter: ${this.combinedRows.length}`);
    console.log(`📅 Colonne de date sélectionnée: ${this.exportDateCol}`);
    console.log(`📆 Période d'export: ${this.exportDatePeriod}`);

    let processedRows = 0;
    let validDates = 0;
    let invalidDates = 0;

    this.combinedRows.forEach((row, index) => {
      const dateValue = row[this.exportDateCol];
      if (dateValue) {
        const periodKey = this.getPeriodKey(dateValue, this.exportDatePeriod);
        if (periodKey) {
          if (!groups.has(periodKey)) {
            groups.set(periodKey, []);
          }
          groups.get(periodKey)!.push(row);
          validDates++;
        } else {
          invalidDates++;
          // Log seulement les premières erreurs pour éviter de surcharger la console
          if (invalidDates <= 5) {
            console.warn(`⚠️ Date invalide à la ligne ${index}:`, dateValue);
          }
        }
      } else {
        invalidDates++;
        // Log seulement les premières erreurs pour éviter de surcharger la console
        if (invalidDates <= 5) {
          console.warn(`⚠️ Valeur de date vide à la ligne ${index}`);
        }
      }
      processedRows++;
    });

    console.log(`✅ Groupement terminé:`);
    console.log(`   - Lignes traitées: ${processedRows}`);
    console.log(`   - Dates valides: ${validDates}`);
    console.log(`   - Dates invalides: ${invalidDates}`);
    console.log(`   - Périodes détectées: ${groups.size}`);
    
    // Afficher les détails de chaque période (limité à 10 pour éviter de surcharger)
    let periodCount = 0;
    for (const [periodKey, rows] of groups.entries()) {
      if (periodCount < 10) {
        console.log(`   📅 ${periodKey}: ${rows.length} lignes`);
      }
      periodCount++;
    }
    
    if (groups.size > 10) {
      console.log(`   ... et ${groups.size - 10} autres périodes`);
    }

    return groups;
  }

  /**
   * Génère le nom de fichier pour l'export
   */
  private generateExportFileName(periodKey: string, periodLabel: string): string {
    const prefix = this.exportDatePrefix.trim() || 'export';
    const extension = this.exportDateFormat;
    
    // Nettoyer le label pour le nom de fichier
    const cleanLabel = periodLabel.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
    
    return `${prefix}_${cleanLabel}.${extension}`;
  }

  /**
   * Exporte une période en CSV
   */
  private exportPeriodAsCSV(rows: any[], fileName: string): void {
    try {
      console.log(`🔄 Export CSV: ${rows.length} lignes, ${this.columns.length} colonnes`);
      
      if (!rows || rows.length === 0) {
        console.warn('⚠️ Aucune donnée à exporter en CSV');
        return;
      }

      if (!this.columns || this.columns.length === 0) {
        console.warn('⚠️ Aucune colonne définie pour l\'export CSV');
        return;
      }

      const exportColumns = this.columns.map(col => col === 'GRX' ? 'PAYS' : col);
      const csvRows: string[] = [];
      csvRows.push(exportColumns.join(';'));

      for (const row of rows) {
        const line = this.columns.map((col, idx) => {
          let val = row[col];
          
          // Nettoyer et formater les valeurs
          if (val === undefined || val === null) {
            val = '';
          } else if (typeof val === 'object') {
            val = JSON.stringify(val);
          } else {
            val = String(val).trim();
          }
          
          // Échapper les caractères spéciaux pour CSV
          if (val.includes('"')) val = val.replace(/"/g, '""');
          if (val.includes(';') || val.includes('"') || val.includes('\n')) val = '"' + val + '"';
          return val;
        }).join(';');
        csvRows.push(line);
      }

      const csvContent = csvRows.join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      
      console.log(`✅ Export CSV réussi: ${fileName}`);
    } catch (error) {
      console.error('❌ Erreur lors de l\'export CSV:', error);
      throw new Error(`Erreur lors de l'export CSV: ${error.message}`);
    }
  }

  /**
   * Exporte une période en XLS
   */
  private exportPeriodAsXLS(rows: any[], fileName: string): void {
    try {
      console.log(`🔄 Export XLS: ${rows.length} lignes, ${this.columns.length} colonnes`);
      
      if (!rows || rows.length === 0) {
        console.warn('⚠️ Aucune donnée à exporter en XLS');
        return;
      }

      if (!this.columns || this.columns.length === 0) {
        console.warn('⚠️ Aucune colonne définie pour l\'export XLS');
        return;
      }

      const exportColumns = this.columns.map(col => col === 'GRX' ? 'PAYS' : col);
      
      const exportData = rows.map((row, index) => {
        const exportRow: any = {};
        this.columns.forEach((col, idx) => {
          const exportCol = exportColumns[idx];
          let value = row[col];
          
          // Nettoyer et formater les valeurs
          if (value === undefined || value === null) {
            value = '';
          } else if (typeof value === 'object') {
            value = JSON.stringify(value);
          } else {
            value = String(value).trim();
          }
          
          exportRow[exportCol] = value;
        });
        return exportRow;
      });

      console.log(`📊 Données préparées pour XLS: ${exportData.length} lignes`);
      
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Définir la largeur des colonnes
      const colWidths = exportColumns.map(() => ({ wch: 15 }));
      worksheet['!cols'] = colWidths;
      
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Données');
      XLSX.writeFile(workbook, fileName);
      
      console.log(`✅ Export XLS réussi: ${fileName}`);
    } catch (error) {
      console.error('❌ Erreur lors de l\'export XLS:', error);
      throw new Error(`Erreur lors de l'export XLS: ${error.message}`);
    }
  }

  /**
   * Exporte une période en XLSX
   */
  private exportPeriodAsXLSX(rows: any[], fileName: string): void {
    try {
      console.log(`🔄 Export XLSX: ${rows.length} lignes, ${this.columns.length} colonnes`);
      
      if (!rows || rows.length === 0) {
        console.warn('⚠️ Aucune donnée à exporter en XLSX');
        return;
      }

      if (!this.columns || this.columns.length === 0) {
        console.warn('⚠️ Aucune colonne définie pour l\'export XLSX');
        return;
      }

      const exportColumns = this.columns.map(col => col === 'GRX' ? 'PAYS' : col);
      
      const exportData = rows.map((row, index) => {
        const exportRow: any = {};
        this.columns.forEach((col, idx) => {
          const exportCol = exportColumns[idx];
          let value = row[col];
          
          // Nettoyer et formater les valeurs
          if (value === undefined || value === null) {
            value = '';
          } else if (typeof value === 'object') {
            value = JSON.stringify(value);
          } else {
            value = String(value).trim();
          }
          
          exportRow[exportCol] = value;
        });
        return exportRow;
      });

      console.log(`📊 Données préparées pour XLSX: ${exportData.length} lignes`);
      
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Définir la largeur des colonnes
      const colWidths = exportColumns.map(() => ({ wch: 15 }));
      worksheet['!cols'] = colWidths;
      
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Données');
      XLSX.writeFile(workbook, fileName);
      
      console.log(`✅ Export XLSX réussi: ${fileName}`);
    } catch (error) {
      console.error('❌ Erreur lors de l\'export XLSX:', error);
      throw new Error(`Erreur lors de l'export XLSX: ${error.message}`);
    }
  }

  /**
   * Réinitialise les paramètres d'export par date
   */
  resetExportDate(): void {
    this.exportDateCol = '';
    this.exportDatePeriod = 'day';
    this.exportDateFormat = 'csv';
    this.exportDatePrefix = 'export';
    this.detectedPeriods = [];
    this.successMsg.exportDate = '';
    this.errorMsg.exportDate = '';
  }
} 