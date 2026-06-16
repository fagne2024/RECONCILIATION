import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';

import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

import { Subscription, forkJoin, of } from 'rxjs';

import { catchError } from 'rxjs/operators';

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
import { AppStateService } from '../../services/app-state.service';



export interface ControleInterneDisplayRow extends BoPartenaireMonthlyAggregateRow {

  statutControleInterne: string;

  controleInterneValidatedBy?: string;

  controleInterneValidatedAt?: string;

  isControleValide: boolean;

  monthLabel: string;

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

  error: string | null = null;

  dataFromRapportCache = false;



  selectedCountry = '';

  selectedYear = new Date().getFullYear();

  /** Vide = tous les mois ; sinon `01`…`12`. */

  selectedMonth = '';

  selectedEnv = 'HT';

  /** Vide = tous les services. */
  selectedService = '';

  /** Période héritée du rapport BO vs Partenaire (query params). */

  private rapportDateDebut = '';

  private rapportDateFin = '';



  countries: string[] = [];

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

  validesClotures: RapportDateServiceLine[] = [];

  nonValidesClotures: RapportDateServiceLine[] = [];



  /** trackBy stable (évite perte de contexte `this` dans ngFor). */

  readonly trackByRow = (_i: number, row: ControleInterneDisplayRow): string =>

    `${row.monthYyyyMm}|${row.service}`;



  readonly trackByDateService = (_i: number, line: RapportDateServiceLine): string =>

    `${line.date}|${line.service}`;



  private subs = new Subscription();

  private fetchSub?: Subscription;

  private loadSeq = 0;

  private lastFetchKey = '';

  private rawReport: BoPartenaireResult8Row[] = [];

  private ecartAll: EcartBoSummary[] = [];

  private manualRows: ReleveManualRangeRow[] = [];

  private validations = new Map<string, BoPartenaireControleInterneRecord>();

  private readonly numberFormatter = new Intl.NumberFormat('fr-FR');



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

      this.route.queryParams.subscribe((qp) => {

        if (qp['country']) {

          this.selectedCountry = qp['country'];

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

        if (qp['month']) {

          const m = String(qp['month']).padStart(2, '0').slice(-2);

          this.selectedMonth = this.monthOptions.some((o) => o.value === m) ? m : '';

        } else {

          this.selectedMonth = '';

        }

        this.selectedService = qp['service'] ? String(qp['service']) : '';

        this.rapportDateDebut = qp['dateDebut'] || '';

        this.rapportDateFin = qp['dateFin'] || '';

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

          this.rebuildDisplay();

        }

      })

    );

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

    this.rebuildDisplay();

  }

  get canValidateControleInterne(): boolean {

    return this.appState.canValidateControleInterneBoPartenaire();

  }

  get canRevokeControleInterne(): boolean {

    return this.appState.canRevokeControleInterneBoPartenaire();

  }



  private syncQueryParams(resetRapportDates = true): void {

    this.router.navigate([], {

      relativeTo: this.route,

      queryParams: {

        country: this.selectedCountry || null,

        env: this.selectedEnv || null,

        year: this.selectedYear,

        month: this.selectedMonth || null,

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

    return this.canValidateControleInterne && !row.isControleValide && !this.loading;

  }

  canRevokeRow(row: ControleInterneDisplayRow): boolean {

    return this.canRevokeControleInterne && row.isControleValide && !this.loading;

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

          this.rebuildDisplay();

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

          this.rebuildDisplay();

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

    this.dataFromRapportCache = false;



    const bounds = this.getPeriodBounds();



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

        this.rebuildDisplay();

        this.fetchValidations(bounds.startMonth, bounds.endMonth, seq);

        return;

      }

    }



    this.loading = true;

    this.monthlyRows = [];

    this.validesClotures = [];

    this.nonValidesClotures = [];

    const ecartStart = this.subtractCalendarDaysFromYmd(bounds.startDate, 1);



    const headers = new HttpHeaders({

      'Cache-Control': 'no-cache, no-store, must-revalidate',

      Pragma: 'no-cache',

      Expires: '0',

      'X-Permission-Module': 'Résultats'

    });

    const params = new HttpParams()

      .set('startDate', bounds.startDate)

      .set('endDate', bounds.endDate)

      .set('_t', String(Date.now()));



    this.fetchSub = forkJoin({

      report: this.http.get<any[]>('/api/result8rec', { headers, params }),

      ecarts: this.ecartBoSummaryService

        .getEcartBoSummaries({ startDate: ecartStart, endDate: bounds.endDate })

        .pipe(catchError(() => of([] as EcartBoSummary[])))

    }).subscribe({

      next: ({ report, ecarts }) => {

        if (seq !== this.loadSeq) {

          return;

        }

        this.rawReport = this.mapReportRows(report);

        this.ecartAll = Array.isArray(ecarts) ? ecarts : [];

        this.refreshCountries();



        if (!this.selectedCountry && this.countries.length) {

          this.selectedCountry = this.countries[0];

        }



        if (!this.selectedCountry) {

          this.loading = false;

          this.cdr.markForCheck();

          return;

        }



        this.loadManualAndValidations(bounds, seq);

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



  private loadManualAndValidations(

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



    this.fetchSub = forkJoin({

      manual: manual$.pipe(catchError(() => of([] as ReleveManualRangeRow[]))),

      validations: this.controleInterneService

        .list({

          country: this.selectedCountry,

          env: this.selectedEnv === 'ALL' ? 'ALL' : this.selectedEnv,

          startMonth: bounds.startMonth,

          endMonth: bounds.endMonth

        })

        .pipe(catchError(() => of([] as BoPartenaireControleInterneRecord[])))

    }).subscribe({

      next: ({ manual, validations }) => {

        if (seq !== this.loadSeq) {

          return;

        }

        this.manualRows = Array.isArray(manual) ? manual : [];

        this.applyValidations(validations);

        this.rebuildDisplay();

        this.loading = false;

        this.cdr.markForCheck();

      },

      error: () => {

        if (seq !== this.loadSeq) {

          return;

        }

        this.manualRows = [];

        this.rebuildDisplay();

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

          this.rebuildDisplay();

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



  private rebuildDisplay(): void {

    if (!this.selectedCountry) {

      this.monthlyRows = [];

      this.validesClotures = [];

      this.nonValidesClotures = [];

      return;

    }



    const bounds = this.getPeriodBounds();

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



    this.monthlyRows = aggregates

      .filter((row) => !this.selectedService || this.strEqual(row.service, this.selectedService))

      .map((row) => {

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

    });



    const lines = this.aggregationService.buildRapportDateServiceLines({

      rawReport: this.rawReport,

      country: this.selectedCountry,

      envNorm,

      startDate: bounds.startDate,

      endDate: bounds.endDate

    });

    this.validesClotures = this.filterByService(

      this.filterDateServiceLinesByMonth(lines.validesClotures)

    );

    this.nonValidesClotures = this.filterByService(

      this.filterDateServiceLinesByMonth(lines.nonValidesClotures)

    );

    this.refreshAvailableServices(bounds.startDate, bounds.endDate, envNorm);

  }

  private refreshAvailableServices(

    startDate: string,

    endDate: string,

    envNorm: string | null

  ): void {

    const set = new Set<string>();

    for (const row of this.rawReport) {

      if ((row.country || '').trim() !== this.selectedCountry.trim()) {

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

      if ((row.country || '').trim() !== this.selectedCountry.trim()) {

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

    const set = new Set<string>();

    for (const row of this.rawReport) {

      const c = (row.country || '').trim();

      if (c) {

        set.add(c);

      }

    }

    this.countries = Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'));

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

            : ''

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


