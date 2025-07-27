import { Component, OnInit, ChangeDetectorRef, AfterViewInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { MatSelect } from '@angular/material/select';
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
    trimSpaces: false,
    toLowerCase: false,
    toUpperCase: false,
    normalizeDates: false,
    normalizeNumbers: false,
    amountColumns: [],
    numberColumns: [],
    dateColumns: [],
    removeDashesAndCommas: false,
    removeSeparators: false,
    dotToComma: false,
    absoluteValue: false,
    removeCharacters: false,
    removeSpecificCharacters: false
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

  // --- CONTRÔLES DE RECHERCHE POUR COHÉRENCE AVEC LES FILTRES ---
  filterValueSearchCtrl = new FormControl('');
  filteredFilterValues: string[] = [];
  @ViewChild('filterValueSelect') filterValueSelect!: MatSelect;

  // --- CONCATÉNATION DE COLONNES (MULTI) ---
  concatCols: string[] = [];
  concatNewCol: string = '';
  concatSeparator: string = ' ';

  exportTypeSuffix: string = '';
  exportTypeDescription: string = '';

  // --- SUPPRESSION DE CARACTÈRES ---
  removeCharPosition: 'start' | 'end' | 'specific' = 'start';
  removeCharCount: number = 1;
  removeCharSpecificPosition: number = 1;

  // --- SUPPRESSION DE CARACTÈRES SPÉCIFIQUES ---
  specificCharactersToRemove: string = '';
  removeSpecificCharactersCaseSensitive: boolean = true;
  
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
  csvFileToProcess: File | null = null;

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
    trimSpaces: [],
    toLowerCase: [],
    toUpperCase: [],
    removeDashesAndCommas: [],
    removeSeparators: [],
    dotToComma: [],
    normalizeDates: [],
    normalizeNumbers: [],
    amountColumns: [],
    numberColumns: [],
    dateColumns: [],
    absoluteValue: [], // Ajouté
    removeCharacters: [], // Nouvelle option pour supprimer des caractères
    removeSpecificCharacters: [] // Nouvelle option pour supprimer des caractères spécifiques
  };

  constructor(private cd: ChangeDetectorRef, private fb: FormBuilder) {}

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
    reader.readAsText(file);
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
    
    this.isProcessing = true;
    this.processingProgress = 0;
    this.processingMessage = 'Initialisation du traitement ultra-rapide...';
    
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
    
    try {
      for (const file of this.selectedFiles) {
        this.currentFileIndex++;
        this.processingMessage = `Traitement ultra-rapide du fichier ${this.currentFileIndex}/${this.totalFilesToProcess}: ${file.name}`;
        this.processingProgress = (this.currentFileIndex - 1) / this.totalFilesToProcess * 100;
        
        const fileName = file.name.toLowerCase();
        console.log(`🚀 Traitement ultra-rapide: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
        
        let beforeRows = this.allRows.length;
        try {
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
      }
      
      // Fusion ultra-rapide des colonnes
      this.processingMessage = 'Fusion ultra-rapide des colonnes...';
      this.allColumns = await this.mergeColumnsOptimized();
      
      // Normalisation ultra-rapide des données
      this.processingMessage = 'Normalisation ultra-rapide des données...';
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
      console.log(`🚀 Traitement terminé: ${totalProcessed} lignes`);
      
      this.showSuccess('upload', `Traitement ultra-rapide terminé ! ${totalProcessed} lignes traitées`);
      
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
      reader.onload = (e: any) => {
        try {
          const csv = e.target.result;
          const lines = csv.split('\n');
          const headers = lines[0].split(';').map((h: string) => h.trim());
          
          // Traitement optimisé par chunks
          const rows: any[] = [];
          for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
              const values = lines[i].split(';');
              const row: any = {};
              headers.forEach((header: string, index: number) => {
                row[header] = values[index] || '';
              });
              rows.push(row);
            }
          }
          
          this.allRows.push(...rows);
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  private async readExcelFileOptimized(file: File): Promise<void> {
    try {
      const workbook = await this.readExcelFile(file);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Conversion optimisée
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      if (jsonData.length === 0) return;
      
      const headers = jsonData[0] as string[];
      const rows: any[] = [];
      
      // Traitement optimisé par chunks
      for (let i = 1; i < jsonData.length; i++) {
        const rowData = jsonData[i] as any[];
        const row: any = {};
        headers.forEach((header: string, index: number) => {
          row[header] = rowData[index] || '';
        });
        rows.push(row);
      }
      
      this.allRows.push(...rows);
    } catch (error) {
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
          
          // Prévisualiser les données
          try {
            const preview = await this.previewCsvData(csv, this.detectedDelimiter);
            this.csvPreviewColumns = preview.columns;
            this.csvPreviewData = preview.data;
            this.showCsvPreview = true;
            
            console.log('Prévisualisation CSV:', {
              columns: preview.columns,
              dataLength: preview.data.length,
              hasHeader: preview.hasHeader
            });
          } catch (previewError) {
            console.warn('Erreur lors de la prévisualisation:', previewError);
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
    // On ne vérifie plus textColumns
    const { trimSpaces, toLowerCase, toUpperCase, normalizeDates, normalizeNumbers, amountColumns, numberColumns, dateColumns, absoluteValue } = this.formatOptions;
    return trimSpaces || toLowerCase || toUpperCase || normalizeDates || normalizeNumbers || amountColumns.length > 0 || numberColumns.length > 0 || dateColumns.length > 0 || absoluteValue;
  }

  applyFormatting() {
    try {
      if (!this.hasFormattingOption()) return;
      this.combinedRows = this.combinedRows.map(row => {
        const newRow: any = {};
        for (const col of this.columns) {
          let value = row[col];
          if (typeof value === 'string') {
            if (this.formatOptions.trimSpaces) {
              value = value.replace(/\s+/g, ' ').trim();
            }
            if (this.formatOptions.toLowerCase) {
              value = value.toLowerCase();
            }
            if (this.formatOptions.toUpperCase) {
              value = value.toUpperCase();
            }
            if (this.formatOptions.removeSeparators) {
              value = value.replace(/,/g, '');
            }
            if (this.formatOptions.dotToComma) {
              value = value.replace(/\./g, ',');
            }
            if (this.formatOptions.removeDashesAndCommas) {
              value = value.replace(/-/g, '').replace(/,/g, '');
            }
          }
          // Normalisation des dates (format ISO)
          if (this.formatOptions.normalizeDates && value && typeof value === 'string') {
            const date = new Date(value);
            if (!isNaN(date.getTime()) && value.length >= 6) {
              value = date.toISOString().split('T')[0];
            }
          }
          // Normalisation des montants (nombres)
          if (this.formatOptions.normalizeNumbers && value && typeof value === 'string') {
            const num = parseFloat(value.replace(/\s/g, '').replace(',', '.'));
            if (!isNaN(num)) {
              value = num;
            }
          }
          newRow[col] = value;
        }
        return newRow;
      });
      this.showSuccess('format', 'Formatage appliqué avec succès.');
    } catch (e) {
      this.showError('format', 'Erreur lors du formatage.');
    }
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
      // Extraire les valeurs uniques de la colonne sélectionnée
      this.filterValues = Array.from(new Set(this.allRows.map(row => row[this.selectedFilterColumn])));
      this.filteredFilterValues = this.filterValues.slice();
      this.selectedFilterValues = []; // Reset to empty array
    } else {
      this.filterValues = [];
      this.filteredFilterValues = [];
      this.selectedFilterValues = [];
    }
  }

  applyFilter() {
    if (this.selectedFilterColumn && this.selectedFilterValues && this.selectedFilterValues.length > 0) {
      this.filteredRows = this.originalRows.filter(row => this.selectedFilterValues.includes(row[this.selectedFilterColumn]));
      this.allRows = [...this.filteredRows];
      this.combinedRows = [...this.filteredRows];
      this.filterApplied = true;
      this.showSuccess('filter', `Filtre appliqué sur « ${this.selectedFilterColumn} » = « ${this.selectedFilterValues.join(', ')} » (${this.combinedRows.length} lignes).`);
      this.updateDisplayedRows();
    }
  }

  resetFilter() {
    this.selectedFilterColumn = '';
    this.selectedFilterValues = [];
    this.filterValues = [];
    this.filterApplied = false;
    this.allRows = [...this.originalRows];
    this.combinedRows = [...this.originalRows];
    this.updateDisplayedRows();
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
      a.download = 'resultat.csv';
      a.click();
      URL.revokeObjectURL(url);
      this.showSuccess('export', 'Export CSV réussi.');
    } catch (e) {
      this.showError('export', 'Erreur lors de l\'export CSV.');
    }
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

  // Méthodes d'application pour chaque option
  applyTrimSpacesFormatting() {
    if (!this.formatSelections['trimSpaces'].length) {
      this.showError('format', 'Veuillez sélectionner au moins une colonne');
      return;
    }

    try {
      let processedCells = 0;
      let totalCells = 0;
      
      // Traiter les données affichées (combinedRows)
      this.combinedRows.forEach((row, rowIndex) => {
        this.formatSelections['trimSpaces'].forEach(col => {
          totalCells++;
          if (row[col] && typeof row[col] === 'string') {
            const originalValue = row[col];
            const newValue = row[col].replace(/\s+/g, ' ').trim();
            
            if (newValue !== originalValue) {
              processedCells++;
              console.log(`✅ MODIFICATION: Ligne ${rowIndex}, Colonne ${col}: "${originalValue}" -> "${newValue}"`);
            }
            
            row[col] = newValue;
          }
        });
      });

      // Mettre à jour aussi allRows si la sélection n'est pas appliquée
      if (!this.selectionApplied) {
        this.allRows.forEach((row, rowIndex) => {
          this.formatSelections['trimSpaces'].forEach(col => {
            if (row[col] && typeof row[col] === 'string') {
              row[col] = row[col].replace(/\s+/g, ' ').trim();
            }
          });
        });
      }

      console.log(`📊 RÉSUMÉ: ${totalCells} cellules vérifiées, ${processedCells} cellules modifiées`);
      this.showSuccess('format', `Espaces supprimés avec succès (${processedCells} modifications)`);
      
      // Forcer la mise à jour de l'affichage
      this.updateDisplayedRowsForPage();
      this.cd.detectChanges();
    } catch (error) {
      console.error('❌ Erreur lors de la suppression des espaces:', error);
      this.showError('format', 'Erreur lors du formatage des espaces.');
    }
  }

  applyToLowerCaseFormatting() {
    if (!this.formatSelections['toLowerCase'].length) {
      this.showError('format', 'Veuillez sélectionner au moins une colonne');
      return;
    }

    try {
      let processedCells = 0;
      let totalCells = 0;
      
      // Traiter les données affichées (combinedRows)
      this.combinedRows.forEach((row, rowIndex) => {
        this.formatSelections['toLowerCase'].forEach(col => {
          totalCells++;
          if (row[col] && typeof row[col] === 'string') {
            const originalValue = row[col];
            const newValue = row[col].toLowerCase();
            
            if (newValue !== originalValue) {
              processedCells++;
              console.log(`✅ MODIFICATION: Ligne ${rowIndex}, Colonne ${col}: "${originalValue}" -> "${newValue}"`);
            }
            
            row[col] = newValue;
          }
        });
      });

      // Mettre à jour aussi allRows si la sélection n'est pas appliquée
      if (!this.selectionApplied) {
        this.allRows.forEach((row, rowIndex) => {
          this.formatSelections['toLowerCase'].forEach(col => {
            if (row[col] && typeof row[col] === 'string') {
              row[col] = row[col].toLowerCase();
            }
          });
        });
      }

      console.log(`📊 RÉSUMÉ: ${totalCells} cellules vérifiées, ${processedCells} cellules modifiées`);
      this.showSuccess('format', `Conversion en minuscules réussie (${processedCells} modifications)`);
      
      // Forcer la mise à jour de l'affichage
      this.updateDisplayedRowsForPage();
      this.cd.detectChanges();
    } catch (error) {
      console.error('❌ Erreur lors de la conversion en minuscules:', error);
      this.showError('format', 'Erreur lors du passage en minuscules.');
    }
  }

  applyToUpperCaseFormatting() {
    if (!this.formatSelections['toUpperCase'].length) {
      this.showError('format', 'Veuillez sélectionner au moins une colonne');
      return;
    }

    try {
      let processedCells = 0;
      let totalCells = 0;
      
      // Traiter les données affichées (combinedRows)
      this.combinedRows.forEach((row, rowIndex) => {
        this.formatSelections['toUpperCase'].forEach(col => {
          totalCells++;
          if (row[col] && typeof row[col] === 'string') {
            const originalValue = row[col];
            const newValue = row[col].toUpperCase();
            
            if (newValue !== originalValue) {
              processedCells++;
              console.log(`✅ MODIFICATION: Ligne ${rowIndex}, Colonne ${col}: "${originalValue}" -> "${newValue}"`);
            }
            
            row[col] = newValue;
          }
        });
      });

      // Mettre à jour aussi allRows si la sélection n'est pas appliquée
      if (!this.selectionApplied) {
        this.allRows.forEach((row, rowIndex) => {
          this.formatSelections['toUpperCase'].forEach(col => {
            if (row[col] && typeof row[col] === 'string') {
              row[col] = row[col].toUpperCase();
            }
          });
        });
      }

      console.log(`📊 RÉSUMÉ: ${totalCells} cellules vérifiées, ${processedCells} cellules modifiées`);
      this.showSuccess('format', `Conversion en MAJUSCULES réussie (${processedCells} modifications)`);
      
      // Forcer la mise à jour de l'affichage
      this.updateDisplayedRowsForPage();
      this.cd.detectChanges();
    } catch (error) {
      console.error('❌ Erreur lors de la conversion en MAJUSCULES:', error);
      this.showError('format', 'Erreur lors du passage en MAJUSCULES.');
    }
  }

  applyRemoveDashesAndCommasFormatting() {
    if (!this.formatSelections['removeDashesAndCommas'].length) {
      this.showError('format', 'Veuillez sélectionner au moins une colonne');
      return;
    }

    try {
      let processedCells = 0;
      let totalCells = 0;
      
      // Traiter les données affichées (combinedRows)
      this.combinedRows.forEach((row, rowIndex) => {
        this.formatSelections['removeDashesAndCommas'].forEach(col => {
          totalCells++;
          if (row[col] && typeof row[col] === 'string') {
            const originalValue = row[col];
            const newValue = row[col].replace(/[-,]/g, '');
            
            if (newValue !== originalValue) {
              processedCells++;
              console.log(`✅ MODIFICATION: Ligne ${rowIndex}, Colonne ${col}: "${originalValue}" -> "${newValue}"`);
            }
            
            row[col] = newValue;
          }
        });
      });

      // Mettre à jour aussi allRows si la sélection n'est pas appliquée
      if (!this.selectionApplied) {
        this.allRows.forEach((row, rowIndex) => {
          this.formatSelections['removeDashesAndCommas'].forEach(col => {
            if (row[col] && typeof row[col] === 'string') {
              row[col] = row[col].replace(/[-,]/g, '');
            }
          });
        });
      }

      console.log(`📊 RÉSUMÉ: ${totalCells} cellules vérifiées, ${processedCells} cellules modifiées`);
      this.showSuccess('format', `Tirets et virgules supprimés avec succès (${processedCells} modifications)`);
      
      // Forcer la mise à jour de l'affichage
      this.updateDisplayedRowsForPage();
      this.cd.detectChanges();
    } catch (error) {
      console.error('❌ Erreur lors de la suppression des tirets/virgules:', error);
      this.showError('format', 'Erreur lors de la suppression des tirets/virgules.');
    }
  }

  applyRemoveSeparatorsFormatting() {
    if (!this.formatSelections['removeSeparators'].length) {
      this.showError('format', 'Veuillez sélectionner au moins une colonne');
      return;
    }

    try {
      let processedCells = 0;
      let totalCells = 0;
      
      // Traiter les données affichées (combinedRows)
      this.combinedRows.forEach((row, rowIndex) => {
        this.formatSelections['removeSeparators'].forEach(col => {
          totalCells++;
          if (row[col] && typeof row[col] === 'string') {
            const originalValue = row[col];
            const newValue = row[col].replace(/,/g, '');
            
            if (newValue !== originalValue) {
              processedCells++;
              console.log(`✅ MODIFICATION: Ligne ${rowIndex}, Colonne ${col}: "${originalValue}" -> "${newValue}"`);
            }
            
            row[col] = newValue;
          }
        });
      });

      // Mettre à jour aussi allRows si la sélection n'est pas appliquée
      if (!this.selectionApplied) {
        this.allRows.forEach((row, rowIndex) => {
          this.formatSelections['removeSeparators'].forEach(col => {
            if (row[col] && typeof row[col] === 'string') {
              row[col] = row[col].replace(/,/g, '');
            }
          });
        });
      }

      console.log(`📊 RÉSUMÉ: ${totalCells} cellules vérifiées, ${processedCells} cellules modifiées`);
      this.showSuccess('format', `Séparateurs supprimés avec succès (${processedCells} modifications)`);
      
      // Forcer la mise à jour de l'affichage
      this.updateDisplayedRowsForPage();
      this.cd.detectChanges();
    } catch (error) {
      console.error('❌ Erreur lors de la suppression des séparateurs:', error);
      this.showError('format', 'Erreur lors de la suppression des séparateurs.');
    }
  }

  applyDotToCommaFormatting() {
    if (!this.formatSelections['dotToComma'].length) {
      this.showError('format', 'Veuillez sélectionner au moins une colonne');
      return;
    }

    try {
      let processedCells = 0;
      let totalCells = 0;
      
      // Traiter les données affichées (combinedRows)
      this.combinedRows.forEach((row, rowIndex) => {
        this.formatSelections['dotToComma'].forEach(col => {
          totalCells++;
          if (row[col] && typeof row[col] === 'string') {
            const originalValue = row[col];
            const newValue = row[col].replace(/\./g, ',');
            
            if (newValue !== originalValue) {
              processedCells++;
              console.log(`✅ MODIFICATION: Ligne ${rowIndex}, Colonne ${col}: "${originalValue}" -> "${newValue}"`);
            }
            
            row[col] = newValue;
          }
        });
      });

      // Mettre à jour aussi allRows si la sélection n'est pas appliquée
      if (!this.selectionApplied) {
        this.allRows.forEach((row, rowIndex) => {
          this.formatSelections['dotToComma'].forEach(col => {
            if (row[col] && typeof row[col] === 'string') {
              row[col] = row[col].replace(/\./g, ',');
            }
          });
        });
      }

      console.log(`📊 RÉSUMÉ: ${totalCells} cellules vérifiées, ${processedCells} cellules modifiées`);
      this.showSuccess('format', `Points remplacés par des virgules avec succès (${processedCells} modifications)`);
      
      // Forcer la mise à jour de l'affichage
      this.updateDisplayedRowsForPage();
      this.cd.detectChanges();
    } catch (error) {
      console.error('❌ Erreur lors du remplacement des points:', error);
      this.showError('format', 'Erreur lors du remplacement des points.');
    }
  }

  applyNormalizeDatesFormatting() {
    if (!this.formatSelections['normalizeDates'].length) {
      this.showError('format', 'Veuillez sélectionner au moins une colonne');
      return;
    }

    try {
      let processedCells = 0;
      let totalCells = 0;
      
      // Traiter les données affichées (combinedRows)
      this.combinedRows.forEach((row, rowIndex) => {
        this.formatSelections['normalizeDates'].forEach(col => {
          totalCells++;
          if (row[col]) {
            let val = row[col].toString();
            const originalValue = val;
            
            if (val.endsWith('.0')) {
              val = val.slice(0, -2);
            }
            const d = new Date(val);
            if (!isNaN(d.getTime())) {
              const newValue = this.formatDate(d, this.formatOptions.dateFormat);
              if (newValue !== originalValue) {
                processedCells++;
                console.log(`✅ MODIFICATION: Ligne ${rowIndex}, Colonne ${col}: "${originalValue}" -> "${newValue}"`);
              }
              row[col] = newValue;
            }
          }
        });
      });

      // Mettre à jour aussi allRows si la sélection n'est pas appliquée
      if (!this.selectionApplied) {
        this.allRows.forEach((row, rowIndex) => {
          this.formatSelections['normalizeDates'].forEach(col => {
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
          });
        });
      }

      console.log(`📊 RÉSUMÉ: ${totalCells} cellules vérifiées, ${processedCells} cellules modifiées`);
      this.showSuccess('format', `Formatage des dates réussi (${processedCells} modifications)`);
      
      // Forcer la mise à jour de l'affichage
      this.updateDisplayedRowsForPage();
      this.cd.detectChanges();
    } catch (error) {
      console.error('❌ Erreur lors du formatage des dates:', error);
      this.showError('format', 'Erreur lors du formatage des dates.');
    }
  }

  applyNormalizeNumbersFormatting() {
    if (!this.formatSelections['normalizeNumbers'].length) {
      this.showError('format', 'Veuillez sélectionner au moins une colonne');
      return;
    }

    try {
      let processedCells = 0;
      let totalCells = 0;
      
      // Traiter les données affichées (combinedRows)
      this.combinedRows.forEach((row, rowIndex) => {
        this.formatSelections['normalizeNumbers'].forEach(col => {
          totalCells++;
          if (row[col] !== undefined && row[col] !== null) {
            const originalValue = row[col];
            const num = parseFloat(row[col].toString().replace(/\s/g, '').replace(',', '.'));
            const newValue = isNaN(num) ? row[col] : num;
            
            if (newValue !== originalValue) {
              processedCells++;
              console.log(`✅ MODIFICATION: Ligne ${rowIndex}, Colonne ${col}: "${originalValue}" -> "${newValue}"`);
            }
            
            row[col] = newValue;
          }
        });
      });

      // Mettre à jour aussi allRows si la sélection n'est pas appliquée
      if (!this.selectionApplied) {
        this.allRows.forEach((row, rowIndex) => {
          this.formatSelections['normalizeNumbers'].forEach(col => {
            if (row[col] !== undefined && row[col] !== null) {
              const num = parseFloat(row[col].toString().replace(/\s/g, '').replace(',', '.'));
              row[col] = isNaN(num) ? row[col] : num;
            }
          });
        });
      }

      console.log(`📊 RÉSUMÉ: ${totalCells} cellules vérifiées, ${processedCells} cellules modifiées`);
      this.showSuccess('format', `Conversion en nombre réussie (${processedCells} modifications)`);
      
      // Forcer la mise à jour de l'affichage
      this.updateDisplayedRowsForPage();
      this.cd.detectChanges();
    } catch (error) {
      console.error('❌ Erreur lors de la conversion en nombre:', error);
      this.showError('format', 'Erreur lors de la conversion en nombre.');
    }
  }

  applyAbsoluteValueFormatting() {
    if (!this.formatSelections['absoluteValue'].length) {
      this.showError('format', 'Veuillez sélectionner au moins une colonne');
      return;
    }

    try {
      let processedCells = 0;
      let totalCells = 0;
      
      // Traiter les données affichées (combinedRows)
      this.combinedRows.forEach((row, rowIndex) => {
        this.formatSelections['absoluteValue'].forEach(col => {
          totalCells++;
          if (row[col] !== undefined && row[col] !== null && !isNaN(Number(row[col]))) {
            const originalValue = row[col];
            const newValue = Math.abs(Number(row[col]));
            
            if (newValue !== originalValue) {
              processedCells++;
              console.log(`✅ MODIFICATION: Ligne ${rowIndex}, Colonne ${col}: "${originalValue}" -> "${newValue}"`);
            }
            
            row[col] = newValue;
          }
        });
      });

      // Mettre à jour aussi allRows si la sélection n'est pas appliquée
      if (!this.selectionApplied) {
        this.allRows.forEach((row, rowIndex) => {
          this.formatSelections['absoluteValue'].forEach(col => {
            if (row[col] !== undefined && row[col] !== null && !isNaN(Number(row[col]))) {
              row[col] = Math.abs(Number(row[col]));
            }
          });
        });
      }

      console.log(`📊 RÉSUMÉ: ${totalCells} cellules vérifiées, ${processedCells} cellules modifiées`);
      this.showSuccess('format', `Conversion en valeur absolue réussie (${processedCells} modifications)`);
      
      // Forcer la mise à jour de l'affichage
      this.updateDisplayedRowsForPage();
      this.cd.detectChanges();
    } catch (error) {
      console.error('❌ Erreur lors de la conversion en valeur absolue:', error);
      this.showError('format', 'Erreur lors de la conversion en valeur absolue.');
    }
  }

  applyRemoveCharactersFormatting() {
    if (!this.formatSelections['removeCharacters'].length) {
      this.showError('format', 'Veuillez sélectionner au moins une colonne');
      return;
    }

    try {
      let processedCells = 0;
      let totalCells = 0;
      
      // Traiter les données affichées (combinedRows)
      this.combinedRows.forEach((row, rowIndex) => {
        this.formatSelections['removeCharacters'].forEach(col => {
          totalCells++;
          if (row[col] && typeof row[col] === 'string') {
            let value = row[col];
            const originalValue = value;
            
            switch (this.removeCharPosition) {
              case 'start':
                value = value.substring(this.removeCharCount);
                break;
              case 'end':
                value = value.substring(0, value.length - this.removeCharCount);
                break;
              case 'specific':
                const pos = this.removeCharSpecificPosition - 1; // Convert to 0-based
                if (pos >= 0 && pos < value.length) {
                  value = value.substring(0, pos) + value.substring(pos + this.removeCharCount);
                }
                break;
            }
            
            if (value !== originalValue) {
              processedCells++;
              console.log(`✅ MODIFICATION: Ligne ${rowIndex}, Colonne ${col}: "${originalValue}" -> "${value}"`);
            }
            
            row[col] = value;
          }
        });
      });

      // Mettre à jour aussi allRows si la sélection n'est pas appliquée
      if (!this.selectionApplied) {
        this.allRows.forEach((row, rowIndex) => {
          this.formatSelections['removeCharacters'].forEach(col => {
            if (row[col] && typeof row[col] === 'string') {
              let value = row[col];
              
              switch (this.removeCharPosition) {
                case 'start':
                  value = value.substring(this.removeCharCount);
                  break;
                case 'end':
                  value = value.substring(0, value.length - this.removeCharCount);
                  break;
                case 'specific':
                  const pos = this.removeCharSpecificPosition - 1; // Convert to 0-based
                  if (pos >= 0 && pos < value.length) {
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

  applyRemoveSpecificCharactersFormatting() {
    console.log('=== DÉBUT applyRemoveSpecificCharactersFormatting ===');
    console.log('Colonnes sélectionnées:', this.formatSelections['removeSpecificCharacters']);
    console.log('Chaîne à supprimer:', this.specificCharactersToRemove);
    console.log('Sensible à la casse:', this.removeSpecificCharactersCaseSensitive);
    console.log('Filtrage par valeur exacte:', this.filterByExactValue);
    console.log('Valeur exacte à filtrer:', this.exactValueToFilter);
    console.log('Colonne pour filtrage exact:', this.exactValueColumn);
    console.log('Nombre de lignes dans combinedRows:', this.combinedRows.length);
    
    if (!this.formatSelections['removeSpecificCharacters'].length) {
      console.log('❌ Aucune colonne sélectionnée');
      this.showError('format', 'Veuillez sélectionner au moins une colonne');
      return;
    }

    if (!this.specificCharactersToRemove.trim()) {
      console.log('❌ Aucune chaîne spécifiée');
      this.showError('format', 'Veuillez spécifier la chaîne à supprimer');
      return;
    }

    // Validation du filtrage par valeur exacte
    if (this.filterByExactValue) {
      if (!this.exactValueToFilter.trim()) {
        console.log('❌ Valeur exacte non spécifiée');
        this.showError('format', 'Veuillez spécifier la valeur exacte à filtrer');
        return;
      }
      if (!this.exactValueColumn) {
        console.log('❌ Colonne pour filtrage non sélectionnée');
        this.showError('format', 'Veuillez sélectionner une colonne pour le filtrage par valeur exacte');
        return;
      }
    }

    try {
      const stringToRemove = this.specificCharactersToRemove.trim();
      console.log('Chaîne à supprimer (final):', stringToRemove);
      console.log('Longueur de la chaîne:', stringToRemove.length);
      
      let processedRows = 0;
      let processedCells = 0;
      let totalCells = 0;
      let filteredRows = 0;
      
      // Traiter les données affichées (combinedRows)
      this.combinedRows.forEach((row, rowIndex) => {
        // Vérifier si la ligne doit être traitée (filtrage par valeur exacte)
        let shouldProcessRow = true;
        
        if (this.filterByExactValue && this.exactValueColumn && this.exactValueToFilter.trim()) {
          const columnValue = row[this.exactValueColumn];
          const exactValue = this.exactValueToFilter.trim();
          
          // Comparaison exacte (avec ou sans sensibilité à la casse)
          if (this.removeSpecificCharactersCaseSensitive) {
            shouldProcessRow = columnValue === exactValue;
          } else {
            shouldProcessRow = columnValue && columnValue.toString().toLowerCase() === exactValue.toLowerCase();
          }
          
          if (shouldProcessRow) {
            filteredRows++;
            console.log(`✅ LIGNE FILTRÉE: Ligne ${rowIndex}, colonne "${this.exactValueColumn}" = "${columnValue}" correspond à "${exactValue}"`);
          } else {
            console.log(`❌ LIGNE IGNORÉE: Ligne ${rowIndex}, colonne "${this.exactValueColumn}" = "${columnValue}" ne correspond pas à "${exactValue}"`);
          }
        }
        
        if (shouldProcessRow) {
          this.formatSelections['removeSpecificCharacters'].forEach(col => {
            totalCells++;
            console.log(`Vérification ligne ${rowIndex}, colonne ${col}:`, row[col]);
            
            if (row[col] && typeof row[col] === 'string') {
              let value = row[col];
              const originalValue = value;
              console.log(`Traitement de "${originalValue}"`);
              
              if (this.removeSpecificCharactersCaseSensitive) {
                // Suppression sensible à la casse - traiter la chaîne complète
                console.log(`Suppression de la chaîne "${stringToRemove}" de "${value}"`);
                value = value.split(stringToRemove).join('');
                console.log(`Résultat après suppression: "${value}"`);
              } else {
                // Suppression insensible à la casse - traiter la chaîne complète
                const regex = new RegExp(stringToRemove.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                console.log(`Suppression de la chaîne "${stringToRemove}" (regex: ${regex}) de "${value}"`);
                value = value.replace(regex, '');
                console.log(`Résultat après suppression: "${value}"`);
              }
              
              if (value !== originalValue) {
                processedCells++;
                console.log(`✅ MODIFICATION: Ligne ${rowIndex}, Colonne ${col}: "${originalValue}" -> "${value}"`);
              } else {
                console.log(`❌ AUCUNE MODIFICATION: Ligne ${rowIndex}, Colonne ${col}: "${originalValue}" (inchangé)`);
              }
              
              row[col] = value;
            } else {
              console.log(`❌ Valeur non traitée: ligne ${rowIndex}, colonne ${col}:`, row[col], `(type: ${typeof row[col]})`);
            }
          });
          processedRows++;
        }
      });

      // Mettre à jour aussi allRows si la sélection n'est pas appliquée
      if (!this.selectionApplied) {
        this.allRows.forEach((row, rowIndex) => {
          // Vérifier si la ligne doit être traitée (filtrage par valeur exacte)
          let shouldProcessRow = true;
          
          if (this.filterByExactValue && this.exactValueColumn && this.exactValueToFilter.trim()) {
            const columnValue = row[this.exactValueColumn];
            const exactValue = this.exactValueToFilter.trim();
            
            // Comparaison exacte (avec ou sans sensibilité à la casse)
            if (this.removeSpecificCharactersCaseSensitive) {
              shouldProcessRow = columnValue === exactValue;
            } else {
              shouldProcessRow = columnValue && columnValue.toString().toLowerCase() === exactValue.toLowerCase();
            }
          }
          
          if (shouldProcessRow) {
            this.formatSelections['removeSpecificCharacters'].forEach(col => {
              if (row[col] && typeof row[col] === 'string') {
                let value = row[col];
                
                if (this.removeSpecificCharactersCaseSensitive) {
                  // Suppression sensible à la casse - traiter la chaîne complète
                  value = value.split(stringToRemove).join('');
                } else {
                  // Suppression insensible à la casse - traiter la chaîne complète
                  const regex = new RegExp(stringToRemove.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                  value = value.replace(regex, '');
                }
                
                row[col] = value;
              }
            });
          }
        });
      }

      console.log(`📊 RÉSUMÉ: ${processedRows} lignes traitées, ${filteredRows} lignes filtrées, ${totalCells} cellules vérifiées, ${processedCells} cellules modifiées`);

      let successMessage = `Suppression de chaîne appliquée sur ${this.formatSelections['removeSpecificCharacters'].length} colonne(s) (${processedCells} modifications)`;
      
      if (this.filterByExactValue && this.exactValueColumn && this.exactValueToFilter.trim()) {
        successMessage += ` (filtrage sur "${this.exactValueColumn}" = "${this.exactValueToFilter}" : ${filteredRows} ligne(s) traitée(s))`;
      }
      
      this.showSuccess('format', successMessage);
      
      // Forcer la mise à jour de l'affichage
      this.updateDisplayedRowsForPage();
      this.cd.detectChanges();
    } catch (error) {
      console.error('❌ Erreur lors de la suppression:', error);
      this.showError('format', 'Erreur lors de la suppression de chaîne spécifique');
    }
    
    console.log('=== FIN applyRemoveSpecificCharactersFormatting ===');
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
    // Sauvegarder l'état à chaque changement de page, de fichier, ou de colonne
    const save = () => {
      const data = {
        selectedFiles: this.selectedFiles,
        combinedRows: this.combinedRows,
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
        allRows: this.allRows,
        allColumns: this.allColumns,
        originalRows: this.originalRows,
        selectionApplied: this.selectionApplied,
        selectedFilterColumn: this.selectedFilterColumn,
        filterValues: this.filterValues,
        selectedFilterValues: this.selectedFilterValues,
        filteredRows: this.filteredRows,
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
        showAllRows: this.showAllRows,
        displayedRows: this.displayedRows
      };
      localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(data));
    };
    // Sauvegarder à chaque changement de page, de fichier, ou de colonne
    setInterval(save, 2000);
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
      removeSpecificCharacters: false
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
                      
                      for (const col of colNames) {
                        if (!this.columns.includes(col)) this.columns.push(col);
                        if (!this.allColumns.includes(col)) this.allColumns.push(col);
                      }
                      
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
              for (const key of Object.keys(firstRow)) {
                if (!this.columns.includes(key)) this.columns.push(key);
                if (!this.allColumns.includes(key)) this.allColumns.push(key);
              }
              
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
} 