import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ReconciliationResponse } from '../../models/reconciliation-response.model';
import { AppStateService } from '../../services/app-state.service';
import { ExportOptimizationService, ExportProgress } from '../../services/export-optimization.service';
import { PopupService } from '../../services/popup.service';
import { EcartSoldeService } from '../../services/ecart-solde.service';
import { TrxSfService } from '../../services/trx-sf.service';
import { EcartSolde } from '../../models/ecart-solde.model';
import { TrxSfData } from '../../services/trx-sf.service';
import { fixGarbledCharacters } from '../../utils/encoding-fixer';

@Component({
  selector: 'app-ecart-bo-table',
  templateUrl: './ecart-bo-table.component.html',
  styleUrls: ['./ecart-bo-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EcartBoTableComponent implements OnInit, OnDestroy {
  response: ReconciliationResponse | null = null;
  filteredBoOnly: Record<string, string>[] = [];
  displayedBoOnly: Record<string, string>[] = [];
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
  
  // Sélection de colonnes pour export
  showColumnSelector = false;
  selectedColumnsForExport: { [key: string]: boolean } = {};
  availableColumnsForExport: string[] = [];
  
  // Sélection de lignes
  selectedBoOnlyKeys: string[] = [];
  
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
  
  // Sauvegarde
  isSavingEcartBo = false;
  isSavingEcartBoToTrxSf = false;
  
  // Chargement progressif
  isLoading = false;
  loadProgress = 0;
  
  constructor(
    private appStateService: AppStateService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private exportOptimizationService: ExportOptimizationService,
    private popupService: PopupService,
    private ecartSoldeService: EcartSoldeService,
    private trxSfService: TrxSfService
  ) {}

  ngOnInit(): void {
    this.subscription.add(
      this.appStateService.getReconciliationResults().subscribe((response: ReconciliationResponse | null) => {
        if (response) {
          this.response = response;
          this.loadBoOnly();
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

  private async loadBoOnly(): Promise<void> {
    this.isLoading = true;
    this.loadProgress = 0;
    this.cdr.markForCheck();
    
    try {
      const mismatches = this.response?.mismatches || [];
      const boOnly = this.response?.boOnly || [];
      const allData = [...mismatches, ...boOnly];
      const total = allData.length;
      
      if (total === 0) {
        this.filteredBoOnly = [];
        this.isLoading = false;
        this.loadProgress = 100;
        this.initializeColumns();
        this.applyFilters();
        this.cdr.markForCheck();
        return;
      }

      // Chargement progressif par chunks pour éviter de bloquer l'UI
      // Utiliser des chunks plus petits pour un feedback plus rapide
      const chunkSize = 500; // Chunks plus petits pour un feedback plus rapide
      this.filteredBoOnly = [];
      
      // Charger immédiatement un petit échantillon pour l'initialisation rapide
      if (allData.length > 0) {
        const sampleSize = Math.min(50, total);
        const sample = allData.slice(0, sampleSize);
        this.filteredBoOnly.push(...sample);
        this.loadProgress = 2;
        this.initializeColumns();
        this.applyFilters();
        this.cdr.markForCheck();
        
        // Permettre au navigateur de mettre à jour l'UI immédiatement
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      // Charger le reste par chunks pour un feedback régulier
      for (let i = 50; i < total; i += chunkSize) {
        const chunk = allData.slice(i, Math.min(i + chunkSize, total));
        this.filteredBoOnly.push(...chunk);
        this.loadProgress = Math.round(((i + chunk.length) / total) * 98 + 2); // 2-100%
        
        // Réappliquer les filtres seulement tous les 3 chunks pour optimiser
        if ((i / chunkSize) % 3 === 0) {
          this.applyFilters();
        }
        
        this.cdr.markForCheck();
        
        // Permettre au navigateur de mettre à jour l'UI
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      // Finaliser les filtres une dernière fois
      this.applyFilters();
      
      // Finaliser
      this.loadProgress = 100;
      this.applyFilters();
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  private initializeColumns(): void {
    if (this.filteredBoOnly.length > 0) {
      const allKeysSet = new Set<string>();
      
      // Optimiser : parcourir seulement les premiers enregistrements pour détecter les colonnes
      // Les colonnes sont généralement les mêmes dans tous les enregistrements
      const sampleSize = Math.min(100, this.filteredBoOnly.length);
      for (let i = 0; i < sampleSize; i++) {
        Object.keys(this.filteredBoOnly[i]).forEach(key => {
          const correctedKey = fixGarbledCharacters(key);
          allKeysSet.add(correctedKey);
        });
      }
      
      // Si on a déjà toutes les colonnes, pas besoin de continuer
      // Sinon, parcourir le reste (cas rare)
      if (sampleSize < this.filteredBoOnly.length) {
        for (let i = sampleSize; i < this.filteredBoOnly.length; i++) {
          Object.keys(this.filteredBoOnly[i]).forEach(key => {
            const correctedKey = fixGarbledCharacters(key);
            allKeysSet.add(correctedKey);
          });
        }
      }
      
      this.allColumns = Array.from(allKeysSet);
      this.displayedColumns = this.allColumns;
      
      // Colonnes disponibles pour l'export
      this.availableColumnsForExport = this.allColumns;
      
      // Initialiser la sélection pour l'export (toutes sélectionnées par défaut)
      this.availableColumnsForExport.forEach(col => {
        this.selectedColumnsForExport[col] = true;
      });
    }
  }

  onSearch(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  private applyFilters(): void {
    let filtered = [...this.filteredBoOnly];
    
    // Appliquer la recherche de manière optimisée
    if (this.searchKey.trim()) {
      const searchLower = this.searchKey.toLowerCase();
      const searchTerms = searchLower.split(/\s+/).filter(term => term.length > 0);
      
      filtered = filtered.filter(record => {
        // Créer une chaîne de recherche une seule fois par enregistrement
        const searchableText = Object.values(record)
          .map(val => String(val).toLowerCase())
          .join(' ');
        
        // Vérifier si tous les termes de recherche sont présents
        return searchTerms.every(term => searchableText.includes(term));
      });
    }
    
    this.displayedBoOnly = filtered;
    this.totalPages = Math.max(1, Math.ceil(this.displayedBoOnly.length / this.pageSize));
    
    // Réinitialiser à la première page si nécessaire
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }
    
    this.cdr.markForCheck();
  }

  getPagedBoOnly(): Record<string, string>[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.displayedBoOnly.slice(start, end);
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

  getValue(record: Record<string, string>, column: string): string {
    // Chercher la clé originale (peut être mal encodée)
    const originalKey = this.getOriginalKey(record, column);
    return record[originalKey] || '';
  }

  private getOriginalKey(record: Record<string, string>, correctedKey: string): string {
    const keys = Object.keys(record);
    return keys.find(key => fixGarbledCharacters(key) === correctedKey) || correctedKey;
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
      const scrollY = window.scrollY || window.pageYOffset;
      const scrollX = window.scrollX || window.pageXOffset;
      
      // Positionner le dropdown au-dessus des données (sous le bouton)
      dropdown.style.position = 'fixed';
      dropdown.style.top = `${rect.bottom + scrollY + 8}px`;
      dropdown.style.left = `${rect.right + scrollX - dropdown.offsetWidth}px`;
      dropdown.style.zIndex = '10004';
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

  // Sélection de lignes
  private getFromRecord(record: Record<string, string>, keys: string[]): string {
    for (const key of keys) {
      const originalKey = this.getOriginalKey(record, key);
      if (record[originalKey] !== undefined && record[originalKey] !== null && String(record[originalKey]).trim() !== '') {
        return String(record[originalKey]);
      }
      // Essayer aussi directement avec la clé
      if (record[key] !== undefined && record[key] !== null && String(record[key]).trim() !== '') {
        return String(record[key]);
      }
    }
    return '';
  }

  getBoOnlyKey(record: Record<string, string>): string {
    const parts = [
      this.getFromRecord(record, ['CLE', 'clé de réconciliation', 'cle_reconciliation', 'reconciliation_key', 'Key', 'key', 'ID', 'id']),
      this.getFromRecord(record, ['ID Opération', 'ID Operation', 'id_operation', 'idOperation', 'ID OPERATION']),
      this.getFromRecord(record, ['Numéro Trans GU', 'Numero Trans GU', 'numeroTransGU', 'numero_trans_gu']),
      this.getFromRecord(record, ['Référence', 'Reference', 'reference']),
      this.getFromRecord(record, ['Date opération', 'Date', 'dateOperation', 'date_operation', 'DATE']),
      this.getFromRecord(record, ['Montant', 'montant', 'amount', 'Amount', 'volume', 'Volume']),
      this.getFromRecord(record, ['Service', 'service', 'SERVICE']),
      this.getFromRecord(record, ['Agence', 'agence', 'AGENCE', 'agency'])
    ].map(value => value?.toString().trim()).filter(value => !!value);

    if (parts.length === 0) {
      return Object.values(record).join('|');
    }

    return parts.join('|');
  }

  isBoRecordSelected(record: Record<string, string>): boolean {
    const key = this.getBoOnlyKey(record);
    return this.selectedBoOnlyKeys.includes(key);
  }

  toggleBoSelection(record: Record<string, string>, event: any): void {
    const key = this.getBoOnlyKey(record);
    if (event.target.checked) {
      if (!this.selectedBoOnlyKeys.includes(key)) {
        this.selectedBoOnlyKeys.push(key);
      }
    } else {
      this.selectedBoOnlyKeys = this.selectedBoOnlyKeys.filter(k => k !== key);
    }
  }

  get allBoSelectedOnPage(): boolean {
    const pageRecords = this.getPagedBoOnly();
    return pageRecords.length > 0 && pageRecords.every(r => this.isBoRecordSelected(r));
  }

  toggleSelectAllBoOnPage(event: any): void {
    const pageRecords = this.getPagedBoOnly();
    if (event.target.checked) {
      pageRecords.forEach(record => {
        const key = this.getBoOnlyKey(record);
        if (!this.selectedBoOnlyKeys.includes(key)) {
          this.selectedBoOnlyKeys.push(key);
        }
      });
    } else {
      const pageKeys = pageRecords.map(r => this.getBoOnlyKey(r));
      this.selectedBoOnlyKeys = this.selectedBoOnlyKeys.filter(k => !pageKeys.includes(k));
    }
  }

  private getBoSelectionDataset(): Record<string, string>[] {
    if (this.filteredBoOnly && this.filteredBoOnly.length > 0) {
      return this.filteredBoOnly;
    }
    if (this.response?.boOnly && this.response.boOnly.length > 0) {
      return this.response.boOnly;
    }
    const mismatches = this.response?.mismatches || [];
    const boOnly = this.response?.boOnly || [];
    return [...mismatches, ...boOnly];
  }

  getBoRecordsForAction(): Record<string, string>[] {
    const dataset = this.getBoSelectionDataset();
    if (this.selectedBoOnlyKeys.length === 0) {
      return dataset;
    }
    const keySet = new Set(this.selectedBoOnlyKeys);
    return dataset.filter(record => keySet.has(this.getBoOnlyKey(record)));
  }

  getBoOnlyAgencyAndService(record: Record<string, string>): { agency: string; service: string; volume: number; date: string; country: string } {
    // Fonction helper pour trouver une valeur avec plusieurs noms de colonnes possibles
    const getValueWithFallback = (possibleKeys: string[]): string => {
      for (const key of possibleKeys) {
        const originalKey = this.getOriginalKey(record, key);
        if (record[originalKey] !== undefined && record[originalKey] !== null && record[originalKey] !== '') {
          return record[originalKey].toString();
        }
        // Essayer aussi directement avec la clé
        if (record[key] !== undefined && record[key] !== null && record[key] !== '') {
          return record[key].toString();
        }
      }
      return '';
    };

    // Recherche d'agence avec plusieurs noms possibles
    const agency = getValueWithFallback(['Agence', 'agence', 'AGENCE', 'agency', 'Agency', 'AGENCY']);
    
    // Recherche de service avec plusieurs noms possibles
    const service = getValueWithFallback(['Service', 'service', 'SERVICE', 'serv', 'Serv']);
    
    // Recherche de volume/montant avec plusieurs noms possibles
    const volumeStr = getValueWithFallback(['montant', 'Montant', 'MONTANT', 'amount', 'Amount', 'volume', 'Volume', 'VOLUME']);
    const volume = volumeStr ? parseFloat(volumeStr.toString().replace(',', '.')) : 0;
    
    // Recherche de date avec plusieurs noms possibles
    const date = getValueWithFallback(['Date', 'date', 'DATE', 'jour', 'Jour', 'JOUR', 'created', 'Created', 'CREATED']);
    
    // Recherche de pays (GRX doit être considéré comme PAYS)
    const country = getValueWithFallback(['GRX', 'grx', 'Pays', 'pays', 'PAYS', 'country', 'Country', 'COUNTRY']);

    return {
      agency,
      service,
      volume,
      date,
      country: country || 'Non spécifié'
    };
  }

  calculateTotalVolumeBoOnly(): number {
    return this.filteredBoOnly.reduce((total, record) => {
      const info = this.getBoOnlyAgencyAndService(record);
      return total + (info.volume || 0);
    }, 0);
  }

  async exportResults(): Promise<void> {
    if (this.displayedBoOnly.length === 0) {
      this.popupService.showError('Aucune donnée à exporter');
      return;
    }

    try {
      this.isExporting = true;
      this.exportProgress = {
        current: 0,
        total: this.displayedBoOnly.length,
        percentage: 0,
        message: 'Préparation de l\'export...',
        isComplete: false
      };
      this.showExportMenu = false;
      this.cdr.markForCheck();

      const selectedCols = this.availableColumnsForExport.filter(col => this.selectedColumnsForExport[col]);
      const columns = selectedCols;
      
      const rows = this.displayedBoOnly.map(record => {
        const row: any = {};
        selectedCols.forEach(col => {
          row[col] = this.getValue(record, col);
        });
        return row;
      });

      const fileName = `ecart_bo_${new Date().toISOString().split('T')[0]}.xlsx`;
      const isLargeDataset = rows.length > 5000;

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
      this.popupService.showError('Erreur lors de l\'export des écarts BO');
      this.cdr.markForCheck();
    }
  }

  async saveEcartBoToEcartSolde(): Promise<void> {
    const availableRecords = this.getBoSelectionDataset();
    if (availableRecords.length === 0) {
      this.popupService.showWarning('❌ Aucune donnée ECART BO à sauvegarder.');
      return;
    }

    const sourceRecords = this.getBoRecordsForAction();
    if (sourceRecords.length === 0) {
      this.popupService.showWarning('❌ Aucune ligne sélectionnée pour la sauvegarde.');
      return;
    }

    this.isSavingEcartBo = true;

    try {
      console.log('🔄 Début de la sauvegarde des ECART BO...');
      console.log('DEBUG: Nombre d\'enregistrements ECART BO (disponibles):', availableRecords.length);
      console.log('DEBUG: Nombre d\'enregistrements ECART BO (à sauvegarder):', sourceRecords.length);

      // Convertir les données ECART BO en format EcartSolde
      const ecartSoldeData: EcartSolde[] = sourceRecords.map((record, index) => {
        const getValueWithFallback = (keys: string[]): string => {
          for (const key of keys) {
            const originalKey = this.getOriginalKey(record, key);
            if (record[originalKey] !== undefined && record[originalKey] !== null && record[originalKey] !== '') {
              return record[originalKey].toString();
            }
            // Essayer aussi directement avec la clé
            if (record[key] !== undefined && record[key] !== null && record[key] !== '') {
              return record[key].toString();
            }
          }
          return '';
        };

        // Extraire les informations d'agence et de service
        const agencyInfo = this.getBoOnlyAgencyAndService(record);
        
        // Fonction helper pour convertir les dates (y compris format Excel) au format ISO
        const formatDateForBackend = (dateStr: string): string => {
          if (!dateStr) return '';
          
          // Si la date contient déjà des caractères de format date (tirets, T, espaces suivis de chiffres), ne pas traiter comme Excel
          if (dateStr.includes('-') || dateStr.includes('T') || /\d{4}/.test(dateStr)) {
            // Si la date est déjà au format ISO, la retourner
            if (dateStr.includes('T')) return dateStr;
            
            // Convertir le format "2025-07-09 12:40:18.0" en "2025-07-09T12:40:18"
            const cleanedDate = dateStr.replace(/\.\d+$/, ''); // Enlever les millisecondes
            return cleanedDate.replace(' ', 'T');
          }
          
          // Vérifier si c'est un numéro de série Excel pur (nombre décimal sans autre caractère)
          const numValue = parseFloat(dateStr);
          const numStr = numValue.toString();
          // Vérifier que la conversion en nombre et retour en string donne la même chose (ou presque)
          if (!isNaN(numValue) && numValue > 0 && numValue < 100000 && Math.abs(parseFloat(dateStr) - numValue) < 0.0001) {
            // C'est probablement un numéro de série Excel
            const excelEpoch = new Date(1900, 0, 1).getTime();
            const millisecondsPerDay = 86400000;
            const jsDate = new Date(excelEpoch + (numValue - 2) * millisecondsPerDay);
            console.log(`📅 Conversion Excel → JS: ${dateStr} → ${jsDate.toISOString()}`);
            return jsDate.toISOString();
          }
          
          // Par défaut, retourner la chaîne telle quelle
          return dateStr;
        };

        // Créer l'objet EcartSolde avec les données mappées
        const ecartSolde: EcartSolde = {
          id: undefined, // Sera généré par la base de données
          idTransaction: getValueWithFallback(['ID Transaction', 'IDTransaction', 'id_transaction', 'ID_TRANSACTION', 'transaction_id', 'TransactionId', 'ID', 'id', 'Id', 'CLE', 'clé de réconciliation', 'cle_reconciliation']),
          telephoneClient: getValueWithFallback(['t l phone client', 'téléphone client', 'telephone_client', 'TELEPHONE_CLIENT', 'phone', 'Phone', 'Telephone', 'telephone', 'Téléphone']),
          montant: parseFloat(getValueWithFallback(['montant', 'Montant', 'MONTANT', 'amount', 'Amount', 'volume', 'Volume'])) || 0,
          service: agencyInfo.service,
          agence: agencyInfo.agency,
          dateTransaction: formatDateForBackend(agencyInfo.date),
          numeroTransGu: getValueWithFallback(['Numero Trans GU', 'Numéro Trans GU', 'numero_trans_gu', 'NUMERO_TRANS_GU', 'transaction_number', 'TransactionNumber']),
          pays: agencyInfo.country,
          statut: 'EN_ATTENTE', // Statut par défaut
          commentaire: 'IMPACT J+1', // Commentaire par défaut
          dateImport: new Date().toISOString()
        };

        return ecartSolde;
      });

      console.log('DEBUG: Données converties en format EcartSolde:', ecartSoldeData.length, 'enregistrements');

      // Validation des données avant sauvegarde
      const validRecords = ecartSoldeData.filter(record => 
        record.idTransaction && 
        record.idTransaction.trim() !== '' && 
        record.agence && 
        record.agence.trim() !== ''
      );

      console.log('DEBUG: Nombre d\'enregistrements valides après filtrage:', validRecords.length);

      if (validRecords.length === 0) {
        console.error('DEBUG: Aucun enregistrement valide trouvé. Raisons possibles:');
        console.error('- idTransaction manquant ou vide');
        console.error('- agence manquante ou vide');
        console.error('- Colonnes non trouvées dans les données source');
        this.popupService.showWarning('❌ Aucune donnée valide trouvée pour la sauvegarde.');
        return;
      }

      // Afficher un message de confirmation avec les détails
      const selectionSummary = this.selectedBoOnlyKeys.length > 0
        ? `🎯 Lignes sélectionnées: ${sourceRecords.length}\n`
        : '';
      const message = `📋 RÉSUMÉ DES DONNÉES À SAUVEGARDER:\n\n` +
        `📊 Total des enregistrements ECART BO: ${availableRecords.length}\n` +
        selectionSummary +
        `✅ Enregistrements valides: ${validRecords.length}\n` +
        `❌ Enregistrements invalides: ${ecartSoldeData.length - validRecords.length}\n\n` +
        `📝 Commentaire par défaut: "IMPACT J+1"\n` +
        `🔄 Les doublons seront automatiquement ignorés.\n\n` +
        `Voulez-vous continuer avec la sauvegarde ?`;

      const confirmed = await this.popupService.showConfirm(message, 'Confirmation de sauvegarde');
      if (!confirmed) {
        console.log('❌ Sauvegarde annulée par l\'utilisateur');
        return;
      }

      console.log('✅ Confirmation utilisateur reçue, début de la sauvegarde...');
      
      // Sauvegarder les données via le service
      const result = await this.ecartSoldeService.createMultipleEcartSoldes(validRecords);
      
      console.log('=== RÉSULTATS DE LA SAUVEGARDE ===');
      console.log('DEBUG: Enregistrements reçus:', result.totalReceived);
      console.log('DEBUG: Enregistrements créés:', result.count);
      console.log('DEBUG: Doublons ignorés:', result.duplicates);
      console.log('DEBUG: Message:', result.message);
      
      // Afficher un message de succès détaillé
      let successMessage = `✅ SAUVEGARDE TERMINÉE AVEC SUCCÈS!\n\n`;
      successMessage += `📊 RÉSUMÉ:\n`;
      successMessage += `• Enregistrements traités: ${result.totalReceived}\n`;
      successMessage += `• Nouveaux enregistrements créés: ${result.count}\n`;
      successMessage += `• Doublons ignorés: ${result.duplicates}\n\n`;
      successMessage += `💾 Les données ont été sauvegardées dans la table Ecart Solde.`;
      
      this.popupService.showSuccess(successMessage);
      this.selectedBoOnlyKeys = [];
      this.cdr.markForCheck();
    } catch (error: any) {
      console.error('❌ Erreur lors de la sauvegarde des ECART BO:', error);
      
      let errorMessage = '❌ Erreur lors de la sauvegarde des ECART BO.\n\n';
      if (error.error?.error) {
        errorMessage += `Détails: ${error.error.error}`;
      } else if (error.message) {
        errorMessage += `Détails: ${error.message}`;
      } else {
        errorMessage += 'Veuillez réessayer.';
      }
      
      this.popupService.showError(errorMessage);
    } finally {
      this.isSavingEcartBo = false;
      this.cdr.markForCheck();
    }
  }

  async saveEcartBoToTrxSf(): Promise<void> {
    const availableRecords = this.getBoSelectionDataset();
    if (availableRecords.length === 0) {
      this.popupService.showWarning('❌ Aucune donnée ECART BO à sauvegarder dans TRX SF.');
      return;
    }

    const sourceRecords = this.getBoRecordsForAction();
    if (sourceRecords.length === 0) {
      this.popupService.showWarning('❌ Aucune ligne sélectionnée pour la sauvegarde.');
      return;
    }

    this.isSavingEcartBoToTrxSf = true;

    try {
      console.log('🔄 Début de la sauvegarde des ECART BO dans TRX SF...');
      console.log('DEBUG: Nombre d\'enregistrements ECART BO (disponibles):', availableRecords.length);
      console.log('DEBUG: Nombre d\'enregistrements ECART BO (à sauvegarder):', sourceRecords.length);

      // Convertir les données ECART BO en format TrxSfData avec récupération des frais
      const trxSfDataPromises = sourceRecords.map(async (record, index) => {
        const getValueWithFallback = (keys: string[]): string => {
          for (const key of keys) {
            const originalKey = this.getOriginalKey(record, key);
            if (record[originalKey] !== undefined && record[originalKey] !== null && record[originalKey] !== '') {
              return record[originalKey].toString();
            }
            // Essayer aussi directement avec la clé
            if (record[key] !== undefined && record[key] !== null && record[key] !== '') {
              return record[key].toString();
            }
          }
          return '';
        };

        // Extraire les informations d'agence et de service
        const agencyInfo = this.getBoOnlyAgencyAndService(record);
        
        // Fonction helper pour convertir les dates (y compris format Excel) au format ISO
        const formatDateForBackend = (dateStr: string): string => {
          if (!dateStr) return '';
          
          // Si la date contient déjà des caractères de format date (tirets, T, espaces suivis de chiffres), ne pas traiter comme Excel
          if (dateStr.includes('-') || dateStr.includes('T') || /\d{4}/.test(dateStr)) {
            // Si la date est déjà au format ISO, la retourner
            if (dateStr.includes('T')) return dateStr;
            
            // Convertir le format "2025-07-09 12:40:18.0" en "2025-07-09T12:40:18"
            const cleanedDate = dateStr.replace(/\.\d+$/, ''); // Enlever les millisecondes
            return cleanedDate.replace(' ', 'T');
          }
          
          // Vérifier si c'est un numéro de série Excel pur (nombre décimal sans autre caractère)
          const numValue = parseFloat(dateStr);
          const numStr = numValue.toString();
          // Vérifier que la conversion en nombre et retour en string donne la même chose (ou presque)
          if (!isNaN(numValue) && numValue > 0 && numValue < 100000 && Math.abs(parseFloat(dateStr) - numValue) < 0.0001) {
            // C'est probablement un numéro de série Excel
            const excelEpoch = new Date(1900, 0, 1).getTime();
            const millisecondsPerDay = 86400000;
            const jsDate = new Date(excelEpoch + (numValue - 2) * millisecondsPerDay);
            console.log(`📅 Conversion Excel → JS: ${dateStr} → ${jsDate.toISOString()}`);
            return jsDate.toISOString();
          }
          
          // Par défaut, retourner la chaîne telle quelle
          return dateStr;
        };

        // Calculer automatiquement les frais selon la configuration du service
        let frais = 0;
        try {
          // Récupérer la configuration des frais pour le service
          const fraisConfigResponse = await this.trxSfService.getFraisConfigByService(agencyInfo.service).toPromise();
          const fraisConfig = fraisConfigResponse;
          
          if (fraisConfig && fraisConfig.typeFrais) {
            if (fraisConfig.typeFrais === 'NOMINAL' || fraisConfig.typeFrais === 'FIXE') {
              // Frais fixe : on prend le montant configuré
              frais = fraisConfig.montant || 0;
              console.log(`💰 Frais fixe configuré pour ${agencyInfo.service}: ${frais}`);
            } else if (fraisConfig.typeFrais === 'POURCENTAGE') {
              // Frais en pourcentage : on applique le pourcentage sur le montant
              const pourcentage = fraisConfig.pourcentage || 0;
              frais = (agencyInfo.volume * pourcentage) / 100;
              console.log(`📊 Frais pourcentage configuré pour ${agencyInfo.service}: ${pourcentage}% sur ${agencyInfo.volume} = ${frais}`);
            }
          } else {
            // Pas de configuration, frais à 0 par défaut
            frais = 0;
            console.log(`⚠️ Pas de configuration de frais pour ${agencyInfo.service}, frais à 0`);
          }
          
          console.log(`✅ Frais calculés pour ${agencyInfo.agency}:`);
          console.log(`   - Service: ${agencyInfo.service}`);
          console.log(`   - Montant transaction: ${agencyInfo.volume}`);
          console.log(`   - Frais calculés: ${frais}`);
          console.log(`   - Configuration:`, fraisConfig);
        } catch (configError) {
          console.warn(`⚠️ Erreur lors de la récupération de la config des frais pour ${agencyInfo.service}:`, configError);
          frais = 0; // Frais par défaut en cas d'erreur
        }

        // Créer l'objet TrxSfData avec les données mappées
        const trxSf: any = {
          idTransaction: getValueWithFallback(['IDTransaction', 'id_transaction', 'ID_TRANSACTION', 'transaction_id', 'TransactionId', 'ID', 'id', 'Id', 'CLE', 'clé de réconciliation', 'cle_reconciliation']),
          telephoneClient: getValueWithFallback(['téléphone client', 'telephone_client', 'TELEPHONE_CLIENT', 'phone', 'Phone', 'Telephone', 'telephone', 'Téléphone']),
          montant: parseFloat(getValueWithFallback(['montant', 'Montant', 'MONTANT', 'amount', 'Amount', 'volume', 'Volume'])) || 0,
          service: agencyInfo.service,
          agence: agencyInfo.agency,
          dateTransaction: formatDateForBackend(agencyInfo.date),
          numeroTransGu: getValueWithFallback(['Numéro Trans GU', 'numero_trans_gu', 'NUMERO_TRANS_GU', 'transaction_number', 'TransactionNumber', 'numeroTransGu', 'NumeroTransGu']),
          pays: agencyInfo.country,
          statut: 'EN_ATTENTE',
          frais: frais, // Frais récupérés depuis l'API
          commentaire: 'ECART BO - Importé depuis la réconciliation avec frais TSOP',
          dateImport: new Date().toISOString()
        };

        console.log(`DEBUG: Enregistrement ${index + 1} préparé pour TRX SF:`, {
          idTransaction: trxSf.idTransaction,
          agence: trxSf.agence,
          service: trxSf.service,
          montant: trxSf.montant,
          frais: trxSf.frais,
          agencyInfo: agencyInfo
        });

        return trxSf;
      });

      // Attendre que toutes les promesses soient résolues
      const trxSfData = await Promise.all(trxSfDataPromises);

      console.log('DEBUG: Données converties en format TrxSfData avec frais:', trxSfData.length, 'enregistrements');

      // Validation des données avant sauvegarde
      const validRecords = trxSfData.filter(record => 
        record.idTransaction && 
        record.idTransaction.trim() !== '' && 
        record.agence && 
        record.agence.trim() !== ''
      );

      console.log('DEBUG: Nombre d\'enregistrements valides après filtrage:', validRecords.length);

      if (validRecords.length === 0) {
        this.popupService.showWarning('❌ Aucun enregistrement valide trouvé pour la sauvegarde dans TRX SF.');
        return;
      }

      // Sauvegarder les données dans TRX SF
      console.log('🔄 Sauvegarde des données dans TRX SF avec frais TSOP...');
      
      // Appeler le service pour sauvegarder les données
      const result = await this.trxSfService.createMultipleTrxSf(validRecords).toPromise();
      
      console.log('✅ Sauvegarde dans TRX SF terminée avec succès:', result);
      
      // Afficher un message de succès
      this.popupService.showSuccess(`✅ ${validRecords.length} enregistrements ECART BO ont été sauvegardés dans TRX SF avec frais TSOP !`);
      this.selectedBoOnlyKeys = [];
      this.cdr.markForCheck();
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde dans TRX SF:', error);
      
      let errorMessage = 'Erreur lors de la sauvegarde dans TRX SF';
      if (error && typeof error === 'object') {
        const errorObj = error as any;
        if (errorObj.error && typeof errorObj.error === 'object') {
          errorMessage = errorObj.error.message || errorObj.error.details || errorMessage;
        } else if (errorObj.message) {
          errorMessage = errorObj.message;
        }
      }
      
      this.popupService.showError(`❌ ${errorMessage}`);
    } finally {
      this.isSavingEcartBoToTrxSf = false;
      this.cdr.markForCheck();
    }
  }

  goBack(): void {
    this.router.navigate(['/results']);
  }
}
