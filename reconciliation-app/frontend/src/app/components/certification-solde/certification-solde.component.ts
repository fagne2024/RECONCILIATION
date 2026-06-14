import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import { AppStateService } from '../../services/app-state.service';
import {
  CertificationSoldeComputed,
  CertificationSoldeService
} from '../../services/certification-solde.service';
import { ReconciliationResponse } from '../../models/reconciliation-response.model';
import { PopupService } from '../../services/popup.service';

@Component({
  selector: 'app-certification-solde',
  templateUrl: './certification-solde.component.html',
  styleUrls: ['./certification-solde.component.scss']
})
export class CertificationSoldeComponent implements OnInit, OnDestroy {
  response: ReconciliationResponse | null = null;
  computed: CertificationSoldeComputed | null = null;

  soldeOuverture: number | null = null;
  soldeCloture: number | null = null;
  variation: number | null = null;
  ecartCertification: number | null = null;

  numeroCompte = '';
  dateCertification = '';
  commentaire = '';
  isSaving = false;
  isLoadingSoldes = false;
  isExportingExcel = false;
  isExportingPdf = false;

  private subscription = new Subscription();

  constructor(
    private router: Router,
    private appState: AppStateService,
    private certificationService: CertificationSoldeService,
    private popupService: PopupService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.dateCertification = this.formatDateInput(new Date());
    this.subscription.add(
      this.appState.reconciliationResult$.subscribe(result => {
        this.response = result;
        this.refreshComputed();
      })
    );
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
      this.styleExcelHeaderRow(wsCert.addRow(['Certification de solde TRXBO / OPPART']));
      wsCert.mergeCells('A1:B1');
      wsCert.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF1A2332' } };

      wsCert.addRow([]);
      this.addExcelKeyValueRows(wsCert, [
        ['Date de certification', this.dateCertification || '—'],
        ['Numéro de compte', this.numeroCompte || '—'],
        ['Date export', this.formatExportTimestamp()],
        ['Solde d\'ouverture', this.soldeOuverture],
        ['Solde de clôture', this.soldeCloture],
        ['Suggestion OPPART ouverture', this.computed.soldeOuvertureOppart],
        ['Suggestion OPPART clôture', this.computed.soldeClotureOppart],
        ['Variation', this.variation],
        ['Mouvement net OPPART', this.computed.mouvementNetOppart],
        ['Écart de certification', this.ecartCertification]
      ]);

      wsCert.getColumn(1).width = 32;
      wsCert.getColumn(2).width = 22;

      const wsAgg = workbook.addWorksheet('Agrégats écarts');
      const aggHeader = wsAgg.addRow(['Type', 'Nombre', 'Volume']);
      this.styleExcelHeaderRow(aggHeader);
      for (const row of this.computed.aggregates) {
        wsAgg.addRow([row.label, row.count, row.volume]);
      }
      wsAgg.addRow([]);
      wsAgg.addRow(['Volume correspondances', this.computed.totals.matches, this.computed.volumeMatches]);
      wsAgg.columns = [{ width: 40 }, { width: 14 }, { width: 18 }];

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

    this.isExportingPdf = true;
    this.cdr.markForCheck();
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 14;
      let y = margin;

      const addLine = (text: string, size = 10, bold = false, color: [number, number, number] = [26, 35, 50]) => {
        if (y > 280) {
          pdf.addPage();
          y = margin;
        }
        pdf.setFontSize(size);
        pdf.setFont('helvetica', bold ? 'bold' : 'normal');
        pdf.setTextColor(color[0], color[1], color[2]);
        pdf.text(text, margin, y);
        y += size * 0.45 + 3;
      };

      const addSection = (title: string) => {
        y += 2;
        addLine(title, 12, true, [52, 152, 219]);
        y += 1;
      };

      const addKeyValue = (label: string, value: string) => {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(100, 100, 100);
        pdf.text(label, margin, y);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(26, 35, 50);
        pdf.text(value, margin + 62, y);
        y += 6;
      };

      addLine('Certification de solde', 18, true);
      addLine('Réconciliation TRXBO ↔ OPPART', 11, false, [100, 100, 100]);
      y += 2;

      addSection('Informations');
      addKeyValue('Date certification', this.dateCertification || '—');
      addKeyValue('Numéro compte', this.numeroCompte || '—');
      addKeyValue('Export généré le', this.formatExportTimestamp());

      addSection('Soldes');
      addKeyValue('Solde d\'ouverture', this.formatNumber(this.soldeOuverture));
      addKeyValue('Solde de clôture', this.formatNumber(this.soldeCloture));
      addKeyValue('Suggestion OPPART ouverture', this.formatNumber(this.computed.soldeOuvertureOppart));
      addKeyValue('Suggestion OPPART clôture', this.formatNumber(this.computed.soldeClotureOppart));
      addKeyValue('Variation', this.formatNumber(this.variation));
      addKeyValue('Mouvement net OPPART', this.formatNumber(this.computed.mouvementNetOppart));
      addKeyValue('Écart de certification', this.formatNumber(this.ecartCertification));

      addSection('Agrégats des écarts');
      pdf.setFillColor(52, 152, 219);
      pdf.rect(margin, y - 4, pageWidth - margin * 2, 8, 'F');
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('Type', margin + 2, y + 1);
      pdf.text('Nombre', margin + 95, y + 1);
      pdf.text('Volume', margin + 130, y + 1);
      y += 8;

      for (const row of this.computed.aggregates) {
        if (y > 275) {
          pdf.addPage();
          y = margin;
        }
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(26, 35, 50);
        pdf.setFontSize(9);
        pdf.text(row.label.substring(0, 52), margin + 2, y);
        pdf.text(String(row.count), margin + 95, y);
        pdf.text(this.formatNumber(row.volume), margin + 130, y);
        y += 6;
      }

      y += 2;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Volume correspondances', margin + 2, y);
      pdf.text(String(this.computed.totals.matches), margin + 95, y);
      pdf.text(this.formatNumber(this.computed.volumeMatches), margin + 130, y);
      y += 10;

      addSection('Synthèse réconciliation');
      addKeyValue('Lignes BO (TRXBO)', String(this.computed.totals.totalBoRecords));
      addKeyValue('Lignes Partenaire (OPPART)', String(this.computed.totals.totalPartnerRecords));
      addKeyValue('Correspondances multiples', String(this.computed.totals.mismatches));
      addKeyValue('Volume écarts BO', this.formatNumber(this.computed.volumeEcartBo));
      addKeyValue('Volume écarts Partenaire', this.formatNumber(this.computed.volumeEcartPartner));

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

  private buildExportFileBase(): string {
    const compte = (this.numeroCompte || 'compte').replace(/[^\w-]+/g, '-');
    const date = (this.dateCertification || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
    const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    return `Certification-Solde-${compte}-${date}-${ts}`;
  }

  private formatExportTimestamp(): string {
    return new Date().toLocaleString('fr-FR');
  }

  private styleExcelHeaderRow(row: ExcelJS.Row): void {
    row.eachCell(cell => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF3498DB' }
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
      boData
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

  recalculateDerived(): void {
    this.variation = this.certificationService.computeVariation(this.soldeOuverture, this.soldeCloture);
    if (!this.computed) {
      this.ecartCertification = null;
      return;
    }
    this.ecartCertification = this.certificationService.computeEcartCertification(
      this.variation,
      this.computed.mouvementNetOppart,
      this.computed.volumeEcartBo,
      this.computed.volumeEcartPartner
    );
  }

  async loadSavedSoldes(): Promise<void> {
    if (!this.numeroCompte?.trim() || !this.dateCertification) {
      await this.popupService.showWarning('Renseignez le numéro de compte et la date.', 'Champs requis');
      return;
    }
    this.isLoadingSoldes = true;
    try {
      const [ouverture, cloture] = await Promise.all([
        this.certificationService.loadSoldeOuverture(this.numeroCompte.trim(), this.dateCertification),
        this.certificationService.loadSoldeCloture(this.numeroCompte.trim(), this.dateCertification)
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
    if (!this.numeroCompte?.trim() || !this.dateCertification) {
      await this.popupService.showWarning('Renseignez le numéro de compte et la date pour sauvegarder.', 'Champs requis');
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
          this.dateCertification,
          this.soldeOuverture
        )),
        firstValueFrom(this.certificationService.saveSoldeCloture(
          this.numeroCompte.trim(),
          this.dateCertification,
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

  private formatDateInput(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
