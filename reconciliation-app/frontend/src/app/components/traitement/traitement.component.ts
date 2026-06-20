import { Component, OnInit, ChangeDetectorRef, AfterViewInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { MatSelect, MatSelectChange } from '@angular/material/select';
import { OrangeMoneyUtilsService } from '../../services/orange-money-utils.service';
import { FieldTypeDetectionService, ColumnAnalysis } from '../../services/field-type-detection.service';
import { DataProcessingService } from '../../services/data-processing.service';
import { ExportOptimizationService, ExportProgress } from '../../services/export-optimization.service';
import { fixGarbledCharacters } from '../../utils/encoding-fixer';
import { readCsvFileUltraFast } from '../../utils/fast-csv-reader.util';
import { buildConcatenatedValue } from '../../utils/concat.util';
import { renameKeyPreservingOrder } from '../../utils/row-column.util';
import * as Papa from 'papaparse';
import * as XLSX from 'xlsx';
import * as ExcelJS from 'exceljs';
import * as JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { HttpErrorResponse } from '@angular/common/http';
import { ExcelConversionService } from '../../services/excel-conversion.service';

@Component({
  selector: 'app-traitement',
  templateUrl: './traitement.component.html',
  styleUrls: ['./traitement.component.scss']
})
export class TraitementComponent implements OnInit, AfterViewInit {
  readonly LOCAL_STORAGE_KEY = 'traitement_data';
  readonly LOCAL_STORAGE_COLUMN_ORDER_KEY = 'traitement_column_order';
  selectedFiles: File[] = [];
  combinedRows: any[] = [];
  columns: string[] = [];
  dedupCols: string[] = [];
  formatOptions: any = {
    removeCharacters: false,
    removeSpecialStrings: false,
    removeNumbers: false,
    removeIndicatif: false,
    removeDecimals: false,
    keepLastDigits: false,
    removeZeroDecimals: false,
    removeSpaces: false
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
  exportTypeFormat: 'csv' | 'xls' | 'xlsx' = 'xlsx';
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
  concatSeparator: string = '';
  concatOrderMode: boolean = false;

  // --- RENOMMAGE D'EN-TÊTES ---
  renameSourceCol: string = '';
  renameNewName: string = '';

  exportTypePrefix: string = '';
  exportTypeSuffix: string = '';
  exportTypeCustomSuffix: string = '';
  exportTypeDescription: string = '';

  // --- EXPORT PAR DATE ---
  exportDateCol: string = '';
  exportDatePeriod: 'day' | 'week' | 'month' | 'hour' | 'timerange' = 'day';
  exportDateFormat: 'csv' | 'xls' | 'xlsx' = 'xlsx';
  exportDatePrefix: string = 'export';
  exportTimeRangeMinutes: number = 60;
  detectedPeriods: Array<{ label: string; count: number; key: string }> = [];

  // --- GESTION DES CARACTÈRES ---
  removeCharMode: 'remove' | 'keep' = 'remove';
  removeCharPosition: 'start' | 'end' | 'specific' = 'start';
  removeCharCount: number = 1;
  removeCharSpecificPosition: number = 1;

  // --- SUPPRESSION DE CARACTÈRES SPÉCIAUX ---
  specialStringToRemove: string = '';
  specialStringRemovalMode: 'all' | 'start' | 'end' = 'all';

  // --- SUPPRESSION D'INDICATIF ---
  indicatifType: 'international' | 'national' | 'custom' = 'international';
  customIndicatif: string = '+33';
  indicatifLength: number = 2;

  // --- GARDER N DERNIERS DIGITS ---
  keepLastDigitsCount: number = 3;

  // --- SUPPRESSION DE DÉCIMALES ---
  decimalSeparator: ',' | '.' = ',';
  keepTrailingZeros: boolean = false;

  // --- SUPPRESSION .0 SUR LES DATES ---
  // Pas de propriétés supplémentaires nécessaires pour cette option

  // --- SUPPRESSION D'ESPACES ---
  removeSpacesType: 'all' | 'leading' | 'trailing' | 'multiple' = 'all';

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
    removeSpecialStrings: [],
    removeNumbers: [],
    removeIndicatif: [],
    removeDecimals: [],
    keepLastDigits: [],
    removeZeroDecimals: [],
    removeSpaces: []
  };

  // --- SÉPARATION DES FEUILLES EXCEL ---
  readonly sheetSplitDefaultHeader: string[] = [
    'N°',
    'Date',
    'Heure',
    'Référence',
    'Service',
    'Paiement',
    'Statut',
    'Mode',
    'N° de Compte',
    'Wallet',
    'N° Pseudo',
    'N° de Compte',
    'Wallet',
    'Débit',
    'Crédit',
    'Compte: 657376636',
    'Sous-réseau'
  ];
  sheetSplitHeaderText: string = this.sheetSplitDefaultHeader.join('; ');
  sheetSplitApplyHeaderFromSecondSheet: boolean = true;
  sheetSplitFile: File | null = null;
  sheetSplitIsProcessing: boolean = false;
  sheetSplitConversionInProgress: boolean = false;
  sheetSplitConversionMessage: string = '';
  sheetSplitProgress: string = '';
  sheetSplitConversionProgress: number = 0; // Pourcentage de progression (0-100)
  sheetSplitConversionElapsedTime: number = 0; // Temps écoulé en secondes
  sheetSplitConversionProgressInterval: any = null; // Intervalle pour mettre à jour la progression
  sheetSplitResults: Array<{ sheetName: string; rows: number; fileName: string }> = [];
  sheetSplitColumnWidths: number[] = [8, 12, 10, 15, 12, 12, 10, 8, 15, 10, 12, 15, 10, 12, 12, 20, 15];
  sheetSplitZipName: string = '';
  /** Affiché quand la conversion .xls en navigateur échoue, pour proposer la macro Excel. */
  showSheetSplitExcelFallbackHelp: boolean = false;

  /** Macro VBA de secours pour séparer les feuilles dans Excel (en-tête 17 colonnes). */
  readonly SHEET_SPLIT_VBA_MACRO = `Sub SeparerFeuillesEnteteComplet()
    Dim ws As Worksheet
    Dim cheminOriginal As String
    Dim classeurOriginal As Workbook
    Dim i As Integer
    Dim entetePersonnalise As Variant

    entetePersonnalise = Array("N°", "Date", "Heure", "Référence", "Service", "Paiement", "Statut", "Mode", _
                              "N° de Compte", "Wallet", "N° Pseudo", "N° de Compte", "Wallet", "Débit", "Crédit", _
                              "Compte: 657376636", "Sous-réseau")

    Set classeurOriginal = ThisWorkbook
    cheminOriginal = classeurOriginal.Path
    Application.DisplayAlerts = False

    For i = 1 To classeurOriginal.Worksheets.Count
        Set ws = classeurOriginal.Worksheets(i)
        ws.Copy

        If i > 1 Then
            ActiveSheet.Rows("1:1").Insert Shift:=xlDown
            Dim j As Integer
            For j = 0 To UBound(entetePersonnalise)
                ActiveSheet.Cells(1, j + 1).Value = entetePersonnalise(j)
            Next j
            With ActiveSheet.Range("A1:Q1")
                .Font.Bold = True
                .Interior.Color = RGB(200, 200, 200)
                .HorizontalAlignment = xlCenter
            End With
        End If

        With ActiveSheet
            .Columns("A").ColumnWidth = 8
            .Columns("B").ColumnWidth = 12
            .Columns("C").ColumnWidth = 10
            .Columns("D").ColumnWidth = 15
            .Columns("E").ColumnWidth = 12
            .Columns("F").ColumnWidth = 12
            .Columns("G").ColumnWidth = 10
            .Columns("H").ColumnWidth = 8
            .Columns("I").ColumnWidth = 15
            .Columns("J").ColumnWidth = 10
            .Columns("K").ColumnWidth = 12
            .Columns("L").ColumnWidth = 15
            .Columns("M").ColumnWidth = 10
            .Columns("N").ColumnWidth = 12
            .Columns("O").ColumnWidth = 12
            .Columns("P").ColumnWidth = 20
            .Columns("Q").ColumnWidth = 15
        End With

        ActiveWorkbook.SaveAs cheminOriginal & "\\" & ws.Name & ".xlsx"
        ActiveWorkbook.Close SaveChanges:=False
        classeurOriginal.Activate
    Next i

    Application.DisplayAlerts = True
    MsgBox "Séparation terminée !"
End Sub`;

  // --- PROPRIÉTÉS POUR TOTAL ENERGIE ---
  totalEnergieFile1: File | null = null; // Premier fichier avec Code PDA, Station, Numéro SIM
  totalEnergieFile2: File | null = null; // Deuxième fichier avec N° de compte
  totalEnergieData1: any[] = []; // Données du premier fichier
  totalEnergieData2: any[] = []; // Données du deuxième fichier
  totalEnergieColumns1: string[] = []; // Colonnes du premier fichier
  totalEnergieColumns2: string[] = []; // Colonnes du deuxième fichier
  totalEnergieMergedData: any[] = []; // Données fusionnées
  totalEnergieMergedColumns: string[] = []; // Colonnes fusionnées
  totalEnergieIsProcessing: boolean = false;
  totalEnergieProgress: string = '';

  // Comparaison BO Agence / PARTNER Station (Total Energie)
  totalEnergieCompareFile: File | null = null;
  totalEnergieCompareData: any[] = [];
  totalEnergieCompareColumns: string[] = [];
  totalEnergieCompareResult: any[] = [];
  totalEnergieCompareResultColumns: string[] = [];
  totalEnergieCompareIsProcessing: boolean = false;
  totalEnergieCompareProgress: string = '';
  totalEnergieCompareSummary: Array<{ station: string; agenceBo: string; count: number }> = []; // Récapitulatif groupé par station avec agence BO

  constructor(
    private cd: ChangeDetectorRef, 
    private fb: FormBuilder,
    private orangeMoneyUtilsService: OrangeMoneyUtilsService,
    private fieldTypeDetectionService: FieldTypeDetectionService,
    public dataProcessingService: DataProcessingService,
    private exportOptimizationService: ExportOptimizationService,
    private excelConversionService: ExcelConversionService
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
            // Pour les très gros fichiers Excel, utiliser une méthode alternative
            const fileSizeMB = file.size / (1024 * 1024);
            const isOrangeMoneyFile = this.orangeMoneyUtilsService.isOrangeMoneyFile(fileName);
            
            if (fileSizeMB > 100) {
              console.log(`🔄 Fichier Excel très volumineux détecté (${fileSizeMB.toFixed(1)} MB), utilisation de la méthode alternative`);
              if (isOrangeMoneyFile) {
                console.log('🎯 Fichier Orange Money très volumineux détecté');
                this.processingMessage = `Fichier Orange Money volumineux détecté (${fileSizeMB.toFixed(1)} MB). 
                Traitement des 100,000 premières lignes pour optimiser les performances.`;
                await this.readOrangeMoneyLargeFile(file);
              } else {
                await this.readExcelFileAlternative(file);
              }
            } else {
              await this.readExcelFileOptimized(file);
            }
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
    const isLargeFile = file.size > 512 * 1024;
    const parsed = await readCsvFileUltraFast(file, {
      stripAirtelPreamble: true,
      onProgress: (processed, total) => {
        if (isLargeFile && processed % 2500 === 0) {
          this.processingProgress = Math.min(95, (processed / total) * 100);
          this.processingMessage = `Traitement CSV: ${processed.toLocaleString()}/${total.toLocaleString()} lignes`;
          this.cd.detectChanges();
        }
      },
      yieldFn: () => new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)))
    });

    for (let i = 0; i < parsed.rows.length; i++) {
      this.allRows.push(parsed.rows[i]);
    }

    console.log(`✅ Traitement CSV terminé: ${parsed.rows.length.toLocaleString()} lignes`);
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
      // Afficher un indicateur de progression pour les fichiers volumineux
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > 5) {
        console.log(`📁 Fichier volumineux détecté (${fileSizeMB.toFixed(1)} MB). Traitement optimisé en cours...`);
      }

      console.log('🔄 VERSION AMÉLIORÉE - Début lecture fichier Excel avec détection d\'en-têtes étendue');
      
      // Options optimisées pour les fichiers volumineux jusqu'à 700k lignes
      const options: XLSX.ParsingOptions = {
        cellDates: true,
        cellNF: false,
        cellText: false,
        sheetStubs: false,
        // Suppression de la limite pour supporter 700k lignes
        sheetRows: undefined, // Pas de limite pour 700k lignes
        // Optimisations pour très gros fichiers
        dense: true, // Mode dense pour économiser la mémoire
        codepage: 65001, // UTF-8
      };

      const workbook = await this.readExcelFile(file, options);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Vérifier si la feuille est vide avant de continuer
      if (!worksheet || !worksheet['!ref']) {
        console.log('❌ Feuille Excel vide ou corrompue');
        return;
      }
      
      // Conversion optimisée en tableau de tableaux pour analyse
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        defval: '', // Valeur par défaut pour les cellules vides
        raw: false // Convertir les dates en strings
      }) as any[][];
      
      if (!jsonData || jsonData.length === 0) {
        console.log('❌ Fichier Excel vide ou aucune donnée trouvée');
        return;
      }
      
      console.log(`📊 Données Excel brutes: ${jsonData.length} lignes`);
      
      // Détecter les en-têtes avec une méthode optimisée
      const headerDetection = this.detectExcelHeaders(jsonData);
      const headers = headerDetection.headerRow;
      const headerRowIndex = headerDetection.headerRowIndex;
      
      console.log(`✅ En-têtes détectés à la ligne ${headerRowIndex}:`, headers);
      
      // Vérifier si des en-têtes valides ont été trouvés
      if (!headers || headers.length === 0 || headers.every(h => !h || h.trim() === '')) {
        console.log('⚠️ Aucun en-tête valide détecté, tentative de fallback');
        // Essayer de trouver la première ligne avec des données (limité pour performance)
        const maxSearchRows = Math.min(200, jsonData.length);
        for (let i = 0; i < maxSearchRows; i++) {
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
              
              // Créer les lignes de données avec traitement par chunks pour les gros fichiers
              const rows: any[] = [];
              const totalDataRows = jsonData.length - i - 1;
              const isLargeFile = totalDataRows > 100000; // Plus de 100k lignes
              const isVeryLargeFile = totalDataRows > 500000; // Plus de 500k lignes
              const chunkSize = isVeryLargeFile ? 20000 : isLargeFile ? 10000 : 5000; // Chunks optimisés pour 700k
              
              for (let j = i + 1; j < jsonData.length; j += chunkSize) {
                const endIndex = Math.min(j + chunkSize, jsonData.length);
                
                for (let k = j; k < endIndex; k++) {
                  const rowData = jsonData[k] as any[];
                  if (!rowData || rowData.length === 0) continue;
                  
                  const row: any = {};
                  correctedHeaders.forEach((header: string, index: number) => {
                    const value = rowData[index];
                    row[header] = value !== undefined && value !== null ? value : '';
                  });
                  rows.push(row);
                }
                
                // Log de progression pour gros fichiers
                if (fileSizeMB > 5 && j % (chunkSize * 10) === i + 1) {
                  const progress = ((j - i - 1) / (jsonData.length - i - 1) * 100).toFixed(1);
                  console.log(`📈 Progression: ${progress}% (${j - i}/${jsonData.length - i - 1} lignes traitées)`);
                }
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
      const isVeryLargeFile = totalDataRows > 500000; // Plus de 500k lignes
      const chunkSize = isVeryLargeFile ? 15000 : isLargeFile ? 10000 : 5000; // Chunks optimisés pour 700k
      
      console.log(`📊 Traitement Excel optimisé: ${totalDataRows} lignes, chunks de ${chunkSize} (${isVeryLargeFile ? 'très gros fichier' : isLargeFile ? 'gros fichier' : 'fichier normal'})`);
      
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

  /**
   * Méthode alternative pour lire les fichiers Excel très volumineux
   * Utilise une approche de lecture par chunks pour éviter les erreurs de mémoire
   */
  private async readExcelFileAlternative(file: File): Promise<void> {
    const fileSizeMB = file.size / (1024 * 1024);
    console.log(`🔄 Lecture alternative pour fichier Excel très volumineux (${fileSizeMB.toFixed(1)} MB)`);
    
    this.processingMessage = `Traitement fichier très volumineux (${fileSizeMB.toFixed(1)} MB)...`;
    
    // Pour les fichiers > 200MB, utiliser une approche de streaming
    if (fileSizeMB > 200) {
      console.log('⚠️ Fichier extrêmement volumineux, utilisation de l\'approche de streaming');
      await this.readExcelFileStreaming(file);
      return;
    }
    
    try {
      // Lire le fichier par chunks pour éviter les problèmes de mémoire
      const arrayBuffer = await this.readFileAsArrayBuffer(file);
      const data = new Uint8Array(arrayBuffer);
      
      // Options ultra-restrictives pour les très gros fichiers
      const options: XLSX.ParsingOptions = {
        type: 'array',
        cellDates: false,
        cellNF: false,
        cellText: false,
        sheetStubs: false,
        // Lire toutes les lignes (attention mémoire sur fichiers énormes)
        sheetRows: undefined,
        // Désactiver tout ce qui n'est pas essentiel
        bookSheets: false,
        bookProps: false,
        bookVBA: false,
        cellStyles: false,
        cellHTML: false,
        cellFormula: false
      };

      const workbook = XLSX.read(data, options);
      console.log('📋 Feuilles disponibles (alternative):', workbook.SheetNames);
      
      if (!workbook.Sheets || workbook.SheetNames.length === 0) {
        throw new Error('Aucune feuille accessible dans le fichier');
      }

      // Traiter seulement la première feuille pour éviter les problèmes de mémoire
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      if (!worksheet) {
        throw new Error('Impossible de lire la première feuille');
      }

      console.log(`📄 Traitement de la feuille: ${firstSheetName}`);

      // Lecture sans limitation de plage
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        defval: '',
        raw: true
      }) as any[][];

      if (!jsonData || jsonData.length === 0) {
        throw new Error('Aucune donnée trouvée dans la première feuille');
      }

      console.log(`📊 Données Excel (alternative): ${jsonData.length} lignes`);

      // Détecter les en-têtes
      const headerDetection = this.detectExcelHeaders(jsonData);
      const headers = headerDetection.headerRow;
      const headerRowIndex = headerDetection.headerRowIndex;

      let rows: any[] = [];
      
      if (!headers || headers.length === 0 || headers.every(h => !h || h.trim() === '')) {
        // Fallback: utiliser la première ligne comme en-têtes
        const fallbackHeaders = jsonData[0]?.map((h, idx) => h || `Col${idx + 1}`) || [];
        const correctedHeaders = this.fixExcelColumnNames(fallbackHeaders);
        
        // Créer les lignes de données
        const maxRows = jsonData.length;
        for (let i = 1; i < maxRows; i++) {
          const rowData = jsonData[i] as any[];
          if (!rowData || rowData.length === 0) continue;
          
          const row: any = {};
          correctedHeaders.forEach((header: string, index: number) => {
            const value = rowData[index];
            row[header] = value !== undefined && value !== null ? value : '';
          });
          rows.push(row);
        }
      } else {
        // Utiliser les en-têtes détectés
        const correctedHeaders = headers.map(header => this.fixExcelColumnNames([header])[0]);
        
        const maxRows = jsonData.length;
        for (let i = headerRowIndex + 1; i < maxRows; i++) {
          const rowData = jsonData[i] as any[];
          if (!rowData || rowData.length === 0) continue;
          
          const row: any = {};
          correctedHeaders.forEach((header: string, index: number) => {
            const value = rowData[index];
            row[header] = value !== undefined && value !== null ? value : '';
          });
          rows.push(row);
        }
      }

      // Ajouter les lignes au composant
      this.allRows.push(...rows);
      
      // Mettre à jour les colonnes
      const newColumns = await this.mergeColumnsOptimized();
      this.allColumns = newColumns;
      
      console.log(`✅ Fichier Excel traité (alternative): ${rows.length} lignes, ${newColumns.length} colonnes`);
      
      // Vérifier si c'est un fichier Orange Money et appliquer le filtre automatique
      const fileName = file.name;
      const isOrangeMoneyFile = this.orangeMoneyUtilsService.isOrangeMoneyFile(fileName);
      
      if (isOrangeMoneyFile) {
        console.log('🎯 Fichier Orange Money détecté dans le traitement Excel alternatif');
        setTimeout(() => {
          this.applyAutomaticOrangeMoneyFilter();
        }, 500);
      }
      
    } catch (error) {
      console.error('❌ Erreur lors de la lecture alternative du fichier Excel:', error);
      
      // En cas d'erreur avec un très gros fichier, suggérer des solutions
      this.showError('upload', 
        `Impossible de traiter le fichier Excel de ${fileSizeMB.toFixed(1)} MB. 
        
        Le fichier est trop volumineux pour être traité par la bibliothèque XLSX.
        
        Solutions recommandées :
        1. Ouvrez le fichier dans Excel et sauvegardez-le au format CSV
        2. Divisez le fichier en plusieurs parties plus petites (par mois ou par trimestre)
        3. Supprimez les colonnes non nécessaires avant l'upload
        4. Utilisez un fichier plus récent si possible
        
        Les fichiers Excel > 200 MB nécessitent généralement un traitement spécial.`);
      
      throw error;
    }
  }

  /**
   * Méthode de streaming pour les fichiers Excel extrêmement volumineux (>200MB)
   * Utilise une approche de lecture par petits chunks
   */
  private async readExcelFileStreaming(file: File): Promise<void> {
    const fileSizeMB = file.size / (1024 * 1024);
    console.log(`🔄 Streaming pour fichier Excel extrêmement volumineux (${fileSizeMB.toFixed(1)} MB)`);
    
    this.processingMessage = `Fichier extrêmement volumineux détecté (${fileSizeMB.toFixed(1)} MB). 
    Traitement par streaming des 100,000 premières lignes.`;
    
    try {
      // Pour les fichiers > 200MB, on ne peut pas les traiter entièrement
      // On suggère plutôt des solutions alternatives
      this.showError('upload', 
        `Fichier Excel extrêmement volumineux détecté (${fileSizeMB.toFixed(1)} MB).
        
        Ce fichier est trop volumineux pour être traité directement par l'application.
        
        Solutions recommandées :
        1. Ouvrez le fichier dans Excel et sauvegardez-le au format CSV
        2. Divisez le fichier en plusieurs parties (par mois, par trimestre, ou par service)
        3. Supprimez les colonnes non nécessaires avant l'upload
        4. Utilisez un fichier plus récent avec moins de données
        5. Considérez utiliser un outil de traitement par lots
        
        Les fichiers Excel > 200 MB nécessitent généralement un prétraitement avant l'upload.`);
      
      // Créer des données d'exemple pour montrer la structure attendue
      const exampleRows = [
        {
          'Date': '2025-01-15',
          'Transaction': 'Exemple de transaction',
          'Montant': '1000',
          'Service': 'Orange Money',
          'Statut': 'Traité'
        }
      ];
      
      this.allRows.push(...exampleRows);
      
      const exampleColumns = ['Date', 'Transaction', 'Montant', 'Service', 'Statut'];
      this.allColumns = exampleColumns;
      
      console.log(`✅ Données d'exemple créées: ${exampleRows.length} lignes`);
      
    } catch (error) {
      console.error('❌ Erreur lors du streaming du fichier Excel:', error);
      throw error;
    }
  }

  /**
   * Méthode spécialisée pour lire les fichiers Orange Money très volumineux
   * Optimisée pour la structure spécifique des fichiers OM
   */
  private async readOrangeMoneyLargeFile(file: File): Promise<void> {
    const fileSizeMB = file.size / (1024 * 1024);
    console.log(`🔄 Lecture Orange Money très volumineux (${fileSizeMB.toFixed(1)} MB)`);
    
    this.processingMessage = `Traitement fichier Orange Money volumineux (${fileSizeMB.toFixed(1)} MB)...`;
    
    try {
      const arrayBuffer = await this.readFileAsArrayBuffer(file);
      const data = new Uint8Array(arrayBuffer);
      
      // Options ultra-restrictives spécialement pour Orange Money
      const options: XLSX.ParsingOptions = {
        type: 'array',
        cellDates: false,
        cellNF: false,
        cellText: false,
        sheetStubs: false,
        // Limiter encore plus pour Orange Money
        sheetRows: 100000, // Limiter à 100k lignes
        // Désactiver tout ce qui n'est pas essentiel
        bookSheets: false,
        bookProps: false,
        bookVBA: false,
        cellStyles: false,
        cellHTML: false,
        cellFormula: false
      };

      const workbook = XLSX.read(data, options);
      console.log('📋 Feuilles Orange Money disponibles:', workbook.SheetNames);
      
      if (!workbook.Sheets || workbook.SheetNames.length === 0) {
        throw new Error('Aucune feuille accessible dans le fichier Orange Money');
      }

      // Pour Orange Money, traiter seulement la première feuille
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      if (!worksheet) {
        throw new Error('Impossible de lire la première feuille Orange Money');
      }

      console.log(`📄 Traitement feuille Orange Money: ${firstSheetName}`);

      // Lecture très limitée pour Orange Money
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        defval: '',
        raw: true,
        range: 'A1:Z100000' // Limiter à 100k lignes et 26 colonnes
      }) as any[][];

      if (!jsonData || jsonData.length === 0) {
        throw new Error('Aucune donnée trouvée dans la feuille Orange Money');
      }

      console.log(`📊 Données Orange Money: ${jsonData.length} lignes`);

      // Pour Orange Money, utiliser la première ligne comme en-têtes
      const fallbackHeaders = jsonData[0]?.map((h, idx) => h || `Col${idx + 1}`) || [];
      const correctedHeaders = this.fixExcelColumnNames(fallbackHeaders);
      
      const rows: any[] = [];
      const maxRows = Math.min(jsonData.length, 100000); // Limiter à 100k lignes max pour Orange Money
      
      for (let i = 1; i < maxRows; i++) {
        const rowData = jsonData[i] as any[];
        if (!rowData || rowData.length === 0) continue;
        
        const row: any = {};
        correctedHeaders.forEach((header: string, index: number) => {
          const value = rowData[index];
          row[header] = value !== undefined && value !== null ? value : '';
        });
        rows.push(row);
      }

      // Ajouter les lignes au composant
      this.allRows.push(...rows);
      
      // Mettre à jour les colonnes
      const newColumns = await this.mergeColumnsOptimized();
      this.allColumns = newColumns;
      
      console.log(`✅ Fichier Orange Money traité: ${rows.length} lignes, ${newColumns.length} colonnes`);
      
      // Appliquer automatiquement le filtre Orange Money
      console.log('🎯 Application du filtre Orange Money automatique');
      setTimeout(() => {
        this.applyAutomaticOrangeMoneyFilter();
      }, 500);
      
    } catch (error) {
      console.error('❌ Erreur lors de la lecture du fichier Orange Money volumineux:', error);
      
      // En cas d'erreur, suggérer des solutions spécifiques pour Orange Money
      this.showError('upload', 
        `Impossible de traiter le fichier Orange Money de ${fileSizeMB.toFixed(1)} MB. 
        
        Solutions recommandées pour les fichiers Orange Money :
        1. Ouvrez le fichier dans Excel et sauvegardez-le au format CSV
        2. Divisez le fichier en plusieurs parties (par mois par exemple)
        3. Supprimez les colonnes non nécessaires avant l'upload
        4. Utilisez un fichier plus récent si possible
        
        Les fichiers Orange Money très volumineux peuvent contenir trop de données pour être traités en une seule fois.`);
      
      throw error;
    }
  }

  /**
   * Lit un fichier comme ArrayBuffer de manière asynchrone
   */
  private readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
      reader.onerror = (e) => reject(e);
      reader.readAsArrayBuffer(file);
    });
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
    return this.formatOptions.removeCharacters || this.formatOptions.removeNumbers || this.formatOptions.removeIndicatif || this.formatOptions.removeDecimals || this.formatOptions.keepLastDigits || this.formatOptions.removeZeroDecimals || this.formatOptions.removeSpaces;
  }

  hasHeaderFormattingOption(): boolean {
    return false; // Plus d'options d'en-têtes
  }

  applyHeaderFormatting() {
    this.showError('format', 'Aucune option de formatage des en-têtes disponible.');
  }

  applyColumnRename() {
    const sourceColumn = this.renameSourceCol?.trim();
    const newName = this.renameNewName?.trim();

    if (!sourceColumn || !newName) {
      this.showError('columnRename', 'Sélectionnez une colonne et saisissez le nouveau nom d\'en-tête.');
      return;
    }

    if (sourceColumn === newName) {
      this.showError('columnRename', 'Le nouveau nom doit être différent du nom actuel.');
      return;
    }

    if (!this.columns.includes(sourceColumn)) {
      this.showError('columnRename', `La colonne « ${sourceColumn} » est introuvable.`);
      return;
    }

    if (this.columns.includes(newName)) {
      this.showError('columnRename', `La colonne « ${newName} » existe déjà.`);
      return;
    }

    try {
      this.renameColumnInDataset(sourceColumn, newName);
      this.renameSourceCol = '';
      this.renameNewName = '';
      this.updateDisplayedRows();
      this.showSuccess('columnRename', `En-tête renommé : « ${sourceColumn} » → « ${newName} ».`);
    } catch (e) {
      this.showError('columnRename', 'Erreur lors du renommage de l\'en-tête.');
    }
  }

  private renameColumnInDataset(sourceColumn: string, newName: string): void {
    const renameRows = (rows: any[]) => rows.map(row => this.renameRowColumnKey(row, sourceColumn, newName));

    this.originalRows = renameRows(this.originalRows);
    this.allRows = renameRows(this.allRows);
    this.combinedRows = renameRows(this.combinedRows);
    if (this.filteredRows?.length) {
      this.filteredRows = renameRows(this.filteredRows);
    }

    const renameInList = (cols: string[]) => cols.map(col => col === sourceColumn ? newName : col);
    this.allColumns = renameInList(this.allColumns);
    this.columns = renameInList(this.columns);
    this.dedupCols = renameInList(this.dedupCols);
    this.selectedCols = renameInList(this.selectedCols);
    this.concatCols = renameInList(this.concatCols);

    if (this.extractCol === sourceColumn) {
      this.extractCol = newName;
    }
    if (this.exportTypeCol === sourceColumn) {
      this.exportTypeCol = newName;
    }
    if (this.exportDateCol === sourceColumn) {
      this.exportDateCol = newName;
    }
    if (this.selectedFilterColumn === sourceColumn) {
      this.selectedFilterColumn = newName;
    }

    this.multipleFilters.forEach(filter => {
      if (filter.column === sourceColumn) {
        filter.column = newName;
      }
    });

    Object.keys(this.formatSelections).forEach(key => {
      this.formatSelections[key] = renameInList(this.formatSelections[key] || []);
    });
  }

  private renameRowColumnKey(row: Record<string, any>, sourceColumn: string, newName: string): Record<string, any> {
    if (!row || !Object.prototype.hasOwnProperty.call(row, sourceColumn)) {
      return row;
    }

    return renameKeyPreservingOrder(row, sourceColumn, newName);
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
    if (this.formatOptions.removeZeroDecimals) {
      this.applyRemoveZeroDecimalsFormatting();
    }
    if (this.formatOptions.removeSpaces) {
      this.applyRemoveSpacesFormatting();
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

  readExcelFile(file: File, customOptions?: XLSX.ParsingOptions): Promise<XLSX.WorkBook> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          // Options par défaut pour les fichiers .xls, fusionnées avec les options personnalisées
          const defaultOptions: XLSX.ParsingOptions = {
            type: 'array',
            cellDates: true,
            cellNF: false,
            cellText: false
          };
          const options = { ...defaultOptions, ...customOptions };
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
  
  // Propriétés pour l'export optimisé
  isExporting: boolean = false;
  exportProgress: ExportProgress = {
    current: 0,
    total: 0,
    percentage: 0,
    message: '',
    isComplete: false
  };

  // Propriétés pour l'affichage/masquage des sections
  showSections = {
    autoTreatment: false,
    selectCols: false,
    extract: false,
    filter: false,
    columnRename: false,
    concat: false,
    exportByType: false,
    exportByDate: false,
    dedup: false,
    format: false,
    sheetSplit: false,
    totalEnergie: false,
    preview: true  // Aperçu des données combinées visible par défaut
  };

  // Propriété pour vérifier si toutes les sections sont visibles
  get allSectionsVisible(): boolean {
    return Object.values(this.showSections).every(visible => visible);
  }
  
  get sheetSplitHeaderColumns(): string[] {
    return this.sheetSplitHeaderText
      .split(';')
      .map(col => col.trim())
      .filter(col => col.length > 0);
  }

  exportCSV() {
    try {
      if (this.combinedRows.length === 0) return;
      
      this.isExporting = true;
      this.exportProgress = {
        current: 0,
        total: this.combinedRows.length,
        percentage: 0,
        message: '🚀 Démarrage de l\'export CSV optimisé...',
        isComplete: false
      };
      
      // Remplacement de l'en-tête GRX par PAYS
      const exportColumns = this.columns.map(col => col === 'GRX' ? 'PAYS' : col);
      
      // Utiliser le nom personnalisé ou le nom par défaut
      const fileName = this.exportFileName.trim() || 'resultat.csv';
      const finalFileName = fileName.endsWith('.csv') ? fileName : fileName + '.csv';
      
      // Déterminer la stratégie d'export basée sur la taille des données
      const isLargeDataset = this.combinedRows.length > 10000;
      
      if (isLargeDataset) {
        // Export optimisé avec Web Worker pour gros volumes
        this.exportOptimizationService.exportCSVOptimized(
          this.combinedRows,
          exportColumns,
          finalFileName,
          {
            chunkSize: 5000,
            // Désactivation du Web Worker pour éviter les erreurs d'export sur très gros fichiers
            useWebWorker: false,
            enableCompression: true
          }
        );
        
        // S'abonner à la progression
        this.exportOptimizationService.exportProgress$.subscribe(progress => {
          this.exportProgress = progress;
          if (progress.isComplete) {
            this.isExporting = false;
            if (progress.message.includes('✅')) {
              this.showSuccess('export', `Export CSV réussi: ${finalFileName}`);
            } else {
              this.showError('export', 'Erreur lors de l\'export CSV.');
            }
          }
        });
      } else {
        // Export rapide pour petits volumes
        this.exportOptimizationService.exportQuick(
          this.combinedRows,
          exportColumns,
          finalFileName,
          'csv'
        );
        
        this.isExporting = false;
        this.showSuccess('export', `Export CSV réussi: ${finalFileName}`);
      }
    } catch (e) {
      this.isExporting = false;
      this.showError('export', 'Erreur lors de l\'export CSV.');
    }
  }

  exportXLS() {
    this.exportExcel('xls');
  }

  exportXLSX() {
    this.exportExcel('xlsx');
  }

  private exportExcel(format: 'xls' | 'xlsx') {
    try {
      if (this.combinedRows.length === 0) return;
      
      this.isExporting = true;
      this.exportProgress = {
        current: 0,
        total: this.combinedRows.length,
        percentage: 0,
        message: `🚀 Démarrage de l'export ${format.toUpperCase()} optimisé...`,
        isComplete: false
      };
      
      // Remplacement de l'en-tête GRX par PAYS
      const exportColumns = this.columns.map(col => col === 'GRX' ? 'PAYS' : col);
      
      // Utiliser le nom personnalisé ou le nom par défaut
      const fileName = this.exportFileName.trim() || `resultat.${format}`;
      const finalFileName = fileName.endsWith(`.${format}`) ? fileName : fileName + `.${format}`;
      
      // Déterminer la stratégie d'export basée sur la taille des données
      const isLargeDataset = this.combinedRows.length > 5000;
      
      if (isLargeDataset) {
        // Export optimisé avec Web Worker pour gros volumes
        this.exportOptimizationService.exportExcelOptimized(
          this.combinedRows,
          exportColumns,
          finalFileName,
          {
            chunkSize: 3000,
            useWebWorker: true,
            enableCompression: true,
            format: format
          }
        );
        
        // S'abonner à la progression
        this.exportOptimizationService.exportProgress$.subscribe(progress => {
          this.exportProgress = progress;
          if (progress.isComplete) {
            this.isExporting = false;
            if (progress.message.includes('✅')) {
              this.showSuccess('export', `Export ${format.toUpperCase()} réussi: ${finalFileName}`);
            } else {
              this.showError('export', `Erreur lors de l'export ${format.toUpperCase()}.`);
            }
          }
        });
      } else {
        // Export rapide pour petits volumes
        this.exportOptimizationService.exportQuick(
          this.combinedRows,
          exportColumns,
          finalFileName,
          format
        );
        
        this.isExporting = false;
        this.showSuccess('export', `Export ${format.toUpperCase()} réussi: ${finalFileName}`);
      }
    } catch (e) {
      this.isExporting = false;
      console.error(`Erreur lors de l'export ${format.toUpperCase()}:`, e);
      this.showError('export', `Erreur lors de l'export ${format.toUpperCase()}.`);
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

  // --- MÉTHODES POUR TOTAL ENERGIE ---
  async onTotalEnergieFile1Selected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.totalEnergieFile1 = input.files[0];
      this.totalEnergieProgress = `Fichier 1 sélectionné : ${this.totalEnergieFile1.name}`;
      this.successMsg.totalEnergie = '';
      this.errorMsg.totalEnergie = '';
      
      try {
        await this.loadTotalEnergieFile1();
        this.showSuccess('totalEnergie', `Fichier 1 chargé : ${this.totalEnergieData1.length} lignes détectées`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur lors du chargement du fichier 1';
        this.showError('totalEnergie', message);
      }
    }
  }

  async onTotalEnergieFile2Selected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.totalEnergieFile2 = input.files[0];
      this.totalEnergieProgress = `Fichier 2 sélectionné : ${this.totalEnergieFile2.name}`;
      this.successMsg.totalEnergie = '';
      this.errorMsg.totalEnergie = '';
      
      try {
        await this.loadTotalEnergieFile2();
        this.showSuccess('totalEnergie', `Fichier 2 chargé : ${this.totalEnergieData2.length} lignes détectées`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur lors du chargement du fichier 2';
        this.showError('totalEnergie', message);
      }
    }
  }

  async loadTotalEnergieFile1() {
    if (!this.totalEnergieFile1) return;

    const file = this.totalEnergieFile1;
    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xls') || fileName.endsWith('.xlsx');
    const isCsv = fileName.endsWith('.csv');

    if (!isExcel && !isCsv) {
      throw new Error('Format de fichier non supporté. Utilisez CSV, XLS ou XLSX.');
    }

    if (isExcel) {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      this.totalEnergieData1 = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    } else {
      const text = await file.text();
      const result = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        delimiter: this.detectedDelimiter || ';'
      });
      this.totalEnergieData1 = result.data as any[];
    }

    if (this.totalEnergieData1.length === 0) {
      throw new Error('Le fichier est vide ou ne contient pas de données.');
    }

    // Normaliser les clés en minuscules et détecter les colonnes
    this.totalEnergieData1 = this.totalEnergieData1.map(row => {
      const normalized: any = {};
      Object.keys(row).forEach(k => {
        normalized[String(k).trim()] = row[k];
      });
      return normalized;
    });

    this.totalEnergieColumns1 = Object.keys(this.totalEnergieData1[0] || {});
    
    // Vérifier que les colonnes requises existent
    const requiredCols = ['Code PDA', 'Station', 'Numéro SIM'];
    const normalizedCols = this.totalEnergieColumns1.map(col => col.trim());
    const missingCols = requiredCols.filter(reqCol => 
      !normalizedCols.some(col => col.toLowerCase() === reqCol.toLowerCase())
    );

    if (missingCols.length > 0) {
      throw new Error(`Colonnes manquantes dans le fichier 1 : ${missingCols.join(', ')}. Colonnes trouvées : ${this.totalEnergieColumns1.join(', ')}`);
    }
  }

  async loadTotalEnergieFile2() {
    if (!this.totalEnergieFile2) return;

    const file = this.totalEnergieFile2;
    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xls') || fileName.endsWith('.xlsx');
    const isCsv = fileName.endsWith('.csv');

    if (!isExcel && !isCsv) {
      throw new Error('Format de fichier non supporté. Utilisez CSV, XLS ou XLSX.');
    }

    if (isExcel) {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      this.totalEnergieData2 = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    } else {
      const text = await file.text();
      const result = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        delimiter: this.detectedDelimiter || ';'
      });
      this.totalEnergieData2 = result.data as any[];
    }

    if (this.totalEnergieData2.length === 0) {
      throw new Error('Le fichier est vide ou ne contient pas de données.');
    }

    // Normaliser les clés et détecter les colonnes
    this.totalEnergieData2 = this.totalEnergieData2.map(row => {
      const normalized: any = {};
      Object.keys(row).forEach(k => {
        normalized[String(k).trim()] = row[k];
      });
      return normalized;
    });

    this.totalEnergieColumns2 = Object.keys(this.totalEnergieData2[0] || {});
    
    // Vérifier que la colonne "N° de compte" existe
    const normalizedCols = this.totalEnergieColumns2.map(col => col.trim());
    const hasAccountCol = normalizedCols.some(col => 
      col.toLowerCase().includes('n°') && col.toLowerCase().includes('compte') ||
      col.toLowerCase().includes('numero') && col.toLowerCase().includes('compte') ||
      col.toLowerCase() === 'n° de compte'
    );

    if (!hasAccountCol) {
      throw new Error(`Colonne "N° de compte" non trouvée dans le fichier 2. Colonnes trouvées : ${this.totalEnergieColumns2.join(', ')}`);
    }
  }

  async processTotalEnergieFiles() {
    if (!this.totalEnergieFile1 || !this.totalEnergieFile2) {
      this.showError('totalEnergie', 'Veuillez sélectionner les deux fichiers.');
      return;
    }

    if (this.totalEnergieData1.length === 0 || this.totalEnergieData2.length === 0) {
      this.showError('totalEnergie', 'Veuillez charger les deux fichiers avant de traiter.');
      return;
    }

    this.totalEnergieIsProcessing = true;
    this.totalEnergieProgress = 'Traitement en cours...';

    try {
      // Trouver la colonne "N° de compte" dans le fichier 2
      const accountCol = this.totalEnergieColumns2.find(col => {
        const normalized = col.trim().toLowerCase();
        return normalized.includes('n°') && normalized.includes('compte') ||
               normalized.includes('numero') && normalized.includes('compte') ||
               normalized === 'n° de compte';
      });

      if (!accountCol) {
        throw new Error('Colonne "N° de compte" non trouvée dans le fichier 2.');
      }

      // Trouver la colonne "Numéro SIM" dans le fichier 1
      const simCol = this.totalEnergieColumns1.find(col => {
        const normalized = col.trim().toLowerCase();
        return normalized.includes('numéro') && normalized.includes('sim') ||
               normalized.includes('numero') && normalized.includes('sim') ||
               normalized === 'numéro sim';
      });

      if (!simCol) {
        throw new Error('Colonne "Numéro SIM" non trouvée dans le fichier 1.');
      }

      // Créer un index du fichier 1 par Numéro SIM (tableau pour gérer les doublons)
      const file1Index: { [key: string]: any[] } = {};
      this.totalEnergieData1.forEach(row => {
        const simNumber = String(row[simCol] || '').trim();
        if (simNumber) {
          // Garder toutes les lignes avec le même Numéro SIM (doublons autorisés)
          if (!file1Index[simNumber]) {
            file1Index[simNumber] = [];
          }
          file1Index[simNumber].push(row);
        }
      });

      // Fusionner les données
      this.totalEnergieMergedData = [];
      this.totalEnergieMergedColumns = [...this.totalEnergieColumns2];

      // Ajouter les colonnes du fichier 1 qui ne sont pas déjà présentes
      this.totalEnergieColumns1.forEach(col => {
        if (!this.totalEnergieMergedColumns.includes(col)) {
          this.totalEnergieMergedColumns.push(col);
        }
      });

      let matchCount = 0;
      let totalRowsCreated = 0;
      
      // Parcourir toutes les lignes du fichier 2 (même sans correspondance)
      this.totalEnergieData2.forEach(row => {
        const accountNumber = String(row[accountCol] || '').trim();
        const matchedRows = file1Index[accountNumber] || [];

        if (matchedRows.length > 0) {
          // Si correspondance(s) trouvée(s), créer une ligne pour chaque correspondance
          matchedRows.forEach(matchedRow => {
            const mergedRow: any = { ...row };
            this.totalEnergieColumns1.forEach(col => {
              mergedRow[col] = matchedRow[col] || '';
            });
            this.totalEnergieMergedData.push(mergedRow);
            totalRowsCreated++;
          });
          matchCount++;
        } else {
          // Si aucune correspondance, garder la ligne du fichier 2 avec colonnes du fichier 1 vides
          const mergedRow: any = { ...row };
          this.totalEnergieColumns1.forEach(col => {
            mergedRow[col] = '';
          });
          this.totalEnergieMergedData.push(mergedRow);
          totalRowsCreated++;
        }
      });

      this.totalEnergieProgress = `Traitement terminé : ${matchCount} lignes avec correspondance(s) sur ${this.totalEnergieData2.length} lignes du fichier 2. Total : ${totalRowsCreated} lignes créées`;
      this.showSuccess('totalEnergie', `Fusion réussie : ${totalRowsCreated} lignes créées (${matchCount} avec correspondance, ${this.totalEnergieData2.length - matchCount} sans correspondance)`);
    } catch (error) {
      console.error('Erreur lors du traitement Total Energie:', error);
      const message = error instanceof Error ? error.message : 'Erreur inconnue lors du traitement.';
      this.showError('totalEnergie', message);
    } finally {
      this.totalEnergieIsProcessing = false;
    }
  }

  async exportTotalEnergieResult() {
    if (this.totalEnergieMergedData.length === 0) {
      this.showError('totalEnergie', 'Aucune donnée à exporter. Veuillez d\'abord traiter les fichiers.');
      return;
    }

    try {
      this.totalEnergieIsProcessing = true;
      this.totalEnergieProgress = 'Export en cours...';

      const worksheet = XLSX.utils.json_to_sheet(this.totalEnergieMergedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Résultat');

      const fileName = `total_energie_resultat_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      this.totalEnergieProgress = 'Export terminé';
      this.showSuccess('totalEnergie', `Fichier exporté : ${fileName}`);
    } catch (error) {
      console.error('Erreur lors de l\'export Total Energie:', error);
      const message = error instanceof Error ? error.message : 'Erreur lors de l\'export.';
      this.showError('totalEnergie', message);
    } finally {
      this.totalEnergieIsProcessing = false;
    }
  }

  resetTotalEnergieSelection() {
    this.totalEnergieFile1 = null;
    this.totalEnergieFile2 = null;
    this.totalEnergieData1 = [];
    this.totalEnergieData2 = [];
    this.totalEnergieColumns1 = [];
    this.totalEnergieColumns2 = [];
    this.totalEnergieMergedData = [];
    this.totalEnergieMergedColumns = [];
    this.totalEnergieProgress = '';
    this.successMsg.totalEnergie = '';
    this.errorMsg.totalEnergie = '';

    const input1 = document.getElementById('totalEnergieFile1Input') as HTMLInputElement | null;
    const input2 = document.getElementById('totalEnergieFile2Input') as HTMLInputElement | null;
    if (input1) input1.value = '';
    if (input2) input2.value = '';
  }

  // --- COMPARAISON BO AGENCE / PARTNER STATION (TOTAL ENERGIE) ---
  async onTotalEnergieCompareFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.totalEnergieCompareFile = input.files[0];
      this.totalEnergieCompareProgress = `Fichier sélectionné : ${this.totalEnergieCompareFile.name}`;
      this.totalEnergieCompareResult = [];
      this.totalEnergieCompareResultColumns = [];
      this.successMsg.totalEnergieCompare = '';
      this.errorMsg.totalEnergieCompare = '';
      try {
        await this.loadTotalEnergieCompareFile();
        this.showSuccess('totalEnergieCompare', `Fichier chargé : ${this.totalEnergieCompareData.length} lignes. Cliquez sur "Comparer et ajouter Commentaire" pour lancer la comparaison.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur lors du chargement du fichier.';
        this.showError('totalEnergieCompare', message);
      }
    }
  }

  async loadTotalEnergieCompareFile() {
    if (!this.totalEnergieCompareFile) return;
    const file = this.totalEnergieCompareFile;
    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xls') || fileName.endsWith('.xlsx');
    const isCsv = fileName.endsWith('.csv');
    if (!isExcel && !isCsv) {
      throw new Error('Format non supporté. Utilisez CSV, XLS ou XLSX.');
    }
    if (isExcel) {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      this.totalEnergieCompareData = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    } else {
      const text = await file.text();
      const result = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        delimiter: this.detectedDelimiter || ';'
      });
      this.totalEnergieCompareData = result.data as any[];
    }
    if (this.totalEnergieCompareData.length === 0) {
      throw new Error('Le fichier est vide ou ne contient pas de données.');
    }
    this.totalEnergieCompareData = this.totalEnergieCompareData.map((row: any) => {
      const normalized: any = {};
      Object.keys(row).forEach(k => {
        normalized[String(k).trim()] = row[k];
      });
      return normalized;
    });
    this.totalEnergieCompareColumns = Object.keys(this.totalEnergieCompareData[0] || {});
    const normalizedCols = this.totalEnergieCompareColumns.map(col => col.trim().toLowerCase());
    const hasBoAgence = normalizedCols.some(c =>
      (c.includes('bo') && c.includes('agence')) || c === 'bo: agence' || c === 'bo:agence' || c === 'bo_agence'
    );
    const hasPartnerStation = normalizedCols.some(c =>
      (c.includes('partner') && c.includes('station')) || (c.includes('partenaire') && c.includes('station')) ||
      c === 'partner: station' || c === 'partner:station' || c === 'partenaire_station'
    );
    if (!hasBoAgence) {
      throw new Error(`Colonne "BO: Agence" non trouvée. Colonnes : ${this.totalEnergieCompareColumns.join(', ')}`);
    }
    if (!hasPartnerStation) {
      throw new Error(`Colonne "PARTNER: Station" non trouvée. Colonnes : ${this.totalEnergieCompareColumns.join(', ')}`);
    }
  }

  processTotalEnergieCompare() {
    if (this.totalEnergieCompareData.length === 0) {
      this.showError('totalEnergieCompare', 'Veuillez d\'abord charger un fichier.');
      return;
    }
    this.totalEnergieCompareIsProcessing = true;
    this.successMsg.totalEnergieCompare = '';
    this.errorMsg.totalEnergieCompare = '';
    try {
      const colBoAgence = this.totalEnergieCompareColumns.find(c => {
        const n = c.trim().toLowerCase().replace(/\s+/g, ' ');
        return n === 'bo: agence' || n === 'bo:agence' || n === 'bo_agence' || (n.includes('bo') && n.includes('agence'));
      });
      const colPartnerStation = this.totalEnergieCompareColumns.find(c => {
        const n = c.trim().toLowerCase().replace(/\s+/g, ' ');
        return n === 'partner: station' || n === 'partner:station' || n === 'partenaire_station' ||
          (n.includes('partner') && n.includes('station')) || (n.includes('partenaire') && n.includes('station'));
      });
      if (!colBoAgence || !colPartnerStation) {
        throw new Error('Colonnes "BO: Agence" ou "PARTNER: Station" introuvables.');
      }
      const COMMENTAIRE_KEY = 'Commentaire';
      this.totalEnergieCompareResult = this.totalEnergieCompareData.map((row: any) => {
        const agence = String(row[colBoAgence] ?? '').trim();
        const station = String(row[colPartnerStation] ?? '').trim();
        const commentaire =
          agence === station
            ? 'OK'
            : `Trx à annuler sur '${agence}' et à créer sur '${station}'`;
        return { ...row, [COMMENTAIRE_KEY]: commentaire };
      });
      this.totalEnergieCompareResultColumns = [...this.totalEnergieCompareColumns];
      if (!this.totalEnergieCompareResultColumns.includes(COMMENTAIRE_KEY)) {
        this.totalEnergieCompareResultColumns.push(COMMENTAIRE_KEY);
      }
      const okCount = this.totalEnergieCompareResult.filter(r => r[COMMENTAIRE_KEY] === 'OK').length;
      const diffCount = this.totalEnergieCompareResult.length - okCount;
      
      // Calculer le récapitulatif groupé par station pour les commentaires non OK
      const summaryMap: { [station: string]: { count: number; agences: Set<string> } } = {};
      const partnerStationCol = colPartnerStation; // Garder référence pour le scope
      const boAgenceCol = colBoAgence; // Garder référence pour le scope
      
      this.totalEnergieCompareResult.forEach((row: any) => {
        if (row[COMMENTAIRE_KEY] !== 'OK') {
          const station = String(row[partnerStationCol] ?? '').trim() || '(vide)';
          const agence = String(row[boAgenceCol] ?? '').trim() || '(vide)';
          
          if (!summaryMap[station]) {
            summaryMap[station] = { count: 0, agences: new Set<string>() };
          }
          summaryMap[station].count++;
          if (agence) {
            summaryMap[station].agences.add(agence);
          }
        }
      });
      
      // Convertir en tableau et trier par nombre décroissant
      this.totalEnergieCompareSummary = Object.keys(summaryMap)
        .map(station => ({
          station,
          agenceBo: Array.from(summaryMap[station].agences).join(', ') || '(vide)',
          count: summaryMap[station].count
        }))
        .sort((a, b) => b.count - a.count);
      
      this.totalEnergieCompareProgress = `Comparaison terminée : ${okCount} OK, ${diffCount} à traiter.`;
      this.showSuccess('totalEnergieCompare', `Comparaison terminée : ${this.totalEnergieCompareResult.length} lignes (${okCount} OK, ${diffCount} avec écart).`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur lors de la comparaison.';
      this.showError('totalEnergieCompare', message);
    } finally {
      this.totalEnergieCompareIsProcessing = false;
    }
  }

  async exportTotalEnergieCompareResult() {
    if (this.totalEnergieCompareResult.length === 0) {
      this.showError('totalEnergieCompare', 'Aucune donnée à exporter. Lancez d\'abord la comparaison.');
      return;
    }
    try {
      this.totalEnergieCompareIsProcessing = true;
      const worksheet = XLSX.utils.json_to_sheet(this.totalEnergieCompareResult);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Comparaison');
      const fileName = `total_energie_comparaison_bo_partner_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      this.showSuccess('totalEnergieCompare', `Fichier exporté : ${fileName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur lors de l\'export.';
      this.showError('totalEnergieCompare', message);
    } finally {
      this.totalEnergieCompareIsProcessing = false;
    }
  }

  getTotalEnergieCompareSummaryTotal(): number {
    return this.totalEnergieCompareSummary.reduce((sum, item) => sum + item.count, 0);
  }

  getSummarySeverityClass(count: number): string {
    const total = this.getTotalEnergieCompareSummaryTotal();
    if (total === 0) return 'severity-low';
    const percentage = (count / total) * 100;
    if (percentage >= 30 || count >= 50) return 'severity-high';
    if (percentage >= 10 || count >= 20) return 'severity-medium';
    return 'severity-low';
  }

  getSummarySeverityPercentage(count: number): number {
    const total = this.getTotalEnergieCompareSummaryTotal();
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  }

  async exportTotalEnergieCompareSummary() {
    if (this.totalEnergieCompareSummary.length === 0) {
      this.showError('totalEnergieCompare', 'Aucun récapitulatif à exporter. Lancez d\'abord la comparaison.');
      return;
    }
    try {
      this.totalEnergieCompareIsProcessing = true;
      
      // Préparer les données pour l'export avec le total
      const exportData = this.totalEnergieCompareSummary.map(item => ({
        'Station (PARTNER)': item.station,
        'Agence BO': item.agenceBo,
        'Nombre de commentaires non OK': item.count
      }));
      
      // Ajouter la ligne de total
      exportData.push({
        'Station (PARTNER)': 'TOTAL',
        'Agence BO': '',
        'Nombre de commentaires non OK': this.getTotalEnergieCompareSummaryTotal()
      });
      
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Récapitulatif');
      
      const fileName = `total_energie_recap_stations_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      this.showSuccess('totalEnergieCompare', `Récapitulatif exporté : ${fileName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur lors de l\'export du récapitulatif.';
      this.showError('totalEnergieCompare', message);
    } finally {
      this.totalEnergieCompareIsProcessing = false;
    }
  }

  resetTotalEnergieCompareSelection() {
    this.totalEnergieCompareFile = null;
    this.totalEnergieCompareData = [];
    this.totalEnergieCompareColumns = [];
    this.totalEnergieCompareResult = [];
    this.totalEnergieCompareResultColumns = [];
    this.totalEnergieCompareSummary = [];
    this.totalEnergieCompareProgress = '';
    this.successMsg.totalEnergieCompare = '';
    this.errorMsg.totalEnergieCompare = '';
    const input = document.getElementById('totalEnergieCompareFileInput') as HTMLInputElement | null;
    if (input) input.value = '';
  }

  // --- MÉTHODES DE SÉPARATION DES FEUILLES EXCEL ---
  onSheetSplitFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.sheetSplitFile = input.files[0];
      this.sheetSplitResults = [];
      this.sheetSplitZipName = '';
      this.sheetSplitProgress = `${this.sheetSplitFile.name} sélectionné (${(this.sheetSplitFile.size / (1024 * 1024)).toFixed(2)} MB)`;
      this.successMsg.sheetSplit = '';
      this.errorMsg.sheetSplit = '';
      this.showSheetSplitExcelFallbackHelp = false;
    }
  }

  resetSheetSplitSelection() {
    this.sheetSplitFile = null;
    this.showSheetSplitExcelFallbackHelp = false;
    this.sheetSplitResults = [];
    this.sheetSplitZipName = '';
    this.sheetSplitProgress = '';

    const input = document.getElementById('sheetSplitInput') as HTMLInputElement | null;
    if (input) {
      input.value = '';
    }
  }

  async splitExcelSheets() {
    if (!this.sheetSplitFile) {
      this.showError('sheetSplit', 'Veuillez sélectionner un fichier Excel (.xls ou .xlsx).');
      return;
    }

    this.sheetSplitIsProcessing = true;
    this.sheetSplitProgress = 'Chargement du classeur...';
    this.sheetSplitResults = [];
    this.sheetSplitZipName = '';
    this.showSheetSplitExcelFallbackHelp = false;

    try {
      let sourceFile: File = this.sheetSplitFile;

      if (this.isLegacyXlsFile(this.sheetSplitFile)) {
        this.sheetSplitConversionMessage = 'Conversion XLS → XLSX en cours. Cette opération peut durer plusieurs minutes pour les gros fichiers...';
        this.sheetSplitConversionInProgress = true;
        sourceFile = await this.convertLegacyXls(this.sheetSplitFile);
        this.sheetSplitConversionInProgress = false;
        this.sheetSplitConversionMessage = '';
      }

      const buffer = await sourceFile.arrayBuffer();
      const workbook = await this.loadExcelWorkbook(buffer, sourceFile.name);

      if (!workbook.worksheets || workbook.worksheets.length === 0) {
        throw new Error('Aucune feuille trouvée dans ce classeur.');
      }

      const header = this.sheetSplitHeaderColumns;
      const zip = new JSZip();
      const sheetResults: Array<{ sheetName: string; rows: number; fileName: string }> = [];

      for (let index = 0; index < workbook.worksheets.length; index++) {
        const worksheet = workbook.worksheets[index];
        const sheetName = worksheet?.name || `Feuille_${index + 1}`;
        this.sheetSplitProgress = `Traitement de "${sheetName}" (${index + 1}/${workbook.worksheets.length})`;

        const clonedWorkbook = new ExcelJS.Workbook();
        const clonedSheet = clonedWorkbook.addWorksheet(sheetName);

        worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
          const values = Array.isArray(row.values) ? [...row.values] : row.values;
          clonedSheet.getRow(rowNumber).values = values;
          clonedSheet.getRow(rowNumber).commit();
        });

        if (this.sheetSplitApplyHeaderFromSecondSheet && index > 0 && header.length > 0) {
          clonedSheet.spliceRows(1, 0, header);
          this.applySheetSplitHeaderStyle(clonedSheet.getRow(1));
        }

        this.applySheetSplitColumnWidths(clonedSheet);

        const safeSheetName = this.sanitizeFileName(sheetName) || `Feuille_${index + 1}`;
        const fileName = `${safeSheetName}.xlsx`;
        const sheetBuffer = await clonedWorkbook.xlsx.writeBuffer();

        zip.file(fileName, sheetBuffer);
        sheetResults.push({
          sheetName,
          rows: this.getSheetSplitRowCount(worksheet),
          fileName
        });
      }

      const zipName = `${this.getBaseFileName(sourceFile.name)}_feuilles_sep.zip`;
      this.sheetSplitZipName = zipName;
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, zipName);

      this.sheetSplitResults = sheetResults;
      this.sheetSplitProgress = 'Séparation terminée';
      this.showSheetSplitExcelFallbackHelp = false;
      this.showSuccess('sheetSplit', `Séparation terminée : ${sheetResults.length} fichiers générés (${zipName}).`);
    } catch (error) {
      console.error('Erreur lors de la séparation des feuilles:', error);
      const message = error instanceof Error ? error.message : 'Erreur inconnue lors de la séparation des feuilles.';
      this.showError('sheetSplit', message);
    } finally {
      this.sheetSplitIsProcessing = false;
      this.sheetSplitConversionInProgress = false;
      this.sheetSplitConversionMessage = '';
      
      // Nettoyer l'intervalle si toujours actif
      if (this.sheetSplitConversionProgressInterval) {
        clearInterval(this.sheetSplitConversionProgressInterval);
        this.sheetSplitConversionProgressInterval = null;
      }
      this.sheetSplitConversionProgress = 0;
      this.sheetSplitConversionElapsedTime = 0;
    }
  }

  private applySheetSplitHeaderStyle(row: ExcelJS.Row) {
    row.font = { bold: true, color: { argb: 'FF000000' } };
    row.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFC8C8C8' }
    };
    row.alignment = { horizontal: 'center', vertical: 'middle' };
  }

  private applySheetSplitColumnWidths(worksheet: ExcelJS.Worksheet) {
    this.sheetSplitColumnWidths.forEach((width, index) => {
      const column = worksheet.getColumn(index + 1);
      column.width = width;
    });
  }

  private getSheetSplitRowCount(worksheet: ExcelJS.Worksheet): number {
    const actualRows = (worksheet as any).actualRowCount;
    if (typeof actualRows === 'number' && actualRows > 0) {
      return actualRows;
    }
    return worksheet.rowCount || 0;
  }

  private sanitizeFileName(name: string): string {
    return name.replace(/[\\/:*?"<>|]/g, '_').trim();
  }

  private getBaseFileName(fileName: string): string {
    return fileName.replace(/\.[^.]+$/, '');
  }

  private isLegacyXlsFile(file: File | null): boolean {
    if (!file) {
      return false;
    }
    return file.name.toLowerCase().endsWith('.xls');
  }

  /**
   * Conversion XLS → XLSX dans le navigateur (fallback quand le serveur est inaccessible).
   * Les très gros .xls ou certains formats peuvent provoquer RangeError dans SheetJS ; dans ce cas on échoue proprement.
   */
  private async convertLegacyXlsInBrowser(file: File): Promise<File> {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = await this.loadExcelWorkbook(buffer, file.name);
      const xlsxBuffer = await workbook.xlsx.writeBuffer();
      return new File([xlsxBuffer], `${this.getBaseFileName(file.name)}_converted.xlsx`, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
    } catch (e) {
      const isRangeError = e instanceof RangeError || (e && (e as Error).message?.includes('Invalid array length'));
      if (isRangeError) {
        throw new Error('BROWSER_XLS_TOO_LARGE_OR_UNSUPPORTED');
      }
      throw e;
    }
  }

  private async convertLegacyXls(file: File): Promise<File> {
    return new Promise<File>((resolve, reject) => {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      this.sheetSplitProgress = `Préparation de la conversion (${sizeMB} MB)...`;
      
      // Initialiser la progression
      this.sheetSplitConversionProgress = 0;
      this.sheetSplitConversionElapsedTime = 0;
      const startTime = Date.now();
      
      // Démarrer l'intervalle de mise à jour de la progression
      this.sheetSplitConversionProgressInterval = setInterval(() => {
        this.sheetSplitConversionElapsedTime = Math.floor((Date.now() - startTime) / 1000);
        
        // Estimation de progression optimisée basée sur la taille du fichier
        // Avec les optimisations backend (streaming), la conversion est plus rapide
        // Estimation réaliste : ~1-1.5s par MB pour les petits, ~0.7-1s pour les moyens, ~0.6-0.8s pour les gros
        const fileSizeMB = parseFloat(sizeMB);
        let estimatedDuration;
        
        if (fileSizeMB < 50) {
          // Petits fichiers : ~1.5s par MB
          estimatedDuration = Math.max(30, fileSizeMB * 1.5);
        } else if (fileSizeMB < 150) {
          // Fichiers moyens : ~1s par MB
          estimatedDuration = Math.max(60, fileSizeMB * 1.0);
        } else {
          // Gros fichiers (181 MB) : ~0.7s par MB (grâce au streaming)
          // Pour 181 MB = ~127 secondes = ~2 minutes
          estimatedDuration = Math.max(120, fileSizeMB * 0.7);
        }
        
        // Limite à 98% pour laisser de la marge, mais permet d'aller plus loin
        const rawProgress = (this.sheetSplitConversionElapsedTime / estimatedDuration) * 100;
        // Progression non-linéaire : plus lente au début, accélère vers la fin
        const adjustedProgress = rawProgress < 50 
          ? rawProgress * 0.7  // Ralentir les premiers 50%
          : 35 + (rawProgress - 50) * 1.3; // Accélérer les derniers 50%
        
        const estimatedProgress = Math.min(98, Math.max(0, adjustedProgress));
        this.sheetSplitConversionProgress = Math.floor(estimatedProgress);
        
        // Mettre à jour le message avec le temps écoulé et estimation restante
        const minutes = Math.floor(this.sheetSplitConversionElapsedTime / 60);
        const seconds = this.sheetSplitConversionElapsedTime % 60;
        const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
        
        const remainingSeconds = Math.max(0, Math.ceil(estimatedDuration - this.sheetSplitConversionElapsedTime));
        const remainingMinutes = Math.floor(remainingSeconds / 60);
        const remainingSecs = remainingSeconds % 60;
        const remainingStr = remainingMinutes > 0 
          ? `${remainingMinutes}m ${remainingSecs}s` 
          : `${remainingSecs}s`;
        
        this.sheetSplitConversionMessage = `Conversion XLS → XLSX en cours... (${timeStr} écoulé${minutes > 0 ? 's' : ''}, ~${remainingStr} restant${remainingMinutes > 0 ? 's' : ''})`;
        
        this.cd.detectChanges();
      }, 500); // Mise à jour toutes les 500ms
      
      this.excelConversionService.convertXlsToXlsx(file).subscribe({
        next: blob => {
          // Arrêter l'intervalle
          if (this.sheetSplitConversionProgressInterval) {
            clearInterval(this.sheetSplitConversionProgressInterval);
            this.sheetSplitConversionProgressInterval = null;
          }
          
          // Mettre la progression à 100%
          this.sheetSplitConversionProgress = 100;
          const convertedFile = new File([blob], `${this.getBaseFileName(file.name)}_converted.xlsx`, {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          });
          this.sheetSplitProgress = 'Conversion terminée, reprise de la séparation...';
          this.sheetSplitConversionMessage = 'Conversion terminée !';
          this.cd.detectChanges();
          
          // Petit délai pour afficher le 100% avant de continuer
          setTimeout(() => {
            resolve(convertedFile);
          }, 500);
        },
        error: err => {
          // Arrêter l'intervalle en cas d'erreur
          if (this.sheetSplitConversionProgressInterval) {
            clearInterval(this.sheetSplitConversionProgressInterval);
            this.sheetSplitConversionProgressInterval = null;
          }
          
          console.error('Erreur lors de la conversion XLS -> XLSX:', err);
          const isConnectionError = err instanceof HttpErrorResponse && (err.status === 0 || err.status === 504);
          if (isConnectionError) {
            this.sheetSplitProgress = 'Serveur inaccessible. Conversion locale en cours...';
            this.sheetSplitConversionMessage = 'Conversion XLS → XLSX dans le navigateur...';
            this.sheetSplitConversionProgress = 50;
            this.cd.detectChanges();
            this.convertLegacyXlsInBrowser(file).then(converted => {
              this.sheetSplitConversionProgress = 100;
              this.sheetSplitProgress = 'Conversion locale terminée, reprise de la séparation...';
              this.sheetSplitConversionMessage = 'Conversion terminée !';
              this.cd.detectChanges();
              setTimeout(() => resolve(converted), 300);
            }).catch(fallbackErr => {
              console.error('Fallback conversion XLS -> XLSX (navigateur) a échoué:', fallbackErr);
              const isUnsupported = fallbackErr instanceof Error && fallbackErr.message === 'BROWSER_XLS_TOO_LARGE_OR_UNSUPPORTED';
              const msg = isUnsupported
                ? 'Ce fichier .xls ne peut pas être converti dans le navigateur. Utilisez la solution avec Excel ci-dessous, ou assurez-vous que le serveur est accessible.'
                : 'Serveur inaccessible et conversion locale impossible. Vérifiez votre connexion ou réessayez avec un fichier plus petit.';
              this.showSheetSplitExcelFallbackHelp = isUnsupported;
              this.showError('sheetSplit', msg);
              this.sheetSplitConversionInProgress = false;
              this.sheetSplitConversionMessage = '';
              this.sheetSplitConversionProgress = 0;
              this.sheetSplitConversionElapsedTime = 0;
              reject(fallbackErr);
            });
            return;
          }
          const message = 'Erreur lors de la conversion XLS -> XLSX.';
          this.showError('sheetSplit', message);
          this.sheetSplitConversionInProgress = false;
          this.sheetSplitConversionMessage = '';
          this.sheetSplitConversionProgress = 0;
          this.sheetSplitConversionElapsedTime = 0;
          reject(err);
        }
      });
    });
  }

  private async loadExcelWorkbook(buffer: ArrayBuffer, fileName: string): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    const lowerName = fileName.toLowerCase();

    if (lowerName.endsWith('.xls')) {
      const data = new Uint8Array(buffer);
      const parsed = XLSX.read(data, {
        type: 'array',
        cellDates: true,
        raw: true
      });

      parsed.SheetNames.forEach(sheetName => {
        const targetSheet = workbook.addWorksheet(sheetName);
        const sheet = parsed.Sheets[sheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          raw: true
        });

        rows.forEach(rowValues => {
          targetSheet.addRow(rowValues);
        });
      });

      return workbook;
    }

    await workbook.xlsx.load(buffer);
    return workbook;
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

  /** Ferme le panneau après un choix (les multi-select Material restent ouverts par défaut). */
  closeMatSelectPanelAfterSelection(event: MatSelectChange): void {
    setTimeout(() => event.source.close(), 0);
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

  onExportTypeSuffixChange() {
    // Réinitialiser le suffixe personnalisé si on change d'option
    if (this.exportTypeSuffix !== 'CUSTOM') {
      this.exportTypeCustomSuffix = '';
    }
  }

  exportByType() {
    try {
      if (!this.exportTypeCol || this.exportTypeSelected.length === 0) return;
      let exported = 0;
      for (const type of this.exportTypeSelected) {
        const filteredRows = this.combinedRows.filter(row => (row[this.exportTypeCol] ?? '') === type);
        if (filteredRows.length === 0) continue;
        const safeType = (type || 'vide').replace(/[^a-zA-Z0-9_-]/g, '_');
        let sufixe = '';
        if (this.exportTypeSuffix === 'CUSTOM' && this.exportTypeCustomSuffix) {
          sufixe = this.exportTypeCustomSuffix.replace(/[^a-zA-Z0-9_-]/g, '_');
          console.log(`🔧 Suffixe personnalisé utilisé: "${this.exportTypeCustomSuffix}" → "${sufixe}"`);
        } else if (this.exportTypeSuffix && this.exportTypeSuffix !== 'CUSTOM') {
          sufixe = this.exportTypeSuffix.replace(/[^a-zA-Z0-9_-]/g, '_');
          console.log(`🔧 Suffixe prédéfini utilisé: "${this.exportTypeSuffix}" → "${sufixe}"`);
        }
        const prefixe = this.exportTypePrefix ? this.exportTypePrefix.replace(/[^a-zA-Z0-9_-]/g, '_') : '';
        const description = this.exportTypeDescription ? this.exportTypeDescription.replace(/[^a-zA-Z0-9_-]/g, '_') : '';
        let baseFileName = '';
        if (prefixe) baseFileName = prefixe + '_';
        baseFileName += safeType;
        if (sufixe) baseFileName += `_` + sufixe;
        if (description) baseFileName += `_` + description;

        const fileNameCsv = `${baseFileName}.csv`;
        const fileNameXls = `${baseFileName}.xls`;
        const fileNameXlsx = `${baseFileName}.xlsx`;

        if (this.exportTypeFormat === 'csv') {
          this.exportPeriodAsCSV(filteredRows, fileNameCsv);
        } else if (this.exportTypeFormat === 'xls') {
          this.exportPeriodAsXLS(filteredRows, fileNameXls);
        } else if (this.exportTypeFormat === 'xlsx') {
          this.exportPeriodAsXLSX(filteredRows, fileNameXlsx);
        } else {
          throw new Error(`Format d'export non supporté: ${this.exportTypeFormat}`);
        }
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
        newRow[this.concatNewCol] = buildConcatenatedValue(
          this.concatCols.map(col => row[col]),
          this.concatSeparator ?? ''
        );
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

















  private transformCharactersValue(value: string): string {
    switch (this.removeCharMode) {
      case 'keep':
        switch (this.removeCharPosition) {
          case 'start':
            return value.substring(0, this.removeCharCount);
          case 'end':
            return value.substring(Math.max(0, value.length - this.removeCharCount));
          default:
            return value;
        }
      case 'remove':
      default:
        switch (this.removeCharPosition) {
          case 'start':
            if (value.length >= this.removeCharCount) {
              return value.substring(this.removeCharCount);
            }
            return value;
          case 'end':
            if (value.length >= this.removeCharCount) {
              return value.substring(0, value.length - this.removeCharCount);
            }
            return value;
          case 'specific':
            const pos = this.removeCharSpecificPosition - 1; // Convert to 0-based
            if (pos >= 0 && pos < value.length && pos + this.removeCharCount <= value.length) {
              return value.substring(0, pos) + value.substring(pos + this.removeCharCount);
            }
            return value;
        }
    }

    return value;
  }

  onRemoveCharModeChange(): void {
    if (this.removeCharMode === 'keep' && this.removeCharPosition === 'specific') {
      this.removeCharPosition = 'start';
    }
  }

  applyRemoveCharactersFormatting() {
    if (!this.formatSelections['removeCharacters'].length) {
      this.showError('format', 'Veuillez sélectionner au moins une colonne');
      return;
    }

    // Vérifier les paramètres de suppression / conservation
    if (!this.removeCharPosition) {
      this.showError('format', 'Veuillez sélectionner une position');
      return;
    }

    if (!this.removeCharCount || this.removeCharCount <= 0) {
      const message = this.removeCharMode === 'keep'
        ? 'Veuillez spécifier un nombre de caractères à garder (supérieur à 0)'
        : 'Veuillez spécifier un nombre de caractères à supprimer (supérieur à 0)';
      this.showError('format', message);
      return;
    }

    // Vérification supplémentaire pour la position spécifique
    if (this.removeCharMode === 'keep' && this.removeCharPosition === 'specific') {
      this.showError('format', 'La conservation n\'est disponible que depuis la gauche ou la droite');
      return;
    }

    if (this.removeCharPosition === 'specific' && (!this.removeCharSpecificPosition || this.removeCharSpecificPosition <= 0)) {
      this.showError('format', 'Veuillez spécifier une position valide pour la suppression spécifique');
      return;
    }



    try {
      let processedCells = 0;
      let totalCells = 0;
      
      const actionLabel = this.removeCharMode === 'keep' ? 'Conservation' : 'Suppression';
      const sideLabel = this.removeCharPosition === 'start'
        ? 'gauche'
        : this.removeCharPosition === 'end'
          ? 'droite'
          : `position ${this.removeCharSpecificPosition}`;

      console.log(`🔄 Formatage: ${actionLabel} de ${this.removeCharCount} caractère(s) depuis ${sideLabel}`);

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
            
            value = this.transformCharactersValue(value);
            
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
              
              value = this.transformCharactersValue(value);
              
              row[col] = value;
            }
          });
        });
      }

      console.log(`📊 RÉSUMÉ: ${totalCells} cellules vérifiées, ${processedCells} cellules modifiées`);

      const actionText = this.removeCharMode === 'keep'
        ? `Conservation de ${this.removeCharCount} caractère(s)`
        : 'Suppression de caractères';
      this.showSuccess('format', `${actionText} appliquée sur ${this.formatSelections['removeCharacters'].length} colonne(s) (${processedCells} modifications)`);
      
      // Forcer la mise à jour de l'affichage
      this.updateDisplayedRowsForPage();
      this.cd.detectChanges();
    } catch (error) {
      console.error('❌ Erreur lors de la suppression:', error);
      this.showError('format', 'Erreur lors de la suppression de caractères');
    }
  }

  applyRemoveSpecialStringsFormatting() {
    if (!this.formatSelections['removeSpecialStrings'] || this.formatSelections['removeSpecialStrings'].length === 0) {
      this.showError('format', 'Veuillez sélectionner au moins une colonne à traiter');
      return;
    }

    if (!this.specialStringToRemove || this.specialStringToRemove.trim() === '') {
      this.showError('format', 'Veuillez spécifier la chaîne de caractères à supprimer');
      return;
    }

    if (!this.specialStringRemovalMode) {
      this.showError('format', 'Veuillez sélectionner un mode de suppression');
      return;
    }

    try {
      let processedCells = 0;
      let totalCells = 0;
      
      // Traiter les données affichées (combinedRows)
      this.combinedRows.forEach((row, rowIndex) => {
        this.formatSelections['removeSpecialStrings'].forEach(col => {
          totalCells++;
          if (row[col] !== undefined && row[col] !== null) {
            // Convertir en chaîne si ce n'est pas déjà le cas
            let value = String(row[col]);
            const originalValue = value;
            
            // Vérifier que la chaîne n'est pas vide
            if (value.length === 0) {
              return;
            }
            
            // Appliquer la suppression selon le mode
            switch (this.specialStringRemovalMode) {
              case 'all':
                // Supprimer toutes les occurrences
                value = value.split(this.specialStringToRemove).join('');
                break;
              case 'start':
                // Supprimer seulement au début
                if (value.startsWith(this.specialStringToRemove)) {
                  value = value.substring(this.specialStringToRemove.length);
                }
                break;
              case 'end':
                // Supprimer seulement à la fin
                if (value.endsWith(this.specialStringToRemove)) {
                  value = value.substring(0, value.length - this.specialStringToRemove.length);
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
          this.formatSelections['removeSpecialStrings'].forEach(col => {
            if (row[col] !== undefined && row[col] !== null) {
              // Convertir en chaîne si ce n'est pas déjà le cas
              let value = String(row[col]);
              
              // Vérifier que la chaîne n'est pas vide
              if (value.length === 0) {
                return;
              }
              
              // Appliquer la suppression selon le mode
              switch (this.specialStringRemovalMode) {
                case 'all':
                  // Supprimer toutes les occurrences
                  value = value.split(this.specialStringToRemove).join('');
                  break;
                case 'start':
                  // Supprimer seulement au début
                  if (value.startsWith(this.specialStringToRemove)) {
                    value = value.substring(this.specialStringToRemove.length);
                  }
                  break;
                case 'end':
                  // Supprimer seulement à la fin
                  if (value.endsWith(this.specialStringToRemove)) {
                    value = value.substring(0, value.length - this.specialStringToRemove.length);
                  }
                  break;
              }
              
              row[col] = value;
            }
          });
        });
      }

      console.log(`📊 RÉSUMÉ: ${totalCells} cellules vérifiées, ${processedCells} cellules modifiées`);

      this.showSuccess('format', `Suppression de caractères spéciaux appliquée sur ${this.formatSelections['removeSpecialStrings'].length} colonne(s) (${processedCells} modifications)`);
      
      // Forcer la mise à jour de l'affichage
      this.updateDisplayedRowsForPage();
      this.cd.detectChanges();
    } catch (error) {
      console.error('❌ Erreur lors de la suppression de caractères spéciaux:', error);
      this.showError('format', 'Erreur lors de la suppression de caractères spéciaux: ' + error.message);
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

  /**
   * Applique le formatage pour supprimer .0 sur les dates
   */
  applyRemoveZeroDecimalsFormatting() {
    if (!this.formatSelections['removeZeroDecimals'].length) {
      this.showError('format', 'Veuillez sélectionner au moins une colonne');
      return;
    }

    try {
      let totalCells = 0;
      let processedCells = 0;
      
      console.log('🔄 Formatage: Suppression des .0 sur les dates');
      
      // Traiter les données affichées (combinedRows)
      this.combinedRows.forEach((row, rowIndex) => {
        this.formatSelections['removeZeroDecimals'].forEach(col => {
          totalCells++;
          if (row[col] !== undefined && row[col] !== null) {
            // Convertir en chaîne si ce n'est pas déjà le cas
            let value = String(row[col]).trim();
            const originalValue = value;
            
            // Supprimer .0 à la fin de la chaîne
            if (value.endsWith('.0')) {
              value = value.slice(0, -2);
              row[col] = value;
              processedCells++;
              
              if (rowIndex < 5) { // Log pour les 5 premières lignes
                console.log(`📝 ${col}[${rowIndex}]: "${originalValue}" -> "${value}"`);
              }
            }
          }
        });
      });

      // Mettre à jour aussi allRows si la sélection n'est pas appliquée
      if (!this.selectionApplied) {
        this.allRows.forEach((row, rowIndex) => {
          this.formatSelections['removeZeroDecimals'].forEach(col => {
            if (row[col] !== undefined && row[col] !== null) {
              // Convertir en chaîne si ce n'est pas déjà le cas
              let value = String(row[col]).trim();
              
              // Supprimer .0 à la fin de la chaîne
              if (value.endsWith('.0')) {
                value = value.slice(0, -2);
                row[col] = value;
              }
            }
          });
        });
      }

      console.log(`📊 RÉSUMÉ: ${totalCells} cellules vérifiées, ${processedCells} cellules modifiées`);

      this.showSuccess('format', `Suppression des .0 sur les dates appliquée sur ${this.formatSelections['removeZeroDecimals'].length} colonne(s) (${processedCells} modifications)`);
      
      // Forcer la mise à jour de l'affichage
      this.updateDisplayedRowsForPage();
      this.cd.detectChanges();
    } catch (error) {
      console.error('❌ Erreur lors de la suppression des .0:', error);
      this.showError('format', 'Erreur lors de la suppression des .0');
    }
  }

  /**
   * Applique le formatage pour supprimer les espaces
   */
  applyRemoveSpacesFormatting() {
    if (!this.formatSelections['removeSpaces'].length) {
      this.showError('format', 'Veuillez sélectionner au moins une colonne');
      return;
    }

    try {
      let totalCells = 0;
      let processedCells = 0;
      
      console.log(`🔄 Formatage: Suppression des espaces (type: ${this.removeSpacesType})`);
      
      // Traiter les données affichées (combinedRows)
      this.combinedRows.forEach((row, rowIndex) => {
        this.formatSelections['removeSpaces'].forEach(col => {
          totalCells++;
          if (row[col] !== undefined && row[col] !== null) {
            // Convertir en chaîne si ce n'est pas déjà le cas
            let value = String(row[col]);
            const originalValue = value;
            
            // Appliquer la suppression d'espaces selon le type choisi
            switch (this.removeSpacesType) {
              case 'all':
                value = value.replace(/\s/g, '');
                break;
              case 'leading':
                value = value.replace(/^\s+/, '');
                break;
              case 'trailing':
                value = value.replace(/\s+$/, '');
                break;
              case 'multiple':
                value = value.replace(/\s+/g, ' ');
                break;
            }
            
            if (value !== originalValue) {
              row[col] = value;
              processedCells++;
              
              if (rowIndex < 5) { // Log pour les 5 premières lignes
                console.log(`📝 ${col}[${rowIndex}]: "${originalValue}" -> "${value}"`);
              }
            }
          }
        });
      });

      // Mettre à jour aussi allRows si la sélection n'est pas appliquée
      if (!this.selectionApplied) {
        this.allRows.forEach((row, rowIndex) => {
          this.formatSelections['removeSpaces'].forEach(col => {
            if (row[col] !== undefined && row[col] !== null) {
              // Convertir en chaîne si ce n'est pas déjà le cas
              let value = String(row[col]);
              
              // Appliquer la suppression d'espaces selon le type choisi
              switch (this.removeSpacesType) {
                case 'all':
                  value = value.replace(/\s/g, '');
                  break;
                case 'leading':
                  value = value.replace(/^\s+/, '');
                  break;
                case 'trailing':
                  value = value.replace(/\s+$/, '');
                  break;
                case 'multiple':
                  value = value.replace(/\s+/g, ' ');
                  break;
              }
              
              row[col] = value;
            }
          });
        });
      }

      console.log(`📊 RÉSUMÉ: ${totalCells} cellules vérifiées, ${processedCells} cellules modifiées`);

      this.showSuccess('format', `Suppression des espaces (${this.removeSpacesType}) appliquée sur ${this.formatSelections['removeSpaces'].length} colonne(s) (${processedCells} modifications)`);
      
      // Forcer la mise à jour de l'affichage
      this.updateDisplayedRowsForPage();
      this.cd.detectChanges();
    } catch (error) {
      console.error('❌ Erreur lors de la suppression des espaces:', error);
      this.showError('format', 'Erreur lors de la suppression des espaces');
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
    // Appliquer l'ordre des colonnes sauvegardé si disponible
    if (this.columns && this.columns.length) {
      this.applySavedColumnOrderFromStorage();
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
          exportTypePrefix: this.exportTypePrefix,
          exportTypeSuffix: this.exportTypeSuffix,
          exportTypeCustomSuffix: this.exportTypeCustomSuffix,
          exportTypeDescription: this.exportTypeDescription,
          removeCharMode: this.removeCharMode,
          removeCharPosition: this.removeCharPosition,
          removeCharCount: this.removeCharCount,
          removeCharSpecificPosition: this.removeCharSpecificPosition,
          specialStringToRemove: this.specialStringToRemove,
          specialStringRemovalMode: this.specialStringRemovalMode,
          specificCharactersToRemove: this.specificCharactersToRemove,
          removeSpecificCharactersCaseSensitive: this.removeSpecificCharactersCaseSensitive,
          removeSpacesType: this.removeSpacesType,
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
    this.concatSeparator = '';
    this.exportTypePrefix = '';
    this.exportTypeSuffix = '';
    this.exportTypeCustomSuffix = '';
    this.exportTypeDescription = '';
    this.removeCharMode = 'remove';
    this.removeCharPosition = 'start';
    this.removeCharCount = 1;
    this.removeCharSpecificPosition = 1;
    this.specialStringToRemove = '';
    this.specialStringRemovalMode = 'all';
    this.specificCharactersToRemove = '';
    this.removeSpecificCharactersCaseSensitive = true;
    this.removeSpacesType = 'all';
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
      this.saveColumnOrderToStorage();
    }
  }

  cancelColumnReorder() {
    this.isColumnReorderMode = false;
    this.reorderedColumns = [...this.columns];
    this.draggedColumn = null;
    this.dragOverColumn = null;
  }

  resetColumnOrder() {
    // Supprimer l'ordre personnalisé et rétablir l'ordre par défaut détecté
    try {
      localStorage.removeItem(this.LOCAL_STORAGE_COLUMN_ORDER_KEY);
    } catch {}
    if (this.allColumns && this.allColumns.length) {
      this.columns = [...this.allColumns];
      if (this.isColumnReorderMode) {
        this.reorderedColumns = [...this.columns];
      }
      this.updateDisplayedRows();
      this.showSuccess('reorder', 'Ordre des colonnes réinitialisé');
    }
  }

  private saveColumnOrderToStorage() {
    try {
      const dataString = JSON.stringify(this.columns || []);
      if (dataString.length < 200_000) {
        localStorage.setItem(this.LOCAL_STORAGE_COLUMN_ORDER_KEY, dataString);
      }
    } catch (e) {
      // best-effort
    }
  }

  private applySavedColumnOrderFromStorage() {
    try {
      const str = localStorage.getItem(this.LOCAL_STORAGE_COLUMN_ORDER_KEY);
      if (!str) return;
      const savedOrder: string[] = JSON.parse(str) || [];
      if (!Array.isArray(savedOrder) || !this.columns || this.columns.length === 0) return;
      // Conserver uniquement les colonnes présentes et dans l'ordre sauvegardé, puis ajouter les colonnes manquantes à la fin
      const set = new Set(this.columns);
      const ordered = savedOrder.filter(c => set.has(c));
      const missing = this.columns.filter(c => !ordered.includes(c));
      const newOrder = [...ordered, ...missing];
      if (newOrder.length === this.columns.length) {
        this.columns = newOrder;
        if (this.isColumnReorderMode) {
          this.reorderedColumns = [...this.columns];
        }
      }
    } catch (e) {
      // ignore storage parse errors
    }
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

      // Sécurité: désactiver l'analyse automatique pour les fichiers extrêmement volumineux
      const MAX_ANALYSIS_ROWS = 100000;
      if (this.allRows.length > MAX_ANALYSIS_ROWS) {
        console.warn(`⚠️ Dataset trop volumineux (${this.allRows.length} lignes), analyse automatique des types de champs désactivée.`);
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
   * Gère le changement de période d'export
   */
  onExportPeriodChange(): void {
    this.detectedPeriods = [];
    this.detectedPeriodsPage = 1;
    this.detectedPeriodsTotalPages = 0;
    if (this.exportDateCol && this.exportDatePeriod) {
      this.detectPeriods();
    }
  }

  /**
   * Gère le changement de durée pour la plage horaire
   */
  onExportTimeRangeMinutesChange(): void {
    if (!this.exportTimeRangeMinutes || this.exportTimeRangeMinutes < 1) {
      this.exportTimeRangeMinutes = 60;
    }
    this.onExportPeriodChange();
  }

  /**
   * Force la re-détection des périodes (pour debug)
   */
  forceRedetectPeriods(): void {
    console.log('🔄 Force re-détection des périodes...');
    this.detectedPeriods = [];
    this.detectedPeriodsPage = 1;
    this.detectedPeriodsTotalPages = 0;
    if (this.exportDateCol && this.exportDatePeriod) {
      this.detectPeriods();
    } else {
      console.warn('⚠️ Colonne de date ou période non sélectionnée');
    }
  }

  /**
   * Détecte les périodes disponibles dans la colonne de date sélectionnée
   */
  private detectPeriods(): void {
    if (!this.exportDateCol || !this.exportDatePeriod) return;

    console.log(`🔍 Détection des périodes pour la colonne: ${this.exportDateCol}, période: ${this.exportDatePeriod}`);
    console.log(`📊 Nombre total de lignes à analyser: ${this.combinedRows.length}`);

    const periodMap = new Map<string, number>();
    let processedRows = 0;
    let validDates = 0;
    let invalidDates = 0;
    let uniqueDates = new Set<string>();

    this.combinedRows.forEach((row, index) => {
      const dateValue = row[this.exportDateCol];
      if (dateValue) {
        const periodKey = this.getPeriodKey(dateValue, this.exportDatePeriod);
        if (periodKey) {
          periodMap.set(periodKey, (periodMap.get(periodKey) || 0) + 1);
          validDates++;
          uniqueDates.add(periodKey);
          
          // Log des premières dates pour debug
          if (index < 10 || Math.random() < 0.001) {
            console.log(`📅 Ligne ${index}: "${dateValue}" -> ${periodKey}`);
          }
        } else {
          invalidDates++;
          // Log des dates invalides pour debug
          if (invalidDates <= 10) {
            console.warn(`⚠️ Date invalide à la ligne ${index}: "${dateValue}"`);
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

    console.log(`✅ Détection terminée:`);
    console.log(`   - Lignes traitées: ${processedRows}`);
    console.log(`   - Dates valides: ${validDates}`);
    console.log(`   - Dates invalides: ${invalidDates}`);
    console.log(`   - Périodes uniques détectées: ${uniqueDates.size}`);
    console.log(`   - Périodes détectées:`, Array.from(uniqueDates).sort());

    this.detectedPeriods = Array.from(periodMap.entries())
      .map(([key, count]) => ({
        key,
        label: this.formatPeriodLabel(key, this.exportDatePeriod),
        count
      }))
      .sort((a, b) => a.key.localeCompare(b.key));

    console.log(`📋 Périodes finales:`, this.detectedPeriods.map(p => `${p.label} (${p.count} lignes)`));

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
        case 'hour': {
          const yyyy = date.getFullYear();
          const mm = (date.getMonth() + 1).toString().padStart(2, '0');
          const dd = date.getDate().toString().padStart(2, '0');
          const HH = date.getHours().toString().padStart(2, '0');
          periodKey = `${yyyy}-${mm}-${dd}T${HH}:00`;
          break;
        }
        case 'timerange': {
          const rangeMinutes = Math.max(1, Number(this.exportTimeRangeMinutes || 60));
          const bucketMs = rangeMinutes * 60 * 1000;
          const bucketStart = Math.floor(date.getTime() / bucketMs) * bucketMs;
          const d = new Date(bucketStart);
          const yyyy = d.getFullYear();
          const mm = (d.getMonth() + 1).toString().padStart(2, '0');
          const dd = d.getDate().toString().padStart(2, '0');
          const HH = d.getHours().toString().padStart(2, '0');
          const MM = d.getMinutes().toString().padStart(2, '0');
          // Inclure la durée pour désambiguïser les clés
          periodKey = `${yyyy}-${mm}-${dd}T${HH}:${MM}-R${rangeMinutes}`;
          break;
        }
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
      case 'hour': {
        // key: YYYY-MM-DDTHH:00
        const [datePart, timePart] = key.split('T');
        const [hour] = (timePart || '00:00').split(':');
        const d = new Date(datePart + 'T' + hour.padStart(2, '0') + ':00:00');
        const ddmmyyyy = d.toLocaleDateString('fr-FR');
        return `${ddmmyyyy} ${hour.padStart(2, '0')}:00`;
      }
      case 'timerange': {
        // key: YYYY-MM-DDTHH:MM-R{minutes}
        const [left, rPart] = key.split('-R');
        const minutes = parseInt(rPart || '60', 10);
        const start = new Date(left.replace(' ', 'T'));
        const end = new Date(start.getTime() + Math.max(1, minutes) * 60 * 1000);
        const pad = (n: number) => n.toString().padStart(2, '0');
        const startLabel = `${start.toLocaleDateString('fr-FR')} ${pad(start.getHours())}:${pad(start.getMinutes())}`;
        const endLabel = `${pad(end.getHours())}:${pad(end.getMinutes())}`;
        return `${startLabel} - ${endLabel} (${Math.max(1, minutes)} min)`;
      }
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
        { pattern: /^\d{4}-\d{2}-\d{2}$/, name: 'YYYY-MM-DD', parser: (str: string) => new Date(str) },
        { pattern: /^\d{2}\/\d{2}\/\d{4}$/, name: 'DD/MM/YYYY', parser: (str: string) => {
          const [day, month, year] = str.split('/');
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }},
        { pattern: /^\d{2}-\d{2}-\d{4}$/, name: 'DD-MM-YYYY', parser: (str: string) => {
          const [day, month, year] = str.split('-');
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }},
        { pattern: /^\d{4}\/\d{2}\/\d{2}$/, name: 'YYYY/MM/DD', parser: (str: string) => {
          const [year, month, day] = str.split('/');
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }},
        { pattern: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, name: 'ISO DateTime', parser: (str: string) => new Date(str) },
        { pattern: /^\d{1,2}\/\d{1,2}\/\d{4}$/, name: 'D/M/YYYY ou DD/MM/YYYY', parser: (str: string) => {
          const [day, month, year] = str.split('/');
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }},
        { pattern: /^\d{1,2}-\d{1,2}-\d{4}$/, name: 'D-M-YYYY ou DD-MM-YYYY', parser: (str: string) => {
          const [day, month, year] = str.split('-');
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }},
        { pattern: /^\d{4}-\d{1,2}-\d{1,2}$/, name: 'YYYY-M-D ou YYYY-MM-DD', parser: (str: string) => {
          const [year, month, day] = str.split('-');
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }},
        { pattern: /^\d{1,2}\/\d{1,2}\/\d{2}$/, name: 'D/M/YY ou DD/MM/YY', parser: (str: string) => {
          const [day, month, year] = str.split('/');
          const fullYear = parseInt(year) < 50 ? 2000 + parseInt(year) : 1900 + parseInt(year);
          return new Date(fullYear, parseInt(month) - 1, parseInt(day));
        }},
        { pattern: /^\d{1,2}-\d{1,2}-\d{2}$/, name: 'D-M-YY ou DD-MM-YY', parser: (str: string) => {
          const [day, month, year] = str.split('-');
          const fullYear = parseInt(year) < 50 ? 2000 + parseInt(year) : 1900 + parseInt(year);
          return new Date(fullYear, parseInt(month) - 1, parseInt(day));
        }},
      ];

      for (const format of formats) {
        if (format.pattern.test(trimmedValue)) {
          try {
            const parsed = format.parser(trimmedValue);
            if (!isNaN(parsed.getTime())) {
              if (Math.random() < 0.01) { // 1% des cas seulement
                console.log(`✅ Date parsée avec le format ${format.name}: "${trimmedValue}" -> ${parsed.toISOString()}`);
              }
              return parsed;
            }
          } catch (error) {
            // Continue avec le format suivant
            continue;
          }
        }
      }

      // Essayer de parser directement
      try {
        const parsed = new Date(trimmedValue);
        if (!isNaN(parsed.getTime())) {
          if (Math.random() < 0.01) { // 1% des cas seulement
            console.log(`✅ Date parsée directement: "${trimmedValue}" -> ${parsed.toISOString()}`);
          }
          return parsed;
        }
      } catch (error) {
        // Ignore l'erreur et continue
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
    this.exportDateFormat = 'xlsx';
    this.exportDatePrefix = 'export';
    this.exportTimeRangeMinutes = 60;
    this.detectedPeriods = [];
    this.successMsg.exportDate = '';
    this.errorMsg.exportDate = '';
  }
} 