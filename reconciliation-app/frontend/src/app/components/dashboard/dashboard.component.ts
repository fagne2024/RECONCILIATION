import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { DashboardService, DashboardMetrics, DetailedMetrics } from '../../services/dashboard.service';
import { AppStateService } from '../../services/app-state.service';
import * as XLSX from 'xlsx';
import { ChartConfiguration } from 'chart.js';
import { AgencySummaryService } from '../../services/agency-summary.service';
import { OperationService } from '../../services/operation.service';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatOptionModule } from '@angular/material/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormControl } from '@angular/forms';
import { Chart } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { MatSelect } from '@angular/material/select';

export type DashboardMetric = 'volume' | 'transactions' | 'revenu';

// Correction du type FilterOptions pour rendre 'banques' optionnel
interface FilterOptions {
  agencies: string[];
  services: string[];
  countries: string[];
  banques?: string[];
  timeFilters: string[];
}

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
    public ChartDataLabels = ChartDataLabels;
    totalReconciliations: number = 0;
    totalFiles: number = 0;
    lastActivity: string = 'Chargement...';
    todayReconciliations: number = 0;
    loading: boolean = true;
    error: string | null = null;

    // Métriques détaillées
    detailedMetrics: DetailedMetrics | null = null;
    detailedLoading: boolean = false;
    detailedError: string | null = null;

    // Filtres
    selectedAgency: string[] = [];
    selectedService: string[] = [];
    selectedCountry: string[] = [];
    selectedTimeFilter: string = 'Ce mois';
    startDate: string = '';
    endDate: string = '';
    // selectedBanque: string = 'Tous'; // supprimé

    // Listes pour les filtres
    filterOptions: FilterOptions | null = null;
    showCustomDateInputs: boolean = false;

    // Graphique à barres
    barChartData: any = { labels: [], datasets: [] };
    barChartOptions: any = {
      responsive: true,
      plugins: {
        legend: { display: true, position: 'top' },
        title: { display: true, text: '' },
        datalabels: {
          font: { weight: 'bold' },
          color: 'black',
          formatter: (value: any, context: any) => {
            // Si le metric sélectionné est 'volume' ou 'revenu', formater sans décimales
            if (context && context.chart && context.chart.config && context.chart.config._config &&
                (context.chart.config._config.options?.plugins?.title?.text?.toLowerCase().includes('volume') ||
                 context.chart.config._config.options?.plugins?.title?.text?.toLowerCase().includes('revenu'))
            ) {
              return Number(value).toLocaleString('fr-FR', { maximumFractionDigits: 0 });
            }
            // Sinon, séparer les milliers mais garder la valeur telle quelle
            return Number(value).toLocaleString('fr-FR');
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          min: 1,
          type: 'logarithmic',
          ticks: {
            callback: function(value: number) {
              if (value === 1) return '1';
              if (value >= 1000000) return (value/1000000) + 'M';
              if (value >= 1000) return (value/1000) + 'k';
              return value;
            }
          }
        }
      }
    };

    /**
     * Filtre les types d'opérations à afficher sur les graphiques.
     * Exclut tous les types commençant par 'annulation_' sauf 'annulation_bo'.
     * @param typeOperation Le type d'opération à vérifier.
     * @returns `true` si le type doit être inclus, `false` sinon.
     */
    private shouldIncludeOperation(typeOperation: string | null | undefined): boolean {
        if (!typeOperation) {
            return true; // Inclure par défaut si le type est manquant
        }
        const lowerCaseType = typeOperation.toLowerCase();
        if (lowerCaseType.startsWith('annulation_')) {
            return lowerCaseType === 'annulation_bo';
        }
        return true;
    }

    lineChartOptions: any = {
      responsive: true,
      plugins: {
        legend: { display: true, position: 'top' },
        title: { display: true, text: '' },
        datalabels: { display: false } // Empêche l'affichage des valeurs sur les courbes
      },
      scales: {
        y: {
          type: 'logarithmic',
          beginAtZero: true,
          min: 1,
          ticks: {
            callback: function(value: number) {
              if (value === 1) return '1';
              if (value >= 1000000) return (value/1000000) + 'M';
              if (value >= 1000) return (value/1000) + 'k';
              return value;
            }
          }
        }
      }
    };
    selectedMetric: DashboardMetric = 'volume';
    agencySummaryData: any[] = [];
    allOperations: any[] = [];
    selectedChartType: 'bar' | 'line' = 'bar';
    lineChartData: any = { labels: [], datasets: [] };
    // Supprimer toute gestion de lineChartPlugins et ChartDataLabels pour les courbes

    totalVolume: number = 0;
    totalTransactions: number = 0;
    totalClients: number = 0;

    // Ajout d'une fonction utilitaire pour filtrer par période
    private filterByPeriod<T extends { date?: string; dateOperation?: string }>(data: T[]): T[] {
      const today = new Date();
      let start: Date | null = null;
      let end: Date | null = null;

      if (this.selectedTimeFilter === 'Aujourd\'hui') {
        // "Aujourd'hui" doit être considéré comme j-1 (hier)
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
        end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);
      } else if (this.selectedTimeFilter === 'Cette semaine') {
        // Trouver le lundi de la semaine en cours
        const currentDay = today.getDay(); // 0 (dimanche) à 6 (samedi)
        const diffToMonday = (currentDay === 0 ? -6 : 1) - currentDay;
        start = new Date(today);
        start.setDate(today.getDate() + diffToMonday);
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 7);
      } else if (this.selectedTimeFilter === 'Ce mois') {
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      } else if (this.selectedTimeFilter === 'Mois passé') {
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        start = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
        end = new Date(lastMonthEnd.getFullYear(), lastMonthEnd.getMonth() + 1, 1);
      } else if (this.selectedTimeFilter === 'Cette année') {
        start = new Date(today.getFullYear(), 0, 1); // 1er janvier de cette année
        end = new Date(today.getFullYear(), 11, 31); // 31 décembre de cette année
      } else if (this.selectedTimeFilter === 'Année dernière') {
        start = new Date(today.getFullYear() - 1, 0, 1); // 1er janvier de l'année dernière
        end = new Date(today.getFullYear() - 1, 11, 31); // 31 décembre de l'année dernière
      } else if (this.selectedTimeFilter === 'Personnalisé' && this.startDate && this.endDate) {
        start = new Date(this.startDate);
        end = new Date(this.endDate);
        end.setDate(end.getDate() + 1); // inclure la date de fin
      }

      if (!start || !end) {
        return data;
      }
      console.log('[DEBUG] filterByPeriod: start =', start, 'end =', end);

      return data.filter((item: any) => {
        const dateStr = item.date || item.dateOperation;
        if (!dateStr) return false;
        const date = new Date(dateStr.split('T')[0]);
        const inPeriod = date >= start! && date < end!;
        console.log('[DEBUG] filterByPeriod: date =', date, 'inPeriod =', inPeriod, 'raw =', dateStr);
        return inPeriod;
      });
    }

    updateBarChartData() {
      // Palette de couleurs standard (10 couleurs)
      const colorList = [
        '#1976d2', '#388e3c', '#fbc02d', '#d32f2f', '#7b1fa2',
        '#0288d1', '#c2185b', '#ffa000', '#388e3c', '#455a64'
      ];
      // Fonction pour générer une couleur aléatoire
      const randomColor = () => '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
      // Les données sont déjà filtrées lors du chargement
      const agencySummaryFiltered = this.agencySummaryData;
      const operationsFiltered = this.allOperations;
      const normalize = (str: string) => (str || '').toLowerCase().normalize('NFD').replace(/[ \u0300-\u036f]/g, '');

      if (this.selectedMetric === 'transactions') {
        // Bar chart : répartition par service
        const excludedTypes = ['annulation_bo']; // NE PAS exclure 'transaction_cree'
        // On filtre explicitement par agence (client) sélectionnée pour la courbe
        let filteredAgencySummary = agencySummaryFiltered
            .filter(s => !excludedTypes.includes((s.typeOperation || '').toLowerCase()))
            .filter(s => this.shouldIncludeOperation(s.typeOperation));

        if (this.selectedAgency && this.selectedAgency.length > 0) {
          filteredAgencySummary = filteredAgencySummary.filter(s => this.selectedAgency.map(normalize).includes(normalize(s.agency)));
        }
        const aggregation: { [service: string]: number } = {};
        filteredAgencySummary.forEach((s: any) => {
          if (!aggregation[s.service]) aggregation[s.service] = 0;
          aggregation[s.service] += Number(s.recordCount) || 0;
        });
        const barLabels = Object.keys(aggregation);
        // Couleurs : couleur aléatoire pour 'transaction_cree', palette sinon
        const barColors = barLabels.map((label, idx) =>
          (label && label.toLowerCase() === 'transaction_cree') ? randomColor() : colorList[idx % colorList.length]
        );
        // Correction : un dataset par service
        const barDatasets = barLabels.map((label, idx) => ({
          label: label,
          data: [aggregation[label]],
          backgroundColor: barColors[idx],
          borderRadius: 6
        }));
        this.barChartData = {
          labels: [''], // une seule barre par dataset
          datasets: barDatasets
        };
        this.barChartOptions.plugins.legend.display = true;
        this.barChartOptions.plugins.title.text = "Nombre de transactions par service (toutes agences)";

        // Line chart : évolution par service et par date (filtrée par agence)
        const allServices = Array.from(new Set(filteredAgencySummary.map(s => s.service)));
        const allDates = Array.from(new Set(filteredAgencySummary.map(s => s.date))).sort();
        console.log('[DEBUG] filteredAgencySummary:', filteredAgencySummary);
        console.log('[DEBUG] allServices:', allServices);
        console.log('[DEBUG] allDates:', allDates);
        const datasets = allServices.map((service, idx) => {
          const data = allDates.map(date => {
            const found = filteredAgencySummary.find(s => s.service === service && s.date === date);
            return found ? Number(found.recordCount) : 0;
          });
          const color = colorList[idx % colorList.length];
          return {
            data,
            label: service,
            borderColor: color,
            backgroundColor: color + '33', // couleur semi-transparente
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: color,
            pointBorderColor: color,
            borderWidth: 2
          };
        });
        console.log('[DEBUG] datasets:', datasets);
        datasets.forEach(ds => {
          console.log(`[DEBUG] dataset label: ${ds.label}, data:`, ds.data);
        });
        this.lineChartData = {
          labels: allDates,
          datasets
        };
        return;
      } else if (this.selectedMetric === 'revenu') {
        // Bar chart : volume des frais par service (tous les FRAIS_TRANSACTION, crédit et débit)
        const excludedTypes = ['annulation_bo'];
        let filteredOperations = operationsFiltered
            .filter(op => !excludedTypes.includes((op.typeOperation || '').toLowerCase()))
            .filter(op => this.shouldIncludeOperation(op.typeOperation));

        filteredOperations = filteredOperations.filter(op => !excludedTypes.includes((op.typeOperation || '').toLowerCase()));
        const normalize = (str: string) => (str || '').toLowerCase().normalize('NFD').replace(/[ \u0300-\u036f]/g, '');
        let allServices = Array.from(new Set(filteredOperations
          .filter((op: any) => (op.typeOperation || '').toLowerCase() === 'frais_transaction' && op.service)
          .map((op: any) => op.service)));
        if (this.selectedService && this.selectedService.length > 0) {
          const normalizedSelected = this.selectedService.map(normalize);
          allServices = allServices.filter(s => normalizedSelected.includes(normalize(s)));
        }
        // Bar chart : somme des montants par service
        const aggregation: { [service: string]: number } = {};
        filteredOperations.forEach((op: any) => {
          if ((op.typeOperation || '').toLowerCase() === 'frais_transaction' && op.service) {
            if (!aggregation[op.service]) aggregation[op.service] = 0;
            aggregation[op.service] += Number(op.montant) || 0;
          }
        });
        const barLabels = Object.keys(aggregation);
        const barColors = barLabels.map((label, idx) => colorList[idx % colorList.length]);
        const barDatasets = barLabels.map((label, idx) => ({
          label: label,
          data: [aggregation[label]],
          backgroundColor: barColors[idx],
          borderRadius: 6
        }));
        this.barChartData = {
          labels: [''],
          datasets: barDatasets
        };
        this.barChartOptions.plugins.legend.display = true;
        this.barChartOptions.plugins.title.text = "Volume des revenus (frais) par service";

        // Line chart : évolution du volume des revenus par service et par date
        const allServicesLine = Array.from(new Set(filteredOperations
          .filter((op: any) => (op.typeOperation || '').toLowerCase() === 'frais_transaction' && op.service)
          .map((op: any) => op.service)));
        const allDatesLine = Array.from(new Set(filteredOperations
          .filter((op: any) => (op.typeOperation || '').toLowerCase() === 'frais_transaction' && op.dateOperation)
          .map((op: any) => op.dateOperation.split('T')[0]))).sort();
        const datasetsLine = allServicesLine.map((service: string, idx: number) => {
          const data = allDatesLine.map((date: string) => {
            // Somme des montants pour ce service et cette date
            return filteredOperations
              .filter((op: any) => op.service === service && (op.typeOperation || '').toLowerCase() === 'frais_transaction' && op.dateOperation && op.dateOperation.split('T')[0] === date)
              .reduce((sum, op) => sum + Number(op.montant), 0);
          });
          const color = colorList[idx % colorList.length];
          return {
            data,
            label: service,
            borderColor: color,
            backgroundColor: color + '33',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: color,
            pointBorderColor: color,
            borderWidth: 2
          };
        });
        this.lineChartData = {
          labels: allDatesLine,
          datasets: datasetsLine
        };
        return;
      } else if (this.selectedMetric === 'volume') {
        // Bar chart : volume total par type d'opération
        if (!this.detailedMetrics?.operationStats) return;
        const excludedTypes2 = ['annulation_bo']; // NE PAS exclure 'transaction_cree'
        let filteredOperations = operationsFiltered
            .filter(op => !excludedTypes2.includes((op.typeOperation || '').toLowerCase()))
            .filter(op => this.shouldIncludeOperation(op.typeOperation));
            
        // Correction : appliquer le filtre service si sélectionné
        if (this.selectedService && this.selectedService.length > 0) {
          const normalize = (str: string) => (str || '').toLowerCase().normalize('NFD').replace(/[ \u0300-\u036f]/g, '');
          const normalizedSelected = this.selectedService.map(normalize);
          filteredOperations = filteredOperations.filter(op => op.service && normalizedSelected.includes(normalize(op.service)));
        }
        // On n'applique plus de filtrage par client ici
        const filteredStats = this.detailedMetrics.operationStats
            .filter(s => !excludedTypes2.includes((s.operationType || '').toLowerCase()))
            .filter(s => this.shouldIncludeOperation(s.operationType));

        // Correction : chaque type devient un dataset distinct, mais sur les opérations filtrées
        const allTypes = Array.from(new Set(filteredOperations.map((op: any) => op.typeOperation)));
        const allDates = Array.from(new Set(filteredOperations
          .filter((op: any) => op.dateOperation)
          .map((op: any) => op.dateOperation.split('T')[0]))).sort();
        const barDatasets = allTypes.map((type: string, idx: number) => ({
          label: type ? type : '(Type inconnu)',
          data: [filteredOperations
            .filter((op: any) => op.typeOperation === type)
            .reduce((sum, op) => sum + Number(op.montant), 0)
          ],
          backgroundColor: (type && type.toLowerCase() === 'transaction_cree') ? randomColor() : colorList[idx % colorList.length],
          borderRadius: 6
        }));
        this.barChartData = {
          labels: [''], // une seule barre par dataset, label vide pour aligner
          datasets: barDatasets
        };
        this.barChartOptions.plugins.legend.display = true;
        this.barChartOptions.plugins.title.text = "Volume total par type d'opération";

        // Line chart : évolution du volume total par type d'opération et par date
        const datasets = allTypes.map((type, idx) => {
          const data = allDates.map(date => {
            // Correction : somme de tous les montants pour ce type et cette date, sur les opérations filtrées
            return filteredOperations
              .filter(op => op.typeOperation === type && op.dateOperation && op.dateOperation.split('T')[0] === date)
              .reduce((sum, op) => sum + Number(op.montant), 0);
          });
          const color = colorList[idx % colorList.length];
          return {
            data,
            label: type,
            borderColor: color,
            backgroundColor: color + '33',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: color,
            pointBorderColor: color,
            borderWidth: 2
          };
        });
        console.log('[DEBUG] datasets:', datasets);
        datasets.forEach(ds => {
          console.log(`[DEBUG] dataset label: ${ds.label}, data:`, ds.data);
        });
        this.lineChartData = {
          labels: allDates,
          datasets
        };
        return;
      }
    }

    private routerSubscription: Subscription = new Subscription();
    private dataUpdateSubscription: Subscription = new Subscription();

    agenceSearchCtrl = new FormControl('');
    serviceSearchCtrl = new FormControl('');
    paysSearchCtrl = new FormControl('');
    filteredAgencies: string[] = [];
    filteredServices: string[] = [];
    filteredCountries: string[] = [];
    // filteredBanques: string[] = []; // supprimé

    @ViewChild('agencySelect') agencySelect!: MatSelect;
    @ViewChild('serviceSelect') serviceSelect!: MatSelect;
    @ViewChild('countrySelect') countrySelect!: MatSelect;

    // SUPPRIMER testMulti et testOptions

    // Ajout des compteurs pour la barre récapitulative
    get totalClientsCount(): number {
      return (this.filteredAgencies?.filter(a => a !== 'Tous').length) || 0;
    }
    get totalServicesCount(): number {
      return (this.filteredServices?.filter(s => s !== 'Tous').length) || 0;
    }
    get totalCountriesCount(): number {
      return (this.filteredCountries?.filter(p => p !== 'Tous').length) || 0;
    }

    constructor(
        private router: Router,
        private dashboardService: DashboardService,
        private appStateService: AppStateService,
        private agencySummaryService: AgencySummaryService,
        private operationService: OperationService
    ) {}

    ngOnInit() {
        this.loadDashboardData();
        this.loadFilterOptions();
        this.loadAgencySummaryData();
        this.loadAllOperations();
        
        // Charger les métriques détaillées après un court délai pour s'assurer que les autres données sont chargées
        setTimeout(() => {
            this.loadDetailedMetrics();
        }, 500);
        
        // Écouter les changements de route pour recharger les données quand on revient sur le dashboard
        this.routerSubscription = this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe((event) => {
            if (event instanceof NavigationEnd && (event.url === '/' || event.url === '/dashboard')) {
                console.log('Dashboard became active, refreshing metrics...');
                this.refreshMetrics();
            }
        });

        // Écouter les notifications de mise à jour de données
        this.dataUpdateSubscription = this.appStateService.dataUpdate$.subscribe(needsUpdate => {
            if (needsUpdate) {
                console.log('Data update notification received, refreshing dashboard...');
                this.refreshMetrics();
                // Marquer que les données ont été rafraîchies
                this.appStateService.markDataRefreshed();
            }
        });

        // Gestionnaire de clic global pour fermer les dropdowns
        document.addEventListener('click', this.handleGlobalClick.bind(this));

        const normalize = (str: string) => (str || '').toLowerCase().normalize('NFD').replace(/[ \u0300-\u036f]/g, '');
        this.agenceSearchCtrl.valueChanges.subscribe(search => {
          const s = (search || '');
          const availableAgencies = this.getFilteredAgencies();
          this.filteredAgencies = availableAgencies.filter(a => normalize(a).includes(normalize(s)));
        });
        this.serviceSearchCtrl.valueChanges.subscribe(search => {
          const s = (search || '').toLowerCase();
          const availableServices = this.getFilteredServices();
          this.filteredServices = availableServices.filter(a => a.toLowerCase().includes(s));
        });
        this.paysSearchCtrl.valueChanges.subscribe(search => {
          const s = (search || '').toLowerCase();
          const availableCountries = this.getFilteredCountries();
          this.filteredCountries = availableCountries.filter(a => a.toLowerCase().includes(s));
        });

        // Sélection automatique agence si un seul résultat dans la recherche
        this.agenceSearchCtrl.valueChanges.subscribe((search: string | null) => {
            const availableAgencies = this.getFilteredAgencies();
            const filtered = availableAgencies.filter(agency =>
                agency.toLowerCase().includes((search || '').toLowerCase())
            );
            // Si un seul résultat et qu'il n'est pas déjà sélectionné
            if (filtered.length === 1 && !this.selectedAgency.includes(filtered[0])) {
                this.selectedAgency = [filtered[0]];
                if (this.agencySelect) { this.agencySelect.close(); }
                this.onFilterChange();
            }
        });
        // Sélection automatique service si un seul résultat dans la recherche
        this.serviceSearchCtrl.valueChanges.subscribe((search: string | null) => {
            const availableServices = this.getFilteredServices();
            const filtered = availableServices.filter(service =>
                service.toLowerCase().includes((search || '').toLowerCase())
            );
            if (filtered.length === 1 && !this.selectedService.includes(filtered[0])) {
                this.selectedService = [filtered[0]];
                if (this.serviceSelect) { this.serviceSelect.close(); }
                this.onFilterChange();
            }
        });
        // Sélection automatique pays si un seul résultat dans la recherche (désactivée pour éviter l'auto-sélection de "CM")
        // this.paysSearchCtrl.valueChanges.subscribe((search: string | null) => {
        //     const availableCountries = this.getFilteredCountries();
        //     const filtered = availableCountries.filter(country =>
        //         country.toLowerCase().includes((search || '').toLowerCase())
        //     );
        //     if (filtered.length === 1 && !this.selectedCountry.includes(filtered[0])) {
        //         this.selectedCountry = [filtered[0]];
        //         if (this.countrySelect) { this.countrySelect.close(); }
        //         this.onFilterChange();
        //     }
        // });
    }

    ngOnDestroy() {
        this.routerSubscription.unsubscribe();
        this.dataUpdateSubscription.unsubscribe();
        document.removeEventListener('click', this.handleGlobalClick.bind(this));
    }

    private handleGlobalClick(event: MouseEvent): void {
        // Fermer les dropdowns si on clique en dehors
        const target = event.target as HTMLElement;
        if (!target.closest('.custom-select-container')) {
            // Les dropdowns personnalisés n'existent plus, on peut supprimer cette logique
        }
    }

    private loadDashboardData() {
        this.loading = true;
        this.error = null;

        this.dashboardService.getDashboardMetrics().subscribe({
            next: (metrics: DashboardMetrics) => {
                this.totalReconciliations = metrics.totalReconciliations;
                this.totalFiles = metrics.totalFiles;
                this.lastActivity = metrics.lastActivity;
                this.todayReconciliations = metrics.todayReconciliations;
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading dashboard data:', error);
                this.error = 'Erreur lors du chargement des données';
                this.loading = false;
            }
        });
    }

    private loadFilterOptions() {
        this.dashboardService.getFilterOptions().subscribe({
            next: (options: FilterOptions) => {
                this.filterOptions = options;
                // Initialiser immédiatement les listes filtrées avec les données disponibles
                this.filteredAgencies = options.agencies || [];
                this.filteredServices = options.services || [];
                this.filteredCountries = options.countries || [];
                
                // Mettre à jour les listes filtrées avec cloisonnement après chargement des données
                setTimeout(() => {
                    this.updateFilteredLists();
                }, 100);
                setTimeout(() => {
                    this.agenceSearchCtrl.setValue('');
                    this.serviceSearchCtrl.setValue('');
                    this.paysSearchCtrl.setValue('');
                }, 0);
                this.selectedAgency = [];
                this.selectedService = [];
                this.selectedCountry = [];
                this.onFilterChange();
                console.log('Filter options loaded:', options);
            },
            error: (error) => {
                console.error('Error loading filter options:', error);
                // Fallback to default values sans 'Tous'
                this.filterOptions = {
                    agencies: [],
                    services: [],
                    countries: [],
                    timeFilters: ['Aujourd\'hui', 'Cette semaine', 'Ce mois', 'Cette année', 'Année dernière', 'Personnalisé']
                };
                // Initialiser immédiatement les listes filtrées
                this.filteredAgencies = this.filterOptions.agencies;
                this.filteredServices = this.filterOptions.services;
                this.filteredCountries = this.filterOptions.countries;
                
                setTimeout(() => {
                    this.updateFilteredLists();
                }, 100);
                setTimeout(() => {
                    this.agenceSearchCtrl.setValue('');
                    this.serviceSearchCtrl.setValue('');
                    this.paysSearchCtrl.setValue('');
                }, 0);
            }
        });
    }

    private loadDetailedMetrics() {
        this.detailedLoading = true;
        this.detailedError = null;
        // Ajout de logs pour diagnostic
        console.log('[loadDetailedMetrics] Appelée avec :');
        console.log('selectedAgency:', this.selectedAgency);
        console.log('selectedService:', this.selectedService);
        console.log('selectedCountry:', this.selectedCountry);
        console.log('selectedTimeFilter:', this.selectedTimeFilter);
        console.log('startDate:', this.startDate);
        console.log('endDate:', this.endDate);
        // Adapter les filtres envoyés au backend
        const agencies = this.selectedAgency.length === 0 ? undefined : this.selectedAgency;
        const services = this.selectedService.length === 0 ? undefined : this.selectedService;
        const countries = this.selectedCountry.length === 0 ? undefined : this.selectedCountry;
        const timeFilter = this.selectedTimeFilter !== 'Tous' ? this.selectedTimeFilter : undefined;
        
        this.dashboardService.getDetailedMetrics(
            agencies,
            services,
            countries,
            timeFilter,
            this.startDate || undefined,
            this.endDate || undefined
        ).subscribe({
            next: (metrics: DetailedMetrics) => {
                // Log de la réponse du backend
                console.log('[loadDetailedMetrics] Réponse du backend :', metrics);
                // Si aucune donnée n'est trouvée, afficher un message explicite et vider les données
                if (!metrics || (Array.isArray(metrics) && metrics.length === 0) || (typeof metrics === 'object' && Object.keys(metrics).length === 0)) {
                    this.detailedMetrics = null;
                    this.barChartData = { labels: [], datasets: [] };
                    this.lineChartData = { labels: [], datasets: [] };
                    this.detailedError = 'Aucune donnée pour ce pays';
                    this.detailedLoading = false;
                    this.updateBarChartData();
                    return;
                }
                this.detailedMetrics = metrics;
                this.detailedLoading = false;
                this.detailedError = null;
                this.updateBarChartData();
                console.log('Detailed metrics loaded:', metrics);
            },
            error: (error) => {
                // En cas d'erreur, vider les données et afficher un message explicite
                this.detailedMetrics = null;
                this.barChartData = { labels: [], datasets: [] };
                this.lineChartData = { labels: [], datasets: [] };
                this.detailedError = 'Aucune donnée pour ce pays';
                this.detailedLoading = false;
            }
        });
    }

    filteredAgencySummary: any[] = [];

    updateDashboardIndicators() {
      // Utiliser les données filtrées pour recalculer les indicateurs
      const agencySummaryFiltered = this.agencySummaryData.filter((s: any) =>
        (this.selectedAgency?.length === 0 || this.selectedAgency?.includes(s.agency)) &&
        (this.selectedService?.length === 0 || this.selectedService?.includes(s.service)) &&
        (this.selectedCountry?.length === 0 || this.selectedCountry?.includes(s.pays)) &&
        // (this.selectedBanque === 'Tous' || this.selectedBanque === s.banque) && // supprimé
        (this.selectedTimeFilter === 'Tous' || (s.date && s.date.startsWith(this.selectedTimeFilter)))
      );
      this.filteredAgencySummary = agencySummaryFiltered;
      // Volume total
      this.totalVolume = agencySummaryFiltered.reduce((sum: number, s: any) => sum + (Number(s.totalVolume) || 0), 0);
      // Nombre de transactions
      this.totalTransactions = agencySummaryFiltered.reduce((sum: number, s: any) => sum + (Number(s.recordCount) || 0), 0);
      // Nombre de clients (si champ client ou unique agency/service)
      this.totalClients = new Set(agencySummaryFiltered.map((s: any) => s.agency + '|' + s.service)).size;
      // Autres indicateurs à adapter si besoin
    }

    onFilterChange() {
        console.log('onFilterChange', this.selectedCountry, this.selectedService);
        
        // Mettre à jour les listes filtrées pour le cloisonnement
        this.updateFilteredLists();
        
        this.loadAgencySummaryData();
        this.loadAllOperations();
        this.updateDashboardIndicators();
        // Recharger les métriques détaillées avec les nouveaux filtres
        this.loadDetailedMetrics();
        // Mettre à jour les graphiques
        this.updateBarChartData();
        
        // Fermer automatiquement les dropdowns après un choix
        setTimeout(() => {
            if (this.agencySelect) this.agencySelect.close();
            if (this.serviceSelect) this.serviceSelect.close();
            if (this.countrySelect) this.countrySelect.close();
        }, 100);
    }

    // Méthode pour mettre à jour les listes filtrées avec cloisonnement
    updateFilteredLists() {
        // S'assurer qu'on a des données avant de filtrer
        if (!this.agencySummaryData || this.agencySummaryData.length === 0) {
            // Si pas de données agencySummaryData, utiliser filterOptions
            if (this.filterOptions) {
                this.filteredAgencies = this.filterOptions.agencies || [];
                this.filteredServices = this.filterOptions.services || [];
                this.filteredCountries = this.filterOptions.countries || [];
            }
            return;
        }
        
        // Mettre à jour les services disponibles selon l'agence sélectionnée
        this.filteredServices = this.getFilteredServices();
        
        // Mettre à jour les pays disponibles selon l'agence sélectionnée
        this.filteredCountries = this.getFilteredCountries();
        
        // Mettre à jour les agences disponibles selon les autres filtres
        this.filteredAgencies = this.getFilteredAgencies();
        
        // Nettoyer les sélections qui ne sont plus valides
        this.cleanInvalidSelections();
    }

    // Méthode pour nettoyer les sélections invalides
    cleanInvalidSelections() {
        const currentAgency = this.selectedAgency;
        const currentService = this.selectedService;
        const currentCountry = this.selectedCountry;

        // Nettoyer les services si l'agence a changé
        if (currentService && currentService.length > 0) {
            const validServices = currentService.filter((service: string) => 
                this.filteredServices.includes(service)
            );
            if (validServices.length !== currentService.length) {
                this.selectedService = validServices;
            }
        }

        // Nettoyer les pays si l'agence a changé
        if (currentCountry && currentCountry.length > 0) {
            const validCountries = currentCountry.filter((country: string) => 
                this.filteredCountries.includes(country)
            );
            if (validCountries.length !== currentCountry.length) {
                this.selectedCountry = validCountries;
            }
        }

        // Nettoyer les agences si les autres filtres ont changé
        if (currentAgency && currentAgency.length > 0) {
            const validAgencies = currentAgency.filter((agency: string) => 
                this.filteredAgencies.includes(agency)
            );
            if (validAgencies.length !== currentAgency.length) {
                this.selectedAgency = validAgencies;
            }
        }
    }

    // Méthodes de filtrage avec cloisonnement
    getFilteredAgencies(): string[] {
        // Utiliser les données disponibles : agencySummaryData ou filterOptions
        let data = this.agencySummaryData && this.agencySummaryData.length > 0 
            ? this.agencySummaryData 
            : (this.filterOptions?.agencies || []).map(agency => ({ agency, service: '', country: '' }));
        
        // Filtrer par service si sélectionné
        if (this.selectedService && this.selectedService.length > 0) {
            data = data.filter(s => this.selectedService.includes(s.service));
        }
        // Filtrer par pays si sélectionné
        if (this.selectedCountry && this.selectedCountry.length > 0) {
            data = data.filter(s => this.selectedCountry.includes(s.country));
        }
        const agencies = [...new Set(data.map(s => s.agency))];
        return agencies.sort();
    }

    getFilteredServices(): string[] {
        // Utiliser les données disponibles : agencySummaryData ou filterOptions
        let data = this.agencySummaryData && this.agencySummaryData.length > 0 
            ? this.agencySummaryData 
            : (this.filterOptions?.services || []).map(service => ({ agency: '', service, country: '' }));
        
        // Filtrer par agence si sélectionnée (cloisonnement principal)
        if (this.selectedAgency && this.selectedAgency.length > 0) {
            data = data.filter(s => this.selectedAgency.includes(s.agency));
        }
        // Filtrer par pays si sélectionné
        if (this.selectedCountry && this.selectedCountry.length > 0) {
            data = data.filter(s => this.selectedCountry.includes(s.country));
        }
        const services = [...new Set(data.map(s => s.service))];
        return services.sort();
    }

    getFilteredCountries(): string[] {
        // Utiliser les données disponibles : agencySummaryData ou filterOptions
        let data = this.agencySummaryData && this.agencySummaryData.length > 0 
            ? this.agencySummaryData 
            : (this.filterOptions?.countries || []).map(country => ({ agency: '', service: '', country }));
        
        // Filtrer par agence si sélectionnée (cloisonnement principal)
        if (this.selectedAgency && this.selectedAgency.length > 0) {
            data = data.filter(s => this.selectedAgency.includes(s.agency));
        }
        // Filtrer par service si sélectionné
        if (this.selectedService && this.selectedService.length > 0) {
            data = data.filter(s => this.selectedService.includes(s.service));
        }
        const countries = [...new Set(data.map(s => s.country))];
        return countries.sort();
    }

    onTimeFilterChange() {
        if (this.selectedTimeFilter === 'Personnalisé') {
            this.showCustomDateInputs = true;
        } else {
            this.showCustomDateInputs = false;
            this.startDate = '';
            this.endDate = '';
        }
        this.onFilterChange();
    }

    onAgencyChange() {
        this.onFilterChange();
    }

    onServiceChange() {
        this.onFilterChange();
    }

    onCountryChange() {
        this.onFilterChange();
    }

    toggleAllAgencies(event: any) {
      if (event.target.checked) {
        this.selectedAgency = [];
      }
      this.onFilterChange();
    }
    onAgencyCheckboxChange(agency: string, event: any) {
      if (event.target.checked) {
        if (!this.selectedAgency?.includes(agency)) {
          this.selectedAgency = [...(this.selectedAgency || []), agency];
        }
      } else {
        this.selectedAgency = (this.selectedAgency || []).filter(a => a !== agency);
        if (!this.selectedAgency || this.selectedAgency.length === 0) {
          this.selectedAgency = [];
        }
      }
      this.onFilterChange();
    }
    toggleAllServices(event: any) {
      if (event.target.checked) {
        this.selectedService = [];
      }
      this.onFilterChange();
    }
    onServiceCheckboxChange(service: string, event: any) {
      if (event.target.checked) {
        if (!this.selectedService?.includes(service)) {
          this.selectedService = [...(this.selectedService || []), service];
        }
      } else {
        this.selectedService = (this.selectedService || []).filter(s => s !== service);
        if (!this.selectedService || this.selectedService.length === 0) {
          this.selectedService = [];
        }
      }
      this.onFilterChange();
    }
    toggleAllCountries(event: any) {
      if (event.target.checked) {
        this.selectedCountry = [];
      }
      this.onFilterChange();
    }
    onCountryCheckboxChange(country: string, event: any) {
      if (event.target.checked) {
        if (!this.selectedCountry?.includes(country)) {
          this.selectedCountry = [...(this.selectedCountry || []), country];
        }
      } else {
        this.selectedCountry = (this.selectedCountry || []).filter(c => c !== country);
        if (!this.selectedCountry || this.selectedCountry.length === 0) {
          this.selectedCountry = [];
        }
      }
      this.onFilterChange();
    }

    getFrequencyPercentage(frequency: number): number {
        if (!this.detailedMetrics || this.detailedMetrics.frequencyStats.length === 0) {
            return 0;
        }
        
        const maxFrequency = Math.max(...this.detailedMetrics.frequencyStats.map(f => f.frequency));
        return maxFrequency > 0 ? (frequency / maxFrequency) * 100 : 0;
    }

    refreshMetrics() {
        console.log('Refreshing dashboard metrics...');
        this.loading = true;
        this.error = null;
        
        // Recharger les métriques de base
        this.loadDashboardData();
        
        // Recharger les métriques détaillées (toujours, même sans filtres)
        this.loadDetailedMetrics();
        
        // Afficher un message de confirmation
        setTimeout(() => {
            console.log('Dashboard metrics refreshed successfully');
        }, 1000);
    }

    startNewReconciliation() {
        console.log('Navigation vers nouvelle réconciliation');
        this.router.navigate(['/upload']);
    }

    goToStats() {
        console.log('Navigation vers les statistiques');
        this.router.navigate(['/stats']);
    }

    goToResults() {
        console.log('Navigation vers les résultats');
        this.router.navigate(['/results']);
    }

    getAverageTransactionsPerPeriod(): string {
        if (!this.detailedMetrics) return '0';
        return this.detailedMetrics.averageTransactions?.toLocaleString() ?? '0';
    }


    resetFilters() {
        this.selectedAgency = [];
        this.selectedService = [];
        this.selectedCountry = [];
        this.selectedTimeFilter = 'Ce mois'; // valeur par défaut
        this.startDate = '';
        this.endDate = '';
        this.showCustomDateInputs = false;
        this.loadDetailedMetrics();
        this.updateBarChartData();
    }

    exportDetailedMetricsExcel() {
        if (!this.detailedMetrics) return;
        const wb = XLSX.utils.book_new();

        // 1. Feuille Métriques principales avec couleurs
        const mainMetrics = [
            ['Métrique', 'Valeur'],
            ['Volume Total', this.detailedMetrics.totalVolume],
            ['Transactions', this.detailedMetrics.totalTransactions],
            ['Clients', this.detailedMetrics.totalClients],
            ['Transaction moyenne/Jour', this.getAverageTransactionsPerPeriod()],
            ['Volume Moyen/Jour', this.detailedMetrics.averageVolume],
            ['Frais moyen/Jour', this.detailedMetrics.averageFeesPerDay],
        ];
        const wsMain = XLSX.utils.aoa_to_sheet(mainMetrics);
        
        // Appliquer des styles et couleurs
        wsMain['!cols'] = [{ width: 25 }, { width: 20 }];
        
        // Style pour l'en-tête
        if (wsMain['A1']) {
            wsMain['A1'].s = {
                fill: { fgColor: { rgb: "4F81BD" } },
                font: { color: { rgb: "FFFFFF" }, bold: true },
                alignment: { horizontal: "center" }
            };
        }
        if (wsMain['B1']) {
            wsMain['B1'].s = {
                fill: { fgColor: { rgb: "4F81BD" } },
                font: { color: { rgb: "FFFFFF" }, bold: true },
                alignment: { horizontal: "center" }
            };
        }
        
        // Styles pour les métriques
        for (let i = 2; i <= mainMetrics.length; i++) {
            const cellA = wsMain[`A${i}`];
            const cellB = wsMain[`B${i}`];
            
            if (cellA) {
                cellA.s = {
                    fill: { fgColor: { rgb: "E7E6E6" } },
                    font: { bold: true },
                    alignment: { horizontal: "left" }
                };
            }
            
            if (cellB) {
                cellB.s = {
                    fill: { fgColor: { rgb: "F2F2F2" } },
                    font: { color: { rgb: "000000" } },
                    alignment: { horizontal: "right" },
                    numFmt: i === 2 || i === 5 || i === 6 ? "#,##0" : "0"
                };
            }
        }
        
        XLSX.utils.book_append_sheet(wb, wsMain, 'Métriques');

        // 2. Feuille Statistiques par type d'opération avec couleurs
        if (this.detailedMetrics.operationStats && this.detailedMetrics.operationStats.length > 0) {
            const opHeader = ['Type d\'opération', 'Transactions', 'Volume total', 'Volume moyen'];
            const opData = this.detailedMetrics.operationStats.map(stat => [
                stat.operationType,
                stat.transactionCount,
                stat.totalVolume,
                stat.averageVolume
            ]);
            const wsOp = XLSX.utils.aoa_to_sheet([opHeader, ...opData]);
            
            // Appliquer des styles
            wsOp['!cols'] = [{ width: 20 }, { width: 15 }, { width: 18 }, { width: 18 }];
            
            // Style pour l'en-tête
            for (let col = 0; col < opHeader.length; col++) {
                const cell = wsOp[XLSX.utils.encode_cell({ r: 0, c: col })];
                if (cell) {
                    cell.s = {
                        fill: { fgColor: { rgb: "70AD47" } },
                        font: { color: { rgb: "FFFFFF" }, bold: true },
                        alignment: { horizontal: "center" }
                    };
                }
            }
            
            // Styles pour les données
            for (let row = 1; row <= opData.length; row++) {
                for (let col = 0; col < opHeader.length; col++) {
                    const cell = wsOp[XLSX.utils.encode_cell({ r: row, c: col })];
                    if (cell) {
                        const isEven = row % 2 === 0;
                        cell.s = {
                            fill: { fgColor: { rgb: isEven ? "F2F2F2" : "FFFFFF" } },
                            font: { color: { rgb: "000000" } },
                            alignment: { horizontal: col === 0 ? "left" : "right" },
                            numFmt: col >= 1 ? "#,##0" : "0"
                        };
                    }
                }
            }
            
            XLSX.utils.book_append_sheet(wb, wsOp, 'Stats opérations');
        }

        // 3. Feuille Fréquence avec couleurs
        if (this.detailedMetrics.frequencyStats && this.detailedMetrics.frequencyStats.length > 0) {
            const freqHeader = ['Type d\'opération', 'Fréquence'];
            const freqData = this.detailedMetrics.frequencyStats.map(stat => [
                stat.operationType,
                stat.frequency
            ]);
            const wsFreq = XLSX.utils.aoa_to_sheet([freqHeader, ...freqData]);
            
            // Appliquer des styles
            wsFreq['!cols'] = [{ width: 20 }, { width: 15 }];
            
            // Style pour l'en-tête
            for (let col = 0; col < freqHeader.length; col++) {
                const cell = wsFreq[XLSX.utils.encode_cell({ r: 0, c: col })];
                if (cell) {
                    cell.s = {
                        fill: { fgColor: { rgb: "FFC000" } },
                        font: { color: { rgb: "000000" }, bold: true },
                        alignment: { horizontal: "center" }
                    };
                }
            }
            
            // Styles pour les données
            for (let row = 1; row <= freqData.length; row++) {
                for (let col = 0; col < freqHeader.length; col++) {
                    const cell = wsFreq[XLSX.utils.encode_cell({ r: row, c: col })];
                    if (cell) {
                        const isEven = row % 2 === 0;
                        cell.s = {
                            fill: { fgColor: { rgb: isEven ? "FFF2CC" : "FFFFFF" } },
                            font: { color: { rgb: "000000" } },
                            alignment: { horizontal: col === 0 ? "left" : "right" },
                            numFmt: col === 1 ? "0" : "0"
                        };
                    }
                }
            }
            
            XLSX.utils.book_append_sheet(wb, wsFreq, 'Fréquence');
        }

        // 4. Feuille de résumé avec filtres appliqués
        const summaryData = [
            ['Rapport des Métriques Détaillées'],
            [''],
            ['Filtres appliqués:'],
            ['Agences', this.selectedAgency?.join(', ') || 'Tous'],
            ['Services', this.selectedService?.join(', ') || 'Tous'],
            ['Pays', this.selectedCountry?.join(', ') || 'Tous'],
            // ['Banque', this.selectedBanque], // supprimé
            ['Période', this.selectedTimeFilter],
            [''],
            ['Date de génération', new Date().toLocaleString('fr-FR')]
        ];
        
        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        
        // Ajuster les largeurs de colonnes selon le contenu
        const maxLabelLength = Math.max(...summaryData.map(row => row[0]?.toString().length || 0));
        const maxValueLength = Math.max(...summaryData.map(row => row[1]?.toString().length || 0));
        
        wsSummary['!cols'] = [
            { width: Math.max(maxLabelLength + 2, 15) }, // Label + marge
            { width: Math.max(maxValueLength + 2, 30) }  // Valeur + marge
        ];
        
        // Style pour le titre
        if (wsSummary['A1']) {
            wsSummary['A1'].s = {
                fill: { fgColor: { rgb: "4472C4" } },
                font: { color: { rgb: "FFFFFF" }, bold: true, size: 14 },
                alignment: { horizontal: "center", vertical: "center" }
            };
            // Fusionner les cellules pour le titre
            wsSummary['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
        }
        
        // Style pour "Filtres appliqués"
        if (wsSummary['A3']) {
            wsSummary['A3'].s = {
                fill: { fgColor: { rgb: "E7E6E6" } },
                font: { bold: true, size: 12 },
                alignment: { horizontal: "left", vertical: "center" }
            };
            // Fusionner les cellules pour "Filtres appliqués"
            wsSummary['!merges'] = wsSummary['!merges'] || [];
            wsSummary['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 1 } });
        }
        
        // Styles pour les filtres
        for (let i = 4; i <= 7; i++) {
            const cellA = wsSummary[`A${i}`];
            const cellB = wsSummary[`B${i}`];
            
            if (cellA) {
                cellA.s = {
                    fill: { fgColor: { rgb: "F8F9FA" } },
                    font: { bold: true },
                    alignment: { horizontal: "left", vertical: "center" },
                    border: { 
                        right: { style: "thin", color: { rgb: "CCCCCC" } }
                    }
                };
            }
            
            if (cellB) {
                cellB.s = {
                    fill: { fgColor: { rgb: "FFFFFF" } },
                    font: { color: { rgb: "333333" } },
                    alignment: { horizontal: "left", vertical: "center" },
                    border: { 
                        left: { style: "thin", color: { rgb: "CCCCCC" } }
                    }
                };
            }
        }
        
        // Style pour la date de génération
        if (wsSummary['A9']) {
            wsSummary['A9'].s = {
                fill: { fgColor: { rgb: "E7E6E6" } },
                font: { bold: true, italic: true },
                alignment: { horizontal: "left", vertical: "center" }
            };
        }
        if (wsSummary['B9']) {
            wsSummary['B9'].s = {
                fill: { fgColor: { rgb: "F2F2F2" } },
                font: { italic: true, color: { rgb: "666666" } },
                alignment: { horizontal: "left", vertical: "center" }
            };
        }
        
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Résumé');

        XLSX.writeFile(wb, 'metriques_detaillees.xlsx');
    }

    loadAgencySummaryData() {
      const normalize = (str: string) => (str || '').toLowerCase().normalize('NFD').replace(/[ \u0300-\u036f]/g, '');
      const agencies = this.selectedAgency?.length === 0 ? undefined : this.selectedAgency;
      const services = this.selectedService?.length === 0 ? undefined : this.selectedService;
      const countries = this.selectedCountry?.length === 0 ? undefined : this.selectedCountry;
      this.agencySummaryService.getAllSummaries().subscribe({
        next: (data: any[]) => {
          this.agencySummaryData = data.filter((item: any) => {
            const agencyMatch = !agencies || agencies.map(normalize).includes(normalize(item.agency));
            const serviceMatch = !services || services.includes(item.service);
            const countryMatch = !countries || countries.includes(item.pays);
            return agencyMatch && serviceMatch && countryMatch;
          });
          this.agencySummaryData = this.filterByPeriod(this.agencySummaryData);
          
          // Trier par date décroissante (du plus récent au plus ancien)
          this.agencySummaryData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          
          // Mettre à jour les listes filtrées avec cloisonnement après chargement des données
          this.updateFilteredLists();
          
          this.updateDashboardIndicators();
          this.updateBarChartData();
        },
        error: (err) => {
          this.agencySummaryData = [];
          this.updateDashboardIndicators();
          this.updateBarChartData();
        }
      });
    }

    loadAllOperations() {
      console.log('[DEBUG] loadAllOperations called');
      const normalize = (str: string) => (str || '').toLowerCase().normalize('NFD').replace(/[ \u0300-\u036f]/g, '');
      const agencies = this.selectedAgency?.length === 0 ? undefined : this.selectedAgency;
      const services = this.selectedService?.length === 0 ? undefined : this.selectedService;
      const countries = this.selectedCountry?.length === 0 ? undefined : this.selectedCountry;
      this.operationService.getAllOperations().subscribe({
        next: (ops: any[]) => {
          console.log('[DEBUG] allOperations from backend:', ops);
          if (ops && ops.length > 0) {
            console.log('[DEBUG] keys of first operation:', Object.keys(ops[0]));
            const uniqueCodes = Array.from(new Set(ops.map(o => o.codeProprietaire)));
            console.log('[DEBUG] codeProprietaire values in operations:', uniqueCodes);
          }
          console.log('[DEBUG] filterByPeriod params: selectedTimeFilter =', this.selectedTimeFilter, 'startDate =', this.startDate, 'endDate =', this.endDate);
          console.log('[DEBUG] ops before filterByPeriod:', ops);
          // Filtrage par client AVANT la période
          let filteredByClient = ops;
          if (agencies && agencies.length > 0) {
            const normalizedAgencies = agencies.map(normalize);
            filteredByClient = ops.filter((item: any) => normalizedAgencies.includes(normalize(item.codeProprietaire)));
          }
          if (filteredByClient && filteredByClient.length > 0) {
            const types = Array.from(new Set(filteredByClient.map(op => op.typeOperation)));
            console.log('[DEBUG] typeOperation for selected client:', types);
            const fraisOps = filteredByClient.filter(op => (op.typeOperation || '').toLowerCase() === 'frais_transaction');
            const servicesFrais = Array.from(new Set(fraisOps.map(op => op.service)));
            console.log('[DEBUG] services for FRAIS_TRANSACTION:', servicesFrais);
            const datesFrais = Array.from(new Set(fraisOps.map(op => op.dateOperation)));
            console.log('[DEBUG] dateOperation for FRAIS_TRANSACTION:', datesFrais);
          } else {
            console.log('[DEBUG] No operations after client filter');
          }
          // Puis filtrage par période
          this.allOperations = this.filterByPeriod(filteredByClient);
          this.updateBarChartData();
        },
        error: (err) => {
          console.error('[DEBUG] Error in loadAllOperations:', err);
          this.allOperations = [];
          this.updateBarChartData();
        }
      });
    }

    onBarClick(event: any) {
      if (event.active && event.active.length > 0) {
        const chartElement = event.active[0];
        let label = '';
        // Pour le mode volume, chaque dataset a un label, sinon c'est dans labels
        if (this.selectedMetric === 'volume') {
          label = this.barChartData.datasets[chartElement.datasetIndex]?.label || '';
        } else {
          label = this.barChartData.labels[chartElement.index] || '';
        }
        alert('Vous avez cliqué sur : ' + label);
      }
    }
} 