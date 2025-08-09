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
import { Router } from '@angular/router';
import { EcartSoldeService } from '../../services/ecart-solde.service';
import { ImpactOPService } from '../../services/impact-op.service';
import { TrxSfService } from '../../services/trx-sf.service';

@Component({
    selector: 'app-comptes',
    templateUrl: './comptes.component.html',
    styleUrls: ['./comptes.component.scss']
})
export class ComptesComponent implements OnInit, OnDestroy {
    comptes: Compte[] = [];
    pagedComptes: Compte[] = [];
    currentPage = 1;
    pageSize = 10;
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
    paysSearchCtrl = new FormControl('');
    codeProprietaireSearchCtrl = new FormControl('');

    // Liste des types de compte
    compteTypes: string[] = ['TOP20', 'B2B', 'G&I'];

    @ViewChild('paysSelect') paysSelect!: MatSelect;
    @ViewChild('codeProprietaireSelect') codeProprietaireSelect!: MatSelect;

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

    constructor(
        private compteService: CompteService,
        private operationService: OperationService,
        private fb: FormBuilder,
        private router: Router,
        private ecartSoldeService: EcartSoldeService,
        private impactOPService: ImpactOPService,
        private trxSfService: TrxSfService
    ) {
        this.addForm = this.fb.group({
            numeroCompte: ['', [Validators.required]],
            solde: [0, [Validators.required, Validators.min(0)]],
            pays: ['', [Validators.required]],
            codeProprietaire: [''],
            type: ['', [Validators.required]] // Ajouté
        });

        this.editForm = this.fb.group({
            numeroCompte: ['', [Validators.required]],
            solde: [0, [Validators.required]],
            pays: ['', [Validators.required]],
            codeProprietaire: [''],
            type: ['', [Validators.required]] // Ajouté
        });

        this.filterForm = this.fb.group({
            pays: [''],
            soldeMin: [''],
            dateDebut: [''],
            dateFin: [''],
            codeProprietaire: ['']
        });
    }

    ngOnInit() {
        this.loadComptes();
        this.loadFilterLists();
        this.loadOperationsPeriode();
        this.filteredPaysList = this.paysList;
        this.filteredCodeProprietaireList = this.codeProprietaireList;
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
                        alert('Erreur lors de l\'ajout du compte: ' + error.message);
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

    editCompte(compte: Compte) {
        this.editingCompte = compte;
        this.showEditForm = true;
        this.editForm.patchValue({
            numeroCompte: compte.numeroCompte,
            solde: compte.solde,
            pays: compte.pays,
            codeProprietaire: compte.codeProprietaire,
            type: compte.type || '' // Ajouté
        });
    }

    deleteCompte(id: number) {
        if (confirm('Êtes-vous sûr de vouloir supprimer ce compte ?')) {
            this.subscription.add(
                this.compteService.deleteCompte(id).subscribe({
                    next: (success) => {
                        if (success) {
                            this.comptes = this.comptes.filter(c => c.id !== id);
                            this.updatePagedComptes();
                            this.calculateStats();
                        }
                    },
                    error: (error) => {
                        console.error('Erreur lors de la suppression:', error);
                    }
                })
            );
        }
    }

    applyFilters() {
        // Synchroniser les champs du formulaire avec les sélections UI
        this.filterForm.controls['pays'].setValue(this.selectedPays);
        this.filterForm.controls['codeProprietaire'].setValue(this.selectedCodesProprietaire);

        const filter: CompteFilter = {
            ...this.filterForm.value,
            pays: this.selectedPays,
            codeProprietaire: this.selectedCodesProprietaire
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
        this.comptesCritiques = this.comptes.map(c => {
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

    async exportSoldesCritiques() {
        this.isExporting = true;
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Soldes Critiques');

            worksheet.columns = [
                { header: 'Position', key: 'position', width: 10 },
                { header: 'Numéro de Compte', key: 'numeroCompte', width: 20 },
                { header: 'Solde Actuel', key: 'solde', width: 15 },
                { header: `Moyenne Volume (${this.periodeJours}j)`, key: 'moyenneVolume', width: 20 },
                { header: 'Ratio Criticité', key: 'ratioCriticite', width: 15 },
                { header: 'Pays', key: 'pays', width: 15 },
                { header: 'Code Propriétaire', key: 'codeProprietaire', width: 20 },
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
                    numeroCompte: item.compte.numeroCompte,
                    solde: item.compte.solde,
                    moyenneVolume: item.moyenneVolume,
                    ratioCriticite: ratioCriticite.toFixed(2),
                    pays: item.compte.pays,
                    codeProprietaire: item.compte.codeProprietaire || '-',
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
                        alert('Erreur lors de la mise à jour du compte: ' + error.message);
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

    // Méthode pour mettre à jour les listes filtrées avec cloisonnement
    updateFilteredLists() {
        // Mettre à jour les codes propriétaires disponibles selon le pays sélectionné
        this.filteredCodeProprietaireList = this.getFilteredCodeProprietaire();
        
        // Mettre à jour les pays disponibles selon le code propriétaire sélectionné
        this.filteredPaysList = this.getFilteredPays();
        
        // Nettoyer les sélections qui ne sont plus valides
        this.cleanInvalidSelections();
        
        console.log('updateFilteredLists - filteredPaysList:', this.filteredPaysList);
        console.log('updateFilteredLists - filteredCodeProprietaireList:', this.filteredCodeProprietaireList);
    }

    // Méthode pour nettoyer les sélections invalides
    cleanInvalidSelections() {
        const currentPays = this.selectedPays;
        const currentCodeProprietaire = this.selectedCodesProprietaire;

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
        worksheet.addRow(['Date', 'Solde d\'ouverture', 'Solde de clôture', 'Variation', 'Solde de Clôture BO', 'TSOP', 'Impact OP']);

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

          // Appliquer les couleurs pour la colonne TSOP
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

          // Appliquer les couleurs pour la colonne Impact OP
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
        tableData.push(['RELEVÉ DE COMPTE', '', '', '', '', '', '', '', '']);
        tableData.push(['', '', '', '', '', '', '', '', '']);
        tableData.push(['Numéro de compte:', this.selectedCompte.numeroCompte, '', 'Solde actuel:', this.selectedCompte.solde, '', '', '', '']);
        tableData.push(['Pays:', this.selectedCompte.pays, '', 'Code propriétaire:', this.selectedCompte.codeProprietaire || '-', '', '', '', '']);
        tableData.push(['Dernière mise à jour:', this.formatDate(this.selectedCompte.dateDerniereMaj), '', '', '', '', '', '', '']);
        tableData.push(['', '', '', '', '', '', '', '', '']);
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
        tableData.push([filterInfo, '', '', '', '', '', '', '', '']);
        tableData.push(['', '', '', '', '', '', '', '', '']);
        // En-tête du tableau des opérations
        tableData.push([
            'Date',
            'Type d\'opération',
            'Débit',
            'Crédit',
            'Solde avant',
            'Solde après',
            'Service',
            'Banque',
            'Bordereau'
        ]);
        // Ajout d'une méthode utilitaire pour grouper les opérations par date et calculer les soldes d'ouverture/clôture
        const dailyBalances = this.getDailyBalances(this.releveOperations);
        let lastDate = '';
        this.releveOperations.forEach((op, idx) => {
            const date = op.dateOperation ? op.dateOperation.split('T')[0] : '';
            if (date && date !== lastDate) {
                // Ligne solde d'ouverture
                tableData.push([
                    this.formatDate(date),
                    'Solde d\'ouverture',
                    '', '',
                    this.formatMontant(dailyBalances[date]?.opening ?? ''),
                    '', '', '', ''
                ]);
                // Ligne d'espacement
                tableData.push(['', '', '', '', '', '', '', '', '']);
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
                op.service || '-',
                op.banque || '-',
                op.nomBordereau || '-'
            ]);
            // Ajout de la ligne de solde de clôture UNIQUEMENT si c'est la dernière opération de la journée
            const isLastOfDay = idx === this.releveOperations.length - 1 ||
                (this.releveOperations[idx + 1] && (this.releveOperations[idx + 1].dateOperation ? this.releveOperations[idx + 1].dateOperation.split('T')[0] : '') !== date);
            if (isLastOfDay) {
                // Ligne d'espacement avant
                tableData.push(['', '', '', '', '', '', '', '', '']);
                tableData.push([
                    this.formatDate(date),
                    'Solde de clôture',
                    '', '',
                    this.formatMontant(dailyBalances[date]?.closing ?? ''),
                    '', '', '', ''
                ]);
                // Ligne d'espacement après
                tableData.push(['', '', '', '', '', '', '', '', '']);
            }
        });
        // Ajouter un résumé en bas
        tableData.push(['', '', '', '', '', '', '', '', '']);
        tableData.push(['RÉSUMÉ', '', '', '', '', '', '', '', '']);
        tableData.push(['Total opérations:', this.releveOperations.length, '', '', '', '', '', '', '']);

        // Calculs totaux par type et totaux débit/crédit
        const totalsByType: { [type: string]: { debit: number, credit: number } } = {};
        let totalDebit = 0;
        let totalCredit = 0;
        this.releveOperations.forEach(op => {
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
                '', '', '', '', ''
            ]);
        });
        tableData.push(['', '', '', '', '', '', '', '', '']);
        tableData.push(['Total Débit:', this.formatMontant(totalDebit), '', '', '', '', '', '', '']);
        tableData.push(['Total Crédit:', this.formatMontant(totalCredit), '', '', '', '', '', '', '']);
        tableData.push(['Différence (Débit - Crédit):', this.formatMontant(Math.abs(totalDebit - totalCredit)), '', '', '', '', '', '', '']);
        // Ajouter solde d'ouverture et solde final de la période choisie
        if (this.releveOperations.length > 0) {
            tableData.push(['', '', '', '', '', '', '', '', '']);
            tableData.push([
                `Solde d'ouverture global (${this.getGlobalOpeningBalanceDate()}):`,
                this.formatMontant(this.getGlobalOpeningBalance()), '', '', '', '', '', '', ''
            ]);
            tableData.push([
                `Solde de clôture global (${this.getGlobalClosingBalanceDate()}):`,
                this.formatMontant(this.getGlobalClosingBalance()), '', '', '', '', '', '', ''
            ]);
            tableData.push([
                'Différence solde ouverture/clôture:',
                this.formatMontant(Math.abs(this.getGlobalClosingBalance() - this.getGlobalOpeningBalance())), '', '', '', '', '', '', ''
            ]);
            // Calcul de l'écart (après toutes les autres lignes)
            let ecart = Math.abs(totalDebit - totalCredit) - Math.abs(this.getGlobalClosingBalance() - this.getGlobalOpeningBalance());
            tableData.push(['ECART:', this.formatMontant(ecart), '', '', '', '', '', '', '']);
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
            const sorted = ops.slice().sort((a, b) => {
                const tA = new Date(a.dateOperation).getTime();
                const tB = new Date(b.dateOperation).getTime();
                if (tA !== tB) return tA - tB;
                // Si égalité stricte, trie par id (ou autre champ unique)
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
            result[date] = {
                opening: opening,
                closing: sorted[sorted.length - 1]?.soldeApres ?? 0
            };
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
              alert('Solde BO enregistré !');
              this.closeSoldeBoModal();
            },
            error: (error) => {
              console.error('❌ Erreur lors de l\'enregistrement du solde BO:', error);
              alert(`Erreur lors de l'enregistrement : ${error.message || error.error?.message || 'Erreur inconnue'}`);
            }
          });
      } else {
        console.warn('⚠️ Données manquantes pour l\'enregistrement du solde BO:', {
          selectedCompteForBo: this.selectedCompteForBo,
          dernierSoldeBo: this.dernierSoldeBo,
          dateSoldeBo: this.dateSoldeBo
        });
        alert('Veuillez remplir tous les champs requis');
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

    // Méthode pour calculer la valeur de l'Impact OP
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

    // Méthode pour déterminer la classe CSS de l'Impact OP
    getImpactOPClass(solde: { date: string; opening: number; closing: number; closingBo?: number }): string {
        const impactOP = this.getImpactOPValue(solde);
        const tolerance = 0.01; // 1 centime de tolérance
        
        if (Math.abs(impactOP) <= tolerance) {
            return 'impact-op-zero'; // Impact OP nul (vert)
        } else if (impactOP > 0) {
            return 'impact-op-positive'; // Impact OP positif (orange)
        } else {
            return 'impact-op-negative'; // Impact OP négatif (rouge)
        }
    }

    // Navigation vers la page Impact OP avec filtres
    navigateToImpactOP(solde: { date: string; opening: number; closing: number; closingBo?: number }): void {
        if (!this.selectedCompte) return;
        
        // Configurer les données pour l'onglet Impact OP
        this.impactOPAgence = this.selectedCompte.numeroCompte;
        this.impactOPDateTransaction = solde.date;
        
        // Basculer vers l'onglet Impact OP
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
} 