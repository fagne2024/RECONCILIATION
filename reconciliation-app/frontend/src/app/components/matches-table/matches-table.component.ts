import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ReconciliationResponse, Match } from '../../models/reconciliation-response.model';
import { AppStateService } from '../../services/app-state.service';
import { ExportOptimizationService, ExportProgress } from '../../services/export-optimization.service';
import { PopupService } from '../../services/popup.service';
import { fixGarbledCharacters } from '../../utils/encoding-fixer';

@Component({
  selector: 'app-matches-table',
  templateUrl: './matches-table.component.html',
  styleUrls: ['./matches-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MatchesTableComponent implements OnInit, OnDestroy {
  response: ReconciliationResponse | null = null;
  filteredMatches: Match[] = [];
  displayedMatches: Match[] = [];
  private subscription = new Subscription();
  
  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalPages = 1;
  
  // Recherche
  searchKey: string = '';
  
  // Colonnes du tableau
  allColumns: string[] = [];
  displayedColumns: string[] = [];
  boColumns: string[] = [];
  partnerColumns: string[] = [];
  
  // Optimisation : chargement progressif
  isLoading = false;
  loadProgress = 0;
  private searchIndex: Map<string, Set<number>> = new Map(); // Index de recherche pour performance
  
  // Affichage BO ou Partenaire
  viewMode: 'BO' | 'PARTNER' = 'BO';
  
  // Sélection de colonnes pour export
  showColumnSelector = false;
  selectedColumnsForExport: { [key: string]: boolean } = {};
  availableColumnsForExport: string[] = [];
  
  // Export
  isExporting = false;
  exportProgress: ExportProgress = {
    current: 0,
    total: 0,
    percentage: 0,
    message: '',
    isComplete: false
  };
  private exportSubscription?: Subscription;
  
  // Menu dropdown
  showExportMenu = false;
  
  constructor(
    private appStateService: AppStateService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private exportOptimizationService: ExportOptimizationService,
    private popupService: PopupService
  ) {}

  ngOnInit(): void {
    this.subscription.add(
      this.appStateService.getReconciliationResults().subscribe((response: ReconciliationResponse | null) => {
        if (response) {
          this.response = response;
          this.loadMatchesProgressively(response.matches || []);
        }
      })
    );
    
    // Fermer le menu en cliquant en dehors
    document.addEventListener('click', this.handleDocumentClick.bind(this));
  }
  
  private async loadMatchesProgressively(matches: Match[]): Promise<void> {
    this.isLoading = true;
    this.loadProgress = 0;
    this.cdr.markForCheck();
    
    try {
      // Filtrer les correspondances pour OPPART avant le chargement progressif
      let filteredMatches = matches;
      if (this.isTRXBOOPPARTReconciliation(matches)) {
        console.log('🔍 Filtrage OPPART: Début du filtrage des correspondances');
        console.log(`📊 Nombre initial de correspondances: ${matches.length}`);
        filteredMatches = matches.filter(match => {
          if (!match.partnerData) {
            return false;
          }
          const typeOperation = this.getTypeOperation(match.partnerData);
          if (!typeOperation) {
            return false;
          }
          // Exclure explicitement FRAIS_TRANSACTION
          if (typeOperation.includes('FRAIS_TRANSACTION')) {
            console.log(`❌ Correspondance ${match.key} exclue (FRAIS_TRANSACTION):`, typeOperation);
            return false;
          }
          // Ne garder que les lignes avec IMPACT_COMPTIMPACT-COMPTE-GENERAL
          const shouldKeep = typeOperation.includes('IMPACT_COMPTIMPACT-COMPTE-GENERAL');
          if (shouldKeep) {
            console.log(`✅ Correspondance ${match.key} conservée (IMPACT_COMPTIMPACT-COMPTE-GENERAL):`, typeOperation);
          }
          return shouldKeep;
        });
        console.log(`📊 Nombre de correspondances après filtrage OPPART: ${filteredMatches.length} (${matches.length - filteredMatches.length} exclues)`);
      }
      
      const total = filteredMatches.length;
      
      if (total === 0) {
        this.filteredMatches = [];
        this.displayedMatches = [];
        return;
      }

      // Charger immédiatement un échantillon pour l'initialisation rapide
      const sampleSize = Math.min(100, total);
      const sample = filteredMatches.slice(0, sampleSize);
      this.filteredMatches = [...sample];
      this.loadProgress = 5;
      this.initializeColumnsOptimized(sample);
      this.buildSearchIndex(sample);
      this.applyFilters();
      this.cdr.markForCheck();
      
      // Permettre au navigateur de mettre à jour l'UI
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Charger le reste par chunks pour un feedback régulier
      const chunkSize = 500;
      for (let i = sampleSize; i < total; i += chunkSize) {
        const chunk = matches.slice(i, Math.min(i + chunkSize, total));
        this.filteredMatches.push(...chunk);
        this.buildSearchIndex(chunk, i); // Construire l'index pour ce chunk
        this.loadProgress = Math.round(((i + chunk.length) / total) * 95 + 5); // 5-100%
        this.cdr.markForCheck();
        
        // Permettre au navigateur de mettre à jour l'UI
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      // Réappliquer les filtres avec toutes les données
      this.applyFilters();
    } finally {
      this.isLoading = false;
      this.loadProgress = 100;
      this.cdr.markForCheck();
    }
  }
  
  private buildSearchIndex(matches: Match[], startIndex: number = 0): void {
    matches.forEach((match, localIndex) => {
      const globalIndex = startIndex + localIndex;
      const searchableText = [
        match.key || '',
        ...Object.values(match.boData || {}),
        ...Object.values(match.partnerData || {})
      ].map(val => String(val).toLowerCase()).join(' ');
      
      // Indexer chaque mot
      const words = searchableText.split(/\s+/).filter(w => w.length > 2);
      words.forEach(word => {
        if (!this.searchIndex.has(word)) {
          this.searchIndex.set(word, new Set());
        }
        this.searchIndex.get(word)!.add(globalIndex);
      });
    });
  }
  
  private handleDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.export-menu-container')) {
      this.showExportMenu = false;
      this.cdr.markForCheck();
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    if (this.exportSubscription) {
      this.exportSubscription.unsubscribe();
    }
    document.removeEventListener('click', this.handleDocumentClick.bind(this));
  }

  private initializeColumnsOptimized(sampleMatches: Match[]): void {
    if (sampleMatches.length === 0) return;
    
    const boKeysSet = new Set<string>();
    const partnerKeysSet = new Set<string>();
    
    // Optimisation : ne parcourir qu'un échantillon représentatif (max 100 matches)
    const sampleSize = Math.min(100, sampleMatches.length);
    const sample = sampleMatches.slice(0, sampleSize);
    
    sample.forEach(match => {
      // Collecter les clés BO
      if (match.boData) {
        Object.keys(match.boData).forEach(key => boKeysSet.add(key));
      }
      
      // Collecter les clés partenaire depuis partnerData (peut avoir des suffixes _PARTNER_X)
      if (match.partnerData) {
        Object.keys(match.partnerData).forEach(key => {
          // Enlever le suffixe _PARTNER_X pour obtenir la clé de base
          const baseKey = key.replace(/_PARTNER_\d+$/, '');
          partnerKeysSet.add(baseKey);
        });
      }
      
      // Collecter les clés partenaire depuis partnerDataList
      if (match.partnerDataList && match.partnerDataList.length > 0) {
        match.partnerDataList.forEach(partnerRecord => {
          if (partnerRecord) {
            Object.keys(partnerRecord).forEach(key => {
              partnerKeysSet.add(key);
            });
          }
        });
      }
    });
    
    const boKeys = Array.from(boKeysSet);
    const partnerKeys = Array.from(partnerKeysSet);
    
    // Séparer les colonnes BO et Partenaire
    this.boColumns = boKeys.map(key => `BO_${key}`);
    this.partnerColumns = partnerKeys.map(key => `PARTNER_${key}`);
    
    // Créer des colonnes uniques avec préfixes pour l'affichage
    const allKeys = new Set<string>();
    boKeys.forEach(key => allKeys.add(`BO_${key}`));
    partnerKeys.forEach(key => allKeys.add(`PARTNER_${key}`));
    
    this.allColumns = Array.from(allKeys);
    
    // Colonnes disponibles pour l'export (toutes)
    this.availableColumnsForExport = ['Clé', 'Statut', ...this.allColumns.map(col => this.getColumnLabel(col))];
    
    // Initialiser la sélection pour l'export (toutes sélectionnées par défaut)
    this.availableColumnsForExport.forEach(col => {
      this.selectedColumnsForExport[col] = true;
    });
    
    // Afficher les colonnes selon le mode
    this.updateDisplayedColumns();
  }
  
  private updateDisplayedColumns(): void {
    if (this.viewMode === 'BO') {
      // Afficher les 10 premières colonnes BO
      this.displayedColumns = this.boColumns.slice(0, 10);
    } else {
      // Afficher TOUTES les colonnes partenaire
      this.displayedColumns = this.partnerColumns;
    }
  }
  
  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'BO' ? 'PARTNER' : 'BO';
    this.updateDisplayedColumns();
    this.currentPage = 1;
    this.cdr.markForCheck();
  }
  
  setViewMode(mode: 'BO' | 'PARTNER'): void {
    this.viewMode = mode;
    this.updateDisplayedColumns();
    this.currentPage = 1;
    this.cdr.markForCheck();
  }

  onSearch(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  private applyFilters(): void {
    let filtered = [...this.filteredMatches];
    
    // Appliquer la recherche de manière optimisée avec index
    if (this.searchKey.trim()) {
      const searchLower = this.searchKey.toLowerCase();
      const searchTerms = searchLower.split(/\s+/).filter(term => term.length > 2); // Ignorer les mots trop courts
      
      if (searchTerms.length > 0 && this.searchIndex.size > 0) {
        // Utiliser l'index pour une recherche rapide
        const matchingIndices = new Set<number>();
        
        // Pour chaque terme, trouver les indices correspondants
        searchTerms.forEach(term => {
          const termMatches = new Set<number>();
          
          // Chercher dans l'index
          this.searchIndex.forEach((indices, indexedWord) => {
            if (indexedWord.includes(term)) {
              indices.forEach(idx => termMatches.add(idx));
            }
          });
          
          // Si c'est le premier terme, initialiser avec ses résultats
          if (matchingIndices.size === 0) {
            termMatches.forEach(idx => matchingIndices.add(idx));
          } else {
            // Intersection : garder seulement les indices présents dans les deux sets
            const intersection = new Set<number>();
            termMatches.forEach(idx => {
              if (matchingIndices.has(idx)) {
                intersection.add(idx);
              }
            });
            matchingIndices.clear();
            intersection.forEach(idx => matchingIndices.add(idx));
          }
        });
        
        // Filtrer selon les indices trouvés
        if (matchingIndices.size > 0) {
          filtered = filtered.filter((_, index) => matchingIndices.has(index));
        } else {
          // Fallback : recherche classique si l'index ne trouve rien
          filtered = filtered.filter(match => {
            const searchableText = [
              match.key || '',
              ...Object.values(match.boData || {}),
              ...Object.values(match.partnerData || {})
            ].map(val => String(val).toLowerCase()).join(' ');
            
            return searchTerms.every(term => searchableText.includes(term));
          });
        }
      } else if (searchTerms.length > 0) {
        // Fallback : recherche classique si pas d'index
        filtered = filtered.filter(match => {
          const searchableText = [
            match.key || '',
            ...Object.values(match.boData || {}),
            ...Object.values(match.partnerData || {})
          ].map(val => String(val).toLowerCase()).join(' ');
          
          return searchTerms.every(term => searchableText.includes(term));
        });
      }
    }
    
    this.displayedMatches = filtered;
    this.totalPages = Math.max(1, Math.ceil(this.displayedMatches.length / this.pageSize));
    
    // Réinitialiser à la première page si nécessaire
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }
    
    this.cdr.markForCheck();
  }

  getPagedMatches(): Match[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.displayedMatches.slice(start, end);
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.cdr.markForCheck();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.cdr.markForCheck();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.cdr.markForCheck();
    }
  }

  getValue(match: Match, column: string): string {
    const [prefix, ...keyParts] = column.split('_');
    const key = keyParts.join('_');
    
    if (prefix === 'BO') {
      return match.boData?.[key] || '';
    } else if (prefix === 'PARTNER') {
      // Essayer d'abord dans partnerData (peut avoir des suffixes _PARTNER_X)
      if (match.partnerData) {
        // Chercher la clé exacte
        if (match.partnerData[key]) {
          return match.partnerData[key];
        }
        // Chercher avec différents suffixes
        for (let i = 1; i <= 10; i++) {
          const suffixedKey = `${key}_PARTNER_${i}`;
          if (match.partnerData[suffixedKey]) {
            return match.partnerData[suffixedKey];
          }
        }
      }
      
      // Essayer dans partnerDataList
      if (match.partnerDataList && match.partnerDataList.length > 0) {
        // Prendre la valeur du premier enregistrement partenaire
        const firstPartner = match.partnerDataList[0];
        if (firstPartner && firstPartner[key]) {
          return firstPartner[key];
        }
      }
      
      return '';
    }
    return '';
  }

  getColumnLabel(column: string): string {
    const [prefix, ...keyParts] = column.split('_');
    return `${prefix}: ${keyParts.join('_')}`;
  }

  hasDifferences(match: Match): boolean {
    return match.differences && match.differences.length > 0 && 
           match.differences.some(diff => diff.different);
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);
    
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  toggleExportMenu(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.showExportMenu = !this.showExportMenu;
    this.cdr.markForCheck();
    
    if (this.showExportMenu) {
      // Attendre que le DOM soit mis à jour pour positionner le menu
      setTimeout(() => {
        this.positionDropdown();
      }, 10);
    }
  }
  
  private positionDropdown(): void {
    const button = document.querySelector('.export-menu-button') as HTMLElement;
    const dropdown = document.querySelector('.export-menu-dropdown') as HTMLElement;
    
    if (button && dropdown) {
      const rect = button.getBoundingClientRect();
      dropdown.style.top = `${rect.bottom + window.scrollY + 8}px`;
      dropdown.style.left = `${rect.right - dropdown.offsetWidth}px`;
    }
  }
  
  openColumnSelector(): void {
    this.showColumnSelector = true;
    this.showExportMenu = false;
    this.cdr.markForCheck();
  }
  
  closeColumnSelector(): void {
    this.showColumnSelector = false;
    this.cdr.markForCheck();
  }
  
  toggleAllColumns(select: boolean): void {
    this.availableColumnsForExport.forEach(col => {
      this.selectedColumnsForExport[col] = select;
    });
  }
  
  get selectedColumnsCount(): number {
    return Object.values(this.selectedColumnsForExport).filter(v => v).length;
  }
  
  async exportResults(): Promise<void> {
    if (this.displayedMatches.length === 0) {
      this.popupService.showError('Aucune donnée à exporter');
      return;
    }

    try {
      this.isExporting = true;
      this.exportProgress = {
        current: 0,
        total: this.displayedMatches.length,
        percentage: 0,
        message: 'Préparation de l\'export...',
        isComplete: false
      };
      this.showExportMenu = false;
      this.cdr.markForCheck();

      // Préparer les colonnes sélectionnées
      const selectedCols = this.availableColumnsForExport.filter(col => this.selectedColumnsForExport[col]);
      const columns = selectedCols;
      
      // Préparer les lignes avec les colonnes sélectionnées
      const rows = this.displayedMatches.map(match => {
        const row: any = {};
        
        selectedCols.forEach(col => {
          if (col === 'Clé') {
            row[col] = match.key;
          } else if (col === 'Statut') {
            row[col] = this.hasDifferences(match) ? '⚠️ Différences' : '✅ OK';
          } else {
            // Trouver la colonne correspondante dans allColumns
            const columnKey = this.allColumns.find(c => this.getColumnLabel(c) === col);
            if (columnKey) {
              row[col] = this.getValue(match, columnKey);
            }
          }
        });
        
        return row;
      });

      const fileName = `correspondances_${this.viewMode}_${new Date().toISOString().split('T')[0]}.xlsx`;
      const isLargeDataset = rows.length > 5000;

      // S'abonner à la progression
      if (this.exportSubscription) {
        this.exportSubscription.unsubscribe();
      }

      this.exportSubscription = this.exportOptimizationService.exportProgress$.subscribe(progress => {
        this.exportProgress = progress;
        this.cdr.markForCheck();

        if (progress.isComplete) {
          this.isExporting = false;
          if (progress.message.includes('✅')) {
            this.popupService.showSuccess('Export réussi !');
          } else if (progress.message.includes('Erreur')) {
            this.popupService.showError('Erreur lors de l\'export');
          }
          this.cdr.markForCheck();
        }
      });

      // Lancer l'export optimisé
      if (isLargeDataset) {
        await this.exportOptimizationService.exportExcelOptimized(rows, columns, fileName, {
          chunkSize: 3000,
          useWebWorker: true,
          enableCompression: true
        });
      } else {
        await this.exportOptimizationService.exportExcelOptimized(rows, columns, fileName, {
          chunkSize: 2000,
          useWebWorker: false
        });
      }

    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      this.isExporting = false;
      this.popupService.showError('Erreur lors de l\'export des correspondances');
      this.cdr.markForCheck();
    }
  }

  // Calculer le volume total des correspondances
  calculateTotalVolume(): number {
    return this.filteredMatches.reduce((total, match) => {
      // Essayer de trouver le montant/volume dans les données BO
      const boData = match.boData || {};
      const volumeKeys = ['montant', 'Montant', 'MONTANT', 'Volume', 'volume', 'amount', 'Amount'];
      
      for (const key of volumeKeys) {
        const originalKey = this.getOriginalKey(boData, key);
        if (boData[originalKey]) {
          const value = parseFloat(String(boData[originalKey]));
          if (!isNaN(value)) {
            return total + value;
          }
        }
      }
      
      // Essayer dans les données partenaire si pas trouvé dans BO
      const partnerData = match.partnerData || {};
      for (const key of volumeKeys) {
        const originalKey = this.getOriginalKey(partnerData, key);
        if (partnerData[originalKey]) {
          const value = parseFloat(String(partnerData[originalKey]));
          if (!isNaN(value)) {
            return total + value;
          }
        }
      }
      
      return total;
    }, 0);
  }

  private getOriginalKey(record: Record<string, any>, correctedKey: string): string {
    const keys = Object.keys(record);
    return keys.find(key => fixGarbledCharacters(key) === correctedKey) || correctedKey;
  }

  /**
   * Vérifie si les matches correspondent à une réconciliation TRXBO/OPPART
   */
  private isTRXBOOPPARTReconciliation(matches: Match[]): boolean {
    if (!matches || matches.length === 0) {
      return false;
    }

    let hasTRXBO = false;
    let hasOPPART = false;

    // Vérifier dans les données BO pour TRXBO
    for (const match of matches) {
      if (match.boData) {
        // Vérifier les valeurs pour "TRXBO"
        const boValues = Object.values(match.boData).join(' ').toUpperCase();
        if (boValues.includes('TRXBO')) {
          hasTRXBO = true;
          break;
        }
        // Vérifier les colonnes spécifiques TRXBO
        const boKeys = Object.keys(match.boData);
        if (boKeys.some(key => ['IDTransaction', 'téléphone client', 'telephone client', 'GRX'].includes(key))) {
          hasTRXBO = true;
          break;
        }
      }
    }

    // Vérifier dans les données partenaire pour OPPART
    for (const match of matches) {
      if (match.partnerData) {
        // Vérifier les valeurs pour "OPPART"
        const partnerValues = Object.values(match.partnerData).join(' ').toUpperCase();
        if (partnerValues.includes('OPPART')) {
          hasOPPART = true;
          break;
        }
        // Vérifier les colonnes spécifiques OPPART
        const partnerKeys = Object.keys(match.partnerData);
        if (partnerKeys.some(key => ['ID Opération', 'Type Opération', 'Type Operation', 'Solde avant', 'Solde après', 'Solde aprés', 'Numéro Trans GU', 'Numero Trans GU'].includes(key))) {
          hasOPPART = true;
          break;
        }
      }
    }

    return hasTRXBO && hasOPPART;
  }

  /**
   * Extrait le type d'opération depuis les données partenaire
   */
  private getTypeOperation(partnerData: Record<string, any>): string {
    if (!partnerData) {
      return '';
    }

    const possibleKeys = [
      'Type Opération',
      'Type Opration', // Avec caractères d'encodage
      'type operation',
      'type_operation',
      'typeOperation',
      'TYPE_OPERATION',
      'TypeOperation',
      'Operation',
      'operation'
    ];

    for (const key of possibleKeys) {
      if (partnerData[key] !== undefined && partnerData[key] !== null && partnerData[key] !== '') {
        return partnerData[key].toString();
      }
    }

    return '';
  }

  goBack(): void {
    this.router.navigate(['/results']);
  }
}
