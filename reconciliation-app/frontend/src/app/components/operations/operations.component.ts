import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { Subscription } from 'rxjs';
import { OperationService } from '../../services/operation.service';
import { CompteService } from '../../services/compte.service';
import { Operation, OperationFilter, TypeOperation, StatutOperation, OperationUpdateRequest } from '../../models/operation.model';
import { Compte } from '../../models/compte.model';
import { PopupService } from '../../services/popup.service';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { MatSelect } from '@angular/material/select';

@Component({
    selector: 'app-operations',
    templateUrl: './operations.component.html',
    styleUrls: ['./operations.component.scss']
})
export class OperationsComponent implements OnInit, OnDestroy {
    operations: Operation[] = [];
    filteredOperations: Operation[] = [];
    pagedOperations: Operation[] = [];
    associatedFrais: Operation[] = []; // Frais associés aux opérations filtrées
    comptes: Compte[] = [];
    paysList: string[] = [];
    codeProprietaireList: string[] = [];
    banqueList: string[] = [];
    serviceList: string[] = [];
    addFormServiceList: string[] = []; // Services disponibles pour le formulaire d'ajout (cloisonnés par code propriétaire)
    referenceList: string[] = [];
    statutList: string[] = [];
    
    currentPage = 1;
    pageSize = 10;
    totalPages = 1;

    isLoading = false;
    isAdding = false;
    isUpdating = false;
    isExporting = false;
    showAddForm = false;
    showEditForm = false;

    addForm: FormGroup;
    editForm: FormGroup;
    filterForm: FormGroup;

    editingOperation: Operation | null = null;
    
    // Option pour la création avec 4 opérations
    useFourOperationsLogic = false;
    
    // Contrôles de recherche pour les formulaires de création/modification
    addFormTypeOperationSearchCtrl = new FormControl('');
    filteredAddFormTypeOperationList: string[] = [];
    addFormCodeProprietaireSearchCtrl = new FormControl('');
    filteredAddFormCodeProprietaireList: string[] = [];
    addFormServiceSearchCtrl = new FormControl('');
    filteredAddFormServiceList: string[] = [];
    
    editFormTypeOperationSearchCtrl = new FormControl('');
    filteredEditFormTypeOperationList: string[] = [];
    editFormServiceSearchCtrl = new FormControl('');
    filteredEditFormServiceList: string[] = [];

    typeOperations = Object.values(TypeOperation);
    statutOperations = Object.values(StatutOperation);

    totalOperations = 0;
    totalMontant = 0;
    montantMoyen = 0;
    operationsValidees = 0;

    // Nouvelles propriétés pour les statistiques par type
    statsByType: any = {};
    isLoadingStats = false;
    
    // Filtres pour les statistiques
    selectedPays: string[] = [];
    selectedCodeProprietaire: string = '';
    selectedCompteId: number | undefined = undefined;
    
    // Pagination des cartes de statistiques
    statsCardsPerPage = 3;
    currentStatsPage = 1;
    totalStatsPages = 1;
    
    // Navigation par étapes pour le formulaire de modification
    currentEditStep = 1;
    maxDate = new Date().toISOString().split('T')[0];
    
    // Propriétés pour le modal de détails d'opération
    showOperationDetailsModal = false;
    modalSelectedOperation: Operation | null = null;
    
    // Propriété pour les numéros de comptes (pour l'autocomplétion)
    get comptesNumeros(): string[] {
        return this.codeProprietaireList;
    }

    // Propriétés pour la sélection multiple
    selectedOperations: Set<number> = new Set();
    isSelectionMode = false;
    isDeletingMultiple = false;

    // Propriété pour les options de comptes avec ID et nom
    get compteOptions(): { value: number, label: string }[] {
        return this.comptes.map(c => ({
            value: c.id!,
            label: `${c.numeroCompte} - ${c.pays}`
        }));
    }

    filterTypeOptions = [
        { value: '', label: 'Tous' },
        { value: 'total_cashin', label: 'Total Cash-in' },
        { value: 'total_paiement', label: 'Total Paiement' },
        { value: 'Appro_client', label: 'Appro_client' },
        { value: 'Appro_fournisseur', label: 'Appro_fournisseur' },
        { value: 'ajustement', label: 'Ajustement' },
        { value: 'Compense_client', label: 'Compense_client' },
        { value: 'Compense_fournisseur', label: 'Compense_fournisseur' },
        { value: 'nivellement', label: 'Nivellement' },
        { value: 'régularisation_solde', label: 'Régularisation Solde' },
        { value: 'FRAIS_TRANSACTION', label: 'Frais Transaction' },
        { value: 'annulation_partenaire', label: 'Annulation Partenaire' },
        { value: 'annulation_bo', label: 'Annulation BO' },
        { value: 'transaction_cree', label: 'Transaction Créée' }
    ];

        // Ajout des contrôles de recherche
    typeOperationSearchCtrl = new FormControl('');
    filteredTypeOperationList: { value: string, label: string }[] = [];
    paysSearchCtrl = new FormControl('');
    filteredPaysList: string[] = [];
    statutSearchCtrl = new FormControl('');
    filteredStatutList: string[] = [];
    banqueSearchCtrl = new FormControl('');
    filteredBanqueList: string[] = [];
    codeProprietaireSearchCtrl = new FormControl('');
    filteredCodeProprietaireList: string[] = [];
    serviceSearchCtrl = new FormControl('');
    filteredServiceList: string[] = [];
    referenceSearchCtrl = new FormControl('');
    filteredReferenceList: string[] = [];
    compteSearchCtrl = new FormControl('');

    // ViewChild pour les selects des filtres
    @ViewChild('paysSelect') paysSelect!: MatSelect;
    @ViewChild('codeProprietaireSelect') codeProprietaireSelect!: MatSelect;
    @ViewChild('typeOperationSelect') typeOperationSelect!: MatSelect;
    @ViewChild('serviceSelect') serviceSelect!: MatSelect;
    @ViewChild('statutSelect') statutSelect!: MatSelect;
    @ViewChild('referenceSelect') referenceSelect!: MatSelect;
    // Remplacer la logique filteredComptesList pour qu'elle soit basée sur les codeProprietaire distincts des opérations
    get filteredComptesList(): string[] {
        return Array.from(new Set(this.operations.map(op => op.codeProprietaire).filter(c => !!c)));
    }

    // Propriétés pour la recherche dynamique
    searchService: string = '';
    searchCodeProprietaire: string = '';
    searchTypeOperation: string = '';
    searchBanque: string = '';
    filteredOperationsCount: number = 0;

    // Propriété pour gérer l'affichage automatique des frais
    showFraisAutomatically: boolean = false;

    private subscription = new Subscription();

    constructor(
        private operationService: OperationService,
        private compteService: CompteService,
        private fb: FormBuilder,
        private cdr: ChangeDetectorRef,
        private popupService: PopupService
    ) {
        this.addForm = this.fb.group({
            typeOperation: ['', [Validators.required]],
            montant: [0, [Validators.required]],
            pays: [{ value: '', disabled: true }],
            banque: [''],
            nomBordereau: [''],
            service: [''],
            reference: [''],
            codeProprietaire: ['', [Validators.required]],
            soldeAvant: [{ value: 0, disabled: true }],
            soldeApres: [{ value: 0, disabled: true }],
            dateOperation: [new Date().toISOString().split('T')[0], [Validators.required]]
        });

        this.editForm = this.fb.group({
            id: [null],
            typeOperation: ['', [Validators.required]],
            montant: [0, [Validators.required]],
            banque: [''],
            nomBordereau: [''],
            service: [''],
            reference: [''],
            dateOperation: ['', [Validators.required]]
        });

        this.filterForm = this.fb.group({
            typeOperation: [[]],
            pays: [[]],
            statut: [[]],
            banque: [[]],
            codeProprietaire: [[]],
            service: [[]],
            reference: [[]],
            dateDebut: [''],
            dateFin: ['']
        });

        this.addForm.get('montant')?.valueChanges.subscribe(() => this.calculateSoldeApres());
        this.addForm.get('typeOperation')?.valueChanges.subscribe(() => this.calculateSoldeApres());
        this.addForm.get('codeProprietaire')?.valueChanges.subscribe(() => this.onCodeProprietaireChange());

        // Dans le constructeur, ajouter le FormControl pour l'autocomplete
        // this.filterForm.addControl('codeProprietaireCtrl', new FormControl(''));
    }

    ngOnInit() {
        this.loadOperations();
        this.loadComptes();
        this.loadCodeProprietaireListFromBackend();
        this.loadBanqueListFromBackend();
        this.loadServiceListFromBackend();
        this.initializeStatutList();
        
        // Ajouter un délai pour vérifier l'état des listes
        setTimeout(() => {
            console.log('État des listes après 2 secondes:');
            console.log('codeProprietaireList:', this.codeProprietaireList);
            console.log('filteredCodeProprietaireList:', this.filteredCodeProprietaireList);
        }, 2000);
        
        this.filteredTypeOperationList = this.filterTypeOptions;
        this.typeOperationSearchCtrl.valueChanges.subscribe((search: string | null) => {
            const s = (search || '').toLowerCase();
            this.filteredTypeOperationList = this.filterTypeOptions.filter(opt => opt.label.toLowerCase().includes(s));
            if (this.filteredTypeOperationList.length === 1 && !this.filterForm.value.typeOperation.includes(this.filteredTypeOperationList[0].value)) {
                setTimeout(() => {
                this.filterForm.controls['typeOperation'].setValue([this.filteredTypeOperationList[0].value]);
                this.onFilterChange();
                }, 100);
            }
        });
        
        // Initialisation des contrôles de recherche pour les formulaires de création/modification
        this.initializeAddFormSearchControls();
        this.initializeEditFormSearchControls();
        this.paysSearchCtrl.valueChanges.subscribe((search: string | null) => {
            const s = (search || '').toLowerCase();
            const availablePays = this.getFilteredPays();
            this.filteredPaysList = availablePays.filter(p => p.toLowerCase().includes(s));
            if (this.filteredPaysList.length === 1 && !this.filterForm.value.pays.includes(this.filteredPaysList[0])) {
                setTimeout(() => {
                this.filterForm.controls['pays'].setValue([this.filteredPaysList[0]]);
                this.onFilterChange();
                }, 100);
            }
        });
        this.statutSearchCtrl.valueChanges.subscribe((search: string | null) => {
            const s = (search || '').toLowerCase();
            this.filteredStatutList = this.statutList.filter(st => st.toLowerCase().includes(s));
            if (this.filteredStatutList.length === 1 && !this.filterForm.value.statut.includes(this.filteredStatutList[0])) {
                setTimeout(() => {
                this.filterForm.controls['statut'].setValue([this.filteredStatutList[0]]);
                this.onFilterChange();
                }, 100);
            }
        });
        this.banqueSearchCtrl.valueChanges.subscribe((search: string | null) => {
            const s = (search || '').toLowerCase();
            const availableBanques = this.getFilteredBanques();
            this.filteredBanqueList = availableBanques.filter(b => b.toLowerCase().includes(s));
            if (this.filteredBanqueList.length === 1 && !this.filterForm.value.banque.includes(this.filteredBanqueList[0])) {
                setTimeout(() => {
                this.filterForm.controls['banque'].setValue([this.filteredBanqueList[0]]);
                this.onFilterChange();
                }, 100);
            }
        });
        this.codeProprietaireSearchCtrl.valueChanges.subscribe((search: string | null) => {
            const s = (search || '').toLowerCase();
            const availableCodes = this.getFilteredCodeProprietaire();
            this.filteredCodeProprietaireList = availableCodes.filter(c => c.toLowerCase().includes(s));
            if (this.filteredCodeProprietaireList.length === 1 && !this.filterForm.value.codeProprietaire.includes(this.filteredCodeProprietaireList[0])) {
                setTimeout(() => {
                this.filterForm.controls['codeProprietaire'].setValue([this.filteredCodeProprietaireList[0]]);
                this.onFilterChange();
                }, 100);
            }
        });
        this.serviceSearchCtrl.valueChanges.subscribe((search: string | null) => {
            const s = (search || '').toLowerCase();
            const availableServices = this.getFilteredServices();
            this.filteredServiceList = availableServices.filter(serv => serv.toLowerCase().includes(s));
            if (this.filteredServiceList.length === 1 && !this.filterForm.value.service.includes(this.filteredServiceList[0])) {
                setTimeout(() => {
                this.filterForm.controls['service'].setValue([this.filteredServiceList[0]]);
                this.onFilterChange();
                }, 100);
            }
        });
        this.referenceSearchCtrl.valueChanges.subscribe((search: string | null) => {
            const s = (search || '').toLowerCase();
            const availableReferences = this.getFilteredReference();
            this.filteredReferenceList = availableReferences.filter(ref => ref.toLowerCase().includes(s));
            if (this.filteredReferenceList.length === 1 && !this.filterForm.value.reference.includes(this.filteredReferenceList[0])) {
                setTimeout(() => {
                this.filterForm.controls['reference'].setValue([this.filteredReferenceList[0]]);
                this.onFilterChange();
                }, 100);
            }
        });
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }

    loadOperations() {
        this.isLoading = true;
        this.operationService.getAllOperations().subscribe({
            next: (operations) => {
                setTimeout(() => {
                this.operations = operations;
                this.filteredOperations = operations;
                this.associatedFrais = []; // Initialiser les frais associés
                this.addFormServiceList = this.serviceList; // Initialiser les services pour le formulaire d'ajout
                this.updatePagedOperations();
                this.calculateStats();
                this.loadReferenceListFromOperations();
                
                // Charger les listes pour les filtres
                this.loadPaysList();
                this.loadCodeProprietaireList();
                this.loadBanqueList();
                this.loadServiceList();
                
                // Initialiser les listes filtrées après avoir chargé toutes les données
                this.initializeFilteredLists();
                this.isLoading = false;
                
                console.log(`Opérations chargées: ${operations.length} opérations`);
                console.log('Listes chargées:', {
                    paysList: this.paysList.length,
                    codeProprietaireList: this.codeProprietaireList.length
                });
                }, 100);
            },
            error: (err) => {
                console.error('Erreur lors du chargement des opérations:', err);
                this.isLoading = false;
            }
        });
    }

    refreshData() {
        this.loadOperations();
        this.initializeFilteredLists();
    }

    // Méthodes pour les filtres améliorés
    hasActiveFilters(): boolean {
        const formValue = this.filterForm.value;
        return Object.values(formValue).some(value => 
            Array.isArray(value) ? value.length > 0 : !!value
        );
    }

    getActiveFiltersCount(): number {
        const formValue = this.filterForm.value;
        let count = 0;
        Object.values(formValue).forEach(value => {
            if (Array.isArray(value) && value.length > 0) {
                count += value.length;
            } else if (value && !Array.isArray(value)) {
                count++;
            }
        });
        return count;
    }

    getSelectedCount(fieldName: string): number {
        const field = this.filterForm.get(fieldName);
        if (field && Array.isArray(field.value)) {
            return field.value.length;
        }
        return 0;
    }

    // Propriété pour afficher les champs de date personnalisés
    get showCustomDateInputs(): boolean {
        return this.filterForm.get('dateDebut')?.value || this.filterForm.get('dateFin')?.value;
    }

    // Propriétés pour le tri
    sortField: string = 'dateOperation';
    sortDirection: 'asc' | 'desc' = 'desc';
    selectedOperation: Operation | null = null;

    // Méthodes pour le tri et la sélection
    sortBy(field: string) {
        if (this.sortField === field) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortField = field;
            this.sortDirection = 'asc';
        }
        this.applySorting();
    }

    applySorting() {
        this.filteredOperations.sort((a, b) => {
            let aValue = a[this.sortField as keyof Operation];
            let bValue = b[this.sortField as keyof Operation];

            if (aValue === null || aValue === undefined) aValue = '';
            if (bValue === null || bValue === undefined) bValue = '';

            if (typeof aValue === 'string' && typeof bValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        this.updatePagedOperations();
    }

    selectOperation(operation: Operation) {
        this.selectedOperation = this.selectedOperation?.id === operation.id ? null : operation;
    }

    viewOperationDetails(operation: Operation) {
        this.modalSelectedOperation = operation;
        this.showOperationDetailsModal = true;
    }

    closeOperationDetailsModal(): void {
        this.showOperationDetailsModal = false;
        this.modalSelectedOperation = null;
    }

    // Méthodes utilitaires pour le modal de détails
    formatDate(date: string): string {
        if (!date) return 'Non spécifiée';
        return new Date(date).toLocaleDateString('fr-FR');
    }

    getStatusClass(statut: string): string {
        switch (statut) {
            case 'Validée': return 'validated';
            case 'En attente': return 'pending';
            case 'Rejetée': return 'rejected';
            case 'Annulée': return 'cancelled';
            case 'En cours': return 'in-progress';
            default: return 'default';
        }
    }

    getAmountClass(montant: number): string {
        return montant > 0 ? 'positive' : montant < 0 ? 'negative' : 'neutral';
    }

    getVariationClass(variation: number): string {
        return variation > 0 ? 'positive' : variation < 0 ? 'negative' : 'neutral';
    }

    getOperationTypeClass(type: string): string {
        switch (type) {
            case 'total_cashin': return 'cashin';
            case 'total_paiement': return 'paiement';
            case 'Appro_client': return 'appro-client';
            case 'Appro_fournisseur': return 'appro-fournisseur';
            case 'ajustement': return 'ajustement';
            case 'Compense_client': return 'compense-client';
            case 'Compense_fournisseur': return 'compense-fournisseur';
            case 'nivellement': return 'nivellement';
            case 'régularisation_solde': return 'regularisation';
            case 'FRAIS_TRANSACTION': return 'frais';
            case 'annulation_partenaire': return 'annulation-partenaire';
            case 'annulation_bo': return 'annulation-bo';
            case 'transaction_cree': return 'transaction-cree';
            default: return 'default';
        }
    }

    getOperationTypeIcon(type: string): string {
        switch (type) {
            case 'total_cashin': return 'fa-money-bill-wave';
            case 'total_paiement': return 'fa-credit-card';
            case 'Appro_client': return 'fa-user-plus';
            case 'Appro_fournisseur': return 'fa-truck';
            case 'ajustement': return 'fa-balance-scale';
            case 'Compense_client': return 'fa-exchange-alt';
            case 'Compense_fournisseur': return 'fa-exchange-alt';
            case 'nivellement': return 'fa-level-up-alt';
            case 'régularisation_solde': return 'fa-calculator';
            case 'FRAIS_TRANSACTION': return 'fa-percentage';
            case 'annulation_partenaire': return 'fa-times-circle';
            case 'annulation_bo': return 'fa-ban';
            case 'transaction_cree': return 'fa-plus-circle';
            default: return 'fa-cog';
        }
    }

    getOperationTypeLabel(type: string): string {
        switch (type) {
            case 'total_cashin': return 'Total Cash-in';
            case 'total_paiement': return 'Total Paiement';
            case 'Appro_client': return 'Approvisionnement Client';
            case 'Appro_fournisseur': return 'Approvisionnement Fournisseur';
            case 'ajustement': return 'Ajustement';
            case 'Compense_client': return 'Compensation Client';
            case 'Compense_fournisseur': return 'Compensation Fournisseur';
            case 'nivellement': return 'Nivellement';
            case 'régularisation_solde': return 'Régularisation de Solde';
            case 'FRAIS_TRANSACTION': return 'Frais de Transaction';
            case 'annulation_partenaire': return 'Annulation Partenaire';
            case 'annulation_bo': return 'Annulation BO';
            case 'transaction_cree': return 'Transaction Créée';
            default: return type;
        }
    }

    getOperationTypeDescription(type: string): string {
        switch (type) {
            case 'total_cashin': return 'Opération de versement d\'argent sur le compte';
            case 'total_paiement': return 'Opération de paiement ou retrait d\'argent';
            case 'Appro_client': return 'Approvisionnement du compte client';
            case 'Appro_fournisseur': return 'Approvisionnement du compte fournisseur';
            case 'ajustement': return 'Ajustement manuel du solde';
            case 'Compense_client': return 'Compensation entre comptes clients';
            case 'Compense_fournisseur': return 'Compensation entre comptes fournisseurs';
            case 'nivellement': return 'Nivellement de solde entre comptes';
            case 'régularisation_solde': return 'Régularisation automatique du solde';
            case 'FRAIS_TRANSACTION': return 'Application de frais de transaction';
            case 'annulation_partenaire': return 'Annulation d\'opération partenaire';
            case 'annulation_bo': return 'Annulation de bordereau';
            case 'transaction_cree': return 'Nouvelle transaction créée';
            default: return 'Type d\'opération non spécifié';
        }
    }

    exportOperationDetails(operation: Operation): void {
        try {
            const data = {
                'ID': operation.id,
                'Type d\'Opération': this.getOperationTypeLabel(operation.typeOperation),
                'Date d\'Opération': this.formatDate(operation.dateOperation),
                'Statut': operation.statut,
                'Montant': operation.montant.toFixed(2),
                'Solde Avant': operation.soldeAvant.toFixed(2),
                'Solde Après': operation.soldeApres.toFixed(2),
                'Variation de Solde': (operation.soldeApres - operation.soldeAvant).toFixed(2),
                'Code Propriétaire': operation.codeProprietaire,
                'Pays': operation.pays,
                'Service': operation.service || 'Non spécifié',
                'Banque': operation.banque || 'Non spécifiée',
                'Nom Bordereau': operation.nomBordereau || 'Non spécifié',
                'Référence': operation.reference || 'Non spécifiée',
                'ID Compte': operation.compteId || 'Non spécifié',
                'ID Opération Parent': operation.parentOperationId || 'Non spécifié'
            };

            const csvContent = Object.entries(data)
                .map(([key, value]) => `${key};${value}`)
                .join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `operation_details_${operation.id}_${new Date().toISOString().slice(0, 10)}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            this.popupService.showSuccess('Export terminé avec succès !', 'Export Réussi');
        } catch (error) {
            console.error('Erreur lors de l\'export:', error);
            this.popupService.showError('Erreur lors de l\'export des données', 'Erreur d\'Export');
        }
    }

    trackByOperation(index: number, operation: Operation): number {
        return operation.id || index;
    }

    loadComptes() {
        this.compteService.getAllComptes().subscribe(data => {
            this.comptes = data;
        });
    }

    loadPaysList() {
        setTimeout(() => {
        this.paysList = [...new Set(this.operations.map(op => op.pays))].sort();
        this.filteredPaysList = this.paysList.slice();
        this.filteredAddFormCodeProprietaireList = this.codeProprietaireList.slice();
        }, 100);
    }

    loadCodeProprietaireList() {
        setTimeout(() => {
        this.codeProprietaireList = [...new Set(this.operations.map(op => op.codeProprietaire).filter(code => code !== undefined))] as string[];
        this.filteredCodeProprietaireList = this.codeProprietaireList.slice();
        this.filteredAddFormCodeProprietaireList = this.codeProprietaireList.slice();
        }, 100);
    }

    loadBanqueList() {
        setTimeout(() => {
        this.banqueList = [...new Set(this.operations.map(op => op.banque).filter(banque => banque !== undefined))] as string[];
        }, 100);
    }

    loadServiceList() {
        setTimeout(() => {
        this.serviceList = [...new Set(this.operations.map(op => op.service).filter(service => service !== undefined))] as string[];
        }, 100);
    }

    loadCodeProprietaireListFromBackend() {
        console.log('Chargement des codes propriétaires depuis le backend...');
        this.subscription.add(
            this.operationService.getDistinctCodeProprietaire().subscribe({
                next: (codes: string[]) => {
                    console.log('Codes propriétaires reçus:', codes);
                    this.codeProprietaireList = codes;
                    
                    // Mettre à jour les listes filtrées avec cloisonnement
                    setTimeout(() => {
                        this.updateFilteredLists();
                    }, 100);
                    
                    console.log('codeProprietaireList mis à jour:', this.codeProprietaireList);
                    console.log('filteredCodeProprietaireList mis à jour:', this.filteredCodeProprietaireList);
                },
                error: (error: any) => {
                    console.error('Erreur lors du chargement de la liste des codes propriétaires:', error);
                }
            })
        );
    }
    
    loadBanqueListFromBackend() {
        this.subscription.add(
            this.operationService.getDistinctBanque().subscribe({
                next: (banques: string[]) => {
                    this.banqueList = banques;
                    
                    // Mettre à jour les listes filtrées avec cloisonnement
                    setTimeout(() => {
                        this.updateFilteredLists();
                    }, 100);
                },
                error: (error: any) => {
                    console.error('Erreur lors du chargement de la liste des banques:', error);
                }
            })
        );
    }

    loadServiceListFromBackend() {
        this.operationService.getDistinctService().subscribe({
            next: (services) => {
                this.serviceList = services;
                this.addFormServiceList = services; // Initialiser aussi pour le formulaire d'ajout
                this.filteredAddFormServiceList = services.slice();
                this.filteredEditFormServiceList = services.slice();
            },
            error: (err) => {
                console.error('Erreur lors du chargement des services:', err);
                this.serviceList = [];
                this.addFormServiceList = [];
                this.filteredAddFormServiceList = [];
                this.filteredEditFormServiceList = [];
            }
        });
    }

    loadServicesByCodeProprietaire(codeProprietaire: string) {
        console.log('Chargement des services pour le code propriétaire:', codeProprietaire);
        
        this.operationService.getDistinctServiceByCodeProprietaire(codeProprietaire).subscribe({
            next: (services) => {
                this.addFormServiceList = services;
                this.filteredAddFormServiceList = services.slice();
                console.log('Services filtrés chargés:', services);
                
                // Réinitialiser le service sélectionné s'il n'est plus dans la liste filtrée
                const currentService = this.addForm.get('service')?.value;
                if (currentService && !services.includes(currentService)) {
                    this.addForm.patchValue({ service: '' });
                    console.log('Service réinitialisé car non disponible pour ce code propriétaire');
                }
            },
            error: (err) => {
                console.error('Erreur lors du chargement des services filtrés:', err);
                // En cas d'erreur, utiliser la liste complète
                this.addFormServiceList = this.serviceList;
                this.filteredAddFormServiceList = this.serviceList.slice();
            }
        });
    }

    loadReferenceListFromOperations() {
        if (this.operations && this.operations.length > 0) {
            setTimeout(() => {
            this.referenceList = [...new Set(this.operations.map(op => op.reference).filter((r): r is string => r !== undefined && r !== null && r !== ''))];
            this.filteredReferenceList = this.referenceList;
            }, 100);
        }
    }

    loadStatsByType() {
        this.isLoadingStats = true;
        
        // Calculer les statistiques basées sur les opérations filtrées
        const stats: any = {};
        
        this.filteredOperations.forEach(op => {
            const type = op.typeOperation || 'Inconnu';
            if (!stats[type]) {
                stats[type] = { count: 0, totalAmount: 0 };
            }
            
            stats[type].count++;
            stats[type].totalAmount += op.montant || 0;
        });
        
        this.statsByType = stats;
        this.isLoadingStats = false;
        
        // Recalculer la pagination des cartes de statistiques
        this.totalStatsPages = Math.ceil(this.getOperationTypes().length / this.statsCardsPerPage);
        if (this.currentStatsPage > this.totalStatsPages) {
            this.currentStatsPage = 1;
        }
        
        console.log('Statistiques par type calculées:', this.statsByType);
    }

    applyStatsFilters() {
        // Appliquer les filtres aux statistiques
        this.loadStatsByType();
    }

    clearStatsFilters() {
        // Effacer les filtres de statistiques
        this.selectedPays = [];
        this.selectedCodeProprietaire = '';
        this.selectedCompteId = undefined;
        this.loadStatsByType();
    }

    onCodeProprietaireChange() {
        const codeProprietaire = this.addForm.get('codeProprietaire')?.value;
        console.log('onCodeProprietaireChange appelé avec:', codeProprietaire);
        console.log('Comptes disponibles:', this.comptes);
        
        const selectedCompte = this.comptes.find(c => c.numeroCompte === codeProprietaire);
        console.log('Compte sélectionné:', selectedCompte);
        
        if (selectedCompte) {
            this.addForm.patchValue({
                pays: selectedCompte.pays,
                soldeAvant: selectedCompte.solde
            });
            this.calculateSoldeApres();
            console.log('Champs mis à jour avec:', {
                pays: selectedCompte.pays,
                soldeAvant: selectedCompte.solde
            });
            
            // Charger les services filtrés par code propriétaire
            this.loadServicesByCodeProprietaire(codeProprietaire);
            
            // Mettre à jour la liste filtrée des services
            this.filteredAddFormServiceList = this.addFormServiceList.slice();
        } else {
            // Si aucun compte n'est trouvé, réinitialiser les champs
            this.addForm.patchValue({
                pays: '',
                soldeAvant: 0,
                service: '' // Réinitialiser aussi le service
            });
            
            // Réinitialiser la liste des services
            this.addFormServiceList = this.serviceList;
            this.filteredAddFormServiceList = this.serviceList.slice();
        }
    }

    onCompteChange() {
        const compteNumero = this.addForm.get('compteId')?.value;
        console.log('onCompteChange appelé avec:', compteNumero);
        console.log('Comptes disponibles:', this.comptes);
        
        const selectedCompte = this.comptes.find(c => c.numeroCompte === compteNumero);
        console.log('Compte sélectionné:', selectedCompte);
        
        if (selectedCompte) {
            this.addForm.patchValue({
                pays: selectedCompte.pays,
                codeProprietaire: selectedCompte.numeroCompte,
                soldeAvant: selectedCompte.solde
            });
            this.calculateSoldeApres();
            console.log('Champs mis à jour avec:', {
                pays: selectedCompte.pays,
                codeProprietaire: selectedCompte.numeroCompte,
                soldeAvant: selectedCompte.solde
            });
        } else {
            // Si aucun compte n'est sélectionné, réinitialiser les champs
            this.addForm.patchValue({
                pays: '',
                codeProprietaire: '',
                soldeAvant: 0
            });
        }
    }

    calculateSoldeApres() {
        const soldeAvant = this.addForm.get('soldeAvant')?.value || 0;
        const montant = this.addForm.get('montant')?.value || 0;
        const typeOperation = this.addForm.get('typeOperation')?.value;
        let soldeApres = soldeAvant;

        // Logique inversée : total_cashin débite, total_paiement crédite
        if (typeOperation === 'total_cashin') {
            soldeApres = soldeAvant - montant;
        } else if (typeOperation === 'total_paiement') {
            soldeApres = soldeAvant + montant;
        } else if (typeOperation === 'Appro_client') {
            soldeApres = soldeAvant + montant;
        } else if (typeOperation === 'Appro_fournisseur') {
            soldeApres = soldeAvant + montant;
        } else if (typeOperation === 'Compense_client') {
            soldeApres = soldeAvant - montant;
        } else if (typeOperation === 'Compense_fournisseur') {
            soldeApres = soldeAvant - montant;
        } else if (typeOperation === 'nivellement') {
            soldeApres = soldeAvant + montant; // Nivellement peut être positif ou négatif selon le montant
        } else if (typeOperation === 'régularisation_solde') {
            soldeApres = soldeAvant + montant; // Régularisation peut être positif ou négatif selon le montant
        } else if (typeOperation === 'ajustement') {
            soldeApres = soldeAvant + montant;
        } else if (typeOperation === 'annulation_partenaire' || typeOperation === 'annulation_bo' || typeOperation === 'transaction_cree') {
            soldeApres = soldeAvant - montant;
        } else {
            soldeApres = soldeAvant - montant;
        }

        this.addForm.patchValue({ soldeApres });
    }

    addOperation() {
        if (this.addForm.invalid) return;
        this.isAdding = true;

        const formData = this.addForm.getRawValue();
        
        // Find the compte ID from the code propriétaire
        const selectedCompte = this.comptes.find(c => c.numeroCompte === formData.codeProprietaire);
        if (!selectedCompte) {
            console.error('Compte non trouvé pour le code propriétaire:', formData.codeProprietaire);
            this.isAdding = false;
            return;
        }

        // Règle métier pour annulation BO
        if (formData.typeOperation === 'annulation_bo') {
          if (formData.service && formData.service.toLowerCase().includes('cashin')) {
            // Montant positif (crédit)
            formData.montant = Math.abs(formData.montant);
          } else if (formData.service && formData.service.toLowerCase().includes('paiement')) {
            // Montant négatif (débit)
            formData.montant = -Math.abs(formData.montant);
          }
        }

        const newOperation = {
            compteId: selectedCompte.id!,
            typeOperation: formData.typeOperation,
            montant: formData.montant,
            banque: formData.banque,
            nomBordereau: formData.nomBordereau,
            service: formData.service,
            reference: formData.reference,
            dateOperation: formData.dateOperation
        };

        // Choisir la méthode de création selon l'option sélectionnée
        const createOperation$ = this.useFourOperationsLogic && 
                                 this.shouldUseFourOperationsLogic(formData.typeOperation, formData.service) ?
            this.operationService.createOperationWithFourOperations(newOperation) :
            this.operationService.createOperation(newOperation);

        createOperation$.subscribe({
            next: (op) => {
                this.loadOperations();
                this.loadComptes();
                this.cancelAdd();
                // Effacer la recherche dynamique après ajout réussi
                this.clearDynamicSearch();
                
                // Afficher un message informatif si les 4 opérations ont été créées
                if (this.useFourOperationsLogic && this.shouldUseFourOperationsLogic(formData.typeOperation, formData.service)) {
                    this.popupService.showSuccess('Opération créée avec succès !', 
                        '4 opérations ont été générées : 2 opérations nominales (agence + service) et 2 opérations de frais associées.');
                }
            },
            error: (err) => {
                console.error('Erreur ajout opération', err);
                this.popupService.showError('Erreur lors de la création', 'Une erreur est survenue lors de la création de l\'opération.');
            }
        }).add(() => this.isAdding = false);
    }
    
    /**
     * Détermine si la logique des 4 opérations doit être utilisée
     */
    shouldUseFourOperationsLogic(typeOperation: string, service: string): boolean {
        return (typeOperation === 'total_cashin' || 
                typeOperation === 'total_paiement' ||
                typeOperation === 'annulation_bo' ||
                typeOperation === 'transaction_cree') && 
               service && service.trim() !== '';
    }
    
    /**
     * Initialise les contrôles de recherche pour le formulaire de création
     */
    private initializeAddFormSearchControls() {
        // Initialiser les listes filtrées
        this.filteredAddFormTypeOperationList = this.typeOperations.slice();
        this.filteredAddFormCodeProprietaireList = this.codeProprietaireList.slice();
        this.filteredAddFormServiceList = this.addFormServiceList.slice();
        
        // Contrôle de recherche pour le type d'opération
        this.addFormTypeOperationSearchCtrl.valueChanges.subscribe((search: string | null) => {
            const s = (search || '').toLowerCase();
            this.filteredAddFormTypeOperationList = this.typeOperations.filter(type => 
                type.toLowerCase().includes(s)
            );
        });
        
        // Contrôle de recherche pour le code propriétaire
        this.addFormCodeProprietaireSearchCtrl.valueChanges.subscribe((search: string | null) => {
            const s = (search || '').toLowerCase();
            this.filteredAddFormCodeProprietaireList = this.codeProprietaireList.filter(code => 
                code.toLowerCase().includes(s)
            );
        });
        
        // Contrôle de recherche pour le service
        this.addFormServiceSearchCtrl.valueChanges.subscribe((search: string | null) => {
            const s = (search || '').toLowerCase();
            this.filteredAddFormServiceList = this.addFormServiceList.filter(service => 
                service.toLowerCase().includes(s)
            );
        });
    }
    
    /**
     * Initialise les contrôles de recherche pour le formulaire de modification
     */
    private initializeEditFormSearchControls() {
        // Initialiser les listes filtrées
        this.filteredEditFormTypeOperationList = this.typeOperations.slice();
        this.filteredEditFormServiceList = this.addFormServiceList.slice();
        
        // Contrôle de recherche pour le type d'opération
        this.editFormTypeOperationSearchCtrl.valueChanges.subscribe((search: string | null) => {
            const s = (search || '').toLowerCase();
            this.filteredEditFormTypeOperationList = this.typeOperations.filter(type => 
                type.toLowerCase().includes(s)
            );
        });
        
        // Contrôle de recherche pour le service
        this.editFormServiceSearchCtrl.valueChanges.subscribe((search: string | null) => {
            const s = (search || '').toLowerCase();
            this.filteredEditFormServiceList = this.addFormServiceList.filter(service => 
                service.toLowerCase().includes(s)
            );
        });
    }

    cancelAdd() {
        this.showAddForm = false;
        this.addForm.reset();
        // Réinitialiser la liste des services pour le formulaire d'ajout
        this.addFormServiceList = this.serviceList;
        this.filteredAddFormServiceList = this.serviceList.slice();
        // Réinitialiser les contrôles de recherche
        this.addFormTypeOperationSearchCtrl.setValue('');
        this.addFormCodeProprietaireSearchCtrl.setValue('');
        this.addFormServiceSearchCtrl.setValue('');
        // Effacer aussi la recherche dynamique
        this.clearDynamicSearch();
    }

    editOperation(operation: Operation) {
        this.editingOperation = { ...operation };
        this.editForm.patchValue(this.editingOperation);
        this.showEditForm = true;
        this.showAddForm = false;
        this.currentEditStep = 1; // Réinitialiser à la première étape
        
        // Initialiser les listes filtrées pour le formulaire de modification
        this.filteredEditFormTypeOperationList = this.typeOperations.slice();
        this.filteredEditFormServiceList = this.addFormServiceList.slice();
    }

    // Méthodes pour la navigation par étapes
    setEditStep(step: number) {
        if (step >= 1 && step <= 3) {
            this.currentEditStep = step;
        }
    }

    nextEditStep() {
        if (this.currentEditStep < 3 && this.canProceedToNextStep()) {
            this.currentEditStep++;
        }
    }

    previousEditStep() {
        if (this.currentEditStep > 1) {
            this.currentEditStep--;
        }
    }

    canProceedToNextStep(): boolean {
        switch (this.currentEditStep) {
            case 1:
                return !!(this.editForm.get('typeOperation')?.valid && 
                       this.editForm.get('dateOperation')?.valid);
            case 2:
                return !!this.editForm.get('montant')?.valid;
            case 3:
                return !!this.editForm.valid;
            default:
                return false;
        }
    }

    // Méthodes pour l'aperçu financier
    getImpactDirection(): 'positive' | 'negative' {
        const montant = this.editForm.get('montant')?.value || 0;
        const typeOperation = this.editForm.get('typeOperation')?.value;
        
        if (typeOperation === 'Appro_client' || typeOperation === 'Appro_fournisseur' || typeOperation === 'total_paiement') {
            return montant >= 0 ? 'positive' : 'negative';
        } else if (typeOperation === 'total_cashin' || typeOperation === 'Compense_client' || typeOperation === 'Compense_fournisseur' || typeOperation === 'annulation_partenaire' || 
                   typeOperation === 'annulation_bo' || typeOperation === 'transaction_cree') {
            return montant <= 0 ? 'positive' : 'negative';
        } else {
            return montant >= 0 ? 'positive' : 'negative';
        }
    }

    calculateNewSoldeApres(): number {
        const soldeAvant = this.editingOperation?.soldeAvant || 0;
        const montant = this.editForm.get('montant')?.value || 0;
        const typeOperation = this.editForm.get('typeOperation')?.value;
        
        let impact = 0;
        if (typeOperation === 'Appro_client' || typeOperation === 'Appro_fournisseur' || typeOperation === 'total_paiement') {
            impact = montant;
        } else if (typeOperation === 'total_cashin' || typeOperation === 'Compense_client' || typeOperation === 'Compense_fournisseur' || typeOperation === 'annulation_partenaire' || 
                   typeOperation === 'annulation_bo' || typeOperation === 'transaction_cree') {
            impact = -Math.abs(montant);
        } else {
            impact = montant; // Ajustement, nivellement, régularisation_solde
        }
        
        return soldeAvant + impact;
    }

    onMontantChange() {
        // Déclencher la mise à jour de l'aperçu
        this.editForm.updateValueAndValidity();
    }

    showWarningMessage(): boolean {
        const newSolde = this.calculateNewSoldeApres();
        return newSolde < 0;
    }

    getWarningMessage(): string {
        const newSolde = this.calculateNewSoldeApres();
        if (newSolde < 0) {
            return `Attention : Cette modification résultera en un solde négatif de ${Math.abs(newSolde).toLocaleString()} XAF.`;
        }
        return '';
    }

    // Méthodes pour le modal d'ajout
    closeAddModal(event: Event) {
        if (event.target === event.currentTarget) {
            this.cancelAdd();
        }
    }

    // Méthodes pour le modal de modification
    closeEditModal(event: Event) {
        if (event.target === event.currentTarget) {
            this.cancelEdit();
        }
    }

    getAddImpactDirection(): 'positive' | 'negative' {
        const montant = this.addForm.get('montant')?.value || 0;
        const typeOperation = this.addForm.get('typeOperation')?.value;
        
        if (typeOperation === 'Appro_client' || typeOperation === 'Appro_fournisseur' || typeOperation === 'total_paiement') {
            return montant >= 0 ? 'positive' : 'negative';
        } else if (typeOperation === 'total_cashin' || typeOperation === 'Compense_client' || typeOperation === 'Compense_fournisseur' || typeOperation === 'annulation_partenaire' || 
                   typeOperation === 'annulation_bo' || typeOperation === 'transaction_cree') {
            return montant <= 0 ? 'positive' : 'negative';
        } else {
            return montant >= 0 ? 'positive' : 'negative';
        }
    }

    calculateAddSoldeApres(): number {
        const soldeAvant = this.addForm.get('soldeAvant')?.value || 0;
        const montant = this.addForm.get('montant')?.value || 0;
        const typeOperation = this.addForm.get('typeOperation')?.value;
        
        let impact = 0;
        if (typeOperation === 'Appro_client' || typeOperation === 'Appro_fournisseur' || typeOperation === 'total_paiement') {
            impact = montant;
        } else if (typeOperation === 'total_cashin' || typeOperation === 'Compense_client' || typeOperation === 'Compense_fournisseur' || typeOperation === 'annulation_partenaire' || 
                   typeOperation === 'annulation_bo' || typeOperation === 'transaction_cree') {
            impact = -Math.abs(montant);
        } else {
            impact = montant; // Ajustement, nivellement, régularisation_solde
        }
        
        return soldeAvant + impact;
    }

    onAddMontantChange() {
        // Déclencher la mise à jour de l'aperçu
        this.addForm.updateValueAndValidity();
    }

    showAddWarningMessage(): boolean {
        const newSolde = this.calculateAddSoldeApres();
        return newSolde < 0;
    }

    getAddWarningMessage(): string {
        const newSolde = this.calculateAddSoldeApres();
        if (newSolde < 0) {
            return `Attention : Cette opération résultera en un solde négatif de ${Math.abs(newSolde).toLocaleString()} XAF.`;
        }
        return '';
    }

    cancelEdit() {
        this.showEditForm = false;
        this.editingOperation = null;
        this.editForm.reset();
        // Réinitialiser les contrôles de recherche
        this.editFormTypeOperationSearchCtrl.setValue('');
        this.editFormServiceSearchCtrl.setValue('');
    }

    updateOperation() {
        if (!this.editForm.valid || !this.editingOperation?.id) return;
        
        this.isUpdating = true;
        
        const updateRequest: OperationUpdateRequest = {
            typeOperation: this.editForm.value.typeOperation,
            montant: this.editForm.value.montant,
            banque: this.editForm.value.banque,
            nomBordereau: this.editForm.value.nomBordereau,
            service: this.editForm.value.service,
            reference: this.editForm.value.reference,
            dateOperation: this.editForm.value.dateOperation
        };

        // Règle métier pour annulation BO lors de la modification
        if (updateRequest.typeOperation === 'annulation_bo') {
          if (updateRequest.service && updateRequest.service.toLowerCase().includes('cashin')) {
            updateRequest.montant = Math.abs(updateRequest.montant ?? 0);
          } else if (updateRequest.service && updateRequest.service.toLowerCase().includes('paiement')) {
            updateRequest.montant = -Math.abs(updateRequest.montant ?? 0);
          }
        }

        this.operationService.updateOperation(this.editingOperation.id, updateRequest).subscribe({
            next: () => {
                this.loadOperations();
                this.loadComptes();
                this.cancelEdit();
                this.isUpdating = false;
            },
            error: (err) => {
                console.error('Erreur mise à jour opération', err);
                this.isUpdating = false;
            }
        });
    }

    deleteOperation(id: number) {
        if (confirm('Êtes-vous sûr de vouloir supprimer cette opération ?')) {
            this.operationService.deleteOperation(id).subscribe({
                next: () => {
                    this.loadOperations();
                },
                error: (err) => {
                    console.error('Erreur lors de la suppression', err);
                }
            });
        }
    }

    // Méthodes pour la sélection multiple
    toggleSelectionMode() {
        this.isSelectionMode = !this.isSelectionMode;
        if (!this.isSelectionMode) {
            this.selectedOperations.clear();
        }
    }

    toggleOperationSelection(operationId: number) {
        if (this.selectedOperations.has(operationId)) {
            this.selectedOperations.delete(operationId);
        } else {
            this.selectedOperations.add(operationId);
        }
    }

    selectAllOperations() {
        this.pagedOperations.forEach(op => {
            if (op.id) {
                this.selectedOperations.add(op.id);
            }
        });
    }

    deselectAllOperations() {
        this.selectedOperations.clear();
    }

    isOperationSelected(operationId: number): boolean {
        return this.selectedOperations.has(operationId);
    }

    get selectedOperationsCount(): number {
        return this.selectedOperations.size;
    }

    get hasSelectedOperations(): boolean {
        return this.selectedOperations.size > 0;
    }

    deleteSelectedOperations() {
        if (this.selectedOperations.size === 0) {
            return;
        }

        const count = this.selectedOperations.size;
        const message = `Êtes-vous sûr de vouloir supprimer ${count} opération(s) sélectionnée(s) ?`;
        
        if (confirm(message)) {
            this.isDeletingMultiple = true;
            const operationIds = Array.from(this.selectedOperations);
            
            // Utiliser la méthode de suppression en lot
            this.operationService.deleteOperations(operationIds).subscribe({
                next: (result) => {
                    this.isDeletingMultiple = false;
                    this.selectedOperations.clear();
                    this.isSelectionMode = false;
                    this.loadOperations();
                    
                    if (result.success) {
                        this.popupService.showSuccess(`${result.deletedCount} opération(s) supprimée(s) avec succès`);
                    } else {
                        this.popupService.showError(`Erreur lors de la suppression : ${result.errors.join(', ')}`);
                    }
                },
                error: (err) => {
                    console.error('Erreur lors de la suppression en lot', err);
                    this.isDeletingMultiple = false;
                    this.popupService.showError('Erreur lors de la suppression des opérations');
                }
            });
        }
    }

    validateOperation(id: number) {
        this.operationService.updateOperationStatut(id, 'Validée').subscribe({
            next: (success) => {
                if (success) {
                    this.loadOperations();
                } else {
                    this.popupService.showError('Impossible de valider cette opération. Le solde du compte est insuffisant.', 'Validation Impossible');
                }
            },
            error: (err) => {
                console.error('Erreur lors de la validation', err);
                this.popupService.showError('Erreur lors de la validation de l\'opération', 'Erreur de Validation');
            }
        });
    }

    async annulerOperation(id: number) {
        const confirmed = await this.popupService.showConfirm(
            'Êtes-vous sûr de vouloir annuler cette opération ? Cette action changera le statut à "Annulée" et préfixera le type avec "annulation_".',
            'Confirmation d\'Annulation'
        );
        
        if (confirmed) {
            this.operationService.cancelOperation(id).subscribe({
                next: (success) => {
                    if (success) {
                        this.loadOperations();
                        this.popupService.showSuccess('Opération annulée avec succès. Le statut a été changé à "Annulée".', 'Annulation Réussie');
                    } else {
                        this.popupService.showError('Impossible d\'annuler cette opération.', 'Annulation Impossible');
                    }
                },
                error: (err) => {
                    console.error('Erreur lors de l\'annulation', err);
                    this.popupService.showError('Erreur lors de l\'annulation de l\'opération', 'Erreur d\'Annulation');
                }
            });
        }
    }

    // Harmonisation de la méthode de filtrage
    applyFilters() {
        console.log('=== DÉBUT applyFilters() ===');
        console.log('filterForm.value:', this.filterForm.value);
        console.log('Opérations totales avant filtrage:', this.operations.length);
        
        // Récupérer les valeurs du formulaire
        const formValue = this.filterForm.value;
        const selectedTypesOperation = formValue.typeOperation || [];
        const selectedService = formValue.service || [];
        const selectedStatut = formValue.statut || [];
        const selectedReference = formValue.reference || [];
        const selectedPays = formValue.pays || [];
        const selectedCodesProprietaire = formValue.codeProprietaire || [];
        
        // Filtrer les opérations principales
        let filteredMainOperations = this.operations.filter(op => {
            let keepOperation = true;
            
            // Filtre par type d'opération
            if (selectedTypesOperation && selectedTypesOperation.length > 0) {
                if (!selectedTypesOperation.includes(op.typeOperation)) {
                    console.log(`Opération ${op.id} exclue: type ${op.typeOperation} pas dans ${selectedTypesOperation}`);
                    return false;
                }
            }
            
            // Filtre par service
            if (selectedService && selectedService.length > 0) {
                if (!op.service || !selectedService.includes(op.service)) {
                    console.log(`Opération ${op.id} exclue: service ${op.service} pas dans ${selectedService}`);
                    return false;
                }
            }
            
            // Filtre par statut
            if (selectedStatut && selectedStatut.length > 0) {
                if (!selectedStatut.includes(op.statut)) {
                    console.log(`Opération ${op.id} exclue: statut ${op.statut} pas dans ${selectedStatut}`);
                    return false;
                }
            }
            
            // Filtre par référence
            if (selectedReference && selectedReference.length > 0) {
                if (!op.reference || !selectedReference.includes(op.reference)) {
                    console.log(`Opération ${op.id} exclue: référence ${op.reference} pas dans ${selectedReference}`);
                    return false;
                }
            }
            
            // Filtre par pays
            if (selectedPays && selectedPays.length > 0) {
                if (!selectedPays.includes(op.pays)) {
                    console.log(`Opération ${op.id} exclue: pays ${op.pays} pas dans ${selectedPays}`);
                    return false;
                }
            }
            
            // Filtre par code propriétaire
            if (selectedCodesProprietaire && selectedCodesProprietaire.length > 0) {
                if (!selectedCodesProprietaire.includes(op.codeProprietaire)) {
                    console.log(`Opération ${op.id} exclue: codeProprietaire ${op.codeProprietaire} pas dans ${selectedCodesProprietaire}`);
                    return false;
                }
            }
            
            // Filtre par date
            if (formValue.dateDebut && op.dateOperation) {
                const opDate = new Date(op.dateOperation);
                const debutDate = new Date(formValue.dateDebut);
                if (opDate < debutDate) {
                    console.log(`Opération ${op.id} exclue: date ${op.dateOperation} avant ${formValue.dateDebut}`);
                    return false;
                }
            }
            
            if (formValue.dateFin && op.dateOperation) {
                const opDate = new Date(op.dateOperation);
                const finDate = new Date(formValue.dateFin);
                if (opDate > finDate) {
                    console.log(`Opération ${op.id} exclue: date ${op.dateOperation} après ${formValue.dateFin}`);
                    return false;
                }
            }
            
            return true;
        });
        
        // Récupérer les IDs des opérations principales filtrées
        const filteredMainOperationIds = new Set(filteredMainOperations.map(op => op.id).filter(id => id !== undefined));
        
        // Récupérer tous les frais associés aux opérations principales filtrées
        const associatedFrais = this.operations.filter(op => 
            op.typeOperation === 'FRAIS_TRANSACTION' && 
            op.parentOperationId && 
            filteredMainOperationIds.has(op.parentOperationId)
        );
        
        // Stocker les frais associés séparément pour éviter le double affichage
        this.associatedFrais = associatedFrais;
        
        // Ne garder que les opérations principales dans filteredOperations
        // Les frais seront ajoutés lors de la pagination
        this.filteredOperations = filteredMainOperations;
        
        console.log('Opérations principales filtrées:', filteredMainOperations.length);
        console.log('Frais associés trouvés:', associatedFrais.length);
        console.log('Total opérations + frais:', this.filteredOperations.length);
        console.log('Premières opérations filtrées:', this.filteredOperations.slice(0, 3));
        
        // Appliquer le tri
        this.applySorting();
        
        // Mettre à jour la pagination
        this.currentPage = 1;
        this.updatePagedOperations();
        
        // Mettre à jour les statistiques
        this.calculateStats();
        
        // Forcer la détection de changement
        this.cdr.markForCheck();
        
        console.log(`Filtres appliqués: ${this.filteredOperations.length} opérations trouvées (${filteredMainOperations.length} principales + ${associatedFrais.length} frais)`);
        console.log('=== FIN applyFilters() ===');
    }

    // Méthode appelée lors d'un changement de filtre
    onFilterChange() {
        console.log('=== DÉBUT onFilterChange() ===');
        console.log('filterForm.value:', this.filterForm.value);
        
        // Mettre à jour les listes filtrées avec cloisonnement
        this.updateFilteredLists();
        
        // Appliquer les filtres directement
        this.applyFilters();
        
        // Forcer la détection de changement pour mettre à jour l'interface
        this.cdr.detectChanges();
        
        // Fermer les popups après un délai pour permettre la sélection multiple
        setTimeout(() => {
            if (this.typeOperationSelect) this.typeOperationSelect.close();
            if (this.serviceSelect) this.serviceSelect.close();
            if (this.statutSelect) this.statutSelect.close();
            if (this.referenceSelect) this.referenceSelect.close();
            if (this.paysSelect) this.paysSelect.close();
            if (this.codeProprietaireSelect) this.codeProprietaireSelect.close();
        }, 100);
        
        console.log('=== FIN onFilterChange() ===');
    }



    // Méthode pour mettre à jour les listes filtrées avec cloisonnement
    updateFilteredLists() {
        setTimeout(() => {
        // Mettre à jour les pays disponibles selon le code propriétaire sélectionné
        this.filteredPaysList = this.getFilteredPays();
        
        // Mettre à jour les banques disponibles selon le code propriétaire sélectionné
        this.filteredBanqueList = this.getFilteredBanques();
        
        // Mettre à jour les services disponibles selon le code propriétaire sélectionné
        this.filteredServiceList = this.getFilteredServices();
        
        // Mettre à jour les références disponibles selon les autres filtres
        this.filteredReferenceList = this.getFilteredReference();
        
        // Mettre à jour les statuts disponibles selon les autres filtres
        this.filteredStatutList = this.getFilteredStatut();
        
        // Mettre à jour les codes propriétaires disponibles selon les autres filtres
        this.filteredCodeProprietaireList = this.getFilteredCodeProprietaire();
        
        // Nettoyer les sélections qui ne sont plus valides
        this.cleanInvalidSelections();
        }, 100);
    }

    // Méthode pour nettoyer les sélections invalides
    cleanInvalidSelections() {
        setTimeout(() => {
        const currentPays = this.filterForm.value.pays;
        const currentBanque = this.filterForm.value.banque;
        const currentService = this.filterForm.value.service;
        const currentCodeProprietaire = this.filterForm.value.codeProprietaire;
        const currentReference = this.filterForm.value.reference;
        const currentStatut = this.filterForm.value.statut;
        const currentTypeOperation = this.filterForm.value.typeOperation;

        // Nettoyer les pays si le code propriétaire a changé
        if (currentPays && currentPays.length > 0) {
            const validPays = currentPays.filter((pays: string) => 
                this.filteredPaysList.includes(pays)
            );
            if (validPays.length !== currentPays.length) {
                this.filterForm.controls['pays'].setValue(validPays);
            }
        }

        // Nettoyer les banques si le code propriétaire a changé
        if (currentBanque && currentBanque.length > 0) {
            const validBanques = currentBanque.filter((banque: string) => 
                this.filteredBanqueList.includes(banque)
            );
            if (validBanques.length !== currentBanque.length) {
                this.filterForm.controls['banque'].setValue(validBanques);
            }
        }

        // Nettoyer les services si le code propriétaire a changé
        if (currentService && currentService.length > 0) {
            const validServices = currentService.filter((service: string) => 
                this.filteredServiceList.includes(service)
            );
            if (validServices.length !== currentService.length) {
                this.filterForm.controls['service'].setValue(validServices);
            }
        }

        // Nettoyer les références si les autres filtres ont changé
        if (currentReference && currentReference.length > 0) {
            const validReference = currentReference.filter((ref: string) => 
                this.filteredReferenceList.includes(ref)
            );
            if (validReference.length !== currentReference.length) {
                this.filterForm.controls['reference'].setValue(validReference);
            }
        }

        // Nettoyer les statuts si les autres filtres ont changé
        if (currentStatut && currentStatut.length > 0) {
            const validStatut = currentStatut.filter((statut: string) => 
                this.filteredStatutList.includes(statut)
            );
            if (validStatut.length !== currentStatut.length) {
                this.filterForm.controls['statut'].setValue(validStatut);
            }
        }

        // Nettoyer les types d'opération si les autres filtres ont changé
        if (currentTypeOperation && currentTypeOperation.length > 0) {
            const validTypeOperation = currentTypeOperation.filter((type: string) => 
                this.filteredTypeOperationList.some(opt => opt.value === type)
            );
            if (validTypeOperation.length !== currentTypeOperation.length) {
                this.filterForm.controls['typeOperation'].setValue(validTypeOperation);
            }
        }

        // Nettoyer les codes propriétaires si les autres filtres ont changé
        if (currentCodeProprietaire && currentCodeProprietaire.length > 0) {
            const validCodeProprietaire = currentCodeProprietaire.filter((code: string) => 
                this.filteredCodeProprietaireList.includes(code)
            );
            if (validCodeProprietaire.length !== currentCodeProprietaire.length) {
                this.filterForm.controls['codeProprietaire'].setValue(validCodeProprietaire);
            }
        }
        }, 100);
    }

    // Méthodes de filtrage avec cloisonnement
    getFilteredPays(): string[] {
        // Si pas de données operations, retourner la liste de base
        if (!this.operations || this.operations.length === 0) {
            return this.paysList;
        }
        
        let data = this.operations;
        // Filtrer par code propriétaire si sélectionné (cloisonnement principal)
        if (this.filterForm.value.codeProprietaire && this.filterForm.value.codeProprietaire.length > 0) {
            data = data.filter(op => this.filterForm.value.codeProprietaire.includes(op.codeProprietaire));
        }
        // Filtrer par banque si sélectionnée
        if (this.filterForm.value.banque && this.filterForm.value.banque.length > 0) {
            data = data.filter(op => this.filterForm.value.banque.includes(op.banque));
        }
        // Filtrer par service si sélectionné
        if (this.filterForm.value.service && this.filterForm.value.service.length > 0) {
            data = data.filter(op => this.filterForm.value.service.includes(op.service));
        }
        // Filtrer par référence
        if (this.filterForm.value.reference && this.filterForm.value.reference.length > 0) {
            data = data.filter(op => this.filterForm.value.reference.includes(op.reference));
        }
        const pays = [...new Set(data.map(op => op.pays).filter((p): p is string => p !== undefined && p !== null))];
        return pays.sort();
    }

    getFilteredBanques(): string[] {
        // Si pas de données operations, retourner la liste de base
        if (!this.operations || this.operations.length === 0) {
            return this.banqueList;
        }
        
        let data = this.operations;
        // Filtrer par code propriétaire si sélectionné (cloisonnement principal)
        if (this.filterForm.value.codeProprietaire && this.filterForm.value.codeProprietaire.length > 0) {
            data = data.filter(op => this.filterForm.value.codeProprietaire.includes(op.codeProprietaire));
        }
        // Filtrer par pays si sélectionné
        if (this.filterForm.value.pays && this.filterForm.value.pays.length > 0) {
            data = data.filter(op => this.filterForm.value.pays.includes(op.pays));
        }
        // Filtrer par service si sélectionné
        if (this.filterForm.value.service && this.filterForm.value.service.length > 0) {
            data = data.filter(op => this.filterForm.value.service.includes(op.service));
        }
        // Filtrer par référence
        if (this.filterForm.value.reference && this.filterForm.value.reference.length > 0) {
            data = data.filter(op => this.filterForm.value.reference.includes(op.reference));
        }
        const banques = [...new Set(data.map(op => op.banque).filter((b): b is string => b !== undefined && b !== null))];
        return banques.sort();
    }

    getFilteredServices(): string[] {
        // Si pas de données operations, retourner la liste de base
        if (!this.operations || this.operations.length === 0) {
            return this.serviceList;
        }
        
        let data = this.operations;
        // Filtrer par code propriétaire si sélectionné (cloisonnement principal)
        if (this.filterForm.value.codeProprietaire && this.filterForm.value.codeProprietaire.length > 0) {
            data = data.filter(op => this.filterForm.value.codeProprietaire.includes(op.codeProprietaire));
        }
        // Filtrer par pays si sélectionné
        if (this.filterForm.value.pays && this.filterForm.value.pays.length > 0) {
            data = data.filter(op => this.filterForm.value.pays.includes(op.pays));
        }
        // Filtrer par banque si sélectionnée
        if (this.filterForm.value.banque && this.filterForm.value.banque.length > 0) {
            data = data.filter(op => this.filterForm.value.banque.includes(op.banque));
        }
        // Filtrer par référence
        if (this.filterForm.value.reference && this.filterForm.value.reference.length > 0) {
            data = data.filter(op => this.filterForm.value.reference.includes(op.reference));
        }
        const services = [...new Set(data.map(op => op.service).filter((s): s is string => s !== undefined && s !== null))];
        return services.sort();
    }

    getFilteredCodeProprietaire(): string[] {
        let data = [...this.operations];
        
        // Appliquer les autres filtres
        if (this.filterForm.value.typeOperation && this.filterForm.value.typeOperation.length > 0) {
            data = data.filter(op => this.filterForm.value.typeOperation.includes(op.typeOperation));
        }
        if (this.filterForm.value.pays && this.filterForm.value.pays.length > 0) {
            data = data.filter(op => this.filterForm.value.pays.includes(op.pays));
        }
        if (this.filterForm.value.statut && this.filterForm.value.statut.length > 0) {
            data = data.filter(op => this.filterForm.value.statut.includes(op.statut));
        }
        if (this.filterForm.value.banque && this.filterForm.value.banque.length > 0) {
            data = data.filter(op => this.filterForm.value.banque.includes(op.banque));
        }
        if (this.filterForm.value.service && this.filterForm.value.service.length > 0) {
            data = data.filter(op => this.filterForm.value.service.includes(op.service));
        }
        // Filtrer par référence
        if (this.filterForm.value.reference && this.filterForm.value.reference.length > 0) {
            data = data.filter(op => this.filterForm.value.reference.includes(op.reference));
        }
        const codeProprietaire = [...new Set(data.map(op => op.codeProprietaire).filter((c): c is string => c !== undefined && c !== null))];
        return codeProprietaire.sort();
    }

    getFilteredReference(): string[] {
        let data = [...this.operations];
        
        // Appliquer les autres filtres
        if (this.filterForm.value.typeOperation && this.filterForm.value.typeOperation.length > 0) {
            data = data.filter(op => this.filterForm.value.typeOperation.includes(op.typeOperation));
        }
        if (this.filterForm.value.pays && this.filterForm.value.pays.length > 0) {
            data = data.filter(op => this.filterForm.value.pays.includes(op.pays));
        }
        if (this.filterForm.value.statut && this.filterForm.value.statut.length > 0) {
            data = data.filter(op => this.filterForm.value.statut.includes(op.statut));
        }
        if (this.filterForm.value.banque && this.filterForm.value.banque.length > 0) {
            data = data.filter(op => this.filterForm.value.banque.includes(op.banque));
        }
        if (this.filterForm.value.codeProprietaire && this.filterForm.value.codeProprietaire.length > 0) {
            data = data.filter(op => this.filterForm.value.codeProprietaire.includes(op.codeProprietaire));
        }
        if (this.filterForm.value.service && this.filterForm.value.service.length > 0) {
            data = data.filter(op => this.filterForm.value.service.includes(op.service));
        }
        const reference = [...new Set(data.map(op => op.reference).filter((r): r is string => r !== undefined && r !== null && r !== ''))];
        return reference.sort();
    }

    getFilteredStatut(): string[] {
        let data = [...this.operations];
        
        // Appliquer les autres filtres
        if (this.filterForm.value.typeOperation && this.filterForm.value.typeOperation.length > 0) {
            data = data.filter(op => this.filterForm.value.typeOperation.includes(op.typeOperation));
        }
        if (this.filterForm.value.pays && this.filterForm.value.pays.length > 0) {
            data = data.filter(op => this.filterForm.value.pays.includes(op.pays));
        }
        if (this.filterForm.value.banque && this.filterForm.value.banque.length > 0) {
            data = data.filter(op => this.filterForm.value.banque.includes(op.banque));
        }
        if (this.filterForm.value.codeProprietaire && this.filterForm.value.codeProprietaire.length > 0) {
            data = data.filter(op => this.filterForm.value.codeProprietaire.includes(op.codeProprietaire));
        }
        if (this.filterForm.value.service && this.filterForm.value.service.length > 0) {
            data = data.filter(op => this.filterForm.value.service.includes(op.service));
        }
        if (this.filterForm.value.reference && this.filterForm.value.reference.length > 0) {
            data = data.filter(op => this.filterForm.value.reference.includes(op.reference));
        }
        const statut = [...new Set(data.map(op => op.statut).filter((s): s is string => s !== undefined && s !== null))];
        return statut.sort();
    }

    clearFilters() {
        this.filterForm.reset();
        this.filteredOperations = [...this.operations];
        this.currentPage = 1;
        this.updatePagedOperations();
        this.calculateStats();
        console.log('Filtres effacés, toutes les opérations affichées');
    }

    updatePagedOperations() {
        console.log('=== DÉBUT updatePagedOperations() ===');
        console.log('currentPage:', this.currentPage);
        console.log('pageSize:', this.pageSize);
        console.log('filteredOperations.length:', this.filteredOperations.length);
        
        // Récupérer les opérations principales de la page courante
        const mainOperations = this.filteredOperations.filter(op => op.typeOperation !== 'FRAIS_TRANSACTION');
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        console.log('startIndex:', startIndex, 'endIndex:', endIndex);
        
        // Récupérer les opérations principales de cette page
        const mainOperationsOnPage = mainOperations.slice(startIndex, endIndex);
        
        // Récupérer les IDs des opérations principales de cette page
        const mainOperationIdsOnPage = new Set(mainOperationsOnPage.map(op => op.id).filter(id => id !== undefined));
        
        // Récupérer tous les frais associés aux opérations de cette page
        const fraisForThisPage = this.associatedFrais.filter(op => 
            op.parentOperationId && 
            mainOperationIdsOnPage.has(op.parentOperationId)
        );
        
        // Réorganiser l'affichage : chaque opération nominale suivie de ses frais
        const reorganizedOperations: Operation[] = [];
        
        mainOperationsOnPage.forEach(mainOp => {
            // Ajouter l'opération principale
            reorganizedOperations.push(mainOp);
            
            // Ajouter immédiatement ses frais associés
            const associatedFrais = fraisForThisPage.filter(frais => 
                frais.parentOperationId === mainOp.id
            );
            reorganizedOperations.push(...associatedFrais);
        });
        
        this.pagedOperations = reorganizedOperations;
        
        // Calculer le nombre total de pages basé sur les opérations principales uniquement
        this.totalPages = Math.ceil(mainOperations.length / this.pageSize);
        
        console.log('mainOperationsOnPage.length:', mainOperationsOnPage.length);
        console.log('fraisForThisPage.length:', fraisForThisPage.length);
        console.log('pagedOperations.length:', this.pagedOperations.length);
        console.log('totalPages (basé sur opérations principales):', this.totalPages);
        console.log('Premières opérations paginées:', this.pagedOperations.slice(0, 2));
        
        // S'assurer que la page courante est valide
        if (this.currentPage > this.totalPages && this.totalPages > 0) {
            this.currentPage = this.totalPages;
            this.updatePagedOperations();
        }
        
        // Forcer la détection de changement
        this.cdr.markForCheck();
        
        console.log('=== FIN updatePagedOperations() ===');
    }

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.updatePagedOperations();
        }
    }

    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.updatePagedOperations();
        }
    }

    calculateStats() {
        // Utiliser directement filteredOperations car elle ne contient que les opérations principales
        const mainOperations = this.filteredOperations;
        
        // Calculer les statistiques basées sur les opérations principales uniquement
        this.totalOperations = mainOperations.length;
        this.totalMontant = mainOperations.reduce((sum, op) => sum + (op.montant || 0), 0);
        this.montantMoyen = this.totalOperations > 0 ? this.totalMontant / this.totalOperations : 0;
        this.operationsValidees = mainOperations.filter(op => op.statut === 'Validée').length;
        
        // Log pour debug
        console.log(`Stats calculées: ${this.totalOperations} opérations principales, ${this.associatedFrais.length} frais associés, ${this.totalMontant} montant total, ${this.operationsValidees} validées`);
        
        // Mettre à jour les statistiques par type
        this.loadStatsByType();
    }

    getOperationTypes(): string[] {
        // Récupérer tous les types d'opération disponibles dans les données filtrées (opérations principales uniquement)
        const mainOperations = this.filteredOperations;
        const types = Array.from(new Set(mainOperations.map(op => op.typeOperation).filter(type => type)));
        
        // Si nous avons des statistiques, retourner les types qui ont des données
        if (this.statsByType && Object.keys(this.statsByType).length > 0) {
            return Object.keys(this.statsByType);
        }
        
        // Sinon, retourner les types trouvés dans les données
        return types.length > 0 ? types : Object.values(TypeOperation);
    }

    getPagedOperationTypes(): string[] {
        const allTypes = this.getOperationTypes();
        this.totalStatsPages = Math.ceil(allTypes.length / this.statsCardsPerPage);
        const startIndex = (this.currentStatsPage - 1) * this.statsCardsPerPage;
        const endIndex = startIndex + this.statsCardsPerPage;
        return allTypes.slice(startIndex, endIndex);
    }

    nextStatsPage() {
        if (this.currentStatsPage < this.totalStatsPages) {
            this.currentStatsPage++;
        }
    }

    prevStatsPage() {
        if (this.currentStatsPage > 1) {
            this.currentStatsPage--;
        }
    }

    goToStatsPage(page: number) {
        if (page >= 1 && page <= this.totalStatsPages) {
            this.currentStatsPage = page;
        }
    }

    getTypeDisplayName(type: string): string {
        const typeNames: { [key: string]: string } = {
            'total_cashin': 'Total Cash-in',
            'total_paiement': 'Total Paiement',
            'Appro_client': 'Appro_client',
            'Appro_fournisseur': 'Appro_fournisseur',
            'ajustement': 'Ajustement',
            'Compense_client': 'Compense_client',
            'Compense_fournisseur': 'Compense_fournisseur',
            'nivellement': 'Nivellement',
            'régularisation_solde': 'Régularisation Solde',
            'FRAIS_TRANSACTION': 'Frais Transaction',
            'annulation_partenaire': 'Annulation Partenaire',
            'annulation_bo': 'Annulation BO',
            'transaction_cree': 'Transaction Créée'
        };
        return typeNames[type] || type;
    }

    getTypeImpact(type: string): string {
        const impacts: { [key: string]: string } = {
            'total_cashin': 'Débite le compte',
            'total_paiement': 'Crédite le compte',
            'Appro_client': 'Crédite le compte',
            'Appro_fournisseur': 'Crédite le compte',
            'ajustement': 'Impact variable (+/-)',
            'Compense_client': 'Débite le compte',
            'Compense_fournisseur': 'Débite le compte',
            'nivellement': 'Impact variable (+/-)',
            'régularisation_solde': 'Impact variable (+/-)',
            'FRAIS_TRANSACTION': 'Débite le compte',
            'annulation_partenaire': 'Débite le compte',
            'annulation_bo': 'Débite le compte'
        };
        return impacts[type] || 'Impact standard';
    }

    async exportOperations() {
        this.isExporting = true;
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Opérations');

        sheet.columns = [
            { header: 'Date', key: 'dateOperation', width: 20 },
            { header: 'Type', key: 'typeOperation', width: 20 },
            { header: 'Compte', key: 'codeProprietaire', width: 20 },
            { header: 'Service', key: 'service', width: 20 },
            { header: 'Débit', key: 'debit', width: 15 },
            { header: 'Crédit', key: 'credit', width: 15 },
            { header: 'Solde Avant', key: 'soldeAvant', width: 18 },
            { header: 'Solde Après', key: 'soldeApres', width: 18 },
            { header: 'Statut', key: 'statut', width: 15 },
            { header: 'Pays', key: 'pays', width: 10 },
            { header: 'Banque', key: 'banque', width: 15 },
            { header: 'Bordereau', key: 'nomBordereau', width: 25 },
        ];

        let totalDebit = 0;
        let totalCredit = 0;
        let soldeOuverture = null;
        let soldeCloture = null;
        const totauxParType: { [type: string]: { debit: number, credit: number } } = {};

        this.filteredOperations.forEach((op, idx) => {
            const { debit, credit } = this.getDebitCreditForOperation(op);
            sheet.addRow({
                dateOperation: op.dateOperation,
                typeOperation: op.typeOperation,
                codeProprietaire: op.codeProprietaire,
                service: op.service,
                debit: debit ? debit : '',
                credit: credit ? credit : '',
                soldeAvant: op.soldeAvant,
                soldeApres: op.soldeApres,
                statut: op.statut,
                pays: op.pays,
                banque: op.banque,
                nomBordereau: op.nomBordereau
            });
            totalDebit += debit || 0;
            totalCredit += credit || 0;
            // Calcul du solde d'ouverture et de clôture
            if (idx === 0) soldeOuverture = op.soldeAvant;
            soldeCloture = op.soldeApres;
            // Totaux par type
            const type = op.typeOperation;
            if (!totauxParType[type]) totauxParType[type] = { debit: 0, credit: 0 };
            totauxParType[type].debit += debit || 0;
            totauxParType[type].credit += credit || 0;
        });

        // Laisser une ligne vide
        sheet.addRow([]);
        // Résumé
        sheet.addRow(['RÉSUMÉ']);
        sheet.addRow(['Total Débit', totalDebit]);
        sheet.addRow(['Total Crédit', totalCredit]);
        sheet.addRow(['Différence solde ouverture/clôture', soldeCloture !== null && soldeOuverture !== null ? (soldeCloture - soldeOuverture) : '']);
        sheet.addRow([]);
        sheet.addRow(['Totaux par type']);
        Object.keys(totauxParType).forEach(type => {
            sheet.addRow([
                type,
                'Débit', totauxParType[type].debit,
                'Crédit', totauxParType[type].credit
            ]);
        });

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `operations_${new Date().toISOString().slice(0, 10)}.xlsx`);
        this.isExporting = false;
    }

    goToPage(page: number) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.updatePagedOperations();
        }
    }

    getVisiblePages(): number[] {
        const maxVisible = 5;
        const pages: number[] = [];
        
        if (this.totalPages <= maxVisible) {
            // Si moins de 5 pages, afficher toutes
            for (let i = 1; i <= this.totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Si plus de 5 pages, afficher intelligemment
            let start = Math.max(1, this.currentPage - 2);
            let end = Math.min(this.totalPages, start + maxVisible - 1);
            
            // Ajuster si on est près de la fin
            if (end - start < maxVisible - 1) {
                start = Math.max(1, end - maxVisible + 1);
            }
            
            for (let i = start; i <= end; i++) {
                pages.push(i);
            }
        }
        
        return pages;
    }

    getVisibleStatsPages(): number[] {
        const maxVisible = 5;
        const pages: number[] = [];
        
        if (this.totalStatsPages <= maxVisible) {
            // Si moins de 5 pages, afficher toutes
            for (let i = 1; i <= this.totalStatsPages; i++) {
                pages.push(i);
            }
        } else {
            // Si plus de 5 pages, afficher intelligemment
            let start = Math.max(1, this.currentStatsPage - 2);
            let end = Math.min(this.totalStatsPages, start + maxVisible - 1);
            
            // Ajuster si on est près de la fin
            if (end - start < maxVisible - 1) {
                start = Math.max(1, end - maxVisible + 1);
            }
            
            for (let i = start; i <= end; i++) {
                pages.push(i);
            }
        }
        
        return pages;
    }

    initializeStatutList() {
        // Initialiser avec les statuts standards
        this.statutList = ['Validée', 'En attente', 'Rejetée', 'Annulée', 'En cours'];
    }

    initializeFilteredLists() {
        // Initialiser les listes filtrées avec toutes les valeurs disponibles
        setTimeout(() => {
        this.filteredTypeOperationList = this.filterTypeOptions;
        this.filteredPaysList = this.getFilteredPays();
        this.filteredStatutList = this.getFilteredStatut();
        this.filteredBanqueList = this.getFilteredBanques();
        this.filteredCodeProprietaireList = this.getFilteredCodeProprietaire();
        this.filteredServiceList = this.getFilteredServices();
        this.filteredReferenceList = this.getFilteredReference();
        
        console.log('Listes filtrées initialisées');
        }, 100);
    }

    // Détermine si une opération est un débit
    isDebitOperation(type: string): boolean {
        return [
            'total_paiement',
            'ajustement',
            'Compense_client',
            'Compense_fournisseur',
            'FRAIS_TRANSACTION',
            'annulation_partenaire',
            'annulation_bo',
            'transaction_cree'
        ].includes(type);
    }

    // Détermine si une opération est un crédit
    isCreditOperation(type: string): boolean {
        return [
            'total_cashin',
            'Appro_client',
            'Appro_fournisseur',
            'nivellement',
            'régularisation_solde'
        ].includes(type);
    }

    // Calcule le débit et le crédit selon la logique métier
    getDebitCreditForOperation(op: Operation): { debit: number, credit: number } {
        const montant = Number(op.montant) || 0;
        const frais = Number((op as any).frais) || 0;
        const type = (op.typeOperation || '').toLowerCase().replace(/\s/g, '');
        const service = (op.service || '').toLowerCase().replace(/\s/g, '');

        let debit = 0;
        let credit = 0;

        // Cas spécial : frais liés à une annulation
        if (type === 'frais_transaction' && op.parentOperationId) {
            const parent = this.operations.find(o => o.id === op.parentOperationId);
            if (parent && (parent.typeOperation || '').toLowerCase().replace(/\s/g, '').startsWith('annulation_')) {
                debit = 0;
                credit = montant;
                return { debit, credit };
            }
        }

        // Gestion des opérations d'annulation (impact inverse)
        if (type.startsWith('annulation_')) {
            const typeOrigine = type.substring(11); // Enlever 'annulation_'
            
            switch (typeOrigine) {
                case 'total_cashin':
                    // L'opération d'origine était en débit, l'annulation est en crédit
                    credit = montant + frais;
                    debit = 0;
                    break;
                case 'total_paiement':
                    // L'opération d'origine était en crédit, l'annulation est en débit
                    debit = montant;
                    credit = frais;
                    break;
                case 'Appro_client':
                    // L'opération d'origine était en crédit, l'annulation est en débit
                    debit = montant;
                    credit = 0;
                    break;
                case 'Appro_fournisseur':
                    // L'opération d'origine était en crédit, l'annulation est en débit
                    debit = montant;
                    credit = 0;
                    break;
                case 'ajustement':
                    // L'opération d'origine dépendait du signe, l'annulation inverse
                    if (montant >= 0) {
                        debit = montant;
                        credit = 0;
                    } else {
                        debit = 0;
                        credit = -montant;
                    }
                    break;
                case 'Compense_client':
                    // L'opération d'origine était en débit, l'annulation est en crédit
                    credit = montant;
                    debit = 0;
                    break;
                case 'Compense_fournisseur':
                    // L'opération d'origine était en débit, l'annulation est en crédit
                    credit = montant;
                    debit = 0;
                    break;
                case 'nivellement':
                    // L'opération d'origine dépendait du signe, l'annulation inverse
                    if (montant >= 0) {
                        debit = montant;
                        credit = 0;
                    } else {
                        debit = 0;
                        credit = -montant;
                    }
                    break;
                case 'régularisation_solde':
                    // L'opération d'origine dépendait du signe, l'annulation inverse
                    if (montant >= 0) {
                        debit = 0;
                        credit = montant;
                    } else {
                        debit = -montant;
                        credit = 0;
                    }
                    break;
                case 'frais_transaction':
                    // L'opération d'origine était en débit, l'annulation est en crédit
                    credit = montant;
                    debit = 0;
                    break;
                case 'transaction_cree':
                    if (service.includes('cashin')) {
                        // L'opération d'origine était en débit, l'annulation est en crédit
                        credit = montant + frais;
                        debit = 0;
                    } else if (service.includes('paiement')) {
                        // L'opération d'origine était en crédit, l'annulation est en débit
                        debit = montant;
                        credit = frais;
                    }
                    break;
                case 'bo':
                    if (service.includes('cashin')) {
                        debit = 0;
                        credit = montant;
                    } else if (service.includes('paiement')) {
                        debit = montant;
                        credit = 0;
                    } else {
                        debit = 0;
                        credit = 0;
                    }
                    credit += frais;
                    break;
                case 'partenaire':
                    debit = 0;
                    credit = 0;
                    break;
                default:
                    debit = 0;
                    credit = 0;
            }
            return { debit, credit };
        }

        // Gestion des opérations normales (non-annulation)
        switch (type) {
            case 'total_cashin':
                debit = montant + frais;
                credit = 0;
                break;
            case 'total_paiement':
                debit = frais;
                credit = montant;
                break;
            case 'approvisionnement':
                debit = 0;
                credit = montant;
                break;
            case 'Appro_client':
                debit = 0;
                credit = montant;
                break;
            case 'appro_client':
                debit = 0;
                credit = montant;
                break;
            case 'Appro_fournisseur':
                debit = 0;
                credit = montant;
                break;
            case 'appro_fournisseur':
                debit = 0;
                credit = montant;
                break;
            case 'ajustement':
                if (montant >= 0) {
                    debit = 0;
                    credit = montant;
                } else {
                    debit = -montant;
                    credit = 0;
                }
                break;
            case 'Compense_client':
            case 'compense_client':
            case 'Compense_fournisseur':
            case 'compense_fournisseur':
            case 'frais_transaction':
                debit = montant;
                credit = 0;
                break;
            case 'nivellement':
                if (montant >= 0) {
                    debit = 0;
                    credit = montant;
                } else {
                    debit = -montant;
                    credit = 0;
                }
                break;
            case 'régularisation_solde':
                if (montant >= 0) {
                    debit = 0;
                    credit = montant;
                } else {
                    debit = -montant;
                    credit = 0;
                }
                break;
            case 'transaction_cree':
                if (service.includes('cashin')) {
                    debit = montant + frais;
                    credit = 0;
                } else if (service.includes('paiement')) {
                    debit = frais;
                    credit = montant;
                }
                break;
            default:
                debit = 0;
                credit = 0;
        }

        return { debit, credit };
    }

    applyDatePreset(event: Event) {
        const value = (event.target as HTMLSelectElement)?.value || '';
        const today = new Date();
        let dateDebut = '';
        let dateFin = '';
        if (value === 'today') {
            // J-1
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            dateDebut = yesterday.toISOString().split('T')[0];
            dateFin = yesterday.toISOString().split('T')[0];
        } else if (value === '7days') {
            // J-7 à J-1
            const start = new Date(today);
            start.setDate(today.getDate() - 7);
            const end = new Date(today);
            end.setDate(today.getDate() - 1);
            dateDebut = start.toISOString().split('T')[0];
            dateFin = end.toISOString().split('T')[0];
        } else if (value === '30days') {
            // J-30 à J-1
            const start = new Date(today);
            start.setDate(today.getDate() - 30);
            const end = new Date(today);
            end.setDate(today.getDate() - 1);
            dateDebut = start.toISOString().split('T')[0];
            dateFin = end.toISOString().split('T')[0];
        } else if (value === 'month') {
            // 1er du mois à J-1
            const start = new Date(today.getFullYear(), today.getMonth(), 1);
            const end = new Date(today);
            end.setDate(today.getDate() - 1);
            dateDebut = start.toISOString().split('T')[0];
            dateFin = end.toISOString().split('T')[0];
        } else if (value === 'thisYear') {
            // 1er janvier au 31 décembre de cette année
            const start = new Date(today.getFullYear(), 0, 1);
            const end = new Date(today.getFullYear(), 11, 31);
            dateDebut = start.toISOString().split('T')[0];
            dateFin = end.toISOString().split('T')[0];
        } else if (value === 'lastYear') {
            // 1er janvier au 31 décembre de l'année dernière
            const start = new Date(today.getFullYear() - 1, 0, 1);
            const end = new Date(today.getFullYear() - 1, 11, 31);
            dateDebut = start.toISOString().split('T')[0];
            dateFin = end.toISOString().split('T')[0];
        } else if (value === 'custom') {
            dateDebut = '';
            dateFin = '';
        }
        this.filterForm.patchValue({ dateDebut, dateFin });
        this.applyFilters();
    }

    // Méthode pour appliquer le filtre à la sélection
    onCodeProprietaireSelected(value: string) {
      this.filterForm.patchValue({ codeProprietaire: [value] });
      this.applyFilters();
    }

    // Résumé global et par type pour le footer (sur toutes les opérations filtrées)
    get resumeGlobal() {
      let totalDebit = 0;
      let totalCredit = 0;
      for (const op of this.filteredOperations) {
        const { debit, credit } = this.getDebitCreditForOperation(op);
        totalDebit += debit || 0;
        totalCredit += credit || 0;
      }
      return {
        count: this.filteredOperations.length,
        totalDebit,
        totalCredit
      };
    }

    get resumeByType() {
      const result: { [type: string]: { debit: number; credit: number } } = {};
      for (const op of this.filteredOperations) {
        const type = op.typeOperation || 'Inconnu';
        if (!result[type]) result[type] = { debit: 0, credit: 0 };
        const { debit, credit } = this.getDebitCreditForOperation(op);
        result[type].debit += debit || 0;
        result[type].credit += credit || 0;
      }
      return result;
    }

    // Méthodes pour la recherche dynamique
    onSearchChange() {
        this.applyDynamicSearch();
    }

    applyDynamicSearch() {
        // Ne faire la recherche que si on est dans le formulaire d'ajout et qu'il y a au moins une valeur de recherche
        if (!this.showAddForm) {
            return;
        }

        const hasSearchValue = this.searchService || this.searchCodeProprietaire || this.searchTypeOperation || this.searchBanque;
        
        if (!hasSearchValue) {
            this.filteredOperations = [];
            this.filteredOperationsCount = 0;
            return;
        }

        // Filtrer les opérations basées sur les critères de recherche
        this.filteredOperations = this.operations.filter(op => {
            const serviceMatch = !this.searchService || 
                (op.service && op.service.toLowerCase().includes(this.searchService.toLowerCase()));
            
            const codeProprietaireMatch = !this.searchCodeProprietaire || 
                (op.codeProprietaire && op.codeProprietaire.toLowerCase().includes(this.searchCodeProprietaire.toLowerCase()));
            
            const typeOperationMatch = !this.searchTypeOperation || 
                (op.typeOperation && op.typeOperation.toLowerCase().includes(this.searchTypeOperation.toLowerCase()));
            
            const banqueMatch = !this.searchBanque || 
                (op.banque && op.banque.toLowerCase().includes(this.searchBanque.toLowerCase()));
            
            return serviceMatch && codeProprietaireMatch && typeOperationMatch && banqueMatch;
        });

        this.filteredOperationsCount = this.filteredOperations.length;
    }

    clearDynamicSearch() {
        this.searchService = '';
        this.searchCodeProprietaire = '';
        this.searchTypeOperation = '';
        this.searchBanque = '';
        
        if (this.showAddForm) {
            // Dans le formulaire d'ajout, vider les résultats
            this.filteredOperations = [];
            this.filteredOperationsCount = 0;
        } else {
            // Sur la page principale, remettre toutes les opérations
            this.filteredOperations = [...this.operations];
            this.filteredOperationsCount = this.operations.length;
            this.currentPage = 1;
            this.updatePagedOperations();
        }
    }

    // Méthode pour sélectionner une opération et remplir le formulaire
    selectOperationForForm(operation: Operation) {
        // Remplir le formulaire avec les données de l'opération sélectionnée
        this.addForm.patchValue({
            typeOperation: operation.typeOperation,
            service: operation.service || '',
            banque: operation.banque || '',
            nomBordereau: operation.nomBordereau || '',
            codeProprietaire: operation.codeProprietaire,
            montant: operation.montant,
            dateOperation: operation.dateOperation ? operation.dateOperation.substring(0, 10) : new Date().toISOString().split('T')[0]
        });

        // Mettre à jour les soldes si le compte existe
        if (operation.compteId) {
            const selectedCompte = this.comptes.find(c => c.id === operation.compteId);
            if (selectedCompte) {
                this.addForm.patchValue({
                    soldeAvant: selectedCompte.solde,
                    pays: selectedCompte.pays
                });
            }
        }

        // Effacer la recherche dynamique après sélection
        this.clearDynamicSearch();
    }

    // Méthode pour déclencher la recherche dynamique quand un champ du formulaire change
    onFormFieldChange(fieldName: string, event: Event) {
        const target = event.target as HTMLInputElement;
        const value = target.value;
        
        // Mettre à jour les variables de recherche selon le champ modifié
        switch (fieldName) {
            case 'typeOperation':
                this.searchTypeOperation = value;
                break;
            case 'codeProprietaire':
                this.searchCodeProprietaire = value;
                break;
            case 'service':
                this.searchService = value;
                break;
            case 'banque':
                this.searchBanque = value;
                break;
        }
        
        // Déclencher la recherche dynamique
        this.applyDynamicSearch();
    }

    // Méthode pour déterminer si on doit afficher automatiquement les frais
    shouldShowFraisAutomatically(selectedTypes: string[]): boolean {
        if (!selectedTypes || selectedTypes.length === 0) {
            return false;
        }
        
        // Types d'opérations qui doivent afficher automatiquement leurs frais
        const typesWithFrais = [
            'total_cashin',
            'total_paiement', 
            'transaction_cree',
            'annulation_bo'
        ];
        
        // Vérifier si au moins un des types sélectionnés est dans la liste
        return selectedTypes.some(type => typesWithFrais.includes(type));
    }

    // Méthode pour grouper les opérations avec leurs frais
    getGroupedOperations(): Array<{main: Operation, frais: Operation[]}> {
        const grouped: Array<{main: Operation, frais: Operation[]}> = [];
        const operationsMap = new Map<number, {main: Operation | null, frais: Operation[]}>();
        
        // Utiliser filteredOperations (opérations principales) et associatedFrais
        const mainOperations = this.filteredOperations;
        
        // Traiter les opérations principales
        mainOperations.forEach(op => {
            if (op.id) {
                if (!operationsMap.has(op.id)) {
                    operationsMap.set(op.id, { main: op, frais: [] });
                } else {
                    const group = operationsMap.get(op.id);
                    if (group) {
                        group.main = op;
                    }
                }
            }
        });
        
        // Traiter les frais associés
        this.associatedFrais.forEach(frais => {
            const parentId = frais.parentOperationId;
            if (parentId) {
                if (!operationsMap.has(parentId)) {
                    operationsMap.set(parentId, { main: null, frais: [] });
                }
                const group = operationsMap.get(parentId);
                if (group) {
                    group.frais.push(frais);
                }
            }
        });
        
        // Créer la liste finale avec les opérations principales et leurs frais
        operationsMap.forEach((group, id) => {
            if (group.main) {
                grouped.push({
                    main: group.main,
                    frais: group.frais
                });
            }
        });
        
        return grouped;
    }

    // Méthode pour vérifier si une opération a des frais associés
    hasAssociatedFrais(operation: Operation): boolean {
        if (!operation.id) return false;
        
        // Vérifier s'il y a des frais associés à cette opération
        return this.associatedFrais.some(op => 
            op.parentOperationId === operation.id
        );
    }

    getStatutClassForOperation(statut: string): string {
        switch (statut) {
            case 'EN_ATTENTE':
                return 'statut-en-attente';
            case 'TRAITE':
                return 'statut-traite';
            case 'ERREUR':
                return 'statut-erreur';
            case 'Validée':
                return 'statut-validee';
            case 'Annulée':
                return 'statut-annulee';
            default:
                return 'statut-en-attente';
        }
    }

    getStatutDisplayName(statut: string): string {
        switch (statut) {
            case 'EN_ATTENTE':
                return 'En attente';
            case 'TRAITE':
                return 'Traité';
            case 'ERREUR':
                return 'Erreur';
            case 'Validée':
                return 'Validée';
            case 'Annulée':
                return 'Annulée';
            default:
                return 'En attente';
        }
    }

    onStatutChange(operation: Operation, event: Event) {
        const target = event.target as HTMLSelectElement;
        const newStatut = target.value;
        
        // Mettre à jour le statut de l'opération
        operation.statut = newStatut;
        
        // Ici vous pouvez ajouter la logique pour sauvegarder le changement
        console.log(`Statut changé pour l'opération ${operation.id}: ${newStatut}`);
    }

    // Méthode pour remplacer Math.min dans le template
    getMin(a: number, b: number): number {
        return Math.min(a, b);
    }
} 