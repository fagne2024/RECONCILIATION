import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ReconciliationResponse } from '../../models/reconciliation-response.model';
import { AppStateService } from '../../services/app-state.service';
import { EcartSoldeService } from '../../services/ecart-solde.service';
import { PopupService } from '../../services/popup.service';
import { EcartSolde } from '../../models/ecart-solde.model';
import { fixGarbledCharacters } from '../../utils/encoding-fixer';

export interface EcartBoSummaryItem {
  date: string;
  service: string;
  pays: string;
  nombre: number; // Nombre de lignes/transactions
  montant: number; // Montant total (pour référence)
  statut: 'ok' | 'en cours';
  originalRecords: Record<string, string>[]; // Tous les enregistrements pour ce service
}

@Component({
  selector: 'app-ecart-bo-summary',
  templateUrl: './ecart-bo-summary.component.html',
  styleUrls: ['./ecart-bo-summary.component.scss']
})
export class EcartBoSummaryComponent implements OnInit, OnDestroy {
  response: ReconciliationResponse | null = null;
  summaryItems: EcartBoSummaryItem[] = [];
  filteredItems: EcartBoSummaryItem[] = [];
  private subscription = new Subscription();
  
  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalPages = 1;
  
  // Recherche
  searchKey: string = '';
  
  // Filtres
  selectedService: string = '';
  selectedPays: string = '';
  selectedStatut: string = '';
  
  // Liste des valeurs uniques pour les filtres
  uniqueServices: string[] = [];
  uniquePays: string[] = [];
  
  isLoading = false;
  isSaving = false;

  constructor(
    private appStateService: AppStateService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ecartSoldeService: EcartSoldeService,
    private popupService: PopupService
  ) {}

  ngOnInit(): void {
    // Charger les données sauvegardées depuis la base de données
    this.loadSavedSummaryData();
    
    // Également écouter les nouvelles données de réconciliation si disponibles
    this.subscription.add(
      this.appStateService.getReconciliationResults().subscribe((response: ReconciliationResponse | null) => {
        if (response) {
          this.response = response;
          // Optionnel: charger aussi les données de réconciliation en cours
          // this.loadSummaryData();
        }
      })
    );
  }

  private loadSavedSummaryData(): void {
    this.isLoading = true;
    this.cdr.markForCheck();
    
    this.ecartSoldeService.getEcartBoSummary().subscribe({
      next: (savedData) => {
        console.log('Données sauvegardées chargées:', savedData);
        
        this.summaryItems = savedData.map(item => ({
          date: item.date || '',
          service: item.service || 'Non spécifié',
          pays: item.pays || 'Non spécifié',
          nombre: item.nombre || 0,
          montant: item.montant || 0,
          statut: (item.statut === 'TRAITE' ? 'ok' : 'en cours') as 'ok' | 'en cours',
          originalRecords: [] // Les enregistrements originaux ne sont plus disponibles après sauvegarde
        }));

        // Extraire les valeurs uniques pour les filtres
        this.uniqueServices = [...new Set(this.summaryItems.map(item => item.service).filter(s => s))].sort();
        this.uniquePays = [...new Set(this.summaryItems.map(item => item.pays).filter(p => p))].sort();

        this.filteredItems = [...this.summaryItems];
        this.updatePagination();
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des données sauvegardées:', error);
        this.isLoading = false;
        this.cdr.markForCheck();
        // En cas d'erreur, essayer de charger depuis les données de réconciliation
        if (this.response) {
          this.loadSummaryData();
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private loadSummaryData(): void {
    this.isLoading = true;
    this.cdr.markForCheck();
    
    try {
      const mismatches = this.response?.mismatches || [];
      const boOnly = this.response?.boOnly || [];
      const allData = [...mismatches, ...boOnly];
      
      // Fonction helper pour extraire les valeurs
      const getValue = (record: Record<string, string>, keys: string[]): string => {
        for (const key of keys) {
          const originalKey = Object.keys(record).find(k => 
            fixGarbledCharacters(k).toLowerCase() === key.toLowerCase() || 
            k.toLowerCase() === key.toLowerCase()
          );
          if (originalKey && record[originalKey]) {
            return record[originalKey].toString();
          }
          if (record[key]) {
            return record[key].toString();
          }
        }
        return '';
      };

      // Regrouper par service
      const groupedByService = new Map<string, {
        service: string;
        pays: string;
        date: string;
        records: Record<string, string>[];
        totalMontant: number;
      }>();

      allData.forEach(record => {
        const service = getValue(record, ['Service', 'service', 'SERVICE', 'serv', 'Serv']) || 'Non spécifié';
        const pays = getValue(record, ['Pays', 'pays', 'PAYS', 'country', 'Country', 'GRX', 'grx']) || 'Non spécifié';
        const date = getValue(record, ['Date', 'date', 'DATE', 'jour', 'Jour', 'JOUR']) || '';
        const montantStr = getValue(record, ['montant', 'Montant', 'MONTANT', 'amount', 'Amount', 'volume', 'Volume', 'VOLUME']);
        const montant = montantStr ? parseFloat(montantStr.toString().replace(',', '.')) : 0;

        const key = `${service}|${pays}`;
        
        if (!groupedByService.has(key)) {
          groupedByService.set(key, {
            service,
            pays,
            date,
            records: [],
            totalMontant: 0
          });
        }

        const group = groupedByService.get(key)!;
        group.records.push(record);
        group.totalMontant += isNaN(montant) ? 0 : montant;
      });

      // Convertir en tableau d'items
      this.summaryItems = Array.from(groupedByService.values()).map(group => ({
        date: group.date,
        service: group.service,
        pays: group.pays,
        nombre: group.records.length, // Nombre de lignes/transactions
        montant: group.totalMontant, // Montant total (pour référence)
        statut: 'en cours' as 'ok' | 'en cours',
        originalRecords: group.records
      }));

      // Extraire les valeurs uniques pour les filtres
      this.uniqueServices = [...new Set(this.summaryItems.map(item => item.service).filter(s => s))].sort();
      this.uniquePays = [...new Set(this.summaryItems.map(item => item.pays).filter(p => p))].sort();

      this.filteredItems = [...this.summaryItems];
      this.updatePagination();
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  onSearch(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = [...this.summaryItems];

    // Filtre par recherche textuelle
    if (this.searchKey && this.searchKey.trim()) {
      const searchTerm = this.searchKey.toLowerCase().trim();
      filtered = filtered.filter(item => 
        item.date.toLowerCase().includes(searchTerm) ||
        item.service.toLowerCase().includes(searchTerm) ||
        item.pays.toLowerCase().includes(searchTerm) ||
        item.statut.toLowerCase().includes(searchTerm) ||
        item.nombre.toString().includes(searchTerm)
      );
    }

    // Filtre par service
    if (this.selectedService) {
      filtered = filtered.filter(item => item.service === this.selectedService);
    }

    // Filtre par pays
    if (this.selectedPays) {
      filtered = filtered.filter(item => item.pays === this.selectedPays);
    }

    // Filtre par statut
    if (this.selectedStatut) {
      filtered = filtered.filter(item => item.statut === this.selectedStatut);
    }

    this.filteredItems = filtered;
    this.currentPage = 1;
    this.updatePagination();
  }

  onStatutChange(item: EcartBoSummaryItem, newStatut: 'ok' | 'en cours'): void {
    item.statut = newStatut;
    this.cdr.markForCheck();
    // Ici vous pouvez ajouter une logique pour sauvegarder le changement si nécessaire
  }

  getPagedItems(): EcartBoSummaryItem[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredItems.slice(start, start + this.pageSize);
  }

  updatePagination(): void {
    this.totalPages = Math.max(1, Math.ceil(this.filteredItems.length / this.pageSize));
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

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    
    if (this.totalPages <= maxVisible) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      let start = Math.max(1, this.currentPage - 2);
      let end = Math.min(this.totalPages, start + maxVisible - 1);
      
      if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1);
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  }

  clearFilters(): void {
    this.searchKey = '';
    this.selectedService = '';
    this.selectedPays = '';
    this.selectedStatut = '';
    this.applyFilters();
  }

  goBack(): void {
    this.router.navigate(['/ecart-bo']);
  }

  getStatutClass(statut: string): string {
    return statut === 'ok' ? 'statut-ok' : 'statut-en-cours';
  }

  async saveData(): Promise<void> {
    if (this.filteredItems.length === 0) {
      this.popupService.showWarning('❌ Aucune donnée à sauvegarder.');
      return;
    }

    // Filtrer seulement les éléments avec statut "en cours" ou demander confirmation pour tous
    const itemsToSave = this.filteredItems.filter(item => item.statut === 'en cours');
    
    if (itemsToSave.length === 0) {
      this.popupService.showWarning('❌ Aucun écart avec statut "en cours" à sauvegarder.');
      return;
    }

    const confirmed = await this.popupService.showConfirm(
      `📋 ${itemsToSave.length} écart(s) BO seront sauvegardés. Continuer ?`,
      'Confirmation de sauvegarde'
    );

    if (!confirmed) return;

    this.isSaving = true;
    this.cdr.markForCheck();

    try {
      // Préparer les données regroupées par service pour la sauvegarde
      const serviceSummaryData = itemsToSave.map((item) => ({
        service: item.service,
        pays: item.pays,
        montant: item.montant, // Montant total
        date: item.date,
        statut: item.statut === 'ok' ? 'TRAITE' : 'EN_ATTENTE',
        nombreTransactions: item.nombre // Nombre de lignes/transactions
      }));

      if (serviceSummaryData.length === 0) {
        this.popupService.showWarning('❌ Aucune donnée valide trouvée pour la sauvegarde.');
        return;
      }

      // Fonction pour formater la date au format ISO
      const formatDateForBackend = (dateStr: string): string => {
        if (!dateStr) return new Date().toISOString();
        
        // Si la date contient déjà des caractères de format date (tirets, T, espaces suivis de chiffres)
        if (dateStr.includes('-') || dateStr.includes('T') || /\d{4}/.test(dateStr)) {
          // Si la date est déjà au format ISO, la retourner
          if (dateStr.includes('T')) return dateStr;
          
          // Convertir le format "2025-07-09 12:40:18.0" en "2025-07-09T12:40:18"
          const cleanedDate = dateStr.replace(/\.\d+$/, ''); // Enlever les millisecondes
          return cleanedDate.replace(' ', 'T');
        }
        
        // Vérifier si c'est un numéro de série Excel pur
        const numValue = parseFloat(dateStr);
        if (!isNaN(numValue) && numValue > 0 && numValue < 100000) {
          // C'est probablement un numéro de série Excel
          const excelEpoch = new Date(1900, 0, 1).getTime();
          const millisecondsPerDay = 86400000;
          const jsDate = new Date(excelEpoch + (numValue - 2) * millisecondsPerDay);
          return jsDate.toISOString();
        }
        
        // Essayer de parser la date normalement
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.toISOString();
        }
        
        // Par défaut, retourner la date actuelle
        return new Date().toISOString();
      };

      // Formater les dates dans les données
      const formattedData = serviceSummaryData.map(item => ({
        ...item,
        date: formatDateForBackend(item.date)
      }));

      const result = await this.ecartSoldeService.saveEcartBoSummary(formattedData);
      this.popupService.showSuccess(`✅ ${result.count} résumé(s) sauvegardé(s) avec succès !`);
      
      // Recharger les données sauvegardées après la sauvegarde
      this.loadSavedSummaryData();
      
      this.cdr.markForCheck();
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      this.popupService.showError(`❌ Erreur: ${error.message || 'Erreur inconnue lors de la sauvegarde'}`);
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }
}

