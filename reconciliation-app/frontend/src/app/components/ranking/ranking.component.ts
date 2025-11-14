import { Component, OnInit, ViewChild } from '@angular/core';
import { RankingService, RankingItem } from '../../services/ranking.service';
import * as XLSX from 'xlsx';
import { FormControl } from '@angular/forms';
import { MatSelect } from '@angular/material/select';

@Component({
  selector: 'app-ranking',
  templateUrl: './ranking.component.html',
  styleUrls: ['./ranking.component.scss']
})
export class RankingComponent implements OnInit {
  
  // Données des classements
  agencyRankings: RankingItem[] = [];
  serviceRankings: RankingItem[] = [];
  
  // Types de classement
  agencyRankingType: 'transactions' | 'volume' | 'fees' = 'transactions';
  serviceRankingType: 'transactions' | 'volume' | 'fees' = 'transactions';
  
  // Période de calcul
  selectedPeriod: 'all' | 'day' | 'week' | 'month' | 'lastMonth' | 'thisYear' | 'lastYear' | 'custom' = 'month';
  
  // États de chargement
  loadingAgencies = false;
  loadingServices = false;
  
  // Erreurs
  errorAgencies = '';
  errorServices = '';

  // Indicateur de mise à jour
  showUpdateMessage = false;
  updateMessage = '';

  // Filtre personnalisé
  customStartDate: string = '';
  customEndDate: string = '';
  customDateError: string = '';

  // Pagination agences
  agencyPage = 1;
  agencyPageSize = 5;
  get paginatedAgencyRankings() {
    const start = (this.agencyPage - 1) * this.agencyPageSize;
    return this.agencyRankings.slice(start, start + this.agencyPageSize);
  }
  get agencyTotalPages() {
    return Math.ceil(this.agencyRankings.length / this.agencyPageSize);
  }

  // Pagination services
  servicePage = 1;
  servicePageSize = 5;
  get paginatedServiceRankings() {
    const start = (this.servicePage - 1) * this.servicePageSize;
    return this.serviceRankings.slice(start, start + this.servicePageSize);
  }
  get serviceTotalPages() {
    return Math.ceil(this.serviceRankings.length / this.servicePageSize);
  }

  countries: string[] = [];
  selectedCountry: string = 'Tous les pays';
  selectedCountries: string[] = ['Tous les pays'];

  // Dropdown pays
  showCountryDropdown = false;

  paysSearchCtrl = new FormControl('');
  filteredCountries: string[] = [];

  @ViewChild('paysSelect') paysSelect!: MatSelect;

  constructor(private rankingService: RankingService) { }

  ngOnInit(): void {
    this.rankingService.getCountries().subscribe({
      next: (data) => {
        // Correction : éviter la duplication de 'Tous les pays'
        const paysSansDoublon = data.filter((c: string) => c !== 'Tous les pays');
        this.countries = ['Tous les pays', ...paysSansDoublon];
        this.filteredCountries = this.countries;
      },
      error: () => {
        this.countries = ['Tous les pays'];
        this.filteredCountries = this.countries;
      }
    });
    this.loadAgencyRankings();
    this.loadServiceRankings();
    this.paysSearchCtrl.valueChanges.subscribe((search: string | null) => {
      const s = (search || '').toLowerCase();
      this.filteredCountries = this.countries.filter(c => c.toLowerCase().includes(s));
      // Sélection automatique si un seul résultat (hors "Tous les pays")
      const filtered = this.filteredCountries.filter(c => c !== 'Tous les pays');
      if (filtered.length === 1 && !this.selectedCountries.includes(filtered[0])) {
        this.selectedCountries = [filtered[0]];
        if (this.paysSelect) { this.paysSelect.close(); }
        this.onCountryChange();
      }
    });
  }

  /**
   * Charger les classements des agences
   */
  loadAgencyRankings(): void {
    this.loadingAgencies = true;
    this.errorAgencies = '';

    // Déterminer les dates personnalisées si nécessaire
    const startDate = this.selectedPeriod === 'custom' ? this.customStartDate : undefined;
    const endDate = this.selectedPeriod === 'custom' ? this.customEndDate : undefined;

    let observable;
    switch (this.agencyRankingType) {
      case 'transactions':
        observable = this.rankingService.getAgencyRankingByTransactions(this.selectedCountries.includes('Tous les pays') ? undefined : this.selectedCountries, this.selectedPeriod, startDate, endDate);
        break;
      case 'volume':
        observable = this.rankingService.getAgencyRankingByVolume(this.selectedCountries.includes('Tous les pays') ? undefined : this.selectedCountries, this.selectedPeriod, startDate, endDate);
        break;
      case 'fees':
        observable = this.rankingService.getAgencyRankingByFees(this.selectedCountries.includes('Tous les pays') ? undefined : this.selectedCountries, this.selectedPeriod, startDate, endDate);
        break;
      default:
        observable = this.rankingService.getAgencyRankingByTransactions(this.selectedCountries.includes('Tous les pays') ? undefined : this.selectedCountries, this.selectedPeriod, startDate, endDate);
    }

    observable.subscribe({
      next: (data) => {
        this.agencyRankings = data;
        this.loadingAgencies = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des classements des agences:', error);
        this.errorAgencies = 'Erreur lors du chargement des données';
        this.loadingAgencies = false;
      }
    });
  }

  /**
   * Charger les classements des services
   */
  loadServiceRankings(): void {
    this.loadingServices = true;
    this.errorServices = '';

    // Déterminer les dates personnalisées si nécessaire
    const startDate = this.selectedPeriod === 'custom' ? this.customStartDate : undefined;
    const endDate = this.selectedPeriod === 'custom' ? this.customEndDate : undefined;

    let observable;
    switch (this.serviceRankingType) {
      case 'transactions':
        observable = this.rankingService.getServiceRankingByTransactions(this.selectedCountries.includes('Tous les pays') ? undefined : this.selectedCountries, this.selectedPeriod, startDate, endDate);
        break;
      case 'volume':
        observable = this.rankingService.getServiceRankingByVolume(this.selectedCountries.includes('Tous les pays') ? undefined : this.selectedCountries, this.selectedPeriod, startDate, endDate);
        break;
      case 'fees':
        observable = this.rankingService.getServiceRankingByFees(this.selectedCountries.includes('Tous les pays') ? undefined : this.selectedCountries, this.selectedPeriod, startDate, endDate);
        break;
      default:
        observable = this.rankingService.getServiceRankingByTransactions(this.selectedCountries.includes('Tous les pays') ? undefined : this.selectedCountries, this.selectedPeriod, startDate, endDate);
    }

    observable.subscribe({
      next: (data) => {
        this.serviceRankings = data;
        this.loadingServices = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des classements des services:', error);
        this.errorServices = 'Erreur lors du chargement des données';
        this.loadingServices = false;
      }
    });
  }

  /**
   * Changer le type de classement des agences
   */
  onAgencyRankingTypeChange(): void {
    this.loadAgencyRankings();
  }

  /**
   * Changer le type de classement des services
   */
  onServiceRankingTypeChange(): void {
    this.loadServiceRankings();
  }

  /**
   * Changer la période de calcul
   */
  onPeriodChange(): void {
    // Réinitialiser les erreurs de date personnalisée
    this.customDateError = '';
    
    if (this.selectedPeriod === 'custom') {
      // Si on passe en mode personnalisé, ne pas charger les données tant qu'on n'a pas de dates
      return;
    }
    
    this.showUpdateMessage = true;
    this.updateMessage = `Mise à jour des classements : ${this.getPeriodDescription()}`;
    
    this.loadAgencyRankings();
    this.loadServiceRankings();
    
    // Masquer le message après 3 secondes
    setTimeout(() => {
      this.showUpdateMessage = false;
      this.updateMessage = '';
    }, 3000);
  }

  /**
   * Gérer le changement de dates personnalisées
   */
  onCustomDateChange(): void {
    this.customDateError = '';
    
    if (!this.customStartDate || !this.customEndDate) {
      return;
    }
    
    const startDate = new Date(this.customStartDate);
    const endDate = new Date(this.customEndDate);
    
    // Validation des dates
    if (startDate > endDate) {
      this.customDateError = 'La date de début doit être antérieure à la date de fin';
      return;
    }
    
    if (endDate > new Date()) {
      this.customDateError = 'La date de fin ne peut pas être dans le futur';
      return;
    }
    
    this.showUpdateMessage = true;
    this.updateMessage = `Mise à jour des classements : ${this.formatCustomPeriod()}`;
    
    this.loadAgencyRankings();
    this.loadServiceRankings();
    
    // Masquer le message après 3 secondes
    setTimeout(() => {
      this.showUpdateMessage = false;
      this.updateMessage = '';
    }, 3000);
  }

  /**
   * Formater la période personnalisée pour l'affichage
   */
  formatCustomPeriod(): string {
    if (!this.customStartDate || !this.customEndDate) {
      return '';
    }
    
    const startDate = new Date(this.customStartDate);
    const endDate = new Date(this.customEndDate);
    
    const startFormatted = startDate.toLocaleDateString('fr-FR');
    const endFormatted = endDate.toLocaleDateString('fr-FR');
    
    if (startFormatted === endFormatted) {
      return `Données du ${startFormatted}`;
    } else {
      return `Données du ${startFormatted} au ${endFormatted}`;
    }
  }

  /**
   * Obtenir le titre du classement des agences
   */
  getAgencyRankingTitle(): string {
    if (this.agencyRankingType === 'fees') {
      return 'Classement des Clients par Revenu';
    } else if (this.agencyRankingType === 'volume') {
      return 'Classement des Clients par Volume';
    } else {
      return 'Classement des Clients par Transactions';
    }
  }

  /**
   * Obtenir le titre du classement des services
   */
  getServiceRankingTitle(): string {
    if (this.serviceRankingType === 'fees') {
      return 'Classement des Services par Revenu';
    } else if (this.serviceRankingType === 'volume') {
      return 'Classement des Services par Volume';
    } else {
      return 'Classement des Services par Transactions';
    }
  }

  /**
   * Obtenir le label de la période
   */
  getPeriodLabel(): string {
    switch (this.selectedPeriod) {
      case 'all':
        return 'Toute la période';
      case 'day':
        return 'Jour';
      case 'week':
        return 'Semaine';
      case 'month':
        return 'Mois';
      case 'lastMonth':
        return 'Mois';
      default:
        return 'Mois';
    }
  }

  /**
   * Obtenir la description détaillée de la période
   */
  getPeriodDescription(): string {
    const today = new Date();
    
    switch (this.selectedPeriod) {
      case 'all':
        return 'Toutes les données disponibles';
      case 'day':
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        return `Données de ${yesterday.toLocaleDateString('fr-FR')} (J-1)`;
      case 'week':
        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(today.getDate() - 7);
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
        return `Données du ${lastWeekStart.toLocaleDateString('fr-FR')} au ${lastWeekEnd.toLocaleDateString('fr-FR')} (dernière semaine)`;
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return `Données du ${monthStart.toLocaleDateString('fr-FR')} au ${monthEnd.toLocaleDateString('fr-FR')} (mois en cours)`;
      case 'lastMonth':
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        return `Données du ${lastMonthStart.toLocaleDateString('fr-FR')} au ${lastMonthEnd.toLocaleDateString('fr-FR')} (mois dernier)`;
      case 'thisYear':
        const yearStart = new Date(today.getFullYear(), 0, 1);
        const yearEnd = new Date(today.getFullYear(), 11, 31);
        return `Données du ${yearStart.toLocaleDateString('fr-FR')} au ${yearEnd.toLocaleDateString('fr-FR')} (année en cours)`;
      case 'lastYear':
        const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
        const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31);
        return `Données du ${lastYearStart.toLocaleDateString('fr-FR')} au ${lastYearEnd.toLocaleDateString('fr-FR')} (année précédente)`;
      default:
        return 'Mois en cours';
    }
  }

  /**
   * Obtenir la classe CSS pour la position
   */
  getPositionClass(position: number): string {
    if (position === 1) return 'position-gold';
    if (position === 2) return 'position-silver';
    if (position === 3) return 'position-bronze';
    return 'position-normal';
  }

  /**
   * Formater un montant
   */
  formatAmount(amount: number): string {
    return this.rankingService.formatAmount(amount);
  }

  /**
   * Formater un nombre
   */
  formatNumber(num: number): string {
    return this.rankingService.formatNumber(num);
  }

  // Navigation pagination agences
  nextAgencyPage() { if (this.agencyPage < this.agencyTotalPages) this.agencyPage++; }
  prevAgencyPage() { if (this.agencyPage > 1) this.agencyPage--; }
  setAgencyPage(page: number) { this.agencyPage = page; }

  // Navigation pagination services
  nextServicePage() { if (this.servicePage < this.serviceTotalPages) this.servicePage++; }
  prevServicePage() { if (this.servicePage > 1) this.servicePage--; }
  setServicePage(page: number) { this.servicePage = page; }

  // Export CSV générique
  exportToCSV(data: any[], filename: string) {
    if (!data || !data.length) return;
    const replacer = (key: string, value: any) => value === null ? '' : value;
    const header = Object.keys(data[0]);
    const csv = [
      header.join(','),
      ...data.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','))
    ].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }

  exportAgencyCSV() {
    this.exportToCSV(this.agencyRankings, 'classement_agences.csv');
  }
  exportServiceCSV() {
    this.exportToCSV(this.serviceRankings, 'classement_services.csv');
  }

  exportAgencyExcel() {
    this.exportExcel(this.agencyRankings, 'classement_agences.xlsx', 'Agences');
  }
  exportServiceExcel() {
    this.exportExcel(this.serviceRankings, 'classement_services.xlsx', 'Services');
  }

  exportExcel(data: any[], filename: string, sheetName: string) {
    if (!data || !data.length) return;
    // Colonnes à exporter (dans l'ordre)
    const columns = Object.keys(data[0]);
    const header = ['Position', ...columns.map(col => this.getHeaderLabel(col))];
    const wsData = [header, ...data.map((row, idx) => [idx + 1, ...columns.map(col => row[col])])];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Styles
    const gold = { fill: { fgColor: { rgb: 'FFF9D923' } } };
    const silver = { fill: { fgColor: { rgb: 'FFE0E0E0' } } };
    const bronze = { fill: { fgColor: { rgb: 'FFF4C99B' } } };
    const border = { top: { style: 'thin', color: { rgb: 'FFCCCCCC' } }, bottom: { style: 'thin', color: { rgb: 'FFCCCCCC' } }, left: { style: 'thin', color: { rgb: 'FFCCCCCC' } }, right: { style: 'thin', color: { rgb: 'FFCCCCCC' } } };
    const headerStyle = { fill: { fgColor: { rgb: 'FF764BA2' } }, font: { bold: true, color: { rgb: 'FFFFFFFF' } }, border };
    const normalStyle = { border };

    // Appliquer le style à l'en-tête
    for (let colIdx = 0; colIdx < header.length; colIdx++) {
      const cell = XLSX.utils.encode_cell({ r: 0, c: colIdx });
      if (ws[cell]) ws[cell].s = headerStyle;
    }

    // Appliquer le style à chaque ligne
    for (let i = 1; i <= data.length; i++) {
      let style = normalStyle;
      if (i === 1) style = { ...gold, ...normalStyle };
      else if (i === 2) style = { ...silver, ...normalStyle };
      else if (i === 3) style = { ...bronze, ...normalStyle };
      for (let colIdx = 0; colIdx < header.length; colIdx++) {
        const cell = XLSX.utils.encode_cell({ r: i, c: colIdx });
        if (ws[cell]) ws[cell].s = style;
      }
    }

    // Largeur automatique
    ws['!cols'] = header.map(() => ({ wch: 18 }));

    // Création du classeur
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename, { cellStyles: true });
  }

  getHeaderLabel(col: string): string {
    switch (col) {
      case 'agency': return 'Agence';
      case 'service': return 'Service';
      case 'country': return 'Pays';
      case 'transactionCount': return 'Transactions';
      case 'totalVolume': return 'Volume Total';
      case 'totalFees': return 'Revenu';
      case 'averageVolume': return `Volume Moyen/${this.getPeriodLabel()}`;
                  case 'averageFees': return `Revenu Moyen/${this.getPeriodLabel()}`;
      case 'uniqueAgencies': return 'Agences';
      case 'position': return 'Position';
      default: return col;
    }
  }

  toggleCountry(country: string): void {
    if (country === 'Tous les pays') {
      // Si "Tous les pays" est coché, décocher tous les autres
      this.selectedCountries = ['Tous les pays'];
    } else {
      // Retirer "Tous les pays" si présent
      this.selectedCountries = [country];
    }
    
    // Afficher le message de mise à jour
    const selectedCountryText = this.selectedCountries.length === 1 && this.selectedCountries[0] === 'Tous les pays' 
      ? 'Tous les pays' 
      : this.selectedCountries.join(', ');
    this.showUpdateMessage = true;
    this.updateMessage = `Mise à jour des classements pour : ${selectedCountryText}`;
    
    this.loadAgencyRankings();
    this.loadServiceRankings();
    
    // Masquer le message après 3 secondes
    setTimeout(() => {
      this.showUpdateMessage = false;
      this.updateMessage = '';
    }, 3000);
  }

  isCountrySelected(country: string): boolean {
    return this.selectedCountries.includes(country);
  }

  onCountryChange(): void {
    // Si 'Tous les pays' est sélectionné avec d'autres, on ne garde que les autres
    if (this.selectedCountries.includes('Tous les pays') && this.selectedCountries.length > 1) {
      this.selectedCountries = this.selectedCountries.filter(c => c !== 'Tous les pays');
    }
    // Si rien n'est sélectionné, on remet 'Tous les pays'
    if (this.selectedCountries.length === 0) {
      this.selectedCountries = ['Tous les pays'];
    }
    this.loadAgencyRankings();
    this.loadServiceRankings();
    
    // Fermer automatiquement le dropdown après un choix
    setTimeout(() => {
      if (this.paysSelect) this.paysSelect.close();
    }, 100);
  }

  /**
   * Ouvre/ferme le menu déroulant des pays
   */
  toggleCountryDropdown(): void {
    this.showCountryDropdown = !this.showCountryDropdown;
  }

  /**
   * Sélectionner/désélectionner tous les pays
   */
  toggleSelectAllCountries(): void {
    if (this.selectedCountries.length === 1 && this.selectedCountries[0] === 'Tous les pays') {
      this.selectedCountries = []; // Désélectionner tous les pays
    } else {
      this.selectedCountries = ['Tous les pays']; // Sélectionner tous les pays
    }
    this.loadAgencyRankings();
    this.loadServiceRankings();
  }
} 