import { ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';

import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

import { Subscription, firstValueFrom, forkJoin, of } from 'rxjs';

import { catchError, switchMap } from 'rxjs/operators';

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

import { EcartBoSummary, EcartBoSummaryService } from '../../services/ecart-bo-summary.service';

import { DashboardService, ReleveManualRangeRow } from '../../services/dashboard.service';

import {

  BoPartenaireAggregationService,

  BoPartenaireMonthlyAggregateRow,

  BoPartenaireResult8Row,

  RapportDateServiceLine,

  resolveTraitementKind,

  traitementDisplayLabel

} from '../../services/bo-partenaire-aggregation.service';

import {

  BoPartenaireControleInterneRecord,

  BoPartenaireControleInterneService

} from '../../services/bo-partenaire-controle-interne.service';

import {

  BoPartenaireReportCacheService,

  BoPartenaireReportCacheSnapshot

} from '../../services/bo-partenaire-report-cache.service';

import {

  RECONCILIATION_ENV_OPTIONS,

  normalizeReconciliationReportEnv

} from '../../constants/reconciliation-env-options';

import { PopupService } from '../../services/popup.service';
import { AppStateService, UserPaysScope } from '../../services/app-state.service';
import { countriesMatch, countryNameFromCode } from '../../utils/country-codes.util';



export interface ControleInterneDisplayRow extends BoPartenaireMonthlyAggregateRow {

  statutControleInterne: string;

  controleInterneValidatedBy?: string;

  controleInterneValidatedAt?: string;

  isControleValide: boolean;

  monthLabel: string;

}

export interface ControleInterneSectionTotals {
  combinaisons: number;
  boNombre: number;
  boVolume: number;
  partenaireNombre: number;
  partenaireVolume: number;
  ecartNombre: number;
  ecartVolume: number;
  tauxVolume: number | null;
  /** Totaux rapport brut (date × service) pour les panneaux latéraux. */
  rapportNombre: number;
  rapportVolume: number;
}



@Component({

  selector: 'app-controle-interne-bo-partenaire',

  templateUrl: './controle-interne-bo-partenaire.component.html',

  styleUrls: ['./controle-interne-bo-partenaire.component.scss']

})

export class ControleInterneBoPartenaireComponent implements OnInit, OnDestroy {

  readonly envOptions: string[] = ['ALL', ...RECONCILIATION_ENV_OPTIONS];



  loading = false;

  loadingValidations = false;

  validatingKey: string | null = null;

  validatingEnvBulk = false;

  error: string | null = null;
  /** Message explicite lorsque le rapport est vide (pays profil ou filtres). */
  emptyScopeHint: string | null = null;
  dataFromRapportCache = false;



  selectedCountry = '';

  selectedYear = new Date().getFullYear();

  /** Vide = tous les mois ; sinon `01`…`12`. Par défaut : mois calendaire en cours. */

  selectedMonth = ControleInterneBoPartenaireComponent.currentMonthMm();

  selectedEnv = 'HT';

  /** Vide = tous les services. */
  selectedService = '';

  /** Période héritée du rapport BO vs Partenaire (query params). */

  private rapportDateDebut = '';

  private rapportDateFin = '';



  countries: string[] = [];

  /** Pays autorisés par le profil utilisateur (noms affichés dans les filtres). */
  private profileCountryNames: string[] = [];

  availableServices: string[] = [];

  yearOptions: number[] = [];

  readonly monthOptions: { value: string; label: string }[] = [

    { value: '', label: 'Tous les mois' },

    { value: '01', label: 'Janvier' },

    { value: '02', label: 'Février' },

    { value: '03', label: 'Mars' },

    { value: '04', label: 'Avril' },

    { value: '05', label: 'Mai' },

    { value: '06', label: 'Juin' },

    { value: '07', label: 'Juillet' },

    { value: '08', label: 'Août' },

    { value: '09', label: 'Septembre' },

    { value: '10', label: 'Octobre' },

    { value: '11', label: 'Novembre' },

    { value: '12', label: 'Décembre' }

  ];



  monthlyRows: ControleInterneDisplayRow[] = [];

  /** Lignes affichées sur la page courante du tableau agrégé. */
  paginatedMonthlyRows: ControleInterneDisplayRow[] = [];

  currentPage = 1;
  itemsPerPage = 15;
  totalPages = 0;

  /** Toutes les lignes du périmètre (sans filtre service) — base de la validation par ENV. */
  monthlyRowsAll: ControleInterneDisplayRow[] = [];

  validesCloturesAll: RapportDateServiceLine[] = [];

  nonValidesCloturesAll: RapportDateServiceLine[] = [];

  nonValidesPanelFilter = { date: '', service: '', statut: '' };

  validesPanelFilter = { date: '', service: '', statut: '' };

  nonValidesPanelPage = 1;

  validesPanelPage = 1;

  readonly panelItemsPerPage = 15;

  commentaire = '';
  destinatairesEmails = '';
  commentUpdatedBy = '';
  commentUpdatedAt = '';
  commentLastEmailedAt = '';
  commentLastEmailedBy = '';
  savingComment = false;
  sendingCommentEmail = false;

  /** Popup liste des tickets GLPI (ouvert au clic sur le badge). */
  ticketModalOpen = false;
  ticketModalTitle = '';
  ticketModalTicketIds: string[] = [];
  isExportingPdf = false;
  isExportingExcel = false;

  /** Colonnes Écart / Taux masquées par défaut (affichables à la demande). */
  showEcartColumns = false;

  @ViewChild('ciExportRoot') ciExportRootRef?: ElementRef<HTMLElement>;



  /** trackBy stable (évite perte de contexte `this` dans ngFor). */

  readonly trackByRow = (_i: number, row: ControleInterneDisplayRow): string =>

    `${row.monthYyyyMm}|${row.service}`;



  readonly trackByDateService = (_i: number, line: RapportDateServiceLine): string =>

    `${line.date}|${line.service}`;



  private subs = new Subscription();

  private fetchSub?: Subscription;

  private loadSeq = 0;

  private lastFetchKey = '';

  /** Évite une boucle lors de la synchronisation des query params par défaut. */
  private initialDefaultsSynced = false;

  private rawReport: BoPartenaireResult8Row[] = [];

  private ecartAll: EcartBoSummary[] = [];

  private manualRows: ReleveManualRangeRow[] = [];

  private validations = new Map<string, BoPartenaireControleInterneRecord>();

  private readonly numberFormatter = new Intl.NumberFormat('fr-FR');
  private readonly cardCountFormatter = new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
    useGrouping: true
  });
  private readonly cardVolumeFormatter = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    useGrouping: true
  });



  constructor(

    private http: HttpClient,

    private router: Router,

    private route: ActivatedRoute,

    private cdr: ChangeDetectorRef,

    private ecartBoSummaryService: EcartBoSummaryService,

    private dashboardService: DashboardService,

    private aggregationService: BoPartenaireAggregationService,

    private controleInterneService: BoPartenaireControleInterneService,

    private reportCache: BoPartenaireReportCacheService,

    private popupService: PopupService,

    private appState: AppStateService

  ) {}



  ngOnInit(): void {

    const currentYear = new Date().getFullYear();

    this.yearOptions = [currentYear, currentYear - 1, currentYear - 2];



    this.subs.add(

      this.appState.ensureUserPaysScope(true).pipe(

        switchMap((scope) => {

          this.applyProfileCountryScope(scope);

          return this.loadCountriesFromReportFilters().pipe(

            switchMap(() => this.route.queryParams)

          );

        }),

        catchError(() => this.route.queryParams)

      ).subscribe((qp) => {

        if (qp['country']) {

          this.selectedCountry = this.resolveCountryLabel(String(qp['country']));

        }

        if (qp['env']) {

          this.selectedEnv = qp['env'];

        }

        if (qp['year']) {

          const y = Number(qp['year']);

          if (!Number.isNaN(y)) {

            this.selectedYear = y;

          }

        }

        const hasMonthParam = qp['month'] != null && String(qp['month']).trim() !== '';

        if (hasMonthParam) {

          const raw = String(qp['month']).trim().toLowerCase();

          if (raw === 'all' || raw === 'tous') {

            this.selectedMonth = '';

          } else {

            const m = raw.padStart(2, '0').slice(-2);

            this.selectedMonth = this.monthOptions.some((o) => o.value === m)

              ? m

              : ControleInterneBoPartenaireComponent.currentMonthMm();

          }

        } else {

          this.applyDefaultMonthForYear();

        }

        this.selectedService = qp['service'] ? String(qp['service']) : '';

        this.rapportDateDebut = qp['dateDebut'] || '';

        this.rapportDateFin = qp['dateFin'] || '';

        if (this.rapportDateDebut && this.rapportDateFin) {

          this.selectedMonth = '';

        }

        this.ensureDefaultCountry();

        const needsDefaultUrlSync =

          !this.initialDefaultsSynced

          && !this.rapportDateDebut

          && (!qp['country'] || !hasMonthParam);

        if (needsDefaultUrlSync) {

          this.initialDefaultsSynced = true;

          this.syncQueryParams();

          return;

        }



        const fetchKey = JSON.stringify({

          country: this.selectedCountry,

          env: this.selectedEnv,

          year: this.selectedYear,

          month: this.selectedMonth,

          dateDebut: this.rapportDateDebut,

          dateFin: this.rapportDateFin

        });

        if (fetchKey !== this.lastFetchKey) {

          this.lastFetchKey = fetchKey;

          this.loadDonnees(false);

        } else if (this.rawReport.length) {

          this.rebuildDisplay({ resetPage: false });

        }

      })

    );

  }



  private applyProfileCountryScope(scope: UserPaysScope | null): void {

    this.profileCountryNames = this.appState.getProfileCountryNames();

    // Contrôle interne : tous les pays du rapport sont proposés (pas de cloisonnement profil).

  }



  /** Pays distincts présents dans result8rec (tous pays, sans cloisonnement profil). */
  private loadCountriesFromReportFilters() {

    return this.http

      .get<{ countries?: string[] }>('/api/result8rec/filters')

      .pipe(

        catchError(() => of({ countries: [] as string[] })),

        switchMap((filters) => {

          const fromApi = (filters.countries ?? []).map((c) => (c || '').trim()).filter(Boolean);

          const merged = new Set<string>([...fromApi, ...this.countries]);

          if (this.selectedCountry) {

            merged.add(this.selectedCountry);

          }

          this.countries = Array.from(merged).sort((a, b) => a.localeCompare(b, 'fr'));

          this.syncSelectedCountryWithList();

          this.cdr.markForCheck();

          return of(void 0);

        })

      );

  }



  private static currentMonthMm(): string {

    return String(new Date().getMonth() + 1).padStart(2, '0');

  }

  private applyDefaultMonthForYear(): void {

    const now = new Date();

    this.selectedMonth =

      this.selectedYear === now.getFullYear()

        ? ControleInterneBoPartenaireComponent.currentMonthMm()

        : '01';

  }

  private ensureDefaultCountry(): void {

    if (this.selectedCountry) {

      this.syncSelectedCountryWithList();

      return;

    }

    if (this.profileCountryNames.length) {

      this.selectedCountry =

        this.resolveCountryLabel(this.profileCountryNames[0]) || this.profileCountryNames[0];

      this.syncSelectedCountryWithList();

      return;

    }

    const scope = this.appState.getUserPaysScope();

    if (scope?.codes?.length) {

      this.selectedCountry = this.resolveCountryLabel(scope.codes[0]) || scope.codes[0];

      this.syncSelectedCountryWithList();

      return;

    }

    const preferred = this.countries.find((c) => countriesMatch(c, 'GA'));

    this.selectedCountry = preferred || this.countries[0] || '';

    if (this.selectedCountry) {

      this.syncSelectedCountryWithList();

    }

  }

  private resolveCountryLabel(value: string | null | undefined): string {

    const trimmed = (value || '').trim();

    if (!trimmed) {

      return '';

    }

    return countryNameFromCode(trimmed) || trimmed;

  }

  private syncSelectedCountryWithList(): void {

    if (!this.selectedCountry || !this.countries.length) {

      return;

    }

    const match = this.countries.find((c) => countriesMatch(c, this.selectedCountry));

    if (match) {

      this.selectedCountry = match;

      return;

    }

    this.countries = [...this.countries, this.selectedCountry].sort((a, b) => a.localeCompare(b, 'fr'));

  }

  private countryMatchesSelected(rowCountry: string | null | undefined): boolean {

    return countriesMatch(rowCountry, this.selectedCountry);

  }



  ngOnDestroy(): void {

    this.fetchSub?.unsubscribe();

    this.subs.unsubscribe();

  }



  get subtitle(): string {

    const envLabel = this.selectedEnv === 'ALL' ? 'tous ENV' : this.selectedEnv;

    const monthLabel = this.selectedMonthLabel;

    const period = monthLabel ? `${monthLabel} ${this.selectedYear}` : String(this.selectedYear);

    const cacheHint = this.dataFromRapportCache ? ' · données rapport' : '';

    return `${this.selectedCountry || '—'} · ${period} · ${envLabel}${cacheHint}`;

  }



  get selectedMonthLabel(): string {

    if (!this.selectedMonth) {

      return '';

    }

    return this.monthOptions.find((o) => o.value === this.selectedMonth)?.label ?? this.selectedMonth;

  }



  retourRapportBo(): void {

    this.router.navigate(['/rapport-reconciliation-bo-partenaire']);

  }



  appliquerFiltres(): void {

    this.rapportDateDebut = '';

    this.rapportDateFin = '';

    this.syncQueryParams();

  }

  onServiceFilterChange(): void {

    this.syncQueryParams(false);

    this.rebuildDisplay({ resetPage: true });

  }

  get canValidateControleInterne(): boolean {

    return this.appState.canValidateControleInterneBoPartenaire();

  }

  get canRevokeControleInterne(): boolean {

    return this.appState.canRevokeControleInterneBoPartenaire();

  }

  get canShowCommentSection(): boolean {
    return this.canConsultCommentaireControleInterne
      || this.canModifyCommentaireControleInterne
      || this.canSendEmailControleInterne;
  }

  get canConsultCommentaireControleInterne(): boolean {
    return this.appState.canConsultCommentaireControleInterneBoPartenaire();
  }

  get canModifyCommentaireControleInterne(): boolean {
    return this.appState.canModifyCommentaireControleInterneBoPartenaire();
  }

  get canSendEmailControleInterne(): boolean {
    return this.appState.canSendEmailControleInterneBoPartenaire();
  }

  get canShowValidationActions(): boolean {
    return this.canValidateControleInterne || this.canRevokeControleInterne;
  }



  private syncQueryParams(resetRapportDates = true): void {

    this.router.navigate([], {

      relativeTo: this.route,

      queryParams: {

        country: this.selectedCountry || null,

        env: this.selectedEnv || null,

        year: this.selectedYear,

        month: this.selectedMonth || 'all',

        service: this.selectedService || null,

        dateDebut: resetRapportDates ? null : this.rapportDateDebut || null,

        dateFin: resetRapportDates ? null : this.rapportDateFin || null

      },

      queryParamsHandling: 'merge',

      replaceUrl: true

    });

  }



  refreshData(): void {

    this.loadDonnees(true);

  }



  formatNumber(n: number): string {

    return this.numberFormatter.format(Math.round(n));

  }



  formatVolume(n: number): string {

    return this.numberFormatter.format(Math.round(n * 100) / 100);

  }

  /** Affichage compact sur les cartes (nombre entier groupé). */
  formatCardNombre(n: number): string {
    return this.cardCountFormatter.format(Math.round(n || 0));
  }

  /** Affichage des volumes sur les cartes (entier groupé fr-FR). */
  formatCardVolume(n: number): string {
    return this.cardVolumeFormatter.format(Math.round(n || 0));
  }

  get monthlySectionTotals(): ControleInterneSectionTotals {
    return this.sumMonthlyRows(this.monthlyRows);
  }

  updateMonthlyPagination(resetPage = false): void {
    if (resetPage) {
      this.currentPage = 1;
    }
    const total = this.monthlyRows.length;
    this.totalPages = total ? Math.ceil(total / this.itemsPerPage) : 0;
    if (this.totalPages > 0 && this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    if (this.currentPage < 1) {
      this.currentPage = 1;
    }
    const start = (this.currentPage - 1) * this.itemsPerPage;
    this.paginatedMonthlyRows = this.monthlyRows.slice(start, start + this.itemsPerPage);
  }

  goToMonthlyPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }
    this.currentPage = page;
    this.updateMonthlyPagination();
    this.cdr.markForCheck();
  }

  nextMonthlyPage(): void {
    this.goToMonthlyPage(this.currentPage + 1);
  }

  previousMonthlyPage(): void {
    this.goToMonthlyPage(this.currentPage - 1);
  }

  getMonthlyPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  getMonthlyPaginationStartIndex(): number {
    if (!this.monthlyRows.length) {
      return 0;
    }
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  getMonthlyPaginationEndIndex(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.monthlyRows.length);
  }

  get filteredNonValidesClotures(): RapportDateServiceLine[] {
    return this.applyPanelLineFilters(this.nonValidesCloturesAll, this.nonValidesPanelFilter);
  }

  get filteredValidesClotures(): RapportDateServiceLine[] {
    return this.applyPanelLineFilters(this.validesCloturesAll, this.validesPanelFilter);
  }

  get paginatedNonValidesClotures(): RapportDateServiceLine[] {
    const start = (this.nonValidesPanelPage - 1) * this.panelItemsPerPage;
    return this.filteredNonValidesClotures.slice(start, start + this.panelItemsPerPage);
  }

  get paginatedValidesClotures(): RapportDateServiceLine[] {
    const start = (this.validesPanelPage - 1) * this.panelItemsPerPage;
    return this.filteredValidesClotures.slice(start, start + this.panelItemsPerPage);
  }

  get nonValidesPanelTotalPages(): number {
    const total = this.filteredNonValidesClotures.length;
    return total ? Math.ceil(total / this.panelItemsPerPage) : 0;
  }

  get validesPanelTotalPages(): number {
    const total = this.filteredValidesClotures.length;
    return total ? Math.ceil(total / this.panelItemsPerPage) : 0;
  }

  get nonValidesSectionTotals(): ControleInterneSectionTotals {
    return this.sumDateServiceLines(this.filteredNonValidesClotures);
  }

  get validesSectionTotals(): ControleInterneSectionTotals {
    return this.sumDateServiceLines(this.filteredValidesClotures);
  }

  onPanelFilterChange(panel: 'nonValides' | 'valides'): void {
    if (panel === 'nonValides') {
      this.nonValidesPanelPage = 1;
    } else {
      this.validesPanelPage = 1;
    }
    this.cdr.markForCheck();
  }

  resetPanelFilters(panel: 'nonValides' | 'valides' | 'both'): void {
    if (panel === 'nonValides' || panel === 'both') {
      this.nonValidesPanelFilter = { date: '', service: '', statut: '' };
      this.nonValidesPanelPage = 1;
    }
    if (panel === 'valides' || panel === 'both') {
      this.validesPanelFilter = { date: '', service: '', statut: '' };
      this.validesPanelPage = 1;
    }
    this.cdr.markForCheck();
  }

  hasActivePanelFilter(panel: 'nonValides' | 'valides'): boolean {
    const filters = panel === 'nonValides' ? this.nonValidesPanelFilter : this.validesPanelFilter;
    return !!(filters.date || filters.service || filters.statut);
  }

  goToPanelPage(panel: 'nonValides' | 'valides', page: number): void {
    const totalPages = panel === 'nonValides' ? this.nonValidesPanelTotalPages : this.validesPanelTotalPages;
    const currentPage = panel === 'nonValides' ? this.nonValidesPanelPage : this.validesPanelPage;
    if (page < 1 || page > totalPages || page === currentPage) {
      return;
    }
    if (panel === 'nonValides') {
      this.nonValidesPanelPage = page;
    } else {
      this.validesPanelPage = page;
    }
    this.cdr.markForCheck();
  }

  nextPanelPage(panel: 'nonValides' | 'valides'): void {
    const currentPage = panel === 'nonValides' ? this.nonValidesPanelPage : this.validesPanelPage;
    this.goToPanelPage(panel, currentPage + 1);
  }

  previousPanelPage(panel: 'nonValides' | 'valides'): void {
    const currentPage = panel === 'nonValides' ? this.nonValidesPanelPage : this.validesPanelPage;
    this.goToPanelPage(panel, currentPage - 1);
  }

  getPanelPageNumbers(panel: 'nonValides' | 'valides'): number[] {
    const currentPage = panel === 'nonValides' ? this.nonValidesPanelPage : this.validesPanelPage;
    const totalPages = panel === 'nonValides' ? this.nonValidesPanelTotalPages : this.validesPanelTotalPages;
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  getPanelPaginationStartIndex(panel: 'nonValides' | 'valides'): number {
    const filtered = panel === 'nonValides' ? this.filteredNonValidesClotures : this.filteredValidesClotures;
    const currentPage = panel === 'nonValides' ? this.nonValidesPanelPage : this.validesPanelPage;
    if (!filtered.length) {
      return 0;
    }
    return (currentPage - 1) * this.panelItemsPerPage + 1;
  }

  getPanelPaginationEndIndex(panel: 'nonValides' | 'valides'): number {
    const filtered = panel === 'nonValides' ? this.filteredNonValidesClotures : this.filteredValidesClotures;
    const currentPage = panel === 'nonValides' ? this.nonValidesPanelPage : this.validesPanelPage;
    return Math.min(currentPage * this.panelItemsPerPage, filtered.length);
  }

  getPanelDateOptions(lines: RapportDateServiceLine[]): string[] {
    const dates = new Set<string>();
    for (const line of lines) {
      if (line.date) {
        dates.add(line.date);
      }
    }
    return Array.from(dates).sort((a, b) => a.localeCompare(b));
  }

  getPanelServiceOptions(lines: RapportDateServiceLine[]): string[] {
    const services = new Set<string>();
    for (const line of lines) {
      if (line.service) {
        services.add(line.service);
      }
    }
    return Array.from(services).sort((a, b) => a.localeCompare(b, 'fr'));
  }

  getPanelStatutOptions(lines: RapportDateServiceLine[]): string[] {
    const statuts = new Set<string>();
    for (const line of lines) {
      if (line.statutRapport) {
        statuts.add(line.statutRapport);
      }
    }
    return Array.from(statuts).sort((a, b) => a.localeCompare(b, 'fr'));
  }

  private applyPanelLineFilters(
    lines: RapportDateServiceLine[],
    filters: { date: string; service: string; statut: string }
  ): RapportDateServiceLine[] {
    return lines.filter((line) => {
      if (filters.date && line.date !== filters.date) {
        return false;
      }
      if (filters.service && !this.strEqual(line.service, filters.service)) {
        return false;
      }
      if (filters.statut && !this.strEqual(line.statutRapport, filters.statut)) {
        return false;
      }
      return true;
    });
  }

  private resetPanelPagination(): void {
    this.resetPanelFilters('both');
  }

  get ticketsByMonth(): { monthYyyyMm: string; monthLabel: string; ticketIds: string[] }[] {
    const map = new Map<string, Set<string>>();
    for (const row of this.monthlyRows) {
      if (!map.has(row.monthYyyyMm)) {
        map.set(row.monthYyyyMm, new Set<string>());
      }
      const bucket = map.get(row.monthYyyyMm)!;
      for (const id of row.ticketIds || []) {
        bucket.add(id);
      }
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([monthYyyyMm, ids]) => ({
        monthYyyyMm,
        monthLabel: this.aggregationService.formatMonthLabel(monthYyyyMm),
        ticketIds: Array.from(ids).sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }))
      }));
  }

  getGlpiTicketUrl(ticketId: string): string {
    const id = this.resolveTicketNumericId(ticketId);
    return `https://glpi.intouchgroup.net/glpi/public/front/ticket.form.php?id=${encodeURIComponent(id)}`;
  }

  resolveTicketNumericId(raw: string): string {
    return this.aggregationService.normalizeGlpiTicketId(raw);
  }

  openTicketModal(ticketIds: string[] | undefined, title: string): void {
    if (!ticketIds?.length) {
      return;
    }
    this.ticketModalTitle = title;
    this.ticketModalTicketIds = [...ticketIds];
    this.ticketModalOpen = true;
    this.cdr.markForCheck();
  }

  closeTicketModal(): void {
    if (!this.ticketModalOpen) {
      return;
    }
    this.ticketModalOpen = false;
    this.ticketModalTicketIds = [];
    this.cdr.markForCheck();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.closeTicketModal();
  }

  toggleShowEcartColumns(): void {
    this.showEcartColumns = !this.showEcartColumns;
    this.cdr.markForCheck();
  }

  formatTicketIdsLabel(ticketIds: string[] | undefined): string {
    const count = ticketIds?.length || 0;
    if (!count) {
      return '—';
    }
    return count === 1 ? '1 ticket' : `${count} tickets`;
  }

  get canExport(): boolean {
    return !!this.selectedCountry && !this.loading && !this.error && this.monthlyRows.length > 0;
  }

  async exportToPdf(): Promise<void> {
    const el = this.ciExportRootRef?.nativeElement;
    if (!el || !this.canExport || this.isExportingPdf) {
      return;
    }
    this.isExportingPdf = true;
    this.cdr.detectChanges();
    await new Promise<void>((resolve) => setTimeout(resolve, 150));

    const originalOverflow = el.style.overflow;
    el.style.overflow = 'visible';

    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#f2f0eb'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'px', [canvas.width, canvas.height]);
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(this.buildExportBaseName() + '.pdf');
      this.popupService.showSuccess('Export PDF téléchargé.');
    } catch (e) {
      console.error('Export PDF contrôle interne:', e);
      this.popupService.showError('Erreur lors de l\'export PDF.');
    } finally {
      el.style.overflow = originalOverflow;
      this.isExportingPdf = false;
      this.cdr.markForCheck();
    }
  }

  exportToExcel(): void {
    if (!this.canExport || this.isExportingExcel) {
      return;
    }
    this.isExportingExcel = true;
    try {
      const wb = XLSX.utils.book_new();

      const agregationRows = this.monthlyRows.map((row) => ({
        Mois: row.monthLabel,
        Service: row.service,
        'ID Ticket': (row.ticketIds || []).join(', '),
        'Statut rapport': row.statutRapport,
        'Statut contrôle interne': row.statutControleInterne,
        'BO Nbre': row.boNombre,
        'BO Volume': row.boVolume,
        'Part. Nbre': row.partenaireNombre,
        'Part. Volume': row.partenaireVolume,
        'Écart Nbre': row.ecartNombre,
        'Écart Volume': row.ecartVolume,
        Taux: row.tauxVolume != null ? `${row.tauxVolume}%` : '—'
      }));
      agregationRows.push({
        Mois: 'Total',
        Service: '',
        'ID Ticket': '',
        'Statut rapport': '',
        'Statut contrôle interne': '',
        'BO Nbre': this.monthlySectionTotals.boNombre,
        'BO Volume': this.monthlySectionTotals.boVolume,
        'Part. Nbre': this.monthlySectionTotals.partenaireNombre,
        'Part. Volume': this.monthlySectionTotals.partenaireVolume,
        'Écart Nbre': this.monthlySectionTotals.ecartNombre,
        'Écart Volume': this.monthlySectionTotals.ecartVolume,
        Taux: this.monthlySectionTotals.tauxVolume != null ? `${this.monthlySectionTotals.tauxVolume}%` : '—'
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(agregationRows), 'Agrégation');

      const ticketRows = this.ticketsByMonth.map((block) => ({
        Mois: block.monthLabel,
        'ID Tickets': block.ticketIds.join(', '),
        Nombre: block.ticketIds.length
      }));
      if (ticketRows.length) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ticketRows), 'Tickets');
      }

      const meta = [{
        Périmètre: this.subtitle,
        Pays: this.selectedCountry,
        ENV: this.selectedEnv,
        Service: this.selectedService || 'Tous',
        Commentaire: this.commentaire || ''
      }];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(meta), 'Infos');

      XLSX.writeFile(wb, this.buildExportBaseName() + '.xlsx');
      this.popupService.showSuccess('Export Excel téléchargé.');
    } catch (e) {
      console.error('Export Excel contrôle interne:', e);
      this.popupService.showError('Erreur lors de l\'export Excel.');
    } finally {
      this.isExportingExcel = false;
      this.cdr.markForCheck();
    }
  }

  private buildExportBaseName(): string {
    const pays = (this.selectedCountry || 'pays').replace(/\s+/g, '-');
    const env = (this.selectedEnv || 'ENV').replace(/\s+/g, '-');
    const month = this.selectedMonth || 'tous';
    return `Controle-interne-${pays}-${env}-${this.selectedYear}-${month}`;
  }

  libelleTauxTotal(taux: number | null): string {
    if (taux == null) {
      return '—';
    }
    return `${this.numberFormatter.format(Math.round(taux * 100) / 100)} %`;
  }

  private sumMonthlyRows(rows: ControleInterneDisplayRow[]): ControleInterneSectionTotals {
    const boNombre = rows.reduce((s, r) => s + r.boNombre, 0);
    const boVolume = rows.reduce((s, r) => s + r.boVolume, 0);
    const partenaireNombre = rows.reduce((s, r) => s + r.partenaireNombre, 0);
    const partenaireVolume = rows.reduce((s, r) => s + r.partenaireVolume, 0);
    const ecartNombre = rows.reduce((s, r) => s + r.ecartNombre, 0);
    const ecartVolume = rows.reduce((s, r) => s + r.ecartVolume, 0);
    const tauxVolume =
      boVolume !== 0
        ? (ecartVolume / boVolume) * 100
        : partenaireVolume !== 0
          ? null
          : 0;
    return {
      combinaisons: rows.length,
      boNombre,
      boVolume,
      partenaireNombre,
      partenaireVolume,
      ecartNombre,
      ecartVolume,
      tauxVolume,
      rapportNombre: boNombre,
      rapportVolume: boVolume
    };
  }

  private sumDateServiceLines(lines: RapportDateServiceLine[]): ControleInterneSectionTotals {
    const rapportNombre = lines.reduce((s, l) => s + (l.nombre || 0), 0);
    const rapportVolume = lines.reduce((s, l) => s + (l.volume || 0), 0);
    return {
      combinaisons: lines.length,
      boNombre: 0,
      boVolume: 0,
      partenaireNombre: 0,
      partenaireVolume: 0,
      ecartNombre: 0,
      ecartVolume: 0,
      tauxVolume: null,
      rapportNombre,
      rapportVolume
    };
  }



  libelleTaux(r: ControleInterneDisplayRow): string {

    if (r.tauxVolume == null) {

      return '—';

    }

    return `${this.numberFormatter.format(Math.round(r.tauxVolume * 100) / 100)} %`;

  }



  displayTraitementLabel(traitement: string): string {

    return traitementDisplayLabel(traitement);

  }



  classeStatutRapport(traitement: string): string {

    const k = resolveTraitementKind(traitement);

    if (k === 'termine') {

      return 'ci-pill ci-pill--ok';

    }

    return 'ci-pill ci-pill--pending';

  }



  classeStatutControle(row: ControleInterneDisplayRow): string {

    return row.isControleValide ? 'ci-pill ci-pill--ok' : 'ci-pill ci-pill--validation';

  }



  private getDisplayRowKey(row: ControleInterneDisplayRow): string {

    return `${row.monthYyyyMm}|${row.service}`;

  }



  isRowValidating(row: ControleInterneDisplayRow): boolean {

    return this.validatingKey === this.getDisplayRowKey(row);

  }



  canValidateRow(row: ControleInterneDisplayRow): boolean {

    return this.canValidateControleInterne
      && !row.isControleValide
      && !this.loading
      && !this.validatingEnvBulk;

  }

  canRevokeRow(row: ControleInterneDisplayRow): boolean {

    return this.canRevokeControleInterne
      && row.isControleValide
      && !this.loading
      && !this.validatingEnvBulk;

  }

  get envValidationLabel(): string {

    return this.selectedEnv === 'ALL' ? 'tous ENV' : this.selectedEnv;

  }

  get envValidationValidatedCount(): number {

    return this.monthlyRowsAll.filter((row) => row.isControleValide).length;

  }

  get envValidationPendingCount(): number {

    return this.monthlyRowsAll.filter((row) => !row.isControleValide).length;

  }

  get envValidationTotalCount(): number {

    return this.monthlyRowsAll.length;

  }

  get isEnvScopeFullyValidated(): boolean {

    return this.envValidationTotalCount > 0 && this.envValidationPendingCount === 0;

  }

  get canValidateEnvScope(): boolean {

    return this.canValidateControleInterne
      && this.envValidationPendingCount > 0
      && !this.loading
      && !this.validatingEnvBulk
      && !this.validatingKey
      && !!this.selectedCountry;

  }

  get canRevokeEnvScope(): boolean {

    return this.canRevokeControleInterne
      && this.envValidationValidatedCount > 0
      && !this.loading
      && !this.validatingEnvBulk
      && !this.validatingKey
      && !!this.selectedCountry;

  }

  private getValidationEnvParam(): string {

    return this.selectedEnv === 'ALL' ? 'ALL' : this.selectedEnv;

  }

  async validerParEnv(): Promise<void> {

    if (!this.canValidateEnvScope || !this.selectedCountry) {

      return;

    }

    const pending = this.monthlyRowsAll.filter((row) => !row.isControleValide);

    const period = this.selectedMonthLabel
      ? `${this.selectedMonthLabel} ${this.selectedYear}`
      : String(this.selectedYear);

    const confirmed = await this.popupService.showConfirm(

      `Valider le contrôle interne pour ${pending.length} service(s) `

        + `(${this.selectedCountry} · ${period} · ENV ${this.envValidationLabel}) ?`,

      'Validation par ENV'

    );

    if (!confirmed) {

      return;

    }

    this.validatingEnvBulk = true;

    this.cdr.markForCheck();

    let successCount = 0;

    let failCount = 0;

    for (const row of pending) {

      try {

        const saved = await firstValueFrom(

          this.controleInterneService.validate({

            monthYyyyMm: row.monthYyyyMm,

            country: this.selectedCountry,

            env: this.getValidationEnvParam(),

            service: row.service

          })

        );

        this.validations.set(this.validationMapKey(saved), saved);

        successCount++;

      } catch {

        failCount++;

      }

    }

    this.rebuildDisplay({ resetPage: false });

    this.validatingEnvBulk = false;

    if (failCount === 0) {

      await this.popupService.showSuccess(

        `ENV ${this.envValidationLabel} validé : ${successCount} service(s).`

      );

    } else {

      await this.popupService.showWarning(

        `${successCount} service(s) validé(s), ${failCount} échec(s) sur ENV ${this.envValidationLabel}.`

      );

    }

    this.cdr.markForCheck();

  }

  async annulerValidationParEnv(): Promise<void> {

    if (!this.canRevokeEnvScope || !this.selectedCountry) {

      return;

    }

    const validated = this.monthlyRowsAll.filter((row) => row.isControleValide);

    const period = this.selectedMonthLabel
      ? `${this.selectedMonthLabel} ${this.selectedYear}`
      : String(this.selectedYear);

    const confirmed = await this.popupService.showConfirm(

      `Annuler la validation pour ${validated.length} service(s) `

        + `(${this.selectedCountry} · ${period} · ENV ${this.envValidationLabel}) ?`,

      'Annuler validation ENV'

    );

    if (!confirmed) {

      return;

    }

    this.validatingEnvBulk = true;

    this.cdr.markForCheck();

    let successCount = 0;

    let failCount = 0;

    for (const row of validated) {

      try {

        const saved = await firstValueFrom(

          this.controleInterneService.revoke({

            monthYyyyMm: row.monthYyyyMm,

            country: this.selectedCountry,

            env: this.getValidationEnvParam(),

            service: row.service

          })

        );

        this.validations.set(this.validationMapKey(saved), saved);

        successCount++;

      } catch {

        failCount++;

      }

    }

    this.rebuildDisplay({ resetPage: false });

    this.validatingEnvBulk = false;

    if (failCount === 0) {

      await this.popupService.showSuccess(

        `Validation ENV ${this.envValidationLabel} annulée pour ${successCount} service(s).`

      );

    } else {

      await this.popupService.showWarning(

        `${successCount} annulation(s), ${failCount} échec(s) sur ENV ${this.envValidationLabel}.`

      );

    }

    this.cdr.markForCheck();

  }



  validerLigne(row: ControleInterneDisplayRow): void {

    if (!this.canValidateRow(row) || !this.selectedCountry) {

      return;

    }

    this.validatingKey = this.getDisplayRowKey(row);

    this.controleInterneService

      .validate({

        monthYyyyMm: row.monthYyyyMm,

        country: this.selectedCountry,

        env: this.selectedEnv === 'ALL' ? 'ALL' : this.selectedEnv,

        service: row.service

      })

      .subscribe({

        next: (saved) => {

          this.validations.set(this.validationMapKey(saved), saved);

          this.rebuildDisplay({ resetPage: false });

          this.validatingKey = null;

          this.popupService.showSuccess(`Ligne validée : ${row.service} · ${row.monthLabel}`);

          this.cdr.markForCheck();

        },

        error: (err) => {

          this.validatingKey = null;

          const msg = err?.error?.message || 'Impossible de valider cette ligne.';

          this.popupService.showError(msg);

          this.cdr.markForCheck();

        }

      });

  }

  annulerValidation(row: ControleInterneDisplayRow): void {

    if (!this.canRevokeRow(row) || !this.selectedCountry) {

      return;

    }

    this.validatingKey = this.getDisplayRowKey(row);

    this.controleInterneService

      .revoke({

        monthYyyyMm: row.monthYyyyMm,

        country: this.selectedCountry,

        env: this.selectedEnv === 'ALL' ? 'ALL' : this.selectedEnv,

        service: row.service

      })

      .subscribe({

        next: (saved) => {

          this.validations.set(this.validationMapKey(saved), saved);

          this.rebuildDisplay({ resetPage: false });

          this.validatingKey = null;

          this.popupService.showSuccess(`Validation annulée : ${row.service} · ${row.monthLabel}`);

          this.cdr.markForCheck();

        },

        error: (err) => {

          this.validatingKey = null;

          const msg = err?.error?.message || 'Impossible d\'annuler cette validation.';

          this.popupService.showError(msg);

          this.cdr.markForCheck();

        }

      });

  }



  formatFrShort(ymd: string): string {

    return this.aggregationService.formatFrShort(ymd);

  }



  private loadDonnees(forceRefresh: boolean): void {

    this.fetchSub?.unsubscribe();

    const seq = ++this.loadSeq;

    this.error = null;

    if (!this.emptyScopeHint?.includes('Aucun pays associé')) {

      this.emptyScopeHint = null;

    }

    this.dataFromRapportCache = false;



    const bounds = this.getPeriodBounds();



    this.ensureDefaultCountry();

    if (!this.selectedCountry) {
      this.emptyScopeHint = 'Sélectionnez un pays pour charger les données.';
      this.loading = false;
      this.monthlyRows = [];
      this.monthlyRowsAll = [];
      this.paginatedMonthlyRows = [];
      this.cdr.markForCheck();
      return;
    }

    if (!forceRefresh && this.selectedCountry) {

      const cached = this.reportCache.consumeIfMatching({

        dateDebut: bounds.startDate,

        dateFin: bounds.endDate,

        country: this.selectedCountry,

        env: this.selectedEnv

      });

      if (cached) {

        this.applyCacheSnapshot(cached);

        this.dataFromRapportCache = true;

        this.loading = false;

        this.rebuildDisplay({ resetPage: true });

        this.fetchValidations(bounds.startMonth, bounds.endMonth, seq);

        return;

      }

    }



    this.loading = true;

    this.monthlyRows = [];

    this.monthlyRowsAll = [];

    this.validesCloturesAll = [];

    this.nonValidesCloturesAll = [];

    const ecartStart = this.subtractCalendarDaysFromYmd(bounds.startDate, 1);



    const headers = new HttpHeaders({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0'
    });

    let params = new HttpParams()
      .set('startDate', bounds.startDate)
      .set('endDate', bounds.endDate)
      .set('fields', 'slim')
      .set('_t', String(Date.now()));

    params = params.set('country', this.selectedCountry);

    if (this.selectedEnv && this.selectedEnv !== 'ALL') {
      params = params.set('env', this.selectedEnv);
    }

    const ecartFilter: {
      startDate: string;
      endDate: string;
      pays: string;
      platform: string;
      env?: string;
    } = {
      startDate: ecartStart,
      endDate: bounds.endDate,
      pays: this.selectedCountry,
      platform: 'PARTENAIRE'
    };
    if (this.selectedEnv && this.selectedEnv !== 'ALL') {
      ecartFilter.env = this.selectedEnv;
    }

    this.fetchSub = forkJoin({
      report: this.http.get<any[]>('/api/result8rec', { headers, params }),
      ecarts: this.ecartBoSummaryService
        .getEcartBoSummaries(ecartFilter)
        .pipe(catchError(() => of([] as EcartBoSummary[]))),
      validations: this.controleInterneService
        .list({
          country: this.selectedCountry,
          env: this.selectedEnv === 'ALL' ? 'ALL' : this.selectedEnv,
          startMonth: bounds.startMonth,
          endMonth: bounds.endMonth
        })
        .pipe(catchError(() => of([] as BoPartenaireControleInterneRecord[])))
    }).subscribe({
      next: ({ report, ecarts, validations }) => {
        if (seq !== this.loadSeq) {
          return;
        }

        this.rawReport = this.mapReportRows(report);
        this.ecartAll = Array.isArray(ecarts) ? ecarts : [];
        this.applyValidations(validations);
        this.refreshCountries();

        if (!this.rawReport.length) {
          this.emptyScopeHint =
            'Aucune ligne rapport pour cette période. Vérifiez les pays associés à votre profil '
            + '(Profils → Pays) et les filtres année / mois / ENV.';
        }

        this.loadManualRows(bounds, seq);
      },

      error: () => {

        if (seq !== this.loadSeq) {

          return;

        }

        this.error = 'Impossible de charger les données.';

        this.loading = false;

        this.cdr.markForCheck();

      }

    });

  }



  private applyCacheSnapshot(cached: BoPartenaireReportCacheSnapshot): void {

    this.rawReport = cached.rawReport;

    this.ecartAll = cached.ecartAll;

    this.manualRows = cached.manualRows;

    this.refreshCountries();

  }



  private loadManualRows(
    bounds: { startDate: string; endDate: string; startMonth: string; endMonth: string },
    seq: number
  ): void {
    const envParam = this.selectedEnv === 'ALL' ? undefined : this.selectedEnv;
    const services = this.distinctServicesForPeriod(bounds.startDate, bounds.endDate);

    const manual$ =
      services.length > 0
        ? this.dashboardService.getReleveManualTrxRange(
            bounds.startDate,
            bounds.endDate,
            this.selectedCountry,
            services,
            envParam
          )
        : of([] as ReleveManualRangeRow[]);

    this.fetchSub = manual$.pipe(catchError(() => of([] as ReleveManualRangeRow[]))).subscribe({
      next: (manual) => {
        if (seq !== this.loadSeq) {
          return;
        }
        this.manualRows = Array.isArray(manual) ? manual : [];
        this.rebuildDisplay({ resetPage: true });
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        if (seq !== this.loadSeq) {
          return;
        }
        this.manualRows = [];
        this.rebuildDisplay({ resetPage: true });
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private fetchValidations(startMonth: string, endMonth: string, seq: number): void {

    if (!this.selectedCountry) {

      return;

    }

    this.loadingValidations = true;

    this.controleInterneService

      .list({

        country: this.selectedCountry,

        env: this.selectedEnv === 'ALL' ? 'ALL' : this.selectedEnv,

        startMonth,

        endMonth

      })

      .pipe(catchError(() => of([] as BoPartenaireControleInterneRecord[])))

      .subscribe({

        next: (validations) => {

          if (seq !== this.loadSeq) {

            return;

          }

          this.applyValidations(validations);

          this.rebuildDisplay({ resetPage: false });

          this.loadingValidations = false;

          this.cdr.markForCheck();

        },

        error: () => {

          if (seq !== this.loadSeq) {

            return;

          }

          this.loadingValidations = false;

          this.cdr.markForCheck();

        }

      });

  }



  private applyValidations(validations: BoPartenaireControleInterneRecord[] | null | undefined): void {

    this.validations.clear();

    for (const v of validations || []) {

      this.validations.set(this.validationMapKey(v), v);

    }

  }



  private rebuildDisplay(options?: { resetPage?: boolean }): void {

    if (!this.selectedCountry) {

      this.monthlyRows = [];

      this.monthlyRowsAll = [];

      this.validesCloturesAll = [];

      this.nonValidesCloturesAll = [];

      this.resetPanelPagination();

      this.paginatedMonthlyRows = [];

      this.totalPages = 0;

      this.currentPage = 1;

      return;

    }



    const bounds = this.getPeriodBounds();

    if (this.rawReport.length > 0) {
      this.emptyScopeHint = null;
    }

    const envNorm = this.selectedEnv === 'ALL' ? null : normalizeReconciliationReportEnv(this.selectedEnv);

    const monthFilter = this.selectedMonthYyyyMm || undefined;



    const aggregates = this.aggregationService.computeMonthlyRows({

      rawReport: this.rawReport,

      manualRows: this.manualRows,

      ecartAll: this.ecartAll,

      country: this.selectedCountry,

      envNorm,

      startDate: bounds.startDate,

      endDate: bounds.endDate,

      monthFilter

    });



    const mapAggregateRow = (row: BoPartenaireMonthlyAggregateRow): ControleInterneDisplayRow => {

      const v = this.validations.get(

        `${row.monthYyyyMm}|${this.selectedCountry}|${this.selectedEnv === 'ALL' ? 'ALL' : this.selectedEnv.toUpperCase()}|${row.service}`

      );

      const isValide = v?.statut === 'VALIDE';

      return {

        ...row,

        monthLabel: this.aggregationService.formatMonthLabel(row.monthYyyyMm),

        statutControleInterne: isValide ? 'Validé contrôle interne' : 'En cours de validation',

        controleInterneValidatedBy: v?.validatedBy,

        controleInterneValidatedAt: v?.validatedAt,

        isControleValide: isValide

      };

    };

    this.monthlyRowsAll = aggregates.map(mapAggregateRow);

    this.monthlyRows = this.monthlyRowsAll

      .filter((row) => !this.selectedService || this.strEqual(row.service, this.selectedService));



    const lines = this.aggregationService.buildRapportDateServiceLines({

      rawReport: this.rawReport,

      country: this.selectedCountry,

      envNorm,

      startDate: bounds.startDate,

      endDate: bounds.endDate

    });

    this.validesCloturesAll = this.filterByService(

      this.filterDateServiceLinesByMonth(lines.validesClotures)

    );

    this.nonValidesCloturesAll = this.filterByService(

      this.filterDateServiceLinesByMonth(lines.nonValidesClotures)

    );

    this.resetPanelPagination();

    this.refreshAvailableServices(bounds.startDate, bounds.endDate, envNorm);

    this.loadCommentForScope();

    this.updateMonthlyPagination(options?.resetPage ?? false);

    this.cdr.markForCheck();

  }

  private getCommentMonthKey(): string {
    if (this.selectedMonth) {
      return `${this.selectedYear}-${this.selectedMonth}`;
    }
    return `${this.selectedYear}-ALL`;
  }

  private loadCommentForScope(): void {
    if (!this.selectedCountry) {
      this.commentaire = '';
      return;
    }
    const monthYyyyMm = this.getCommentMonthKey();
    this.controleInterneService
      .getComment({
        country: this.selectedCountry,
        env: this.selectedEnv === 'ALL' ? 'ALL' : this.selectedEnv,
        monthYyyyMm
      })
      .pipe(catchError(() => of(null)))
      .subscribe((record) => {
        this.commentaire = record?.commentaire || '';
        this.commentUpdatedBy = record?.updatedBy || '';
        this.commentUpdatedAt = record?.updatedAt || '';
        this.commentLastEmailedAt = record?.lastEmailedAt || '';
        this.commentLastEmailedBy = record?.lastEmailedBy || '';
        this.cdr.markForCheck();
      });
  }

  enregistrerCommentaire(): void {
    if (!this.canModifyCommentaireControleInterne || !this.selectedCountry || this.savingComment) {
      return;
    }
    this.savingComment = true;
    this.controleInterneService
      .saveComment({
        monthYyyyMm: this.getCommentMonthKey(),
        country: this.selectedCountry,
        env: this.selectedEnv === 'ALL' ? 'ALL' : this.selectedEnv,
        commentaire: this.commentaire
      })
      .subscribe({
        next: (saved) => {
          this.commentUpdatedBy = saved.updatedBy || '';
          this.commentUpdatedAt = saved.updatedAt || '';
          this.savingComment = false;
          this.popupService.showSuccess('Commentaire enregistré.');
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.savingComment = false;
          this.popupService.showError(err?.error?.message || 'Impossible d\'enregistrer le commentaire.');
          this.cdr.markForCheck();
        }
      });
  }

  envoyerCommentaireParMail(): void {
    if (!this.canSendEmailControleInterne || !this.selectedCountry || this.sendingCommentEmail) {
      return;
    }
    const recipients = this.destinatairesEmails
      .split(/[,;\s]+/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0 && e.includes('@'));
    if (!recipients.length) {
      this.popupService.showWarning('Indiquez au moins une adresse e-mail destinataire.');
      return;
    }
    this.sendingCommentEmail = true;
    this.controleInterneService
      .sendCommentEmail({
        monthYyyyMm: this.getCommentMonthKey(),
        country: this.selectedCountry,
        env: this.selectedEnv === 'ALL' ? 'ALL' : this.selectedEnv,
        commentaire: this.commentaire,
        recipients,
        summaryText: this.buildEmailSummaryText()
      })
      .subscribe({
        next: (res) => {
          this.commentLastEmailedAt = res.comment?.lastEmailedAt || '';
          this.commentLastEmailedBy = res.comment?.lastEmailedBy || '';
          this.sendingCommentEmail = false;
          this.popupService.showSuccess(res.message || 'E-mail envoyé avec succès.');
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.sendingCommentEmail = false;
          this.popupService.showError(err?.error?.message || 'Erreur lors de l\'envoi de l\'e-mail.');
          this.cdr.markForCheck();
        }
      });
  }

  private buildEmailSummaryText(): string {
    const m = this.monthlySectionTotals;
    const nv = this.nonValidesSectionTotals;
    const v = this.validesSectionTotals;
    const lines = [
      `Vue agrégée — ${m.combinaisons} ligne(s)`,
      `BO : ${this.formatCardNombre(m.boNombre)} transactions | volume ${this.formatCardVolume(m.boVolume)}`,
      `Partenaire : ${this.formatCardNombre(m.partenaireNombre)} transactions | volume ${this.formatCardVolume(m.partenaireVolume)}`,
      `Écart : ${this.formatCardNombre(m.ecartNombre)} | volume ${this.formatCardVolume(m.ecartVolume)}`,
      `Non validés/clôturés : ${nv.combinaisons} combinaison(s) | ${this.formatCardNombre(nv.rapportNombre)} | vol. ${this.formatCardVolume(nv.rapportVolume)}`,
      `Validés/clôturés : ${v.combinaisons} combinaison(s) | ${this.formatCardNombre(v.rapportNombre)} | vol. ${this.formatCardVolume(v.rapportVolume)}`
    ];
    for (const block of this.ticketsByMonth) {
      lines.push(
        `Tickets ${block.monthLabel} : ${block.ticketIds.length ? block.ticketIds.join(', ') : '—'}`
      );
    }
    if (this.selectedService) {
      lines.unshift(`Filtre service : ${this.selectedService}`);
    }
    return lines.join('\n');
  }

  private refreshAvailableServices(

    startDate: string,

    endDate: string,

    envNorm: string | null

  ): void {

    const set = new Set<string>();

    for (const row of this.rawReport) {

      if (!this.countryMatchesSelected(row.country)) {

        continue;

      }

      if (envNorm != null && normalizeReconciliationReportEnv(row.env) !== envNorm) {

        continue;

      }

      const ymd = this.formatDateForSearch(row.date);

      if (ymd < startDate || ymd > endDate) {

        continue;

      }

      const svc = (row.service || '').trim();

      if (svc) {

        set.add(svc);

      }

    }

    this.availableServices = Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'));

    if (

      this.selectedService &&

      !this.availableServices.some((s) => this.strEqual(s, this.selectedService))

    ) {

      this.selectedService = '';

    }

  }

  private filterByService(lines: RapportDateServiceLine[]): RapportDateServiceLine[] {

    if (!this.selectedService) {

      return lines;

    }

    return lines.filter((line) => this.strEqual(line.service, this.selectedService));

  }

  private strEqual(a?: string | null, b?: string | null): boolean {

    return (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase();

  }



  private get selectedMonthYyyyMm(): string {

    if (!this.selectedMonth) {

      return '';

    }

    return `${this.selectedYear}-${this.selectedMonth}`;

  }



  private getPeriodBounds(): {

    startDate: string;

    endDate: string;

    startMonth: string;

    endMonth: string;

  } {

    const year = this.selectedYear;



    if (this.selectedMonth) {

      const monthYyyyMm = `${year}-${this.selectedMonth}`;

      const lastDay = new Date(year, Number(this.selectedMonth), 0).getDate();

      return {

        startDate: `${monthYyyyMm}-01`,

        endDate: `${monthYyyyMm}-${String(lastDay).padStart(2, '0')}`,

        startMonth: monthYyyyMm,

        endMonth: monthYyyyMm

      };

    }



    if (this.rapportDateDebut && this.rapportDateFin) {

      const startMonth = this.rapportDateDebut.substring(0, 7);

      const endMonth = this.rapportDateFin.substring(0, 7);

      return {

        startDate: this.rapportDateDebut,

        endDate: this.rapportDateFin,

        startMonth,

        endMonth

      };

    }



    return {

      startDate: `${year}-01-01`,

      endDate: `${year}-12-31`,

      startMonth: `${year}-01`,

      endMonth: `${year}-12`

    };

  }



  private filterDateServiceLinesByMonth(lines: RapportDateServiceLine[]): RapportDateServiceLine[] {

    const monthFilter = this.selectedMonthYyyyMm;

    if (!monthFilter) {

      return lines;

    }

    return lines.filter((line) => line.date.startsWith(monthFilter));

  }



  private validationMapKey(v: BoPartenaireControleInterneRecord): string {

    return `${v.monthYyyyMm}|${v.country}|${(v.env || 'ALL').toUpperCase()}|${v.service}`;

  }



  private distinctServicesForPeriod(startDate: string, endDate: string): string[] {

    const set = new Set<string>();

    for (const row of this.rawReport) {

      if (!this.countryMatchesSelected(row.country)) {

        continue;

      }

      const ymd = this.formatDateForSearch(row.date);

      if (ymd < startDate || ymd > endDate) {

        continue;

      }

      const svc = (row.service || '').trim();

      if (svc) {

        set.add(svc);

      }

    }

    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'));

  }



  private refreshCountries(): void {

    const set = new Set<string>(this.countries);

    for (const row of this.rawReport) {

      const c = (row.country || '').trim();

      if (c) {

        set.add(c);

      }

    }

    this.countries = Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'));

    this.syncSelectedCountryWithList();

    if (!this.selectedCountry && this.countries.length) {

      this.selectedCountry = this.countries[0];

    }

  }



  private mapReportRows(report: any[]): BoPartenaireResult8Row[] {

    if (!Array.isArray(report)) {

      return [];

    }

    return report.map((r) => {

      const anyR = r as Record<string, unknown>;

      const traitementRaw = r.traitement ?? anyR['traitement'];

      return {

        id: r.id,

        date: r.date,

        service: r.service,

        country: r.country,

        env: r.env,

        totalTransactions: Number(r.totalTransactions || r.recordCount || 0) || 0,

        totalVolume: Number(r.totalVolume || 0) || 0,

        traitement:

          traitementRaw != null && String(traitementRaw).trim()

            ? String(traitementRaw).trim()

            : '',

        glpiId: this.aggregationService.normalizeGlpiTicketId(
          String(r.glpiId ?? anyR['glpiId'] ?? anyR['glpi_id'] ?? '')
        ) || undefined

      };

    });

  }



  private subtractCalendarDaysFromYmd(ymd: string, delta: number): string {

    const p = ymd.split('-').map(Number);

    const d = new Date(p[0], p[1] - 1, p[2]);

    d.setDate(d.getDate() - delta);

    const y = d.getFullYear();

    const m = String(d.getMonth() + 1).padStart(2, '0');

    const day = String(d.getDate()).padStart(2, '0');

    return `${y}-${m}-${day}`;

  }



  private formatDateForSearch(dateStr: string): string {

    if (!dateStr) {

      return '';

    }

    if (dateStr.includes('T')) {

      return dateStr.split('T')[0];

    }

    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {

      return dateStr.split(' ')[0];

    }

    return dateStr;

  }

}


