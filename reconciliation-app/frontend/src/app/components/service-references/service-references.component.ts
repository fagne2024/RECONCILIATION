import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import * as XLSX from 'xlsx';
import * as ExcelJS from 'exceljs';

import { ServiceReference, ServiceReferencePayload, ServiceReferenceDashboard } from '../../models/service-reference.model';
import { ServiceReferenceService } from '../../services/service-reference.service';
import { ModernPopupComponent, PopupConfig } from '../modern-popup/modern-popup.component';

type ImportPayload = ServiceReferencePayload & { rowNumber: number };

@Component({
    selector: 'app-service-references',
    templateUrl: './service-references.component.html',
    styleUrls: ['./service-references.component.scss']
})

export class ServiceReferencesComponent implements OnInit {
    references: ServiceReference[] = [];
    filteredReferences: ServiceReference[] = [];
    isLoading = false;
    isSaving = false;
    isImporting = false;
    errorMessage: string | null = null;
    successMessage: string | null = null;
    errorDetails: string[] = [];
    searchTerm = '';
    showForm = false;

    referenceForm: FormGroup;
    editingReference: ServiceReference | null = null;
    filterForm: FormGroup;

    @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

    private readonly templateHeaders = [
        'Pays',
        'Code Service',
        'Service',
        'Code RECO',
        'Service Type',
        'Opérateur',
        'Réseau',
        'Réconciliable',
        'Motif',
        'Retenu Opérateur'
    ];

    paysOptions: string[] = [];
    operateurOptions: string[] = [];
    serviceTypeOptions: string[] = [];
    reseauOptions: string[] = [];
    codeServiceOptions: string[] = [];

    pageIndex = 1;
    pageSize = 10;
    pageSizeOptions = [10, 25, 50];
    totalItems = 0;
    selectedReferences: Set<number> = new Set();
    allSelected = false;
    isDashboardVisible = false;
    dashboardStats: ServiceReferenceDashboard[] = [];
    isDashboardLoading = false;

    constructor(
        private serviceReferenceService: ServiceReferenceService,
        private fb: FormBuilder,
        private router: Router
    ) {
        this.referenceForm = this.fb.group({
            pays: ['', Validators.required],
            codeService: ['', Validators.required],
            serviceLabel: ['', Validators.required],
            codeReco: ['', Validators.required],
            serviceType: [''],
            operateur: [''],
            reseau: [''],
            reconciliable: [true],
            motif: [''],
            retenuOperateur: [''],
            status: ['ACTIF']
        });

        this.filterForm = this.fb.group({
            pays: [''],
            operateur: [''],
            reseau: [''],
            serviceType: [''],
            codeService: [''],
            status: [''],
            reconciliable: ['all']
        });
    }

    ngOnInit(): void {
        this.filterForm.valueChanges.subscribe(() => this.applyFilters());
        this.loadReferences();
    }

    toggleDashboard(): void {
        this.isDashboardVisible = !this.isDashboardVisible;
        if (this.isDashboardVisible && !this.dashboardStats.length) {
            this.loadDashboardStats();
        }
    }

    private loadDashboardStats(): void {
        this.isDashboardLoading = true;
        this.serviceReferenceService.getDashboardStats().subscribe({
            next: (stats) => {
                this.dashboardStats = (stats || []).sort((a, b) => a.country.localeCompare(b.country));
                this.isDashboardLoading = false;
            },
            error: async (error) => {
                console.error('Erreur lors du chargement du dashboard', error);
                this.isDashboardLoading = false;
                await this.showErrorPopup('Impossible de charger le dashboard');
            }
        });
    }

    loadReferences(): void {
        this.clearSelection();
        this.isLoading = true;
        this.errorMessage = null;
        this.serviceReferenceService.listAll().subscribe({
            next: (refs) => {
                this.references = refs.sort((a, b) => a.pays.localeCompare(b.pays));
                this.updateFilterOptions();
                this.applyFilters();
                this.isLoading = false;
                this.errorDetails = [];
            },
            error: (error) => {
                console.error('Erreur lors du chargement des références', error);
                this.errorMessage = 'Impossible de charger le référentiel. Veuillez réessayer.';
                this.isLoading = false;
            }
        });
    }

    applyFilters(): void {
        const term = (this.searchTerm || '').toLowerCase();
        const { pays, operateur, serviceType, reseau, codeService, status, reconciliable } = this.filterForm.value;
        const normalizedStatus = (status || '').trim().toUpperCase();

        this.filteredReferences = this.references.filter(ref => {
            const matchesSearch = !term || [
                ref.pays,
                ref.codeService,
                ref.serviceLabel,
                ref.codeReco,
                ref.serviceType || '',
                ref.operateur || '',
                ref.reseau || ''
            ].some(field => field.toLowerCase().includes(term));

            const matchesPays = !pays || ref.pays.toLowerCase().includes(pays.toLowerCase());
            const matchesOperateur = !operateur || (ref.operateur || '').toLowerCase().includes(operateur.toLowerCase());
            const matchesServiceType = !serviceType || (ref.serviceType || '').toLowerCase().includes(serviceType.toLowerCase());
            const matchesReseau = !reseau || (ref.reseau || '').toLowerCase().includes(reseau.toLowerCase());
            const matchesCodeService = !codeService || ref.codeService.toLowerCase().includes(codeService.toLowerCase());
            const matchesStatus = !normalizedStatus || (ref.status || 'ACTIF').toUpperCase() === normalizedStatus;
            const matchesReconciliable = reconciliable === 'all' ||
                ref.reconciliable === (reconciliable === 'true');

            return matchesSearch && matchesPays && matchesOperateur && matchesServiceType &&
                matchesReseau && matchesCodeService && matchesStatus && matchesReconciliable;
        });

        this.totalItems = this.filteredReferences.length;
        this.pageIndex = 1;
        this.syncSelectionWithData();
        this.updateAllSelectedState();
    }

    private updateFilterOptions(): void {
        const unique = <T>(arr: T[]) => Array.from(new Set(arr)).sort();
        this.paysOptions = unique(this.references.map(ref => ref.pays));
        this.operateurOptions = unique(this.references
            .map(ref => ref.operateur)
            .filter((op): op is string => !!op));
        this.serviceTypeOptions = unique(this.references
            .map(ref => ref.serviceType)
            .filter((st): st is string => !!st));
        this.reseauOptions = unique(this.references
            .map(ref => ref.reseau)
            .filter((rs): rs is string => !!rs));
        this.codeServiceOptions = unique(this.references.map(ref => ref.codeService));
    }

    get pagedReferences(): ServiceReference[] {
        const start = (this.pageIndex - 1) * this.pageSize;
        return this.filteredReferences.slice(start, start + this.pageSize);
    }

    get totalPages(): number {
        return Math.max(1, Math.ceil(this.filteredReferences.length / this.pageSize));
    }

    goToPage(page: number): void {
        if (page < 1 || page > this.totalPages) {
            return;
        }
        this.pageIndex = page;
    }

    changePageSize(size: string | number): void {
        this.pageSize = Number(size);
        this.pageIndex = 1;
    }

    resetFilters(): void {
        this.filterForm.reset({
            pays: '',
            operateur: '',
            reseau: '',
            serviceType: '',
            codeService: '',
            status: '',
            reconciliable: 'all'
        });
        this.applyFilters();
    }

    startCreate(): void {
        this.editingReference = null;
        this.referenceForm.setValue({
            pays: '',
            codeService: '',
            serviceLabel: '',
            codeReco: '',
            serviceType: '',
            operateur: '',
            reseau: '',
            reconciliable: true,
            motif: '',
            retenuOperateur: '',
            status: 'ACTIF'
        });
    }

    openCreateForm(): void {
        this.showForm = true;
        this.startCreate();
    }

    editReference(reference: ServiceReference): void {
        this.showForm = true;
        this.editingReference = reference;
        this.referenceForm.patchValue(reference);
    }

    async saveReference(): Promise<void> {
        if (this.referenceForm.invalid) {
            this.referenceForm.markAllAsTouched();
            return;
        }

        this.isSaving = true;
        this.errorMessage = null;
        this.successMessage = null;

        const payload: ServiceReferencePayload = this.referenceForm.value;

        try {
            if (this.editingReference?.id) {
                await firstValueFrom(
                    this.serviceReferenceService.update(
                        this.editingReference.id,
                        this.normalizePayload(payload)
                    )
                );
                this.successMessage = 'Référence mise à jour avec succès.';
            } else {
                await firstValueFrom(this.serviceReferenceService.create(this.normalizePayload(payload)));
                this.successMessage = 'Référence ajoutée avec succès.';
            }
            await this.showSuccessPopup(this.successMessage || 'Opération réussie');
            this.startCreate();
            this.loadReferences();
        } catch (error) {
            console.error('Erreur lors de la sauvegarde', error);
            this.errorMessage = this.extractErrorMessage(error) || 'Échec de l\'enregistrement.';
            this.errorDetails = [];
            await this.showErrorPopup(this.errorMessage);
        } finally {
            this.isSaving = false;
        }
    }

    async deleteReference(reference: ServiceReference): Promise<void> {
        if (!reference.id) {
            return;
        }

        const confirmation = confirm(`Supprimer la référence ${reference.codeReco} (${reference.serviceLabel}) ?`);
        if (!confirmation) {
            return;
        }

        this.errorMessage = null;
        this.successMessage = null;
        this.isLoading = true;
        try {
            await firstValueFrom(this.serviceReferenceService.delete(reference.id));
            this.successMessage = 'Référence supprimée.';
            await this.showSuccessPopup(this.successMessage);
            this.loadReferences();
        } catch (error) {
            console.error('Erreur lors de la suppression', error);
            this.errorMessage = this.extractErrorMessage(error) || 'Impossible de supprimer la référence.';
            this.errorDetails = [];
            this.isLoading = false;
            await this.showErrorPopup(this.errorMessage);
        }
    }

    async deleteSelectedReferences(): Promise<void> {
        if (!this.hasSelection) {
            return;
        }
        const confirmation = confirm(`Supprimer ${this.selectedCount} référence(s) sélectionnée(s) ?`);
        if (!confirmation) {
            return;
        }

        this.errorMessage = null;
        this.successMessage = null;
        this.isLoading = true;
        try {
            const ids = Array.from(this.selectedReferences);
            await Promise.all(ids.map(id => firstValueFrom(this.serviceReferenceService.delete(id))));
            this.successMessage = `${ids.length} référence(s) supprimée(s).`;
            this.clearSelection();
            await this.showSuccessPopup(this.successMessage);
            this.loadReferences();
        } catch (error) {
            console.error('Erreur lors de la suppression multiple', error);
            this.errorMessage = this.extractErrorMessage(error) || 'Impossible de supprimer la sélection.';
            this.isLoading = false;
            await this.showErrorPopup(this.errorMessage);
        }
    }

    downloadTemplate(): void {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Référentiel Services');
        sheet.addRow(this.templateHeaders);
        const examples = [
            ['BF', 'DEBIT', 'CI_TUV_CASHIN_ORANGE_HT', 'BF_TUV_CASHIN_ORANGE_HT', 'MOMO CASHIN', 'ORANGE', 'HT', 'OUI', '', ''],
            ['CI', 'CREDIT', 'CI_TSOP_CASHOUT_INTOUCH_HT', 'CI_TSOP_CASHOUT_INTOUCH_HT', 'MOMO CASHOUT', 'ORANGE', 'HT', 'OUI', '', ''],
            ['SN', 'CASHIN_OM', 'SN_MOMO_CASHIN_ORANGE_TOTAL', 'SN_MOMO_CASHIN_ORANGE_TOTAL', 'MOMO PM', 'ORANGE', 'TOTAL', 'NON', 'PAS DE GR', '']
        ];
        sheet.addRows(examples);

        sheet.columns?.forEach(column => {
            column.width = 20;
        });

        workbook.xlsx.writeBuffer().then(buffer => {
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'template_referentiel_services.xlsx';
            link.click();
            window.URL.revokeObjectURL(url);
        });
    }

    triggerFileUpload(): void {
        if (this.fileInput) {
            this.fileInput.nativeElement.click();
        }
    }

    async handleFileInput(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        const file = input.files && input.files[0];
        if (!file) {
            return;
        }

        this.isImporting = true;
        this.errorMessage = null;
        this.successMessage = null;
        this.errorDetails = [];

        try {
            const payloads = await this.parseFile(file);
            if (!payloads.length) {
                this.errorMessage = 'Le fichier ne contient aucune ligne valide.';
                await this.showErrorPopup(this.errorMessage);
                return;
            }

            let successCount = 0;
            const failures: string[] = [];

            for (const payload of payloads) {
                const { rowNumber, ...data } = payload;
                try {
                    await firstValueFrom(this.serviceReferenceService.create(this.normalizePayload(data)));
                    successCount++;
                } catch (error) {
                    const message = this.extractErrorMessage(error) || 'Erreur inconnue';
                    const label = `Ligne ${rowNumber ?? '?'} (${data.pays || 'N/A'} / ${data.codeReco || 'N/A'}) : ${message}`;
                    failures.push(label);
                }
            }

            if (successCount) {
                this.successMessage = `${successCount} référence(s) importée(s) avec succès.`;
                await this.showSuccessPopup(this.successMessage);
                this.loadReferences();
            }

            if (failures.length) {
                this.errorMessage = `${failures.length} ligne(s) en erreur lors de l'import.`;
                this.errorDetails = failures;
                await this.showErrorPopup(this.errorMessage);
            }
        } catch (error) {
            console.error('Erreur lors de l\'import', error);
            this.errorMessage = this.extractErrorMessage(error) || 'Import impossible. Vérifiez le format du fichier.';
            await this.showErrorPopup(this.errorMessage);
        } finally {
            this.isImporting = false;
            if (this.fileInput) {
                this.fileInput.nativeElement.value = '';
            }
        }
    }

    private async parseFile(file: File): Promise<ImportPayload[]> {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        return rows
            .map((row, index) => this.rowToPayload(row, index + 2))
            .filter((payload): payload is ImportPayload => !!payload);
    }

    private rowToPayload(row: any, rowNumber: number): ImportPayload | null {
        const pays = this.cleanString(row['Pays'] || row['PAYS'] || row['Country']);
        const codeService = this.cleanString(row['Code Service'] || row['SERVICE CODE']);
        const serviceLabel = this.cleanString(row['Service'] || row['SERVICE']);
        const codeReco = this.cleanString(row['Code RECO'] || row['CODE RECO']);

        if (!pays || !codeService || !serviceLabel || !codeReco) {
            return null;
        }

        const reconciliableRaw = this.cleanString(row['Réconciliable'] || row['RECONCILIABLE']).toLowerCase();
        const reconciliable = reconciliableRaw === 'oui' || reconciliableRaw === 'true' || reconciliableRaw === '1';

        return {
            pays: pays.toUpperCase(),
            codeService: codeService.toUpperCase(),
            serviceLabel,
            codeReco: codeReco.toUpperCase(),
            serviceType: this.cleanString(row['Service Type'] || row['TYPE']),
            operateur: this.cleanString(row['Opérateur'] || row['OPERATEUR']),
            reseau: this.cleanString(row['Réseau'] || row['RESEAU']),
            reconciliable,
            motif: this.cleanString(row['Motif'] || row['MOTIF']),
            retenuOperateur: this.cleanString(row['Retenu Opérateur'] || row['RETENU OPERATEUR']),
            status: (this.cleanString(row['Statut'] || row['STATUT'] || row['Status'] || row['STATUS']) || 'ACTIF').toUpperCase(),
            rowNumber
        };
    }

    cancelEdit(): void {
        this.showForm = false;
        this.editingReference = null;
        this.startCreate();
    }

    goBackToStats(): void {
        this.router.navigate(['/stats']);
    }

    getRangeLabel(): string {
        if (!this.filteredReferences.length) {
            return 'Aucune ligne';
        }
        const start = (this.pageIndex - 1) * this.pageSize + 1;
        const end = Math.min(this.filteredReferences.length, start + this.pageSize - 1);
        return `Affichage ${start}-${end} / ${this.filteredReferences.length} ligne(s)`;
    }

    get dashboardTotalVolume(): number {
        return this.dashboardStats.reduce((sum, stat) => sum + (stat.totalVolume || 0), 0);
    }

    get dashboardTotalTransactions(): number {
        return this.dashboardStats.reduce((sum, stat) => sum + (stat.totalTransactions || 0), 0);
    }

    get dashboardNetVolume(): number {
        return this.dashboardStats.reduce((sum, stat) => sum + (stat.reconcilableVolume || 0), 0);
    }

    get dashboardNetTransactions(): number {
        return this.dashboardStats.reduce((sum, stat) => sum + (stat.reconcilableTransactions || 0), 0);
    }

    get dashboardNonReconcilableVolume(): number {
        return this.dashboardStats.reduce((sum, stat) => sum + (stat.nonReconcilableVolume || 0), 0);
    }

    get dashboardNonReconcilableTransactions(): number {
        return this.dashboardStats.reduce((sum, stat) => sum + (stat.nonReconcilableTransactions || 0), 0);
    }

    private cleanString(value: any): string {
        return value !== undefined && value !== null ? value.toString().trim() : '';
    }

    private normalizePayload(payload: ServiceReferencePayload): ServiceReferencePayload {
        const sanitize = (val?: string | null, upper = false) => {
            if (val === null || val === undefined) {
                return val as undefined;
            }
            const trimmed = val.toString().trim();
            return upper ? trimmed.toUpperCase() : trimmed;
        };

        return {
            ...payload,
            pays: sanitize(payload.pays, true) || '',
            codeService: sanitize(payload.codeService, true) || '',
            serviceLabel: sanitize(payload.serviceLabel) || '',
            codeReco: sanitize(payload.codeReco, true) || '',
            serviceType: sanitize(payload.serviceType || undefined) || undefined,
            operateur: sanitize(payload.operateur || undefined) || undefined,
            reseau: sanitize(payload.reseau || undefined) || undefined,
            motif: sanitize(payload.motif || undefined) || undefined,
            retenuOperateur: sanitize(payload.retenuOperateur || undefined) || undefined,
            status: sanitize(payload.status || 'ACTIF', true) || 'ACTIF'
        };
    }

    private extractErrorMessage(error: any): string {
        if (!error) {
            return 'Erreur inconnue';
        }
        if (typeof error === 'string') {
            return error;
        }
        if (error.error) {
            if (typeof error.error === 'string') {
                return error.error;
            }
            if (error.error.message) {
                return error.error.message;
            }
        }
        if (error.message) {
            return error.message;
        }
        return 'Erreur inconnue';
    }

    private async showSuccessPopup(message: string) {
        const config: PopupConfig = {
            title: 'Succès',
            message,
            type: 'success',
            showCancelButton: false,
            confirmText: 'OK'
        };
        await ModernPopupComponent.showPopup(config);
    }

    private async showErrorPopup(message: string) {
        const config: PopupConfig = {
            title: 'Erreur',
            message,
            type: 'error',
            showCancelButton: false,
            confirmText: 'OK'
        };
        await ModernPopupComponent.showPopup(config);
    }

    formatNumber(value: number, fractionDigits: number = 0): string {
        if (value === null || value === undefined || isNaN(value)) {
            return '0';
        }
        return new Intl.NumberFormat('fr-FR', {
            minimumFractionDigits: fractionDigits,
            maximumFractionDigits: fractionDigits
        }).format(value);
    }

    getMetricClass(value: number): string {
        if (value >= 95) {
            return 'metric-good';
        }
        if (value >= 80) {
            return 'metric-warning';
        }
        return 'metric-bad';
    }

    trackByCountry(_index: number, item: ServiceReferenceDashboard): string {
        return item.country;
    }

    get hasSelection(): boolean {
        return this.selectedReferences.size > 0;
    }

    get selectedCount(): number {
        return this.selectedReferences.size;
    }

    isSelected(ref: ServiceReference): boolean {
        return !!ref.id && this.selectedReferences.has(ref.id);
    }

    toggleSelection(ref: ServiceReference, event: Event): void {
        if (!ref.id) {
            return;
        }
        const checked = (event.target as HTMLInputElement).checked;
        if (checked) {
            this.selectedReferences.add(ref.id);
        } else {
            this.selectedReferences.delete(ref.id);
        }
        this.updateAllSelectedState();
    }

    toggleSelectAll(event: Event): void {
        const checked = (event.target as HTMLInputElement).checked;
        if (checked) {
            this.filteredReferences.forEach(ref => {
                if (ref.id) {
                    this.selectedReferences.add(ref.id);
                }
            });
        } else {
            this.selectedReferences.clear();
        }
        this.allSelected = checked;
    }

    clearSelection(): void {
        this.selectedReferences.clear();
        this.allSelected = false;
    }

    private updateAllSelectedState(): void {
        if (!this.filteredReferences.length) {
            this.allSelected = false;
            return;
        }
        this.allSelected = this.filteredReferences.every(ref => !ref.id || this.selectedReferences.has(ref.id));
    }

    private syncSelectionWithData(): void {
        const validIds = new Set(this.references.filter(ref => ref.id).map(ref => ref.id!));
        this.selectedReferences.forEach(id => {
            if (!validIds.has(id)) {
                this.selectedReferences.delete(id);
            }
        });
    }
}

