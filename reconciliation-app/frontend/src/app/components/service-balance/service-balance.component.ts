import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { CompteService } from '../../services/compte.service';
import { Compte } from '../../models/compte.model';
import { ServiceBalanceService } from '../../services/service-balance.service';
import { PopupService } from '../../services/popup.service';

@Component({
    selector: 'app-service-balance',
    templateUrl: './service-balance.component.html',
    styleUrls: ['./service-balance.component.scss']
})
export class ServiceBalanceComponent implements OnInit, OnDestroy {
    serviceComptes: Compte[] = [];
    filteredServiceComptes: Compte[] = [];
    paginatedComptes: Compte[] = [];
    groupedByCountry: { [key: string]: Compte[] } = {};
    selectedComptes: Compte[] = [];
    selectedCountry: string = '';
    
    // Filtres et recherche
    searchTerm: string = '';
    sortBy: string = 'numeroCompte';
    sortOrder: 'asc' | 'desc' = 'asc';
    filterBySolde: 'all' | 'positive' | 'negative' | 'zero' = 'all';
    
    // Pagination
    currentPage: number = 1;
    itemsPerPage: number = 12;
    totalPages: number = 1;
    
    isLoading = false;
    isMerging = false;
    showMergeForm = false;
    
    mergeForm: FormGroup;
    
    private subscriptions: Subscription[] = [];

    constructor(
        private compteService: CompteService,
        private serviceBalanceService: ServiceBalanceService,
        private popupService: PopupService,
        private fb: FormBuilder
    ) {
        this.mergeForm = this.fb.group({
            newCompteName: ['', [Validators.required, Validators.minLength(3)]],
            selectedCountry: ['', Validators.required]
        });
    }

    ngOnInit() {
        this.testPing();
        this.testConnection();
        this.loadServiceComptes();
    }

    testPing() {
        this.subscriptions.push(
            this.serviceBalanceService.testPing().subscribe({
                next: (result) => {
                    console.log('✅ Ping Backend OK:', result);
                },
                error: (error) => {
                    console.error('❌ Erreur Ping Backend:', error);
                    this.popupService.showError('Erreur Backend', 'Le backend n\'est pas accessible. Vérifiez qu\'il est démarré sur le port 8080.');
                }
            })
        );
    }

    testConnection() {
        this.subscriptions.push(
            this.serviceBalanceService.testConnection().subscribe({
                next: (result) => {
                    console.log('✅ Connexion API Service Balance OK:', result);
                },
                error: (error) => {
                    console.error('❌ Erreur de connexion API Service Balance:', error);
                    this.popupService.showError('Erreur de connexion', 'Impossible de se connecter à l\'API Service Balance');
                }
            })
        );
    }

    ngOnDestroy() {
        this.subscriptions.forEach(sub => sub.unsubscribe());
    }

    loadServiceComptes() {
        this.isLoading = true;
        this.subscriptions.push(
            this.serviceBalanceService.getServiceComptes().subscribe({
                next: (comptes) => {
                    console.log('Comptes service reçus:', comptes);
                    this.serviceComptes = comptes;
                    this.groupComptesByCountry();
                    this.isLoading = false;
                },
                error: (error) => {
                    console.error('Erreur lors du chargement des comptes service:', error);
                    this.popupService.showError('Erreur', 'Impossible de charger les comptes service');
                    this.isLoading = false;
                }
            })
        );
    }
    
    loadAllComptes() {
        this.isLoading = true;
        this.subscriptions.push(
            this.serviceBalanceService.getAllComptes().subscribe({
                next: (comptes) => {
                    console.log('Tous les comptes reçus:', comptes);
                    this.serviceComptes = comptes;
                    this.groupComptesByCountry();
                    this.isLoading = false;
                },
                error: (error) => {
                    console.error('Erreur lors du chargement de tous les comptes:', error);
                    this.popupService.showError('Erreur', 'Impossible de charger tous les comptes');
                    this.isLoading = false;
                }
            })
        );
    }

    private isServiceCompte(numeroCompte: string): boolean {
        // Un compte service est identifié par le fait qu'il n'est pas un code d'agence
        // Les codes d'agence sont généralement des codes courts (ex: SPTLN2664)
        // Les services sont généralement des codes plus longs (ex: BF_CASHIN_OM_LONAB)
        return numeroCompte && numeroCompte.length > 10 && numeroCompte.includes('_');
    }

    groupComptesByCountry() {
        this.groupedByCountry = {};
        this.serviceComptes.forEach(compte => {
            const country = compte.pays || 'Non défini';
            if (!this.groupedByCountry[country]) {
                this.groupedByCountry[country] = [];
            }
            this.groupedByCountry[country].push(compte);
        });
    }

    onCountryChange(country: string) {
        this.selectedCountry = country;
        this.filteredServiceComptes = this.groupedByCountry[country] || [];
        this.currentPage = 1; // Reset à la première page
        this.selectedComptes = [];
        this.mergeForm.patchValue({ selectedCountry: country });
        this.applyFiltersAndPagination();
    }

    toggleCompteSelection(compte: Compte) {
        const index = this.selectedComptes.findIndex(c => c.id === compte.id);
        if (index > -1) {
            this.selectedComptes.splice(index, 1);
        } else {
            this.selectedComptes.push(compte);
        }
    }

    isCompteSelected(compte: Compte): boolean {
        return this.selectedComptes.some(c => c.id === compte.id);
    }

    getTotalSelectedSolde(): number {
        return this.selectedComptes.reduce((total, compte) => total + compte.solde, 0);
    }

    getSelectedComptesCount(): number {
        return this.selectedComptes.length;
    }

    showMergeDialog() {
        if (this.selectedComptes.length < 2) {
            this.popupService.showWarning('Sélection insuffisante', 'Veuillez sélectionner au moins 2 comptes à fusionner');
            return;
        }
        this.showMergeForm = true;
    }

    cancelMerge() {
        this.showMergeForm = false;
        this.mergeForm.reset();
    }

    mergeComptes() {
        if (this.mergeForm.invalid || this.selectedComptes.length < 2) {
            return;
        }

        this.isMerging = true;
        const newCompteName = this.mergeForm.get('newCompteName')?.value;
        const selectedCountry = this.mergeForm.get('selectedCountry')?.value;

        this.subscriptions.push(
            this.serviceBalanceService.mergeServiceComptes(
                this.selectedComptes.map(c => c.id!),
                newCompteName,
                selectedCountry
            ).subscribe({
                next: (result) => {
                    console.log('Fusion réussie:', result);
                    this.popupService.showSuccess(
                        'Regroupement réussi', 
                        `Un nouveau compte "${newCompteName}" a été créé avec un solde total de ${result.totalSolde.toLocaleString()} XAF. Les ${this.selectedComptes.length} comptes originaux restent opérationnels.`
                    );
                    this.showMergeForm = false;
                    this.mergeForm.reset();
                    this.selectedComptes = [];
                    this.loadServiceComptes(); // Recharger la liste
                },
                error: (error) => {
                    console.error('Erreur lors de la fusion:', error);
                    let errorMessage = 'Impossible de fusionner les comptes';
                    if (error.error && error.error.message) {
                        errorMessage = error.error.message;
                    } else if (error.message) {
                        errorMessage = error.message;
                    }
                    this.popupService.showError('Erreur de fusion', errorMessage);
                },
                complete: () => {
                    this.isMerging = false;
                }
            })
        );
    }

    getCountries(): string[] {
        return Object.keys(this.groupedByCountry).sort();
    }

    getComptesForCountry(country: string): Compte[] {
        return this.groupedByCountry[country] || [];
    }

    getTotalSoldeForCountry(country: string): number {
        return this.getComptesForCountry(country).reduce((total, compte) => total + compte.solde, 0);
    }

    // Méthodes pour les filtres et la recherche
    onSearchChange() {
        this.currentPage = 1;
        this.applyFiltersAndPagination();
    }

    onSortChange() {
        this.applyFiltersAndPagination();
    }

    onFilterChange() {
        this.currentPage = 1;
        this.applyFiltersAndPagination();
    }

    applyFiltersAndPagination() {
        let filtered = [...this.filteredServiceComptes];

        // Filtrage par terme de recherche
        if (this.searchTerm.trim()) {
            const searchLower = this.searchTerm.toLowerCase();
            filtered = filtered.filter(compte => 
                compte.numeroCompte.toLowerCase().includes(searchLower) ||
                (compte.agence && compte.agence.toLowerCase().includes(searchLower))
            );
        }

        // Filtrage par solde
        if (this.filterBySolde !== 'all') {
            filtered = filtered.filter(compte => {
                switch (this.filterBySolde) {
                    case 'positive': return compte.solde > 0;
                    case 'negative': return compte.solde < 0;
                    case 'zero': return compte.solde === 0;
                    default: return true;
                }
            });
        }

        // Tri
        filtered.sort((a, b) => {
            let aValue: any, bValue: any;
            
            switch (this.sortBy) {
                case 'numeroCompte':
                    aValue = a.numeroCompte.toLowerCase();
                    bValue = b.numeroCompte.toLowerCase();
                    break;
                case 'solde':
                    aValue = a.solde;
                    bValue = b.solde;
                    break;
                case 'dateDerniereMaj':
                    aValue = new Date(a.dateDerniereMaj).getTime();
                    bValue = new Date(b.dateDerniereMaj).getTime();
                    break;
                default:
                    aValue = a.numeroCompte.toLowerCase();
                    bValue = b.numeroCompte.toLowerCase();
            }

            if (aValue < bValue) return this.sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return this.sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        // Mise à jour des comptes filtrés
        this.filteredServiceComptes = filtered;
        
        // Calcul de la pagination
        this.totalPages = Math.ceil(filtered.length / this.itemsPerPage);
        if (this.currentPage > this.totalPages) {
            this.currentPage = Math.max(1, this.totalPages);
        }

        // Application de la pagination
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        this.paginatedComptes = filtered.slice(startIndex, endIndex);
    }

    // Méthodes de pagination
    goToPage(page: number) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.applyFiltersAndPagination();
        }
    }

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.goToPage(this.currentPage + 1);
        }
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.goToPage(this.currentPage - 1);
        }
    }

    // Méthodes utilitaires
    getTotalFilteredCount(): number {
        return this.filteredServiceComptes.length;
    }

    getPageNumbers(): number[] {
        const pages: number[] = [];
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }
        return pages;
    }

    clearFilters() {
        this.searchTerm = '';
        this.sortBy = 'numeroCompte';
        this.sortOrder = 'asc';
        this.filterBySolde = 'all';
        this.currentPage = 1;
        this.applyFiltersAndPagination();
    }
}
