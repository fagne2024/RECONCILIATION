import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter, take } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { DashboardService, DashboardMetrics, DetailedMetrics, TransactionCreatedStats, ServiceStat } from '../../services/dashboard.service';
import { AppStateService } from '../../services/app-state.service';
import * as XLSX from 'xlsx';
import { ChartConfiguration } from 'chart.js';
import { AgencySummaryService } from '../../services/agency-summary.service';
import { OperationService } from '../../services/operation.service';
import { CompteService } from '../../services/compte.service';
import { DashboardReconciliationService, Result8RecData } from '../../services/dashboard-reconciliation.service';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatOptionModule } from '@angular/material/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormControl } from '@angular/forms';
import { Chart } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { MatSelect } from '@angular/material/select';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

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
    /** Réconciliations aujourd'hui affichées (comptées deux fois comme demandé). */
    get todayReconciliationsDisplay(): number {
        return (this.todayReconciliations || 0) * 2;
    }
    loading: boolean = true;
    error: string | null = null;

    // Métriques détaillées
    detailedMetrics: DetailedMetrics | null = null;
    detailedLoading: boolean = false;
    detailedError: string | null = null;
    
    // Statistiques filtrées pour l'affichage
    filteredOperationStats: any[] = [];
    filteredFrequencyStats: any[] = [];

    // Statistiques des transactions créées
    transactionCreatedStats: TransactionCreatedStats | null = null;
    transactionCreatedLoading: boolean = false;
    transactionCreatedError: string | null = null;

    // Affichage section du bas (Transactions créées par service)
    showBottomSection: boolean = false;

    // Masquer / afficher les sections du dashboard (comme Transactions créées par service)
    showBannerSection: boolean = true;
    showReconciliationSection: boolean = true;
    showMetricsSection: boolean = true;
    showSummaryBarSection: boolean = true;
    showDetailedMetricsSection: boolean = true;

    // Modal pour afficher les graphiques en plein écran
    showGraphModal: boolean = false;

    // Modal pour accéder rapidement au relevé (statut des réconciliations)
    showReleveStatusModal: boolean = false;
    releveStatusCountry: string | null = null;
    releveStatusService: string | null = null;
    releveStatusCountries: string[] = [];
    releveStatusServices: string[] = [];
    releveStatusDate: string = '';
    releveStatusEnv: string = 'TOTAL';
    releveStatusError: string | null = null;
    private reconciliationCountryServices: { [country: string]: string[] } | null = null;

    // Résultat du contrôle de statut pour le relevé
    showReleveStatusResultModal: boolean = false;
    releveStatusResultLoading: boolean = false;
    releveStatusAllOk: boolean = false;
    releveStatusLines: Result8RecData[] = [];

    // Résumé "État des réconciliations" (bloc de gauche)
    reconciliationSummaryDate: string = ''; // utilisé pour initialiser, mais le calcul se fait sur "cette semaine"
    reconciliationSummaryEnv: string = 'BET';
    reconciliationSummaryCountry: string = '';
    reconciliationSummaryCountries: string[] = [];
    reconciliationSummaryService: string = '';
    reconciliationSummaryServices: string[] = [];
    readonly reconciliationEnvOptions: string[] = ['BET', 'HT', 'HUBAO', 'TOP20', 'GU3', 'TOTAL'];
    reconciliationSummaryLoading: boolean = false;
    reconciliationSummaryError: string | null = null;
    reconciliationSummaryRows: {
        service: string;
        days: {
            date: string;
            status: 'RECONCILIE' | 'NON_RECONCILIE' | 'EN_COURS' | 'NON_RECONCILIE';
            ticketId: string;
            env: string;
        }[];
    }[] = [];
    weekDays: { label: string; date: string }[] = [];
    visibleWeekDays: { label: string; date: string }[] = [];
    private visibleDayIndices: number[] = [];
    recoStats = {
        total: 0,
        reconcilie: 0,
        enCours: 0,
        nonReco: 0,
        tauxReconcilie: 0
    };
    reconciliationStatusFilter: 'ALL' | 'RECONCILIE' | 'EN_COURS' | 'NON_RECONCILIE' = 'ALL';
    reconciliationPageIndex: number = 0;
    readonly reconciliationPageSize: number = 3;
    private allReconciliationServices: string[] = [];

    // Popup "Vue semaine" (État des réconciliations)
    recoViewModalOpen: boolean = false;
    recoViewWeekStart: string = ''; // Lundi de la semaine affichée (YYYY-MM-DD)
    recoViewWeekDays: { label: string; date: string }[] = [];
    recoViewRows: {
        service: string;
        days: {
            date: string;
            status: 'RECONCILIE' | 'NON_RECONCILIE' | 'EN_COURS' | 'NON_RECONCILIE';
            ticketId: string;
            env: string;
        }[];
    }[] = [];
    recoViewLoading: boolean = false;
    recoViewError: string | null = null;
    recoViewStats = {
        total: 0,
        reconcilie: 0,
        enCours: 0,
        nonReco: 0,
        tauxReconcilie: 0
    };
    @ViewChild('recoViewExportContent') recoViewExportContentRef!: ElementRef<HTMLDivElement>;

    // Graphiques État des réconciliations (donut + évolution par jour)
    recoDonutChartData: ChartConfiguration<'doughnut'>['data'] = { labels: [], datasets: [] };
    recoDonutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom' },
            title: { display: true, text: 'RÉPARTITION PAR STATUT' }
        }
    };
    recoEvolutionChartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
    recoEvolutionChartOptions: ChartConfiguration<'bar'>['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top' },
            title: { display: true, text: 'ÉVOLUTION PAR JOUR' }
        },
        scales: {
            x: { stacked: true },
            y: { stacked: true, beginAtZero: true }
        }
    };

    // Filtres
    selectedAgency: string[] = [];
    selectedService: string[] = [];
    selectedCountry: string[] = [];
    selectedTimeFilter: string = 'Ce mois';
    startDate: string = '';
    endDate: string = '';
    showAllData: boolean = false; // Flag pour afficher toutes les données
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
     * Exclut également les ajustements, transactions créées, dépôts et versements.
     * @param typeOperation Le type d'opération à vérifier.
     * @returns `true` si le type doit être inclus, `false` sinon.
     */
    private shouldIncludeOperation(typeOperation: string | null | undefined): boolean {
        if (!typeOperation) {
            return true; // Inclure par défaut si le type est manquant
        }
        const lowerCaseType = typeOperation.toLowerCase();
        
        // Exclure les annulations sauf annulation_bo
        if (lowerCaseType.startsWith('annulation_')) {
            return lowerCaseType === 'annulation_bo';
        }
        
        // Exclure les ajustements, transactions créées, dépôts, versements et virements
        if (lowerCaseType === 'ajustement' || 
            lowerCaseType === 'transaction_cree' ||
            lowerCaseType === 'depot' ||
            lowerCaseType === 'dépôt' ||
            lowerCaseType === 'versement' ||
            lowerCaseType === 'virement') {
            return false;
        }
        
        return true;
    }

    private updateVisibleDaysWindow() {
        if (!this.weekDays || this.weekDays.length === 0) {
            this.visibleWeekDays = [];
            this.visibleDayIndices = [];
            return;
        }

        // On utilise J-1 comme jour de référence pour la fenêtre de 3 jours
        const reference = new Date();
        reference.setDate(reference.getDate() - 1);
        const y = reference.getFullYear();
        const m = (reference.getMonth() + 1).toString().padStart(2, '0');
        const d = reference.getDate().toString().padStart(2, '0');
        const refDateStr = `${y}-${m}-${d}`;

        let endIndex = this.weekDays.findIndex(day => day.date === refDateStr);

        if (endIndex === -1) {
            // Si le jour de référence n'est pas dans la semaine (cas extrême),
            // on prend simplement les 3 derniers jours de la semaine.
            endIndex = this.weekDays.length - 1;
        }

        // La fenêtre doit contenir 3 jours maximum, en terminant par endIndex
        const startIndex = Math.max(0, endIndex - 2);
        this.visibleDayIndices = [];
        for (let i = startIndex; i <= endIndex && i < this.weekDays.length; i++) {
            this.visibleDayIndices.push(i);
        }

        this.visibleWeekDays = this.visibleDayIndices.map(i => this.weekDays[i]);
    }

    getVisibleDays(row: { days: { date: string; status: any; ticketId: string; env: string; }[] }) {
        if (!row || !row.days) {
            return [];
        }
        if (!this.visibleDayIndices || this.visibleDayIndices.length === 0) {
            return row.days;
        }
        return this.visibleDayIndices
            .map(index => row.days[index])
            .filter(day => !!day);
    }

    private computeReconciliationStats() {
        let total = 0;
        let reconcilie = 0;
        let enCours = 0;
        let nonReco = 0;

        this.reconciliationSummaryRows.forEach(row => {
            row.days.forEach(day => {
                if (!day || !day.status) {
                    return;
                }
                total++;
                if (day.status === 'RECONCILIE') {
                    reconcilie++;
                } else if (day.status === 'EN_COURS') {
                    enCours++;
                } else if (day.status === 'NON_RECONCILIE') {
                    nonReco++;
                }
            });
        });

        const taux = total > 0 ? (reconcilie * 100) / total : 0;

        this.recoStats = {
            total,
            reconcilie,
            enCours,
            nonReco,
            tauxReconcilie: taux
        };
        this.updateRecoChartsData();
    }

    /** Met à jour les données des graphiques donut et évolution par jour. */
    private updateRecoChartsData(): void {
        const s = this.recoStats;
        this.recoDonutChartData = {
            labels: ['Réconcilié', 'En cours', 'Non réconcilié'],
            datasets: [{
                data: [s.reconcilie, s.enCours, s.nonReco],
                backgroundColor: ['#388e3c', '#1976d2', '#f57c00'],
                borderWidth: 0
            }]
        };
        const evolution = this.getRecoEvolutionByDay();
        this.recoEvolutionChartData = {
            labels: evolution.labels,
            datasets: [
                { label: 'Réconcilié', data: evolution.reconcilie, backgroundColor: '#388e3c', stack: 'stack1' },
                { label: 'En cours', data: evolution.enCours, backgroundColor: '#1976d2', stack: 'stack1' },
                { label: 'Non réconcilié', data: evolution.nonReco, backgroundColor: '#f57c00', stack: 'stack1' }
            ]
        };
    }

    /** Retourne les totaux par jour pour le graphique évolution (Lun, Mar, ...). */
    private getRecoEvolutionByDay(): { labels: string[]; reconcilie: number[]; enCours: number[]; nonReco: number[] } {
        const labels: string[] = [];
        const reconcilie: number[] = [];
        const enCours: number[] = [];
        const nonReco: number[] = [];
        if (!this.weekDays.length || !this.reconciliationSummaryRows.length) {
            return { labels, reconcilie, enCours, nonReco };
        }
        const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
        this.weekDays.forEach((dayInfo, dayIndex) => {
            labels.push(dayNames[dayIndex] || dayInfo.label.split(' ')[0]);
            let r = 0, e = 0, n = 0;
            this.reconciliationSummaryRows.forEach(row => {
                const day = row.days[dayIndex];
                if (!day || !day.status) return;
                if (day.status === 'RECONCILIE') r++;
                else if (day.status === 'EN_COURS') e++;
                else n++;
            });
            reconcilie.push(r);
            enCours.push(e);
            nonReco.push(n);
        });
        return { labels, reconcilie, enCours, nonReco };
    }

    getPagedReconciliationRows() {
        const rows = this.getFilteredReconciliationSummaryRows();
        if (!rows || !rows.length) {
            return [];
        }
        const start = this.reconciliationPageIndex * this.reconciliationPageSize;
        return rows.slice(start, start + this.reconciliationPageSize);
    }

    getReconciliationTotalPages(): number {
        const rows = this.getFilteredReconciliationSummaryRows();
        if (!rows || !rows.length) {
            return 1;
        }
        return Math.max(1, Math.ceil(rows.length / this.reconciliationPageSize));
    }

    nextReconciliationPage() {
        const totalPages = this.getReconciliationTotalPages();
        if (this.reconciliationPageIndex < totalPages - 1) {
            this.reconciliationPageIndex++;
        }
    }

    prevReconciliationPage() {
        if (this.reconciliationPageIndex > 0) {
            this.reconciliationPageIndex--;
        }
    }

    canGoPrevDays(): boolean {
        return this.visibleDayIndices.length > 0 && this.visibleDayIndices[0] > 0;
    }

    canGoNextDays(): boolean {
        return this.visibleDayIndices.length > 0 &&
            this.visibleDayIndices[this.visibleDayIndices.length - 1] < this.weekDays.length - 1;
    }

    nextDaysWindow() {
        if (!this.canGoNextDays()) {
            return;
        }
        this.visibleDayIndices = this.visibleDayIndices.map(i => i + 1).filter(i => i < this.weekDays.length);
        this.visibleWeekDays = this.visibleDayIndices.map(i => this.weekDays[i]);
    }

    prevDaysWindow() {
        if (!this.canGoPrevDays()) {
            return;
        }
        this.visibleDayIndices = this.visibleDayIndices.map(i => i - 1).filter(i => i >= 0);
        this.visibleWeekDays = this.visibleDayIndices.map(i => this.weekDays[i]);
    }

    lineChartOptions: any = {
      responsive: true,
      plugins: {
        legend: { display: true, position: 'top' },
        title: { display: true, text: '' },
        datalabels: { display: false } // Empêche l'affichage des valeurs sur les courbes
      },
      elements: {
        line: {
          tension: 0.4, // Lignes plus fluides
          borderJoinStyle: 'round',
          spanGaps: true // Relie tous les points même avec des données manquantes
        },
        point: {
          radius: 4,
          hoverRadius: 6,
          hoverBorderWidth: 2
        }
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

    // Période pour les métriques rapides (semaine, mois, trimestre, semestre, annee)
    metricsPeriod: 'semaine' | 'mois' | 'trimestre' | 'semestre' | 'annee' = 'semaine';

    // Soldes par compte pour la bande défilante
    accountBalances: Array<{accountName: string, countryCode: string, balance: number, flag: string}> = [];
    bannerTitle: string = '💰 Soldes des comptes clients';

    // Ajout d'une fonction utilitaire pour filtrer par période
    private filterByPeriod<T extends { date?: string; dateOperation?: string }>(data: T[]): T[] {
      // Si showAllData est activé, retourner toutes les données sans filtre
      if (this.showAllData) {
        return data;
      }
      
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
        start.setHours(0, 0, 0, 0);
        end = new Date(this.endDate);
        end.setHours(0, 0, 0, 0);
        end.setDate(end.getDate() + 1); // inclure la date de fin
      }

      if (!start || !end) {
        return data;
      }
      
      // Normaliser toutes les dates de début et de fin à minuit pour une comparaison cohérente
      if (start) {
        start.setHours(0, 0, 0, 0);
      }
      if (end) {
        end.setHours(0, 0, 0, 0);
      }

      return data.filter((item: any) => {
        const dateStr = item.date || item.dateOperation;
        if (!dateStr) return false;
        
        const dateOnly = dateStr.split('T')[0];
        const [year, month, day] = dateOnly.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        date.setHours(0, 0, 0, 0);
        
        const normalizedStart = new Date(start!);
        normalizedStart.setHours(0, 0, 0, 0);
        const normalizedEnd = new Date(end!);
        normalizedEnd.setHours(0, 0, 0, 0);
        
        return date >= normalizedStart && date < normalizedEnd;
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
        const excludedTypes = ['annulation_bo', 'ajustement', 'transaction_cree', 'depot', 'dépôt', 'versement', 'virement'];
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
        // Couleurs : palette standard
        const barColors = barLabels.map((label, idx) => colorList[idx % colorList.length]);
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
            tension: 0.4,
            spanGaps: true, // Relie tous les points même avec des données manquantes
            pointRadius: 4,
            pointBackgroundColor: color,
            pointBorderColor: color,
            borderWidth: 2
          };
        });
        this.lineChartData = {
          labels: allDates,
          datasets
        };
        return;
      } else if (this.selectedMetric === 'revenu') {
        // Bar chart : volume des frais par service (tous les FRAIS_TRANSACTION, crédit et débit)
        const excludedTypes = ['annulation_bo', 'ajustement', 'transaction_cree', 'depot', 'dépôt', 'versement', 'virement'];
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
            tension: 0.4,
            spanGaps: true, // Relie tous les points même avec des données manquantes
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
        const excludedTypes2 = ['annulation_bo', 'ajustement', 'transaction_cree', 'depot', 'dépôt', 'versement', 'virement'];
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
          backgroundColor: colorList[idx % colorList.length],
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
            tension: 0.4,
            spanGaps: true, // Relie tous les points même avec des données manquantes
            pointRadius: 4,
            pointBackgroundColor: color,
            pointBorderColor: color,
            borderWidth: 2
          };
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
        private operationService: OperationService,
        private compteService: CompteService,
        private dashboardReconciliationService: DashboardReconciliationService
    ) {}

    /**
     * Ouvre le popup "Voir le statut des réconciliations"
     */
    openReleveStatusModal(): void {
        this.releveStatusError = null;
        this.releveStatusCountry = this.releveStatusCountries && this.releveStatusCountries.length ? this.releveStatusCountries[0] : null;
        this.releveStatusService = null;
        this.releveStatusDate = '';
        this.releveStatusEnv = 'TOTAL';
        this.showReleveStatusModal = true;
        // Mettre à jour la liste des services disponibles selon le pays pré-sélectionné
        if (this.releveStatusCountry) {
            this.updateReleveStatusServices();
        }
    }

    /**
     * Ferme le popup de statut des réconciliations
     */
    closeReleveStatusModal(): void {
        this.showReleveStatusModal = false;
    }

    /**
     * Met à jour la liste des services disponibles pour le pays choisi dans le popup statut.
     * Utilise agencySummaryData pour cloisonner les services par pays.
     */
    updateReleveStatusServices(): void {
        if (!this.releveStatusCountry) {
            return;
        }
        const servicesSet = new Set<string>();

        // Utiliser la map pays -> services construite à partir de result8rec
        if (this.reconciliationCountryServices && this.reconciliationCountryServices[this.releveStatusCountry]) {
            this.reconciliationCountryServices[this.releveStatusCountry].forEach(s => {
                if (!s || typeof s !== 'string') return;
                const upper = s.toUpperCase();
                // Filtrer les codes agence de type AUCATxxxxx
                if (upper.startsWith('AUCAT')) return;
                servicesSet.add(s);
            });
        } else if (this.filterOptions && this.filterOptions.services) {
            // Fallback: si on n'a pas de map, utiliser la liste globale de services
            this.filterOptions.services.forEach(s => servicesSet.add(s));
        }

        this.releveStatusServices = Array.from(servicesSet).sort();
        if (this.releveStatusService && !this.releveStatusServices.includes(this.releveStatusService)) {
            this.releveStatusService = null;
        }
    }

    /**
     * Valide les critères saisis et redirige vers la page de rapport
     * avec les paramètres nécessaires pour ouvrir directement le relevé.
     */
    confirmReleveStatus(): void {
        this.releveStatusError = null;

        if (!this.releveStatusCountry || !this.releveStatusService || !this.releveStatusDate) {
            this.releveStatusError = 'Veuillez sélectionner le pays, le service et la date.';
            return;
        }

        const env = this.releveStatusEnv || 'TOTAL';

        this.showReleveStatusModal = false;

        // Lancer le contrôle des statuts pour ce pays/service/date
        this.checkReleveStatusInDashboard(env);
    }

    /**
     * Vérifie, pour le pays / service / date choisis, si toutes les lignes
     * result8rec sont à statut OK. Si oui, affiche un mini-relevé dans un popup,
     * sinon affiche un message "Réconciliation en cours".
     */
    private checkReleveStatusInDashboard(env: string): void {
        this.releveStatusResultLoading = true;
        this.showReleveStatusResultModal = true;
        this.releveStatusAllOk = false;
        this.releveStatusLines = [];

        this.dashboardReconciliationService.getResult8RecData()
            .pipe(take(1))
            .subscribe({
                next: (data) => {
                    const targetCountry = this.releveStatusCountry!;
                    const targetService = this.releveStatusService!;
                    const targetDateStr = this.releveStatusDate!;
                    const targetEnv = env || 'TOTAL';

                    const targetDate = new Date(targetDateStr);
                    targetDate.setHours(0, 0, 0, 0);

                    const matching = data.filter(item => {
                        if (!item.country || !item.service || !item.date) return false;
                        if (item.country !== targetCountry) return false;
                        if (item.service !== targetService) return false;
                        const itemEnv = (item.env || 'TOTAL');
                        if (itemEnv !== targetEnv) return false;

                        const itemDateStr = (item.date || '').split(' ')[0];
                        const itemDate = new Date(itemDateStr);
                        if (isNaN(itemDate.getTime())) return false;
                        itemDate.setHours(0, 0, 0, 0);

                        return itemDate.getTime() === targetDate.getTime();
                    });

                    this.releveStatusLines = matching;

                    if (!matching.length) {
                        this.releveStatusAllOk = false;
                    } else {
                        const allOk = matching.every(
                            line => (line.status || '').trim().toUpperCase() === 'OK'
                        );
                        this.releveStatusAllOk = allOk;
                    }

                    this.releveStatusResultLoading = false;
                },
                error: (err) => {
                    console.error('Erreur lors du chargement des données result8rec pour le relevé:', err);
                    this.releveStatusLines = [];
                    this.releveStatusAllOk = false;
                    this.releveStatusResultLoading = false;
                }
            });
    }

    getReleveStatusTotalTransactions(): number {
        if (!this.releveStatusLines || !this.releveStatusLines.length) {
            return 0;
        }
        return this.releveStatusLines
            .map(l => l.totalTransactions || 0)
            .reduce((sum, v) => sum + v, 0);
    }

    getReleveStatusTotalVolume(): number {
        if (!this.releveStatusLines || !this.releveStatusLines.length) {
            return 0;
        }
        return this.releveStatusLines
            .map(l => l.totalVolume || 0)
            .reduce((sum, v) => sum + v, 0);
    }

    /**
     * Ouvre la page de rapport détaillé pour le pays / service / date choisis,
     * avec ouverture directe du relevé de service.
     */
    openReleveDetail(): void {
        if (!this.releveStatusCountry || !this.releveStatusService || !this.releveStatusDate) {
            return;
        }
        const env = this.releveStatusEnv || 'TOTAL';
        this.showReleveStatusResultModal = false;
        this.router.navigate(['/reconciliation-report'], {
            queryParams: {
                country: this.releveStatusCountry,
                service: this.releveStatusService,
                date: this.releveStatusDate,
                env,
                openReleve: '1'
            }
        });
    }

    ngOnInit() {
        this.loadDashboardData();
        this.loadFilterOptions();
        this.loadAgencySummaryData();
        this.loadAllOperations();
        this.loadAccountBalances();
        
        // Charger les métriques détaillées après un court délai pour s'assurer que les autres données sont chargées
        setTimeout(() => {
            this.loadDetailedMetrics();
            this.loadTransactionCreatedStats();
        }, 500);
        
        // Écouter les changements de route pour recharger les données quand on revient sur le dashboard
        this.routerSubscription = this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe((event) => {
            if (event instanceof NavigationEnd && (event.url === '/' || event.url === '/dashboard')) {
                this.refreshMetrics();
            }
        });

        // Écouter les notifications de mise à jour de données
        this.dataUpdateSubscription = this.appStateService.dataUpdate$.subscribe(needsUpdate => {
            if (needsUpdate) {
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

        this.dashboardService.getDashboardMetrics(this.metricsPeriod).subscribe({
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

    /**
     * Initialise la date / env par défaut pour le bloc "État des réconciliations"
     * puis déclenche un premier chargement du résumé.
     */
    private initReconciliationSummaryDefaults(): void {
        // ENV par défaut : BET
        if (!this.reconciliationSummaryEnv) {
            this.reconciliationSummaryEnv = 'BET';
        }
        if (this.reconciliationSummaryCountries && this.reconciliationSummaryCountries.length && !this.reconciliationSummaryCountry) {
            // Par défaut, pas de filtre pays (tous), mais on pourrait choisir le premier si besoin
            this.reconciliationSummaryCountry = '';
        }
        if (!this.reconciliationSummaryService) {
            this.reconciliationSummaryService = '';
        }
        this.loadReconciliationSummary();
    }

    /**
     * Charge le résumé "État des réconciliations" à partir de result8rec
     * pour la date + environnement sélectionnés.
     */
    loadReconciliationSummary(): void {
        this.reconciliationSummaryError = null;
        this.reconciliationSummaryLoading = true;
        this.reconciliationSummaryRows = [];

        this.dashboardReconciliationService.getResult8RecData()
            .pipe(take(1))
            .subscribe({
                next: (data: Result8RecData[]) => {
                    try {
                        const targetEnv = this.reconciliationSummaryEnv || 'TOTAL';
                        const targetCountry = this.reconciliationSummaryCountry || '';
                        const selectedService = (this.reconciliationSummaryService || '').trim();
                        // Fenêtre de temps : "cette semaine" (du lundi au dimanche courant)
                        const today = new Date();
                        const currentDay = today.getDay(); // 0 (dimanche) à 6 (samedi)
                        const diffToMonday = (currentDay === 0 ? -6 : 1) - currentDay;
                        const startOfWeek = new Date(today);
                        startOfWeek.setDate(today.getDate() + diffToMonday);
                        startOfWeek.setHours(0, 0, 0, 0);

                        this.weekDays = [];

                        // Construire les 7 jours de la semaine avec date normalisée
                        for (let i = 0; i < 7; i++) {
                            const d = new Date(startOfWeek);
                            d.setDate(startOfWeek.getDate() + i);
                            const y = d.getFullYear();
                            const m = (d.getMonth() + 1).toString().padStart(2, '0');
                            const day = d.getDate().toString().padStart(2, '0');
                            const dateStr = `${y}-${m}-${day}`;

                            const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
                            const label = `${dayNames[i]} ${day}/${m}`;
                            this.weekDays.push({ label, date: dateStr });
                        }

                        this.updateVisibleDaysWindow();

                        // Construire la liste des services à afficher et la liste pour le filtre
                        const servicesSet = new Set<string>();
                        if (targetCountry && this.reconciliationCountryServices && this.reconciliationCountryServices[targetCountry]) {
                            this.reconciliationCountryServices[targetCountry].forEach(s => s && servicesSet.add(s));
                        } else if (this.allReconciliationServices && this.allReconciliationServices.length) {
                            this.allReconciliationServices.forEach(s => s && servicesSet.add(s));
                        } else {
                            data.forEach(item => {
                                if (item.service) servicesSet.add(item.service);
                            });
                        }
                        const allServices = Array.from(servicesSet).sort();

                        // Mettre à jour la liste de services disponible pour le filtre
                        this.reconciliationSummaryServices = allServices;
                        if (selectedService && !this.reconciliationSummaryServices.includes(selectedService)) {
                            // Si le service sélectionné n'existe plus dans la liste, on réinitialise
                            this.reconciliationSummaryService = '';
                        }

                        // Appliquer éventuellement le filtre service
                        const effectiveServices = this.reconciliationSummaryService
                            ? allServices.filter(s => s === this.reconciliationSummaryService)
                            : allServices;

                        const rows: {
                            service: string;
                            days: {
                                date: string;
                                status: 'RECONCILIE' | 'NON_RECONCILIE' | 'EN_COURS' | 'NON_RECONCILIE';
                                ticketId: string;
                                env: string;
                            }[];
                        }[] = [];

                        effectiveServices.forEach(serviceName => {
                            const dayStatuses = this.weekDays.map(dayInfo => {
                                const matchingForDay = data.filter(item => {
                                    if (!item.service || item.service !== serviceName) return false;
                                    const itemEnv = (item.env || 'TOTAL');
                                    if (itemEnv !== targetEnv) return false;
                                    if (!item.date) return false;
                                    if (targetCountry && item.country !== targetCountry) return false;

                                    const dateOnly = (item.date || '').split(' ')[0];
                                    return dateOnly === dayInfo.date;
                                });

                                let status: 'RECONCILIE' | 'NON_RECONCILIE' | 'EN_COURS' | 'NON_RECONCILIE';
                                let ticketId = '';

                                if (!matchingForDay.length) {
                                    // Service non présent ce jour-là : Non réconcilié
                                    status = 'NON_RECONCILIE';
                                } else {
                                    const allTermine = matchingForDay.every(line =>
                                        (line.traitement || '').trim().toLowerCase() === 'terminé'
                                    );
                                    const allOk = matchingForDay.every(line =>
                                        (line.status || '').trim().toUpperCase() === 'OK'
                                    );

                                    if (allTermine) {
                                        status = 'RECONCILIE';
                                    } else if (!allOk) {
                                        status = 'EN_COURS';
                                    } else {
                                        // Cas intermédiaire: service présent, statuts OK mais traitement non terminé
                                        status = 'EN_COURS';
                                    }

                                    const ticketLine = matchingForDay.find(line => (line.glpiId || '').trim().length > 0);
                                    ticketId = ticketLine ? (ticketLine.glpiId || '') : '';
                                }

                                return {
                                    date: dayInfo.date,
                                    status,
                                    ticketId,
                                    env: targetEnv
                                };
                            });

                            rows.push({
                                service: serviceName,
                                days: dayStatuses
                            });
                        });

                        this.reconciliationSummaryRows = rows;
                        this.reconciliationPageIndex = 0;
                        this.computeReconciliationStats();
                        this.reconciliationSummaryLoading = false;
                    } catch (e: any) {
                        console.error('Erreur lors du calcul du résumé des réconciliations:', e);
                        this.reconciliationSummaryError = 'Erreur lors du chargement de l’état des réconciliations.';
                        this.reconciliationSummaryLoading = false;
                    }
                },
                error: (err) => {
                    console.error('Erreur lors du chargement des données result8rec pour le résumé:', err);
                    this.reconciliationSummaryError = 'Erreur lors du chargement de l’état des réconciliations.';
                    this.reconciliationSummaryLoading = false;
                }
            });
    }

    /** Retourne le lundi de la semaine courante au format YYYY-MM-DD */
    private getCurrentWeekMonday(): string {
        const today = new Date();
        const currentDay = today.getDay();
        const diffToMonday = (currentDay === 0 ? -6 : 1) - currentDay;
        const monday = new Date(today);
        monday.setDate(today.getDate() + diffToMonday);
        const y = monday.getFullYear();
        const m = (monday.getMonth() + 1).toString().padStart(2, '0');
        const d = monday.getDate().toString().padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    /** Retourne le lundi de la semaine contenant la date donnée (YYYY-MM-DD). */
    private getMondayOfWeek(dateStr: string): string {
        const [y, mo, day] = dateStr.split('-').map(Number);
        const date = new Date(y, mo - 1, day);
        const dow = date.getDay();
        const diffToMonday = (dow === 0 ? -6 : 1) - dow;
        date.setDate(date.getDate() + diffToMonday);
        const yy = date.getFullYear();
        const mm = (date.getMonth() + 1).toString().padStart(2, '0');
        const dd = date.getDate().toString().padStart(2, '0');
        return `${yy}-${mm}-${dd}`;
    }

    openRecoViewModal(): void {
        this.recoViewWeekStart = this.getCurrentWeekMonday();
        this.recoViewModalOpen = true;
        this.recoViewError = null;
        this.loadReconciliationSummaryForView();
    }

    closeRecoViewModal(): void {
        this.recoViewModalOpen = false;
    }

    async exportRecoViewToPdf(): Promise<void> {
        if (!this.recoViewExportContentRef?.nativeElement) {
            return;
        }
        try {
            const element = this.recoViewExportContentRef.nativeElement;
            const originalOverflow = element.style.overflowY;
            const originalMaxHeight = element.style.maxHeight;
            element.style.overflowY = 'visible';
            element.style.maxHeight = 'none';

            const tableWrapper = element.querySelector('.reco-view-table-wrapper') as HTMLElement | null;
            let twOverflow: string | null = null;
            let twMaxHeight: string | null = null;
            if (tableWrapper) {
                twOverflow = tableWrapper.style.overflow;
                twMaxHeight = tableWrapper.style.maxHeight;
                tableWrapper.style.overflow = 'visible';
                tableWrapper.style.maxHeight = 'none';
            }

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            element.style.overflowY = originalOverflow;
            element.style.maxHeight = originalMaxHeight;
            if (tableWrapper) {
                tableWrapper.style.overflow = twOverflow ?? '';
                tableWrapper.style.maxHeight = twMaxHeight ?? '';
            }

            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const imgData = canvas.toDataURL('image/png');

            // Créer un PDF dont la taille correspond presque exactement au contenu
            const pdf = new jsPDF('l', 'px', [imgWidth, imgHeight]);
            const pdfW = pdf.internal.pageSize.getWidth();
            const pdfH = pdf.internal.pageSize.getHeight();

            pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);

            const fileName = `Etat-reconciliations-semaine-${(this.recoViewWeekStart || '').replace(/-/g, '')}.pdf`;
            pdf.save(fileName);
        } catch (e) {
            console.error('Erreur export PDF vue semaine:', e);
        }
    }

    onRecoViewDateChange(dateStr: string): void {
        if (!dateStr) return;
        this.recoViewWeekStart = this.getMondayOfWeek(dateStr);
        this.loadReconciliationSummaryForView();
    }

    loadReconciliationSummaryForView(): void {
        this.recoViewError = null;
        this.recoViewLoading = true;
        this.recoViewRows = [];
        this.recoViewWeekDays = [];

        this.dashboardReconciliationService.getResult8RecData()
            .pipe(take(1))
            .subscribe({
                next: (data: Result8RecData[]) => {
                    try {
                        const targetEnv = this.reconciliationSummaryEnv || 'TOTAL';
                        const targetCountry = this.reconciliationSummaryCountry || '';
                        const selectedService = (this.reconciliationSummaryService || '').trim();

                        const [y, mo, d] = (this.recoViewWeekStart || '').split('-').map(Number);
                        const startOfWeek = new Date(y, mo - 1, d);

                        this.recoViewWeekDays = [];
                        for (let i = 0; i < 7; i++) {
                            const date = new Date(startOfWeek);
                            date.setDate(startOfWeek.getDate() + i);
                            const yy = date.getFullYear();
                            const mm = (date.getMonth() + 1).toString().padStart(2, '0');
                            const dd = date.getDate().toString().padStart(2, '0');
                            const dateStr = `${yy}-${mm}-${dd}`;
                            const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
                            this.recoViewWeekDays.push({ label: `${dayNames[i]} ${dd}/${mm}`, date: dateStr });
                        }

                        const servicesSet = new Set<string>();
                        if (targetCountry && this.reconciliationCountryServices && this.reconciliationCountryServices[targetCountry]) {
                            this.reconciliationCountryServices[targetCountry].forEach(s => s && servicesSet.add(s));
                        } else if (this.allReconciliationServices?.length) {
                            this.allReconciliationServices.forEach(s => s && servicesSet.add(s));
                        } else {
                            data.forEach(item => { if (item.service) servicesSet.add(item.service); });
                        }
                        const allServices = Array.from(servicesSet).sort();
                        const effectiveServices = this.reconciliationSummaryService
                            ? allServices.filter(s => s === this.reconciliationSummaryService)
                            : allServices;

                        const rows: {
                            service: string;
                            days: {
                                date: string;
                                status: 'RECONCILIE' | 'NON_RECONCILIE' | 'EN_COURS' | 'NON_RECONCILIE';
                                ticketId: string;
                                env: string;
                            }[];
                        }[] = [];

                        effectiveServices.forEach(serviceName => {
                            const dayStatuses = this.recoViewWeekDays.map(dayInfo => {
                                const matchingForDay = data.filter(item => {
                                    if (!item.service || item.service !== serviceName) return false;
                                    if ((item.env || 'TOTAL') !== targetEnv) return false;
                                    if (!item.date) return false;
                                    if (targetCountry && item.country !== targetCountry) return false;
                                    const dateOnly = (item.date || '').split(' ')[0];
                                    return dateOnly === dayInfo.date;
                                });
                                let status: 'RECONCILIE' | 'NON_RECONCILIE' | 'EN_COURS' | 'NON_RECONCILIE';
                                let ticketId = '';
                                if (!matchingForDay.length) {
                                    status = 'NON_RECONCILIE';
                                } else {
                                    const allTermine = matchingForDay.every(line =>
                                        (line.traitement || '').trim().toLowerCase() === 'terminé'
                                    );
                                    const allOk = matchingForDay.every(line =>
                                        (line.status || '').trim().toUpperCase() === 'OK'
                                    );
                                    status = allTermine ? 'RECONCILIE' : 'EN_COURS';
                                    const ticketLine = matchingForDay.find(line => (line.glpiId || '').trim().length > 0);
                                    ticketId = ticketLine ? (ticketLine.glpiId || '') : '';
                                }
                                return { date: dayInfo.date, status, ticketId, env: targetEnv };
                            });
                            rows.push({ service: serviceName, days: dayStatuses });
                        });

                        this.recoViewRows = rows;
                        this.recoViewStats = this.computeReconciliationStatsFromRows(rows);
                        this.recoViewLoading = false;
                    } catch (e: any) {
                        console.error('Erreur vue semaine réconciliations:', e);
                        this.recoViewError = 'Erreur lors du chargement de la vue semaine.';
                        this.recoViewLoading = false;
                    }
                },
                error: (err) => {
                    console.error('Erreur chargement result8rec pour vue semaine:', err);
                    this.recoViewError = 'Erreur lors du chargement des données.';
                    this.recoViewLoading = false;
                }
            });
    }

    private computeReconciliationStatsFromRows(rows: { service: string; days: { date: string; status: string }[] }[]): { total: number; reconcilie: number; enCours: number; nonReco: number; tauxReconcilie: number } {
        let total = 0, reconcilie = 0, enCours = 0, nonReco = 0;
        rows.forEach(row => {
            row.days.forEach(day => {
                total++;
                if (day.status === 'RECONCILIE') reconcilie++;
                else if (day.status === 'EN_COURS') enCours++;
                else nonReco++;
            });
        });
        const taux = total > 0 ? (reconcilie * 100) / total : 0;
        return { total, reconcilie, enCours, nonReco, tauxReconcilie: taux };
    }

    setReconciliationStatusFilter(status: 'RECONCILIE' | 'EN_COURS' | 'NON_RECONCILIE'): void {
        this.reconciliationStatusFilter =
            this.reconciliationStatusFilter === status ? 'ALL' : status;
    }

    getFilteredReconciliationSummaryRows() {
        if (!this.reconciliationSummaryRows || this.reconciliationStatusFilter === 'ALL') {
            return this.reconciliationSummaryRows;
        }
        const target = this.reconciliationStatusFilter;
        return this.reconciliationSummaryRows.filter(row =>
            row.days.some(day => day.status === target)
        );
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

        // Charger en parallèle les pays/services distincts depuis result8rec pour le popup de statut
        this.dashboardService.getReconciliationFilters().subscribe({
            next: (filters) => {
                // Ces listes servent de base pour le cloisonnement du popup
                this.reconciliationCountryServices = filters.countryServices || {};
                this.releveStatusCountries = filters.countries || [];
                this.allReconciliationServices = filters.services || [];
                this.reconciliationSummaryCountries = filters.countries || [];
                this.reconciliationSummaryServices = filters.services || [];

                // Initialiser les valeurs par défaut du résumé des réconciliations
                this.initReconciliationSummaryDefaults();
            },
            error: (err) => {
                console.error('Erreur lors du chargement des filtres de réconciliation:', err);
            }
        });
    }

    private     loadDetailedMetrics() {
        this.detailedLoading = true;
        this.detailedError = null;
        // Adapter les filtres envoyés au backend
        const agencies = this.selectedAgency.length === 0 ? undefined : this.selectedAgency;
        const services = this.selectedService.length === 0 ? undefined : this.selectedService;
        const countries = this.selectedCountry.length === 0 ? undefined : this.selectedCountry;
        // Si showAllData est activé, ne pas envoyer de filtre de temps
        const timeFilter = this.showAllData ? undefined : (this.selectedTimeFilter !== 'Tous' ? this.selectedTimeFilter : undefined);
        
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
                this.filterOperationStats();
                this.updateBarChartData();
            },
            error: (error) => {
                // En cas d'erreur, vider les données et afficher un message explicite
                this.detailedMetrics = null;
                this.filteredOperationStats = [];
                this.filteredFrequencyStats = [];
                this.barChartData = { labels: [], datasets: [] };
                this.lineChartData = { labels: [], datasets: [] };
                this.detailedError = 'Aucune donnée pour ce pays';
                this.detailedLoading = false;
            }
        });
    }

    /**
     * Filtre les statistiques par type d'opération pour exclure DEPOT et VERSEMENT
     */
    private filterOperationStats() {
        if (!this.detailedMetrics) {
            this.filteredOperationStats = [];
            this.filteredFrequencyStats = [];
            return;
        }

        // Filtrer les statistiques par type d'opération
        this.filteredOperationStats = (this.detailedMetrics.operationStats || []).filter(stat => {
            if (!stat.operationType) return true;
            const lowerCaseType = stat.operationType.toLowerCase();
            
            // Exclure les types non désirés
            return !(lowerCaseType === 'depot' || 
                    lowerCaseType === 'dépôt' || 
                    lowerCaseType === 'versement' ||
                    lowerCaseType === 'virement' ||
                    lowerCaseType === 'ajustement' ||
                    lowerCaseType === 'transaction_cree' ||
                    (lowerCaseType.startsWith('annulation_') && lowerCaseType !== 'annulation_bo'));
        });

        // Filtrer les statistiques de fréquence
        this.filteredFrequencyStats = (this.detailedMetrics.frequencyStats || []).filter(stat => {
            if (!stat.operationType) return true;
            const lowerCaseType = stat.operationType.toLowerCase();
            
            // Exclure les types non désirés
            return !(lowerCaseType === 'depot' || 
                    lowerCaseType === 'dépôt' || 
                    lowerCaseType === 'versement' ||
                    lowerCaseType === 'virement' ||
                    lowerCaseType === 'ajustement' ||
                    lowerCaseType === 'transaction_cree' ||
                    (lowerCaseType.startsWith('annulation_') && lowerCaseType !== 'annulation_bo'));
        });
        const result = {
            original: this.detailedMetrics.operationStats?.length || 0,
            filtered: this.filteredOperationStats.length,
            excluded: (this.detailedMetrics.operationStats || []).filter(stat => {
                if (!stat.operationType) return false;
                const lowerCaseType = stat.operationType.toLowerCase();
                return (lowerCaseType === 'depot' || 
                        lowerCaseType === 'dépôt' || 
                        lowerCaseType === 'versement' ||
                        lowerCaseType === 'virement' ||
                        lowerCaseType === 'ajustement' ||
                        lowerCaseType === 'transaction_cree' ||
                        (lowerCaseType.startsWith('annulation_') && lowerCaseType !== 'annulation_bo'));
            }).map(stat => stat.operationType)
        };
    }

    private     loadTransactionCreatedStats() {
        this.transactionCreatedLoading = true;
        this.transactionCreatedError = null;

        const agencies = this.selectedAgency.length === 0 ? undefined : this.selectedAgency;
        const services = this.selectedService.length === 0 ? undefined : this.selectedService;
        const countries = this.selectedCountry.length === 0 ? undefined : this.selectedCountry;
        // Si showAllData est activé, ne pas envoyer de filtre de temps
        const timeFilter = this.showAllData ? undefined : (this.selectedTimeFilter !== 'Tous' ? this.selectedTimeFilter : undefined);

        this.dashboardService.getTransactionCreatedStats(
            agencies,
            services,
            countries,
            timeFilter,
            this.startDate || undefined,
            this.endDate || undefined
        ).subscribe({
            next: (stats: TransactionCreatedStats) => {
                this.transactionCreatedStats = stats;
                this.transactionCreatedLoading = false;
            },
            error: (error) => {
                console.error('Error loading transaction created stats:', error);
                this.transactionCreatedError = 'Erreur lors du chargement des statistiques des transactions créées';
                this.transactionCreatedLoading = false;
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
        // Mettre à jour les listes filtrées pour le cloisonnement
        this.updateFilteredLists();
        
        this.loadAgencySummaryData();
        this.loadAllOperations();
        this.updateDashboardIndicators();
        // Recharger les métriques détaillées avec les nouveaux filtres
        this.loadDetailedMetrics();
        this.loadTransactionCreatedStats();
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
        if (!this.filteredFrequencyStats || this.filteredFrequencyStats.length === 0) {
            return 0;
        }
        
        const maxFrequency = Math.max(...this.filteredFrequencyStats.map(f => f.frequency));
        return maxFrequency > 0 ? (frequency / maxFrequency) * 100 : 0;
    }

    refreshMetrics() {
        this.loading = true;
        this.error = null;
        
        // Recharger les métriques de base
        this.loadDashboardData();
        
        // Recharger les métriques détaillées (toujours, même sans filtres)
        this.loadDetailedMetrics();
        this.loadTransactionCreatedStats();
        
        // Recharger les soldes pour la bande défilante
        this.loadAccountBalances();
        
        // Afficher un message de confirmation
        setTimeout(() => {
            console.log('Dashboard metrics refreshed successfully');
        }, 1000);
    }

    startNewReconciliation() {
        this.router.navigate(['/upload']);
    }

    goToStats() {
        console.log('Navigation vers les statistiques');
        this.router.navigate(['/stats']);
    }

    goToResults() {
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
        this.showAllData = false; // Réinitialiser aussi le flag "Voir plus"
        this.loadDetailedMetrics();
        this.loadTransactionCreatedStats();
        this.updateBarChartData();
    }
    
    toggleShowAllData() {
        this.showAllData = !this.showAllData;
        this.onFilterChange();
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
        if (this.filteredOperationStats && this.filteredOperationStats.length > 0) {
            const opHeader = ['Type d\'opération', 'Transactions', 'Volume total', 'Volume moyen'];
            const opData = this.filteredOperationStats.map(stat => [
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
        if (this.filteredFrequencyStats && this.filteredFrequencyStats.length > 0) {
            const freqHeader = ['Type d\'opération', 'Fréquence'];
            const freqData = this.filteredFrequencyStats.map(stat => [
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

    // Fonction pour obtenir le drapeau d'un pays basé sur son code
    getCountryFlag(countryCode: string): string {
      const flagMap: {[key: string]: string} = {
        // Afrique Centrale
        'CM': '🇨🇲', // Cameroun
        'CF': '🇨🇫', // Centrafrique
        'TD': '🇹🇩', // Tchad
        'CG': '🇨🇬', // Congo
        'CD': '🇨🇩', // RDC (Congo Démocratique)
        'GQ': '🇬🇶', // Guinée Équatoriale
        'GA': '🇬🇦', // Gabon
        'ST': '🇸🇹', // Sao Tomé-et-Principe
        'AO': '🇦🇴', // Angola
        
        // Afrique de l'Ouest
        'CI': '🇨🇮', // Côte d'Ivoire
        'BF': '🇧🇫', // Burkina Faso
        'SN': '🇸🇳', // Sénégal
        'TG': '🇹🇬', // Togo
        'BJ': '🇧🇯', // Bénin
        'ML': '🇲🇱', // Mali
        'NE': '🇳🇪', // Niger
        'GN': '🇬🇳', // Guinée
        'GW': '🇬🇼', // Guinée-Bissau
        'SL': '🇸🇱', // Sierra Leone
        'LR': '🇱🇷', // Liberia
        'GH': '🇬🇭', // Ghana
        'NG': '🇳🇬', // Nigeria
        'MR': '🇲🇷', // Mauritanie
        'GM': '🇬🇲', // Gambie
        'CV': '🇨🇻', // Cap-Vert
        
        // Afrique de l'Est
        'KE': '🇰🇪', // Kenya
        'TZ': '🇹🇿', // Tanzanie
        'UG': '🇺🇬', // Ouganda
        'RW': '🇷🇼', // Rwanda
        'BI': '🇧🇮', // Burundi
        'ET': '🇪🇹', // Éthiopie
        'SO': '🇸🇴', // Somalie
        'DJ': '🇩🇯', // Djibouti
        'ER': '🇪🇷', // Érythrée
        'SS': '🇸🇸', // Soudan du Sud
        'SD': '🇸🇩', // Soudan
        'SC': '🇸🇨', // Seychelles
        'MU': '🇲🇺', // Maurice
        'KM': '🇰🇲', // Comores
        'MG': '🇲🇬', // Madagascar
        
        // Afrique du Nord
        'MA': '🇲🇦', // Maroc
        'DZ': '🇩🇿', // Algérie
        'TN': '🇹🇳', // Tunisie
        'LY': '🇱🇾', // Libye
        'EG': '🇪🇬', // Égypte
        'EH': '🇪🇭', // Sahara Occidental
        
        // Afrique Australe
        'ZA': '🇿🇦', // Afrique du Sud
        'NA': '🇳🇦', // Namibie
        'BW': '🇧🇼', // Botswana
        'ZW': '🇿🇼', // Zimbabwe
        'ZM': '🇿🇲', // Zambie
        'MW': '🇲🇼', // Malawi
        'MZ': '🇲🇿', // Mozambique
        'SZ': '🇸🇿', // Eswatini
        'LS': '🇱🇸', // Lesotho
        
        // Europe
        'FR': '🇫🇷', // France
        'GB': '🇬🇧', // Royaume-Uni
        'DE': '🇩🇪', // Allemagne
        'IT': '🇮🇹', // Italie
        'ES': '🇪🇸', // Espagne
        'PT': '🇵🇹', // Portugal
        'BE': '🇧🇪', // Belgique
        'NL': '🇳🇱', // Pays-Bas
        'CH': '🇨🇭', // Suisse
        'AT': '🇦🇹', // Autriche
        'GR': '🇬🇷', // Grèce
        'PL': '🇵🇱', // Pologne
        'RO': '🇷🇴', // Roumanie
        'CZ': '🇨🇿', // République Tchèque
        'SE': '🇸🇪', // Suède
        'NO': '🇳🇴', // Norvège
        'DK': '🇩🇰', // Danemark
        'FI': '🇫🇮', // Finlande
        'IE': '🇮🇪', // Irlande
        'RU': '🇷🇺', // Russie
        'UA': '🇺🇦', // Ukraine
        
        // Amériques
        'US': '🇺🇸', // États-Unis
        'CA': '🇨🇦', // Canada
        'MX': '🇲🇽', // Mexique
        'BR': '🇧🇷', // Brésil
        'AR': '🇦🇷', // Argentine
        'CL': '🇨🇱', // Chili
        'CO': '🇨🇴', // Colombie
        'PE': '🇵🇪', // Pérou
        'VE': '🇻🇪', // Venezuela
        
        // Asie
        'CN': '🇨🇳', // Chine
        'JP': '🇯🇵', // Japon
        'IN': '🇮🇳', // Inde
        'KR': '🇰🇷', // Corée du Sud
        'SA': '🇸🇦', // Arabie Saoudite
        'AE': '🇦🇪', // Émirats Arabes Unis
        'TR': '🇹🇷', // Turquie
        'IL': '🇮🇱', // Israël
        'TH': '🇹🇭', // Thaïlande
        'VN': '🇻🇳', // Vietnam
        'SG': '🇸🇬', // Singapour
        'MY': '🇲🇾', // Malaisie
        'ID': '🇮🇩', // Indonésie
        'PH': '🇵🇭', // Philippines
        'PK': '🇵🇰', // Pakistan
        'BD': '🇧🇩', // Bangladesh
        'LK': '🇱🇰', // Sri Lanka
        
        // Océanie
        'AU': '🇦🇺', // Australie
        'NZ': '🇳🇿', // Nouvelle-Zélande
        
        // Moyen-Orient
        'LB': '🇱🇧', // Liban
        'JO': '🇯🇴', // Jordanie
        'SY': '🇸🇾', // Syrie
        'IQ': '🇮🇶', // Irak
        'IR': '🇮🇷', // Iran
        'KW': '🇰🇼', // Koweït
        'QA': '🇶🇦', // Qatar
        'BH': '🇧🇭', // Bahreïn
        'OM': '🇴🇲', // Oman
        'YE': '🇾🇪', // Yémen
        
        // Autres zones
        'HT': '🇭🇹', // Haïti
      };
      return flagMap[countryCode?.toUpperCase()] || '🌍';
    }

    // Fonction pour extraire le code pays du nom du compte
    private extractCountryCodeFromAccountName(accountName: string): string {
      // Chercher les préfixes de pays dans le nom du compte
      const upperName = accountName.toUpperCase();
      console.log('[EXTRACT] Extraction pour:', accountName, '->', upperName);
      
      // Mapping des préfixes vers les codes pays
      const prefixMap: {[key: string]: string} = {
        'CI_': 'CI',
        'CM_': 'CM',
        'BF_': 'BF',
        'SN_': 'SN',
        'TG_': 'TG',
        'BJ_': 'BJ',
        'ML_': 'ML',
        'NE_': 'NE',
        'GN_': 'GN',
        'CD_': 'CD',
        'CG_': 'CG',
        'GA_': 'GA',
        'TD_': 'TD',
        'CF_': 'CF',
        'GQ_': 'GQ',
      };
      
      // Chercher un préfixe correspondant
      for (const [prefix, code] of Object.entries(prefixMap)) {
        if (upperName.startsWith(prefix)) {
          console.log('[EXTRACT] Trouvé préfixe:', prefix, '-> code:', code);
          return code;
        }
      }
      
      // Chercher les suffixes de pays dans le nom du compte (plus spécifique)
      const suffixMap: {[key: string]: string} = {
        'CM': 'CM',
        'CI': 'CI',
        'BF': 'BF',
        'SN': 'SN',
        'TG': 'TG',
        'BJ': 'BJ',
        'ML': 'ML',
        'NE': 'NE',
        'GN': 'GN',
      };
      
      // Chercher d'abord les suffixes exacts (plus précis)
      for (const [suffix, code] of Object.entries(suffixMap)) {
        if (upperName.endsWith(suffix)) {
          console.log('[EXTRACT] Trouvé suffixe exact:', suffix, '-> code:', code);
          return code;
        }
      }
      
      // Ensuite chercher les suffixes dans le nom (moins précis)
      for (const [suffix, code] of Object.entries(suffixMap)) {
        if (upperName.includes(suffix) && !upperName.startsWith(suffix + '_')) {
          console.log('[EXTRACT] Trouvé suffixe dans nom:', suffix, '-> code:', code);
          return code;
        }
      }
      
      console.log('[EXTRACT] Aucun code pays trouvé pour:', accountName);
      return '';
    }

    // Fonction pour charger les soldes par compte (DEPUIS LES COMPTES DIRECTEMENT)
    loadAccountBalances() {
      // Récupérer TOUS les comptes depuis le service Compte
      this.compteService.getAllComptes().subscribe({
        next: (comptes: any[]) => {
          console.log('[BALANCES] Comptes reçus:', comptes.length, 'comptes');
          
          // Filtrer les comptes clients (avec un solde > 0 et de type "client")
          const comptesClients = comptes.filter(compte => {
            const hasSolde = compte.solde && compte.solde > 0;
            const isClientType = compte.type === 'client' || compte.categorie === 'client';
            
            console.log('[BALANCES] Compte:', compte.numeroCompte, 
              '- Type:', compte.type, 
              '- Catégorie:', compte.categorie, 
              '- Solde:', compte.solde,
              '- Est client:', isClientType);
            
            return hasSolde && isClientType;
          });
          
          console.log('[BALANCES] Comptes clients avec solde:', comptesClients.length, 'comptes');
          
          // Si aucun compte client trouvé, afficher tous les comptes avec solde > 0
          if (comptesClients.length === 0) {
            console.log('[BALANCES] ⚠️ Aucun compte client trouvé, affichage de tous les comptes avec solde');
            const allComptesWithSolde = comptes.filter(compte => compte.solde && compte.solde > 0);
            console.log('[BALANCES] Comptes avec solde (tous types):', allComptesWithSolde.length, 'comptes');
            
            // Convertir tous les comptes avec solde
            this.accountBalances = allComptesWithSolde.map(compte => {
              const accountName = compte.numeroCompte || compte.codeProprietaire;
              let country = compte.pays;
              
              if (!country || country.trim() === '') {
                country = this.extractCountryCodeFromAccountName(accountName);
              }
              
              return {
                accountName: accountName,
                countryCode: country || '',
                balance: compte.solde || 0,
                flag: this.getCountryFlag(country || '')
              };
            });
            
            this.bannerTitle = '💰 Soldes de tous les comptes';
          } else {
            // Convertir en format pour l'affichage
            this.accountBalances = comptesClients.map(compte => {
              const accountName = compte.numeroCompte || compte.codeProprietaire;
              let country = compte.pays;
              
              // Si le code pays n'est pas dans les données, l'extraire du nom du compte
              if (!country || country.trim() === '') {
                console.log('[BALANCES] Pays manquant pour:', accountName, '- extraction depuis le nom');
                country = this.extractCountryCodeFromAccountName(accountName);
                console.log('[BALANCES] Pays extrait:', country, 'pour:', accountName);
              } else {
                console.log('[BALANCES] Pays trouvé dans données:', country, 'pour:', accountName);
              }
              
              return {
                accountName: accountName,
                countryCode: country || '',
                balance: compte.solde || 0,
                flag: this.getCountryFlag(country || '')
              };
            });
            
            this.bannerTitle = '💰 Soldes des comptes clients';
          }
          
          // Filtrer les comptes avec solde > 0
          this.accountBalances = this.accountBalances.filter(b => b.balance > 0);
          
          // Trier par solde décroissant
          this.accountBalances.sort((a, b) => b.balance - a.balance);
          
          console.log('[BALANCES] Nombre de comptes après filtrage:', this.accountBalances.length);
          console.log('[BALANCES] Tous les comptes avec codes pays:', this.accountBalances.map(b => 
            `${b.flag} [${b.countryCode}] ${b.accountName}: ${b.balance.toLocaleString()}`
          ));
          
          
          // Dupliquer pour effet de boucle infinie
          this.accountBalances = [...this.accountBalances, ...this.accountBalances];
          
          console.log('[BALANCES] Total items dans la bande (avec duplication):', this.accountBalances.length);
        },
        error: (err) => {
          console.error('Erreur lors du chargement des soldes:', err);
          // Fallback: essayer avec agencySummaryService
          this.loadAccountBalancesFromSummary();
        }
      });
    }
    
    // Méthode de fallback utilisant agencySummaryService
    // NOTE: Cette méthode ne peut pas filtrer par type d'opération car agencySummaryService
    // ne fournit pas le détail des types d'opérations, seulement les totaux par agence
    private loadAccountBalancesFromSummary() {
      this.agencySummaryService.getAllSummaries().subscribe({
        next: (data: any[]) => {
          console.log('[BALANCES FALLBACK] Données reçues:', data.length, 'enregistrements');
          
          const balancesByAccount: {[key: string]: {balance: number, countryCode: string}} = {};
          
          data.forEach((item: any) => {
            const accountName = item.agency;
            let country = item.pays || item.country;
            
            if (accountName && accountName.trim() !== '') {
              // Si le code pays n'est pas dans les données, l'extraire du nom du compte
              if (!country || country.trim() === '') {
                country = this.extractCountryCodeFromAccountName(accountName);
              }
              
              if (!balancesByAccount[accountName]) {
                balancesByAccount[accountName] = {
                  balance: 0,
                  countryCode: country || ''
                };
              }
              balancesByAccount[accountName].balance += Number(item.totalVolume) || 0;
              if (!balancesByAccount[accountName].countryCode && country) {
                balancesByAccount[accountName].countryCode = country;
              }
            }
          });
          
          this.accountBalances = Object.keys(balancesByAccount)
            .map(accountName => ({
              accountName: accountName,
              countryCode: balancesByAccount[accountName].countryCode,
              balance: balancesByAccount[accountName].balance,
              flag: this.getCountryFlag(balancesByAccount[accountName].countryCode)
            }))
            .filter(b => b.balance > 0);
          
          this.accountBalances.sort((a, b) => b.balance - a.balance);
          this.accountBalances = [...this.accountBalances, ...this.accountBalances];
          
          console.log('[BALANCES FALLBACK] Comptes chargés:', this.accountBalances.length / 2);
          console.log('[BALANCES FALLBACK] Tous les comptes avec codes pays:', this.accountBalances.slice(0, this.accountBalances.length / 2).map(b => 
            `${b.flag} [${b.countryCode}] ${b.accountName}: ${b.balance.toLocaleString()}`
          ));
        },
        error: (err) => {
          console.error('Erreur lors du chargement des soldes (fallback):', err);
        }
      });
    }

    // Fonction pour calculer la durée d'animation en fonction du nombre de comptes
    getScrollDuration(): number {
      // Diviser par 2 car on a dupliqué les comptes
      const uniqueAccountsCount = this.accountBalances.length / 2;
      // Durée de base: 60s, puis ajouter 3s par compte supplémentaire
      // Minimum 60s, maximum 300s (5 minutes)
      const duration = Math.min(300, Math.max(60, 60 + (uniqueAccountsCount - 5) * 3));
      return duration;
    }

    // Fonction pour obtenir le nom complet du pays
    getCountryName(countryCode: string): string {
      const countryNames: {[key: string]: string} = {
        // Afrique Centrale
        'CM': 'Cameroun', 'CF': 'Centrafrique', 'TD': 'Tchad', 'CG': 'Congo',
        'CD': 'RDC', 'GQ': 'Guinée Équatoriale', 'GA': 'Gabon', 'ST': 'Sao Tomé', 'AO': 'Angola',
        
        // Afrique de l'Ouest
        'CI': 'Côte d\'Ivoire', 'BF': 'Burkina Faso', 'SN': 'Sénégal', 'TG': 'Togo',
        'BJ': 'Bénin', 'ML': 'Mali', 'NE': 'Niger', 'GN': 'Guinée', 'GW': 'Guinée-Bissau',
        'SL': 'Sierra Leone', 'LR': 'Liberia', 'GH': 'Ghana', 'NG': 'Nigeria',
        'MR': 'Mauritanie', 'GM': 'Gambie', 'CV': 'Cap-Vert',
        
        // Afrique de l'Est
        'KE': 'Kenya', 'TZ': 'Tanzanie', 'UG': 'Ouganda', 'RW': 'Rwanda', 'BI': 'Burundi',
        'ET': 'Éthiopie', 'SO': 'Somalie', 'DJ': 'Djibouti', 'ER': 'Érythrée',
        'SS': 'Soudan du Sud', 'SD': 'Soudan', 'SC': 'Seychelles', 'MU': 'Maurice',
        'KM': 'Comores', 'MG': 'Madagascar',
        
        // Afrique du Nord
        'MA': 'Maroc', 'DZ': 'Algérie', 'TN': 'Tunisie', 'LY': 'Libye', 'EG': 'Égypte',
        'EH': 'Sahara Occidental',
        
        // Afrique Australe
        'ZA': 'Afrique du Sud', 'NA': 'Namibie', 'BW': 'Botswana', 'ZW': 'Zimbabwe',
        'ZM': 'Zambie', 'MW': 'Malawi', 'MZ': 'Mozambique', 'SZ': 'Eswatini', 'LS': 'Lesotho',
        
        // Europe
        'FR': 'France', 'GB': 'Royaume-Uni', 'DE': 'Allemagne', 'IT': 'Italie',
        'ES': 'Espagne', 'PT': 'Portugal', 'BE': 'Belgique', 'NL': 'Pays-Bas',
        'CH': 'Suisse', 'AT': 'Autriche', 'GR': 'Grèce', 'PL': 'Pologne',
        'RO': 'Roumanie', 'CZ': 'Rép. Tchèque', 'SE': 'Suède', 'NO': 'Norvège',
        'DK': 'Danemark', 'FI': 'Finlande', 'IE': 'Irlande', 'RU': 'Russie', 'UA': 'Ukraine',
        
        // Amériques
        'US': 'États-Unis', 'CA': 'Canada', 'MX': 'Mexique', 'BR': 'Brésil',
        'AR': 'Argentine', 'CL': 'Chili', 'CO': 'Colombie', 'PE': 'Pérou', 'VE': 'Venezuela',
        
        // Asie
        'CN': 'Chine', 'JP': 'Japon', 'IN': 'Inde', 'KR': 'Corée du Sud',
        'SA': 'Arabie Saoudite', 'AE': 'Émirats', 'TR': 'Turquie', 'IL': 'Israël',
        'TH': 'Thaïlande', 'VN': 'Vietnam', 'SG': 'Singapour', 'MY': 'Malaisie',
        'ID': 'Indonésie', 'PH': 'Philippines', 'PK': 'Pakistan', 'BD': 'Bangladesh', 'LK': 'Sri Lanka',
        
        // Océanie
        'AU': 'Australie', 'NZ': 'Nouvelle-Zélande',
        
        // Moyen-Orient
        'LB': 'Liban', 'JO': 'Jordanie', 'SY': 'Syrie', 'IQ': 'Irak', 'IR': 'Iran',
        'KW': 'Koweït', 'QA': 'Qatar', 'BH': 'Bahreïn', 'OM': 'Oman', 'YE': 'Yémen',
        
        // Autres
        'HT': 'Haïti',
      };
      return countryNames[countryCode?.toUpperCase()] || countryCode;
    }

    // Ouvrir un ticket GLPI existant
    openGlpiTicketFromDashboard(idGlpi: string): void {
      if (!idGlpi || !idGlpi.trim()) {
        return;
      }
      const url = `https://glpi.intouchgroup.net/glpi/front/ticket.form.php?id=${idGlpi.trim()}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }

    // Méthodes pour gérer le modal des graphiques
    openGraphModal(): void {
        this.showGraphModal = true;
    }

    closeGraphModal(): void {
        this.showGraphModal = false;
    }
} 