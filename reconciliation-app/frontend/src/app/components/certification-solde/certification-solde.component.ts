import { Component, OnDestroy, OnInit, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { AppStateService } from '../../services/app-state.service';
import {
  CertificationSoldeComputed,
  CertificationSoldeService,
  EcartAggregateRow
} from '../../services/certification-solde.service';
import { ReconciliationResponse } from '../../models/reconciliation-response.model';
import { ReconciliationService } from '../../services/reconciliation.service';
import { PopupService } from '../../services/popup.service';
import { FraisTransactionService } from '../../services/frais-transaction.service';
import { FraisTransaction } from '../../models/frais-transaction.model';

@Component({
  selector: 'app-certification-solde',
  templateUrl: './certification-solde.component.html',
  styleUrls: ['./certification-solde.component.scss']
})
export class CertificationSoldeComponent implements OnInit, OnDestroy {
  @ViewChild('pdfExportContent') pdfExportContentRef?: ElementRef<HTMLDivElement>;

  response: ReconciliationResponse | null = null;
  computed: CertificationSoldeComputed | null = null;

  soldeOuverture: number | null = null;
  soldeCloture: number | null = null;
  variation: number | null = null;
  ecartCertification: number | null = null;

  readonly Math = Math;

  numeroCompte = '';
  dateCertificationDe = '';
  dateCertificationAu = '';
  commentaire = '';
  reconciliationTitle = 'Réconciliation TRXBO / OPPART';
  isSaving = false;
  isLoadingSoldes = false;
  isExportingExcel = false;
  isExportingPdf = false;
  isLoadingDetail = false;
  pdfLogoDataUrl: string | null = null;

  private fraisConfigs: FraisTransaction[] = [];
  private subscription = new Subscription();
  private detailSessionLoaded: string | null = null;
  private pdfLogoPromise: Promise<string | null> | null = null;

  constructor(
    private router: Router,
    private appState: AppStateService,
    private reconciliationService: ReconciliationService,
    private certificationService: CertificationSoldeService,
    private fraisTransactionService: FraisTransactionService,
    private popupService: PopupService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const today = this.formatDateInput(new Date());
    this.dateCertificationDe = today;
    this.dateCertificationAu = today;
    this.loadFraisConfigs();
    this.subscription.add(
      this.appState.reconciliationResult$.subscribe(result => {
        this.response = result;
        this.refreshComputed();
        void this.loadPaginatedDetailIfNeeded();
      })
    );
  }

  /**
   * Quand les résultats sont paginés côté serveur, les tableaux matches/boOnly/partnerOnly/mismatches
   * sont vides (seuls les totaux sont fournis). On recharge le détail complet depuis la session pour
   * alimenter les agrégats des écarts (nombre + volume + frais) et la synthèse.
   */
  private async loadPaginatedDetailIfNeeded(): Promise<void> {
    if (!this.response) {
      return;
    }

    const needsDetail =
      this.response.resultsPaginated === true ||
      ((this.response.totalMatches ?? 0) > 0 && !(this.response.matches?.length)) ||
      ((this.response.totalBoOnly ?? 0) > 0 && !(this.response.boOnly?.length)) ||
      ((this.response.totalPartnerOnly ?? 0) > 0 && !(this.response.partnerOnly?.length));

    if (!needsDetail) {
      return;
    }

    const jobId = this.reconciliationService.getCurrentJobId();
    if (!jobId) {
      return;
    }

    if (this.detailSessionLoaded === jobId) {
      return;
    }

    this.isLoadingDetail = true;
    this.cdr.markForCheck();
    try {
      const detail = await this.reconciliationService.loadAllDetailResults(jobId, 5000);
      if (!this.response) {
        return;
      }
      this.response = {
        ...this.response,
        matches: detail.matches,
        boOnly: detail.boOnly,
        partnerOnly: detail.partnerOnly,
        mismatches: detail.mismatches,
        resultsPaginated: false
      };
      this.detailSessionLoaded = jobId;
      this.refreshComputed();
    } catch (e) {
      console.error('Erreur lors du chargement du détail des agrégats:', e);
    } finally {
      this.isLoadingDetail = false;
      this.cdr.markForCheck();
    }
  }

  private loadFraisConfigs(): void {
    this.subscription.add(
      this.fraisTransactionService.getAllFraisTransactionsActifs('TRX SF').subscribe({
        next: configs => {
          this.fraisConfigs = configs || [];
          this.refreshComputed();
        },
        error: () => {
          this.fraisConfigs = [];
          this.refreshComputed();
        }
      })
    );
  }

  hasRegularisationDetails(row: EcartAggregateRow): boolean {
    return this.certificationService.hasRegularisationDetails(row);
  }

  get regularisationAggregates(): EcartAggregateRow[] {
    if (!this.computed) {
      return [];
    }
    return this.computed.aggregates.filter(a => this.hasRegularisationDetails(a));
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  get hasResults(): boolean {
    return !!this.response;
  }

  get canExport(): boolean {
    return this.hasResults && !!this.computed;
  }

  async exportToExcel(): Promise<void> {
    if (!this.canExport || !this.computed) {
      await this.popupService.showWarning('Aucune donnée de certification à exporter.', 'Export impossible');
      return;
    }

    this.isExportingExcel = true;
    this.cdr.markForCheck();
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'ReconciliApp';
      workbook.created = new Date();

      const wsCert = workbook.addWorksheet('Certification');
      this.styleExcelHeaderRow(wsCert.addRow([this.reconciliationTitle]));
      wsCert.mergeCells('A1:B1');
      wsCert.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF282E5E' } };

      wsCert.addRow([]);
      this.addExcelKeyValueRows(wsCert, [
        ['Numéro de compte', this.numeroCompte || '—'],
        ['Date export', this.formatExportTimestamp()],
        ['Solde d\'ouverture', this.soldeOuverture],
        ['Solde de clôture', this.soldeCloture],
        ['Suggestion OPPART ouverture', this.computed.soldeOuvertureOppart],
        ['Suggestion OPPART clôture', this.computed.soldeClotureOppart],
        ['Variation', this.variation],
        ['Mouvement net OPPART', this.computed.mouvementNetOppart],
        ['Frais attendu', this.computed.fraisAttendu ?? ''],
        ['Total Débit', this.computed.totalDebit],
        ['Total Crédit', this.computed.totalCredit],
        ['Écart de certification', this.ecartCertification]
      ]);

      wsCert.getColumn(1).width = 32;
      wsCert.getColumn(2).width = 22;

      if (this.regularisationAggregates.length) {
        const wsDetail = workbook.addWorksheet('Détail régularisation');
        const detailHeader = wsDetail.addRow(['Type', 'Nombre', 'Montant', 'Frais', 'À régulariser']);
        this.styleExcelHeaderRow(detailHeader);
        for (const row of this.regularisationAggregates) {
          const r = wsDetail.addRow([
            row.label,
            row.count,
            row.volume,
            row.frais || '',
            row.montantARegulariser || ''
          ]);
          r.getCell(3).numFmt = '#,##0';
          r.getCell(4).numFmt = '#,##0';
          r.getCell(5).numFmt = '#,##0';
        }
        wsDetail.columns = [
          { width: 36 }, { width: 12 }, { width: 16 }, { width: 14 }, { width: 16 }
        ];
      }

      const wsSynth = workbook.addWorksheet('Synthèse réconciliation');
      this.addExcelKeyValueRows(wsSynth, [
        ['Lignes BO (TRXBO)', this.computed.totals.totalBoRecords],
        ['Lignes Partenaire (OPPART)', this.computed.totals.totalPartnerRecords],
        ['Correspondances', this.computed.totals.matches],
        ['Écarts BO', this.computed.totals.boOnly],
        ['Écarts Partenaire', this.computed.totals.partnerOnly],
        ['Correspondances multiples', this.computed.totals.mismatches],
        ['Volume écarts BO', this.computed.volumeEcartBo],
        ['Volume écarts Partenaire', this.computed.volumeEcartPartner],
        ['Volume correspondances', this.computed.volumeMatches]
      ]);

      if (this.computed.oppartOperationBreakdown.hasData) {
        const oppart = this.computed.oppartOperationBreakdown;
        wsSynth.addRow([]);
        wsSynth.addRow(["Types d'opérations"]);
        wsSynth.getRow(wsSynth.rowCount).getCell(1).font = { bold: true, color: { argb: 'FF282E5E' }, size: 11 };
        const rVolume = wsSynth.addRow(['Volume (IMPACT_COMPTE_GENERAL)', oppart.volume]);
        rVolume.getCell(2).numFmt = '#,##0';
        const rFrais = wsSynth.addRow(['Frais (FRAIS_TRANSACTION)', oppart.frais]);
        rFrais.getCell(2).numFmt = '#,##0';
        if (this.computed.fraisAttendu != null) {
          const rEcartFrais = wsSynth.addRow(['Écart frais', Math.abs(this.computed.fraisAttendu) - Math.abs(oppart.frais)]);
          rEcartFrais.getCell(2).numFmt = '#,##0';
          rEcartFrais.getCell(1).font = { bold: true, color: { argb: 'FFC0392B' } };
          rEcartFrais.getCell(2).font = { bold: true, color: { argb: 'FFC0392B' } };
        }
        if (oppart.otherTypes.length) {
          wsSynth.addRow(['Autres types', '']);
          wsSynth.getRow(wsSynth.rowCount).getCell(1).font = { bold: true, italic: true, color: { argb: 'FF444444' }, size: 10 };
        }
        for (const t of oppart.otherTypes) {
          const r = wsSynth.addRow([t.type, t.volume]);
          r.getCell(2).numFmt = '#,##0';
        }
      }

      if (this.computed.trxboServiceBreakdown.hasData) {
        const trxbo = this.computed.trxboServiceBreakdown;
        wsSynth.addRow([]);
        wsSynth.addRow(["TRXBO par service"]);
        wsSynth.getRow(wsSynth.rowCount).getCell(1).font = { bold: true, color: { argb: 'FF282E5E' }, size: 11 };
        for (const s of trxbo.rows) {
          const r = wsSynth.addRow([`${s.service} (${s.count})`, s.volume]);
          r.getCell(2).numFmt = '#,##0';
        }
        if (trxbo.rows.length > 1) {
          const r = wsSynth.addRow([`Total (${trxbo.totalCount})`, trxbo.totalVolume]);
          r.getCell(2).numFmt = '#,##0';
          r.getCell(1).font = { bold: true };
        }
      }

      wsSynth.getColumn(1).width = 34;
      wsSynth.getColumn(2).width = 18;

      const buffer = await workbook.xlsx.writeBuffer();
      const fileName = `${this.buildExportFileBase()}.xlsx`;
      saveAs(new Blob([buffer]), fileName);
      await this.popupService.showSuccess(`Le fichier ${fileName} a été téléchargé.`, 'Export Excel');
    } catch (e: any) {
      console.error('Erreur export Excel certification:', e);
      await this.popupService.showError(e?.message || 'Erreur lors de l\'export Excel.', 'Erreur d\'export');
    } finally {
      this.isExportingExcel = false;
      this.cdr.markForCheck();
    }
  }

  async exportToPdf(): Promise<void> {
    if (!this.canExport || !this.computed) {
      await this.popupService.showWarning('Aucune donnée de certification à exporter.', 'Export impossible');
      return;
    }

    const element = this.pdfExportContentRef?.nativeElement;
    if (!element) {
      await this.popupService.showError('Zone d\'export PDF introuvable.', 'Erreur d\'export');
      return;
    }

    this.isExportingPdf = true;
    this.cdr.markForCheck();
    await Promise.all([
      new Promise<void>(resolve => setTimeout(resolve, 150)),
      this.ensurePdfLogo()
    ]);

    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const margin = 6;
      const pageW = pdfW - 2 * margin;
      const contentPerPage = pdfH - 2 * margin;
      const gapBetweenBlocks = 2;

      const blocks: HTMLElement[] = [];
      const headerEl = element.querySelector<HTMLElement>('.pdf-export-header');
      const bannerEl = element.querySelector<HTMLElement>('.pdf-solde-banner');
      if (headerEl) {
        blocks.push(headerEl);
      }
      if (bannerEl) {
        blocks.push(bannerEl);
      }
      blocks.push(...Array.from(element.querySelectorAll<HTMLElement>('.pdf-export-section')));

      const rendered: { canvas: HTMLCanvasElement; heightPx: number; ratio: number }[] = [];
      for (const block of blocks) {
        const blockCanvas = await html2canvas(block, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });
        rendered.push({
          canvas: blockCanvas,
          heightPx: blockCanvas.height,
          ratio: pageW / blockCanvas.width
        });
      }

      const totalHeightMm = rendered.reduce((sum, b) => sum + b.heightPx * b.ratio, 0)
        + gapBetweenBlocks * (rendered.length - 1);
      const fitScale = Math.min(1, contentPerPage / totalHeightMm);

      let y = margin;
      for (const block of rendered) {
        const blockHeightMm = block.heightPx * block.ratio * fitScale;
        const blockWidthMm = pageW * fitScale;
        const x = margin + (pageW - blockWidthMm) / 2;
        pdf.addImage(block.canvas.toDataURL('image/png'), 'PNG', x, y, blockWidthMm, blockHeightMm);
        y += blockHeightMm + gapBetweenBlocks * fitScale;
      }

      const fileName = `${this.buildExportFileBase()}.pdf`;
      pdf.save(fileName);
      await this.popupService.showSuccess(`Le fichier ${fileName} a été téléchargé.`, 'Export PDF');
    } catch (e: any) {
      console.error('Erreur export PDF certification:', e);
      await this.popupService.showError(e?.message || 'Erreur lors de l\'export PDF.', 'Erreur d\'export');
    } finally {
      this.isExportingPdf = false;
      this.cdr.markForCheck();
    }
  }

  private async ensurePdfLogo(): Promise<string | null> {
    if (this.pdfLogoDataUrl) {
      return this.pdfLogoDataUrl;
    }
    if (!this.pdfLogoPromise) {
      this.pdfLogoPromise = this.loadPdfLogoAsDataUrl().then(dataUrl => {
        this.pdfLogoDataUrl = dataUrl;
        return dataUrl;
      });
    }
    return this.pdfLogoPromise;
  }

  private async loadPdfLogoAsDataUrl(): Promise<string | null> {
    try {
      const response = await fetch('assets/point-touch-logo.png');
      if (!response.ok) {
        return null;
      }
      const blob = await response.blob();
      return await new Promise<string | null>(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  private buildExportFileBase(): string {
    const compte = (this.numeroCompte || 'compte').replace(/[^\w-]+/g, '-');
    const dateDe = (this.dateCertificationDe || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
    const dateAu = (this.dateCertificationAu || dateDe).replace(/-/g, '');
    const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    return `Certification-Solde-${compte}-${dateDe}-${dateAu}-${ts}`;
  }

  private styleExcelHeaderRow(row: ExcelJS.Row): void {
    row.eachCell(cell => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF282E5E' }
      };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
  }

  private addExcelKeyValueRows(
    worksheet: ExcelJS.Worksheet,
    rows: Array<[string, string | number | null | undefined]>
  ): void {
    for (const [label, value] of rows) {
      const row = worksheet.addRow([label, value ?? '—']);
      row.getCell(1).font = { bold: true, color: { argb: 'FF555555' } };
      if (typeof value === 'number') {
        row.getCell(2).numFmt = '#,##0';
      }
    }
  }

  refreshComputed(): void {
    if (!this.response) {
      this.computed = null;
      this.variation = null;
      this.ecartCertification = null;
      return;
    }

    const partnerData = this.appState.getPartnerData() ?? [];
    const boData = this.appState.getBoData() ?? [];

    this.computed = this.certificationService.compute({
      response: this.response,
      partnerData,
      boData,
      fraisConfigs: this.fraisConfigs,
      dateDe: this.dateCertificationDe,
      dateAu: this.dateCertificationAu
    });

    if (this.soldeOuverture == null && this.computed.soldeOuvertureOppart != null) {
      this.soldeOuverture = this.computed.soldeOuvertureOppart;
    }
    if (this.soldeCloture == null && this.computed.soldeClotureOppart != null) {
      this.soldeCloture = this.computed.soldeClotureOppart;
    }

    this.recalculateDerived();
  }

  onSoldeChange(): void {
    this.recalculateDerived();
  }

  onDateRangeChange(): void {
    this.normalizeDateRange();
    this.refreshComputed();
  }

  private normalizeDateRange(): void {
    if (this.dateCertificationDe && this.dateCertificationAu && this.dateCertificationDe > this.dateCertificationAu) {
      this.dateCertificationAu = this.dateCertificationDe;
    }
  }

  private isDateRangeValid(): boolean {
    return !!(this.dateCertificationDe && this.dateCertificationAu && this.dateCertificationDe <= this.dateCertificationAu);
  }

  recalculateDerived(): void {
    this.variation = this.certificationService.computeVariation(this.soldeOuverture, this.soldeCloture);
    if (!this.computed) {
      this.ecartCertification = null;
      return;
    }
    this.ecartCertification = this.certificationService.computeEcartCertification(
      this.variation,
      this.computed.mouvementNetOppart
    );
  }

  async loadSavedSoldes(): Promise<void> {
    if (!this.numeroCompte?.trim() || !this.isDateRangeValid()) {
      await this.popupService.showWarning('Renseignez le numéro de compte et la période (du / au).', 'Champs requis');
      return;
    }
    this.isLoadingSoldes = true;
    try {
      const [ouverture, cloture] = await Promise.all([
        this.certificationService.loadSoldeOuverture(this.numeroCompte.trim(), this.dateCertificationDe),
        this.certificationService.loadSoldeCloture(this.numeroCompte.trim(), this.dateCertificationAu)
      ]);
      if (ouverture != null) this.soldeOuverture = ouverture;
      if (cloture != null) this.soldeCloture = cloture;
      this.recalculateDerived();
      await this.popupService.showSuccess('Soldes chargés depuis la base.', 'Chargement');
    } finally {
      this.isLoadingSoldes = false;
    }
  }

  applyOppartSuggestedSoldes(): void {
    if (!this.computed) return;
    if (this.computed.soldeOuvertureOppart != null) {
      this.soldeOuverture = this.computed.soldeOuvertureOppart;
    }
    if (this.computed.soldeClotureOppart != null) {
      this.soldeCloture = this.computed.soldeClotureOppart;
    }
    this.recalculateDerived();
  }

  async saveCertification(): Promise<void> {
    if (!this.numeroCompte?.trim() || !this.isDateRangeValid()) {
      await this.popupService.showWarning('Renseignez le numéro de compte et la période (du / au) pour sauvegarder.', 'Champs requis');
      return;
    }
    if (this.soldeOuverture == null || this.soldeCloture == null) {
      await this.popupService.showWarning('Renseignez le solde d\'ouverture et de clôture.', 'Soldes requis');
      return;
    }

    this.isSaving = true;
    try {
      await Promise.all([
        firstValueFrom(this.certificationService.saveSoldeOuverture(
          this.numeroCompte.trim(),
          this.dateCertificationDe,
          this.soldeOuverture
        )),
        firstValueFrom(this.certificationService.saveSoldeCloture(
          this.numeroCompte.trim(),
          this.dateCertificationAu,
          this.soldeCloture
        ))
      ]);
      await this.popupService.showSuccess('Certification de solde enregistrée.', 'Sauvegarde');
    } catch (e: any) {
      await this.popupService.showError(e?.message || 'Erreur lors de la sauvegarde.', 'Erreur');
    } finally {
      this.isSaving = false;
    }
  }

  startNewCertification(): void {
    this.router.navigate(['/certification-solde/upload']);
  }

  goToEcartBo(): void {
    this.router.navigate(['/ecart-bo']);
  }

  goToEcartPartner(): void {
    this.router.navigate(['/ecart-partner']);
  }

  goToMatches(): void {
    this.router.navigate(['/matches']);
  }

  formatNumber(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) return '—';
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value);
  }

  formatExportTimestamp(): string {
    return new Date().toLocaleString('fr-FR');
  }

  formatDateFr(date: string): string {
    if (!date) return '—';
    const [y, m, d] = date.split('-');
    if (!y || !m || !d) return date;
    return `${d}/${m}/${y}`;
  }

  formatDateTimeDe(): string {
    return this.dateCertificationDe ? `${this.formatDateFr(this.dateCertificationDe)} 00:00:00` : '';
  }

  formatDateTimeAu(): string {
    return this.dateCertificationAu ? `${this.formatDateFr(this.dateCertificationAu)} 23:59:59` : '';
  }

  formatDateRangeLabel(): string {
    if (!this.dateCertificationDe || !this.dateCertificationAu) return '—';
    return `${this.formatDateFr(this.dateCertificationDe)} au ${this.formatDateFr(this.dateCertificationAu)}`;
  }

  private formatDateInput(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  formatPdfSoldeBanner(): string {
    if (!this.dateCertificationDe || !this.dateCertificationAu) return '';
    const [yDe, mDe, dDe] = this.dateCertificationDe.split('-').map(Number);
    const [yAu, mAu, dAu] = this.dateCertificationAu.split('-').map(Number);
    const months = [
      'JANVIER', 'FÉVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN',
      'JUILLET', 'AOÛT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DÉCEMBRE'
    ];

    const firstDayOfMonth = dDe === 1 && mDe === mAu && yDe === yAu;
    const lastDays: Record<number, number> = {
      1: 31, 2: 28, 3: 31, 4: 30, 5: 31, 6: 30,
      7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31
    };
    const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
    if (mDe === 2 && isLeap(yDe)) lastDays[2] = 29;
    const lastDayOfMonth = dAu === lastDays[mAu] && mDe === mAu && yDe === yAu;

    const isFullYear = dDe === 1 && mDe === 1 && dAu === 31 && mAu === 12 && yDe === yAu;

    let label: string;
    if (isFullYear) {
      label = `SOLDE DE L'ANNÉE ${yDe}`;
    } else if (firstDayOfMonth && lastDayOfMonth) {
      label = `SOLDE DU MOIS DE ${months[mDe - 1]} ${yDe}`;
    } else {
      label = `SOLDE AU ${this.formatDateFr(this.dateCertificationAu)}`;
    }

    const compte = this.numeroCompte || '—';
    const solde = this.formatNumber(this.soldeCloture);
    return `${label} — COMPTE ${compte} — ${solde}`;
  }
}
