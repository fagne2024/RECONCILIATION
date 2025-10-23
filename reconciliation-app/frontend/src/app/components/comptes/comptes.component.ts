import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { Subscription } from 'rxjs';
import { CompteService } from '../../services/compte.service';
import { Compte, CompteFilter } from '../../models/compte.model';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { OperationService } from '../../services/operation.service';
import { Operation } from '../../models/operation.model';
import * as XLSX from 'xlsx';
import { MatSelect } from '@angular/material/select';
import { Router, ActivatedRoute } from '@angular/router';
import { EcartSoldeService } from '../../services/ecart-solde.service';
import { ImpactOPService } from '../../services/impact-op.service';
import { TrxSfService } from '../../services/trx-sf.service';
import { DashboardService } from '../../services/dashboard.service';
import { StatisticsService, Statistics } from '../../services/statistics.service';
import { AgencySummaryService } from '../../services/agency-summary.service';
import { FraisTransactionService } from '../../services/frais-transaction.service';
import { FraisTransaction } from '../../models/frais-transaction.model';
import { PopupService } from '../../services/popup.service';

@Component({
    selector: 'app-comptes',
    templateUrl: './comptes.component.html',
    styleUrls: ['./comptes.component.scss']
})
export class ComptesComponent implements OnInit, OnDestroy {
    comptes: Compte[] = [];
    pagedComptes: Compte[] = [];
    currentPage = 1;
    pageSize = 7;
    totalPages = 1;
    isLoading = false;
    isAdding = false;
    isEditing = false;
    isExporting = false;
    showAddForm = false;
    showEditForm = false;
    editingCompte: Compte | null = null;

    addForm: FormGroup;
    editForm: FormGroup;
    filterForm: FormGroup;

    // Statistiques
    totalComptes = 0;
    totalSolde = 0;
    soldeMoyen = 0;
    soldeMax = 0;
    soldeMin = 0;
    paysUniques = 0;
    
    // Comptes avec soldes max et min
    compteSoldeMax: Compte | null = null;
    compteSoldeMin: Compte | null = null;

    // Listes pour les filtres dynamiques
    paysList: string[] = [];
    codeProprietaireList: string[] = [];

    comptesCritiques: { compte: Compte, moyenneVolume: number }[] = [];
    operations: Operation[] = [];

    // Propriétés pour le relevé de compte
    showReleveModal = false;
    selectedCompte: Compte | null = null;
    releveOperations: Operation[] = [];
    isLoadingReleve = false;
    releveDateDebut = '';
    releveTypeOperation = '';
    releveDateDebutCustom = '';
    releveDateFinCustom = '';
    showSoldesSeulement = false; // Pour basculer la vue
    releveSoldesJournaliers: { date: string; opening: number; closing: number; closingBo?: number }[] = [];
    
    // Propriété pour contrôler l'affichage automatique des frais
    showFraisAutomaticallyReleve: boolean = false;
    
    // Pagination pour le relevé
    releveCurrentPage = 1;
    relevePageSize = 10;
    releveTotalPages = 1;
    
    // Math pour les calculs dans le template
    Math = Math;

    private subscription = new Subscription();

    volumeJournalier: number = 10000; // Valeur par défaut, modifiable via l'interface
    periodeJours: number = 30; // Valeur par défaut : Mois

    // Pagination pour les cards de soldes critiques
    criticalPage: number = 1;
    criticalPageSize: number = 3; // Nombre de cards visibles à la fois

    // Liste déroulante pour la période
    periodeOptions = [
        { label: "Aujourd'hui", value: 1 },
        { label: "Semaine", value: 7 },
        { label: "Mois", value: 30 }
    ];

    operationTypes: string[] = [
        'total_cashin',
        'total_paiement',
        'Appro_client',
        'ajustement',
        'Compense_client',
        'FRAIS_TRANSACTION',
        'transaction_cree',
        'annulation_bo'
    ];

    selectedPays: string[] = [];
    paysSearch: string = '';
    filteredPaysList: string[] = [];
    selectedCodesProprietaire: string[] = [];
    codeProprietaireSearch: string = '';
    filteredCodeProprietaireList: string[] = [];
    selectedCategories: string[] = [];
    categorieSearch: string = '';
    filteredCategorieList: string[] = [];
    paysSearchCtrl = new FormControl('');
    codeProprietaireSearchCtrl = new FormControl('');
    categorieSearchCtrl = new FormControl('');

    // Liste des types de compte
    compteTypes: string[] = ['TOP20', 'B2B', 'G&I'];
    
    // Liste des catégories de compte
    compteCategories: string[] = ['Client', 'Service', 'Banque'];
    
    // Méthode pour obtenir la classe CSS de la catégorie
    getCategorieClass(categorie: string | undefined): string {
        if (!categorie) return 'categorie-default';
        
        switch (categorie.toLowerCase()) {
            case 'client':
                return 'categorie-client';
            case 'service':
                return 'categorie-service';
            case 'banque':
                return 'categorie-banque';
            default:
                return 'categorie-default';
        }
    }

    @ViewChild('paysSelect') paysSelect!: MatSelect;
    @ViewChild('codeProprietaireSelect') codeProprietaireSelect!: MatSelect;
    @ViewChild('categorieSelect') categorieSelect!: MatSelect;

    selectedCompteForBo: Compte | null = null;
    showSoldeBoModal = false;
    dernierSoldeBo: number | null = null;
    dateSoldeBo: string = '';

    // Propriétés pour les onglets du relevé
    activeTab = 'operations'; // 'operations' ou 'ecart-solde'
    showEcartSoldeTab = false;
    ecartSoldeAgence = '';
    ecartSoldeDateTransaction = '';

    // Cache pour les sommes des impacts OP par date
    impactOPSums: { [date: string]: number } = {};

    // Propriétés pour l'onglet Impact OP
    showImpactOPTab = false;
    impactOPAgence = '';
    impactOPDateTransaction = '';

    // Propriétés pour l'onglet Revenu Journalier
    showRevenuJournalierTab = false;
    revenuJournalierData: { date: string; totalCashin: number; totalPaiement: number; fraisCashin: number; fraisPaiement: number; revenuTotal: number; ecartFrais: number }[] = [];
    isLoadingRevenuJournalier = false;

    // Propriétés pour l'onglet Control Revenu
    showControlRevenuTab = true;
    controlRevenuData: { date: string; service: string; typeControle: string; revenuAttendu: number; revenuReel: number; ecart: number; statut: string; volume: number; nombreTrx: number; totalFraisTrxSf?: number }[] = [];
    
    // Propriétés pour le modal de détails
    showControlRevenuModal = false;
    selectedControlRevenu: any = null;
    
    // Propriétés pour la visualisation par date
    showDateViewModal = false;
    selectedDate = '';
    dateViewData: any[] = [];
    isLoadingDateView = false;
    isLoadingControlRevenu = false;

    // Propriétés pour l'onglet Écart Frais (TRX SF par date/agence)
    showEcartFraisTab = false;
    ecartFraisDate: string = '';
    ecartFraisAgence: string = '';
    ecartFraisItems: import('../../services/trx-sf.service').TrxSfData[] = [];
    isLoadingEcartFrais = false;
    // Pagination Écart Frais
    ecartFraisCurrentPage = 1;
    ecartFraisPageSize = 10;
    ecartFraisTotalPages = 1;
    
    // Pagination pour le revenu journalier
    revenuJournalierCurrentPage = 1;
    revenuJournalierPageSize = 10;
    revenuJournalierTotalPages = 1;

    // Filtres pour le revenu journalier
    revenuJournalierDateDebut = '';
    revenuJournalierDateFin = '';
    revenuJournalierMontantMin: number | null = null;
    revenuJournalierMontantMax: number | null = null;
    revenuJournalierTypeRevenu = ''; // 'cashin', 'paiement', 'total', ou ''
    revenuJournalierDataFiltered: { date: string; totalCashin: number; totalPaiement: number; fraisCashin: number; fraisPaiement: number; revenuTotal: number; ecartFrais: number }[] = [];
    
    // Informations de débogage pour le revenu journalier
    revenuJournalierDebugInfo: string = '';

    // Pagination et filtres pour le control revenu
    controlRevenuCurrentPage = 1;
    controlRevenuPageSize = 10;
    controlRevenuTotalPages = 1;
    controlRevenuDateDebut = '';
    controlRevenuDateFin = '';
    controlRevenuService = '';
    controlRevenuType = '';
    controlRevenuSeuil: number | null = null;
    controlRevenuDataFiltered: { date: string; service: string; typeControle: string; revenuAttendu: number; revenuReel: number; ecart: number; statut: string; volume: number; nombreTrx: number; totalFraisTrxSf?: number }[] = [];
    
    // Propriété pour stocker les frais paramétrés
    fraisParametres: FraisTransaction[] = [];

    constructor(
        private compteService: CompteService,
        private operationService: OperationService,
        private dashboardService: DashboardService,
        private statisticsService: StatisticsService,
        private agencySummaryService: AgencySummaryService,
        private fraisTransactionService: FraisTransactionService,
        private fb: FormBuilder,
        private router: Router,
        private route: ActivatedRoute,
        private ecartSoldeService: EcartSoldeService,
        private impactOPService: ImpactOPService,
        private trxSfService: TrxSfService,
        private popupService: PopupService
    ) {
        this.addForm = this.fb.group({
            numeroCompte: ['', [Validators.required]],
            solde: [0, [Validators.required, Validators.min(0)]],
            pays: ['', [Validators.required]],
            codeProprietaire: [''],
            type: ['', [Validators.required]], // Ajouté
            categorie: ['', [Validators.required]] // Ajouté
        });

        this.editForm = this.fb.group({
            numeroCompte: ['', [Validators.required]],
            solde: [0, [Validators.required]],
            pays: ['', [Validators.required]],
            codeProprietaire: [''],
            type: ['', [Validators.required]], // Ajouté
            categorie: ['', [Validators.required]] // Ajouté
        });

        this.filterForm = this.fb.group({
            pays: [''],
            soldeMin: [''],
            dateDebut: [''],
            dateFin: [''],
            codeProprietaire: [''],
            categorie: ['']
        });
    }

    ngOnInit() {
        this.loadComptes();
        this.loadFilterLists();
        this.loadOperationsPeriode();
        this.filteredPaysList = this.paysList;
        this.filteredCodeProprietaireList = this.codeProprietaireList;
        this.filteredCategorieList = this.compteCategories;
        
        // Vérifier s'il y a un filtre de catégorie dans les paramètres de la route
        this.route.queryParams.subscribe(params => {
            if (params['filterCategorie']) {
                const categorie = params['filterCategorie'];
                // Attendre que les comptes soient chargés avant d'appliquer le filtre
                setTimeout(() => {
                    this.selectedCategories = [categorie];
                    this.filterForm.controls['categorie'].setValue([categorie]);
                    this.applyFilters();
                }, 500);
            }
        });
        
        this.paysSearchCtrl.valueChanges.subscribe((search: string | null) => {
            const s = (search || '').toLowerCase();
            // Utiliser directement getFilteredPays() pour avoir les données les plus récentes
            const availablePays = this.getFilteredPays();
            this.filteredPaysList = availablePays.filter(p => p.toLowerCase().includes(s));
            // Sélection automatique si un seul résultat
            if (this.filteredPaysList.length === 1 && !this.selectedPays.includes(this.filteredPaysList[0])) {
                this.selectedPays = [this.filteredPaysList[0]];
                this.filterForm.controls['pays'].setValue(this.selectedPays);
                if (this.paysSelect) { this.paysSelect.close(); }
                this.updateFilteredLists();
                this.applyFilters();
            }
        });
        this.codeProprietaireSearchCtrl.valueChanges.subscribe((search: string | null) => {
            const s = (search || '').toLowerCase();
            // Utiliser directement getFilteredCodeProprietaire() pour avoir les données les plus récentes
            const availableCodeProprietaire = this.getFilteredCodeProprietaire();
            this.filteredCodeProprietaireList = availableCodeProprietaire.filter(c => c.toLowerCase().includes(s));
            // Sélection automatique si un seul résultat
            if (this.filteredCodeProprietaireList.length === 1 && !this.selectedCodesProprietaire.includes(this.filteredCodeProprietaireList[0])) {
                this.selectedCodesProprietaire = [this.filteredCodeProprietaireList[0]];
                this.filterForm.controls['codeProprietaire'].setValue(this.selectedCodesProprietaire);
                if (this.codeProprietaireSelect) { this.codeProprietaireSelect.close(); }
                this.updateFilteredLists();
                this.applyFilters();
            }
        });
        
        this.categorieSearchCtrl.valueChanges.subscribe((search: string | null) => {
            const s = (search || '').toLowerCase();
            const availableCategories = this.getFilteredCategories();
            this.filteredCategorieList = availableCategories.filter(c => c.toLowerCase().includes(s));
            // Sélection automatique si un seul résultat
            if (this.filteredCategorieList.length === 1 && !this.selectedCategories.includes(this.filteredCategorieList[0])) {
                this.selectedCategories = [this.filteredCategorieList[0]];
                this.filterForm.controls['categorie'].setValue(this.selectedCategories);
                if (this.categorieSelect) { this.categorieSelect.close(); }
                this.updateFilteredLists();
                this.applyFilters();
            }
        });

        // Synchroniser les valeurs du formulaire vers les variables locales
        this.filterForm.controls['pays'].valueChanges.subscribe((value: string[]) => {
            this.selectedPays = value || [];
        });

        this.filterForm.controls['codeProprietaire'].valueChanges.subscribe((value: string[]) => {
            this.selectedCodesProprietaire = value || [];
        });
        
        this.filterForm.controls['categorie'].valueChanges.subscribe((value: string[]) => {
            this.selectedCategories = value || [];
        });
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }

    loadComptes() {
        this.isLoading = true;
        this.subscription.add(
            this.compteService.getAllComptes().subscribe({
                next: (comptes) => {
                    this.comptes = comptes;
                    
                    // Mettre à jour les listes filtrées avec cloisonnement après chargement des comptes
                    this.updateFilteredLists();
                    
                    this.updatePagedComptes();
                    this.calculateStats();
                    this.isLoading = false;
                },
                error: (error) => {
                    console.error('Erreur lors du chargement des comptes:', error);
                    this.isLoading = false;
                }
            })
        );
    }

    addCompte() {
        console.log('addCompte() appelé');
        console.log('Form valid:', this.addForm.valid);
        console.log('Form values:', this.addForm.value);
        
        if (this.addForm.valid) {
            this.isAdding = true;
            const newCompte = this.addForm.value;
            
            this.subscription.add(
                this.compteService.createCompte(newCompte).subscribe({
                    next: (compte) => {
                        console.log('Compte créé avec succès:', compte);
                        this.comptes.unshift(compte);
                        this.updatePagedComptes();
                        this.calculateStats();
                        this.addForm.reset();
                        this.showAddForm = false;
                        this.isAdding = false;
                    },
                    error: (error) => {
                        console.error('Erreur lors de l\'ajout du compte:', error);
                        this.isAdding = false;
                        this.popupService.showError('Erreur lors de l\'ajout du compte: ' + error.message);
                    }
                })
            );
        } else {
            console.log('Formulaire invalide');
            this.markFormGroupTouched();
        }
    }

    markFormGroupTouched() {
        Object.keys(this.addForm.controls).forEach(key => {
            const control = this.addForm.get(key);
            control?.markAsTouched();
        });
    }

    cancelAdd() {
        this.showAddForm = false;
        this.addForm.reset();
    }

    closeAddModal(event: Event) {
        if (event.target === event.currentTarget) {
            this.cancelAdd();
        }
    }

    closeEditModal(event: Event) {
        if (event.target === event.currentTarget) {
            this.cancelEdit();
        }
    }

    editCompte(compte: Compte) {
        this.editingCompte = compte;
        this.showEditForm = true;
        this.editForm.patchValue({
            numeroCompte: compte.numeroCompte,
            solde: compte.solde,
            pays: compte.pays,
            codeProprietaire: compte.codeProprietaire,
            type: compte.type || '', // Ajouté
            categorie: compte.categorie || '' // Ajouté
        });
    }

    async deleteCompte(id: number) {
        const confirmed = await this.popupService.showConfirm('Êtes-vous sûr de vouloir supprimer ce compte ?');
        if (confirmed) {
            this.subscription.add(
                this.compteService.deleteCompte(id).subscribe({
                    next: (response) => {
                        if (response.success) {
                            this.comptes = this.comptes.filter(c => c.id !== id);
                            this.updatePagedComptes();
                            this.calculateStats();
                            this.popupService.showSuccess('Suppression réussie', response.message);
                        } else {
                            this.popupService.showError('Suppression impossible', response.message);
                        }
                    },
                    error: (error) => {
                        console.error('Erreur lors de la suppression:', error);
                        let errorMessage = 'Erreur lors de la suppression du compte';
                        
                        // Extraire le message d'erreur du backend si disponible
                        if (error.error && error.error.message) {
                            errorMessage = error.error.message;
                        } else if (error.message) {
                            errorMessage = error.message;
                        }
                        
                        this.popupService.showError('Erreur de suppression', errorMessage);
                    }
                })
            );
        }
    }

    applyFilters() {
        // Synchroniser les champs du formulaire avec les sélections UI
        this.filterForm.controls['pays'].setValue(this.selectedPays);
        this.filterForm.controls['codeProprietaire'].setValue(this.selectedCodesProprietaire);
        this.filterForm.controls['categorie'].setValue(this.selectedCategories);

        const filter: CompteFilter = {
            ...this.filterForm.value,
            pays: this.selectedPays,
            codeProprietaire: this.selectedCodesProprietaire,
            categorie: this.selectedCategories
        };
        console.log('Filtres appliqués:', filter);
        this.isLoading = true;
        
        this.subscription.add(
            this.compteService.filterComptes(filter).subscribe({
                next: (comptes) => {
                    console.log('Résultats du filtrage:', comptes);
                    this.comptes = comptes;
                    
                    // Mettre à jour les listes filtrées avec cloisonnement après le filtrage
                    this.updateFilteredLists();
                    
                    this.updatePagedComptes();
                    this.calculateStats();
                    this.isLoading = false;
                },
                error: (error) => {
                    console.error('Erreur lors du filtrage:', error);
                    this.isLoading = false;
                }
            })
        );
    }

    clearFilters() {
        this.filterForm.reset();
        this.selectedPays = [];
        this.selectedCodesProprietaire = [];
        this.selectedCategories = [];
        this.loadComptes();
    }

    updatePagedComptes() {
        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        this.pagedComptes = this.comptes.slice(start, end);
        this.totalPages = Math.ceil(this.comptes.length / this.pageSize);
    }

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.updatePagedComptes();
        }
    }

    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.updatePagedComptes();
        }
    }

    goToPage(page: number) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.updatePagedComptes();
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

    loadOperationsPeriode() {
        const today = new Date();
        const dateDebut = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        dateDebut.setDate(dateDebut.getDate() - (this.periodeJours - 1));
        const dateDebutStr = dateDebut.toISOString().split('T')[0];
        const dateFinStr = today.toISOString().split('T')[0];
        this.operationService.getOperationsByDateRange(dateDebutStr, dateFinStr).subscribe({
            next: (ops) => {
                this.operations = ops;
                this.calculateStats();
            },
            error: (err) => {
                console.error('Erreur lors du chargement des opérations de la période', err);
                this.operations = [];
                this.calculateStats();
            }
        });
    }

    onPeriodeJoursChange() {
        this.criticalPage = 1;
        this.loadOperationsPeriode();
    }

    calculateStats() {
        this.totalComptes = this.comptes.length;
        this.totalSolde = this.comptes.reduce((sum, compte) => sum + compte.solde, 0);
        this.soldeMoyen = this.totalComptes > 0 ? this.totalSolde / this.totalComptes : 0;
        
        if (this.totalComptes > 0) {
            this.soldeMax = Math.max(...this.comptes.map(c => c.solde));
            this.soldeMin = Math.min(...this.comptes.map(c => c.solde));
        } else {
            this.soldeMax = 0;
            this.soldeMin = 0;
        }
        
        this.paysUniques = new Set(this.comptes.map(c => c.pays)).size;
        
        this.compteSoldeMax = this.comptes.find(c => c.solde === this.soldeMax) || null;
        this.compteSoldeMin = this.comptes.find(c => c.solde === this.soldeMin) || null;

        // Calcul dynamique de la moyenne du volume journalier sur la période choisie pour chaque compte
        const jours = this.periodeJours;
        // Ne considérer que: (a) services fusionnés (consolidés) ET (b) toujours inclure Clients et Banques
        const comptesEligibles = this.comptes.filter(c => {
            const isClient = c.categorie === 'Client';
            const isBanque = c.categorie === 'Banque';
            const isServiceConsolide = c.categorie === 'Service' && (c.consolide === true);
            return isClient || isBanque || isServiceConsolide;
        });

        this.comptesCritiques = comptesEligibles.map(c => {
            // Regrouper les opérations par jour, types 'total_cashin', 'Compense_client' et 'Compense_fournisseur' (débits)
            const opsCompte = this.operations.filter(op => op.compteId === c.id && 
                (op.typeOperation === 'total_cashin' || op.typeOperation === 'Compense_client' || op.typeOperation === 'Compense_fournisseur'));
            const volumesParJour: { [date: string]: number } = {};
            opsCompte.forEach(op => {
                const d = new Date(op.dateOperation);
                const dateStr = d.toISOString().split('T')[0];
                if (!volumesParJour[dateStr]) volumesParJour[dateStr] = 0;
                volumesParJour[dateStr] += op.montant;
            });
            // Moyenne sur la période (même si certains jours = 0)
            const totalVolume = Object.values(volumesParJour).reduce((sum, v) => sum + v, 0);
            const moyenne = totalVolume / jours;
            return { compte: c, moyenneVolume: moyenne };
        }).filter(item => item.compte.solde < item.moyenneVolume)
        // Ordonner par solde croissant (du plus faible au plus élevé)
        .sort((a, b) => a.compte.solde - b.compte.solde);
    }

    formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    async exportComptes() {
        this.isExporting = true;
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Comptes');

            worksheet.columns = [
                { header: 'Numéro de Compte', key: 'numeroCompte', width: 20 },
                { header: 'Solde', key: 'solde', width: 15 },
                { header: 'Date Dernière MAJ', key: 'dateDerniereMaj', width: 20 },
                { header: 'Pays', key: 'pays', width: 15 }
            ];

            worksheet.getRow(1).eachCell(cell => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF1976D2' }
                };
                cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
            });

            this.comptes.forEach((compte, idx) => {
                const row = worksheet.addRow({
                    numeroCompte: compte.numeroCompte,
                    solde: compte.solde,
                    dateDerniereMaj: this.formatDate(compte.dateDerniereMaj),
                    pays: compte.pays
                });

                if (idx % 2 === 1) {
                    row.eachCell(cell => {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFE3F2FD' }
                        };
                    });
                }
            });

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `comptes_${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (error) {
            console.error('Erreur lors de l\'export:', error);
        } finally {
            this.isExporting = false;
        }
    }

    goToServiceBalance() {
        this.router.navigate(['/service-balance']);
    }

    async exportSoldesCritiques() {
        this.isExporting = true;
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Soldes Critiques');

            worksheet.columns = [
                { header: 'Position', key: 'position', width: 10 },
                { header: 'Code Propriétaire', key: 'codeProprietaire', width: 22 },
                { header: 'Solde Actuel', key: 'solde', width: 15 },
                { header: `Moyenne Volume (${this.periodeJours}j)`, key: 'moyenneVolume', width: 20 },
                { header: 'Ratio Criticité', key: 'ratioCriticite', width: 15 },
                { header: 'Pays', key: 'pays', width: 15 },
                { header: 'Numéro de Compte', key: 'numeroCompte', width: 20 },
                { header: 'Date Dernière MAJ', key: 'dateDerniereMaj', width: 20 }
            ];

            // Style de l'en-tête
            worksheet.getRow(1).eachCell(cell => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFF5722' } // Rouge pour indiquer la criticité
                };
                cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
            });

            // Ajouter les données des soldes critiques
            this.comptesCritiques.forEach((item, idx) => {
                const ratioCriticite = item.compte.solde / item.moyenneVolume;
                const row = worksheet.addRow({
                    position: idx + 1,
                    codeProprietaire: item.compte.codeProprietaire || '-',
                    solde: item.compte.solde,
                    moyenneVolume: item.moyenneVolume,
                    ratioCriticite: ratioCriticite.toFixed(2),
                    pays: item.compte.pays,
                    numeroCompte: item.compte.numeroCompte,
                    dateDerniereMaj: this.formatDate(item.compte.dateDerniereMaj)
                });

                // Colorer les lignes selon la criticité
                const ratio = ratioCriticite;
                let fillColor = 'FFFFFFFF'; // Blanc par défaut
                
                if (ratio < 0.3) {
                    fillColor = 'FFFFCDD2'; // Rouge clair pour très critique
                } else if (ratio < 0.6) {
                    fillColor = 'FFFFE0B2'; // Orange clair pour critique
                } else if (ratio < 0.8) {
                    fillColor = 'FFFFF3E0'; // Jaune clair pour modérément critique
                }

                row.eachCell(cell => {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: fillColor }
                    };
                });
            });

            // Ajouter un résumé
            const summaryRow = worksheet.addRow([]);
            const summaryRow2 = worksheet.addRow(['Résumé:', '', '', '', '', '', '', '']);
            const summaryRow3 = worksheet.addRow(['Total comptes critiques:', this.comptesCritiques.length, '', '', '', '', '', '', '']);
            const summaryRow4 = worksheet.addRow(['Période analysée:', `${this.periodeJours} jours`, '', '', '', '', '', '', '']);
            const summaryRow5 = worksheet.addRow(['Date d\'export:', new Date().toLocaleDateString('fr-FR'), '', '', '', '', '', '', '']);

            // Style du résumé
            [summaryRow2, summaryRow3, summaryRow4, summaryRow5].forEach(row => {
                row.eachCell((cell, colNumber) => {
                    if (colNumber === 1) {
                        cell.font = { bold: true };
                    }
                });
            });

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `soldes_critiques_${this.periodeJours}j_${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (error) {
            console.error('Erreur lors de l\'export des soldes critiques:', error);
        } finally {
            this.isExporting = false;
        }
    }

    updateCompte() {
        console.log('updateCompte() appelé');
        console.log('Form valid:', this.editForm.valid);
        console.log('Form values:', this.editForm.value);
        
        if (this.editForm.valid && this.editingCompte) {
            this.isEditing = true;
            const updatedCompte = this.editForm.value;
            
            this.subscription.add(
                this.compteService.updateCompte(this.editingCompte.id!, updatedCompte).subscribe({
                    next: (compte) => {
                        console.log('Compte mis à jour avec succès:', compte);
                        this.comptes = this.comptes.map(c => c.id === compte.id ? compte : c);
                        this.updatePagedComptes();
                        this.calculateStats();
                        this.showEditForm = false;
                        this.isEditing = false;
                        this.editingCompte = null;
                    },
                    error: (error) => {
                        console.error('Erreur lors de la mise à jour du compte:', error);
                        this.isEditing = false;
                        this.popupService.showError('Erreur lors de la mise à jour du compte: ' + error.message);
                    }
                })
            );
        } else {
            console.log('Formulaire invalide');
            this.markEditFormGroupTouched();
        }
    }

    markEditFormGroupTouched() {
        Object.keys(this.editForm.controls).forEach(key => {
            const control = this.editForm.get(key);
            control?.markAsTouched();
        });
    }

    cancelEdit() {
        this.showEditForm = false;
        this.editForm.reset();
        this.editingCompte = null;
    }

    loadFilterLists() {
        this.subscription.add(
            this.compteService.getDistinctPays().subscribe({
                next: (paysList: string[]) => {
                    this.paysList = paysList;
                    this.filteredPaysList = paysList;
                    // Mettre à jour les listes filtrées avec cloisonnement après chargement des données
                    setTimeout(() => {
                        this.updateFilteredLists();
                    }, 100);
                },
                error: (error: any) => {
                    console.error('Erreur lors du chargement de la liste des pays:', error);
                }
            })
        );

        this.subscription.add(
            this.compteService.getDistinctCodeProprietaire().subscribe({
                next: (codeProprietaireList: string[]) => {
                    this.codeProprietaireList = codeProprietaireList;
                    this.filteredCodeProprietaireList = codeProprietaireList;
                    // Mettre à jour les listes filtrées avec cloisonnement après chargement des données
                    setTimeout(() => {
                        this.updateFilteredLists();
                    }, 100);
                },
                error: (error: any) => {
                    console.error('Erreur lors du chargement de la liste des codes propriétaires:', error);
                }
            })
        );
    }

    onPaysChange(event: any) {
        this.selectedPays = event.value;
        console.log('onPaysChange called, selectedPays:', this.selectedPays, 'event:', event);
        this.filterForm.controls['pays'].setValue(this.selectedPays);
        
        // Mettre à jour les listes filtrées pour le cloisonnement
        this.updateFilteredLists();
        
        this.applyFilters();
        
        // Fermer automatiquement le dropdown après un choix
        setTimeout(() => {
            if (this.paysSelect) this.paysSelect.close();
        }, 100);
    }

    onCodeProprietaireChange(event: any) {
        this.selectedCodesProprietaire = event.value;
        console.log('onCodeProprietaireChange called, selectedCodesProprietaire:', this.selectedCodesProprietaire, 'event:', event);
        this.filterForm.controls['codeProprietaire'].setValue(this.selectedCodesProprietaire);
        
        // Mettre à jour les listes filtrées pour le cloisonnement
        this.updateFilteredLists();
        
        this.applyFilters();
        
        // Fermer automatiquement le dropdown après un choix
        setTimeout(() => {
            if (this.codeProprietaireSelect) this.codeProprietaireSelect.close();
        }, 100);
    }
    
    onCategorieChange(event: any) {
        this.selectedCategories = event.value;
        console.log('onCategorieChange called, selectedCategories:', this.selectedCategories, 'event:', event);
        this.filterForm.controls['categorie'].setValue(this.selectedCategories);
        
        // Mettre à jour les listes filtrées pour le cloisonnement
        this.updateFilteredLists();
        
        this.applyFilters();
        
        // Fermer automatiquement le dropdown après un choix
        setTimeout(() => {
            if (this.categorieSelect) this.categorieSelect.close();
        }, 100);
    }

    // Méthode pour mettre à jour les listes filtrées avec cloisonnement
    updateFilteredLists() {
        // Mettre à jour les codes propriétaires disponibles selon le pays sélectionné
        this.filteredCodeProprietaireList = this.getFilteredCodeProprietaire();
        
        // Mettre à jour les pays disponibles selon le code propriétaire sélectionné
        this.filteredPaysList = this.getFilteredPays();
        
        // Mettre à jour les catégories disponibles selon les autres filtres
        this.filteredCategorieList = this.getFilteredCategories();
        
        // Nettoyer les sélections qui ne sont plus valides
        this.cleanInvalidSelections();
        
        console.log('updateFilteredLists - filteredPaysList:', this.filteredPaysList);
        console.log('updateFilteredLists - filteredCodeProprietaireList:', this.filteredCodeProprietaireList);
        console.log('updateFilteredLists - filteredCategorieList:', this.filteredCategorieList);
    }

    // Méthode pour nettoyer les sélections invalides
    cleanInvalidSelections() {
        const currentPays = this.selectedPays;
        const currentCodeProprietaire = this.selectedCodesProprietaire;
        const currentCategories = this.selectedCategories;

        // Nettoyer les codes propriétaires si le pays a changé
        if (currentCodeProprietaire && currentCodeProprietaire.length > 0) {
            const validCodeProprietaire = currentCodeProprietaire.filter((code: string) => 
                this.filteredCodeProprietaireList.includes(code)
            );
            if (validCodeProprietaire.length !== currentCodeProprietaire.length) {
                this.selectedCodesProprietaire = validCodeProprietaire;
                this.filterForm.controls['codeProprietaire'].setValue(validCodeProprietaire);
            }
        }

        // Nettoyer les pays si le code propriétaire a changé
        if (currentPays && currentPays.length > 0) {
            const validPays = currentPays.filter((pays: string) => 
                this.filteredPaysList.includes(pays)
            );
            if (validPays.length !== currentPays.length) {
                this.selectedPays = validPays;
                this.filterForm.controls['pays'].setValue(validPays);
            }
        }
        
        // Nettoyer les catégories si les autres filtres ont changé
        if (currentCategories && currentCategories.length > 0) {
            const validCategories = currentCategories.filter((categorie: string) => 
                this.filteredCategorieList.includes(categorie)
            );
            if (validCategories.length !== currentCategories.length) {
                this.selectedCategories = validCategories;
                this.filterForm.controls['categorie'].setValue(validCategories);
            }
        }
    }

    // Méthodes de filtrage avec cloisonnement
    getFilteredPays(): string[] {
        // Si pas de données comptes, retourner la liste de base
        if (!this.comptes || this.comptes.length === 0) {
            return this.paysList;
        }
        
        let data = this.comptes;
        // Filtrer par code propriétaire si sélectionné
        if (this.selectedCodesProprietaire && this.selectedCodesProprietaire.length > 0) {
            data = data.filter(c => c.codeProprietaire && this.selectedCodesProprietaire.includes(c.codeProprietaire));
        }
        const pays = [...new Set(data.map(c => c.pays).filter((p): p is string => p !== undefined && p !== null))];
        return pays.sort();
    }

    getFilteredCodeProprietaire(): string[] {
        // Si pas de données comptes, retourner la liste de base
        if (!this.comptes || this.comptes.length === 0) {
            return this.codeProprietaireList;
        }
        
        let data = this.comptes;
        // Filtrer par pays si sélectionné (cloisonnement principal)
        if (this.selectedPays && this.selectedPays.length > 0) {
            data = data.filter(c => c.pays && this.selectedPays.includes(c.pays));
        }
        const codeProprietaire = [...new Set(data.map(c => c.codeProprietaire).filter((c): c is string => c !== undefined && c !== null))];
        return codeProprietaire.sort();
    }
    
    getFilteredCategories(): string[] {
        // Si pas de données comptes, retourner la liste de base
        if (!this.comptes || this.comptes.length === 0) {
            return this.compteCategories;
        }
        
        let data = this.comptes;
        // Filtrer par pays si sélectionné
        if (this.selectedPays && this.selectedPays.length > 0) {
            data = data.filter(c => c.pays && this.selectedPays.includes(c.pays));
        }
        // Filtrer par code propriétaire si sélectionné
        if (this.selectedCodesProprietaire && this.selectedCodesProprietaire.length > 0) {
            data = data.filter(c => c.codeProprietaire && this.selectedCodesProprietaire.includes(c.codeProprietaire));
        }
        const categories = [...new Set(data.map(c => c.categorie).filter((c): c is string => c !== undefined && c !== null))];
        return categories.sort();
    }

    get pagedComptesCritiques() {
        const start = (this.criticalPage - 1) * this.criticalPageSize;
        return this.comptesCritiques.slice(start, start + this.criticalPageSize);
    }

    get totalCriticalPages() {
        return Math.ceil(this.comptesCritiques.length / this.criticalPageSize) || 1;
    }

    prevCriticalPage() {
        if (this.criticalPage > 1) this.criticalPage--;
    }

    nextCriticalPage() {
        if (this.criticalPage < this.totalCriticalPages) this.criticalPage++;
    }

    toggleReleveView(): void {
        this.showSoldesSeulement = !this.showSoldesSeulement;
        this.calculateRelevePagination();
    }

    // Méthodes pour le relevé de compte
    viewReleve(compte: Compte): void {
        this.selectedCompte = compte;
        this.showReleveModal = true;
        this.showRevenuJournalierTab = true; // Activer l'onglet revenu journalier
        this.showControlRevenuTab = true; // Activer l'onglet Control revenu
        this.loadReleveOperations();
    }

    closeReleveModal(): void {
        this.showReleveModal = false;
        this.selectedCompte = null;
        this.releveOperations = [];
        this.releveSoldesJournaliers = [];
        this.showSoldesSeulement = false;
        this.releveDateDebut = '';
        this.releveTypeOperation = '';
        this.releveDateDebutCustom = '';
        this.releveDateFinCustom = '';
        this.releveCurrentPage = 1;
        this.releveTotalPages = 1;
    }

    onRelevePeriodChange(): void {
        // Réinitialiser les dates personnalisées si on change de période
        if (this.releveDateDebut !== 'custom') {
            this.releveDateDebutCustom = '';
            this.releveDateFinCustom = '';
        }
        this.loadReleveOperations();
    }

    loadReleveOperations(): void {
        if (!this.selectedCompte) return;

        this.isLoadingReleve = true;
        this.releveOperations = [];
        this.releveSoldesJournaliers = [];

        // Construire les paramètres de filtrage
        let dateDebut: string | null = null;
        let dateFin: string | null = null;

        // Ajouter les filtres de date
        if (this.releveDateDebut === 'custom') {
            dateDebut = this.releveDateDebutCustom || null;
            dateFin = this.releveDateFinCustom || null;
        } else if (this.releveDateDebut) {
            const jours = parseInt(this.releveDateDebut);
            const dateFinObj = new Date();
            const dateDebutObj = new Date();
            dateDebutObj.setDate(dateDebutObj.getDate() - jours);
            dateDebut = dateDebutObj.toISOString().split('T')[0];
            dateFin = dateFinObj.toISOString().split('T')[0];
        }

        this.operationService.getOperationsByCompteForReleve(
            this.selectedCompte.numeroCompte,
            dateDebut,
            dateFin,
            this.releveTypeOperation || null
        ).subscribe({
            next: (operations: any[]) => {
                this.releveOperations = operations;
                this.processReleveOperations();
                this.calculateRelevePagination();
                this.isLoadingReleve = false;
                
                // Charger les sommes des impacts OP après avoir chargé les opérations
                this.loadImpactOPSums();
            },
            error: (error: any) => {
                console.error('Erreur lors du chargement du relevé:', error);
                this.isLoadingReleve = false;
            }
        });
    }

    // Méthode pour charger les sommes des impacts OP
    loadImpactOPSums(): void {
        if (!this.selectedCompte || this.releveSoldesJournaliers.length === 0) return;

        // Vider le cache
        this.impactOPSums = {};

        // Charger les sommes pour chaque date
        this.releveSoldesJournaliers.forEach(solde => {
            this.impactOPService.getImpactOPSumForDate(solde.date, this.selectedCompte!.numeroCompte).subscribe({
                next: (sum) => {
                    this.impactOPSums[solde.date] = sum;
                },
                error: (error) => {
                    console.error('Erreur lors du chargement de la somme Impact OP pour la date:', solde.date, error);
                    this.impactOPSums[solde.date] = 0;
                }
            });
        });
    }

    // Méthode pour traiter les opérations du relevé (calcul des soldes, etc.)
    private processReleveOperations(): void {
        // Calculer et stocker les soldes journaliers
        const dailyBalances = this.getDailyBalances(this.releveOperations);
        this.releveSoldesJournaliers = Object.entries(dailyBalances)
            .filter(([key]) => key !== '_globalOpening')
            .map(([date, balances]) => ({
                date,
                opening: balances.opening,
                closing: balances.closing,
                closingBo: undefined // valeur initiale
            }))
            // Trier du plus récent au plus ancien pour l'affichage
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Après le calcul de this.releveSoldesJournaliers dans loadReleveOperations()
        this.releveSoldesJournaliers.forEach(solde => {
            this.compteService.getSoldeBo(this.selectedCompte?.numeroCompte || '', solde.date)
                .subscribe(val => {
                    if (val !== null && val !== undefined) solde.closingBo = val;
                });
        });

        this.calculateRelevePagination();
        this.isLoadingReleve = false;
    }

    // Méthode pour recalculer le solde de clôture après validation d'une opération
    public recalculateClosingBalance(): void {
        if (this.releveOperations && this.releveOperations.length > 0) {
            // Recalculer les soldes journaliers
            this.processReleveOperations();
        }
    }

    calculateRelevePagination(): void {
        this.releveCurrentPage = 1;
        if (this.showSoldesSeulement) {
            this.releveTotalPages = Math.ceil(this.releveSoldesJournaliers.length / this.relevePageSize);
        } else {
            // Calculer la pagination basée sur les groupes d'opérations
            const allGroupedOperations = this.getGroupedReleveOperations();
            const allOperations = allGroupedOperations.flatMap(group => [group.main, ...group.frais]);
            this.releveTotalPages = Math.ceil(allOperations.length / this.relevePageSize);
        }
    }

    get pagedReleveOperations(): Operation[] {
        // Obtenir tous les groupes d'opérations du relevé
        const allGroupedOperations = this.getGroupedReleveOperations();
        
        // Aplatir tous les groupes pour compter le nombre total de lignes
        const allOperations = allGroupedOperations.flatMap(group => [group.main, ...group.frais]);
        
        // Calculer l'index de début et de fin pour la pagination des lignes
        const startIndex = (this.releveCurrentPage - 1) * this.relevePageSize;
        const endIndex = startIndex + this.relevePageSize;
        
        // Extraire les lignes pour la page courante
        return allOperations.slice(startIndex, endIndex);
    }

    // Méthode pour grouper les opérations du relevé avec leurs frais
    getGroupedReleveOperations(): Array<{main: Operation, frais: Operation[]}> {
        const grouped: Array<{main: Operation, frais: Operation[]}> = [];
        const operationsMap = new Map<number, {main: Operation | null, frais: Operation[]}>();
        
        // Utiliser releveOperations pour le groupement
        const operationsToGroup = this.releveOperations;
        
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
                // Trier les frais par date d'opération du plus récent au plus ancien
                const sortedFrais = group.frais.sort((a, b) => 
                    new Date(b.dateOperation).getTime() - new Date(a.dateOperation).getTime()
                );
                
                grouped.push({
                    main: group.main,
                    frais: sortedFrais
                });
            }
        });
        
        // Trier les groupes par date d'opération du plus récent au plus ancien
        return grouped.sort((a, b) => 
            new Date(b.main.dateOperation).getTime() - new Date(a.main.dateOperation).getTime()
        );
    }

    // Méthode pour vérifier si une opération du relevé a des frais associés
    hasAssociatedFraisReleve(operation: Operation): boolean {
        if (!operation.id) return false;
        
        // Vérifier s'il y a des frais associés à cette opération dans le relevé
        return this.releveOperations.some(op => 
            op.typeOperation === 'FRAIS_TRANSACTION' && 
            op.parentOperationId === operation.id
        );
    }

    // Méthode pour déterminer si on doit afficher automatiquement les frais dans le relevé
    shouldShowFraisAutomaticallyReleve(selectedType: string): boolean {
        if (!selectedType || selectedType === '') {
            return false;
        }
        
        // Types d'opérations qui doivent afficher automatiquement leurs frais
        const typesWithFrais = [
            'total_cashin',
            'total_paiement', 
            'transaction_cree',
            'annulation_bo'
        ];
        
        // Vérifier si le type sélectionné est dans la liste
        return typesWithFrais.includes(selectedType);
    }

    get pagedReleveSoldes(): { date: string; opening: number; closing: number; closingBo?: number }[] {
        const startIndex = (this.releveCurrentPage - 1) * this.relevePageSize;
        const endIndex = startIndex + this.relevePageSize;
        return this.releveSoldesJournaliers.slice(startIndex, endIndex);
    }

    prevRelevePage(): void {
        if (this.releveCurrentPage > 1) {
            this.releveCurrentPage--;
        }
    }

    nextRelevePage(): void {
        if (this.releveCurrentPage < this.releveTotalPages) {
            this.releveCurrentPage++;
        }
    }

    goToRelevePage(page: number): void {
        if (page >= 1 && page <= this.releveTotalPages) {
            this.releveCurrentPage = page;
        }
    }

    getVisibleRelevePages(): number[] {
        const totalPages = this.releveTotalPages;
        const currentPage = this.releveCurrentPage;
        const maxVisible = 5;
        
        if (totalPages <= maxVisible) {
            return Array.from({length: totalPages}, (_, i) => i + 1);
        }
        
        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);
        
        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }
        
        return Array.from({length: end - start + 1}, (_, i) => start + i);
    }

    getOperationTypeLabel(type: string): string {
        const labels: { [key: string]: string } = {
            'total_cashin': 'Total Cash-in',
            'total_paiement': 'Total Paiement',
            'Appro_client': 'Appro_client',
            'ajustement': 'Ajustement',
            'Compense_client': 'Compense_client',
            'frais_transaction': 'Frais Transaction',
            'annulation_partenaire': 'Annulation Partenaire',
            'annulation_bo': 'Annulation BO',
            'transaction_cree': 'Transaction Dénouée'
        };
        return labels[type] || type;
    }

    getOperationTypeClass(type: string): string {
        const classes: { [key: string]: string } = {
            'total_cashin': 'type-cashin',
            'total_paiement': 'type-paiement',
            'Appro_client': 'type-appro',
            'ajustement': 'type-ajustement',
            'Compense_client': 'type-compense',
            'frais_transaction': 'type-frais',
            'annulation_partenaire': 'type-annulation',
            'annulation_bo': 'type-annulation-bo',
            'transaction_cree': 'type-transaction-cree'
        };
        return classes[type] || '';
    }

    exportReleve(): void {
        if (!this.selectedCompte) return;
        if (this.showSoldesSeulement && this.releveSoldesJournaliers.length === 0) {
            console.log('Export annulé : aucun solde à exporter.');
            return;
        }
        if (!this.showSoldesSeulement && this.releveOperations.length === 0) {
            console.log('Export annulé : aucune opération à exporter.');
            return;
        }

        this.isExporting = true;
        try {
            if (this.showSoldesSeulement) {
                this.exportReleveSoldes();
            } else {
                this.exportReleveComplet();
            }
        } catch (error) {
            console.error("Erreur lors de l'export du relevé :", error);
        } finally {
            this.isExporting = false;
        }
    }

    private exportReleveSoldes(): void {
        if (!this.selectedCompte) return;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Soldes Journaliers');

        // En-tête
        worksheet.addRow(['Date', 'Solde d\'ouverture', 'Solde de clôture', 'Variation', 'Solde de Clôture BO', 'Ecart de solde', 'Ecart régularisé']);

        // Données
        this.releveSoldesJournaliers.forEach(solde => {
          const variation = solde.closing - solde.opening;
          const ecart = this.getEcartValue(solde);
          const impactOP = this.getImpactOPValue(solde);
          const row = worksheet.addRow([
            this.formatDate(solde.date).split(' ')[0],
            solde.opening,
            solde.closing,
            variation,
            solde.closingBo !== undefined ? solde.closingBo : '',
            ecart,
            impactOP
          ]);

          // Appliquer les couleurs
          if (solde.closingBo !== undefined) {
            const closing = Math.round(solde.closing * 100) / 100;
            const closingBo = Math.round(solde.closingBo * 100) / 100;
            if (closing === closingBo) {
              // Les deux en vert
              row.getCell(3).fill = row.getCell(5).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD0FFD0' } // Vert clair
              };
              row.getCell(3).font = row.getCell(5).font = { color: { argb: 'FF2E7D32' }, bold: true };
            } else {
              // Clôture en noir, BO en rouge
              row.getCell(3).font = { color: { argb: 'FF222222' }, bold: true };
              row.getCell(5).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFD0D0' } // Rouge clair
              };
              row.getCell(5).font = { color: { argb: 'FFC62828' }, bold: true };
            }
          }

          // Appliquer les couleurs pour la colonne Ecart de solde
          const tolerance = 0.01; // 1 centime de tolérance
          if (Math.abs(ecart) <= tolerance) {
            row.getCell(6).fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFE8F5E8' } // Vert clair amélioré
            };
            row.getCell(6).font = { color: { argb: 'FF2E7D32' }, bold: true };
          } else if (ecart > 0) {
            row.getCell(6).fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFF3E0' } // Orange clair amélioré
            };
            row.getCell(6).font = { color: { argb: 'FFF57C00' }, bold: true };
          } else {
            row.getCell(6).fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFEBEE' } // Rouge clair amélioré
            };
            row.getCell(6).font = { color: { argb: 'FFC62828' }, bold: true };
          }

          // Appliquer les couleurs pour la colonne Ecart régularisé
          if (Math.abs(impactOP) <= tolerance) {
            row.getCell(7).fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFE8F5E8' } // Vert clair amélioré
            };
            row.getCell(7).font = { color: { argb: 'FF2E7D32' }, bold: true };
          } else if (impactOP > 0) {
            row.getCell(7).fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFF3E0' } // Orange clair amélioré
            };
            row.getCell(7).font = { color: { argb: 'FFF57C00' }, bold: true };
          } else {
            row.getCell(7).fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFEBEE' } // Rouge clair amélioré
            };
            row.getCell(7).font = { color: { argb: 'FFC62828' }, bold: true };
          }
        });

        // Largeurs de colonnes
        worksheet.columns = [
          { width: 15 },
          { width: 20 },
          { width: 20 },
          { width: 20 },
          { width: 20 },
          { width: 20 },
          { width: 20 }
        ];

        // Style de l'en-tête
        worksheet.getRow(1).eachCell(cell => {
          cell.font = { bold: true };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
        });

        workbook.xlsx.writeBuffer().then(buffer => {
          const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          saveAs(
            blob,
            `releve_soldes_${this.selectedCompte?.numeroCompte || 'compte'}_${new Date().toISOString().split('T')[0]}.xlsx`
          );
        });
    }

    private exportReleveComplet(): void {
        if (!this.selectedCompte || this.releveOperations.length === 0) return;

        // Créer un tableau complet avec en-tête et données
        const tableData = [];
        // En-tête avec informations du compte
        tableData.push(['RELEVÉ DE COMPTE', '', '', '', '', '', '']);
        tableData.push(['', '', '', '', '', '', '']);
        tableData.push(['Numéro de compte:', this.selectedCompte.numeroCompte, '', 'Solde actuel:', this.selectedCompte.solde, '', '']);
        tableData.push(['Pays:', this.selectedCompte.pays, '', 'Code propriétaire:', this.selectedCompte.codeProprietaire || '-', '', '']);
        tableData.push(['Dernière mise à jour:', this.formatDate(this.selectedCompte.dateDerniereMaj), '', '', '', '', '']);
        tableData.push(['', '', '', '', '', '', '']);
        // Informations sur les filtres appliqués
        let filterInfo = 'Historique complet';
        if (this.releveDateDebut === 'custom' && (this.releveDateDebutCustom || this.releveDateFinCustom)) {
            filterInfo = `Période: ${this.releveDateDebutCustom || 'Début'} à ${this.releveDateFinCustom || 'Fin'}`;
        } else if (this.releveDateDebut) {
            const jours = parseInt(this.releveDateDebut);
            filterInfo = `Derniers ${jours} jours`;
        }
        if (this.releveTypeOperation) {
            filterInfo += ` | Type: ${this.getOperationTypeLabel(this.releveTypeOperation)}`;
        }
        tableData.push([filterInfo, '', '', '', '', '', '']);
        tableData.push(['', '', '', '', '', '', '']);
        // En-tête du tableau des opérations
        tableData.push([
            'Date',
            'Type d\'opération',
            'Débit',
            'Crédit',
            'Solde avant',
            'Solde après',
            'Service'
        ]);
        // Utiliser la même logique que l'affichage : opérations groupées puis aplaties
        const allGroupedOperations = this.getGroupedReleveOperations();
        const allOperations = allGroupedOperations.flatMap(group => [group.main, ...group.frais]);
        
        // Ajout d'une méthode utilitaire pour grouper les opérations par date et calculer les soldes d'ouverture/clôture
        const dailyBalances = this.getDailyBalances(this.releveOperations);
        let lastDate = '';
        allOperations.forEach((op, idx) => {
            const date = op.dateOperation ? op.dateOperation.split('T')[0] : '';
            if (date && date !== lastDate) {
                // Ligne solde d'ouverture
                tableData.push([
                    this.formatDate(date),
                    'Solde d\'ouverture',
                    '', '',
                    this.formatMontant(dailyBalances[date]?.opening ?? ''),
                    '', ''
                ]);
                // Ligne d'espacement
                tableData.push(['', '', '', '', '', '', '']);
                lastDate = date;
            }
            // Calcul Débit/Crédit selon la logique métier (exclusif)
            let debit = '';
            let credit = '';
            if (op.typeOperation.startsWith('annulation_')) {
                // Logique spéciale pour les opérations d'annulation (impact inverse)
                if (this.isAnnulationDebit(op)) {
                    debit = this.formatMontant(op.montant);
                } else if (this.isAnnulationCredit(op)) {
                    credit = this.formatMontant(op.montant);
                }
            } else if (this.isFraisTransactionCredit(op)) {
                credit = this.formatMontant(op.montant);
            } else if (this.isFraisTransactionDebit(op)) {
                debit = this.formatMontant(op.montant);
            } else if (this.isCreditOperation(op.typeOperation, op.service, op.montant)) {
                credit = this.formatMontant(op.montant);
            } else if (this.isDebitOperation(op.typeOperation, op.service, op.montant)) {
                debit = this.formatMontant(op.montant);
            }
            tableData.push([
                this.formatDate(op.dateOperation),
                this.getOperationTypeLabel(op.typeOperation),
                debit,
                credit,
                this.formatMontant(op.soldeAvant),
                this.formatMontant(op.soldeApres),
                op.service || '-'
            ]);
            // Ajout de la ligne de solde de clôture UNIQUEMENT si c'est la dernière opération de la journée
            const isLastOfDay = idx === allOperations.length - 1 ||
                (allOperations[idx + 1] && (allOperations[idx + 1].dateOperation ? allOperations[idx + 1].dateOperation.split('T')[0] : '') !== date);
            if (isLastOfDay) {
                // Ligne d'espacement avant
                tableData.push(['', '', '', '', '', '', '']);
                tableData.push([
                    this.formatDate(date),
                    'Solde de clôture',
                    '', '',
                    this.formatMontant(dailyBalances[date]?.closing ?? ''),
                    '', ''
                ]);
                // Ligne d'espacement après
                tableData.push(['', '', '', '', '', '', '']);
            }
        });
        // Ajouter un résumé en bas
        tableData.push(['', '', '', '', '', '', '']);
        tableData.push(['RÉSUMÉ', '', '', '', '', '', '']);
        tableData.push(['Total opérations:', allOperations.length, '', '', '', '', '']);

        // Calculs totaux par type et totaux débit/crédit
        const totalsByType: { [type: string]: { debit: number, credit: number } } = {};
        let totalDebit = 0;
        let totalCredit = 0;
        allOperations.forEach(op => {
            const { debit, credit } = this.getDebitCreditForOperation(op);
            const typeLabel = this.getOperationTypeLabel(op.typeOperation);
            if (!totalsByType[typeLabel]) totalsByType[typeLabel] = { debit: 0, credit: 0 };
            totalsByType[typeLabel].debit += debit;
            totalsByType[typeLabel].credit += credit;
            totalDebit += debit;
            totalCredit += credit;
        });
        Object.entries(totalsByType).forEach(([type, total]) => {
            tableData.push([
                `Total ${type}:`,
                '',
                this.formatMontant(total.debit),
                this.formatMontant(total.credit),
                '', '', ''
            ]);
        });
        tableData.push(['', '', '', '', '', '', '']);
        tableData.push(['Total Débit:', this.formatMontant(totalDebit), '', '', '', '', '']);
        tableData.push(['Total Crédit:', this.formatMontant(totalCredit), '', '', '', '', '']);
        tableData.push(['Différence (Débit - Crédit):', this.formatMontant(Math.abs(totalDebit - totalCredit)), '', '', '', '', '']);
        // Ajouter solde d'ouverture et solde final de la période choisie
        if (this.releveOperations.length > 0) {
            tableData.push(['', '', '', '', '', '', '']);
            tableData.push([
                `Solde d'ouverture global (${this.getGlobalOpeningBalanceDate()}):`,
                this.formatMontant(this.getGlobalOpeningBalance()), '', '', '', '', ''
            ]);
            tableData.push([
                `Solde de clôture global (${this.getGlobalClosingBalanceDate()}):`,
                this.formatMontant(this.getGlobalClosingBalance()), '', '', '', '', ''
            ]);
            tableData.push([
                'Différence solde ouverture/clôture:',
                this.formatMontant(Math.abs(this.getGlobalClosingBalance() - this.getGlobalOpeningBalance())), '', '', '', '', ''
            ]);
            // Calcul de l'écart (après toutes les autres lignes)
            let ecart = Math.abs(totalDebit - totalCredit) - Math.abs(this.getGlobalClosingBalance() - this.getGlobalOpeningBalance());
            tableData.push(['ECART:', this.formatMontant(ecart), '', '', '', '', '']);
        }
        // Formater toutes les lignes du tableau
        const formattedTableData = tableData.map(row => row.map(cell => this.formatMontant(cell)));
        // Créer la feuille Excel avec le tableau formaté
        const ws = XLSX.utils.aoa_to_sheet(formattedTableData);
        // Appliquer des styles (couleur en-tête et lignes de solde global)
        if (!ws['!rows']) ws['!rows'] = [];
        ws['!rows'][0] = { hpt: 20 };
        for (let c = 0; c < formattedTableData[0].length; c++) {
            const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
            if (cell) cell.s = { fill: { fgColor: { rgb: 'D9E1F2' } }, font: { bold: true } };
        }
        for (let r = formattedTableData.length - 3; r < formattedTableData.length; r++) {
            for (let c = 0; c < formattedTableData[r].length; c++) {
                const cell = ws[XLSX.utils.encode_cell({ r, c })];
                if (cell) cell.s = { fill: { fgColor: { rgb: 'E2EFDA' } }, font: { bold: true } };
            }
        }
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Relevé de compte');
        // Sauvegarder le fichier
        const fileName = `releve_compte_${this.selectedCompte.numeroCompte}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
    }

    // Ajout d'une méthode utilitaire pour grouper les opérations par date et calculer les soldes d'ouverture/clôture
    getDailyBalances(operations: Operation[]): { [date: string]: { opening: number, closing: number } } {
        const grouped: { [date: string]: Operation[] } = {};
        operations.forEach(op => {
            const date = op.dateOperation ? op.dateOperation.split('T')[0] : '';
            if (!grouped[date]) grouped[date] = [];
            grouped[date].push(op);
        });
        const result: { [date: string]: { opening: number, closing: number } } = {};
        let globalOpeningSet = false;
        let globalOpening = 0;
        Object.entries(grouped).forEach(([date, ops], idx) => {
            // Inclure toutes les opérations (y compris les annulations) pour le calcul du solde de clôture
            // Les opérations d'annulation font partie de l'historique et affectent le solde
            const opsValides = ops.filter(op => op.statut !== 'Rejetée');
            
            if (opsValides.length === 0) {
                // Si toutes les opérations sont annulées, utiliser le solde d'ouverture
                const sorted = ops.slice().sort((a, b) => {
                    const tA = new Date(a.dateOperation).getTime();
                    const tB = new Date(b.dateOperation).getTime();
                    if (tA !== tB) return tA - tB;
                    return (a.id || 0) - (b.id || 0);
                });
                const firstTotalOp = sorted.find(op => op.typeOperation === 'total_cashin' || op.typeOperation === 'total_paiement');
                let opening = sorted[0]?.soldeAvant ?? 0;
                if (firstTotalOp) {
                    opening = firstTotalOp.soldeAvant ?? opening;
                }
                if (!globalOpeningSet && firstTotalOp) {
                    globalOpening = firstTotalOp.soldeAvant ?? 0;
                    globalOpeningSet = true;
                } else if (!globalOpeningSet && sorted[0]) {
                    globalOpening = sorted[0].soldeAvant ?? 0;
                    globalOpeningSet = true;
                }
                result[date] = {
                    opening: opening,
                    closing: opening // Solde de clôture = solde d'ouverture si toutes les opérations sont annulées
                };
            } else {
                // Trier les opérations valides par date/heure puis par ID pour garantir l'ordre chronologique
                const sorted = opsValides.slice().sort((a, b) => {
                    const tA = new Date(a.dateOperation).getTime();
                    const tB = new Date(b.dateOperation).getTime();
                    if (tA !== tB) return tA - tB;
                    return (a.id || 0) - (b.id || 0);
                });
                // Chercher la première opération de type total_cashin ou total_paiement
                const firstTotalOp = sorted.find(op => op.typeOperation === 'total_cashin' || op.typeOperation === 'total_paiement');
                let opening = sorted[0]?.soldeAvant ?? 0;
                if (firstTotalOp) {
                    opening = firstTotalOp.soldeAvant ?? opening;
                }
                if (!globalOpeningSet && firstTotalOp) {
                    globalOpening = firstTotalOp.soldeAvant ?? 0;
                    globalOpeningSet = true;
                } else if (!globalOpeningSet && sorted[0]) {
                    globalOpening = sorted[0].soldeAvant ?? 0;
                    globalOpeningSet = true;
                }
                // Le solde de clôture est toujours le soldeApres de la dernière opération valide du jour
                // Trier par date/heure pour s'assurer que la dernière opération est vraiment la dernière chronologiquement
                const lastOperation = sorted[sorted.length - 1];
                const closingBalance = lastOperation?.soldeApres ?? 0;
                
                result[date] = {
                    opening: opening,
                    closing: closingBalance
                };
            }
        });
        (result as any)._globalOpening = globalOpening;
        return result;
    }

    // Helpers pour l'affichage UI du relevé
    getOpDate(op: Operation): string {
        return op.dateOperation ? op.dateOperation.split('T')[0] : '';
    }
    shouldShowOpeningBalance(op: Operation, i: number): boolean {
        if (i === 0) return true;
        const prevOp = this.pagedReleveOperations[i - 1];
        return this.getOpDate(op) !== this.getOpDate(prevOp);
    }
    shouldShowClosingBalance(op: Operation, i: number): boolean {
        if (i === this.pagedReleveOperations.length - 1) return true;
        const nextOp = this.pagedReleveOperations[i + 1];
        return this.getOpDate(op) !== this.getOpDate(nextOp);
    }

    // Détermine si une opération est un débit
    isDebitOperation(type: string, service?: string, montant?: number): boolean {
        if (type === 'transaction_cree') {
            if (service && service.toLowerCase().includes('cashin')) return true;
            if (service && service.toLowerCase().includes('paiement')) return false;
            // Par défaut pour transaction_cree, considérer comme un débit si le service n'est pas reconnu
            return true;
        }
        if (type === 'Compense_client') return true;
        if (type === 'Compense_fournisseur') return true;
        if (type === 'ajustement') return montant !== undefined && montant < 0;
        if (type === 'nivellement') return montant !== undefined && montant < 0;
        if (type === 'régularisation_solde') return montant !== undefined && montant < 0;
        if (type === 'bo') {
            // Pour les opérations BO, la logique dépend du service
            if (service && service.toLowerCase().includes('cashin')) return true;
            if (service && service.toLowerCase().includes('paiement')) return false;
            // Par défaut, considérer comme un débit
            return true;
        }
        if (type === 'partenaire') {
            // Pour les opérations partenaire, considérer comme un débit
            return true;
        }
        return [
            'total_cashin',
            'FRAIS_TRANSACTION'
        ].includes(type);
    }

    // Détermine si une opération est un crédit
    isCreditOperation(type: string, service?: string, montant?: number): boolean {
        if (type === 'transaction_cree') {
            if (service && service.toLowerCase().includes('paiement')) return true;
            if (service && service.toLowerCase().includes('cashin')) return false;
            // Par défaut pour transaction_cree, ne pas considérer comme un crédit si le service n'est pas reconnu
            return false;
        }
        if (type === 'Appro_client') return true;
        if (type === 'Appro_fournisseur') return true;
        if (type === 'ajustement') return montant !== undefined && montant >= 0;
        if (type === 'nivellement') return montant !== undefined && montant >= 0;
        if (type === 'régularisation_solde') return montant !== undefined && montant >= 0;
        if (type === 'bo') {
            // Pour les opérations BO, la logique dépend du service
            if (service && service.toLowerCase().includes('paiement')) return true;
            if (service && service.toLowerCase().includes('cashin')) return false;
            // Par défaut, considérer comme un crédit
            return false;
        }
        if (type === 'partenaire') {
            // Pour les opérations partenaire, considérer comme un crédit
            return false;
        }
        return [
            'total_paiement'
        ].includes(type);
    }

    // Détermine si un FRAIS_TRANSACTION doit être affiché en crédit (cas parent annulation)
    isFraisTransactionCredit(operation: Operation): boolean {
        if (operation.typeOperation !== 'FRAIS_TRANSACTION') return false;
        // Chercher le parent dans la liste des opérations du relevé
        const parent = this.releveOperations.find(op => op.id === operation.parentOperationId);
        return !!(parent && parent.typeOperation.startsWith('annulation_'));
    }

    // Détermine si un FRAIS_TRANSACTION doit être affiché en débit (tous sauf parent annulation)
    isFraisTransactionDebit(operation: Operation): boolean {
        if (operation.typeOperation !== 'FRAIS_TRANSACTION') return false;
        // Chercher le parent dans la liste des opérations du relevé
        const parent = this.releveOperations.find(op => op.id === operation.parentOperationId);
        return !(parent && parent.typeOperation.startsWith('annulation_'));
    }

    // Détermine si une opération d'annulation doit être affichée en débit (impact inverse)
    isAnnulationDebit(operation: Operation): boolean {
        if (!operation.typeOperation.startsWith('annulation_')) return false;
        
        // Extraire le type d'origine (enlever le préfixe 'annulation_')
        const typeOrigine = operation.typeOperation.substring(11); // 'annulation_'.length = 11
        
        // Si l'opération d'origine était un crédit, l'annulation doit être un débit
        return this.isCreditOperation(typeOrigine, operation.service, operation.montant);
    }

    // Détermine si une opération d'annulation doit être affichée en crédit (impact inverse)
    isAnnulationCredit(operation: Operation): boolean {
        if (!operation.typeOperation.startsWith('annulation_')) return false;
        
        // Extraire le type d'origine (enlever le préfixe 'annulation_')
        const typeOrigine = operation.typeOperation.substring(11); // 'annulation_'.length = 11
        
        // Si l'opération d'origine était un débit, l'annulation doit être un crédit
        return this.isDebitOperation(typeOrigine, operation.service, operation.montant);
    }

    // Retourne la première date du relevé (formatée AAAA-MM-JJ)
    getGlobalOpeningBalanceDate(): string | undefined {
        const dates = Object.keys(this.getDailyBalances(this.releveOperations)).filter(d => d !== '_globalOpening').sort();
        return dates[0];
    }
    // Retourne la dernière date du relevé (formatée AAAA-MM-JJ)
    getGlobalClosingBalanceDate(): string | undefined {
        const dates = Object.keys(this.getDailyBalances(this.releveOperations)).filter(d => d !== '_globalOpening').sort();
        return dates[dates.length - 1];
    }
    // Retourne le solde d'ouverture global (première date)
    getGlobalOpeningBalance(): number {
        const daily = this.getDailyBalances(this.releveOperations);
        const firstDate = this.getGlobalOpeningBalanceDate();
        return firstDate ? daily[firstDate]?.opening ?? 0 : 0;
    }
    // Retourne le solde de clôture global (dernière date)
    getGlobalClosingBalance(): number {
        const daily = this.getDailyBalances(this.releveOperations);
        const lastDate = this.getGlobalClosingBalanceDate();
        return lastDate ? daily[lastDate]?.closing ?? 0 : 0;
    }

    // Ajout d'une méthode utilitaire pour formater les montants
    formatMontant(val: any): string {
        if (typeof val === 'number') {
            return val.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        return val ?? '';
    }

    // Ajout de la fonction utilitaire pour calculer le débit/crédit d'une opération
    getDebitCreditForOperation(op: Operation): { debit: number, credit: number } {
        let debit = 0;
        let credit = 0;
        if (op.typeOperation.startsWith('annulation_')) {
            if (this.isAnnulationDebit(op)) {
                debit = typeof op.montant === 'number' ? op.montant : parseFloat(op.montant || '0');
            } else if (this.isAnnulationCredit(op)) {
                credit = typeof op.montant === 'number' ? op.montant : parseFloat(op.montant || '0');
            }
        } else if (this.isFraisTransactionCredit(op)) {
            credit = typeof op.montant === 'number' ? op.montant : parseFloat(op.montant || '0');
        } else if (this.isFraisTransactionDebit(op)) {
            debit = typeof op.montant === 'number' ? op.montant : parseFloat(op.montant || '0');
        } else if (this.isCreditOperation(op.typeOperation, op.service, op.montant)) {
            credit = typeof op.montant === 'number' ? op.montant : parseFloat(op.montant || '0');
        } else if (this.isDebitOperation(op.typeOperation, op.service, op.montant)) {
            debit = typeof op.montant === 'number' ? op.montant : parseFloat(op.montant || '0');
        }
        return { debit, credit };
    }

    // Résumé global pour le footer (comptes filtrés)
    get resumeGlobal() {
      let totalSolde = 0;
      for (const compte of this.comptes) {
        totalSolde += compte.solde || 0;
      }
      return {
        count: this.comptes.length,
        totalSolde
      };
    }

    updateClosingBo(index: number, value: number) {
        this.pagedReleveSoldes[index].closingBo = value;
    }

    openSoldeBoModal(compte: Compte) {
      this.selectedCompteForBo = compte;
      // Par défaut J-1
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      this.dateSoldeBo = yesterday.toISOString().split('T')[0];
      this.showSoldeBoModal = true;
      this.loadSoldeBoForDate();
    }

    onDateSoldeBoChange() {
      this.loadSoldeBoForDate();
    }

    loadSoldeBoForDate() {
      if (this.selectedCompteForBo && this.dateSoldeBo) {
        this.compteService.getSoldeBo(this.selectedCompteForBo.numeroCompte, this.dateSoldeBo).subscribe(val => {
          this.dernierSoldeBo = val;
        });
      }
    }

    closeSoldeBoModal() {
      this.showSoldeBoModal = false;
      this.selectedCompteForBo = null;
      this.dernierSoldeBo = null;
    }

    saveSoldeBo() {
      if (this.selectedCompteForBo && this.dernierSoldeBo !== null && this.dateSoldeBo) {
        console.log('🔄 Enregistrement du solde BO...', {
          numeroCompte: this.selectedCompteForBo.numeroCompte,
          dateSolde: this.dateSoldeBo,
          soldeBo: this.dernierSoldeBo
        });
        
        this.compteService.setSoldeBo(this.selectedCompteForBo.numeroCompte, this.dateSoldeBo, this.dernierSoldeBo)
          .subscribe({
            next: (response) => {
              console.log('✅ Solde BO enregistré avec succès:', response);
              this.popupService.showSuccess('Solde BO enregistré !');
              this.closeSoldeBoModal();
            },
            error: (error) => {
              console.error('❌ Erreur lors de l\'enregistrement du solde BO:', error);
              this.popupService.showError(`Erreur lors de l'enregistrement : ${error.message || error.error?.message || 'Erreur inconnue'}`);
            }
          });
      } else {
        console.warn('⚠️ Données manquantes pour l\'enregistrement du solde BO:', {
          selectedCompteForBo: this.selectedCompteForBo,
          dernierSoldeBo: this.dernierSoldeBo,
          dateSoldeBo: this.dateSoldeBo
        });
        this.popupService.showWarning('Veuillez remplir tous les champs requis');
      }
    }

    round2(val: any): number {
      return Math.round(+val * 100) / 100;
    }

    // Méthode pour calculer la valeur de l'écart entre les deux soldes de clôture
    getEcartValue(solde: { date: string; opening: number; closing: number; closingBo?: number }): number {
      if (solde.closingBo === undefined || solde.closingBo === null) {
        return 0; // Pas d'écart si pas de solde BO
      }
      // Arrondir l'écart à 2 décimales
      return Math.round((solde.closing - solde.closingBo) * 100) / 100;
    }

    // Méthode pour déterminer la classe CSS de l'écart
    getEcartClass(solde: { date: string; opening: number; closing: number; closingBo?: number }): string {
      if (solde.closingBo === undefined || solde.closingBo === null) {
        return ''; // Pas de classe si pas de solde BO
      }
      
      const ecart = this.getEcartValue(solde);
      // Utiliser une tolérance pour considérer les écarts très proches de 0 comme nuls
      const tolerance = 0.01; // 1 centime de tolérance
      
      if (Math.abs(ecart) <= tolerance) {
        return 'ecart-zero'; // Écart nul (vert)
      } else if (ecart > 0) {
        return 'ecart-positive'; // Écart positif (orange)
      } else {
        return 'ecart-negative'; // Écart négatif (rouge)
      }
    }

    // Navigation vers la page ecart de solde avec filtres
    navigateToEcartSolde(solde: { date: string; opening: number; closing: number; closingBo?: number }): void {
        if (!this.selectedCompte) return;
        
        // Configurer les données pour l'onglet écart de solde
        this.ecartSoldeAgence = this.selectedCompte.numeroCompte;
        this.ecartSoldeDateTransaction = solde.date;
        
        // Basculer vers l'onglet écart de solde
        this.activeTab = 'ecart-solde';
        this.showEcartSoldeTab = true;
    }

    // Méthode pour calculer la valeur de l'Ecart régularisé
    getImpactOPValue(solde: { date: string; opening: number; closing: number; closingBo?: number }): number {
        // Utiliser le cache si disponible
        if (this.impactOPSums[solde.date] !== undefined) {
            // Inverser le signe : positif devient négatif, négatif devient positif
            return -this.impactOPSums[solde.date];
        }
        
        // Si pas dans le cache, retourner 0 pour l'instant
        // TODO: Implémenter la récupération depuis le backend
        return 0;
    }

    // Méthode pour déterminer la classe CSS de l'Ecart régularisé
    getImpactOPClass(solde: { date: string; opening: number; closing: number; closingBo?: number }): string {
        const impactOP = this.getImpactOPValue(solde);
        const tolerance = 0.01; // 1 centime de tolérance
        
        if (Math.abs(impactOP) <= tolerance) {
            return 'impact-op-zero'; // Ecart régularisé nul (vert)
        } else if (impactOP > 0) {
            return 'impact-op-positive'; // Ecart régularisé positif (orange)
        } else {
            return 'impact-op-negative'; // Ecart régularisé négatif (rouge)
        }
    }

    // Navigation vers la page Ecart régularisé avec filtres
    navigateToImpactOP(solde: { date: string; opening: number; closing: number; closingBo?: number }): void {
        if (!this.selectedCompte) return;
        
        // Configurer les données pour l'onglet Ecart régularisé
        this.impactOPAgence = this.selectedCompte.numeroCompte;
        this.impactOPDateTransaction = solde.date;
        
        // Basculer vers l'onglet Ecart régularisé
        this.activeTab = 'impact-op';
        this.showImpactOPTab = true;
    }

    switchTab(tabName: string): void {
        this.activeTab = tabName;
        if (tabName === 'ecart-solde') {
            this.showEcartSoldeTab = true;
        } else if (tabName === 'impact-op') {
            this.showImpactOPTab = true;
        } else if (tabName === 'revenu-journalier') {
            this.showRevenuJournalierTab = true;
            this.loadRevenuJournalier();
        } else if (tabName === 'control-revenu') {
            this.showControlRevenuTab = true;
            this.loadControlRevenu();
        } else if (tabName === 'ecart-frais') {
            this.showEcartFraisTab = true;
            // si une date est déjà sélectionnée, s'assurer que les données sont présentes
            if (this.ecartFraisDate && this.selectedCompte && this.ecartFraisItems.length === 0) {
                this.fetchEcartFraisData(this.selectedCompte.numeroCompte, this.ecartFraisDate);
            }
        }
    }

    // Méthodes pour l'onglet Revenu Journalier
    loadRevenuJournalier(): void {
        if (!this.selectedCompte || this.releveOperations.length === 0) return;

        this.isLoadingRevenuJournalier = true;
        this.revenuJournalierData = [];

        // Grouper les opérations par date
        const operationsByDate: { [date: string]: Operation[] } = {};
        this.releveOperations.forEach(op => {
            const date = op.dateOperation ? op.dateOperation.split('T')[0] : '';
            if (!operationsByDate[date]) {
                operationsByDate[date] = [];
            }
            operationsByDate[date].push(op);
        });

        // Calculer les revenus par jour
        const promises: Promise<void>[] = [];
        
        Object.entries(operationsByDate).forEach(([date, operations]) => {
            let totalCashin = 0;
            let totalPaiement = 0;
            let fraisCashin = 0;
            let fraisPaiement = 0;

            operations.forEach(op => {
                if (op.typeOperation === 'total_cashin') {
                    totalCashin += op.montant || 0;
                } else if (op.typeOperation === 'total_paiement') {
                    totalPaiement += op.montant || 0;
                } else if (op.typeOperation === 'FRAIS_TRANSACTION') {
                    // Déterminer si c'est un frais de cashin ou paiement basé sur le service
                    const service = op.service?.toUpperCase() || '';
                    if (service.includes('CASHIN')) {
                        fraisCashin += op.montant || 0;
                    } else if (service.includes('PAIEMENT')) {
                        fraisPaiement += op.montant || 0;
                    }
                }
            });

            // Calculer le revenu attendu (frais uniquement)
            const revenuTotal = fraisCashin + fraisPaiement;

            // Récupérer les frais SF pour cette agence et cette date
            // Utiliser le numeroCompte comme agence (correspondance avec trx_sf)
            const agence = this.selectedCompte?.numeroCompte || '';
            console.log(`Recherche des frais SF pour agence: ${agence}, date: ${date}`);
            
            // Vérifier que l'agence est définie
            if (!agence) {
                console.warn(`Aucune agence définie pour le compte ${this.selectedCompte?.numeroCompte}, impossible de récupérer les frais SF`);
                this.revenuJournalierData.push({
                    date,
                    totalCashin,
                    totalPaiement,
                    fraisCashin,
                    fraisPaiement,
                    revenuTotal,
                    ecartFrais: 0
                });
                // Ajouter une promesse résolue pour maintenir la cohérence
                promises.push(Promise.resolve());
            } else {
                const promise = this.trxSfService.getFraisByAgenceAndDateEnAttente(agence, date).toPromise()
                    .then((response: any) => {
                        const fraisSf = response?.frais || 0;
                        console.log(`Frais SF EN_ATTENTE trouvés pour ${agence} le ${date}: ${fraisSf}`);
                        
                        this.revenuJournalierData.push({
                            date,
                            totalCashin,
                            totalPaiement,
                            fraisCashin,
                            fraisPaiement,
                            revenuTotal,
                            ecartFrais: fraisSf
                        });
                    })
                    .catch((error: any) => {
                        console.error(`Erreur lors de la récupération des frais SF pour ${agence} le ${date}:`, error);
                        this.revenuJournalierData.push({
                            date,
                            totalCashin,
                            totalPaiement,
                            fraisCashin,
                            fraisPaiement,
                            revenuTotal,
                            ecartFrais: 0
                        });
                    });
                
                promises.push(promise);
            }
        });

        // Attendre que tous les appels soient terminés
        Promise.all(promises).then(() => {
            // Trier par date (du plus récent au plus ancien)
            this.revenuJournalierData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            // Appliquer les filtres
            this.applyRevenuJournalierFilters();

            this.isLoadingRevenuJournalier = false;
        });
    }

    // Naviguer vers l'onglet Écart Frais (date/agence) depuis Revenu Journalier
    navigateToEcartFrais(date: string): void {
        if (!this.selectedCompte) return;
        const agence = this.selectedCompte.numeroCompte || '';
        this.ecartFraisDate = date;
        this.ecartFraisAgence = agence;
        this.activeTab = 'ecart-frais';
        this.showEcartFraisTab = true;
        this.fetchEcartFraisData(agence, date);
    }

    private fetchEcartFraisData(agence: string, date: string): void {
        this.isLoadingEcartFrais = true;
        this.ecartFraisItems = [];
        this.trxSfService.getTrxSfs({ agence, dateDebut: date, dateFin: date, statut: 'EN_ATTENTE' }).subscribe({
            next: (rows) => {
                this.ecartFraisItems = rows || [];
                this.isLoadingEcartFrais = false;
                this.calculateEcartFraisPagination();
            },
            error: () => {
                this.ecartFraisItems = [];
                this.isLoadingEcartFrais = false;
                this.calculateEcartFraisPagination();
            }
        });
    }

    // Total des frais TRX SF listés dans le popup
    getTotalFraisEcartTrxSf(): number {
        return (this.ecartFraisItems || []).reduce((sum, it) => sum + (it.frais || 0), 0);
    }

    // Total des montants TRX SF listés dans l'onglet Écart Frais
    getTotalMontantEcartTrxSf(): number {
        return (this.ecartFraisItems || []).reduce((sum, it) => sum + (it.montant || 0), 0);
    }

    // Pagination Écart Frais
    private calculateEcartFraisPagination(): void {
        this.ecartFraisCurrentPage = 1;
        const total = this.ecartFraisItems.length;
        this.ecartFraisTotalPages = Math.max(1, Math.ceil(total / this.ecartFraisPageSize));
    }

    get pagedEcartFraisItems(): import('../../services/trx-sf.service').TrxSfData[] {
        const startIndex = (this.ecartFraisCurrentPage - 1) * this.ecartFraisPageSize;
        const endIndex = startIndex + this.ecartFraisPageSize;
        return (this.ecartFraisItems || []).slice(startIndex, endIndex);
    }

    prevEcartFraisPage(): void {
        if (this.ecartFraisCurrentPage > 1) {
            this.ecartFraisCurrentPage--;
        }
    }

    nextEcartFraisPage(): void {
        if (this.ecartFraisCurrentPage < this.ecartFraisTotalPages) {
            this.ecartFraisCurrentPage++;
        }
    }

    goToEcartFraisPage(page: number): void {
        if (page >= 1 && page <= this.ecartFraisTotalPages) {
            this.ecartFraisCurrentPage = page;
        }
    }

    onChangeEcartFraisPageSize(size: number): void {
        this.ecartFraisPageSize = size;
        this.calculateEcartFraisPagination();
    }

    getVisibleEcartFraisPages(): number[] {
        const totalPages = this.ecartFraisTotalPages;
        const currentPage = this.ecartFraisCurrentPage;
        const maxVisible = 5;
        if (totalPages <= maxVisible) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);
        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }
        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    }

    // Obtenir le nombre de services uniques dans ecartFraisItems
    getUniqueServicesCount(): number {
        if (!this.ecartFraisItems || this.ecartFraisItems.length === 0) {
            return 0;
        }
        const uniqueServices = new Set(this.ecartFraisItems.map(item => item.service));
        return uniqueServices.size;
    }

    // Exporter les données d'écart frais vers Excel
    exportEcartFrais(): void {
        if (!this.ecartFraisItems || this.ecartFraisItems.length === 0) {
            this.popupService.showError('Aucune donnée à exporter');
            return;
        }

        this.isExporting = true;

        // Créer un nouveau classeur
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Écart Frais');

        // Définir les colonnes
        worksheet.columns = [
            { header: 'ID Transaction', key: 'idTransaction', width: 30 },
            { header: 'Service', key: 'service', width: 25 },
            { header: 'Agence', key: 'agence', width: 20 },
            { header: 'Date', key: 'date', width: 20 },
            { header: 'Numéro Trans GU', key: 'numeroTransGu', width: 25 },
            { header: 'Pays', key: 'pays', width: 10 },
            { header: 'Montant', key: 'montant', width: 15 },
            { header: 'Frais', key: 'frais', width: 15 },
            { header: 'Statut', key: 'statut', width: 15 },
            { header: 'Commentaire', key: 'commentaire', width: 30 }
        ];

        // Appliquer le style de l'en-tête
        worksheet.getRow(1).font = { bold: true, size: 12 };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF667EEA' }
        };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(1).height = 25;

        // Ajouter les données
        this.ecartFraisItems.forEach(item => {
            worksheet.addRow({
                idTransaction: item.idTransaction || '',
                service: item.service || '',
                agence: item.agence || '',
                date: this.formatDate(item.dateTransaction || ''),
                numeroTransGu: item.numeroTransGu || '',
                pays: item.pays || '',
                montant: item.montant || 0,
                frais: item.frais || 0,
                statut: item.statut || '',
                commentaire: item.commentaire || ''
            });
        });

        // Ajouter une ligne de total
        const totalRow = worksheet.addRow({
            idTransaction: '',
            service: '',
            agence: '',
            date: '',
            numeroTransGu: '',
            pays: 'TOTAL',
            montant: this.getTotalMontantEcartTrxSf(),
            frais: this.getTotalFraisEcartTrxSf(),
            statut: '',
            commentaire: ''
        });

        totalRow.font = { bold: true, size: 12 };
        totalRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF3F4F6' }
        };

        // Formater les colonnes de montants
        worksheet.getColumn('montant').numFmt = '#,##0.00';
        worksheet.getColumn('frais').numFmt = '#,##0.00';

        // Générer le fichier Excel
        workbook.xlsx.writeBuffer().then((buffer: ArrayBuffer) => {
            const blob = new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const date = this.formatDate(this.ecartFraisDate).split(' ')[0].replace(/\//g, '-');
            const fileName = `Ecart_Frais_${this.ecartFraisAgence}_${date}.xlsx`;
            saveAs(blob, fileName);
            this.popupService.showSuccess(`Exportation réussie: ${fileName}`);
        }).catch((error: any) => {
            console.error('Erreur lors de l\'exportation:', error);
            this.popupService.showError('Erreur lors de l\'exportation des données');
        }).finally(() => {
            this.isExporting = false;
        });
    }

    // Méthodes utilitaires pour l'onglet revenu journalier
    getTotalRevenuJournalier(): number {
        return this.revenuJournalierDataFiltered.reduce((total, item) => total + item.revenuTotal, 0);
    }

    getTotalCashinJournalier(): number {
        return this.revenuJournalierDataFiltered.reduce((total, item) => total + item.totalCashin, 0);
    }

    getTotalPaiementJournalier(): number {
        return this.revenuJournalierDataFiltered.reduce((total, item) => total + item.totalPaiement, 0);
    }

    getTotalFraisCashinJournalier(): number {
        return this.revenuJournalierDataFiltered.reduce((total, item) => total + item.fraisCashin, 0);
    }

    getTotalFraisPaiementJournalier(): number {
        return this.revenuJournalierDataFiltered.reduce((total, item) => total + item.fraisPaiement, 0);
    }

    getTotalEcartFraisJournalier(): number {
        return this.revenuJournalierDataFiltered.reduce((total, item) => total + item.ecartFrais, 0);
    }

    // Méthodes de pagination pour le revenu journalier
    calculateRevenuJournalierPagination(): void {
        this.revenuJournalierCurrentPage = 1;
        this.revenuJournalierTotalPages = Math.ceil(this.revenuJournalierDataFiltered.length / this.revenuJournalierPageSize);
    }

    get pagedRevenuJournalierData(): { date: string; totalCashin: number; totalPaiement: number; fraisCashin: number; fraisPaiement: number; revenuTotal: number; ecartFrais: number }[] {
        const startIndex = (this.revenuJournalierCurrentPage - 1) * this.revenuJournalierPageSize;
        const endIndex = startIndex + this.revenuJournalierPageSize;
        return this.revenuJournalierDataFiltered.slice(startIndex, endIndex);
    }

    prevRevenuJournalierPage(): void {
        if (this.revenuJournalierCurrentPage > 1) {
            this.revenuJournalierCurrentPage--;
        }
    }

    nextRevenuJournalierPage(): void {
        if (this.revenuJournalierCurrentPage < this.revenuJournalierTotalPages) {
            this.revenuJournalierCurrentPage++;
        }
    }

    goToRevenuJournalierPage(page: number): void {
        if (page >= 1 && page <= this.revenuJournalierTotalPages) {
            this.revenuJournalierCurrentPage = page;
        }
    }

    getVisibleRevenuJournalierPages(): number[] {
        const totalPages = this.revenuJournalierTotalPages;
        const currentPage = this.revenuJournalierCurrentPage;
        const maxVisible = 5;
        
        if (totalPages <= maxVisible) {
            return Array.from({length: totalPages}, (_, i) => i + 1);
        }
        
        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);
        
        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }
        
        return Array.from({length: end - start + 1}, (_, i) => start + i);
    }

    // Méthodes de filtrage pour le revenu journalier
    applyRevenuJournalierFilters(): void {
        let filteredData = [...this.revenuJournalierData];

        // Filtrage par date de début
        if (this.revenuJournalierDateDebut) {
            filteredData = filteredData.filter(item => item.date >= this.revenuJournalierDateDebut);
        }

        // Filtrage par date de fin
        if (this.revenuJournalierDateFin) {
            filteredData = filteredData.filter(item => item.date <= this.revenuJournalierDateFin);
        }

        // Filtrage par montant minimum
        if (this.revenuJournalierMontantMin !== null && this.revenuJournalierMontantMin >= 0) {
            filteredData = filteredData.filter(item => {
                const montantToCheck = this.getMontantForFilter(item);
                return montantToCheck >= this.revenuJournalierMontantMin!;
            });
        }

        // Filtrage par montant maximum
        if (this.revenuJournalierMontantMax !== null && this.revenuJournalierMontantMax >= 0) {
            filteredData = filteredData.filter(item => {
                const montantToCheck = this.getMontantForFilter(item);
                return montantToCheck <= this.revenuJournalierMontantMax!;
            });
        }

        this.revenuJournalierDataFiltered = filteredData;
        this.calculateRevenuJournalierPagination();
        
        // Mettre à jour les informations de débogage
        this.updateRevenuJournalierDebugInfo();
    }

    private getMontantForFilter(item: any): number {
        switch (this.revenuJournalierTypeRevenu) {
            case 'cashin':
                return item.fraisCashin;
            case 'paiement':
                return item.fraisPaiement;
            case 'total':
                return item.revenuTotal;
            default:
                return item.revenuTotal; // Par défaut, filtrer sur le revenu total
        }
    }

    onRevenuJournalierFiltersChange(): void {
        this.applyRevenuJournalierFilters();
    }

    clearRevenuJournalierFilters(): void {
        this.revenuJournalierDateDebut = '';
        this.revenuJournalierDateFin = '';
        this.revenuJournalierMontantMin = null;
        this.revenuJournalierMontantMax = null;
        this.revenuJournalierTypeRevenu = '';
        this.applyRevenuJournalierFilters();
    }

    // Méthode pour mettre à jour les informations de débogage
    updateRevenuJournalierDebugInfo(): void {
        const agence = this.selectedCompte?.agence || this.selectedCompte?.numeroCompte || 'Non définie';
        const compte = this.selectedCompte?.numeroCompte || 'Non défini';
        const totalLignes = this.revenuJournalierData.length;
        const totalEcart = this.getTotalEcartFraisJournalier();
        
        this.revenuJournalierDebugInfo = `
            Compte: ${compte} | 
            Agence utilisée: ${agence} | 
            Lignes: ${totalLignes} | 
            Total écart: ${totalEcart.toFixed(2)} FCFA
        `;
    }

    // ===== MÉTHODES POUR L'ONGLET CONTROL REVENU =====

    // Méthode pour charger les données de contrôle revenu
    loadControlRevenu(): void {
        this.isLoadingControlRevenu = true;
        this.showControlRevenuTab = true;

        // Charger les frais paramétrés en premier
        this.fraisTransactionService.getAllFraisTransactionsActifs().subscribe({
            next: (frais) => {
                this.fraisParametres = frais;
                console.log('Frais paramétrés chargés:', frais);
                
                // Ensuite charger les données AgencySummary
                this.loadAgencySummaryData(agency, service);
            },
            error: (error) => {
                console.error('Erreur lors du chargement des frais paramétrés:', error);
                this.fraisParametres = [];
                // Continuer avec les données AgencySummary même sans frais
                this.loadAgencySummaryData(agency, service);
            }
        });

        // Déterminer l'agence et le service à filtrer
        let agency: string | undefined = undefined;
        let service: string | undefined = undefined;
        
        if (this.selectedCompte) {
            // Récupérer les données de statistiques pour le compte sélectionné
            const numeroCompte = this.selectedCompte.numeroCompte;
            console.log('Numéro de compte:', numeroCompte);
            
            // Essayer de parser l'agence et le service depuis le numéro de compte
            agency = numeroCompte;
            
            if (numeroCompte.includes('_')) {
                const parts = numeroCompte.split('_');
                agency = parts[0];
                service = parts[1];
            } else {
                // Si pas de underscore, utiliser le numéro de compte complet comme agence
                agency = numeroCompte;
            }
        } else {
            console.log('Aucun compte sélectionné, affichage de toutes les données');
        }
        
        // Cette méthode sera appelée après le chargement des frais paramétrés
    }

    private loadAgencySummaryData(agency: string | undefined, service: string | undefined): void {
        // Utiliser le service AgencySummary pour récupérer les données directement
        this.agencySummaryService.getAllSummaries().subscribe({
            next: (allSummaries) => {
                console.log('Données AgencySummary récupérées:', allSummaries);
                console.log('Agence recherchée:', agency);
                console.log('Service recherché:', service);
                console.log('Premiers enregistrements:', allSummaries.slice(0, 5));
                
                // Filtrer les données selon l'agence et le service
                const filteredSummaries = allSummaries.filter((summary: any) => {
                    const matchesAgency = agency ? summary.agency === agency : true; // Si pas d'agence, accepter toutes les agences
                    const matchesService = service ? summary.service === service : true; // Si pas de service, accepter tous les services
                    const matchesDateRange = !this.controlRevenuDateDebut || !this.controlRevenuDateFin || 
                        (summary.date >= this.controlRevenuDateDebut && summary.date <= this.controlRevenuDateFin);
                    
                    // Debug: afficher les correspondances pour les premiers enregistrements
                    if (allSummaries.indexOf(summary) < 3) {
                        console.log('Debug filtrage:', {
                            summaryAgency: summary.agency,
                            summaryService: summary.service,
                            searchedAgency: agency,
                            searchedService: service,
                            matchesAgency,
                            matchesService,
                            matchesDateRange
                        });
                    }
                    
                    return matchesAgency && matchesService && matchesDateRange;
                });
                
                console.log('Statistiques filtrées pour le contrôle revenu:', filteredSummaries);
                
                // Transformer les données de statistiques en format Control Revenu (maintenant asynchrone)
                this.transformStatisticsToControlRevenu(filteredSummaries, service || '').then(controlRevenuData => {
                    this.controlRevenuData = controlRevenuData;
                    this.controlRevenuDataFiltered = [...this.controlRevenuData];
                    this.calculateControlRevenuPagination();
                    this.isLoadingControlRevenu = false;
                }).catch(error => {
                    console.error('Erreur lors de la transformation des données:', error);
                    this.isLoadingControlRevenu = false;
                });
            },
            error: (error) => {
                console.error('Erreur lors du chargement des données de contrôle revenu:', error);
                
                // En cas d'erreur, utiliser des données de test
                this.loadTestControlRevenuData();
                this.isLoadingControlRevenu = false;
            }
        });
    }

    private async transformStatisticsToControlRevenu(statistics: Statistics[], service: string): Promise<any[]> {
        const data: any[] = [];
        
        // Traiter chaque enregistrement de statistiques
        for (const stat of statistics) {
            // Utiliser les données réelles des statistiques
            const volume = stat.totalVolume || 0;
            const nombreTrx = stat.recordCount || 0;
            
            // Calculer le revenu attendu basé sur les frais paramétrés
            const revenuAttendu = this.calculateRevenuAttendu(stat.service, stat.agency, volume, nombreTrx);
            
            // Récupérer les frais TRX SF pour cette agence, date et service (uniquement EN_ATTENTE)
            let totalFraisTrxSf = 0;
            try {
                const fraisResponse = await this.trxSfService.getFraisByAgenceAndDateAndServiceEnAttente(stat.agency, stat.date, stat.service).toPromise();
                totalFraisTrxSf = fraisResponse?.frais || 0;
                console.log(`Frais TRX SF (EN_ATTENTE) pour ${stat.agency} le ${stat.date} service ${stat.service}: ${totalFraisTrxSf}`);
            } catch (error) {
                console.warn(`Erreur lors de la récupération des frais TRX SF (EN_ATTENTE) pour ${stat.agency} le ${stat.date} service ${stat.service}:`, error);
                totalFraisTrxSf = 0;
            }
            
            // Calculer le revenu réel selon la formule : Revenu attendu - Total frais TRX SF
            const revenuReel = revenuAttendu - totalFraisTrxSf;
            const ecart = revenuReel - revenuAttendu;
            
            // Le statut sera déterminé après avoir analysé tous les services
            let statut = 'normal';
            
            data.push({
                date: stat.date,
                service: stat.service,
                typeControle: 'Contrôle journalier',
                revenuAttendu: revenuAttendu,
                revenuReel: revenuReel,
                ecart: ecart,
                statut: statut,
                volume: volume,
                nombreTrx: nombreTrx,
                totalFraisTrxSf: totalFraisTrxSf // Ajouter les frais TRX SF pour debug
            });
        }
        
        // Analyser les anomalies par service selon les nouveaux critères
        this.analyzeAnomaliesByService(data);
        
        // Trier par date décroissante (du plus récent au plus ancien)
        data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        return data;
    }

    private calculateRevenuAttendu(service: string, agence: string, volume: number, nombreTrx: number): number {
        // Chercher le frais paramétré pour ce service et cette agence
        const frais = this.fraisParametres.find(f => 
            f.service === service && 
            f.agence === agence && 
            f.actif
        );
        
        if (!frais) {
            console.warn(`Aucun frais paramétré trouvé pour service: ${service}, agence: ${agence}`);
            return volume * 0.01; // Fallback à 1% si pas de frais paramétré
        }
        
        // Calculer le revenu attendu selon le type de calcul
        if (frais.typeCalcul === 'POURCENTAGE' && frais.pourcentage) {
            // Calcul par pourcentage du volume
            return volume * (frais.pourcentage / 100);
        } else {
            // Calcul nominal (montant fixe par transaction)
            return frais.montantFrais * nombreTrx;
        }
    }

    private loadTestControlRevenuData(): void {
        // Données de test pour l'onglet Control Revenu basées sur des statistiques réelles
        this.controlRevenuData = [
            {
                date: '2025-08-09',
                service: 'CM_PAIEMENTMARCHAND_OM_TP',
                typeControle: 'Contrôle journalier',
                revenuAttendu: 2500.00,
                revenuReel: 2475.00,
                ecart: -25.00,
                statut: 'anomalie',
                volume: 250000.00,
                nombreTrx: 45
            },
            {
                date: '2025-08-08',
                service: 'CM_PAIEMENTMARCHAND_OM_TP',
                typeControle: 'Contrôle journalier',
                revenuAttendu: 1800.00,
                revenuReel: 1800.00,
                ecart: 0.00,
                statut: 'normal',
                volume: 180000.00,
                nombreTrx: 32
            },
            {
                date: '2025-08-07',
                service: 'CM_PAIEMENTMARCHAND_OM_TP',
                typeControle: 'Contrôle journalier',
                revenuAttendu: 3200.00,
                revenuReel: 3040.00,
                ecart: -160.00,
                statut: 'critique',
                volume: 320000.00,
                nombreTrx: 58
            },
            {
                date: '2025-08-06',
                service: 'CM_PAIEMENTMARCHAND_OM_TP',
                typeControle: 'Contrôle journalier',
                revenuAttendu: 1500.00,
                revenuReel: 1500.00,
                ecart: 0.00,
                statut: 'normal',
                volume: 150000.00,
                nombreTrx: 28
            },
            {
                date: '2025-08-05',
                service: 'CM_PAIEMENTMARCHAND_OM_TP',
                typeControle: 'Contrôle journalier',
                revenuAttendu: 2200.00,
                revenuReel: 2090.00,
                ecart: -110.00,
                statut: 'anomalie',
                volume: 220000.00,
                nombreTrx: 41
            }
        ];
        
        this.controlRevenuDataFiltered = [...this.controlRevenuData];
        this.calculateControlRevenuPagination();
    }

    // Méthodes de calcul pour le control revenu
    getTotalControlRevenu(): number {
        return this.controlRevenuDataFiltered.length;
    }

    getTotalAnomaliesControlRevenu(): number {
        return this.controlRevenuDataFiltered.filter(item => item.statut === 'anomalie').length;
    }

    getTotalNormauxControlRevenu(): number {
        return this.controlRevenuDataFiltered.filter(item => item.statut === 'normal').length;
    }

    getTotalCritiquesControlRevenu(): number {
        return this.controlRevenuDataFiltered.filter(item => item.statut === 'critique').length;
    }

    getTauxConformiteControlRevenu(): number {
        const total = this.getTotalControlRevenu();
        if (total === 0) return 0;
        const normaux = this.getTotalNormauxControlRevenu();
        return (normaux / total) * 100;
    }

    getTotalVolumeControlRevenu(): number {
        return this.controlRevenuDataFiltered.reduce((total, item) => total + item.volume, 0);
    }

    getTotalNombreTrxControlRevenu(): number {
        return this.controlRevenuDataFiltered.reduce((total, item) => total + item.nombreTrx, 0);
    }

    getTotalMagControlRevenu(): number {
        return this.controlRevenuDataFiltered.reduce((total, item) => total + item.ecart, 0);
    }

    getMoyenneMagPercentageControlRevenu(): number {
        const totalRevenuAttendu = this.controlRevenuDataFiltered.reduce((total, item) => total + item.revenuAttendu, 0);
        const totalEcart = this.controlRevenuDataFiltered.reduce((total, item) => total + item.ecart, 0);
        if (totalRevenuAttendu === 0) return 0;
        return (totalEcart / totalRevenuAttendu) * 100;
    }

    getTotalRevenuReelControlRevenu(): number {
        return this.controlRevenuDataFiltered.reduce((total, item) => total + item.revenuReel, 0);
    }

    getUniqueServicesControlRevenu(): string[] {
        const services = [...new Set(this.controlRevenuData.map(item => item.service))];
        return services.sort();
    }

    private analyzeAnomaliesByService(data: any[]): void {
        // Grouper les données par service
        const serviceGroups = new Map<string, any[]>();
        
        data.forEach(item => {
            if (!serviceGroups.has(item.service)) {
                serviceGroups.set(item.service, []);
            }
            serviceGroups.get(item.service)!.push(item);
        });

        // Analyser chaque service
        serviceGroups.forEach((serviceData, serviceName) => {
            // Compter les lignes avec MàG négatif
            const negativeMagCount = serviceData.filter(item => item.ecart < 0).length;
            
            // Déterminer le statut selon les critères
            let serviceStatus = 'normal';
            if (negativeMagCount >= 5 && negativeMagCount <= 10) {
                serviceStatus = 'anomalie';
            } else if (negativeMagCount > 10) {
                serviceStatus = 'critique';
            }

            // Appliquer le statut à toutes les lignes du service
            serviceData.forEach(item => {
                item.statut = serviceStatus;
            });

            console.log(`Service ${serviceName}: ${negativeMagCount} lignes MàG négatif -> Statut: ${serviceStatus}`);
        });
    }

    // Méthodes de pagination pour le control revenu
    calculateControlRevenuPagination(): void {
        this.controlRevenuTotalPages = Math.ceil(this.controlRevenuDataFiltered.length / this.controlRevenuPageSize);
        this.controlRevenuCurrentPage = 1;
    }

    get pagedControlRevenuData(): { date: string; service: string; typeControle: string; revenuAttendu: number; revenuReel: number; ecart: number; statut: string; volume: number; nombreTrx: number; totalFraisTrxSf?: number }[] {
        const startIndex = (this.controlRevenuCurrentPage - 1) * this.controlRevenuPageSize;
        const endIndex = startIndex + this.controlRevenuPageSize;
        return this.controlRevenuDataFiltered.slice(startIndex, endIndex);
    }

    prevControlRevenuPage(): void {
        if (this.controlRevenuCurrentPage > 1) {
            this.controlRevenuCurrentPage--;
        }
    }

    nextControlRevenuPage(): void {
        if (this.controlRevenuCurrentPage < this.controlRevenuTotalPages) {
            this.controlRevenuCurrentPage++;
        }
    }

    goToControlRevenuPage(page: number): void {
        if (page >= 1 && page <= this.controlRevenuTotalPages) {
            this.controlRevenuCurrentPage = page;
        }
    }

    getVisibleControlRevenuPages(): number[] {
        const totalPages = this.controlRevenuTotalPages;
        const currentPage = this.controlRevenuCurrentPage;
        const maxVisible = 5;
        
        if (totalPages <= maxVisible) {
            return Array.from({length: totalPages}, (_, i) => i + 1);
        }
        
        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);
        
        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }
        
        return Array.from({length: end - start + 1}, (_, i) => start + i);
    }

    // Méthodes de filtrage pour le control revenu
    applyControlRevenuFilters(): void {
        let filteredData = [...this.controlRevenuData];

        // Filtrage par date de début
        if (this.controlRevenuDateDebut) {
            filteredData = filteredData.filter(item => item.date >= this.controlRevenuDateDebut);
        }

        // Filtrage par date de fin
        if (this.controlRevenuDateFin) {
            filteredData = filteredData.filter(item => item.date <= this.controlRevenuDateFin);
        }

        // Filtrage par service
        if (this.controlRevenuService) {
            filteredData = filteredData.filter(item => item.service === this.controlRevenuService);
        }

        // Filtrage par type de contrôle
        if (this.controlRevenuType) {
            filteredData = filteredData.filter(item => item.statut === this.controlRevenuType);
        }

        // Filtrage par seuil d'alerte
        if (this.controlRevenuSeuil !== null && this.controlRevenuSeuil >= 0) {
            filteredData = filteredData.filter(item => Math.abs(item.ecart) >= this.controlRevenuSeuil!);
        }

        this.controlRevenuDataFiltered = filteredData;
        this.calculateControlRevenuPagination();
    }

    onControlRevenuFiltersChange(): void {
        this.applyControlRevenuFilters();
    }

    clearControlRevenuFilters(): void {
        this.controlRevenuDateDebut = '';
        this.controlRevenuDateFin = '';
        this.controlRevenuService = '';
        this.controlRevenuType = '';
        this.controlRevenuSeuil = null;
        this.applyControlRevenuFilters();
    }

    // Méthodes d'affichage pour le control revenu
    getControlRevenuRowClass(controle: any): string {
        switch (controle.statut) {
            case 'critique':
                return 'row-critical';
            case 'anomalie':
                return 'row-warning';
            case 'normal':
                return 'row-normal';
            default:
                return '';
        }
    }

    getControlRevenuStatusClass(controle: any): string {
        switch (controle.statut) {
            case 'critique':
                return 'status-critical';
            case 'anomalie':
                return 'status-warning';
            case 'normal':
                return 'status-normal';
            default:
                return '';
        }
    }

    getControlRevenuStatusLabel(controle: any): string {
        switch (controle.statut) {
            case 'critique':
                return 'Critique';
            case 'anomalie':
                return 'Anomalie';
            case 'normal':
                return 'Normal';
            default:
                return 'Inconnu';
        }
    }

    // Méthodes d'action pour le control revenu
    viewControlRevenuDetails(controle: any): void {
        this.selectedControlRevenu = controle;
        this.showControlRevenuModal = true;
    }

    closeControlRevenuModal(): void {
        this.showControlRevenuModal = false;
        this.selectedControlRevenu = null;
    }

    getAbsValue(value: number): number {
        return Math.abs(value);
    }

    getEcartPercentage(ecart: number, revenuAttendu: number): number {
        if (revenuAttendu === 0) return 0;
        return (Math.abs(ecart) / revenuAttendu) * 100;
    }

    getMagPercentage(controle: any): number {
        if (controle.revenuAttendu === 0) return 0;
        return (controle.ecart / controle.revenuAttendu) * 100;
    }

    // Méthodes pour la visualisation par date
    openDateViewModal(date: string): void {
        this.selectedDate = date;
        this.showDateViewModal = true;
        this.loadDateViewData(date);
    }

    closeDateViewModal(): void {
        this.showDateViewModal = false;
        this.selectedDate = '';
        this.dateViewData = [];
    }

    loadDateViewData(date: string): void {
        this.isLoadingDateView = true;
        
        // Filtrer les données pour la date sélectionnée
        const dataForDate = this.controlRevenuData.filter(item => item.date === date);
        
        // Grouper par service et calculer les totaux
        const serviceGroups = new Map<string, any>();
        
        dataForDate.forEach(item => {
            if (!serviceGroups.has(item.service)) {
                serviceGroups.set(item.service, {
                    service: item.service,
                    date: item.date,
                    volume: 0,
                    nombreTrx: 0,
                    revenuAttendu: 0,
                    revenuReel: 0,
                    fraisTrxSf: 0,
                    ecart: 0,
                    statut: 'normal',
                    nombreControles: 0
                });
            }
            
            const group = serviceGroups.get(item.service)!;
            group.volume += item.volume;
            group.nombreTrx += item.nombreTrx;
            group.revenuAttendu += item.revenuAttendu;
            group.revenuReel += item.revenuReel;
            group.fraisTrxSf += (item.totalFraisTrxSf || 0);
            group.ecart += item.ecart;
            group.nombreControles += 1;
            
            // Déterminer le statut global du service
            if (item.statut === 'critique') {
                group.statut = 'critique';
            } else if (item.statut === 'anomalie' && group.statut !== 'critique') {
                group.statut = 'anomalie';
            }
        });
        
        this.dateViewData = Array.from(serviceGroups.values());
        this.isLoadingDateView = false;
    }

    getDateViewTotalVolume(): number {
        return this.dateViewData.reduce((total, item) => total + item.volume, 0);
    }

    getDateViewTotalRevenuAttendu(): number {
        return this.dateViewData.reduce((total, item) => total + item.revenuAttendu, 0);
    }

    getDateViewTotalRevenuReel(): number {
        return this.dateViewData.reduce((total, item) => total + item.revenuReel, 0);
    }

    getDateViewTotalEcart(): number {
        return this.dateViewData.reduce((total, item) => total + item.ecart, 0);
    }

    getDateViewMagPercentage(): number {
        const totalRevenuAttendu = this.getDateViewTotalRevenuAttendu();
        const totalEcart = this.getDateViewTotalEcart();
        if (totalRevenuAttendu === 0) return 0;
        return (totalEcart / totalRevenuAttendu) * 100;
    }

    getMagPercentageFromService(service: any): number {
        if (service.revenuAttendu === 0) return 0;
        return (service.ecart / service.revenuAttendu) * 100;
    }

    getDateViewTotalFraisTrxSf(): number {
        return this.dateViewData.reduce((total, item) => total + item.fraisTrxSf, 0);
    }

    getServiceRowClass(service: any): string {
        if (service.statut === 'critique') return 'critical-row';
        if (service.statut === 'anomalie') return 'anomaly-row';
        return 'normal-row';
    }

    exportDateViewData(): void {
        if (this.dateViewData.length === 0) {
            this.popupService.showWarning('Aucune donnée à exporter');
            return;
        }

        try {
            // Fonction pour formater les montants
            const formatMontant = (montant: number): string => {
                const parts = montant.toFixed(2).split('.');
                const integerPart = parts[0];
                const decimalPart = parts[1];
                const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
                return `${formattedInteger},${decimalPart}`;
            };

            // Fonction pour échapper les caractères spéciaux
            const escapeCsvValue = (value: string): string => {
                if (value.includes(';') || value.includes('"') || value.includes('\n')) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            };

            // Préparer les données pour l'export
            const exportData = this.dateViewData.map(service => ({
                'Service': service.service,
                'Volume': formatMontant(service.volume),
                'Nombre de Transactions': service.nombreTrx.toString(),
                'Revenu Attendu': formatMontant(service.revenuAttendu),
                'Frais TRX SF': formatMontant(service.fraisTrxSf),
                'Revenu Reel': formatMontant(service.revenuReel),
                'MaG (%)': this.getMagPercentageFromService(service).toFixed(2) + '%',
                'Statut': this.getControlRevenuStatusLabel(service),
                'Nombre de Controles': service.nombreControles.toString()
            }));

            // Créer le contenu CSV
            const headers = Object.keys(exportData[0]);
            const csvContent = [
                headers.map(header => escapeCsvValue(header)).join(';'),
                ...exportData.map(row => 
                    headers.map(header => {
                        const value = row[header as keyof typeof row];
                        return escapeCsvValue(value.toString());
                    }).join(';')
                )
            ].join('\n');

            // Ajouter les métadonnées
            const metadata = [
                `Export Visualisation par Date - ${this.formatDate(this.selectedDate)}`,
                `Date: ${this.formatDate(this.selectedDate)}`,
                `Nombre de Services: ${this.dateViewData.length}`,
                `Volume Total: ${formatMontant(this.getDateViewTotalVolume())}`,
                `Revenu Attendu Total: ${formatMontant(this.getDateViewTotalRevenuAttendu())}`,
                `Revenu Reel Total: ${formatMontant(this.getDateViewTotalRevenuReel())}`,
                `Frais TRX SF Total: ${formatMontant(this.getDateViewTotalFraisTrxSf())}`,
                `MaG Moyen (%): ${this.getDateViewMagPercentage().toFixed(2)}%`,
                '',
                csvContent
            ].join('\n');

            // Créer et télécharger le fichier
            const BOM = '\uFEFF';
            const blob = new Blob([BOM + metadata], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `visualisation_date_${this.selectedDate.replace(/-/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            this.popupService.showSuccess('Export terminé avec succès !');
        } catch (error) {
            console.error('Erreur lors de l\'export:', error);
            this.popupService.showError('Erreur lors de l\'export des données');
        }
    }

    exportControlRevenu(controle: any): void {
        // TODO: Implémenter l'export du contrôle
        console.log('Exporter le contrôle:', controle);
        this.popupService.showInfo(`Export du contrôle du ${controle.date} en cours...`);
    }

    exportControlRevenuData(): void {
        if (this.controlRevenuDataFiltered.length === 0) {
            this.popupService.showWarning('Aucune donnée à exporter');
            return;
        }

        try {
            // Fonction pour formater les montants sans devise avec séparateurs de milliers
            const formatMontant = (montant: number): string => {
                // Formater avec séparateurs de milliers et virgule décimale
                const parts = montant.toFixed(2).split('.');
                const integerPart = parts[0];
                const decimalPart = parts[1];
                
                // Ajouter les séparateurs de milliers
                const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
                
                return `${formattedInteger},${decimalPart}`;
            };

            // Fonction pour échapper les caractères spéciaux dans les chaînes CSV
            const escapeCsvValue = (value: string): string => {
                if (value.includes(';') || value.includes('"') || value.includes('\n')) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            };

            // Préparer les données pour l'export
            const exportData = this.controlRevenuDataFiltered.map(controle => ({
                'Date': this.formatDate(controle.date),
                'Service': controle.service,
                'Type de Controle': controle.typeControle,
                'Volume': formatMontant(controle.volume),
                'Nombre de Transactions': controle.nombreTrx.toString(),
                'Revenu Attendu': formatMontant(controle.revenuAttendu),
                'Frais TRX SF': formatMontant(controle.totalFraisTrxSf || 0),
                'Revenu Reel': formatMontant(controle.revenuReel),
                'MaG (%)': this.getMagPercentage(controle).toFixed(2) + '%',
                'Statut': this.getControlRevenuStatusLabel(controle)
            }));

            // Créer le contenu CSV avec échappement des caractères spéciaux
            const headers = Object.keys(exportData[0]);
            const csvContent = [
                headers.map(header => escapeCsvValue(header)).join(';'),
                ...exportData.map(row => 
                    headers.map(header => {
                        const value = row[header as keyof typeof row];
                        return escapeCsvValue(value.toString());
                    }).join(';')
                )
            ].join('\n');

            // Ajouter les métadonnées avec formatage des montants
            const metadata = [
                `Export Control Revenu - ${new Date().toLocaleDateString('fr-FR')}`,
                `Total Controles: ${this.getTotalControlRevenu()}`,
                `Volume Total: ${formatMontant(this.getTotalVolumeControlRevenu())}`,
                `Total Transactions: ${this.getTotalNombreTrxControlRevenu().toString()}`,
                `MaG Moyen (%): ${this.getMoyenneMagPercentageControlRevenu().toFixed(2)}%`,
                `Anomalies: ${this.getTotalAnomaliesControlRevenu()}`,
                `Controles Normaux: ${this.getTotalNormauxControlRevenu()}`,
                `Controles Critiques: ${this.getTotalCritiquesControlRevenu()}`,
                `Taux de Conformite: ${this.getTauxConformiteControlRevenu().toFixed(1)}%`,
                '',
                csvContent
            ].join('\n');

            // Créer et télécharger le fichier avec BOM pour Excel
            const BOM = '\uFEFF';
            const blob = new Blob([BOM + metadata], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `control-revenu-${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            console.log('Export Control Revenu réussi:', exportData.length, 'lignes exportées');
        } catch (error) {
            console.error('Erreur lors de l\'export Control Revenu:', error);
            this.popupService.showError('Erreur lors de l\'export. Veuillez réessayer.');
        }
    }
} 