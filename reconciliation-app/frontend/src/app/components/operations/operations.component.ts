import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { Subscription } from 'rxjs';
import { OperationService } from '../../services/operation.service';
import { CompteService } from '../../services/compte.service';
import { Operation, OperationFilter, TypeOperation, StatutOperation, OperationUpdateRequest } from '../../models/operation.model';
import { Compte } from '../../models/compte.model';
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
    comptes: Compte[] = [];
    paysList: string[] = [];
    codeProprietaireList: string[] = [];
    banqueList: string[] = [];
    serviceList: string[] = [];
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
    selectedCodeProprietaire: string = '';
    selectedCompteId: number | undefined = undefined;
    
    // Pagination des cartes de statistiques
    statsCardsPerPage = 3;
    currentStatsPage = 1;
    totalStatsPages = 1;
    
    // Navigation par étapes pour le formulaire de modification
    currentEditStep = 1;
    maxDate = new Date().toISOString().split('T')[0];
    
    // Propriété pour les numéros de comptes (pour l'autocomplétion)
    get comptesNumeros(): string[] {
        return this.codeProprietaireList;
    }

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
        { value: 'approvisionnement', label: 'Approvisionnement' },
        { value: 'ajustement', label: 'Ajustement' },
        { value: 'compense', label: 'Compense' },
        { value: 'FRAIS_TRANSACTION', label: 'Frais Transaction' },
        { value: 'annulation_partenaire', label: 'Annulation Partenaire' },
        { value: 'annulation_bo', label: 'Annulation BO' },
        { value: 'transaction_cree', label: 'Transaction Créée' }
    ];

    // Ajout des contrôles de recherche et des variables de sélection
    typeOperationSearchCtrl = new FormControl('');
    selectedTypesOperation: string[] = [];
    filteredTypeOperationList: { value: string, label: string }[] = [];
    paysSearchCtrl = new FormControl('');
    selectedPays: string[] = [];
    filteredPaysList: string[] = [];
    statutSearchCtrl = new FormControl('');
    selectedStatut: string[] = [];
    filteredStatutList: string[] = [];
    banqueSearchCtrl = new FormControl('');
    selectedBanque: string[] = [];
    filteredBanqueList: string[] = [];
    codeProprietaireSearchCtrl = new FormControl('');
    selectedCodesProprietaire: string[] = [];
    filteredCodeProprietaireList: string[] = [];
    serviceSearchCtrl = new FormControl('');
    selectedService: string[] = [];
    filteredServiceList: string[] = [];
    compteSearchCtrl = new FormControl('');
    selectedComptes: string[] = [];
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

    @ViewChild('typeOperationSelect') typeOperationSelect!: MatSelect;
    @ViewChild('paysSelect') paysSelect!: MatSelect;
    @ViewChild('statutSelect') statutSelect!: MatSelect;
    @ViewChild('banqueSelect') banqueSelect!: MatSelect;
    @ViewChild('codeProprietaireSelect') codeProprietaireSelect!: MatSelect;
    @ViewChild('serviceSelect') serviceSelect!: MatSelect;

    private subscription = new Subscription();

    constructor(
        private operationService: OperationService,
        private compteService: CompteService,
        private fb: FormBuilder
    ) {
        this.addForm = this.fb.group({
            typeOperation: ['', [Validators.required]],
            montant: [0, [Validators.required]],
            pays: [{ value: '', disabled: true }],
            banque: [''],
            nomBordereau: [''],
            service: [''],
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
            dateOperation: ['', [Validators.required]]
        });

        this.filterForm = this.fb.group({
            typeOperation: [[]],
            pays: [[]],
            statut: [[]],
            banque: [[]],
            codeProprietaire: [[]],
            service: [[]],
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
        this.loadPaysList();
        this.loadCodeProprietaireListFromBackend();
        this.loadBanqueListFromBackend();
        this.loadServiceListFromBackend();
        this.loadStatsByType();
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
                this.filterForm.controls['typeOperation'].setValue([this.filteredTypeOperationList[0].value]);
                if (this.typeOperationSelect) { this.typeOperationSelect.close(); }
                this.onFilterChange();
            }
        });
        this.paysSearchCtrl.valueChanges.subscribe((search: string | null) => {
            const s = (search || '').toLowerCase();
            const availablePays = this.getFilteredPays();
            this.filteredPaysList = availablePays.filter(p => p.toLowerCase().includes(s));
            if (this.filteredPaysList.length === 1 && !this.filterForm.value.pays.includes(this.filteredPaysList[0])) {
                this.filterForm.controls['pays'].setValue([this.filteredPaysList[0]]);
                if (this.paysSelect) { this.paysSelect.close(); }
                this.onFilterChange();
            }
        });
        this.statutSearchCtrl.valueChanges.subscribe((search: string | null) => {
            const s = (search || '').toLowerCase();
            this.filteredStatutList = this.statutList.filter(st => st.toLowerCase().includes(s));
            if (this.filteredStatutList.length === 1 && !this.filterForm.value.statut.includes(this.filteredStatutList[0])) {
                this.filterForm.controls['statut'].setValue([this.filteredStatutList[0]]);
                if (this.statutSelect) { this.statutSelect.close(); }
                this.onFilterChange();
            }
        });
        this.banqueSearchCtrl.valueChanges.subscribe((search: string | null) => {
            const s = (search || '').toLowerCase();
            const availableBanques = this.getFilteredBanques();
            this.filteredBanqueList = availableBanques.filter(b => b.toLowerCase().includes(s));
            if (this.filteredBanqueList.length === 1 && !this.filterForm.value.banque.includes(this.filteredBanqueList[0])) {
                this.filterForm.controls['banque'].setValue([this.filteredBanqueList[0]]);
                if (this.banqueSelect) { this.banqueSelect.close(); }
                this.onFilterChange();
            }
        });
        this.codeProprietaireSearchCtrl.valueChanges.subscribe((search: string | null) => {
            const s = (search || '').toLowerCase();
            const availableCodeProprietaire = this.getFilteredCodeProprietaire();
            this.filteredCodeProprietaireList = availableCodeProprietaire.filter(c => c.toLowerCase().includes(s));
            if (this.filteredCodeProprietaireList.length === 1 && !this.filterForm.value.codeProprietaire.includes(this.filteredCodeProprietaireList[0])) {
                this.filterForm.controls['codeProprietaire'].setValue([this.filteredCodeProprietaireList[0]]);
                if (this.codeProprietaireSelect) { this.codeProprietaireSelect.close(); }
                this.onFilterChange();
            }
        });
        this.serviceSearchCtrl.valueChanges.subscribe((search: string | null) => {
            const s = (search || '').toLowerCase();
            const availableServices = this.getFilteredServices();
            this.filteredServiceList = availableServices.filter(sv => sv.toLowerCase().includes(s));
            if (this.filteredServiceList.length === 1 && !this.filterForm.value.service.includes(this.filteredServiceList[0])) {
                this.filterForm.controls['service'].setValue([this.filteredServiceList[0]]);
                if (this.serviceSelect) { this.serviceSelect.close(); }
                this.onFilterChange();
            }
        });
        // Ajout des logs pour diagnostic
        setTimeout(() => {
            console.log('filteredPaysList:', this.filteredPaysList);
            console.log('filteredBanqueList:', this.filteredBanqueList);
            console.log('filteredServiceList:', this.filteredServiceList);
        }, 1000);
        // Déclenche le filtrage automatiquement quand le code propriétaire change
        this.filterForm.get('codeProprietaire')?.valueChanges.subscribe(() => {
            this.applyFilters();
        });

        // Dans ngOnInit, ajouter la logique de filtrage dynamique
        // this.filterForm.get('codeProprietaireCtrl')?.valueChanges.subscribe((search: string) => {
        //   const s = (search || '').toLowerCase();
        //   this.filteredCodeProprietaireList = this.codeProprietaireList.filter(c => c.toLowerCase().includes(s));
        // });
        // Initialiser la liste filtrée
        // this.filteredCodeProprietaireList = this.codeProprietaireList.slice();
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }

    loadOperations() {
        this.isLoading = true;
        this.operationService.getAllOperations().subscribe({
            next: (data) => {
                this.operations = data.sort((a, b) => 
                    new Date(b.dateOperation).getTime() - new Date(a.dateOperation).getTime()
                );
                this.filteredOperations = [...this.operations];
                this.paysList = [...new Set(data.map(op => op.pays))].sort();
                this.codeProprietaireList = [...new Set(data.map(op => op.codeProprietaire).filter(code => code !== undefined))] as string[];
                
                // Mettre à jour les listes filtrées avec cloisonnement après chargement des opérations
                this.updateFilteredLists();
                
                this.applyFilters();
                this.calculateStats();
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Erreur de chargement des opérations', err);
                this.isLoading = false;
            }
        });
    }

    loadComptes() {
        this.compteService.getAllComptes().subscribe(data => {
            this.comptes = data;
        });
    }

    loadPaysList() {
        this.paysList = [...new Set(this.operations.map(op => op.pays))].sort();
        this.filteredPaysList = this.paysList.slice();
    }

    loadCodeProprietaireList() {
        this.codeProprietaireList = [...new Set(this.operations.map(op => op.codeProprietaire).filter(code => code !== undefined))] as string[];
    }

    loadBanqueList() {
        this.banqueList = [...new Set(this.operations.map(op => op.banque).filter(banque => banque !== undefined))] as string[];
    }

    loadServiceList() {
        this.serviceList = [...new Set(this.operations.map(op => op.service).filter(service => service !== undefined))] as string[];
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
        this.subscription.add(
            this.operationService.getDistinctService().subscribe({
                next: (services: string[]) => {
                    this.serviceList = services;
                    
                    // Mettre à jour les listes filtrées avec cloisonnement
                    setTimeout(() => {
                        this.updateFilteredLists();
                    }, 100);
                },
                error: (error: any) => {
                    console.error('Erreur lors du chargement de la liste des services:', error);
                }
            })
        );
    }

    loadStatsByType() {
        this.isLoadingStats = true;
        this.currentStatsPage = 1;
        this.subscription.add(
            this.operationService.getOperationsStatsByTypeWithFilters(this.selectedPays.length > 0 ? this.selectedPays[0] : '', this.selectedCompteId).subscribe({
                next: (stats) => {
                    this.statsByType = stats;
                    this.isLoadingStats = false;
                },
                error: (error) => {
                    console.error('Erreur lors du chargement des statistiques par type:', error);
                    this.isLoadingStats = false;
                }
            })
        );
    }

    applyStatsFilters() {
        if (this.selectedCodeProprietaire) {
            const compte = this.comptes.find(c => c.numeroCompte === this.selectedCodeProprietaire);
            this.selectedCompteId = compte ? compte.id : undefined;
        } else {
            this.selectedCompteId = undefined;
        }
        this.loadStatsByType();
    }

    clearStatsFilters() {
        this.selectedPays = [];
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
        } else {
            // Si aucun compte n'est trouvé, réinitialiser les champs
            this.addForm.patchValue({
                pays: '',
                soldeAvant: 0
            });
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
        } else if (typeOperation === 'approvisionnement') {
            soldeApres = soldeAvant + montant;
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
            dateOperation: formData.dateOperation
        };

        this.operationService.createOperation(newOperation).subscribe({
            next: (op) => {
                this.loadOperations();
                this.loadComptes();
                this.cancelAdd();
                // Effacer la recherche dynamique après ajout réussi
                this.clearDynamicSearch();
            },
            error: (err) => console.error('Erreur ajout opération', err)
        }).add(() => this.isAdding = false);
    }

    cancelAdd() {
        this.showAddForm = false;
        this.addForm.reset();
        // Effacer aussi la recherche dynamique
        this.clearDynamicSearch();
    }

    editOperation(operation: Operation) {
        this.editingOperation = { ...operation };
        this.editForm.patchValue(this.editingOperation);
        this.showEditForm = true;
        this.showAddForm = false;
        this.currentEditStep = 1; // Réinitialiser à la première étape
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
        
        if (typeOperation === 'approvisionnement' || typeOperation === 'total_paiement') {
            return montant >= 0 ? 'positive' : 'negative';
        } else if (typeOperation === 'total_cashin' || typeOperation === 'annulation_partenaire' || 
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
        if (typeOperation === 'approvisionnement' || typeOperation === 'total_paiement') {
            impact = montant;
        } else if (typeOperation === 'total_cashin' || typeOperation === 'annulation_partenaire' || 
                   typeOperation === 'annulation_bo' || typeOperation === 'transaction_cree') {
            impact = -Math.abs(montant);
        } else {
            impact = montant; // Ajustement
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

    getAddImpactDirection(): 'positive' | 'negative' {
        const montant = this.addForm.get('montant')?.value || 0;
        const typeOperation = this.addForm.get('typeOperation')?.value;
        
        if (typeOperation === 'approvisionnement' || typeOperation === 'total_paiement') {
            return montant >= 0 ? 'positive' : 'negative';
        } else if (typeOperation === 'total_cashin' || typeOperation === 'annulation_partenaire' || 
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
        if (typeOperation === 'approvisionnement' || typeOperation === 'total_paiement') {
            impact = montant;
        } else if (typeOperation === 'total_cashin' || typeOperation === 'annulation_partenaire' || 
                   typeOperation === 'annulation_bo' || typeOperation === 'transaction_cree') {
            impact = -Math.abs(montant);
        } else {
            impact = montant; // Ajustement
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

    validateOperation(id: number) {
        this.operationService.updateOperationStatut(id, 'Validée').subscribe({
            next: (success) => {
                if (success) {
                    this.loadOperations();
                } else {
                    alert('Impossible de valider cette opération. Le solde du compte est insuffisant.');
                }
            },
            error: (err) => {
                console.error('Erreur lors de la validation', err);
                alert('Erreur lors de la validation de l\'opération');
            }
        });
    }

    annulerOperation(id: number) {
        if (confirm('Voulez-vous vraiment annuler cette opération ?')) {
            this.operationService.updateOperationStatut(id, 'Annulée').subscribe({
                next: (success) => {
                    if (success) {
                        this.loadOperations();
                        alert('Opération annulée avec succès.');
                    } else {
                        alert('Impossible d\'annuler cette opération.');
                    }
                },
                error: (err) => {
                    console.error('Erreur lors de l\'annulation', err);
                    alert('Erreur lors de l\'annulation de l\'opération');
                }
            });
        }
    }

    // Harmonisation de la méthode de filtrage
    applyFilters() {
        const filters = this.filterForm.value;
        // DEBUG : Afficher toutes les valeurs sélectionnées et présentes
        console.log('filters:', filters);
        console.log('Tous les typeOperation:', Array.from(new Set(this.operations.map(op => op.typeOperation))));
        console.log('Tous les pays:', Array.from(new Set(this.operations.map(op => op.pays))));
        console.log('Tous les statut:', Array.from(new Set(this.operations.map(op => op.statut))));
        console.log('Toutes les banques:', Array.from(new Set(this.operations.map(op => op.banque))));
        console.log('Tous les services:', Array.from(new Set(this.operations.map(op => op.service))));
        console.log('Tous les codeProprietaire:', this.operations.map(op => op.codeProprietaire));
        
        // Vérifier si on doit afficher automatiquement les frais
        this.showFraisAutomatically = this.shouldShowFraisAutomatically(filters.typeOperation);
        
        // Filtrer d'abord les opérations principales
        const mainOperations = this.operations.filter(op => {
            const typeMatch = !filters.typeOperation || filters.typeOperation.length === 0 || filters.typeOperation.includes(op.typeOperation);
            const paysMatch = !filters.pays || filters.pays.length === 0 || filters.pays.includes(op.pays);
            const statutMatch = !filters.statut || filters.statut.length === 0 || filters.statut.includes(op.statut);
            const banqueMatch = !filters.banque || filters.banque.length === 0 || filters.banque.includes(op.banque);
            const codeProprietaireMatch = !filters.codeProprietaire || filters.codeProprietaire.length === 0 || filters.codeProprietaire.includes(op.codeProprietaire);
            const serviceMatch = !filters.service || filters.service.length === 0 || filters.service.includes(op.service);
            // Correction ici : comparer uniquement la partie date (YYYY-MM-DD)
            const opDate = op.dateOperation ? op.dateOperation.substring(0, 10) : '';
            const dateDebutMatch = !filters.dateDebut || opDate >= filters.dateDebut;
            const dateFinMatch = !filters.dateFin || opDate <= filters.dateFin;
            
            return typeMatch && paysMatch && statutMatch && banqueMatch && codeProprietaireMatch && serviceMatch && dateDebutMatch && dateFinMatch;
        });
        
        // Si on doit afficher les frais automatiquement, ajouter les frais associés
        if (this.showFraisAutomatically) {
            const mainOperationIds = mainOperations.map(op => op.id).filter(id => id !== undefined);
            const associatedFrais = this.operations.filter(op => 
                op.typeOperation === 'FRAIS_TRANSACTION' && 
                op.parentOperationId && 
                mainOperationIds.includes(op.parentOperationId)
            );
            
            // Combiner les opérations principales avec leurs frais
            this.filteredOperations = [...mainOperations, ...associatedFrais];
        } else {
            this.filteredOperations = mainOperations;
        }
        
        // Trier par date décroissante
        this.filteredOperations.sort((a, b) => new Date(b.dateOperation).getTime() - new Date(a.dateOperation).getTime());
        
        // Réinitialiser la pagination
        this.currentPage = 1;
        this.updatePagedOperations();
        this.calculateStats();
        
        console.log(`Filtres appliqués: ${this.filteredOperations.length} opérations filtrées`);
    }

    // Méthode appelée lors d'un changement de filtre
    onFilterChange() {
        console.log('onFilterChange', this.filterForm.value);
        
        // Mettre à jour les listes filtrées pour le cloisonnement
        this.updateFilteredLists();
        
        this.applyFilters();
        
        // Fermer automatiquement les dropdowns après un choix
        setTimeout(() => {
            if (this.typeOperationSelect) this.typeOperationSelect.close();
            if (this.paysSelect) this.paysSelect.close();
            if (this.statutSelect) this.statutSelect.close();
            if (this.banqueSelect) this.banqueSelect.close();
            if (this.codeProprietaireSelect) this.codeProprietaireSelect.close();
            if (this.serviceSelect) this.serviceSelect.close();
        }, 100);
    }

    // Méthode pour mettre à jour les listes filtrées avec cloisonnement
    updateFilteredLists() {
        // Mettre à jour les pays disponibles selon le code propriétaire sélectionné
        this.filteredPaysList = this.getFilteredPays();
        
        // Mettre à jour les banques disponibles selon le code propriétaire sélectionné
        this.filteredBanqueList = this.getFilteredBanques();
        
        // Mettre à jour les services disponibles selon le code propriétaire sélectionné
        this.filteredServiceList = this.getFilteredServices();
        
        // Mettre à jour les codes propriétaires disponibles selon les autres filtres
        this.filteredCodeProprietaireList = this.getFilteredCodeProprietaire();
        
        // Nettoyer les sélections qui ne sont plus valides
        this.cleanInvalidSelections();
    }

    // Méthode pour nettoyer les sélections invalides
    cleanInvalidSelections() {
        const currentPays = this.filterForm.value.pays;
        const currentBanque = this.filterForm.value.banque;
        const currentService = this.filterForm.value.service;
        const currentCodeProprietaire = this.filterForm.value.codeProprietaire;

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

        // Nettoyer les codes propriétaires si les autres filtres ont changé
        if (currentCodeProprietaire && currentCodeProprietaire.length > 0) {
            const validCodeProprietaire = currentCodeProprietaire.filter((code: string) => 
                this.filteredCodeProprietaireList.includes(code)
            );
            if (validCodeProprietaire.length !== currentCodeProprietaire.length) {
                this.filterForm.controls['codeProprietaire'].setValue(validCodeProprietaire);
            }
        }
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
        const services = [...new Set(data.map(op => op.service).filter((s): s is string => s !== undefined && s !== null))];
        return services.sort();
    }

    getFilteredCodeProprietaire(): string[] {
        // Si pas de données operations, retourner la liste de base
        if (!this.operations || this.operations.length === 0) {
            return this.codeProprietaireList;
        }
        
        let data = this.operations;
        // Filtrer par pays si sélectionné
        if (this.filterForm.value.pays && this.filterForm.value.pays.length > 0) {
            data = data.filter(op => this.filterForm.value.pays.includes(op.pays));
        }
        // Filtrer par banque si sélectionnée
        if (this.filterForm.value.banque && this.filterForm.value.banque.length > 0) {
            data = data.filter(op => this.filterForm.value.banque.includes(op.banque));
        }
        // Filtrer par service si sélectionné
        if (this.filterForm.value.service && this.filterForm.value.service.length > 0) {
            data = data.filter(op => this.filterForm.value.service.includes(op.service));
        }
        const codeProprietaire = [...new Set(data.map(op => op.codeProprietaire).filter((c): c is string => c !== undefined && c !== null))];
        return codeProprietaire.sort();
    }

    clearFilters() {
        this.filterForm.reset({ typeOperation: '', pays: '', statut: '', banque: '', codeProprietaire: '', service: '', dateDebut: '', dateFin: '' });
        this.applyFilters();
    }

    updatePagedOperations() {
        // Obtenir tous les groupes d'opérations
        const allGroupedOperations = this.getGroupedOperations();
        
        // Gérer le cas où il n'y a pas d'opérations
        if (allGroupedOperations.length === 0) {
            this.totalPages = 1;
            this.currentPage = 1;
            this.pagedOperations = [];
            console.log('Aucune opération à afficher');
            return;
        }
        
        // Aplatir tous les groupes pour compter le nombre total de lignes
        const allOperations = allGroupedOperations.flatMap(group => [group.main, ...group.frais]);
        
        // Calculer le nombre total de pages basé sur les lignes individuelles (max 10 par page)
        this.totalPages = Math.ceil(allOperations.length / this.pageSize);
        
        // S'assurer que la page courante est valide
        if (this.currentPage > this.totalPages && this.totalPages > 0) {
            this.currentPage = this.totalPages;
        }
        if (this.currentPage < 1) {
            this.currentPage = 1;
        }
        
        // Calculer l'index de début et de fin pour la pagination des lignes
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        
        // Extraire les lignes pour la page courante
        this.pagedOperations = allOperations.slice(startIndex, endIndex);
        
        console.log(`Page ${this.currentPage}/${this.totalPages}, Lignes: ${startIndex}-${endIndex}, Total lignes: ${allOperations.length}, Lignes affichées: ${this.pagedOperations.length}`);
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
        // Calculer les statistiques basées sur les opérations filtrées
        this.totalOperations = this.filteredOperations.length;
        this.totalMontant = this.filteredOperations.reduce((sum, op) => sum + op.montant, 0);
        this.montantMoyen = this.totalOperations > 0 ? this.totalMontant / this.totalOperations : 0;
        this.operationsValidees = this.filteredOperations.filter(op => op.statut === 'Validée').length;
        
        // Log pour debug
        console.log(`Stats calculées: ${this.totalOperations} opérations, ${this.totalMontant} montant total, ${this.operationsValidees} validées`);
    }

    getOperationTypes(): string[] {
        // Récupérer tous les types d'opération disponibles
        const allTypes = Object.values(TypeOperation);
        
        // Si nous avons des statistiques, retourner les types qui ont des données
        if (this.statsByType && Object.keys(this.statsByType).length > 0) {
            return Object.keys(this.statsByType);
        }
        
        // Sinon, retourner tous les types disponibles
        return allTypes;
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
            'approvisionnement': 'Approvisionnement',
            'ajustement': 'Ajustement',
            'compense': 'Compense',
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
            'approvisionnement': 'Crédite le compte',
            'ajustement': 'Impact variable (+/-)',
            'compense': 'Débite le compte',
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

    // Détermine si une opération est un débit
    isDebitOperation(type: string): boolean {
        return [
            'total_paiement',
            'ajustement',
            'compense',
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
            'approvisionnement'
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
                case 'approvisionnement':
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
                case 'compense':
                    // L'opération d'origine était en débit, l'annulation est en crédit
                    credit = montant;
                    debit = 0;
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
            case 'ajustement':
                if (montant >= 0) {
                    debit = 0;
                    credit = montant;
                } else {
                    debit = -montant;
                    credit = 0;
                }
                break;
            case 'compense':
            case 'frais_transaction':
                debit = montant;
                credit = 0;
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
        
        // Utiliser filteredOperations au lieu de pagedOperations pour que le groupement fonctionne avec les filtres
        const operationsToGroup = this.filteredOperations.length > 0 ? this.filteredOperations : this.pagedOperations;
        
        // Séparer les opérations principales et les frais
        operationsToGroup.forEach(op => {
            if (op.typeOperation === 'FRAIS_TRANSACTION') {
                // C'est un frais, on le stocke temporairement
                const parentId = op.parentOperationId;
                if (parentId) {
                    if (!operationsMap.has(parentId)) {
                        operationsMap.set(parentId, { main: null, frais: [] });
                    }
                    const group = operationsMap.get(parentId);
                    if (group) {
                        group.frais.push(op);
                    }
                }
            } else {
                // C'est une opération principale
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
        return this.filteredOperations.some(op => 
            op.typeOperation === 'FRAIS_TRANSACTION' && 
            op.parentOperationId === operation.id
        );
    }
} 