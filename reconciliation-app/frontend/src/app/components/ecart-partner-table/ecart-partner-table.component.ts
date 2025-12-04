import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { ReconciliationResponse } from '../../models/reconciliation-response.model';
import { AppStateService } from '../../services/app-state.service';
import { ExportOptimizationService, ExportProgress } from '../../services/export-optimization.service';
import { PopupService } from '../../services/popup.service';
import { ImpactOPService } from '../../services/impact-op.service';
import { OperationService } from '../../services/operation.service';
import { CompteService } from '../../services/compte.service';
import { ImpactOP } from '../../models/impact-op.model';
import { OperationCreateRequest } from '../../models/operation.model';
import { fixGarbledCharacters } from '../../utils/encoding-fixer';

@Component({
  selector: 'app-ecart-partner-table',
  templateUrl: './ecart-partner-table.component.html',
  styleUrls: ['./ecart-partner-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EcartPartnerTableComponent implements OnInit, OnDestroy {
  response: ReconciliationResponse | null = null;
  filteredPartnerOnly: Record<string, string>[] = [];
  displayedPartnerOnly: Record<string, string>[] = [];
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
  selectedPartnerOnlyKeys: string[] = [];
  
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
  isSavingEcartPartnerToImpactOP = false;
  selectedPartnerImportOpDate: string | null = null;
  
  // Chargement progressif
  isLoading = false;
  loadProgress = 0;
  
  constructor(
    private appStateService: AppStateService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private exportOptimizationService: ExportOptimizationService,
    private popupService: PopupService,
    private impactOPService: ImpactOPService,
    private operationService: OperationService,
    private compteService: CompteService
  ) {}

  ngOnInit(): void {
    this.subscription.add(
      this.appStateService.getReconciliationResults().subscribe((response: ReconciliationResponse | null) => {
        if (response) {
          this.response = response;
          this.loadPartnerOnly();
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

  private async loadPartnerOnly(): Promise<void> {
    this.isLoading = true;
    this.loadProgress = 0;
    this.cdr.markForCheck();
    
    try {
      const partnerOnly = this.response?.partnerOnly || [];
      const total = partnerOnly.length;
      
      if (total === 0) {
        this.filteredPartnerOnly = [];
        this.isLoading = false;
        this.loadProgress = 100;
        this.initializeColumns();
        this.applyFilters();
        this.cdr.markForCheck();
        return;
      }

      // Chargement progressif par chunks pour éviter de bloquer l'UI
      const chunkSize = 500;
      this.filteredPartnerOnly = [];
      
      // Charger immédiatement un petit échantillon pour l'initialisation rapide
      if (partnerOnly.length > 0) {
        const sampleSize = Math.min(50, total);
        const sample = partnerOnly.slice(0, sampleSize);
        this.filteredPartnerOnly.push(...sample);
        this.loadProgress = 2;
        this.initializeColumns();
        this.applyFilters();
        this.cdr.markForCheck();
        
        // Permettre au navigateur de mettre à jour l'UI immédiatement
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      // Charger le reste par chunks pour un feedback régulier
      for (let i = 50; i < total; i += chunkSize) {
        const chunk = partnerOnly.slice(i, Math.min(i + chunkSize, total));
        this.filteredPartnerOnly.push(...chunk);
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
    } finally {
      this.isLoading = false;
      this.loadProgress = 100;
      this.cdr.markForCheck();
    }
  }

  private initializeColumns(): void {
    if (this.filteredPartnerOnly.length > 0) {
      const allKeysSet = new Set<string>();
      
      // Optimiser : parcourir seulement les premiers enregistrements pour détecter les colonnes
      const sampleSize = Math.min(100, this.filteredPartnerOnly.length);
      for (let i = 0; i < sampleSize; i++) {
        Object.keys(this.filteredPartnerOnly[i]).forEach(key => {
          const correctedKey = fixGarbledCharacters(key);
          allKeysSet.add(correctedKey);
        });
      }
      
      // Si on a déjà toutes les colonnes, pas besoin de continuer
      if (sampleSize < this.filteredPartnerOnly.length) {
        for (let i = sampleSize; i < this.filteredPartnerOnly.length; i++) {
          Object.keys(this.filteredPartnerOnly[i]).forEach(key => {
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
    let filtered = [...this.filteredPartnerOnly];
    
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
    
    this.displayedPartnerOnly = filtered;
    this.totalPages = Math.max(1, Math.ceil(this.displayedPartnerOnly.length / this.pageSize));
    
    // Réinitialiser à la première page si nécessaire
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }
    
    this.cdr.markForCheck();
  }

  getPagedPartnerOnly(): Record<string, string>[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.displayedPartnerOnly.slice(start, end);
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

  getPartnerOnlyKey(record: Record<string, string>): string {
    const numeroTrans = this.getFromRecord(record, ['Numéro Trans GU', 'Numero Trans GU', 'numeroTransGU', 'numero_trans_gu']);
    const idOperation = this.getFromRecord(record, ['ID Opération', 'ID Operation', 'id_operation', 'idOperation', 'ID OPERATION']);
    const dateOp = this.getFromRecord(record, ['Date opération', 'Date', 'dateOperation', 'date_operation', 'DATE']);
    const montant = this.getFromRecord(record, ['Montant', 'montant', 'amount', 'Amount', 'volume', 'Volume']);
    const parts = [numeroTrans, idOperation, dateOp, montant].filter(p => p);
    return parts.length > 0 ? parts.join('|') : JSON.stringify(record);
  }

  isPartnerRecordSelected(record: Record<string, string>): boolean {
    const key = this.getPartnerOnlyKey(record);
    return this.selectedPartnerOnlyKeys.includes(key);
  }

  togglePartnerSelection(record: Record<string, string>, event: any): void {
    const key = this.getPartnerOnlyKey(record);
    if (event.target.checked) {
      if (!this.selectedPartnerOnlyKeys.includes(key)) {
        this.selectedPartnerOnlyKeys.push(key);
      }
    } else {
      this.selectedPartnerOnlyKeys = this.selectedPartnerOnlyKeys.filter(k => k !== key);
    }
  }

  get allPartnerSelectedOnPage(): boolean {
    const pageRecords = this.getPagedPartnerOnly();
    return pageRecords.length > 0 && pageRecords.every(r => this.isPartnerRecordSelected(r));
  }

  toggleSelectAllPartnerOnPage(event: any): void {
    const pageRecords = this.getPagedPartnerOnly();
    if (event.target.checked) {
      pageRecords.forEach(record => {
        const key = this.getPartnerOnlyKey(record);
        if (!this.selectedPartnerOnlyKeys.includes(key)) {
          this.selectedPartnerOnlyKeys.push(key);
        }
      });
    } else {
      const pageKeys = pageRecords.map(r => this.getPartnerOnlyKey(r));
      this.selectedPartnerOnlyKeys = this.selectedPartnerOnlyKeys.filter(k => !pageKeys.includes(k));
    }
  }

  private getPartnerSelectionDataset(): Record<string, string>[] {
    if (this.filteredPartnerOnly && this.filteredPartnerOnly.length > 0) {
      return this.filteredPartnerOnly;
    }
    if (this.response?.partnerOnly && this.response.partnerOnly.length > 0) {
      return this.response.partnerOnly;
    }
    return [];
  }

  getPartnerRecordsForAction(): Record<string, string>[] {
    const dataset = this.getPartnerSelectionDataset();
    if (this.selectedPartnerOnlyKeys.length === 0) {
      return dataset;
    }
    const keySet = new Set(this.selectedPartnerOnlyKeys);
    return dataset.filter(record => keySet.has(this.getPartnerOnlyKey(record)));
  }

  getPartnerOnlyAgencyAndService(record: Record<string, string>): { agency: string; service: string; volume: number; date: string } {
    const getValue = (keys: string[]): string => {
      for (const key of keys) {
        const originalKey = this.getOriginalKey(record, key);
        if (record[originalKey]) {
          return record[originalKey];
        }
      }
      return '';
    };

    return {
      agency: getValue(['Agence', 'AGENCE', 'agence']),
      service: getValue(['Service', 'SERVICE', 'service']),
      volume: parseFloat(getValue(['montant', 'Montant', 'MONTANT', 'Volume', 'volume'])) || 0,
      date: getValue(['Date', 'date', 'DATE', 'Date opération', 'dateOperation'])
    };
  }

  calculateTotalVolumePartnerOnly(): number {
    return this.filteredPartnerOnly.reduce((total, record) => {
      const info = this.getPartnerOnlyAgencyAndService(record);
      return total + (info.volume || 0);
    }, 0);
  }

  // Vérifier si un enregistrement est éligible pour créer une OP
  isPartnerRecordEligible(record: Record<string, string>): boolean {
    if (!record || Object.keys(record).length === 0) {
      return false;
    }
    
    // Chercher un montant/volume dans toutes les clés (insensible à la casse)
    const amountKeywords = ['montant', 'amount', 'crédit', 'credit', 'volume', 'prix', 'price'];
    const hasAmount = Object.keys(record).some(key => {
      const keyLower = key.toLowerCase();
      const value = record[key];
      const hasKeyword = amountKeywords.some(keyword => keyLower.includes(keyword));
      const hasValue = value !== undefined && value !== null && String(value).trim() !== '';
      if (hasKeyword && hasValue) {
        const numValue = parseFloat(String(value).replace(/[,\s]/g, ''));
        return !isNaN(numValue);
      }
      return false;
    });
    
    // Chercher une date dans toutes les clés (insensible à la casse)
    const dateKeywords = ['date', 'jour', 'operation', 'opération', 'op', 'time', 'temps'];
    const hasDate = Object.keys(record).some(key => {
      const keyLower = key.toLowerCase();
      const value = record[key];
      return dateKeywords.some(keyword => keyLower.includes(keyword)) &&
             value !== undefined && value !== null && String(value).trim() !== '';
    });
    
    return hasAmount && hasDate;
  }

  // Créer une opération depuis un enregistrement partenaire
  async createOperationFromPartnerRecord(record: Record<string, string>): Promise<void> {
    try {
      if (!this.isPartnerRecordEligible(record)) {
        await this.popupService.showWarning('❌ Données insuffisantes pour créer une opération');
        return;
      }

      const rawType = this.getFromRecord(record, ['Type Opération', 'typeOperation', 'type_operation']);
      const normalized = this.normalizeType(rawType);
      const typeOperation = normalized.includes('compens') ? 'Compense_client'
                            : normalized.includes('appro') ? 'Appro_client'
                            : normalized.includes('nivel') ? 'nivellement'
                            : normalized.includes('regularis') ? 'régularisation_solde'
                            : rawType || 'ajustement';

      const { agency } = this.getPartnerOnlyAgencyAndService(record);
      const codeProprietaire = (this.getFromRecord(record, ['Agence','agency','Code propriétaire','Code proprietaire','codeProprietaire','code_proprietaire']) || agency || '').trim();
      if (!codeProprietaire) {
        await this.popupService.showWarning('Code propriétaire introuvable pour cette ligne');
        return;
      }

      // Nettoyer les séparateurs de milliers
      const rawAmountStr = this.getFromRecord(record, ['Montant','montant','amount']) || String(this.getPartnerOnlyAgencyAndService(record).volume || '0');
      const normalizedAmount = parseFloat(String(rawAmountStr).replace(/[,\s]/g, '')) || 0;
      const montant = Math.abs(normalizedAmount);
      const rawDate = this.getFromRecord(record, ['Date opération','Date','dateOperation','date_operation','DATE']);
      const defaultDateCandidate = this.selectedPartnerImportOpDate
          || this.extractIsoDay(rawDate)
          || this.extractIsoDay(this.getPartnerOnlyAgencyAndService(record).date)
          || this.toIsoLocalDate(new Date().toISOString());

      const dateInput = await this.popupService.showDateInput(
          'Sélectionnez la date d\'opération pour cette création Import OP.',
          'Créer OP - Date d\'opération',
          defaultDateCandidate
      );

      if (dateInput === null) {
        await this.popupService.showInfo('Création de l\'opération annulée.');
        return;
      }

      const normalizedDate = this.toIsoLocalDate(dateInput || defaultDateCandidate);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
        await this.popupService.showWarning('Date d\'opération invalide. Création annulée.');
        return;
      }

      this.selectedPartnerImportOpDate = normalizedDate;
      const nomBordereau = this.getFromRecord(record, ['Numéro Trans GU','Numero Trans GU','numeroTransGU','numero_trans_gu']);

      // Charger les codes propriétaires des banques
      let banqueCodes: string[] = [];
      try {
        const comptesBanque = await firstValueFrom(this.compteService.filterComptes({ categorie: ['Banque'] }));
        if (comptesBanque && comptesBanque.length > 0) {
          banqueCodes = [...new Set(comptesBanque.map(c => c.codeProprietaire).filter((cp): cp is string => cp !== undefined && cp !== null))].sort();
        }
      } catch (e) {
        console.error('Erreur lors du chargement des codes propriétaires des banques:', e);
      }
      
      if (banqueCodes.length === 0) {
        banqueCodes = ['ECOBANK CM'];
      } else {
        if (!banqueCodes.includes('ECOBANK CM')) {
          banqueCodes.unshift('ECOBANK CM');
        }
      }
      
      // Demander la banque via autocomplétion
      const banqueInput = await this.popupService.showAutocompleteInput(
          'Banque (code propriétaire) :', 
          'Créer OP', 
          banqueCodes, 
          'ECOBANK CM'
      );
      const banque = (banqueInput || '').trim();
      if (!banque) {
        await this.popupService.showWarning('Banque obligatoire');
        return;
      }

      // Demander le type de référence
      const referenceTypeInput = await this.popupService.showSelectInput(
          'Type de référence :', 
          'Sélectionner le type', 
          ['STANDARD', 'CROSS_BORDER', 'NIVELLEMENT'], 
          'STANDARD'
      );
      const referenceType = referenceTypeInput || 'STANDARD';

      // Si NIVELLEMENT est sélectionné, forcer le type d'opération à "nivellement"
      let finalTypeOperation = typeOperation;
      if (referenceType === 'NIVELLEMENT') {
        finalTypeOperation = 'nivellement';
      }

      const comptes = await firstValueFrom(this.compteService.getComptesByCodeProprietaire(codeProprietaire));
      if (!comptes || !comptes.length) {
        await this.popupService.showError(`Aucun compte trouvé pour le code propriétaire: ${codeProprietaire}`);
        return;
      }
      const compteId = comptes[0].id!;

      const payload: OperationCreateRequest = {
          compteId,
          typeOperation: finalTypeOperation,
          montant,
          banque,
          nomBordereau: nomBordereau || undefined,
          dateOperation: normalizedDate,
          referenceType: referenceType
      };

      await new Promise<void>((resolve, reject) => {
          this.operationService.createOperation(payload).subscribe({
              next: async () => { 
                  await this.popupService.showSuccess('Opération créée'); 
                  resolve(); 
              },
              error: async (err) => { 
                  console.error(err); 
                  await this.popupService.showError("Échec de création de l'opération"); 
                  reject(err); 
              }
          });
      });
    } catch (e) {
      console.error(e);
      await this.popupService.showError('Erreur lors de la création de l\'opération');
    }
  }


  private normalizeType(input: string): string {
    return (input || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  private extractIsoDay(input: string): string {
    const s = String(input || '').trim();
    if (!s) return '';
    let m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    m = s.match(/(\d{2})-(\d{2})-(\d{4})/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    m = s.match(/(\d{4})\/(\d{2})\/(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    return '';
  }

  private toIsoLocalDate(input: string): string {
    try {
      const d = new Date(input);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    } catch {}
    return input;
  }

  private getPartnerOnlyDate(record: Record<string, string>): string {
    const dateColumn = this.findDateColumn(record);
    return dateColumn ? record[dateColumn] || 'Non spécifié' : 'Non spécifié';
  }

  private findDateColumn(data: Record<string, string>): string | null {
    const dateKeywords = ['date', 'jour', 'day', 'created', 'creation', 'transaction', 'operation', 'opération'];
    return this.findColumnByKeywords(data, dateKeywords);
  }

  private findColumnByKeywords(data: Record<string, string>, keywords: string[]): string | null {
    for (const key of Object.keys(data)) {
      const keyLower = key.toLowerCase();
      if (keywords.some(kw => keyLower.includes(kw.toLowerCase()))) {
        if (data[key] && String(data[key]).trim() !== '') {
          return key;
        }
      }
    }
    return null;
  }

  private makeIsoDateTime(datePart: string): string {
    try {
      if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        return new Date(`${datePart}T00:00:00`).toISOString();
      }
    } catch {}
    return new Date().toISOString();
  }

  async saveEcartPartnerToImpactOP(): Promise<void> {
    if (!this.response?.partnerOnly || this.response.partnerOnly.length === 0) {
      this.popupService.showWarning('❌ Aucune donnée ECART Partenaire à sauvegarder dans Import OP.');
      return;
    }

    this.isSavingEcartPartnerToImpactOP = true;
    this.cdr.markForCheck();

    try {
      console.log('🔄 Début de la sauvegarde des ECART Partenaire dans Import OP...');
      console.log('DEBUG: Nombre d\'enregistrements ECART Partenaire (total):', this.response.partnerOnly.length);

      // Déterminer la source: lignes sélectionnées ou tout le jeu de données
      const sourceRecords: Record<string, string>[] =
        this.selectedPartnerOnlyKeys.length > 0
          ? (this.filteredPartnerOnly || []).filter(r => this.selectedPartnerOnlyKeys.includes(this.getPartnerOnlyKey(r)))
          : (this.response.partnerOnly || []);

      if (sourceRecords.length === 0) {
        this.popupService.showWarning('❌ Aucune ligne sélectionnée pour la sauvegarde.');
        return;
      }

      console.log('DEBUG: Nombre d\'enregistrements à sauvegarder (sélection):', sourceRecords.length);

      const defaultDateCandidate = this.selectedPartnerImportOpDate
        || this.extractIsoDay(this.getFromRecord(sourceRecords[0], ['Date opération', 'Date', 'dateOperation', 'date_operation']))
        || this.extractIsoDay(this.getPartnerOnlyDate(sourceRecords[0]))
        || this.toIsoLocalDate(new Date().toISOString());

      const dateInput = await this.popupService.showDateInput(
        'Sélectionnez la date d\'opération à appliquer pour les Import OP générés.',
        'Date Import OP',
        defaultDateCandidate
      );

      if (dateInput === null) {
        await this.popupService.showInfo('Sauvegarde Import OP annulée.');
        return;
      }

      const normalizedDateInput = this.toIsoLocalDate(dateInput || defaultDateCandidate);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDateInput)) {
        await this.popupService.showWarning('Date d\'opération invalide. Sauvegarde annulée.');
        return;
      }

      this.selectedPartnerImportOpDate = normalizedDateInput;
      const overrideDateIso = this.makeIsoDateTime(normalizedDateInput);

      // Convertir les données ECART Partenaire en format ImpactOP
      const impactOPData: ImpactOP[] = sourceRecords.map((record, index) => {
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

        const getNumberWithFallback = (keys: string[]): number => {
          const value = getValueWithFallback(keys);
          const parsed = parseFloat(value.replace(/[^\d.-]/g, ''));
          return isNaN(parsed) ? 0 : parsed;
        };

        // Fonction helper pour convertir les numéros de série Excel en dates JavaScript
        const parseExcelDate = (dateValue: string): Date => {
          // Si la valeur est vide, retourner la date actuelle
          if (!dateValue || dateValue.trim() === '') {
            return new Date();
          }
          
          // Si la date contient déjà des caractères de format date, la parser normalement
          if (dateValue.includes('-') || dateValue.includes('T') || dateValue.includes('/') || /\d{4}/.test(dateValue)) {
            const parsedDate = new Date(dateValue);
            if (!isNaN(parsedDate.getTime())) {
              console.log(`📅 Date texte parsée: ${dateValue} → ${parsedDate.toISOString()}`);
              return parsedDate;
            }
          }
          
          // Vérifier si c'est un numéro de série Excel pur (nombre décimal)
          const numValue = parseFloat(dateValue);
          if (!isNaN(numValue) && numValue > 0 && numValue < 100000 && Math.abs(parseFloat(dateValue) - numValue) < 0.0001) {
            // C'est probablement un numéro de série Excel
            // Excel epoch: 1er janvier 1900 (avec correction pour le bug du 29 février 1900)
            const excelEpoch = new Date(1900, 0, 1).getTime();
            const millisecondsPerDay = 86400000;
            // Soustraire 2 pour corriger le bug Excel (29/02/1900) et l'index qui commence à 1
            const jsDate = new Date(excelEpoch + (numValue - 2) * millisecondsPerDay);
            console.log(`📅 Conversion Excel → JS: ${dateValue} → ${jsDate.toISOString()}`);
            return jsDate;
          }
          
          // Si tout échoue, retourner la date actuelle
          console.warn(`⚠️ Date non reconnue: "${dateValue}", utilisation de la date actuelle`);
          return new Date();
        };
        
        // Construire la date d'opération au format LocalDateTime
        const dateOperationStr = getValueWithFallback(['Date opération', 'dateOperation', 'date_operation']);
        const parsedDate = parseExcelDate(dateOperationStr);
        const dateOperation = overrideDateIso || parsedDate.toISOString();

        return {
          id: undefined, // Sera assigné par le backend
          typeOperation: getValueWithFallback(['Type Opération', 'typeOperation', 'type_operation']) || 'DEPOT',
          montant: getNumberWithFallback(['Montant', 'montant', 'amount']),
          soldeAvant: getNumberWithFallback(['Solde avant', 'soldeAvant', 'solde_avant', 'Solde_avant']),
          soldeApres: getNumberWithFallback(['Solde aprés', 'Solde après', 'soldeApres', 'solde_apres']),
          codeProprietaire: getValueWithFallback(['Code propriétaire', 'Code proprietaire', 'codeProprietaire', 'code_proprietaire']) || 'UNKNOWN',
          dateOperation: dateOperation,
          numeroTransGU: getValueWithFallback(['Numéro Trans GU', 'numeroTransGU', 'numero_trans_gu']) || `GU-${Date.now()}-${index}`,
          groupeReseau: (getValueWithFallback(['groupe de réseau', 'groupeReseau', 'groupe_reseau']) || 'DEFAULT').substring(0, 10),
          statut: 'EN_ATTENTE',
          commentaire: `Importé depuis ECART Partenaire - ${new Date().toLocaleString('fr-FR')}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as ImpactOP;
      });

      console.log('DEBUG: Données converties pour Import OP:', impactOPData.slice(0, 2));

      // Sauvegarder via le service Impact OP
      let successCount = 0;
      let errorCount = 0;

      for (const [index, impactOP] of impactOPData.entries()) {
        try {
          console.log(`🔄 [${index + 1}/${impactOPData.length}] Tentative de création Impact OP:`, impactOP);
          const result = await firstValueFrom(this.impactOPService.createImpactOP(impactOP));
          successCount++;
          console.log(`✅ [${index + 1}/${impactOPData.length}] Import OP créé avec succès:`, result);
        } catch (error: any) {
          errorCount++;
          console.error(`❌ [${index + 1}/${impactOPData.length}] Erreur détaillée lors de la création de l'Import OP:`, {
            error,
            status: error?.status,
            statusText: error?.statusText,
            message: error?.message,
            errorDetails: error?.error,
            impactOPData: impactOP
          });
        }
      }

      if (successCount > 0) {
        this.popupService.showSuccess(`✅ Sauvegarde réussie !\n\n📊 Résumé:\n• ${successCount} Import OP créés avec succès\n• ${errorCount} erreurs\n\n💾 Les données ECART Partenaire ont été sauvegardées dans Import OP.`);
        this.selectedPartnerOnlyKeys = [];
      } else {
        this.popupService.showError(`❌ Échec de la sauvegarde !\n\nAucun Import OP n'a pu être créé.\nVeuillez vérifier les logs de la console pour plus de détails.`);
      }

    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde ECART Partenaire vers Import OP:', error);
      
      let errorMessage = '❌ Erreur lors de la sauvegarde dans Import OP.\n\n';
      
      if (error && typeof error === 'object') {
        const apiError = error as any;
        if (apiError.error?.message) {
          errorMessage += `Détails: ${apiError.error.message}`;
        } else if (apiError.message) {
          errorMessage += `Détails: ${apiError.message}`;
        } else {
          errorMessage += 'Erreur de communication avec le serveur.';
        }
      } else {
        errorMessage += 'Erreur inconnue.';
      }
      
      errorMessage += '\n\nVeuillez réessayer.';
      
      this.popupService.showError(errorMessage);
    } finally {
      this.isSavingEcartPartnerToImpactOP = false;
      this.cdr.markForCheck();
    }
  }

  async exportResults(): Promise<void> {
    if (this.displayedPartnerOnly.length === 0) {
      this.popupService.showError('Aucune donnée à exporter');
      return;
    }

    try {
      this.isExporting = true;
      this.exportProgress = {
        current: 0,
        total: this.displayedPartnerOnly.length,
        percentage: 0,
        message: 'Préparation de l\'export...',
        isComplete: false
      };
      this.showExportMenu = false;
      this.cdr.markForCheck();

      const selectedCols = this.availableColumnsForExport.filter(col => this.selectedColumnsForExport[col]);
      const columns = selectedCols;
      
      const rows = this.displayedPartnerOnly.map(record => {
        const row: any = {};
        selectedCols.forEach(col => {
          row[col] = this.getValue(record, col);
        });
        return row;
      });

      const fileName = `ecart_partner_${new Date().toISOString().split('T')[0]}.xlsx`;
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
      this.popupService.showError('Erreur lors de l\'export des écarts Partenaire');
      this.cdr.markForCheck();
    }
  }

  goBack(): void {
    this.router.navigate(['/results']);
  }
}
