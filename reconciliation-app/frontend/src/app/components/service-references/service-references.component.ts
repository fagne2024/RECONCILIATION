import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import * as XLSX from 'xlsx';
import * as ExcelJS from 'exceljs';

import { ServiceReference, ServiceReferencePayload } from '../../models/service-reference.model';
import { ServiceReferenceService } from '../../services/service-reference.service';
import { ModernPopupComponent, PopupConfig } from '../modern-popup/modern-popup.component';

type ImportPayload = ServiceReferencePayload & { rowNumber: number };

/** Dimension de filtre : pour calculer les listes déroulantes en excluant une dimension (cloisonnement). */
type ServiceRefFilterDimension =
    | 'pays'
    | 'operateur'
    | 'reseau'
    | 'serviceType'
    | 'codeService'
    | 'status'
    | 'reconciliable';

interface ServiceRefDashboardOperatorGroup {
    operateurLabel: string;
    items: ServiceReference[];
}

interface ServiceRefDashboardGroup {
    serviceTypeLabel: string;
    operators: ServiceRefDashboardOperatorGroup[];
}

type DashboardFilterDimension = 'pays' | 'serviceType' | 'operateur';

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
    /** Filtres du dashboard (Pays / Type / Opérateur) — cloisonnement des listes. */
    dashboardFilterForm: FormGroup;
    dashboardPaysOptions: string[] = [];
    dashboardServiceTypeOptions: string[] = [];
    dashboardOperateurOptions: string[] = [];

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

        this.dashboardFilterForm = this.fb.group({
            pays: [''],
            serviceType: [''],
            operateur: ['']
        });
    }

    ngOnInit(): void {
        this.filterForm.valueChanges.pipe(
            debounceTime(200),
            distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
        ).subscribe(() => this.applyFilters());
        this.dashboardFilterForm.valueChanges.pipe(
            debounceTime(200),
            distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
        ).subscribe(() => this.updateDashboardFilterOptions());
        this.loadReferences();
    }

    toggleDashboard(): void {
        this.isDashboardVisible = !this.isDashboardVisible;
        if (this.isDashboardVisible) {
            this.updateDashboardFilterOptions();
        }
    }

    loadReferences(): void {
        this.clearSelection();
        this.isLoading = true;
        this.errorMessage = null;
        this.serviceReferenceService.listAll().subscribe({
            next: (refs) => {
                this.references = refs.sort((a, b) => a.pays.localeCompare(b.pays));
                this.applyFilters();
                this.updateDashboardFilterOptions();
                this.isLoading = false;
                this.errorDetails = [];
            },
            error: (error) => {
                console.error('Erreur lors du chargement des références', error);
                const msg = error?.error?.message || error?.message;
                this.errorMessage = error?.status === 429 || (typeof msg === 'string' && msg.includes('Trop de requêtes'))
                    ? (typeof msg === 'string' ? msg : 'Trop de requêtes. Veuillez réessayer plus tard.')
                    : 'Impossible de charger le référentiel. Veuillez réessayer.';
                this.isLoading = false;
            }
        });
    }

    applyFilters(): void {
        this.updateFilterOptions();
        const term = (this.searchTerm || '').toLowerCase();

        this.filteredReferences = this.references.filter((ref) => {
            const matchesSearch =
                !term ||
                [
                    ref.pays,
                    ref.codeService,
                    ref.serviceLabel,
                    ref.codeReco,
                    ref.serviceType || '',
                    ref.operateur || '',
                    ref.reseau || ''
                ].some((field) => field.toLowerCase().includes(term));

            return matchesSearch && this.matchesFilterForm(ref, null);
        });

        this.totalItems = this.filteredReferences.length;
        this.pageIndex = 1;
        this.syncSelectionWithData();
        this.updateAllSelectedState();
    }

    /**
     * Applique les critères du formulaire de filtre.
     * Si {@code exclude} est renseigné, ce critère est ignoré (pour proposer des valeurs cohérentes sur les autres dimensions).
     */
    private matchesFilterForm(ref: ServiceReference, exclude: ServiceRefFilterDimension | null): boolean {
        const { pays, operateur, serviceType, reseau, codeService, status, reconciliable } = this.filterForm.value;
        const normalizedStatus = (status || '').trim().toUpperCase();

        if (exclude !== 'pays' && pays) {
            if (!ref.pays.toLowerCase().includes(String(pays).toLowerCase())) {
                return false;
            }
        }
        if (exclude !== 'operateur' && operateur) {
            if (!String(ref.operateur || '').toLowerCase().includes(String(operateur).toLowerCase())) {
                return false;
            }
        }
        if (exclude !== 'serviceType' && serviceType) {
            if (!String(ref.serviceType || '').toLowerCase().includes(String(serviceType).toLowerCase())) {
                return false;
            }
        }
        if (exclude !== 'reseau' && reseau) {
            if (!String(ref.reseau || '').toLowerCase().includes(String(reseau).toLowerCase())) {
                return false;
            }
        }
        if (exclude !== 'codeService' && codeService) {
            if (!ref.codeService.toLowerCase().includes(String(codeService).toLowerCase())) {
                return false;
            }
        }
        if (exclude !== 'status' && normalizedStatus) {
            if (String(ref.status || 'ACTIF').toUpperCase() !== normalizedStatus) {
                return false;
            }
        }
        if (exclude !== 'reconciliable' && reconciliable !== 'all') {
            if (ref.reconciliable !== (reconciliable === 'true')) {
                return false;
            }
        }
        return true;
    }

    /**
     * Suggestions de filtres cloisonnées : chaque liste ne contient que les valeurs présentes
     * dans les lignes qui satisfont déjà les autres critères (pays ↔ service ↔ réseau, etc.).
     */
    private updateFilterOptions(): void {
        const unique = <T>(arr: T[]) => Array.from(new Set(arr)).sort();

        this.paysOptions = unique(
            this.references.filter((ref) => this.matchesFilterForm(ref, 'pays')).map((ref) => ref.pays)
        );
        this.operateurOptions = unique(
            this.references
                .filter((ref) => this.matchesFilterForm(ref, 'operateur'))
                .map((ref) => ref.operateur)
                .filter((op): op is string => !!op)
        );
        this.serviceTypeOptions = unique(
            this.references
                .filter((ref) => this.matchesFilterForm(ref, 'serviceType'))
                .map((ref) => ref.serviceType)
                .filter((st): st is string => !!st)
        );
        this.reseauOptions = unique(
            this.references
                .filter((ref) => this.matchesFilterForm(ref, 'reseau'))
                .map((ref) => ref.reseau)
                .filter((rs): rs is string => !!rs)
        );
        this.codeServiceOptions = unique(
            this.references
                .filter((ref) => this.matchesFilterForm(ref, 'codeService'))
                .map((ref) => ref.codeService)
        );
    }

    private norm(s: string | undefined | null): string {
        return (s ?? '').trim().toLowerCase();
    }

    private matchesDashboardFilter(ref: ServiceReference, exclude: DashboardFilterDimension | null): boolean {
        const { pays, serviceType, operateur } = this.dashboardFilterForm.value;
        if (exclude !== 'pays' && pays) {
            if (this.norm(ref.pays) !== this.norm(pays)) {
                return false;
            }
        }
        if (exclude !== 'serviceType' && serviceType) {
            if (this.norm(ref.serviceType) !== this.norm(serviceType)) {
                return false;
            }
        }
        if (exclude !== 'operateur' && operateur) {
            if (this.norm(ref.operateur) !== this.norm(operateur)) {
                return false;
            }
        }
        return true;
    }

    updateDashboardFilterOptions(): void {
        const uniqueSorted = <T>(arr: T[]) =>
            [...new Set(arr)].sort((a, b) => String(a).localeCompare(String(b), 'fr'));

        this.dashboardPaysOptions = uniqueSorted(
            this.references.filter((r) => this.matchesDashboardFilter(r, 'pays')).map((r) => r.pays)
        );
        this.dashboardServiceTypeOptions = uniqueSorted(
            this.references
                .filter((r) => this.matchesDashboardFilter(r, 'serviceType'))
                .map((r) => r.serviceType)
                .filter((st): st is string => !!st && String(st).trim().length > 0)
        );
        this.dashboardOperateurOptions = uniqueSorted(
            this.references
                .filter((r) => this.matchesDashboardFilter(r, 'operateur'))
                .map((r) => r.operateur)
                .filter((op): op is string => !!op && String(op).trim().length > 0)
        );
    }

    get dashboardFilteredRefs(): ServiceReference[] {
        return this.references.filter((r) => this.matchesDashboardFilter(r, null));
    }

    get dashboardTotalCount(): number {
        return this.dashboardFilteredRefs.length;
    }

    get dashboardReconciliableCount(): number {
        return this.dashboardFilteredRefs.filter((r) => r.reconciliable).length;
    }

    get dashboardNonReconciliableCount(): number {
        return this.dashboardFilteredRefs.filter((r) => !r.reconciliable).length;
    }

    get dashboardReconciliablePercent(): number {
        const t = this.dashboardTotalCount;
        return t ? Math.round((100 * this.dashboardReconciliableCount) / t) : 0;
    }

    get dashboardNonReconciliablePercent(): number {
        const t = this.dashboardTotalCount;
        return t ? Math.round((100 * this.dashboardNonReconciliableCount) / t) : 0;
    }

    get dashboardTotalCardSubtitle(): string {
        const p = (this.dashboardFilterForm.get('pays')?.value || '').trim();
        return p ? `Pays : ${p}` : 'Tous pays';
    }

    get groupedDashboardReconciliable(): ServiceRefDashboardGroup[] {
        return this.buildServiceRefGroups(this.dashboardFilteredRefs.filter((r) => r.reconciliable));
    }

    get groupedDashboardNonReconciliable(): ServiceRefDashboardGroup[] {
        return this.buildServiceRefGroups(this.dashboardFilteredRefs.filter((r) => !r.reconciliable));
    }

    private buildServiceRefGroups(refs: ServiceReference[]): ServiceRefDashboardGroup[] {
        const byType = new Map<string, Map<string, ServiceReference[]>>();
        for (const ref of refs) {
            const typeKey = (ref.serviceType || '').trim().toUpperCase() || '(SANS TYPE)';
            const opKey = (ref.operateur || '').trim().toUpperCase() || '(SANS OPÉRATEUR)';
            if (!byType.has(typeKey)) {
                byType.set(typeKey, new Map());
            }
            const opMap = byType.get(typeKey)!;
            if (!opMap.has(opKey)) {
                opMap.set(opKey, []);
            }
            opMap.get(opKey)!.push(ref);
        }
        const types = [...byType.keys()].sort((a, b) => a.localeCompare(b, 'fr'));
        return types.map((serviceTypeLabel) => {
            const opMap = byType.get(serviceTypeLabel)!;
            const ops = [...opMap.keys()].sort((a, b) => a.localeCompare(b, 'fr'));
            return {
                serviceTypeLabel,
                operators: ops.map((operateurLabel) => ({
                    operateurLabel,
                    items: (opMap.get(operateurLabel) || []).sort((a, b) =>
                        a.codeService.localeCompare(b.codeService, undefined, { sensitivity: 'base' })
                    )
                }))
            };
        });
    }

    isReferenceActive(ref: ServiceReference): boolean {
        return String(ref.status || 'ACTIF').toUpperCase() !== 'INACTIF';
    }

    trackDashboardGroup(_index: number, g: ServiceRefDashboardGroup): string {
        return g.serviceTypeLabel;
    }

    trackDashboardOp(_index: number, o: ServiceRefDashboardOperatorGroup): string {
        return o.operateurLabel;
    }

    trackDashboardRef(_index: number, r: ServiceReference): string {
        return r.id != null ? String(r.id) : `${r.pays}|${r.codeService}|${r.codeReco}`;
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

        const confirmed = await ModernPopupComponent.showPopup({
            title: 'Supprimer cette référence ?',
            message: `La référence ${reference.codeReco} (${reference.serviceLabel}) sera supprimée définitivement.`,
            type: 'confirm',
            showCancelButton: true,
            cancelText: 'Annuler',
            confirmText: 'Supprimer'
        });
        if (!confirmed) {
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
        const n = this.selectedCount;
        const confirmed = await ModernPopupComponent.showPopup({
            title: 'Suppression en masse',
            message: `Supprimer ${n} référence(s) sélectionnée(s) ? Cette action est irréversible.`,
            type: 'confirm',
            showCancelButton: true,
            cancelText: 'Annuler',
            confirmText: 'Supprimer tout'
        });
        if (!confirmed) {
            return;
        }

        this.errorMessage = null;
        this.successMessage = null;
        this.errorDetails = [];
        this.isLoading = true;
        try {
            const ids = Array.from(this.selectedReferences);
            const result = await firstValueFrom(this.serviceReferenceService.deleteBatch(ids));
            if (result.deletedCount === 0 && (result.errors?.length ?? 0) > 0) {
                this.errorMessage = 'Aucune référence n’a pu être supprimée.';
                this.errorDetails = result.errors;
                this.isLoading = false;
                await this.showErrorPopup(this.errorMessage);
                return;
            }
            this.clearSelection();
            if (result.errors?.length) {
                this.errorDetails = result.errors;
                this.successMessage = `${result.deletedCount} référence(s) supprimée(s). Certaines lignes ont échoué (voir le détail sous le tableau).`;
                await ModernPopupComponent.showWarning(
                    `${result.deletedCount} supprimée(s). ${result.errors.length} erreur(s) — détail affiché sur la page.`,
                    'Suppression partielle'
                );
            } else {
                this.successMessage = `${result.deletedCount} référence(s) supprimée(s).`;
                await this.showSuccessPopup(this.successMessage);
            }
            this.loadReferences();
        } catch (error) {
            console.error('Erreur lors de la suppression multiple', error);
            this.errorMessage = this.extractErrorMessage(error) || 'Impossible de supprimer la sélection.';
            this.errorDetails = [];
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

            const globalUsedCodeServices = new Set<string>();
            try {
                const used = await firstValueFrom(this.serviceReferenceService.getUsedCodeServices());
                for (const c of used || []) {
                    const u = (c || '').trim().toUpperCase();
                    if (u) {
                        globalUsedCodeServices.add(u);
                    }
                }
            } catch {
                // Fallback : filtre basé sur la liste chargée uniquement
            }

            // S'assurer que les références sont chargées pour la vérification des doublons
            if (this.references.length === 0) {
                this.references = await firstValueFrom(this.serviceReferenceService.listAll());
            }

            const { toImport, skippedDuplicates } = this.filterImportablePayloads(payloads, globalUsedCodeServices);

            const batchItems = toImport.map((payload) => {
                const { rowNumber, ...data } = payload;
                return {
                    rowNumber: rowNumber ?? 0,
                    payload: this.normalizePayload(data)
                };
            });

            let successCount = 0;
            const failures: string[] = [];
            const IMPORT_CHUNK = 400;

            for (let offset = 0; offset < batchItems.length; offset += IMPORT_CHUNK) {
                const slice = batchItems.slice(offset, offset + IMPORT_CHUNK);
                try {
                    const result = await firstValueFrom(this.serviceReferenceService.importBatch(slice));
                    successCount += result.successCount;
                    if (result.errors?.length) {
                        failures.push(...result.errors);
                    }
                } catch (error) {
                    const message = this.extractErrorMessage(error) || 'Erreur inconnue';
                    const from = offset + 1;
                    const to = Math.min(offset + IMPORT_CHUNK, batchItems.length);
                    failures.push(`Paquet de lignes ${from}–${to} : ${message}`);
                }
            }

            const detailLines = [...skippedDuplicates, ...failures];
            this.errorDetails = detailLines;

            const totalLignesFichier = payloads.length;
            if (successCount > 0) {
                const parts = [
                    `Résumé : ${totalLignesFichier} ligne(s) valide(s) dans le fichier.`,
                    `${successCount} référence(s) enregistrée(s).`
                ];
                if (skippedDuplicates.length) {
                    parts.push(
                        `${skippedDuplicates.length} ignorée(s) avant envoi (même code service dans le fichier ou code service déjà en base).`
                    );
                }
                if (failures.length) {
                    parts.push(
                        `${failures.length} ligne(s) ou paquet(s) en échec (voir le détail : doublon, validation, droits, etc.).`
                    );
                }
                this.successMessage = parts.join(' ');
                if (failures.length) {
                    this.errorMessage = `${failures.length} problème(s) — ouvrez le détail ci-dessous pour chaque ligne.`;
                }
                await this.showSuccessPopup(this.successMessage);
                this.loadReferences();
            } else if (skippedDuplicates.length || failures.length) {
                this.errorMessage = skippedDuplicates.length && !failures.length
                    ? 'Aucune nouvelle référence : chaque code service du fichier existe déjà en base ou est en doublon dans le fichier.'
                    : `Import impossible ou partiel : ${failures.length} erreur(s).`;
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

    private normalizeImportCodeService(codeService: string | null | undefined): string {
        return (codeService || '').trim().toUpperCase();
    }

    /**
     * Filtre d’import : une seule ligne par **code service** dans le fichier (la première) ;
     * exclusion si ce code service existe déjà en base (liste + endpoint global pour les vues filtrées par pays).
     */
    private filterImportablePayloads(
        payloads: ImportPayload[],
        globalUsedCodeServices: Set<string> = new Set()
    ): {
        toImport: ImportPayload[];
        skippedDuplicates: string[];
    } {
        const existingCodeServices = new Set<string>(globalUsedCodeServices);
        for (const ref of this.references) {
            const cs = this.normalizeImportCodeService(ref.codeService);
            if (cs) {
                existingCodeServices.add(cs);
            }
        }

        const seenCodeServiceInFile = new Set<string>();
        const toImport: ImportPayload[] = [];
        const skippedDuplicates: string[] = [];

        for (const payload of payloads) {
            const normalizedPayload = this.normalizePayload(payload);
            const csNorm = this.normalizeImportCodeService(normalizedPayload.codeService);
            const detail = `Code service « ${csNorm || 'N/A'} »`;

            if (!csNorm) {
                skippedDuplicates.push(
                    `Ligne ${payload.rowNumber ?? '?'} : Ignorée — code service vide`
                );
                continue;
            }

            if (seenCodeServiceInFile.has(csNorm)) {
                skippedDuplicates.push(
                    `Ligne ${payload.rowNumber ?? '?'} : Ignorée — doublon dans le fichier (${detail})`
                );
                continue;
            }

            if (existingCodeServices.has(csNorm)) {
                skippedDuplicates.push(
                    `Ligne ${payload.rowNumber ?? '?'} : Ignorée — code service déjà présent en base (${detail})`
                );
                continue;
            }

            seenCodeServiceInFile.add(csNorm);
            toImport.push(payload);
        }

        return { toImport, skippedDuplicates };
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
        if (error.status === 429) {
            return 'Trop de requêtes (limite serveur). Patientez une minute ou réessayez ; l’import par lot limite ce cas.';
        }
        if (error.status === 403) {
            const m = error.error?.message;
            return typeof m === 'string' && m.length ? m : 'Accès refusé pour ce pays ou cette action.';
        }
        if (error.error) {
            if (typeof error.error === 'string') {
                return error.error;
            }
            if (error.error.message) {
                let msg = String(error.error.message);
                const fe = error.error.fieldErrors;
                if (fe && typeof fe === 'object') {
                    const parts = Object.entries(fe).map(([k, v]) => `${k}: ${v}`);
                    if (parts.length) {
                        msg += ' — ' + parts.join(' ; ');
                    }
                }
                return msg;
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

    /**
     * Normalise le code pays (CITCH -> CI, "EG EG" -> "EG")
     */
    private normalizeCountryCode(countryCode: string): string {
        if (!countryCode) return '';
        let normalized = (countryCode || '').toUpperCase().trim();
        
        // Si le code contient des espaces, prendre le premier mot
        if (normalized.includes(' ')) {
            normalized = normalized.split(' ')[0];
        }
        
        // CITCH = CI
        if (normalized === 'CITCH' || normalized.startsWith('CITCH')) {
            return 'CI';
        }
        return normalized;
    }

    /**
     * Retourne le drapeau (emoji) d'un pays à partir de son code
     */
    getCountryFlag(countryCode: string): string {
        const normalizedCode = this.normalizeCountryCode(countryCode);
        const flagMap: { [key: string]: string } = {
            'BF': '🇧🇫', 'BJ': '🇧🇯', 'CI': '🇨🇮', 'CM': '🇨🇲', 'GA': '🇬🇦', 'GN': '🇬🇳', 'KE': '🇰🇪', 'ML': '🇲🇱', 'MZ': '🇲🇿', 'NG': '🇳🇬', 'SN': '🇸🇳', 'TG': '🇹🇬',
            'CF': '🇨🇫', 'TD': '🇹🇩', 'CG': '🇨🇬', 'CD': '🇨🇩', 'GQ': '🇬🇶', 'ST': '🇸🇹', 'AO': '🇦🇴',
            'NE': '🇳🇪', 'GW': '🇬🇼', 'SL': '🇸🇱', 'LR': '🇱🇷', 'GH': '🇬🇭', 'MR': '🇲🇷', 'GM': '🇬🇲', 'CV': '🇨🇻',
            'TZ': '🇹🇿', 'UG': '🇺🇬', 'RW': '🇷🇼', 'BI': '🇧🇮', 'ET': '🇪🇹', 'SO': '🇸🇴', 'DJ': '🇩🇯', 'ER': '🇪🇷', 'SS': '🇸🇸', 'SD': '🇸🇩', 'SC': '🇸🇨', 'MU': '🇲🇺', 'KM': '🇰🇲', 'MG': '🇲🇬',
            'EG': '🇪🇬', 'ZA': '🇿🇦'
        };
        return flagMap[normalizedCode] || '🌍';
    }
}

