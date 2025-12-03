import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ReconciliationResponse, Match } from '../../models/reconciliation-response.model';
import { AppStateService } from '../../services/app-state.service';
import { ExportOptimizationService, ExportProgress } from '../../services/export-optimization.service';
import { PopupService } from '../../services/popup.service';

@Component({
  selector: 'app-matches-table',
  templateUrl: './matches-table.component.html',
  styleUrls: ['./matches-table.component.scss']
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
          this.filteredMatches = response.matches || [];
          this.initializeColumns();
          this.applyFilters();
        }
      })
    );
    
    // Fermer le menu en cliquant en dehors
    document.addEventListener('click', this.handleDocumentClick.bind(this));
  }
  
  private handleDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.export-menu-container')) {
      this.showExportMenu = false;
      this.cdr.detectChanges();
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    if (this.exportSubscription) {
      this.exportSubscription.unsubscribe();
    }
    document.removeEventListener('click', this.handleDocumentClick.bind(this));
  }

  private initializeColumns(): void {
    if (this.filteredMatches.length > 0) {
      const boKeysSet = new Set<string>();
      const partnerKeysSet = new Set<string>();
      
      // Parcourir tous les matches pour collecter toutes les colonnes possibles
      this.filteredMatches.forEach(match => {
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
    this.cdr.detectChanges();
  }
  
  setViewMode(mode: 'BO' | 'PARTNER'): void {
    this.viewMode = mode;
    this.updateDisplayedColumns();
    this.currentPage = 1;
    this.cdr.detectChanges();
  }

  onSearch(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  private applyFilters(): void {
    let filtered = [...this.filteredMatches];
    
    // Appliquer la recherche
    if (this.searchKey.trim()) {
      const searchLower = this.searchKey.toLowerCase();
      filtered = filtered.filter(match => {
        const keyMatch = match.key?.toLowerCase().includes(searchLower);
        const boMatch = Object.values(match.boData || {}).some(val => 
          String(val).toLowerCase().includes(searchLower)
        );
        const partnerMatch = Object.values(match.partnerData || {}).some(val => 
          String(val).toLowerCase().includes(searchLower)
        );
        return keyMatch || boMatch || partnerMatch;
      });
    }
    
    this.displayedMatches = filtered;
    this.totalPages = Math.max(1, Math.ceil(this.displayedMatches.length / this.pageSize));
    this.updatePageData();
  }

  private updatePageData(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    // Les données sont déjà filtrées dans displayedMatches
    this.cdr.detectChanges();
  }

  getPagedMatches(): Match[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.displayedMatches.slice(start, end);
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.cdr.detectChanges();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.cdr.detectChanges();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.cdr.detectChanges();
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
    this.cdr.detectChanges();
    
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
    this.cdr.detectChanges();
  }
  
  closeColumnSelector(): void {
    this.showColumnSelector = false;
    this.cdr.detectChanges();
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
      this.cdr.detectChanges();

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
        this.cdr.detectChanges();

        if (progress.isComplete) {
          this.isExporting = false;
          if (progress.message.includes('✅')) {
            this.popupService.showSuccess('Export réussi !');
          } else if (progress.message.includes('Erreur')) {
            this.popupService.showError('Erreur lors de l\'export');
          }
          this.cdr.detectChanges();
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
      this.cdr.detectChanges();
    }
  }

  goBack(): void {
    this.router.navigate(['/results']);
  }
}
